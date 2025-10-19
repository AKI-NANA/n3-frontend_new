# 価格最適化システム - 実装ガイド

## 📦 提供したファイル一覧

### 1. データベーススキーマ
- **ファイル名**: `database-schema.sql`
- **配置先**: プロジェクトルート または `/supabase/migrations/`
- **内容**:
  - 9つの新規テーブル
  - 2つのビュー
  - 40個以上のインデックス
  - RLS (Row Level Security) 設定
  - トリガー関数

### 2. TypeScript型定義
- **ファイル名**: `lib/types/price-optimization.ts`
- **内容**:
  - 全データベーステーブルの型
  - API リクエスト/レスポンス型
  - ビジネスロジック用の型
  - 50個以上の型定義

### 3. コアロジック
- **ファイル名**: `lib/price-optimization/calculator.ts`
- **内容**:
  - 利益計算ロジック
  - 赤字判定ロジック
  - 価格提案アルゴリズム
  - バリデーション関数
  - 10個以上の関数

### 4. API実装
- **ファイル名**: `app/api/price-optimization/**/*.ts`
- **配置先**: Next.js App Router
- **エンドポイント**:
  - `POST /api/price-optimization/cost-change` - 仕入値変更
  - `GET /api/price-optimization/queue` - キュー取得
  - `POST /api/price-optimization/approve` - 承認
  - `POST /api/price-optimization/recalculate` - 再計算
  - `GET/PUT /api/price-optimization/settings` - 設定管理
  - `GET /api/price-optimization/stats` - 統計
  - `GET /api/price-optimization/alerts` - アラート

### 5. React UIコンポーネント
- **ファイル名**: `PriceOptimizationDashboard.tsx`
- **配置先**: `app/price-optimization/page.tsx`
- **機能**:
  - 統計カード表示
  - 価格調整キュー表示
  - 一括承認機能
  - フィルタリング

---

## 🚀 Claude Desktopでの実装手順

### ステップ1: データベースセットアップ（必須）

1. **Supabase Dashboardにアクセス**
   ```
   https://app.supabase.com/project/YOUR_PROJECT_ID
   ```

2. **SQLエディタを開く**
   - 左サイドバー > SQL Editor

3. **スキーマ実行**
   - 提供した `database-schema.sql` の内容を貼り付け
   - "Run" ボタンをクリック
   - エラーがないことを確認

4. **テーブル確認**
   - Table Editor で以下のテーブルが作成されたか確認:
     - `cost_change_history`
     - `competitor_prices`
     - `auto_pricing_settings`
     - `price_adjustment_queue`
     - `price_update_history`
     - `ebay_mug_countries`
     - `price_optimization_rules`
     - `system_alerts`

### ステップ2: 既存テーブルの確認

**重要**: 以下のテーブルが既に存在することを確認してください：

```sql
-- 必須テーブル
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'inventory_management',
    'profit_margin_settings',
    'ebay_categories'
  );
```

存在しない場合は、先に在庫管理システムのスキーマを構築する必要があります。

### ステップ3: 型定義ファイルの配置

```bash
# プロジェクトルートで実行
mkdir -p lib/types
mkdir -p lib/price-optimization

# 型定義ファイルを配置
# price-optimization.ts を lib/types/ に保存
```

### ステップ4: コアロジックの配置

```bash
# calculator.ts を lib/price-optimization/ に保存
```

### ステップ5: API実装

```bash
# APIルートディレクトリ作成
mkdir -p app/api/price-optimization/{cost-change,queue,approve,recalculate,settings,stats,alerts}

# 各エンドポイントのroute.tsを配置
# 提供したコードをそれぞれのディレクトリに配置
```

**ディレクトリ構造**:
```
app/api/price-optimization/
├── cost-change/
│   └── route.ts
├── queue/
│   └── route.ts
├── approve/
│   └── route.ts
├── recalculate/
│   └── route.ts
├── settings/
│   └── route.ts
├── stats/
│   └── route.ts
└── alerts/
    └── route.ts
```

### ステップ6: Supabaseクライアント設定

`lib/supabase/server.ts` に以下を追加（存在しない場合）:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Server Componentでのset操作はエラーになる場合がある
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Server Componentでのremove操作はエラーになる場合がある
          }
        },
      },
    }
  );
}
```

### ステップ7: UIページの作成

```bash
# ページディレクトリ作成
mkdir -p app/price-optimization

