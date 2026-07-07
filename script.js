// ============================================================
//  لعبة روليت القبائل - المنطق الكامل
// ============================================================

// قائمة القبائل السعودية الرسمية المستخدمة في نافذة الاختيار
const saudiTribes = [
    "قبيلة عتيبة", "قبيلة قحطان", "قبيلة عنزة", "قبيلة حرب", "قبيلة زهران",
    "قبيلة مطير", "قبيلة غامد", "قبيلة شمر", "قبيلة بنو شهر", "قبيلة الدواسر",
    "قبيلة شهران", "قبيلة عسير", "قبيلة جهينة", "قبيلة العجمان", "قبيلة الأشراف",
    "قبيلة البقوم", "قبيلة سبيع"
];

// كل عنصر على العجلة له اسم + معرف فريد (uid) حتى نستطيع تمييز الأسماء المكررة عن بعضها
let players = [];          // [{ uid, name }]
let eliminatedPlayers = []; // [{ uid, name }]
let eliminationCounts = {}; // { name: عدد مرات الإقصاء }
let reentryUsed = {};       // { name: true } - اللاعب استخدم فرصة إرجاعه الوحيدة بالفعل
let uidCounter = 0;

let currentAngle = 0;      // بالراديان
let isSpinning = false;
let landedIndex = null;    // الفهرس الذي توقفت عنده العجلة في هذه الجولة
let lastLandedName = null; // اسم آخر لاعب هبطت عليه العجلة (لمقارنة التتالي)
let gameStarted = false;   // هل بدأت الجولة فعلياً؟ يتحكم بسلوك زر "إضافة اللاعبين"

// خلط حقيقي وعادل إحصائياً (خوارزمية Fisher-Yates) - يُستخدم في كل مكان
// نحتاج فيه لعشوائية احترافية بدل sort(() => 0.5 - Math.random()) المتحيّزة
function shuffleArray(inputArray) {
    const arr = [...inputArray];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ---------- عناصر الواجهة ----------
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const namesInput = document.getElementById('names-input');
const addBtn = document.getElementById('add-btn');
const startBtn = document.getElementById('start-btn');
const spinBtn = document.getElementById('spin-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const resetBtn = document.getElementById('reset-btn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalSubtitle = document.getElementById('modal-subtitle');
const tribesContainer = document.getElementById('tribes-container');
const modalActions = document.getElementById('modal-actions');
const effectOverlay = document.getElementById('effect-overlay');
const effectContent = document.getElementById('effect-content');
const winnerOverlay = document.getElementById('winner-overlay');
const winnerNameEl = document.getElementById('winner-name');
const winnerEliminatorEl = document.getElementById('winner-eliminator');
const playAgainBtn = document.getElementById('play-again-btn');
const playerCountEl = document.getElementById('player-count');
const toastEl = document.getElementById('toast');
const gameSidebar = document.getElementById('game-sidebar');
const introOverlay = document.getElementById('intro-overlay');
const introTitle = document.getElementById('intro-title');
const winnerBanner = document.getElementById('winner-banner');
const winnerBannerNameEl = document.getElementById('winner-banner-name');
const wheelWrapper = document.querySelector('.wheel-wrapper');
const wheelScaleSlider = document.getElementById('wheel-scale-slider');
const wheelDragLayer = document.getElementById('wheel-drag-layer');
const leftControls = document.getElementById('left-controls');
const gameTitleEl = document.getElementById('game-title');
const streamerNameInput = document.getElementById('streamer-name-input');
const modalChooserNameEl = document.getElementById('modal-chooser-name');

// نحفظ الموضع الأصلي لحقل الأسماء وزر الإضافة حتى نستطيع إعادتهما بعد إعادة التعيين
const namesInputHomeParent = namesInput.parentNode;
const namesInputHomeNext = namesInput.nextSibling;
const addBtnHomeParent = addBtn.parentNode;
const addBtnHomeNext = addBtn.nextSibling;

// ============================================================
//  خلفية الجزيئات المتطايرة
// ============================================================
function createParticles() {
    const pContainer = document.getElementById('particles');
    const count = window.innerWidth < 600 ? 20 : 40;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        p.style.left = Math.random() * 100 + 'vw';
        const size = Math.random() * 6 + 4;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.animationDelay = Math.random() * 8 + 's';
        p.style.animationDuration = (Math.random() * 6 + 6) + 's';
        pContainer.appendChild(p);
    }
}
createParticles();

// ============================================================
//  شاشة الافتتاح الاحترافية (Blurred Intro Screen)
//  تظهر عند فتح الرابط، يتلاشى العنوان إلى الظهور في المنتصف، ثم
//  يختفي كل شيء (النص + طبقة الضبابية) بسلاسة بعد 2-3 ثوانٍ
// ============================================================
(function initIntroScreen() {
    if (!introOverlay || !introTitle) return;

    // نضيف كلاس الظهور في الإطار التالي حتى يعمل الانتقال (transition) بشكل صحيح
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            introTitle.classList.add('show');
        });
    });

    // بعد 2.4 ثانية من العرض نبدأ بتلاشي الضبابية والعنوان معاً
    setTimeout(() => {
        introOverlay.classList.add('fade-out');
        introTitle.classList.remove('show');
        // نزيل الطبقة كلياً من تدفق الصفحة بعد اكتمال الانتقال (1 ثانية)
        setTimeout(() => {
            introOverlay.style.display = 'none';
        }, 1050);
    }, 2400);
})();

