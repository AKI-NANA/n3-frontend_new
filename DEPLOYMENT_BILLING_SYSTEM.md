# 出荷請求グループシステム デプロイメント指示書

作成日: 2025-11-22
対象: 税務調査対応のための請求書グループ管理システム

---

## 📋 概要

このシステムは、出荷済み受注と送料証明書の間に中間層を設け、**1対多（1つの証明書ファイルが複数の受注をカバー）**の紐付けを可能にします。

### 主要機能
1. **個別請求対応**: 日本郵便などの個別請求証明書を出荷完了時にアップロード
2. **まとめ請求対応**: FedEx C-PASSなどのまとめ請求PDFを複数受注に一括紐付け
3. **税務コンプライアンスアラート**: 経費証明不一致を自動検出し、ダッシュボードに表示

---

## 🗄️ データベースマイグレーション

### 1. Supabaseダッシュボードでのマイグレーション実行

**手順:**

1. Supabaseプロジェクトダッシュボードにログイン
2. 左サイドバーから **SQL Editor** を選択
3. `supabase/migrations/20251122000001_create_shipping_invoice_group.sql` の内容をコピー
4. SQL Editorに貼り付け
5. **Run** ボタンをクリックして実行

**確認方法:**
```sql
-- テーブルが作成されたか確認
SELECT * FROM information_schema.tables
WHERE table_name = 'Shipping_Invoice_Group';

-- Sales_Ordersに新しいカラムが追加されたか確認
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Sales_Orders'
AND column_name IN ('Invoice_Group_ID', 'Actual_Shipping_Cost_JPY');
```

### 2. Supabase CLIを使用する場合（オプション）

```bash
# Supabase CLIをインストール（未インストールの場合）
npm install -g supabase

# プロジェクトにログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref YOUR_PROJECT_REF

# マイグレーション実行
supabase db push
```

---

## 📁 作成されたファイル一覧

### データベース
- `supabase/migrations/20251122000001_create_shipping_invoice_group.sql`

### TypeScript型定義
- `types/billing.ts`

### サービス層
- `services/ComplianceMonitor.ts`

### API
- `app/api/shipping/upload-invoice/route.ts` (個別請求証明書アップロード)
- `app/api/accounting/link-invoices/route.ts` (まとめ請求の一括紐付け)
- `app/api/compliance/alerts/route.ts` (コンプライアンスアラート取得)

### UI
- `app/accounting/invoice-management/page.tsx` (会計管理ツール)
- `app/shipping-management/page.tsx` (更新済み: 個別請求アップロード機能追加)
- `app/dashboard/page.tsx` (更新済み: ComplianceMonitorとの連携)

---

## 🔄 ワークフロー

### A. 個別請求（日本郵便など）

1. **出荷管理ツール** (`/shipping-management`)
   - 外注さんが受注をスキャン
   - 送料証明書PDF/画像をアップロード
   - システムが自動で`Shipping_Invoice_Group`を作成し、受注に紐付け

2. **ダッシュボード** (`/dashboard`)
   - アラート件数が0になることを確認

### B. まとめ請求（FedEx C-PASSなど）

1. **出荷管理ツール** (`/shipping-management`)
   - 外注さんが受注を出荷完了（`Invoice_Group_ID`はNULL）

2. **会計管理ツール** (`/accounting/invoice-management`)
   - 経理/管理者が後日届くまとめ請求PDFをアップロード
   - 未証明の出荷済み受注リストから該当受注を選択
   - 「一括紐付け」ボタンで複数受注に一括紐付け

3. **ダッシュボード** (`/dashboard`)
   - アラート件数が減少することを確認

---

## 🚨 税務コンプライアンスアラート

### アラート条件
```
受注ステータスが「出荷済み」(COMPLETED)
かつ
Invoice_Group_ID が NULL
```

### アラート表示場所
- ダッシュボードの「最重要アラートハブ」（赤色ボックス）
- 出荷管理ツールの下部（税務アラートセクション）

### アラートの解消方法
1. 個別請求: 出荷管理ツールで証明書をアップロード
2. まとめ請求: 会計管理ツールで一括紐付け

