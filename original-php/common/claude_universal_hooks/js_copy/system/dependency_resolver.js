
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
 * NAGANO-3 Dependency Resolver System【完全実装版】
 * ファイル: common/js/system/dependency_resolver.js
 * 
 * 🔗 依存関係解析・循環依存検出・最適な読み込み順序決定
 * ✅ 45ファイルの依存関係管理・トポロジカルソート・動的解決
 * 
 * @version 1.0.0-complete
 */

"use strict";

console.log('🔗 NAGANO-3 Dependency Resolver System 読み込み開始');

// =====================================
// 🎯 DependencyResolver メインクラス
// =====================================

class DependencyResolver {
    constructor() {
        this.dependencies = new Map();
        this.resolved = new Set();
        this.resolving = new Set();
        this.graph = new Map();
        this.circularDependencies = [];
        this.loadOrder = [];
        
        // 既知の依存関係マップ
        this.knownDependencies = {
            // Core系（最優先）
            'bootstrap.js': [],
            'ajax.js': ['bootstrap.js'],
            'header.js': ['ajax.js'],
            'sidebar.js': ['header.js'],
            'theme.js': ['bootstrap.js'],
            
            // System系（中優先）
            'error_boundary.js': ['bootstrap.js'],
            'compatibility_layer.js': ['error_boundary.js'],
            'js_module_loader.js': ['compatibility_layer.js'],
            'notification_orchestrator.js': ['js_module_loader.js'],
            'lifecycle_manager.js': ['notification_orchestrator.js'],
            'module_integration_manager.js': ['lifecycle_manager.js'],
            'dependency_resolver.js': ['module_integration_manager.js'],
            'unified_config.js': ['dependency_resolver.js'],
            'performance_monitor.js': ['unified_config.js'],
            
            // Utils系
            'notifications.js': ['bootstrap.js'],
            'file_finder_and_loader.js': ['notifications.js'],
            
            // Components系
            'modal.js': ['theme.js'],
            'dropdown.js': ['modal.js'],
            'tooltip.js': ['dropdown.js'],
            
            // Pages系（最低優先）
            'dashboard.js': ['components'],
            'settings.js': ['dashboard.js'],
            
            // Modules系（独立性重視）
            'juchu': ['core_dependencies'],
            'kicho': ['core_dependencies']
        };
        
        // ファイルタイプ別の優先度
        this.typePriorities = {
            'bootstrap': 1000,  // 最高優先度
            'core': 900,
            'system': 800,
            'utils': 700,
            'components': 600,
            'ui': 500,
            'pages': 400,
            'modules': 300,     // 最低優先度
            'unknown': 100
        };
        
        this.init();
    }
    
    /**
     * 初期化
     */
    init() {
        console.log('🔗 Dependency Resolver 初期化開始');
        
        // 既知の依存関係をグラフに構築
        this.buildDependencyGraph();
        
        console.log('✅ Dependency Resolver 初期化完了');
    }
    
    /**
     * 依存関係グラフ構築
     */
    buildDependencyGraph() {
        console.log('📊 依存関係グラフ構築開始');
        
        // 既知の依存関係をグラフに追加
        Object.entries(this.knownDependencies).forEach(([file, deps]) => {
            this.addDependency(file, deps);
        });
        
        console.log(`✅ 依存関係グラフ構築完了: ${this.graph.size}ノード`);
    }
    
    /**
     * 依存関係追加
     */
    addDependency(file, dependencies) {
        if (!this.graph.has(file)) {
            this.graph.set(file, {
                dependencies: [],
                dependents: [],
                priority: this.calculatePriority(file),
                type: this.getFileType(file),
                status: 'pending'
            });
        }
        
        const node = this.graph.get(file);
        
        // 依存関係を追加
        dependencies.forEach(dep => {
            if (!node.dependencies.includes(dep)) {
                node.dependencies.push(dep);
            }
            
            // 逆方向の依存関係も追加
            if (!this.graph.has(dep)) {
                this.graph.set(dep, {
                    dependencies: [],
                    dependents: [],
                    priority: this.calculatePriority(dep),
                    type: this.getFileType(dep),
                    status: 'pending'
                });
            }
            
            const depNode = this.graph.get(dep);
            if (!depNode.dependents.includes(file)) {
                depNode.dependents.push(file);
            }
        });
    }
    
