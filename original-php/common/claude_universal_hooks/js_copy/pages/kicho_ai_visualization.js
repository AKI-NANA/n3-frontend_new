
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
 * 📊 KICHO AI学習結果視覚化システム
 * common/js/pages/kicho_ai_visualization.js
 * 
 * ✅ AI学習結果の動的表示
 * ✅ 精度・信頼度グラフ生成
 * ✅ 生成ルール表示
 * ✅ 学習履歴管理
 * 
 * @version 5.0.0-AI-VISUALIZATION
 */

// KichoUIController に AI視覚化機能を拡張
if (window.NAGANO3_KICHO && window.NAGANO3_KICHO.uiController) {
    
    // AI学習結果表示機能を追加
    window.NAGANO3_KICHO.uiController.handleAILearningComplete = function(result) {
        console.log('🎨 AI学習結果表示開始:', result);
        
        try {
            // 1. 入力フィールドクリア
            this.clearAIInput(result.clear_input);
            
            // 2. 学習結果表示エリア更新
            this.displayAIResults(result);
            
            // 3. 視覚化グラフ生成
            this.generateVisualizationCharts(result.visualization);
            
            // 4. 生成ルール表示
            this.displayGeneratedRules(result.rules);
            
            // 5. AI学習履歴更新
            this.updateAIHistory(result);
            
            // 6. 成功通知
            this.showNotification(
                `AI学習完了 (精度: ${(result.accuracy * 100).toFixed(1)}%, 処理時間: ${result.processing_time}ms)`,
                'success'
            );
            
            console.log('✅ AI学習結果表示完了');
            
        } catch (error) {
            console.error('❌ AI結果表示エラー:', error);
            this.showNotification('AI結果の表示でエラーが発生しました', 'error');
        }
    };
    
    // AI入力フィールドクリア
    window.NAGANO3_KICHO.uiController.clearAIInput = function(selector) {
        const inputs = document.querySelectorAll(selector || '#aiTextInput, [data-ai-input]');
        
        inputs.forEach(input => {
            if (input) {
                input.value = '';
                
                // 成功時の視覚フィードバック
                input.style.borderColor = '#4caf50';
                input.style.backgroundColor = '#f8fff8';
                
                setTimeout(() => {
                    input.style.borderColor = '';
                    input.style.backgroundColor = '';
                }, 2000);
                
                // フォーカス外す
                input.blur();
            }
        });
    };
    
    // AI学習結果表示
    window.NAGANO3_KICHO.uiController.displayAIResults = function(result) {
        // 結果表示エリア取得・作成
        let resultsContainer = document.getElementById('ai-results-container');
        
        if (!resultsContainer) {
            resultsContainer = this.createAIResultsContainer();
        }
        
        // 新しい結果アイテム作成
        const resultItem = document.createElement('div');
        resultItem.className = 'ai-result-item';
        resultItem.setAttribute('data-session-id', result.session_id);
        
        resultItem.innerHTML = `
            <div class="ai-result-header">
                <div class="ai-session-info">
                    <span class="ai-session-id">セッション: ${result.session_id}</span>
                    <span class="ai-timestamp">${new Date().toLocaleString()}</span>
                </div>
                <div class="ai-metrics">
                    <span class="ai-accuracy">精度: ${(result.accuracy * 100).toFixed(1)}%</span>
                    <span class="ai-confidence">信頼度: ${(result.confidence * 100).toFixed(1)}%</span>
                    <span class="ai-processing-time">処理時間: ${result.processing_time}ms</span>
                </div>
            </div>
            
            <div class="ai-result-content">
                <div class="ai-charts-container">
                    <div id="accuracy-chart-${result.session_id}" class="ai-chart accuracy-chart"></div>
                    <div id="confidence-chart-${result.session_id}" class="ai-chart confidence-chart"></div>
                    <div id="processing-chart-${result.session_id}" class="ai-chart processing-chart"></div>
                </div>
                
                <div class="ai-details">
                    <div class="ai-source-badge ai-source-${result.ai_source}">
                        ${result.ai_source === 'fastapi' ? '🤖 FastAPI' : '🔄 シミュレーション'}
                    </div>
                    <div class="ai-rules-count">
                        ${result.rules_generated} 個のルールを生成
                    </div>
                </div>
            </div>
            
            <div class="ai-result-actions">
                <button class="ai-action-btn" data-action="view-rules" data-session-id="${result.session_id}">
                    ルール表示
                </button>
                <button class="ai-action-btn" data-action="apply-rules" data-session-id="${result.session_id}">
                    ルール適用
                </button>
                <button class="ai-action-btn" data-action="export-result" data-session-id="${result.session_id}">
                    結果エクスポート
                </button>
            </div>
        `;
        
        // アニメーション付きで追加
        resultItem.style.opacity = '0';
        resultItem.style.transform = 'translateY(-20px)';
        
        resultsContainer.insertBefore(resultItem, resultsContainer.firstChild);
        
        requestAnimationFrame(() => {
            resultItem.style.transition = 'all 0.3s ease';
            resultItem.style.opacity = '1';
            resultItem.style.transform = 'translateY(0)';
        });
        
        // 古い結果は制限（最新10件のみ保持）
        const allResults = resultsContainer.querySelectorAll('.ai-result-item');
        if (allResults.length > 10) {
            for (let i = 10; i < allResults.length; i++) {
                allResults[i].remove();
            }
        }
    };
    
    // AI結果表示コンテナ作成
    window.NAGANO3_KICHO.uiController.createAIResultsContainer = function() {
        // AIセクション検索
        const aiSection = document.querySelector('.kicho__card h3:contains("AI"), [data-section="ai-learning"]') ||
                         document.querySelector('.ai-learning-section');
        
        if (!aiSection) {
            console.warn('⚠️ AIセクションが見つかりません');
            return null;
        }
        
        // コンテナ作成
        const container = document.createElement('div');
        container.id = 'ai-results-container';
        container.className = 'ai-results-container';
        container.style.cssText = `
            margin-top: 20px;
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background: #fafafa;
        `;
        
        // AIセクションの下に追加
        const parentCard = aiSection.closest('.kicho__card');
        if (parentCard) {
            parentCard.appendChild(container);
        }
        
        return container;
    };
    
    // 視覚化グラフ生成
    window.NAGANO3_KICHO.uiController.generateVisualizationCharts = function(visualization) {
        if (!visualization) return;
        
        const sessionId = visualization.generated_at.replace(/[^0-9]/g, '');
        
        // 精度チャート（円形）
        if (visualization.accuracy) {
            this.createRadialChart(
                `accuracy-chart-${sessionId}`,
                visualization.accuracy
            );
        }
        
        // 信頼度チャート（バー）
        if (visualization.confidence) {
            this.createBarChart(
                `confidence-chart-${sessionId}`,
                visualization.confidence
            );
        }
        
        // 処理時間チャート（インジケーター）
        if (visualization.processing_time) {
            this.createTimeChart(
                `processing-chart-${sessionId}`,
                visualization.processing_time
            );
        }
    };
    
    // 円形チャート作成（精度用）
    window.NAGANO3_KICHO.uiController.createRadialChart = function(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const percentage = data.value;
        const color = data.color;
        
        container.innerHTML = `
            <div class="radial-chart" style="
                width: 80px; 
                height: 80px; 
                border-radius: 50%;
                background: conic-gradient(
                    ${color} 0deg ${percentage * 3.6}deg, 
                    #e0e0e0 ${percentage * 3.6}deg 360deg
                );
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            ">
                <div style="
                    width: 60px; 
                    height: 60px; 
                    background: white; 
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 12px;
                ">${percentage}%</div>
            </div>
            <div class="chart-label">${data.label}</div>
        `;
    };
    
    // バーチャート作成（信頼度用）
    window.NAGANO3_KICHO.uiController.createBarChart = function(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const percentage = data.value;
        const color = data.color;
        
        container.innerHTML = `
            <div class="bar-chart" style="
                width: 100px;
                height: 20px;
                background: #e0e0e0;
                border-radius: 10px;
                overflow: hidden;
                position: relative;
            ">
                <div style="
                    width: ${percentage}%;
                    height: 100%;
                    background: ${color};
                    transition: width 0.5s ease;
                    border-radius: 10px;
                "></div>
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: bold;
                    color: white;
                    text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
                ">${percentage}%</div>
            </div>
            <div class="chart-label">${data.label}</div>
        `;
    };
    
    // 時間チャート作成
    window.NAGANO3_KICHO.uiController.createTimeChart = function(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const value = data.value;
        const color = data.color;
        const unit = data.unit;
        
        container.innerHTML = `
            <div class="time-chart" style="
                padding: 10px;
                background: ${color};
                color: white;
                border-radius: 6px;
                text-align: center;
                min-width: 80px;
            ">
                <div style="font-weight: bold; font-size: 14px;">
                    ${value}${unit}
                </div>
            </div>
            <div class="chart-label">${data.label}</div>
        `;
    };
    
    // 生成ルール表示
    window.NAGANO3_KICHO.uiController.displayGeneratedRules = function(rules) {
        if (!rules || rules.length === 0) return;
        
        console.log('📋 生成ルール表示:', rules);
        
        // ルール表示エリア取得・作成
        let rulesContainer = document.getElementById('generated-rules-container');
        
        if (!rulesContainer) {
            rulesContainer = this.createGeneratedRulesContainer();
        }
        
        // ルールリスト生成
        const rulesList = document.createElement('div');
        rulesList.className = 'generated-rules-list';
        
        rules.forEach((rule, index) => {
            const ruleItem = document.createElement('div');
            ruleItem.className = 'rule-item';
            ruleItem.innerHTML = `
                <div class="rule-header">
                    <span class="rule-name">${rule.rule_name}</span>
                    <span class="rule-confidence">${(rule.confidence_threshold * 100).toFixed(0)}%</span>
                </div>
                <div class="rule-details">
                    <span class="rule-pattern">${rule.rule_pattern}</span>
                    →
                    <span class="rule-category">${rule.target_category}</span>
                </div>
            `;
            
            // アニメーション遅延
            ruleItem.style.opacity = '0';
            ruleItem.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                ruleItem.style.transition = 'all 0.3s ease';
                ruleItem.style.opacity = '1';
                ruleItem.style.transform = 'translateX(0)';
            }, index * 100);
            
            rulesList.appendChild(ruleItem);
        });
        
        rulesContainer.appendChild(rulesList);
    };
    
    // 生成ルールコンテナ作成
    window.NAGANO3_KICHO.uiController.createGeneratedRulesContainer = function() {
        const container = document.createElement('div');
        container.id = 'generated-rules-container';
        container.className = 'generated-rules-container';
        container.style.cssText = `
            margin-top: 15px;
            padding: 15px;
            border: 1px solid #4caf50;
            border-radius: 8px;
            background: #f8fff8;
        `;
        
        container.innerHTML = `
            <h4 style="margin: 0 0 10px 0; color: #4caf50;">
                🎯 生成されたルール
            </h4>
        `;
        
        // AI結果コンテナに追加
        const aiResults = document.getElementById('ai-results-container');
        if (aiResults) {
            aiResults.appendChild(container);
        }
        
        return container;
    };
    
    // AI学習履歴更新
    window.NAGANO3_KICHO.uiController.updateAIHistory = function(result) {
        // 履歴テーブル取得
        const historyTable = document.querySelector('#ai-history-table tbody, [data-ai-history] tbody');
        
        if (!historyTable) {
            console.warn('⚠️ AI履歴テーブルが見つかりません');
            return;
        }
        
        // 新しい履歴行作成
        const historyRow = document.createElement('tr');
        historyRow.innerHTML = `
            <td>${result.session_id}</td>
            <td>${new Date().toLocaleString()}</td>
            <td><span class="status-badge status-completed">完了</span></td>
            <td>${(result.accuracy * 100).toFixed(1)}%</td>
            <td>${result.rules_generated}</td>
        `;
        
        // アニメーション付きで先頭に追加
        historyRow.style.backgroundColor = '#e8f5e8';
        historyTable.insertBefore(historyRow, historyTable.firstChild);
        
        // 背景色を元に戻す
        setTimeout(() => {
            historyRow.style.backgroundColor = '';
        }, 2000);
        
        // 古い履歴行は制限（最新20件のみ）
        const allRows = historyTable.querySelectorAll('tr');
        if (allRows.length > 20) {
            for (let i = 20; i < allRows.length; i++) {
                allRows[i].remove();
            }
        }
    };
    
    // Ajax Manager の executeUIUpdate を拡張
    const originalExecuteUIUpdate = window.NAGANO3_KICHO.ajaxManager.executeUIUpdate;
    
    window.NAGANO3_KICHO.ajaxManager.executeUIUpdate = function(uiUpdate) {
        // 既存のUI更新処理
        originalExecuteUIUpdate.call(this, uiUpdate);
        
        // AI学習完了処理
        if (uiUpdate.action === 'ai_learning_complete') {
            window.NAGANO3_KICHO.uiController.handleAILearningComplete(uiUpdate);
        }
    };
    
    console.log('✅ AI視覚化システム初期化完了');
    
} else {
    console.error('❌ NAGANO3_KICHO.uiController が見つかりません - AI視覚化機能は無効');
}

/**
 * ✅ KICHO AI学習結果視覚化システム完成
 * 
 * 🎯 実装完了機能:
 * ✅ AI学習結果の動的表示
 * ✅ 精度・信頼度・処理時間のグラフ生成
 * ✅ 生成ルールの自動表示
 * ✅ 学習履歴の自動更新
 * ✅ アニメーション付きUI更新
 * ✅ FastAPI/シミュレーション判定表示
 * 
 * 🎨 視覚化要素:
 * ✅ 円形チャート（精度）
 * ✅ バーチャート（信頼度）
 * ✅ 時間インジケーター（処理時間）
 * ✅ ルール一覧表示
 * ✅ 学習履歴テーブル
 * 
 * 🔄 連携フロー:
 * AI学習ボタン → Ajax送信 → AI処理 → 結果受信 → 
 * 視覚化生成 → アニメーション表示 → 履歴更新
 */