// ============================================================
//  متحكم تكبير/تصغير العجلة المباشر
//  يعمل في أي وقت (قبل وبعد بدء الجولة وحتى أثناء الدوران) لأنه
//  يغيّر فقط تحويل CSS (scale) على الحاوية الخارجية للعجلة، دون
//  المساس بمنطق الرسم الداخلي على الـ canvas
// ============================================================
if (wheelScaleSlider && wheelWrapper) {
    wheelScaleSlider.addEventListener('input', () => {
        const scale = Number(wheelScaleSlider.value) / 100;
        wheelWrapper.style.transform = `scale(${scale})`;
    });
}

// ============================================================
//  اسم الستريمر - يُضاف تلقائياً إلى عنوان اللعبة عند كتابته، بخط
//  مميز (Audiowide) يفصله بصرياً عن نص العنوان الرئيسي
// ============================================================
function escapeHtml(str) {
    return str.replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

function updateGameTitle() {
    if (!gameTitleEl || !streamerNameInput) return;
    const streamerName = streamerNameInput.value.trim();
    if (streamerName) {
        gameTitleEl.innerHTML = `روليت القبائل مع <span class="streamer-name-highlight">${escapeHtml(streamerName)}</span>`;
    } else {
        gameTitleEl.textContent = 'روليت القبائل';
    }
}

if (streamerNameInput && gameTitleEl) {
    streamerNameInput.addEventListener('input', updateGameTitle);
}

// ============================================================
//  سحب العجلة لأي مكان في الشاشة (Draggable Wheel)
//  تبقى العجلة في تموضعها الطبيعي في المنتصف أسفل العنوان حتى أول
//  عملية سحب، وعندها فقط تتحول إلى تموضع "fixed" بالبكسل الحالي
//  دون أي قفزة بصرية، ليتمكن الستريمر من وضعها أينما يناسب بثه
// ============================================================
if (wheelDragLayer) {
    let isDraggingWheel = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragOriginLeft = 0;
    let dragOriginTop = 0;

    function beginWheelDrag(clientX, clientY, targetEl) {
        // لا نبدأ السحب إذا كان النقر على زر التدوير نفسه، حتى يستمر بعمله بشكل طبيعي
        if (targetEl === spinBtn) return;

        if (!wheelDragLayer.classList.contains('is-fixed')) {
            const rect = wheelDragLayer.getBoundingClientRect();
            wheelDragLayer.style.position = 'fixed';
            wheelDragLayer.style.left = rect.left + 'px';
            wheelDragLayer.style.top = rect.top + 'px';
            wheelDragLayer.style.margin = '0';
            wheelDragLayer.classList.add('is-fixed');
        }

        const currentRect = wheelDragLayer.getBoundingClientRect();
        dragOriginLeft = currentRect.left;
        dragOriginTop = currentRect.top;
        dragStartX = clientX;
        dragStartY = clientY;
        isDraggingWheel = true;
        wheelDragLayer.classList.add('dragging');
    }

    function moveWheelDrag(clientX, clientY) {
        if (!isDraggingWheel) return;
        const deltaX = clientX - dragStartX;
        const deltaY = clientY - dragStartY;
        wheelDragLayer.style.left = (dragOriginLeft + deltaX) + 'px';
        wheelDragLayer.style.top = (dragOriginTop + deltaY) + 'px';
    }

    function endWheelDrag() {
        isDraggingWheel = false;
        wheelDragLayer.classList.remove('dragging');
    }

    // أحداث الفأرة (سطح المكتب)
    wheelDragLayer.addEventListener('mousedown', (e) => {
        beginWheelDrag(e.clientX, e.clientY, e.target);
    });
    window.addEventListener('mousemove', (e) => moveWheelDrag(e.clientX, e.clientY));
    window.addEventListener('mouseup', endWheelDrag);

    // أحداث اللمس (الجوال / التابلت)
    wheelDragLayer.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        beginWheelDrag(touch.clientX, touch.clientY, e.target);
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
        if (!isDraggingWheel) return;
        const touch = e.touches[0];
        moveWheelDrag(touch.clientX, touch.clientY);
    }, { passive: true });
    window.addEventListener('touchend', endWheelDrag);
}