    /**
     * ファイル優先度計算
     */
    calculatePriority(filename) {
        const lowerName = filename.toLowerCase();
        
        // bootstrap.js は最高優先度
        if (lowerName.includes('bootstrap')) {
            return this.typePriorities.bootstrap;
        }
        
        // ファイルパス/名前から判定
        if (lowerName.includes('core/') || lowerName.includes('_core') || lowerName.includes('core_')) {
            return this.typePriorities.core;
        }
        
        if (lowerName.includes('system/') || lowerName.includes('_system') || lowerName.includes('system_')) {
            return this.typePriorities.system;
        }
        
        if (lowerName.includes('utils/') || lowerName.includes('_utils') || lowerName.includes('util_')) {
            return this.typePriorities.utils;
        }
        
        if (lowerName.includes('components/') || lowerName.includes('_component') || lowerName.includes('component_')) {
            return this.typePriorities.components;
        }
        
        if (lowerName.includes('ui/') || lowerName.includes('_ui') || lowerName.includes('ui_')) {
            return this.typePriorities.ui;
        }
        
        if (lowerName.includes('pages/') || lowerName.includes('_page') || lowerName.includes('page_')) {
            return this.typePriorities.pages;
        }
        
        if (lowerName.includes('modules/') || lowerName.includes('_module') || lowerName.includes('module_')) {
            return this.typePriorities.modules;
        }
        
        return this.typePriorities.unknown;
    }
    
    /**
     * ファイルタイプ取得
     */
    getFileType(filename) {
        const lowerName = filename.toLowerCase();
        
        if (lowerName.includes('bootstrap')) return 'bootstrap';
        if (lowerName.includes('core/')) return 'core';
        if (lowerName.includes('system/')) return 'system';
        if (lowerName.includes('utils/')) return 'utils';
        if (lowerName.includes('components/')) return 'components';
        if (lowerName.includes('ui/')) return 'ui';
        if (lowerName.includes('pages/')) return 'pages';
        if (lowerName.includes('modules/')) return 'modules';
        
        return 'unknown';
    }
    
    /**
     * 依存関係解決（メイン処理）
     */
    async resolveDependencies(fileList) {
        console.log(`🔗 依存関係解決開始: ${fileList.length}ファイル`);
        
        try {
            // 1. ファイルリストを依存関係グラフに追加
            await this.addFileListToGraph(fileList);
            
            // 2. 循環依存検出
            const circularDeps = this.detectCircularDependencies();
            if (circularDeps.length > 0) {
                console.warn('⚠️ 循環依存検出:', circularDeps);
                this.circularDependencies = circularDeps;
                
                // 循環依存の解決試行
                await this.resolveCircularDependencies(circularDeps);
            }
            
            // 3. トポロジカルソート実行
            const sortedFiles = await this.topologicalSort(fileList);
            
            // 4. 読み込み順序最適化
            const optimizedOrder = await this.optimizeLoadOrder(sortedFiles);
            
            this.loadOrder = optimizedOrder;
            
            console.log(`✅ 依存関係解決完了: 最適読み込み順序決定 (${optimizedOrder.length}ファイル)`);
            
            return optimizedOrder;
            
        } catch (error) {
            console.error('❌ 依存関係解決エラー:', error);
            
            // フォールバック: 優先度ベースソート
            return this.fallbackSort(fileList);
        }
    }
    
    /**
     * ファイルリストを依存関係グラフに追加
     */
    async addFileListToGraph(fileList) {
        for (const file of fileList) {
            if (!this.graph.has(file)) {
                // 動的依存関係分析
                const dependencies = await this.analyzeDependencies(file);
                this.addDependency(file, dependencies);
            }
        }
    }
    
