<?php if (!defined('SECURE_ACCESS')) die('Direct access not allowed'); ?>

<div class="ebay-integration-container">
    <!-- ヘッダーセクション -->
    <div class="ebay-header">
        <div class="ebay-header-content">
            <div class="ebay-title-section">
                <h1><i class="fas fa-shopping-cart"></i> eBay API統合システム</h1>
                <p class="ebay-subtitle">Hook統合による完全eBay APIシステム - リアルタイムデータ取得・PostgreSQL保存</p>
            </div>
            <div class="ebay-status-section" id="systemStatus">
                <div class="status-indicator loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>システム状態確認中...</span>
                </div>
            </div>
        </div>
    </div>

    <!-- 制御パネル -->
    <div class="ebay-control-panel">
        <div class="control-group">
            <h3><i class="fas fa-download"></i> データ取得制御</h3>
            <div class="control-inputs">
                <div class="input-group">
                    <label for="fetchLimit">取得数</label>
                    <select id="fetchLimit">
                        <option value="10">10件（テスト）</option>
                        <option value="20">20件（小規模）</option>
                        <option value="50" selected>50件（標準）</option>
                        <option value="100">100件（大規模）</option>
                        <option value="200">200件（最大）</option>
                    </select>
                </div>
                <div class="input-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="enableDiff" checked>
                        <span>差分検出有効</span>
                    </label>
                </div>
            </div>
            <div class="control-actions">
                <button class="btn btn-primary" onclick="fetchEbayData()">
                    <i class="fas fa-download"></i> データ取得実行
                </button>
                <button class="btn btn-secondary" onclick="testConnection()">
                    <i class="fas fa-plug"></i> 接続テスト
                </button>
            </div>
        </div>
    </div>

    <!-- 実行結果表示 -->
    <div class="ebay-results-section" id="resultsSection" style="display: none;">
        <h3><i class="fas fa-chart-line"></i> 実行結果</h3>
        <div id="executionResults"></div>
    </div>

    <!-- 在庫統計 -->
    <div class="ebay-stats-section">
        <h3><i class="fas fa-chart-bar"></i> 在庫統計</h3>
        <div class="stats-grid" id="statsGrid">
            <div class="stat-card loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>統計読み込み中...</span>
            </div>
        </div>
    </div>

    <!-- 詳細ログ -->
    <div class="ebay-log-section">
        <h3><i class="fas fa-list"></i> 実行ログ</h3>
        <div class="log-container" id="logContainer">
            <div class="log-entry">
                <span class="log-time"><?= date('H:i:s') ?></span>
                <span class="log-message">eBay API統合システム初期化完了</span>
            </div>
        </div>
    </div>
</div>

<!-- Hook統合ステータスパネル -->
<div class="hook-integration-panel" id="hookStatusPanel">
    <h4><i class="fas fa-cogs"></i> Hook統合状況</h4>
    <div class="hook-status-grid" id="hookStatusGrid">
        <div class="hook-status loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Hook状態確認中...</span>
        </div>
    </div>
</div>

<style>
/* eBay API統合システム専用スタイル */
.ebay-integration-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.ebay-header {
    background: linear-gradient(135deg, #0064d2 0%, #0080ff 100%);
    color: white;
    border-radius: 12px;
    padding: 25px;
    margin-bottom: 25px;
    box-shadow: 0 4px 15px rgba(0, 100, 210, 0.3);
}

.ebay-header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
}

.ebay-title-section h1 {
    margin: 0 0 8px 0;
    font-size: 2rem;
    font-weight: 600;
}

.ebay-subtitle {
    margin: 0;
    opacity: 0.9;
    font-size: 1rem;
}

.status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.15);
    padding: 10px 15px;
    border-radius: 8px;
    backdrop-filter: blur(10px);
}

.status-indicator.loading {
    background: rgba(255, 193, 7, 0.2);
    color: #fff3cd;
}

.status-indicator.success {
    background: rgba(40, 167, 69, 0.2);
    color: #d4edda;
}

.status-indicator.error {
    background: rgba(220, 53, 69, 0.2);
    color: #f8d7da;
}

.ebay-control-panel {
    background: white;
    border-radius: 12px;
    padding: 25px;
    margin-bottom: 25px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    border: 1px solid #e9ecef;
}

.control-group h3 {
    margin: 0 0 20px 0;
    color: #2c3e50;
    font-weight: 600;
}

.control-inputs {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.input-group label {
    font-weight: 500;
    color: #495057;
    font-size: 0.875rem;
}

.input-group select {
    padding: 8px 12px;
    border: 1px solid #ced4da;
    border-radius: 6px;
    background: white;
    font-size: 0.875rem;
    min-width: 140px;
}

.checkbox-label {
    display: flex !important;
    flex-direction: row !important;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
    margin: 0;
}

.control-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
}

.btn-primary {
    background: #0064d2;
    color: white;
}

