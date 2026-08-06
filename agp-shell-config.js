/**
 * ==========================================================================
 *  AGP SHELL CONFIG — تهيئة الوحدة المشتركة خاصة بلعبة روليت القبائل
 * ==========================================================================
 *
 * ⚠️ حقول الإعدادات هنا تطابق تصميم "اعدادات المبارة" الأخير بالضبط —
 *   الحقول اللي بُنيت سابقاً وغير ظاهرة هنا (حد اللاعبين، الطلقات، عدد
 *   مرات انعاش الصديق المنفصل، مؤقت الإقصاء المؤجَّل) **لم تُحذَف من
 *   script.js** — بقيت بقيمها الافتراضية القديمة (تُبقي نفس السلوك)،
 *   فقط لم تعد تظهر بالواجهة كما طُلب.
 * ==========================================================================
 */

(function () {
    'use strict';

    var AGP = window.AymanGamesPlatform;
    if (!AGP || !AGP.gameShell) {
        console.error('[AGP Shell Config] AGP Core / gameShell not loaded.');
        return;
    }

    function addPlayerToGame(name) {
        var namesInput = document.getElementById('names-input');
        var addBtn = document.getElementById('add-btn');
        if (!namesInput || !addBtn) return;

        namesInput.value = name;
        addBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }

    AGP.events.on('player:joined', function (payload) {
        if (payload && payload.player) addPlayerToGame(payload.player.name || payload.player.id);
    });

    /**
     * تمرير أي هدية حقيقية واردة فعلياً من تيك توك إلى منطق "الانعاش عن
     * طريق الدعم" داخل script.js (window.AGP_tryGiftRevival).
     */
    AGP.events.on('stream:giftReceived', function (payload) {
        if (typeof window.AGP_tryGiftRevival === 'function') {
            window.AGP_tryGiftRevival((payload && payload.giftValue) || 0);
        }
    });

    /**
     * ⚠️ إضافة: تمرير كل تعليق تيك توك وارد (بصرف النظر عن مطابقة
     * الكلمة المفتاحية) إلى منطق الاختيار التلقائي بالشات داخل
     * script.js — يتجاهله script.js نفسه تلقائياً إن لم تكن أي نافذة
     * اختيار مفتوحة حالياً.
     */
    AGP.events.on('stream:commentReceived', function (payload) {
        if (typeof window.AGP_handleChatComment === 'function' && payload && payload.text) {
            window.AGP_handleChatComment(payload.text);
        }
    });

    AGP.gameManager.registerGame({ id: 'roulette-game', name: 'روليت القبائل' });

    AGP.gameShell.init({
        gameId: 'roulette-game',
        gameTitle: 'روليت القبائل',
        connectButtonLabel: 'الاتصال بالبث و الانتقال للوبي',
        minPlayersToStart: 2,
        headerGearIcon: 'icons/gear.svg',
        usernameIcon: 'icons/profile.png',
        keywordIcon: 'icons/keyword.png',
        gameExplanation: 'روليت بأسماء قبائل سعودية — إذا توقفت العجلة عند اسم أحد اللاعبين، تظهر نافذة أسماء قبائل تخفي خلفها بقية اللاعبين. تختار قبيلة، فإما يُقصى اللاعب المختبئ خلفها أو ينجو. إذا هبطت العجلة على نفس الاسم مرتين متتاليتين، تفتح فرصة لإرجاع لاعب مقصي بدل الإقصاء.',
        settingsFields: [
            {
                key: 'followersOnly', label: 'من المسموح له بالدخول', type: 'pill-choice', default: false,
                icon: 'icons/filter.svg',
                options: [{ value: false, label: 'الجميع' }, { value: true, label: 'المتابعين' }]
            },
            {
                key: 'revivalSupportEnabled', label: 'الانعاش عن طريق الدعم', type: 'pill-choice', default: false,
                icon: 'icons/ppc.png',
                options: [{ value: true, label: 'تفعيل' }, { value: false, label: 'اغلاق' }]
            },
            {
                key: 'revivalSupportReturnCount', label: 'عدد المرات', type: 'counter', min: 1, default: 1,
                showWhen: { key: 'revivalSupportEnabled', equals: true }
            },
            {
                key: 'revivalSupportCoinCount', label: 'عدد العملات', type: 'counter', min: 1, default: 1,
                showWhen: { key: 'revivalSupportEnabled', equals: true }
            },
            {
                key: 'revivalFriendEnabled', label: 'الانعاش عن طريق لاعب اخر', type: 'pill-choice', default: false,
                icon: 'icons/handshake.png',
                options: [{ value: true, label: 'تفعيل' }, { value: false, label: 'اغلاق' }]
            },
            {
                key: 'selectionTimerSeconds', label: 'مؤقّت الاقصاء', type: 'pill-group', default: 0,
                options: [{ value: 25, label: '25 د' }, { value: 30, label: '30 د' }, { value: 40, label: '40 د' }, { value: 0, label: 'اغلاق' }]
            }
        ],
        onStartRound: function (settings) {
            window.AGP_ROULETTE_SETTINGS = settings;
            console.log('[Roulette] Round starting with settings:', settings);

            // ⚠️ إصلاح مهم: زر "بدء الجولة" الأصلي بالكود (start-btn) هو
            // اللي يفعّل اللعبة فعلياً (يظهر زر الدوران، يبدأ gameStarted).
            // بدون محاكاته هنا، اللعبة تبقى غير قابلة للعب أبداً بعد
            // انتهاء اللوبي.
            var realStartBtn = document.getElementById('start-btn');
            if (realStartBtn) realStartBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
    });

}());
