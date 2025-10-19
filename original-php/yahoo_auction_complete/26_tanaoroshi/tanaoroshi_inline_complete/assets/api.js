// === N3準拠 棚卸しシステム API通信モジュール ===
// ファイル: api.js
// 作成日: 2025-08-17
// 目的: バックエンド（PHP）との通信、データベース操作の集約

/**
 * API通信の基本設定
 */
const API_CONFIG = {
    baseURL: '',
    timeout: 30000,
    defaultHeaders: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest'
    }
};

/**
 * 汎用API通信関数
 * @param {string} url - リクエストURL
 * @param {Object} options - リクエストオプション
 * @returns {Promise<Object>} レスポンスデータ
 */
async function apiRequest(url, options = {}) {
    try {
        const config = {
            method: 'GET',
            headers: { ...API_CONFIG.defaultHeaders },
            ...options
        };
        
        // タイムアウト設定
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
        config.signal = controller.signal;
        
        console.log(`🌐 N3 API通信開始: ${config.method} ${url}`);
        const response = await fetch(url, config);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`✅ N3 API通信成功: ${url}`, data);
        return data;
        
    } catch (error) {
        console.error(`❌ N3 API通信エラー: ${url}`, error);
        
        if (error.name === 'AbortError') {
            throw new Error('リクエストがタイムアウトしました');
        }
        
        throw error;
    }
}

/**
 * 全商品データ取得
 * @returns {Promise<Array>} 商品データ配列
 */
async function fetchProducts() {
    try {
        console.log('📊 N3準拠 商品データ取得開始');
        
        const response = await apiRequest('tanaoroshi_ajax_handler.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'fetch_products',
                csrf_token: getCsrfToken()
            })
        });
        
        if (response.success) {
            const products = ensureArray(response.data);
            console.log(`✅ N3準拠 商品データ取得完了: ${products.length}件`);
            return products.filter(validateProductData);
        } else {
            throw new Error(response.error || '商品データ取得に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ N3エラー: 商品データ取得失敗:', error);
        showErrorMessage('商品データの取得に失敗しました: ' + error.message);
        return [];
    }
}

/**
 * 商品データ更新
 * @param {Object} productData - 更新する商品データ
 * @returns {Promise<boolean>} 更新成功/失敗
 */
async function updateProductInDB(productData) {
    try {
        console.log('💾 N3準拠 商品データ更新開始:', productData.id);
        
        if (!validateProductData(productData)) {
            throw new Error('無効な商品データです');
        }
        
        const response = await apiRequest('tanaoroshi_ajax_handler.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'update_product',
                product_data: JSON.stringify(productData),
                csrf_token: getCsrfToken()
            })
        });
        
        if (response.success) {
            console.log(`✅ N3準拠 商品データ更新完了: ID ${productData.id}`);
            showSuccessMessage('商品データを更新しました');
            return true;
        } else {
            throw new Error(response.error || '商品データ更新に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ N3エラー: 商品データ更新失敗:', error);
        showErrorMessage('商品データの更新に失敗しました: ' + error.message);
        return false;
    }
}

/**
 * 商品データ新規追加
 * @param {Object} productData - 新規商品データ
 * @returns {Promise<Object|null>} 追加された商品データ
 */
async function addProductToDB(productData) {
    try {
        console.log('🆕 N3準拠 商品データ新規追加開始');
        
        if (!productData || typeof productData !== 'object') {
            throw new Error('無効な商品データです');
        }
        
        const response = await apiRequest('tanaoroshi_ajax_handler.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'add_product',
                product_data: JSON.stringify(productData),
                csrf_token: getCsrfToken()
            })
        });
        
        if (response.success) {
            console.log('✅ N3準拠 商品データ新規追加完了:', response.data);
            showSuccessMessage('新しい商品を追加しました');
            return response.data;
        } else {
            throw new Error(response.error || '商品データ追加に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ N3エラー: 商品データ追加失敗:', error);
        showErrorMessage('商品データの追加に失敗しました: ' + error.message);
        return null;
    }
}

/**
 * 商品データ削除
 * @param {number|string} productId - 削除する商品ID
 * @returns {Promise<boolean>} 削除成功/失敗
 */