// ============================================================
//  فقاعات الاحتفال بالفائز النهائي (Bubbles Celebration Effect)
//  تنطلق دفعة أولى فورية ثم تستمر بالتدفق دورياً طوال ظهور نافذة
//  الفائز، وتُنظَّف بالكامل بمجرد إغلاق النافذة
// ============================================================
const bubblesLayer = document.getElementById('bubbles-layer');
const winnerSound = document.getElementById('winner-sound');
let bubblesIntervalId = null;

function spawnBubble() {
    if (!bubblesLayer) return;
    const bubble = document.createElement('div');
    bubble.className = 'celebration-bubble';
    const size = Math.random() * 34 + 14;
    bubble.style.width = size + 'px';
    bubble.style.height = size + 'px';
    bubble.style.left = (Math.random() * 100) + 'vw';
    bubble.style.setProperty('--bubble-drift', (Math.random() * 160 - 80) + 'px');
    bubble.style.animationDuration = (Math.random() * 3 + 4) + 's';
    bubble.style.animationDelay = (Math.random() * 0.4) + 's';
    bubblesLayer.appendChild(bubble);
    setTimeout(() => bubble.remove(), 7600);
}

function startBubblesCelebration() {
    if (!bubblesLayer || bubblesIntervalId) return;
    for (let i = 0; i < 18; i++) spawnBubble(); // دفعة أولى فورية تملأ الشاشة مباشرة
    bubblesIntervalId = setInterval(spawnBubble, 220);
}

function stopBubblesCelebration() {
    clearInterval(bubblesIntervalId);
    bubblesIntervalId = null;
    if (bubblesLayer) bubblesLayer.innerHTML = "";
}

// تشغيل ملف صوت الاحتفال المخصص عند إعلان الفائز النهائي
function playWinnerSoundFile() {
    if (!winnerSound || masterVolume <= 0) return;
    try {
        winnerSound.currentTime = 0;
        winnerSound.volume = masterVolume;
        winnerSound.play().catch(() => { /* بعض المتصفحات تمنع التشغيل التلقائي قبل أي تفاعل */ });
    } catch (e) { /* تجاهل أي خطأ صوتي حتى لا يوقف اللعبة */ }
}

// ============================================================
//  تأثير الإيموجي العائم (فرح / حزن) لمدة 3 ثوانٍ
// ============================================================
const emojiFloatLayer = document.getElementById('emoji-float-layer');
const SAD_EMOJIS = ['😢', '💔', '😞'];
const HAPPY_EMOJIS = ['🥳', '🎉', '✨'];

function spawnFloatingEmojis(type) {
    if (!emojiFloatLayer) return;
    const emojiSet = type === 'sad' ? SAD_EMOJIS : HAPPY_EMOJIS;
    const count = 16;

    for (let i = 0; i < count; i++) {
        const span = document.createElement('span');
        span.className = 'floating-emoji';
        span.textContent = emojiSet[Math.floor(Math.random() * emojiSet.length)];
        span.style.left = (Math.random() * 100) + 'vw';
        span.style.fontSize = (22 + Math.random() * 22) + 'px';
        span.style.setProperty('--drift', (Math.random() * 140 - 70) + 'px');
        span.style.animationDuration = (2.3 + Math.random() * 0.7) + 's';
        span.style.animationDelay = (Math.random() * 0.35) + 's';
        emojiFloatLayer.appendChild(span);
        setTimeout(() => span.remove(), 3200);
    }
}

// ============================================================
//  رسالة سريعة بدل alert()
// ============================================================
let toastTimeout = null;
function showToast(message) {
    clearTimeout(toastTimeout);
    toastEl.textContent = message;
    toastEl.classList.add('show');
    toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

// ============================================================
//  المؤثرات الصوتية عبر Web Audio API (بدون ملفات خارجية)
// ============================================================
let audioCtx = null;
let masterVolume = 0.7; // يتحكم بها منزلق مستوى الصوت في الواجهة

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// صوت "تك" قصير أثناء دوران العجلة
function playTickSound() {
    if (masterVolume <= 0) return;
    try {
        const ac = getAudioCtx();
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'square';
        osc.frequency.value = 750 + Math.random() * 250;
        gain.gain.setValueAtTime(0.16 * masterVolume, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.09);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 0.09);
    } catch (e) { /* تجاهل أي خطأ صوتي حتى لا يوقف اللعبة */ }
}

