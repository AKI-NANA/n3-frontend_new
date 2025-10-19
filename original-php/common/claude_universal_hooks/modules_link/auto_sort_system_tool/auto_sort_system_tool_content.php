<?php
/**
 * N3統合自動振り分けシステム - Webインターフェース (完全修復版)
 * ファイル: modules/auto_sort_system_tool/auto_sort_system_tool_content.php
 */

// セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

// エラーハンドリング
error_reporting(E_ALL);
ini_set('display_errors', 1);
?>

<style>
/* 自動振り分けシステム専用CSS */
.auto-sort-container {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 15px;
    color: white;
    margin-bottom: 20px;
}

.system-header {
    padding: 30px;
    text-align: center;
}

.system-header h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
    font-weight: 700;
}

.system-header p {
    opacity: 0.9;
    margin: 0;
}

.upload-zone {
    border: 3px dashed #dee2e6;
    border-radius: 10px;
    padding: 40px;
    text-align: center;
    background: #f8f9fa;
    cursor: pointer;
    transition: all 0.3s ease;
}

.upload-zone:hover {
    border-color: #007bff;
    background: #e3f2fd;
}

.upload-zone.dragover {
    border-color: #28a745;
    background: #d4edda;
}

.file-item {
    transition: all 0.3s ease;
}

.file-item:hover {
    background-color: #f8f9fa;
}

.confidence-bar {
    height: 4px;
    border-radius: 2px;
    position: relative;
    overflow: hidden;
}

.category-badge {
    font-size: 0.8em;
}

.progress-indicator {
    position: relative;
    overflow: hidden;
}

.progress-indicator::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    animation: shimmer 2s infinite;
}

@keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
}

.stats-card {
    background: white;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    margin-bottom: 20px;
}

.processing-mode-card {
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
    background: white;
}

.watcher-status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}
</style>

<div class="auto-sort-container">
    <div class="system-header">
        <h1><i class="fas fa-magic"></i> N3 自動振り分けシステム</h1>
        <p>AI による高精度ファイル分類・自動振り分けシステム</p>
    </div>
</div>

