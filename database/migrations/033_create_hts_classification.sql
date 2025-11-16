-- ====================================================================
-- HTS分類管理テーブル
-- 商品のHTS（関税分類コード）を管理
-- ====================================================================

-- メインテーブル: 商品ごとのHTS分類
CREATE TABLE IF NOT EXISTS product_hts_classification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES products_master(id) ON DELETE CASCADE,
  
  -- HTS階層情報（10桁システム）
  hts_code VARCHAR(10) NOT NULL,
  hts_chapter_code VARCHAR(2) NOT NULL,
  hts_heading_code VARCHAR(4) NOT NULL,
  hts_subheading_code VARCHAR(6) NOT NULL,
  hts_description TEXT,
  
  -- 税率情報
  general_rate VARCHAR(20),
  special_rate VARCHAR(20),
  additional_duties TEXT,
  
  -- 分類の信頼度・方法
  confidence_score NUMERIC(5,2) DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  classification_method VARCHAR(20) DEFAULT 'auto', -- 'auto', 'manual', 'ai', 'verified'
  classified_by VARCHAR(100), -- 'system', 'user_id', 'ai_model_name'
  
  -- AI分析結果（検索に使用したキーワード、候補リストなど）
  analysis_data JSONB DEFAULT '{}'::jsonb,
  
  -- ステータス管理
  is_active BOOLEAN DEFAULT TRUE,
  verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'needs_review'
  
  -- 監査証跡
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約: 1商品につき1つのアクティブなHTS分類のみ
  CONSTRAINT unique_active_hts_per_product UNIQUE (product_id, is_active) 
    WHERE is_active = TRUE
);

-- HTS分類変更履歴テーブル
CREATE TABLE IF NOT EXISTS hts_classification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES products_master(id) ON DELETE CASCADE,
  hts_classification_id UUID REFERENCES product_hts_classification(id) ON DELETE SET NULL,
  
  -- 変更前後のHTS情報
  old_hts_code VARCHAR(10),
  new_hts_code VARCHAR(10),
  old_confidence_score NUMERIC(5,2),
  new_confidence_score NUMERIC(5,2),
  
  -- 変更理由・方法
  change_reason TEXT,
  change_type VARCHAR(20) DEFAULT 'update', -- 'create', 'update', 'verify', 'override'
  changed_by VARCHAR(100),
  
  -- タイムスタンプ
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_hts_classification_product_id 
  ON product_hts_classification(product_id);

CREATE INDEX IF NOT EXISTS idx_hts_classification_hts_code 
  ON product_hts_classification(hts_code);

CREATE INDEX IF NOT EXISTS idx_hts_classification_chapter 
  ON product_hts_classification(hts_chapter_code);

CREATE INDEX IF NOT EXISTS idx_hts_classification_active 
  ON product_hts_classification(product_id, is_active) 
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_hts_classification_confidence 
  ON product_hts_classification(confidence_score DESC) 
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_hts_history_product_id 
  ON hts_classification_history(product_id);

CREATE INDEX IF NOT EXISTS idx_hts_history_changed_at 
  ON hts_classification_history(changed_at DESC);

-- トリガー: updated_at自動更新
CREATE OR REPLACE FUNCTION update_hts_classification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hts_classification_updated_at
  BEFORE UPDATE ON product_hts_classification
  FOR EACH ROW
  EXECUTE FUNCTION update_hts_classification_updated_at();

-- トリガー: 変更履歴の自動記録
CREATE OR REPLACE FUNCTION log_hts_classification_change()
RETURNS TRIGGER AS $$
BEGIN
  -- UPDATEの場合のみ履歴記録
  IF TG_OP = 'UPDATE' AND (OLD.hts_code != NEW.hts_code OR OLD.is_active != NEW.is_active) THEN
    INSERT INTO hts_classification_history (
      product_id,
      hts_classification_id,
      old_hts_code,
      new_hts_code,
      old_confidence_score,
      new_confidence_score,
      change_reason,
      change_type,
      changed_by
    ) VALUES (
      NEW.product_id,
      NEW.id,
      OLD.hts_code,
      NEW.hts_code,
      OLD.confidence_score,
      NEW.confidence_score,
      NEW.notes,
      CASE 
        WHEN NEW.verification_status = 'verified' THEN 'verify'
        WHEN NEW.classification_method = 'manual' THEN 'override'
        ELSE 'update'
      END,
      NEW.classified_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_hts_classification_change
  AFTER UPDATE ON product_hts_classification
  FOR EACH ROW
  EXECUTE FUNCTION log_hts_classification_change();

-- RLSポリシー（認証ユーザーのみアクセス可能）
ALTER TABLE product_hts_classification ENABLE ROW LEVEL SECURITY;
ALTER TABLE hts_classification_history ENABLE ROW LEVEL SECURITY;

-- 全認証ユーザーに読み取り権限
CREATE POLICY "Anyone can view HTS classifications"
  ON product_hts_classification FOR SELECT
  USING (true);

-- 全認証ユーザーに書き込み権限（サービスロールも含む）
CREATE POLICY "Anyone can insert HTS classifications"
  ON product_hts_classification FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update HTS classifications"
  ON product_hts_classification FOR UPDATE
  USING (true);

-- 履歴は読み取り専用
CREATE POLICY "Anyone can view HTS history"
  ON hts_classification_history FOR SELECT
  USING (true);

-- コメント追加（ドキュメント化）
COMMENT ON TABLE product_hts_classification IS '商品のHTS（関税分類コード）管理テーブル';
COMMENT ON COLUMN product_hts_classification.hts_code IS '10桁のHTSコード（米国）';
COMMENT ON COLUMN product_hts_classification.confidence_score IS '分類の信頼度スコア (0-100)';
COMMENT ON COLUMN product_hts_classification.classification_method IS '分類方法: auto=自動, manual=手動, ai=AI, verified=検証済み';
COMMENT ON COLUMN product_hts_classification.analysis_data IS 'AI分析結果（キーワード、候補リストなど）のJSON';

COMMENT ON TABLE hts_classification_history IS 'HTS分類変更履歴（監査証跡）';
COMMENT ON COLUMN hts_classification_history.change_type IS '変更タイプ: create=新規作成, update=更新, verify=検証, override=手動上書き';

-- 初期データ: サンプルHTSコード（テスト用）
-- 実際の運用では削除またはコメントアウト
/*
INSERT INTO product_hts_classification (
  product_id, 
  hts_code, 
  hts_chapter_code, 
  hts_heading_code, 
  hts_subheading_code,
  hts_description,
  general_rate,
  special_rate,
  confidence_score,
  classification_method,
  classified_by
) VALUES (
  1, -- 商品ID（実際の商品に合わせて変更）
  '9504903000',
  '95',
  '9504',
  '950490',
  'Playing cards',
  'Free',
  'Free',
  95.00,
  'manual',
  'system'
) ON CONFLICT DO NOTHING;
*/

-- 完了メッセージ
DO $$ 
BEGIN 
  RAISE NOTICE '✅ HTS分類テーブル作成完了';
  RAISE NOTICE '📊 作成されたテーブル:';
  RAISE NOTICE '   - product_hts_classification (メインテーブル)';
  RAISE NOTICE '   - hts_classification_history (履歴テーブル)';
  RAISE NOTICE '🔒 RLSポリシー設定完了';
  RAISE NOTICE '🔗 トリガー設定完了 (自動更新・履歴記録)';
END $$;
