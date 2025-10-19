<?php 
/**
 * eBayデータテストビューアー - N3準拠コンテンツ
 * Ajax/HTML完全分離版 (PHPにJavaScript混在禁止)
 */

if (!defined('SECURE_ACCESS')) die('Direct access not allowed'); 

// CSRF トークン生成
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
$csrf_token = isset($_SESSION['csrf_token']) ? $_SESSION['csrf_token'] : bin2hex(random_bytes(32));
$_SESSION['csrf_token'] = $csrf_token;
?>

<div class="ebay-viewer-container">
    <div class="ebay-viewer-header">
        <h1><i class="fas fa-microscope"></i> eBayデータテストビューアー</h1>
        <p>N3準拠 - Ajax/HTML完全分離版</p>
        
        <div class="control-panel">
            <button id="refreshBtn" class="n3-btn n3-btn--primary">
                <i class="fas fa-sync"></i> データ更新
            </button>
            <button id="createSampleBtn" class="n3-btn n3-btn--success">
                <i class="fas fa-plus-circle"></i> サンプルデータ作成
            </button>
            <button id="modalTestBtn" class="n3-btn n3-btn--info">
                <i class="fas fa-window-maximize"></i> モーダルテスト
            </button>
        </div>
    </div>
    
    <div id="loadingArea" class="loading-area" style="display: none;">
        <div class="loading-spinner"></div>
        <p>データベースを診断中...</p>
    </div>
    
    <div id="contentArea" class="content-area">
        
        <!-- 診断結果サマリー -->
        <div class="diagnostic-summary">
            <div class="diagnostic-card">
                <h3><i class="fas fa-database"></i> データベース状況</h3>
                <div id="databaseSummary"></div>
            </div>
            <div class="diagnostic-card">
                <h3><i class="fab fa-ebay"></i> eBay出品状況</h3>
                <div id="ebaySummary"></div>
            </div>
        </div>
        
        <!-- 統計情報 -->
        <div id="statsArea" class="stats-area"></div>
        
        <!-- データテーブル -->
        <div class="data-table-container">
            <h3><i class="fas fa-table"></i> eBayデータ一覧</h3>
            <div id="dataTableArea"></div>
        </div>
        
        <!-- JSON出力（デバッグ用） -->
        <div class="json-output-container" style="display: none;">
            <h3><i class="fas fa-code"></i> 完全診断結果（JSON）</h3>
            <pre id="jsonOutput" class="json-display"></pre>
        </div>
        
    </div>
</div>

<!-- Hidden inputs for JavaScript -->
<input type="hidden" id="csrfToken" value="<?= htmlspecialchars($csrf_token, ENT_QUOTES, 'UTF-8') ?>">

<!-- N3Modal System -->
<div id="productDetailModal" class="n3-modal n3-modal--large" aria-hidden="true" role="dialog" aria-modal="true">
    <div class="n3-modal__container">
        <div class="n3-modal__header">
            <h2 class="n3-modal__title" id="modalTitle">
                <i class="fas fa-eye"></i> 商品詳細情報
            </h2>
            <button class="n3-modal__close" onclick="EbayViewer.closeModal()">
                <span class="n3-sr-only">閉じる</span>
                &times;
            </button>
        </div>
        <div class="n3-modal__body">
            <div id="modalContent"></div>
        </div>
        <div class="n3-modal__footer">
            <button class="n3-btn n3-btn--secondary" onclick="EbayViewer.closeModal()">
                閉じる
            </button>
        </div>
    </div>
</div>
