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

// ビューモードをURLから取得。デフォルトはExcelビュー
$view_mode = isset($_GET['view']) ? $_GET['view'] : 'excel';

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
    <link rel="stylesheet" href="tanaoroshi_complete.css">
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-microscope"></i> eBayデータテストビューアー</h1>
            <p>データベース全項目とeBay出品状況の完全診断</p>
            <div class="view-switcher-container">
                <button class="view-switcher-btn excel-view-btn" data-view="excel" onclick="window.location.href='?view=excel'">
                    <i class="fas fa-table"></i> Excelビュー
                </button>
                <button class="view-switcher-btn card-view-btn" data-view="card" onclick="window.location.href='?view=card'">
                    <i class="fas fa-th-large"></i> カードビュー
                </button>
            </div>
        </div>
        <div id="content">
            <?php
            // PHPのincludeでビューを動的に読み込み
            if ($view_mode === 'excel') {
                include 'excel_view.html';
            } elseif ($view_mode === 'card') {
                include 'card_view.html';
            }
            ?>
        </div>
        <div class="json-output-wrapper">
            <h3><i class="fas fa-code"></i> 完全診断結果（JSON）</h3>
            <pre class="json-display" id="json-output"></pre>
        </div>
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
    <!-- <script src="../../common/js/components/n3_modal_system.js"></script>
    <script src="../../common/js/components/ebay_view_switcher.js"></script>
    <script src="../../common/js/components/ebay_enhanced_excel.js"></script>
    <script src="ebay_edit_manager_n3.js"></script>
    <script src="tanaoroshi.js"></script> -->

    <script src="../../common/js/components/n3_modal_system.js"></script>
    <script src="../../common/js/components/ebay_view_switcher.js"></script>
    <script src="../../common/js/components/ebay_enhanced_excel.js"></script>
    <script src="ebay_edit_manager_n3.js"></script>
    <script src="tanaoroshi.js"></script>
    
    <script>
        window.CSRF_TOKEN = "<?= $csrf_token ?>";
    </script>
</body>
</html>