# コーディング規約

## 🎨 スタイリング

### Tailwind CSS

このプロジェクトは **Tailwind CSS** を使用しています。

#### 基本ルール

1. **ユーティリティクラスを使用**
```tsx
// ✅ 推奨
<div className="flex items-center gap-2 p-4">

// ❌ 非推奨
<div style={{ display: 'flex', alignItems: 'center' }}>
```

2. **レスポンシブデザイン**
```tsx
<div className="w-full md:w-1/2 lg:w-1/3">
```

3. **ホバー・フォーカス状態**
```tsx
<button className="bg-blue-600 hover:bg-blue-700 focus:ring-2">
```

---

### カラーパレット

```tsx
// プライマリ（青）
bg-blue-50 / 100 / 200 / ... / 900

// セカンダリ（グレー）
bg-gray-50 / 100 / 200 / ... / 900

// 成功（緑）
bg-green-50 / 100 / 200 / ... / 900

// 警告（黄）
bg-amber-50 / 100 / 200 / ... / 900

// エラー（赤）
bg-red-50 / 100 / 200 / ... / 900

// 情報（エメラルド）
bg-emerald-50 / 100 / 200 / ... / 900
```

---

### コンポーネント設計

#### shadcn/ui コンポーネント

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
```

#### ボタンのバリエーション

```tsx
// デフォルト
<Button>ボタン</Button>

// バリアント
<Button variant="default">デフォルト</Button>
<Button variant="outline">アウトライン</Button>
<Button variant="ghost">ゴースト</Button>
<Button variant="destructive">削除</Button>

// サイズ
<Button size="sm">小</Button>
<Button size="default">中</Button>
<Button size="lg">大</Button>
```

#### バッジ

```tsx
<Badge>デフォルト</Badge>
<Badge variant="secondary">セカンダリ</Badge>
<Badge variant="outline">アウトライン</Badge>
<Badge variant="destructive">エラー</Badge>
```

---

## 📝 TypeScript

### 型定義

```typescript
// ✅ 推奨: インターフェースを使用
interface User {
  id: number
  name: string
  email: string
}

// ✅ 推奨: ReactコンポーネントのProps
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  // ...
}
```

### 型推論を活用

```typescript
// ✅ 推奨: 型推論
const [count, setCount] = useState(0)  // number と推論される

// ❌ 非推奨: 不要な型注釈
const [count, setCount] = useState<number>(0)
```

---

## 🗂️ ファイル構成

### ページファイル

```tsx
// app/tools/my-tool/page.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function MyToolPage() {
  const [data, setData] = useState([])
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Tool</h1>
      {/* コンテンツ */}
    </div>
  )
}
```

### APIルート

```typescript
// app/api/my-endpoint/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    // ロジック
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // ロジック
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

---

## 🔤 命名規則

### ファイル名

```
kebab-case を使用

✅ 推奨:
- user-profile.tsx
- api-client.ts
- shipping-calculator.tsx

❌ 非推奨:
- UserProfile.tsx
- apiClient.ts
- ShippingCalculator.tsx
```

### コンポーネント名

```typescript
// PascalCase を使用
export function UserProfile() { }
export function ShippingCalculator() { }
```

### 変数名・関数名

```typescript
// camelCase を使用
const userData = {}
function calculateShipping() { }
```

### 定数名

```typescript
// UPPER_SNAKE_CASE を使用
const MAX_RETRY_COUNT = 3
const API_BASE_URL = 'https://api.example.com'
```

---

## 🎯 ベストプラクティス

### State管理

```tsx
// ✅ 推奨: useStateで明確に
const [isLoading, setIsLoading] = useState(false)
const [data, setData] = useState<User[]>([])

// ✅ 推奨: カスタムフック
function useUserData() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  
  // ロジック
  
  return { users, loading }
}
```

### エラーハンドリング

```typescript
try {
  const result = await fetchData()
  setData(result)
} catch (error) {
  console.error('データ取得エラー:', error)
  alert('エラーが発生しました')
}
```

### ローディング状態

```tsx
{loading ? (
  <div className="flex items-center justify-center py-8">
    <RefreshCw className="h-6 w-6 animate-spin" />
    <span className="ml-2">読み込み中...</span>
  </div>
) : (
  <div>{/* コンテンツ */}</div>
)}
```

---

## 📱 レスポンシブデザイン

### ブレークポイント

```tsx
<div className="
  w-full           // モバイル: 100%幅
  md:w-1/2         // タブレット: 50%幅
  lg:w-1/3         // デスクトップ: 33%幅
">
```

### グリッドレイアウト

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <Card>カード1</Card>
  <Card>カード2</Card>
  <Card>カード3</Card>
  <Card>カード4</Card>
</div>
```

---

## 🔐 セキュリティ

### 環境変数

```typescript
// ✅ 推奨: 環境変数を使用
const apiKey = process.env.NEXT_PUBLIC_API_KEY

// ❌ 非推奨: ハードコード
const apiKey = 'sk-1234567890abcdef'
```

### サニタイゼーション

```typescript
// ユーザー入力は必ずサニタイズ
const sanitizedInput = input.trim().toLowerCase()
```

---

## 📊 パフォーマンス

### メモ化

```tsx
// useCallback for functions
const handleClick = useCallback(() => {
  // ロジック
}, [dependencies])

// useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data)
}, [data])
```

### 遅延ローディング

```tsx
// Dynamic import
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>
})
```

---

## 🧪 テスト

### コンポーネントテスト

```typescript
// tests/components/Button.test.tsx
import { render, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

test('ボタンクリックイベント', () => {
  const handleClick = jest.fn()
  const { getByText } = render(<Button onClick={handleClick}>Click</Button>)
  
  fireEvent.click(getByText('Click'))
  expect(handleClick).toHaveBeenCalled()
})
```

---

## 📚 コメント

### ドキュメントコメント

```typescript
/**
 * ユーザー情報を取得する
 * @param userId - ユーザーID
 * @returns ユーザー情報
 */
async function getUserById(userId: number): Promise<User> {
  // 実装
}
```

### インラインコメント

```typescript
// ✅ 推奨: なぜこうするのかを説明
// 価格は負の値にならないように0で制限
const finalPrice = Math.max(0, calculatedPrice)

// ❌ 非推奨: 何をしているかだけを説明
// 価格を計算
const finalPrice = calculatePrice()
```

---

## 🚀 デプロイ

### ビルド前チェック

```bash
# 型チェック
npm run type-check

# リント
npm run lint

# ビルド
npm run build
```

---

## 📖 参考資料

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
