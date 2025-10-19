#!/bin/bash
# scripts/start-dev.sh - 開発環境起動スクリプト

set -e

echo "🚀 Pokemon Content System 開発環境を起動しています..."

# 環境変数ファイルをチェック
if [ ! -f .env ]; then
    echo "⚠️  .envファイルが見つかりません。.env.exampleからコピーしてください。"
    cp .env.example .env
    echo "✅ .envファイルを作成しました。必要な設定を行ってください。"
fi

# Dockerがインストールされているかチェック
if ! command -v docker &> /dev/null; then
    echo "❌ Dockerがインストールされていません。"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Composeがインストールされていません。"
    exit 1
fi

# 既存のコンテナを停止
echo "🛑 既存のコンテナを停止しています..."
docker-compose down

# イメージをビルド
echo "🔨 Docker イメージをビルドしています..."
docker-compose build

# データベースの起動を待つ
echo "🗄️  データベースを起動しています..."
docker-compose up -d db redis

# データベースが起動するまで待機
echo "⏳ データベースの起動を待っています..."
sleep 10

# マイグレーションを実行
echo "🔄 データベースマイグレーションを実行しています..."
docker-compose run --rm web python manage.py migrate

# スーパーユーザーを作成（存在しない場合）
echo "👤 スーパーユーザーをチェックしています..."
docker-compose run --rm web python manage.py shell -c "
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('スーパーユーザー admin を作成しました (パスワード: admin123)')
else:
    print('スーパーユーザーは既に存在します')
"

# 初期データを読み込み
echo "📊 初期データを読み込んでいます..."
if [ -f "fixtures/pokemon_series.json" ]; then
    docker-compose run --rm web python manage.py loaddata fixtures/pokemon_series.json
fi

if [ -f "fixtures/content_templates.json" ]; then
    docker-compose run --rm web python manage.py loaddata fixtures/content_templates.json
fi

# 静的ファイルを収集
echo "📁 静的ファイルを収集しています..."
docker-compose run --rm web python manage.py collectstatic --noinput

# フロントエンドの依存関係をインストール
echo "📦 フロントエンドの依存関係をインストールしています..."
docker-compose run --rm frontend npm install

# 全サービスを起動
echo "🚀 全サービスを起動しています..."
docker-compose up -d

# ログを表示
echo "📋 サービス起動ログを表示しています..."
sleep 5
docker-compose logs --tail=50

echo ""
echo "✅ 開発環境の起動が完了しました！"
echo ""
echo "🌐 アクセス情報:"
echo "   メインアプリケーション: http://localhost:3000"
echo "   Django管理画面:       http://localhost:8000/admin"
echo "   API ドキュメント:      http://localhost:8000/api/docs"
echo "   Flower (Celery監視):   http://localhost:5555"
echo ""
echo "👤 管理者ログイン情報:"
echo "   ユーザー名: admin"
echo "   パスワード: admin123"
echo ""
echo "📊 リアルタイムログの確認:"
echo "   docker-compose logs -f [service_name]"
echo ""
echo "🛑 停止する場合:"
echo "   docker-compose down"

---

#!/bin/bash
# scripts/start-prod.sh - 本番環境起動スクリプト

set -e

echo "🚀 Pokemon Content System 本番環境を起動しています..."

