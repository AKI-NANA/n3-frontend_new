# 🚀 VPS自動監視設定 - 完全ガイド

## ✅ 前提条件の確認

VPSに以下がインストールされているか確認：
- Node.js 18以上
- Next.jsアプリがデプロイ済み
- アプリが起動中（ポート3000など）

---

## 📋 設定手順（15分で完了）

### ステップ1: VPSにSSH接続

```bash
ssh user@your-vps-ip
# 例: ssh root@123.456.789.0
```

---

### ステップ2: 監視スクリプトを作成

#### 1. スクリプトディレクトリ作成

```bash
mkdir -p ~/scripts
mkdir -p ~/logs
cd ~/scripts
```

#### 2. 在庫監視スクリプト作成

```bash
nano inventory-monitoring.sh
```

以下を貼り付け：

```bash
#!/bin/bash

# ==============================================
# 在庫・価格監視スクリプト
# 作成日: 2025-11-03
# ==============================================

# 設定
APP_URL="http://localhost:3000"  # VPS上のアプリURL
LOG_DIR="$HOME/logs"
LOG_FILE="$LOG_DIR/inventory-monitoring-$(date '+%Y%m%d').log"
MAX_RETRIES=3
RETRY_DELAY=300  # 5分

# Discord Webhook（オプション）
DISCORD_WEBHOOK=""  # 通知したい場合は設定

# ログディレクトリ作成
mkdir -p $LOG_DIR

# ログ開始
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "" >> $LOG_FILE
echo "========================================" >> $LOG_FILE
echo "[$TIMESTAMP] Starting inventory monitoring" >> $LOG_FILE
echo "========================================" >> $LOG_FILE

# リトライループ
SUCCESS=false
for i in $(seq 1 $MAX_RETRIES); do
  echo "[$TIMESTAMP] Attempt $i of $MAX_RETRIES..." >> $LOG_FILE
  
  # API実行
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$APP_URL/api/inventory-monitoring/execute" \
    -H "Content-Type: application/json" \
    2>&1)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)
  
  echo "HTTP Status: $HTTP_CODE" >> $LOG_FILE
  echo "Response: $BODY" >> $LOG_FILE
  
  # 成功判定
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    SUCCESS=true
    echo "[$TIMESTAMP] ✓ Successfully completed" >> $LOG_FILE
    break
  fi
  
  # リトライ待機
  if [ $i -lt $MAX_RETRIES ]; then
    echo "[$TIMESTAMP] × Failed, retrying in ${RETRY_DELAY}s..." >> $LOG_FILE
    sleep $RETRY_DELAY
  fi
done

# 失敗時の処理
if [ "$SUCCESS" = false ]; then
  ERROR_MSG="[$TIMESTAMP] ✗ All $MAX_RETRIES attempts failed"
  echo "$ERROR_MSG" >> $LOG_FILE
  
  # Discord通知（設定されている場合）
  if [ -n "$DISCORD_WEBHOOK" ]; then
    curl -X POST "$DISCORD_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d "{\"content\": \"⚠️ 在庫監視が失敗しました\n$ERROR_MSG\"}" \
      >> $LOG_FILE 2>&1
  fi
  
  exit 1
fi

# 古いログ削除（30日以上前）
find $LOG_DIR -name "inventory-monitoring-*.log" -mtime +30 -delete

echo "[$TIMESTAMP] Completed successfully" >> $LOG_FILE
exit 0
```

保存: `Ctrl + X` → `Y` → `Enter`

#### 3. 実行権限付与

```bash
chmod +x inventory-monitoring.sh
```

#### 4. テスト実行

```bash
./inventory-monitoring.sh
```

成功したら：
```bash
tail -20 ~/logs/inventory-monitoring-$(date '+%Y%m%d').log
```

---

### ステップ3: 価格最適化スクリプト作成（オプション）

```bash
nano price-optimization.sh
```

内容：

```bash
#!/bin/bash

APP_URL="http://localhost:3000"
LOG_DIR="$HOME/logs"
LOG_FILE="$LOG_DIR/price-optimization-$(date '+%Y%m%d').log"

mkdir -p $LOG_DIR

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$TIMESTAMP] Starting price optimization" >> $LOG_FILE

curl -X POST "$APP_URL/api/pricing/execute-all" \
  -H "Content-Type: application/json" \
  >> $LOG_FILE 2>&1

echo "[$TIMESTAMP] Completed" >> $LOG_FILE
```

権限付与：
```bash
chmod +x price-optimization.sh
```

---

### ステップ4: Cron設定

#### 1. Crontabを開く

```bash
crontab -e
```

初めての場合、エディタを選択：
- `nano`を選択（簡単）

#### 2. 以下を追加

```cron
# ========================================
# n3-frontend 自動監視設定
# ========================================

# 在庫・価格監視: 12時間ごと（0時と12時）
0 0,12 * * * ~/scripts/inventory-monitoring.sh

# 価格最適化: 1日2回（朝8時と夜8時）
0 8,20 * * * ~/scripts/price-optimization.sh

# ログクリーンアップ: 毎日深夜2時
0 2 * * * find ~/logs -name "*.log" -mtime +30 -delete
```

