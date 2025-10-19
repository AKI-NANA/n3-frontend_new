/**
 * タブ切り替えデバッグ - 表示問題の調査
 */

console.log('=== Tab Switching Debug ===');

// DOMContentLoaded後に実行
document.addEventListener('DOMContentLoaded', function() {
    
    // switchTab関数をラップ
    if (typeof IntegratedListingModal !== 'undefined' && IntegratedListingModal.switchTab) {
        const originalSwitchTab = IntegratedListingModal.switchTab;
        
        IntegratedListingModal.switchTab = function(tabId) {
            console.log('=== switchTab Called ===');
            console.log('Target tab:', tabId);
            
            // すべてのタブペインを確認
            const allPanes = document.querySelectorAll('.ilm-tab-pane');
            console.log('Total tab panes found:', allPanes.length);
            
            allPanes.forEach(pane => {
                console.log('Tab pane:', pane.id, 'active:', pane.classList.contains('active'));
            });
            
            // 対象タブの存在確認
            const targetPane = document.getElementById('ilm-' + tabId);
            console.log('Target pane exists:', !!targetPane);
            console.log('Target pane ID:', targetPane ? targetPane.id : 'N/A');
            
            // 元の関数実行
            originalSwitchTab.call(this, tabId);
            
            // 実行後の状態確認
            setTimeout(() => {
                console.log('=== After Switch ===');
                const allPanesAfter = document.querySelectorAll('.ilm-tab-pane');
                allPanesAfter.forEach(pane => {
                    const isActive = pane.classList.contains('active');
                    const isVisible = window.getComputedStyle(pane).display !== 'none';
                    console.log('Tab:', pane.id, 'active:', isActive, 'visible:', isVisible);
                    
                    if (pane.id === 'ilm-' + tabId) {
                        console.log('Target tab content length:', pane.innerHTML.length);
                        console.log('Target tab display:', window.getComputedStyle(pane).display);
                        
                        // コンテンツ確認
                        if (tabId === 'tab-listing') {
                            const marketplaceContent = document.getElementById('ilm-marketplace-content');
                            if (marketplaceContent) {
                                console.log('ilm-marketplace-content length:', marketplaceContent.innerHTML.length);
                                console.log('Has Amazon content:', marketplaceContent.innerHTML.includes('Amazon'));
                            } else {
                                console.error('ERROR: ilm-marketplace-content not found!');
                            }
                        }
                    }
                });
            }, 100);
        };
        
        console.log('OK: switchTab wrapped');
    }
    
    // タブリンクのクリックイベントを監視
    document.querySelectorAll('.ilm-tab-link').forEach(link => {
        link.addEventListener('click', function() {
            const onclick = this.getAttribute('onclick');
            console.log('Tab link clicked:', this.textContent.trim(), 'onclick:', onclick);
        });
    });
    
    console.log('Tab debug initialized');
});

// CSS確認用
setTimeout(() => {
    console.log('=== CSS Check ===');
    
    const style = document.createElement('style');
    style.textContent = `
        .ilm-tab-pane { 
            /* デバッグ用の強制表示 */
        }
        .ilm-tab-pane.active {
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
        }
    `;
    document.head.appendChild(style);
    console.log('Debug CSS injected');
}, 1000);

// 手動テスト関数
window.testTabSwitch = function(tabId) {
    console.log('=== Manual Test: Switching to', tabId, '===');
    
    // すべてのタブを非アクティブに
    document.querySelectorAll('.ilm-tab-pane').forEach(pane => {
        pane.classList.remove('active');
        console.log('Removed active from:', pane.id);
    });
    
    // 対象タブをアクティブに
    const target = document.getElementById('ilm-' + tabId);
    if (target) {
        target.classList.add('active');
        console.log('Added active to:', target.id);
        console.log('Display style:', window.getComputedStyle(target).display);
    } else {
        console.error('Target not found:', 'ilm-' + tabId);
    }
};

console.log('Manual test function available: testTabSwitch("tab-listing")');
