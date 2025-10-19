
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
 * 🔸 🗄️ データベース操作モジュール - CAIDS統合版
 * CRUD操作・検索・データ分析機能
 */

class DatabaseModule {
    constructor() {
        this.localData = new Map(); // デモ用ローカルストレージ
        this.queryHistory = [];
        this.connectionPool = new Map();
        this.transactionLog = [];
        
        // CAIDS量子化Hooks適用
        this.hooks = {
            create: '🔸 ➕ データ作成_h',
            read: '🔸 👁️ データ読込_h',
            update: '🔸 ✏️ データ更新_h',
            delete: '🔸 🗑️ データ削除_h',
            search: '🔸 🔍 検索_h',
            validate: '🔸 ✅ 検証_h'
        };
        
        this.initializeDatabase();
    }
    
    initializeDatabase() {
        console.log('🔸 🗄️ データベースモジュール初期化中...');
        
        // デモデータセットアップ
        this.setupDemoData();
        
        // インデックス作成
        this.createIndexes();
        
        // バリデーションルール設定
        this.setupValidationRules();
        
        console.log('✅ データベースモジュール初期化完了');
    }
    
    setupDemoData() {
        // サンプルユーザーデータ
        const sampleUsers = [
            { id: 1, name: '田中太郎', email: 'tanaka@example.com', role: 'admin', created_at: '2024-01-01' },
            { id: 2, name: '佐藤花子', email: 'sato@example.com', role: 'user', created_at: '2024-01-15' },
            { id: 3, name: '鈴木一郎', email: 'suzuki@example.com', role: 'user', created_at: '2024-02-01' },
            { id: 4, name: '山田美咲', email: 'yamada@example.com', role: 'editor', created_at: '2024-02-15' },
            { id: 5, name: '渡辺健太', email: 'watanabe@example.com', role: 'user', created_at: '2024-03-01' }
        ];
        
        // サンプル商品データ
        const sampleProducts = [
            { id: 1, name: 'ノートパソコン', price: 89800, category: 'electronics', stock: 15 },
            { id: 2, name: 'ワイヤレスマウス', price: 2980, category: 'electronics', stock: 50 },
            { id: 3, name: 'コーヒーメーカー', price: 12800, category: 'home', stock: 8 },
            { id: 4, name: 'ビジネス書籍', price: 1580, category: 'books', stock: 25 },
            { id: 5, name: 'スマートウォッチ', price: 35900, category: 'electronics', stock: 12 }
        ];
        
        this.localData.set('users', sampleUsers);
        this.localData.set('products', sampleProducts);
        
        console.log('🔸 📊 デモデータセットアップ完了');
    }
    
    createIndexes() {
        // 検索性能向上のためのインデックス（デモ実装）
        this.indexes = {
            users: {
                email: new Map(),
                role: new Map()
            },
            products: {
                category: new Map(),
                price_range: new Map()
            }
        };
        
        console.log('🔸 📇 インデックス作成完了');
    }
    
    setupValidationRules() {
        this.validationRules = {
            users: {
                name: { required: true, minLength: 2, maxLength: 50 },
                email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
                role: { required: true, enum: ['admin', 'editor', 'user'] }
            },
            products: {
                name: { required: true, minLength: 1, maxLength: 100 },
                price: { required: true, type: 'number', min: 0 },
                category: { required: true, enum: ['electronics', 'home', 'books', 'clothing'] },
                stock: { required: true, type: 'number', min: 0 }
            }
        };
        
        console.log('🔸 ✅ バリデーションルール設定完了');
    }
    
