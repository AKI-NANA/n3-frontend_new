#!/bin/bash

# Advanced Tariff Calculator を適切なフォルダ（05_rieki）に移動
# 送料計算ではなく利益計算なので、05_riekiが適切

echo "🔄 Advanced Tariff Calculator フォルダ移動実行"
echo "09_shipping → 05_rieki へ移動します"

# 移動元・移動先パス
SOURCE_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping"
TARGET_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/05_rieki"

# 移動対象ファイル
TARIFF_FILES=(
    "advanced_tariff_calculator.php"
    "advanced_tariff_api_fixed.php"
    "tariff_settings_api.php"
    "create_advanced_profit_table.sql"
    "create_tariff_settings_table.sql"
    "setup_advanced_tariff_db.sh"
    "check_database_tariff.php"
)

echo "1. 移動先ディレクトリ確認・作成"
if [ ! -d "$TARGET_DIR" ]; then
    mkdir -p "$TARGET_DIR"
    echo "✅ 05_rieki ディレクトリ作成完了"
else
    echo "✅ 05_rieki ディレクトリ既存"
fi

echo "2. ファイル移動実行"
for file in "${TARIFF_FILES[@]}"; do
    if [ -f "$SOURCE_DIR/$file" ]; then
        cp "$SOURCE_DIR/$file" "$TARGET_DIR/$file"
        echo "✅ 移動完了: $file"
    else
        echo "⚠️  ファイル未発見: $file"
    fi
done

echo "3. 新しいアクセスURLファイル作成"
cat > "$TARGET_DIR/ACCESS_URLS.md" << 'EOF'
# Advanced Tariff Calculator - 新アクセスURL

## 📍 移動先URL (05_rieki)

### メインツール
```
http://localhost:8081/new_structure/05_rieki/advanced_tariff_calculator.php
```

### API
```
http://localhost:8081/new_structure/05_rieki/advanced_tariff_api_fixed.php?action=health
http://localhost:8081/new_structure/05_rieki/tariff_settings_api.php?action=health
```

### データベース確認
```
http://localhost:8081/new_structure/05_rieki/check_database_tariff.php
```

## 🔄 変更理由

- **旧配置**: 09_shipping (送料計算)
- **新配置**: 05_rieki (利益計算) 
- **理由**: 主機能が利益・ROI・関税計算のため

## 🔗 統合メニュー更新

yahoo_auction_complete_11tools.html のリンクを以下に変更:
```
new_structure/05_rieki/advanced_tariff_calculator.php
```
EOF

echo "4. 統合メニューファイル更新"
MENU_FILE="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/yahoo_auction_complete_11tools.html"

if [ -f "$MENU_FILE" ]; then
    # バックアップ作成
    cp "$MENU_FILE" "$MENU_FILE.backup_$(date +%Y%m%d_%H%M%S)"
    
    # リンク更新（もしあれば）
    sed -i.tmp 's|new_structure/09_shipping/advanced_tariff_calculator.php|new_structure/05_rieki/advanced_tariff_calculator.php|g' "$MENU_FILE"
    rm -f "$MENU_FILE.tmp"
    
    echo "✅ 統合メニューファイル更新完了"
else
    echo "⚠️  統合メニューファイルが見つかりません: $MENU_FILE"
fi

echo "5. 設定保存機能セットアップ"
cd "$TARGET_DIR"

# 設定テーブル作成
if command -v psql >/dev/null 2>&1; then
    echo "📊 設定保存テーブル作成中..."
    if psql -h localhost -d nagano3_db -U postgres -f create_tariff_settings_table.sql > /dev/null 2>&1; then
        echo "✅ advanced_tariff_settings テーブル作成完了"
    else
        echo "⚠️  テーブル作成に失敗（手動実行が必要）"
    fi
else
    echo "⚠️  psqlコマンドが見つかりません（手動でSQLを実行してください）"
fi

echo ""
echo "🎉 移動完了！"
echo "=================================================="
echo "新しいアクセスURL:"
echo "http://localhost:8081/new_structure/05_rieki/advanced_tariff_calculator.php"
echo ""
echo "設定保存機能:"
echo "- デフォルト値の自動読み込み"
echo "- 設定変更の永続保存"
echo "- プリセット商品登録"
echo ""
echo "次のステップ:"
echo "1. 新URLでアクセス確認"
echo "2. 設定保存機能のテスト"
echo "3. プリセット登録機能のテスト"
