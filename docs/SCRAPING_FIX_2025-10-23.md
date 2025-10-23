# Yahoo Auction スクレイピング修正レポート

**日付**: 2025年10月23日
**修正者**: Claude (AI Assistant)
**対象**: https://n3.emverze.com/data-collection

---

## 🔍 問題の診断

### ユーザーからの報告
1. **モックデータのみ表示** - 実際の商品データが取得できない（¥11,254, ¥19,872など）
2. **CSVエクスポート不動作** - ボタンが機能していない
3. **総取得数が変動しない** - 統計カウンターが0のまま
4. **データベースに保存されていない** - DBに何も入っていない

### 根本原因の発見

#### 1. 旧PHPバックエンドへの依存
現在のコード(`app/api/scraping/execute/route.ts`)は、次のPHPエンドポイントへプロキシしていた：

```typescript
const phpEndpoints = [
  'http://localhost:8080/modules/yahoo_auction_complete/new_structure/02_scraping/api_endpoint.php',
  'http://localhost:8080/02_scraping/api/scrape_workflow.php',
  'http://localhost:5002/api/scrape'
]
```

**問題**: これらのPHPサーバーが起動していないため、常にフォールバックのモックデータを返していた。

#### 2. クラスベースセレクターの使用
仮にPuppeteerを使っていても、以下のような**動的に変わるクラス名**に依存していた：

```typescript
// ❌ 間違った方法
const titleElement = document.querySelector('h1.ProductTitle__text')
const priceElement = document.querySelector('.Price__value')
```

**問題**: Yahoo Auctionは`sc-1f0603b0-0 bwvXmC`のようなハッシュ化されたクラス名を使用しており、ページやデプロイごとに変わる。

---

## ✅ 実装した修正

### 1. 構造ベーススクレイピングの実装

PHPの旧システム(`original-php/yahoo_auction_complete/02_scraping/platforms/yahoo/yahoo_parser_v2025.php`)を参考に、**クラス名に依存しない**スクレイピングロジックを実装：

#### タイトル取得
```typescript
// ✅ 正しい方法：最初のh1タグを取得（クラス名不要）
const titleElement = document.querySelector('h1')
const title = titleElement?.textContent?.trim() || ''
```

#### 価格取得
```typescript
// ✅ 正しい方法：「即決」というテキストを持つdtタグを探し、
// その次のdd > spanから価格を取得
const dtElements = Array.from(document.querySelectorAll('dt'))
const sokketsuDt = dtElements.find(dt => dt.textContent?.includes('即決'))

if (sokketsuDt) {
  const dd = sokketsuDt.nextElementSibling
  const priceSpan = dd?.querySelector('span')
  const priceText = priceSpan?.textContent || ''
  // HTMLコメント（3,500<!-- -->円）も正しく処理
  const cleanPrice = priceText.replace(/[^0-9,]/g, '').replace(/,/g, '')
  price = parseInt(cleanPrice) || 0
}
```

#### 商品状態取得
```typescript
// ✅ 正しい方法：aria-label="状態"を持つsvgから辿る
const conditionSvg = document.querySelector('svg[aria-label="状態"]')
if (conditionSvg) {
  const parentLi = conditionSvg.closest('li')
  const conditionSpan = parentLi?.querySelector('span:not(:has(svg))')
  const conditionText = conditionSpan?.textContent?.trim() || '不明'
}
```

#### 入札数取得
```typescript
// ✅ 正しい方法：aria-label="入札"を持つsvgから辿る
const bidsSvg = document.querySelector('svg[aria-label="入札"]')
if (bidsSvg) {
  const parentLi = bidsSvg.closest('li')
  const bidsLink = parentLi?.querySelector('a')
  bids = bidsLink?.textContent?.trim() || '0件'
}
```

### 2. データベース保存機能の追加

Supabaseへの自動保存を実装：

```typescript
const productData = {
  title: data.title,
  price: data.price,
  source_url: url,
  condition: data.condition,
  stock_status: data.stock,
  bid_count: data.bids,
  platform: 'Yahoo Auction',
  scraped_at: new Date().toISOString(),
  scraping_method: 'structure_based_puppeteer_v2025'
}

const { error: dbError } = await supabase
  .from('scraped_products')
  .insert([productData])
```

### 3. 動的統計カウンターの実装

フロントエンド(`components/data-collection/DataCollectionSystem.tsx`)で、APIレスポンスから統計を動的に更新：

```typescript
// APIレスポンスから統計を取得し累積
if (data.stats) {
  setStats(prev => ({
    total: prev.total + data.stats.total,
    success: prev.success + data.stats.success,
    failed: prev.failed + data.stats.failed,
    inProgress: 0
  }))
}
```

### 4. CSVエクスポート機能の実装

