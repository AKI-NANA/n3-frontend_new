/**
 * ナビゲーションボタン機能化スクリプト
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔗 Navigation buttons initialization...');
    
    // ナビゲーションボタンのリンク設定
    const navLinks = {
        'nav-dashboard': '../01_dashboard/dashboard.php',
        'nav-scraping': '../02_scraping/scraping.php',
        'nav-approval': '../03_approval/approval.php',
        'nav-rieki': '../05_rieki/riekikeisan.php',
        'nav-filters': '../06_filters/filters.php',
        'nav-listing': '../08_listing/listing.php',
        'nav-category': '../11_category/frontend/ebay_category_tool.php'
    };
    
    Object.entries(navLinks).forEach(([className, url]) => {
        const button = document.querySelector(`.${className}`);
        if (button) {
            // 既存のhref属性を確認
            if (!button.href || button.href === '#') {
                button.href = url;
            }
            
            // クリックイベント追加
            button.addEventListener('click', function(e) {
                e.preventDefault();
                console.log(`[Nav] Opening: ${url}`);
                window.location.href = url;
            });
            
            console.log(`✅ Navigation button linked: ${className} -> ${url}`);
        } else {
            console.warn(`⚠️ Navigation button not found: ${className}`);
        }
    });
    
    // 機能別ボタンのイベント設定
    setupFunctionButtons();
    
    console.log('✅ Navigation buttons initialized');
});

/**
 * 機能別ボタンのセットアップ
 */
function setupFunctionButtons() {
    const functionButtons = [
        {
            selector: '.btn-function-category',
            action: () => {
                console.log('[Function] Opening category tool...');
                window.open('../11_category/frontend/ebay_category_tool.php', '_blank');
            }
        },
        {
            selector: '.btn-function-profit',
            action: () => {
                console.log('[Function] Opening profit calculator...');
                window.open('../05_rieki/riekikeisan.php', '_blank');
            }
        },
        {
            selector: '.btn-function-shipping',
            action: () => {
                console.log('[Function] Opening shipping calculator...');
                window.open('../09_shipping/shipping_calculator.php', '_blank');
            }
        },
        {
            selector: '.btn-manage-filter',
            action: () => {
                console.log('[Function] Opening filters...');
                window.open('../06_filters/filters.php', '_blank');
            }
        },
        {
            selector: '.btn-manage-list',
            action: () => {
                console.log('[Function] Opening listing manager...');
                window.open('../08_listing/listing.php', '_blank');
            }
        }
    ];
    
    functionButtons.forEach(({selector, action}) => {
        document.querySelectorAll(selector).forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                action();
            });
        });
    });
    
    console.log('✅ Function buttons setup completed');
}

console.log('✅ Navigation script loaded');
