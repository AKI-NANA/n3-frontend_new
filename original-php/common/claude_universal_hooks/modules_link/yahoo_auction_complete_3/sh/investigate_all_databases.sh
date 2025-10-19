#!/bin/bash
# 🔍 NAGANO-3 データベース全体調査スクリプト

echo "🗄️ NAGANO-3 データベース全体調査"
echo "================================="

# データベースファイル検索
echo ""
echo "📁 Step 1: データベースファイル検索"
echo "SQLiteファイル検索:"
find /Users/aritahiroaki/NAGANO-3 -name "*.db" -type f 2>/dev/null | head -20

echo ""
echo "MySQLデータベース設定ファイル検索:"
find /Users/aritahiroaki/NAGANO-3 -name "*config*" -type f | grep -i mysql | head -10

echo ""
echo "データベース設定ファイル検索:"
find /Users/aritahiroaki/NAGANO-3 -name "*database*" -type f | head -10

echo ""
echo "📊 Step 2: 設定ファイル内容確認"
echo "PHPファイル内のデータベース接続確認:"
grep -r "nagano3_db\|inventory\|ebay\|amazon\|yahoo" /Users/aritahiroaki/NAGANO-3/N3-Development --include="*.php" | head -10

echo ""
echo "📋 Step 3: テーブル名検索"
echo "CREATE TABLE文の検索:"
grep -r "CREATE TABLE" /Users/aritahiroaki/NAGANO-3/N3-Development --include="*.sql" --include="*.php" | head -15

echo ""
echo "🔍 Step 4: 主要ディレクトリのSQL/PHPファイル確認"
echo "modules内のデータベース関連ファイル:"
find /Users/aritahiroaki/NAGANO-3/N3-Development/modules -name "*.sql" -o -name "*database*" -o -name "*config*" | head -20

echo ""
echo "📊 完了"
echo "================================="