    /**
     * 動的依存関係分析
     */
    async analyzeDependencies(filename) {
        const dependencies = [];
        
        try {
            // ファイル内容を取得して依存関係を分析
            const response = await fetch(filename, { method: 'HEAD' });
            if (!response.ok) {
                return dependencies;
            }
            
            // ファイル名パターンベースの推測依存関係
            const inferredDeps = this.inferDependenciesFromFilename(filename);
            dependencies.push(...inferredDeps);
            
        } catch (error) {
            console.warn(`依存関係分析失敗: ${filename}`, error);
        }
        
        return dependencies;
    }
    
    /**
     * ファイル名からの依存関係推測
     */
    inferDependenciesFromFilename(filename) {
        const dependencies = [];
        const lowerName = filename.toLowerCase();
        
        // 基本的な依存関係推測ルール
        
        // すべてのファイルは bootstrap.js に依存
        if (!lowerName.includes('bootstrap')) {
            dependencies.push('bootstrap.js');
        }
        
        // Ajax関連はajax.jsに依存
        if (lowerName.includes('ajax') && !lowerName.includes('ajax.js')) {
            dependencies.push('ajax.js');
        }
        
        // UI関連はtheme.jsに依存
        if ((lowerName.includes('ui') || lowerName.includes('component')) && !lowerName.includes('theme')) {
            dependencies.push('theme.js');
        }
        
        // モジュールは system/ ファイル群に依存
        if (lowerName.includes('modules/')) {
            dependencies.push('error_boundary.js', 'compatibility_layer.js');
        }
        
        // 通知関連は notification に依存
        if (lowerName.includes('notification') && !lowerName.includes('notification_orchestrator')) {
            dependencies.push('notification_orchestrator.js');
        }
        
        return dependencies;
    }
    
    /**
     * 循環依存検出
     */
    detectCircularDependencies() {
        const circularDeps = [];
        const visited = new Set();
        const recursionStack = new Set();
        
        // 各ノードから循環依存を検索
        for (const [file, node] of this.graph) {
            if (!visited.has(file)) {
                const cycle = this.detectCycleFromNode(file, visited, recursionStack, []);
                if (cycle.length > 0) {
                    circularDeps.push(cycle);
                }
            }
        }
        
        return circularDeps;
    }
    
    /**
     * ノードからの循環検出
     */
    detectCycleFromNode(file, visited, recursionStack, path) {
        visited.add(file);
        recursionStack.add(file);
        path.push(file);
        
        const node = this.graph.get(file);
        if (!node) {
            path.pop();
            recursionStack.delete(file);
            return [];
        }
        
        for (const dep of node.dependencies) {
            if (!visited.has(dep)) {
                const cycle = this.detectCycleFromNode(dep, visited, recursionStack, [...path]);
                if (cycle.length > 0) {
                    return cycle;
                }
            } else if (recursionStack.has(dep)) {
                // 循環依存発見
                const cycleStart = path.indexOf(dep);
                return path.slice(cycleStart).concat([dep]);
            }
        }
        
        path.pop();
        recursionStack.delete(file);
        return [];
    }
    
    /**
     * 循環依存解決
     */
    async resolveCircularDependencies(circularDeps) {
        console.log('🔧 循環依存解決開始');
        
        for (const cycle of circularDeps) {
            await this.breakCircularDependency(cycle);
        }
        
        console.log('✅ 循環依存解決完了');
    }
    
    /**
     * 循環依存の切断
     */
    async breakCircularDependency(cycle) {
        console.log(`🔧 循環依存切断: ${cycle.join(' -> ')}`);
        
        // 優先度が最も低いファイルの依存関係を切断
        let lowestPriorityFile = cycle[0];
        let lowestPriority = this.graph.get(cycle[0])?.priority || 0;
        
        for (const file of cycle) {
            const node = this.graph.get(file);
            if (node && node.priority < lowestPriority) {
                lowestPriority = node.priority;
                lowestPriorityFile = file;
            }
        }
        
        // 依存関係を一時的に切断
        const node = this.graph.get(lowestPriorityFile);
        if (node) {
            const cycleIndex = cycle.indexOf(lowestPriorityFile);
            const nextFile = cycle[(cycleIndex + 1) % cycle.length];
            
            const depIndex = node.dependencies.indexOf(nextFile);
            if (depIndex !== -1) {
                node.dependencies.splice(depIndex, 1);
                console.log(`🔧 依存関係切断: ${lowestPriorityFile} -> ${nextFile}`);
                
                // 後で復元するために記録
                if (!node.deferredDependencies) {
                    node.deferredDependencies = [];
                }
                node.deferredDependencies.push(nextFile);
            }
        }
    }
    