.btn-primary:hover {
    background: #0056b3;
    transform: translateY(-1px);
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-secondary:hover {
    background: #5a6268;
    transform: translateY(-1px);
}

.ebay-results-section,
.ebay-stats-section,
.ebay-log-section {
    background: white;
    border-radius: 12px;
    padding: 25px;
    margin-bottom: 25px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    border: 1px solid #e9ecef;
}

.ebay-results-section h3,
.ebay-stats-section h3,
.ebay-log-section h3 {
    margin: 0 0 20px 0;
    color: #2c3e50;
    font-weight: 600;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

.stat-card {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
}

.stat-card.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #6c757d;
}

.log-container {
    max-height: 300px;
    overflow-y: auto;
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    padding: 15px;
}

.log-entry {
    display: flex;
    gap: 10px;
    margin-bottom: 8px;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
}

.log-time {
    color: #6c757d;
    font-weight: 600;
}

.log-message {
    color: #2c3e50;
}

.hook-integration-panel {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 300px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    border: 1px solid #e9ecef;
    z-index: 1000;
}

.hook-integration-panel h4 {
    margin: 0;
    padding: 15px 20px;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    border-radius: 12px 12px 0 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #2c3e50;
}

.hook-status-grid {
    padding: 15px 20px;
}

.hook-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    color: #6c757d;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
    .ebay-header-content {
        flex-direction: column;
        text-align: center;
        gap: 15px;
    }
    
    .control-inputs {
        flex-direction: column;
    }
    
    .control-actions {
        justify-content: center;
    }
    
    .hook-integration-panel {
        position: relative;
        bottom: auto;
        right: auto;
        width: 100%;
        margin-top: 25px;
    }
}
</style>

<script>
// CSRF トークン取得
const csrfToken = '<?= $_SESSION["csrf_token"] ?? "" ?>';

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('eBay API統合システム初期化開始');
    
    // システム状態確認
    checkSystemStatus();
    
    // Hook統合状況確認
    checkHookIntegration();
    
    // 在庫統計読み込み
    loadInventoryStats();
    
    // 定期更新設定（30秒間隔）
    setInterval(updateSystemStatus, 30000);
    
    addLog('システム初期化完了 - Hook統合eBay APIシステム準備完了');
});

/**
 * システム状態確認
 */
async function checkSystemStatus() {
    try {
        const response = await fetch('modules/ebay_api_integration/ajax_handler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'get_integration_status',
                csrf_token: csrfToken
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateSystemStatusDisplay('success', 'システム正常稼働中');
            addLog('システム状態確認: 正常稼働中');
        } else {
            updateSystemStatusDisplay('error', 'システム状態エラー');
            addLog('システム状態確認エラー: ' + result.error, 'error');
        }
        
    } catch (error) {
        updateSystemStatusDisplay('error', '状態確認失敗');
        addLog('システム状態確認失敗: ' + error.message, 'error');
    }
}

/**
 * Hook統合状況確認
 */
async function checkHookIntegration() {
    try {
        const response = await fetch('modules/ebay_api_integration/ajax_handler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'get_integration_status',
                csrf_token: csrfToken
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.integration_status) {
            updateHookStatusDisplay(result.integration_status);
            addLog('Hook統合確認: 統合システム正常動作');
        } else {
            updateHookStatusDisplay(null);
            addLog('Hook統合確認失敗', 'error');
        }
        
    } catch (error) {
        updateHookStatusDisplay(null);
        addLog('Hook統合確認エラー: ' + error.message, 'error');
    }
}

/**
 * eBayデータ取得実行
 */
async function fetchEbayData() {
    const limit = document.getElementById('fetchLimit').value;
    const enableDiff = document.getElementById('enableDiff').checked;
    
    // UI状態更新
    const resultsSection = document.getElementById('resultsSection');
    const executionResults = document.getElementById('executionResults');
    
    resultsSection.style.display = 'block';
    executionResults.innerHTML = `
        <div class="execution-progress">
            <i class="fas fa-spinner fa-spin"></i>
            <span>eBayデータ取得中... (制限: ${limit}件, 差分検出: ${enableDiff ? '有効' : '無効'})</span>
        </div>
    `;
    
    addLog(`eBayデータ取得開始: ${limit}件, 差分検出${enableDiff ? '有効' : '無効'}`);
    
    try {
        const response = await fetch('modules/ebay_api_integration/ajax_handler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'fetch_ebay_data',
                limit: limit,
                enable_diff: enableDiff ? 'true' : 'false',
                csrf_token: csrfToken
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayFetchResults(result);
            addLog(`eBayデータ取得完了: ${result.summary?.items_processed || 0}件処理`, 'success');
            
            // 統計更新
            loadInventoryStats();
        } else {
            displayFetchError(result.error);
            addLog('eBayデータ取得エラー: ' + result.error, 'error');
        }
        
    } catch (error) {
        displayFetchError('ネットワークエラー: ' + error.message);
        addLog('eBayデータ取得失敗: ' + error.message, 'error');
    }
}

/**
 * 接続テスト実行
 */