<!-- メイン処理エリア -->
<div class="row">
    <!-- 左側: ファイル処理 -->
    <div class="col-lg-8">
        <!-- ファイルアップロードエリア -->
        <div class="processing-mode-card">
            <h5><i class="fas fa-upload"></i> ファイルアップロード</h5>
            
            <div class="upload-zone" id="uploadZone">
                <input type="file" id="fileInput" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.txt,.doc,.docx" style="display: none;">
                <div class="upload-content">
                    <i class="fas fa-cloud-upload-alt fa-3x text-primary mb-3"></i>
                    <h6>ファイルをドラッグ&ドロップまたはクリックして選択</h6>
                    <p class="text-muted mb-0">PDF, 画像, テキスト, Word文書に対応</p>
                </div>
            </div>
        </div>

        <!-- 処理設定 -->
        <div class="processing-mode-card">
            <h5><i class="fas fa-cogs"></i> 処理設定</h5>
            
            <div class="row">
                <div class="col-md-4">
                    <label for="processingMode" class="form-label">処理モード</label>
                    <select id="processingMode" class="form-select">
                        <option value="ai_classification">AI分類</option>
                        <option value="keyword_based">キーワード基準</option>
                        <option value="hybrid">ハイブリッド</option>
                    </select>
                </div>
                
                <div class="col-md-4">
                    <label for="confidenceThreshold" class="form-label">信頼度閾値: <span id="confidenceValue">0.7</span></label>
                    <input type="range" id="confidenceThreshold" class="form-range" min="0.1" max="1.0" step="0.1" value="0.7" oninput="if(window.autoSortSystem) window.autoSortSystem.updateConfidenceDisplay()">
                </div>
                
                <div class="col-md-4">
                    <div class="form-check mt-4">
                        <input type="checkbox" id="moveFiles" class="form-check-input">
                        <label for="moveFiles" class="form-check-label">
                            ファイルを移動する
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <!-- 処理実行ボタン -->
        <div class="text-center mb-4">
            <button id="startProcessing" class="btn btn-primary btn-lg" disabled>
                <i class="fas fa-play"></i> 自動振り分け開始
            </button>
        </div>

        <!-- 処理結果表示エリア -->
        <div id="processingResults" class="stats-card">
            <div class="text-center text-muted py-4">
                <i class="fas fa-info-circle fa-2x"></i>
                <p class="mt-2">ファイルを選択して処理を開始してください</p>
            </div>
        </div>
    </div>

    <!-- 右側: 統計・設定 -->
    <div class="col-lg-4">
        <!-- 監視システム -->
        <div class="stats-card">
            <h5><i class="fas fa-eye"></i> フォルダ監視</h5>
            <div class="watcher-status mb-3">
                <span>状態:</span>
                <span id="watcherStatus" class="badge bg-secondary">停止中</span>
            </div>
            <div class="d-grid gap-2">
                <button id="startWatcher" class="btn btn-outline-success btn-sm">
                    <i class="fas fa-play"></i> 監視開始
                </button>
                <button id="stopWatcher" class="btn btn-outline-danger btn-sm" disabled>
                    <i class="fas fa-stop"></i> 監視停止
                </button>
            </div>
        </div>

        <!-- 処理統計 -->
        <div class="stats-card">
            <h5><i class="fas fa-chart-bar"></i> 処理統計</h5>
            <div id="processingStats">
                <div class="text-center text-muted">
                    <p>統計データを読み込み中...</p>
                </div>
            </div>
        </div>

        <!-- AI学習統計 -->
        <div class="stats-card">
            <h5><i class="fas fa-brain"></i> AI学習統計</h5>
            <div id="aiLearningStats">
                <div class="text-center text-muted">
                    <p>学習データを読み込み中...</p>
                </div>
            </div>
        </div>

        <!-- フィードバックセクション -->
        <div class="stats-card" id="noFeedback">
            <h5><i class="fas fa-comment"></i> フィードバック</h5>
            <p class="text-muted">処理結果からフィードバックを送信できます</p>
        </div>

        <div class="stats-card" id="feedbackSection" style="display: none;">
            <h5><i class="fas fa-comment"></i> AIフィードバック</h5>
            <div class="mb-3">
                <label for="feedbackFile" class="form-label">ファイル</label>
                <input type="text" id="feedbackFile" class="form-control" readonly>
            </div>
            <div class="mb-3">
                <label for="predictedCategory" class="form-label">予測カテゴリ</label>
                <input type="text" id="predictedCategory" class="form-control" readonly>
            </div>
            <div class="mb-3">
                <label for="actualCategory" class="form-label">正しいカテゴリ</label>
                <select id="actualCategory" class="form-select">
                    <option value="">選択してください</option>
                    <option value="documents">文書</option>
                    <option value="images">画像</option>
                    <option value="videos">動画</option>
                    <option value="audio">音声</option>
                    <option value="archives">アーカイブ</option>
                    <option value="code">コード</option>
                    <option value="other">その他</option>
                </select>
            </div>
            <div class="mb-3">
                <label for="feedbackNotes" class="form-label">備考</label>
                <textarea id="feedbackNotes" class="form-control" rows="3"></textarea>
            </div>
            <div class="d-grid gap-2">
                <button onclick="submitFeedback()" class="btn btn-primary">
                    <i class="fas fa-paper-plane"></i> フィードバック送信
                </button>
                <button onclick="hideFeedback()" class="btn btn-secondary">
                    <i class="fas fa-times"></i> キャンセル
                </button>
            </div>
        </div>
    </div>
</div>

<script>
class AutoSortSystem {
    constructor() {
        this.files = [];
        this.isProcessing = false;
        this.watcherActive = false;
        this.currentFeedback = null;
        
        this.initializeEventListeners();
        this.checkWatcherStatus();
        this.loadStatistics();
    }

    initializeEventListeners() {
        // ファイル入力
        const fileInput = document.getElementById('fileInput');
        const uploadZone = document.getElementById('uploadZone');

        uploadZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // ドラッグ&ドロップ
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        // 処理開始ボタン
        document.getElementById('startProcessing').addEventListener('click', () => this.startProcessing());

        // 監視ボタン
        document.getElementById('startWatcher').addEventListener('click', () => this.startWatcher());
        document.getElementById('stopWatcher').addEventListener('click', () => this.stopWatcher());
    }

