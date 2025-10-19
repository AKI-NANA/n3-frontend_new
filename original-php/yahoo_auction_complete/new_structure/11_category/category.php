<?php
// 11_category.php - カテゴリー自動判定 メインファイル
// frontend/index.html への適切なリダイレクト

if (file_exists('frontend/index.html')) {
    // HTMLファイルの場合は直接表示
    $content = file_get_contents('frontend/index.html');
    echo $content;
} else {
    require_once 'index.php';
}
?>