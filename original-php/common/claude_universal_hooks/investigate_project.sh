#!/bin/bash
# プロジェクト構造調査スクリプト

echo "🔍 NAGANO-3プロジェクト構造調査"
echo "================================"

# メインディレクトリの確認
echo "📁 メインディレクトリ:"
ls -la /Users/aritahiroaki/NAGANO-3/N3-Development/ | head -20

echo ""
echo "📁 commonディレクトリ:"
ls -la /Users/aritahiroaki/NAGANO-3/N3-Development/common/ | head -20

echo ""
echo "📁 common/jsディレクトリ:"
find /Users/aritahiroaki/NAGANO-3/N3-Development/common/js -name "*.js" | head -10

echo ""
echo "📁 modulesディレクトリ:"
ls -la /Users/aritahiroaki/NAGANO-3/N3-Development/modules/ | head -20

echo ""
echo "🔍 kicho関連ファイル検索:"
find /Users/aritahiroaki/NAGANO-3/N3-Development -name "*kicho*" -type f | head -20

echo ""
echo "🔍 hooks関連ファイル検索:"
find /Users/aritahiroaki/NAGANO-3/N3-Development -name "*hooks*" -type f | head -20

echo ""
echo "調査完了"
