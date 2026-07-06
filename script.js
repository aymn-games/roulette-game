// ============================================================
//  لعبة روليت القبائل - المنطق الكامل
// ============================================================

// أسماء القبائل السعودية المستخدمة للتمويه فقط (لا تؤثر على النتيجة)
const saudiTribes = [
    "عتيبة", "عنزة", "مطير", "قحطان", "شمر", "الدواسر", "بني تميم",
    "حرب", "غامد", "زهران", "الأشراف", "سبيع", "السهول", "يام",
    "بني خالد", "عسير", "المنتفق", "بني شهر", "شمران", "بالقرن"
];

// كل عنصر على العجلة له اسم + معرف فريد (uid) حتى نستطيع تمييز الأسماء المكررة عن بعضها
let players = [];          // [{ uid, name }]
let eliminatedPlayers = []; // [{ uid, name }]
let eliminationCounts = {}; // { name: عدد مرات الإقصاء }
let uidCounter = 0;

let currentAngle = 0;      // بالراديان
let isSpinning = false;
let landedIndex = null;    // الفهرس الذي توقفت عنده العجلة في هذه الجولة

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
const effectOverlay = document.getElementById('effect-overlay');
const effectContent = document.getElementById('effect-content');
const winnerOverlay = document.getElementById('winner-overlay');
const winnerNameEl = document.getElementById('winner-name');
const winnerEliminatorEl = document.getElementById('winner-eliminator');
const playAgainBtn = document.getElementById('play-again-btn');
const playerCountEl = document.getElementById('player-count');
const toastEl = document.getElementById('toast');

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

    if (names.length < 2) {
        showToast("يرجى إدخال اسمين على الأقل لتفعيل العجلة.");
        return;
    }

    players = names.map(name => ({ uid: ++uidCounter, name }));
    eliminatedPlayers = [];
    eliminationCounts = {};
    names.forEach(n => { eliminationCounts[n] = 0; });
    currentAngle = 0;

    drawWheel();
    startBtn.classList.remove('hidden');
    showToast(`تمت إضافة ${players.length} لاعب بنجاح!`);
});

// ============================================================
//  زر بدء الجولة
// ============================================================
startBtn.addEventListener('click', () => {
    if (players.length < 2) return;
    spinBtn.classList.remove('hidden');
    shuffleBtn.classList.remove('hidden');
    resetBtn.classList.remove('hidden');
    startBtn.classList.add('hidden');
    namesInput.classList.add('hidden');
    addBtn.classList.add('hidden');
});

