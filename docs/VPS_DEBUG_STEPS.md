# VPSデバッグ手順

**問題**: https://n3.emverze.com/data-collection でモックデータのみ表示される

---

## 🔍 ステップ1: デプロイ状況の確認

### GitHub Actionsの確認

1. https://github.com/AKI-NANA/n3-frontend_new/actions にアクセス
2. 最新のワークフローが**緑色（成功）**になっているか確認
3. 失敗している場合、エラーログを確認

### VPSにSSHで接続

```bash
ssh ubuntu@tk2-236-27682.vs.sakura.ne.jp
```

### デプロイされたコードのバージョン確認

```bash
cd ~/n3-frontend_new
git log --oneline -5
```

**期待される最新コミット**:
- `c210fad Merge pull request #8` または
- `0876600 fix: data-collection実際のスクレイピングとCSVダウンロード機能を実装`

もし古いコミットの場合：
```bash
git pull origin main
npm install
npm run build
pm2 restart n3-frontend
```

---

## 🔍 ステップ2: デバッグエンドポイントで診断

### ブラウザで以下にアクセス

```
https://n3.emverze.com/api/scraping/debug
```

### 確認項目

```json
{
  "checks": {
    "puppeteer": {
      "installed": true  // ← これがfalseの場合、npm installが必要
    },
    "chromeLaunch": {
      "success": true  // ← これがfalseの場合、Chrome未インストール
    },
    "supabase": {
      "url": "設定済み",  // ← "未設定"の場合、環境変数が必要
      "serviceKey": "設定済み"
    }
  }
}
```

---

## 🔧 ステップ3: 問題別の解決方法

### 問題A: Puppeteerがインストールされていない

**症状**: `"puppeteer": { "installed": false }`

**解決策**:
```bash
cd ~/n3-frontend_new
npm install
pm2 restart n3-frontend
```

### 問題B: Chromeが起動できない

**症状**: `"chromeLaunch": { "success": false }`

**解決策**:
```bash
# 方法1: Puppeteer経由でChrome をインストール
npx puppeteer browsers install chrome

# 方法2: システムのChromiumをインストール
sudo apt-get update
sudo apt-get install -y chromium-browser

# 再起動
pm2 restart n3-frontend
```

### 問題C: 環境変数が設定されていない

**症状**: `"supabase": { "url": "未設定" }`

**解決策**:
```bash
cd ~/n3-frontend_new

# .env.localを作成/編集
nano .env.local
```

以下を追加：
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

保存後：
```bash
pm2 restart n3-frontend
```

### 問題D: ビルドキャッシュが古い

**解決策**:
```bash
cd ~/n3-frontend_new
rm -rf .next
npm run build
pm2 restart n3-frontend
```

---

## 🔍 ステップ4: ログの確認

### PM2のログを確認

```bash
# リアルタイムログ
pm2 logs n3-frontend

# 最新100行
pm2 logs n3-frontend --lines 100

# エラーのみ
pm2 logs n3-frontend --err
```

### 探すべきキーワード

- `[Scraping] 構造ベーススクレイピング開始` ← スクレイピングが実行されている
- `[Scraping] 抽出成功` ← データ取得成功
- `[Database] 保存成功` ← DB保存成功
- `Error: Could not find Chrome` ← Chrome未インストール
- `Error: Failed to launch the browser` ← ブラウザ起動失敗

---

## 🧪 ステップ5: 手動テスト

### curlでAPIを直接呼び出し

```bash
curl -X POST https://n3.emverze.com/api/scraping/execute \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://page.auctions.yahoo.co.jp/jp/auction/t1204568188"],
    "platforms": ["yahoo-auction"]
  }'
```

### 期待されるレスポンス

```json
{
  "success": true,
  "results": [
    {
      "title": "【大量出品中 正規品】ポケモンカード...",
      "price": 3500,
      "status": "success"
    }
  ]
}
```

### エラーレスポンスの例

```json
{
  "success": true,
  "results": [
    {
      "title": "スクレイピング失敗",
      "status": "error",
      "error": "Could not find Chrome",
      "debugInfo": {
        "suggestion": "Run: npx puppeteer browsers install chrome"
      }
    }
  ]
}
```

---

## 📊 ステップ6: データベースの確認

### Supabase Dashboardで確認

1. https://supabase.com にログイン
2. プロジェクトを選択
3. Table Editor → `scraped_products`
4. データが入っているか確認

### SQLで確認

```sql
SELECT
  id, title, price, source_url, scraped_at
FROM scraped_products
ORDER BY scraped_at DESC
LIMIT 10;
```

データがない場合：
1. マイグレーションが実行されていない
2. 環境変数が未設定
3. スクレイピング自体が失敗している

---

## 🎯 よくある問題と解決策

### Q1: 「モックデータが表示される」

**原因**: 古いコードが動いている

**確認**:
```bash
cd ~/n3-frontend_new
cat app/api/scraping/execute/route.ts | head -5
```

**期待される出力**:
```typescript
// API Route for Yahoo Auction scraping with structure-based selectors
import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
```

もし違う場合：
```bash
git pull origin main
npm run build
pm2 restart n3-frontend
```

### Q2: 「価格が違う」

**原因**: Puppeteerが失敗してフォールバックしている

**確認**:
```bash
pm2 logs n3-frontend | grep "Scraping"
```

**エラーログを探す**

### Q3: 「総取得数が0のまま」

**原因**: APIが実行されていない、またはフロントエンドの問題

**確認**:
```bash
# ブラウザのDevToolsコンソールでエラーを確認
# Networkタブで/api/scraping/executeのレスポンスを確認
```

---

## 📞 サポート情報

### デバッグ情報の収集

問題が解決しない場合、以下の情報を収集：

```bash
# 1. バージョン確認
cd ~/n3-frontend_new
git log --oneline -3
node --version
npm --version

# 2. デバッグエンドポイントの結果
curl https://n3.emverze.com/api/scraping/debug

# 3. PM2ログ（最新100行）
pm2 logs n3-frontend --lines 100 --nostream

# 4. 環境変数確認（キーは隠す）
echo "Supabase URL set: $([ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && echo 'Yes' || echo 'No')"
```

---

**作成日**: 2025年10月23日
**対象**: https://n3.emverze.com/data-collection スクレイピング問題
