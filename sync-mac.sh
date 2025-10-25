#!/bin/bash

# Mac用 Git完全同期スクリプト
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
  echo "✅ ローカルデータをGitに保存しました"
  echo ""
else
  echo "ℹ️  ローカルに変更はありません"
  echo ""
fi

# Gitから最新を取得
echo "3️⃣ Gitから最新データを取得中..."
git pull --rebase origin "$CURRENT_BRANCH"
echo "✅ 最新データを取得しました"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Git同期完了！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 すべての変更はGitのコミット履歴に保存されています"
echo "💡 復元方法: git reflog → git reset --hard HEAD@{n}"
echo ""
