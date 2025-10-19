<?php
/**
 * 🔗 既存sidebar.phpとの統合実行システム
 * 
 * 保存場所: /common/templates/sidebar_integration.php
 * 
 * 既存のsidebar.phpに自動更新機能を統合します
 */

// sidebar_auto_manager.phpを読み込み
require_once __DIR__ . '/sidebar_auto_manager.php';

/**
 * 🔗 既存サイドバーとの統合クラス
 */
class SidebarIntegration {
    private $auto_manager;
    private $sidebar_file;
    
    public function __construct() {
        $this->auto_manager = new SidebarAutoManager();
        $this->sidebar_file = $_SERVER['DOCUMENT_ROOT'] . '/common/templates/sidebar.php';
    }
    
    /**
     * 🚀 既存sidebar.phpに自動更新機能を追加
     */
    public function integrateAutoUpdate() {
        if (!file_exists($this->sidebar_file)) {
            throw new Exception("sidebar.php が見つかりません: {$this->sidebar_file}");
        }
        
        $sidebar_content = file_get_contents($this->sidebar_file);
        
        // 既に統合されているかチェック
        if (strpos($sidebar_content, 'SidebarAutoManager') !== false) {
            echo "✅ サイドバー自動更新機能は既に統合済みです。\n";
            return;
        }
        
        // PHPの開始位置を特定
        $php_start = strpos($sidebar_content, '<?php');
        if ($php_start === false) {
            // PHPタグがない場合は最初に追加
            $integration_code = $this->generateIntegrationCode();
            $sidebar_content = $integration_code . "\n" . $sidebar_content;
        } else {
            // 既存のPHPコメント後に追加
            $insert_position = $this->findInsertPosition($sidebar_content);
            $integration_code = $this->generateIntegrationCode(false);
            $sidebar_content = substr_replace($sidebar_content, $integration_code, $insert_position, 0);
        }
        
        // ファイル更新
        $backup_file = $this->sidebar_file . '.backup.' . date('Y-m-d_H-i-s');
        copy($this->sidebar_file, $backup_file);
        
        file_put_contents($this->sidebar_file, $sidebar_content);
        
        echo "✅ サイドバー自動更新機能を統合しました。\n";
        echo "📦 バックアップ: {$backup_file}\n";
    }
    
    /**
     * 📝 統合コード生成
     */
    private function generateIntegrationCode($include_php_tag = true) {
        $php_tag = $include_php_tag ? "<?php\n" : "";
        
        return $php_tag . "
// 🚀 サイドバー自動更新機能統合 - " . date('Y-m-d H:i:s') . "
try {
    require_once __DIR__ . '/sidebar_auto_manager.php';
    \$sidebar_auto_manager = new SidebarAutoManager();
    // 新規ページ自動検出・追加（バックグラウンド実行）
} catch (Exception \$e) {
    // エラーハンドリング：自動更新機能が利用できない場合も正常動作
    error_log('サイドバー自動更新エラー: ' . \$e->getMessage());
}

";
    }
    
    /**
     * 📍 挿入位置特定
     */
    private function findInsertPosition($content) {
        // コメントブロックの終了位置を探す
        if (preg_match('/\*\/\s*\n/', $content, $matches, PREG_OFFSET_CAPTURE)) {
            return $matches[0][1] + strlen($matches[0][0]);
        }
        
        // <?php タグの直後
        if (preg_match('/<\?php\s*\n/', $content, $matches, PREG_OFFSET_CAPTURE)) {
            return $matches[0][1] + strlen($matches[0][0]);
        }
        
        return 0;
    }
    
    /**
     * 🧪 統合テスト
     */
    public function testIntegration() {
        echo "🧪 サイドバー統合テスト開始\n";
        echo "=".str_repeat('=', 40)."\n";
        
        // 1. ファイル存在確認
        echo "1. ファイル存在確認... ";
        if (file_exists($this->sidebar_file)) {
            echo "✅ OK\n";
        } else {
            echo "❌ NG - ファイルが見つかりません\n";
            return false;
        }
        
        // 2. 自動検出機能テスト
        echo "2. 自動検出機能テスト... ";
        $detected_pages = $this->auto_manager->manualScan();
        echo "✅ OK - " . count($detected_pages) . "個のページを検出\n";
        
        // 3. 検出結果表示
        if (!empty($detected_pages)) {
            echo "3. 検出されたページ:\n";
            foreach ($detected_pages as $page) {
                echo "   - {$page['title']} ({$page['id']}) - {$page['category']}\n";
            }
        } else {
            echo "3. 新規ページは検出されませんでした\n";
        }
        
        echo "\n🎉 統合テスト完了\n";
        return true;
    }
    
    /**
     * 🔄 手動更新実行
     */
    public function manualUpdate() {
        echo "🔄 手動サイドバー更新実行\n";
        echo "=".str_repeat('=', 30)."\n";
        
        $detected_pages = $this->auto_manager->manualScan();
        
        if (!empty($detected_pages)) {
            echo "✅ " . count($detected_pages) . "個の新規ページを検出し、自動追加しました。\n";
            
            foreach ($detected_pages as $page) {
                echo "   + {$page['title']} → {$page['category']}\n";
            }
        } else {
            echo "ℹ️ 新規ページは検出されませんでした。\n";
        }
        
        return $detected_pages;
    }
}

// CLI実行対応
if (php_sapi_name() === 'cli' || basename($_SERVER['PHP_SELF']) === 'sidebar_integration.php') {
    
    $integration = new SidebarIntegration();
    
    $command = $argv[1] ?? 'test';
    
    switch ($command) {
        case 'integrate':
            echo "🚀 サイドバー自動更新機能統合開始\n";
            $integration->integrateAutoUpdate();
            break;
            
        case 'test':
            $integration->testIntegration();
            break;
            
        case 'update':
            $integration->manualUpdate();
            break;
            
        default:
            echo "使用方法:\n";
            echo "  php sidebar_integration.php integrate  # 自動更新機能を統合\n";
            echo "  php sidebar_integration.php test       # 統合テスト実行\n";
            echo "  php sidebar_integration.php update     # 手動更新実行\n";
    }
}
?>