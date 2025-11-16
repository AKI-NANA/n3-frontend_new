# 🚀 VPS自動監視設定ガイド

## 概要

VPS上でNext.jsアプリを稼働させながら、定期的に在庫・価格監視を自動実行する方法を説明します。

---

## 📋 前提条件

- VPSにNext.jsアプリがデプロイ済み
- Node.js 18以上インストール済み
- PM2またはsystemdでアプリが常駐稼働中

---

## 🎯 方法1: Vercel Cron Jobs（推奨）

### メリット
- ✅ 設定が簡単
- ✅ サーバーリソース不要
- ✅ 信頼性が高い
- ✅ 無料枠で十分

### 設定手順

#### 1. vercel.jsonを作成

```json
{
  "crons": [
    {
      "path": "/api/cron/inventory-monitoring",
      "schedule": "0 */2 * * *"
    },
    {
      "path": "/api/cron/price-optimization",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/daily-report",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**スケジュール説明**:
- `0 */2 * * *` - 2時間ごと（在庫監視）
- `0 */6 * * *` - 6時間ごと（価格最適化）
- `0 9 * * *` - 毎日9時（日次レポート）

#### 2. Cron APIエンドポイント作成

`/app/api/cron/inventory-monitoring/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export const runtime = 'edge'

export async function GET(request: Request) {
  // Vercel Cronからのリクエストか確認
  const authHeader = headers().get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 監視実行APIを呼び出し
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory-monitoring/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    })
  } catch (error) {
    console.error('Cron execution error:', error)
    return NextResponse.json({ error: 'Execution failed' }, { status: 500 })
  }
}
```

#### 3. 環境変数設定

`.env.production`:
```bash
CRON_SECRET=your-random-secret-key-here
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

#### 4. Vercelにデプロイ

```bash
vercel --prod
```

---

## 🎯 方法2: VPS上のCron（Linux）

### メリット
- ✅ 完全なコントロール
- ✅ 複雑な処理も可能
- ✅ 既存VPSを活用

### 設定手順

#### 1. Cronスクリプト作成

`/home/user/n3-frontend/scripts/cron-inventory-monitoring.sh`:
```bash
#!/bin/bash

# ログディレクトリ
LOG_DIR="/home/user/logs"
mkdir -p $LOG_DIR

# 現在時刻
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="$LOG_DIR/inventory-monitoring-$(date '+%Y%m%d').log"

echo "[$TIMESTAMP] Starting inventory monitoring..." >> $LOG_FILE

# APIエンドポイント呼び出し
curl -X POST https://your-domain.com/api/inventory-monitoring/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  >> $LOG_FILE 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "[$TIMESTAMP] Completed successfully" >> $LOG_FILE
else
  echo "[$TIMESTAMP] Failed with exit code $EXIT_CODE" >> $LOG_FILE
  # エラー通知（オプション）
  # /home/user/scripts/notify-error.sh "Inventory monitoring failed"
fi

# 古いログを削除（30日以上前）
find $LOG_DIR -name "inventory-monitoring-*.log" -mtime +30 -delete

echo "---" >> $LOG_FILE
```

#### 2. 実行権限付与

```bash
chmod +x /home/user/n3-frontend/scripts/cron-inventory-monitoring.sh
```

#### 3. Crontab設定

```bash
crontab -e
```

以下を追加:
```cron
# 在庫監視（2時間ごと）
0 */2 * * * /home/user/n3-frontend/scripts/cron-inventory-monitoring.sh

# 価格最適化（6時間ごと）
0 */6 * * * /home/user/n3-frontend/scripts/cron-price-optimization.sh

# 日次レポート（毎日9時）
0 9 * * * /home/user/n3-frontend/scripts/cron-daily-report.sh

# ログローテーション（毎日0時）
0 0 * * * find /home/user/logs -name "*.log" -mtime +30 -delete
```

#### 4. Cron設定確認

```bash
# 設定確認
crontab -l

# Cronサービス再起動
sudo systemctl restart cron

# ログ確認
tail -f /home/user/logs/inventory-monitoring-$(date '+%Y%m%d').log
```

---

## 🎯 方法3: Node.js Scheduler（アプリ内蔵）

### メリット
- ✅ アプリと一体化
- ✅ TypeScriptで記述可能
- ✅ デバッグしやすい

### 設定手順

#### 1. node-cronインストール

```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

#### 2. スケジューラー作成

`/lib/scheduler.ts`:
```typescript
import cron from 'node-cron'
import { createClient } from '@/lib/supabase/server'

