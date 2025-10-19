<?php
/**
 * データベースセットアップ確認・修正スクリプト
 * PostgreSQL環境での5カテゴリフィルター対応テーブル確認・作成
 */

require_once '../shared/core/database.php';

echo "🚀 5カテゴリフィルターシステム データベースセットアップ\n";
echo "==================================================\n\n";

try {
    $db = Database::getInstance();
    $pdo = $db->getPDO();
    echo "✅ データベース接続成功\n";
    
    // 現在のテーブル一覧取得
    $stmt = $pdo->query("
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    ");
    
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "\n📋 現在のテーブル一覧:\n";
    foreach ($tables as $table) {
        echo "  - " . $table . "\n";
    }
    
    // 必要テーブルの存在確認
    $requiredTables = [
        'filter_keywords',
        'patent_troll_cases', 
        'vero_participants',
        'country_restrictions',
        'scraping_sources'
    ];
    
    $missingTables = [];
    foreach ($requiredTables as $table) {
        if (!in_array($table, $tables)) {
            $missingTables[] = $table;
        }
    }
    
    if (!empty($missingTables)) {
        echo "\n❌ 不足しているテーブル:\n";
        foreach ($missingTables as $table) {
            echo "  - " . $table . "\n";
        }
        
        echo "\n🔧 テーブルを自動作成します...\n";
        createMissingTables($pdo, $missingTables);
    } else {
        echo "\n✅ 全ての必要テーブルが存在します\n";
    }
    
    // データ件数確認
    echo "\n📊 各テーブルのデータ件数:\n";
    $tableExists = [];
    foreach ($requiredTables as $table) {
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM \"$table\"");
            $count = $stmt->fetchColumn();
            echo "  - $table: " . number_format($count) . " 件\n";
            $tableExists[$table] = $count;
        } catch (Exception $e) {
            echo "  - $table: エラー - " . $e->getMessage() . "\n";
            $tableExists[$table] = -1;
        }
    }
    
    // サンプルデータ自動挿入
    $needsSampleData = false;
    foreach ($tableExists as $table => $count) {
        if ($count === 0) {
            $needsSampleData = true;
            break;
        }
    }
    
    if ($needsSampleData) {
        echo "\n💾 サンプルデータを自動挿入します...\n";
        insertSampleData($pdo);
    }
    
    echo "\n🎉 セットアップ完了！\n";
    echo "ブラウザで http://localhost:8080/new_structure/06_filters/filters.php にアクセスしてください。\n";
    
} catch (Exception $e) {
    echo "❌ エラー: " . $e->getMessage() . "\n";
}

/**
 * 不足テーブルの作成
 */