// صوت احتفالي عند إعلان الفائز النهائي
function playVictorySound() {
    if (masterVolume <= 0) return;
    try {
        const ac = getAudioCtx();
        const now = ac.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        notes.forEach((freq, i) => {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const t = now + i * 0.16;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.22 * masterVolume, t + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
            osc.connect(gain);
            gain.connect(ac.destination);
            osc.start(t);
            osc.stop(t + 0.5);
        });
    } catch (e) { /* تجاهل أي خطأ صوتي حتى لا يوقف اللعبة */ }
}

// ---------- ربط منزلق مستوى الصوت بالواجهة ----------
const volumeSlider = document.getElementById('volume-slider');
const volumeIcon = document.getElementById('volume-icon');

function updateVolumeIcon() {
    if (!volumeIcon) return;
    if (masterVolume <= 0) volumeIcon.textContent = '🔇';
    else if (masterVolume < 0.5) volumeIcon.textContent = '🔉';
    else volumeIcon.textContent = '🔊';
}

if (volumeSlider) {
    volumeSlider.value = Math.round(masterVolume * 100);
    volumeSlider.addEventListener('input', () => {
        masterVolume = Number(volumeSlider.value) / 100;
        updateVolumeIcon();
        if (winnerSound) winnerSound.volume = masterVolume;
    });
    updateVolumeIcon();
}

// جدولة أصوات التكتكة بشكل يتباطأ تدريجياً مع تباطؤ العجلة
let tickTimeoutId = null;
function scheduleSpinTicks(spinTimeTotal) {
    let elapsed = 0;
    function tick() {
        if (!isSpinning) return;
        playTickSound();
        elapsed += 30;
        const progress = Math.min(elapsed / spinTimeTotal, 1);
        const delay = 55 + progress * 260; // كلما اقتربت النهاية كلما زاد التأخير (تباطؤ)
        tickTimeoutId = setTimeout(tick, delay);
    }
    tick();
}
function stopSpinTicks() {
    clearTimeout(tickTimeoutId);
    tickTimeoutId = null;
}

// ============================================================
//  رسم العجلة
// ============================================================
function drawEmptyWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 210, 0, 2 * Math.PI);
    ctx.fillStyle = "#111";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#80d4ff";
    ctx.stroke();

    ctx.fillStyle = "#80d4ff";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("أدخل الأسماء للبدء", canvas.width / 2, canvas.height / 2);
}
drawEmptyWheel();

function drawWheel() {
    if (players.length === 0) {
        drawEmptyWheel();
        return;
    }
    const numSegments = players.length;
    const segmentAngle = (2 * Math.PI) / numSegments;
    const radius = 210;

    // حجم الخط يتقلص تلقائياً كلما زاد عدد اللاعبين حتى تبقى الأسماء مقروءة
    const fontSize = Math.max(11, Math.min(18, 260 / numSegments));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < numSegments; i++) {
        const startAng = currentAngle + i * segmentAngle;
        const endAng = startAng + segmentAngle;

        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, canvas.height / 2);
        ctx.arc(canvas.width / 2, canvas.height / 2, radius, startAng, endAng);
        ctx.closePath();
        ctx.fillStyle = (i % 2 === 0) ? '#330066' : '#111';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#80d4ff';
        ctx.stroke();

        // كتابة اسم اللاعب داخل قطاعه
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(startAng + segmentAngle / 2);
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#80d4ff";
        ctx.font = `bold ${fontSize}px Arial`;

        let label = players[i].name;
        const maxChars = Math.max(6, Math.floor(numSegments <= 8 ? 16 : 10));
        if (label.length > maxChars) label = label.slice(0, maxChars - 1) + "…";

        ctx.fillText(label, radius - 15, 5);
        ctx.restore();
    }

    updatePlayerCount();
}

function updatePlayerCount() {
    playerCountEl.textContent = players.length > 0
        ? `عدد اللاعبين على العجلة: ${players.length}`
        : "";
}