// ============================================================
//  التدوير
// ============================================================
spinBtn.addEventListener('click', () => {
    if (isSpinning || players.length < 2) return;
    isSpinning = true;
    spinBtn.disabled = true;

    const spinAngleStart = Math.random() * 10 + 15; // سرعة ابتدائية (درجة/فريم تقريباً)
    const spinTimeTotal = Math.random() * 2500 + 4500;
    let spinTime = 0;

    function rotateWheel() {
        spinTime += 30;
        if (spinTime >= spinTimeTotal) {
            isSpinning = false;
            spinBtn.disabled = false;
            resolveLanding();
        } else {
            const progress = spinTime / spinTimeTotal;
            const ease = spinAngleStart * (1 - progress); // تباطؤ خطي بسيط
            currentAngle += (ease * Math.PI / 180);
            drawWheel();
            requestAnimationFrame(rotateWheel);
        }
    }
    rotateWheel();
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
// ============================================================
function openDecisionModal() {
    const landedName = players[landedIndex].name;
    const duplicateCount = players.filter(p => p.name === landedName).length;

    if (duplicateCount >= 2) {
        openReentryModal();
    } else {
        openEliminationModal();
    }
}

function randomTribeCards(count) {
    const shuffled = [...saudiTribes].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// -------- النافذة القياسية (إقصاء) --------
function openEliminationModal() {
    modalTitle.textContent = "اختر قبيلة";
    modalSubtitle.textContent = "اختر إحدى القبائل لكشف مصير اللاعب المختار";
    tribesContainer.innerHTML = "";

    randomTribeCards(6).forEach(tribe => {
        const card = document.createElement('div');
        card.classList.add('tribe-card');
        card.textContent = `قبيلة: ${tribe}`;
        card.addEventListener('click', handleEliminationChoice, { once: true });
        tribesContainer.appendChild(card);
    });

    modal.style.display = 'flex';
}

function handleEliminationChoice() {
    modal.style.display = 'none';
    const pName = players[landedIndex].name;

    const eliminationChance = Math.floor(Math.random() * 5); // 0..4
    if (eliminationChance !== 0) {
        // نجاح الإقصاء (4 من 5 = 80%)
        players.splice(landedIndex, 1);
        eliminatedPlayers.push({ name: pName });
        eliminationCounts[pName] = (eliminationCounts[pName] || 0) + 1;
        triggerEffect(`تم إقصاء اللاعب ❌<br>[ ${pName} ]`, 'sad-effect');
    } else {
        // فشل الإقصاء (1 من 5 = 20%) - يبقى مخفياً في العجلة
        triggerEffect(`إقصاء فاشل! 😎<br>نجا اللاعب المستهدف خلف القبيلة!`, 'joy-effect');
    }

    afterDecision();
}

// -------- نافذة الإرجاع (عند اسم مكرر) --------
function openReentryModal() {
    modalTitle.textContent = "فرصة إرجاع لاعب!";

    // هذا الاسم تكرر على العجلة - نستهلك هذا الموضع كـ "بطاقة حظ" لإرجاع مقصي سابقاً
    if (eliminatedPlayers.length === 0) {
        modalSubtitle.textContent = "";
        showToast("لا يوجد لاعبين مقصيين لإرجاعهم حالياً");
        players.splice(landedIndex, 1); // استهلاك الموضع المكرر
        finishRoundOrDraw();
        return;
    }

    modalSubtitle.textContent = "اختر قبيلة لمحاولة إرجاع لاعب مقصي بشكل عشوائي";
    tribesContainer.innerHTML = "";

    const tribeLabels = randomTribeCards(eliminatedPlayers.length);
    eliminatedPlayers.forEach((elim, idx) => {
        const card = document.createElement('div');
        card.classList.add('tribe-card');
        card.textContent = `قبيلة: ${tribeLabels[idx] || ('#' + (idx + 1))}`;
        card.addEventListener('click', () => handleReentryChoice(idx), { once: true });
        tribesContainer.appendChild(card);
    });

    modal.style.display = 'flex';
}

function handleReentryChoice(chosenIdx) {
    modal.style.display = 'none';

    // استهلاك الموضع المكرر الذي أدى لهذه الفرصة
    players.splice(landedIndex, 1);

    // احتمال 1 من 3 لنجاح الإرجاع
    const outcome = Math.floor(Math.random() * 3); // 0..2
    if (outcome === 0) {
        const [returned] = eliminatedPlayers.splice(chosenIdx, 1);
        players.push({ uid: ++uidCounter, name: returned.name });
        triggerEffect(`إرجاع ناجح! 🥳<br>عاد اللاعب [ ${returned.name} ] إلى اللعبة`, 'joy-effect');
    } else {
        triggerEffect(`لم يعد أحد! 🙃<br>حظ أوفر في المرة القادمة`, 'joy-effect');
    }

    afterDecision();
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

    winnerNameEl.textContent = `الفائز: ${winner}`;
    winnerEliminatorEl.textContent = topEliminator
        ? `صاحب أكثر إقصاءات: ${topEliminator} (${topCount})`
        : `لم تُسجَّل أي عمليات إقصاء`;

    spinBtn.classList.add('hidden');
    winnerOverlay.style.display = 'flex';
}

// ============================================================
//  إعادة الترتيب العشوائي
// ============================================================
shuffleBtn.addEventListener('click', () => {
    if (isSpinning) return;
    players.sort(() => Math.random() - 0.5);
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
    currentAngle = 0;
    isSpinning = false;
    landedIndex = null;

    drawEmptyWheel();
    updatePlayerCount();
    namesInput.value = "";

    namesInput.classList.remove('hidden');
    addBtn.classList.remove('hidden');
    startBtn.classList.add('hidden');
    spinBtn.classList.add('hidden');
    shuffleBtn.classList.add('hidden');
    resetBtn.classList.add('hidden');

    winnerOverlay.style.display = 'none';
    effectOverlay.style.display = 'none';
    modal.style.display = 'none';
}

resetBtn.addEventListener('click', resetGame);
playAgainBtn.addEventListener('click', resetGame);
