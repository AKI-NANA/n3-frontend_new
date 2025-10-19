/**
 * N3 モーダルシステム診断・修復ツール
 * ボタンが効かない問題の特定と解決
 */

// デバッグ情報表示
console.log('🔍 モーダル診断開始');
console.log('window.N3Modal:', window.N3Modal);
console.log('N3Modal.initialized:', window.N3Modal?.initialized);

// 手動でN3Modal初期化を実行（念のため）
if (window.N3Modal && typeof window.N3Modal.init === 'function') {
    window.N3Modal.init();
    console.log('✅ N3Modal手動初期化完了');
} else {
    console.error('❌ N3Modalが読み込まれていません');
}

// CSS追加（不足している可能性があるモーダルCSS）
const modalCSS = document.createElement('style');
modalCSS.id = 'n3-modal-css-fix';
modalCSS.textContent = `
/* N3モーダルCSS修正版 */
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
    animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: scale(0.8) translateY(-20px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
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
    color: #6b7280;
    transition: color 0.2s ease;
}

.n3-modal__close:hover {
    color: #374151;
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
    transition: all 0.2s ease;
}

.n3-btn--primary {
    background: #3b82f6;
    color: white;
}

.n3-btn--primary:hover {
    background: #2563eb;
}

.n3-btn--secondary {
    background: #6b7280;
    color: white;
}

.n3-btn--secondary:hover {
    background: #4b5563;
}

.n3-btn--success {
    background: #10b981;
    color: white;
}

.n3-btn--success:hover {
    background: #059669;
}

.n3-btn--warning {
    background: #f59e0b;
    color: white;
}

.n3-btn--warning:hover {
    background: #d97706;
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

.n3-alert--warning {
    background: #fffbeb;
    border: 1px solid #fed7aa;
    color: #92400e;
}

.n3-alert--error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
}

.n3-alert--info {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1e40af;
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

.n3-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.n3-loading__spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid #e5e7eb;
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;

if (!document.getElementById('n3-modal-css-fix')) {
    document.head.appendChild(modalCSS);
    console.log('✅ N3モーダルCSS追加完了');
}

// 強制的なテスト関数（デバッグ用）
window.forceTestModal = function() {
    console.log('🧪 強制モーダルテスト開始');
    
    // 1. N3Modal存在確認
    if (!window.N3Modal) {
        console.error('❌ N3Modalが存在しません');
        alert('N3Modalが読み込まれていません');
        return;
    }
    
    // 2. test-modal要素確認
    const testModal = document.getElementById('test-modal');
    console.log('test-modal要素:', testModal);
    
    if (!testModal) {
        console.warn('⚠️ test-modal要素が見つかりません - 動的作成します');
        
        // 動的にモーダル作成
        const modal = document.createElement('div');
        modal.id = 'test-modal';
        modal.className = 'n3-modal n3-modal--large';
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        
        modal.innerHTML = `
            <div class="n3-modal__container">
                <div class="n3-modal__header">
                    <h2 class="n3-modal__title">
                        <i class="fas fa-microscope"></i> デバッグ用モーダル
                    </h2>
                    <button class="n3-modal__close" onclick="N3Modal.close('test-modal')">
                        <span class="n3-sr-only">閉じる</span>
                        &times;
                    </button>
                </div>
                <div class="n3-modal__body">
                    <div class="n3-alert n3-alert--success">
                        <strong>🎉 モーダルが正常に動作しています！</strong>
                    </div>
                    <p>このモーダルはデバッグ用に動的作成されました。</p>
                    <p>現在時刻: <span id="modal-time">${new Date().toLocaleString('ja-JP')}</span></p>
                </div>
                <div class="n3-modal__footer">
                    <button class="n3-btn n3-btn--secondary" onclick="N3Modal.close('test-modal')">
                        閉じる
                    </button>
                    <button class="n3-btn n3-btn--success" onclick="alert('ボタンクリック成功！')">
                        テストボタン
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        console.log('✅ test-modalを動的作成しました');
    }
    
    // 3. モーダル開く
    const result = window.N3Modal.open('test-modal');
    console.log('モーダル開く結果:', result);
    
    if (!result) {
        console.error('❌ モーダルが開けませんでした');
        alert('モーダルが開けませんでした');
    } else {
        console.log('✅ モーダルが正常に開きました');
    }
};

// ページ読み込み後にテスト
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOMContentLoaded - モーダル診断ツール稼働開始');
    
    // 3秒後に診断実行
    setTimeout(() => {
        console.log('🔍 モーダル診断実行中...');
        console.log('N3Modal状態:', {
            exists: !!window.N3Modal,
            initialized: window.N3Modal?.initialized,
            activeModal: window.N3Modal?.activeModal
        });
        
        // ボタンイベント確認
        const testBtn = document.querySelector('button[onclick*="testModal"]');
        console.log('テストモーダルボタン:', testBtn);
        
        if (!testBtn) {
            console.warn('⚠️ testModalボタンが見つかりません');
            
            // ボタンを動的作成
            const debugBtn = document.createElement('button');
            debugBtn.textContent = '🧪 デバッグモーダルテスト';
            debugBtn.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 999999;
                padding: 10px 15px;
                background: #ef4444;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
            `;
            debugBtn.onclick = window.forceTestModal;
            document.body.appendChild(debugBtn);
            console.log('✅ デバッグボタンを追加しました（画面右上）');
        }
        
    }, 3000);
});

console.log('✅ モーダル診断ツール読み込み完了');
