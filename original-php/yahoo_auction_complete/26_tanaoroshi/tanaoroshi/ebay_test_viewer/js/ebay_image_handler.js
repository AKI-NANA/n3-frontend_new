/**
 * eBay画像ハンドラー N3統合版
 * 画像表示エラー完全撲滅システム
 * 
 * @version 1.0
 * @features エラーハンドリング・遅延読み込み・フォールバック完備
 */

class EbayImageHandler {
    
    /**
     * 画像URL処理（エラー解決版）
     * 優先順位: gallery_url → picture_urls[0] → placeholder
     * 
     * @param {Object} item - 商品データ
     * @returns {string} 処理済み画像URL
     */
    static processImageUrl(item) {
        if (!item) {
            return this.getPlaceholderUrl();
        }
        
        // 1. gallery_url (TEXT) を優先使用
        if (item.gallery_url && this.isValidUrl(item.gallery_url)) {
            return this.sanitizeUrl(item.gallery_url);
        }
        
        // 2. picture_urls (ARRAY) の1番目使用
        if (item.picture_urls) {
            const pictureUrls = this.parsePictureUrls(item.picture_urls);
            if (pictureUrls.length > 0 && this.isValidUrl(pictureUrls[0])) {
                return this.sanitizeUrl(pictureUrls[0]);
            }
        }
        
        // 3. processed_image_url（API処理済み）使用
        if (item.processed_image_url && this.isValidUrl(item.processed_image_url)) {
            return this.sanitizeUrl(item.processed_image_url);
        }
        
        // 4. フォールバック: プレースホルダー画像
        return this.getPlaceholderUrl();
    }
    
    /**
     * picture_urls配列パース
     * 
     * @param {string|Array} pictureUrlsData - picture_urlsデータ
     * @returns {Array} URL配列
     */
    static parsePictureUrls(pictureUrlsData) {
        if (!pictureUrlsData) {
            return [];
        }
        
        // 配列の場合
        if (Array.isArray(pictureUrlsData)) {
            return pictureUrlsData.filter(url => url && typeof url === 'string');
        }
        
        // 文字列の場合
        if (typeof pictureUrlsData === 'string') {
            try {
                // JSON文字列を試行
                const parsed = JSON.parse(pictureUrlsData);
                if (Array.isArray(parsed)) {
                    return parsed.filter(url => url && typeof url === 'string');
                }
            } catch (e) {
                // JSON解析失敗の場合、カンマ区切りとして処理
                return pictureUrlsData.split(',')
                    .map(url => url.trim())
                    .filter(url => url.length > 0);
            }
        }
        
        return [];
    }
    
    /**
     * 画像要素作成（エラーハンドリング完備）
     * 
     * @param {Object} item - 商品データ
     * @param {string} size - サイズ（例: '60x60', '200x150'）
     * @param {Object} options - 追加オプション
     * @returns {string} HTML画像要素
     */
    static createImageElement(item, size = '60x60', options = {}) {
        const imageUrl = this.processImageUrl(item);
        const [width, height] = size.split('x').map(s => parseInt(s));
        
        const alt = options.alt || this.generateAltText(item);
        const className = options.className || 'ebay-image';
        const loading = options.loading || 'lazy';
        
        return `
            <img src="${this.escapeHtml(imageUrl)}" 
                 alt="${this.escapeHtml(alt)}"
                 class="${className}"
                 width="${width}"
                 height="${height}"
                 style="object-fit: cover; border-radius: 4px;"
                 loading="${loading}"
                 onerror="EbayImageHandler.handleImageError(this, '${size}')"
                 onload="EbayImageHandler.handleImageLoad(this)">
        `;
    }
    
