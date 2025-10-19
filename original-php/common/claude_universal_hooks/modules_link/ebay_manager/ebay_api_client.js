/**
 * eBay API統合 Ajax Handler
 * N3システム統合版 - 構文エラー修正済み
 */

// N3統合eBay APIクライアント
class N3EbayAPIClient {
    constructor() {
        this.isInitialized = false;
        this.apiEndpoint = window.location.pathname + window.location.search;
        // CSRFトークンの取得を遅延させる
        this.csrfToken = null;
    }

    // 初期化
    initialize() {
        return new Promise((resolve, reject) => {
            // CSRFトークンを動的に取得
            this.csrfToken = this.getCSRFToken();
            
            if (!this.csrfToken) {
                reject(new Error('CSRF Token not found after dynamic lookup'));
                return;
            }
            this.isInitialized = true;
            console.log('✅ N3 eBay API Client initialized with token:', this.csrfToken.substring(0, 10) + '...');
            resolve();
        });
    }
    
    // CSRFトークン取得
    getCSRFToken() {
        // 複数のソースから取得を試行
        let token = null;
        
        // 1. window.CSRF_TOKEN
        if (window.CSRF_TOKEN) {
            token = window.CSRF_TOKEN;
        }
        // 2. window.NAGANO3_CONFIG.csrfToken 
        else if (window.NAGANO3_CONFIG?.csrfToken) {
            token = window.NAGANO3_CONFIG.csrfToken;
        }
        // 3. metaタグから取得
        else {
            const metaTag = document.querySelector('meta[name="csrf-token"]');
            if (metaTag) {
                token = metaTag.getAttribute('content');
            }
        }
        
        return token;
    }

    // eBayデータ取得（非同期）
    async fetchInventoryData(options = {}) {
    if (!this.isInitialized) {
    await this.initialize();
    }
    
    const params = {
    limit: options.limit || 50,
    enable_diff: options.enable_diff !== false
    };
    
            try {
        console.log('🚀 eBay API データ取得開始:', params);
    
                const result = await window.executeAjax('fetch_ebay_data', params);
    
                console.log('✅ eBay API データ取得完了:', result);
    return result;
    
            } catch (error) {
        console.error('❌ eBay API データ取得エラー:', error);
    throw error;
    }
    }

    // デモデータ取得
    async fetchDemoData() {
        try {
            const result = await this.fetchInventoryData({
                limit: 10,
                with_images: true
            });

            return {
                success: true,
                data: result.data || [],
                source: result.source || 'demo',
                fallback_mode: result.fallback_mode || false
            };

        } catch (error) {
            // フォールバック時も成功として返す
            return {
                success: true,
                data: this.getLocalFallbackData(),
                source: 'local_fallback',
                fallback_mode: true,
                error: error.message
            };
        }
    }

    // ローカルフォールバックデータ
    getLocalFallbackData() {
        return [
            {
                item_id: 'DEMO_' + Date.now() + '_001',
                title: 'iPhone 15 Pro Max 256GB - Natural Titanium',
                price_usd: 1199.99,
                quantity: 1,
                condition: 'new',
                category_name: 'Cell Phones & Smartphones',
                listing_status: 'active',
                images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&h=200&fit=crop'],
                watchers_count: 15,
                view_count: 247,
                store_name: 'N3 Demo Store',
                location: 'Japan'
            },
            {
                item_id: 'DEMO_' + Date.now() + '_002',
                title: 'MacBook Pro M3 16-inch Space Black',
                price_usd: 2899.00,
                quantity: 2,
                condition: 'new',
                category_name: 'Laptops & Netbooks',
                listing_status: 'active',
                images: ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=300&h=200&fit=crop'],
                watchers_count: 28,
                view_count: 456,
                store_name: 'N3 Demo Store',
                location: 'Japan'
            }
        ];
    }

    // システム診断
    async runSystemDiagnosis() {
        try {
            const result = await window.executeAjax('system_status');
            return {
                success: true,
                system_status: result.data || {},
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// グローバルインスタンス作成（修正版）
window.N3EbayAPI = new N3EbayAPIClient();

// N3統合関数（構文エラー修正済み）
window.executeDemo = async function() {
    try {
        console.log('🎮 デモモード実行開始');
        
        const result = await window.N3EbayAPI.fetchDemoData();
        
        let message = 'デモモード実行完了\n\n';
        message += `取得件数: ${result.data.length}件\n`;
        message += `ソース: ${result.source}\n`;
        
        if (result.fallback_mode) {
            message += `\n⚠️ フォールバックモード\n`;
            if (result.error) {
                message += `エラー: ${result.error}`;
            }
        }
        
        alert(message);
        console.log('✅ Demo Result:', result);
        
        return result;
        
    } catch (error) {
        const errorMessage = 'デモモード実行失敗: ' + error.message;
        alert(errorMessage);
        console.error('❌ Demo Error:', error);
        throw error;
    }
};

window.refreshData = async function() {
    try {
        console.log('🔄 データ更新開始');
        
        const result = await window.executeAjax('tanaoroshi_get_inventory', {
            refresh: true
        });
        
        alert('データ更新完了');
        location.reload();
        
    } catch (error) {
        alert('データ更新失敗: ' + error.message);
        console.error('❌ Refresh Error:', error);
    }
};

window.checkStatus = async function() {
    try {
        console.log('🔍 システム診断開始');
        
        const result = await window.N3EbayAPI.runSystemDiagnosis();
        
        if (result.success) {
            let message = 'システム診断完了\n\n';
            message += `バージョン: ${result.system_status.n3_version || 'unknown'}\n`;
            message += `Ajax分離: ${result.system_status.ajax_separation || 'unknown'}\n`;
            message += `時刻: ${new Date(result.timestamp).toLocaleString()}`;
            
            alert(message);
            console.log('✅ Status Result:', result);
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        alert('システム診断失敗: ' + error.message);
        console.error('❌ Status Error:', error);
    }
};

// 初期化（DOMContentLoaded時）
document.addEventListener('DOMContentLoaded', function() {
    // N3統合システムが読み込まれるまで待機
    const initializeEbayAPI = async () => {
        try {
            if (window.executeAjax && window.NAGANO3_CONFIG) {
                await window.N3EbayAPI.initialize();
                console.log('✅ eBay API Client ready');
            } else {
                console.log('⏳ N3システム読み込み待機中...');
                setTimeout(initializeEbayAPI, 500);
            }
        } catch (error) {
            console.error('❌ eBay API Client初期化エラー:', error);
        }
    };

    // 1秒後に初期化開始（N3システム読み込み完了待ち）
    setTimeout(initializeEbayAPI, 1000);
});

console.log('📜 eBay API統合クライアント (構文エラー修正版) 読み込み完了');