// ============================================================
//  زر إضافة اللاعبين
// ============================================================
addBtn.addEventListener('click', () => {
    const lines = namesInput.value.split('\n');
    const names = lines.map(l => l.trim()).filter(l => l !== "");

    if (!gameStarted) {
        // ----- قبل بدء الجولة: نبني قائمة اللاعبين من الصفر كالمعتاد -----
        if (names.length < 2) {
            showToast("يرجى إدخال اسمين على الأقل لتفعيل العجلة.");
            return;
        }

        players = names.map(name => ({ uid: ++uidCounter, name }));
        eliminatedPlayers = [];
        eliminationCounts = {};
        reentryUsed = {};
        lastLandedName = null;
        names.forEach(n => { eliminationCounts[n] = 0; });
        currentAngle = 0;

        drawWheel();
        startBtn.classList.remove('hidden');
        showToast(`تمت إضافة ${players.length} لاعب بنجاح!`);
        namesInput.value = "";
        return;
    }

    // ----- أثناء الجولة: نُضيف فقط الأسماء الجديدة إلى العجلة الحالية
    //       (دفعاً/push) دون المساس بمن هم موجودون بالفعل أو بحالة اللعبة -----
    if (names.length === 0) {
        showToast("يرجى كتابة اسم واحد على الأقل لإضافته.");
        return;
    }

    names.forEach(name => {
        players.push({ uid: ++uidCounter, name });
        if (!(name in eliminationCounts)) eliminationCounts[name] = 0;
    });

    drawWheel();
    showToast(`تمت إضافة ${names.length} لاعب جديد إلى العجلة!`);
    namesInput.value = "";
});

// ============================================================
//  زر بدء الجولة - ينقل حقل الأسماء وزر الإضافة إلى الشريط الجانبي
//  بدلاً من إخفائهما بالكامل، ليبقيا متاحين أثناء اللعب
// ============================================================
startBtn.addEventListener('click', () => {
    if (players.length < 2) return;
    gameStarted = true;
    spinBtn.classList.remove('hidden');
    shuffleBtn.classList.remove('hidden');
    resetBtn.classList.remove('hidden');
    startBtn.classList.add('hidden');
    if (leftControls) leftControls.classList.remove('hidden');
    if (streamerNameInput) streamerNameInput.classList.add('hidden');

    gameSidebar.appendChild(namesInput);
    gameSidebar.appendChild(addBtn);
    gameSidebar.classList.remove('hidden');
});

// ============================================================
//  التدوير
// ============================================================

// يختار فهرس اللاعب "الهدف" الذي ستهبط عليه العجلة، مع تقليل احتمالية
// تكرار نفس اللاعب الذي هبطت عليه العجلة في الجولة السابقة مباشرة - بدون
// استبعاده كلياً، فقط تقليل وزنه الاحتمالي حتى يبقى التكرار نادراً وطبيعياً
function pickWeightedLandingIndex() {
    const weights = players.map(p => (p.name === lastLandedName ? 0.12 : 1));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return i;
    }
    return weights.length - 1;
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

spinBtn.addEventListener('click', () => {
    if (isSpinning || players.length < 2) return;
    isSpinning = true;
    spinBtn.disabled = true;

    const numSegments = players.length;
    const segmentAngleDeg = 360 / numSegments;
    const targetIndex = pickWeightedLandingIndex();

    // نهبط في نقطة عشوائية آمنة داخل القطاع (بين 20% و80% من عرضه) حتى
    // لا يستقر السهم دائماً بالضبط على حدود القطاع
    const jitter = segmentAngleDeg * (0.2 + Math.random() * 0.6);
    const desiredRelativeDeg = targetIndex * segmentAngleDeg + jitter;

    const pointerDeg = 270;
    let finalAngleDegMod = (pointerDeg - desiredRelativeDeg + 360) % 360;
    const finalAngleModRad = finalAngleDegMod * Math.PI / 180;

    const twoPi = 2 * Math.PI;
    const currentMod = ((currentAngle % twoPi) + twoPi) % twoPi;
    let deltaToTarget = (finalAngleModRad - currentMod + twoPi) % twoPi;

    const fullSpins = 5 + Math.floor(Math.random() * 3); // 5 إلى 7 لفات كاملة لإحساس احترافي بالدوران
    const totalDelta = deltaToTarget + fullSpins * twoPi;

    const startAngle = currentAngle;
    const spinTimeTotal = Math.random() * 2000 + 5000; // 5 إلى 7 ثوانٍ
    const startTime = performance.now();

    scheduleSpinTicks(spinTimeTotal);

    function rotateWheel(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / spinTimeTotal, 1);
        const eased = easeOutCubic(progress);
        currentAngle = startAngle + totalDelta * eased;
        drawWheel();

        if (progress >= 1) {
            isSpinning = false;
            spinBtn.disabled = false;
            stopSpinTicks();
            resolveLanding();
        } else {
            requestAnimationFrame(rotateWheel);
        }
    }
    requestAnimationFrame(rotateWheel);
});

