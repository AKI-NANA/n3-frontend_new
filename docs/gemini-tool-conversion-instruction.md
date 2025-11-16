# 🔧 Gemini生成ツールをNext.js 14に変換する指示書

## 📋 概要

`src/utils`にあるGemini生成ファイル（HTML/JSX/React）を、Next.js 14の`app/tools/[tool-name]/page.tsx`形式に変換してください。

---

## 🎯 変換対象ファイル

以下のファイルを1つずつ変換してください:

### 優先度1（最優先）
1. `AIラジオ風コンテンツジェネレーター`
2. `BUYMA無在庫仕入れ戦略シミュレーター (修正版)`
3. `業務委託支払い管理システム（ロール分離`
4. `古物買取・在庫進捗管理システム`
5. `刈り取り自動選定＆自動購入プロトタイプ`

### 優先度2
6. `コンテンツ自動化コントロールパネル`
7. `統合パーソナルマネジメントダッシュボード`
8. `製品主導型仕入れ管理システム`
9. `楽天せどり_SP-API模擬ツール`
10. その他のファイル

---

## 📝 変換ルール

### 1. ファイル構造

```
app/tools/[tool-name]/
  ├── page.tsx          # メインページ（必須）
  ├── components/       # 必要に応じてコンポーネント分割
  └── README.md        # ツール説明（任意）
```

### 2. ツール名のマッピング

| 元ファイル名 | ディレクトリ名 | URL |
|------------|--------------|-----|
| AIラジオ風コンテンツジェネレーター | ai-radio-generator | /tools/ai-radio-generator |
| BUYMA無在庫仕入れ戦略シミュレーター | buyma-simulator | /tools/buyma-simulator |
| 業務委託支払い管理システム | contractor-payment | /tools/contractor-payment |
| 古物買取・在庫進捗管理システム | kobutsu-management | /tools/kobutsu-management |
| 刈り取り自動選定＆自動購入 | arbitrage-selector | /tools/arbitrage-selector |
| コンテンツ自動化コントロールパネル | content-automation | /tools/content-automation |
| 統合パーソナルマネジメント | personal-management | /tools/personal-management |
| 製品主導型仕入れ管理 | product-sourcing | /tools/product-sourcing |
| 楽天せどり_SP-API模擬 | rakuten-arbitrage | /tools/rakuten-arbitrage |

### 3. 必須の変換ポイント

#### A. ファイルヘッダー
```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// その他必要なshadcn/uiコンポーネント
```

#### B. スタイリング
- ❌ `<script src="https://cdn.tailwindcss.com"></script>` を削除
- ❌ `<style>` タグ内のCSSを削除
- ✅ Tailwind CSSのクラスのみ使用
- ✅ shadcn/uiコンポーネントを優先的に使用

#### C. Firebase/外部API
- ❌ グローバル変数 `__app_id`, `__firebase_config` は使用不可
- ✅ 環境変数 `process.env.NEXT_PUBLIC_*` を使用
- ✅ Supabaseクライアントを推奨: `import { createClient } from '@/lib/supabase/client'`

例:
```typescript
// ❌ 旧コード
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

// ✅ 新コード
const supabase = createClient()
```

#### D. データ永続化
Firebase Firestoreの代わりにSupabaseを使用:

```typescript
// Firestoreの代わり
const { data, error } = await supabase
  .from('table_name')
  .insert([{ column: value }])

const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('id', userId)
```

#### E. HTMLからReactへの変換

❌ **旧コード（HTML）**
```html
<button id="generateButton" onclick="generateAudio()">
  <span id="buttonText">生成開始</span>
</button>

<script>
  function generateAudio() {
    document.getElementById('buttonText').textContent = '生成中...'
  }
</script>
```

✅ **新コード（React）**
```typescript
export default function Page() {
  const [isGenerating, setIsGenerating] = useState(false)
  
  const handleGenerate = async () => {
    setIsGenerating(true)
    // 処理
    setIsGenerating(false)
  }
  
  return (
    <Button onClick={handleGenerate} disabled={isGenerating}>
      {isGenerating ? '生成中...' : '生成開始'}
    </Button>
  )
}
```

---

## 🎨 UIデザインガイドライン

### 1. ページレイアウト
```typescript
export default function ToolNamePage() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ツール名</h1>
        <p className="text-gray-600">ツールの説明</p>
      </div>

      {/* メインコンテンツ */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>セクション名</CardTitle>
          </CardHeader>
          <CardContent>
            {/* コンテンツ */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

### 2. フォーム要素
```typescript
<div className="space-y-4">
  <div>
    <label className="text-sm font-medium mb-2 block">ラベル</label>
    <Input 
      placeholder="入力してください" 
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  </div>
  
  <Button onClick={handleSubmit}>
    送信
  </Button>