    /**
     * 画像エラーハンドリング
     * 
     * @param {HTMLImageElement} imgElement - 画像要素
     * @param {string} size - サイズ
     */
    static handleImageError(imgElement, size) {
        if (!imgElement.dataset.errorHandled) {
            console.warn('画像読み込みエラー:', imgElement.src);
            
            // フォールバック画像設定
            imgElement.src = this.getPlaceholderUrl(size);
            imgElement.style.opacity = '0.6';
            imgElement.dataset.errorHandled = 'true';
            
            // エラー状況をログに記録
            this.logImageError(imgElement.src, size);
        }
    }
    
    /**
     * 画像読み込み完了ハンドリング
     * 
     * @param {HTMLImageElement} imgElement - 画像要素
     */
    static handleImageLoad(imgElement) {
        imgElement.style.opacity = '1';
        imgElement.dataset.loaded = 'true';
        
        // 読み込み完了をログに記録（開発時のみ）
        if (window.DEBUG_MODE) {
            console.log('画像読み込み完了:', imgElement.src);
        }
    }
    
    /**
     * 画像ギャラリー作成
     * 
     * @param {Object} item - 商品データ
     * @param {Object} options - オプション
     * @returns {string} ギャラリーHTML
     */
    static createImageGallery(item, options = {}) {
        const allImages = this.getAllItemImages(item);
        const maxImages = options.maxImages || 10;
        const thumbnailSize = options.thumbnailSize || '80x80';
        const mainImageSize = options.mainImageSize || '400x300';
        
        if (allImages.length === 0) {
            return `<div class="no-images">
                ${this.createImageElement(item, mainImageSize, {className: 'main-image'})}
            </div>`;
        }
        
        let galleryHtml = `<div class="image-gallery">`;
        
        // メイン画像
        galleryHtml += `<div class="main-image-container">
            ${this.createImageElement({processed_image_url: allImages[0]}, mainImageSize, {className: 'main-image'})}
        </div>`;
        
        // サムネイル一覧
        if (allImages.length > 1) {
            galleryHtml += `<div class="thumbnail-container">`;
            
            allImages.slice(0, maxImages).forEach((imageUrl, index) => {
                const isActive = index === 0 ? 'active' : '';
                galleryHtml += `
                    <div class="thumbnail ${isActive}" onclick="EbayImageHandler.switchMainImage('${this.escapeHtml(imageUrl)}')">
                        ${this.createImageElement({processed_image_url: imageUrl}, thumbnailSize, {className: 'thumbnail-image'})}
                    </div>
                `;
            });
            
            galleryHtml += `</div>`;
        }
        
        galleryHtml += `</div>`;
        return galleryHtml;
    }
    
    /**
     * メイン画像切り替え
     * 
     * @param {string} imageUrl - 新しい画像URL
     */
    static switchMainImage(imageUrl) {
        const mainImage = document.querySelector('.main-image');
        if (mainImage) {
            mainImage.src = imageUrl;
            
            // アクティブサムネイル更新
            document.querySelectorAll('.thumbnail').forEach(thumb => {
                thumb.classList.remove('active');
            });
            
            const clickedThumbnail = event.target.closest('.thumbnail');
            if (clickedThumbnail) {
                clickedThumbnail.classList.add('active');
            }
        }
    }
    
    /**
     * 全画像URL取得
     * 
     * @param {Object} item - 商品データ
     * @returns {Array} 画像URL配列
     */
    static getAllItemImages(item) {
        const images = new Set(); // 重複除去用
        
        // gallery_url追加
        if (item.gallery_url && this.isValidUrl(item.gallery_url)) {
            images.add(this.sanitizeUrl(item.gallery_url));
        }
        
        // picture_urls追加
        if (item.picture_urls) {
            const pictureUrls = this.parsePictureUrls(item.picture_urls);
            pictureUrls.forEach(url => {
                if (this.isValidUrl(url)) {
                    images.add(this.sanitizeUrl(url));
                }
            });
        }
        
        // API処理済み画像追加
        if (item.all_images && Array.isArray(item.all_images)) {
            item.all_images.forEach(url => {
                if (this.isValidUrl(url)) {
                    images.add(this.sanitizeUrl(url));
                }
            });
        }
        
        return Array.from(images);
    }
    
