/**
 * eBay画像システム最終修正版 - IntersectionObserver問題解決
 * 根本原因: IntersectionObserverのrootMarginとthresholdが適切に動作していない
 */

window.EbayImageSystemFinal = (function() {
    'use strict';
    
    const config = {
        version: 'Final-Fix-v3.0',
        base64ApiEndpoint: '/image_base64_api.php',
        retryAttempts: 3,
        retryDelay: 1000,
        cache: new Map(),
        debug: true
    };
    
    let currentProducts = [];
    let loadStats = {
        total: 0,
        loaded: 0,
        failed: 0,
        cached: 0
    };
    
    // デバッグログ
    function log(message, type = 'info') {
        if (!config.debug) return;
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] EbayImageFinal: ${message}`);
        
        const debugElement = document.getElementById('debug-output');
        if (debugElement) {
            debugElement.innerHTML += `[${timestamp}] ${message}<br>`;
            debugElement.scrollTop = debugElement.scrollHeight;
        }
    }
    
    /**
     * 🎯 メイン関数：商品カード表示（IntersectionObserver修正版）
     */
    async function displayProductCards(products, containerId) {
        log(`=== 表示開始: ${products.length}件の商品 ===`);
        currentProducts = products;
        
        const container = document.getElementById(containerId);
        if (!container) {
            log('❌ エラー: コンテナが見つかりません', 'error');
            return;
        }
        
        // 統計初期化
        loadStats = { total: products.length, loaded: 0, failed: 0, cached: 0 };
        updateLoadStatus();
        
        // HTML生成・挿入
        const cardsHtml = products.map((product, index) => generateImprovedCard(product, index)).join('');
        container.innerHTML = cardsHtml;
        log('✅ DOM構築完了');
        
        // 🔑 修正: requestAnimationFrame → setTimeout(0) + 即座読み込み
        setTimeout(() => {
            log('🚀 画像読み込み処理開始（修正版）');
            
            // IntersectionObserver使わず、直接読み込み開始
            const imageElements = container.querySelectorAll('.card-product-image');
            log(`画像要素検出: ${imageElements.length}個`);
            
            // 全画像を即座に読み込み開始（IntersectionObserver問題回避）
            imageElements.forEach((imageElement, index) => {
                const product = products[index];
                if (product && product.picture_urls && product.picture_urls.length > 0) {
                    const imageUrl = product.picture_urls[0];
                    log(`画像読み込み開始: index ${index}, URL: ${imageUrl.substring(0, 50)}...`);
                    loadBase64ImageWithRetry(imageElement, imageUrl, config.retryAttempts, index);
                } else {
                    log(`画像URL無し: index ${index}`);
                    handleImageError(index);
                }
            });
            
        }, 100); // 100ms後に実行（DOM確実に構築完了）
    }
    
    /**
     * 🔁 Base64画像読み込み（リトライ付き・修正版）
     */
    async function loadBase64ImageWithRetry(imageElement, imageUrl, retriesLeft, index) {
        try {
            log(`🔄 読み込み試行: index ${index}, リトライ残 ${retriesLeft}`);
            
            // キャッシュ確認
            const cacheKey = `base64_${imageUrl}`;
            if (config.cache.has(cacheKey)) {
                log(`💾 キャッシュヒット: index ${index}`);
                const cachedImage = config.cache.get(cacheKey);
                setImageSrc(imageElement, cachedImage, index);
                loadStats.cached++;
                updateLoadStatus();
                return;
            }
            
            // Base64取得
            const base64Image = await getBase64Image(imageUrl);
            
            if (base64Image && base64Image.startsWith('data:image/')) {
                log(`✅ Base64取得成功: index ${index}, サイズ ${base64Image.length} chars`);
                
                // キャッシュ保存
                config.cache.set(cacheKey, base64Image);
                
                // 画像設定
                setImageSrc(imageElement, base64Image, index);
                
                loadStats.loaded++;
                updateLoadStatus();
            } else {
                throw new Error('Base64データが無効');
            }
            
        } catch (error) {
            log(`❌ 読み込みエラー: index ${index}, ${error.message}`, 'error');
            
            if (retriesLeft > 0) {
                log(`🔄 リトライ実行: index ${index}, 残り ${retriesLeft - 1}回`);
                setTimeout(() => {
                    loadBase64ImageWithRetry(imageElement, imageUrl, retriesLeft - 1, index);
                }, config.retryDelay);
            } else {
                log(`💥 リトライ限界: index ${index}`, 'error');
                handleImageError(index);
                loadStats.failed++;
                updateLoadStatus();
            }
        }
    }
    
    /**
     * 🖼️ 画像src設定（確実版）
     */
    function setImageSrc(imageElement, base64Image, index) {
        log(`🎨 画像src設定開始: index ${index}`);
        
        // イベントハンドラー設定
        imageElement.onload = function() {
            log(`🎉 画像表示成功: index ${index}`);
            handleImageLoad(index);
        };
        
        imageElement.onerror = function() {
            log(`💥 画像表示エラー: index ${index}`, 'error');
            handleImageError(index);
        };
        
        // src設定
        imageElement.src = base64Image;
        log(`✅ src設定完了: index ${index}, データ長 ${base64Image.length}`);
    }
    
    /**
     * 📡 Base64 API呼び出し
     */
    async function getBase64Image(imageUrl) {
        const apiUrl = `${config.base64ApiEndpoint}?url=${encodeURIComponent(imageUrl)}`;
        log(`📡 API呼び出し: ${apiUrl.substring(0, 80)}...`);
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (result.success && result.data_uri) {
            log(`✅ API成功: サイズ ${result.size} bytes, MIMEタイプ ${result.mime_type}`);
            return result.data_uri;
        } else {
            throw new Error(result.error || 'API処理失敗');
        }
    }
    
    /**
     * 🎨 改善版カード生成
     */
    function generateImprovedCard(product, index) {
        const statusClass = product.listing_status ? product.listing_status.toLowerCase() : 'unknown';
        const imageCount = product.picture_urls ? product.picture_urls.length : 0;
        const price = parseFloat(product.current_price_value || 0).toFixed(2);
        
        return `
            <div class="ebay-product-card" onclick="showProductDetail(${index})">
                <div class="card-image-container">
                    <div class="card-loading" id="loading-${index}" style="display: block;">
                        <div class="spinner"></div>
                    </div>
                    <img class="card-product-image" 
                         id="image-${index}"
                         data-index="${index}"
                         style="display: none;"
                         alt="${product.title || '商品画像'}">
                    <div class="card-image-placeholder" id="placeholder-${index}" style="display: none;">
                        <i class="fas fa-image"></i>
                    </div>
                    ${imageCount > 1 ? 
                        `<div class="card-image-count">${imageCount}枚</div>` : ''
                    }
                </div>
                
                <div class="card-text-overlay">
                    <h3 class="card-title">${product.title || 'タイトルなし'}</h3>
                    <div class="card-meta">
                        <span class="card-price">$${price}</span>
                        <span class="card-status ${statusClass}">${product.listing_status || 'Unknown'}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * ✅ 画像読み込み成功ハンドラー
     */
    function handleImageLoad(index) {
        log(`🎊 画像表示完了処理: index ${index}`);
        
        const loading = document.getElementById(`loading-${index}`);
        const image = document.getElementById(`image-${index}`);
        const placeholder = document.getElementById(`placeholder-${index}`);
        
        if (loading) loading.style.display = 'none';
        if (image) image.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    }
    
    /**
     * ❌ 画像エラーハンドラー
     */
    function handleImageError(index) {
        log(`💔 画像エラー処理: index ${index}`);
        
        const loading = document.getElementById(`loading-${index}`);
        const image = document.getElementById(`image-${index}`);
        const placeholder = document.getElementById(`placeholder-${index}`);
        
        if (loading) loading.style.display = 'none';
        if (image) image.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
    }
    
    /**
     * 📊 読み込み状況更新
     */
    function updateLoadStatus() {
        const imageStatus = document.getElementById('image-status');
        if (imageStatus) {
            const progress = Math.round((loadStats.loaded + loadStats.failed) / loadStats.total * 100);
            imageStatus.innerHTML = `<strong>画像読み込み</strong><br>${loadStats.loaded}/${loadStats.total} (${progress}%)`;
            
            if (loadStats.loaded + loadStats.failed >= loadStats.total) {
                imageStatus.style.background = '#dcfce7';
                imageStatus.style.color = '#166534';
                imageStatus.innerHTML = `<strong>読み込み完了</strong><br>成功${loadStats.loaded}件, 失敗${loadStats.failed}件`;
            }
        }
    }
    
    // グローバル関数エクスポート
    window.handleImageLoad = handleImageLoad;
    window.handleImageError = handleImageError;
    
    // 公開API
    return {
        displayProductCards,
        config,
        getStats: () => loadStats,
        clearCache: () => config.cache.clear(),
        version: config.version
    };
    
})();

// 後方互換性
window.displayEbayProducts = function(products, containerId = 'cards-container') {
    return window.EbayImageSystemFinal.displayProductCards(products, containerId);
};

window.showProductDetail = function(index) {
    console.log('商品詳細表示:', index);
    alert(`商品詳細表示 (index: ${index})`);
};

console.log('✅ eBay画像システム最終修正版初期化完了');
console.log(`Version: ${window.EbayImageSystemFinal.version}`);
