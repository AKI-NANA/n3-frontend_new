<?php
/**
 * 高機能フィルターシステム設定ファイル
 * config/filter_system_config.php
 */

return [
    // ==================================================
    // 基本設定
    // ==================================================
    'system' => [
        'name' => '高機能フィルターシステム',
        'version' => '2.0.0',
        'environment' => 'development', // development, staging, production
        'maintenance_mode' => false,
        'debug' => true,
        'timezone' => 'Asia/Tokyo'
    ],
    
    // ==================================================
    // ページネーション設定
    // ==================================================
    'pagination' => [
        'default_per_page' => 25,
        'max_per_page' => 100,
        'min_per_page' => 10,
        'show_page_numbers' => 9, // 表示するページ番号数
        'show_first_last' => true,
        'show_prev_next' => true
    ],
    
    // ==================================================
    // 検索設定
    // ==================================================
    'search' => [
        'min_query_length' => 2,
        'max_query_length' => 255,
        'enable_fulltext_search' => true,
        'enable_fuzzy_search' => false,
        'highlight_matches' => true,
        'search_timeout' => 5, // 秒
        'max_results' => 1000
    ],
    
    // ==================================================
    // キャッシュ設定
    // ==================================================
    'cache' => [
        'enabled' => true,
        'default_ttl' => 300, // 5分
        'driver' => 'memory', // memory, redis, memcached
        'redis' => [
            'host' => '127.0.0.1',
            'port' => 6379,
            'password' => null,
            'database' => 0
        ],
        'prefixes' => [
            'statistics' => 'stats:',
            'data' => 'data:',
            'search' => 'search:',
            'categories' => 'cat:'
        ]
    ],
    
    // ==================================================
    // API設定
    // ==================================================
    'api' => [
        'version' => 'v2',
        'rate_limit' => [
            'enabled' => true,
            'requests_per_minute' => 60,
            'requests_per_hour' => 1000
        ],
        'cors' => [
            'enabled' => true,
            'allowed_origins' => ['*'],
            'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            'allowed_headers' => ['Content-Type', 'X-CSRF-Token', 'Authorization']
        ],
        'authentication' => [
            'required' => false,
            'type' => 'bearer_token', // bearer_token, api_key, session
            'header_name' => 'Authorization'
        ]
    ],
    
    // ==================================================
    // エクスポート設定
    // ==================================================
    'export' => [
        'max_records' => 10000,
        'formats' => ['csv', 'json', 'xlsx'],
        'csv' => [
            'encoding' => 'UTF-8',
            'delimiter' => ',',
            'enclosure' => '"',
            'include_bom' => true
        ],
        'json' => [
            'pretty_print' => true,
            'unescaped_unicode' => true
        ],
        'xlsx' => [
            'sheet_name' => 'Filter Keywords',
            'include_formatting' => true
        ]
    ],
    
    // ==================================================
    // セキュリティ設定
    // ==================================================
    'security' => [
        'csrf_protection' => true,
        'session_timeout' => 3600, // 1時間
        'password_policy' => [
            'min_length' => 8,
            'require_uppercase' => true,
            'require_lowercase' => true,
            'require_numbers' => true,
            'require_symbols' => false
        ],
        'ip_whitelist' => [], // 空の場合は制限なし
        'max_login_attempts' => 5,
        'lockout_duration' => 900 // 15分
    ],
    
    // ==================================================
    // ログ設定
    // ==================================================
    'logging' => [
        'enabled' => true,
        'level' => 'info', // debug, info, warning, error
        'channels' => [
            'api' => [
                'enabled' => true,
                'file' => 'logs/api.log',
                'max_size' => '10MB',
                'rotate' => true,
                'max_files' => 7
            ],
            'system' => [
                'enabled' => true,
                'file' => 'logs/system.log',
                'max_size' => '10MB',
                'rotate' => true,
                'max_files' => 30
            ],
            'performance' => [
                'enabled' => true,
                'file' => 'logs/performance.log',
                'max_size' => '5MB',
                'rotate' => true,
                'max_files' => 7
            ]
        ]
    ],
    
    // ==================================================
    // パフォーマンス設定
    // ==================================================
    'performance' => [
        'memory_limit' => '256M',
        'execution_time_limit' => 30, // 秒
        'slow_query_threshold' => 1.0, // 秒
        'enable_profiling' => false,
        'database' => [
            'connection_timeout' => 10,
            'query_timeout' => 30,
            'max_connections' => 20
        ]
    ],
    
    // ==================================================
    // フィルター設定
    // ==================================================
    'filters' => [
        'types' => [
            'EXPORT' => [
                'name' => '輸出禁止',
                'description' => '輸出禁止品目に関連するキーワード',
                'color' => '#dc2626',
                'icon' => 'fas fa-ban',
                'priority' => 1
            ],
            'PATENT_TROLL' => [
                'name' => 'パテントトロール',
                'description' => '特許トロール対策キーワード',
                'color' => '#d97706',
                'icon' => 'fas fa-gavel',
                'priority' => 2
            ],
            'VERO' => [
                'name' => 'VERO禁止',
                'description' => 'VERO参加ブランド保護キーワード',
                'color' => '#0891b2',
                'icon' => 'fas fa-copyright',
                'priority' => 3
            ],
            'MALL_SPECIFIC' => [
                'name' => 'モール別禁止',
                'description' => 'モール固有の制限キーワード',
                'color' => '#059669',
                'icon' => 'fas fa-store',
                'priority' => 4
            ],
            'COUNTRY_SPECIFIC' => [
                'name' => '国別制限',
                'description' => '国別輸出制限キーワード',
                'color' => '#7c3aed',
                'icon' => 'fas fa-globe',
                'priority' => 5
            ]
        ],
        'priorities' => [
            'HIGH' => [
                'name' => '高',
                'color' => '#dc2626',
                'weight' => 3
            ],
            'MEDIUM' => [
                'name' => '中',
                'color' => '#d97706',
                'weight' => 2
            ],
            'LOW' => [
                'name' => '低',
                'color' => '#0891b2',
                'weight' => 1
            ]
        ],
        'languages' => [
            'en' => ['name' => 'English', 'flag' => '🇺🇸'],
            'ja' => ['name' => '日本語', 'flag' => '🇯🇵'],
            'zh' => ['name' => '中文', 'flag' => '🇨🇳'],
            'ko' => ['name' => '한국어', 'flag' => '🇰🇷'],
            'es' => ['name' => 'Español', 'flag' => '🇪🇸'],
            'fr' => ['name' => 'Français', 'flag' => '🇫🇷'],
            'de' => ['name' => 'Deutsch', 'flag' => '🇩🇪']
        ]
    ],
    
    // ==================================================
    // 通知設定
    // ==================================================
    'notifications' => [
        'enabled' => true,
        'channels' => [
            'email' => [
                'enabled' => false,
                'smtp_host' => 'smtp.example.com',
                'smtp_port' => 587,
                'username' => '',
                'password' => '',
                'from_address' => 'filter-system@example.com',
                'from_name' => 'Filter System'
            ],
            'slack' => [
                'enabled' => false,
                'webhook_url' => '',
                'channel' => '#filter-alerts'
            ],
            'discord' => [
                'enabled' => false,
                'webhook_url' => ''
            ]
        ],
        'events' => [
            'high_priority_keyword_detected' => true,
            'system_error' => true,
            'daily_summary' => false,
            'weekly_report' => false
        ]
    ],
    
    // ==================================================
    // バックアップ設定
    // ==================================================
    'backup' => [
        'enabled' => true,
        'schedule' => [
            'daily' => '02:00',
            'weekly' => 'sunday 01:00'
        ],
        'retention' => [
            'daily' => 7,
            'weekly' => 4,
            'monthly' => 12
        ],
        'compression' => true,
        'destinations' => [
            'local' => [
                'enabled' => true,
                'path' => 'backups/'
            ],
            's3' => [
                'enabled' => false,
                'bucket' => '',
                'region' => 'ap-northeast-1'
            ]
        ]
    ],
    
    // ==================================================
    // 監視・アラート設定
    // ==================================================
    'monitoring' => [
        'enabled' => true,
        'health_check' => [
            'interval' => 300, // 5分
            'endpoints' => [
                '/api/health',
                '/api/statistics'
            ]
        ],
        'alerts' => [
            'database_connection_error' => true,
            'high_memory_usage' => true,
            'slow_query' => true,
            'disk_space_low' => true
        ],
        'thresholds' => [
            'memory_usage' => 80, // パーセント
            'disk_usage' => 85, // パーセント
            'query_time' => 2.0, // 秒
            'error_rate' => 5.0 // パーセント
        ]
    ],
    
    // ==================================================
    // UI/UX設定
    // ==================================================
    'ui' => [
        'theme' => 'light', // light, dark, auto
        'language' => 'ja',
        'date_format' => 'Y-m-d H:i:s',
        'currency' => 'JPY',
        'timezone_display' => 'Asia/Tokyo',
        'animations' => true,
        'compact_mode' => false,
        'accessibility' => [
            'high_contrast' => false,
            'large_text' => false,
            'keyboard_navigation' => true
        ]
    ],
    
    // ==================================================
    // 開発・デバッグ設定
    // ==================================================
    'development' => [
        'debug_mode' => true,
        'show_query_log' => true,
        'show_performance_metrics' => true,
        'mock_data' => false,
        'profiling' => [
            'enabled' => true,
            'save_to_file' => false,
            'include_stack_trace' => true
        ]
    ]
];

