/**
 * SellerMirror Canvas画像生成
 * SVG Data URIの代わりにCanvas PNGを使用
 */

console.log('🎨 SellerMirror Canvas Image Generator Loading...');

// Canvas PNG画像生成関数
window.generateCanvasPNG = function(label, colorIndex) {
    const colors = [
        { bg: 'rgba(102, 126, 234, 0.9)', text: '#ffffff' },
        { bg: 'rgba(118, 75, 162, 0.9)', text: '#ffffff' },
        { bg: 'rgba(95, 114, 189, 0.9)', text: '#ffffff' },
        { bg: 'rgba(155, 89, 182, 0.9)', text: '#ffffff' },
        { bg: 'rgba(52, 152, 219, 0.9)', text: '#ffffff' },
        { bg: 'rgba(231, 76, 60, 0.9)', text: '#ffffff' }
    ];
    
    const color = colors[colorIndex % colors.length];
    
    // Canvas要素作成
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    // 背景色
    ctx.fillStyle = color.bg;
    ctx.fillRect(0, 0, 300, 300);
    
    // テキスト
    ctx.fillStyle = color.text;
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 150, 150);
    
    // PNG Data URLに変換
    return canvas.toDataURL('image/png');
};

// SellerMirror表示時に画像を置き換え
setTimeout(() => {
    if (typeof IntegratedListingModal !== 'undefined') {
        const originalDisplay = IntegratedListingModal.displaySellerMirrorResults;
        
        IntegratedListingModal.displaySellerMirrorResults = function(data) {
            // 元の表示を実行
            originalDisplay.call(this, data);
            
            // 全画像をCanvas PNGに置き換え
            setTimeout(() => {
                document.querySelectorAll('.mirror-card img').forEach((img, index) => {
                    const item = data.similar_items[index];
                    if (!item) return;
                    
                    // PHP側のData URIが失敗している可能性があるため、常にCanvas PNGを使用
                    const originalSrc = img.src;
                    
                    // Data URIまたは外部URLが失敗した場合のフォールバック
                    if (!originalSrc || originalSrc === '' || originalSrc.includes('placehold') || originalSrc.includes('placeholder')) {
                        const label = item.title?.includes('Card') || item.title?.includes('カード') ? `Card ${index + 1}` :
                                    item.title?.includes('Pokemon') || item.title?.includes('ポケモン') ? `Pokemon ${index + 1}` :
                                    `Item ${index + 1}`;
                        
                        const canvasPNG = window.generateCanvasPNG(label, index);
                        img.src = canvasPNG;
                        img.style.display = 'block';
                        img.style.background = '#f8f9fa';
                        console.log(`[Canvas PNG] Generated for item ${index}:`, canvasPNG.substring(0, 80) + '...');
                        console.log(`[Canvas PNG] Image size:`, canvasPNG.length, 'bytes');
                    } else if (originalSrc.startsWith('data:image/svg+xml')) {
                        // SVG Data URIをCanvas PNGに変換
                        const label = item.title?.includes('Card') || item.title?.includes('カード') ? `Card ${index + 1}` :
                                    item.title?.includes('Pokemon') || item.title?.includes('ポケモン') ? `Pokemon ${index + 1}` :
                                    `Item ${index + 1}`;
                        
                        const canvasPNG = window.generateCanvasPNG(label, index);
                        img.src = canvasPNG;
                        img.style.display = 'block';
                        img.style.background = '#f8f9fa';
                        console.log(`[Canvas PNG] Converted SVG to PNG for item ${index}`);
                        console.log(`[Canvas PNG] PNG size:`, canvasPNG.length, 'bytes');
                    }
                    
                    // エラーハンドリング
                    img.onerror = function() {
                        const label = `Item ${index + 1}`;
                        const canvasPNG = window.generateCanvasPNG(label, index);
                        this.src = canvasPNG;
                        this.onerror = null; // 無限ループ防止
                        console.log(`[Canvas PNG] Fallback applied for item ${index}`);
                    };
                });
                
                console.log('[Canvas PNG] All images processed');
            }, 100);
        };
        
        console.log('✅ Canvas PNG Generator Applied');
    }
}, 1500);

console.log('✅ SellerMirror Canvas Image Generator loaded');