// تحديد الاسم الذي يستقر عنده السهم العلوي (السهم عند زاوية 270°)
function resolveLanding() {
    const numSegments = players.length;
    const segmentAngle = 360 / numSegments;

    let currentAngleDeg = (currentAngle * 180 / Math.PI) % 360;
    if (currentAngleDeg < 0) currentAngleDeg += 360;

    const pointerDeg = 270; // أعلى الدائرة في نظام إحداثيات الكانفس
    let relative = (pointerDeg - currentAngleDeg + 360) % 360;

    landedIndex = Math.floor(relative / segmentAngle) % numSegments;
    openDecisionModal();
}

// ============================================================
//  فتح النافذة المناسبة حسب الحالة (إقصاء عادي أو إرجاع لاعب)
//  قاعدة الإرجاع الآن: يجب أن تهبط العجلة على نفس اسم اللاعب مرتين
//  متتاليتين (بين جولتين متعاقبتين) حتى تُفتح نافذة الإرجاع
// ============================================================
function openDecisionModal() {
    const landedName = players[landedIndex].name;
    const isConsecutiveMatch = (landedName === lastLandedName);

    // نحدّث المتتبع فوراً حتى تُقاس الجولة القادمة بشكل صحيح
    lastLandedName = landedName;

    if (isConsecutiveMatch) {
        openReentryModal();
    } else {
        openEliminationModal();
    }
}

// ينشئ قائمة بطاقات قبلية بعدد "count" بالضبط، ويكرر القائمة مع ترقيم
// إذا تجاوز عدد اللاعبين عدد القبائل المتاحة
function randomTribeCards(count) {
    let pool = [];
    while (pool.length < count) {
        pool = pool.concat(shuffleArray(saudiTribes));
    }
    pool = pool.slice(0, count);

    const seen = {};
    return pool.map(t => {
        seen[t] = (seen[t] || 0) + 1;
        return seen[t] > 1 ? `${t} (${seen[t]})` : t;
    });
}

// -------- النافذة القياسية (إقصاء) --------
// اللاعب الذي هبطت عليه العجلة هو من "يختار" القبيلة، لكن القبائل تخفي
// خلفها بقية اللاعبين النشطين فقط - لا يمكنه أبداً استهداف أو إقصاء نفسه.
// عدد البطاقات يبقى مساوياً لعدد اللاعبين النشطين: بطاقة واحدة منها "آمنة"
// (تمثل اللاعب المختار نفسه) ولا تؤدي أبداً لإقصاء أحد إن تم اختيارها.
function openEliminationModal() {
    const chooserName = players[landedIndex].name;

    if (modalChooserNameEl) modalChooserNameEl.textContent = chooserName;
    modalTitle.textContent = "اختر قبيلة";
    modalSubtitle.textContent = `${chooserName} يختار قبيلة لتحديد من سيتم استهدافه من بقية اللاعبين`;
    tribesContainer.innerHTML = "";
    modalActions.innerHTML = "";

    // بقية اللاعبين النشطين (باستثناء اللاعب المختار نفسه) هم الأهداف المحتملة
    const otherPlayers = players.filter((p, idx) => idx !== landedIndex);
    const shuffledOthers = shuffleArray(otherPlayers);

    // نضيف فتحة "آمنة" واحدة تمثل اللاعب المختار حتى يبقى عدد البطاقات = عدد اللاعبين النشطين
    const targetSlots = shuffleArray([...shuffledOthers, null]);

    const tribeLabels = randomTribeCards(targetSlots.length);

    targetSlots.forEach((targetPlayer, i) => {
        const card = document.createElement('div');
        card.classList.add('tribe-card');
        card.textContent = tribeLabels[i];
        const targetUid = targetPlayer ? targetPlayer.uid : null;
        card.addEventListener('click', () => handleEliminationChoice(targetUid), { once: true });
        tribesContainer.appendChild(card);
    });

    modal.style.display = 'flex';
}

