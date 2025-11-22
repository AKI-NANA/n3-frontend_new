-- ファイル: /database/migrations/002_create_ai_dbs.sql

-- 1. ペルソナ管理テーブル
CREATE TABLE IF NOT EXISTS persona_master (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    expertise TEXT,
    style_prompt TEXT NOT NULL,  -- LLMへの文体指示の核
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. サイト・アカウント設定テーブル (100+サイト管理用)
CREATE TABLE IF NOT EXISTS site_config_master (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    platform TEXT NOT NULL,  -- 'wordpress', 'youtube', 'tiktok', 'podcast'
    api_key_encrypted TEXT,
    persona_id INTEGER REFERENCES persona_master(id),
    status TEXT DEFAULT 'active',
    last_post_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. アイデア/URLソース管理テーブル
CREATE TABLE IF NOT EXISTS idea_source_master (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    title TEXT,
    platform TEXT,
    assigned_theme TEXT,
    priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'new',  -- 'new', 'in_analysis', 'processed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
