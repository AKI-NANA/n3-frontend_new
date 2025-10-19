/**
 * N3 Modal System - 軽量・非干渉版
 * 既存ライブラリとの競合を避けた最小限実装
 */

(function() {
    'use strict';
    
    // N3ModalSafe - 完全非干渉版
    window.N3ModalSafe = {
        activeModal: null,
        
        /**
         * 簡単なアラート表示
         */
        simpleAlert: function(title, message, callback) {
            const existingAlert = document.getElementById('n3-simple-alert');
            if (existingAlert) {
                existingAlert.remove();
            }
            
            const alertEl = document.createElement('div');
            alertEl.id = 'n3-simple-alert';
            alertEl.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease-out;
            `;
            
            alertEl.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 8px;
                    padding: 2rem;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                    animation: slideIn 0.3s ease-out;
                ">
                    <h3 style="margin: 0 0 1rem 0; color: #1f2937;">${title}</h3>
                    <p style="margin: 0 0 1.5rem 0; color: #4b5563; line-height: 1.5;">${message}</p>
                    <div style="text-align: right;">
                        <button id="alert-ok-btn" style="
                            background: #3b82f6;
                            color: white;
                            border: none;
                            padding: 0.5rem 1rem;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.875rem;
                        ">OK</button>
                    </div>
                </div>
            `;
            
            // CSS Animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `;
            document.head.appendChild(style);
            
            document.body.appendChild(alertEl);
            
            const okBtn = document.getElementById('alert-ok-btn');
            okBtn.focus();
            
            function closeAlert() {
                alertEl.remove();
                style.remove();
                if (callback) callback();
            }
            
            okBtn.addEventListener('click', closeAlert);
            alertEl.addEventListener('click', function(e) {
                if (e.target === alertEl) closeAlert();
            });
            
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    closeAlert();
                }
            });
        },
        
        /**
         * モーダルを開く
         */
        open: function(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return false;
            
            modal.style.display = 'block';
            modal.classList.add('n3-modal--active');
            
            this.activeModal = modalId;
            document.body.style.overflow = 'hidden';
            
            return true;
        },
        
        /**
         * モーダルを閉じる
         */
        close: function(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return false;
            
            modal.style.display = 'none';
            modal.classList.remove('n3-modal--active');
            
            this.activeModal = null;
            document.body.style.overflow = '';
            
            return true;
        },
        
        /**
         * モーダル内容設定
         */
        setContent: function(modalId, content) {
            const modal = document.getElementById(modalId);
            if (!modal) return false;
            
            if (content.title) {
                const titleEl = modal.querySelector('.n3-modal__title');
                if (titleEl) titleEl.innerHTML = content.title;
            }
            
            if (content.body) {
                const bodyEl = modal.querySelector('.n3-modal__body, #modal-content');
                if (bodyEl) bodyEl.innerHTML = content.body;
            }
            
            return true;
        }
    };
    
    // CSS追加
    const modalCSS = document.createElement('style');
    modalCSS.textContent = `
        .n3-modal {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 999999;
            align-items: center;
            justify-content: center;
        }
        .n3-modal--active {
            display: flex !important;
        }
        .n3-modal__container {
            background: white;
            border-radius: 8px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow: auto;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        }
        .n3-modal__header {
            padding: 1rem;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .n3-modal__title {
            margin: 0;
            font-size: 1.25rem;
            color: #1f2937;
        }
        .n3-modal__close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.25rem;
            line-height: 1;
        }
        .n3-modal__body {
            padding: 1rem;
        }
        .n3-modal__footer {
            padding: 1rem;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
        }
        .n3-btn {
            padding: 0.5rem 1rem;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
        }
        .n3-btn--primary {
            background: #3b82f6;
            color: white;
        }
        .n3-btn--secondary {
            background: #6b7280;
            color: white;
        }
        .n3-alert {
            padding: 1rem;
            border-radius: 6px;
            margin: 1rem 0;
        }
        .n3-alert--success {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #166534;
        }
        .n3-sr-only {
            position: absolute;
            width: 1px; height: 1px;
            padding: 0; margin: -1px;
            overflow: hidden;
            clip: rect(0,0,0,0);
            white-space: nowrap;
            border: 0;
        }
    `;
    document.head.appendChild(modalCSS);
    
    console.log('✅ N3 Modal Safe System (軽量・非干渉版) ロード完了');
    
})();
