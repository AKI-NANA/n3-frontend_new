/**
 * タブ切り替え緊急修正スクリプト（完全版）
 */

console.log('=== Tab Switch Fix Loading ===');

// DOMロード後に実行
document.addEventListener('DOMContentLoaded', function() {
    
    // タブリンククリック時のイベント修正
    document.querySelectorAll('.ilm-tab-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const onclickAttr = this.getAttribute('onclick');
            console.log('Tab link clicked:', onclickAttr);
            
            // onclickから関数を抽出して実行
            if (onclickAttr) {
                // 例: IntegratedListingModal.switchTab('tab-listing')
                const match = onclickAttr.match(/switchTab\('([^']+)'\)/);
                if (match) {
                    const tabId = match[1];
                    console.log('Switching to tab:', tabId);
                    IntegratedListingModal.switchTab(tabId);
                }
            }
        });
    });
    
    console.log('Tab links fixed');
});

// IntegratedListingModal.switchTab関数を強化
if (typeof IntegratedListingModal !== 'undefined') {
    const originalSwitchTab = IntegratedListingModal.switchTab;
    
    IntegratedListingModal.switchTab = function(tabId) {
        console.log('=== Enhanced switchTab ===');
        console.log('Target tab:', tabId);
        
        // すべてのタブリンクを非アクティブに
        document.querySelectorAll('.ilm-tab-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // クリックされたタブリンクをアクティブに
        const activeLink = Array.from(document.querySelectorAll('.ilm-tab-link')).find(link => {
            const onclick = link.getAttribute('onclick');
            return onclick && onclick.includes(tabId);
        });
        
        if (activeLink) {
            activeLink.classList.add('active');
            console.log('Active link set:', activeLink);
        }
        
        // 🔴 修正: すべてのタブペインを非アクティブにし、インラインスタイルを完全にクリア
        document.querySelectorAll('.ilm-tab-pane').forEach(pane => {
            pane.classList.remove('active');
            
            // インラインスタイルを完全にクリア（CSSに委譲）
            pane.style.display = '';
            pane.style.opacity = '';
            pane.style.visibility = '';
            pane.style.position = '';
            pane.style.zIndex = '';
            
            console.log('Removed active from:', pane.id);
        });
        
        // 対象タブペインをアクティブに
        const targetPane = document.getElementById('ilm-' + tabId);
        if (targetPane) {
            targetPane.classList.add('active');
            
            // 🔴 強制的に表示スタイルを設定（!important相当）
            targetPane.style.setProperty('display', 'block', 'important');
            targetPane.style.setProperty('opacity', '1', 'important');
            targetPane.style.setProperty('visibility', 'visible', 'important');
            targetPane.style.setProperty('position', 'relative', 'important');
            targetPane.style.setProperty('z-index', '1', 'important');
            
            console.log('Added active to:', targetPane.id);
            console.log('✅ Forced display to:', targetPane.style.display);
            
            // 強制表示確認
            setTimeout(() => {
                const display = window.getComputedStyle(targetPane).display;
                console.log('Final display style:', display);
                
                if (display === 'none') {
                    console.error('STILL HIDDEN! Re-forcing display...');
                    targetPane.style.setProperty('display', 'block', 'important');
                    targetPane.style.setProperty('opacity', '1', 'important');
                    targetPane.style.setProperty('visibility', 'visible', 'important');
                }
            }, 50);
        } else {
            console.error('Target pane not found:', 'ilm-' + tabId);
        }
        
        // 状態更新
        this.state.currentTab = tabId;
        console.log('Tab switched successfully');
    };
    
    console.log('✅ Enhanced switchTab loaded');
}
