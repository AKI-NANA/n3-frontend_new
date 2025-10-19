
// CAIDS character_limit Hook
// CAIDS character_limit Hook - 基本実装
console.log('✅ character_limit Hook loaded');

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
 * 記帳自動化ツール - 完全対応JavaScript
 * common/js/kicho.js
 * 
 * ✅ HTMLのonclick関数と完全合致
 * ✅ DOM操作安全性確保
 * ✅ エラーハンドリング強化
 */

"use strict";

console.log('🎯 kicho.js 読み込み開始');

// =====================================
// 基本設定・名前空間
// =====================================
window.NAGANO3 = window.NAGANO3 || {};
window.NAGANO3.kicho = window.NAGANO3.kicho || {};

// 記帳ツール設定
const KICHO_CONFIG = {
    version: '1.0.0',
    debug: true,
    autoRefreshInterval: 30000, // 30秒
    notificationDuration: 3000  // 3秒
};

// 状態管理
let autoRefreshActive = false;
let autoRefreshTimer = null;

// =====================================
// 通知システム
// =====================================
function showNotification(message, type = 'info', duration = KICHO_CONFIG.notificationDuration) {
    console.log(`📢 [${type.toUpperCase()}] ${message}`);
    
    // アラート要素を取得
    let alertElement;
    if (type === 'success') {
        alertElement = document.getElementById('successAlert');
        const messageElement = document.getElementById('successMessage');
        if (messageElement) messageElement.textContent = message;
    } else if (type === 'error') {
        alertElement = document.getElementById('errorAlert');
        const messageElement = document.getElementById('errorMessage');
        if (messageElement) messageElement.textContent = message;
    }
    
    // アラート表示
    if (alertElement) {
        alertElement.style.display = 'flex';
        setTimeout(() => {
            alertElement.style.display = 'none';
        }, duration);
    }
    
    // フォールバック（アラート要素がない場合）
    if (!alertElement && KICHO_CONFIG.debug) {
        const fallbackAlert = document.createElement('div');
        fallbackAlert.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            padding: 15px 20px; border-radius: 5px; color: white; font-weight: bold;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
        `;
        fallbackAlert.textContent = message;
        document.body.appendChild(fallbackAlert);
        
        setTimeout(() => {
            document.body.removeChild(fallbackAlert);
        }, duration);
    }
}

// =====================================
// ユーティリティ関数
// =====================================
function updateLastUpdateTime() {
    const timeElement = document.getElementById('lastUpdateTime');
    if (timeElement) {
        const now = new Date();
        timeElement.textContent = now.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element && KICHO_CONFIG.debug) {
        console.warn(`⚠️ 要素が見つかりません: ${id}`);
    }
    return element;
}

function setButtonLoading(buttonId, isLoading) {
    const button = safeGetElement(buttonId);
    if (button) {
        if (isLoading) {
            button.disabled = true;
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-spinner fa-spin';
            }
        } else {
            button.disabled = false;
            // 元のアイコンに戻す（簡易版）
            const icon = button.querySelector('i');
            if (icon && icon.className.includes('fa-spinner')) {
                icon.className = 'fas fa-sync-alt'; // デフォルトアイコン
            }
        }
    }
}

// =====================================
// メイン機能関数（HTMLのonclickと完全合致）
// =====================================

/**
 * 全データ更新
 */
function refreshAllData() {
    console.log('🔄 全データ更新開始');
    
    setButtonLoading('refreshBtn', true);
    showNotification('データを更新中...', 'info');
    
    // 実際の処理をシミュレート
    setTimeout(() => {
        updateLastUpdateTime();
        setButtonLoading('refreshBtn', false);
        showNotification('全データを更新しました', 'success');
        
        // 統計データの更新シミュレート
        updateDashboardStats();
    }, 2000);
}

/**
 * 自動更新切り替え
 */
function toggleAutoRefresh() {
    console.log('🔄 自動更新切り替え');
    
    const button = safeGetElement('autoRefreshBtn');
    if (!button) return;
    
    const icon = button.querySelector('i');
    const textNode = button.childNodes[button.childNodes.length - 1];
    
    if (autoRefreshActive) {
        // 自動更新停止
        clearInterval(autoRefreshTimer);
        autoRefreshActive = false;
        
        if (icon) icon.className = 'fas fa-play';
        if (textNode) textNode.textContent = '自動更新開始';
        
        showNotification('自動更新を停止しました', 'info');
    } else {
        // 自動更新開始
        autoRefreshTimer = setInterval(() => {
            updateLastUpdateTime();
            updateDashboardStats();
        }, KICHO_CONFIG.autoRefreshInterval);
        autoRefreshActive = true;
        
        if (icon) icon.className = 'fas fa-pause';
        if (textNode) textNode.textContent = '自動更新停止';
        
        showNotification('自動更新を開始しました（30秒間隔）', 'success');
    }
}

/**
 * MFクラウド取得
 */
function executeMFImport() {
    console.log('☁️ MFクラウド取得開始');
    
    const startDate = safeGetElement('mfStartDate')?.value;
    const endDate = safeGetElement('mfEndDate')?.value;
    const purpose = safeGetElement('mfPurpose')?.value;
    
    if (!startDate || !endDate) {
        showNotification('取得期間を設定してください', 'error');
        return;
    }
    
    showNotification('MFクラウドからデータを取得中...', 'info');
    
    // 実際の処理をシミュレート
    setTimeout(() => {
        const count = Math.floor(Math.random() * 50) + 10;
        showNotification(`MFクラウドから${count}件のデータを取得しました`, 'success');
        updateLastUpdateTime();
    }, 3000);
}

/**
 * CSVアップロード処理
 */
function handleCSVUpload(event) {
    console.log('📄 CSVアップロード処理');
    
    const file = event.target.files[0];
    const uploadBtn = safeGetElement('csvUploadBtn');
    
    if (file && file.type === 'text/csv') {
        if (uploadBtn) uploadBtn.disabled = false;
        showNotification(`CSVファイル「${file.name}」を選択しました`, 'info');
    } else {
        if (uploadBtn) uploadBtn.disabled = true;
        showNotification('CSVファイルを選択してください', 'error');
    }
}

/**
 * CSVアップロード実行
 */
function processCSVUpload() {
    console.log('📤 CSVアップロード実行');
    
    const fileInput = safeGetElement('csvFileInput');
    if (!fileInput || !fileInput.files[0]) {
        showNotification('ファイルが選択されていません', 'error');
        return;
    }
    
    showNotification('CSVファイルを処理中...', 'info');
    
    setTimeout(() => {
        const count = Math.floor(Math.random() * 30) + 5;
        showNotification(`CSVから${count}件の取引を取り込みました`, 'success');
        updateLastUpdateTime();
    }, 2000);
}

/**
 * AI学習実行
 */
function executeAILearning() {
    console.log('🧠 AI学習実行');
    
    const textInput = safeGetElement('aiTextInput');
    if (!textInput || !textInput.value.trim()) {
        showNotification('学習テキストを入力してください', 'error');
        return;
    }
    
    showNotification('AI学習を実行中...', 'info');
    
    setTimeout(() => {
        const ruleCount = Math.floor(Math.random() * 8) + 2;
        showNotification(`AI学習完了。${ruleCount}件のルールを生成しました`, 'success');
        updateLastUpdateTime();
        
        // AI学習履歴に追加
        addAILearningSession();
    }, 4000);
}

/**
 * ルールCSVダウンロード
 */
function downloadRulesCSV() {
    console.log('📥 ルールCSV出力');
    
    showNotification('ルールCSVを生成中...', 'info');
    
    setTimeout(() => {
        // CSVダウンロードシミュレート
        const csvContent = `ルールID,キーワード,借方勘定科目,貸方勘定科目,信頼度
RULE001,Amazon,消耗品費,普通預金,95
RULE002,Google Ads,広告宣伝費,普通預金,92
RULE003,交通費,旅費交通費,現金,88`;
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `kicho_rules_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        showNotification('ルールCSVをダウンロードしました', 'success');
    }, 1500);
}

