const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const playersList = document.getElementById('players-list');
const namesInput = document.getElementById('names-input');
const addNamesBtn = document.getElementById('add-names-btn');
const hostPlayersList = document.getElementById('host-players-list');
const playerCountSpan = document.getElementById('player-count');
const hostSpinBtn = document.getElementById('host-spin-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const resetBtn = document.getElementById('reset-btn');
const startRoundBtn = document.getElementById('start-round-btn');
const gameActions = document.getElementById('game-actions');
// متغيرات القواعد الجديدة
let players = [];
let deadPlayers = [];
let lastWinner = ""; // لحساب التكرار مرتين ورا بعض
let stats = {}; // لحساب عدد الإقصاءات لكل لاعب
let hasUsedRevive = {}; // لحساب إذا استخدم محاولة إنقاذ واحدة

// قائمة القبائل السعودية (سيتم السحب منها عشوائياً حسب عدد اللاعبين)
const SaudiTribesList = ["عتيبة", "قحطان", "عنزة", "الدواسر", "شمر", "مطير", "غامد", "زهران", "حرب", "بني تميم", "سبيع", "سهول", "بني خالد", "يام", "السهول", "بني شهر", "بلقرن", "عسير", "جهينة", "الحويطات", "الرشيدي", "بني مالك", "ثقيف"];

let startAngle = 0;
let arc = 0;
let spinTimeout = null;
let spinAngleStart = 10;
let spinTime = 0;
let spinTimeTotal = 0;
let roundStarted = false;
const colors = ["#8a2be2", "#1a1f3c", "#00f5ff", "#0b0c10", "#4b0082", "#000080"];

function updateAllUI() {
    hostPlayersList.innerHTML = '';
    playerCountSpan.textContent = players.length;
    
    players.forEach((player, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${player}</span> <button class="btn-delete" onclick="deletePlayer(${index})">إقصاء ❌</button>`;
        hostPlayersList.appendChild(li);
    });

    playersList.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        li.textContent = p;
        playersList.appendChild(li);
    });

    drawRouletteWheel();
    checkGameOver();
}

function drawRouletteWheel() {
    ctx.clearRect(0,0,500,500);
    if (players.length === 0) {
        ctx.fillStyle = "white"; ctx.font = 'bold 20px Segoe UI'; ctx.textAlign = "center";
        ctx.fillText("قم بإضافة الأسماء للبدء...", 250, 250); return;
    }
    arc = Math.PI / (players.length / 2);
    ctx.strokeStyle = "#8a2be2"; ctx.lineWidth = 2;
    for(let i = 0; i < players.length; i++) {
        let angle = startAngle + i * arc;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath(); ctx.arc(250, 250, 230, angle, angle + arc, false); ctx.lineTo(250, 250); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.fillStyle = "white"; ctx.font = 'bold 16px Segoe UI';
        ctx.translate(250 + Math.cos(angle + arc / 2) * 140, 250 + Math.sin(angle + arc / 2) * 140);
        ctx.rotate(angle + arc / 2 + Math.PI / 2); ctx.textAlign = "center";
        ctx.fillText(players[i], 0, 0); ctx.restore();
    }
}

addNamesBtn.addEventListener('click', () => {
    const text = namesInput.value.trim();
    if (!text) return;
    const newNames = text.split('\n').map(name => name.trim()).filter(name => name.length > 0);
    newNames.forEach(name => {
        if(!players.includes(name)) {
            players.push(name);
            stats[name] = 0;
            hasUsedRevive[name] = false;
        }
    });
    namesInput.value = ''; updateAllUI();
});

window.deletePlayer = function(index) {
    let removed = players.splice(index, 1)[0];
    deadPlayers.push(removed);
    updateAllUI();
};
startRoundBtn.addEventListener('click', () => {

    if (players.length < 2) {
        return alert("يجب إضافة لاعبين على الأقل قبل بدء الجولة!");
    }

    roundStarted = true;

    startRoundBtn.style.display = "none";
    hostSpinBtn.style.display = "flex";
    gameActions.style.display = "flex";

});
shuffleBtn.addEventListener('click', () => {
    if (players.length < 2) return alert('أضف اسمين على الأقل للترتيب العشوائي!');
    players.sort(() => Math.random() - 0.5); updateAllUI();
});

resetBtn.addEventListener('click', () => {
    if (confirm('هل أنت متأكد من مسح جولة اللعبة؟')) {
        resetBtn.addEventListener('click', () => {

    if (confirm('هل أنت متأكد من مسح جولة اللعبة؟')) {

        players = [];
        deadPlayers = [];
        lastWinner = "";
        stats = {};
        hasUsedRevive = {};

        roundStarted = false;

        startRoundBtn.style.display = "block";
        hostSpinBtn.style.display = "none";
        gameActions.style.display = "none";

        updateAllUI();

    }

});
    }
});

hostSpinBtn.addEventListener('click', () => {
    if (!roundStarted) return;
    if (players.length < 2) return alert('يجب وجود لاعبين على الأقل لتدوير العجلة!');
    spinAngleStart = Math.random() * 10 + 10; spinTime = 0; spinTimeTotal = Math.random() * 3000 + 3000;
    rotateWheel();
});

function rotateWheel() {
    spinTime += 30;
    if(spinTime >= spinTimeTotal) { stopRotateWheel(); return; }
    let spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
    startAngle += (spinAngle * Math.PI / 180); drawRouletteWheel();
    spinTimeout = setTimeout(rotateWheel, 30);
}

function stopRotateWheel() {
    clearTimeout(spinTimeout);
    let degrees = startAngle * 180 / Math.PI + 90;
    let arcd = arc * 180 / Math.PI;
    let index = Math.floor((360 - (degrees % 360)) / arcd);
    if (index < 0) index = players.length + index;
    
    let chosenOne = players[index];
    
    // فحص إذا طلع نفس الشخص مرتين ورا بعض ومعه محاولة إنقاذ
    if (chosenOne === lastWinner && deadPlayers.length > 0 && !hasUsedRevive[chosenOne]) {
        openReviveModal(chosenOne);
    } else {
        lastWinner = chosenOne;
        openTribesModal(chosenOne);
    }
}

// تشغيل نظام القبائل الغامض للإقصاء
function openTribesModal(picker) {
    document.getElementById('picker-announcement').textContent = `اللاعب [ ${picker} ] هو من سيقوم بالإقصاء الآن!`;
    const grid = document.getElementById('tribes-grid');
    grid.innerHTML = '';

    // تصفية الأسماء الأخرى غير اللاعب الحالي لمنع إقصاء نفسه
    let targets = players.filter(p => p !== picker);
    // خلط الأهداف عشوائياً
    targets.sort(() => Math.random() - 0.5);
    // جلب قبائل عشوائية بعدد الأهداف
    let shuffledTribes = [...SaudiTribesList].sort(() => Math.random() - 0.5).slice(0, targets.length);

    shuffledTribes.forEach((tribe, i) => {
        const btn = document.createElement('button');
        btn.className = 'tribe-btn';
        btn.textContent = `قبيلة ${tribe}`;
        btn.onclick = () => {
            let victim = targets[i];
            alert(`تم غدر وإقصاء اللاعب المختبئ خلف القبيلة وهو: ${victim} 🏴‍☠️`);
            
            // تسجيل الإقصاء لصالح الهداف
            stats[picker] = (stats[picker] || 0) + 1;
            
            // نقل الضحية للمقصيين
            players = players.filter(p => p !== victim);
            deadPlayers.push(victim);
            
            document.getElementById('tribes-modal').style.display = 'none';
            updateAllUI();
        };
        grid.appendChild(btn);
    });
    document.getElementById('tribes-modal').style.display = 'flex';
}

// نظام الإنقاذ والرجعة
function openReviveModal(picker) {
    const listDiv = document.getElementById('revive-list');
    listDiv.innerHTML = '';
    deadPlayers.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'tribe-btn';
        btn.style.borderColor = '#00ff7f';
        btn.textContent = p;
        btn.onclick = () => {
            // إرجاع اللاعب
            deadPlayers = deadPlayers.filter(d => d !== p);
            players.push(p);
            hasUsedRevive[picker] = true; // استهلاك المحاولة
            lastWinner = ""; // تصفير التكرار لمنع اللانهائية
            document.getElementById('revive-modal').style.display = 'none';
            alert(`تم إنقاذ اللاعب ${p} وعودته للروليت! 🎉`);
            updateAllUI();
        };
        listDiv.appendChild(btn);
    });
    document.getElementById('revive-modal').style.display = 'flex';
}

window.closeReviveModal = function() {
    document.getElementById('revive-modal').style.display = 'none';
    lastWinner = ""; // تصفير لتفادي قفل اللعبة
};

// فحص نهاية اللعبة وإعلان التتويج والملك
function checkGameOver() {
    if (players.length === 1 && deadPlayers.length > 0) {
        let finalWinner = players[0];
        document.getElementById('final-winner-name').textContent = finalWinner;
        
        // حساب صاحب أعلى إقصاءات
        let topKiller = "-";
        let maxKills = -1;
        for (let p in stats) {
            if (stats[p] > maxKills) {
                maxKills = stats[p];
                topKiller = p;
            }
        }
        
        document.getElementById('top-killer-name').textContent = maxKills > 0 ? `${topKiller} بـ (${maxKills}) غدرات!` : "لا يوجد غدرات في هذه الجولة!";
        document.getElementById('winner-modal').style.display = 'flex';
    }
}

// كود رفع وعرض الصورة المخصصة في المساحة الفارغة
document.getElementById('image-uploader').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const container = document.getElementById('preview-container');
            container.innerHTML = `<img src="${event.target.result}" alt="شعار البث المخصص">`;
        };
        reader.readAsDataURL(file);
    }
});

function easeOut(t, b, c, d) { let ts = (t /= d) * t; let tc = ts * t; return b + c * (tc + -3 * ts + 3 * t); }
hostSpinBtn.style.display = "none";
gameActions.style.display = "none";

updateAllUI();