<?php
/**
 * 棚卸システム v2 - HTML分離版メインファイル
 * 既存CSS/JS活用、テンプレート分離構造
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// CSRF トークン生成
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
$csrf_token = isset($_SESSION['csrf_token']) ? $_SESSION['csrf_token'] : bin2hex(random_bytes(32));
$_SESSION['csrf_token'] = $csrf_token;
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>棚卸システム v2 - HTML分離版</title>
    
    <!-- 既存の共通CSS活用 -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../../common/css/style.css">
    <link rel="stylesheet" href="../../common/css/components/ebay_view_switcher_n3.css">
    <link rel="stylesheet" href="../../common/css/components/n3_modal_system.css">
    
    <!-- 既存の共通JS活用 -->
    <script src="../../common/js/components/n3_modal_system.js"></script>
    <script src="../../common/js/components/ebay_view_switcher.js"></script>
    <script src="../../common/js/components/ebay_enhanced_excel.js"></script>
    
    <!-- CSRF トークン設定 -->
    <script>
        window.CSRF_TOKEN = "<?= $csrf_token ?>";
        console.log('棚卸システム v2 初期化開始');
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-warehouse"></i> 棚卸システム v2</h1>
            <p>HTML分離版 - 既存機能完全保持、構造整理</p>
            
            <!-- システム状態表示 -->
            <div style="margin: 1rem 0; text-align: center;">
                <div class="system-status">
                    <span class="status-item">
                        <i class="fas fa-check-circle" style="color: #22c55e;"></i> 
                        HTML分離構造
                    </span>
                    <span class="status-item">
                        <i class="fas fa-check-circle" style="color: #22c55e;"></i> 
                        既存CSS/JS活用
                    </span>
                    <span class="status-item">
                        <i class="fas fa-check-circle" style="color: #22c55e;"></i> 
                        機能完全保持
                    </span>
                </div>
            </div>
            
            <!-- 機能テストボタン -->
            <div style="margin: 2rem 0; text-align: center;">
                <button onclick="testModal()" class="n3-btn n3-btn--primary">
                    <i class="fas fa-window-maximize"></i> モーダルテスト
                </button>
                <button onclick="testAlert()" class="n3-btn n3-btn--success">
                    <i class="fas fa-bell"></i> アラートテスト
                </button>
                <button onclick="testConfirm()" class="n3-btn n3-btn--warning">
                    <i class="fas fa-question"></i> 確認テスト
                </button>
            </div>
            
            <!-- データ操作ボタン -->
            <div style="margin: 1rem 0; text-align: center;">
                <button onclick="loadTanaoroshiData()" class="n3-btn n3-btn--info">
                    <i class="fas fa-database"></i> 棚卸データ読み込み
                </button>
                <button onclick="refreshData()" class="n3-btn n3-btn--secondary">
                    <i class="fas fa-sync"></i> データ更新
                </button>
                <button onclick="openSyncDashboard()" class="n3-btn n3-btn--primary">
                    <i class="fas fa-external-link-alt"></i> 同期ダッシュボード
                </button>
            </div>
        </div>
        
        <!-- ローディング表示 -->
        <div id="loading" class="loading">
            <div class="spinner"></div>
            <p>棚卸データを読み込み中...</p>
        </div>
        
        <!-- メインコンテンツ -->
        <div id="content" style="display: none;">
            
            <!-- データサマリー -->
            <div class="diagnostic-grid">
                <div class="diagnostic-card">
                    <h3><i class="fas fa-warehouse"></i> 在庫状況</h3>
                    <div id="inventory-summary">
                        <div class="alert alert-info">データ読み込み後に表示されます</div>
                    </div>
                </div>
                <div class="diagnostic-card">
                    <h3><i class="fas fa-chart-bar"></i> 統計情報</h3>
                    <div id="statistics-summary">
                        <div class="alert alert-info">統計情報を計算中...</div>
                    </div>
                </div>
            </div>
            
            <!-- 表示切り替えコントロール -->
            <div id="view-switcher-container"></div>
            
            <!-- データ表示エリア -->
            <div id="data-display-area">
                <!-- テンプレートから動的生成される -->
            </div>
            
            <!-- 選択操作パネル -->
            <div id="bulk-operations-panel" style="display: none;">
                <!-- 一括操作ボタンが表示される -->
            </div>
            
        </div>
        
        <!-- モーダル領域 -->
        <div id="modal-container">
            <!-- テンプレートから動的生成される -->
        </div>
        
    </div>

    <!-- テンプレートローダー（分離されたJS） -->
    <script src="modules/tanaoroshi_v2/template_loader.js"></script>
    
    <!-- 棚卸システムロジック（分離されたJS） -->
    <script src="modules/tanaoroshi_v2/tanaoroshi_logic.js"></script>
    
    <!-- 初期化スクリプト -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            console.log('棚卸システム v2 DOM読み込み完了');
            
            // 既存システムとの互換性確保
            setTimeout(() => {
                // モジュール初期化確認
                if (typeof window.EbayViewSwitcher !== "undefined") {
                    console.log('✅ EbayViewSwitcher が利用可能です');
                    window.EbayViewSwitcher.init();
                }
                
                if (typeof window.EbayEnhancedExcel !== "undefined") {
                    console.log('✅ EbayEnhancedExcel が利用可能です');
                    window.EbayEnhancedExcel.init();
                }
                
                // 棚卸システム初期化
                if (typeof window.initTanaoroshiV2 !== "undefined") {
                    console.log('🚀 棚卸システム v2 初期化');
                    window.initTanaoroshiV2();
                } else {
                    console.warn('⚠️ 棚卸システム v2 初期化関数が見つかりません');
                }
                
            }, 500);
        });
    </script>
</body>
</html>
