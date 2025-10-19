<?php
/**
 * NAGANO-3 Pure PHP テーマコントローラー
 * JavaScript完全不要・サーバーサイドでテーマ管理
 * 📁 common/php/theme-controller.php
 */

class NAGANO3ThemeController {
    
    private $themes = [
        'light' => [
            'name' => 'ライト',
            'icon' => '☀️',
            'description' => '洗練された明るいテーマ',
            'primary_color' => '#3498db'
        ],
        'dark' => [
            'name' => 'ダーク',
            'icon' => '🌙',
            'description' => 'エレガントな暗黒テーマ',
            'primary_color' => '#58a6ff'
        ],
        'gentle' => [
            'name' => '目に優しい',
            'icon' => '🌿',
            'description' => '柔らかく落ち着いたテーマ',
            'primary_color' => '#8b7355'
        ],
        'vivid' => [
            'name' => 'ビビッド',
            'icon' => '🌈',
            'description' => 'カラフルで若々しいテーマ',
            'primary_color' => '#06b6d4'
        ],
        'ocean' => [
            'name' => 'オーシャン',
            'icon' => '🌊',
            'description' => '海をイメージした癒し系テーマ',
            'primary_color' => '#0ea5e9'
        ]
    ];
    
    private $default_theme = 'light';
    private $current_theme;
    
    public function __construct() {
        $this->handleThemeChange();
        $this->current_theme = $this->getCurrentTheme();
    }
    
