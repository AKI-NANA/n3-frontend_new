/**
 * Universal Data Hub JavaScript - ebay_kanri_db実データ版
 * 固定サンプルデータ削除・実データベース接続版
 * 修正日: 2025年8月22日
 */

'use strict';

const UniversalDataHub = {
    config: {
        name: 'Universal Data Hub',
        version: '2.0.0-real-data',
        debug: window.location.hostname === 'localhost',
        // 実データ用APIエンドポイント
        apiEndpoint: '/modules/php_system_files/data_systems/universal_data_ajax_ebay_fixed.php',
        progressUpdateInterval: 3000,
        maxRetryAttempts: 3
    },
    
    state: {
        isProcessing: false,
        progressInterval: null,
        currentJobId: null,
        retryCount: 0,
        realDataLoaded: false
    },
    
    elements: {},
    eventListeners: new Map()
};

// ===== 初期化 =====

UniversalDataHub.init = function() {
    try {
        this.log('🚀 Universal Data Hub 初期化開始（実データ版）');
        
        this.cacheElements();
        this.setupEventListeners();
        
        // 実データ読み込み
        this.loadRealData();
        
        this.log('✅ Universal Data Hub 実データ版初期化完了');
        
    } catch (error) {
        this.handleError('初期化エラー', error);
    }
};

UniversalDataHub.cacheElements = function() {
    const elementIds = [
        'ebay-products-count',
        'ebay-listings-count', 
        'ebay-countries-count',
        'ebay-images-count',
        'ebay-complete-count'
    ];
    
    elementIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            this.elements[id] = element;
        }
    });
    
    this.log(`DOM要素キャッシュ完了: ${Object.keys(this.elements).length}個`);
};

UniversalDataHub.setupEventListeners = function() {
    window.addEventListener('beforeunload', () => this.cleanup());
    window.addEventListener('error', (event) => {
        this.handleError('グローバルエラー', event.error);
    });
    
    this.log('イベントリスナー設定完了');
};

// ===== 実データ読み込み =====

UniversalDataHub.loadRealData = function() {
    this.log('📊 実データ読み込み開始（ebay_kanri_db）');
    
    // ebay_kanri_db接続確認
    this.makeRequest({
        action: 'connect_ebay_kanri_db'
    })
    .then(data => {
        if (data.success) {
            this.log('✅ ebay_kanri_db接続成功');
            return this.loadRealStats();
        } else {
            throw new Error(data.error || 'データベース接続失敗');
        }
    })
    .catch(error => {
        this.handleError('実データ読み込みエラー', error);
        this.loadFallbackData();
    });
};

UniversalDataHub.loadRealStats = function() {
    this.log('📊 実統計データ読み込み開始');
    
    return this.makeRequest({
        action: 'load_real_ebay_data'
    })
    .then(data => {
        if (data.success) {
            this.updateRealStats(data.data);
            this.state.realDataLoaded = true;
            this.log('✅ 実統計データ読み込み完了');
            
            // 成功通知
            this.showNotification(
                `✅ 実データ読み込み成功\n\n` +
                `データベース: ebay_kanri_db\n` +
                `テーブル: complete_api_test\n` +
                `商品数: ${data.data.real_products_count}件\n` +
                `データソース: 実データベース`,
                'success'
            );
            
        } else {
            throw new Error(data.error || '実データ取得失敗');
        }
    })
    .catch(error => {
        this.handleError('実統計データ読み込みエラー', error);
        this.loadFallbackData();
    });
};

UniversalDataHub.updateRealStats = function(stats) {
    const updates = {
        'ebay-products-count': stats.real_products_count || 0,
        'ebay-listings-count': stats.active_listings_count || 0,
        'ebay-countries-count': stats.unique_sellers_count || 0,
        'ebay-images-count': stats.images_available_count || 0,
        'ebay-complete-count': stats.categories_count || 0
    };
    
    Object.entries(updates).forEach(([elementId, value]) => {
        const element = this.elements[elementId];
        if (element) {
            this.animateNumber(element, parseInt(element.textContent) || 0, value);
        }
    });
    
    this.log('実データ統計更新完了', updates);
};

