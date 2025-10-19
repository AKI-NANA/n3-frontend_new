<?php
/**
 * NAGANO-3 Ajax モジュールルーター【完全統合版】
 * ajax_module_router.php
 * 
 * ✅ auto_connector.php + module_detector.php の完全統合
 * ✅ 既存機能を100%保持
 * ✅ フォルダ移動対応の自動検出
 * ✅ 1時間キャッシュシステム
 * ✅ セキュリティ強化
 * 
 * @version 1.0.0
 * @created 2025-07-06
 */

// セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    die('Direct access denied');
}

/**
 * Ajax モジュールルータークラス【完全統合版】
 */
class AjaxModuleRouter {
    
    private $cache_file = 'cache/ajax_modules.json';
    private $cache_duration = 3600; // 1時間（module_detector.php から継承）
    private $modules = [];
    private $base_path;
    private $debug_mode = false;
    
    // auto_connector.php の検索パターン（完全保持）
    private $handler_search_patterns = [
        // === 既存パターン（auto_connector.php）===
        'modules/*_ajax_handler.php',
        'modules/*/ajax_handler.php', 
        'modules/*/*.handler.php',
        'common/js/ajax/*_ajax_handler.php',
        
        // === 追加パターン（フォルダ移動対応）===
        'modules/{module}/{module}_ajax_handler.php',
        'modules/{module}/controllers/ajax_handler.php',
        'modules/{module}/api/ajax_handler.php',
        'modules/{module}/handlers/{module}_handler.php',
        'modules/{module}/php/{module}_ajax_handler.php',
        
        // === ルートレベル ===
        '{module}_ajax_handler.php',
        'ajax_handlers/{module}_handler.php',
        'handlers/{module}.php',
        'api/{module}.php',
        'common/ajax/{module}_handler.php'
    ];
    
    // auto_connector.php のコンテンツパターン（完全保持）
    private $content_search_patterns = [
        // === 既存パターン（auto_connector.php）===
        'modules/{module}/{module}_content.php',
        'modules/{module}/index.php',
        
        // === 追加パターン ===
        'modules/{module}/content.php',
        'modules/{module}/views/{module}_content.php',
        'modules/{module}/templates/{module}_content.php',
        'modules/{module}/pages/{module}.php',
        'content/{module}.php',
        'pages/{module}.php'
    ];
    
    public function __construct($base_path = null) {
        $this->base_path = $base_path ?: __DIR__;
        $this->debug_mode = defined('DEBUG_MODE') && DEBUG_MODE;
        
        // キャッシュディレクトリ作成
        $cache_dir = dirname($this->cache_file);
        if (!is_dir($cache_dir)) {
            mkdir($cache_dir, 0755, true);
        }
        
        if ($this->debug_mode) {
            error_log("AjaxModuleRouter: 初期化完了 - Base: {$this->base_path}");
        }
    }
    
    /**
     * 全モジュール検出（module_detector.php + auto_connector.php 統合）
     */
    public function detectAllModules() {
        // キャッシュチェック（module_detector.php 由来）
        if ($this->loadFromCache()) {
            if ($this->debug_mode) {
                error_log("AjaxModuleRouter: キャッシュから読み込み");
            }
            return $this->modules;
        }
        
        // 新規検出
        if ($this->debug_mode) {
            error_log("AjaxModuleRouter: 新規スキャン開始");
        }
        
        $start_time = microtime(true);
        
        $this->modules = [
            // auto_connector.php の機能
            'handlers' => $this->detectAjaxHandlers(),
            'content_files' => $this->detectContentFiles(),
            'actions' => $this->extractAllActions(),
            
            // module_detector.php の機能
            'modules_info' => $this->detectModulesInfo(),
            'js_files' => $this->detectJSFiles(),
            'css_files' => $this->detectCSSFiles(),
            
            // 統合情報
            'scan_timestamp' => time(),
            'scan_duration' => round((microtime(true) - $start_time) * 1000, 2)
        ];
        
        // キャッシュ保存
        $this->saveToCache();
        
        if ($this->debug_mode) {
            $handler_count = count($this->modules['handlers']);
            error_log("AjaxModuleRouter: 検出完了 - {$handler_count}ハンドラー ({$this->modules['scan_duration']}ms)");
        }
        
        return $this->modules;
    }
    