    /**
     * テーマ変更処理
     */
    private function handleThemeChange() {
        if (isset($_POST['theme']) && $this->isValidTheme($_POST['theme'])) {
            $new_theme = $_POST['theme'];
            
            // セッションに保存
            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }
            $_SESSION['nagano3_theme'] = $new_theme;
            
            // クッキーに保存（30日間）
            setcookie('nagano3_theme', $new_theme, time() + (30 * 24 * 60 * 60), '/');
            
            // データベースに保存（ユーザーがログインしている場合）
            $this->saveThemeToDatabase($new_theme);
            
            // リダイレクトでPOSTデータをクリア
            $redirect_url = $_SERVER['REQUEST_URI'];
            // theme パラメータを追加
            $redirect_url .= (strpos($redirect_url, '?') !== false ? '&' : '?') . 'theme_changed=1';
            
            header("Location: $redirect_url");
            exit;
        }
    }
    
    /**
     * 現在のテーマを取得
     */
    public function getCurrentTheme() {
        // 1. URLパラメータから取得
        if (isset($_GET['theme']) && $this->isValidTheme($_GET['theme'])) {
            return $_GET['theme'];
        }
        
        // 2. POSTデータから取得
        if (isset($_POST['theme']) && $this->isValidTheme($_POST['theme'])) {
            return $_POST['theme'];
        }
        
        // 3. セッションから取得
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        if (isset($_SESSION['nagano3_theme']) && $this->isValidTheme($_SESSION['nagano3_theme'])) {
            return $_SESSION['nagano3_theme'];
        }
        
        // 4. クッキーから取得
        if (isset($_COOKIE['nagano3_theme']) && $this->isValidTheme($_COOKIE['nagano3_theme'])) {
            return $_COOKIE['nagano3_theme'];
        }
        
        // 5. データベースから取得（ユーザーがログインしている場合）
        $db_theme = $this->getThemeFromDatabase();
        if ($db_theme && $this->isValidTheme($db_theme)) {
            return $db_theme;
        }
        
        // 6. デフォルト
        return $this->default_theme;
    }
    
    /**
     * テーマが有効かチェック
     */
    private function isValidTheme($theme) {
        return array_key_exists($theme, $this->themes);
    }
    
    /**
     * テーマ切り替えボタンを生成
     */
    public function renderThemeSwitcher($type = 'dropdown') {
        $current = $this->getCurrentTheme();
        
        if ($type === 'radio') {
            return $this->renderRadioSwitcher($current);
        } else {
            return $this->renderDropdownSwitcher($current);
        }
    }
    
    /**
     * ラジオボタン形式のテーマ切り替え
     */
    private function renderRadioSwitcher($current) {
        $html = '<div class="theme-switcher-pure">';
        $html .= '<form method="POST" class="theme-form">';
        
        foreach ($this->themes as $theme_id => $theme_data) {
            $checked = $theme_id === $current ? 'checked' : '';
            $html .= sprintf(
                '<input type="radio" name="theme" value="%s" id="theme-%s" %s onchange="this.form.submit()">',
                htmlspecialchars($theme_id),
                htmlspecialchars($theme_id),
                $checked
            );
            $html .= sprintf(
                '<label for="theme-%s" title="%s %s"></label>',
                htmlspecialchars($theme_id),
                htmlspecialchars($theme_data['name']),
                htmlspecialchars($theme_data['description'])
            );
        }
        
        $html .= '</form>';
        $html .= '</div>';
        
        return $html;
    }
    
    /**
     * ドロップダウン形式のテーマ切り替え
     */
    private function renderDropdownSwitcher($current) {
        $current_theme_data = $this->themes[$current];
        
        $html = '<div class="theme-dropdown-pure">';
        $html .= '<div class="dropdown-trigger" tabindex="0">';
        $html .= sprintf(
            '<span class="theme-icon">%s</span>',
            $current_theme_data['icon']
        );
        $html .= sprintf(
            '<span class="theme-name">%s</span>',
            htmlspecialchars($current_theme_data['name'])
        );
        $html .= '<span class="dropdown-arrow">▼</span>';
        $html .= '</div>';
        
        $html .= '<div class="dropdown-content">';
        $html .= '<form method="POST" class="theme-form">';
        
        foreach ($this->themes as $theme_id => $theme_data) {
            $html .= sprintf(
                '<button type="submit" name="theme" value="%s" class="theme-option %s">',
                htmlspecialchars($theme_id),
                $theme_id === $current ? 'active' : ''
            );
            $html .= sprintf(
                '<span class="theme-icon">%s</span>',
                $theme_data['icon']
            );
            $html .= sprintf(
                '<div class="theme-info">
                    <div class="theme-name">%s</div>
                    <div class="theme-description">%s</div>
                </div>',
                htmlspecialchars($theme_data['name']),
                htmlspecialchars($theme_data['description'])
            );
            if ($theme_id === $current) {
                $html .= '<span class="theme-active-mark">✓</span>';
            }
            $html .= '</button>';
        }
        
        $html .= '</form>';
        $html .= '</div>';
        $html .= '</div>';
        
        return $html;
    }
    
    /**
     * テーマ切り替えリンクを生成
     */
    public function getThemeToggleUrl() {
        $themes_keys = array_keys($this->themes);
        $current_index = array_search($this->current_theme, $themes_keys);
        $next_index = ($current_index + 1) % count($themes_keys);
        $next_theme = $themes_keys[$next_index];
        
        // 現在のURLにthemeパラメータを追加
        $url = $_SERVER['REQUEST_URI'];
        $url = preg_replace('/[?&]theme=[^&]*/', '', $url);
        $separator = strpos($url, '?') !== false ? '&' : '?';
        
        return $url . $separator . 'theme=' . $next_theme;
    }
    
    /**
     * HTMLのdata-theme属性を生成
     */
    public function getThemeAttribute() {
        return sprintf('data-theme="%s"', htmlspecialchars($this->current_theme));
    }
    
    /**
     * CSSのmetaタグを生成
     */
    public function getThemeMetaTags() {
        $theme_data = $this->themes[$this->current_theme];
        $html = '';
        
        // theme-color
        $html .= sprintf(
            '<meta name="theme-color" content="%s">',
            $theme_data['primary_color']
        );
        
        // description
        $html .= sprintf(
            '<meta name="description" content="NAGANO-3 eBay管理システム - %s">',
            htmlspecialchars($theme_data['description'])
        );
        
        return $html;
    }
    
    /**
     * テーマ情報を取得
     */
    public function getCurrentThemeData() {
        return $this->themes[$this->current_theme];
    }
    
    /**
     * 全テーマ情報を取得
     */
    public function getAllThemes() {
        return $this->themes;
    }
    
    /**
     * テーマ変更通知を表示
     */
    public function renderThemeNotification() {
        if (isset($_GET['theme_changed'])) {
            $theme_data = $this->getCurrentThemeData();
            return sprintf(
                '<div class="theme-notification success">
                    <span class="theme-icon">%s</span>
                    <span>テーマを「%s」に変更しました</span>
                </div>',
                $theme_data['icon'],
                htmlspecialchars($theme_data['name'])
            );
        }
        return '';
    }
    
    /**
     * データベースにテーマを保存
     */
    private function saveThemeToDatabase($theme) {
        // ユーザーIDが利用可能な場合のみ保存
        if (isset($_SESSION['user_id'])) {
            try {
                // データベース接続（実際の接続情報に合わせて修正）
                // $pdo = new PDO('mysql:host=localhost;dbname=nagano3', $username, $password);
                // $stmt = $pdo->prepare("UPDATE users SET theme = ? WHERE id = ?");
                // $stmt->execute([$theme, $_SESSION['user_id']]);
            } catch (PDOException $e) {
                // エラーログに記録（画面には表示しない）
                error_log("Theme save error: " . $e->getMessage());
            }
        }
    }
    
    /**
     * データベースからテーマを取得
     */
    private function getThemeFromDatabase() {
        if (isset($_SESSION['user_id'])) {
            try {
                // データベース接続（実際の接続情報に合わせて修正）
                // $pdo = new PDO('mysql:host=localhost;dbname=nagano3', $username, $password);
                // $stmt = $pdo->prepare("SELECT theme FROM users WHERE id = ?");
                // $stmt->execute([$_SESSION['user_id']]);
                // $result = $stmt->fetch(PDO::FETCH_ASSOC);
                // return $result ? $result['theme'] : null;
            } catch (PDOException $e) {
                error_log("Theme load error: " . $e->getMessage());
            }
        }
        return null;
    }
    
    /**
     * テーマ変更フォームのCSRF対策
     */
    public function generateCSRFToken() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        
        return $_SESSION['csrf_token'];
    }
    
    /**
     * CSRF検証
     */
    public function verifyCSRFToken($token) {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
    }
}