export function startScheduler() {
  console.log('🚀 Starting scheduler...')

  // 在庫監視（2時間ごと）
  cron.schedule('0 */2 * * *', async () => {
    console.log('🔍 Running inventory monitoring...')
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory-monitoring/execute`, {
        method: 'POST',
      })
      const result = await response.json()
      console.log('✅ Inventory monitoring completed:', result)
    } catch (error) {
      console.error('❌ Inventory monitoring failed:', error)
    }
  })

  // 価格最適化（6時間ごと）
  cron.schedule('0 */6 * * *', async () => {
    console.log('💰 Running price optimization...')
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pricing/execute-all`, {
        method: 'POST',
      })
      const result = await response.json()
      console.log('✅ Price optimization completed:', result)
    } catch (error) {
      console.error('❌ Price optimization failed:', error)
    }
  })

  // 日次レポート（毎日9時）
  cron.schedule('0 9 * * *', async () => {
    console.log('📊 Generating daily report...')
    try {
      const supabase = createClient()
      
      // レポート生成ロジック
      const { data: stats } = await supabase
        .from('inventory_monitoring_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      console.log('✅ Daily report generated:', stats)
    } catch (error) {
      console.error('❌ Daily report failed:', error)
    }
  })

  console.log('✅ Scheduler started successfully')
}
```

#### 3. サーバー起動時に実行

`/app/api/health/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { startScheduler } from '@/lib/scheduler'

// サーバー起動時に1回だけ実行
let schedulerStarted = false
if (!schedulerStarted) {
  startScheduler()
  schedulerStarted = true
}

export async function GET() {
  return NextResponse.json({ status: 'ok', scheduler: 'running' })
}
```

#### 4. PM2設定

`ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'n3-frontend',
    script: 'npm',
    args: 'start',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
}
```

起動:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🎯 方法4: GitHub Actions（外部トリガー）

### メリット
- ✅ 無料
- ✅ GitHubで一元管理
- ✅ ログが見やすい

### 設定手順

`.github/workflows/scheduled-monitoring.yml`:
```yaml
name: Scheduled Monitoring

on:
  schedule:
    # 在庫監視（2時間ごと）
    - cron: '0 */2 * * *'
  workflow_dispatch: # 手動実行も可能

jobs:
  inventory-monitoring:
    runs-on: ubuntu-latest
    steps:
      - name: Run Inventory Monitoring
        run: |
          curl -X POST ${{ secrets.API_BASE_URL }}/api/inventory-monitoring/execute \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.API_SECRET }}"
      
      - name: Notify on failure
        if: failure()
        run: echo "Monitoring failed - check logs"
```

GitHub Secretsに追加:
- `API_BASE_URL`: https://your-domain.com
- `API_SECRET`: your-secret-key

---

## 📊 監視方法

### ログ確認

#### Vercel Cronの場合
```bash
# Vercel CLIでログ確認
vercel logs

# 特定の関数
vercel logs --function=/api/cron/inventory-monitoring
```

#### Linux Cronの場合
```bash
# リアルタイム監視
tail -f /home/user/logs/inventory-monitoring-$(date '+%Y%m%d').log

# 過去のログ確認
cat /home/user/logs/inventory-monitoring-20251103.log
```

#### Node.js Schedulerの場合
```bash
# PM2ログ
pm2 logs n3-frontend

# リアルタイム
pm2 logs --lines 100
```

### データベースで確認

```sql
-- 最新の実行履歴
SELECT * FROM inventory_monitoring_logs
ORDER BY created_at DESC
LIMIT 10;

-- 今日のエラー
SELECT * FROM inventory_monitoring_logs
WHERE DATE(created_at) = CURRENT_DATE
AND status = 'error';

-- 統計
SELECT 
  DATE(created_at) as date,
  COUNT(*) as executions,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
FROM inventory_monitoring_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## ⚙️ 推奨設定

| 環境 | 推奨方法 | 理由 |
|-----|---------|------|
| Vercel | Vercel Cron | 最も簡単で信頼性が高い |
| VPS単体 | Linux Cron | シンプルで確実 |
| VPS + 複雑な処理 | Node.js Scheduler | TypeScriptで柔軟に制御 |
| 開発/テスト | GitHub Actions | 無料で手軽 |

---

## 🔔 エラー通知設定（オプション）

### Discordへ通知

`/lib/notify.ts`:
```typescript
export async function notifyError(message: string) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) return

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `⚠️ **エラー発生**\n${message}\n${new Date().toLocaleString('ja-JP')}`
    })
  })
}
```

### メール通知

```typescript
import nodemailer from 'nodemailer'

export async function sendErrorEmail(subject: string, message: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.ADMIN_EMAIL,
    subject: `[n3-frontend] ${subject}`,
    text: message
  })
}
```

---

## ✅ チェックリスト

- [ ] Cron設定完了
- [ ] ログディレクトリ作成
- [ ] 環境変数設定
- [ ] テスト実行成功
- [ ] ログ確認方法確立
- [ ] エラー通知設定（オプション）
- [ ] ドキュメント作成
- [ ] 運用手順書作成

---

## 🎉 完了！

これでVPS上でも自動監視が稼働し続けます！