function handleEliminationChoice(targetUid) {
    modal.style.display = 'none';

    // الفتحة الآمنة - لا يوجد هدف خلفها فلا يُقصى أحد
    if (targetUid === null) {
        triggerEffect(`قبيلة الأمان! 🛡️<br>لم يتم استهداف أحد في هذه الجولة`, 'joy-effect');
        afterDecision();
        return;
    }

    const targetIdx = players.findIndex(p => p.uid === targetUid);
    if (targetIdx === -1) {
        // إجراء احترازي فقط في حال تغيّرت القائمة بشكل غير متوقع
        afterDecision();
        return;
    }
    const pName = players[targetIdx].name;

    const eliminationChance = Math.floor(Math.random() * 5); // 0..4
    if (eliminationChance !== 0) {
        // نجاح الإقصاء (4 من 5 = 80%)
        players.splice(targetIdx, 1);
        eliminatedPlayers.push({ name: pName });
        eliminationCounts[pName] = (eliminationCounts[pName] || 0) + 1;
        triggerEffect(`تم إقصاء اللاعب ❌<br>[ ${pName} ]`, 'sad-effect');
        spawnFloatingEmojis('sad');
    } else {
        // فشل الإقصاء (1 من 5 = 20%) - يبقى مخفياً خلف القبيلة
        triggerEffect(`إقصاء فاشل! 😎<br>نجا [ ${pName} ] خلف القبيلة!`, 'joy-effect');
        spawnFloatingEmojis('happy');
    }

    afterDecision();
}

// -------- نافذة الإرجاع --------
// تُفتح هذه النافذة حصراً عندما تهبط العجلة على نفس اسم اللاعب مرتين
// متتاليتين. أسماء اللاعبين المقصيين تبقى مخفية تماماً خلف أسماء القبائل،
// ويُسمح لكل لاعب مقصي بالعودة مرة واحدة فقط طوال اللعبة (عبر reentryUsed)
function openReentryModal() {
    const chooserName = players[landedIndex].name;

    if (modalChooserNameEl) modalChooserNameEl.textContent = chooserName;
    modalTitle.textContent = "فرصة إرجاع لاعب! (هبطت العجلة على نفس الاسم مرتين متتاليتين)";
    modalActions.innerHTML = "";

    // نحدد فقط اللاعبين المقصيين الذين لم يستخدموا فرصة إرجاعهم الوحيدة بعد
    const eligibleIndices = eliminatedPlayers
        .map((p, idx) => idx)
        .filter(idx => !reentryUsed[eliminatedPlayers[idx].name]);

    if (eligibleIndices.length === 0) {
        modalSubtitle.textContent = "";
        tribesContainer.innerHTML = "";
        if (modalChooserNameEl) modalChooserNameEl.textContent = "";
        showToast("لا يوجد لاعبين مؤهلين للإرجاع حالياً");
        finishRoundOrDraw();
        return;
    }

    modalSubtitle.textContent = "اختر قبيلة لمحاولة إرجاع لاعب مقصي بشكل عشوائي (الأسماء الحقيقية مخفية)";
    tribesContainer.innerHTML = "";

    const tribeLabels = randomTribeCards(eligibleIndices.length);
    eligibleIndices.forEach((originalIdx, i) => {
        const card = document.createElement('div');
        card.classList.add('tribe-card');
        card.textContent = tribeLabels[i];
        card.addEventListener('click', () => handleReentryChoice(originalIdx), { once: true });
        tribesContainer.appendChild(card);
    });

    // زر التخطي - لمن يريد المتابعة دون محاولة إرجاع أحد
    const skipBtn = document.createElement('button');
    skipBtn.textContent = "تخطي";
    skipBtn.classList.add('btn', 'btn-skip');
    skipBtn.addEventListener('click', handleSkipReentry, { once: true });
    modalActions.appendChild(skipBtn);

    modal.style.display = 'flex';
}

function handleReentryChoice(originalIdx) {
    modal.style.display = 'none';
    modalActions.innerHTML = "";

    // نعيد تصفير عداد التتالي فوراً بمجرد اتخاذ القرار، حتى لا يُفتح
    // إشعار الإرجاع مرة أخرى تلقائياً إذا هبط نفس الاسم لاحقاً (المرة الثالثة
    // مثلاً تُعامل كهدف عادي وليس فرصة إرجاع جديدة)
    lastLandedName = null;

    // احتمال 1 من 3 لنجاح الإرجاع
    const outcome = Math.floor(Math.random() * 3); // 0..2
    if (outcome === 0) {
        const [returned] = eliminatedPlayers.splice(originalIdx, 1);
        reentryUsed[returned.name] = true; // استهلاك فرصة الإرجاع الوحيدة لهذا اللاعب نهائياً
        players.push({ uid: ++uidCounter, name: returned.name });
        triggerEffect(`إرجاع ناجح! 🥳<br>عاد اللاعب [ ${returned.name} ] إلى اللعبة`, 'joy-effect');
        spawnFloatingEmojis('happy');
    } else {
        triggerEffect(`لم يعد أحد! 🙃<br>حظ أوفر في المرة القادمة`, 'joy-effect');
    }

    afterDecision();
}