// 使用例とヘルパー関数

/**
 * グローバルテーマコントローラーインスタンス
 */
$nagano3_theme = new NAGANO3ThemeController();

/**
 * ヘルパー関数：テーマ属性を取得
 */
function get_theme_attr() {
    global $nagano3_theme;
    return $nagano3_theme->getThemeAttribute();
}

/**
 * ヘルパー関数：テーマスイッチャーを表示
 */
function theme_switcher($type = 'dropdown') {
    global $nagano3_theme;
    return $nagano3_theme->renderThemeSwitcher($type);
}

/**
 * ヘルパー関数：テーマ切り替えリンクを取得
 */
function theme_toggle_url() {
    global $nagano3_theme;
    return $nagano3_theme->getThemeToggleUrl();
}

/**
 * ヘルパー関数：現在のテーマ名を取得
 */
function current_theme_name() {
    global $nagano3_theme;
    $theme_data = $nagano3_theme->getCurrentThemeData();
    return $theme_data['name'];
}

/**
 * HTML出力例
 * 
 * ページの<html>タグ:
 * <html lang="ja" <?= get_theme_attr() ?>>
 * 
 * ヘッダー内のテーマスイッチャー:
 * <?= theme_switcher('dropdown') ?>
 * 
 * シンプルな切り替えリンク:
 * <a href="<?= theme_toggle_url() ?>" class="theme-toggle">
 *     テーマ変更 (現在: <?= current_theme_name() ?>)
 * </a>
 * 
 * メタタグ:
 * <?= $nagano3_theme->getThemeMetaTags() ?>
 * 
 * 通知表示:
 * <?= $nagano3_theme->renderThemeNotification() ?>
 */

?>

<!-- CSS追加（PHP内で出力） -->
<style>
/* テーマスイッチャー用CSS（PHP内で出力される場合） */
.theme-form {
    margin: 0;
    display: inline-block;
}

.theme-dropdown-pure .dropdown-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition-normal);
}

.theme-dropdown-pure .dropdown-trigger:hover,
.theme-dropdown-pure .dropdown-trigger:focus {
    background: var(--bg-hover);
    border-color: var(--color-primary);
}

.theme-dropdown-pure .theme-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: var(--transition-normal);
    color: var(--text-primary);
}

.theme-dropdown-pure .theme-option:hover {
    background: var(--bg-hover);
}

.theme-dropdown-pure .theme-option.active {
    background: var(--color-primary);
    color: var(--text-white);
}

.theme-info {
    flex: 1;
}

.theme-name {
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.theme-description {
    font-size: 0.875rem;
    opacity: 0.8;
}

.theme-notification {
    position: fixed;
    top: 80px;
    right: 20px;
    background: var(--color-success);
    color: var(--text-white);
    padding: 1rem 1.5rem;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: var(--z-tooltip);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    animation: slideIn 0.3s ease;
}

@keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
}

/* 自動削除アニメーション */
.theme-notification {
    animation: slideIn 0.3s ease, slideOut 0.3s ease 2.7s forwards;
}

@keyframes slideOut {
    to { transform: translateX(100%); }
}
</style>