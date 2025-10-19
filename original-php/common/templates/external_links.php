<?php
/**
 * NAGANO-3統合管理システム - 外部リンクテンプレート
 * 外部サイト・APIリンク管理用
 */
?>

<!-- 外部リンクコンテナ -->
<div class="external-links">
  <h2 class="external-links__title">外部サイト・API連携</h2>
  
  <!-- モール連携セクション -->
  <section class="external-links__section">
    <h3>モール連携</h3>
    <div class="external-links__grid">
      <a href="https://sellercentral.amazon.co.jp/" class="external-link" data-api="amazon">
        <i class="fab fa-amazon"></i>
        <span>Amazon セラーセントラル</span>
      </a>
      <a href="https://seller.ebay.com/" class="external-link" data-api="ebay">
        <i class="fab fa-ebay"></i>
        <span>eBay Seller Hub</span>
      </a>
      <a href="https://admin.shopify.com/" class="external-link" data-api="shopify">
        <i class="fab fa-shopify"></i>
        <span>Shopify 管理画面</span>
      </a>
    </div>
  </section>
  
  <!-- API連携セクション -->
  <section class="external-links__section">
    <h3>API連携サービス</h3>
    <div class="external-links__grid">
      <a href="https://developer.amazon.com/" class="external-link" data-endpoint="amazon-api">
        <i class="fas fa-code"></i>
        <span>Amazon API Portal</span>
      </a>
      <a href="https://developer.ebay.com/" class="external-link" data-endpoint="ebay-api">
        <i class="fas fa-plug"></i>
        <span>eBay Developers</span>
      </a>
      <a href="https://shopify.dev/" class="external-link" data-endpoint="shopify-api">
        <i class="fas fa-terminal"></i>
        <span>Shopify API Docs</span>
      </a>
    </div>
  </section>
</div>

<!-- External Links JavaScript -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔗 External Links JavaScript 初期化');
    
    // 外部リンク専用の初期化
    NAGANO3_PHP.addInit(function() {
        // 外部リンクの安全な処理
        const externalLinks = document.querySelectorAll('a[href^="http"]');
        externalLinks.forEach(link => {
            // 外部リンクに target="_blank" を自動追加
            if (!link.hasAttribute('target')) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });
        
        console.log('🔗 外部リンク処理完了:', externalLinks.length, '件');
        
        // API関連の要素確認
        const apiElements = document.querySelectorAll('[data-api], [data-endpoint]');
        console.log('🔌 API関連要素:', apiElements.length, '件');
    });
});
</script>