    /**
     * トポロジカルソート
     */
    async topologicalSort(fileList) {
        console.log('📊 トポロジカルソート実行');
        
        const sorted = [];
        const visited = new Set();
        const temporary = new Set();
        
        // 各ファイルをソート
        for (const file of fileList) {
            if (!visited.has(file)) {
                await this.topologicalSortVisit(file, visited, temporary, sorted);
            }
        }
        
        // 結果を逆順にして正しい依存順序にする
        sorted.reverse();
        
        console.log(`✅ トポロジカルソート完了: ${sorted.length}ファイル`);
        return sorted;
    }
    
    /**
     * トポロジカルソート訪問
     */
    async topologicalSortVisit(file, visited, temporary, sorted) {
        if (temporary.has(file)) {
            console.warn(`⚠️ 一時的な循環依存検出: ${file}`);
            return;
        }
        
        if (visited.has(file)) {
            return;
        }
        
        temporary.add(file);
        
        const node = this.graph.get(file);
        if (node) {
            // 依存関係を優先度順でソート
            const sortedDeps = node.dependencies.sort((a, b) => {
                const nodeA = this.graph.get(a);
                const nodeB = this.graph.get(b);
                const priorityA = nodeA?.priority || 0;
                const priorityB = nodeB?.priority || 0;
                return priorityB - priorityA; // 高優先度が先
            });
            
            for (const dep of sortedDeps) {
                await this.topologicalSortVisit(dep, visited, temporary, sorted);
            }
        }
        
        temporary.delete(file);
        visited.add(file);
        sorted.push(file);
    }
    
    /**
     * 読み込み順序最適化
     */
    async optimizeLoadOrder(sortedFiles) {
        console.log('⚡ 読み込み順序最適化開始');
        
        const optimized = [];
        const phases = this.groupFilesByPhase(sortedFiles);
        
        // フェーズごとに最適化
        for (const [phase, files] of phases) {
            const optimizedPhase = await this.optimizePhase(files, phase);
            optimized.push(...optimizedPhase);
        }
        
        console.log(`✅ 読み込み順序最適化完了: ${optimized.length}ファイル`);
        return optimized;
    }
    
    /**
     * ファイルをフェーズ別にグループ化
     */
    groupFilesByPhase(sortedFiles) {
        const phases = new Map();
        
        sortedFiles.forEach(file => {
            const node = this.graph.get(file);
            const type = node?.type || 'unknown';
            
            if (!phases.has(type)) {
                phases.set(type, []);
            }
            phases.get(type).push(file);
        });
        
        // フェーズを優先度順でソート
        const sortedPhases = new Map([...phases.entries()].sort((a, b) => {
            const priorityA = this.typePriorities[a[0]] || 0;
            const priorityB = this.typePriorities[b[0]] || 0;
            return priorityB - priorityA;
        }));
        
        return sortedPhases;
    }
    
    /**
     * フェーズ最適化
     */
    async optimizePhase(files, phase) {
        // フェーズ内での並列読み込み可能性を考慮
        if (phase === 'modules') {
            // モジュールは並列読み込み可能
            return this.optimizeParallelLoading(files);
        } else if (phase === 'components') {
            // コンポーネントは軽い依存関係でソート
            return this.optimizeLightDependencies(files);
        } else {
            // その他は優先度順
            return this.sortByPriority(files);
        }
    }
    
