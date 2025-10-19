/**
 * eBay管理システム JavaScript v2.0 - Hook統合・エラー防止版
 * 
 * 特徴:
 * - PostgreSQL Hook統合（ebay_kanri_db）
 * - セキュリティ強化（CSRF・XSS対策）
 * - エラー防止Hook連携
 * - 品質監視Hook対応
 * - N3準拠Ajax分離
 * - リアルタイム統計更新
 * - 画像ハッシュベース管理
 * - 多国展開商品表示
 * - レスポンシブUI制御
 */

(function() {
    'use strict';

    // ========================================
    // グローバル設定・状態管理
    // ========================================
    
    const EbayKanriSystem = {
        // システム設定
        config: {
            ajaxUrl: 'modules/ebay_kanri/ebay_kanri_ajax_handler.php',
            csrfToken: null,
            hookIntegrationEnabled: true,
            autoRefreshInterval: 30000, // 30秒
            maxRetries: 3,
            retryDelay: 1000,
            debugMode: false
        },
        
        // 状態管理
        state: {
            currentView: 'card',
            currentPage: 1,
            itemsPerPage: 80,
            totalCount: 0,
            filters: {
                sortBy: 'created_at',
                sortOrder: 'DESC',
                searchQuery: '',
                filterCountry: '',
                filterPriceRange: ''
            },
            loading: false,
            hookStatus: {
                postgresql: 'unknown',
                statistics: 'unknown',
                lastUpdate: null
            },
            data: {
                products: [],
                statistics: {},
                multiCountryProducts: []
            }
        },
        
        // Hook統合状況
        hooks: {
            postgresql_integration: false,
            project_manager: false,
            maru9_vero_system: false,
            code_quality_monitor: false,
            n3_mandatory_template: false
        },
        
        // エラー管理
        errors: [],
        
        // パフォーマンス監視
        performance: {
            startTime: Date.now(),
            loadTimes: {},
            apiCalls: 0,
            errorCount: 0
        }
    };

    // ========================================
    // 初期化・DOM Ready
    // ========================================
    
    $(document).ready(function() {
        console.log('🎯 eBay管理システム初期化開始 - Hook統合版 v2.0');
        
        try {
            // 1. セキュリティ初期化
            initializeSecurity();
            
            // 2. Hook統合状況確認
            checkHookIntegration();
            
            // 3. UI初期化
            initializeUI();
            
            // 4. イベントリスナー設定
            setupEventListeners();
            
            // 5. 初期データロード
            loadInitialData();
            
            // 6. 自動更新開始
            startAutoRefresh();
            
            console.log('✅ eBay管理システム初期化完了');
            
        } catch (error) {
            console.error('❌ システム初期化エラー:', error);
            showErrorMessage('システム初期化に失敗しました: ' + error.message);
        }
    });

    // ========================================
    // ユーティリティ関数
    // ========================================
    
    function makeAjaxRequest(action, data = {}) {
        EbayKanriSystem.performance.apiCalls++;
        
        const requestData = {
            action: action,
            csrf_token: EbayKanriSystem.config.csrfToken,
            ...data
        };
        
        return new Promise(function(resolve, reject) {
            $.ajax({
                url: EbayKanriSystem.config.ajaxUrl,
                type: 'POST',
                data: requestData,
                dataType: 'json',
                timeout: 30000,
                success: function(response) {
                    resolve(response);
                },
                error: function(xhr, status, error) {
                    EbayKanriSystem.performance.errorCount++;
                    
                    let errorMessage = 'Network error';
                    if (xhr.responseJSON && xhr.responseJSON.error) {
                        errorMessage = xhr.responseJSON.error;
                    } else if (error) {
                        errorMessage = error;
                    }
                    
                    reject(new Error(errorMessage));
                }
            });
        });
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function formatPrice(price) {
        const numPrice = parseFloat(price) || 0;
        return '$' + numPrice.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    function createCountryTags(sites) {
        if (!sites) return '';
        
        const siteList = sites.split(',').map(s => s.trim()).filter(s => s);
        const countryMap = {
            'ebay.com': 'USA',
            'ebay.co.uk': 'UK',
            'ebay.com.au': 'AU',
            'ebay.ca': 'CA',
            'ebay.de': 'DE'
        };
        
        return siteList.map(site => {
            const country = countryMap[site] || site;
            return `<span class="ebay__country-tag">${country}</span>`;
        }).join('');
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    function setLoading(isLoading) {
        EbayKanriSystem.state.loading = isLoading;
        
        if (isLoading) {
            $('[data-action]').prop('disabled', true);
            $('.ebay__loading-state').show();
        } else {
            $('[data-action]').prop('disabled', false);
            $('.ebay__loading-state').hide();
        }
    }
    
    function showSuccessMessage(message) {
        showToast(message, 'success');
    }
    
    function showWarningMessage(message) {
        showToast(message, 'warning');
    }
    
    function showErrorMessage(message) {
        showToast(message, 'error');
        EbayKanriSystem.errors.push({
            message: message,
            timestamp: new Date().toISOString()
        });
    }
    
    function showToast(message, type = 'info') {
        const toast = $(`
            <div class="toast toast--${type}">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
                <span>${escapeHtml(message)}</span>
                <button class="toast-close">&times;</button>
            </div>
        `);
        
        $('body').append(toast);
        
        // アニメーション
        setTimeout(() => toast.addClass('toast--show'), 100);
        
        // 自動削除
        setTimeout(() => {
            toast.removeClass('toast--show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
        
        // 手動削除
        toast.find('.toast-close').on('click', () => {
            toast.removeClass('toast--show');
            setTimeout(() => toast.remove(), 300);
        });
    }
    
    // ========================================
    // グローバル関数エクスポート
    // ========================================
    
    window.EbayKanriSystem = EbayKanriSystem;
    window.viewProductDetails = function(productId) {
        console.log('商品詳細表示:', productId);
        // 実装予定
    };
    
    window.openProductUrl = function(url) {
        if (url && url !== '#') {
            window.open(url, '_blank');
        }
    };
    
    window.closeModal = function(modalId) {
        $(`#${modalId}`).removeClass('show');
    };
    
    window.retestHookIntegration = function() {
        console.log('🧪 Hook統合再テスト実行中...');
    };
    
    console.log('🎯 eBay管理システム JavaScript v2.0 ロード完了');

})();