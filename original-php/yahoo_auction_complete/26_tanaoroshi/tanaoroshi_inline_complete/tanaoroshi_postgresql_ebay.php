<?php
/**
 * 棚卸しシステム - PostgreSQL eBay API統合版
 * 修正日: 2025-08-15
 * 機能: PostgreSQL直接接続、eBay API同期、リアルタイムデータ表示
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

function safe_output($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}
?>

<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo safe_output('棚卸しシステム - PostgreSQL eBay API統合版'); ?></title>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- N3準拠: 外部CSSファイル読み込み -->
    <link rel="stylesheet" href="modules/tanaoroshi_inline_complete/assets/tanaoroshi_fixed_styles.css">
</head>
<body>
    <!-- ヘッダー -->
    <header class="inventory__header">
        <div class="inventory__header-top">
            <h1 class="inventory__title">
                <i class="fas fa-warehouse inventory__title-icon"></i>
                <?php echo safe_output('棚卸しシステム（PostgreSQL + eBay API版）'); ?>
            </h1>
            
            <div class="inventory__exchange-rate">
                <i class="fas fa-exchange-alt inventory__exchange-icon"></i>
                <span class="inventory__exchange-text">USD/JPY:</span>
                <span class="inventory__exchange-value" id="exchange-rate">¥150.25</span>
            </div>
        </div>
        
        <!-- データベース状態表示 -->
        <div class="inventory__database-status" id="database-status">
            <div class="status-item">
                <i class="fas fa-database"></i>
                <span>PostgreSQL: <span id="pg-status">確認中...</span></span>
            </div>
            <div class="status-item">
                <i class="fas fa-table"></i>
                <span>eBayデータ: <span id="record-count">0</span>件</span>
            </div>
            <div class="status-item">
                <i class="fas fa-clock"></i>
                <span>最終更新: <span id="last-update">未確認</span></span>
            </div>
        </div>
        
        <div class="inventory__stats">
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="total-products">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('総商品数'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="stock-products">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('有在庫'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="dropship-products">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('無在庫'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="set-products">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('セット品'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="hybrid-products">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('ハイブリッド'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="total-value">$0</span>
                <span class="inventory__stat-label"><?php echo safe_output('総在庫価値'); ?></span>
            </div>
        </div>
    </header>

    <!-- 同期状況パネル（UX強化・エラーハンドリング対応） -->
    <div class="inventory__sync-panel">
        <div class="sync-status">
            <i class="fas fa-circle sync-indicator" id="sync-indicator"></i>
            <span>最終同期: <span id="last-sync-time">確認中...</span></span>
            <span class="sync-message" id="sync-message"></span>
        </div>
        <div class="sync-actions">
            <button class="btn btn--sm" id="quick-sync-btn" onclick="quickSync()">
                <i class="fas fa-sync" id="sync-icon"></i>
                <span id="sync-btn-text">手動同期</span>
            </button>
            <a href="/ebay_database_manager.php" class="btn btn--outline btn--sm">詳細管理</a>
        </div>
        
        <!-- 同期進捗・エラー表示 -->
        <div class="sync-progress" id="sync-progress" style="display: none;">
            <div class="progress-bar-container">
                <div class="progress-bar" id="sync-progress-fill"></div>
            </div>
            <div class="progress-text" id="sync-progress-text">同期準備中...</div>
        </div>
        
        <!-- エラー・成功メッセージ -->
        <div class="sync-result" id="sync-result" style="display: none;">
            <div class="result-message" id="result-message"></div>
            <div class="result-details" id="result-details"></div>
        </div>
    </div>

    <!-- データコントロール -->
    <div class="inventory__sync-controls">
        <h2 class="inventory__sync-title">
            <i class="fas fa-database"></i>
            <?php echo safe_output('データ管理'); ?>
        </h2>
        
        <div class="inventory__sync-actions">
            <button class="btn btn--success" onclick="loadEbayData()">
                <i class="fas fa-refresh"></i>
                <?php echo safe_output('データ再読み込み'); ?>
            </button>
            
            <button class="btn btn--info" onclick="checkDatabaseStatus()">
                <i class="fas fa-database"></i>
                <?php echo safe_output('データベース状態'); ?>
            </button>
        </div>
    </div>

    <!-- フィルターバー -->
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
        </div>
        
        <div class="inventory__filter-actions">
            <div class="inventory__filter-left">
                <button class="btn btn--secondary" onclick="resetFilters()">
                    <i class="fas fa-undo"></i>
                    <?php echo safe_output('リセット'); ?>
                </button>
                <button class="btn btn--info" onclick="applyFilters()">
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

    <!-- ビュー切り替えコントロール -->
    <div class="inventory__view-controls">
        <div class="inventory__view-toggle">
            <button class="inventory__view-btn inventory__view-btn--active" data-view="card">
                <i class="fas fa-th-large"></i>
                <?php echo safe_output('カードビュー'); ?>
            </button>
            <button class="inventory__view-btn" data-view="excel">
                <i class="fas fa-table"></i>
                <?php echo safe_output('エクセルビュー'); ?>
            </button>
        </div>
        
        <div class="inventory__actions">
            <button class="btn btn--success" id="add-product-btn">
                <i class="fas fa-plus"></i>
                <?php echo safe_output('新規商品登録'); ?>
            </button>
        </div>
    </div>

    <!-- カードビュー -->
    <div class="inventory__grid" id="card-view">
        <div style="text-align: center; padding: 2rem; color: #64748b; grid-column: 1 / -1;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>PostgreSQL + eBay APIデータを読み込み中...</p>
        </div>
    </div>

    <!-- 統一JavaScriptファイル -->
    <script src="modules/tanaoroshi_inline_complete/assets/tanaoroshi_postgresql_ebay_unified.js"></script>
    
    <!-- 同期パネル専用スクリプト -->
    <script>
    // エラーハンドリング付き手動同期
    async function quickSync() {
        const btn = document.getElementById('quick-sync-btn');
        const icon = document.getElementById('sync-icon');
        const btnText = document.getElementById('sync-btn-text');
        const progress = document.getElementById('sync-progress');
        const result = document.getElementById('sync-result');
        
        // UI状態変更: 処理中表示
        btn.disabled = true;
        icon.className = 'fas fa-spinner fa-spin';
        btnText.textContent = '同期中...';
        progress.style.display = 'block';
        result.style.display = 'none';
        
        try {
            const response = await fetch('modules/tanaoroshi/tanaoroshi_ajax_handler_postgresql_ebay.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'action=sync_ebay_data'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: サーバーエラー`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                showSyncResult('success', `同期完了: ${data.message}`, data.method || '');
                updateSyncStatus('success', new Date().toLocaleString());
                
                // 同期後にデータ再読み込み
                setTimeout(() => {
                    loadEbayData();
                }, 1000);
            } else {
                showSyncResult('error', `同期失敗: ${data.error}`, data.details || '');
                updateSyncStatus('error', '同期失敗');
            }
        } catch (error) {
            showSyncResult('error', `通信エラー: ${error.message}`, 
                          'ネットワーク接続またはサーバーに問題があります。');
            updateSyncStatus('error', '通信エラー');
        } finally {
            // UI状態復元
            btn.disabled = false;
            icon.className = 'fas fa-sync';
            btnText.textContent = '手動同期';
            progress.style.display = 'none';
        }
    }
    
    // 同期結果表示
    function showSyncResult(type, message, details) {
        const result = document.getElementById('sync-result');
        const messageEl = document.getElementById('result-message');
        const detailsEl = document.getElementById('result-details');
        
        result.className = `sync-result sync-result--${type}`;
        messageEl.textContent = message;
        detailsEl.textContent = details || '';
        result.style.display = 'block';
        
        // 5秒後に自動非表示
        setTimeout(() => {
            result.style.display = 'none';
        }, 5000);
    }
    
    // 同期状況更新
    function updateSyncStatus(status, time) {
        const indicator = document.getElementById('sync-indicator');
        const timeEl = document.getElementById('last-sync-time');
        
        indicator.className = `fas fa-circle sync-indicator sync-indicator--${status}`;
        timeEl.textContent = time;
    }
    
    // 初期状態設定
    document.addEventListener('DOMContentLoaded', function() {
        updateSyncStatus('ready', '未実行');
    });
    </script>
</body>
</html>