保存: `Ctrl + X` → `Y` → `Enter`

#### 3. Cron設定確認

```bash
crontab -l
```

---

### ステップ5: アプリがVPSで起動しているか確認

#### PM2で起動している場合

```bash
pm2 list
```

起動していない場合：
```bash
cd /path/to/n3-frontend
pm2 start npm --name "n3-frontend" -- start
pm2 save
```

#### 手動起動の場合

```bash
cd /path/to/n3-frontend
npm run build
npm start &
```

#### ポート確認

```bash
curl http://localhost:3000/api/health
```

---

## 🔍 動作確認

### 1. 即座にテスト実行

```bash
~/scripts/inventory-monitoring.sh
```

### 2. ログ確認

```bash
# リアルタイム監視
tail -f ~/logs/inventory-monitoring-$(date '+%Y%m%d').log

# 最新20行
tail -20 ~/logs/inventory-monitoring-$(date '+%Y%m%d').log

# 全体確認
cat ~/logs/inventory-monitoring-$(date '+%Y%m%d').log
```

### 3. Cronの実行履歴確認

```bash
# Cronログ確認（Ubuntu/Debian）
grep CRON /var/log/syslog | tail -20

# またはCronログ（CentOS/RHEL）
grep CRON /var/log/cron | tail -20
```

---

## 🎯 Supabaseでの確認

### UIで確認

```
http://localhost:3000/inventory-monitoring
→ 実行履歴タブ
```

### SQLで確認

Supabase SQL Editor:
```sql
-- 最新の実行履歴
SELECT 
  id,
  started_at,
  completed_at,
  total_products,
  changes_detected,
  status,
  error_message
FROM inventory_monitoring_logs
ORDER BY started_at DESC
LIMIT 10;

-- 今日の実行
SELECT * FROM inventory_monitoring_logs
WHERE DATE(started_at) = CURRENT_DATE
ORDER BY started_at DESC;
```

---

## ⚙️ 詳細設定

### デフォルト設定の変更

1. **UIで設定**
```
http://localhost:3000/inventory-monitoring
→ デフォルト設定タブ
→ 監視頻度: 12時間ごと
→ 保存
```

2. **またはSQLで直接設定**
```sql
UPDATE global_pricing_strategy
SET 
  check_frequency = '12hours',
  out_of_stock_action = 'set_zero',
  min_profit_usd = 10
WHERE marketplace = 'ebay';
```

---

## 🔔 Discord通知設定（オプション）

### 1. Discord Webhookを作成

1. Discordサーバーで、設定 → 連携サービス
2. ウェブフック → 新しいウェブフック
3. URLをコピー

### 2. スクリプトに追加

```bash
nano ~/scripts/inventory-monitoring.sh
```

以下の行を編集：
```bash
DISCORD_WEBHOOK="https://discord.com/api/webhooks/YOUR_WEBHOOK_URL"
```

---

## ⚠️ トラブルシューティング

### エラー: Permission denied

```bash
chmod +x ~/scripts/inventory-monitoring.sh
```

### エラー: curl: command not found

```bash
# Ubuntu/Debian
sudo apt-get install curl

# CentOS/RHEL
sudo yum install curl
```

### エラー: Connection refused

アプリが起動していない：
```bash
pm2 list
pm2 start npm --name "n3-frontend" -- start
```

### Cronが実行されない

```bash
# Cronサービス確認
sudo systemctl status cron

# 再起動
sudo systemctl restart cron

# Crontab確認
crontab -l
```

---

## 📊 推奨設定まとめ

### 基本設定（推奨）

```bash
# 監視頻度: 12時間ごと
0 0,12 * * * ~/scripts/inventory-monitoring.sh

# 価格最適化: 1日2回
0 8,20 * * * ~/scripts/price-optimization.sh
```

### 保守的な設定（安全重視）

```bash
# 監視頻度: 1日1回
0 9 * * * ~/scripts/inventory-monitoring.sh

# 価格最適化: 1日1回
0 20 * * * ~/scripts/price-optimization.sh
```

### 積極的な設定（商品数が少ない場合）

```bash
# 監視頻度: 6時間ごと（100商品以下推奨）
0 0,6,12,18 * * * ~/scripts/inventory-monitoring.sh
```

---

## ✅ 設定完了チェックリスト

- [ ] VPSにSSH接続できた
- [ ] スクリプトを作成した
- [ ] 実行権限を付与した
- [ ] テスト実行が成功した
- [ ] Crontabを設定した
- [ ] ログファイルが作成された
- [ ] アプリが起動している
- [ ] UIで実行履歴を確認できた
- [ ] デフォルト設定を確認した

すべてチェックできたら完了です！🎉

---

## 🎊 完了後

### 1週間様子を見る

```bash
# 毎日ログ確認
tail -50 ~/logs/inventory-monitoring-$(date '+%Y%m%d').log

# エラーがないか確認
grep -i error ~/logs/inventory-monitoring-*.log

# 実行回数確認
grep "Starting inventory monitoring" ~/logs/inventory-monitoring-*.log | wc -l
```

### 問題なければ放置でOK！

自動で監視が続きます。
たまにUIの実行履歴タブでチェックするだけ。

お疲れ様でした！🚀
