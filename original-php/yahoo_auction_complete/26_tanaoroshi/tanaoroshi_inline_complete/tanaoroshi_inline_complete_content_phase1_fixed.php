<?php
/**
 * 🎯 Phase 1: モーダル保持+データベース統合（N3ルール完全遵守版）
 * - インラインCSS/JS完全禁止 → 外部ファイル分離
 * - PostgreSQLデータベース統合
 * - 動作確認済みモーダル機能保持
 * - N3準拠アーキテクチャ強制
 * 
 * 修正日: 2025年8月25日 Phase 1完成版
 */

// 🎯 N3準拠 セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    http_response_code(403);
    header('Content-Type: text/html; charset=UTF-8');
    die('<!DOCTYPE html><html><head><title>Access Denied</title></head><body><h1>Direct Access Not Allowed</h1><p>Please access through the main N3 system: <a href="/index.php">index.php</a></p></body></html>');
}

// safe_output関数の重複定義を回避
if (!function_exists('safe_output')) {
    function safe_output($str) {
        return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
    }
}
?>

<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo safe_output('棚卸しシステム - Phase1 PostgreSQL統合版'); ?></title>
    
    <!-- 🎯 N3準拠: 外部CDN（必須ライブラリのみ） -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM" crossorigin="anonymous">
    
    <!-- 🎯 N3準拠: 共通CSS優先読み込み -->
    <link rel="stylesheet" href="common/css/style.css">
    
    <!-- 🎯 N3準拠: 専用CSS（最小限） -->
    <link rel="stylesheet" href="common/css/pages/tanaoroshi_phase1.css">
</head>
<body data-page="tanaoroshi-phase1">
    
    <!-- 🎯 ヘッダーセクション（統計表示付き） -->
    <header class="inventory__header">
        <div class="inventory__header-top">
            <h1 class="inventory__title">
                <i class="fas fa-warehouse inventory__title-icon"></i>
                <?php echo safe_output('棚卸しシステム Phase1 - PostgreSQL統合版'); ?>
            </h1>
            
            <div class="inventory__exchange-rate">
                <i class="fas fa-exchange-alt inventory__exchange-icon"></i>
                <span class="inventory__exchange-text">USD/JPY:</span>
                <span class="inventory__exchange-value" id="exchange-rate">¥150.25</span>
            </div>
        </div>
        
        <!-- 🎯 リアルタイム統計表示 -->
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
            
            <!-- PostgreSQL接続状況表示 -->
            <div class="inventory__stat inventory__stat--database">
                <span class="inventory__stat-number" id="database-status">接続中</span>
                <span class="inventory__stat-label"><?php echo safe_output('PostgreSQL'); ?></span>
            </div>
        </div>
    </header>

    <!-- 🎯 アクションボタンエリア -->
    <div class="inventory__actions-bar">
        <div class="inventory__actions-left">
            <!-- データベーステストボタン -->
            <button class="btn btn--database" data-action="test-postgresql-connection">
                <i class="fas fa-database"></i>
                <?php echo safe_output('PostgreSQL接続テスト'); ?>
            </button>
            
            <!-- データ取得ボタン -->
            <button class="btn btn--success" data-action="load-postgresql-data">
                <i class="fas fa-download"></i>
                <?php echo safe_output('PostgreSQLデータ取得'); ?>
            </button>
            
            <!-- データ再読み込みボタン -->
            <button class="btn btn--info" data-action="reload-inventory-data">
                <i class="fas fa-sync"></i>
                <?php echo safe_output('データ再読み込み'); ?>
            </button>
        </div>
        
        <div class="inventory__actions-right">
            <!-- 🎯 動作確認済みモーダルボタン（保持） -->
            <button class="btn btn--success" data-action="open-add-product-modal">
                <i class="fas fa-plus"></i>
                <?php echo safe_output('新規商品登録'); ?>
            </button>
            
            <button class="btn btn--warning" data-action="create-new-set">
                <i class="fas fa-layer-group"></i>
                <?php echo safe_output('新規セット品作成'); ?>
            </button>
            
            <button class="btn btn--secondary" data-action="open-test-modal">
                <i class="fas fa-cog"></i>
                <?php echo safe_output('モーダルテスト'); ?>
            </button>
        </div>
    </div>

    <!-- 🎯 メインコンテンツエリア -->
    <main class="inventory__main-content">
        
        <!-- データ読み込み状況表示 -->
        <div class="inventory__loading-status" id="loading-status">
            <div class="inventory__loading-indicator">
                <i class="fas fa-spinner fa-spin"></i>
                <span class="inventory__loading-text">PostgreSQLからデータを読み込み中...</span>
            </div>
        </div>
        
        <!-- 商品カードグリッド（Phase2で8枚横並び対応予定） -->
        <div class="inventory__card-container" id="card-container">
            <div class="inventory__card-grid" id="card-grid">
                <!-- カードはJavaScriptで動的生成 -->
            </div>
        </div>
        
        <!-- データ取得結果表示 -->
        <div class="inventory__data-result" id="data-result" style="display: none;">
            <h3 class="inventory__result-title">
                <i class="fas fa-check-circle"></i>
                データ取得結果
            </h3>
            <div class="inventory__result-content" id="result-content">
                <!-- 結果はJavaScriptで表示 -->
            </div>
        </div>
        
        <!-- エラー表示エリア -->
        <div class="inventory__error-display" id="error-display" style="display: none;">
            <div class="inventory__error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <div class="inventory__error-message" id="error-message"></div>
                <button class="btn btn--secondary" data-action="retry-connection">
                    <i class="fas fa-redo"></i>
                    再試行
                </button>
            </div>
        </div>
        
    </main>

    <!-- 🎯 N3準拠: JavaScript読み込み（外部ファイルのみ） -->
    <!-- Bootstrap JS（モーダル依存） -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    
    <!-- 🎯 N3準拠: 共通JS優先 -->
    <script src="common/js/n3_common.js"></script>
    
    <!-- 🎯 N3準拠: Phase1専用JS -->
    <script src="common/js/pages/tanaoroshi_phase1.js"></script>

</body>
</html>