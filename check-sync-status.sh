#!/bin/bash

# Mac/Git/VPS 同期状態チェッカー
# 3つの環境が同じコミットにいるか確認します

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 同期状態チェック"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# プロジェクトディレクトリ
PROJECT_DIR="${1:-$PWD}"
cd "$PROJECT_DIR"

# ブランチ名
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 ブランチ: $CURRENT_BRANCH"
echo ""

# 1. Mac（ローカル）のコミット
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💻 Mac (ローカル)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

MAC_COMMIT=$(git rev-parse HEAD)
MAC_COMMIT_SHORT=$(git rev-parse --short HEAD)
MAC_MESSAGE=$(git log -1 --pretty=format:"%s")

echo "コミット: $MAC_COMMIT_SHORT"
echo "メッセージ: $MAC_MESSAGE"

# 未コミットの変更チェック
if [[ -n $(git status --porcelain) ]]; then
  UNCOMMITTED_COUNT=$(git status --porcelain | wc -l | tr -d ' ')
  echo "⚠️  未コミット: $UNCOMMITTED_COUNT ファイル"
  MAC_STATUS="⚠️  未コミットあり"
else
  echo "✅ 変更なし"
  MAC_STATUS="✅"
fi
echo ""

# 2. Git（GitHub）のコミット
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐙 Git (GitHub)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# リモート情報を取得
git fetch origin "$CURRENT_BRANCH" 2>/dev/null || true

GIT_COMMIT=$(git rev-parse origin/"$CURRENT_BRANCH")
GIT_COMMIT_SHORT=$(git rev-parse --short origin/"$CURRENT_BRANCH")
GIT_MESSAGE=$(git log origin/"$CURRENT_BRANCH" -1 --pretty=format:"%s")

echo "コミット: $GIT_COMMIT_SHORT"
echo "メッセージ: $GIT_MESSAGE"

# MacとGitの比較
if [ "$MAC_COMMIT" = "$GIT_COMMIT" ]; then
  echo "✅ Macと同期済み"
  GIT_STATUS="✅"
else
  echo "❌ Macと異なる"
  GIT_STATUS="❌ 不一致"
fi
echo ""

# 3. VPS の情報（SSH経由で取得を試みる）
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🖥️  VPS (本番環境)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

VPS_HOST="ubuntu@n3.emverze.com"
VPS_DIR="/home/ubuntu/n3-frontend_new"

# SSHが使える場合はVPSの状態を取得
if command -v ssh &> /dev/null; then
  echo "VPSに接続中..."
  VPS_COMMIT=$(ssh -o ConnectTimeout=5 "$VPS_HOST" "cd $VPS_DIR && git rev-parse HEAD" 2>/dev/null || echo "ERROR")

  if [ "$VPS_COMMIT" != "ERROR" ]; then
    VPS_COMMIT_SHORT=$(ssh "$VPS_HOST" "cd $VPS_DIR && git rev-parse --short HEAD")
    VPS_MESSAGE=$(ssh "$VPS_HOST" "cd $VPS_DIR && git log -1 --pretty=format:'%s'")

    echo "コミット: $VPS_COMMIT_SHORT"
    echo "メッセージ: $VPS_MESSAGE"

    if [ "$VPS_COMMIT" = "$GIT_COMMIT" ]; then
      echo "✅ Gitと同期済み"
      VPS_STATUS="✅"
    else
      echo "❌ Gitと異なる（古い状態）"
      VPS_STATUS="❌ 古い"
    fi
  else
    echo "⚠️  VPS接続失敗（SSH設定を確認）"
    echo "💡 手動確認: ssh $VPS_HOST 'cd $VPS_DIR && git log -1 --oneline'"
    VPS_STATUS="❓ 不明"
  fi
else
  echo "⚠️  SSHコマンドが利用できません"
  echo "💡 手動確認: ssh $VPS_HOST 'cd $VPS_DIR && git log -1 --oneline'"
  VPS_STATUS="❓ 不明"
fi
echo ""

# まとめ
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 同期状態まとめ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
printf "%-15s %-12s %-s\n" "環境" "コミット" "状態"
echo "───────────────────────────────────────────"
printf "%-15s %-12s %-s\n" "💻 Mac" "$MAC_COMMIT_SHORT" "$MAC_STATUS"
printf "%-15s %-12s %-s\n" "🐙 Git" "$GIT_COMMIT_SHORT" "$GIT_STATUS"
printf "%-15s %-12s %-s\n" "🖥️  VPS" "${VPS_COMMIT_SHORT:-不明}" "$VPS_STATUS"
echo ""

# 総合判定
if [ "$MAC_COMMIT" = "$GIT_COMMIT" ] && [ "$VPS_COMMIT" = "$GIT_COMMIT" ]; then
  echo "🟢 結果: 完全同期済み！"
  echo "✅ Mac、Git、VPS が全て同じ状態です"
elif [ -n "$(git status --porcelain)" ]; then
  echo "🟡 結果: Mac に未コミットの変更があります"
  echo "📝 次のアクション: ./sync-mac.sh を実行してGitにプッシュ"
elif [ "$MAC_COMMIT" != "$GIT_COMMIT" ]; then
  echo "🟡 結果: Mac と Git が不一致"
  echo "📝 次のアクション: ./sync-mac.sh を実行"
elif [ "$VPS_COMMIT" != "$GIT_COMMIT" ] && [ "$VPS_COMMIT" != "ERROR" ]; then
  echo "🟡 結果: VPS が古い状態"
  echo "📝 次のアクション: VPSで git pull && npm run build && pm2 restart"
else
  echo "🟡 結果: 状態確認が必要"
  echo "📝 各環境を個別に確認してください"
fi
echo ""

# 推奨アクション
if [ "$MAC_COMMIT" != "$GIT_COMMIT" ] || [ -n "$(git status --porcelain)" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "💡 推奨アクション (Mac)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "./sync-mac.sh"
  echo ""
fi

if [ "$VPS_COMMIT" != "$GIT_COMMIT" ] && [ "$VPS_COMMIT" != "ERROR" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "💡 推奨アクション (VPS)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "ssh $VPS_HOST"
  echo "cd $VPS_DIR"
  echo "git pull origin $CURRENT_BRANCH"
  echo "npm run build"
  echo "pm2 restart n3-frontend"
  echo ""
fi
