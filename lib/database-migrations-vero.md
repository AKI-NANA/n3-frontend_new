# VERO ブランド管理データベース設計

## 概要
eBay VeRO (Verified Rights Owner) プログラムに登録されているブランドを管理し、
出品前にリスク警告を表示するためのテーブル。

## 1. vero_brandsテーブルの作成

```sql
-- VERO登録ブランドマスターテーブル
CREATE TABLE IF NOT EXISTS vero_brands (
  brand_id SERIAL PRIMARY KEY,
  brand_name TEXT NOT NULL UNIQUE,
  is_vero BOOLEAN NOT NULL DEFAULT true,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('high', 'medium', 'low', 'safe')),
  warning_message TEXT,
  recommended_action TEXT,
  vero_program_url TEXT,
  platform TEXT DEFAULT 'ebay' CHECK (platform IN ('ebay', 'amazon', 'all')),
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_vero_brands_name ON vero_brands(brand_name);
CREATE INDEX IF NOT EXISTS idx_vero_brands_risk ON vero_brands(risk_level);
CREATE INDEX IF NOT EXISTS idx_vero_brands_platform ON vero_brands(platform);

-- コメント
COMMENT ON TABLE vero_brands IS 'eBay VeROプログラム登録ブランドのマスターテーブル';
COMMENT ON COLUMN vero_brands.brand_name IS 'ブランド名（一意）';
COMMENT ON COLUMN vero_brands.is_vero IS 'VeRO登録有無';
COMMENT ON COLUMN vero_brands.risk_level IS 'リスクレベル: high(高), medium(中), low(低), safe(安全)';
COMMENT ON COLUMN vero_brands.warning_message IS 'ユーザーに表示する警告メッセージ';
COMMENT ON COLUMN vero_brands.recommended_action IS '推奨アクション';
COMMENT ON COLUMN vero_brands.vero_program_url IS 'VeROプログラムの公式URL';
COMMENT ON COLUMN vero_brands.platform IS '対象プラットフォーム';
COMMENT ON COLUMN vero_brands.category IS 'ブランドカテゴリ（アパレル、電化製品など）';
```

## 2. 初期データの投入

