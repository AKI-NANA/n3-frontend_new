-- HTS分類管理テーブル作成（修正版）

-- メインテーブル
CREATE TABLE IF NOT EXISTS product_hts_classification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES products_master(id) ON DELETE CASCADE,
  
  hts_code VARCHAR(10) NOT NULL,
  hts_chapter_code VARCHAR(2) NOT NULL,
  hts_heading_code VARCHAR(4) NOT NULL,
  hts_subheading_code VARCHAR(6) NOT NULL,
  hts_description TEXT,
  
  general_rate VARCHAR(20),
  special_rate VARCHAR(20),
  additional_duties TEXT,
  
  confidence_score NUMERIC(5,2) DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  classification_method VARCHAR(20) DEFAULT 'auto',
  classified_by VARCHAR(100),
  
  analysis_data JSONB DEFAULT '{}'::jsonb,
  
  is_active BOOLEAN DEFAULT TRUE,
  verification_status VARCHAR(20) DEFAULT 'pending',
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 部分UNIQUE制約を別途作成
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_hts_per_product 
  ON product_hts_classification(product_id) 
  WHERE is_active = TRUE;

-- 履歴テーブル
CREATE TABLE IF NOT EXISTS hts_classification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES products_master(id) ON DELETE CASCADE,
  hts_classification_id UUID REFERENCES product_hts_classification(id) ON DELETE SET NULL,
  
  old_hts_code VARCHAR(10),
  new_hts_code VARCHAR(10),
  old_confidence_score NUMERIC(5,2),
  new_confidence_score NUMERIC(5,2),
  
  change_reason TEXT,
  change_type VARCHAR(20) DEFAULT 'update',
  changed_by VARCHAR(100),
  
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
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

-- トリガー関数: updated_at自動更新
CREATE OR REPLACE FUNCTION update_hts_classification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_update_hts_classification_updated_at ON product_hts_classification;
CREATE TRIGGER trigger_update_hts_classification_updated_at
  BEFORE UPDATE ON product_hts_classification
  FOR EACH ROW
  EXECUTE FUNCTION update_hts_classification_updated_at();

-- トリガー関数: 変更履歴の自動記録
CREATE OR REPLACE FUNCTION log_hts_classification_change()
RETURNS TRIGGER AS $$
BEGIN
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

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_log_hts_classification_change ON product_hts_classification;
CREATE TRIGGER trigger_log_hts_classification_change
  AFTER UPDATE ON product_hts_classification
  FOR EACH ROW
  EXECUTE FUNCTION log_hts_classification_change();

-- RLSポリシー
ALTER TABLE product_hts_classification ENABLE ROW LEVEL SECURITY;
ALTER TABLE hts_classification_history ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーを削除してから作成
DROP POLICY IF EXISTS "Anyone can view HTS classifications" ON product_hts_classification;
CREATE POLICY "Anyone can view HTS classifications" 
  ON product_hts_classification FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert HTS classifications" ON product_hts_classification;
CREATE POLICY "Anyone can insert HTS classifications" 
  ON product_hts_classification FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update HTS classifications" ON product_hts_classification;
CREATE POLICY "Anyone can update HTS classifications" 
  ON product_hts_classification FOR UPDATE 
  USING (true);

DROP POLICY IF EXISTS "Anyone can view HTS history" ON hts_classification_history;
CREATE POLICY "Anyone can view HTS history" 
  ON hts_classification_history FOR SELECT 
  USING (true);

-- 完了メッセージ
DO $$ 
BEGIN 
  RAISE NOTICE '✅ HTS分類テーブル作成完了';
  RAISE NOTICE '📊 テーブル: product_hts_classification, hts_classification_history';
  RAISE NOTICE '🔒 RLS有効化・ポリシー設定完了';
  RAISE NOTICE '🔗 トリガー設定完了';
END $$;