</div>
```

### 3. ローディング状態
```typescript
{isLoading ? (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    <span className="ml-2">読み込み中...</span>
  </div>
) : (
  // コンテンツ
)}
```

---

## 🔄 変換テンプレート

### テンプレート1: シンプルなツール

```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ToolNamePage() {
  const [inputValue, setInputValue] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleProcess = async () => {
    setIsProcessing(true)
    try {
      // 処理ロジック
      setResult('処理完了')
    } catch (error) {
      console.error('エラー:', error)
      alert('エラーが発生しました')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ツール名</h1>
        <p className="text-gray-600">ツールの説明文</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>入力フォーム</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">入力項目</label>
            <Input
              placeholder="入力してください"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleProcess} 
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? '処理中...' : '実行'}
          </Button>

          {result && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-green-800">{result}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### テンプレート2: Supabase連携ツール

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface DataItem {
  id: number
  name: string
  created_at: string
}

export default function ToolNamePage() {
  const [data, setData] = useState<DataItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const { data: items, error } = await supabase
        .from('table_name')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setData(items || [])
    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async (name: string) => {
    try {
      const { error } = await supabase
        .from('table_name')
        .insert([{ name }])

      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('追加エラー:', error)
      alert('追加に失敗しました')
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">データ管理ツール</h1>
        <p className="text-gray-600">Supabase連携データ管理</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : (
        <div className="grid gap-4">
          {data.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-6">
                <p>{item.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## ✅ 変換チェックリスト

各ツール変換時に以下を確認してください:

- [ ] `'use client'` ディレクティブを追加
- [ ] HTMLタグを全てReactコンポーネントに変換
- [ ] インラインスタイル・CSSを削除し、Tailwindクラスに置き換え
- [ ] `onclick`などのイベントハンドラを`onClick`に変換
- [ ] グローバル変数・外部CDNを削除
- [ ] shadcn/uiコンポーネントを使用
- [ ] Firebase → Supabaseに変換（必要な場合）
- [ ] エラーハンドリングを追加
- [ ] ローディング状態を実装
- [ ] レスポンシブデザインを確保
- [ ] TypeScript型定義を追加

---

## 📤 出力形式

変換後、以下の形式で提供してください:

```markdown
## ツール名: [ツール名]

### ファイルパス
app/tools/[tool-name]/page.tsx

### コード
\`\`\`typescript
[変換後のコード全文]
\`\`\`

### 使用したコンポーネント
- Card, CardContent, CardHeader, CardTitle
- Button
- Input
- その他

### 必要な追加設定
- 環境変数: NEXT_PUBLIC_XXX_API_KEY
- Supabaseテーブル: table_name
- その他の依存関係

### 変更点
1. XXXをYYYに変更
2. ZZZ機能を追加
3. その他の重要な変更
```

---

## 🎯 Geminiへの依頼例文

### 例1: AIラジオ生成器の変換

```
以下のファイルをNext.js 14のツールに変換してください。

【ファイル内容】
[src/utils/AIラジオ風コンテンツジェネレーター の全文をコピー]

【変換要件】
- ファイルパス: app/tools/ai-radio-generator/page.tsx
- 上記の「変換ルール」と「UIデザインガイドライン」に従ってください
- Firebase → Supabase に変換してください
- shadcn/uiコンポーネントを使用してください
- Gemini API呼び出しは維持してください（環境変数を使用）

【出力形式】
上記の「出力形式」に従って、完全なコードと説明を提供してください。
```

### 例2: BUYMA仕入れシミュレーターの変換

```
以下のファイルをNext.js 14のツールに変換してください。

【ファイル内容】
[src/utils/BUYMA無在庫仕入れ戦略シミュレーター (修正版) の全文をコピー]

【変換要件】
- ファイルパス: app/tools/buyma-simulator/page.tsx
- 上記の「変換ルール」と「UIデザインガイドライン」に従ってください
- 計算ロジックは維持してください
- 結果の表示にはTableコンポーネントを使用してください
- データ保存機能はSupabaseで実装してください

【出力形式】
上記の「出力形式」に従って、完全なコードと説明を提供してください。
```

---

## 🔧 トラブルシューティング

### 問題1: Firebaseの認証が必要
**解決策**: Supabase Authに置き換えるか、認証なしで動作するように変更

### 問題2: 外部APIキーが必要
**解決策**: 環境変数を使用
```typescript
const apiKey = process.env.NEXT_PUBLIC_API_KEY
```

### 問題3: CSSが複雑すぎる
**解決策**: 主要な機能のみ実装し、デザインはシンプルに

### 問題4: ファイルサイズが大きい
**解決策**: コンポーネントを分割
```
app/tools/tool-name/
  ├── page.tsx
  ├── components/
  │   ├── Form.tsx
  │   ├── ResultTable.tsx
  │   └── Chart.tsx
```

---

## 📚 参考リソース

- Next.js 14 App Router: https://nextjs.org/docs/app
- shadcn/ui: https://ui.shadcn.com/
- Tailwind CSS: https://tailwindcss.com/docs
- Supabase: https://supabase.com/docs

---

## ✨ 完了後の確認

変換完了後、以下を確認してください:

1. ✅ ツールが正常に動作する
2. ✅ エラーがコンソールに表示されない
3. ✅ レスポンシブデザインが機能する
4. ✅ データの保存・読み込みが動作する
5. ✅ SidebarConfig.tsのstatusを"ready"に変更

---

## 🎉 最後に

この指示書に従って変換すれば、`src/utils`の全ツールをNext.js 14のモダンなツールとして再利用できます。

**変換の優先順位**: 
1. 最も頻繁に使用するツール
2. ビジネスクリティカルなツール  
3. その他のツール

段階的に変換を進めてください！
