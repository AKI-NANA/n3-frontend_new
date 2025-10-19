
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
 * 🔍 MFデータ取得デバッグツール
 * 
 * 現在のMFクラウドデータ取得状況を詳細に分析
 */

class MFDataDebugger {
    constructor() {
        this.debug = true;
        this.testResults = {};
    }
    
    async performCompleteAnalysis() {
        console.log('🔍 MFデータ完全分析開始');
        
        const results = {
            timestamp: new Date().toISOString(),
            tests: {},
            summary: {},
            recommendations: []
        };
        
        try {
            // 1. Ajax通信テスト
            results.tests.ajax = await this.testAjaxConnection();
            
            // 2. MFインポート機能テスト
            results.tests.mfImport = await this.testMFImport();
            
            // 3. データ表示テスト
            results.tests.dataDisplay = await this.testDataDisplay();
            
            // 4. エラーログ分析
            results.tests.errorLog = this.analyzeErrors();
            
            // 5. ブラウザ環境チェック
            results.tests.browserEnv = this.checkBrowserEnvironment();
            
            // 6. サマリー生成
            results.summary = this.generateSummary(results.tests);
            
            // 7. 推奨事項生成
            results.recommendations = this.generateRecommendations(results.tests);
            
            this.displayAnalysisResults(results);
            
            return results;
            
        } catch (error) {
            console.error('❌ 分析エラー:', error);
            return { error: error.message };
        }
    }
    
    async testAjaxConnection() {
        console.log('🌐 Ajax通信テスト開始');
        
        const test = {
            name: 'Ajax通信テスト',
            status: 'unknown',
            details: {},
            errors: []
        };
        
        try {
            // 基本的なHealth Checkテスト
            const formData = new FormData();
            formData.append('action', 'health_check');
            
            const startTime = performance.now();
            const response = await fetch('/kicho_ajax_handler_ultimate.php', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            });
            const endTime = performance.now();
            
            test.details.responseTime = Math.round(endTime - startTime);
            test.details.httpStatus = response.status;
            test.details.contentType = response.headers.get('content-type');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            test.details.responseData = result;
            
            if (result.success) {
                test.status = 'success';
                test.details.message = 'Ajax通信正常';
            } else {
                test.status = 'warning';
                test.details.message = result.message || 'レスポンスエラー';
            }
            
        } catch (error) {
            test.status = 'error';
            test.errors.push(error.message);
            test.details.message = `Ajax通信エラー: ${error.message}`;
        }
        
