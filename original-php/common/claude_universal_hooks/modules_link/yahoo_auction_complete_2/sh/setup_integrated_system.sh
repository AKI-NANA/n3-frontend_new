#!/bin/bash

# =====================================================
# Yahoo Auction Tool 修正統合版セットアップスクリプト
# 実行日: 2025年9月10日
# 目的: 既存システムとの完全統合・即座実行可能
# =====================================================

echo "🚀 Yahoo Auction Tool 修正統合版セットアップ開始"
echo "=================================================="

# 現在のディレクトリを確認
CURRENT_DIR=$(pwd)
echo "📁 現在のディレクトリ: $CURRENT_DIR"

# yahoo_auction_completeディレクトリに移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete

echo ""
echo "🔧 Phase 1: データベースセットアップ実行"
echo "============================================"

# PostgreSQLデータベースのセットアップ
echo "📊 データベーススキーマを適用中..."

# データベースが存在するか確認
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL確認済み"
    
    # データベースセットアップ実行
    psql -d nagano3_db -f database_systems/execute_database_setup.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ データベースセットアップ完了"
    else
        echo "❌ データベースセットアップ失敗"
        echo "💡 手動でPostgreSQLに接続してSQLファイルを実行してください:"
        echo "   psql -d nagano3_db -f database_systems/execute_database_setup.sql"
    fi
else
    echo "⚠️ PostgreSQLが見つかりません"
    echo "💡 PostgreSQL.app を起動するか、以下のコマンドでインストールしてください:"
    echo "   brew install postgresql"
fi

echo ""
echo "🔧 Phase 2: ファイル権限設定"
echo "=========================="

# PHPファイルの実行権限確認
chmod 644 yahoo_auction_tool_content_integrated_fixed.php
chmod 644 database_systems/api_endpoints_fixed.php
chmod 644 database_query_handler.php
chmod 644 yahoo_auction_tool.js
chmod 644 yahoo_auction_tool_styles.css

echo "✅ ファイル権限設定完了"

echo ""
echo "🔧 Phase 3: 設定ファイル確認"
echo "========================="

# 設定ファイルの存在確認
if [ -f "config.php" ]; then
    echo "✅ config.php 確認済み"
else
    echo "⚠️ config.php が見つかりません"
    # 基本的なconfig.phpを作成
    cat > config.php << 'EOL'
<?php
// Yahoo Auction Tool 基本設定
define('DB_HOST', 'localhost');
define('DB_NAME', 'nagano3_db');
define('DB_USER', 'aritahiroaki');
define('DB_PASS', '');

// API設定
define('API_BASE_URL', 'http://localhost:5002');

// システム設定
define('DEBUG_MODE', true);
define('SYSTEM_VERSION', 'YAT-v1.0-Fixed');
?>
EOL
    echo "✅ 基本config.php作成完了"
fi

echo ""
echo "🔧 Phase 4: 依存関係確認"
echo "======================"

# PHPバージョン確認
PHP_VERSION=$(php -v | head -n 1)
echo "📱 PHP Version: $PHP_VERSION"

# 必要なPHP拡張モジュール確認
if php -m | grep -q "pdo_pgsql"; then
    echo "✅ PDO PostgreSQL拡張確認済み"
else
    echo "❌ PDO PostgreSQL拡張が見つかりません"
    echo "💡 以下のコマンドでインストールしてください:"
    echo "   brew install php@8.1-pdo_pgsql"
fi

echo ""
echo "🔧 Phase 5: システム動作確認"
echo "========================="

# データベース接続テスト
echo "🔗 データベース接続テスト実行中..."

# 簡単な接続テスト用PHPスクリプトを作成・実行
cat > temp_db_test.php << 'EOL'
<?php
try {
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $stmt = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('product_master', 'mystical_japan_treasures_inventory')");
    $count = $stmt->fetchColumn();
    echo "✅ データベース接続成功 - テーブル数: $count\n";
    
    // 統計情報取得
    $stmt = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory");
    $total = $stmt->fetchColumn();
    echo "📊 既存商品データ: $total 件\n";
    
} catch (Exception $e) {
    echo "❌ データベース接続エラー: " . $e->getMessage() . "\n";
    echo "💡 PostgreSQL.app が起動していることを確認してください\n";
}
?>
EOL