UniversalDataHub.loadFallbackData = function() {
    this.log('⚠️ フォールバックデータ読み込み');
    
    const fallbackStats = {
        real_products_count: 0,
        active_listings_count: 0,
        unique_sellers_count: 0,
        images_available_count: 0,
        categories_count: 0
    };
    
    this.updateRealStats(fallbackStats);
    
    this.showNotification(
        `⚠️ データベース接続エラー\n\n` +
        `原因: ebay_kanri_db への接続失敗\n` +
        `対処法: PostgreSQLが起動しているか確認\n` +
        `データベース: ebay_kanri_db\n` +
        `テーブル: complete_api_test`,
        'error'
    );
};

// ===== 数値アニメーション =====

UniversalDataHub.animateNumber = function(element, start, end, duration = 1000) {
    const startTime = performance.now();
    const difference = end - start;
    
    const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (difference * easeOut));
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            element.textContent = end.toLocaleString();
        }
    };
    
    requestAnimationFrame(animate);
};

// ===== API通信 =====

UniversalDataHub.makeRequest = function(data, options = {}) {
    const defaultOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 15000
    };
    
    const requestOptions = { ...defaultOptions, ...options };
    
    // CSRFトークン取得
    const csrfToken = this.getCSRFToken();
    
    // フォームデータ作成
    const formData = new URLSearchParams();
    
    if (csrfToken) {
        formData.append('csrf_token', csrfToken);
    }
    
    Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
    });
    
    requestOptions.body = formData;
    
    // タイムアウト処理
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout);
    requestOptions.signal = controller.signal;
    
    this.log('🌐 API リクエスト開始', { action: data.action, endpoint: this.config.apiEndpoint });
    
    return fetch(this.config.apiEndpoint, requestOptions)
        .then(response => {
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response.text();
        })
        .then(text => {
            this.log('📄 レスポンス受信', text);
            
            if (!text || text.trim().length === 0) {
                throw new Error('空のレスポンス');
            }
            
            if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
                this.log('HTMLエラーページ受信:', text.substring(0, 200));
                throw new Error('PHPエラーまたは設定エラー');
            }
            
            try {
                const data = JSON.parse(text);
                this.log('✅ JSON解析成功');
                
                if (this.config.debug) {
                    this.log('Raw response:', {
                        success: data.success,
                        action: data.action || 'unknown',
                        dataKeys: data.data ? Object.keys(data.data) : [],
                        error: data.error
                    });
                }
                
                return data;
            } catch (parseError) {
                this.log('❌ JSON解析エラー', parseError);
                this.log('レスポンステキスト:', text);
                throw new Error('JSON解析失敗: ' + parseError.message);
            }
        })
        .catch(error => {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('リクエストタイムアウト');
            } else if (error.message.includes('Failed to fetch')) {
                throw new Error('ネットワーク接続エラー');
            } else {
                throw error;
            }
        });
};

UniversalDataHub.getCSRFToken = function() {
    // CSRF Token取得の優先順位
    if (window.CSRF_TOKEN) {
        return window.CSRF_TOKEN;
    }
    
    if (window.NAGANO3_CONFIG && window.NAGANO3_CONFIG.csrfToken) {
        return window.NAGANO3_CONFIG.csrfToken;
    }
    
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) {
        return meta.getAttribute('content');
    }
    
    this.log('⚠️ CSRF Token not found');
    return '';
};

// ===== 通知・エラー処理 =====

UniversalDataHub.showNotification = function(message, type = 'info') {
    if (this.config.debug) {
        console.log(`🔔 通知 [${type}]:`, message);
    }
    
    alert(message);
};

UniversalDataHub.handleError = function(context, error) {
    this.log(`❌ ${context}:`, error);
    
    let errorMessage = '不明なエラーが発生しました';
    
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    
    this.showNotification(`${context}: ${errorMessage}`, 'error');
};

// ===== ログ出力 =====

UniversalDataHub.log = function(...args) {
    if (this.config.debug) {
        console.log(`[${this.config.name}]`, ...args);
    }
};

