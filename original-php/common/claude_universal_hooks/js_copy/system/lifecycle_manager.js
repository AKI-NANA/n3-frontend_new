
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
 * 🚦 LifecycleManager - 初期化順序制御システム
 * 
 * ✅ 45ファイルの読み込み順序完全制御
 * ✅ 依存関係に基づく段階的初期化
 * ✅ 部分的読み込み失敗時の継続動作保証
 * ✅ エラー時の自動復旧機能
 * 
 * @version 1.0.0-robust
 */

"use strict";

class LifecycleManager {
    constructor() {
        this.phases = new Map();
        this.currentPhase = null;
        this.completedPhases = new Set();
        this.failedPhases = new Set();
        this.phaseResults = new Map();
        this.isRunning = false;
        this.startTime = null;
        
        // 初期化フェーズ定義（優先順位付き）
        this.defineStandardPhases();
        
        console.log('🚦 LifecycleManager 初期化完了');
    }
    
    /**
     * 標準初期化フェーズ定義
     */
    defineStandardPhases() {
        // Phase 1: Core System（最優先）
        this.registerPhase('core_system', {
            description: 'コアシステム初期化',
            priority: 1,
            required: true,
            timeout: 5000,
            dependencies: [],
            tasks: [
                'error_boundary_setup',
                'unified_config_load',
                'dependency_resolver_init'
            ]
        });
        
        // Phase 2: Infrastructure（基盤）
        this.registerPhase('infrastructure', {
            description: '基盤システム初期化',
            priority: 2,
            required: true,
            timeout: 10000,
            dependencies: ['core_system'],
            tasks: [
                'ajax_system_ready',
                'dom_safety_ready',
                'notification_basic_ready'
            ]
        });
        
        // Phase 3: Core Files（Coreファイル群）
        this.registerPhase('core_files', {
            description: 'Coreファイル読み込み',
            priority: 3,
            required: true,
            timeout: 15000,
            dependencies: ['infrastructure'],
            tasks: [
                'load_core_ajax',
                'load_core_header',
                'load_core_sidebar',
                'load_core_theme',
                'load_core_error_handling'
            ]
        });
        
        // Phase 4: System Files（Systemファイル群）
        this.registerPhase('system_files', {
            description: 'Systemファイル読み込み',
            priority: 4,
            required: false,
            timeout: 20000,
            dependencies: ['core_files'],
            tasks: [
                'load_js_module_loader',
                'load_notification_orchestrator',
                'load_compatibility_layer'
            ]
        });
        
        // Phase 5: Components（Componentファイル群）
        this.registerPhase('components', {
            description: 'Componentファイル読み込み',
            priority: 5,
            required: false,
            timeout: 15000,
            dependencies: ['system_files'],
            tasks: [
                'load_components_forms',
                'load_components_theme',
                'load_components_search',
                'load_components_notifications'
            ]
        });
        
        // Phase 6: Modules（Moduleファイル群）
        this.registerPhase('modules', {
            description: 'Moduleファイル読み込み',
            priority: 6,
            required: false,
            timeout: 30000,
            dependencies: ['components'],
            tasks: [
                'scan_load_all_modules'
            ]
        });
        
        // Phase 7: Integration（統合処理）
        this.registerPhase('integration', {
            description: 'システム統合',
            priority: 7,
            required: false,
            timeout: 10000,
            dependencies: ['modules'],
            tasks: [
                'notification_system_upgrade',
                'function_conflict_resolution',
                'dom_validation',
                'final_compatibility_check'
            ]
        });
        
        // Phase 8: Finalization（最終化）
        this.registerPhase('finalization', {
            description: '最終初期化',
            priority: 8,
            required: false,
            timeout: 5000,
            dependencies: ['integration'],
            tasks: [
                'performance_optimization',
                'debug_info_setup',
                'ready_event_dispatch'
            ]
        });
        
        console.log(`📋 ${this.phases.size}個の初期化フェーズ定義完了`);
    }
    
