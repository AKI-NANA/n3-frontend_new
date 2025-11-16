# Claude Desktop データ貼り付けフロー完全ガイド

## 🎯 現在の状況分析

### 画面に表示されているデータ
```
商品: Pokemon Card Gengar VMAX
取得価格: 3500円
状態: 目立った傷
画像枚数: 6枚
```

このデータは既に **Next.jsシステム（n3-frontend）** に入っています。

---

## 📊 データフロー全体図

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
フェーズ1: データ収集（既に完了している部分）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Yahoo Auction
    ↓ スクレイピング
Next.jsシステム（n3-frontend）
    ↓ データベース保存
Supabase products テーブル
    ↓ UI表示
現在の画面 ← 👆 今ここ


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
フェーズ2: データエクスポート（これから実行）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

現在の画面
    ↓ CSVエクスポート
CSVファイル
    ↓ コピー
クリップボード
    ↓ 貼り付け
Claude Desktop ← 👆 ここに貼り付ける
    ↓ 自動処理
HTSコード判定 + 関税率取得
    ↓ 自動保存
Supabase products テーブル（listing_data更新）
```

---

## 🚀 実際の手順（5ステップ）

### ステップ1: CSVエクスポート（Next.jsシステム）

**現在の画面で実行:**

```
1. 左上の「CSV」ボタンをクリック
   または
   「一括実行」→「SM分析」→「CSV」

2. エクスポートされるCSVの内容:
   - 商品名
   - 取得価格
   - 英語タイトル
   - サイズ（長さ、幅、高さ）
   - 重さ
   - 画像枚数
   - カテゴリ
```

**エクスポート例:**
```csv
商品名,取得価格,英語タイトル,長さ,幅,高さ,重さ,画像枚数
Pokemon Card Gengar VMAX,3500,Pokemon Card Gengar VMAX,20,15,2,100,6
ワンピース フィギュアルフィ,8500,One Piece Figure Luffy,30,20,25,500,8
...
```

---

### ステップ2: CSVデータをコピー

```
1. エクスポートされたCSVファイルを開く
2. 全選択（Cmd + A）
3. コピー（Cmd + C）
```

または

```
1. Next.jsシステムで商品を選択
2. 右クリック → コピー
3. またはショートカットキーでコピー
```

---

### ステップ3: Claude Desktopに貼り付け

**Claude Desktopを開いて:**

```
以下のCSVデータを処理してください：

[ここに貼り付け - Cmd + V]

各商品について：
1. hs_codesテーブルでHTSコード検索
2. 原産国を判定（主にJP/CN）
3. customs_dutiesテーブルで関税率取得
4. productsテーブルのlisting_dataを更新

完了後、処理結果のサマリーを表示してください。
```

---

### ステップ4: Claude Desktopが自動処理

```
Claude Desktop:
  ↓
1. CSVデータを解析
   - 商品名: Pokemon Card Gengar VMAX
   - 価格: 3500円
   
2. HTSコード判定
   SELECT * FROM hs_codes 
   WHERE description ILIKE '%trading card%'
      OR description ILIKE '%game%'
   → 9504.40.0000 (Playing cards)
   
3. 原産国判定
   - ブランド: Pokemon
   - 製造国推定: JP (Japan)
   
4. 関税率取得
   SELECT * FROM customs_duties
   WHERE hts_code = '9504.40.0000'
     AND origin_country = 'JP'
   → 0% (Free)
   
5. データ更新
   UPDATE products
   SET listing_data = listing_data || '{
     "hts_code": "9504.40.0000",
     "origin_country": "JP",
     "duty_rate": 0.0000
   }'::jsonb
   WHERE sku = 'NF5CA8F114-AF7!'

✅ 処理完了
```

---

### ステップ5: Next.jsで確認

```
現在の画面をリロード
  ↓
listing_dataに以下が追加されている:
  - hts_code: 9504.40.0000
  - origin_country: JP
  - duty_rate: 0.0000
```

---

## 💡 具体的な実装方法

### 方法A: 現在のNext.jsシステムにエクスポート機能を追加

#### 1. エクスポートボタンの追加

```typescript
// app/components/ProductTable.tsx

const exportForClaude = () => {
  const selectedProducts = products.filter(p => p.selected)
  
  const csvData = selectedProducts.map(p => ({
    sku: p.sku,
    title: p.title,
    title_en: p.title_en,
    price_jpy: p.price_jpy,
    length_cm: p.length_cm,
    width_cm: p.width_cm,
    height_cm: p.height_cm,
    weight_g: p.weight_g,
    image_count: p.image_count,
    category: p.category
  }))
  
  // CSV形式に変換
  const csv = convertToCSV(csvData)
  
  // クリップボードにコピー
  navigator.clipboard.writeText(csv)
  
  alert('CSVデータをクリップボードにコピーしました！Claude Desktopに貼り付けてください。')
}

