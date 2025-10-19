#!/bin/bash
# PHP環境診断スクリプト

echo "🔍 PHP環境診断開始..."
echo "=================================================="

# 1. PHPのインストール確認
echo "📋 1. PHP インストール確認"
if command -v php &> /dev/null; then
    echo "✅ PHP がインストールされています"
    php --version
else
    echo "❌ PHP がインストールされていません"
    echo "   インストール方法:"
    echo "   brew install php"
fi
echo ""

# 2. PHPのパス確認
echo "📋 2. PHP パス確認"
which php
echo ""

# 3. ポート使用状況確認
echo "📋 3. ポート 8080 使用状況"
if lsof -i :8080 &> /dev/null; then
    echo "⚠️  ポート 8080 は使用中です"
    lsof -i :8080
    echo "   代替ポート 8081 を試してください: php -S localhost:8081"
else
    echo "✅ ポート 8080 は利用可能です"
fi
echo ""

# 4. 現在のディレクトリとファイル確認
echo "📋 4. 現在のディレクトリとファイル"
echo "現在位置: $(pwd)"
echo "PHPファイル:"
ls -la *.php 2>/dev/null || echo "PHPファイルがありません"
echo "HTMLファイル:"
ls -la *.html 2>/dev/null || echo "HTMLファイルがありません"
echo ""

# 5. ファイル権限確認
echo "📋 5. ファイル権限確認"
if [ -f "advanced_tariff_api.php" ]; then
    ls -la advanced_tariff_api.php
    echo "✅ advanced_tariff_api.php が存在します"
else
    echo "❌ advanced_tariff_api.php が見つかりません"
fi

if [ -f "advanced_tariff_calculator.html" ]; then
    ls -la advanced_tariff_calculator.html
    echo "✅ advanced_tariff_calculator.html が存在します"
else
    echo "❌ advanced_tariff_calculator.html が見つかりません"
fi
echo ""

# 6. PHP設定確認
echo "📋 6. PHP 設定確認"
php -m | grep -E "(curl|json|pdo)" || echo "必要な拡張モジュールが不足している可能性があります"
echo ""

# 7. 簡単なPHPテスト
echo "📋 7. PHP 動作テスト"
php -r "echo 'PHP is working: ' . phpversion() . PHP_EOL;"
echo ""

# 8. サーバー起動テスト
echo "📋 8. サーバー起動テスト"
echo "以下のコマンドでサーバーを起動してください:"
echo "php -S localhost:8080"
echo ""
echo "または代替ポート:"
echo "php -S localhost:8081"
echo ""

echo "=================================================="
echo "🎯 診断完了"
echo "問題がある場合は、上記の❌項目を解決してください"