// ===== クリーンアップ =====

UniversalDataHub.cleanup = function() {
    if (this.state.progressInterval) {
        clearInterval(this.state.progressInterval);
    }
    
    this.eventListeners.forEach((listener, element) => {
        element.removeEventListener(listener.event, listener.handler);
    });
    this.eventListeners.clear();
    
    this.elements = {};
    
    this.log('🧹 システムクリーンアップ完了');
};

// ===== グローバル関数（既存機能維持） =====

window.startEbayDataFetch = function() {
    UniversalDataHub.log('🔄 eBayデータ取得開始（実データ版）');
    
    if (!UniversalDataHub.state.realDataLoaded) {
        UniversalDataHub.showNotification(
            '⚠️ 実データ接続が必要です\n\n' +
            '手順:\n' +
            '1. PostgreSQLを起動\n' +
            '2. ebay_kanri_db データベース確認\n' +
            '3. ページを再読み込み',
            'warning'
        );
        return;
    }
    
    UniversalDataHub.showNotification(
        '✅ eBayデータ取得準備完了\n\n' +
        '実データベース: ebay_kanri_db\n' +
        'テーブル: complete_api_test\n\n' +
        '※大量データ取得は棚卸システムで実行してください',
        'info'
    );
};

window.checkEbayConnection = function() {
    UniversalDataHub.log('🔌 eBay API接続確認開始（実データ版）');
    
    UniversalDataHub.makeRequest({
        action: 'connect_ebay_kanri_db'
    })
    .then(data => {
        if (data.success) {
            const message = 
                `✅ ebay_kanri_db接続成功\n\n` +
                `データベース: ${data.database}\n` +
                `接続設定: ${JSON.stringify(data.connection_config, null, 2)}`;
            
            UniversalDataHub.showNotification(message, 'success');
        } else {
            throw new Error(data.error);
        }
    })
    .catch(error => {
        const message = `❌ データベース接続エラー\n\n${error.message}`;
        UniversalDataHub.showNotification(message, 'error');
    });
};

window.viewDatabaseStatus = function() {
    UniversalDataHub.log('🗄️ データベース状況確認開始（実データ版）');
    
    UniversalDataHub.makeRequest({
        action: 'analyze_data_structure'
    })
    .then(data => {
        if (data.success) {
            const analysis = data.analysis;
            const message = 
                `📊 ebay_kanri_db データベース状況\n\n` +
                `データベース: ${analysis.database}\n` +
                `テーブル: ${analysis.table}\n` +
                `総レコード数: ${analysis.statistics?.total_records || 0}件\n` +
                `カラム数: ${analysis.columns?.length || 0}個\n\n` +
                `データ品質:\n` +
                `- タイトル完全性: ${analysis.data_quality?.completeness?.titles || 0}%\n` +
                `- 価格完全性: ${analysis.data_quality?.completeness?.prices || 0}%\n` +
                `- 画像完全性: ${analysis.data_quality?.completeness?.images || 0}%`;
            
            UniversalDataHub.showNotification(message, 'info');
        } else {
            throw new Error(data.error);
        }
    })
    .catch(error => {
        const message = `❌ データベース確認エラー\n\n${error.message}`;
        UniversalDataHub.showNotification(message, 'error');
    });
};

window.openTanaoroshi = function() {
    const url = 'http://localhost:8080/?page=tanaoroshi_inline_complete';
    
    try {
        window.open(url, '_blank');
        UniversalDataHub.log('🔗 棚卸システム画面を開きました');
    } catch (error) {
        UniversalDataHub.showNotification(`手動でアクセスしてください: ${url}`, 'info');
    }
};

// ===== 初期化実行 =====

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        UniversalDataHub.init();
    });
} else {
    UniversalDataHub.init();
}

if (UniversalDataHub.config.debug) {
    window.UniversalDataHub = UniversalDataHub;
    console.log('🐛 デバッグモード: window.UniversalDataHub でアクセス可能');
}

console.log('✅ Universal Data Hub JavaScript v2.0.0 実データ版 - ロード完了');
