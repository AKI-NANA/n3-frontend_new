<?php
/**
 * eBayデータテストビューアー - 完全診断・表示ページ
 * 全データベース項目の存在確認とeBay出品状況の完全調査
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
    <title>eBayデータテストビューアー - 完全診断</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../../common/css/style.css">
    <link rel="stylesheet" href="../../common/css/components/ebay_view_switcher_n3.css">
    <link rel="stylesheet" href="../../common/css/components/n3_modal_system.css">
    <script src="../../common/js/components/n3_modal_system.js"></script>
    <script src="../../common/js/components/ebay_view_switcher.js"></script>
    <script src="../../common/js/components/ebay_enhanced_excel.js"></script>
    <script>
        window.CSRF_TOKEN = "<?= $csrf_token ?>";
    </script>
    
    <script src="ebay_edit_manager_n3.js"></script>
    <script src="tanaoroshi.js"></script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-microscope"></i> eBayデータテストビューアー</h1>
            <p>データベース全項目とeBay出品状況の完全診断</p>
            
            <!-- モーダルテストボタン -->
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
            
            <!-- データ作成ボタン -->
            <div style="margin: 1rem 0; text-align: center;">
                <button onclick="createSampleData()" class="n3-btn n3-btn--info">
                    <i class="fas fa-plus-circle"></i> サンプルデータ作成
                </button>
                <button onclick="refreshData()" class="n3-btn n3-btn--secondary">
                    <i class="fas fa-sync"></i> データ更新
                </button>
            </div>
        </div>
        
        <div id="loading" class="loading">
            <div class="spinner"></div>
            <p>データベースを診断中...</p>
        </div>
        
        <div id="content" style="display: none;">
            
            <!-- 診断結果サマリー -->
            <div class="diagnostic-grid">
                <div class="diagnostic-card">
                    <h3><i class="fas fa-database"></i> データベース状況</h3>
                    <div id="database-summary"></div>
                </div>
                <div class="diagnostic-card">
                    <h3><i class="fab fa-ebay"></i> eBay出品状況</h3>
                    <div id="ebay-summary"></div>
                </div>
            </div>
            
            <!-- 統計情報 -->
            <div class="status-grid" id="stats-grid">
                <!-- 動的生成 -->
            </div>
            
            <!-- フィールド一覧 -->
            <div class="diagnostic-card">
                <h3><i class="fas fa-list"></i> データベース格納可能項目一覧</h3>
                <div class="field-grid" id="fields-grid">
                    <!-- 動的生成 -->
                </div>
            </div>
            
            <!-- サンプルデータ表示 -->
            <div class="diagnostic-card">
                <h3><i class="fas fa-table"></i> 実際のサンプルデータ</h3>
                <div id="sample-data">
                    <!-- 動的生成 -->
                </div>
            </div>
            
            <!-- JSON詳細表示 -->
            <div class="diagnostic-card">
                <h3><i class="fas fa-code"></i> 完全診断結果（JSON）</h3>
                <div class="json-display" id="json-output">
                    <!-- 動的生成 -->
                </div>
            </div>
            
        </div>
        
        <!-- N3モーダルシステムテスト用 -->
        <div id="test-modal" class="n3-modal n3-modal--large" aria-hidden="true" role="dialog" aria-modal="true">
            <div class="n3-modal__container">
                <div class="n3-modal__header">
                    <h2 class="n3-modal__title">
                        <i class="fas fa-microscope"></i> eBayデータ詳細情報
                    </h2>
                    <button class="n3-modal__close" onclick="N3Modal.close('test-modal')">
                        <span class="n3-sr-only">閉じる</span>
                        &times;
                    </button>
                </div>
                <div class="n3-modal__body">
                    <div id="modal-content">
                        <p>モーダルコンテンツがここに表示されます。</p>
                    </div>
                </div>
                <div class="n3-modal__footer">
                    <button class="n3-btn n3-btn--secondary" onclick="N3Modal.close('test-modal')">
                        閉じる
                    </button>
                    <button class="n3-btn n3-btn--primary" onclick="refreshModalData()">
                        <i class="fas fa-sync"></i> データ更新
                    </button>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
