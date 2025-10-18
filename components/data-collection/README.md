# NAGANO-3 統合データ取得システム - 実装ガイド

## 📁 作成したファイル構成

```
n3-frontend/
├── components/
│   └── data-collection/
│       ├── DataCollectionSystem.tsx  # メインコンポーネント
│       ├── platformsData.tsx        # プラットフォームデータ定義
│       └── index.ts                 # エクスポート
├── app/
│   ├── data-collection/
│   │   └── page.tsx                # ページコンポーネント
│   └── api/
│       └── scraping/
│           └── execute/
│               └── route.ts         # APIルート
```

## 🎨 テーマシステムとの完全統合

### 色変更対応
- **完全にCSS変数ベース**: 固定色を一切使用せず、すべてshadcn/uiのテーマ変数を使用
- **ヘッダーのPaletteボタンと連動**: グローバルヘッダーのテーマ切り替えが即座に反映
- **3つのテーマモード対応**:
  - ライトモード
  - ダークモード  
  - ブルーテーマ
  - システム設定追従

### 使用しているテーマ変数
```css
- bg-background / text-foreground
- bg-card / border-border
- text-muted-foreground
- bg-primary / text-primary-foreground
- bg-accent / hover:bg-accent
- bg-destructive / text-destructive
- focus:ring-ring
```

## 🔗 既存システムとの連携

### URLルーティング
- `/data-collection` - メインページ
- `/api/scraping/execute` - データ取得API

### PHPバックエンドとの連携
```typescript
// 3つのバックエンドエンドポイントに対応
const phpEndpoints = [
  'http://localhost:8080/modules/.../02_scraping/api_endpoint.php',
  'http://localhost:8080/02_scraping/api/scrape_workflow.php',
  'http://localhost:5002/api/scrape'
]
```

## 🚀 使用方法

### 1. 依存関係の確認
```bash
# shadcn/ui コンポーネントが必要
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add input
```

### 2. ページへのアクセス
```
http://localhost:3000/data-collection
```

### 3. サイドバーへのリンク追加
```tsx
// 既存のサイドバーコンポーネントに追加
<Link href="/data-collection">
  <div className="flex items-center gap-2">
    <Database className="h-4 w-4" />
    <span>データ取得</span>
  </div>
</Link>
```

## 🎯 主要機能

### 60以上のプラットフォーム対応
- **オークション**: Yahoo、メルカリ、ヤフーフリマ
- **EC**: 楽天、Amazon、ヨドバシ、モノタロウ
- **TCG**: 9サイト（シングルスター、晴れる屋等）
- **ゴルフ**: 8サイト（ゴルフパートナー、ゴルフ5等）
- **ホビー**: 25サイト（あみあみ、まんだらけ等）
- **その他**: 7サイト（駿河屋、セカンドストリート等）

### リアルタイムデータ取得
- 複数URL同時処理
- プラットフォーム自動判定
- 進捗表示とエラーハンドリング

### 統計ダッシュボード
- 総取得数: 45,678件
- 成功率: 92.8%
- エラー率: 1.2%
- リアルタイム処理状況

## 🔧 カスタマイズ

### 新規プラットフォーム追加
```typescript
// platformsData.tsxに追加
{
  id: 'new-platform',
  name: '新規プラットフォーム',
  status: 'beta',
  url: '/02_scraping/platforms/new',
  count: 0
}
```

### APIエンドポイント変更
```typescript
// route.tsのphpEndpoints配列を編集
const phpEndpoints = [
  'http://your-backend/api/scrape',
  // 追加のエンドポイント
]
```

## 📝 注意事項

1. **テーマ切り替えボタンは含まない**: ヘッダーのPaletteボタンで制御
2. **「スクレイピング」という表現を使用しない**: 「データ取得」で統一
3. **クイックアクセス・出品ツールリンクは含まない**: サイドバーはデータ取得機能に特化

## 🚦 動作確認

1. テーマ切り替えが正常に動作するか確認
2. 各プラットフォームへのリンクが機能するか確認
3. データ取得APIが適切にフォールバックするか確認
4. 統計情報が表示されるか確認

## 🛠️ トラブルシューティング

### テーマが反映されない場合
- `globals.css`でCSS変数が定義されているか確認
- `<html>`タグにテーマクラスが適用されているか確認

### APIエラーの場合
- PHPバックエンドが起動しているか確認
- CORSの設定を確認
- フォールバックモードでモックデータが表示されるか確認
