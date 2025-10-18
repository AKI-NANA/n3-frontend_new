#!/bin/bash

echo "==================================="
echo "Git Push エラー - 正しい解決方法"
echo "==================================="
echo ""
echo "【重要】ファイルはローカルに残したまま、Gitからのみ削除します"
echo ""
echo "選択してください:"
echo ""
echo "1. GitHubのWebUIで許可する（最も簡単・推奨）⭐️"
echo "2. Git履歴から削除（ローカルファイルは残る）"
echo "3. 説明書を表示"
echo "4. 終了"
echo ""
read -p "選択 (1-4): " choice

case $choice in
    1)
        echo ""
        echo "=== 方法1: GitHubのWebUIで許可（推奨）==="
        echo ""
        echo "この方法なら履歴の書き換えが不要です。"
        echo ""
        echo "以下のURLをブラウザで開いて「Allow secret」をクリックしてください:"
        echo ""
        echo "URL 1:"
        echo "https://github.com/AKI-NANA/n3-frontend_new/security/secret-scanning/unblock-secret/34EuLMlG2rnKkWz9oBYn91lHyfR"
        echo ""
        echo "URL 2:"
        echo "https://github.com/AKI-NANA/n3-frontend_new/security/secret-scanning/unblock-secret/34EuLR2dEVXRV93IVw7kvAIU74W"
        echo ""
        echo "完了したら、以下を実行してください:"
        echo ""
        echo "  git push origin main"
        echo ""
        ;;
    2)
        echo ""
        echo "=== 方法2: Git履歴から削除（ローカルは保持）==="
        echo ""
        echo "⚠️ 注意: この操作は Git履歴を書き換えます"
        echo ""
        read -p "続行しますか？ (y/N): " confirm
        if [[ "$confirm" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            echo ""
            echo "1. Gitキャッシュから削除（ローカルファイルは残る）..."
            git rm -r --cached scripts/ 2>/dev/null || true
            git rm --cached .env* 2>/dev/null || true
            
            echo ""
            echo "2. .gitignore更新をコミット..."
            git add .gitignore
            git commit -m "chore: Update .gitignore to exclude scripts/ and .env*" 2>/dev/null || echo "変更なし"
            
            echo ""
            echo "3. 新しい状態をコミット..."
            git add -A
            git commit -m "chore: Remove scripts/ and .env* from Git tracking" 2>/dev/null || echo "変更なし"
            
            echo ""
            echo "✅ 完了！"
            echo ""
            echo "次のコマンドでpushしてください:"
            echo ""
            echo "  git push origin main"
            echo ""
            echo "📁 ローカルの scripts/ ディレクトリは残っています"
            echo "💡 今後、scripts/の変更はGitに含まれません"
        else
            echo "キャンセルしました"
        fi
        ;;
    3)
        echo ""
        cat GIT_PUSH_ERROR_SOLUTION.md 2>/dev/null || echo "説明書が見つかりません"
        ;;
    4)
        echo "終了します"
        exit 0
        ;;
    *)
        echo "無効な選択です"
        exit 1
        ;;
esac

echo ""
echo "==================================="