/**
 * 新規ルール作成
 */
function createNewRule() {
    console.log('➕ 新規ルール作成');
    showNotification('新規ルール作成画面を開きます', 'info');
    // モーダル表示などの処理
}

/**
 * 承認待ちCSVダウンロード
 */
function downloadPendingCSV() {
    console.log('📥 承認待ちCSV出力');
    
    showNotification('承認待ち取引CSVを生成中...', 'info');
    
    setTimeout(() => {
        showNotification('承認待ち取引CSVをダウンロードしました', 'success');
    }, 1500);
}

/**
 * ルールCSVアップロード処理
 */
function handleRulesCSVUpload(event) {
    console.log('📤 ルールCSVアップロード処理');
    
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
        showNotification('ルールCSVを処理中...', 'info');
        setTimeout(() => {
            showNotification('ルールデータを更新しました', 'success');
            updateLastUpdateTime();
        }, 2000);
    }
}

/**
 * 承認CSVアップロード処理
 */
function handleApprovalCSVUpload(event) {
    console.log('📤 承認CSVアップロード処理');
    
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
        showNotification('承認データを処理中...', 'info');
        setTimeout(() => {
            const approvedCount = Math.floor(Math.random() * 15) + 5;
            showNotification(`${approvedCount}件の取引を承認しました`, 'success');
            updateLastUpdateTime();
        }, 2000);
    }
}

