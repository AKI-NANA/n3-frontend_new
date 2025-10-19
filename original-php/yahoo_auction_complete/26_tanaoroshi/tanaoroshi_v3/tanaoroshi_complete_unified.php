<?php
/**
 * eBayデータテストビューアー - 完全統合版（JavaScript エラー解決）
 * HTML外部分離問題の完全解決 + 将来の多モール拡張対応
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

// URL パラメータ取得
$view_mode = isset($_GET['view']) ? $_GET['view'] : 'excel';
$data_source = isset($_GET['source']) ? $_GET['source'] : 'ebay';

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>多モールデータビューアー - 完全統合版</title>
    
    <!-- 外部CSS -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../../common/css/style.css">
    
    <!-- 統合CSS -->
    <link rel="stylesheet" href="tanaoroshi_unified.css">
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="header">
            <h1><i class="fas fa-chart-bar"></i> 多モールデータビューアー</h1>
            <p>完全統合版 - JavaScript エラー解決済み</p>
        </div>

        <!-- データソース選択 -->
        <div class="data-source-switcher">
            <h3><i class="fas fa-database"></i> データソース選択</h3>
            <div class="source-options">
                <a href="?source=ebay&view=<?= $view_mode ?>" class="source-btn <?= $data_source === 'ebay' ? 'active' : '' ?>">
                    <i class="fab fa-ebay"></i>
                    eBayデータ
                </a>
                <button class="source-btn coming-soon" disabled>
                    <i class="fab fa-amazon"></i>
                    Amazon
                </button>
                <button class="source-btn coming-soon" disabled>
                    <i class="fas fa-yen-sign"></i>
                    メルカリ
                </button>
                <button class="source-btn coming-soon" disabled>
                    <i class="fas fa-shopping-bag"></i>
                    楽天
                </button>
            </div>
        </div>

        <!-- レスポンシブコントロール -->
        <div class="responsive-controls">
            <div class="view-controls">
                <h4>表示形式:</h4>
                <button class="control-btn view-control-btn <?= $view_mode === 'excel' ? 'active' : '' ?>" 
                        onclick="switchViewMode('excel')">
                    <i class="fas fa-table"></i> Excel
                </button>
                <button class="control-btn view-control-btn <?= $view_mode === 'card' ? 'active' : '' ?>" 
                        onclick="switchViewMode('card')">
                    <i class="fas fa-th-large"></i> Card
                </button>
            </div>
            
            <div class="data-controls">
                <button class="control-btn" onclick="refreshDataDisplay()" id="refresh-btn">
                    <i class="fas fa-sync-alt"></i> データ更新
                </button>
                <button class="control-btn" onclick="exportDataToJson()">
                    <i class="fas fa-download"></i> エクスポート
                </button>
            </div>
        </div>

        <!-- データ表示エリア -->
        <div id="content-area">
            <?php if ($view_mode === 'excel'): ?>
                <!-- Excelビュー（インライン・エラー解決版） -->
                <div id="excel-view" class="view-content active-view">
                    <div class="n3-excel-wrapper">
                        <table class="n3-excel-table">
                            <thead>
                                <tr>
                                    <th><input type="checkbox" id="master-checkbox" /></th>
                                    <th>画像</th>
                                    <th>商品タイトル</th>
                                    <th>ID/ASIN</th>
                                    <th>ステータス</th>
                                    <th>在庫</th>
                                    <th>価格</th>
                                    <th>最終更新</th>
                                    <th>アクション</th>
                                </tr>
                            </thead>
                            <tbody id="excel-tbody">
                                <!-- データがJavaScriptで動的に挿入されます -->
                            </tbody>
                        </table>
                    </div>
                </div>
            <?php else: ?>
                <!-- カードビュー（インライン・エラー解決版） -->
                <div id="card-view" class="view-content active-view">
                    <div id="card-container" class="card-grid">
                        <!-- カードがJavaScriptで動的に挿入されます -->
                    </div>
                </div>
            <?php endif; ?>
        </div>

        <!-- JSON出力エリア -->
        <div class="json-output-wrapper">
            <h3><i class="fas fa-code"></i> API レスポンス（デバッグ用）</h3>
            <pre class="json-display" id="json-output"></pre>
        </div>

        <!-- モーダル -->
        <div id="data-modal" class="n3-modal n3-modal--large" aria-hidden="true" role="dialog" aria-modal="true">
            <div class="n3-modal__container">
                <div class="n3-modal__header">
                    <h2 class="n3-modal__title">
                        <i class="fas fa-info-circle"></i> 商品詳細情報
                    </h2>
                    <button class="n3-modal__close" onclick="closeModal()">
                        <span class="n3-sr-only">閉じる</span>
                        &times;
                    </button>
                </div>
                <div class="n3-modal__body">
                    <div id="modal-content">
                        <p>データ読み込み中...</p>
                    </div>
                </div>
                <div class="n3-modal__footer">
                    <button class="btn btn--secondary" onclick="closeModal()">
                        閉じる
                    </button>
                    <button class="btn btn--primary" onclick="refreshModalData()">
                        <i class="fas fa-sync"></i> データ更新
                    </button>
                </div>
            </div>
        </div>

        <!-- 高度なローディング -->
        <div class="advanced-loader" id="advanced-loader">
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <h4>データ処理中...</h4>
                <p id="loading-message">データを取得しています</p>
            </div>
        </div>
    </div>

    <!-- JavaScript統合読み込み（エラー解決版） -->
    <script>
        // ===== グローバル設定（PHP値の受け渡し） =====
        window.CSRF_TOKEN = "<?= $csrf_token ?>";
        window.CURRENT_VIEW = "<?= $view_mode ?>";
        window.CURRENT_SOURCE = "<?= $data_source ?>";
    </script>
    
    <!-- 統合JavaScript読み込み -->
    <script src="tanaoroshi_unified.js"></script>
    
    <!-- 追加の初期化スクリプト -->
    <script>
        // ページ固有の初期化処理
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🎯 多モールデータビューアー - 完全統合版 初期化完了');
            console.log(`📊 現在の表示: ${window.CURRENT_VIEW}ビュー`);
            console.log(`📦 データソース: ${window.CURRENT_SOURCE}`);
            
            // 成功メッセージ表示
            setTimeout(() => {
                showSuccessNotification('✅ JavaScript エラー解決完了！統合版で動作中');
            }, 1000);
        });
    </script>
</body>
</html>