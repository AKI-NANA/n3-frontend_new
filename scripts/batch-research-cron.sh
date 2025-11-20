#!/bin/bash

################################################################################
# eBay Batch Research Cron Script
# 大規模データ一括取得バッチ - VPS自動実行スクリプト
#
# 用途: VPSのCronで定期的に実行し、Pendingタスクを自動処理
# 実行間隔: 5分ごと推奨（タスク間の遅延が5秒のため、1タスク完了まで最低5秒）
#
# Cron設定例:
# */5 * * * * /home/user/n3-frontend/scripts/batch-research-cron.sh >> /var/log/batch-research.log 2>&1
################################################################################

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 設定
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# アプリケーションのベースURL
BASE_URL="${BASE_URL:-http://localhost:3000}"

# API認証キー（環境変数から取得、またはデフォルト値）
API_KEY="${BATCH_API_KEY:-default_api_key_change_this}"

# 1回の実行で処理する最大タスク数
MAX_TASKS="${MAX_TASKS:-5}"

# ログファイルのパス
LOG_DIR="${LOG_DIR:-/var/log/batch-research}"
LOG_FILE="${LOG_DIR}/batch-research-$(date +%Y%m%d).log"

# タイムアウト時間（秒）
TIMEOUT="${TIMEOUT:-600}"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ログ関数
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 初期化
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ログディレクトリを作成
mkdir -p "$LOG_DIR"

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "eBay Batch Research - Cron 実行開始"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "BASE_URL: $BASE_URL"
log "MAX_TASKS: $MAX_TASKS"
log "TIMEOUT: ${TIMEOUT}s"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ステップ1: Dry Run - 実行可能なタスク数を確認
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

log "ステップ1: Dry Run - タスク状況確認"

DRY_RUN_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    --max-time "$TIMEOUT" \
    "${BASE_URL}/api/batch-research/execute")

if [ $? -ne 0 ]; then
    log_error "Dry Run APIコール失敗"
    exit 1
fi

# JSONレスポンスをパース（jqが利用可能な場合）
if command -v jq &> /dev/null; then
    CAN_EXECUTE=$(echo "$DRY_RUN_RESPONSE" | jq -r '.can_execute')
    PENDING_TASKS=$(echo "$DRY_RUN_RESPONSE" | jq -r '.pending_tasks')
    PROCESSING_TASKS=$(echo "$DRY_RUN_RESPONSE" | jq -r '.processing_tasks')

    log "Pending タスク: $PENDING_TASKS"
    log "Processing タスク: $PROCESSING_TASKS"

    if [ "$CAN_EXECUTE" != "true" ] || [ "$PENDING_TASKS" = "0" ]; then
        log "実行可能なタスクがありません。終了します。"
        log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        exit 0
    fi
else
    log "警告: jqがインストールされていません。タスク数の確認をスキップします。"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ステップ2: バッチ実行
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

log "ステップ2: バッチ実行開始（最大 $MAX_TASKS タスク）"

EXECUTE_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"max_tasks\": $MAX_TASKS}" \
    --max-time "$TIMEOUT" \
    "${BASE_URL}/api/batch-research/execute")

if [ $? -ne 0 ]; then
    log_error "バッチ実行APIコール失敗"
    exit 1
fi

# 結果を表示
if command -v jq &> /dev/null; then
    SUCCESS=$(echo "$EXECUTE_RESPONSE" | jq -r '.success')
    EXECUTED=$(echo "$EXECUTE_RESPONSE" | jq -r '.executed')
    SUCCEEDED=$(echo "$EXECUTE_RESPONSE" | jq -r '.succeeded')
    FAILED=$(echo "$EXECUTE_RESPONSE" | jq -r '.failed')

    if [ "$SUCCESS" = "true" ]; then
        log "✅ バッチ実行成功"
        log "  - 実行タスク数: $EXECUTED"
        log "  - 成功: $SUCCEEDED"
        log "  - 失敗: $FAILED"
    else
        ERROR_MSG=$(echo "$EXECUTE_RESPONSE" | jq -r '.error')
        log_error "バッチ実行失敗: $ERROR_MSG"
        exit 1
    fi
else
    log "レスポンス: $EXECUTE_RESPONSE"
fi

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Cron 実行完了"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit 0
