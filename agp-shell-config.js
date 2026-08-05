/**
 * ==========================================================================
 *  AGP SHELL CONFIG — تهيئة الوحدة المشتركة خاصة بلعبة روليت القبائل
 * ==========================================================================
 *
 * يُحمَّل بعد AGP Core الكامل + agp-tiktok-adapter.js + agp-game-shell.js،
 * وقبل script.js مباشرة. هذا الملف الوحيد الخاص بالروليت من كل سلسلة
 * التحميل الجديدة — أي لعبة أخرى تحتاج ملف تهيئة صغير مشابه بإعداداتها
 * الخاصة فقط، دون إعادة بناء أي شيء من agp-game-shell.js.
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

    /**
     * ⚠️ إضافة: تطبيق حد أقصى فعلي لعدد اللاعبين أثناء اللوبي (يُقرَأ
     * حياً عبر AGP.gameShell.getSettings() — لا ننتظر بدء الجولة). أي
     * لاعب يتجاوز الحد يُرفَض من اللعبة، **ويُزال أيضاً من قائمة AGP
     * نفسها** حتى يبقى العدد متطابقاً بين المنصة واللعبة تماماً.
     */
    AGP.events.on('player:joined', function (payload) {
        if (!payload || !payload.player) return;

        var settings = AGP.gameShell.getSettings();
        var maxPlayers = settings.maxPlayers || 100;
        var currentCount = AGP.gameManager.getPlayers().length;

        if (currentCount > maxPlayers) {
            AGP.player.removePlayer(payload.player.id); // نتراجع عن قبوله بالمنصة أيضاً
            return;
        }

        addPlayerToGame(payload.player.name || payload.player.id);
    });

    /**
     * تمرير أي هدية حقيقية واردة فعلياً من تيك توك إلى منطق "الانعاش عن
     * طريق الدعم" داخل script.js (window.AGP_tryGiftRevival). لا شيء
     * يحدث إن كانت الميزة معطَّلة — script.js يتحقق من ذلك داخلياً.
     */
    AGP.events.on('stream:giftReceived', function (payload) {
        if (typeof window.AGP_tryGiftRevival === 'function') {
            window.AGP_tryGiftRevival((payload && payload.giftValue) || 0);
        }
    });

    AGP.gameManager.registerGame({ id: 'roulette-game', name: 'روليت القبائل' });

    AGP.gameShell.init({
        gameId: 'roulette-game',
        connectButtonLabel: 'بدء الاتصال بالبث',
        settingsFields: [
            { key: 'revivalFriendEnabled', label: 'إنعاش لاعب تم إقصاؤه', type: 'toggle', default: false },
            { key: 'revivalFriendReturnCount', label: 'كم مرة يستطيع اللاعب الرجوع عن طريق الإنعاش', type: 'counter', min: 1, default: 1 },
            { key: 'revivalSupportEnabled', label: 'ميزة الانعاش عن طريق الدعم', type: 'toggle', default: false },
            { key: 'revivalSupportReturnCount', label: 'كم مرة مسموح للاعب إنعاش نفسه', type: 'counter', min: 1, default: 1 },
            { key: 'revivalSupportCoinCount', label: 'عدد عملات الدعم للإنعاش', type: 'counter', min: 1, default: 100 },
            { key: 'maxPlayers', label: 'عدد اللاعبين بالمباراة', type: 'select', default: 50, options: [
                { value: 50, label: '50 لاعب وأقل' },
                { value: 100, label: '100 لاعب وأقل' }
            ] },
            { key: 'selectionTimerSeconds', label: 'مؤقّت مرحلة اختيار الإقصاء/الإنعاش', type: 'select', default: 0, options: [
                { value: 0, label: 'مغلق' },
                { value: 20, label: '20 ثانية' },
                { value: 25, label: '25 ثانية' },
                { value: 30, label: '30 ثانية' },
                { value: 35, label: '35 ثانية' }
            ] },
            { key: 'tempEliminationEnabled', label: 'تفعيل مؤقت إقصاء اللاعب', type: 'toggle', default: false },
            { key: 'ticketsTotal', label: 'إجمالي عدد الطلقات', type: 'counter', min: 1, default: 1 }
        ],
        onStartRound: function (settings) {
            window.AGP_ROULETTE_SETTINGS = settings;
            console.log('[Roulette] Round starting with settings:', settings);
        }
    });

}());
