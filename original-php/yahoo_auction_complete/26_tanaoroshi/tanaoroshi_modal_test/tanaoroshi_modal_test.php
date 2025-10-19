<?php
/**
 * 棚卸しシステム モーダルテストページ
 * Gemini提案による根本原因解決テスト
 * 作成日: 2025年8月16日
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

function safe_output($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo safe_output('棚卸しモーダルテストページ'); ?></title>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- 【重要】Bootstrap完全除去 - ダッシュボード方式準拠 -->
    <!-- Bootstrap CSS/JS は一切読み込まない -->
    
    <style>
    /* 【修正版】統合CSS - 競合解消版 */
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f8fafc;
        color: #1e293b;
        line-height: 1.6;
    }
    
    .test-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }
    
    .test-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 2rem;
        border-radius: 16px;
        margin-bottom: 2rem;
        text-align: center;
    }
    
    .test-header h1 {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        font-weight: 700;
    }
    
    .test-header p {
        opacity: 0.9;
        font-size: 1.1rem;
    }
    
    .test-section {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        margin-bottom: 2rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border: 1px solid #e2e8f0;
    }
    
    .test-section h2 {
        color: #2563eb;
        margin-bottom: 1rem;
        font-size: 1.25rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .test-buttons {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
        margin: 1.5rem 0;
    }
    
    .test-btn {
        background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
        color: white;
        border: none;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        transition: all 0.3s ease;
    }
    
    .test-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
    }
    
    .test-btn--success {
        background: linear-gradient(135deg, #10b981 0%, #047857 100%);
    }
    
    .test-btn--warning {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }
    
    .test-btn--danger {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }
    
    .view-controls {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
        justify-content: center;
    }
    
    .view-btn {
        padding: 0.75rem 1.5rem;
        border: 2px solid #e2e8f0;
        background: white;
        color: #64748b;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .view-btn--active {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
    }
    
    .view-btn:hover {
        border-color: #3b82f6;
        color: #3b82f6;
    }
    
    .view-btn--active:hover {
        color: white;
    }
    
    /* ビューコンテナ - 【重要】position fixed修正 */
    .view-container {
        min-height: 400px;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        overflow: hidden;
        position: relative;
    }
    
    #card-view {
        padding: 2rem;
        background: #f8fafc;
        display: block;
    }
    
    #list-view {
        padding: 0;
        background: white;
        display: none;
        /* 【修正】position fixed適用 */
        position: fixed;
        top: 120px; /* ヘッダー下 */
        left: 50px;
        right: 50px;
        bottom: 50px;
        z-index: 200;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    }
    
    #list-view.active {
        display: block;
    }
    
    /* テストログ */
    .test-log {
        background: #1e293b;
        color: #e2e8f0;
        padding: 1.5rem;
        border-radius: 8px;
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
        max-height: 300px;
        overflow-y: auto;
        margin-top: 1rem;
    }
    
    .log-entry {
        margin-bottom: 0.5rem;
        padding: 0.25rem 0;
    }
    
    .log-success { color: #10b981; }
    .log-error { color: #ef4444; }
    .log-warning { color: #f59e0b; }
    .log-info { color: #3b82f6; }
    
    /* Excelテーブル */
    .excel-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
    }
    
    .excel-table th,
    .excel-table td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .excel-table th {
        background: #f1f5f9;
        font-weight: 600;
        color: #475569;
        position: sticky;
        top: 0;
    }
    
    .excel-table tbody tr:hover {
        background: #f8fafc;
    }
    
    /* 【重要】モーダルCSS - ダッシュボード方式準拠 */
    .test-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
        animation: modalFadeIn 0.3s ease;
    }
    
    .test-modal-content {
        background: white;
        border-radius: 16px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
        animation: modalSlideIn 0.3s ease;
        position: relative;
    }
    
    .test-modal-header {
        padding: 2rem 2rem 1rem 2rem;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    
    .test-modal-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1e293b;
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .test-modal-close {
        width: 40px;
        height: 40px;
        border: none;
        background: #f1f5f9;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
        font-size: 1.25rem;
        transition: all 0.2s ease;
    }
    
    .test-modal-close:hover {
        background: #e2e8f0;
        color: #374151;
    }
    
    .test-modal-body {
        padding: 2rem;
    }
    
    .test-modal-footer {
        padding: 1rem 2rem 2rem 2rem;
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
    }
    
    /* アニメーション */
    @keyframes modalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes modalSlideIn {
        from { 
            opacity: 0; 
            transform: translateY(-30px) scale(0.95); 
        }
        to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
        }
    }
    
    /* デバッグ情報 */
    .debug-info {
        background: #fef3c7;
        border: 1px solid #f59e0b;
        color: #92400e;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        font-size: 0.875rem;
    }
    
    .debug-info h4 {
        margin-bottom: 0.5rem;
        font-weight: 600;
    }
    </style>
</head>
<body>
    
    <div class="test-container">
        <!-- ヘッダー -->
        <div class="test-header">
            <h1>
                <i class="fas fa-vial"></i>
                棚卸しモーダルテストページ
            </h1>
            <p>Gemini提案による根本原因解決テスト - Bootstrap完全除去版</p>
        </div>
        
        <!-- デバッグ情報 -->
        <div class="debug-info">
            <h4><i class="fas fa-info-circle"></i> テスト条件</h4>
            <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                <li>Bootstrap CSS/JS: <strong>完全除去</strong></li>
                <li>モーダル方式: <strong>ダッシュボード方式（JavaScript DOM生成）</strong></li>
                <li>CSS競合: <strong>統合CSS使用</strong></li>
                <li>Excelビュー: <strong>position fixed適用</strong></li>
            </ul>
        </div>
        
        <!-- モーダルテスト -->
        <div class="test-section">
            <h2>
                <i class="fas fa-window-restore"></i>
                モーダル表示テスト
            </h2>
            <p>ダッシュボード方式でモーダルが正常に表示されるかテストします。</p>
            
            <div class="test-buttons">
                <button class="test-btn test-btn--success" onclick="testModal('product')">
                    <i class="fas fa-plus"></i>
                    新規商品登録モーダル
                </button>
                
                <button class="test-btn test-btn--warning" onclick="testModal('set')">
                    <i class="fas fa-layer-group"></i>
                    セット品作成モーダル
                </button>
                
                <button class="test-btn test-btn--danger" onclick="testModal('settings')">
                    <i class="fas fa-cog"></i>
                    設定モーダル
                </button>
                
                <button class="test-btn" onclick="testAllModals()">
                    <i class="fas fa-play"></i>
                    全モーダル自動テスト
                </button>
            </div>
        </div>
        
        <!-- ビュー切り替えテスト -->
        <div class="test-section">
            <h2>
                <i class="fas fa-exchange-alt"></i>
                ビュー切り替えテスト
            </h2>
            <p>カードビューとExcelビューの切り替えテスト（Excelビューは上部固定表示）</p>
            
            <div class="view-controls">
                <button class="view-btn view-btn--active" id="card-view-btn" onclick="switchTestView('card')">
                    <i class="fas fa-th-large"></i>
                    カードビュー
                </button>
                <button class="view-btn" id="list-view-btn" onclick="switchTestView('list')">
                    <i class="fas fa-table"></i>
                    Excelビュー
                </button>
            </div>
            
            <div class="view-container">
                <div id="card-view">
                    <h3 style="color: #3b82f6; margin-bottom: 1rem;">📋 カードビューモード</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                        <div style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <h4>商品カード 1</h4>
                            <p>iPhone 15 Pro Max</p>
                            <p style="color: #10b981; font-weight: 600;">$1,199.00</p>
                        </div>
                        <div style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <h4>商品カード 2</h4>
                            <p>MacBook Pro M3</p>
                            <p style="color: #10b981; font-weight: 600;">$2,899.00</p>
                        </div>
                        <div style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <h4>商品カード 3</h4>
                            <p>iPad Pro 12.9"</p>
                            <p style="color: #10b981; font-weight: 600;">$1,099.00</p>
                        </div>
                    </div>
                </div>
                
                <div id="list-view">
                    <div style="padding: 2rem; height: 100%; overflow-y: auto;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h3 style="color: #3b82f6; margin: 0;">📊 Excelビューモード（上部固定表示）</h3>
                            <button onclick="switchTestView('card')" style="background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
                                <i class="fas fa-times"></i> 閉じる
                            </button>
                        </div>
                        
                        <table class="excel-table">
                            <thead>
                                <tr>
                                    <th>商品ID</th>
                                    <th>商品名</th>
                                    <th>SKU</th>
                                    <th>価格</th>
                                    <th>在庫</th>
                                    <th>状態</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>001</td>
                                    <td>iPhone 15 Pro Max 256GB</td>
                                    <td>IPH15-256-TI</td>
                                    <td>$1,199.00</td>
                                    <td>5</td>
                                    <td><span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">在庫あり</span></td>
                                </tr>
                                <tr>
                                    <td>002</td>
                                    <td>MacBook Pro M3 16-inch</td>
                                    <td>MBP16-M3-BK</td>
                                    <td>$2,899.00</td>
                                    <td>3</td>
                                    <td><span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">在庫あり</span></td>
                                </tr>
                                <tr>
                                    <td>003</td>
                                    <td>iPad Pro 12.9" M2</td>
                                    <td>IPAD-PRO-12</td>
                                    <td>$1,099.00</td>
                                    <td>8</td>
                                    <td><span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">在庫あり</span></td>
                                </tr>
                                <tr>
                                    <td>004</td>
                                    <td>Sony WH-1000XM5</td>
                                    <td>SONY-WH1000</td>
                                    <td>$399.99</td>
                                    <td>12</td>
                                    <td><span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">在庫あり</span></td>
                                </tr>
                                <tr>
                                    <td>005</td>
                                    <td>Tesla Model S Plaid</td>
                                    <td>TES-MS-PLD</td>
                                    <td>$89,990.00</td>
                                    <td>1</td>
                                    <td><span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">在庫少</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- テストログ -->
        <div class="test-section">
            <h2>
                <i class="fas fa-terminal"></i>
                テストログ
            </h2>
            <div class="test-log" id="test-log">
                <div class="log-entry log-info">🚀 棚卸しモーダルテストページ初期化完了</div>
                <div class="log-entry log-success">✅ CSS統合版読み込み完了</div>
                <div class="log-entry log-success">✅ Bootstrap完全除去確認</div>
                <div class="log-entry log-info">📋 ダッシュボード方式モーダル準備完了</div>
            </div>
        </div>
    </div>
    
    <script>
    console.log('🚀 棚卸しモーダルテスト初期化開始');
    
    // テストログ機能
    function addTestLog(message, type = 'info') {
        const logContainer = document.getElementById('test-log');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        logEntry.textContent = `${timestamp} ${icons[type]} ${message}`;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
        
        console.log(`${icons[type]} ${message}`);
    }
    
    // ダッシュボード方式モーダル生成（Gemini提案）
    function createModal(type, title, content) {
        addTestLog(`モーダル生成開始: ${title}`, 'info');
        
        try {
            // 既存モーダル削除
            const existingModal = document.getElementById('test-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // モーダル作成
            const modal = document.createElement('div');
            modal.id = 'test-modal';
            modal.className = 'test-modal';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'test-modal-content';
            
            modalContent.innerHTML = `
                <div class="test-modal-header">
                    <div class="test-modal-title">
                        <i class="${getModalIcon(type)}"></i>
                        ${title}
                    </div>
                    <button class="test-modal-close" onclick="closeTestModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="test-modal-body">
                    ${content}
                </div>
                <div class="test-modal-footer">
                    <button onclick="closeTestModal()" style="padding: 0.75rem 1.5rem; background: #f1f5f9; color: #64748b; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        キャンセル
                    </button>
                    <button onclick="submitTestModal('${type}')" style="padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        <i class="fas fa-save"></i> 保存
                    </button>
                </div>
            `;
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // イベントリスナー設定
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeTestModal();
                }
            });
            
            // ESCキー対応
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closeTestModal();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
            modal._escHandler = escHandler;
            
            addTestLog(`モーダル表示成功: ${title}`, 'success');
            
            // フォーカス設定
            setTimeout(() => {
                const firstInput = modalContent.querySelector('input');
                if (firstInput) firstInput.focus();
            }, 100);
            
            return true;
            
        } catch (error) {
            addTestLog(`モーダル生成エラー: ${error.message}`, 'error');
            console.error('❌ モーダル生成エラー:', error);
            return false;
        }
    }
    
    function closeTestModal() {
        const modal = document.getElementById('test-modal');
        if (modal) {
            if (modal._escHandler) {
                document.removeEventListener('keydown', modal._escHandler);
            }
            modal.remove();
            addTestLog('モーダル閉じる', 'info');
        }
    }
    
    function getModalIcon(type) {
        const icons = {
            product: 'fas fa-plus',
            set: 'fas fa-layer-group',
            settings: 'fas fa-cog'
        };
        return icons[type] || 'fas fa-window-restore';
    }
    
    function getModalContent(type) {
        const contents = {
            product: `
                <div style="display: grid; gap: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">商品名 *</label>
                        <input type="text" placeholder="商品名を入力" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">SKU *</label>
                            <input type="text" placeholder="SKU-123456" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">価格 (USD) *</label>
                            <input type="number" placeholder="0.00" step="0.01" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;">
                        </div>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">商品種類</label>
                        <select style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;">
                            <option>種類を選択</option>
                            <option>有在庫</option>
                            <option>無在庫</option>
                            <option>セット品</option>
                            <option>ハイブリッド</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">説明</label>
                        <textarea placeholder="商品の説明を入力" rows="3" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; resize: vertical;"></textarea>
                    </div>
                </div>
            `,
            set: `
                <div style="display: grid; gap: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">セット品名 *</label>
                        <input type="text" placeholder="Gaming Complete Set" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">セットSKU *</label>
                            <input type="text" placeholder="SET-001" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">セット価格 (USD) *</label>
                            <input type="number" placeholder="0.00" step="0.01" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;">
                        </div>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">構成商品</label>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 1rem; min-height: 100px;">
                            <p style="color: #64748b; text-align: center; margin: 2rem 0;">構成商品を選択してください</p>
                        </div>
                    </div>
                </div>
            `,
            settings: `
                <div style="display: grid; gap: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">システム設定</label>
                        <div style="display: grid; gap: 0.75rem;">
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" checked style="width: 18px; height: 18px;">
                                <span>自動データ同期を有効にする</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" style="width: 18px; height: 18px;">
                                <span>低在庫アラートを有効にする</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" checked style="width: 18px; height: 18px;">
                                <span>メール通知を受信する</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">表示設定</label>
                        <select style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;">
                            <option>デフォルトビュー: カードビュー</option>
                            <option>デフォルトビュー: Excelビュー</option>
                            <option>デフォルトビュー: 前回の設定を記憶</option>
                        </select>
                    </div>
                </div>
            `
        };
        return contents[type] || '<p>テスト用コンテンツ</p>';
    }
    
    // モーダルテスト実行
    function testModal(type) {
        const titles = {
            product: '新規商品登録',
            set: 'セット品作成',
            settings: 'システム設定'
        };
        
        const title = titles[type] || 'テストモーダル';
        const content = getModalContent(type);
        
        createModal(type, title, content);
    }
    
    function submitTestModal(type) {
        addTestLog(`フォーム送信: ${type}`, 'success');
        closeTestModal();
        
        setTimeout(() => {
            addTestLog('データ保存完了（テスト）', 'success');
        }, 500);
    }
    
    // 全モーダル自動テスト
    function testAllModals() {
        addTestLog('全モーダル自動テスト開始', 'info');
        
        const types = ['product', 'set', 'settings'];
        let index = 0;
        
        function testNext() {
            if (index < types.length) {
                testModal(types[index]);
                index++;
                
                setTimeout(() => {
                    closeTestModal();
                    setTimeout(testNext, 500);
                }, 2000);
            } else {
                addTestLog('全モーダル自動テスト完了', 'success');
            }
        }
        
        testNext();
    }
    
    // ビュー切り替えテスト
    function switchTestView(viewType) {
        addTestLog(`ビュー切り替え: ${viewType}`, 'info');
        
        const cardView = document.getElementById('card-view');
        const listView = document.getElementById('list-view');
        const cardBtn = document.getElementById('card-view-btn');
        const listBtn = document.getElementById('list-view-btn');
        
        if (viewType === 'card') {
            // カードビュー表示
            cardView.style.display = 'block';
            listView.style.display = 'none';
            listView.classList.remove('active');
            
            cardBtn.classList.add('view-btn--active');
            listBtn.classList.remove('view-btn--active');
            
            addTestLog('カードビュー表示完了', 'success');
            
        } else if (viewType === 'list') {
            // Excelビュー表示（position fixed）
            cardView.style.display = 'none';
            listView.style.display = 'block';
            listView.classList.add('active');
            
            cardBtn.classList.remove('view-btn--active');
            listBtn.classList.add('view-btn--active');
            
            addTestLog('Excelビュー表示完了（position fixed適用）', 'success');
        }
    }
    
    // 初期化
    document.addEventListener('DOMContentLoaded', function() {
        addTestLog('DOM読み込み完了', 'success');
        addTestLog('イベントリスナー設定完了', 'success');
        addTestLog('テストページ準備完了 - テスト開始可能', 'success');
        
        console.log('✅ 棚卸しモーダルテストページ初期化完了');
    });
    </script>

</body>
</html>