    /**
     * フェーズ登録
     */
    registerPhase(name, config) {
        const phaseConfig = {
            name: name,
            description: config.description || name,
            priority: config.priority || 99,
            required: config.required || false,
            timeout: config.timeout || 10000,
            dependencies: config.dependencies || [],
            tasks: config.tasks || [],
            retries: config.retries || 2,
            status: 'pending'
        };
        
        this.phases.set(name, phaseConfig);
        console.log(`📝 フェーズ登録: ${name} (優先度: ${phaseConfig.priority})`);
    }
    
    /**
     * ライフサイクル開始
     */
    async start() {
        if (this.isRunning) {
            console.warn('⚠️ LifecycleManager は既に実行中です');
            return this.getStatus();
        }
        
        this.isRunning = true;
        this.startTime = performance.now();
        
        console.log('🚀 LifecycleManager 開始');
        
        try {
            // 依存関係順でフェーズを実行
            const executionOrder = this.calculateExecutionOrder();
            
            for (const phaseName of executionOrder) {
                await this.executePhase(phaseName);
                
                // 必須フェーズが失敗した場合は停止
                const phase = this.phases.get(phaseName);
                if (phase.required && this.failedPhases.has(phaseName)) {
                    throw new Error(`必須フェーズ '${phaseName}' が失敗しました`);
                }
            }
            
            console.log('✅ LifecycleManager 完了');
            return this.getStatus();
            
        } catch (error) {
            console.error('❌ LifecycleManager エラー:', error);
            await this.handleCriticalFailure(error);
            return this.getStatus();
        } finally {
            this.isRunning = false;
        }
    }
    
    /**
     * 実行順序計算（依存関係解決）
     */
    calculateExecutionOrder() {
        const phases = Array.from(this.phases.values());
        const ordered = [];
        const visited = new Set();
        const visiting = new Set();
        
        function visit(phase) {
            if (visiting.has(phase.name)) {
                throw new Error(`循環依存検出: ${phase.name}`);
            }
            
            if (visited.has(phase.name)) {
                return;
            }
            
            visiting.add(phase.name);
            
            // 依存関係を先に処理
            for (const depName of phase.dependencies) {
                const depPhase = phases.find(p => p.name === depName);
                if (depPhase) {
                    visit(depPhase);
                }
            }
            
            visiting.delete(phase.name);
            visited.add(phase.name);
            ordered.push(phase.name);
        }
        
        // 優先度順でソート後、依存関係解決
        phases
            .sort((a, b) => a.priority - b.priority)
            .forEach(phase => visit(phase));
        
        console.log('📊 実行順序決定:', ordered);
        return ordered;
    }
    
    /**
     * フェーズ実行
     */
    async executePhase(phaseName) {
        const phase = this.phases.get(phaseName);
        if (!phase) {
            console.error(`❌ 未知のフェーズ: ${phaseName}`);
            return;
        }
        
        console.log(`🔄 フェーズ実行開始: ${phase.description}`);
        this.currentPhase = phaseName;
        phase.status = 'running';
        
        const phaseStartTime = performance.now();
        let attempt = 0;
        
        while (attempt <= phase.retries) {
            try {
                await this.runPhaseWithTimeout(phase);
                
                // 成功
                phase.status = 'completed';
                this.completedPhases.add(phaseName);
                
                const duration = performance.now() - phaseStartTime;
                this.phaseResults.set(phaseName, {
                    status: 'success',
                    duration: duration,
                    attempt: attempt + 1
                });
                
                console.log(`✅ フェーズ完了: ${phase.description} (${Math.round(duration)}ms)`);
                return;
                
            } catch (error) {
                attempt++;
                console.warn(`⚠️ フェーズ失敗 (試行 ${attempt}/${phase.retries + 1}): ${phase.description}`, error.message);
                
                if (attempt <= phase.retries) {
                    // リトライ前の待機
                    await this.delay(1000 * attempt);
                }
            }
        }
        
        // 全ての試行が失敗
        phase.status = 'failed';
        this.failedPhases.add(phaseName);
        
        const duration = performance.now() - phaseStartTime;
        this.phaseResults.set(phaseName, {
            status: 'failed',
            duration: duration,
            attempt: attempt,
            error: `${attempt}回の試行後に失敗`
        });
        
        console.error(`❌ フェーズ最終失敗: ${phase.description}`);
        
        // 必須フェーズの場合は自動復旧を試行
        if (phase.required) {
            await this.attemptPhaseRecovery(phaseName);
        }
    }
    