```sql
-- 高リスクブランド
INSERT INTO vero_brands (brand_name, risk_level, warning_message, recommended_action, category) VALUES
('Nike', 'high', '⚠️ NikeはeBay VeROプログラムに登録されています。無許可の出品は削除される可能性が高いです。', '正規の仕入れルートからの購入証明書を用意するか、出品を避けてください。', 'スポーツ・アパレル'),
('Adidas', 'high', '⚠️ AdidasはeBay VeROプログラムに登録されています。無許可の出品は削除される可能性が高いです。', '正規の仕入れルートからの購入証明書を用意するか、出品を避けてください。', 'スポーツ・アパレル'),
('Apple', 'high', '⚠️ AppleはeBay VeROプログラムに登録されています。無許可の出品は削除される可能性が高いです。', 'Apple認定リセラーからの仕入れを推奨します。', 'エレクトロニクス'),
('Louis Vuitton', 'high', '⚠️ Louis VuittonはeBay VeROプログラムに登録されています。出品は極めて困難です。', 'ハイブランド品の出品は避けることを強く推奨します。', 'ラグジュアリー'),
('Gucci', 'high', '⚠️ GucciはeBay VeROプログラムに登録されています。出品は極めて困難です。', 'ハイブランド品の出品は避けることを強く推奨します。', 'ラグジュアリー'),
('Chanel', 'high', '⚠️ ChanelはeBay VeROプログラムに登録されています。出品は極めて困難です。', 'ハイブランド品の出品は避けることを強く推奨します。', 'ラグジュアリー'),
('Rolex', 'high', '⚠️ RolexはeBay VeROプログラムに登録されています。出品は極めて困難です。', '時計専門の認証サービス利用を推奨します。', '時計'),
('Disney', 'high', '⚠️ DisneyはeBay VeROプログラムに登録されています。無許可キャラクター商品の出品は削除されます。', 'Disney公式ライセンス商品のみ出品してください。', 'エンターテインメント'),
('LEGO', 'high', '⚠️ LEGOはeBay VeROプログラムに登録されています。模倣品は即削除されます。', '正規品のみ出品し、箱・説明書を保持してください。', 'おもちゃ'),
('Supreme', 'high', '⚠️ SupremeはeBay VeROプログラムに登録されています。偽物判定が厳格です。', '購入証明書とタグの保存を推奨します。', 'ストリート・アパレル'),
('The North Face', 'high', '⚠️ The North FaceはeBay VeROプログラムに登録されています。偽物判定が厳格です。', '正規店舗からの購入を推奨します。', 'アウトドア・アパレル'),
('Coach', 'high', '⚠️ CoachはeBay VeROプログラムに登録されています。無許可の出品は削除される可能性が高いです。', 'シリアルナンバー確認と購入証明を保持してください。', 'ラグジュアリー'),
('Michael Kors', 'high', '⚠️ Michael KorsはeBay VeROプログラムに登録されています。', 'シリアルナンバー確認と購入証明を保持してください。', 'ファッション'),
('Ray-Ban', 'high', '⚠️ Ray-BanはeBay VeROプログラムに登録されています。偽物判定が厳格です。', '正規代理店からの購入証明を保持してください。', 'サングラス'),
('Oakley', 'high', '⚠️ OakleyはeBay VeROプログラムに登録されています。偽物判定が厳格です。', '正規代理店からの購入証明を保持してください。', 'サングラス'),
('UGG', 'high', '⚠️ UGGはeBay VeROプログラムに登録されています。偽物判定が厳格です。', '正規店舗からの購入を推奨します。', 'シューズ'),
('Beats by Dre', 'high', '⚠️ Beats by DreはeBay VeROプログラムに登録されています。', '正規代理店からの購入証明を保持してください。', 'エレクトロニクス'),
('Tiffany & Co.', 'high', '⚠️ Tiffany & Co.はeBay VeROプログラムに登録されています。出品は極めて困難です。', 'ジュエリー専門の認証サービス利用を推奨します。', 'ジュエリー'),
('Christian Dior', 'high', '⚠️ Christian DiorはeBay VeROプログラムに登録されています。出品は極めて困難です。', 'ハイブランド品の出品は避けることを強く推奨します。', 'ラグジュアリー'),
('Prada', 'high', '⚠️ PradaはeBay VeROプログラムに登録されています。出品は極めて困難です。', 'ハイブランド品の出品は避けることを強く推奨します。', 'ラグジュアリー');

-- 中リスクブランド
INSERT INTO vero_brands (brand_name, risk_level, warning_message, recommended_action, category) VALUES
('Sony', 'medium', '⚠️ SonyはVeRO監視対象ブランドです。正規品の証明が求められる場合があります。', '正規仕入れルートからの購入を推奨します。', 'エレクトロニクス'),
('Samsung', 'medium', '⚠️ SamsungはVeRO監視対象ブランドです。正規品の証明が求められる場合があります。', '正規仕入れルートからの購入を推奨します。', 'エレクトロニクス'),
('Canon', 'medium', '⚠️ CanonはVeRO監視対象ブランドです。正規品の証明が求められる場合があります。', '正規代理店からの購入を推奨します。', 'カメラ'),
('Nikon', 'medium', '⚠️ NikonはVeRO監視対象ブランドです。正規品の証明が求められる場合があります。', '正規代理店からの購入を推奨します。', 'カメラ'),
('Bose', 'medium', '⚠️ BoseはVeRO監視対象ブランドです。正規品の証明が求められる場合があります。', '正規代理店からの購入を推奨します。', 'オーディオ'),
('JBL', 'medium', '⚠️ JBLはVeRO監視対象ブランドです。正規品の証明が求められる場合があります。', '正規代理店からの購入を推奨します。', 'オーディオ'),
('Under Armour', 'medium', '⚠️ Under ArmourはVeRO監視対象ブランドです。', '正規店舗からの購入を推奨します。', 'スポーツ・アパレル'),
('Puma', 'medium', '⚠️ PumaはVeRO監視対象ブランドです。', '正規店舗からの購入を推奨します。', 'スポーツ・アパレル'),
('Reebok', 'medium', '⚠️ ReebokはVeRO監視対象ブランドです。', '正規店舗からの購入を推奨します。', 'スポーツ・アパレル'),
('New Balance', 'medium', '⚠️ New BalanceはVeRO監視対象ブランドです。', '正規店舗からの購入を推奨します。', 'シューズ'),
('Vans', 'medium', '⚠️ VansはVeRO監視対象ブランドです。', '正規店舗からの購入を推奨します。', 'シューズ'),
('Converse', 'medium', '⚠️ ConverseはVeRO監視対象ブランドです。', '正規店舗からの購入を推奨します。', 'シューズ'),
('Timberland', 'medium', '⚠️ TimberlandはVeRO監視対象ブランドです。', '正規店舗からの購入を推奨します。', 'シューズ'),
('Columbia', 'medium', '⚠️ ColumbiaはVeRO監視対象ブランドです。', '正規店舗からの購入を推奨します。', 'アウトドア・アパレル'),
('Patagonia', 'medium', '⚠️ PatagoniaはVeRO監視対象ブランドです。', '正規店舗からの購入を推奨します。', 'アウトドア・アパレル');
```