function handleSkipReentry() {
    modal.style.display = 'none';
    modalActions.innerHTML = "";

    // نفس منطق التصفير: التخطي أيضاً يُنهي سلسلة التتالي الحالية بشكل كامل
    lastLandedName = null;

    showToast("تم تخطي فرصة الإرجاع، متابعة اللعب...");
    finishRoundOrDraw();
}

// ============================================================
//  بعد كل قرار: تحديث العجلة أو إعلان الفائز
// ============================================================
function afterDecision() {
    setTimeout(finishRoundOrDraw, 3000);
}

function finishRoundOrDraw() {
    if (players.length <= 1) {
        showFinalWinner();
    } else {
        drawWheel();
    }
}

// ============================================================
//  التأثيرات (فرح / حزن) لمدة 3 ثوانٍ
// ============================================================
function triggerEffect(htmlText, className) {
    effectContent.innerHTML = htmlText;
    effectContent.className = `effect-content ${className}`;
    effectOverlay.style.display = 'flex';

    setTimeout(() => {
        effectOverlay.style.display = 'none';
    }, 3000);
}

// ============================================================
//  إعلان الفائز النهائي
// ============================================================
function showFinalWinner() {
    const winner = players[0] ? players[0].name : "لا أحد";

    // إيجاد صاحب أكبر عدد إقصاءات من بين كل الأسماء التي دخلت اللعبة
    let topEliminator = null;
    let topCount = 0;
    Object.entries(eliminationCounts).forEach(([name, count]) => {
        if (count > topCount) {
            topCount = count;
            topEliminator = name;
        }
    });

    winnerNameEl.textContent = winner;
    winnerEliminatorEl.textContent = topEliminator
        ? `👑 صاحب أكثر إقصاءات: ${topEliminator} (${topCount})`
        : `لم تُسجَّل أي عمليات إقصاء`;

    spinBtn.classList.add('hidden');
    winnerOverlay.style.display = 'flex';
    playVictorySound();
    playWinnerSoundFile();
    startBubblesCelebration();

    // إظهار شريط الفائز الضخم أعلى الشاشة (فوق لوحة اللاعبين) - مثالي للبث المباشر
    if (winnerBanner && winnerBannerNameEl) {
        winnerBannerNameEl.textContent = winner;
        winnerBanner.classList.add('show');
    }
}

// ============================================================
//  إعادة الترتيب العشوائي
// ============================================================
shuffleBtn.addEventListener('click', () => {
    if (isSpinning) return;
    players = shuffleArray(players);
    drawWheel();
    showToast("تم إعادة ترتيب اللاعبين عشوائياً");
});

// ============================================================
//  إعادة التعيين الكاملة
// ============================================================
function resetGame() {
    players = [];
    eliminatedPlayers = [];
    eliminationCounts = {};
    reentryUsed = {};
    lastLandedName = null;
    currentAngle = 0;
    isSpinning = false;
    landedIndex = null;
    gameStarted = false;
    stopSpinTicks();
    stopBubblesCelebration();
    if (winnerSound) {
        winnerSound.pause();
        winnerSound.currentTime = 0;
    }

    drawEmptyWheel();
    updatePlayerCount();
    namesInput.value = "";

    // إعادة حقل الأسماء وزر الإضافة إلى موضعهما الأصلي في قسم التحكم
    namesInputHomeParent.insertBefore(namesInput, namesInputHomeNext);
    addBtnHomeParent.insertBefore(addBtn, addBtnHomeNext);
    gameSidebar.classList.add('hidden');
    if (leftControls) leftControls.classList.add('hidden');
    if (streamerNameInput) streamerNameInput.classList.remove('hidden');

    namesInput.classList.remove('hidden');
    addBtn.classList.remove('hidden');
    startBtn.classList.add('hidden');
    spinBtn.classList.add('hidden');
    shuffleBtn.classList.add('hidden');
    resetBtn.classList.add('hidden');

    winnerOverlay.style.display = 'none';
    effectOverlay.style.display = 'none';
    modal.style.display = 'none';
    modalActions.innerHTML = "";
    if (modalChooserNameEl) modalChooserNameEl.textContent = "";

    // إخفاء شريط الفائز الضخم عند بدء لعبة جديدة
    if (winnerBanner && winnerBannerNameEl) {
        winnerBanner.classList.remove('show');
        winnerBannerNameEl.textContent = "";
    }
}

resetBtn.addEventListener('click', resetGame);
playAgainBtn.addEventListener('click', resetGame);
