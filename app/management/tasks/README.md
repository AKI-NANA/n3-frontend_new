# MultiChannelManager V4 - タスク管理機能の高度化

## 概要

MultiChannelManager V4は、既存のタスク管理機能を大幅に拡張し、以下の機能を追加しました:

- 📅 締切日管理
- 🔗 関連URL登録（複数対応）
- 🖼️ 画像添付（モック）
- 💻 コードスニペット保存
- ✅ サブToDoリスト
- 📆 Googleカレンダー同期（モック）

## 機能詳細

### 1. 締切日管理 (dueDate)

タスクに締切日を設定できます。締切日が設定されたタスクは、Googleカレンダー同期モックが自動的に呼び出されます。

```typescript
dueDate: string; // YYYY-MM-DD形式
```

### 2. 関連URL登録

タスクに関連するURLを複数登録できます。カンマまたは改行区切りで入力すると、保存時に自動的にパースされます。

```typescript
urls: string[];
```

**入力例:**
```
https://github.com/example/repo
https://docs.example.com/api
```

### 3. 画像添付（モック）

画像添付機能のUIとデータ構造を提供します。実際のファイルアップロードは行わず、モックデータとして保存されます。

```typescript
interface ImageMock {
  id: string;
  name: string;
  url: string; // モックURL
}

images: ImageMock[];
```

**理由:** Canvas環境では外部ストレージへの接続が複雑なため、機能の動作イメージのみを構築しています。

### 4. コードスニペット保存

タスクに関連するコードスニペットを複数保存できます。言語を選択し、コードを入力できます。

```typescript
interface CodeSnippet {
  language: string; // JavaScript, Python, SQL, Markdown, TypeScript, Other
  code: string;
}

codeSnippets: CodeSnippet[];
```

### 5. サブToDoリスト

タスク内にサブToDoリストを作成できます。各項目にチェックボックスが付いており、完了状態を管理できます。

```typescript
interface TodoItem {
  text: string;
  completed: boolean;
}

todos: TodoItem[];
```

### 6. Googleカレンダー同期（モック）

締切日が設定されたタスクを保存すると、Googleカレンダー同期モックが呼び出されます。

```typescript
const mockGoogleCalendarSync = (taskTitle: string, dueDate: string) => {
  console.log(`[Google Calendar Mock] Task "${taskTitle}" scheduled for ${dueDate}.`);
  alert(`カレンダー同期モック: ${taskTitle} を ${dueDate} にスケジューリングしました。`);
};
```

**将来の拡張:** ここに実際のGoogle Calendar APIやローカル通知システムを統合できます。

## データベーススキーマ

Supabaseの`tasks`テーブルは以下の構造を持ちます:

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),

  -- 基本フィールド
  title TEXT NOT NULL,
  description TEXT,
  rate NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',

  -- 拡張フィールド
  due_date DATE,
  urls TEXT[],
  images JSONB,
  code_snippets JSONB,
  todos JSONB,

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## セットアップ手順

### 1. データベースマイグレーションの実行

**重要:** 以下のいずれかの方法でデータベースセットアップを実行してください：

#### オプションA: Supabaseダッシュボードを使用（推奨）

1. Supabaseプロジェクトのダッシュボードにログイン
2. 左メニューから「SQL Editor」を選択
3. `app/management/tasks/setup.sql` の内容をコピー&ペースト
4. 「Run」ボタンをクリックして実行

#### オプションB: Supabase CLIを使用

```bash
# プロジェクトルートで実行
supabase migration up
# または
supabase db push
```

**注意:** setup.sqlファイルは `app/management/tasks/setup.sql` に配置されています。

### 2. 環境変数の設定

`.env.local`ファイルに以下を設定してください:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. アプリケーションの起動

```bash
npm run dev
```

### 4. アクセス

ブラウザで以下のURLにアクセスします:

```
http://localhost:3000/management/tasks
```

## 使用方法

### タスクの作成

1. 「+ 新規タスク作成」ボタンをクリック
2. タスク情報を入力:
   - タスクタイトル（必須）
   - 単価
   - 締切日
   - 詳細説明
   - 関連URL（カンマまたは改行区切り）
3. リッチコンテンツを追加:
   - 画像添付（モック）
   - コードスニペット
   - サブToDoリスト
4. 「保存して閉じる」をクリック

### タスクの編集

1. タスクカードの「編集」ボタンをクリック
2. 必要な情報を変更
3. 「保存して閉じる」をクリック

### タスクの削除

1. タスクカードの「削除」ボタンをクリック
2. 確認ダイアログで「OK」をクリック

## ファイル構成

```
app/management/tasks/
├── page.tsx                      # タスク管理ページ
├── MultiChannelManager_v4.tsx    # メインコンポーネント
├── setup.sql                     # データベースセットアップSQL
└── README.md                     # このファイル

supabase/migrations/
└── 20250101000000_create_tasks_table.sql  # データベースマイグレーション（.gitignore対象）
```

## 技術スタック

- **フレームワーク:** Next.js 13+ (App Router)
- **言語:** TypeScript
- **データベース:** Supabase (PostgreSQL)
- **スタイリング:** Tailwind CSS
- **状態管理:** React Hooks (useState, useEffect, useCallback)

## セキュリティ

- Row Level Security (RLS) が有効化されています
- ユーザーは自分のタスクのみアクセス可能
- 認証はSupabase Authを使用

## 今後の拡張案

1. **実際の画像アップロード:**
   - Supabase Storageとの統合
   - 画像プレビュー機能

2. **Googleカレンダー実装:**
   - Google Calendar API統合
   - OAuth認証
   - 双方向同期

3. **通知システム:**
   - 締切日リマインダー
   - ブラウザ通知
   - メール通知

4. **タスクフィルタリング:**
   - ステータスでフィルタ
   - 締切日でソート
   - 検索機能

5. **タスク共有:**
   - チームメンバーとの共有
   - コメント機能
   - アクティビティログ

6. **エクスポート機能:**
   - CSV/JSON エクスポート
   - PDF レポート生成

## トラブルシューティング

### タスクが表示されない

1. データベースマイグレーションが正しく実行されているか確認
2. 環境変数が正しく設定されているか確認
3. ユーザーが認証されているか確認

### 保存エラー

1. ブラウザのコンソールでエラーメッセージを確認
2. Supabaseダッシュボードでテーブルとポリシーを確認
3. ネットワーク接続を確認

## ライセンス

このプロジェクトは社内利用のために開発されました。

## サポート

問題が発生した場合は、開発チームにお問い合わせください。
