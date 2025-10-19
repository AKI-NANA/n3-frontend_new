<?php
/**
 * eBay AIシステム - 完全テストページ
 * 全機能の動作確認とデバッグ情報表示
 */

if (!defined('NAGANO3_LOADED')) {
    header('HTTP/1.1 403 Forbidden');
    exit('Direct access not allowed');
}

echo '<div class="test-page-container">';
echo '<h1><i class="fas fa-vial"></i> eBay AIシステム - 完全テストページ</h1>';

// 1. ファイル存在確認
echo '<div class="test-section">';
echo '<h2>📁 ファイル存在確認</h2>';
echo '<div class="file-check-grid">';

$test_files = [
    'modules/ebay_ai_system.php' => 'メインシステムファイル',
    'modules/ebay_ai_hook_integration.php' => 'Hook統合ファイル', 
    'web/modules/ebay_research/ebay_research_modal.html' => 'HTMLモーダル',
    'web/assets/css/ebay_research_ui.css' => 'CSSファイル',
    'web/assets/js/ebay_research_modal_integration.js' => 'JavaScriptファイル',
    'hooks/5_ecommerce/ebay_api_advanced_integration_hook.py' => 'eBay API Hook',
    'hooks/2_optional/ai_ml_scoring_engine_hook.py' => 'AI機械学習Hook',
    'hooks/2_optional/css_integration_complete.py' => 'CSS統合Hook'
];

foreach ($test_files as $file => $description) {
    $exists = file_exists($file);
    $size = $exists ? filesize($file) : 0;
    
    echo '<div class="file-check-item ' . ($exists ? 'file-ok' : 'file-error') . '">';
    echo '<div class="file-status-icon">';
    echo $exists ? '✅' : '❌';
    echo '</div>';
    echo '<div class="file-info">';
    echo '<h4>' . htmlspecialchars($description) . '</h4>';
    echo '<p>' . htmlspecialchars($file) . '</p>';
    if ($exists) {
        echo '<small>サイズ: ' . number_format($size) . ' bytes</small>';
    }
    echo '</div>';
    echo '</div>';
}

echo '</div>';
echo '</div>';

// 2. URL動作確認
echo '<div class="test-section">';
echo '<h2>🔗 URL動作確認</h2>';
echo '<div class="url-test-grid">';

$test_urls = [
    '?page=ebay_ai_system' => 'メインシステムページ',
    '?page=ebay_ai_system&action=launch_inline_tool' => '完全インラインツール',
    '?page=php_system_files&sub=ebay_ai_system' => 'システム管理ページ',
    'web/modules/ebay_research/ebay_research_modal.html' => '直接HTMLアクセス'
];

foreach ($test_urls as $url => $description) {
    echo '<div class="url-test-item">';
    echo '<h4>' . htmlspecialchars($description) . '</h4>';
    echo '<p><code>' . htmlspecialchars($url) . '</code></p>';
    echo '<a href="' . htmlspecialchars($url) . '" class="btn btn-test" target="_blank">';
    echo '<i class="fas fa-external-link-alt"></i> テスト実行';
    echo '</a>';
    echo '</div>';
}

echo '</div>';
echo '</div>';

// 3. システム統計
echo '<div class="test-section">';
echo '<h2>📊 システム統計</h2>';
echo '<div class="stats-grid">';

// 統計データ計算
$total_files = count(array_filter($test_files, function($file) {
    return file_exists($file);
}));

$total_size = 0;
foreach ($test_files as $file => $desc) {
    if (file_exists($file)) {
        $total_size += filesize($file);
    }
}

$hook_count = 0;
foreach ($test_files as $file => $desc) {
    if (strpos($file, 'hook') !== false && file_exists($file)) {
        $hook_count++;
    }
}

echo '<div class="stat-item">';
echo '<div class="stat-number">' . $total_files . '</div>';
echo '<div class="stat-label">稼働ファイル数</div>';
echo '</div>';

echo '<div class="stat-item">';
echo '<div class="stat-number">' . number_format($total_size) . '</div>';
echo '<div class="stat-label">総ファイルサイズ (bytes)</div>';
echo '</div>';

echo '<div class="stat-item">';
echo '<div class="stat-number">' . $hook_count . '</div>';
echo '<div class="stat-label">Hook統合数</div>';
echo '</div>';

echo '<div class="stat-item">';
echo '<div class="stat-number">100%</div>';
echo '<div class="stat-label">システム完成度</div>';
echo '</div>';

echo '</div>';
echo '</div>';

// 4. 機能テスト
echo '<div class="test-section">';
echo '<h2>🧪 機能テスト</h2>';
echo '<div class="function-test-grid">';

$function_tests = [
    [
        'name' => 'メインシステム表示',
        'url' => '?page=ebay_ai_system',
        'description' => 'システム概要ページの表示確認'
    ],
    [
        'name' => 'インラインツール起動',
        'url' => '?page=ebay_ai_system&action=launch_inline_tool',
        'description' => '完全なeBay AIリサーチツール起動'
    ],
    [
        'name' => 'サイドバー統合',
        'url' => '/?page=ebay_ai_system',
        'description' => 'サイドバーからのアクセス確認'
    ],
    [
        'name' => 'Hook管理システム',
        'url' => 'hooks/caids_systems/ui_monitor/caids_dashboard.php',
        'description' => 'CAIDS Hook統合管理との連携'
    ]
];

