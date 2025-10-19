<?php
// 11_category フォルダのインデックス - カテゴリー管理システムにリダイレクト
if (file_exists('frontend/index.html')) {
    header('Location: frontend/index.html');
} else {
    header('Location: index.html');
}
exit;
?>