    /**
     * Ajax ハンドラー検出（auto_connector.php 由来）
     */
    private function detectAjaxHandlers() {
        $handlers = [];
        
        // auto_connector.php の検索ロジック（完全保持）
        foreach ($this->handler_search_patterns as $pattern) {
            $files = glob($this->base_path . '/' . $pattern);
            foreach ($files as $file) {
                $module_name = $this->extractModuleName($file);
                if ($module_name) {
                    $handlers[$module_name] = [
                        'file' => $file,
                        'relative_path' => str_replace($this->base_path . '/', '', $file),
                        'last_modified' => filemtime($file),
                        'size' => filesize($file),
                        'found_pattern' => $pattern
                    ];
                }
            }
        }
        
        // モジュールディレクトリベースの検索も追加
        $this->detectHandlersByModuleDir($handlers);
        
        return $handlers;
    }
    
    /**
     * モジュールディレクトリベースのハンドラー検索
     */
    private function detectHandlersByModuleDir(&$handlers) {
        $module_dirs = glob($this->base_path . '/modules/*', GLOB_ONLYDIR);
        
        foreach ($module_dirs as $module_dir) {
            $module_name = basename($module_dir);
            
            if (!isset($handlers[$module_name])) {
                $handler_file = $this->findModuleHandler($module_name);
                if ($handler_file) {
                    $handlers[$module_name] = [
                        'file' => $handler_file,
                        'relative_path' => str_replace($this->base_path . '/', '', $handler_file),
                        'last_modified' => filemtime($handler_file),
                        'size' => filesize($handler_file),
                        'found_pattern' => $this->getFoundPattern($handler_file, $module_name)
                    ];
                }
            }
        }
    }
    
    /**
     * コンテンツファイル検出（auto_connector.php 由来）
     */
    private function detectContentFiles() {
        $content_files = [];
        
        $module_dirs = glob($this->base_path . '/modules/*', GLOB_ONLYDIR);
        
        foreach ($module_dirs as $module_dir) {
            $module_name = basename($module_dir);
            
            // auto_connector.php の検索ロジック（完全保持）
            $candidates = [
                $module_dir . '/' . $module_name . '_content.php',
                $module_dir . '/index.php',
                $module_dir . '/content.php',
                $module_dir . '/' . $module_name . '.php'
            ];
            
            foreach ($candidates as $candidate) {
                if (file_exists($candidate)) {
                    $content_files[$module_name] = [
                        'file' => $candidate,
                        'relative_path' => str_replace($this->base_path . '/', '', $candidate),
                        'last_modified' => filemtime($candidate),
                        'size' => filesize($candidate)
                    ];
                    break;
                }
            }
        }
        
        return $content_files;
    }
    
    /**
     * アクション抽出（auto_connector.php 由来）
     */
    private function extractAllActions() {
        $actions = [];
        
        foreach ($this->modules['handlers'] ?? [] as $module_name => $handler_info) {
            if (!file_exists($handler_info['file'])) continue;
            
            $content = file_get_contents($handler_info['file']);
            
            // auto_connector.php の正規表現（完全保持）
            preg_match_all("/case\s+['\"]([^'\"]+)['\"]\s*:/", $content, $matches);
            
            if (!empty($matches[1])) {
                $actions[$module_name] = array_unique($matches[1]);
            }
        }
        
        return $actions;
    }
    
