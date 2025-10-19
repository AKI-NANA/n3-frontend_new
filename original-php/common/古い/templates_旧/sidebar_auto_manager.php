<?php
/**
 * 🚀 サイドバー自動更新システム - 新規ツール自動検出・追加
 * 
 * 保存場所: /common/templates/sidebar_auto_manager.php
 * 
 * 【機能】
 * ✅ 新規ページ自動検出
 * ✅ サイドバーメニュー自動追加
 * ✅ index.phpルーティング自動追加
 * ✅ 適切なカテゴリ自動判定
 * ✅ アイコン自動選定
 * ✅ 既存の手動設定を維持
 */

class SidebarAutoManager {
    private $project_root;
    private $sidebar_config_file;
    private $auto_detected_pages = [];
    private $manual_overrides = [];
    
    public function __construct($project_root = null) {
        $this->project_root = $project_root ?: $_SERVER['DOCUMENT_ROOT'];
        $this->sidebar_config_file = $this->project_root . '/common/config/sidebar_auto_config.json';
        
        // 既存設定読み込み
        $this->loadExistingConfig();
        
        // 新規ページ自動検出
        $this->autoDetectNewPages();
    }
    
    /**
     * 🔍 新規ページ自動検出
     */
    private function autoDetectNewPages() {
        $detection_paths = [
            // ページファイル検出
            '/pages/*.php',
            '/modules/*/pages/*.php', 
            '/modules/*/*.php',
            '/content/*.php',
            
            // コントローラー検出
            '/controllers/*.php',
            '/modules/*/controllers/*.php',
            
            // 特定パターン検出
            '/modules/*_content.php',
            '/modules/*_main.php'
        ];
        
        foreach ($detection_paths as $pattern) {
            $files = glob($this->project_root . $pattern);
            
            foreach ($files as $file) {
                $page_info = $this->analyzePageFile($file);
                if ($page_info && !$this->isPageKnown($page_info['id'])) {
                    $this->auto_detected_pages[] = $page_info;
                }
            }
        }
        
        // 新規検出があれば自動追加
        if (!empty($this->auto_detected_pages)) {
            $this->autoAddToSidebar();
        }
    }
    
