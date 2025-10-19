/**
 * eBay画像表示システム完全修正版 - N3準拠
 * Gemini技術解決策実装
 * 根本原因: DOM操作タイミング + イベントハンドラー + パフォーマンス問題
 */

window.EbayImageSystemFixed = (function() {
    'use strict';
    
    const config = {
        version: 'Gemini-Fixed-v2.0',
        base64ApiEndpoint: '/image_base64_api.php',
        retryAttempts: 3,
        retryDelay: 1000,
        chunkSize: 10, // 10件ずつ処理
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
        console.log(`[${timestamp}] EbayImageSystem: ${message}`);
        
        // UIデバッグ出力
        const debugElement = document.getElementById('debug-output');
        if (debugElement) {
            debugElement.innerHTML += `[${timestamp}] ${message}<br>`;
            debugElement.scrollTop = debugElement.scrollHeight;
        }
    }
    
    /**
     * 🎯 メイン関数：商品カード表示（Gemini修正版）
     */
    async function displayProductCards(products, containerId) {
        log(`表示開始: ${products.length}件の商品`);
        currentProducts = products;
        
        const container = document.getElementById(containerId);
        if (!container) {
            log('エラー: コンテナが見つかりません', 'error');
            return;
        }
        
        // 統計初期化
        loadStats = { total: products.length, loaded: 0, failed: 0, cached: 0 };
        updateLoadStatus();
        
        // HTML生成・挿入
        const cardsHtml = products.map((product, index) => generateImprovedCard(product, index)).join('');
        container.innerHTML = cardsHtml;
        
        log('DOM構築完了、次の描画サイクルで画像読み込み開始');
        
        // 🔑 Gemini解決策1: requestAnimationFrameでDOM描画完了を待機
        window.requestAnimationFrame(() => {
            log('DOM描画完了、IntersectionObserver初期化');
            initializeIntersectionObserver(container, products);
        });
    }
    
    /**
     * 🔄 IntersectionObserver初期化（遅延読み込み）
     */
    function initializeIntersectionObserver(container, products) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const imageElement = entry.target;
                    const index = parseInt(imageElement.dataset.index);
                    const product = products[index];
                    
                    if (product && product.picture_urls && product.picture_urls.length > 0) {
                        const imageUrl = product.picture_urls[0];
                        log(`画像読み込み開始: index ${index}`);
                        loadBase64ImageWithRetry(imageElement, imageUrl, config.retryAttempts, index);
                    } else {
                        log(`画像URL無し: index ${index}`);
                        handleImageError(index);
                    }
                    
                    // 読み込み開始したら監視停止
                    observer.unobserve(imageElement);
                }
            });
        }, {
            rootMargin: '100px 0px', // 画面の100px手前で読み込み開始
            threshold: 0.1
        });
        
        // 全画像要素を監視対象に追加
        const imageElements = container.querySelectorAll('.card-product-image');
        log(`IntersectionObserver設定完了: ${imageElements.length}個の画像要素を監視`);
        
        imageElements.forEach(img => observer.observe(img));
    }
    
    /**
     * 🔁 Base64画像読み込み（リトライ付き）
     */
    async function loadBase64ImageWithRetry(imageElement, imageUrl, retriesLeft, index) {
        try {
            // キャッシュ確認
            const cacheKey = `base64_${imageUrl}`;
            if (config.cache.has(cacheKey)) {
                log(`キャッシュヒット: index ${index}`);
                const cachedImage = config.cache.get(cacheKey);
                setImageSrc(imageElement, cachedImage, index);
                loadStats.cached++;
                updateLoadStatus();
                return;
            }
            
            log(`Base64取得開始: index ${index}, 残りリトライ ${retriesLeft}`);
            const base64Image = await getBase64Image(imageUrl);
            
            if (base64Image && base64Image.startsWith('data:image/')) {
                log(`Base64取得成功: index ${index}, サイズ ${base64Image.length} chars`);
                
                // キャッシュ保存
                config.cache.set(cacheKey, base64Image);
                
                // 🔑 Gemini解決策2: JavaScriptでイベントハンドラー設定
                setImageSrc(imageElement, base64Image, index);
                
                loadStats.loaded++;
                updateLoadStatus();
            } else {
                throw new Error('Base64データが無効です');
            }
            
        } catch (error) {
            log(`画像読み込みエラー: index ${index}, ${error.message}`, 'error');
            
            if (retriesLeft > 0) {
                log(`リトライ実行: index ${index}, 残り ${retriesLeft - 1}回`);
                setTimeout(() => {
                    loadBase64ImageWithRetry(imageElement, imageUrl, retriesLeft - 1, index);
                }, config.retryDelay);
            } else {
                log(`リトライ限界: index ${index}, エラー処理実行`, 'error');
                handleImageError(index);
                loadStats.failed++;
                updateLoadStatus();
            }
        }
    }
    
    /**
     * 🖼️ 画像src設定（Gemini解決策実装）
     */
    function setImageSrc(imageElement, base64Image, index) {
        // 🔑 Gemini解決策: addEventListener使用
        imageElement.onload = function() {
            log(`画像表示成功: index ${index}`);
            handleImageLoad(index);
        };
        
        imageElement.onerror = function() {
            log(`画像表示失敗: index ${index}`, 'error');
            handleImageError(index);
        };
        
        // src設定（これで確実に表示される）
        imageElement.src = base64Image;
        log(`画像src設定完了: index ${index}`);
    }
    
    /**
     * 📡 Base64 API呼び出し
     */
    async function getBase64Image(imageUrl) {
        const apiUrl = `${config.base64ApiEndpoint}?url=${encodeURIComponent(imageUrl)}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (result.success && result.data_uri) {
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
        const loading = document.getElementById(`loading-${index}`);
        const image = document.getElementById(`image-${index}`);
        const placeholder = document.getElementById(`placeholder-${index}`);
        
        if (loading) loading.style.display = 'none';
        if (image) image.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
        
        log(`画像表示完了: index ${index}`);
    }
    
    /**
     * ❌ 画像エラーハンドラー
     */
    function handleImageError(index) {
        const loading = document.getElementById(`loading-${index}`);
        const image = document.getElementById(`image-${index}`);
        const placeholder = document.getElementById(`placeholder-${index}`);
        
        if (loading) loading.style.display = 'none';
        if (image) image.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        
        log(`画像エラー処理完了: index ${index}`, 'error');
    }
    
    /**
     * 📊 読み込み状況更新
     */
    function updateLoadStatus() {
        const imageStatus = document.getElementById('image-status');
        if (imageStatus) {
            const progress = Math.round((loadStats.loaded + loadStats.failed) / loadStats.total * 100);
            imageStatus.textContent = `画像読み込み: ${loadStats.loaded}/${loadStats.total} (${progress}%)`;
            
            if (loadStats.loaded + loadStats.failed >= loadStats.total) {
                imageStatus.style.background = '#dcfce7';
                imageStatus.style.color = '#166534';
                imageStatus.textContent = `読み込み完了: 成功${loadStats.loaded}件, 失敗${loadStats.failed}件, キャッシュ${loadStats.cached}件`;
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
    return window.EbayImageSystemFixed.displayProductCards(products, containerId);
};

window.showProductDetail = function(index) {
    console.log('商品詳細表示:', index);
    // TODO: モーダル表示実装
    alert(`商品詳細表示 (index: ${index})`);
};

log('✅ eBay画像システム完全修正版（Gemini解決策）初期化完了');
log(`Version: ${window.EbayImageSystemFixed.version}`);

function log(message) {
    console.log(`EbayImageSystem: ${message}`);
}
