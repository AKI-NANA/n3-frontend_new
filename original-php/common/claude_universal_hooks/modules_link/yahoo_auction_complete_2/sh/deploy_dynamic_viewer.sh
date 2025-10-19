# 🔄 NAGANO-3 動的データベースビューア 配置スクリプト

echo "🔄 動的データベースビューア配置開始"
echo "===================================="

# 配置先ディレクトリ作成
mkdir -p /Users/aritahiroaki/NAGANO-3/N3-Development/modules/database_monitor

# HTMLファイル配置
echo "📄 HTMLファイル配置中..."
cp dynamic_database_viewer.html /Users/aritahiroaki/NAGANO-3/N3-Development/modules/database_monitor/

# APIファイル配置
echo "🔧 APIファイル配置中..."
cp dynamic_database_api.php /Users/aritahiroaki/NAGANO-3/N3-Development/modules/database_monitor/

# アクセス権限設定
chmod 755 /Users/aritahiroaki/NAGANO-3/N3-Development/modules/database_monitor/
chmod 644 /Users/aritahiroaki/NAGANO-3/N3-Development/modules/database_monitor/*.html
chmod 644 /Users/aritahiroaki/NAGANO-3/N3-Development/modules/database_monitor/*.php

echo ""
echo "✅ 動的データベースビューア配置完了！"
echo ""
echo "🌐 アクセス方法:"
echo "   http://localhost:8080/modules/database_monitor/dynamic_database_viewer.html"
echo ""
echo "🔄 機能:"
echo "   ✅ リアルタイムデータベース構造表示"
echo "   ✅ 自動テーブル検出・追加対応"
echo "   ✅ 動的統計情報更新"
echo "   ✅ テーブル構造・データ・分析機能"
echo "   ✅ 5分ごと自動更新"
echo ""
echo "📊 APIエンドポイント:"
echo "   - /modules/database_monitor/dynamic_database_api.php?endpoint=overview"
echo "   - /modules/database_monitor/dynamic_database_api.php?endpoint=tables"
echo "   - /modules/database_monitor/dynamic_database_api.php?endpoint=table-detail&table=テーブル名"
echo "   - /modules/database_monitor/dynamic_database_api.php?endpoint=real-time"
echo ""
echo "🚀 動的システム稼働準備完了！"