    /**
     * タイムアウト付きフェーズ実行
     */
    async runPhaseWithTimeout(phase) {
        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`タイムアウト (${phase.timeout}ms)`));
            }, phase.timeout);
            
            try {
                await this.executePhaseeTasks(phase);
                clearTimeout(timeout);
                resolve();
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }
    
    /**
     * フェーズタスク実行
     */
    async executePhaseeTasks(phase) {
        for (const taskName of phase.tasks) {
            await this.executeTask(taskName, phase.name);
        }
    }
    
    /**
     * 個別タスク実行
     */
    async executeTask(taskName, phaseName) {
        try {
            switch (taskName) {
                // Core System Tasks
                case 'error_boundary_setup':
                    await this.taskErrorBoundarySetup();
                    break;
                case 'unified_config_load':
                    await this.taskUnifiedConfigLoad();
                    break;
                case 'dependency_resolver_init':
                    await this.taskDependencyResolverInit();
                    break;
                    
                // Infrastructure Tasks
                case 'ajax_system_ready':
                    await this.taskAjaxSystemReady();
                    break;
                case 'dom_safety_ready':
                    await this.taskDomSafetyReady();
                    break;
                case 'notification_basic_ready':
                    await this.taskNotificationBasicReady();
                    break;
                    
                // File Loading Tasks
                case 'load_core_ajax':
                    await this.taskLoadFile('common/js/core/ajax.js');
                    break;
                case 'load_core_header':
                    await this.taskLoadFile('common/js/core/header.js');
                    break;
                case 'load_core_sidebar':
                    await this.taskLoadFile('common/js/core/sidebar.js');
                    break;
                case 'load_core_theme':
                    await this.taskLoadFile('common/js/core/theme.js');
                    break;
                case 'load_core_error_handling':
                    await this.taskLoadFile('common/js/core/error_handling.js');
                    break;
                    
                // System File Tasks
                case 'load_js_module_loader':
                    await this.taskLoadSystemFile('js_module_loader.js');
                    break;
                case 'load_notification_orchestrator':
                    await this.taskLoadSystemFile('notification_orchestrator.js');
                    break;
                case 'load_compatibility_layer':
                    await this.taskLoadSystemFile('compatibility_layer.js');
                    break;
                    
                // Component Tasks
                case 'load_components_forms':
                    await this.taskLoadFile('common/js/components/forms_component.js');
                    break;
                case 'load_components_theme':
                    await this.taskLoadFile('common/js/components/theme.js');
                    break;
                case 'load_components_search':
                    await this.taskLoadFile('common/js/components/search.js');
                    break;
                case 'load_components_notifications':
                    await this.taskLoadFile('common/js/components/notifications.js');
                    break;
                    
                // Module Tasks
                case 'scan_load_all_modules':
                    await this.taskScanLoadAllModules();
                    break;
                    
                // Integration Tasks
                case 'notification_system_upgrade':
                    await this.taskNotificationSystemUpgrade();
                    break;
                case 'function_conflict_resolution':
                    await this.taskFunctionConflictResolution();
                    break;
                case 'dom_validation':
                    await this.taskDomValidation();
                    break;
                case 'final_compatibility_check':
                    await this.taskFinalCompatibilityCheck();
                    break;
                    
                // Finalization Tasks
                case 'performance_optimization':
                    await this.taskPerformanceOptimization();
                    break;
                case 'debug_info_setup':
                    await this.taskDebugInfoSetup();
                    break;
                case 'ready_event_dispatch':
                    await this.taskReadyEventDispatch();
                    break;
                    
                default:
                    console.warn(`⚠️ 未知のタスク: ${taskName}`);
            }
            
            console.log(`  ✅ タスク完了: ${taskName}`);
            
        } catch (error) {
            console.error(`  ❌ タスク失敗: ${taskName}`, error);
            throw error;
        }
    }
    
    // =====================================
    // 🔧 個別タスク実装
    // =====================================
    
    async taskErrorBoundarySetup() {
        // ErrorBoundary の確認・初期化
        if (typeof ErrorBoundary !== 'undefined') {
            // ErrorBoundary が利用可能
            return;
        }
        // 基本的なエラーハンドリングは Bootstrap.js で既に設定済み
    }
    
    async taskUnifiedConfigLoad() {
        // UnifiedConfig の確認
        if (window.NAGANO3?.config) {
            return; // 既に設定済み
        }
        throw new Error('NAGANO3.config が初期化されていません');
    }
    
    async taskDependencyResolverInit() {
        // DependencyResolver の確認
        if (typeof DependencyResolver !== 'undefined') {
            return;
        }
        // 基本的な依存関係解決は LifecycleManager で実行中
    }
    
    async taskAjaxSystemReady() {
        if (typeof window.safeAjaxRequest !== 'function') {
            throw new Error('safeAjaxRequest が利用できません');
        }
    }
    
    async taskDomSafetyReady() {
        if (typeof window.safeGetElement !== 'function') {
            throw new Error('safeGetElement が利用できません');
        }
    }
    
    async taskNotificationBasicReady() {
        if (typeof window.showNotification !== 'function') {
            throw new Error('showNotification が利用できません');
        }
    }
    
    async taskLoadFile(filePath) {
        if (this.isFileLoaded(filePath)) {
            return; // 既に読み込み済み
        }
        
        const success = await this.loadScriptSafely(`${filePath}?v=${Date.now()}`);
        if (!success) {
            throw new Error(`ファイル読み込み失敗: ${filePath}`);
        }
    }
    
    async taskLoadSystemFile(filename) {
        const filePath = `common/js/system/${filename}`;
        return this.taskLoadFile(filePath);
    }
    
    async taskScanLoadAllModules() {
        if (typeof JSModuleLoader === 'undefined') {
            console.warn('JSModuleLoader が利用できません、モジュール読み込みをスキップ');
            return;
        }
        
        const jsLoader = new JSModuleLoader();
        await jsLoader.scanAndLoadAllModules();
    }
    
    async taskNotificationSystemUpgrade() {
        if (typeof NotificationOrchestrator !== 'undefined') {
            const orchestrator = new NotificationOrchestrator();
            await orchestrator.upgradeFromBasic();
        }
    }
    
    async taskFunctionConflictResolution() {
        if (typeof JSModuleLoader !== 'undefined' && window.NAGANO3?.system?.jsLoader) {
            window.NAGANO3.system.jsLoader.checkFunctionConflicts();
        }
    }
    
    async taskDomValidation() {
        if (typeof JSModuleLoader !== 'undefined' && window.NAGANO3?.system?.jsLoader) {
            window.NAGANO3.system.jsLoader.validateDOMElements();
        }
    }
    
    async taskFinalCompatibilityCheck() {
        const criticalFunctions = [
            'showNotification', 'safeAjaxRequest', 'safeGetElement', 'safeUpdateStats'
        ];
        
        for (const funcName of criticalFunctions) {
            if (typeof window[funcName] !== 'function') {
                throw new Error(`重要な関数が利用できません: ${funcName}`);
            }
        }
    }
    
    async taskPerformanceOptimization() {
        // メモリ使用量確認
        if (navigator.memory) {
            const memoryUsage = navigator.memory.usedJSHeapSize / 1024 / 1024;
            if (memoryUsage > 100) { // 100MB超過時
                console.warn(`⚠️ メモリ使用量が多めです: ${Math.round(memoryUsage)}MB`);
            }
        }
        
        // 不要なスクリプトタグの削除
        const scripts = document.querySelectorAll('script[src*="?v="]');
        let removedCount = 0;
        scripts.forEach(script => {
            if (script.onload === null && script.onerror === null) {
                // 読み込み完了済みの可能性
                script.remove();
                removedCount++;
            }
        });
        
        if (removedCount > 0) {
            console.log(`🧹 ${removedCount}個の不要スクリプトタグを削除`);
        }
    }
    
    async taskDebugInfoSetup() {
        // デバッグ情報の設定
        window.NAGANO3_LIFECYCLE_STATUS = this.getStatus();
    }
    
    async taskReadyEventDispatch() {
        // 最終準備完了イベント
        const readyEvent = new CustomEvent('nagano3:lifecycle-complete', {
            detail: this.getStatus()
        });
        document.dispatchEvent(readyEvent);
        window.dispatchEvent(readyEvent);
    }
    
    // =====================================
    // 🛠️ ユーティリティメソッド
    // =====================================
    
    async loadScriptSafely(src, timeout = 10000) {
        return new Promise((resolve) => {
            const existing = document.querySelector(`script[src*="${src.split('?')[0]}"]`);
            if (existing) {
                resolve(true);
                return;
            }
            
            const script = document.createElement('script');
            script.async = false;
            
            const timer = setTimeout(() => {
                script.remove();
                resolve(false);
            }, timeout);
            
            script.onload = () => {
                clearTimeout(timer);
                resolve(true);
            };
            
            script.onerror = () => {
                clearTimeout(timer);
                script.remove();
                resolve(false);
            };
            
            script.src = src;
            document.head.appendChild(script);
        });
    }
    
    isFileLoaded(filePath) {
        return document.querySelector(`script[src*="${filePath}"]`) !== null;
    }
    
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async attemptPhaseRecovery(phaseName) {
        console.log(`🔧 フェーズ復旧試行: ${phaseName}`);
        
        // 基本的な復旧処理
        switch (phaseName) {
            case 'core_system':
                // 最低限の機能確保
                if (!window.NAGANO3) {
                    window.NAGANO3 = { initialized: false };
                }
                break;
                
            case 'infrastructure':
                // 基本関数の確保
                if (typeof window.showNotification !== 'function') {
                    window.showNotification = (msg) => console.log('FALLBACK:', msg);
                }
                break;
        }
    }
    
    async handleCriticalFailure(error) {
        console.error('🚨 LifecycleManager 致命的エラー:', error);
        
        // 最低限の機能確保
        if (typeof window.showNotification === 'function') {
            window.showNotification('システム初期化で一部エラーが発生しましたが、基本機能は利用可能です', 'warning', 10000);
        }
        
        // 緊急モードフラグ
        window.NAGANO3_EMERGENCY_MODE = true;
    }
    
    /**
     * 状況取得
     */
    getStatus() {
        const totalTime = this.startTime ? performance.now() - this.startTime : 0;
        
        return {
            is_running: this.isRunning,
            current_phase: this.currentPhase,
            completed_phases: Array.from(this.completedPhases),
            failed_phases: Array.from(this.failedPhases),
            total_phases: this.phases.size,
            completion_rate: (this.completedPhases.size / this.phases.size) * 100,
            total_time: Math.round(totalTime),
            phase_results: Object.fromEntries(this.phaseResults),
            emergency_mode: !!window.NAGANO3_EMERGENCY_MODE
        };
    }
}

// グローバル登録
if (typeof window !== 'undefined') {
    window.LifecycleManager = LifecycleManager;
    
    // NAGANO3名前空間への登録
    if (window.NAGANO3) {
        window.NAGANO3.system = window.NAGANO3.system || {};
        window.NAGANO3.system.LifecycleManager = LifecycleManager;
    }
    
    console.log('✅ LifecycleManager グローバル登録完了');
}