/*
# ==============================================
# フィルターシステム完全導入ガイド
# ==============================================

## 1. システム要件

### サーバー要件
- PHP 8.0以上
- PostgreSQL 13以上 または MySQL 8.0以上
- メモリ: 最低512MB、推奨2GB以上
- ディスク容量: 最低1GB、推奨10GB以上
- Redis (オプション、パフォーマンス向上のため)

### 必要なPHP拡張
- PDO (PostgreSQL/MySQL)
- JSON
- MBString
- Curl
- OpenSSL
- Redis (オプション)

## 2. インストール手順

### 2.1 データベースセットアップ
```bash
# PostgreSQLの場合
psql -U postgres -c "CREATE DATABASE filter_system;"
psql -U postgres -d filter_system -f database_schema.sql

# MySQLの場合
mysql -u root -p -e "CREATE DATABASE filter_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p filter_system < database_schema.sql
```

### 2.2 ファイル配置
```
project_root/
├── api/
│   └── advanced_filter.php
├── config/
│   └── filter_system_config.php
├── shared/
│   └── core/
│       ├── database.php
│       └── includes.php
├── css/
│   └── enhanced_filters.css
├── js/
│   └── advanced_filters.js
└── index.php (ページネーション対応版)
```

### 2.3 設定ファイル編集
```php
// config/database.php の例
return [
    'host' => 'localhost',
    'port' => 5432,
    'database' => 'filter_system',
    'username' => 'your_username',
    'password' => 'your_password',
    'charset' => 'utf8'
];
```

### 2.4 権限設定
```bash
chmod 755 api/
chmod 644 config/filter_system_config.php
chown -R www-data:www-data logs/
chmod 755 logs/
```

## 3. 使用方法

### 3.1 基本的な使用方法

1. **データ表示**
   - ブラウザで `index.php` にアクセス
   - フィルタータブでカテゴリ選択
   - 検索ボックスでキーワード検索

2. **ページネーション**
   - 下部のページネーションで移動
   - ページサイズ変更可能（10-100件）
   - ページジャンプ機能あり

3. **フィルタリング**
   - 優先度フィルター（高/中/低）
   - 言語フィルター（英語/日本語/中文等）
   - ステータスフィルター（有効/無効）
   - 日付フィルター（今日/今週/今月等）

### 3.2 一括操作

1. **選択**
   - チェックボックスで個別選択
   - 「全選択」で一括選択

2. **実行**
   - 一括有効化/無効化
   - 一括優先度変更
   - 一括削除（検出実績なしのみ）

### 3.3 エクスポート機能

1. **CSV出力**
   ```javascript
   // JavaScript経由
   fetch('/api/advanced_filter.php?action=export&format=csv')
   ```

2. **JSON出力**
   ```javascript
   fetch('/api/advanced_filter.php?action=export&format=json')
   ```

## 4. API リファレンス

### 4.1 データ取得
```
GET /api/advanced_filter.php?action=get_data

パラメータ:
- filter_type: 'all', 'export', 'patent-troll', 'vero', 'mall', 'country'
- page: ページ番号 (default: 1)
- per_page: ページサイズ (default: 25, max: 100)
- search: 検索クエリ
- priority: 'HIGH', 'MEDIUM', 'LOW'
- language: 'en', 'ja', 'zh', etc.
- status: 'active', 'inactive'
- sort: ソートフィールド
- dir: 'asc', 'desc'
```

### 4.2 統計情報取得
```
GET /api/advanced_filter.php?action=get_statistics

レスポンス例:
{
  "success": true,
  "data": {
    "overall": {
      "total_keywords": 1247,
      "active_keywords": 1156,
      "total_detections": 45678
    }
  }
}
```

### 4.3 一括操作
```
POST /api/advanced_filter.php?action=bulk_action

リクエストボディ:
{
  "action": "activate|deactivate|delete|update_priority",
  "ids": [1, 2, 3, ...],
  "priority": "HIGH" (update_priorityの場合)
}
```

### 4.4 検索
```
GET /api/advanced_filter.php?action=search&q=keyword&limit=20

パラメータ:
- q: 検索クエリ (必須、2文字以上)
- type: フィルタータイプ (オプション)
- limit: 結果数制限 (default: 20, max: 50)
```

## 5. カスタマイズ方法

### 5.1 新しいフィルタータイプ追加

1. **データベーススキーマ更新**
```sql
-- 新しいタイプを制約に追加
ALTER TABLE filter_keywords 
DROP CONSTRAINT filter_keywords_type_check;

ALTER TABLE filter_keywords 
ADD CONSTRAINT filter_keywords_type_check 
CHECK (type IN ('EXPORT', 'PATENT_TROLL', 'VERO', 'MALL_SPECIFIC', 'COUNTRY_SPECIFIC', 'NEW_TYPE'));
```

2. **設定ファイル更新**
```php
// config/filter_system_config.php
'filters' => [
    'types' => [
        'NEW_TYPE' => [
            'name' => '新しいフィルター',
            'description' => '説明',
            'color' => '#ff6b6b',
            'icon' => 'fas fa-new-icon',
            'priority' => 6
        ]
    ]
]
```

3. **フロントエンド更新**
```html
<!-- 新しいタブを追加 -->
<a href="?filter_type=new-type" class="tab-button">
    <i class="fas fa-new-icon"></i>
    新しいフィルター
</a>
```

### 5.2 カスタムバリデーション追加

```php
// API クラスに追加
private function validateCustomField($value) {
    if (strlen($value) < 3) {
        throw new Exception('カスタムフィールドは3文字以上である必要があります');
    }
    
    if (!preg_match('/^[A-Za-z0-9_-]+$/', $value)) {
        throw new Exception('カスタムフィールドに無効な文字が含まれています');
    }
    
    return true;
}
```

### 5.3 新しいエクスポート形式追加

```php
// API クラスに追加
private function generateXMLExport($data) {
    $xml = new SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><keywords></keywords>');
    
    foreach ($data as $row) {
        $keyword = $xml->addChild('keyword');
        $keyword->addAttribute('id', $row['id']);
        $keyword->addChild('text', htmlspecialchars($row['keyword']));
        $keyword->addChild('type', $row['type']);
        // ... 他のフィールド
    }
    
    return [
        'data' => [
            'filename' => 'keywords_' . date('Y-m-d_H-i-s') . '.xml',
            'content' => base64_encode($xml->asXML()),
            'mime_type' => 'application/xml'
        ]
    ];
}
```

## 6. トラブルシューティング

### 6.1 よくある問題

**問題**: ページが表示されない
```bash
# ログを確認
tail -f logs/system.log

# PHP エラーログを確認
tail -f /var/log/apache2/error.log
```

**問題**: データベース接続エラー
```bash
# 接続テスト
php -r "
$pdo = new PDO('pgsql:host=localhost;dbname=filter_system', 'user', 'pass');
echo 'Connection OK';
"
```

**問題**: メモリ不足エラー
```php
// php.ini または設定で
ini_set('memory_limit', '512M');
```

**問題**: 検索が遅い
```sql
-- インデックス確認
EXPLAIN ANALYZE SELECT * FROM filter_keywords WHERE keyword ILIKE '%test%';

-- 必要に応じてインデックス追加
CREATE INDEX CONCURRENTLY idx_filter_keywords_keyword_gin 
ON filter_keywords USING gin(to_tsvector('english', keyword));
```

### 6.2 パフォーマンス最適化

1. **データベース最適化**
```sql
-- 定期的な VACUUM ANALYZE
VACUUM ANALYZE filter_keywords;

-- 統計情報更新
ANALYZE filter_keywords;
```

2. **キャッシュ設定**
```php
// Redis使用の場合
'cache' => [
    'driver' => 'redis',
    'redis' => [
        'host' => '127.0.0.1',
        'port' => 6379
    ]
]
```

3. **ページネーション最適化**
```sql
-- カウントクエリ最適化のため統計テーブル使用
SELECT total_keywords FROM filter_system_stats 
WHERE date_recorded = CURRENT_DATE;
```

## 7. セキュリティ設定

### 7.1 基本的なセキュリティ対策

1. **CSRF対策**
```php
session_start();
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
```

2. **入力サニタイゼーション**
```php
function sanitizeInput($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}
```

3. **SQLインジェクション対策**
```php
// 常にプリペアドステートメントを使用
$stmt = $pdo->prepare("SELECT * FROM table WHERE id = ?");
$stmt->execute([$id]);
```

### 7.2 本番環境設定

```php
// config/filter_system_config.php (本番環境)
return [
    'system' => [
        'environment' => 'production',
        'debug' => false
    ],
    'security' => [
        'csrf_protection' => true,
        'session_timeout' => 1800, // 30分
        'ip_whitelist' => ['192.168.1.0/24'] // 社内ネットワークのみ
    ]
];
```

## 8. 監視・メンテナンス

### 8.1 ログ監視
```bash
# エラーログ監視
tail -f logs/system.log | grep ERROR

# パフォーマンス監視
tail -f logs/performance.log | grep "slow_query"
```

### 8.2 定期メンテナンス
```bash
# 毎日実行するメンテナンススクリプト例
#!/bin/bash

# ログローテーション
find logs/ -name "*.log" -size +10M -exec gzip {} \;

# 古いログ削除 (30日以上)
find logs/ -name "*.gz" -mtime +30 -delete

# データベース最適化
psql -d filter_system -c "SELECT optimize_database();"

# 統計更新
curl -s "http://localhost/api/advanced_filter.php?action=get_statistics" > /dev/null
```

### 8.3 バックアップ
```bash
#!/bin/bash
# データベースバックアップ

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="filter_system_backup_${DATE}.sql"

pg_dump -h localhost -U username filter_system > "backups/${BACKUP_FILE}"
gzip "backups/${BACKUP_FILE}"

# 古いバックアップ削除 (7日以上)
find backups/ -name "*.gz" -mtime +7 -delete
```

## 9. 今後の拡張計画

### 9.1 機能拡張予定
- AI による自動キーワード生成
- 多言語翻訳API連携
- リアルタイム通知システム
- モバイルアプリ対応
- 機械学習による効果予測

### 9.2 パフォーマンス改善予定
- Elasticsearch導入による高速検索
- GraphQL API対応
- CDN対応
- マイクロサービス化

## サポート

技術的な問題や質問がある場合は、以下のリソースをご利用ください：

- 開発チーム: dev-team@example.com
- システム管理者: admin@example.com
- ドキュメント: https://docs.example.com/filter-system
- Github: https://github.com/company/filter-system

最終更新日: 2025年9月22日
バージョン: 2.0.0
*/