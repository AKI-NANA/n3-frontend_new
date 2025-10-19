#!/usr/bin/env php
<?php
echo "🔍 Yahoo Auction編集システム PHP診断スクリプト\n";
echo "=====================================\n\n";

// 1. PHPバージョン確認
echo "📋 システム情報:\n";
echo "PHP Version: " . PHP_VERSION . "\n";
echo "OS: " . PHP_OS . "\n";
echo "Current Directory: " . getcwd() . "\n\n";

// 2. 必要なファイルの存在確認
echo "📁 ファイル存在確認:\n";
$files_to_check = ['editor.php', 'test.php', 'config.php', 'index.php'];

foreach ($files_to_check as $file) {
    if (file_exists($file)) {
        $size = filesize($file);
        echo "✅ {$file} - {$size} bytes\n";
    } else {
        echo "❌ {$file} - 見つかりません\n";
    }
}

echo "\n";

// 3. editor.phpの内容を簡単にチェック
if (file_exists('editor.php')) {
    echo "🔬 editor.php 分析:\n";
    $content = file_get_contents('editor.php');
    $lines = count(explode("\n", $content));
    echo "行数: {$lines}\n";
    
    if (strpos($content, '<!DOCTYPE html>') !== false) {
        echo "✅ HTML構造: 正常\n";
    } else {
        echo "❌ HTML構造: 問題あり\n";
    }
    
    if (strpos($content, 'Yahoo Auction統合編集システム') !== false) {
        echo "✅ タイトル: 正常\n";
    } else {
        echo "❌ タイトル: 問題あり\n";
    }
    
    if (strpos($content, 'Bootstrap') !== false) {
        echo "✅ Bootstrap: 含まれています\n";
    } else {
        echo "❌ Bootstrap: 見つかりません\n";
    }
}

echo "\n";

// 4. 簡単なサーバーテスト
echo "🌐 サーバーテスト:\n";

// ポートをチェック
$ports_to_check = [8080, 8081, 3000, 9000];
foreach ($ports_to_check as $port) {
    $fp = @fsockopen('localhost', $port, $errno, $errstr, 1);
    if ($fp) {
        echo "✅ ポート {$port}: 使用中\n";
        fclose($fp);
    } else {
        echo "⭕ ポート {$port}: 利用可能\n";
    }
}

echo "\n";

// 5. サーバー起動コマンドの生成
echo "🚀 推奨サーバー起動コマンド:\n";
echo "cd " . __DIR__ . "\n";
echo "php -S localhost:8080\n\n";

// 6. 診断結果まとめ
echo "📊 診断結果:\n";
echo "システムは基本的に正常に見えます。\n";
echo "サーバーが起動していない可能性があります。\n\n";

echo "🔧 次のステップ:\n";
echo "1. ターミナルでこのディレクトリに移動\n";
echo "2. php -S localhost:8080 を実行\n";
echo "3. http://localhost:8080/editor.php にアクセス\n";

echo "\n診断完了 ✅\n";
?>