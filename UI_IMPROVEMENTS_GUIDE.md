# listing-management UI改善ガイド

## 🎯 改善内容

### 1. サンプルデータ削除（すぐ実行）
Supabase SQL Editorで実行:
```sql
DELETE FROM listing_schedule WHERE created_by = 'manual_test';
```

### 2. UI改善（コード修正が必要）

以下の改善をlisting-management/page.tsxに適用する必要があります:

#### a) モール別カラー関数を追加
ファイルの先頭、`export default function ListingManagementPage()` の**前**に追加:

```typescript
// モール別カラー
const getMarketplaceColor = (marketplace: string) => {
  switch (marketplace?.toLowerCase()) {
    case 'ebay': return 'bg-blue-500 text-white'
    case 'shopee': return 'bg-orange-500 text-white'
    case 'amazon_jp': return 'bg-yellow-600 text-white'
    case 'shopify': return 'bg-green-500 text-white'
    default: return 'bg-gray-500 text-white'
  }
}

const getAccountColor = (marketplace: string) => {
  switch (marketplace?.toLowerCase()) {
    case 'ebay': return 'bg-blue-100 text-blue-800'
    case 'shopee': return 'bg-orange-100 text-orange-800'
    case 'amazon_jp': return 'bg-yellow-100 text-yellow-800'
    case 'shopify': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}
```

#### b) カレンダーの当日ハイライト
`generateCalendarGrid()` 関数内、カレンダーのカードをレンダリングする部分を修正:

**現在**:
```typescript
const isToday = date.toDateString() === new Date().toDateString()
```

**修正後**:
```typescript
const today = new Date()
today.setHours(0, 0, 0, 0)
const cellDate = new Date(date)
cellDate.setHours(0, 0, 0, 0)
const isToday = cellDate.getTime() === today.getTime()
```

カードの className を修正:
```typescript
<Card 
  key={date.toISOString()} 
  className={`aspect-square p-2 ${
    isToday ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950/20' : ''
  } ${totalItems === 0 ? 'opacity-50' : ''}`}
>
```

#### c) マーケットプレイスバッジの色分け

**商品一覧のバッジ部分**（2箇所）:
```typescript
// マーケットプレイスバッジ
<Badge className={getMarketplaceColor(schedule.marketplace)}>
  {schedule.marketplace}
</Badge>

// アカウントバッジ
<Badge className={`text-xs ${getAccountColor(schedule.marketplace)}`}>
  {schedule.account_id}
</Badge>
```

**カレンダーのマーケットプレイス統計カード**:
```typescript
{marketplaceStats.map((ms, idx) => (
  <Card key={idx} className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
    <CardContent className="pt-4">
      <div className="flex items-center justify-between mb-2">
        <Badge className={getMarketplaceColor(ms.marketplace)}>{ms.marketplace}</Badge>
        <Badge className={`text-xs ${getAccountColor(ms.marketplace)}`}>{ms.account}</Badge>
      </div>
      ...
```

## 🎨 カラーリファレンス

| モール | マーケットプレイスバッジ | アカウントバッジ |
|--------|-------------------|--------------|
| eBay | 青 (bg-blue-500) | 薄青 (bg-blue-100) |
| Shopee | オレンジ (bg-orange-500) | 薄オレンジ (bg-orange-100) |
| Amazon JP | 黄 (bg-yellow-600) | 薄黄 (bg-yellow-100) |
| Shopify | 緑 (bg-green-500) | 薄緑 (bg-green-100) |

## ✅ 確認方法

1. サンプルデータを削除
2. コード修正を保存
3. ブラウザでページをリロード
4. 確認ポイント:
   - [ ] 当日のカレンダーセルが赤い枠で囲まれている
   - [ ] eBayのバッジが青色
   - [ ] Shopeeのバッジがオレンジ色
   - [ ] アカウントバッジが薄い色で表示

## 🚀 次のステップ

UI改善後、承認ページで新しいスケジュールを作成してテストしてください:

1. `/approval` ページで商品を選択
2. 「承認・出品予約」をクリック
3. モール・アカウントを選択
4. スケジュールを設定
5. 確定
6. `/listing-management` で表示確認

---

**注意**: コード修正が必要な場合は、具体的にどのファイルのどの部分を修正すればよいか指示してください。
