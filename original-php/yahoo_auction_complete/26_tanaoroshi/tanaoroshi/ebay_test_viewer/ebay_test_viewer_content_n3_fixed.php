<?php
/**
 * eBayテストビューアー - N3制約準拠版コンテンツ
 * JavaScript完全分離・Hook依存解決
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// CSRF トークン生成
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

?>
<!-- eBayテストビューアー - N3準拠HTML -->
<div class="ebay-test-viewer-container">
    <!-- ヘッダー -->
    <div class="ebay-viewer-header">
        <h1><i class="fas fa-microscope"></i> eBayデータテストビューアー</h1>
        <p>eBay APIから取得した実データの画像表示</p>
        <div class="n3-compliance-badge">N3制約準拠 - JS分離済み</div>
    </div>
    
    <!-- ローディング -->
    <div id="ebay-loading" class="ebay-loading">
        <div class="spinner"></div>
        <p>eBayデータを読み込み中...</p>
    </div>
    
    <!-- コンテンツエリア -->
    <div id="ebay-content" class="ebay-content" style="display: none;">
        
        <!-- 統計情報 -->
        <div id="ebay-stats" class="ebay-stats-grid">
            <!-- 動的生成 -->
        </div>
        
        <!-- 画像ギャラリー -->
        <div class="ebay-gallery-section">
            <h2><i class="fas fa-images"></i> eBay商品画像ギャラリー</h2>
            <div id="ebay-image-gallery" class="ebay-image-grid">
                <!-- 動的生成 -->
            </div>
        </div>
        
        <!-- 詳細情報（必要に応じて） -->
        <div id="ebay-details" class="ebay-details-section" style="display: none;">
            <!-- 動的生成 -->
        </div>
    </div>
    
    <!-- エラー表示 -->
    <div id="ebay-error" class="ebay-error" style="display: none;">
        <!-- 動的生成 -->
    </div>
</div>

<!-- N3制約準拠スタイル -->
<style>
.ebay-test-viewer-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.ebay-viewer-header {
    text-align: center;
    margin-bottom: 2rem;
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.ebay-viewer-header h1 {
    color: #1e293b;
    font-size: 2rem;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.n3-compliance-badge {
    background: #dcfce7;
    color: #166534;
    padding: 0.5rem 1rem;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 600;
    display: inline-block;
    margin-top: 1rem;
}

.ebay-loading {
    text-align: center;
    padding: 4rem 2rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.spinner {
    display: inline-block;
    width: 2rem;
    height: 2rem;
    border: 3px solid #e5e7eb;
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.ebay-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
}

.ebay-stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    text-align: center;
}

.ebay-stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: #3b82f6;
    margin-bottom: 0.5rem;
}

.ebay-stat-label {
    color: #64748b;
    font-size: 0.875rem;
}

.ebay-gallery-section {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
}

.ebay-gallery-section h2 {
    color: #1e293b;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.ebay-image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
}

.ebay-image-card {
    background: #f8fafc;
    border-radius: 12px;
    overflow: hidden;
    transition: transform 0.2s ease;
    border: 1px solid #e2e8f0;
}

.ebay-image-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.ebay-image-container {
    position: relative;
    height: 250px;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.ebay-image-container img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.ebay-no-image {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #64748b;
    font-size: 0.875rem;
}

.ebay-no-image i {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.3;
}

.ebay-image-info {
    padding: 1rem;
}

.ebay-item-title {
    font-weight: 600;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    color: #1e293b;
}

.ebay-item-id {
    color: #64748b;
    font-size: 0.75rem;
    margin-bottom: 0.5rem;
    font-family: monospace;
}

.ebay-item-price {
    font-weight: 600;
    color: #059669;
    font-size: 1rem;
}

.ebay-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 2rem;
    border-radius: 12px;
    text-align: center;
}

@media (max-width: 768px) {
    .ebay-test-viewer-container {
        padding: 1rem;
    }
    
    .ebay-stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .ebay-image-grid {
        grid-template-columns: 1fr;
    }
}
</style>

<!-- CSRF Token for JavaScript -->
<script>
    window.EBAY_VIEWER_CONFIG = {
        csrfToken: "<?= $_SESSION['csrf_token'] ?>",
        apiEndpoint: "modules/ebay_test_viewer/debug_data.php",
        initialized: false
    };
</script>
