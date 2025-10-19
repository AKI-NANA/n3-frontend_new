#!/bin/bash

# Yahoo Auction Complete 重複ファイル整理スクリプト
# 移動後の重複ファイルを整理し、最新版を保持

echo "🔍 Yahoo Auction Complete - 重複ファイル整理開始"

DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete"

# 1. 重複するPHPファイルの整理
echo "📁 PHPファイル重複整理中..."

# yahoo_auction_tool_content.phpの最新版確認
if [ -f "$DIR/yahoo_auction_tool_content_0911.php" ]; then
    echo "✅ 最新版 yahoo_auction_tool_content_0911.php を yahoo_auction_tool_content.php に統一"
    cp "$DIR/yahoo_auction_tool_content_0911.php" "$DIR/yahoo_auction_tool_content.php"
fi

# 2. CSS/JSファイルの重複確認
echo "📁 CSS/JSファイル重複確認中..."

# CSSファイル最新版確認
css_files=(
    "yahoo_auction_tool_styles_fixed.css"
    "approval_system.css"
    "phase2_ui_styles.css"
)

for file in "${css_files[@]}"; do
    if [ -f "$DIR/$file" ] && [ ! -f "$DIR/css/$file" ]; then
        mv "$DIR/$file" "$DIR/css/"
        echo "✅ $file を css/ ディレクトリに移動"
    fi
done

# 3. JavaScript重複ファイル整理
echo "📁 JavaScript重複ファイル整理中..."

js_files=(
    "yahoo_auction_tool.js"
    "approval_system.js"
    "database_integration.js"
    "phase2_cleanup.js"
    "prohibited_keywords_manager.js"
)

for file in "${js_files[@]}"; do
    if [ -f "$DIR/$file" ] && [ ! -f "$DIR/js/$file" ]; then
        mv "$DIR/$file" "$DIR/js/"
        echo "✅ $file を js/ ディレクトリに移動"
    fi
done

# 4. Pythonファイル整理
echo "📁 Pythonファイル整理中..."

python_files=(
    "*.py"
    "__init__.py"
)

for pattern in "${python_files[@]}"; do
    for file in $DIR/$pattern; do
        if [ -f "$file" ] && [ ! -f "$DIR/py/$(basename $file)" ]; then
            mv "$file" "$DIR/py/"
            echo "✅ $(basename $file) を py/ ディレクトリに移動"
        fi
    done
done

# 5. SQLファイル整理
echo "📁 SQLファイル整理中..."

for file in $DIR/*.sql; do
    if [ -f "$file" ] && [ ! -f "$DIR/sql/$(basename $file)" ]; then
        mv "$file" "$DIR/sql/"
        echo "✅ $(basename $file) を sql/ ディレクトリに移動"
    fi
done

# 6. シェルスクリプト整理
echo "📁 シェルスクリプト整理中..."

for file in $DIR/*.sh; do
    if [ -f "$file" ] && [ ! -f "$DIR/sh/$(basename $file)" ]; then
        mv "$file" "$DIR/sh/"
        echo "✅ $(basename $file) を sh/ ディレクトリに移動"
    fi
done

# 7. マークダウンファイル整理
echo "📁 マークダウンファイル整理中..."

for file in $DIR/*.md; do
    if [ -f "$file" ] && [ ! -f "$DIR/md/$(basename $file)" ]; then
        mv "$file" "$DIR/md/"
        echo "✅ $(basename $file) を md/ ディレクトリに移動"
    fi
done

# 8. 設定ファイル整理（ルートに残す）
echo "📁 設定ファイル確認中..."

config_files=(
    "config.php"
    "config.json"
    "pyvenv.cfg"
    "requirements.txt"
)

for file in "${config_files[@]}"; do
    if [ -f "$DIR/$file" ]; then
        echo "✅ $file - ルートディレクトリに配置済み"
    fi
done

# 9. 不要な重複ファイル削除
echo "🗑️ 不要な重複ファイル削除中..."

# バックアップファイルの確認
backup_patterns=(
    "*_backup.php"
    "*のコピー.php"
    "*のコピー2.php"
    "*のコピー3.php"
    "*.broken"
    "*.zip"
)

for pattern in "${backup_patterns[@]}"; do
    for file in $DIR/$pattern; do
        if [ -f "$file" ]; then
            echo "⚠️  バックアップファイル発見: $(basename $file) - 手動確認が必要"
        fi
    done
done

# 10. ディレクトリ構造最終確認
echo "📊 最終ディレクトリ構造確認..."

echo "📁 ディレクトリ構造:"
echo "├── css/ - $(ls -1 $DIR/css/ 2>/dev/null | wc -l | tr -d ' ') files"
echo "├── js/ - $(ls -1 $DIR/js/ 2>/dev/null | wc -l | tr -d ' ') files"
echo "├── py/ - $(ls -1 $DIR/py/ 2>/dev/null | wc -l | tr -d ' ') files"
echo "├── sql/ - $(ls -1 $DIR/sql/ 2>/dev/null | wc -l | tr -d ' ') files"
echo "├── sh/ - $(ls -1 $DIR/sh/ 2>/dev/null | wc -l | tr -d ' ') files"
echo "├── md/ - $(ls -1 $DIR/md/ 2>/dev/null | wc -l | tr -d ' ') files"
echo "└── その他ディレクトリ:"

for subdir in database scrapers api_servers csv_exports shipping_calculation utilities uploads ui_interfaces logs core_systems database_systems complete_system; do
    if [ -d "$DIR/$subdir" ]; then
        echo "    ├── $subdir/ - $(find $DIR/$subdir -type f 2>/dev/null | wc -l | tr -d ' ') files"
    fi
done

# 11. 整理完了レポート作成
cat > "$DIR/cleanup_report_$(date +%Y%m%d_%H%M%S).txt" << EOF
Yahoo Auction Complete ファイル整理完了レポート
整理日時: $(date)
対象ディレクトリ: $DIR

実行された整理:
✅ PHPファイルの最新版統一
✅ CSS/JSファイルの適切なディレクトリ配置
✅ Pythonファイルの py/ ディレクトリ移動
✅ SQLファイルの sql/ ディレクトリ移動
✅ シェルスクリプトの sh/ ディレクトリ移動
✅ マークダウンファイルの md/ ディレクトリ移動
✅ 設定ファイルの配置確認
✅ 不要ファイルの確認

ディレクトリ構造統一完了。
次のステップ:
1. システム動作確認
2. 重複ファイルの手動確認
3. バックアップファイルの削除検討
EOF

echo "✅ ファイル整理が完了しました！"
echo "📋 整理レポート: $DIR/cleanup_report_*.txt"
echo "🔍 次のコマンドで動作確認:"
echo "   http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php"
