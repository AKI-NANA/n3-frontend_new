/**
 * 🔧 Maru9 Tool JavaScript - 修正版
 * 最小限のシンプル実装
 */

(function(window, document) {
    'use strict';
    
    class Maru9ToolController {
        constructor(n3CoreInstance) {
            this.n3 = n3CoreInstance;
            
            this.config = {
                maxFileSize: 10 * 1024 * 1024, // 10MB
                allowedTypes: ['.csv']
            };
            
            this.state = {
                fileName: '',
                csvData: '',
                processing: false
            };
            
            this.elements = {};
            
            console.log('[MARU9] Controller初期化');
        }
        
        async init() {
            try {
                this.initElements();
                this.setupEventListeners();
                this.initializeUI();
                console.log('[MARU9] 初期化完了');
                return true;
            } catch (error) {
                console.error('[MARU9] 初期化失敗:', error);
                throw error;
            }
        }
        
        initElements() {
            this.elements = {
                uploadZone: document.getElementById('uploadZone'),
                csvFile: document.getElementById('csvFile'),
                fileStatus: document.getElementById('fileStatus'),
                processButton: document.getElementById('processButton'),
                startOllamaButton: document.getElementById('startOllamaButton'),
                resultArea: document.getElementById('resultArea'),
                resultContent: document.getElementById('resultContent'),
                progressArea: document.getElementById('progressArea'),
                progressBar: document.getElementById('progressBar'),
                progressMessage: document.getElementById('progressMessage')
            };
        }
        
        setupEventListeners() {
            if (this.elements.uploadZone) {
                this.elements.uploadZone.addEventListener('click', () => {
                    this.elements.csvFile?.click();
                });
            }
            
            if (this.elements.csvFile) {
                this.elements.csvFile.addEventListener('change', (e) => {
                    this.handleFileSelect(e);
                });
            }
            
            if (this.elements.processButton) {
                this.elements.processButton.addEventListener('click', () => {
                    this.startProcessing();
                });
            }
            
            if (this.elements.startOllamaButton) {
                this.elements.startOllamaButton.addEventListener('click', () => {
                    this.startOllama();
                });
            }
        }
        
        handleFileSelect(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            this.updateFileStatus('ファイル読み込み中...', 'info');
            
            const reader = new FileReader();
            reader.onload = (e) => {
                this.state.csvData = e.target.result;
                this.state.fileName = file.name;
                
                this.updateFileStatus(
                    `✅ ${file.name} 読み込み完了`,
                    'success'
                );
                
                this.updateProcessButton();
                
                // 🔥 自動処理有効化: ファイル選択後に自動で処理開始
                console.log('[MARU9] ファイル読み込み完了 - 自動処理開始');
                setTimeout(() => {
                    this.startProcessing();
                }, 500); // 500ms待機してから自動実行
            };
            
            reader.onerror = () => {
                this.updateFileStatus('ファイル読み込みエラー', 'error');
            };
            
            reader.readAsText(file, 'UTF-8');
        }
        
        async startProcessing() {
            if (this.state.processing || !this.state.csvData) return;
            
            try {
                this.state.processing = true;
                this.updateProcessingUI(true);
                
                console.log('[MARU9] 処理開始');
                
                const result = await this.n3.processCSV(this.state.csvData, {
                    enableAI: true,
                    fileName: this.state.fileName
                });
                
                this.showProcessingResult(result);
                console.log('[MARU9] 処理完了');
                
            } catch (error) {
                console.error('[MARU9] 処理エラー:', error);
                this.showProcessingError(error);
            } finally {
                this.state.processing = false;
                this.updateProcessingUI(false);
            }
        }
        
        async startOllama() {
            try {
                console.log('[MARU9] Ollama起動試行');
                const result = await this.n3.startOllama();
                
                if (result.result?.started) {
                    this.showMessage('Ollama起動完了', 'success');
                } else {
                    throw new Error(result.result?.message || '起動失敗');
                }
            } catch (error) {
                console.error('[MARU9] Ollama起動失敗:', error);
                this.showMessage(`Ollama起動失敗: ${error.message}`, 'error');
            }
        }
        
        updateFileStatus(message, type = 'info') {
            if (this.elements.fileStatus) {
                const colors = {
                    success: '#28a745',
                    error: '#dc3545',
                    warning: '#ffc107',
                    info: '#6c757d'
                };
                
                this.elements.fileStatus.innerHTML = `
                    <i class="fas fa-info-circle" style="color: ${colors[type]};"></i> ${message}
                `;
            }
        }
        
        updateProcessButton() {
            if (!this.elements.processButton) return;
            
            const canProcess = this.state.csvData && !this.state.processing;
            this.elements.processButton.disabled = !canProcess;
            
            if (canProcess) {
                this.elements.processButton.classList.remove('maru9-btn--disabled');
            } else {
                this.elements.processButton.classList.add('maru9-btn--disabled');
            }
        }
        
        updateProcessingUI(processing) {
            if (this.elements.processButton) {
                this.elements.processButton.disabled = processing;
                this.elements.processButton.innerHTML = processing
                    ? '<i class="fas fa-spinner fa-spin"></i> 処理中...'
                    : '<i class="fas fa-cogs"></i> 🚀 データ変換・N3統合処理開始';
            }
        }
        
        showProcessingResult(result) {
            if (!this.elements.resultArea || !this.elements.resultContent) return;
            
            const stats = result.stats || result.result?.statistics || {};
            const processedData = result.result?.processed_csv || [];
            
            let resultHTML = `
                <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 15px; margin-bottom: 15px;">
                    <h5 style="color: #155724; margin: 0 0 10px 0;">
                        <i class="fas fa-check-circle"></i> AI処理完了
                    </h5>
                    <div style="font-size: 14px;">
                        <div><strong>処理行数:</strong> ${stats.processed_lines || '不明'}</div>
                        <div><strong>AI変更:</strong> ${stats.ai_processed_count || 0}件</div>
                        <div><strong>処理時間:</strong> ${stats.processing_time || '不明'}秒</div>
                        <div><strong>エラー:</strong> ${stats.error_count || 0}件</div>
                    </div>
                </div>
            `;
            
            // 💾 ダウンロードボタン追加
            if (processedData && processedData.length > 0) {
                resultHTML += `
                    <div style="text-align: center; margin-top: 20px;">
                        <button id="downloadProcessedCSV" class="maru9-btn" style="background: #28a745; font-size: 16px; padding: 15px 25px;">
                            <i class="fas fa-download"></i> 📊 処理済みCSVダウンロード
                        </button>
                        <div style="margin-top: 10px; font-size: 12px; color: #666;">
                            🎆 AI強化・ VERO対策・ カテゴリ自動設定適用済み
                        </div>
                    </div>
                `;
            }
            
            this.elements.resultContent.innerHTML = resultHTML;
            this.elements.resultArea.classList.remove('maru9-hidden');
            
            // 💾 ダウンロードボタンイベント設定
            const downloadBtn = document.getElementById('downloadProcessedCSV');
            if (downloadBtn && processedData) {
                downloadBtn.addEventListener('click', () => {
                    this.downloadProcessedCSV(processedData);
                });
            }
        }
        
        showProcessingError(error) {
            if (!this.elements.resultArea || !this.elements.resultContent) return;
            
            this.elements.resultContent.innerHTML = `
                <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 15px;">
                    <h5 style="color: #721c24; margin: 0 0 10px 0;">
                        <i class="fas fa-exclamation-triangle"></i> 処理エラー
                    </h5>
                    <p style="margin: 0; color: #721c24;">${error.message}</p>
                </div>
            `;
            
            this.elements.resultArea.classList.remove('maru9-hidden');
        }
        
        showMessage(message, type = 'info') {
            console.log(`[MARU9-MSG-${type.toUpperCase()}] ${message}`);
        }
        
        // 💾 CSVダウンロード機能
        downloadProcessedCSV(processedData) {
            try {
                console.log('[MARU9] CSVダウンロード開始:', processedData.length + '行');
                
                // CSVデータを文字列に変換
                const csvContent = processedData.join('\n');
                
                // BOM付きUTF-8でBlob作成
                const blob = new Blob(['\uFEFF' + csvContent], { 
                    type: 'text/csv;charset=utf-8;' 
                });
                
                // ファイル名生成
                const now = new Date();
                const timestamp = now.getFullYear() + 
                    String(now.getMonth() + 1).padStart(2, '0') + 
                    String(now.getDate()).padStart(2, '0') + '_' +
                    String(now.getHours()).padStart(2, '0') + 
                    String(now.getMinutes()).padStart(2, '0');
                    
                const originalName = this.state.fileName.replace('.csv', '');
                const downloadFileName = `${originalName}_AI処理済み_${timestamp}.csv`;
                
                // ダウンロード実行
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = downloadFileName;
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // URLオブジェクトをメモリ解放
                URL.revokeObjectURL(link.href);
                
                console.log('[MARU9] ダウンロード完了:', downloadFileName);
                
                // 成功メッセージ表示
                const successMsg = document.createElement('div');
                successMsg.style.cssText = `
                    position: fixed; top: 50px; right: 10px; 
                    background: #28a745; color: white; 
                    padding: 15px 20px; border-radius: 8px; 
                    z-index: 10000; font-size: 14px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                `;
                successMsg.innerHTML = `
                    <i class="fas fa-check-circle"></i> 
                    🎆 ${downloadFileName}<br>
                    💾 ダウンロード完了！
                `;
                
                document.body.appendChild(successMsg);
                
                setTimeout(() => {
                    if (successMsg.parentNode) {
                        successMsg.parentNode.removeChild(successMsg);
                    }
                }, 4000);
                
            } catch (error) {
                console.error('[MARU9] ダウンロードエラー:', error);
                alert('ダウンロードエラー: ' + error.message);
            }
        }
        
        initializeUI() {
            this.updateProcessButton();
            
            if (this.elements.resultArea) {
                this.elements.resultArea.classList.add('maru9-hidden');
            }
        }
    }
    
    /**
     * 🔧 シンプル初期化
     */
    function initializeMaru9ToolSimple() {
        console.log('[MARU9-SIMPLE] 初期化開始');
        
        // N3Core代替システム
        const n3Fallback = {
            config: {
                debug: true,
                csrfToken: window.CSRF_TOKEN || window.NAGANO3_CONFIG?.csrfToken || 'fallback_' + Date.now()
            },
            
            async ajax(action, data = {}) {
                const formData = new FormData();
                formData.append('action', action);
                formData.append('csrf_token', this.config.csrfToken);
                
                Object.entries(data).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) {
                        formData.append(key, value);
                    }
                });
                
                const response = await fetch(window.location.pathname + '?page=maru9_tool', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.json();
            },
            
            async processCSV(csvData, options = {}) {
                console.log('[FALLBACK] processCSV呼び出し:', {
                    dataLength: csvData.length,
                    enableAI: options.enableAI,
                    url: window.location.pathname + '?page=maru9_tool'
                });
                
                const result = await this.ajax('maru9_auto_process', {
                    csv_data: csvData,
                    enable_ai: options.enableAI !== false
                });
                
                console.log('[FALLBACK] processCSV結果:', result);
                return result;
            },
            
            async startOllama() {
                console.log('[FALLBACK] Ollama起動試行中...');
                const result = await this.ajax('start_ollama');
                console.log('[FALLBACK] Ollama起動結果:', result);
                return result;
            }
        };
        
        try {
            const maru9ToolInstance = new Maru9ToolController(n3Fallback);
            
            maru9ToolInstance.init().then(() => {
                console.log('[MARU9-SIMPLE] 初期化完了');
                window.Maru9Tool = maru9ToolInstance;
                
                // 成功通知
                const messageDiv = document.createElement('div');
                messageDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #28a745; color: white; padding: 10px; border-radius: 5px; z-index: 9999; font-size: 14px;';
                messageDiv.textContent = '✅ Maru9システム起動完了';
                document.body.appendChild(messageDiv);
                
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.parentNode.removeChild(messageDiv);
                    }
                }, 3000);
                
            }).catch(error => {
                console.error('[MARU9-SIMPLE] 初期化失敗:', error);
            });
            
        } catch (error) {
            console.error('[MARU9-SIMPLE] インスタンス化失敗:', error);
        }
    }
    
    // DOM準備完了後に初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMaru9ToolSimple);
    } else {
        setTimeout(initializeMaru9ToolSimple, 100);
    }
    
})(window, document);
