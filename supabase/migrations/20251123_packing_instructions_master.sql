-- ================================================================
-- 📋 Packing Instructions Master Table Migration
-- ================================================================
-- 作成日: 2025-11-23
-- 目的: 商品ごとの梱包手順、資材、写真付き手順をマスターデータとして管理
-- 連携: products_master (FK), 出荷管理UI（梱包指示書パネル）
-- ================================================================

-- 1. テーブルの作成
CREATE TABLE IF NOT EXISTS packing_instructions_master (
    -- 主キー
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 商品識別情報
    item_id VARCHAR(255) NOT NULL,
    item_name VARCHAR(500),
    item_category VARCHAR(255),

    -- 梱包資材リスト (JSONB形式)
    packing_material_list JSONB DEFAULT '[]'::jsonb,
    -- 例: [
    --   {"material_name": "ダンボール", "size": "30x20x10cm", "quantity": 1},
    --   {"material_name": "エアキャップ", "size": "50cm幅", "quantity": "1m"},
    --   {"material_name": "OPPテープ", "size": "48mm", "quantity": 1}
    -- ]

    -- 梱包手順 (TEXT形式)
    step_by_step_instructions TEXT,
    -- 手順の例:
    -- 1. 商品本体をエアキャップで3重に包む
    -- 2. ダンボールの底面に緩衝材を敷く
    -- 3. 商品を中央に配置し、隙間を埋める
    -- 4. テープでしっかり封をする

    -- 写真・動画リンク (JSONB形式)
    media_links JSONB DEFAULT '[]'::jsonb,
    -- 例: [
    --   {"type": "image", "url": "https://storage.example.com/packing/watch-step1.jpg", "description": "エアキャップで包む様子"},
    --   {"type": "video", "url": "https://storage.example.com/packing/watch-full.mp4", "description": "全手順の動画"}
    -- ]

    -- 注意事項
    special_notes TEXT,
    -- 例: 「精密機器のため衝撃に注意」「液体商品のため密封確認必須」

    -- 推奨梱包サイズ（計算用）
    recommended_box_length_cm NUMERIC(8, 2),
    recommended_box_width_cm NUMERIC(8, 2),
    recommended_box_height_cm NUMERIC(8, 2),
    recommended_box_weight_g INTEGER,

    -- 検証ステータス
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(255),
    verified_at TIMESTAMPTZ,

    -- 使用実績
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- タイムスタンプ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 外部キー制約の追加
-- products_master への外部キー（item_id が存在する場合のみ）
-- 注意: products_master テーブルが存在し、適切なカラムがある場合のみ有効
-- ALTER TABLE packing_instructions_master
-- ADD CONSTRAINT fk_packing_instructions_item
-- FOREIGN KEY (item_id) REFERENCES products_master(item_id)
-- ON DELETE CASCADE;

-- 3. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_packing_instructions_item_id ON packing_instructions_master(item_id);
CREATE INDEX IF NOT EXISTS idx_packing_instructions_category ON packing_instructions_master(item_category);
CREATE INDEX IF NOT EXISTS idx_packing_instructions_verified ON packing_instructions_master(is_verified);
CREATE INDEX IF NOT EXISTS idx_packing_instructions_created_at ON packing_instructions_master(created_at);

-- 4. トリガー: updated_at の自動更新
CREATE OR REPLACE FUNCTION update_packing_instructions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_packing_instructions_updated_at
    BEFORE UPDATE ON packing_instructions_master
    FOR EACH ROW
    EXECUTE FUNCTION update_packing_instructions_updated_at();

-- 5. RLS (Row Level Security) の設定
ALTER TABLE packing_instructions_master ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーに全権限を付与（開発環境用）
CREATE POLICY "Enable all access for authenticated users" ON packing_instructions_master
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. コメントの追加
COMMENT ON TABLE packing_instructions_master IS '梱包指示書マスター：商品ごとの梱包手順、資材、写真付き手順を管理';
COMMENT ON COLUMN packing_instructions_master.id IS 'プライマリキー（UUID）';
COMMENT ON COLUMN packing_instructions_master.item_id IS '商品ID（products_masterへのFK）';
COMMENT ON COLUMN packing_instructions_master.packing_material_list IS '梱包資材リスト（JSONB配列）';
COMMENT ON COLUMN packing_instructions_master.step_by_step_instructions IS '梱包手順（テキスト）';
COMMENT ON COLUMN packing_instructions_master.media_links IS '写真・動画リンク（JSONB配列）';
COMMENT ON COLUMN packing_instructions_master.is_verified IS '検証済みフラグ（作業者による確認完了）';
COMMENT ON COLUMN packing_instructions_master.times_used IS '使用実績回数';

-- 7. サンプルデータの挿入（開発・テスト用）
INSERT INTO packing_instructions_master (
    item_id,
    item_name,
    item_category,
    packing_material_list,
    step_by_step_instructions,
    media_links,
    special_notes,
    recommended_box_length_cm,
    recommended_box_width_cm,
    recommended_box_height_cm,
    recommended_box_weight_g,
    is_verified
) VALUES
(
    'WATCH-001',
    '腕時計 XYZ',
    '精密機器',
    '[
        {"material_name": "ダンボール", "size": "25x20x10cm", "quantity": 1},
        {"material_name": "エアキャップ", "size": "50cm幅", "quantity": "80cm"},
        {"material_name": "OPPテープ", "size": "48mm", "quantity": 1}
    ]'::jsonb,
    E'1. 腕時計をエアキャップで3重に包む\n2. ダンボールの底面に緩衝材を敷く\n3. 商品を中央に配置\n4. 隙間を緩衝材で埋める\n5. テープでしっかり封をする',
    '[
        {"type": "image", "url": "/images/packing/watch-step1.jpg", "description": "エアキャップで包む様子"}
    ]'::jsonb,
    '精密機器のため衝撃に注意してください。水濡れ厳禁。',
    25.0,
    20.0,
    10.0,
    500,
    true
),
(
    'CAMERA-L50',
    'カメラレンズ L-50',
    '精密機器',
    '[
        {"material_name": "ダンボール", "size": "30x30x15cm", "quantity": 1},
        {"material_name": "エアキャップ", "size": "50cm幅", "quantity": "1m"},
        {"material_name": "緩衝材（発泡スチロール）", "size": "適量", "quantity": 1}
    ]'::jsonb,
    E'1. レンズキャップを確認\n2. エアキャップで全体を包む\n3. 専用ボックスがあれば使用\n4. ダンボールに固定\n5. 隙間を発泡スチロールで埋める',
    '[]'::jsonb,
    'レンズは非常にデリケートです。衝撃・振動に最大限注意してください。',
    30.0,
    30.0,
    15.0,
    1200,
    true
);

-- ================================================================
-- マイグレーション完了
-- ================================================================
