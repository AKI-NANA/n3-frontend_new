<?php
/**
 * N3統合自動振り分けシステム - Webインターフェース (続き)
 * ファイル: modules/auto_sort_system_tool/auto_sort_system_tool_content.php
 */

// 前半部分は既に保存済み

        if (data.failed_files && data.failed_files.length > 0) {
            html += '<h6 class="mt-4 text-danger">エラーファイル</h6><div class="list-group">';
            
            data.failed_files.forEach((file) => {
                html += `
                    <div class="list-group-item list-group-item-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <span>${file.file_path}</span>
                        <small class="text-muted ms-2">${file.error}</small>
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
        return path.split('/').pop() || path;
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
        document.querySelector('.container-fluid').insertAdjacentHTML('afterbegin', alertHtml);

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
    window.autoSortSystem.hideFeedback();
}

function submitFeedback() {
    window.autoSortSystem.submitFeedback();
}
</script>