<?php
/**
 * NAGANO-3 AI制御フィルター管理
 * 
 * @package NAGANO-3
 * @subpackage AI_Seigyo
 * @version 1.0.0
 */

// セキュリティチェック - メインシステムから呼び出されているかチェック
if (!defined('NAGANO3_SECURE')) {
    die('Direct access not permitted');
}

// 必要なファイルを読み込み
require_once __DIR__ . '/filters_content.php';

// ページタイトルとメタ情報
$page_title = 'AI多段階フィルター管理';
$page_description = 'AIを活用した多段階フィルタリングシステムの管理';
$current_page = 'ai_seigyo_filters';

// パンくずリスト設定
$breadcrumbs = [
    ['url' => '/?page=dashboard', 'text' => 'ダッシュボード'],
    ['url' => '/?page=ai_control', 'text' => 'AI制御デッキ'],
    ['url' => '#', 'text' => 'フィルター管理']
];
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($page_title) ?> - NAGANO-3</title>
    <meta name="description" content="<?= htmlspecialchars($page_description) ?>">
    
    <!-- CSS読み込み -->
    <link rel="stylesheet" href="/common/css/style.css">
    <link rel="stylesheet" href="/modules/ai_seigyo/filters.css">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="nagano3-body">
    <div class="nagano3-wrapper">
        
        <!-- サイドバー読み込み -->
        <?php 
        $current_page = 'ai_seigyo_filters';
        include __DIR__ . '/../../common/includes/sidebar.php'; 
        ?>
        
        <!-- メインコンテンツエリア -->
        <main class="nagano3-main" id="mainContent">
            
            <!-- ページヘッダー -->
            <div class="page-header">
                <div class="page-header__content">
                    <h1 class="page-header__title">
                        <i class="fas fa-filter"></i>
                        <?= htmlspecialchars($page_title) ?>
                    </h1>
                    <p class="page-header__description">
                        <?= htmlspecialchars($page_description) ?>
                    </p>
                </div>
                
                <!-- パンくずリスト -->
                <nav class="breadcrumb" aria-label="パンくずリスト">
                    <ol class="breadcrumb__list">
                        <?php foreach ($breadcrumbs as $index => $crumb): ?>
                        <li class="breadcrumb__item <?= $index === count($breadcrumbs) - 1 ? 'breadcrumb__item--current' : '' ?>">
                            <?php if ($crumb['url'] !== '#'): ?>
                                <a href="<?= htmlspecialchars($crumb['url']) ?>" class="breadcrumb__link">
                                    <?= htmlspecialchars($crumb['text']) ?>
                                </a>
                            <?php else: ?>
                                <span class="breadcrumb__text"><?= htmlspecialchars($crumb['text']) ?></span>
                            <?php endif; ?>
                        </li>
                        <?php endforeach; ?>
                    </ol>
                </nav>
            </div>
            
            <!-- フィルター管理コンテンツ -->
            <div class="page-content">
                <?php 
                // filters_content.phpの内容を出力
                // このファイルで実際のフィルター管理UIが定義されている
                ?>
            </div>
            
        </main>
    </div>
    
    <!-- JavaScript読み込み -->
    <script src="/common/js/script.js"></script>
    <script src="/modules/ai_seigyo/filters.js"></script>
    
    <script>
    // フィルター管理専用JavaScript
    document.addEventListener('DOMContentLoaded', function() {
        console.log('フィルター管理ページが読み込まれました');
        
        // フィルター実行ボタン
        const runAllFiltersBtn = document.getElementById('runAllFilters');
        if (runAllFiltersBtn) {
            runAllFiltersBtn.addEventListener('click', function() {
                alert('全フィルター実行機能は実装中です');
            });
        }
        
        // NGワード追加機能
        const addNgwordBtn = document.getElementById('addNgword');
        const ngwordInput = document.getElementById('ngwordInput');
        
        if (addNgwordBtn && ngwordInput) {
            addNgwordBtn.addEventListener('click', function() {
                const word = ngwordInput.value.trim();
                if (word) {
                    addNgWord(word);
                    ngwordInput.value = '';
                }
            });
            
            ngwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    addNgwordBtn.click();
                }
            });
        }
        
        // しきい値スライダー
        const imageThreshold = document.getElementById('imageThreshold');
        const imageThresholdValue = document.getElementById('imageThresholdValue');
        
        if (imageThreshold && imageThresholdValue) {
            imageThreshold.addEventListener('input', function() {
                imageThresholdValue.textContent = this.value + '%';
            });
        }
        
        const humanThreshold = document.getElementById('humanThreshold');
        const humanThresholdValue = document.getElementById('humanThresholdValue');
        
        if (humanThreshold && humanThresholdValue) {
            humanThreshold.addEventListener('input', function() {
                humanThresholdValue.textContent = this.value + '%';
            });
        }
    });
    
    // NGワード追加関数
    function addNgWord(word) {
        const ngwordTags = document.getElementById('ngwordTags');
        if (!ngwordTags) return;
        
        const tagElement = document.createElement('div');
        tagElement.className = 'filters__ngword-tag';
        tagElement.dataset.word = word;
        tagElement.innerHTML = `
            ${word} 
            <button class="filters__ngword-remove" onclick="removeNgWord(this)">×</button>
        `;
        
        ngwordTags.appendChild(tagElement);
    }
    
    // NGワード削除関数
    function removeNgWord(button) {
        const tag = button.closest('.filters__ngword-tag');
        if (tag) {
            tag.remove();
        }
    }
    </script>
</body>
</html>