---

## 🧪 テスト手順

### 1. データベースマイグレーションのテスト

```sql
-- Shipping_Invoice_Groupテーブルへのサンプルデータ挿入
INSERT INTO Shipping_Invoice_Group (Group_ID, Group_Type, Invoice_File_Path, Invoice_Total_Cost_JPY, Uploaded_By)
VALUES ('TEST-INV-001', 'JAPAN_POST_INDIVIDUAL', '/test/invoice.pdf', 1500.00, 'test@example.com');

-- Sales_OrdersテーブルでInvoice_Group_IDが更新できるかテスト
UPDATE Sales_Orders
SET Invoice_Group_ID = 'TEST-INV-001', Actual_Shipping_Cost_JPY = 1500.00
WHERE id = 'ORD-1001';

-- 結合クエリのテスト
SELECT so.id, so.itemName, sig.Group_ID, sig.Invoice_Total_Cost_JPY
FROM Sales_Orders so
LEFT JOIN Shipping_Invoice_Group sig ON so.Invoice_Group_ID = sig.Group_ID
WHERE so.shippingStatus = 'COMPLETED';
```

### 2. APIのテスト

```bash
# コンプライアンスアラートAPIのテスト
curl http://localhost:3000/api/compliance/alerts

# 未紐付け受注リストの取得
curl http://localhost:3000/api/accounting/link-invoices
```

### 3. UIのテスト

1. **ダッシュボード** (`http://localhost:3000/dashboard`)
   - 経費証明不一致アラートが表示されるか確認
   - 「請求書登録へ」ボタンが機能するか確認

2. **出荷管理ツール** (`http://localhost:3000/shipping-management`)
   - 受注スキャンが機能するか確認
   - 証明書アップロードフィールドが表示されるか確認

3. **会計管理ツール** (`http://localhost:3000/accounting/invoice-management`)
   - 請求書グループ作成が機能するか確認
   - 未紐付け受注リストが表示されるか確認
   - 一括紐付けが機能するか確認

---

## 📊 データモデル

### Shipping_Invoice_Group（請求書グループ）

| フィールド名 | データ型 | 説明 |
|------------|---------|------|
| Group_ID | VARCHAR(255) PK | 請求書グループID |
| Group_Type | ENUM | C_PASS_FEDEX, JAPAN_POST_INDIVIDUAL, OTHER_BULK |
| Invoice_File_Path | TEXT | 請求書ファイルのパス |
| Invoice_Total_Cost_JPY | NUMERIC(10,2) | 請求書総額 |
| Uploaded_By | VARCHAR(255) | アップロード担当者 |
| Uploaded_Date | TIMESTAMP | アップロード日時 |

### Sales_Orders（受注）- 追加フィールド

| フィールド名 | データ型 | 説明 |
|------------|---------|------|
| Invoice_Group_ID | VARCHAR(255) FK | 請求書グループID（NULL可） |
| Actual_Shipping_Cost_JPY | NUMERIC(10,2) | 確定送料（按分計算または個別金額） |

---

## ⚠️ 注意事項

1. **ファイルストレージ**
   - 現在、ファイルアップロードはモック実装です
   - 本番環境では Supabase Storage または AWS S3 を使用してください
   - `uploadInvoiceFile()` 関数を実装する必要があります

2. **Sales_Ordersテーブルの存在確認**
   - マイグレーションスクリプトは既存の`Sales_Orders`テーブルを前提としています
   - テーブルが存在しない場合は、先に作成してください

3. **認証・認可**
   - 会計管理ツールは管理者のみアクセス可能にすることを推奨
   - Supabase RLS (Row Level Security) ポリシーを設定してください

4. **パフォーマンス**
   - 受注データが大量になる場合は、インデックスの追加を検討してください
   - ComplianceMonitorの定期実行頻度を調整してください

---

## 🔗 関連URL

- ダッシュボード: `/dashboard`
- 出荷管理ツール: `/shipping-management`
- 会計管理ツール: `/accounting/invoice-management`

---

## 📞 サポート

システムに関する質問や問題がある場合は、開発チームに連絡してください。
