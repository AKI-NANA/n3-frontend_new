/**
 * API通信ライブラリ
 * Yahoo Auction統合システム - shared 基盤
 */

window.ApiClient = {
    
    /**
     * ベースURLの設定
     */
    baseUrl: '',
    
    /**
     * デフォルトヘッダー
     */
    defaultHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    
    /**
     * GET リクエスト
     */
    get: async function(url, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = url + (queryString ? '?' + queryString : '');
        
        try {
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: this.defaultHeaders
            });
            
            return await this.handleResponse(response);
            
        } catch (error) {
            console.error('GET request failed:', error);
            throw new Error(`ネットワークエラー: ${error.message}`);
        }
    },
    
    /**
     * POST リクエスト
     */
    post: async function(url, data = {}) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.defaultHeaders,
                body: JSON.stringify(data)
            });
            
            return await this.handleResponse(response);
            
        } catch (error) {
            console.error('POST request failed:', error);
            throw new Error(`ネットワークエラー: ${error.message}`);
        }
    },
    
    /**
     * PUT リクエスト
     */
    put: async function(url, data = {}) {
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: this.defaultHeaders,
                body: JSON.stringify(data)
            });
            
            return await this.handleResponse(response);
            
        } catch (error) {
            console.error('PUT request failed:', error);
            throw new Error(`ネットワークエラー: ${error.message}`);
        }
    },
    
    /**
     * DELETE リクエスト
     */
    delete: async function(url, data = {}) {
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.defaultHeaders,
                body: JSON.stringify(data)
            });
            
            return await this.handleResponse(response);
            
        } catch (error) {
            console.error('DELETE request failed:', error);
            throw new Error(`ネットワークエラー: ${error.message}`);
        }
    },
    
    /**
     * レスポンス処理
     */
    handleResponse: async function(response) {
        let data;
        
        // JSON形式の応答を期待
        try {
            data = await response.json();
        } catch (e) {
            // JSONでない場合はテキストとして取得
            const text = await response.text();
            throw new Error(`無効なレスポンス形式: ${text}`);
        }
        
        // HTTPステータスコードのチェック
        if (!response.ok) {
            const errorMessage = data.error?.message || data.message || `HTTP ${response.status}: ${response.statusText}`;
            throw new Error(errorMessage);
        }
        
        return data;
    },
    
    /**
     * ファイルアップロード
     */
    upload: async function(url, formData) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData // FormDataの場合はContent-Typeを設定しない
            });
            
            return await this.handleResponse(response);
            
        } catch (error) {
            console.error('Upload failed:', error);
            throw new Error(`アップロードエラー: ${error.message}`);
        }
    },
    
    /**
     * ファイルダウンロード
     */
    download: async function(url, params = {}, filename = null) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = url + (queryString ? '?' + queryString : '');
        
        try {
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Accept': '*/*'
                }
            });
            
            if (!response.ok) {
                throw new Error(`ダウンロード失敗: HTTP ${response.status}`);
            }
            
            const blob = await response.blob();
            
            // ファイル名の決定
            if (!filename) {
                const contentDisposition = response.headers.get('Content-Disposition');
                if (contentDisposition) {
                    const match = contentDisposition.match(/filename="?(.+)"?/);
                    if (match) {
                        filename = match[1];
                    }
                }
                if (!filename) {
                    filename = 'download_' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.csv';
                }
            }
            
            // ダウンロード実行
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            
            return { success: true, filename: filename };
            
        } catch (error) {
            console.error('Download failed:', error);
            throw new Error(`ダウンロードエラー: ${error.message}`);
        }
    },
    
    /**
     * リトライ機能付きリクエスト
     */
    requestWithRetry: async function(method, url, data = {}, maxRetries = 3) {
        let lastError;
        
        for (let i = 0; i <= maxRetries; i++) {
            try {
                switch (method.toLowerCase()) {
                    case 'get':
                        return await this.get(url, data);
                    case 'post':
                        return await this.post(url, data);
                    case 'put':
                        return await this.put(url, data);
                    case 'delete':
                        return await this.delete(url, data);
                    default:
                        throw new Error(`サポートされていないメソッド: ${method}`);
                }
            } catch (error) {
                lastError = error;
                
                if (i < maxRetries) {
                    console.warn(`リクエスト失敗 (${i + 1}/${maxRetries + 1}), リトライ中...`, error.message);
                    // 指数バックオフ
                    await this.delay(Math.pow(2, i) * 1000);
                } else {
                    console.error('最大リトライ回数に達しました:', error);
                }
            }
        }
        
        throw lastError;
    },
    
    /**
     * 遅延実行
     */
    delay: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    /**
     * バッチリクエスト（複数のAPIを並列実行）
     */
    batch: async function(requests) {
        try {
            const promises = requests.map(req => {
                const { method, url, data } = req;
                return this[method.toLowerCase()](url, data).catch(error => ({
                    error: error.message,
                    request: req
                }));
            });
            
            return await Promise.all(promises);
            
        } catch (error) {
            console.error('Batch request failed:', error);
            throw new Error(`バッチリクエストエラー: ${error.message}`);
        }
    }
};

// エラーハンドリングの共通化
window.ApiErrorHandler = {
    
    /**
     * エラー表示
     */
    showError: function(error, context = '') {
        const message = context ? `${context}: ${error.message}` : error.message;
        
        if (window.CommonUtils && window.CommonUtils.showNotification) {
            window.CommonUtils.showNotification(message, 'error');
        } else {
            alert(message);
        }
        
        console.error('API Error:', error);
    },
    
    /**
     * 成功メッセージ表示
     */
    showSuccess: function(message) {
        if (window.CommonUtils && window.CommonUtils.showNotification) {
            window.CommonUtils.showNotification(message, 'success');
        } else {
            console.log('Success:', message);
        }
    }
};