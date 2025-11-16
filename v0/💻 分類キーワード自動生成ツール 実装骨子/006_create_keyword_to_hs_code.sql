-- 006_create_keyword_to_hs_code.sql

-- HTSコードとキーワードの紐付けを管理するテーブル
CREATE TABLE IF NOT EXISTS keyword_to_hs_code (
    id SERIAL PRIMARY KEY,
    -- 6桁HSコード。hts_codes_subheadingsテーブルのsubheading_codeに対応
    hs_code CHAR(6) NOT NULL,
    -- 生成されたキーワード（すべて小文字で保存し、検索を効率化）
    keyword TEXT NOT NULL,
    -- キーワードの言語 ('ja' または 'en')
    language CHAR(2) NOT NULL,
    -- キーワードのスコアや重み付け（オプション）
    weight DECIMAL(3, 2) DEFAULT 1.00,
    -- 外部参照用のインデックス
    CONSTRAINT fk_hs_code FOREIGN KEY (hs_code) REFERENCES hts_codes_subheadings(subheading_code),

    -- 同一HSコードに対して同一キーワードが重複しないようにするユニーク制約
    UNIQUE (hs_code, keyword, language)
);

-- 検索性能向上のためのインデックス
CREATE INDEX idx_keyword_search ON keyword_to_hs_code (keyword);
CREATE INDEX idx_hs_code_lang ON keyword_to_hs_code (hs_code, language);