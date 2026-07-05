const namesInput = document.getElementById('names-input');
const addNamesBtn = document.getElementById('add-names-btn');
const hostPlayersList = document.getElementById('host-players-list');
const playerCountSpan = document.getElementById('player-count');
const hostSpinBtn = document.getElementById('host-spin-btn');
const resetBtn = document.getElementById('reset-btn');

let players = JSON.parse(localStorage.getItem('roulette_players') || '[]');

function updateHostUI() {
    hostPlayersList.innerHTML = '';
    playerCountSpan.textContent = players.length;
    
    players.forEach((player, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${player}</span>
            <button class="btn-delete" onclick="deletePlayer(${index})">إقصاء ❌</button>
        `;
        hostPlayersList.appendChild(li);
    });
    
    localStorage.setItem('roulette_players', JSON.stringify(players));
}

addNamesBtn.addEventListener('click', () => {
    const text = namesInput.value.trim();
    if (!text) return;
    
    // تقسيم الأسماء بناءً على السطور وتصفية الفراغات
    const newNames = text.split('\n').map(name => name.trim()).filter(name => name.length > 0);
    players = [...players, ...newNames];
    namesInput.value = ''; // تفريغ صندوق النص
    updateHostUI();
});

function deletePlayer(index) {
    players.splice(index, 1);
    updateHostUI();
}

hostSpinBtn.addEventListener('click', () => {
    if (players.length === 0) {
        alert('الرجاء إضافة أسماء أولاً!');
        return;
    }
    // إرسال إشارة الدوران لواجهة البث
    localStorage.setItem('roulette_spin', Date.now().toString());
});

resetBtn.addEventListener('click', () => {
    if (confirm('هل أنت متأكد من إعادة ضبط اللعبة وحذف كل الأسماء؟')) {
        players = [];
        updateHostUI();
    }
});

// التشغيل الأولي
updateHostUI();
const shuffleBtn = document.getElementById('shuffle-btn');

shuffleBtn.addEventListener('click', () => {
    if (players.length < 2) {
        alert('أضف اسمين على الأقل للترتيب العشوائي!');
        return;
    }
    players.sort(() => Math.random() - 0.5);
    updateHostUI();
});