```typescript
const handleExportCSV = () => {
  const headers = ['タイトル', '価格', 'URL', '在庫状況', 'コンディション', '入札数', 'ステータス', '取得日時']
  const rows = results.map(result => [
    result.title || '',
    result.price || '',
    result.url || '',
    result.stock || '',
    result.condition || '',
    result.bids || '',
    result.status || '',
    result.timestamp || ''
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // BOM追加でExcel文字化け対策
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })

  // ダウンロード
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `scraping_results_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}
```

### 5. Supabaseテーブルの作成

`supabase/migrations/20251023_create_scraped_products.sql`を作成：

```sql
CREATE TABLE IF NOT EXISTS scraped_products (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  price INTEGER DEFAULT 0,
  source_url TEXT NOT NULL,
  condition TEXT,
  stock_status TEXT,
  bid_count TEXT,
  platform TEXT DEFAULT 'Yahoo Auction',
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  scraping_method TEXT DEFAULT 'structure_based_puppeteer_v2025',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📊 技術的な要点

### 安定したセレクター戦略

1. **HTMLタグ構造** - `<h1>`, `<dt>`, `<dd>` などの安定したHTML要素
2. **aria-label属性** - `svg[aria-label="状態"]`, `svg[aria-label="入札"]`
3. **テキストコンテンツ** - "即決", "現在価格", "入札" などの文字列で要素を特定
4. **親子関係** - `closest('li')`, `nextElementSibling`でDOM構造を辿る

### なぜクラス名を使わないのか？

Yahoo Auctionは**CSS-in-JS**や**CSS Modules**を使用しており：

```html
<!-- 実際のHTML -->
<dl class="sc-1f0603b0-0 bwvXmC">
  <dt class="gv-u-fontSize16...">即決</dt>
  <dd class="sc-1f0603b0-1 eNGAca">
    <span class="sc-1f0603b0-2 kxUAXU">3,500<!-- -->円</span>
  </dd>
</dl>
```

- `sc-1f0603b0-0`, `bwvXmC` → ハッシュ化されたクラス名
- デプロイごとに変わる
- 他のページでは異なる

**解決策**: クラス名ではなく、`<dt>`の中の"即決"というテキストで判定

---

## 🚀 デプロイ後の確認事項

### VPSでの追加作業

1. **Supabaseマイグレーション実行**
   ```bash
   # VPS上で
   cd ~/n3-frontend_new
   # Supabaseマイグレーションを手動で実行する必要がある場合
   ```

2. **環境変数の確認**
   ```bash
   # .env.localに以下が設定されているか確認
   NEXT_PUBLIC_SUPABASE_URL=your_url
   SUPABASE_SERVICE_ROLE_KEY=your_key
   ```

3. **動作確認**
   - https://n3.emverze.com/data-collection にアクセス
   - Yahoo AuctionのURL (例: `https://page.auctions.yahoo.co.jp/jp/auction/t1204568188`) を入力
   - 実際の商品データ（タイトル、価格、状態）が取得できるか確認
   - CSVエクスポートが動作するか確認
   - 総取得数カウンターが増えるか確認

---

## 📝 参考資料

### 分析に使用したファイル

1. **旧PHPシステム**
   - `original-php/yahoo_auction_complete/02_scraping/platforms/yahoo/yahoo_parser_v2025.php`
   - 構造ベース解析の実装例

2. **ユーザー提供のHTML分析**
   - `/tmp/yahoo_auction_structure.md`
   - 実際のYahoo Auction HTMLの構造分析

3. **重要な発見**
   - クラス名は `sc-1f0603b0-0 bwvXmC` のように動的生成される
   - `aria-label` 属性は安定している
   - HTML構造自体は比較的安定している

---

## 🎯 期待される結果

### 修正前
- ✗ モックデータのみ表示（¥11,254, ¥19,872）
- ✗ CSVエクスポート不動作
- ✗ 総取得数が0のまま
- ✗ DBにデータが入らない

### 修正後
- ✓ 実際のYahoo Auctionデータを取得
- ✓ CSVエクスポートが動作
- ✓ 総取得数が正しくカウント
- ✓ Supabaseにデータが保存される

---

## 🔧 トラブルシューティング

### 問題: Puppeteerが動作しない

**原因**: Chromeがインストールされていない

**解決策**:
```bash
# VPS上で
npx puppeteer browsers install chrome
# または
apt-get install chromium-browser
```

### 問題: データが取得できない

**確認事項**:
1. VPSのNext.jsサーバーが起動しているか
2. Puppeteerが正常にインストールされているか
3. Yahoo Auctionのページ構造が変わっていないか（aria-labelなどを確認）

### 問題: データベースエラー

**確認事項**:
1. Supabaseマイグレーションが実行されているか
2. 環境変数が正しく設定されているか
3. `scraped_products`テーブルが存在するか

---

**実装完了日**: 2025年10月23日
**バージョン**: structure_based_puppeteer_v2025
