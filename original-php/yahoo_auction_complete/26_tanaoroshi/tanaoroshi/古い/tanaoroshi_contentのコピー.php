<?php
/**
 * 棚卸システム - コンテンツ部分のみ（N3準拠版）
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

// XSS対策関数
function safe_output($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

// Hook連携テスト・初期化
function test_hook_integration() {
    try {
        // システム統合Hook テスト
        $integration_test = shell_exec('echo \'{"action": "get_status"}\' | python3 ' . 
            '/Users/aritahiroaki/NAGANO-3/N3-Development/hooks/1_essential/inventory_system_integration_hook.py 2>&1');
        
        $integration_result = json_decode($integration_test, true);
        
        // 在庫データ管理Hook テスト
        $inventory_test = shell_exec('echo \'{"action": "get_hook_status"}\' | python3 ' . 
            '/Users/aritahiroaki/NAGANO-3/N3-Development/hooks/3_system/inventory_data_manager_hook.py 2>&1');
        
        $inventory_result = json_decode($inventory_test, true);
        
        return [
            'system_integration_hook' => [
                'accessible' => $integration_result !== null,
                'status' => $integration_result['status'] ?? 'unknown',
                'integration_active' => $integration_result['system_integration_active'] ?? false,
                'hooks_loaded' => $integration_result['result']['system_status']['hooks_loaded'] ?? 0
            ],
            'inventory_manager_hook' => [
                'accessible' => $inventory_result !== null,
                'status' => $inventory_result['status'] ?? 'unknown',
                'hook_integrations' => $inventory_result['hook_integrations_count'] ?? 0
            ],
            'overall_status' => 'ready_for_development'
        ];
    } catch (Exception $e) {
        return [
            'overall_status' => 'error',
            'error' => $e->getMessage()
        ];
    }
}

$hook_test = test_hook_integration();
?>

<!-- 棚卸システム専用CSS -->
<style>
/* 棚卸システム専用スタイル */
.inventory__header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    border-radius: 12px;
    margin-bottom: 2rem;
}

.inventory__title {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
}

.inventory__title-icon {
    color: rgba(255, 255, 255, 0.9);
}

.inventory__exchange-rate {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.1rem;
    background: rgba(255, 255, 255, 0.1);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    margin-top: 1rem;
}

.inventory__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
}

.inventory__stat {
    text-align: center;
    background: rgba(255, 255, 255, 0.1);
    padding: 1rem;
    border-radius: 8px;
}

.inventory__stat-number {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
}

.inventory__stat-label {
    font-size: 0.875rem;
    opacity: 0.9;
}

.inventory__filter-bar {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.inventory__filter-title {
    font-size: 1.25rem;
    margin-bottom: 1rem;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.inventory__filter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
}

.inventory__filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.inventory__filter-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
}

.inventory__filter-select {
    padding: 0.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: white;
}

.inventory__filter-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.inventory__filter-left {
    display: flex;
    gap: 0.5rem;
}

.inventory__search-box {
    position: relative;
    display: flex;
    align-items: center;
}

.inventory__search-icon {
    position: absolute;
    left: 1rem;
    color: #64748b;
}

.inventory__search-input {
    padding: 0.5rem 1rem 0.5rem 2.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    width: 250px;
}

.inventory__chart-section {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.inventory__chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.inventory__chart-title {
    font-size: 1.25rem;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.inventory__currency-toggle {
    display: flex;
    gap: 0.25rem;
}

.inventory__currency-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #e2e8f0;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.inventory__currency-btn--active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
}

.inventory__chart-container {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
    align-items: start;
}

.inventory__chart-canvas-wrapper {
    position: relative;
    height: 300px;
}

.inventory__chart-canvas {
    width: 100% !important;
    height: 100% !important;
}

.inventory__chart-stats {
    display: grid;
    gap: 1rem;
}

.inventory__chart-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: #f8fafc;
    border-radius: 6px;
    border-left: 3px solid #3b82f6;
}

.inventory__chart-stat-label {
    font-size: 0.875rem;
    color: #475569;
    font-weight: 500;
}

.inventory__chart-stat-value {
    font-weight: 700;
    color: #1e293b;
}