    // CREATE操作
    async createRecord(table, data) {
        const startTime = Date.now();
        
        try {
            console.log(`🔸 ➕ データ作成開始: ${table}`);
            
            // バリデーション
            const validation = this.validateData(table, data);
            if (!validation.valid) {
                throw new Error(`バリデーションエラー: ${validation.errors.join(', ')}`);
            }
            
            // 新しいIDを生成
            const existingData = this.localData.get(table) || [];
            const newId = Math.max(...existingData.map(item => item.id || 0), 0) + 1;
            
            // タイムスタンプ追加
            const newRecord = {
                ...data,
                id: newId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // データ保存
            existingData.push(newRecord);
            this.localData.set(table, existingData);
            
            // インデックス更新
            this.updateIndexes(table, newRecord, 'create');
            
            // トランザクションログ
            this.logTransaction('CREATE', table, newRecord.id, newRecord);
            
            const responseTime = Date.now() - startTime;
            this.logDatabaseSuccess('create', table, responseTime);
            
            this.displayCreateResult(table, newRecord);
            
            return {
                success: true,
                data: newRecord,
                message: `${table}にレコードを作成しました`
            };
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.logDatabaseError('create', table, error, responseTime);
            throw error;
        }
    }
    
    // READ操作
    async readRecords(table, options = {}) {
        const startTime = Date.now();
        
        try {
            console.log(`🔸 👁️ データ読込開始: ${table}`);
            
            let data = this.localData.get(table) || [];
            
            // フィルタリング
            if (options.filter) {
                data = this.applyFilters(data, options.filter);
            }
            
            // ソート
            if (options.sort) {
                data = this.applySorting(data, options.sort);
            }
            
            const responseTime = Date.now() - startTime;
            this.logDatabaseSuccess('read', table, responseTime);
            
            this.displayReadResults(table, data);
            
            return {
                success: true,
                data: data,
                count: data.length
            };
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.logDatabaseError('read', table, error, responseTime);
            throw error;
        }
    }
    
    // 検索機能
    async searchRecords(table, query, options = {}) {
        const startTime = Date.now();
        
        try {
            console.log(`🔸 🔍 検索開始: ${table} - "${query}"`);
            
            const data = this.localData.get(table) || [];
            const searchFields = options.fields || Object.keys(data[0] || {});
            
            // 検索実行
            const results = data.filter(record => {
                return searchFields.some(field => {
                    const value = record[field];
                    if (typeof value === 'string') {
                        return value.toLowerCase().includes(query.toLowerCase());
                    } else if (typeof value === 'number') {
                        return value.toString().includes(query);
                    }
                    return false;
                });
            });
            
            const responseTime = Date.now() - startTime;
            this.logDatabaseSuccess('search', table, responseTime);
            
            this.displaySearchResults(table, results, query);
            
            return {
                success: true,
                data: results,
                query: query,
                resultCount: results.length,
                searchFields: searchFields
            };
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.logDatabaseError('search', table, error, responseTime);
            throw error;
        }
    }
    
    // データ分析機能
    async analyzeData(table, analysisType = 'summary') {
        const startTime = Date.now();
        
        try {
            console.log(`🔸 📊 データ分析開始: ${table} - ${analysisType}`);
            
            const data = this.localData.get(table) || [];
            let analysisResult = {};
            
            switch (analysisType) {
                case 'summary':
                    analysisResult = this.generateSummaryAnalysis(data);
                    break;
                case 'statistics':
                    analysisResult = this.generateStatisticalAnalysis(data);
                    break;
                default:
                    analysisResult = this.generateSummaryAnalysis(data);
            }
            
            const responseTime = Date.now() - startTime;
            this.logDatabaseSuccess('analyze', table, responseTime);
            
            this.displayAnalysisResults(table, analysisResult, analysisType);
            
            return {
                success: true,
                analysis: analysisResult,
                type: analysisType,
                recordCount: data.length
            };
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.logDatabaseError('analyze', table, error, responseTime);
            throw error;
        }
    }
    
    // データバリデーション
    validateData(table, data, isPartialUpdate = false) {
        const rules = this.validationRules[table];
        if (!rules) {
            return { valid: true, errors: [] };
        }
        
        const errors = [];
        
        for (const [field, rule] of Object.entries(rules)) {
            const value = data[field];
            
            // 必須フィールドチェック
            if (rule.required && !isPartialUpdate && (value === undefined || value === null || value === '')) {
                errors.push(`${field}は必須です`);
                continue;
            }
            
            // 値が存在する場合のみバリデーション実行
            if (value !== undefined && value !== null && value !== '') {
                // 型チェック
                if (rule.type === 'number' && typeof value !== 'number') {
                    errors.push(`${field}は数値である必要があります`);
                }
                
                // 文字列長チェック
                if (typeof value === 'string') {
                    if (rule.minLength && value.length < rule.minLength) {
                        errors.push(`${field}は${rule.minLength}文字以上である必要があります`);
                    }
                    if (rule.maxLength && value.length > rule.maxLength) {
                        errors.push(`${field}は${rule.maxLength}文字以下である必要があります`);
                    }
                }
                
                // パターンマッチング
                if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
                    errors.push(`${field}の形式が正しくありません`);
                }
                
                // 列挙値チェック
                if (rule.enum && !rule.enum.includes(value)) {
                    errors.push(`${field}は${rule.enum.join(', ')}のいずれかである必要があります`);
                }
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    // フィルタリング
    applyFilters(data, filters) {
        return data.filter(record => {
            return Object.entries(filters).every(([field, condition]) => {
                const value = record[field];
                
                if (typeof condition === 'object') {
                    // 範囲フィルタ
                    if (condition.min !== undefined && value < condition.min) return false;
                    if (condition.max !== undefined && value > condition.max) return false;
                    if (condition.equals !== undefined && value !== condition.equals) return false;
                    if (condition.contains && !value.toLowerCase().includes(condition.contains.toLowerCase())) return false;
                } else {
                    // 完全一致
                    if (value !== condition) return false;
                }
                
                return true;
            });
        });
    }
    
    // データ分析メソッド
    generateSummaryAnalysis(data) {
        if (data.length === 0) {
            return { message: 'データがありません' };
        }
        
        const fields = Object.keys(data[0]);
        const summary = {
            totalRecords: data.length,
            fields: fields.length,
            fieldTypes: {},
            nullCounts: {},
            uniqueCounts: {}
        };
        
        fields.forEach(field => {
            const values = data.map(record => record[field]);
            const nonNullValues = values.filter(v => v !== null && v !== undefined);
            
            summary.fieldTypes[field] = typeof nonNullValues[0];
            summary.nullCounts[field] = values.length - nonNullValues.length;
            summary.uniqueCounts[field] = new Set(nonNullValues).size;
        });
        
        return summary;
    }
    
    generateStatisticalAnalysis(data) {
        const numericFields = Object.keys(data[0] || {}).filter(field => 
            typeof data[0][field] === 'number'
        );
        
        const statistics = {};
        
        numericFields.forEach(field => {
            const values = data.map(record => record[field]).filter(v => !isNaN(v));
            
            if (values.length > 0) {
                values.sort((a, b) => a - b);
                
                const sum = values.reduce((acc, val) => acc + val, 0);
                const mean = sum / values.length;
                const median = values.length % 2 === 0 
                    ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
                    : values[Math.floor(values.length / 2)];
                
                statistics[field] = {
                    count: values.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    mean: Math.round(mean * 100) / 100,
                    median: median,
                    sum: sum
                };
            }
        });
        
        return statistics;
    }
    
    // インデックス更新
    updateIndexes(table, record, operation) {
        // 簡略実装（実際にはより複雑なインデックス管理が必要）
        if (operation === 'create' || operation === 'update') {
            if (table === 'users' && record.email) {
                this.indexes.users.email.set(record.email, record.id);
            }
        } else if (operation === 'delete') {
            if (table === 'users' && record.email) {
                this.indexes.users.email.delete(record.email);
            }
        }
    }
    
    // トランザクションログ
    logTransaction(operation, table, id, newData, oldData = null) {
        const transaction = {
            id: this.transactionLog.length + 1,
            operation: operation,
            table: table,
            recordId: id,
            timestamp: new Date().toISOString(),
            newData: newData,
            oldData: oldData
        };
        
        this.transactionLog.push(transaction);
        
        // 最新100件のみ保持
        if (this.transactionLog.length > 100) {
            this.transactionLog.shift();
        }
    }
    
    // 表示メソッド
    displayCreateResult(table, record) {
        this.updateDataTable();
        this.showSuccess(`新しい${table}レコードを作成`, `ID: ${record.id}`);
    }
    
    displayReadResults(table, data) {
        this.updateDataTable(data);
    }
    
    displaySearchResults(table, results, query) {
        this.updateDataTable(results);
        this.showInfo(`検索結果: "${query}"`, `${results.length}件見つかりました`);
    }
    
    displayAnalysisResults(table, analysis, type) {
        const container = document.getElementById('dataStats') || this.createStatsContainer();
        
        let analysisHTML = `<h4>📊 ${table}データ分析 (${type})</h4>`;
        
        if (type === 'summary') {
            analysisHTML += `
                <div class="analysis-summary">
                    <div class="stat-item">総レコード数: ${analysis.totalRecords}</div>
                    <div class="stat-item">フィールド数: ${analysis.fields}</div>
                    <div class="stat-item">ユニーク値数: ${JSON.stringify(analysis.uniqueCounts)}</div>
                </div>
            `;
        } else if (type === 'statistics') {
            const statsHTML = Object.entries(analysis).map(([field, stats]) => `
                <div class="field-stats">
                    <h5>${field}</h5>
                    <div class="stats-grid">
                        <div>平均: ${stats.mean}</div>
                        <div>中央値: ${stats.median}</div>
                        <div>最小: ${stats.min}</div>
                        <div>最大: ${stats.max}</div>
                    </div>
                </div>
            `).join('');
            
            analysisHTML += `<div class="statistical-analysis">${statsHTML}</div>`;
        }
        
        container.innerHTML = analysisHTML;
    }
    
    updateDataTable(data = null) {
        const table = document.getElementById('dataTable');
        if (!table) return;
        
        const currentTable = document.querySelector('.table-selector')?.value || 'users';
        const displayData = data || this.localData.get(currentTable) || [];
        
        if (displayData.length === 0) {
            table.innerHTML = '<div class="no-data">データがありません</div>';
            return;
        }
        
        const headers = Object.keys(displayData[0]);
        
        let tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        ${headers.map(header => `<th>${header}</th>`).join('')}
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        displayData.forEach(record => {
            tableHTML += `
                <tr>
                    ${headers.map(header => {
                        const value = record[header];
                        const displayValue = this.escapeHtml(String(value));
                        return `<td>${displayValue}</td>`;
                    }).join('')}
                    <td class="action-buttons">
                        <button onclick="database.editRecord('${currentTable}', ${record.id})" class="btn btn-sm btn-secondary">編集</button>
                        <button onclick="database.deleteRecord('${currentTable}', ${record.id})" class="btn btn-sm btn-danger">削除</button>
                    </td>
                </tr>
            `;
        });
        
        tableHTML += '</tbody></table>';
        table.innerHTML = tableHTML;
    }
    
    // ユーティリティメソッド
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    createStatsContainer() {
        const container = document.createElement('div');
        container.id = 'dataStats';
        container.className = 'data-stats-container';
        
        const targetArea = document.querySelector('.database-crud') || document.body;
        targetArea.appendChild(container);
        
        return container;
    }
    
    // CAIDS統合ログメソッド
    logDatabaseSuccess(operation, table, responseTime) {
        if (window.demoSystem) {
            window.demoSystem.log('database', 'success', `[${operation}] ${table} 成功 ${responseTime}ms`);
        }
    }
    
    logDatabaseError(operation, table, error, responseTime) {
        if (window.demoSystem) {
            window.demoSystem.log('database', 'error', `[${operation}] ${table} エラー: ${error.message}`);
        }
    }
    
    showSuccess(message, details) {
        if (window.demoSystem) {
            window.demoSystem.log('database', 'success', `${message} ${details || ''}`);
        }
        console.log('✅', message, details);
    }
    
    showError(message, details) {
        if (window.demoSystem) {
            window.demoSystem.log('database', 'error', `${message} ${details || ''}`);
        }
        console.error('❌', message, details);
    }
    
    showInfo(message, details) {
        if (window.demoSystem) {
            window.demoSystem.log('database', 'info', `${message} ${details || ''}`);
        }
        console.log('ℹ️', message, details);
    }
    
    // 公開メソッド（フォームから呼び出し）
    async handleCreateForm(formData) {
        const table = formData.get('table') || 'users';
        const data = {};
        
        // フォームデータを適切な型に変換
        for (const [key, value] of formData.entries()) {
            if (key !== 'table') {
                // 数値フィールドの変換
                if (['price', 'stock', 'age'].includes(key)) {
                    data[key] = parseFloat(value) || 0;
                } else {
                    data[key] = value;
                }
            }
        }
        
        return await this.createRecord(table, data);
    }
    
    async handleSearchForm(formData) {
        const table = formData.get('table') || 'users';
        const query = formData.get('query') || '';
        const fields = formData.get('fields')?.split(',') || [];
        
        return await this.searchRecords(table, query, { fields });
    }
    
    // テスト用メソッド
    async runTests() {
        const results = {
            create: await this.testCreateOperation(),
            read: await this.testReadOperation(),
            search: await this.testSearchOperation(),
            analysis: await this.testAnalysisOperation()
        };
        
        console.log('🔸 🗄️ データベースCRUDテスト結果:', results);
        return results;
    }
    
    async testCreateOperation() {
        try {
            const testData = {
                name: 'テストユーザー',
                email: 'test@example.com',
                role: 'user'
            };
            
            const result = await this.createRecord('users', testData);
            return { success: true, message: 'CREATE操作テスト成功' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testReadOperation() {
        try {
            const result = await this.readRecords('users');
            return { success: true, message: `READ操作テスト成功 (${result.count}件)` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testSearchOperation() {
        try {
            const result = await this.searchRecords('users', 'test');
            return { success: true, message: `検索テスト成功 (${result.resultCount}件)` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async testAnalysisOperation() {
        try {
            const result = await this.analyzeData('users', 'summary');
            return { success: true, message: `分析テスト成功` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// グローバル使用可能に
window.DatabaseModule = DatabaseModule;

// インスタンス作成
window.database = new DatabaseModule();

console.log('🔸 🗄️ データベース操作モジュール読み込み完了');