async function deleteProductFromDB(productId) {
    try {
        console.log(`🗑️ N3準拠 商品データ削除開始: ID ${productId}`);
        
        if (!productId) {
            throw new Error('商品IDが指定されていません');
        }
        
        const response = await apiRequest('tanaoroshi_ajax_handler.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'delete_product',
                product_id: productId,
                csrf_token: getCsrfToken()
            })
        });
        
        if (response.success) {
            console.log(`✅ N3準拠 商品データ削除完了: ID ${productId}`);
            showSuccessMessage('商品を削除しました');
            return true;
        } else {
            throw new Error(response.error || '商品データ削除に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ N3エラー: 商品データ削除失敗:', error);
        showErrorMessage('商品データの削除に失敗しました: ' + error.message);
        return false;
    }
}

/**
 * データベース全削除（管理者用）
 * @returns {Promise<boolean>} 削除成功/失敗
 */
async function clearDatabase() {
    try {
        console.log('🗑️ N3準拠 データベース全削除開始');
        
        const confirmed = confirm('⚠️ 警告: すべてのデータが削除されます。本当に実行しますか？');
        if (!confirmed) {
            return false;
        }
        
        const response = await apiRequest('tanaoroshi_ajax_handler.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'clear_database',
                csrf_token: getCsrfToken()
            })
        });
        
        if (response.success) {
            console.log('✅ N3準拠 データベース全削除完了');
            showSuccessMessage('データベースをクリアしました');
            return true;
        } else {
            throw new Error(response.error || 'データベース削除に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ N3エラー: データベース全削除失敗:', error);
        showErrorMessage('データベースの削除に失敗しました: ' + error.message);
        return false;
    }
}

/**
 * CSVデータインポート
 * @param {File} file - CSVファイル
 * @returns {Promise<Object>} インポート結果
 */
async function importCSVData(file) {
    try {
        console.log('📥 N3準拠 CSVデータインポート開始');
        
        if (!file || file.type !== 'text/csv') {
            throw new Error('有効なCSVファイルを選択してください');
        }
        
        const formData = new FormData();
        formData.append('action', 'import_csv');
        formData.append('csv_file', file);
        formData.append('csrf_token', getCsrfToken());
        
        const response = await apiRequest('tanaoroshi_ajax_handler.php', {
            method: 'POST',
            body: formData,
            headers: {} // FormDataの場合はContent-Typeを自動設定
        });
        
        if (response.success) {
            console.log('✅ N3準拠 CSVインポート完了:', response.data);
            showSuccessMessage(`CSVインポート完了: ${response.data.imported_count}件`);
            return response.data;
        } else {
            throw new Error(response.error || 'CSVインポートに失敗しました');
        }
        
    } catch (error) {
        console.error('❌ N3エラー: CSVインポート失敗:', error);
        showErrorMessage('CSVインポートに失敗しました: ' + error.message);
        return null;
    }
}

/**
 * eBayデータ同期
 * @returns {Promise<Object>} 同期結果
 */
async function syncWithEbayAPI() {
    try {
        console.log('🔄 N3準拠 eBayデータ同期開始');
        showLoadingN3(true, 'eBayとデータ同期中...');
        
        const response = await apiRequest('tanaoroshi_ajax_handler.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'sync_ebay',
                csrf_token: getCsrfToken()
            })
        });
        
        if (response.success) {
            console.log('✅ N3準拠 eBay同期完了:', response.data);
            showSuccessMessage(`eBay同期完了: ${response.data.synced_count}件`);
            return response.data;
        } else {
            throw new Error(response.error || 'eBay同期に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ N3エラー: eBay同期失敗:', error);
        showErrorMessage('eBay同期に失敗しました: ' + error.message);
        return null;
    } finally {
        showLoadingN3(false);
    }
}

/**
 * PostgreSQLデータベーステスト
 * @returns {Promise<boolean>} 接続成功/失敗
 */
async function testPostgreSQLConnection() {
    try {
        console.log('🗄️ N3準拠 PostgreSQL接続テスト開始');
        
        const response = await apiRequest('tanaoroshi_ajax_handler.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'test_postgresql',
                csrf_token: getCsrfToken()
            })
        });
        
        if (response.success) {
            console.log('✅ N3準拠 PostgreSQL接続成功:', response.data);
            showSuccessMessage('PostgreSQL接続成功');
            return true;
        } else {
            throw new Error(response.error || 'PostgreSQL接続に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ N3エラー: PostgreSQL接続失敗:', error);
        showErrorMessage('PostgreSQL接続に失敗しました: ' + error.message);
        return false;
    }
}

/**
 * システム統計データ取得
 * @returns {Promise<Object>} 統計データ
 */