async function testConnection() {
    addLog('接続テスト開始');
    
    try {
        const response = await fetch('modules/ebay_api_integration/ajax_handler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'test_connection',
                csrf_token: csrfToken
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const connection = result.connection_test;
            addLog(`接続テスト完了: PostgreSQL=${connection.postgresql_connection ? 'OK' : 'NG'}, テーブル=${connection.table_ready ? 'OK' : 'NG'}`, 'success');
        } else {
            addLog('接続テスト失敗: ' + result.error, 'error');
        }
        
    } catch (error) {
        addLog('接続テストエラー: ' + error.message, 'error');
    }
}

/**
 * 在庫統計読み込み
 */
async function loadInventoryStats() {
    try {
        const response = await fetch('modules/ebay_api_integration/ajax_handler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'get_inventory_stats',
                csrf_token: csrfToken
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayInventoryStats(result.inventory_statistics);
        } else {
            displayStatsError(result.error);
        }
        
    } catch (error) {
        displayStatsError('統計読み込みエラー: ' + error.message);
    }
}

/**
 * UI更新関数群
 */
function updateSystemStatusDisplay(status, message) {
    const statusElement = document.getElementById('systemStatus');
    statusElement.innerHTML = `
        <div class="status-indicator ${status}">
            <i class="fas ${status === 'success' ? 'fa-check-circle' : status === 'error' ? 'fa-exclamation-triangle' : 'fa-spinner fa-spin'}"></i>
            <span>${message}</span>
        </div>
    `;
}

function updateHookStatusDisplay(integrationStatus) {
    const hookStatusGrid = document.getElementById('hookStatusGrid');
    
    if (integrationStatus) {
        hookStatusGrid.innerHTML = `
            <div class="hook-status success">
                <i class="fas fa-check-circle" style="color: #28a745;"></i>
                <span>Hook統合システム稼働中</span>
            </div>
        `;
    } else {
        hookStatusGrid.innerHTML = `
            <div class="hook-status error">
                <i class="fas fa-exclamation-triangle" style="color: #dc3545;"></i>
                <span>Hook統合確認中...</span>
            </div>
        `;
    }
}

function displayFetchResults(result) {
    const executionResults = document.getElementById('executionResults');
    const summary = result.summary || {};
    
    executionResults.innerHTML = `
        <div class="fetch-results-success">
            <h4><i class="fas fa-check-circle" style="color: #28a745;"></i> 取得完了</h4>
            <div class="results-grid">
                <div class="result-item">
                    <span class="result-label">取得件数:</span>
                    <span class="result-value">${summary.items_fetched || 0}件</span>
                </div>
                <div class="result-item">
                    <span class="result-label">処理件数:</span>
                    <span class="result-value">${summary.items_processed || 0}件</span>
                </div>
                <div class="result-item">
                    <span class="result-label">更新件数:</span>
                    <span class="result-value">${summary.items_updated || 0}件</span>
                </div>
                <div class="result-item">
                    <span class="result-label">新規件数:</span>
                    <span class="result-value">${summary.items_inserted || 0}件</span>
                </div>
                <div class="result-item">
                    <span class="result-label">実行時間:</span>
                    <span class="result-value">${summary.execution_time || 0}秒</span>
                </div>
            </div>
        </div>
    `;
}

function displayFetchError(error) {
    const executionResults = document.getElementById('executionResults');
    executionResults.innerHTML = `
        <div class="fetch-results-error">
            <h4><i class="fas fa-exclamation-triangle" style="color: #dc3545;"></i> 取得エラー</h4>
            <p>${error}</p>
        </div>
    `;
}

function displayInventoryStats(stats) {
    const statsGrid = document.getElementById('statsGrid');
    const basic = stats.basic_stats || {};
    
    statsGrid.innerHTML = `
        <div class="stat-card">
            <h4>総商品数</h4>
            <div class="stat-value">${basic.total_items || 0}</div>
        </div>
        <div class="stat-card">
            <h4>アクティブ商品</h4>
            <div class="stat-value">${basic.active_items || 0}</div>
        </div>
        <div class="stat-card">
            <h4>平均価格</h4>
            <div class="stat-value">$${parseFloat(basic.average_price || 0).toFixed(2)}</div>
        </div>
        <div class="stat-card">
            <h4>総在庫数</h4>
            <div class="stat-value">${basic.total_quantity || 0}</div>
        </div>
    `;
}

function displayStatsError(error) {
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = `
        <div class="stat-card error">
            <i class="fas fa-exclamation-triangle"></i>
            <span>統計読み込みエラー</span>
        </div>
    `;
}

function addLog(message, level = 'info') {
    const logContainer = document.getElementById('logContainer');
    const timestamp = new Date().toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `
        <span class="log-time">${timestamp}</span>
        <span class="log-message" style="color: ${level === 'error' ? '#dc3545' : level === 'success' ? '#28a745' : '#2c3e50'}">${message}</span>
    `;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // 最大100エントリーまで保持
    while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.firstChild);
    }
}

function updateSystemStatus() {
    checkSystemStatus();
    checkHookIntegration();
}

console.log('eBay API統合システム JavaScript初期化完了');
</script>
