# HTMLテンプレートエディタ（多言語対応版）

## 📁 ディレクトリ構造

```
html-editor/
├── page.tsx              # メインページコンポーネント（多言語対応）
├── page_backup.tsx       # 元の単一言語版のバックアップ
├── types/
│   └── index.ts         # TypeScript型定義
├── constants/
│   └── index.ts         # 定数（言語、カテゴリ、変数など）
└── components/          # 将来的なコンポーネント分割用（予約）
```

## 🌍 対応言語

- 🇺🇸 English (US) - ebay.com
- 🇬🇧 English (UK) - ebay.co.uk
- 🇦🇺 English (AU) - ebay.com.au
- 🇩🇪 Deutsch - ebay.de
- 🇫🇷 Français - ebay.fr
- 🇮🇹 Italiano - ebay.it
- 🇪🇸 Español - ebay.es
- 🇯🇵 日本語 - ebay.co.jp

## ✨ 主な機能

- ✅ 8言語対応HTMLテンプレート編集
- ✅ 言語タブによる切り替え
- ✅ 各言語ごとのHTML編集
- ✅ 全言語一括保存
- ✅ 言語別プレビュー生成
- ✅ テンプレート管理（保存/読み込み/削除）
- ✅ 変数システム（プレースホルダー）
- ✅ クイックテンプレート挿入
- ✅ Supabase統合

## 📊 データベース構造

```sql
html_templates (
  id UUID,
  template_id VARCHAR(255) UNIQUE,
  name TEXT,
  category VARCHAR(50),
  languages JSONB,  -- 多言語コンテンツ
  version VARCHAR(50),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### languages フィールド構造

```json
{
  "en_US": {
    "html_content": "<div>...</div>",
    "updated_at": "2025-10-15T00:00:00Z"
  },
  "ja": {
    "html_content": "<div>...</div>",
    "updated_at": "2025-10-15T00:00:00Z"
  }
}
```

## 🔌 API エンドポイント

### テンプレート管理
- **POST** `/api/html-editor/templates`
  - `action: 'save_template'` - 多言語テンプレート保存
  - `action: 'load_templates'` - テンプレート一覧取得
  - `action: 'load_single_template'` - 単一テンプレート取得
  - `action: 'delete_template'` - テンプレート削除

### プレビュー生成
- **POST** `/api/html-editor/preview`
  - 言語別サンプルデータでプレビュー生成

## 🚀 使い方

1. **テンプレート作成**
   - テンプレート名とカテゴリを入力
   - 言語タブを選択してHTMLを入力
   - 必要な言語すべてで入力

2. **変数の使用**
   - サイドバーの変数ボタンをクリックして挿入
   - {{TITLE}}, {{PRICE}} などのプレースホルダーを使用

3. **保存**
   - 「全言語保存」ボタンで一括保存

4. **プレビュー**
   - 言語を選択して「生成」ボタンでプレビュー表示

## 🔄 マイグレーション

単一言語版から多言語版への移行：

```sql
-- /sql/html-editor/migrate_to_multilang.sql を実行
```

## 📝 開発メモ

- `page.tsx` - 多言語対応メインコンポーネント
- `page_backup.tsx` - 元の単一言語版（参考用）
- 型定義とロジックは分離されており、保守性が高い
- 将来的には各コンポーネントをさらに分割可能

## 🔗 関連ファイル

- `/app/api/html-editor/templates/route.ts` - テンプレートAPI
- `/app/api/html-editor/preview/route.ts` - プレビューAPI
- `/sql/html-editor/create_html_templates_table.sql` - テーブル作成SQL
- `/sql/html-editor/migrate_to_multilang.sql` - 多言語対応マイグレーションSQL