## 3. 更新日時の自動更新トリガー

```sql
-- updated_at自動更新関数
CREATE OR REPLACE FUNCTION update_vero_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
CREATE TRIGGER trigger_update_vero_brands_updated_at
BEFORE UPDATE ON vero_brands
FOR EACH ROW
EXECUTE FUNCTION update_vero_brands_updated_at();
```

## 4. VEROブランド検索クエリ

### 特定ブランドのリスク確認
```sql
SELECT * FROM vero_brands
WHERE brand_name ILIKE 'Nike';
```

### 高リスクブランド一覧
```sql
SELECT brand_name, warning_message, category
FROM vero_brands
WHERE risk_level = 'high'
ORDER BY brand_name;
```

### カテゴリ別VEROブランド
```sql
SELECT category, COUNT(*) as brand_count
FROM vero_brands
WHERE is_vero = true
GROUP BY category
ORDER BY brand_count DESC;
```

## 5. RLS (Row Level Security) ポリシー

```sql
-- RLSを有効化
ALTER TABLE vero_brands ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "Allow read access to all users"
ON vero_brands FOR SELECT
USING (true);

-- 管理者のみが更新可能（実装により調整）
CREATE POLICY "Allow admin to update"
ON vero_brands FOR UPDATE
USING (auth.role() = 'admin');

-- 管理者のみが挿入可能
CREATE POLICY "Allow admin to insert"
ON vero_brands FOR INSERT
WITH CHECK (auth.role() = 'admin');
```

## 実行手順

1. `vero_brands` テーブルを作成
2. インデックスを作成
3. 初期データ（高リスク・中リスクブランド）を投入
4. 更新日時トリガーを作成
5. RLSポリシーを設定

## 注意事項

- VEROブランドリストは定期的に更新が必要（eBay公式情報を参照）
- 高リスクブランドは出品を避けるか、正規品証明を必ず用意
- ブランド名の検索は大文字小文字を無視（ILIKE使用）
- プラットフォーム別の設定も可能（ebay, amazon, all）

## 参考リンク

- [eBay VeRO Program](https://pages.ebay.com/seller-center/listing-and-marketing/verified-rights-owner-program.html)
- [VeRO Participants List](https://pages.ebay.com/vero/participants.html)
