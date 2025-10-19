/**
 * タブ切り替え完全修正スクリプト（最終版 - スクロール対応）
 */

console.log('🔥 EMERGENCY TAB FIX WITH SCROLL LOADING...');

// IntegratedListingModal.switchTab を完全にオーバーライド
(function() {
    // DOMロード後に実行
    const initTabFix = () => {
        console.log('🔥 Initializing tab fix with scroll support...');
        
        if (typeof IntegratedListingModal === 'undefined') {
            console.error('❌ IntegratedListingModal not found');
            return;
        }
        
        // 元のswitchTab関数を完全に置き換え
        IntegratedListingModal.switchTab = function(tabId) {
            console.log('🔥 EMERGENCY switchTab called:', tabId);
            
            // 1. すべてのタブリンクを非アクティブに
            document.querySelectorAll('.ilm-tab-link').forEach(link => {
                link.classList.remove('active');
            });
            
            // 2. 対象タブリンクをアクティブに
            const targetLink = Array.from(document.querySelectorAll('.ilm-tab-link')).find(link => {
                const onclick = link.getAttribute('onclick');
                return onclick && onclick.includes(`'${tabId}'`);
            });
            
            if (targetLink) {
                targetLink.classList.add('active');
                console.log('✅ Active link:', targetLink);
            }
            
            // 3. すべてのタブペインを強制非表示
            document.querySelectorAll('.ilm-tab-pane').forEach(pane => {
                pane.classList.remove('active');
                pane.style.cssText = `
                    display: none !important; 
                    visibility: hidden !important; 
                    opacity: 0 !important;
                    position: absolute !important;
                    overflow-y: auto !important;
                    overflow-x: hidden !important;
                `;
                console.log('Hidden:', pane.id);
            });
            
            // 4. 対象タブペインを強制表示＋スクロール有効化
            const targetPane = document.getElementById(`ilm-${tabId}`);
            if (targetPane) {
                targetPane.classList.add('active');
                targetPane.style.cssText = `
                    display: block !important; 
                    visibility: visible !important; 
                    opacity: 1 !important; 
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    overflow-y: auto !important;
                    overflow-x: hidden !important;
                    padding: 1.5rem !important;
                    z-index: 1 !important;
                `;
                
                console.log('✅ SHOWN WITH SCROLL:', targetPane.id);
                console.log('✅ Display:', window.getComputedStyle(targetPane).display);
                console.log('✅ Overflow-Y:', window.getComputedStyle(targetPane).overflowY);
                console.log('✅ Height:', window.getComputedStyle(targetPane).height);
                
                // スクロールを一番上にリセット
                targetPane.scrollTop = 0;
                
                // 最終確認
                setTimeout(() => {
                    const finalDisplay = window.getComputedStyle(targetPane).display;
                    const finalOverflow = window.getComputedStyle(targetPane).overflowY;
                    
                    if (finalDisplay === 'none') {
                        console.error('❌ STILL HIDDEN! Force again...');
                        targetPane.style.display = 'block';
                        targetPane.style.visibility = 'visible';
                        targetPane.style.opacity = '1';
                    }
                    
                    if (finalOverflow !== 'auto' && finalOverflow !== 'scroll') {
                        console.error('❌ SCROLL NOT ENABLED! Force again...');
                        targetPane.style.overflowY = 'auto';
                    } else {
                        console.log('✅ SUCCESS! Tab is visible with scroll:', finalDisplay, finalOverflow);
                    }
                }, 100);
            } else {
                console.error('❌ Target pane not found:', `ilm-${tabId}`);
            }
            
            // 5. 状態更新
            this.state.currentTab = tabId;
        };
        
        // タブリンクのクリックイベント修正
        document.querySelectorAll('.ilm-tab-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const onclick = this.getAttribute('onclick');
                if (onclick) {
                    const match = onclick.match(/switchTab\('([^']+)'\)/);
                    if (match) {
                        IntegratedListingModal.switchTab(match[1]);
                    }
                }
            });
        });
        
        console.log('✅ EMERGENCY TAB FIX WITH SCROLL LOADED');
    };
    
    // DOMContentLoaded または即座に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTabFix);
    } else {
        initTabFix();
    }
})();