    /**
     * モジュール詳細情報検出（module_detector.php 由来）
     */
    private function detectModulesInfo() {
        $modules_info = [];
        
        $module_dirs = glob($this->base_path . '/modules/*', GLOB_ONLYDIR);
        
        foreach ($module_dirs as $module_dir) {
            $module_name = basename($module_dir);
            
            // module_detector.php の分析ロジック（完全保持）
            $module_info = [
                'name' => $module_name,
                'path' => $module_dir,
                'relative_path' => str_replace($this->base_path . '/', '', $module_dir),
                'has_content' => isset($this->modules['content_files'][$module_name]),
                'has_handler' => isset($this->modules['handlers'][$module_name]),
                'has_css' => file_exists($module_dir . '/assets/' . $module_name . '.css') || 
                           file_exists($module_dir . '/' . $module_name . '.css'),
                'has_js' => file_exists($module_dir . '/assets/' . $module_name . '.js') || 
                          file_exists($module_dir . '/' . $module_name . '.js'),
                'has_config' => file_exists($module_dir . '/config.php') || 
                              file_exists($module_dir . '/' . $module_name . '_config.php'),
                'last_modified' => is_dir($module_dir) ? filemtime($module_dir) : 0
            ];
            
            // サブディレクトリ確認（module_detector.php 由来）
            $subdirs = ['controllers', 'models', 'views', 'services', 'api'];
            foreach ($subdirs as $subdir) {
                $module_info['has_' . $subdir] = is_dir($module_dir . '/' . $subdir);
            }
            
            $modules_info[$module_name] = $module_info;
        }
        
        return $modules_info;
    }
    
    /**
     * JSファイル検出（module_detector.php 由来）
     */
    private function detectJSFiles() {
        $js_files = [];
        
        // module_detector.php の検索パターン（完全保持）
        $js_folders = [
            'common/js/core/',
            'common/js/ui/',
            'common/js/debug/',
            'common/js/utils/',
            'common/js/modules/',
            'common/js/',
            'modules/*/assets/',
            'modules/*/js/',
            'modules/*/'
        ];
        
        foreach ($js_folders as $folder) {
            $pattern = $this->base_path . '/' . $folder . '*.js';
            $files = glob($pattern);
            
            foreach ($files as $file) {
                $category = $this->getCategoryFromPath($file);
                $relative_path = str_replace($this->base_path . '/', '', $file);
                
                if (!isset($js_files[$category])) {
                    $js_files[$category] = [];
                }
                
                $js_files[$category][] = [
                    'file' => $file,
                    'relative_path' => $relative_path,
                    'name' => basename($file),
                    'last_modified' => filemtime($file),
                    'size' => filesize($file)
                ];
            }
        }
        
        return $js_files;
    }
    
    /**
     * CSSファイル検出（module_detector.php 由来）
     */
    private function detectCSSFiles() {
        $css_files = [];
        
        $css_patterns = [
            'common/css/*.css',
            'modules/*/assets/*.css',
            'modules/*/css/*.css',
            'modules/*/*.css'
        ];
        
        foreach ($css_patterns as $pattern) {
            $files = glob($this->base_path . '/' . $pattern);
            
            foreach ($files as $file) {
                $category = $this->getCategoryFromPath($file);
                $relative_path = str_replace($this->base_path . '/', '', $file);
                
                if (!isset($css_files[$category])) {
                    $css_files[$category] = [];
                }
                
                $css_files[$category][] = [
                    'file' => $file,
                    'relative_path' => $relative_path,
                    'name' => basename($file),
                    'last_modified' => filemtime($file),
                    'size' => filesize($file)
                ];
            }
        }
        
        return $css_files;
    }
    
    /**
     * 自動ルーティング（auto_connector.php 由来）
     */
    public function routeAjaxRequest($page, $action = '') {
        $modules = $this->detectAllModules();
        
        // auto_connector.php のルーティングロジック（完全保持）
        
        // 1. ページから判定
        if ($module = $this->getModuleFromPage($page, $modules)) {
            return $module;
        }
        
        // 2. アクションから判定
        if ($module = $this->getModuleFromAction($action, $modules)) {
            return $module;
        }
        
        // 3. デフォルト
        return 'system';
    }
    