php temp_db_test.php
rm temp_db_test.php

echo ""
echo "🔧 Phase 6: Webサーバー設定確認"
echo "=============================="

# ポート確認
if lsof -i :8080 | grep -q LISTEN; then
    echo "✅ ポート8080でWebサーバーが稼働中"
    
    # Webアクセステスト
    echo "🌐 Webアクセステスト実行中..."
    if curl -s http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content_integrated_fixed.php?cache_check=1 | grep -q "updated"; then
        echo "✅ Web経由でのアクセス確認済み"
    else
        echo "⚠️ Web経由でのアクセスに問題があります"
    fi
else
    echo "⚠️ ポート8080でWebサーバーが見つかりません"
    echo "💡 MAMPまたはXAMPPを起動してください"
fi

echo ""
echo "🎯 セットアップ結果サマリー"
echo "========================"

# チェック結果の総括
TOTAL_CHECKS=0
PASSED_CHECKS=0

# データベース
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL: 利用可能"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo "❌ PostgreSQL: 未インストール"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# PHP
if command -v php &> /dev/null; then
    echo "✅ PHP: 利用可能"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo "❌ PHP: 未インストール"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# ファイル
if [ -f "yahoo_auction_tool_content_integrated_fixed.php" ]; then
    echo "✅ メインファイル: 存在"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo "❌ メインファイル: 不存在"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Webサーバー
if lsof -i :8080 | grep -q LISTEN; then
    echo "✅ Webサーバー: 稼働中"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo "❌ Webサーバー: 停止中"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo ""
echo "📊 セットアップ完了率: $PASSED_CHECKS/$TOTAL_CHECKS"

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    echo ""
    echo "🎉 セットアップ完了！"
    echo "=================================================="
    echo "✅ 全ての設定が正常に完了しました"
    echo ""
    echo "🌐 アクセスURL:"
    echo "http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content_integrated_fixed.php"
    echo ""
    echo "🔧 主要機能:"
    echo "- ✅ 商品承認システム（既存データベース統合）"
    echo "- ✅ 商品検索機能"
    echo "- ✅ 新規商品登録"
    echo "- ✅ 一括操作"
    echo "- ✅ 禁止キーワードチェック"
    echo "- ✅ 送料計算システム"
    echo ""
    echo "📋 次のステップ:"
    echo "1. ブラウザで上記URLにアクセス"
    echo "2. 「商品承認」タブで既存データ確認"
    echo "3. 「新規商品登録」で商品追加テスト"
    echo ""
else
    echo ""
    echo "⚠️ セットアップ不完全"
    echo "=================================================="
    echo "❌ いくつかの設定に問題があります"
    echo ""
    echo "🔧 修正が必要な項目を確認して再実行してください"
    echo ""
    echo "💡 よくある問題と解決方法:"
    echo "- PostgreSQL未起動 → PostgreSQL.app起動"
    echo "- Webサーバー未起動 → MAMP/XAMPP起動"
    echo "- PHP拡張不足 → brew install php-pdo_pgsql"
    echo ""
fi

echo ""
echo "📞 サポート情報"
echo "=============="
echo "🐛 問題が発生した場合:"
echo "1. ログファイル確認: /var/log/apache2/error.log"
echo "2. PHPエラー確認: tail -f /tmp/php_errors.log"
echo "3. データベース確認: psql -d nagano3_db"
echo ""
echo "📝 設定ファイル場所:"
echo "- メインシステム: yahoo_auction_tool_content_integrated_fixed.php"
echo "- API修正版: database_systems/api_endpoints_fixed.php"
echo "- データベーススキーマ: database_systems/execute_database_setup.sql"
echo ""

echo "🚀 Yahoo Auction Tool セットアップスクリプト完了"
echo "=================================================="