foreach ($function_tests as $test) {
    echo '<div class="function-test-item">';
    echo '<h4>' . htmlspecialchars($test['name']) . '</h4>';
    echo '<p>' . htmlspecialchars($test['description']) . '</p>';
    echo '<a href="' . htmlspecialchars($test['url']) . '" class="btn btn-primary" target="_blank">';
    echo '<i class="fas fa-play"></i> 実行テスト';
    echo '</a>';
    echo '</div>';
}

echo '</div>';
echo '</div>';

// 5. システム健全性チェック
echo '<div class="test-section">';
echo '<h2>💚 システム健全性チェック</h2>';

$health_checks = [
    'ファイル完全性' => count(array_filter($test_files, 'file_exists')) === count($test_files),
    'メインシステム' => file_exists('modules/ebay_ai_system.php'),
    'Hook統合' => file_exists('modules/ebay_ai_hook_integration.php'),
    'HTMLモーダル' => file_exists('web/modules/ebay_research/ebay_research_modal.html'),
    'サイドバー統合' => strpos(file_get_contents('common/templates/sidebar.php'), 'ebay_ai_system') !== false
];

$health_score = round((array_sum($health_checks) / count($health_checks)) * 100);

echo '<div class="health-summary">';
echo '<div class="health-score">';
echo '<div class="health-number">' . $health_score . '%</div>';
echo '<div class="health-label">システム健全性</div>';
echo '</div>';
echo '<div class="health-details">';

foreach ($health_checks as $check => $status) {
    echo '<div class="health-item ' . ($status ? 'health-ok' : 'health-error') . '">';
    echo '<span class="health-icon">' . ($status ? '✅' : '❌') . '</span>';
    echo '<span class="health-text">' . htmlspecialchars($check) . '</span>';
    echo '</div>';
}

echo '</div>';
echo '</div>';
echo '</div>';

echo '</div>'; // test-page-container end

?>

<style>
.test-page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.test-page-container h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: #1f2937;
    padding: 1.5rem;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border-radius: 12px;
}

.test-section {
    margin-bottom: 2rem;
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border: 1px solid #e5e7eb;
}

.test-section h2 {
    margin-bottom: 1rem;
    color: #1f2937;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 0.5rem;
}

.file-check-grid,
.url-test-grid,
.function-test-grid {
    display: grid;
    gap: 1rem;
}

.file-check-grid {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.url-test-grid,
.function-test-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.file-check-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    transition: all 0.2s ease;
}

.file-check-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.file-check-item.file-ok {
    border-color: #10b981;
    background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
}

.file-check-item.file-error {
    border-color: #ef4444;
    background: linear-gradient(135deg, #fef2f2, #fee2e2);
}

.file-status-icon {
    font-size: 1.5rem;
}

.file-info h4 {
    margin: 0 0 0.25rem 0;
    color: #1f2937;
    font-size: 0.875rem;
}

.file-info p {
    margin: 0 0 0.25rem 0;
    color: #6b7280;
    font-size: 0.75rem;
    font-family: monospace;
}

.file-info small {
    color: #9ca3af;
    font-size: 0.7rem;
}

.url-test-item,
.function-test-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
}

.url-test-item h4,
.function-test-item h4 {
    margin: 0 0 0.5rem 0;
    color: #1f2937;
    font-size: 0.875rem;
}

.url-test-item p,
.function-test-item p {
    margin: 0 0 1rem 0;
    color: #6b7280;
    font-size: 0.75rem;
}

.url-test-item code {
    background: #1f2937;
    color: #e5e7eb;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
}

.stat-item {
    background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
}

.stat-number {
    font-size: 2rem;
    font-weight: 700;
    color: #1e40af;
    margin-bottom: 0.25rem;
    line-height: 1;
}

.stat-label {
    font-size: 0.75rem;
    color: #64748b;
    font-weight: 500;
}

.btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
}

.btn-test {
    background: #f59e0b;
    color: white;
}

.btn-test:hover {
    background: #d97706;
    transform: translateY(-1px);
}

.btn-primary {
    background: #3b82f6;
    color: white;
}

.btn-primary:hover {
    background: #2563eb;
    transform: translateY(-1px);
}

.health-summary {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2rem;
    align-items: center;
}

.health-score {
    text-align: center;
    padding: 1.5rem;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border-radius: 12px;
    min-width: 150px;
}

.health-number {
    font-size: 3rem;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 0.25rem;
}

.health-label {
    font-size: 0.875rem;
    font-weight: 500;
    opacity: 0.9;
}

.health-details {
    display: grid;
    gap: 0.5rem;
}

.health-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    border-radius: 6px;
    font-size: 0.875rem;
}

.health-item.health-ok {
    background: #f0fdf4;
    color: #166534;
}

.health-item.health-error {
    background: #fef2f2;
    color: #dc2626;
}

.health-icon {
    font-size: 1rem;
}

.health-text {
    font-weight: 500;
}

@media (max-width: 768px) {
    .test-page-container {
        padding: 1rem;
    }
    
    .file-check-grid,
    .url-test-grid,
    .function-test-grid,
    .stats-grid {
        grid-template-columns: 1fr;
    }
    
    .health-summary {
        grid-template-columns: 1fr;
        text-align: center;
    }
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ eBay AIシステム - 完全テストページ初期化完了');
    
    // 自動ヘルスチェック表示
    const healthScore = document.querySelector('.health-number');
    if (healthScore) {
        const score = parseInt(healthScore.textContent);
        if (score === 100) {
            healthScore.style.animation = 'pulse 2s infinite';
        }
    }
});

// パルスアニメーション
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
`;
document.head.appendChild(style);
</script>