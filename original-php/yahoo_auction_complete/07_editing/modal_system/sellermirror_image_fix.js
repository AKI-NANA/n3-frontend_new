/**
 * SellerMirror 画像表示修正パッチ
 * SVG Data URIとフォールバック処理
 */

console.log('🖼️ SellerMirror Image Fix Loading...');

setTimeout(() => {
    if (typeof IntegratedListingModal !== 'undefined') {
        
        // 画像エラー時のフォールバック処理を強化
        const originalDisplay = IntegratedListingModal.displaySellerMirrorResults;
        
        IntegratedListingModal.displaySellerMirrorResults = function(data) {
            // 元の表示を実行
            originalDisplay.call(this, data);
            
            // 全ての画像にエラーハンドリングとフォールバックを設定
            document.querySelectorAll('.mirror-card img').forEach((img, index) => {
                // 既にData URIの場合はスキップ
                if (img.src.startsWith('data:')) {
                    return;
                }
                
                // 画像読み込みエラー時のフォールバック
                img.onerror = function() {
                    console.warn('[Image Error] Failed to load:', this.src);
                    
                    // SVG Data URIのフォールバック画像を生成
                    const colors = [
                        'rgba(102, 126, 234, 0.8)',
                        'rgba(118, 75, 162, 0.8)',
                        'rgba(95, 114, 189, 0.8)',
                        'rgba(155, 89, 182, 0.8)',
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(231, 76, 60, 0.8)'
                    ];
                    
                    const color = colors[index % colors.length];
                    const label = 'Item ' + (index + 1);
                    
                    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
                        <rect width="300" height="300" fill="${color}"/>
                        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${label}</text>
                    </svg>`;
                    
                    this.src = 'data:image/svg+xml;base64,' + btoa(svg);
                    this.onerror = null; // 無限ループ防止
                };
                
                // 画像読み込み成功時のログ
                img.onload = function() {
                    console.log('[Image Success] Loaded:', this.src.substring(0, 50) + '...');
                };
            });
            
            console.log('[Image Fix] Error handlers applied to all images');
        };
        
        console.log('✅ SellerMirror Image Fix Applied');
    }
}, 2000);

console.log('✅ SellerMirror Image Fix loaded');
