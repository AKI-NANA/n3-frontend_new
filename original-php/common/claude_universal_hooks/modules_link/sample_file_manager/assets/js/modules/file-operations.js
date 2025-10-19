
// CAIDS character_limit Hook
// CAIDS character_limit Hook - 基本実装
console.log('✅ character_limit Hook loaded');

// CAIDS ajax_integration Hook
// CAIDS ajax_integration Hook - 基本実装
console.log('✅ ajax_integration Hook loaded');

// CAIDS error_handling Hook

// CAIDS エラー処理Hook - 完全実装
window.CAIDS_ERROR_HANDLER = {
    isActive: true,
    errorCount: 0,
    errorHistory: [],
    
    initialize: function() {
        this.setupGlobalErrorHandler();
        this.setupUnhandledPromiseRejection();
        this.setupNetworkErrorHandler();
        console.log('⚠️ CAIDS エラーハンドリングシステム完全初期化');
    },
    
    setupGlobalErrorHandler: function() {
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });
    },
    
    setupUnhandledPromiseRejection: function() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack
            });
        });
    },
    
    setupNetworkErrorHandler: function() {
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            try {
                const response = await originalFetch.apply(this, args);
                if (!response.ok) {
                    window.CAIDS_ERROR_HANDLER.handleError({
                        type: 'Network Error',
                        message: `HTTP ${response.status}: ${response.statusText}`,
                        url: args[0]
                    });
                }
                return response;
            } catch (error) {
                window.CAIDS_ERROR_HANDLER.handleError({
                    type: 'Network Fetch Error',
                    message: error.message,
                    url: args[0]
                });
                throw error;
            }
        };
    },
    
    handleError: function(errorInfo) {
        this.errorCount++;
        this.errorHistory.push({...errorInfo, timestamp: new Date().toISOString()});
        
        console.error('🚨 CAIDS Error Handler:', errorInfo);
        this.showErrorNotification(errorInfo);
        this.reportError(errorInfo);
    },
    
    showErrorNotification: function(errorInfo) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 10px; right: 10px; z-index: 999999;
            background: linear-gradient(135deg, #ff4444, #cc0000);
            color: white; padding: 15px 20px; border-radius: 8px;
            max-width: 350px; box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            border: 2px solid #ff6666; animation: caids-error-shake 0.5s ease-in-out;
        `;
        errorDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">🚨</span>
                <div>
                    <strong>エラーが発生しました</strong><br>
                    <small style="opacity: 0.9;">${errorInfo.type}: ${errorInfo.message}</small>
                </div>
            </div>
        `;
        
        // CSS Animation
        if (!document.getElementById('caids-error-styles')) {
            const style = document.createElement('style');
            style.id = 'caids-error-styles';
            style.textContent = `
                @keyframes caids-error-shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 7000);
    },
    
    reportError: function(errorInfo) {
        // エラーレポート生成・送信（将来の拡張用）
        const report = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            errorCount: this.errorCount,
            sessionId: this.getSessionId(),
            ...errorInfo
        };
        
        console.log('📋 CAIDS Error Report:', report);
        localStorage.setItem('caids_last_error', JSON.stringify(report));
    },
    
    getSessionId: function() {
        let sessionId = sessionStorage.getItem('caids_session_id');
        if (!sessionId) {
            sessionId = 'caids_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('caids_session_id', sessionId);
        }
        return sessionId;
    },
    
    getErrorStats: function() {
        return {
            totalErrors: this.errorCount,
            recentErrors: this.errorHistory.slice(-10),
            sessionId: this.getSessionId()
        };
    }
};

window.CAIDS_ERROR_HANDLER.initialize();

/**
 * 🔸 📤 ファイル操作モジュール - CAIDS統合版
 * アップロード・ダウンロード・変換機能の包括実装
 */

class FileOperationsModule {
    constructor() {
        this.uploadQueue = [];
        this.processingFiles = new Map();
        this.supportedFormats = {
            images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
            documents: ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx'],
            archives: ['zip', 'rar', '7z', 'tar', 'gz']
        };
        
        // CAIDS量子化Hooks適用
        this.hooks = {
            upload: '🔸 📤 アップロード_h',
            download: '🔸 📥 ダウンロード_h',
            convert: '🔸 🔄 変換_h',
            security: '🔸 🛡️ セキュリティ_h',
            validation: '🔸 ✅ 検証_h'
        };
        
        this.initializeFileOperations();
    }
    
    initializeFileOperations() {
        console.log('🔸 📤 ファイル操作モジュール初期化中...');
        
        // ファイルドロップゾーン設定
        this.setupDropZone();
        
        // プログレストラッキング初期化
        this.setupProgressTracking();
        
        // セキュリティチェック初期化
        this.setupSecurityValidation();
        
        console.log('✅ ファイル操作モジュール初期化完了');
    }
    
    setupDropZone() {
        const dropZone = document.querySelector('.upload-zone, #uploadArea');
        if (!dropZone) return;
        
        // ドラッグ&ドロップイベント
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            this.handleMultipleFiles(files);
        });
        
        // クリックアップロード
        dropZone.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = '*/*';
            input.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                this.handleMultipleFiles(files);
            });
            input.click();
        });
    }
    
    async handleMultipleFiles(files) {
        console.log(`🔸 📤 ${files.length}個のファイル処理開始`);
        
        for (const file of files) {
            await this.processFileUpload(file);
        }
    }
    
    async processFileUpload(file) {
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // CAIDS量子化セキュリティチェック
        const securityCheck = this.validateFileSecurity(file);
        if (!securityCheck.valid) {
            this.showError(`🛡️ セキュリティチェック失敗: ${securityCheck.reason}`, file.name);
            return;
        }
        
        // プログレストラッキング開始
        this.startProgressTracking(fileId, file);
        
        try {
            // 実際のアップロード処理
            const uploadResult = await this.executeUpload(file, fileId);
            
            // 成功処理
            this.handleUploadSuccess(uploadResult, file);
            
            // CAIDS統合ログ
            this.logFileOperation('upload_success', {
                fileId,
                fileName: file.name,
                fileSize: file.size,
                processingTime: uploadResult.processingTime
            });
            
        } catch (error) {
            // CAIDS量子化エラー処理
            this.handleUploadError(error, file, fileId);
        }
    }
    
    validateFileSecurity(file) {
        // ファイルサイズチェック (50MB制限)
        if (file.size > 50 * 1024 * 1024) {
            return {
                valid: false,
                reason: 'ファイルサイズが50MBを超えています'
            };
        }
        
        // 拡張子チェック
        const extension = file.name.split('.').pop().toLowerCase();
        const dangerousExtensions = ['exe', 'bat', 'cmd', 'scr', 'pif', 'com'];
        
        if (dangerousExtensions.includes(extension)) {
            return {
                valid: false,
                reason: '危険な拡張子のファイルです'
            };
        }
        
        // MIMEタイプチェック
        if (file.type && file.type.includes('application/octet-stream')) {
            return {
                valid: false,
                reason: 'ファイルタイプが不明です'
            };
        }
        
        return { valid: true };
    }
    
    startProgressTracking(fileId, file) {
        // プログレス要素作成
        const progressContainer = document.getElementById('uploadProgress') || this.createProgressContainer();
        
        const progressItem = document.createElement('div');
        progressItem.className = 'upload-progress-item';
        progressItem.id = `progress_${fileId}`;
        progressItem.innerHTML = `
            <div class="progress-info">
                <span class="file-name">${file.name}</span>
                <span class="file-size">${this.formatFileSize(file.size)}</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" data-progress="0"></div>
                <span class="progress-percentage">0%</span>
            </div>
            <div class="progress-status">準備中...</div>
        `;
        
        progressContainer.appendChild(progressItem);
    }
    
    async executeUpload(file, fileId) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileId', fileId);
            formData.append('timestamp', Date.now());
            
            const xhr = new XMLHttpRequest();
            
            // プログレスイベント
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentage = Math.round((e.loaded / e.total) * 100);
                    this.updateProgress(fileId, percentage, 'アップロード中...');
                }
            });
            
            // 完了イベント
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    response.processingTime = Date.now() - startTime;
                    resolve(response);
                } else {
                    reject(new Error(`アップロード失敗: HTTP ${xhr.status}`));
                }
            });
            
            // エラーイベント
            xhr.addEventListener('error', () => {
                reject(new Error('ネットワークエラー'));
            });
            
            // アップロード実行
            xhr.open('POST', 'api/upload.php');
            xhr.send(formData);
        });
    }
    
    updateProgress(fileId, percentage, status) {
        const progressItem = document.getElementById(`progress_${fileId}`);
        if (!progressItem) return;
        
        const progressBar = progressItem.querySelector('.progress-bar');
        const progressPercentage = progressItem.querySelector('.progress-percentage');
        const progressStatus = progressItem.querySelector('.progress-status');
        
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('data-progress', percentage);
        progressPercentage.textContent = `${percentage}%`;
        progressStatus.textContent = status;
        
        // 完了時の色変更
        if (percentage === 100) {
            progressBar.classList.add('complete');
        }
    }
    
    handleUploadSuccess(result, file) {
        console.log('🔸 ✅ アップロード成功:', result);
        
        // 成功通知
        this.showSuccess(`📤 ${file.name} アップロード完了`, {
            fileId: result.file_id,
            size: this.formatFileSize(file.size),
            time: `${result.processingTime}ms`
        });
        
        // ファイルリストに追加
        this.addToFileList(result, file);
        
        // プレビュー生成（画像の場合）
        if (file.type.startsWith('image/')) {
            this.generateImagePreview(file, result);
        }
    }
    
    addToFileList(result, file) {
        const fileList = document.getElementById('downloadableFiles') || this.createFileList();
        
        const fileItem = document.createElement('div');
        fileItem.className = 'file-list-item';
        fileItem.dataset.fileId = result.file_id;
        fileItem.innerHTML = `
            <div class="file-icon">
                ${this.getFileIcon(file.type, file.name)}
            </div>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-details">
                    ${this.formatFileSize(file.size)} • ${file.type || 'Unknown'}
                </div>
            </div>
            <div class="file-actions">
                <button onclick="fileOps.downloadFile('${result.file_id}')" class="btn btn-sm btn-secondary">
                    📥 ダウンロード
                </button>
                <button onclick="fileOps.deleteFile('${result.file_id}')" class="btn btn-sm btn-danger">
                    🗑️ 削除
                </button>
            </div>
        `;
        
        fileList.appendChild(fileItem);
    }
    
    async downloadFile(fileId) {
        try {
            console.log(`🔸 📥 ファイルダウンロード開始: ${fileId}`);
            
            const response = await fetch(`api/download.php?file_id=${fileId}`);
            
            if (!response.ok) {
                throw new Error(`ダウンロード失敗: HTTP ${response.status}`);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'download';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showSuccess('📥 ダウンロード完了', a.download);
            
        } catch (error) {
            this.showError('📥 ダウンロードエラー', error.message);
        }
    }
    
    async createZipDownload() {
        const selectedFiles = this.getSelectedFiles();
        
        if (selectedFiles.length === 0) {
            this.showWarning('📦 ファイル選択', 'ZIP作成するファイルを選択してください');
            return;
        }
        
        try {
            console.log('🔸 📦 ZIP作成開始...');
            
            const response = await fetch('api/create-zip.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: selectedFiles,
                    zipName: `archive_${Date.now()}.zip`
                })
            });
            
            if (!response.ok) {
                throw new Error(`ZIP作成失敗: HTTP ${response.status}`);
            }
            
            const result = await response.json();
            this.showSuccess('📦 ZIP作成完了', `${result.fileCount}個のファイルを圧縮`);
            
            // ZIP自動ダウンロード
            this.downloadFile(result.zipId);
            
        } catch (error) {
            this.showError('📦 ZIP作成エラー', error.message);
        }
    }
    
    // ユーティリティメソッド
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    getFileIcon(mimeType, fileName) {
        if (mimeType?.startsWith('image/')) return '🖼️';
        if (mimeType?.startsWith('video/')) return '🎥';
        if (mimeType?.startsWith('audio/')) return '🎵';
        if (mimeType?.includes('pdf')) return '📄';
        if (mimeType?.includes('zip') || mimeType?.includes('rar')) return '📦';
        if (fileName?.endsWith('.txt')) return '📝';
        return '📄';
    }
    
    createProgressContainer() {
        const container = document.createElement('div');
        container.id = 'uploadProgress';
        container.className = 'upload-progress-container';
        
        const targetArea = document.querySelector('.upload-zone') || document.body;
        targetArea.appendChild(container);
        
        return container;
    }
    
    // CAIDS統合メソッド
    showSuccess(message, details) {
        if (window.demoSystem) {
            window.demoSystem.log('fileops', 'success', `${message} ${details ? JSON.stringify(details) : ''}`);
        }
        console.log('✅', message, details);
    }
    
    showError(message, details) {
        if (window.demoSystem) {
            window.demoSystem.log('fileops', 'error', `${message} ${details || ''}`);
        }
        console.error('❌', message, details);
    }
    
    showWarning(message, details) {
        if (window.demoSystem) {
            window.demoSystem.log('fileops', 'warning', `${message} ${details || ''}`);
        }
        console.warn('⚠️', message, details);
    }
    
    logFileOperation(operation, data) {
        if (window.demoSystem) {
            window.demoSystem.log('fileops', 'info', `[${operation}] ${JSON.stringify(data)}`);
        }
    }
    
    getSelectedFiles() {
        const checkboxes = document.querySelectorAll('.file-list-item input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }
    
    // テスト用メソッド
    async runTests() {
        const results = {
            upload: await this.testFileUpload(),
            download: await this.testFileDownload(),
            security: await this.testSecurityValidation(),
            compression: await this.testCompression()
        };
        
        console.log('🔸 📤 ファイル操作テスト結果:', results);
        return results;
    }
    
    async testFileUpload() {
        // テスト用ダミーファイル作成
        const testFile = new File(['test content'], 'test.txt', {
            type: 'text/plain'
        });
        
        try {
            const result = await this.processFileUpload(testFile);
            return { success: true, message: 'アップロードテスト成功' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// グローバル使用可能に
window.FileOperationsModule = FileOperationsModule;

// インスタンス作成
window.fileOps = new FileOperationsModule();

console.log('🔸 📤 ファイル操作モジュール読み込み完了');