#!/bin/bash

# Mac用 Git完全同期スクリプト（安全版）
# このスクリプトをMacにコピーして実行してください

set -e  # エラーで停止

echo "🔄 Git完全同期を開始します..."
echo ""

# プロジェクトディレクトリを指定（Macのパスに変更してください）
PROJECT_DIR="${1:-$PWD}"

# ディレクトリに移動
cd "$PROJECT_DIR"
echo "📍 作業ディレクトリ: $PROJECT_DIR"
echo ""

# 現在のブランチを取得
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 現在のブランチ: $CURRENT_BRANCH"
echo ""

# 変更があるかチェック
if [[ -n $(git status --porcelain) ]]; then
  echo "⚠️  ローカルに未コミットの変更があります"
  echo ""

  # 変更ファイル一覧を表示
  echo "📝 変更されたファイル:"
  git status --short
  echo ""

  # 自動コミット
  echo "1️⃣ ローカル変更を自動コミット中..."
  git add .
  TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")
  git commit -m "auto: Mac同期前の自動保存 ($TIMESTAMP)"
  echo "✅ ローカル変更をコミットしました"
  echo ""

  # Gitにプッシュ
  echo "2️⃣ ローカル変更をGitにプッシュ中..."
  git push origin "$CURRENT_BRANCH"
  echo "✅ ローカルデータをGitに保存しました（データ損失リスクゼロ）"
  echo ""
else
  echo "ℹ️  ローカルに変更はありません"
  echo ""
fi

# Gitから最新を取得（安全版）
echo "3️⃣ Gitから最新データを取得中..."

# まずfetchで確認
git fetch origin "$CURRENT_BRANCH"

# ローカルとリモートの差分をチェック
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})
BASE=$(git merge-base @ @{u})

if [ $LOCAL = $REMOTE ]; then
    echo "✅ すでに最新です（同期不要）"
elif [ $LOCAL = $BASE ]; then
    # リモートが進んでいる → 安全にpull可能
    echo "📥 Gitの新しいデータを取得します..."
    git pull origin "$CURRENT_BRANCH"
    echo "✅ 最新データを取得しました"
elif [ $REMOTE = $BASE ]; then
    # ローカルが進んでいる → すでにpush済み
    echo "✅ ローカルがGitより進んでいます（すでにpush済み）"
else
    # 両方が進んでいる → マージが必要
    echo "⚠️  GitとMacの両方に新しい変更があります"
    echo ""
    echo "🔄 自動マージを試みます..."

    if git pull origin "$CURRENT_BRANCH"; then
        echo "✅ 自動マージ成功！"
        echo "📤 マージ結果をGitにプッシュします..."
        git push origin "$CURRENT_BRANCH"
        echo "✅ マージ完了"
    else
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "❌ コンフリクトが発生しました"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "💾 データは安全です！すべてGitに保存されています"
        echo ""
        echo "📋 解決方法:"
        echo "1. コンフリクトファイルを確認: git status"
        echo "2. ファイルを編集してコンフリクトを解決"
        echo "3. 解決後: git add . && git commit && git push"
        echo ""
        echo "または、Gitの変更を優先する場合:"
        echo "git reset --hard origin/$CURRENT_BRANCH"
        echo ""
        exit 1
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Git同期完了！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💾 すべての変更はGitのコミット履歴に保存されています"
echo "📚 Macのデータは失われていません"
echo "💡 復元方法: git reflog → git reset --hard HEAD@{n}"
echo ""