    /**
     * 並列読み込み最適化
     */
    optimizeParallelLoading(files) {
        // 独立性の高いファイルを前に配置
        return files.sort((a, b) => {
            const nodeA = this.graph.get(a);
            const nodeB = this.graph.get(b);
            
            const independenceA = this.calculateIndependence(nodeA);
            const independenceB = this.calculateIndependence(nodeB);
            
            return independenceB - independenceA;
        });
    }
    
    /**
     * 独立性計算
     */
    calculateIndependence(node) {
        if (!node) return 0;
        
        // 依存関係が少ないほど独立性が高い
        const depCount = node.dependencies.length;
        const dependentCount = node.dependents.length;
        
        return 100 - (depCount * 10) - (dependentCount * 5);
    }
    
    /**
     * 軽い依存関係でソート
     */
    optimizeLightDependencies(files) {
        return files.sort((a, b) => {
            const nodeA = this.graph.get(a);
            const nodeB = this.graph.get(b);
            
            const weightA = this.calculateDependencyWeight(nodeA);
            const weightB = this.calculateDependencyWeight(nodeB);
            
            return weightA - weightB; // 軽いものが先
        });
    }
    
    /**
     * 依存関係重み計算
     */
    calculateDependencyWeight(node) {
        if (!node) return 1000;
        
        let weight = 0;
        
        // 依存関係の深さを計算
        const visited = new Set();
        weight += this.calculateDepthWeight(node, visited, 0);
        
        return weight;
    }
    
    /**
     * 深さ重み計算
     */
    calculateDepthWeight(node, visited, depth) {
        if (!node || visited.has(node) || depth > 10) {
            return depth;
        }
        
        visited.add(node);
        
        let maxDepth = depth;
        for (const dep of node.dependencies) {
            const depNode = this.graph.get(dep);
            if (depNode) {
                const depthWeight = this.calculateDepthWeight(depNode, visited, depth + 1);
                maxDepth = Math.max(maxDepth, depthWeight);
            }
        }
        
        visited.delete(node);
        return maxDepth;
    }
    
    /**
     * 優先度順ソート
     */
    sortByPriority(files) {
        return files.sort((a, b) => {
            const nodeA = this.graph.get(a);
            const nodeB = this.graph.get(b);
            
            const priorityA = nodeA?.priority || 0;
            const priorityB = nodeB?.priority || 0;
            
            return priorityB - priorityA;
        });
    }
    