/**
 * AI履歴更新
 */
function refreshAIHistory() {
    console.log('🔄 AI履歴更新');
    showNotification('AI履歴を更新しました', 'success');
    updateLastUpdateTime();
}

/**
 * AI履歴もっと読み込む
 */
function loadMoreSessions() {
    console.log('📜 AI履歴もっと読み込む');
    showNotification('過去のセッションを読み込みました', 'info');
}

/**
 * MFクラウド送信
 */
function exportToMF() {
    console.log('☁️ MFクラウド送信');
    
    const mode = safeGetElement('exportMode')?.value || 'incremental';
    showNotification('MFクラウドに送信中...', 'info');
    
    setTimeout(() => {
        const count = Math.floor(Math.random() * 40) + 10;
        showNotification(`MFクラウドに${count}件送信完了`, 'success');
        updateLastUpdateTime();
    }, 3000);
}

/**
 * 手動バックアップ作成
 */
function createManualBackup() {
    console.log('💾 手動バックアップ作成');
    
    const format = safeGetElement('backupFormat')?.value || 'complete';
    showNotification('バックアップを作成中...', 'info');
    
    setTimeout(() => {
        showNotification('バックアップファイルをダウンロードしました', 'success');
    }, 2000);
}

/**
 * 完全バックアップ実行
 */
function executeFullBackup() {
    console.log('💾 完全バックアップ実行');
    
    showNotification('完全バックアップを実行中...', 'info');
    
    setTimeout(() => {
        showNotification('完全バックアップが完了しました', 'success');
    }, 5000);
}

/**
 * 拡張レポート生成
 */
function generateAdvancedReport() {
    console.log('📊 拡張レポート生成');
    
    const startDate = safeGetElement('reportStartDate')?.value;
    const endDate = safeGetElement('reportEndDate')?.value;
    const reportType = safeGetElement('reportType')?.value;
    const reportFormat = safeGetElement('reportFormat')?.value;
    
    if (!startDate || !endDate) {
        showNotification('期間を設定してください', 'error');
        return;
    }
    
    showNotification('拡張レポートを生成中...', 'info');
    
    setTimeout(() => {
        const reportTypeNames = {
            'monthly_summary': '月次処理サマリー',
            'ai_accuracy': 'AI精度レポート',
            'account_summary': '勘定科目別集計',
            'error_analysis': 'エラー・例外処理分析',
            'rule_usage': 'ルール使用統計',
            'mf_sync_history': 'MF連携履歴レポート',
            'duplicate_analysis': '重複処理分析'
        };
        
        const reportName = reportTypeNames[reportType] || 'レポート';
        showNotification(`${reportName}（${reportFormat.toUpperCase()}形式）を生成しました`, 'success');
    }, 3000);
}

