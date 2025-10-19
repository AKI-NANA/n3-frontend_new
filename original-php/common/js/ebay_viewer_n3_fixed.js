/**
 * eBayテストビューアー - N3制約準拠JavaScript
 * 無限ループ修正・画像表示専用
 */

(function() {
    'use strict';
    
    // 初期化フラグ（重複実行防止）
    if (window.EbayViewerN3 && window.EbayViewerN3.initialized) {
        console.log('⚠️ eBayViewerN3 already initialized');
        return;
    }
    
    // メインクラス
    window.EbayViewerN3 = {
        initialized: false,
        data: null,
        config: window.EBAY_VIEWER_CONFIG || {},
        
        init: function() {
            if (this.initialized) return;
            
            console.log('🚀 eBayViewerN3 初期化開始');
            
            // DOM準備確認
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.init());
                return;
            }
            
            this.initialized = true;
            this.setupEventListeners();
            this.loadEbayData();
        },
        
        setupEventListeners: function() {
            // 画像エラー処理（グローバル）
            document.addEventListener('error', this.handleImageError.bind(this), true);
            
            console.log('✅ イベントリスナー設定完了');
        },
        
        loadEbayData: function() {
            console.log('📡 eBayデータ取得開始');
            
            const loadingEl = document.getElementById('ebay-loading');
            const contentEl = document.getElementById('ebay-content');
            const errorEl = document.getElementById('ebay-error');
            
            if (!loadingEl || !contentEl || !errorEl) {
                console.error('❌ 必要なDOM要素が見つかりません');
                return;
            }
            
            // ローディング表示
            loadingEl.style.display = 'block';
            contentEl.style.display = 'none';
            errorEl.style.display = 'none';
            
            // データ取得
            fetch(this.config.apiEndpoint, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('✅ データ取得成功:', data);
                this.data = data;
                this.renderData(data);
            })
            .catch(error => {
                console.error('❌ データ取得エラー:', error);
                this.showError('データの取得に失敗しました: ' + error.message);
            })
            .finally(() => {
                loadingEl.style.display = 'none';
            });
        },
        
        renderData: function(data) {
            console.log('🎨 データ描画開始');
            
            const contentEl = document.getElementById('ebay-content');
            if (!contentEl) return;
            
            if (!data.success) {
                this.showError(data.error || 'データの取得に失敗しました');
                return;
            }
            
            // 統計情報描画
            this.renderStats(data.data.database_stats);
            
            // 画像ギャラリー描画
            this.renderImageGallery(data.data.sample_data);
            
            // コンテンツ表示
            contentEl.style.display = 'block';
            
            console.log('✅ データ描画完了');
        },
        
        renderStats: function(stats) {
            const statsEl = document.getElementById('ebay-stats');
            if (!statsEl || !stats) return;
            
            const statsHtml = `
                <div class="ebay-stat-card">
                    <div class="ebay-stat-value">${stats.total_items || 0}</div>
                    <div class="ebay-stat-label">総商品数</div>
                </div>
                <div class="ebay-stat-card">
                    <div class="ebay-stat-value">${stats.items_with_images || 0}</div>
                    <div class="ebay-stat-label">画像付き商品</div>
                </div>
                <div class="ebay-stat-card">
                    <div class="ebay-stat-value">${stats.avg_completeness || 0}%</div>
                    <div class="ebay-stat-label">データ完全性</div>
                </div>
            `;
            
            statsEl.innerHTML = statsHtml;
        },
        
        renderImageGallery: function(items) {
            const galleryEl = document.getElementById('ebay-image-gallery');
            if (!galleryEl || !items) return;
            
            if (items.length === 0) {
                galleryEl.innerHTML = '<p>表示する画像データがありません。</p>';
                return;
            }
            
            const galleryHtml = items.map(item => this.createImageCard(item)).join('');
            galleryEl.innerHTML = galleryHtml;
            
            console.log(`✅ ${items.length}件の画像カード生成完了`);
        },
        
        createImageCard: function(item) {
            const hasImage = item.primary_image_url && item.primary_image_url !== 'null';
            
            const imageContent = hasImage 
                ? `<img src="${this.escapeHtml(item.primary_image_url)}" 
                        alt="商品画像" 
                        loading="lazy"
                        onload="this.style.opacity='1'"
                        style="opacity:0; transition: opacity 0.3s ease;">`
                : `<div class="ebay-no-image">
                     <i class="fas fa-image"></i>
                     <span>画像なし</span>
                   </div>`;
            
            return `
                <div class="ebay-image-card">
                    <div class="ebay-image-container">
                        ${imageContent}
                    </div>
                    <div class="ebay-image-info">
                        <div class="ebay-item-title">
                            ${this.escapeHtml(item.title || 'タイトルなし')}
                        </div>
                        <div class="ebay-item-id">
                            ID: ${this.escapeHtml(item.ebay_item_id || 'N/A')}
                        </div>
                        ${item.current_price_value ? 
                            `<div class="ebay-item-price">$${parseFloat(item.current_price_value).toFixed(2)}</div>` : 
                            ''
                        }
                    </div>
                </div>
            `;
        },
        
        handleImageError: function(event) {
            const img = event.target;
            if (img.tagName === 'IMG' && img.closest('.ebay-image-container')) {
                console.log('🖼️ 画像読み込みエラー:', img.src);
                
                // フォールバック表示
                const container = img.closest('.ebay-image-container');
                container.innerHTML = `
                    <div class="ebay-no-image">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>画像読み込みエラー</span>
                    </div>
                `;
            }
        },
        
        showError: function(message) {
            const errorEl = document.getElementById('ebay-error');
            const contentEl = document.getElementById('ebay-content');
            
            if (errorEl) {
                errorEl.innerHTML = `
                    <h3>エラーが発生しました</h3>
                    <p>${this.escapeHtml(message)}</p>
                    <button onclick="window.EbayViewerN3.loadEbayData()" 
                            style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        再試行
                    </button>
                `;
                errorEl.style.display = 'block';
            }
            
            if (contentEl) {
                contentEl.style.display = 'none';
            }
        },
        
        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };
    
    // 自動初期化
    window.EbayViewerN3.init();
    
    console.log('✅ eBayViewerN3 スクリプト読み込み完了');
    
})();