    /**
     * 📝 ページファイル分析
     */
    private function analyzePageFile($file_path) {
        $content = file_get_contents($file_path);
        $filename = basename($file_path, '.php');
        
        // ページタイトル検出
        $title = $this->extractPageTitle($content, $filename);
        
        // カテゴリ自動判定
        $category = $this->autoDetectCategory($filename, $content);
        
        // アイコン自動選定
        $icon = $this->autoSelectIcon($filename, $content);
        
        // 実装状況判定
        $status = $this->detectImplementationStatus($content);
        
        return [
            'id' => $filename,
            'title' => $title,
            'category' => $category,
            'icon' => $icon,
            'status' => $status,
            'file_path' => $file_path,
            'url' => "?page={$filename}",
            'auto_detected' => true,
            'detection_time' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * 🎯 ページタイトル抽出
     */
    private function extractPageTitle($content, $filename) {
        // コメントからタイトル検出
        if (preg_match('/\*\s*タイトル[:\s]*([^\n\r*]+)/i', $content, $matches)) {
            return trim($matches[1]);
        }
        
        // HTML titleタグ検出
        if (preg_match('/<title>([^<]+)<\/title>/i', $content, $matches)) {
            return trim($matches[1]);
        }
        
        // H1タグ検出
        if (preg_match('/<h1[^>]*>([^<]+)<\/h1>/i', $content, $matches)) {
            return trim(strip_tags($matches[1]));
        }
        
        // ファイル名から推測
        return $this->generateTitleFromFilename($filename);
    }
    
    /**
     * 🔍 カテゴリ自動判定
     */
    private function autoDetectCategory($filename, $content) {
        $category_patterns = [
            'shohin' => '商品管理',
            'zaiko' => '在庫管理', 
            'juchu' => '受注管理',
            'kicho' => '記帳・会計',
            'apikey' => 'システム管理',
            'ai_' => 'AI制御システム',
            'test' => 'システム管理',
            'debug' => 'システム管理',
            'setting' => 'システム管理',
            'admin' => 'システム管理',
            'report' => 'その他',
            'analysis' => 'その他'
        ];
        
        foreach ($category_patterns as $pattern => $category) {
            if (strpos($filename, $pattern) !== false) {
                return $category;
            }
        }
        
        // コンテンツから判定
        $content_lower = strtolower($content);
        if (strpos($content_lower, '商品') !== false) return '商品管理';
        if (strpos($content_lower, '在庫') !== false) return '在庫管理';
        if (strpos($content_lower, '受注') !== false) return '受注管理';
        if (strpos($content_lower, '記帳') !== false) return '記帳・会計';
        if (strpos($content_lower, 'ai') !== false) return 'AI制御システム';
        
        return 'その他'; // デフォルト
    }
    
    /**
     * 🎨 アイコン自動選定
     */
    private function autoSelectIcon($filename, $content) {
        $icon_patterns = [
            // 商品管理
            'shohin' => 'fas fa-cube',
            'product' => 'fas fa-cube',
            
            // 在庫管理
            'zaiko' => 'fas fa-warehouse',
            'inventory' => 'fas fa-warehouse',
            'stock' => 'fas fa-boxes',
            
            // 受注管理
            'juchu' => 'fas fa-shopping-cart',
            'order' => 'fas fa-shopping-cart',
            
            // 記帳・会計
            'kicho' => 'fas fa-calculator',
            'accounting' => 'fas fa-calculator',
            'kaikei' => 'fas fa-chart-pie',
            
            // AI関連
            'ai_' => 'fas fa-robot',
            'predict' => 'fas fa-crystal-ball',
            'ml_' => 'fas fa-brain',
            
            // システム関連
            'apikey' => 'fas fa-key',
            'setting' => 'fas fa-cogs',
            'config' => 'fas fa-sliders-h',
            'test' => 'fas fa-vial',
            'debug' => 'fas fa-search',
            'admin' => 'fas fa-shield-alt',
            
            // その他
            'report' => 'fas fa-chart-line',
            'analysis' => 'fas fa-chart-bar',
            'calendar' => 'fas fa-calendar-alt',
            'image' => 'fas fa-images',
            'file' => 'fas fa-folder-open',
            'backup' => 'fas fa-database',
            'log' => 'fas fa-file-alt'
        ];
        
        foreach ($icon_patterns as $pattern => $icon) {
            if (strpos($filename, $pattern) !== false) {
                return $icon;
            }
        }
        
        return 'fas fa-tools'; // デフォルト
    }
    
    /**
     * ✅ 実装状況検出
     */
    private function detectImplementationStatus($content) {
        // 実装完了の指標
        if (strpos($content, 'class ') !== false && 
            strpos($content, 'function ') !== false &&
            strlen($content) > 1000) {
            return 'ready';
        }
        
        // 開発中の指標
        if (strpos($content, 'TODO') !== false || 
            strpos($content, '開発中') !== false ||
            strpos($content, 'development') !== false) {
            return 'development';
        }
        
        // 基本実装あり
        if (strlen($content) > 500) {
            return 'basic';
        }
        
        return 'pending'; // 準備中
    }
    
    /**
     * 🚀 サイドバー自動追加
     */
    private function autoAddToSidebar() {
        $sidebar_file = $this->project_root . '/common/templates/sidebar.php';
        $sidebar_content = file_get_contents($sidebar_file);
        
        foreach ($this->auto_detected_pages as $page) {
            // 既に存在するかチェック
            if (strpos($sidebar_content, $page['id']) !== false) {
                continue;
            }
            
            // 適切な位置に挿入
            $insertion_point = $this->findInsertionPoint($sidebar_content, $page['category']);
            $menu_item = $this->generateMenuItemHTML($page);
            
            $sidebar_content = $this->insertAtPosition($sidebar_content, $insertion_point, $menu_item);
        }
        
        // ファイル更新
        file_put_contents($sidebar_file, $sidebar_content);
        
        // index.phpルーティング追加
        $this->autoAddToRouting();
        
        // 設定保存
        $this->saveAutoConfig();
    }
    
    /**
     * 📍 挿入位置特定
     */
    private function findInsertionPoint($content, $category) {
        $category_patterns = [
            '商品管理' => '/<!-- サブメニュー1 -->.*?<\/div>/s',
            '在庫管理' => '/<!-- サブメニュー2 -->.*?<\/div>/s',
            '受注管理' => '/<!-- サブメニュー3 -->.*?<\/div>/s',
            'AI制御システム' => '/<!-- サブメニュー4 -->.*?<\/div>/s',
            '記帳・会計' => '/<!-- サブメニュー5 -->.*?<\/div>/s',
            'システム管理' => '/<!-- サブメニュー6 -->.*?<\/div>/s',
            'その他' => '/<!-- サブメニュー7 -->.*?<\/div>/s'
        ];
        
        if (isset($category_patterns[$category])) {
            if (preg_match($category_patterns[$category], $content, $matches, PREG_OFFSET_CAPTURE)) {
                // 対応する</div>の直前に挿入
                return $matches[0][1] + strlen($matches[0][0]) - 6; // "</div>"の前
            }
        }
        
        // デフォルト：その他カテゴリの最後
        if (preg_match('/<!-- サブメニュー7 -->.*?<\/div>/s', $content, $matches, PREG_OFFSET_CAPTURE)) {
            return $matches[0][1] + strlen($matches[0][0]) - 6;
        }
        
        return strlen($content) - 100; // フォールバック
    }
    
    /**
     * 🎨 メニューアイテムHTML生成
     */
    private function generateMenuItemHTML($page) {
        $status_html = '';
        switch ($page['status']) {
            case 'ready':
                $status_html = '<span class="status-ready">✓</span>';
                break;
            case 'development':
                $status_html = '<span class="status-pending">開発中</span>';
                break;
            case 'basic':
                $status_html = '<span class="status-pending">基本実装</span>';
                break;
            default:
                $status_html = '<span class="status-pending">準備中</span>';
        }
        
        return "                <a href=\"{$page['url']}\" class=\"unified-submenu-link\">\n" .
               "                    <span><i class=\"{$page['icon']}\"></i>{$page['title']}</span>\n" .
               "                    {$status_html}\n" .
               "                </a>\n";
    }
    
    /**
     * 📝 index.phpルーティング自動追加
     */
    private function autoAddToRouting() {
        $index_file = $this->project_root . '/index.php';
        
        if (!file_exists($index_file)) {
            return;
        }
        
        $index_content = file_get_contents($index_file);
        
        foreach ($this->auto_detected_pages as $page) {
            // 既にルーティングが存在するかチェック
            if (strpos($index_content, "'{$page['id']}'") !== false) {
                continue;
            }
            
            // ルーティング追加パターンを検出
            $routing_pattern = "/case\\s+['\"]([^'\"]+)['\"]:/";
            
            if (preg_match_all($routing_pattern, $index_content, $matches, PREG_OFFSET_CAPTURE)) {
                // 最後のcaseの後に追加
                $last_match = end($matches[0]);
                $insertion_point = $last_match[1] + strlen($last_match[0]);
                
                $routing_code = "\n            case '{$page['id']}':\n" .
                              "                \$page_title = '{$page['title']}';\n" .
                              "                \$page_content = '{$page['id']}_content';\n" .
                              "                break;\n";
                
                $index_content = substr_replace($index_content, $routing_code, $insertion_point, 0);
            }
        }
        
        file_put_contents($index_file, $index_content);
    }
    
    /**
     * 💾 設定保存
     */
    private function saveAutoConfig() {
        $config = [
            'last_scan' => date('Y-m-d H:i:s'),
            'auto_detected_pages' => $this->auto_detected_pages,
            'manual_overrides' => $this->manual_overrides
        ];
        
        $config_dir = dirname($this->sidebar_config_file);
        if (!is_dir($config_dir)) {
            mkdir($config_dir, 0755, true);
        }
        
        file_put_contents($this->sidebar_config_file, json_encode($config, JSON_PRETTY_PRINT));
    }
    
    /**
     * 📖 既存設定読み込み
     */
    private function loadExistingConfig() {
        if (file_exists($this->sidebar_config_file)) {
            $config = json_decode(file_get_contents($this->sidebar_config_file), true);
            if ($config) {
                $this->manual_overrides = $config['manual_overrides'] ?? [];
            }
        }
    }
    
    /**
     * 🔍 ページ既知チェック
     */
    private function isPageKnown($page_id) {
        // sidebar.phpに既に存在するかチェック
        $sidebar_file = $this->project_root . '/common/templates/sidebar.php';
        if (file_exists($sidebar_file)) {
            $content = file_get_contents($sidebar_file);
            if (strpos($content, $page_id) !== false) {
                return true;
            }
        }
        
        // 手動除外リストチェック
        return in_array($page_id, $this->manual_overrides['excluded'] ?? []);
    }
    
    /**
     * 📝 ファイル名からタイトル生成
     */
    private function generateTitleFromFilename($filename) {
        $title_map = [
            'shohin_content' => '商品一覧',
            'zaiko_content' => '在庫一覧', 
            'juchu_kanri_content' => '受注一覧',
            'kicho_content' => '記帳メイン',
            'apikey_content' => 'APIキー管理'
        ];
        
        if (isset($title_map[$filename])) {
            return $title_map[$filename];
        }
        
        // アンダースコア・ハイフンを空白に変換し、単語の先頭を大文字化
        $title = str_replace(['_', '-'], ' ', $filename);
        return ucwords($title);
    }
    
    /**
     * 📍 位置挿入
     */
    private function insertAtPosition($content, $position, $text) {
        return substr_replace($content, $text, $position, 0);
    }
    
    /**
     * 🚀 手動実行メソッド
     */
    public function manualScan() {
        $this->auto_detected_pages = [];
        $this->autoDetectNewPages();
        return $this->auto_detected_pages;
    }
    
    /**
     * 📋 検出結果取得
     */
    public function getDetectedPages() {
        return $this->auto_detected_pages;
    }
    
    /**
     * ⚙️ 手動除外設定
     */
    public function excludePage($page_id) {
        if (!isset($this->manual_overrides['excluded'])) {
            $this->manual_overrides['excluded'] = [];
        }
        $this->manual_overrides['excluded'][] = $page_id;
        $this->saveAutoConfig();
    }
    
    /**
     * 🔧 手動ページ追加
     */
    public function addManualPage($page_info) {
        // 手動で指定されたページ情報を追加
        $this->auto_detected_pages[] = $page_info;
        return true;
    }
    
    /**
     * 🚀 新規ページでサイドバー更新実行
     */
    public function updateSidebarWithNewPages() {
        if (empty($this->auto_detected_pages)) {
            return ['success' => false, 'error' => '追加するページがありません'];
        }
        
        try {
            $this->autoAddToSidebar();
            return ['success' => true, 'added_pages' => count($this->auto_detected_pages)];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}

// 使用例・自動実行
if (basename($_SERVER['PHP_SELF']) === 'sidebar_auto_manager.php') {
    // 直接アクセスされた場合の手動実行
    $manager = new SidebarAutoManager();
    $detected = $manager->getDetectedPages();
    
    echo "<h2>🔍 サイドバー自動検出結果</h2>";
    echo "<p>検出された新規ページ: " . count($detected) . "個</p>";
    
    if (!empty($detected)) {
        echo "<ul>";
        foreach ($detected as $page) {
            echo "<li>{$page['title']} ({$page['id']}) - {$page['category']}</li>";
        }
        echo "</ul>";
        echo "<p>✅ サイドバーとルーティングに自動追加されました。</p>";
    } else {
        echo "<p>新規ページは検出されませんでした。</p>";
    }
}
?>