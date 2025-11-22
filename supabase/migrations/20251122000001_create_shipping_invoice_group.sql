-- ========================================
-- 出荷請求グループシステム - データベースマイグレーション
-- 作成日: 2025-11-22
-- 目的: 税務調査対応のための請求書グループ管理システム
-- ========================================

-- ----------------------------------------
-- 1. Shipping_Invoice_Group テーブルの作成
-- ----------------------------------------
-- 請求書ファイルごとに1レコード作成され、複数の受注と紐付けられる
CREATE TABLE IF NOT EXISTS Shipping_Invoice_Group (
  Group_ID VARCHAR(255) PRIMARY KEY,
  Group_Type VARCHAR(50) NOT NULL CHECK (Group_Type IN ('C_PASS_FEDEX', 'JAPAN_POST_INDIVIDUAL', 'OTHER_BULK')),
  Invoice_File_Path TEXT,
  Invoice_Total_Cost_JPY NUMERIC(10, 2) NOT NULL,
  Uploaded_By VARCHAR(255),
  Uploaded_Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_invoice_group_type ON Shipping_Invoice_Group(Group_Type);
CREATE INDEX IF NOT EXISTS idx_invoice_uploaded_date ON Shipping_Invoice_Group(Uploaded_Date);

-- ----------------------------------------
-- 2. Sales_Orders テーブルへのカラム追加
-- ----------------------------------------
-- 既存のSales_Ordersテーブルに請求グループIDと確定送料を追加
-- 注: Sales_Ordersテーブルが存在しない場合は、まず作成する必要があります

-- まず、テーブルが存在するか確認してから実行
DO $$
BEGIN
  -- Invoice_Group_ID カラムの追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Sales_Orders'
    AND column_name = 'Invoice_Group_ID'
  ) THEN
    ALTER TABLE Sales_Orders
    ADD COLUMN Invoice_Group_ID VARCHAR(255) REFERENCES Shipping_Invoice_Group(Group_ID) ON DELETE SET NULL;
  END IF;

  -- Actual_Shipping_Cost_JPY カラムの追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Sales_Orders'
    AND column_name = 'Actual_Shipping_Cost_JPY'
  ) THEN
    ALTER TABLE Sales_Orders
    ADD COLUMN Actual_Shipping_Cost_JPY NUMERIC(10, 2);
  END IF;
END $$;

-- インデックス作成（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_sales_orders_invoice_group ON Sales_Orders(Invoice_Group_ID);

-- ----------------------------------------
-- 3. トリガー関数：Updated_At自動更新
-- ----------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.Updated_At = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS update_shipping_invoice_group_updated_at ON Shipping_Invoice_Group;
CREATE TRIGGER update_shipping_invoice_group_updated_at
BEFORE UPDATE ON Shipping_Invoice_Group
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------
-- 4. テーブル説明の追加（ドキュメント用）
-- ----------------------------------------
COMMENT ON TABLE Shipping_Invoice_Group IS '出荷請求書グループテーブル：1つの請求書PDFに対して複数の受注を紐付けるための中間テーブル';
COMMENT ON COLUMN Shipping_Invoice_Group.Group_ID IS '請求書グループID（一意識別子）';
COMMENT ON COLUMN Shipping_Invoice_Group.Group_Type IS '請求タイプ（C_PASS_FEDEX: FedExまとめ請求、JAPAN_POST_INDIVIDUAL: 日本郵便個別請求、OTHER_BULK: その他まとめ請求）';
COMMENT ON COLUMN Shipping_Invoice_Group.Invoice_File_Path IS '請求書PDFまたは画像の保存先パス（S3/Google Driveなど）';
COMMENT ON COLUMN Shipping_Invoice_Group.Invoice_Total_Cost_JPY IS '請求書に記載された総送料（経費）';
COMMENT ON COLUMN Shipping_Invoice_Group.Uploaded_By IS 'ファイルをアップロードした担当者';
COMMENT ON COLUMN Shipping_Invoice_Group.Uploaded_Date IS 'ファイルのアップロード日時';

-- ----------------------------------------
-- 5. サンプルデータの挿入（開発・テスト用）
-- ----------------------------------------
-- 本番環境では実行しないこと
-- INSERT INTO Shipping_Invoice_Group (Group_ID, Group_Type, Invoice_File_Path, Invoice_Total_Cost_JPY, Uploaded_By)
-- VALUES
--   ('INV-202511-001', 'C_PASS_FEDEX', '/invoices/2025/11/fedex_cpass_nov.pdf', 125000.00, 'admin@example.com'),
--   ('INV-202511-002', 'JAPAN_POST_INDIVIDUAL', '/invoices/2025/11/jp_post_001.pdf', 1500.00, 'staff@example.com');

-- ----------------------------------------
-- 6. Row Level Security (RLS) の設定（オプション）
-- ----------------------------------------
-- Supabaseを使用している場合、必要に応じてRLSポリシーを設定
-- ALTER TABLE Shipping_Invoice_Group ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可能なポリシーの例
-- CREATE POLICY "管理者のみアクセス可能" ON Shipping_Invoice_Group
--   FOR ALL
--   USING (auth.jwt() ->> 'role' = 'admin');
