/**
 * eBay画像表示完全修正システム - N3準拠版
 * Base64 API統合 + 改善カードデザイン + N3制約適用
 */

window.EbayImageDisplaySystem = (function() {
    'use strict';
    
    const config = {
        version: 'N3-Compliant-v1.0',
        base64ApiEndpoint: '/image_base64_api.php',
        fallbackImageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04MCA2MEgxMjBWMTQwSDgwVjYwWiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNNjAgODBIMTQwVjEyMEg2MFY4MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHN2Zz4K',
        retryAttempts: 3,
        retryDelay: 1000,
        cacheEnabled: true,
        cache: new Map()
    };
    
    // Base64画像取得（N3準拠・エラーハンドリング強化）
    async function getBase64Image(imageUrl) {
        const cacheKey = `base64_${imageUrl}`;
        
        // キャッシュ確認
        if (config.cache.has(cacheKey)) {
            console.log('Base64キャッシュヒット:', imageUrl);
            return config.cache.get(cacheKey);
        }
        
        for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
            try {
                console.log(`Base64変換試行 ${attempt}/${config.retryAttempts}:`, imageUrl);
                
                const response = await fetch(`${config.base64ApiEndpoint}?url=${encodeURIComponent(imageUrl)}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                if (result.success && result.data_uri) {
                    console.log('Base64変換成功:', result.size, 'bytes');
                    
                    // キャッシュ保存
                    if (config.cacheEnabled) {
                        config.cache.set(cacheKey, result.data_uri);
                    }
                    
                    return result.data_uri;
                } else {
                    throw new Error(result.error || 'Base64変換失敗');
                }
                
            } catch (error) {
                console.warn(`Base64変換エラー ${attempt}/${config.retryAttempts}:`, error.message);
                
                if (attempt === config.retryAttempts) {
                    console.error('Base64変換最終失敗:', imageUrl);
                    return config.fallbackImageUrl;
                }
                
                // リトライ前の待機
                await new Promise(resolve => setTimeout(resolve, config.retryDelay));
            }
        }
        
        return config.fallbackImageUrl;
    }
    
    // 改善版カード生成（N3準拠・画像中心デザイン）
    function generateImprovedCard(item, index) {
        const imageUrl = item.picture_urls && item.picture_urls.length > 0 ? 
            item.picture_urls[0] : null;
        const statusClass = item.listing_status ? item.listing_status.toLowerCase() : 'unknown';
        const imageCount = item.picture_urls ? item.picture_urls.length : 0;
        
        return `
            <div class="ebay-product-card" onclick="showProductDetail(${index})" data-image-url="${imageUrl || ''}">
                <div class="card-image-container">
                    <div class="card-loading" id="loading-${index}" style="display: block;">
                        <div class="spinner"></div>
                    </div>
                    <img class="card-product-image" 
                         id="image-${index}"
                         style="display: none;"
                         onerror="handleImageError(${index})"
                         onload="handleImageLoad(${index})">
                    <div class="card-image-placeholder" id="placeholder-${index}" style="display: none;">
                        <i class="fas fa-image"></i>
                    </div>
                    ${imageCount > 1 ? 
                        `<div class="card-image-count">${imageCount}枚</div>` : ''
                    }
                </div>
                
                <div class="card-text-overlay">
                    <h3 class="card-title">${item.title || 'タイトルなし'}</h3>
                    <div class="card-meta">
                        <span class="card-price">$${parseFloat(item.current_price_value || 0).toFixed(2)}</span>
                        <span class="card-status ${statusClass}">${item.listing_status || 'Unknown'}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // 画像読み込み成功ハンドラ
    window.handleImageLoad = function(index) {
        const loading = document.getElementById(`loading-${index}`);
        const image = document.getElementById(`image-${index}`);
        const placeholder = document.getElementById(`placeholder-${index}`);
        
        if (loading) loading.style.display = 'none';
        if (image) image.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
        
        console.log(`画像読み込み成功: index ${index}`);
    };
    
    // 画像エラーハンドラ
    window.handleImageError = function(index) {
        const loading = document.getElementById(`loading-${index}`);
        const image = document.getElementById(`image-${index}`);
        const placeholder = document.getElementById(`placeholder-${index}`);
        
        if (loading) loading.style.display = 'none';
        if (image) image.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        
        console.warn(`画像読み込み失敗: index ${index}`);
    };
    
    // 商品カード表示システム（N3準拠・非同期画像読み込み）
    async function displayProductCards(products, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('コンテナが見つかりません:', containerId);
            return;
        }
        
        console.log('商品カード表示開始:', products.length, '件');
        
        // カードHTML生成
        const cardsHtml = products.map(generateImprovedCard).join('');
        container.innerHTML = cardsHtml;
        
        // 非同期で画像を読み込み
        const imageLoadPromises = products.map(async (product, index) => {
            const imageUrl = product.picture_urls && product.picture_urls.length > 0 ? 
                product.picture_urls[0] : null;
                
            if (!imageUrl) {
                handleImageError(index);
                return;
            }
            
            try {
                const base64Image = await getBase64Image(imageUrl);
                const imageElement = document.getElementById(`image-${index}`);
                
                if (imageElement && base64Image) {
                    imageElement.src = base64Image;
                    // onloadイベントで自動的にhandleImageLoad が呼ばれる
                }
            } catch (error) {
                console.error(`画像読み込みエラー index ${index}:`, error);
                handleImageError(index);
            }
        });
        
        // 全画像読み込み待機（最大10秒）
        try {
            await Promise.allSettled(imageLoadPromises);
            console.log('全画像読み込み処理完了');
        } catch (error) {
            console.error('画像読み込み処理エラー:', error);
        }
    }
    
    // 公開API
    return {
        config,
        getBase64Image,
        generateImprovedCard,
        displayProductCards,
        version: config.version
    };
    
})();

// グローバル関数エクスポート（後方互換性）
window.displayEbayProducts = function(products, containerId = 'cards-container') {
    return window.EbayImageDisplaySystem.displayProductCards(products, containerId);
};

window.showProductDetail = function(index) {
    console.log('商品詳細表示:', index);
    alert(`商品詳細表示 (index: ${index})`);
};

console.log('✅ eBay画像表示システム（N3準拠版）初期化完了');
console.log('Version:', window.EbayImageDisplaySystem.version);
