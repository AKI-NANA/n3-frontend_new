/**
 * 詳細デバッグスクリプト - マーケットプレイス切り替え問題調査
 */

console.log('=== Integrated Modal Debug System ===');

// 1. モーダルHTML構造の確認
document.addEventListener('DOMContentLoaded', function() {
    console.log('[1] Checking Modal HTML Structure');
    
    const modalElement = document.getElementById('integrated-listing-modal');
    console.log('Modal element exists:', !!modalElement);
    
    const marketplaceContent = document.getElementById('ilm-marketplace-content');
    const shippingContent = document.getElementById('ilm-shipping-content');
    const htmlEditorContainer = document.getElementById('ilm-html-editor-container');
    
    console.log('ilm-marketplace-content exists:', !!marketplaceContent);
    console.log('ilm-shipping-content exists:', !!shippingContent);
    console.log('ilm-html-editor-container exists:', !!htmlEditorContainer);
    
    // 2. マーケットプレイスボタンの確認
    console.log('[2] Checking Marketplace Buttons');
    
    const buttons = {
        ebay: document.querySelector('.ilm-marketplace-btn.ebay'),
        'amazon-jp': document.querySelector('.ilm-marketplace-btn.amazon-jp'),
        shopify: document.querySelector('.ilm-marketplace-btn.shopify')
    };
    
    Object.entries(buttons).forEach(([key, btn]) => {
        console.log(key + ' button:', {
            exists: !!btn,
            hasNotImplemented: btn?.classList.contains('not-implemented'),
            onclick: btn?.getAttribute('onclick')
        });
    });
    
    // 3. IntegratedListingModal オブジェクトの確認
    console.log('[3] Checking IntegratedListingModal Object');
    
    if (typeof IntegratedListingModal !== 'undefined') {
        console.log('IntegratedListingModal exists: OK');
        console.log('Current state:', IntegratedListingModal.state);
        console.log('Marketplace tabs map:', IntegratedListingModal.marketplaceTabsMap);
        
        // 4. switchMarketplace関数のテスト
        console.log('[4] Testing switchMarketplace Function');
        
        const originalSwitch = IntegratedListingModal.switchMarketplace;
        
        IntegratedListingModal.switchMarketplace = async function(marketplace) {
            console.log('=== switchMarketplace Called ===');
            console.log('Target marketplace:', marketplace);
            console.log('Current marketplace before switch:', this.state.currentMarketplace);
            
            // タブマップの確認
            const tabsMap = this.marketplaceTabsMap[marketplace];
            console.log('Tabs map for ' + marketplace + ':', tabsMap);
            
            if (!tabsMap) {
                console.error('ERROR: No tabs map found for:', marketplace);
                return;
            }
            
            // 元の関数を実行
            await originalSwitch.call(this, marketplace);
            
            console.log('Current marketplace after switch:', this.state.currentMarketplace);
            
            // コンテナの内容確認
            setTimeout(() => {
                console.log('=== Container Content Check ===');
                
                const listingContainer = document.getElementById('ilm-marketplace-content');
                const shippingContainer = document.getElementById('ilm-shipping-content');
                const htmlContainer = document.getElementById('ilm-html-editor-container');
                
                console.log('Listing container HTML length:', listingContainer?.innerHTML?.length || 0);
                console.log('Listing container preview:', listingContainer?.innerHTML?.substring(0, 100) || 'empty');
                
                console.log('Shipping container HTML length:', shippingContainer?.innerHTML?.length || 0);
                console.log('HTML container HTML length:', htmlContainer?.innerHTML?.length || 0);
                
                // 特定の文字列チェック
                if (marketplace === 'amazon-jp') {
                    const hasAmazonContent = listingContainer?.innerHTML?.includes('Amazon日本');
                    const hasJANCode = listingContainer?.innerHTML?.includes('JAN');
                    console.log('Amazon Japan content found:', hasAmazonContent);
                    console.log('Has JAN code field:', hasJANCode);
                } else if (marketplace === 'shopify') {
                    const hasShopifyContent = listingContainer?.innerHTML?.includes('Shopify');
                    const hasLiquid = listingContainer?.innerHTML?.includes('Liquid');
                    console.log('Shopify content found:', hasShopifyContent);
                    console.log('Has Liquid reference:', hasLiquid);
                }
                
                console.log('=== End Debug ===');
            }, 500);
        };
        
        console.log('OK: switchMarketplace function wrapped for debugging');
        
    } else {
        console.error('ERROR: IntegratedListingModal not found!');
    }
    
    // 5. loadTabContent関数のテスト
    if (typeof IntegratedListingModal !== 'undefined' && IntegratedListingModal.loadTabContent) {
        const originalLoadTab = IntegratedListingModal.loadTabContent;
        
        IntegratedListingModal.loadTabContent = async function(tabName, templatePath) {
            console.log('=== loadTabContent Called ===');
            console.log('Tab name:', tabName);
            console.log('Template path:', templatePath);
            
            try {
                // Fetch確認
                const response = await fetch('modal_system/' + templatePath);
                console.log('Fetch response status:', response.status);
                console.log('Fetch response OK:', response.ok);
                
                if (response.ok) {
                    const html = await response.text();
                    console.log('Fetched HTML length:', html.length);
                    console.log('HTML preview (first 200 chars):', html.substring(0, 200));
                    
                    // コンテナ判定
                    let targetContainer;
                    
                    if (tabName === 'listing') {
                        targetContainer = document.getElementById('ilm-marketplace-content');
                        console.log('Target: ilm-marketplace-content, exists:', !!targetContainer);
                    } else if (tabName === 'shipping') {
                        targetContainer = document.getElementById('ilm-shipping-content');
                        console.log('Target: ilm-shipping-content, exists:', !!targetContainer);
                    } else if (tabName === 'html') {
                        targetContainer = document.getElementById('ilm-html-editor-container');
                        console.log('Target: ilm-html-editor-container, exists:', !!targetContainer);
                    } else {
                        targetContainer = document.getElementById('ilm-tab-' + tabName);
                        console.log('Target: ilm-tab-' + tabName + ', exists:', !!targetContainer);
                    }
                    
                    if (targetContainer) {
                        targetContainer.innerHTML = html;
                        console.log('OK: HTML loaded successfully');
                    } else {
                        console.error('ERROR: Target container not found!');
                    }
                } else {
                    console.error('ERROR: Fetch failed:', response.status, response.statusText);
                }
            } catch (error) {
                console.error('ERROR: loadTabContent error:', error);
            }
        };
        
        console.log('OK: loadTabContent function wrapped for debugging');
    }
});

// 6. モーダルが開いた時の確認
if (typeof IntegratedListingModal !== 'undefined') {
    const originalOpen = IntegratedListingModal.open;
    
    IntegratedListingModal.open = async function(itemId) {
        console.log('=== Modal Opening ===');
        console.log('Item ID:', itemId);
        
        await originalOpen.call(this, itemId);
        
        setTimeout(() => {
            console.log('=== Initial Load Check ===');
            console.log('Current marketplace:', this.state.currentMarketplace);
            console.log('Current tab:', this.state.currentTab);
            console.log('Current source:', this.state.currentSource);
            
            const listingContainer = document.getElementById('ilm-marketplace-content');
            console.log('Initial listing container content length:', listingContainer?.innerHTML?.length || 0);
        }, 1000);
    };
}

console.log('✅ Debug system initialized');
console.log('To test: Click on a product image to open the modal, then click Amazon日本 or Shopify button');