    /**
     * フォールバックソート
     */
    fallbackSort(fileList) {
        console.log('🆘 フォールバック: 優先度ベースソート実行');
        
        return fileList.sort((a, b) => {
            const priorityA = this.calculatePriority(a);
            const priorityB = this.calculatePriority(b);
            
            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }
            
            // 同じ優先度の場合はファイル名でソート
            return a.localeCompare(b);
        });
    }
    
    /**
     * 依存関係検証
     */
    validateDependencies(fileList) {
        console.log('🧪 依存関係検証開始');
        
        const issues = [];
        
        for (const file of fileList) {
            const node = this.graph.get(file);
            if (!node) continue;
            
            // 存在しない依存関係をチェック
            for (const dep of node.dependencies) {
                if (!fileList.includes(dep)) {
                    issues.push({
                        type: 'missing_dependency',
                        file: file,
                        dependency: dep
                    });
                }
            }
            
            // 循環依存をチェック
            const cycle = this.findCycleFromFile(file, new Set(), []);
            if (cycle.length > 0) {
                issues.push({
                    type: 'circular_dependency',
                    cycle: cycle
                });
            }
        }
        
        if (issues.length > 0) {
            console.warn('⚠️ 依存関係問題検出:', issues);
        } else {
            console.log('✅ 依存関係検証: 問題なし');
        }
        
        return issues;
    }
    
    /**
     * ファイルからの循環検索
     */
    findCycleFromFile(file, visited, path) {
        if (visited.has(file)) {
            const cycleStart = path.indexOf(file);
            if (cycleStart !== -1) {
                return path.slice(cycleStart);
            }
            return [];
        }
        
        visited.add(file);
        path.push(file);
        
        const node = this.graph.get(file);
        if (node) {
            for (const dep of node.dependencies) {
                const cycle = this.findCycleFromFile(dep, new Set(visited), [...path]);
                if (cycle.length > 0) {
                    return cycle;
                }
            }
        }
        
        return [];
    }
    
    /**
     * 依存関係統計
     */
    getDependencyStatistics() {
        const stats = {
            totalFiles: this.graph.size,
            totalDependencies: 0,
            avgDependencies: 0,
            maxDependencies: 0,
            circularDependencies: this.circularDependencies.length,
            typeDistribution: {},
            priorityDistribution: {}
        };
        
        let dependenciesSum = 0;
        
        this.graph.forEach((node, file) => {
            const depCount = node.dependencies.length;
            dependenciesSum += depCount;
            
            if (depCount > stats.maxDependencies) {
                stats.maxDependencies = depCount;
            }
            
            // タイプ別分布
            const type = node.type;
            stats.typeDistribution[type] = (stats.typeDistribution[type] || 0) + 1;
            
            // 優先度別分布
            const priority = Math.floor(node.priority / 100) * 100;
            stats.priorityDistribution[priority] = (stats.priorityDistribution[priority] || 0) + 1;
        });
        
        stats.totalDependencies = dependenciesSum;
        stats.avgDependencies = stats.totalFiles > 0 ? dependenciesSum / stats.totalFiles : 0;
        
        return stats;
    }
    
    /**
     * 読み込み順序取得
     */
    getLoadOrder() {
        return [...this.loadOrder];
    }
    
    /**
     * 依存関係グラフ可視化データ
     */
    getVisualizationData() {
        const nodes = [];
        const edges = [];
        
        this.graph.forEach((node, file) => {
            nodes.push({
                id: file,
                type: node.type,
                priority: node.priority,
                status: node.status
            });
            
            node.dependencies.forEach(dep => {
                edges.push({
                    source: file,
                    target: dep,
                    type: 'dependency'
                });
            });
        });
        
        return { nodes, edges };
    }
    
    /**
     * デバッグ情報取得
     */
    getDebugInfo() {
        return {
            dependencyGraph: Object.fromEntries(this.graph),
            circularDependencies: this.circularDependencies,
            loadOrder: this.loadOrder,
            knownDependencies: this.knownDependencies,
            typePriorities: this.typePriorities,
            statistics: this.getDependencyStatistics()
        };
    }
    
    /**
     * 最適化レポート生成
     */
    generateOptimizationReport(originalOrder, optimizedOrder) {
        const improvements = {
            originalOrder: originalOrder,
            optimizedOrder: optimizedOrder,
            reorderCount: 0,
            priorityImprovements: [],
            dependencyViolations: 0,
            estimatedSpeedImprovement: 0
        };
        
        // 順序変更数をカウント
        originalOrder.forEach((file, index) => {
            if (optimizedOrder[index] !== file) {
                improvements.reorderCount++;
            }
        });
        
        // 依存関係違反をチェック
        optimizedOrder.forEach((file, index) => {
            const node = this.graph.get(file);
            if (node) {
                node.dependencies.forEach(dep => {
                    const depIndex = optimizedOrder.indexOf(dep);
                    if (depIndex > index) {
                        improvements.dependencyViolations++;
                    }
                });
            }
        });
        
        // 推定速度改善を計算
        improvements.estimatedSpeedImprovement = this.estimateSpeedImprovement(originalOrder, optimizedOrder);
        
        return improvements;
    }
    
    /**
     * 速度改善推定
     */
    estimateSpeedImprovement(originalOrder, optimizedOrder) {
        // 簡易的な速度改善推定
        let originalScore = 0;
        let optimizedScore = 0;
        
        originalOrder.forEach((file, index) => {
            const node = this.graph.get(file);
            if (node) {
                originalScore += node.priority * (originalOrder.length - index);
            }
        });
        
        optimizedOrder.forEach((file, index) => {
            const node = this.graph.get(file);
            if (node) {
                optimizedScore += node.priority * (optimizedOrder.length - index);
            }
        });
        
        const improvement = ((optimizedScore - originalScore) / originalScore) * 100;
        return Math.max(0, Math.min(100, improvement));
    }
}