async function fetchSystemStats() {
    try {
        console.log('📊 N3準拠 システム統計取得開始');
        
        const response = await apiRequest('tanaoroshi_ajax_handler.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'get_stats',
                csrf_token: getCsrfToken()
            })
        });
        
        if (response.success) {
            console.log('✅ N3準拠 システム統計取得完了:', response.data);
            return response.data;
        } else {
            throw new Error(response.error || '統計データ取得に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ N3エラー: システム統計取得失敗:', error);
        return {
            total_products: 0,
            stock_products: 0,
            dropship_products: 0,
            set_products: 0,
            hybrid_products: 0,
            total_value: 0
        };
    }
}

/**
 * CSRF トークン取得
 * @returns {string} CSRF トークン
 */
function getCsrfToken() {
    try {
        // セッションストレージから取得を試行
        let token = sessionStorage.getItem('csrf_token');
        
        if (!token) {
            // HTMLのmetaタグから取得を試行
            const metaToken = document.querySelector('meta[name="csrf-token"]');
            if (metaToken) {
                token = metaToken.getAttribute('content');
                sessionStorage.setItem('csrf_token', token);
            }
        }
        
        if (!token) {
            // 隠し入力フィールドから取得を試行
            const hiddenToken = document.querySelector('input[name="csrf_token"]');
            if (hiddenToken) {
                token = hiddenToken.value;
                sessionStorage.setItem('csrf_token', token);
            }
        }
        
        if (!token) {
            // フォールバック: 簡易トークン生成
            token = 'fallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('csrf_token', token);
            console.warn('⚠️ N3警告: CSRF トークンが見つからないため、フォールバックトークンを使用');
        }
        
        return token;
    } catch (error) {
        console.error('❌ N3エラー: CSRF トークン取得失敗:', error);
        return 'error_token_' + Date.now();
    }
}

/**
 * リクエスト再試行ヘルパー
 * @param {Function} apiFunction - 実行するAPI関数
 * @param {number} maxRetries - 最大再試行回数
 * @param {number} delay - 再試行間隔（ms）
 * @returns {Promise<any>} API結果
 */
async function retryApiRequest(apiFunction, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 N3 API再試行: ${attempt}/${maxRetries}`);
            const result = await apiFunction();
            return result;
        } catch (error) {
            lastError = error;
            console.warn(`⚠️ N3警告: API試行${attempt}失敗:`, error.message);
            
            if (attempt < maxRetries) {
                console.log(`⏳ N3準拠: ${delay}ms後に再試行...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 1.5; // 指数バックオフ
            }
        }
    }
    
    throw lastError;
}

/**
 * API関数のバッチ実行
 * @param {Array<Function>} apiFunctions - 実行するAPI関数配列
 * @param {Object} options - オプション
 * @returns {Promise<Array>} 実行結果配列
 */
async function batchApiRequests(apiFunctions, options = {}) {
    const { concurrent = 3, failFast = false } = options;
    
    try {
        console.log(`🔄 N3準拠 バッチAPI実行開始: ${apiFunctions.length}件`);
        
        const results = [];
        
        // 並行実行制御
        for (let i = 0; i < apiFunctions.length; i += concurrent) {
            const batch = apiFunctions.slice(i, i + concurrent);
            
            if (failFast) {
                const batchResults = await Promise.all(batch.map(fn => fn()));
                results.push(...batchResults);
            } else {
                const batchResults = await Promise.allSettled(batch.map(fn => fn()));
                results.push(...batchResults.map(result => 
                    result.status === 'fulfilled' ? result.value : result.reason
                ));
            }
        }
        
        console.log(`✅ N3準拠 バッチAPI実行完了: ${results.length}件`);
        return results;
        
    } catch (error) {
        console.error('❌ N3エラー: バッチAPI実行失敗:', error);
        throw error;
    }
}

// === モジュール公開 ===
window.N3API = {
    // 基本通信
    apiRequest,
    
    // 商品データ操作
    fetchProducts,
    updateProductInDB,
    addProductToDB,
    deleteProductFromDB,
    
    // システム操作
    clearDatabase,
    importCSVData,
    syncWithEbayAPI,
    testPostgreSQLConnection,
    fetchSystemStats,
    
    // ヘルパー関数
    getCsrfToken,
    retryApiRequest,
    batchApiRequests
};

console.log('🌐 N3準拠 api.js 読み込み完了 - API通信モジュール利用可能');