# 必要な環境変数をチェック
required_vars=(
    "SECRET_KEY"
    "DB_NAME"
    "DB_USER" 
    "DB_PASSWORD"
    "OPENAI_API_KEY"
    "ALLOWED_HOSTS"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ 必要な環境変数 $var が設定されていません"
        exit 1
    fi
done

# SSL証明書の存在チェック
if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
    echo "⚠️  SSL証明書が見つかりません。HTTPSを使用する場合は証明書を配置してください。"
fi

# データベースバックアップの作成
if [ -d "backups" ]; then
    echo "💾 データベースバックアップを作成しています..."
    timestamp=$(date +%Y%m%d_%H%M%S)
    docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U ${DB_USER} ${DB_NAME} > "backups/backup_${timestamp}.sql"
fi

# 既存のコンテナを停止
echo "🛑 既存のコンテナを停止しています..."
docker-compose -f docker-compose.prod.yml down

# イメージをビルド
echo "🔨 本番用イメージをビルドしています..."
docker-compose -f docker-compose.prod.yml build --no-cache

# データベースとRedisを先に起動
echo "🗄️  データベースとRedisを起動しています..."
docker-compose -f docker-compose.prod.yml up -d db redis

# データベースが起動するまで待機
echo "⏳ データベースの起動を待っています..."
sleep 15

# マイグレーションを実行
echo "🔄 データベースマイグレーションを実行しています..."
docker-compose -f docker-compose.prod.yml run --rm web python manage.py migrate

# 静的ファイルを収集
echo "📁 静的ファイルを収集しています..."
docker-compose -f docker-compose.prod.yml run --rm web python manage.py collectstatic --noinput

# 全サービスを起動
echo "🚀 全サービスを起動しています..."
docker-compose -f docker-compose.prod.yml up -d

# ヘルスチェック
echo "🏥 ヘルスチェックを実行しています..."
sleep 30

if curl -f http://localhost/health/ > /dev/null 2>&1; then
    echo "✅ アプリケーションは正常に起動しました！"
else
    echo "❌ ヘルスチェックに失敗しました。ログを確認してください。"
    docker-compose -f docker-compose.prod.yml logs web
    exit 1
fi

echo ""
echo "✅ 本番環境の起動が完了しました！"
echo ""
echo "🌐 アクセス情報:"
echo "   メインサイト: http://your-domain.com"
echo "   HTTPS:       https://your-domain.com (SSL証明書が設定されている場合)"
echo "   Flower:      http://your-domain.com:5555"
echo ""
echo "📊 監視コマンド:"
echo "   docker-compose -f docker-compose.prod.yml logs -f [service_name]"
echo "   docker-compose -f docker-compose.prod.yml ps"

---

#!/bin/bash
# scripts/migrate.sh - マイグレーション実行スクリプト

set -e

echo "🔄 データベースマイグレーションを実行しています..."

# 開発環境か本番環境かを判定
if [ "${1}" == "prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "本番環境でマイグレーションを実行します"
else
    COMPOSE_FILE="docker-compose.yml"
    echo "開発環境でマイグレーションを実行します"
fi

# マイグレーションファイルを生成
echo "📝 マイグレーションファイルを生成しています..."
docker-compose -f ${COMPOSE_FILE} run --rm web python manage.py makemigrations

# マイグレーションを適用
echo "⚡ マイグレーションを適用しています..."
docker-compose -f ${COMPOSE_FILE} run --rm web python manage.py migrate

# マイグレーション状態を表示
echo "📊 現在のマイグレーション状態:"
docker-compose -f ${COMPOSE_FILE} run --rm web python manage.py showmigrations

echo "✅ マイグレーションが完了しました！"

---

#!/bin/bash
# scripts/backup-db.sh - データベースバックアップスクリプト

set -e

# 設定
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
KEEP_BACKUPS=7  # 保持するバックアップ数

# バックアップディレクトリを作成
mkdir -p ${BACKUP_DIR}

echo "💾 データベースバックアップを作成しています..."

# 本番環境か開発環境かを判定
if [ "${1}" == "prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    DB_NAME="${DB_NAME}"
    DB_USER="${DB_USER}"
    BACKUP_FILE="${BACKUP_DIR}/prod_backup_${TIMESTAMP}.sql"
else
    COMPOSE_FILE="docker-compose.yml"
    DB_NAME="pokemon_card_db"
    DB_USER="postgres"
    BACKUP_FILE="${BACKUP_DIR}/dev_backup_${TIMESTAMP}.sql"
fi

# データベースをダンプ
docker-compose -f ${COMPOSE_FILE} exec -T db pg_dump -U ${DB_USER} -d ${DB_NAME} > ${BACKUP_FILE}

# 圧縮
gzip ${BACKUP_FILE}
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "✅ バックアップを作成しました: ${BACKUP_FILE}"

# ファイルサイズを表示
echo "📊 バックアップファイルサイズ: $(du -h ${BACKUP_FILE} | cut -f1)"

# 古いバックアップを削除
echo "🧹 古いバックアップを削除しています..."
cd ${BACKUP_DIR}
ls -t *.sql.gz | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm --
echo "✅ 古いバックアップの削除が完了しました"

# 利用可能なバックアップ一覧を表示
echo ""
echo "📁 利用可能なバックアップ:"
ls -lh *.sql.gz | tail -n ${KEEP_BACKUPS}

---

#!/bin/bash
# scripts/restore-db.sh - データベース復元スクリプト

set -e

# 引数チェック
if [ $# -eq 0 ]; then
    echo "❌ 復元するバックアップファイルを指定してください"
    echo "使用法: $0 <backup_file.sql.gz> [prod]"
    echo ""
    echo "利用可能なバックアップ:"
    ls -lh backups/*.sql.gz 2>/dev/null || echo "バックアップファイルが見つかりません"
    exit 1
fi

BACKUP_FILE="$1"

# ファイル存在チェック
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ バックアップファイルが見つかりません: ${BACKUP_FILE}"
    exit 1
fi

# 本番環境か開発環境かを判定
if [ "${2}" == "prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    DB_NAME="${DB_NAME}"
    DB_USER="${DB_USER}"
    echo "⚠️  本番環境のデータベースを復元します"
else
    COMPOSE_FILE="docker-compose.yml"
    DB_NAME="pokemon_card_db"
    DB_USER="postgres"
    echo "開発環境のデータベースを復元します"
fi

# 確認プロンプト
echo "復元対象: ${BACKUP_FILE}"
echo "データベース: ${DB_NAME}"
read -p "続行しますか？ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "キャンセルされました"
    exit 1
fi

# 現在のデータベースをバックアップ
echo "💾 復元前の現在のデータベースをバックアップしています..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CURRENT_BACKUP="backups/before_restore_${TIMESTAMP}.sql"
docker-compose -f ${COMPOSE_FILE} exec -T db pg_dump -U ${DB_USER} -d ${DB_NAME} > ${CURRENT_BACKUP}
gzip ${CURRENT_BACKUP}
echo "✅ 現在のデータベースをバックアップしました: ${CURRENT_BACKUP}.gz"

# アプリケーションを停止
echo "🛑 アプリケーションを停止しています..."
docker-compose -f ${COMPOSE_FILE} stop web worker beat

# データベースを削除・再作成
echo "🗄️  データベースを再作成しています..."
docker-compose -f ${COMPOSE_FILE} exec db psql -U ${DB_USER} -c "DROP DATABASE IF EXISTS ${DB_NAME};"
docker-compose -f ${COMPOSE_FILE} exec db psql -U ${DB_USER} -c "CREATE DATABASE ${DB_NAME};"

# バックアップを復元
echo "📥 バックアップを復元しています..."
if [[ ${BACKUP_FILE} == *.gz ]]; then
    zcat ${BACKUP_FILE} | docker-compose -f ${COMPOSE_FILE} exec -T db psql -U ${DB_USER} -d ${DB_NAME}
else
    cat ${BACKUP_FILE} | docker-compose -f ${COMPOSE_FILE} exec -T db psql -U ${DB_USER} -d ${DB_NAME}
fi

# マイグレーションを実行（念のため）
echo "🔄 マイグレーションを実行しています..."
docker-compose -f ${COMPOSE_FILE} run --rm web python manage.py migrate

# アプリケーションを再起動
echo "🚀 アプリケーションを再起動しています..."
docker-compose -f ${COMPOSE_FILE} up -d web worker beat

echo ""
echo "✅ データベースの復元が完了しました！"
echo "📊 復元前のバックアップ: ${CURRENT_BACKUP}.gz"

---

#!/bin/bash
# scripts/deploy.sh - 本番デプロイスクリプト

set -e

echo "🚀 Pokemon Content System をデプロイしています..."

# 必要なツールのチェック
command -v git >/dev/null 2>&1 || { echo "gitが必要です" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "dockerが必要です" >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "docker-composeが必要です" >&2; exit 1; }

# 環境変数の設定チェック
if [ -z "$DEPLOY_ENV" ]; then
    DEPLOY_ENV="production"
fi

echo "デプロイ環境: ${DEPLOY_ENV}"

# Git リポジトリの状態をチェック
if [ -d ".git" ]; then
    echo "📊 Git状態をチェックしています..."
    
    # 未コミットの変更があるかチェック
    if ! git diff-index --quiet HEAD --; then
        echo "⚠️  未コミットの変更があります"
        read -p "続行しますか？ (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # 現在のブランチとコミットハッシュを記録
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    CURRENT_COMMIT=$(git rev-parse HEAD)
    echo "現在のブランチ: ${CURRENT_BRANCH}"
    echo "現在のコミット: ${CURRENT_COMMIT}"
fi

# デプロイ前バックアップ
echo "💾 デプロイ前バックアップを作成しています..."
./scripts/backup-db.sh prod

# 新しいコードをプル（Gitリポジトリの場合）
if [ -d ".git" ]; then
    echo "📥 最新のコードを取得しています..."
    git pull origin ${CURRENT_BRANCH}
fi

# 環境固有の設定ファイルをチェック
if [ ! -f ".env.production" ]; then
    echo "❌ .env.productionファイルが見つかりません"
    exit 1
fi

# .env.productionを.envとしてコピー
cp .env.production .env

# Docker イメージをビルド
echo "🔨 新しいDockerイメージをビルドしています..."
docker-compose -f docker-compose.prod.yml build --no-cache

# データベースマイグレーション
echo "🔄 データベースマイグレーションを実行しています..."
docker-compose -f docker-compose.prod.yml run --rm web python manage.py migrate

# 静的ファイルの収集
echo "📁 静的ファイルを収集しています..."
docker-compose -f docker-compose.prod.yml run --rm web python manage.py collectstatic --noinput

# アプリケーションをゼロダウンタイムで再起動
echo "🔄 アプリケーションをローリング再起動しています..."

# 新しいコンテナを起動
docker-compose -f docker-compose.prod.yml up -d --force-recreate --no-deps web worker beat

# ヘルスチェックを待つ
echo "🏥 ヘルスチェックを実行しています..."
for i in {1..30}; do
    if curl -f http://localhost/health/ > /dev/null 2>&1; then
        echo "✅ アプリケーションは正常に起動しました"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ ヘルスチェックがタイムアウトしました"
        echo "ログを確認してください:"
        docker-compose -f docker-compose.prod.yml logs --tail=50 web
        exit 1
    fi
    echo "ヘルスチェック中... (${i}/30)"
    sleep 2
done

# 古いイメージを削除
echo "🧹 古いDockerイメージを削除しています..."
docker image prune -f

# デプロイ情報をログに記録
DEPLOY_LOG="deploy.log"
echo "$(date '+%Y-%m-%d %H:%M:%S') - デプロイ完了 - ブランチ: ${CURRENT_BRANCH}, コミット: ${CURRENT_COMMIT}" >> ${DEPLOY_LOG}

echo ""
echo "✅ デプロイが完了しました！"
echo ""
echo "🌐 サービス状態:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "📊 監視コマンド:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"
echo "   docker-compose -f docker-compose.prod.yml top"
echo ""
echo "🔄 ロールバックが必要な場合:"
echo "   git reset --hard <previous_commit>"
echo "   ./scripts/restore-db.sh <backup_file>"
echo "   ./scripts/deploy.sh"

---

#!/bin/bash
# scripts/health-check.sh - システムヘルスチェックスクリプト

set -e

# 色付きログ用の関数
red() { echo -e "\033[31m$1\033[0m"; }
green() { echo -e "\033[32m$1\033[0m"; }
yellow() { echo -e "\033[33m$1\033[0m"; }
blue() { echo -e "\033[34m$1\033[0m"; }

echo "🏥 Pokemon Content System ヘルスチェックを開始します..."

# 環境判定
if [ "${1}" == "prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    BASE_URL="http://localhost"
    echo "本番環境をチェックします"
else
    COMPOSE_FILE="docker-compose.yml"
    BASE_URL="http://localhost:8000"
    echo "開発環境をチェックします"
fi

# サービス状態チェック
echo ""
blue "🔍 サービス状態をチェック中..."
if docker-compose -f ${COMPOSE_FILE} ps | grep -q "Up"; then
    green "✅ Dockerサービスが稼働中"
    docker-compose -f ${COMPOSE_FILE} ps
else
    red "❌ 一部またはすべてのサービスが停止中"
    docker-compose -f ${COMPOSE_FILE} ps
fi

# データベース接続チェック
echo ""
blue "🗄️  データベース接続をチェック中..."
if docker-compose -f ${COMPOSE_FILE} exec -T db psql -U postgres -d pokemon_card_db -c "SELECT 1;" > /dev/null 2>&1; then
    green "✅ データベース接続正常"
else
    red "❌ データベース接続エラー"
fi

# Redis接続チェック
echo ""
blue "📦 Redis接続をチェック中..."
if docker-compose -f ${COMPOSE_FILE} exec -T redis redis-cli ping | grep -q "PONG"; then
    green "✅ Redis接続正常"
else
    red "❌ Redis接続エラー"
fi

# Webアプリケーションヘルスチェック
echo ""
blue "🌐 Webアプリケーションをチェック中..."
if curl -f -s "${BASE_URL}/health/" > /dev/null; then
    green "✅ Webアプリケーション正常"
    
    # APIエンドポイントチェック
    if curl -f -s "${BASE_URL}/api/v1/cards/" > /dev/null; then
        green "✅ API正常"
    else
        yellow "⚠️ API接続に問題があります"
    fi
else
    red "❌ Webアプリケーション接続エラー"
fi

# Celeryワーカーチェック
echo ""
blue "⚙️  Celeryワーカーをチェック中..."
ACTIVE_WORKERS=$(docker-compose -f ${COMPOSE_FILE} exec -T worker celery -A config inspect active 2>/dev/null | grep -c "worker" || echo "0")
if [ "${ACTIVE_WORKERS}" -gt "0" ]; then
    green "✅ Celeryワーカー正常 (${ACTIVE_WORKERS}個のワーカーがアクティブ)"
else
    yellow "⚠️ Celeryワーカーが見つかりません"
fi

# ディスク使用量チェック
echo ""
blue "💾 ディスク使用量をチェック中..."
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "${DISK_USAGE}" -lt "80" ]; then
    green "✅ ディスク使用量正常 (${DISK_USAGE}%)"
elif [ "${DISK_USAGE}" -lt "90" ]; then
    yellow "⚠️ ディスク使用量注意 (${DISK_USAGE}%)"
else
    red "❌ ディスク使用量危険 (${DISK_USAGE}%)"
fi

# メモリ使用量チェック
echo ""
blue "🧠 メモリ使用量をチェック中..."
MEM_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
MEM_USAGE_INT=${MEM_USAGE%.*}
if [ "${MEM_USAGE_INT}" -lt "80" ]; then
    green "✅ メモリ使用量正常 (${MEM_USAGE}%)"
elif [ "${MEM_USAGE_INT}" -lt "90" ]; then
    yellow "⚠️ メモリ使用量注意 (${MEM_USAGE}%)"
else
    red "❌ メモリ使用量危険 (${MEM_USAGE}%)"
fi

# ログエラーチェック
echo ""
blue "📋 最近のエラーログをチェック中..."
ERROR_COUNT=$(docker-compose -f ${COMPOSE_FILE} logs --since="1h" 2>&1 | grep -i error | wc -l)
if [ "${ERROR_COUNT}" -eq "0" ]; then
    green "✅ 過去1時間にエラーはありません"
elif [ "${ERROR_COUNT}" -lt "10" ]; then
    yellow "⚠️ 過去1時間に${ERROR_COUNT}件のエラー"
else
    red "❌ 過去1時間に${ERROR_COUNT}件のエラー（要調査）"
fi

echo ""
echo "🏥 ヘルスチェック完了"
echo ""

# 詳細ログオプション
read -p "詳細なログを表示しますか？ (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    blue "📋 最新のログ (最新50行):"
    docker-compose -f ${COMPOSE_FILE} logs --tail=50
fi

---

#!/bin/bash
# scripts/update-system.sh - システム更新スクリプト

set -e

echo "🔄 Pokemon Content System を更新しています..."

# 現在のバージョンを記録
if [ -f "VERSION" ]; then
    OLD_VERSION=$(cat VERSION)
    echo "現在のバージョン: ${OLD_VERSION}"
fi

# 更新前バックアップ
echo "💾 更新前バックアップを作成中..."
BACKUP_DIR="backups/update_$(date +%Y%m%d_%H%M%S)"
mkdir -p ${BACKUP_DIR}

# データベースバックアップ
./scripts/backup-db.sh prod
cp backups/prod_backup_*.sql.gz ${BACKUP_DIR}/

# 設定ファイルバックアップ
cp .env ${BACKUP_DIR}/.env.backup 2>/dev/null || true
cp docker-compose.prod.yml ${BACKUP_DIR}/ 2>/dev/null || true

echo "✅ バックアップ作成完了: ${BACKUP_DIR}"

# Git更新
if [ -d ".git" ]; then
    echo "📥 最新のコードを取得中..."
    git fetch origin
    git pull origin main
fi

# 依存関係の更新
echo "📦 依存関係を更新中..."
docker-compose -f docker-compose.prod.yml run --rm web pip install --upgrade -r requirements/production.txt

# フロントエンドの依存関係更新
if [ -d "frontend" ]; then
    echo "📦 フロントエンド依存関係を更新中..."
    cd frontend
    npm update
    npm audit fix
    cd ..
fi

# Docker イメージ再ビルド
echo "🔨 Dockerイメージを再ビルド中..."
docker-compose -f docker-compose.prod.yml build --no-cache

# データベースマイグレーション
echo "🔄 データベースマイグレーション実行中..."
docker-compose -f docker-compose.prod.yml run --rm web python manage.py migrate

# 静的ファイル再収集
echo "📁 静的ファイルを再収集中..."
docker-compose -f docker-compose.prod.yml run --rm web python manage.py collectstatic --noinput

# サービス再起動
echo "🔄 サービスを再起動中..."
docker-compose -f docker-compose.prod.yml restart

# ヘルスチェック
echo "🏥 更新後ヘルスチェック実行中..."
sleep 10
./scripts/health-check.sh prod

# バージョン情報更新
if [ -f "VERSION" ]; then
    NEW_VERSION=$(cat VERSION)
    echo "更新完了: ${OLD_VERSION} → ${NEW_VERSION}"
else
    echo "更新完了"
fi

echo ""
echo "✅ システム更新が完了しました！"
echo "📊 バックアップ保存場所: ${BACKUP_DIR}"

---

#!/bin/bash
# scripts/monitoring-setup.sh - 監視システムセットアップ

set -e

echo "📊 監視システムをセットアップしています..."

# Prometheusディレクトリ作成
mkdir -p monitoring/{prometheus,grafana,alertmanager}

# Prometheus設定
cat > monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'pokemon-content-system'
    static_configs:
      - targets: ['web:8000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-exporter:9113']
EOF

# アラートルール
cat > monitoring/prometheus/alert_rules.yml << 'EOF'
groups:
  - name: pokemon_content_system
    rules:
      - alert: HighCPUUsage
        expr: rate(process_cpu_seconds_total[5m]) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "高CPU使用率検出"
          description: "CPU使用率が5分間80%を超えています"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / (1024 * 1024 * 1024) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "高メモリ使用量検出"
          description: "メモリ使用量が2GBを超えています"

      - alert: DatabaseConnectionError
        expr: up{job="postgres"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "データベース接続エラー"
          description: "PostgreSQLに接続できません"

      - alert: RedisConnectionError
        expr: up{job="redis"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Redis接続エラー"
          description: "Redisに接続できません"

      - alert: HighErrorRate
        expr: rate(django_http_responses_total_by_status_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "高エラー率検出"
          description: "5xxエラーが5分間で10%を超えています"
EOF

# Alertmanager設定
cat > monitoring/alertmanager/alertmanager.yml << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@pokemon-content-system.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    email_configs:
      - to: 'admin@pokemon-content-system.com'
        subject: '[ALERT] {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
EOF

# Grafanaダッシュボード設定
cat > monitoring/grafana/dashboard.json << 'EOF'
{
  "dashboard": {
    "title": "Pokemon Content System Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(django_http_requests_total[5m])",
            "legendFormat": "{{method}} {{handler}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph", 
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(django_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(django_http_responses_total_by_status_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      }
    ]
  }
}
EOF

# 監視用docker-compose追加
cat > monitoring/docker-compose.monitoring.yml << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana:/etc/grafana/provisioning
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager:/etc/alertmanager
    networks:
      - monitoring

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter
    environment:
      - DATA_SOURCE_NAME=postgresql://postgres:password@db:5432/pokemon_card_db?sslmode=disable
    networks:
      - monitoring
      - pokemon_network

  redis-exporter:
    image: oliver006/redis_exporter
    environment:
      - REDIS_ADDR=redis://redis:6379
    networks:
      - monitoring
      - pokemon_network

  nginx-exporter:
    image: nginx/nginx-prometheus-exporter
    command:
      - -nginx.scrape-uri=http://nginx:80/nginx_status
    networks:
      - monitoring
      - pokemon_network

volumes:
  prometheus_data:
  grafana_data:

networks:
  monitoring:
    driver: bridge
  pokemon_network:
    external: true
EOF

echo "✅ 監視システムのセットアップが完了しました！"
echo ""
echo "🚀 監視システムを起動するには:"
echo "   cd monitoring"
echo "   docker-compose -f docker-compose.monitoring.yml up -d"
echo ""
echo "🌐 アクセス情報:"
echo "   Prometheus: http://localhost:9090"
echo "   Grafana:    http://localhost:3001 (admin/admin)"
echo "   Alertmanager: http://localhost:9093"

---

#!/bin/bash
# scripts/performance-test.sh - パフォーマンステストスクリプト

set -e

echo "🚀 Pokemon Content System パフォーマンステストを開始します..."

# テスト設定
BASE_URL="http://localhost:8000"
CONCURRENT_USERS=10
TEST_DURATION=60
RESULTS_DIR="performance_results/$(date +%Y%m%d_%H%M%S)"

mkdir -p ${RESULTS_DIR}

# 必要なツールのチェック
if ! command -v ab &> /dev/null; then
    echo "Apache Bench (ab) をインストールしています..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y apache2-utils
    elif command -v brew &> /dev/null; then
        brew install apache-bench
    else
        echo "❌ Apache Bench (ab) のインストールに失敗しました"
        exit 1
    fi
fi

# システム情報を記録
echo "📊 システム情報を記録中..."
cat > ${RESULTS_DIR}/system_info.txt << EOF
テスト実行時刻: $(date)
システム情報: $(uname -a)
CPU情報: $(nproc) cores
メモリ情報: $(free -h | grep Mem)
Docker状態:
$(docker-compose ps)
EOF

echo "🏥 テスト前ヘルスチェック..."
./scripts/health-check.sh

# APIエンドポイントのパフォーマンステスト
echo ""
echo "🔍 APIエンドポイントテスト開始..."

# 1. カード一覧API
echo "テスト中: カード一覧API..."
ab -n 1000 -c ${CONCURRENT_USERS} -g ${RESULTS_DIR}/cards_list.tsv \
   "${BASE_URL}/api/v1/cards/" > ${RESULTS_DIR}/cards_list.txt 2>&1

# 2. 人気カードAPI  
echo "テスト中: 人気カードAPI..."
ab -n 500 -c ${CONCURRENT_USERS} -g ${RESULTS_DIR}/popular_cards.tsv \
   "${BASE_URL}/api/v1/cards/popular_cards/" > ${RESULTS_DIR}/popular_cards.txt 2>&1

# 3. カード詳細API
echo "テスト中: カード詳細API..."
# まず、テスト用のカードIDを取得
CARD_ID=$(curl -s "${BASE_URL}/api/v1/cards/" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data['results']:
    print(data['results'][0]['id'])
else:
    print('test-id')
")

if [ "${CARD_ID}" != "test-id" ]; then
    ab -n 300 -c ${CONCURRENT_USERS} -g ${RESULTS_DIR}/card_detail.tsv \
       "${BASE_URL}/api/v1/cards/${CARD_ID}/" > ${RESULTS_DIR}/card_detail.txt 2>&1
fi

# データベースパフォーマンステスト
echo ""
echo "🗄️  データベースパフォーマンステスト..."
docker-compose exec -T db psql -U postgres -d pokemon_card_db -c "
EXPLAIN ANALYZE SELECT * FROM pokemon_cards 
WHERE is_popular = true 
ORDER BY popularity_score DESC 
LIMIT 20;
" > ${RESULTS_DIR}/db_popular_cards.txt

docker-compose exec -T db psql -U postgres -d pokemon_card_db -c "
EXPLAIN ANALYZE SELECT 
    c.name, c.card_number, s.name as series_name,
    AVG(p.price) as avg_price
FROM pokemon_cards c
LEFT JOIN pokemon_series s ON c.series_id = s.id
LEFT JOIN price_data p ON c.id = p.card_id
WHERE p.collected_at > NOW() - INTERVAL '30 days'
GROUP BY c.id, c.name, c.card_number, s.name
ORDER BY avg_price DESC
LIMIT 10;
" > ${RESULTS_DIR}/db_price_analysis.txt

# メモリ・CPU使用量の監視
echo ""
echo "💻 リソース使用量を監視中..."
{
    echo "時刻,CPU使用率,メモリ使用率"
    for i in {1..60}; do
        CPU=$(docker stats --no-stream --format "{{.CPUPerc}}" pokemon_content_system_web_1 | sed 's/%//')
        MEM=$(docker stats --no-stream --format "{{.MemPerc}}" pokemon_content_system_web_1 | sed 's/%//')
        echo "$(date '+%H:%M:%S'),${CPU},${MEM}"
        sleep 1
    done
} > ${RESULTS_DIR}/resource_usage.csv &

MONITOR_PID=$!

# 同時接続数テスト
echo ""
echo "📈 同時接続数テスト..."
for users in 5 10 20 50; do
    echo "同時接続数: ${users}..."
    ab -n 100 -c ${users} "${BASE_URL}/api/v1/cards/" \
       > ${RESULTS_DIR}/concurrent_${users}.txt 2>&1
    sleep 5
done

# 監視プロセス停止
kill ${MONITOR_PID} 2>/dev/null || true

# 結果の分析とレポート生成
echo ""
echo "📊 結果を分析中..."
cat > ${RESULTS_DIR}/summary.md << EOF
# パフォーマンステスト結果

## テスト環境
- 実行日時: $(date)
- 同時接続数: ${CONCURRENT_USERS}
- システム: $(uname -a)

## API エンドポイントテスト結果

### カード一覧API
\`\`\`
$(grep -A 10 "Requests per second" ${RESULTS_DIR}/cards_list.txt)
\`\`\`

### 人気カードAPI  
\`\`\`
$(grep -A 10 "Requests per second" ${RESULTS_DIR}/popular_cards.txt)
\`\`\`

## 推奨改善点
1. データベースインデックスの最適化
2. Redis キャッシュの活用
3. CDN の導入検討
4. データベース接続プールのチューニング

## 詳細結果ファイル
- cards_list.txt: カード一覧APIの詳細結果
- popular_cards.txt: 人気カードAPIの詳細結果
- resource_usage.csv: リソース使用量履歴
- db_*.txt: データベースクエリ分析
EOF

echo ""
echo "✅ パフォーマンステスト完了！"
echo ""
echo "📁 結果保存場所: ${RESULTS_DIR}/"
echo "📊 サマリーレポート: ${RESULTS_DIR}/summary.md"
echo ""
echo "🔍 主要な結果:"
echo "カード一覧API RPS: $(grep "Requests per second" ${RESULTS_DIR}/cards_list.txt | awk '{print $4}')"
echo "人気カードAPI RPS: $(grep "Requests per second" ${RESULTS_DIR}/popular_cards.txt | awk '{print $4}')"

---

# Makefile - 開発・運用コマンドショートカット
.PHONY: help dev prod stop clean test deploy backup restore health update monitor performance

# デフォルトターゲット
help:
	@echo "Pokemon Content System - 利用可能なコマンド:"
	@echo ""
	@echo "開発環境:"
	@echo "  make dev         - 開発環境を起動"
	@echo "  make dev-logs    - 開発環境ログを表示"
	@echo "  make dev-shell   - 開発環境でDjangoシェルを起動"
	@echo ""
	@echo "本番環境:"
	@echo "  make prod        - 本番環境を起動"  
	@echo "  make prod-logs   - 本番環境ログを表示"
	@echo "  make deploy      - 本番環境にデプロイ"
	@echo ""
	@echo "データベース:"
	@echo "  make migrate     - マイグレーション実行"
	@echo "  make backup      - データベースバックアップ"
	@echo "  make restore     - データベース復元"
	@echo ""
	@echo "保守・監視:"
	@echo "  make health      - ヘルスチェック"
	@echo "  make update      - システム更新"
	@echo "  make monitor     - 監視システム起動"
	@echo "  make performance - パフォーマンステスト"
	@echo ""
	@echo "その他:"
	@echo "  make stop        - 全サービス停止"
	@echo "  make clean       - 不要なリソース削除"
	@echo "  make test        - テスト実行"

# 開発環境
dev:
	@./scripts/start-dev.sh

dev-logs:
	@docker-compose logs -f

dev-shell:
	@docker-compose exec web python manage.py shell

# 本番環境
prod:
	@./scripts/start-prod.sh

prod-logs:
	@docker-compose -f docker-compose.prod.yml logs -f

deploy:
	@./scripts/deploy.sh

# データベース
migrate:
	@./scripts/migrate.sh

migrate-prod:
	@./scripts/migrate.sh prod

backup:
	@./scripts/backup-db.sh

backup-prod:
	@./scripts/backup-db.sh prod

restore:
	@echo "使用法: make restore BACKUP_FILE=path/to/backup.sql.gz"
	@if [ -z "$(BACKUP_FILE)" ]; then echo "BACKUP_FILE を指定してください"; exit 1; fi
	@./scripts/restore-db.sh $(BACKUP_FILE)

# 保守・監視
health:
	@./scripts/health-check.sh

health-prod:
	@./scripts/health-check.sh prod

update:
	@./scripts/update-system.sh

monitor:
	@./scripts/monitoring-setup.sh
	@cd monitoring && docker-compose -f docker-compose.monitoring.yml up -d

performance:
	@./scripts/performance-test.sh

# その他
stop:
	@docker-compose down
	@docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
	@cd monitoring && docker-compose -f docker-compose.monitoring.yml down 2>/dev/null || true

clean:
	@echo "不要なDockerリソースを削除中..."
	@docker system prune -f
	@docker volume prune -f
	@docker image prune -f

test:
	@echo "テストを実行中..."
	@docker-compose exec web python manage.py test
	@cd frontend && npm test

# フロントエンド
frontend-install:
	@cd frontend && npm install

frontend-build:
	@cd frontend && npm run build

frontend-dev:
	@cd frontend && npm start