// =====================================
// 🚀 自動初期化
// =====================================

// グローバル初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDependencyResolver);
} else {
    setTimeout(initializeDependencyResolver, 0);
}

async function initializeDependencyResolver() {
    try {
        if (!window.NAGANO3_DEPENDENCY_RESOLVER) {
            window.NAGANO3_DEPENDENCY_RESOLVER = new DependencyResolver();
            
            // NAGANO3名前空間への登録
            if (typeof window.NAGANO3 === 'object') {
                window.NAGANO3.dependencyResolver = window.NAGANO3_DEPENDENCY_RESOLVER;
            }
            
            console.log('✅ Dependency Resolver 初期化完了・グローバル設定完了');
        } else {
            console.log('⚠️ Dependency Resolver は既に初期化済みです');
        }
    } catch (error) {
        console.error('❌ Dependency Resolver 初期化エラー:', error);
    }
}

// =====================================
// 🧪 デバッグ・テスト機能
// =====================================

// 依存関係解決テスト
window.testDependencyResolver = function() {
    console.log('🧪 Dependency Resolver テスト開始');
    
    if (window.NAGANO3_DEPENDENCY_RESOLVER) {
        const resolver = window.NAGANO3_DEPENDENCY_RESOLVER;
        
        // テスト用ファイルリスト
        const testFiles = [
            'bootstrap.js',
            'ajax.js',
            'theme.js',
            'notifications.js',
            'modal.js',
            'dashboard.js',
            'modules/juchu/juchu.js',
            'modules/kicho/kicho.js'
        ];
        
        console.log('🔗 テスト用ファイルリスト:', testFiles);
        
        // 依存関係解決実行
        resolver.resolveDependencies(testFiles).then(optimizedOrder => {
            console.log('✅ 最適化された読み込み順序:', optimizedOrder);
            
            // 検証
            const issues = resolver.validateDependencies(testFiles);
            console.log('🧪 検証結果:', issues);
            
            // 統計
            const stats = resolver.getDependencyStatistics();
            console.log('📊 依存関係統計:', stats);
            
            // 最適化レポート
            const report = resolver.generateOptimizationReport(testFiles, optimizedOrder);
            console.log('📈 最適化レポート:', report);
            
            return {
                originalOrder: testFiles,
                optimizedOrder: optimizedOrder,
                issues: issues,
                statistics: stats,
                report: report
            };
        }).catch(error => {
            console.error('❌ テスト失敗:', error);
        });
        
    } else {
        console.error('❌ Dependency Resolver not initialized');
        return null;
    }
};

// 依存関係状況確認
window.checkDependencyStatus = function() {
    if (window.NAGANO3_DEPENDENCY_RESOLVER) {
        const debugInfo = window.NAGANO3_DEPENDENCY_RESOLVER.getDebugInfo();
        console.log('🔗 Dependency Resolver Debug Info:', debugInfo);
        
        // 可視化データ
        const vizData = window.NAGANO3_DEPENDENCY_RESOLVER.getVisualizationData();
        console.log('📊 可視化データ:', vizData);
        
        return { debugInfo, vizData };
    } else {
        console.error('❌ Dependency Resolver not initialized');
        return null;
    }
};

// 循環依存検出テスト
window.testCircularDependencies = function() {
    if (window.NAGANO3_DEPENDENCY_RESOLVER) {
        const resolver = window.NAGANO3_DEPENDENCY_RESOLVER;
        
        // 意図的に循環依存を作成してテスト
        resolver.addDependency('test_a.js', ['test_b.js']);
        resolver.addDependency('test_b.js', ['test_c.js']);
        resolver.addDependency('test_c.js', ['test_a.js']);
        
        const circularDeps = resolver.detectCircularDependencies();
        console.log('🔄 循環依存テスト結果:', circularDeps);
        
        return circularDeps;
    } else {
        console.error('❌ Dependency Resolver not initialized');
        return null;
    }
};

console.log('🔗 NAGANO-3 Dependency Resolver System 読み込み完了');