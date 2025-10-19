#!/bin/bash
# 🔍 NAGANO-3 全モジュールのデータベース構造調査

echo "🗄️ NAGANO-3 全モジュールデータベース構造調査"
echo "============================================="

echo ""
echo "📁 各モジュールのSQLファイル調査"
echo "================================"

# modulesディレクトリ内のSQLファイルを全て調査
find /Users/aritahiroaki/NAGANO-3/N3-Development/modules -name "*.sql" -type f | while read file; do
    echo ""
    echo "📄 ファイル: $(basename "$file")"
    echo "   パス: $file"
    echo "   CREATE TABLE文:"
    
    # CREATE TABLE文を抽出
    grep -i "CREATE TABLE" "$file" | head -5 | while read line; do
        table_name=$(echo "$line" | grep -oE 'CREATE TABLE [^(]+' | awk '{print $3}')
        echo "     - $table_name"
    done
    
    # ファイルサイズも表示
    size=$(wc -l < "$file" 2>/dev/null)
    echo "   行数: $size"
done

echo ""
echo "📊 主要モジュールの調査"
echo "====================="

# 重要なモジュールディレクトリを個別調査
for module in "shohin_kanri" "tanaoroshi" "zaiko_kanri" "ebay_viewer" "ebay_edit_test" "amazon_manager" "vero_system" "kicho" "maru9" "apikey"; do
    module_path="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/$module"
    if [ -d "$module_path" ]; then
        echo ""
        echo "🔍 $module モジュール:"
        
        # データベース関連ファイルを検索
        echo "   データベースファイル:"
        find "$module_path" -name "*.sql" -o -name "*database*" -o -name "*db*" -o -name "*config*" 2>/dev/null | head -5 | while read file; do
            echo "     - $(basename "$file")"
        done
        
        # PHPファイル内のCREATE TABLE文を検索
        echo "   PHPファイル内のテーブル定義:"
        find "$module_path" -name "*.php" -exec grep -l "CREATE TABLE\|create table" {} \; 2>/dev/null | head -3 | while read file; do
            echo "     - $(basename "$file")"
            grep -i "CREATE TABLE" "$file" | head -2 | while read line; do
                table_name=$(echo "$line" | grep -oE 'CREATE TABLE [^(]+' | awk '{print $3}' | tr -d '"'"'"'"'`')
                echo "       → $table_name"
            done
        done
    else
        echo "❌ $module: モジュールが存在しません"
    fi
done

echo ""
echo "📋 統計情報"
echo "==========="
echo "総SQLファイル数: $(find /Users/aritahiroaki/NAGANO-3/N3-Development/modules -name "*.sql" | wc -l)"
echo "総モジュール数: $(find /Users/aritahiroaki/NAGANO-3/N3-Development/modules -mindepth 1 -maxdepth 1 -type d | wc -l)"

echo ""
echo "🎯 調査完了"
echo "==========="