        console.log('✅ Ajax通信テスト完了:', test);
        return test;
    }
    
    async testMFImport() {
        console.log('💳 MFインポートテスト開始');
        
        const test = {
            name: 'MFインポートテスト',
            status: 'unknown',
            details: {},
            errors: []
        };
        
        try {
            // MFインポート実行
            const formData = new FormData();
            formData.append('action', 'execute-mf-import');
            formData.append('start_date', this.getTestStartDate());
            formData.append('end_date', this.getTestEndDate());
            formData.append('purpose', 'debug_test');
            
            const startTime = performance.now();
            const response = await fetch('/kicho_ajax_handler_ultimate.php', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            });
            const endTime = performance.now();
            
            test.details.responseTime = Math.round(endTime - startTime);
            test.details.httpStatus = response.status;
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            test.details.responseData = result;
            
            if (result.success) {
                test.status = 'success';
                test.details.transactionCount = result.data?.mf_result?.transactions?.length || 0;
                test.details.importedCount = result.data?.imported_count || 0;
                test.details.message = `MFデータ取得成功: ${test.details.transactionCount}件`;
                
                // データ品質チェック
                if (result.data?.mf_result?.transactions) {
                    test.details.dataQuality = this.analyzeDataQuality(result.data.mf_result.transactions);
                }
                
            } else {
                test.status = 'warning';
                test.details.message = result.message || 'MFインポート失敗';
                test.errors.push(result.message);
            }
            
        } catch (error) {
            test.status = 'error';
            test.errors.push(error.message);
            test.details.message = `MFインポートエラー: ${error.message}`;
        }
        
        console.log('✅ MFインポートテスト完了:', test);
        return test;
    }
    
    async testDataDisplay() {
        console.log('🖥️ データ表示テスト開始');
        
        const test = {
            name: 'データ表示テスト',
            status: 'unknown',
            details: {},
            errors: []
        };
        
        try {
            // DOM要素の存在確認
            const displayElements = {
                'mf_data_container': this.findElement([
                    '#mf-data-container',
                    '.mf-data-container', 
                    '[data-mf-container]',
                    '#imported-data-list',
                    '.kicho__imported-data__list'
                ]),
                'statistics_elements': this.findElement([
                    '[data-stat="total_transactions"]',
                    '#totalTransactions'
                ]),
                'action_buttons': this.findElement([
                    '[data-action="execute-mf-import"]'
                ])
            };
            
            test.details.foundElements = {};
            test.details.missingElements = [];
            
            Object.entries(displayElements).forEach(([key, element]) => {
                if (element) {
                    test.details.foundElements[key] = {
                        tagName: element.tagName,
                        id: element.id,
                        className: element.className,
                        exists: true
                    };
                } else {
                    test.details.missingElements.push(key);
                }
            });
            
            // JavaScript初期化状況チェック
            test.details.jsStatus = {
                nagano3_kicho: !!window.NAGANO3_KICHO,
                dataDisplayManager: !!(window.NAGANO3_KICHO?.dataDisplayManager),
                ajaxManager: !!(window.NAGANO3_KICHO?.ajaxManager),
                initialized: !!(window.NAGANO3_KICHO?.initialized)
            };
            
            // エラー判定
            const missingElementsCount = test.details.missingElements.length;
            const foundElementsCount = Object.keys(test.details.foundElements).length;
            
            if (missingElementsCount === 0) {
                test.status = 'success';
                test.details.message = 'すべての表示要素が存在';
            } else if (foundElementsCount > missingElementsCount) {
                test.status = 'warning';
                test.details.message = `一部要素不足: ${missingElementsCount}個`;
            } else {
                test.status = 'error';
                test.details.message = `多数の要素不足: ${missingElementsCount}個`;
            }
            
        } catch (error) {
            test.status = 'error';
            test.errors.push(error.message);
            test.details.message = `データ表示テストエラー: ${error.message}`;
        }
        
        console.log('✅ データ表示テスト完了:', test);
        return test;
    }
    
    analyzeErrors() {
        console.log('📋 エラーログ分析開始');
        
        const analysis = {
            name: 'エラーログ分析',
            status: 'info',
            details: {},
            errors: []
        };
        
        try {
            // コンソールエラーの収集（可能な範囲で）
            analysis.details.browserErrors = [];
            
            // ローカルストレージのエラー情報チェック
            try {
                const storedErrors = localStorage.getItem('kicho_errors');
                if (storedErrors) {
                    analysis.details.storedErrors = JSON.parse(storedErrors);
                }
            } catch (e) {
                // ローカルストレージ使用不可
            }
            
            // ネットワークエラーの推定
            analysis.details.networkIssues = this.detectNetworkIssues();
            
            // PHP設定の推定
            analysis.details.phpConfig = this.estimatePHPConfig();
            
            analysis.details.message = 'エラーログ分析完了';
            
        } catch (error) {
            analysis.status = 'error';
            analysis.errors.push(error.message);
        }
        
        console.log('✅ エラーログ分析完了:', analysis);
        return analysis;
    }
    
    checkBrowserEnvironment() {
        console.log('🌐 ブラウザ環境チェック開始');
        
        const check = {
            name: 'ブラウザ環境チェック',
            status: 'info',
            details: {},
            errors: []
        };
        
        try {
            check.details = {
                userAgent: navigator.userAgent,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                
                // ブラウザ機能サポート
                supports: {
                    fetch: typeof fetch !== 'undefined',
                    formData: typeof FormData !== 'undefined',
                    localStorage: typeof localStorage !== 'undefined',
                    sessionStorage: typeof sessionStorage !== 'undefined',
                    promises: typeof Promise !== 'undefined',
                    modules: typeof import !== 'undefined'
                },
                
                // 画面情報
                screen: {
                    width: window.screen.width,
                    height: window.screen.height,
                    devicePixelRatio: window.devicePixelRatio
                },
                
                // 現在のページ情報
                page: {
                    url: window.location.href,
                    protocol: window.location.protocol,
                    host: window.location.host,
                    pathname: window.location.pathname
                }
            };
            
            // サポート状況による判定
            const unsupportedFeatures = Object.entries(check.details.supports)
                .filter(([feature, supported]) => !supported)
                .map(([feature]) => feature);
            
            if (unsupportedFeatures.length === 0) {
                check.status = 'success';
                check.details.message = 'ブラウザ環境は完全サポート';
            } else {
                check.status = 'warning';
                check.details.message = `一部機能未サポート: ${unsupportedFeatures.join(', ')}`;
            }
            
        } catch (error) {
            check.status = 'error';
            check.errors.push(error.message);
        }
        
        console.log('✅ ブラウザ環境チェック完了:', check);
        return check;
    }
    
    generateSummary(tests) {
        const summary = {
            totalTests: Object.keys(tests).length,
            successCount: 0,
            warningCount: 0,
            errorCount: 0,
            overallStatus: 'unknown',
            criticalIssues: [],
            recommendations: []
        };
        
        Object.values(tests).forEach(test => {
            switch (test.status) {
                case 'success':
                    summary.successCount++;
                    break;
                case 'warning':
                    summary.warningCount++;
                    break;
                case 'error':
                    summary.errorCount++;
                    summary.criticalIssues.push(test.name);
                    break;
            }
        });
        
        // 全体ステータス判定
        if (summary.errorCount === 0) {
            summary.overallStatus = summary.warningCount === 0 ? 'excellent' : 'good';
        } else if (summary.errorCount <= 1) {
            summary.overallStatus = 'warning';
        } else {
            summary.overallStatus = 'critical';
        }
        
        return summary;
    }
    
    generateRecommendations(tests) {
        const recommendations = [];
        
        // Ajax通信の問題
        if (tests.ajax?.status === 'error') {
            recommendations.push({
                priority: 'high',
                issue: 'Ajax通信エラー',
                solution: 'kicho_ajax_handler_ultimate.phpのパスとアクセス権限を確認してください'
            });
        }
        
        // MFインポートの問題
        if (tests.mfImport?.status === 'error') {
            recommendations.push({
                priority: 'high', 
                issue: 'MFインポート失敗',
                solution: 'PHPエラーログを確認し、データベース接続設定を見直してください'
            });
        }
        
        // データ表示の問題
        if (tests.dataDisplay?.status === 'error') {
            recommendations.push({
                priority: 'medium',
                issue: 'データ表示要素不足',
                solution: 'HTMLテンプレートに必要なdata-*属性とID要素を追加してください'
            });
        }
        
        // ブラウザ互換性の問題
        if (tests.browserEnv?.details?.supports) {
            const unsupported = Object.entries(tests.browserEnv.details.supports)
                .filter(([feature, supported]) => !supported)
                .map(([feature]) => feature);
                
            if (unsupported.length > 0) {
                recommendations.push({
                    priority: 'low',
                    issue: `ブラウザ機能未サポート: ${unsupported.join(', ')}`,
                    solution: 'モダンブラウザへのアップデートを推奨します'
                });
            }
        }
        
        return recommendations;
    }
    
    displayAnalysisResults(results) {
        // コンソール表示
        console.log('\n🔍 MFデータ完全分析結果:');
        console.log('='.repeat(50));
        console.log(`📊 総合ステータス: ${results.summary.overallStatus.toUpperCase()}`);
        console.log(`✅ 成功: ${results.summary.successCount}件`);
        console.log(`⚠️ 警告: ${results.summary.warningCount}件`);
        console.log(`❌ エラー: ${results.summary.errorCount}件`);
        
        if (results.summary.criticalIssues.length > 0) {
            console.log(`🚨 重要な問題: ${results.summary.criticalIssues.join(', ')}`);
        }
        
        console.log('\n📋 推奨事項:');
        results.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.issue}`);
            console.log(`   解決策: ${rec.solution}`);
        });
        
        // ブラウザ通知表示
        this.showAnalysisNotification(results.summary);
    }
    
    showAnalysisNotification(summary) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: ${this.getStatusColor(summary.overallStatus)};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 400px;
            cursor: pointer;
        `;
        
        notification.innerHTML = `
            <h4 style="margin: 0 0 8px 0;">🔍 MFデータ分析完了</h4>
            <div>ステータス: ${summary.overallStatus.toUpperCase()}</div>
            <div>成功: ${summary.successCount} | 警告: ${summary.warningCount} | エラー: ${summary.errorCount}</div>
            <small style="opacity: 0.8;">クリックで閉じる</small>
        `;
        
        document.body.appendChild(notification);
        
        notification.addEventListener('click', () => notification.remove());
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }
    
    // ヘルパー関数
    findElement(selectors) {
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element;
        }
        return null;
    }
    
    getTestStartDate() {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split('T')[0];
    }
    
    getTestEndDate() {
        return new Date().toISOString().split('T')[0];
    }
    
    analyzeDataQuality(transactions) {
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return { quality: 'poor', issues: ['データが空または無効'] };
        }
        
        const quality = {
            quality: 'good',
            issues: [],
            metrics: {
                totalCount: transactions.length,
                withDescription: 0,
                withAmount: 0,
                withDate: 0,
                withAccount: 0
            }
        };
        
        transactions.forEach(t => {
            if (t.description) quality.metrics.withDescription++;
            if (t.amount !== undefined) quality.metrics.withAmount++;
            if (t.transaction_date) quality.metrics.withDate++;
            if (t.debit_account) quality.metrics.withAccount++;
        });
        
        const completeness = (
            quality.metrics.withDescription + 
            quality.metrics.withAmount + 
            quality.metrics.withDate + 
            quality.metrics.withAccount
        ) / (transactions.length * 4);
        
        if (completeness < 0.5) {
            quality.quality = 'poor';
            quality.issues.push('データの完全性が低い');
        } else if (completeness < 0.8) {
            quality.quality = 'fair';
            quality.issues.push('一部データが不完全');
        }
        
        return quality;
    }
    
    detectNetworkIssues() {
        return {
            onlineStatus: navigator.onLine,
            connectionType: navigator.connection?.effectiveType || 'unknown',
            lastFailedRequest: this.getLastFailedRequest()
        };
    }
    
    estimatePHPConfig() {
        return {
            maxExecutionTime: 'unknown',
            memoryLimit: 'unknown',
            errorReporting: 'unknown',
            note: 'PHP設定はサーバーサイドで確認が必要'
        };
    }
    
    getLastFailedRequest() {
        // 実装: 最後に失敗したリクエストの情報
        return null;
    }
    
    getStatusColor(status) {
        const colors = {
            excellent: '#4caf50',
            good: '#8bc34a',
            warning: '#ff9800',
            critical: '#f44336'
        };
        return colors[status] || '#2196f3';
    }
}

// グローバル関数として公開
window.debugMFData = function() {
    const debugger = new MFDataDebugger();
    return debugger.performCompleteAnalysis();
};

window.quickMFCheck = function() {
    console.log('🔍 MFデータ簡易チェック');
    
    const checks = {
        ajaxHandler: document.querySelector('[data-action="execute-mf-import"]') ? '✅' : '❌',
        dataContainer: document.querySelector('#mf-data-container, .mf-data-container') ? '✅' : '❌',
        jsSystem: window.NAGANO3_KICHO ? '✅' : '❌',
        dataManager: window.NAGANO3_KICHO?.dataDisplayManager ? '✅' : '❌'
    };
    
    console.log('簡易チェック結果:', checks);
    
    const allOk = Object.values(checks).every(status => status === '✅');
    console.log(`総合判定: ${allOk ? '✅ OK' : '❌ 問題あり'}`);
    
    return checks;
};

console.log('🔍 MFデータデバッグツール読み込み完了');
console.log('実行: debugMFData() - 完全分析');
console.log('実行: quickMFCheck() - 簡易チェック');
