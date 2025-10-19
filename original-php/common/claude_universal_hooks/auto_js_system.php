<?php
/**
 * 🚀 真の動的JSシステム - 前のチャットの本来の意図
 * 
 * 保存場所: /common/claude_universal_hooks/auto_js_system.php
 * 使用方法: require_once 'common/claude_universal_hooks/auto_js_system.php';
 * 
 * ✅ 完全自動検出
 * ✅ 設定ファイル不要
 * ✅ 追加時の設定変更不要
 */

class AutoDetectionJSSystem {
    private $project_root;
    private $js_search_paths;
    private $ajax_search_paths;
    private $cache = [];
    
    public function __construct($project_root = null) {
        $this->project_root = $project_root ?: $_SERVER['DOCUMENT_ROOT'];
        
        // JS検索パス（プロジェクト構造に合わせて自動設定）
        $this->js_search_paths = [
            // KICHO専用パス
            '/common/claude_universal_hooks/js/hooks/',
            '/common/claude_universal_hooks/js_copy/pages/',
            '/common/claude_universal_hooks/js/',
            
            // 一般的なJSパス
            '/common/js/pages/',
            '/common/js/modules/',
            '/js/pages/',
            '/js/modules/',
            '/assets/js/pages/',
            '/assets/js/modules/',
            
            // モジュール別パス
            '/modules/*/js/',
            '/modules/*/assets/',
        ];
        
        // Ajax Handler検索パス
        $this->ajax_search_paths = [
            '/modules/*/ajax_handler.php',
            '/modules/*/ajax.php',
            '/ajax/*_handler.php',
            '/common/ajax/*_handler.php',
            '/api/*/handler.php'
        ];
    }
    
    /**
     * 🔍 ページ用JSファイル自動検出
     */
    public function autoDetectPageJS($page) {
        // キャッシュチェック
        $cache_key = "js_detection_{$page}";
        if (isset($this->cache[$cache_key])) {
            return $this->cache[$cache_key];
        }
        
        $detected_files = [
            'main_files' => [],
            'dependency_files' => [],
            'config_files' => []
        ];
        
        // 1. メインJSファイル検出
        $main_patterns = [
            "{$page}.js",
            "{$page}_main.js", 
            "{$page}_controller.js",
            "{$page}_hooks.js",
            "index.js"
        ];
        
        foreach ($this->js_search_paths as $search_path) {
            $resolved_path = $this->resolvePath($search_path, $page);
            
            foreach ($main_patterns as $pattern) {
                $file_path = $resolved_path . $pattern;
                if ($this->fileExists($file_path)) {
                    $detected_files['main_files'][] = [
                        'file' => $file_path,
                        'web_path' => $this->getWebPath($