    /**
     * Ajax実行
     */
    public function executeAjax($module, $action, $data = []) {
        $modules = $this->detectAllModules();
        
        if (!isset($modules['handlers'][$module])) {
            return [
                'success' => false,
                'error' => "Ajax handler not found for module: {$module}",
                'available_modules' => array_keys($modules['handlers']),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
        
        $handler_file = $modules['handlers'][$module]['file'];
        
        // セキュリティチェック
        if (!$this->isSecureFile($handler_file)) {
            return [
                'success' => false,
                'error' => 'Security violation: Invalid handler file',
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
        
        // ハンドラー実行
        return $this->executeHandler($handler_file, $action, $data, $module);
    }
    
    /**
     * ハンドラー実行
     */
    private function executeHandler($handler_file, $action, $data, $module) {
        try {
            // ハンドラー用変数設定
            $_MODULE_ACTION = $action;
            $_MODULE_INPUT = $data;
            $_MODULE_NAME = $module;
            
            // セキュアアクセス定義
            if (!defined('SECURE_ACCESS')) {
                define('SECURE_ACCESS', true);
            }
            define('_MODULE_ACTION', $action);
            
            // 実行時間測定
            $start_time = microtime(true);
            
            // ハンドラー実行
            ob_start();
            $result = include $handler_file;
            $output = ob_get_clean();
            
            $execution_time = round((microtime(true) - $start_time) * 1000, 2);
            
            // 結果処理
            if (is_array($result)) {
                $result['execution_time_ms'] = $execution_time;
                return $result;
            } elseif (!empty($output)) {
                return [
                    'success' => true, 
                    'output' => $output,
                    'execution_time_ms' => $execution_time
                ];
            } else {
                return [
                    'success' => true, 
                    'message' => 'Handler executed successfully',
                    'execution_time_ms' => $execution_time
                ];
            }
            
        } catch (Exception $e) {
            error_log("Ajax handler execution error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Handler execution failed: ' . $e->getMessage(),
                'handler_file' => basename($handler_file),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
    }
    
    /**
     * フォルダ移動対応: モジュールハンドラー検索
     */
    public function findModuleHandler($module_name) {
        foreach ($this->handler_search_patterns as $pattern) {
            $path = str_replace('{module}', $module_name, $pattern);
            $full_path = $this->base_path . '/' . $path;
            
            if (file_exists($full_path)) {
                if ($this->debug_mode) {
                    error_log("AjaxModuleRouter: ハンドラー発見 - {$module_name}: {$path}");
                }
                return $full_path;
            }
        }
        
        if ($this->debug_mode) {
            error_log("AjaxModuleRouter: ハンドラー未発見 - {$module_name}");
        }
        return null;
    }
    
    /**
     * ページからモジュール判定（auto_connector.php 由来）
     */
    private function getModuleFromPage($page, $modules) {
        // 直接マッチング
        if (isset($modules['content_files'][$page])) {
            return $page;
        }
        
        // _content サフィックス除去してマッチング
        $page_base = str_replace('_content', '', $page);
        if (isset($modules['content_files'][$page_base])) {
            return $page_base;
        }
        
        return null;
    }
    
    /**
     * アクションからモジュール判定（auto_connector.php 由来）
     */
    private function getModuleFromAction($action, $modules) {
        if (empty($action)) return null;
        
        foreach ($modules['actions'] ?? [] as $module_name => $module_actions) {
            if (in_array($action, $module_actions)) {
                return $module_name;
            }
        }
        
        // プレフィックスマッチング（auto_connector.php 由来）
        $action_prefixes = [
            'kicho_' => 'kicho',
            'apikey_' => 'apikey', 
            'shohin_' => 'shohin',
            'zaiko_' => 'zaiko',
            'juchu_' => 'juchu'
        ];
        
        foreach ($action_prefixes as $prefix => $module) {
            if (strpos($action, $prefix) === 0) {
                return $module;
            }
        }
        
        return null;
    }
    
    /**
     * ユーティリティ: モジュール名抽出（auto_connector.php 由来）
     */
    private function extractModuleName($file_path) {
        $basename = basename($file_path);
        
        // _ajax_handler.php を除去
        if (strpos($basename, '_ajax_handler.php') !== false) {
            return str_replace('_ajax_handler.php', '', $basename);
        }
        
        // ajax_handler.php の場合はディレクトリ名を使用
        if ($basename === 'ajax_handler.php') {
            return basename(dirname($file_path));
        }
        
        // その他の場合
        return str_replace(['.php', '_handler', '_ajax'], '', $basename);
    }
    
    /**
     * パスからカテゴリ取得（module_detector.php 由来）
     */
    private function getCategoryFromPath($file_path) {
        if (strpos($file_path, '/modules/') !== false) {
            preg_match('/\/modules\/([^\/]+)\//', $file_path, $matches);
            return isset($matches[1]) ? 'modules_' . $matches[1] : 'modules';
        }
        
        if (strpos($file_path, '/common/js/core/') !== false) return 'core';
        if (strpos($file_path, '/common/js/ui/') !== false) return 'ui';
        if (strpos($file_path, '/common/js/debug/') !== false) return 'debug';
        if (strpos($file_path, '/common/js/utils/') !== false) return 'utils';
        if (strpos($file_path, '/common/js/') !== false) return 'common';
        if (strpos($file_path, '/common/css/') !== false) return 'common_css';
        
        return 'other';
    }
    
    /**
     * 発見パターン取得
     */
    private function getFoundPattern($file_path, $module_name) {
        $relative_path = str_replace($this->base_path . '/', '', $file_path);
        
        foreach ($this->handler_search_patterns as $pattern) {
            $expected_path = str_replace('{module}', $module_name, $pattern);
            if ($relative_path === $expected_path) {
                return $pattern;
            }
        }
        
        return 'unknown_pattern';
    }
    
    /**
     * セキュリティチェック
     */
    private function isSecureFile($file_path) {
        $real_path = realpath($file_path);
        if ($real_path === false) return false;
        
        $base_path = realpath($this->base_path);
        return strpos($real_path, $base_path) === 0;
    }
    
    /**
     * キャッシュ管理（module_detector.php 由来）
     */
    private function loadFromCache() {
        if (!file_exists($this->cache_file)) {
            return false;
        }
        
        $cache = json_decode(file_get_contents($this->cache_file), true);
        
        if (!$cache || !isset($cache['timestamp'])) {
            return false;
        }
        
        if (time() - $cache['timestamp'] < $this->cache_duration) {
            $this->modules = $cache['modules'];
            return true;
        }
        
        return false;
    }
    
    private function saveToCache() {
        $cache_dir = dirname($this->cache_file);
        if (!is_dir($cache_dir)) {
            mkdir($cache_dir, 0755, true);
        }
        
        $cache = [
            'timestamp' => time(),
            'modules' => $this->modules,
            'version' => '1.0.0',
            'patterns_count' => count($this->handler_search_patterns),
            'source_files' => ['auto_connector.php', 'module_detector.php'] // 統合元記録
        ];
        
        file_put_contents($this->cache_file, json_encode($cache, JSON_PRETTY_PRINT));
    }
    
    /**
     * キャッシュクリア
     */
    public function clearCache() {
        if (file_exists($this->cache_file)) {
            unlink($this->cache_file);
            return true;
        }
        return false;
    }
    
    /**
     * デバッグ情報
     */
    public function getDebugInfo() {
        $modules = $this->detectAllModules();
        
        return [
            'handlers_count' => count($modules['handlers'] ?? []),
            'content_files_count' => count($modules['content_files'] ?? []),
            'js_files_count' => array_sum(array_map('count', $modules['js_files'] ?? [])),
            'css_files_count' => array_sum(array_map('count', $modules['css_files'] ?? [])),
            'modules_count' => count($modules['modules_info'] ?? []),
            'total_actions' => array_sum(array_map('count', $modules['actions'] ?? [])),
            'search_patterns' => count($this->handler_search_patterns),
            'cache_status' => file_exists($this->cache_file) ? 'active' : 'none',
            'cache_age_seconds' => file_exists($this->cache_file) ? (time() - filemtime($this->cache_file)) : 0,
            'last_scan' => isset($modules['scan_timestamp']) ? date('Y-m-d H:i:s', $modules['scan_timestamp']) : 'never',
            'scan_duration_ms' => $modules['scan_duration'] ?? 0,
            'base_path' => $this->base_path,
            'debug_mode' => $this->debug_mode,
            'version' => '1.0.0',
            'integrated_from' => ['auto_connector.php', 'module_detector.php']
        ];
    }
    
    /**
     * 統計情報（module_detector.php 由来）
     */
    public function getSystemStats() {
        $modules = $this->detectAllModules();
        $stats = [];
        
        // モジュール統計
        foreach ($modules['modules_info'] ?? [] as $module_name => $info) {
            $stats['modules'][$module_name] = [
                'has_complete_structure' => $info['has_content'] && $info['has_handler'],
                'completeness_score' => $this->calculateCompletenessScore($info),
                'last_modified' => $info['last_modified']
            ];
        }
        
        // 全体統計
        $stats['overall'] = [
            'total_modules' => count($modules['modules_info'] ?? []),
            'complete_modules' => count(array_filter($stats['modules'], function($m) { return $m['has_complete_structure']; })),
            'average_completeness' => count($stats['modules']) > 0 ? 
                array_sum(array_column($stats['modules'], 'completeness_score')) / count($stats['modules']) : 0,
            'cache_efficiency' => $this->getCacheEfficiency()
        ];
        
        return $stats;
    }
    
    /**
     * モジュール完成度スコア計算（module_detector.php 由来）
     */
    private function calculateCompletenessScore($module_info) {
        $score = 0;
        $checks = ['has_content', 'has_handler', 'has_css', 'has_js', 'has_config', 'has_controllers', 'has_models'];
        
        foreach ($checks as $check) {
            if ($module_info[$check] ?? false) {
                $score += 1;
            }
        }
        
        return round(($score / count($checks)) * 100, 1);
    }
    
    /**
     * キャッシュ効率計算（module_detector.php 由来）
     */
    private function getCacheEfficiency() {
        if (!file_exists($this->cache_file)) {
            return 0;
        }
        
        $cache_age = time() - filemtime($this->cache_file);
        return max(0, round((($this->cache_duration - $cache_age) / $this->cache_duration) * 100, 1));
    }
}

// =====================================
// シングルトンインスタンス & ヘルパー関数
// =====================================

if (!isset($GLOBALS['ajax_module_router'])) {
    $GLOBALS['ajax_module_router'] = new AjaxModuleRouter();
}

/**
 * ヘルパー関数: インスタンス取得
 */
function getAjaxModuleRouter() {
    return $GLOBALS['ajax_module_router'];
}

/**
 * ヘルパー関数: Ajax実行
 */
function executeAjaxRoute($module, $action, $data = []) {
    return getAjaxModuleRouter()->executeAjax($module, $action, $data);
}

/**
 * ヘルパー関数: ルーティング
 */
function routeAjaxRequest($page, $action = '') {
    return getAjaxModuleRouter()->routeAjaxRequest($page, $action);
}

/**
 * 後方互換性: 既存関数名をサポート
 */
function detectModuleUnified($page, $action = '') {
    return routeAjaxRequest($page, $action);
}

function executeModuleAjaxUnified($module, $action, $data = []) {
    return executeAjaxRoute($module, $action, $data);
}

function getAllModulesUnified() {
    return getAjaxModuleRouter()->detectAllModules();
}

/**
 * ヘルパー関数: ハンドラー検索
 */
function findModuleHandler($module_name) {
    return getAjaxModuleRouter()->findModuleHandler($module_name);
}

/**
 * ヘルパー関数: デバッグ情報取得
 */
function getAjaxRouterDebugInfo() {
    return getAjaxModuleRouter()->getDebugInfo();
}

/**
 * ヘルパー関数: システム統計取得
 */
function getModuleSystemStatsUnified() {
    return getAjaxModuleRouter()->getSystemStats();
}

// =====================================
// 自動初期化（デバッグモード時）
// =====================================

if (defined('DEBUG_MODE') && DEBUG_MODE) {
    error_log("AjaxModuleRouter: 完全統合システム初期化完了 - " . __FILE__);
    error_log("統合元: auto_connector.php + module_detector.php");
}

?>