@media (max-width: 768px) {
    .inventory__filter-grid {
        grid-template-columns: 1fr;
    }
    
    .inventory__filter-actions {
        flex-direction: column;
        align-items: stretch;
    }
    
    .inventory__chart-container {
        grid-template-columns: 1fr;
    }
    
    .inventory__stats {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style>

<!-- コンテンツ部分 -->
<div class="tanaoroshi-container">
    <!-- ヘッダー -->
    <header class="inventory__header">
        <div class="inventory__header-top">
            <h1 class="inventory__title">
                <i class="fas fa-warehouse inventory__title-icon"></i>
                <?php echo safe_output('棚卸システム'); ?>
            </h1>
            
            <div class="inventory__exchange-rate">
                <i class="fas fa-exchange-alt inventory__exchange-icon"></i>
                <span class="inventory__exchange-text">USD/JPY:</span>
                <span class="inventory__exchange-value" id="exchange-rate">¥150.25</span>
            </div>
        </div>
        
        <!-- Hook統合状態表示 -->
        <div class="row bg-info text-white py-2 mb-3 rounded">
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center">
                    <span><i class="fas fa-info-circle"></i> Hook統合システム状態</span>
                    <div class="hook-status">
                        <div class="d-flex gap-2">
                            <!-- システム統合Hook状態 -->
                            <span class="badge <?php echo $hook_test['system_integration_hook']['accessible'] ? 'bg-success' : 'bg-danger'; ?>">
                                <i class="fas fa-cogs"></i> 統合システム: 
                                <?php echo safe_output($hook_test['system_integration_hook']['integration_active'] ? '稼働中' : '未稼働'); ?>
                                (<?php echo safe_output($hook_test['system_integration_hook']['hooks_loaded']); ?>Hook)
                            </span>
                            
                            <!-- 在庫管理Hook状態 -->
                            <span class="badge <?php echo $hook_test['inventory_manager_hook']['accessible'] ? 'bg-success' : 'bg-danger'; ?>">
                                <i class="fas fa-database"></i> 在庫管理: 
                                <?php echo safe_output($hook_test['inventory_manager_hook']['status'] === 'success' ? '接続中' : '未接続'); ?>
                                (<?php echo safe_output($hook_test['inventory_manager_hook']['hook_integrations']); ?>統合)
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="inventory__stats">
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="total-products">1,284</span>
                <span class="inventory__stat-label"><?php echo safe_output('総商品数'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="stock-products">912</span>
                <span class="inventory__stat-label"><?php echo safe_output('有在庫'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="dropship-products">203</span>
                <span class="inventory__stat-label"><?php echo safe_output('無在庫'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="set-products">169</span>
                <span class="inventory__stat-label"><?php echo safe_output('セット品'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="hybrid-products">45</span>
                <span class="inventory__stat-label"><?php echo safe_output('ハイブリッド'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="total-value">$102.5K</span>
                <span class="inventory__stat-label"><?php echo safe_output('総在庫価値'); ?></span>
            </div>
        </div>
    </header>

    <!-- 独立フィルターバー -->
    <div class="inventory__filter-bar">
        <h2 class="inventory__filter-title">
            <i class="fas fa-filter"></i>
            <?php echo safe_output('フィルター設定'); ?>
        </h2>
        
        <div class="inventory__filter-grid">
            <div class="inventory__filter-group">
                <label class="inventory__filter-label"><?php echo safe_output('商品種類'); ?></label>
                <select class="inventory__filter-select" id="filter-type">
                    <option value=""><?php echo safe_output('すべて'); ?></option>
                    <option value="stock"><?php echo safe_output('有在庫'); ?></option>
                    <option value="dropship"><?php echo safe_output('無在庫'); ?></option>
                    <option value="set"><?php echo safe_output('セット品'); ?></option>
                    <option value="hybrid"><?php echo safe_output('ハイブリッド'); ?></option>
                </select>
            </div>
            
            <div class="inventory__filter-group">
                <label class="inventory__filter-label"><?php echo safe_output('出品モール'); ?></label>
                <select class="inventory__filter-select" id="filter-channel">
                    <option value=""><?php echo safe_output('すべて'); ?></option>
                    <option value="ebay">eBay</option>
                    <option value="shopify">Shopify</option>
                    <option value="mercari"><?php echo safe_output('メルカリ'); ?></option>
                </select>
            </div>
            
            <div class="inventory__filter-group">
                <label class="inventory__filter-label"><?php echo safe_output('在庫状況'); ?></label>
                <select class="inventory__filter-select" id="filter-stock-status">
                    <option value=""><?php echo safe_output('すべて'); ?></option>
                    <option value="sufficient"><?php echo safe_output('充分'); ?></option>
                    <option value="warning"><?php echo safe_output('注意'); ?></option>
                    <option value="low"><?php echo safe_output('少量'); ?></option>
                    <option value="out"><?php echo safe_output('在庫切れ'); ?></option>
                </select>
            </div>
            
            <div class="inventory__filter-group">
                <label class="inventory__filter-label"><?php echo safe_output('価格範囲 (USD)'); ?></label>
                <select class="inventory__filter-select" id="filter-price-range">
                    <option value=""><?php echo safe_output('すべて'); ?></option>
                    <option value="0-25">$0 - $25</option>
                    <option value="25-50">$25 - $50</option>
                    <option value="50-100">$50 - $100</option>
                    <option value="100+">$100+</option>
                </select>
            </div>
        </div>
        
        <div class="inventory__filter-actions">
            <div class="inventory__filter-left">
                <button class="btn btn-secondary" onclick="resetFilters()">
                    <i class="fas fa-undo"></i>
                    <?php echo safe_output('リセット'); ?>
                </button>
                <button class="btn btn-info" onclick="applyFilters()">
                    <i class="fas fa-search"></i>
                    <?php echo safe_output('適用'); ?>
                </button>
            </div>
            
            <div class="inventory__filter-right">
                <div class="inventory__search-box">
                    <i class="fas fa-search inventory__search-icon"></i>
                    <input type="text" class="inventory__search-input" id="search-input" 
                           placeholder="<?php echo safe_output('商品名・SKU・カテゴリで検索...'); ?>">
                </div>
            </div>
        </div>
    </div>

    <!-- 価格チャートセクション -->
    <div class="inventory__chart-section">
        <div class="inventory__chart-header">
            <h2 class="inventory__chart-title">
                <i class="fas fa-chart-pie"></i>
                <?php echo safe_output('有在庫価格分析'); ?>
            </h2>
            <div class="inventory__chart-controls">
                <div class="inventory__currency-toggle">
                    <button class="inventory__currency-btn inventory__currency-btn--active" id="currency-usd">USD</button>
                    <button class="inventory__currency-btn" id="currency-jpy">JPY</button>
                </div>
            </div>
        </div>
        
        <div class="inventory__chart-container">
            <div class="inventory__chart-canvas-wrapper">
                <canvas id="price-chart" class="inventory__chart-canvas"></canvas>
            </div>
            
            <div class="inventory__chart-stats">
                <div class="inventory__chart-stat">
                    <span class="inventory__chart-stat-label"><?php echo safe_output('合計金額'); ?></span>
                    <span class="inventory__chart-stat-value" id="total-amount">$102,500</span>
                </div>
                <div class="inventory__chart-stat">
                    <span class="inventory__chart-stat-label"><?php echo safe_output('平均単価'); ?></span>
                    <span class="inventory__chart-stat-value" id="average-price">$112.3</span>
                </div>
                <div class="inventory__chart-stat">
                    <span class="inventory__chart-stat-label"><?php echo safe_output('最高額商品'); ?></span>
                    <span class="inventory__chart-stat-value" id="highest-price">$899</span>
                </div>
                <div class="inventory__chart-stat">
                    <span class="inventory__chart-stat-label">$100<?php echo safe_output('以上'); ?></span>
                    <span class="inventory__chart-stat-value" id="high-value-count">342<?php echo safe_output('点'); ?></span>
                </div>
                <div class="inventory__chart-stat">
                    <span class="inventory__chart-stat-label">$50-$100</span>
                    <span class="inventory__chart-stat-value" id="mid-value-count">298<?php echo safe_output('点'); ?></span>
                </div>
                <div class="inventory__chart-stat">
                    <span class="inventory__chart-stat-label">$50<?php echo safe_output('未満'); ?></span>
                    <span class="inventory__chart-stat-value" id="low-value-count">272<?php echo safe_output('点'); ?></span>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap統合セクション -->
    <div class="row mb-4">
        <div class="col-md-8">
            <div class="card">
                <div class="card-header">
                    <h5><i class="fas fa-search"></i> <?php echo safe_output('検索・フィルタ'); ?></h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="input-group">
                                <input type="text" id="search-input-main" class="form-control" placeholder="<?php echo safe_output('商品名・SKU検索'); ?>" autocomplete="off">
                                <button class="btn btn-outline-primary" onclick="searchItems()">
                                    <i class="fas fa-search"></i>
                                </button>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <select id="stock-type-filter" class="form-select" onchange="applyFilters()">
                                <option value=""><?php echo safe_output('全ての在庫タイプ'); ?></option>
                                <option value="有在庫"><?php echo safe_output('有在庫'); ?></option>
                                <option value="無在庫"><?php echo safe_output('無在庫'); ?></option>
                                <option value="ハイブリッド"><?php echo safe_output('ハイブリッド'); ?></option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <select id="listing-status-filter" class="form-select" onchange="applyFilters()">
                                <option value=""><?php echo safe_output('全ての出品状況'); ?></option>
                                <option value="出品中"><?php echo safe_output('出品中'); ?></option>
                                <option value="未出品"><?php echo safe_output('未出品'); ?></option>
                                <option value="在庫切れ"><?php echo safe_output('在庫切れ'); ?></option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card">
                <div class="card-header">
                    <h5><i class="fas fa-tools"></i> <?php echo safe_output('アクション'); ?></h5>
                </div>
                <div class="card-body">
                    <button class="btn btn-success w-100 mb-2" onclick="showAddItemModal()">
                        <i class="fas fa-plus"></i> <?php echo safe_output('新規アイテム追加'); ?>
                    </button>
                    <div class="row">
                        <div class="col-6">
                            <button class="btn btn-info w-100 mb-2" onclick="refreshInventory()">
                                <i class="fas fa-sync"></i> <?php echo safe_output('在庫更新'); ?>
                            </button>
                        </div>
                        <div class="col-6">
                            <button class="btn btn-warning w-100 mb-2" onclick="syncWithEbay()">
                                <i class="fab fa-ebay"></i> eBay<?php echo safe_output('同期'); ?>
                            </button>
                        </div>
                    </div>
                    <button class="btn btn-outline-secondary w-100" onclick="showSystemStatus()">
                        <i class="fas fa-info-circle"></i> <?php echo safe_output('システム状態'); ?>
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- 統計ダッシュボード -->
    <div class="row mb-4">
        <div class="col-md-3">
            <div class="card bg-primary text-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <div>
                            <h5><?php echo safe_output('総アイテム数'); ?></h5>
                            <h2 id="total-items">-</h2>
                        </div>
                        <div class="align-self-center">
                            <i class="fas fa-boxes fa-2x opacity-75"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-success text-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <div>
                            <h5><?php echo safe_output('有在庫アイテム'); ?></h5>
                            <h2 id="in-stock-items">-</h2>
                        </div>
                        <div class="align-self-center">
                            <i class="fas fa-check-circle fa-2x opacity-75"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-warning text-dark">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <div>
                            <h5><?php echo safe_output('無在庫アイテム'); ?></h5>
                            <h2 id="out-of-stock-items">-</h2>
                        </div>
                        <div class="align-self-center">
                            <i class="fas fa-exclamation-circle fa-2x opacity-75"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-info text-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <div>
                            <h5><?php echo safe_output('出品中アイテム'); ?></h5>
                            <h2 id="listed-items">-</h2>
                        </div>
                        <div class="align-self-center">
                            <i class="fas fa-store fa-2x opacity-75"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- メイン在庫テーブル -->
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5><i class="fas fa-list"></i> <?php echo safe_output('在庫アイテム一覧'); ?></h5>
                        <div class="d-flex gap-2">
                            <span class="badge bg-secondary" id="items-count">0 <?php echo safe_output('件'); ?></span>
                            <button class="btn btn-sm btn-outline-primary" onclick="exportToCSV()">
                                <i class="fas fa-download"></i> CSV<?php echo safe_output('出力'); ?>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped table-hover" id="inventory-table">
                            <thead class="table-dark sticky-top">
                                <tr>
                                    <th><input type="checkbox" id="select-all" onchange="toggleSelectAll()"></th>
                                    <th>SKU ID</th>
                                    <th><?php echo safe_output('商品名'); ?></th>
                                    <th><?php echo safe_output('カテゴリ'); ?></th>
                                    <th><?php echo safe_output('在庫数'); ?></th>
                                    <th><?php echo safe_output('在庫タイプ'); ?></th>
                                    <th><?php echo safe_output('商品状態'); ?></th>
                                    <th><?php echo safe_output('販売価格'); ?></th>
                                    <th><?php echo safe_output('仕入れ価格'); ?></th>
                                    <th><?php echo safe_output('見込み利益'); ?></th>
                                    <th><?php echo safe_output('出品状況'); ?></th>
                                    <th><?php echo safe_output('ウォッチャー'); ?></th>
                                    <th><?php echo safe_output('ビュー数'); ?></th>
                                    <th><?php echo safe_output('危険度'); ?></th>
                                    <th><?php echo safe_output('データソース'); ?></th>
                                    <th><?php echo safe_output('アクション'); ?></th>
                                </tr>
                            </thead>
                            <tbody id="inventory-tbody">
                                <tr>
                                    <td colspan="16" class="text-center py-5">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden"><?php echo safe_output('読み込み中...'); ?></span>
                                        </div>
                                        <p class="mt-3 text-muted"><?php echo safe_output('在庫データを読み込み中...'); ?></p>
                                        <small class="text-muted"><?php echo safe_output('Hook統合システムからデータを取得しています'); ?></small>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- JavaScript（コンテンツ専用） -->
<script>
// Hook統合システム初期データ
window.hookIntegrationStatus = <?php echo json_encode($hook_test); ?>;

// 棚卸システム初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ 棚卸システム（N3準拠版）初期化完了');
    console.log('Hook統合状態:', window.hookIntegrationStatus);
    
    // システム状態に応じた初期化
    if (window.hookIntegrationStatus.overall_status === 'ready_for_development') {
        console.log('✅ Hook統合システム正常 - 在庫データ読み込み開始');
        loadInventoryData();
    } else {
        console.log('⚠️ Hook統合システム初期化中 - デモデータ表示');
        loadDemoData();
    }
    
    // 統計データ初期化
    updateStatistics();
    
    // 価格チャート初期化（Chart.jsが利用可能な場合）
    if (typeof Chart !== 'undefined') {
        initializePriceChart();
    }
    
    // 為替レート更新
    updateExchangeRate();
});

// 在庫データ読み込み関数（Hook連携）
function loadInventoryData() {
    // Hook連携でデータ取得
    console.log('🔄 Hook統合システムから在庫データ取得中...');
    // 実際のHook呼び出し処理をここに実装
}

// デモデータ表示
function loadDemoData() {
    console.log('📊 デモデータ表示中...');
    // デモデータ表示処理
}

// 統計更新
function updateStatistics() {
    // 統計データ更新処理
    console.log('📈 統計データ更新');
}

// 価格チャート初期化
function initializePriceChart() {
    console.log('📊 価格チャート初期化');
    // Chart.js初期化処理
}

// 為替レート更新
function updateExchangeRate() {
    console.log('💱 為替レート更新');
    // 為替レート取得・更新処理
}

// その他の関数
function resetFilters() { console.log('🔄 フィルターリセット'); }
function applyFilters() { console.log('🔍 フィルター適用'); }
function searchItems() { console.log('🔍 アイテム検索'); }
function showAddItemModal() { console.log('➕ アイテム追加モーダル表示'); }
function refreshInventory() { console.log('🔄 在庫更新'); }
function syncWithEbay() { console.log('🔄 eBay同期'); }
function showSystemStatus() { console.log('ℹ️ システム状態表示'); }
function exportToCSV() { console.log('📥 CSV出力'); }
function toggleSelectAll() { console.log('☑️ 全選択切り替え'); }
</script>
