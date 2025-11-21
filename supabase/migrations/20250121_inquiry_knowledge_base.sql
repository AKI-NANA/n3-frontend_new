-- AI対応最適化ハブ：ナレッジベース構築SQLマイグレーション

-- 1. 問い合わせナレッジベーステーブル
CREATE TABLE IF NOT EXISTS public.inquiry_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id TEXT NOT NULL,
  ai_category TEXT NOT NULL,
  customer_message_raw TEXT NOT NULL,
  final_response_text TEXT NOT NULL,
  response_template_used TEXT,
  response_score INTEGER DEFAULT 0,
  order_id TEXT,
  response_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_knowledge_ai_category ON public.inquiry_knowledge_base(ai_category);
CREATE INDEX IF NOT EXISTS idx_knowledge_response_score ON public.inquiry_knowledge_base(response_score DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_order_id ON public.inquiry_knowledge_base(order_id);

-- 2. 問い合わせ管理テーブル（リアルタイム対応用）
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id TEXT UNIQUE NOT NULL,
  order_id TEXT,
  customer_name TEXT,
  customer_message_raw TEXT NOT NULL,
  level0_choice TEXT,
  ai_category TEXT,
  ai_draft_text TEXT,
  final_response_text TEXT,
  status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW', 'LEVEL0_PENDING', 'DRAFT_PENDING', 'DRAFT_GENERATED', 'APPROVED', 'SENT', 'COMPLETED')),
  tracking_number TEXT,
  shipping_status TEXT,
  response_score INTEGER DEFAULT 0,
  response_date TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_ai_category ON public.inquiries(ai_category);
CREATE INDEX IF NOT EXISTS idx_inquiries_order_id ON public.inquiries(order_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_received_at ON public.inquiries(received_at DESC);

-- 3. 回答テンプレートテーブル
CREATE TABLE IF NOT EXISTS public.inquiry_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT UNIQUE NOT NULL,
  ai_category TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  average_score NUMERIC(5,2) DEFAULT 0.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_templates_ai_category ON public.inquiry_templates(ai_category);
CREATE INDEX IF NOT EXISTS idx_templates_active ON public.inquiry_templates(is_active) WHERE is_active = true;

-- 4. KPI追跡テーブル
CREATE TABLE IF NOT EXISTS public.inquiry_kpi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id TEXT,
  inquiry_id TEXT REFERENCES public.inquiries(inquiry_id),
  response_time_seconds INTEGER,
  ai_draft_used BOOLEAN DEFAULT false,
  manual_edit_count INTEGER DEFAULT 0,
  customer_satisfaction_score INTEGER,
  resolved_on_first_contact BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_kpi_staff_id ON public.inquiry_kpi(staff_id);
CREATE INDEX IF NOT EXISTS idx_kpi_inquiry_id ON public.inquiry_kpi(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_kpi_created_at ON public.inquiry_kpi(created_at DESC);

-- 5. フィルターボットログテーブル
CREATE TABLE IF NOT EXISTS public.inquiry_filter_bot_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id TEXT NOT NULL,
  customer_message TEXT NOT NULL,
  bot_question_sent TEXT NOT NULL,
  customer_choice TEXT,
  choice_timestamp TIMESTAMP WITH TIME ZONE,
  next_action TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_filter_log_inquiry_id ON public.inquiry_filter_bot_log(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_filter_log_created_at ON public.inquiry_filter_bot_log(created_at DESC);

-- 更新日時の自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー設定
DROP TRIGGER IF EXISTS update_inquiry_knowledge_base_updated_at ON public.inquiry_knowledge_base;
CREATE TRIGGER update_inquiry_knowledge_base_updated_at
  BEFORE UPDATE ON public.inquiry_knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inquiries_updated_at ON public.inquiries;
CREATE TRIGGER update_inquiries_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inquiry_templates_updated_at ON public.inquiry_templates;
CREATE TRIGGER update_inquiry_templates_updated_at
  BEFORE UPDATE ON public.inquiry_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 初期テンプレートデータ挿入
INSERT INTO public.inquiry_templates (template_id, ai_category, template_name, template_content, variables) VALUES
  ('TPL-SHIPPING-001', 'Shipping_Delay', '配送遅延：追跡番号提示',
   'お世話になっております。ご注文いただきました商品の配送についてお知らせいたします。現在、[追跡番号]にて発送を完了しております。配送状況は以下のURLよりご確認いただけます。[追跡URL]',
   '["追跡番号", "追跡URL", "配送予定日"]'::jsonb),

  ('TPL-DEFECT-001', 'Product_Defect', '商品不具合：交換対応',
   'この度は商品に不備があり、大変申し訳ございません。直ちに交換手続きを進めさせていただきます。お手数ですが、以下の対応をお願いいたします。\n1. 不具合箇所の写真撮影\n2. 返送用ラベルの印刷（添付ファイル参照）\n3. 商品の梱包と発送\n\n交換品は確認後、3営業日以内に発送いたします。',
   '["商品名", "受注ID"]'::jsonb),

  ('TPL-PRODUCT-001', 'Product_Question', '商品仕様：FAQ回答',
   'お問い合わせいただきありがとうございます。[商品名]の仕様につきまして、以下の通りご案内いたします。\n[仕様詳細]\n\nその他ご不明な点がございましたら、お気軽にお問い合わせください。',
   '["商品名", "仕様詳細"]'::jsonb),

  ('TPL-OTHER-001', 'Other', 'その他：担当者対応',
   'お問い合わせいただきありがとうございます。担当者が詳細を確認し、改めてご連絡させていただきます。今しばらくお待ちくださいませ。',
   '[]'::jsonb)
ON CONFLICT (template_id) DO NOTHING;

-- 初期サンプルデータ挿入（テスト用）
INSERT INTO public.inquiries (inquiry_id, order_id, customer_name, customer_message_raw, status, tracking_number, shipping_status) VALUES
  ('IQ-001', 'ORD-1001', '佐藤太郎', '注文した商品がまだ届きません。追跡番号を教えてください。', 'NEW', 'TRK-123456', '未出荷'),
  ('IQ-002', 'ORD-1002', '田中花子', '届いた商品の箱が潰れていました。交換できますか？', 'NEW', 'TRK-123457', '出荷済み'),
  ('IQ-003', 'ORD-1003', '山田次郎', 'この商品の保証期間は何年ですか？', 'NEW', 'TRK-123458', '出荷済み')
ON CONFLICT (inquiry_id) DO NOTHING;

-- コメント追加
COMMENT ON TABLE public.inquiry_knowledge_base IS 'AI対応最適化のためのナレッジベース（過去の問い合わせと最適回答を蓄積）';
COMMENT ON TABLE public.inquiries IS 'リアルタイム問い合わせ管理テーブル';
COMMENT ON TABLE public.inquiry_templates IS 'AIが使用する回答テンプレート';
COMMENT ON TABLE public.inquiry_kpi IS 'スタッフの対応KPIを追跡';
COMMENT ON TABLE public.inquiry_filter_bot_log IS 'Level 0 フィルターボットの動作ログ';
