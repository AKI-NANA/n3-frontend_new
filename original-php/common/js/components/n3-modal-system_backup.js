/**
 * 🎯 N3統一モーダルシステム - Bootstrap5統合版
 * Bootstrap 5.3.0 CDN統合でモーダル機能を完全実装
 * 作成日: 2025年8月24日 Phase1
 */

console.log('🚀 N3統一モーダルシステム読み込み開始');

// N3統一モーダルシステム
window.N3Modal = {
    // 初期化状態
    initialized: false,
    activeModals: new Map(),

    /**
     * システム初期化
     */
    initialize: function() {
        if (this.initialized) return;

        console.log('🎯 N3Modal初期化開始');
        
        // Bootstrap確認
        if (typeof bootstrap === 'undefined') {
            console.warn('⚠️ Bootstrap未読み込み - 再試行します');
            setTimeout(() => this.initialize(), 500);
            return;
        }

        // 既存のN3モーダル要素を Bootstrap対応に変換
        this.convertExistingModals();
        
        // イベントリスナー設定
        this.setupEventListeners();
        
        this.initialized = true;
        console.log('✅ N3Modal初期化完了');
        
        // グローバル確認ログ
        window.N3Modal = this;
        console.log('✅ window.N3Modal設定完了');
    },

    /**
     * 既存モーダル要素のBootstrap対応変換
     */
    convertExistingModals: function() {
        const existingModals = document.querySelectorAll('.n3-modal, .modal');
        
        existingModals.forEach((modal, index) => {
            // Bootstrap形式に変換
            if (!modal.classList.contains('modal')) {
                modal.classList.add('modal', 'fade');
            }
            
            if (!modal.hasAttribute('tabindex')) {
                modal.setAttribute('tabindex', '-1');
            }

            // モーダルコンテンツ調整
            const content = modal.querySelector('.n3-modal-content, .modal-content');
            if (content) {
                content.classList.add('modal-content');
                
                // modal-dialog包含
                if (!content.parentElement.classList.contains('modal-dialog')) {
                    const dialog = document.createElement('div');
                    dialog.classList.add('modal-dialog', 'modal-lg');
                    modal.appendChild(dialog);
                    dialog.appendChild(content);
                }
            }

            console.log(`✅ モーダル変換完了: ${modal.id || 'unnamed-' + index}`);
        });
    },

    /**
     * イベントリスナー設定
     */
    setupEventListeners: function() {
        // モーダル閉じるボタン
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-n3-modal-close], .n3-modal-close, .modal-close')) {
                const modal = e.target.closest('.modal');
                if (modal) this.hide(modal.id);
            }
        });

        // モーダル開くボタン
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-n3-modal-target]')) {
                const targetId = e.target.getAttribute('data-n3-modal-target');
                if (targetId) this.show(targetId);
            }
        });

        console.log('✅ N3Modal イベントリスナー設定完了');
    },

    /**
     * モーダル表示
     */
    show: function(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`❌ モーダルが見つかりません: ${modalId}`);
            return;
        }

        try {
            const bootstrapModal = new bootstrap.Modal(modal, {
                backdrop: options.backdrop !== false ? 'static' : false,
                keyboard: options.keyboard !== false,
                focus: options.focus !== false
            });
            
            this.activeModals.set(modalId, bootstrapModal);
            bootstrapModal.show();
            
            console.log(`✅ モーダル表示: ${modalId}`);
            return bootstrapModal;
        } catch (error) {
            console.error(`❌ モーダル表示エラー (${modalId}):`, error);
            return null;
        }
    },

    /**
     * モーダル非表示
     */
    hide: function(modalId) {
        if (this.activeModals.has(modalId)) {
            const bootstrapModal = this.activeModals.get(modalId);
            bootstrapModal.hide();
            this.activeModals.delete(modalId);
            console.log(`✅ モーダル非表示: ${modalId}`);
            return true;
        }
        
        console.warn(`⚠️ アクティブでないモーダル: ${modalId}`);
        return false;
    },

    /**
     * 動的モーダル作成・表示
     */
    create: function(options = {}) {
        const modalId = options.id || 'n3-dynamic-modal-' + Date.now();
        const size = options.size || 'medium'; // small, medium, large, xl
        
        // サイズマッピング
        const sizeClasses = {
            small: 'modal-sm',
            medium: '',
            large: 'modal-lg',
            xl: 'modal-xl'
        };

        const modalHTML = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog ${sizeClasses[size]}">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${options.title || 'N3モーダル'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            ${options.content || ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">閉じる</button>
                            ${options.showOkButton !== false ? '<button type="button" class="btn btn-primary" id="' + modalId + '-ok">OK</button>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // DOM挿入
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 表示
        const bootstrapModal = this.show(modalId, options);
        
        // OKボタンイベント
        if (options.showOkButton !== false && options.onOk) {
            document.getElementById(modalId + '-ok').addEventListener('click', () => {
                options.onOk();
                this.hide(modalId);
            });
        }

        // 自動削除（非表示時）
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => {
            document.getElementById(modalId).remove();
            console.log(`✅ 動的モーダル削除: ${modalId}`);
        });

        console.log(`✅ 動的モーダル作成・表示: ${modalId}`);
        return modalId;
    },

    /**
     * アラートモーダル
     */
    alert: function(message, title = 'お知らせ') {
        return this.create({
            title: title,
            content: `<p class="mb-0">${message}</p>`,
            showOkButton: true,
            size: 'medium'
        });
    },

    /**
     * 確認モーダル
     */
    confirm: function(message, onConfirm, title = '確認') {
        return this.create({
            title: title,
            content: `<p class="mb-0">${message}</p>`,
            showOkButton: false,
            size: 'medium',
            onOk: function() {
                if (onConfirm) onConfirm();
            }
        });
    },

    /**
     * 全モーダル閉じる
     */
    closeAll: function() {
        this.activeModals.forEach((bootstrapModal, modalId) => {
            bootstrapModal.hide();
        });
        this.activeModals.clear();
        console.log('✅ 全モーダル閉じる完了');
    }
};

// Bootstrap CDN読み込み確認・自動ロード
(function() {
    // Bootstrap CSS確認・ロード
    if (!document.querySelector('link[href*="bootstrap"]')) {
        const bootstrapCSS = document.createElement('link');
        bootstrapCSS.rel = 'stylesheet';
        bootstrapCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css';
        document.head.appendChild(bootstrapCSS);
        console.log('✅ Bootstrap CSS自動読み込み完了');
    }

    // Bootstrap JS確認・ロード
    if (typeof bootstrap === 'undefined') {
        const bootstrapJS = document.createElement('script');
        bootstrapJS.src = 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js';
        bootstrapJS.onload = function() {
            console.log('✅ Bootstrap JS自動読み込み完了');
            N3Modal.initialize();
        };
        document.head.appendChild(bootstrapJS);
    } else {
        // 初期化遅延実行
        setTimeout(() => N3Modal.initialize(), 100);
    }
})();

// DOM読み込み完了時の初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => N3Modal.initialize(), 200);
    });
} else {
    setTimeout(() => N3Modal.initialize(), 100);
}

// レガシー互換性（既存コード対応）
window.openModal = function(modalId) {
    return N3Modal.show(modalId);
};

window.closeModal = function(modalId) {
    return N3Modal.hide(modalId);
};

console.log('✅ N3統一モーダルシステム読み込み完了');