    /**
     * URL有効性確認
     * 
     * @param {string} url - 確認するURL
     * @returns {boolean} 有効性
     */
    static isValidUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        
        const trimmedUrl = url.trim();
        
        // 基本的なURL形式確認
        const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
        return urlPattern.test(trimmedUrl);
    }
    
    /**
     * URL サニタイゼーション
     * 
     * @param {string} url - サニタイズするURL
     * @returns {string} サニタイズ済みURL
     */
    static sanitizeUrl(url) {
        return url.trim().replace(/[<>"']/g, '');
    }
    
    /**
     * プレースホルダーURL取得
     * 
     * @param {string} size - サイズ（例: '60x60'）
     * @returns {string} プレースホルダーURL
     */
    static getPlaceholderUrl(size = '60x60') {
        return `https://via.placeholder.com/${size}/e2e8f0/64748b?text=No+Image`;
    }
    
    /**
     * alt属性テキスト生成
     * 
     * @param {Object} item - 商品データ
     * @returns {string} alt属性テキスト
     */
    static generateAltText(item) {
        if (item.title) {
            return item.title.substring(0, 100) + (item.title.length > 100 ? '...' : '');
        }
        return 'eBay商品画像';
    }
    
    /**
     * HTML エスケープ
     * 
     * @param {string} text - エスケープするテキスト
     * @returns {string} エスケープ済みテキスト
     */
    static escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 画像エラーログ記録
     * 
     * @param {string} imageUrl - エラーが発生した画像URL
     * @param {string} size - サイズ
     */
    static logImageError(imageUrl, size) {
        // エラー統計収集（開発環境）
        if (window.IMAGE_ERROR_STATS) {
            window.IMAGE_ERROR_STATS.push({
                url: imageUrl,
                size: size,
                timestamp: new Date().toISOString()
            });
        }
        
        // コンソールログ（開発時のみ）
        if (window.DEBUG_MODE) {
            console.error('Image load failed:', {
                url: imageUrl,
                size: size,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * 画像遅延読み込み初期化
     */
    static initializeLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.classList.remove('lazy');
                            observer.unobserve(img);
                        }
                    }
                });
            });
            
            document.querySelectorAll('img.lazy').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }
    
    /**
     * 画像プリロード
     * 
     * @param {Array} imageUrls - プリロードする画像URL配列
     * @returns {Promise} プリロード完了Promise
     */
    static preloadImages(imageUrls) {
        const promises = imageUrls.map(url => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
                img.src = url;
            });
        });
        
        return Promise.allSettled(promises);
    }
    
    /**
     * 画像統計取得
     * 
     * @returns {Object} 画像統計情報
     */
    static getImageStatistics() {
        const images = document.querySelectorAll('img.ebay-image');
        let loadedCount = 0;
        let errorCount = 0;
        
        images.forEach(img => {
            if (img.dataset.loaded === 'true') {
                loadedCount++;
            } else if (img.dataset.errorHandled === 'true') {
                errorCount++;
            }
        });
        
        return {
            total: images.length,
            loaded: loadedCount,
            errors: errorCount,
            loading: images.length - loadedCount - errorCount,
            errorRate: images.length > 0 ? (errorCount / images.length * 100).toFixed(1) + '%' : '0%'
        };
    }
}

// 初期化処理
document.addEventListener('DOMContentLoaded', function() {
    // 遅延読み込み初期化
    EbayImageHandler.initializeLazyLoading();
    
    // 画像エラー統計初期化（開発環境）
    if (window.DEBUG_MODE) {
        window.IMAGE_ERROR_STATS = [];
        
        // 統計定期出力（5分間隔）
        setInterval(() => {
            const stats = EbayImageHandler.getImageStatistics();
            console.log('画像統計:', stats);
        }, 300000);
    }
    
    console.log('✅ eBay画像ハンドラー初期化完了（エラー撲滅版）');
});

// グローバル公開
window.EbayImageHandler = EbayImageHandler;