function createMissingTables($pdo, $missingTables) {
    // PostgreSQL用のCREATEクエリ
    $createQueries = [
        'filter_keywords' => "
            CREATE TABLE filter_keywords (
                id SERIAL PRIMARY KEY,
                keyword VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL CHECK (type IN ('EXPORT', 'PATENT', 'PATENT_TROLL', 'COUNTRY_SPECIFIC', 'MALL_SPECIFIC', 'VERO', 'BRAND_PROTECTION')),
                priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
                mall_name VARCHAR(100),
                country_code VARCHAR(3),
                detection_count INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX idx_filter_keywords_type ON filter_keywords(type);
            CREATE INDEX idx_filter_keywords_active ON filter_keywords(is_active);
        ",
        
        'patent_troll_cases' => "
            CREATE TABLE patent_troll_cases (
                id SERIAL PRIMARY KEY,
                case_title VARCHAR(500) NOT NULL,
                patent_number VARCHAR(100),
                plaintiff VARCHAR(255),
                defendant VARCHAR(255),
                case_summary TEXT,
                keywords TEXT,
                risk_level VARCHAR(20) DEFAULT 'MEDIUM' CHECK (risk_level IN ('HIGH', 'MEDIUM', 'LOW')),
                case_date DATE,
                source_url VARCHAR(500),
                scraping_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX idx_patent_cases_risk ON patent_troll_cases(risk_level);
        ",
        
        'vero_participants' => "
            CREATE TABLE vero_participants (
                id SERIAL PRIMARY KEY,
                brand_name VARCHAR(255) NOT NULL,
                company_name VARCHAR(255) NOT NULL,
                vero_id VARCHAR(100) UNIQUE,
                protected_keywords TEXT,
                status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                scraping_source VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX idx_vero_brand ON vero_participants(brand_name);
        ",
        
        'country_restrictions' => "
            CREATE TABLE country_restrictions (
                id SERIAL PRIMARY KEY,
                country_code VARCHAR(3) NOT NULL,
                country_name VARCHAR(100) NOT NULL,
                restriction_type VARCHAR(50) NOT NULL CHECK (restriction_type IN ('IMPORT_BAN', 'EXPORT_BAN', 'TRADEMARK', 'PATENT', 'OTHER')),
                restricted_keywords TEXT,
                description TEXT,
                effective_date DATE,
                source_url VARCHAR(500),
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            );
            CREATE INDEX idx_country_code ON country_restrictions(country_code);
        ",
        
        'scraping_sources' => "
            CREATE TABLE scraping_sources (
                id SERIAL PRIMARY KEY,
                source_name VARCHAR(255) NOT NULL,
                source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('PATENT_TROLL', 'VERO', 'COUNTRY_RESTRICTIONS', 'EXPORT_CONTROL')),
                base_url VARCHAR(500) NOT NULL,
                scraping_config JSONB,
                schedule_pattern VARCHAR(50) DEFAULT '0 2 * * *',
                last_scraped TIMESTAMP,
                next_scheduled TIMESTAMP,
                status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ERROR')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        "
    ];
    
    foreach ($missingTables as $table) {
        if (isset($createQueries[$table])) {
            try {
                $pdo->exec($createQueries[$table]);
                echo "  ✅ {$table} テーブル作成完了\n";
            } catch (Exception $e) {
                echo "  ❌ {$table} テーブル作成失敗: " . $e->getMessage() . "\n";
            }
        }
    }
}

/**
 * サンプルデータ挿入
 */
function insertSampleData($pdo) {
    try {
        $pdo->beginTransaction();
        
        // 輸出禁止キーワード
        $exportKeywords = [
            ['偽物', 'EXPORT', 'HIGH'],
            ['レプリカ', 'EXPORT', 'HIGH'], 
            ['コピー商品', 'EXPORT', 'HIGH'],
            ['模造品', 'EXPORT', 'MEDIUM'],
            ['類似品', 'EXPORT', 'LOW'],
            ['fake', 'EXPORT', 'HIGH'],
            ['replica', 'EXPORT', 'HIGH'],
            ['copy', 'EXPORT', 'MEDIUM']
        ];
        
        $stmt = $pdo->prepare("INSERT INTO filter_keywords (keyword, type, priority) VALUES (?, ?, ?)");
        foreach ($exportKeywords as $keyword) {
            $stmt->execute($keyword);
        }
        echo "  ✅ 輸出禁止キーワード: " . count($exportKeywords) . "件\n";
        
        // パテントトロール事例
        $patentCases = [
            [
                'スマートフォンケース特許侵害訴訟',
                'US10123456',
                'Patent Solutions LLC',
                'Apple Inc.',
                'スマートフォン保護ケースの特許を主張し、複数のメーカーを提訴',
                'smartphone,case,protection',
                'HIGH',
                '2025-09-15'
            ],
            [
                'Bluetooth通信技術特許',
                'US9876543',
                'Wireless Tech Holdings',
                'Samsung Electronics',
                'Bluetooth通信の基本特許を主張し、スマートデバイス各社を標的',
                'bluetooth,wireless,communication',
                'HIGH',
                '2025-08-20'
            ],
            [
                'オンライン決済システム特許',
                'US8765432',
                'E-Commerce Patents LLC',
                'PayPal Inc.',
                'オンライン決済のUI特許でeコマース企業を提訴',
                'payment,online,ecommerce',
                'MEDIUM',
                '2025-07-10'
            ]
        ];
        
        $stmt = $pdo->prepare("
            INSERT INTO patent_troll_cases 
            (case_title, patent_number, plaintiff, defendant, case_summary, keywords, risk_level, case_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($patentCases as $case) {
            $stmt->execute($case);
        }
        echo "  ✅ パテントトロール事例: " . count($patentCases) . "件\n";
        
        // VERO参加者
        $veroParticipants = [
            ['Nike', 'Nike, Inc.', 'VERO123456', 'nike,swoosh,air jordan,just do it', 'ACTIVE'],
            ['Apple', 'Apple Inc.', 'VERO789012', 'iphone,ipad,macbook,apple,ios', 'ACTIVE'],
            ['Louis Vuitton', 'LVMH', 'VERO345678', 'louis vuitton,lv,monogram', 'ACTIVE'],
            ['Rolex', 'Rolex SA', 'VERO901234', 'rolex,submariner,daytona', 'ACTIVE'],
            ['Chanel', 'Chanel S.A.', 'VERO567890', 'chanel,coco,no.5', 'ACTIVE']
        ];
        
        $stmt = $pdo->prepare("
            INSERT INTO vero_participants 
            (brand_name, company_name, vero_id, protected_keywords, status) 
            VALUES (?, ?, ?, ?, ?)
        ");
        foreach ($veroParticipants as $participant) {
            $stmt->execute($participant);
        }
        echo "  ✅ VERO参加者: " . count($veroParticipants) . "件\n";
        
        // 国別規制
        $countryRestrictions = [
            ['USA', 'アメリカ合衆国', 'EXPORT_BAN', '軍事,暗号化,nuclear,weapons', '軍事関連技術の輸出規制（EAR）'],
            ['CHN', '中国', 'EXPORT_BAN', '古美術,文化財,antique,cultural heritage', '文化財保護法による規制'],
            ['RUS', 'ロシア', 'EXPORT_BAN', '戦略物資,military,strategic', '対露制裁による規制'],
            ['IRN', 'イラン', 'EXPORT_BAN', '石油,military,nuclear', '国際制裁による規制'],
            ['PRK', '北朝鮮', 'EXPORT_BAN', 'luxury,military,nuclear', '国連制裁決議による規制']
        ];
        
        $stmt = $pdo->prepare("
            INSERT INTO country_restrictions 
            (country_code, country_name, restriction_type, restricted_keywords, description) 
            VALUES (?, ?, ?, ?, ?)
        ");
        foreach ($countryRestrictions as $restriction) {
            $stmt->execute($restriction);
        }
        echo "  ✅ 国別規制: " . count($countryRestrictions) . "件\n";
        
        // モール別キーワード
        $mallKeywords = [
            ['replica', 'MALL_SPECIFIC', 'HIGH', 'ebay'],
            ['fake', 'MALL_SPECIFIC', 'HIGH', 'ebay'],
            ['knockoff', 'MALL_SPECIFIC', 'HIGH', 'amazon'],
            ['similar to', 'MALL_SPECIFIC', 'MEDIUM', 'etsy'],
            ['inspired by', 'MALL_SPECIFIC', 'LOW', 'etsy']
        ];
        
        $stmt = $pdo->prepare("INSERT INTO filter_keywords (keyword, type, priority, mall_name) VALUES (?, ?, ?, ?)");
        foreach ($mallKeywords as $keyword) {
            $stmt->execute($keyword);
        }
        echo "  ✅ モール別キーワード: " . count($mallKeywords) . "件\n";
        
        // スクレイピングソース
        $scrapingSources = [
            ['USPTO Patent Database', 'PATENT_TROLL', 'https://www.uspto.gov/patents', '{"selector": ".patent-case", "fields": ["title", "number"]}'],
            ['eBay VERO List', 'VERO', 'https://www.ebay.com/help/policies/listing-policies/verified-rights-owner-vero-program', '{"selector": ".vero-brand", "fields": ["brand", "company"]}'],
            ['BIS Export Control List', 'EXPORT_CONTROL', 'https://www.bis.doc.gov/index.php/regulations/export-administration-regulations-ear', '{"selector": ".controlled-item", "fields": ["item", "eccn"]}']
        ];
        
        $stmt = $pdo->prepare("
            INSERT INTO scraping_sources 
            (source_name, source_type, base_url, scraping_config) 
            VALUES (?, ?, ?, ?)
        ");
        foreach ($scrapingSources as $source) {
            $stmt->execute($source);
        }
        echo "  ✅ スクレイピングソース: " . count($scrapingSources) . "件\n";
        
        $pdo->commit();
        echo "\n🎉 サンプルデータ挿入完了！\n";
        
    } catch (Exception $e) {
        $pdo->rollback();
        echo "  ❌ サンプルデータ挿入失敗: " . $e->getMessage() . "\n";
    }
}
?>