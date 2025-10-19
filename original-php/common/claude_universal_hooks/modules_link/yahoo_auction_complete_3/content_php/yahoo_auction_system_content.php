<?php
if (!defined('SECURE_ACCESS')) die('Direct access not allowed');

// CSRF対策（N3準拠 - セッション重複回避）
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>

<div class="yahoo-auction-container">
    <div class="page-header">
        <h1><i class="fas fa-gavel"></i> Yahoo Auction System</h1>
        <p class="description">ヤフオク商品情報スクレイピングシステム（N3準拠版）</p>
    </div>

    <div class="scraping-form-section">
        <form id="yahooAuctionForm" class="n3-form">
            <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>" />
            
            <div class="input-group">
                <label for="auctionUrl">
                    <i class="fas fa-link"></i> ヤフオクURL
                </label>
                <input 
                    type="url" 
                    id="auctionUrl" 
                    name="auction_url" 
                    placeholder="https://auctions.yahoo.co.jp/jp/auction/..." 
                    required
                    class="form-control"
                />
                <small class="help-text">ヤフオク商品ページのURLを入力してください</small>
            </div>
            
            <div class="form-actions">
                <button type="button" onclick="executeScraping()" class="btn btn-primary" id="scrapeBtn">
                    <i class="fas fa-search"></i> スクレイピング実行
                </button>
                <button type="button" onclick="clearResults()" class="btn btn-secondary">
                    <i class="fas fa-trash"></i> クリア
                </button>
            </div>
        </form>
    </div>

    <div class="results-section" id="resultsSection" style="display: none;">
        <h2>スクレイピング結果</h2>
        <div id="scrapingResults"></div>
    </div>

    <div class="loading-section" id="loadingSection" style="display: none;">
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <span>スクレイピング中...</span>
        </div>
    </div>
</div>

<script src="modules/yahoo_auction_system/yahoo_auction_system.js"></script>
<link rel="stylesheet" href="modules/yahoo_auction_system/yahoo_auction_system.css">