// UIに追加
<button onClick={exportForClaude}>
  Claude Desktop用エクスポート
</button>
```

#### 2. プロンプトテンプレートも一緒にコピー

```typescript
const exportForClaudeWithPrompt = () => {
  const csv = generateCSV(selectedProducts)
  
  const prompt = `
以下のCSVデータを処理してproductsテーブルを更新してください：

${csv}

各商品について：
1. hs_codesテーブルで適切なHTSコードを検索
2. 商品名・カテゴリから原産国を判定（JP/CN/US等）
3. customs_dutiesテーブルで関税率を取得
4. productsテーブルのlisting_dataカラムを更新

UPDATE products
SET listing_data = listing_data || '{
  "hts_code": "判定したコード",
  "origin_country": "判定した国",
  "duty_rate": 取得した税率
}'::jsonb
WHERE sku = '各SKU';

完了後、処理結果のサマリーを表示してください。
`
  
  navigator.clipboard.writeText(prompt)
  alert('プロンプト付きでコピー完了！Claude Desktopに貼り付けてください。')
}
```

---

### 方法B: 現在の画面から手動でコピー

#### 画面から直接コピーする場合

```
1. 表示されている商品データを選択
2. 以下の形式でClaude Desktopに入力:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
以下の商品を処理してください：

商品1:
SKU: NF5CA8F114-AF7!
商品名: Pokemon Card Gengar VMAX
英語タイトル: Pokemon Card Gengar VMAX
価格: 3500円
サイズ: 20 x 15 x 2 cm
重さ: 100g
画像枚数: 6枚

商品2:
SKU: OP-LUFFY-G5-00
商品名: ワンピース フィギュアルフィ
英語タイトル: One Piece Figure Luffy
価格: 8500円
...

各商品について：
1. HTSコード判定
2. 原産国判定
3. 関税率取得
4. productsテーブル更新
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎯 推奨フロー

### 最も効率的な方法

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ステップ1: Next.jsにエクスポート機能を追加
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 「Claude用エクスポート」ボタン追加
2. プロンプト付きCSVを自動生成
3. クリップボードに自動コピー


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ステップ2: Claude Desktopで処理
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Claude Desktop起動
2. Cmd + V で貼り付け
3. Enter押すだけ
4. 5分で100件処理完了


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ステップ3: Next.jsで確認
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 画面をリロード
2. listing_dataが更新されている
3. HTSコード・関税率が表示される
```

---

## 📋 実装が必要なコード

### コンポーネント追加

```typescript
// app/components/ClaudeExportButton.tsx

'use client'

import { useState } from 'react'

export default function ClaudeExportButton({ 
  selectedProducts 
}: { 
  selectedProducts: Product[] 
}) {
  const [copied, setCopied] = useState(false)
  
  const handleExport = () => {
    // CSVデータ生成
    const csv = selectedProducts.map(p => 
      `${p.sku},${p.title},${p.price_jpy},${p.length_cm},${p.width_cm},${p.height_cm},${p.weight_g}`
    ).join('\n')
    
    // プロンプト生成
    const prompt = `
以下のCSVデータを処理してください：

SKU,商品名,価格,長さ,幅,高さ,重さ
${csv}

各商品について：
1. hs_codesテーブルでHTSコード検索
2. 原産国判定
3. customs_dutiesテーブルで関税率取得
4. productsテーブルのlisting_dataを更新

完了後、サマリーを表示してください。
`
    
    // クリップボードにコピー
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <button
      onClick={handleExport}
      className="bg-purple-600 text-white px-4 py-2 rounded"
    >
      {copied ? '✅ コピー完了！' : '📋 Claude用エクスポート'}
    </button>
  )
}
```

---

## 🎉 まとめ

### データの流れ

```
Next.jsシステム（現在の画面）
  ↓ 「Claude用エクスポート」ボタン
クリップボード（プロンプト付きCSV）
  ↓ Cmd + V
Claude Desktop
  ↓ 自動処理（5分）
Supabase（listing_data更新）
  ↓ リロード
Next.jsシステム（更新済みデータ表示）
```

### 必要な実装

1. ✅ MCP設定（完了）
2. ⏳ Next.jsにエクスポート機能追加（実装必要）
3. ⏳ プロンプトテンプレート作成（実装必要）

**次のステップ**: エクスポートボタンの実装をしますか？