# page.tsx を作成
# 提供したReactコンポーネントを配置
```

**ファイル**: `app/price-optimization/page.tsx`

### ステップ8: 環境変数確認

`.env.local` に以下が設定されているか確認:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### ステップ9: 依存関係インストール

```bash
npm install @supabase/ssr @supabase/supabase-js
npm install lucide-react  # アイコンライブラリ
```

### ステップ10: 開発サーバー起動

```bash
npm run dev
```

ブラウザで以下にアクセス:
```
http://localhost:3000/price-optimization
```

---

## ⚠️ 未実装部分（今後の作業）

### 高優先度

1. **eBay API統合**
   - Finding API（競合価格取得）
   - Trading API（価格更新）
   - 認証処理
   - Rate limit管理

2. **Webhook実装**
   - `/api/webhooks/cost-change`
   - 署名検証
   - エラーハンドリング

3. **バッチ処理**
   - 競合価格取得バッチ（日次）
   - 価格最適化バッチ（日次）
   - Vercel Cron設定

### 中優先度

4. **競合分析ページ**
   - `/app/competitor-analysis/page.tsx`
   - 国別価格比較グラフ
   - 価格推移チャート

5. **商品編集UI拡張**
   - `/app/tools/editing` に価格設定タブ追加
   - 自動価格調整ON/OFF UI

6. **アラート通知**
   - メール通知
   - Slack通知
   - ブラウザ通知

### 低優先度

7. **詳細レポート**
   - PDF出力
   - CSVエクスポート
   - グラフ可視化

8. **ユーザー権限管理**
   - 承認者設定
   - 閲覧専用ユーザー

---

## 🧪 テスト手順

### 1. データベーステスト

```sql
-- テーブル存在確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%price%' OR table_name LIKE '%cost%';

-- サンプルデータ挿入
INSERT INTO auto_pricing_settings (item_id, min_margin_percent, auto_tracking_enabled)
VALUES ('TEST-001', 20.00, true);

-- データ取得確認
SELECT * FROM auto_pricing_settings WHERE item_id = 'TEST-001';
```

### 2. API テスト

```bash
# 統計API
curl http://localhost:3000/api/price-optimization/stats

# キューAPI
curl http://localhost:3000/api/price-optimization/queue?status=pending_approval

# 設定API
curl http://localhost:3000/api/price-optimization/settings?item_id=TEST-001
```

### 3. UI テスト

1. ブラウザで `/price-optimization` にアクセス
2. 統計カードが表示されるか確認
3. キューテーブルが表示されるか確認
4. フィルタリングが機能するか確認

---

## 📝 次にやるべきこと（優先順位順）

### Phase 1: 基本機能の完成（1-2週間）

1. **仕入値変更UIの作成**
   - 在庫管理ページに「仕入値変更」ボタン追加
   - モーダルダイアログで変更理由入力
   - APIコール → 自動再計算

2. **価格調整承認フローの完成**
   - 承認後の実際のeBay API呼び出し（モック）
   - エラーハンドリング
   - ロールバック処理

3. **赤字アラート機能**
   - システムアラート生成
   - 画面上部に通知バッジ表示
   - アラート一覧ページ

### Phase 2: 自動化（2-3週間）

4. **Webhook実装**
   - エンドポイント作成
   - 外部システムとの連携テスト

5. **簡易的な競合価格取得**
   - 手動入力UI（eBay API前の暫定）
   - 価格比較表示

6. **バッチ処理（ローカル実行版）**
   - Node.jsスクリプトで定期実行
   - Vercel Cron統合は後回し

### Phase 3: 本格的な自動化（1-2ヶ月）

7. **eBay Finding API統合**
8. **eBay Trading API統合**
9. **8カ国対応**
10. **本番デプロイ**

---

## 🐛 トラブルシューティング

### データベースエラー

**エラー**: `relation "inventory_management" does not exist`

**解決策**: 在庫管理テーブルが未作成です。先に在庫管理システムをセットアップしてください。

### APIエラー

**エラー**: `NEXT_PUBLIC_SUPABASE_URL is not defined`

**解決策**: `.env.local` に環境変数を設定してください。

### 型エラー

**エラー**: `Cannot find module '@/lib/types/price-optimization'`

**解決策**: `tsconfig.json` の `paths` 設定を確認してください:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## 📚 参考資料

- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase Documentation](https://supabase.com/docs)
- [eBay Developer Program](https://developer.ebay.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 💡 実装のヒント

1. **段階的に進める**: まずUIを完成させ、次にロジック、最後に外部API統合
2. **モックデータを活用**: eBay APIなしでも開発できるようにモックデータで進める
3. **エラーハンドリング**: すべてのAPI呼び出しにtry-catchを実装
4. **ログ記録**: `console.log`だけでなく、データベースにログを記録
5. **テストデータ**: 開発用に10件程度のサンプル商品を作成しておく

---

## ✅ チェックリスト

実装完了時に以下を確認:

- [ ] データベーステーブルが全て作成された
- [ ] 型定義ファイルが配置された
- [ ] コアロジックが配置された
- [ ] 全APIエンドポイントが動作する
- [ ] UIページが表示される
- [ ] 統計データが正しく表示される
- [ ] 価格調整キューが表示される
- [ ] 承認機能が動作する（モックでOK）
- [ ] フィルタリングが機能する
- [ ] エラーハンドリングが実装されている

---

以上で基礎実装は完了です。Claude Desktopで残りの機能を実装してください！