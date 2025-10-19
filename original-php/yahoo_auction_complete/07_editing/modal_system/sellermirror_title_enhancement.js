/**
 * SellerMirror タイトル表示改善パッチ
 * 英語タイトル + 日本語タイトル表示
 */

console.log('🔧 SellerMirror Title Enhancement Patch Loading...');

setTimeout(() => {
    if (typeof IntegratedListingModal !== 'undefined') {
        // renderItemCard関数を上書き
        const originalDisplay = IntegratedListingModal.displaySellerMirrorResults;
        
        IntegratedListingModal.displaySellerMirrorResults = function(data) {
            // 元の表示を実行
            originalDisplay.call(this, data);
            
            // タイトルを改善
            const japaneseTitle = this.state?.productData?.title || '';
            
            document.querySelectorAll('.mirror-card').forEach((card, index) => {
                const item = data.similar_items[index];
                if (!item) return;
                
                const titleDiv = card.querySelector('div[style*="height: 42px"]');
                if (titleDiv && japaneseTitle) {
                    const englishTitle = (item.title || '').substring(0, 60);
                    
                    titleDiv.innerHTML = `
                        <div style="font-size: 0.85rem; font-weight: 500; color: #0d6efd; margin-bottom: 0.25rem; height: 18px; overflow: hidden; line-height: 1.2;">
                            ${englishTitle}...
                        </div>
                        <div style="font-size: 0.75rem; color: #6c757d; height: 18px; overflow: hidden; line-height: 1.2;">
                            ${japaneseTitle.substring(0, 40)}...
                        </div>
                    `;
                    titleDiv.style.height = '42px';
                }
            });
            
            console.log('[Title Enhancement] Japanese titles added');
        };
        
        console.log('✅ SellerMirror Title Enhancement Patch Applied');
    }
}, 1500);

console.log('✅ SellerMirror Title Enhancement Patch loaded');
