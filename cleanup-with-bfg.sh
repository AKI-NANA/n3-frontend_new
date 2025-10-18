#!/bin/bash

# BFG Repo-Cleanerを使用した安全なクリーンアップスクリプト

echo "=== BFG Repo-Cleaner使用ガイド ==="
echo ""
echo "BFGは git filter-branch より高速で安全です"
echo ""
echo "【インストール方法】"
echo "brew install bfg"
echo ""
echo "【実行手順】"
echo ""
echo "1. 機密情報パターンファイルを作成:"
echo "   cat > secrets.txt << EOF"
echo "   HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce"
echo "   PRD-7fae13b2cf17-be72-4584-bdd6-4ea4"
echo "   EOF"
echo ""
echo "2. BFGで機密情報を削除:"
echo "   bfg --replace-text secrets.txt"
echo ""
echo "3. Gitのクリーンアップ:"
echo "   git reflog expire --expire=now --all"
echo "   git gc --prune=now --aggressive"
echo ""
echo "4. 強制push:"
echo "   git push origin main --force"
echo ""
echo "==================================="

# 機密情報パターンファイルを自動生成
cat > secrets.txt << 'EOF'
HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce
PRD-7fae13b2cf17-be72-4584-bdd6-4ea4
v^1.1#i^1#r^1#p^3#I^3#f^0#t^Ul4xMF8wOkNGMzlEOUNGMTg0N0E1RUEwNzc4NjVFOUE0RDlEQzU3XzFfMSNFXjI2MA==
v^1.1#i^1#p^3#I^3#r^1#f^0#t^Ul4xMF84OjA2NTFFNTcwRUM1N0ZCNjY2OTczNjFEMTFCODM0RDg2XzFfMSNFXjI2MA==
EOF

echo ""
echo "✅ secrets.txt ファイルを作成しました"
echo ""

# BFGがインストールされているか確認
if command -v bfg &> /dev/null; then
    echo "BFGが見つかりました。自動実行しますか? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "機密情報を削除中..."
        bfg --replace-text secrets.txt
        
        echo "Gitクリーンアップ中..."
        git reflog expire --expire=now --all
        git gc --prune=now --aggressive
        
        echo ""
        echo "✅ 完了！次のコマンドで強制pushしてください:"
        echo "git push origin main --force"
    fi
else
    echo "⚠️ BFGがインストールされていません"
    echo "以下のコマンドでインストールしてください:"
    echo "brew install bfg"
fi
