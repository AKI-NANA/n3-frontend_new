#!/bin/bash

echo "==================================="
echo "Git Push エラー - 迅速解決ガイド"
echo "==================================="
echo ""
echo "選択してください:"
echo ""
echo "1. GitHubのWebUIで許可する（最も簡単・5秒）"
echo "2. BFG Repo-Cleanerで履歴から削除（推奨・安全）"
echo "3. Git Filter-Branchで履歴から削除"
echo "4. 説明書を表示"
echo "5. 終了"
echo ""
read -p "選択 (1-5): " choice

case $choice in
    1)
        echo ""
        echo "=== 方法1: GitHubのWebUIで許可 ==="
        echo ""
        echo "以下のURLをブラウザで開いて「Allow secret」をクリックしてください:"
        echo ""
        echo "1. https://github.com/AKI-NANA/n3-frontend_new/security/secret-scanning/unblock-secret/34EuLMlG2rnKkWz9oBYn91lHyfR"
        echo ""
        echo "2. https://github.com/AKI-NANA/n3-frontend_new/security/secret-scanning/unblock-secret/34EuLR2dEVXRV93IVw7kvAIU74W"
        echo ""
        echo "完了したら、以下を実行してください:"
        echo "git push origin main"
        ;;
    2)
        echo ""
        echo "=== 方法2: BFG Repo-Cleaner ==="
        echo ""
        if command -v bfg &> /dev/null; then
            chmod +x cleanup-with-bfg.sh
            ./cleanup-with-bfg.sh
        else
            echo "BFGがインストールされていません。"
            echo ""
            echo "インストールコマンド:"
            echo "brew install bfg"
            echo ""
            echo "インストール後、再度このスクリプトを実行してください。"
        fi
        ;;
    3)
        echo ""
        echo "=== 方法3: Git Filter-Branch ==="
        echo ""
        chmod +x cleanup-git-history.sh
        ./cleanup-git-history.sh
        ;;
    4)
        echo ""
        cat GIT_PUSH_ERROR_SOLUTION.md
        ;;
    5)
        echo "終了します"
        exit 0
        ;;
    *)
        echo "無効な選択です"
        exit 1
        ;;
esac
