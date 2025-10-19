/**
 * SellerMirror 画像デバッグツール
 * 画像表示問題の診断と修正
 */

console.log('🔍 SellerMirror Image Debug Tool Loading...');

// デバッグ用グローバル関数
window.debugSellerMirrorImages = function() {
    console.log('=== SellerMirror Image Debug ===');
    
    // 1. コンテナの存在確認
    const container = document.getElementById('sellermirror-results-container');
    console.log('Container exists:', !!container);
    
    if (container) {
        console.log('Container innerHTML length:', container.innerHTML.length);
        console.log('Container has content:', container.innerHTML.trim().length > 0);
    }
    
    // 2. Mirror cards確認
    const cards = document.querySelectorAll('.mirror-card');
    console.log('Mirror cards found:', cards.length);
    
    // 3. 画像要素確認
    const images = document.querySelectorAll('.mirror-card img');
    console.log('Images found:', images.length);
    
    images.forEach((img, i) => {
        console.log(`Image ${i}:`, {
            src: img.src.substring(0, 100) + '...',
            srcLength: img.src.length,
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            display: window.getComputedStyle(img).display,
            visibility: window.getComputedStyle(img).visibility,
            opacity: window.getComputedStyle(img).opacity,
            error: img.onerror ? 'handler exists' : 'no handler'
        });
    });
    
    // 4. SellerMirrorデータ確認
    if (window.IntegratedListingModal && window.IntegratedListingModal.state) {
        const mirrorData = window.IntegratedListingModal.state.toolResults?.sellermirror;
        console.log('SellerMirror data exists:', !!mirrorData);
        
        if (mirrorData) {
            console.log('Similar items count:', mirrorData.similar_items?.length || 0);
            console.log('API mode:', mirrorData.api_mode);
            
            if (mirrorData.similar_items) {
                mirrorData.similar_items.forEach((item, i) => {
                    console.log(`Item ${i} image_url:`, item.image_url?.substring(0, 100));
                });
            }
        }
    }
    
    // 5. CSPエラー確認
    console.log('\n=== CSP Check ===');
    console.log('Look for CSP errors in Console that mention:');
    console.log('- "Refused to load the image"');
    console.log('- "Content Security Policy"');
    console.log('- "data: scheme"');
    
    return {
        container: !!container,
        cards: cards.length,
        images: images.length
    };
};

// SellerMirror実行後に自動デバッグ
setTimeout(() => {
    if (typeof IntegratedListingModal !== 'undefined') {
        const originalRun = IntegratedListingModal.runSellerMirrorTool;
        
        IntegratedListingModal.runSellerMirrorTool = async function() {
            await originalRun.call(this);
            
            // 実行後500ms待ってデバッグ
            setTimeout(() => {
                console.log('📊 Auto-debugging SellerMirror images...');
                window.debugSellerMirrorImages();
            }, 500);
        };
        
        console.log('✅ Auto-debug hook installed');
    }
}, 1000);

console.log('✅ SellerMirror Image Debug Tool loaded');
console.log('💡 Run: debugSellerMirrorImages() to check image status');
