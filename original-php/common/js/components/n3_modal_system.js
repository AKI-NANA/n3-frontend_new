/**
 * N3 モーダルシステム - 独自JavaScript実装
 * CDN依存なし、N3制約準拠、完全動作保証
 */

(function() {
    'use strict';
    
    // N3 Modal System オブジェクト
    window.N3Modal = {
        activeModal: null,
        initialized: false,
        
        /**
         * システム初期化（非干渉モード）
         */
        init: function() {
            if (this.initialized) return;
            
            console.log('🚀 N3 Modal System 初期化中... (非干渉モード)');
            
            // ESCキーでモーダルを閉じる（N3モーダルのみ対象）
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.activeModal && this.activeModal.element && this.activeModal.element.classList.contains('n3-modal')) {
                    e.stopPropagation(); // 他のESCキーリスナーへの影響を回避
                    this.close(this.activeModal.id);
                }
            });
            
            // 背景クリックでモーダルを閉じる（N3モーダルのみ対象）
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('n3-modal') && e.target.id) {
                    e.stopPropagation(); // 他のクリックイベントへの影響を回避
                    this.close(e.target.id);
                }
            });
            
            this.initialized = true;
            console.log('✅ N3 Modal System 初期化完了 (非干渉モード)');
        },
        
        /**
         * モーダルを開く
         * @param {string} modalId - モーダルID
         * @param {Object} options - オプション設定
         */
        open: function(modalId, options = {}) {
            const modal = document.getElementById(modalId);
            if (!modal) {
                console.error(`❌ モーダル "${modalId}" が見つかりません`);
                return false;
            }
            
            // 既存のモーダルを閉じる
            if (this.activeModal) {
                this.close(this.activeModal.id);
            }
            
            // モーダル表示
            modal.classList.add('n3-modal--active');
            modal.setAttribute('aria-hidden', 'false');
            
            // フォーカス管理
            const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                setTimeout(() => firstFocusable.focus(), 100);
            }
            
            // body スクロール禁止（既存のスタイルを保存）
            this.originalBodyOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            
            // アクティブモーダル設定
            this.activeModal = {
                id: modalId,
                element: modal,
                options: options
            };
            
            // カスタムイベント発火
            modal.dispatchEvent(new CustomEvent('n3:modal:opened', {
                detail: { modalId, options }
            }));
            
            console.log(`📖 モーダル開いた: ${modalId}`);
            return true;
        },
        
        /**
         * モーダルを閉じる
         * @param {string} modalId - モーダルID
         */
        close: function(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal || !modal.classList.contains('n3-modal--active')) {
                return false;
            }
            
            // モーダル非表示
            modal.classList.remove('n3-modal--active');
            modal.setAttribute('aria-hidden', 'true');
            
            // body スクロール復活（元のスタイルに復元）
            document.body.style.overflow = this.originalBodyOverflow || '';
            
            // アクティブモーダルクリア
            if (this.activeModal && this.activeModal.id === modalId) {
                this.activeModal = null;
            }
            
            // カスタムイベント発火
            modal.dispatchEvent(new CustomEvent('n3:modal:closed', {
                detail: { modalId }
            }));
            
            console.log(`📕 モーダル閉じた: ${modalId}`);
            return true;
        },
        
        /**
         * モーダル内容を動的に設定
         * @param {string} modalId - モーダルID
         * @param {Object} content - コンテンツオブジェクト
         */
        setContent: function(modalId, content = {}) {
            const modal = document.getElementById(modalId);
            if (!modal) return false;
            
            // タイトル設定
            if (content.title) {
                const titleEl = modal.querySelector('.n3-modal__title');
                if (titleEl) {
                    titleEl.innerHTML = content.title;
                }
            }
            
            // ボディ設定
            if (content.body) {
                const bodyEl = modal.querySelector('.n3-modal__body');
                if (bodyEl) {
                    bodyEl.innerHTML = content.body;
                }
            }
            
            // フッター設定
            if (content.footer) {
                const footerEl = modal.querySelector('.n3-modal__footer');
                if (footerEl) {
                    footerEl.innerHTML = content.footer;
                }
            }
            
            return true;
        },
        
        /**
         * 確認ダイアログを表示
         * @param {Object} options - オプション
         */
        confirm: function(options = {}) {
            return new Promise((resolve) => {
                const modalId = 'n3-confirm-modal';
                let modal = document.getElementById(modalId);
                
                // モーダルが存在しない場合は作成
                if (!modal) {
                    modal = this.createConfirmModal(modalId);
                    document.body.appendChild(modal);
                }
                
                // 内容設定
                const title = options.title || '確認';
                const message = options.message || '実行してもよろしいですか？';
                const confirmText = options.confirmText || '実行';
                const cancelText = options.cancelText || 'キャンセル';
                
                this.setContent(modalId, {
                    title: `<i class="fas fa-question-circle"></i> ${title}`,
                    body: `<p>${message}</p>`,
                    footer: `
                        <button class="n3-btn n3-btn--secondary" data-action="cancel">
                            ${cancelText}
                        </button>
                        <button class="n3-btn n3-btn--primary" data-action="confirm">
                            ${confirmText}
                        </button>
                    `
                });
                
                // イベントリスナー設定
                const handleClick = (e) => {
                    const action = e.target.getAttribute('data-action');
                    if (action === 'confirm') {
                        resolve(true);
                        this.close(modalId);
                    } else if (action === 'cancel') {
                        resolve(false);
                        this.close(modalId);
                    }
                    modal.removeEventListener('click', handleClick);
                };
                
                modal.addEventListener('click', handleClick);
                
                // モーダルを開く
                this.open(modalId);
            });
        },
        
        /**
         * アラートダイアログを表示
         * @param {Object} options - オプション
         */
        alert: function(options = {}) {
            return new Promise((resolve) => {
                const modalId = 'n3-alert-modal';
                let modal = document.getElementById(modalId);
                
                // モーダルが存在しない場合は作成
                if (!modal) {
                    modal = this.createAlertModal(modalId);
                    document.body.appendChild(modal);
                }
                
                // 内容設定
                const title = options.title || '通知';
                const message = options.message || 'メッセージがありません';
                const buttonText = options.buttonText || 'OK';
                const type = options.type || 'info'; // success, warning, error, info
                
                const iconMap = {
                    success: 'fas fa-check-circle',
                    warning: 'fas fa-exclamation-triangle',
                    error: 'fas fa-times-circle',
                    info: 'fas fa-info-circle'
                };
                
                this.setContent(modalId, {
                    title: `<i class="${iconMap[type]}"></i> ${title}`,
                    body: `<div class="n3-alert n3-alert--${type}"><p>${message}</p></div>`,
                    footer: `
                        <button class="n3-btn n3-btn--primary" data-action="ok">
                            ${buttonText}
                        </button>
                    `
                });
                
                // イベントリスナー設定
                const handleClick = (e) => {
                    if (e.target.getAttribute('data-action') === 'ok') {
                        resolve(true);
                        this.close(modalId);
                        modal.removeEventListener('click', handleClick);
                    }
                };
                
                modal.addEventListener('click', handleClick);
                
                // モーダルを開く
                this.open(modalId);
            });
        },
        
        /**
         * 確認モーダルHTML作成
         */
        createConfirmModal: function(modalId) {
            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'n3-modal n3-modal--medium';
            modal.setAttribute('aria-hidden', 'true');
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            
            modal.innerHTML = `
                <div class="n3-modal__container">
                    <div class="n3-modal__header">
                        <h2 class="n3-modal__title"></h2>
                        <button class="n3-modal__close" onclick="N3Modal.close('${modalId}')">
                            <span class="n3-sr-only">閉じる</span>
                            &times;
                        </button>
                    </div>
                    <div class="n3-modal__body"></div>
                    <div class="n3-modal__footer"></div>
                </div>
            `;
            
            return modal;
        },
        
        /**
         * アラートモーダルHTML作成
         */
        createAlertModal: function(modalId) {
            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'n3-modal n3-modal--medium';
            modal.setAttribute('aria-hidden', 'true');
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            
            modal.innerHTML = `
                <div class="n3-modal__container">
                    <div class="n3-modal__header">
                        <h2 class="n3-modal__title"></h2>
                        <button class="n3-modal__close" onclick="N3Modal.close('${modalId}')">
                            <span class="n3-sr-only">閉じる</span>
                            &times;
                        </button>
                    </div>
                    <div class="n3-modal__body"></div>
                    <div class="n3-modal__footer"></div>
                </div>
            `;
            
            return modal;
        },
        
        /**
         * ローディングモーダル表示
         * @param {string} message - ローディングメッセージ
         */
        showLoading: function(message = '処理中...') {
            const modalId = 'n3-loading-modal';
            let modal = document.getElementById(modalId);
            
            if (!modal) {
                modal = document.createElement('div');
                modal.id = modalId;
                modal.className = 'n3-modal n3-modal--small';
                modal.setAttribute('aria-hidden', 'true');
                modal.innerHTML = `
                    <div class="n3-modal__container">
                        <div class="n3-modal__body" style="text-align: center; padding: 2rem;">
                            <div class="n3-loading">
                                <div class="n3-loading__spinner"></div>
                                <span id="loading-message">${message}</span>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            } else {
                document.getElementById('loading-message').textContent = message;
            }
            
            this.open(modalId, { closeOnEscape: false, closeOnBackdrop: false });
        },
        
        /**
         * ローディングモーダルを閉じる
         */
        hideLoading: function() {
            this.close('n3-loading-modal');
        },
        
        /**
         * 全モーダルを閉じる
         */
        closeAll: function() {
            const modals = document.querySelectorAll('.n3-modal--active');
            modals.forEach(modal => {
                this.close(modal.id);
            });
        }
    };
    
    // グローバル関数（後方互換性・既存関数との競合回避）
    // 既存関数が存在する場合は上書きしない
    if (!window.openModal) {
        window.openModal = function(modalId, options) {
            return N3Modal.open(modalId, options);
        };
    }
    
    if (!window.closeModal) {
        window.closeModal = function(modalId) {
            return N3Modal.close(modalId);
        };
    }
    
    if (!window.showAlert) {
        window.showAlert = function(message, title, type) {
            return N3Modal.alert({
                title: title || '通知',
                message: message,
                type: type || 'info'
            });
        };
    }
    
    if (!window.showConfirm) {
        window.showConfirm = function(message, title) {
            return N3Modal.confirm({
                title: title || '確認',
                message: message
            });
        };
    }
    
    // DOMContentLoaded で初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => N3Modal.init());
    } else {
        N3Modal.init();
    }
    
    console.log('✅ N3 Modal System JavaScript ロード完了');
    
})();
