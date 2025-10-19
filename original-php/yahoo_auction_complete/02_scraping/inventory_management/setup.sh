#!/bin/bash

# 🚀 在庫管理 完全自動価格更新システム - セットアップスクリプト
# 実行方法: bash setup.sh

echo "🚀 在庫管理システム セットアップ開始..."

# 現在のディレクトリを取得
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "📁 作業ディレクトリ: $SCRIPT_DIR"

# Step 1: ログディレクトリ作成
echo ""
echo "📂 Step 1: ログディレクトリ作成..."
mkdir -p "$SCRIPT_DIR/logs"
chmod 755 "$SCRIPT_DIR/logs"
echo "✅ ログディレクトリ作成完了: $SCRIPT_DIR/logs"

# Step 2: データベーススキーマ実行
echo ""
echo "🗄️  Step 2: データベーススキーマ実行..."
psql -U postgres -d nagano3_db -f "$SCRIPT_DIR/database/auto_price_update_schema.sql"

if [ $? -eq 0 ]; then
    echo "✅ データベーススキーマ実行完了"
else
    echo "❌ データベーススキーマ実行失敗"
    echo "手動で実行してください: psql -U postgres -d nagano3_db -f $SCRIPT_DIR/database/auto_price_update_schema.sql"
fi

# Step 3: Cronスクリプトに実行権限付与
echo ""
echo "🔐 Step 3: 実行権限設定..."
chmod +x "$SCRIPT_DIR/cron/check_inventory.php"
echo "✅ 実行権限付与完了"

# Step 4: 初回一括登録実行
echo ""
echo "📦 Step 4: 初回一括登録実行..."
echo "出品済み商品を在庫管理に一括登録します..."
php "$SCRIPT_DIR/cron/check_inventory.php" --init

if [ $? -eq 0 ]; then
    echo "✅ 初回一括登録完了"
else
    echo "⚠️  初回一括登録でエラーが発生しました（商品がない場合は正常です）"
fi

# Step 5: Cron設定情報表示
echo ""
echo "⏰ Step 5: Cron設定（手動で実行してください）"
echo "以下のコマンドを実行してcrontabを編集してください:"
echo ""
echo "  crontab -e"
echo ""
echo "そして以下の行を追加してください:"
echo ""
echo "  # 在庫管理 自動価格更新 (2時間毎)"
echo "  0 */2 * * * php $SCRIPT_DIR/cron/check_inventory.php >> $SCRIPT_DIR/logs/inventory_cron.log 2>&1"
echo ""

# Step 6: APIエンドポイント情報表示
echo ""
echo "🔗 Step 6: APIエンドポイント情報"
echo "以下のAPIが利用可能です:"
echo ""
echo "  在庫チェック+自動更新:"
echo "  curl -X POST 'http://localhost/api/auto_update_price.php?action=check_and_update'"
echo ""
echo "  全価格一括同期:"
echo "  curl -X POST 'http://localhost/api/auto_update_price.php?action=sync_all_prices'"
echo ""
echo "  更新履歴取得:"
echo "  curl 'http://localhost/api/auto_update_price.php?action=get_update_history'"
echo ""
echo "  同期ステータス確認:"
echo "  curl 'http://localhost/api/auto_update_price.php?action=get_sync_status'"
echo ""

# 完了メッセージ
echo ""
echo "🎉 セットアップ完了!"
echo ""
echo "📋 次のステップ:"
echo "1. eBay API認証情報を.envファイルに設定"
echo "2. 上記のcron設定を手動で実行"
echo "3. 動作確認: php $SCRIPT_DIR/cron/check_inventory.php"
echo ""
echo "📚 詳細ドキュメント: $SCRIPT_DIR/docs/AUTO_PRICE_UPDATE_IMPLEMENTATION.md"
echo ""