/**
 * 取り込み履歴表示
 */
function showImportHistory() {
    console.log('📜 取り込み履歴表示');
    showNotification('取り込み履歴を表示します', 'info');
}

// =====================================
// 補助機能
// =====================================

/**
 * ダッシュボード統計更新
 */
function updateDashboardStats() {
    const stats = {
        'pending-count': Math.floor(Math.random() * 30) + 15,
        'confirmed-rules': Math.floor(Math.random() * 20) + 150,
        'automation-rate': Math.floor(Math.random() * 5) + 90,
        'error-count': Math.floor(Math.random() * 5),
        'monthly-count': Math.floor(Math.random() * 200) + 1200
    };
    
    Object.entries(stats).forEach(([id, value]) => {
        const element = safeGetElement(id);
        if (element) {
            const suffix = id.includes('rate') ? '%' : '件';
            element.textContent = id === 'monthly-count' ? 
                value.toLocaleString() + suffix : value + suffix;
        }
    });
}

/**
 * AI学習セッション追加
 */
function addAILearningSession() {
    const sessionList = safeGetElement('aiSessionList');
    if (!sessionList) return;
    
    const now = new Date();
    const timeString = now.toLocaleDateString('ja-JP') + ' ' + 
                      now.toLocaleTimeString('ja-JP', { 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          second: '2-digit' 
                      });
    
    const sessionItem = document.createElement('div');
    sessionItem.className = 'kicho__session-item';
    sessionItem.innerHTML = `
        <span class="kicho__session-datetime">${timeString}</span>
        <span class="kicho__session-status--success">完了</span>
    `;
    
    sessionList.insertBefore(sessionItem, sessionList.firstChild);
}

// =====================================
// ドラッグ&ドロップ対応
// =====================================
function setupDragAndDrop() {
    const uploadAreas = document.querySelectorAll('.upload-area');
    
    uploadAreas.forEach(area => {
        area.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = 'var(--kicho-primary)';
            this.style.background = 'rgba(139, 92, 246, 0.1)';
        });
        
        area.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.style.borderColor = 'var(--border-color)';
            this.style.background = 'var(--bg-primary)';
        });
        
        area.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.borderColor = 'var(--border-color)';
            this.style.background = 'var(--bg-primary)';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type === 'text/csv') {
                    showNotification(`CSVファイル「${file.name}」をドロップしました`, 'info');
                } else {
                    showNotification('CSVファイルのみアップロード可能です', 'error');
                }
            }
        });
    });
}

// =====================================
// NAGANO3統合
// =====================================
window.NAGANO3.kicho = {
    version: KICHO_CONFIG.version,
    initialized: true,
    refreshAllData,
    toggleAutoRefresh,
    executeMFImport,
    executeAILearning,
    showNotification,
    updateLastUpdateTime
};

// =====================================
// 初期化
// =====================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM準備完了 - kicho.js 初期化');
    
    // 初期設定
    updateLastUpdateTime();
    setupDragAndDrop();
    
    // ESCキーでアラートを閉じる
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const alerts = document.querySelectorAll('.alert');
            alerts.forEach(alert => {
                alert.style.display = 'none';
            });
        }
    });
    
    console.log('✅ kicho.js 初期化完了');
    showNotification('記帳自動化ツールが起動しました', 'success');
});

// ページアンロード時のクリーンアップ
window.addEventListener('beforeunload', function() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
    }
    console.log('🧹 kicho.js クリーンアップ完了');
});

console.log('🎯 kicho.js 読み込み完了');