    async checkWatcherStatus() {
        try {
            const response = await fetch('modules/auto_sort_system_tool/api/watcher_control.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'check_status'
                })
            });

            const result = await response.json();
            
            if (result.success && result.data.active) {
                this.watcherActive = true;
                document.getElementById('watcherStatus').className = 'badge bg-success';
                document.getElementById('watcherStatus').textContent = '監視中';
                document.getElementById('startWatcher').disabled = true;
                document.getElementById('stopWatcher').disabled = false;
            }

        } catch (error) {
            console.error('監視状態確認エラー:', error);
        }
    }

    async startWatcher() {
        try {
            const response = await fetch('modules/auto_sort_system_tool/api/watcher_control.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'start_watcher'
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.watcherActive = true;
                document.getElementById('watcherStatus').className = 'badge bg-success';
                document.getElementById('watcherStatus').textContent = '監視中';
                document.getElementById('startWatcher').disabled = true;
                document.getElementById('stopWatcher').disabled = false;
                this.showMessage('フォルダ監視を開始しました', 'success');
            }

        } catch (error) {
            console.error('監視開始エラー:', error);
            this.showMessage('監視開始に失敗しました', 'error');
        }
    }

    async stopWatcher() {
        try {
            const response = await fetch('modules/auto_sort_system_tool/api/watcher_control.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'stop_watcher'
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.watcherActive = false;
                document.getElementById('watcherStatus').className = 'badge bg-secondary';
                document.getElementById('watcherStatus').textContent = '停止中';
                document.getElementById('startWatcher').disabled = false;
                document.getElementById('stopWatcher').disabled = true;
                this.showMessage('フォルダ監視を停止しました', 'info');
            }

        } catch (error) {
            console.error('監視停止エラー:', error);
            this.showMessage('監視停止に失敗しました', 'error');
        }
    }

    handleFiles(files) {
        this.files = Array.from(files);
        document.getElementById('startProcessing').disabled = this.files.length === 0;
        
        this.displayFileList();
    }

    displayFileList() {
        const resultsDiv = document.getElementById('processingResults');
        
        if (this.files.length === 0) {
            resultsDiv.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-info-circle fa-2x"></i>
                    <p class="mt-2">ファイルを選択して処理を開始してください</p>
                </div>
            `;
            return;
        }

        let html = `
            <h6>選択されたファイル (${this.files.length}件)</h6>
            <div class="list-group">
        `;

        this.files.forEach((file, index) => {
            html += `
                <div class="list-group-item file-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <i class="fas fa-file me-2"></i>
                            <span>${file.name}</span>
                            <small class="text-muted ms-2">(${this.formatFileSize(file.size)})</small>
                        </div>
                        <span class="badge bg-secondary">待機中</span>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        resultsDiv.innerHTML = html;
    }

    async startProcessing() {
        if (this.isProcessing || this.files.length === 0) return;

        this.isProcessing = true;
        const startButton = document.getElementById('startProcessing');
        const originalText = startButton.innerHTML;
        
        startButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';
        startButton.disabled = true;

        const moveFiles = document.getElementById('moveFiles').checked;
        const processingMode = document.getElementById('processingMode').value;
        const confidenceThreshold = parseFloat(document.getElementById('confidenceThreshold').value);

        try {
            const formData = new FormData();
            
            // ファイルを追加
            this.files.forEach((file, index) => {
                formData.append(`files[]`, file);
            });
            
            formData.append('move_files', moveFiles ? '1' : '0');
            formData.append('processing_mode', processingMode);
            formData.append('confidence_threshold', confidenceThreshold.toString());

            const response = await fetch('modules/auto_sort_system_tool/api/process_files.php', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.displayProcessingResults(result.data);
                this.showMessage('処理が完了しました', 'success');
                this.loadStatistics(); // 統計更新
            } else {
                throw new Error(result.error || '処理に失敗しました');
            }

        } catch (error) {
            console.error('処理エラー:', error);
            this.showMessage(`処理エラー: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            startButton.innerHTML = originalText;
            startButton.disabled = false;
        }
    }

    displayProcessingResults(data) {
        const resultsDiv = document.getElementById('processingResults');
        
        let html = `
            <div class="row mb-3">
                <div class="col-md-3">
                    <div class="text-center">
                        <h5 class="text-primary mb-1">${data.success_count || 0}</h5>
                        <small class="text-muted">成功</small>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="text-center">
                        <h5 class="text-danger mb-1">${data.error_count || 0}</h5>
                        <small class="text-muted">エラー</small>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="text-center">
                        <h5 class="text-info mb-1">${data.total_files || 0}</h5>
                        <small class="text-muted">総ファイル数</small>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="text-center">
                        <h5 class="text-success mb-1">${Object.keys(data.categories || {}).length}</h5>
                        <small class="text-muted">カテゴリ数</small>
                    </div>
                </div>
            </div>
        `;

        if (data.processed_files && data.processed_files.length > 0) {
            html += '<h6>処理結果詳細</h6><div class="list-group">';
            
            data.processed_files.forEach((file, index) => {
                const classification = file.classification || {};
                const confidence = (classification.confidence || 0) * 100;
                const category = classification.category || 'unknown';
                
                html += `
                    <div class="list-group-item file-item">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <div class="d-flex align-items-center mb-2">
                                    <i class="fas fa-file me-2"></i>
                                    <span class="fw-bold">${this.getFileName(file.original_path || file.file_path || '')}</span>
                                    <span class="badge category-badge bg-primary ms-2">${category}</span>
                                </div>
                                <div class="confidence-bar bg-light mb-2">
                                    <div class="bg-success h-100" style="width: ${confidence}%"></div>
                                </div>
                                <div class="d-flex justify-content-between text-muted small">
                                    <span>信頼度: ${confidence.toFixed(1)}%</span>
                                    <span>${classification.reasoning || ''}</span>
                                </div>
                            </div>
                            <div class="ms-3">
                                <button class="btn btn-sm btn-outline-warning" 
                                        onclick="autoSortSystem.showFeedback('${file.original_path || file.file_path || ''}', '${category}')">
                                    <i class="fas fa-comment"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
        }

        if (data.failed_files && data.failed_files.length > 0) {
            html += '<h6 class="mt-4 text-danger">エラーファイル</h6><div class="list-group">';
            
            data.failed_files.forEach((file) => {
                html += `
                    <div class="list-group-item list-group-item-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <span>${file.file_path || 'Unknown file'}</span>
                        <small class="text-muted ms-2">${file.error || 'Unknown error'}</small>
                    </div>
                `;
            });
            
            html += '</div>';
        }

        resultsDiv.innerHTML = html;
    }

    async loadStatistics() {
        try {
            const response = await fetch('modules/auto_sort_system_tool/api/get_statistics.php');
            const result = await response.json();
            
            if (result.success) {
                this.displayStatistics(result.data);
            }
        } catch (error) {
            console.error('統計読み込みエラー:', error);
        }
    }

    displayStatistics(stats) {
        // 処理統計
        const processingStatsDiv = document.getElementById('processingStats');
        let processingHtml = `
            <div class="row text-center">
                <div class="col-4">
                    <h4 class="text-primary mb-1">${stats.total_processed || 0}</h4>
                    <small class="text-muted">総処理数</small>
                </div>
                <div class="col-4">
                    <h4 class="text-success mb-1">${Object.keys(stats.categories || {}).length}</h4>
                    <small class="text-muted">カテゴリ数</small>
                </div>
                <div class="col-4">
                    <h4 class="text-info mb-1">${stats.recent_files ? stats.recent_files.length : 0}</h4>
                    <small class="text-muted">最近の処理</small>
                </div>
            </div>
        `;

        if (stats.categories && Object.keys(stats.categories).length > 0) {
            processingHtml += '<hr><h6>カテゴリ別統計</h6>';
            Object.entries(stats.categories).forEach(([category, count]) => {
                const percentage = ((count / (stats.total_processed || 1)) * 100).toFixed(1);
                processingHtml += `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span>${category}</span>
                        <span class="badge bg-secondary">${count} (${percentage}%)</span>
                    </div>
                `;
            });
        }

        processingStatsDiv.innerHTML = processingHtml;

        // AI学習統計
        const aiStatsDiv = document.getElementById('aiLearningStats');
        const aiStats = stats.ai_learning_stats || {};
        
        let aiHtml = `
            <div class="row text-center">
                <div class="col-4">
                    <h4 class="text-primary mb-1">${aiStats.total_classifications || 0}</h4>
                    <small class="text-muted">学習データ</small>
                </div>
                <div class="col-4">
                    <h4 class="text-warning mb-1">${aiStats.feedback_count || 0}</h4>
                    <small class="text-muted">フィードバック</small>
                </div>
                <div class="col-4">
                    <h4 class="text-success mb-1">${((aiStats.accuracy_rate || 0) * 100).toFixed(1)}%</h4>
                    <small class="text-muted">精度</small>
                </div>
            </div>
        `;

        aiStatsDiv.innerHTML = aiHtml;
    }

    showFeedback(filePath, predictedCategory) {
        document.getElementById('feedbackFile').value = this.getFileName(filePath);
        document.getElementById('predictedCategory').value = predictedCategory;
        document.getElementById('actualCategory').value = '';
        document.getElementById('feedbackNotes').value = '';
        
        document.getElementById('feedbackSection').style.display = 'block';
        document.getElementById('noFeedback').style.display = 'none';
        
        // データ保存
        this.currentFeedback = {
            filePath: filePath,
            predictedCategory: predictedCategory
        };
    }

    async submitFeedback() {
        if (!this.currentFeedback) return;

        const actualCategory = document.getElementById('actualCategory').value;
        const notes = document.getElementById('feedbackNotes').value;

        if (!actualCategory) {
            this.showMessage('正しいカテゴリを選択してください', 'warning');
            return;
        }

        try {
            const response = await fetch('modules/auto_sort_system_tool/api/submit_feedback.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    file_path: this.currentFeedback.filePath,
                    predicted_category: this.currentFeedback.predictedCategory,
                    actual_category: actualCategory,
                    user_notes: notes
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showMessage('フィードバックを送信しました', 'success');
                this.hideFeedback();
                this.loadStatistics(); // 統計更新
            } else {
                throw new Error(result.error || 'フィードバック送信に失敗しました');
            }

        } catch (error) {
            console.error('フィードバック送信エラー:', error);
            this.showMessage(`エラー: ${error.message}`, 'error');
        }
    }

    hideFeedback() {
        document.getElementById('feedbackSection').style.display = 'none';
        document.getElementById('noFeedback').style.display = 'block';
        this.currentFeedback = null;
    }

    updateConfidenceDisplay() {
        const slider = document.getElementById('confidenceThreshold');
        const display = document.getElementById('confidenceValue');
        display.textContent = slider.value;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFileName(path) {
        return path.split('/').pop() || path || 'Unknown file';
    }

    showMessage(message, type = 'info') {
        // メッセージ表示の実装
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';

        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        // 既存のアラートを削除
        document.querySelectorAll('.alert').forEach(alert => alert.remove());
        
        // 新しいアラートを追加
        const container = document.querySelector('.container-fluid') || document.body;
        container.insertAdjacentHTML('afterbegin', alertHtml);

        // 5秒後に自動削除
        setTimeout(() => {
            document.querySelectorAll('.alert').forEach(alert => {
                if (alert.classList.contains('show')) {
                    alert.classList.remove('show');
                    setTimeout(() => alert.remove(), 150);
                }
            });
        }, 5000);
    }
}

// ページ読み込み後に初期化
document.addEventListener('DOMContentLoaded', function() {
    window.autoSortSystem = new AutoSortSystem();
});

// グローバル関数
function hideFeedback() {
    if (window.autoSortSystem) {
        window.autoSortSystem.hideFeedback();
    }
}

function submitFeedback() {
    if (window.autoSortSystem) {
        window.autoSortSystem.submitFeedback();
    }
}
</script>
