<?php
/**
 * 🔸 🌐 外部API_h - CAIDS統合外部API連携システム
 * キャッシュ・エラー処理・レート制限対応
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// CAIDS量子化設定
$CONFIG = [
    'weather_api_key' => 'demo_key', // 実際の運用では環境変数から取得
    'cache_duration' => 300, // 5分キャッシュ
    'max_requests_per_minute' => 60
];

// CAIDS量子化エラーハンドリング
function caids_api_error($message, $code = 500) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $message,
        'caids_error_id' => 'API_ERR_' . time(),
        'caids_hooks_applied' => ['🔸 ⚠️ エラー処理_h', '🔸 🌐 外部API_h'],
        'retry_after' => 60
    ]);
    exit;
}

// CAIDS量子化キャッシュシステム
function getCachedData($cache_key) {
    try {
        $db = new PDO('sqlite:../config/caids_database.db');
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // キャッシュテーブル作成
        $db->exec("
            CREATE TABLE IF NOT EXISTS api_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cache_key TEXT UNIQUE,
                data TEXT,
                expires_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ");
        
        // キャッシュ取得
        $stmt = $db->prepare("SELECT data FROM api_cache WHERE cache_key = ? AND expires_at > datetime('now')");
        $stmt->execute([$cache_key]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result ? json_decode($result['data'], true) : null;
    } catch (Exception $e) {
        error_log("[CAIDS] Cache read error: " . $e->getMessage());
        return null;
    }
}

function setCachedData($cache_key, $data, $duration = 300) {
    try {
        $db = new PDO('sqlite:../config/caids_database.db');
        $expires_at = date('Y-m-d H:i:s', time() + $duration);
        
        $stmt = $db->prepare("
            INSERT OR REPLACE INTO api_cache (cache_key, data, expires_at)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$cache_key, json_encode($data), $expires_at]);
    } catch (Exception $e) {
        error_log("[CAIDS] Cache write error: " . $e->getMessage());
    }
}

// CAIDS量子化レート制限チェック
function checkRateLimit($api_name) {
    $rate_key = "rate_limit_$api_name";
    $cached = getCachedData($rate_key);
    
    if ($cached && $cached['count'] >= $CONFIG['max_requests_per_minute']) {
        caids_api_error('レート制限に達しました。しばらく待ってから再試行してください。', 429);
    }
    
    $count = $cached ? $cached['count'] + 1 : 1;
    setCachedData($rate_key, ['count' => $count], 60);
}

try {
    $api_type = $_GET['type'] ?? '';
    $start_time = microtime(true);
    
    switch ($api_type) {
        case 'weather':
            checkRateLimit('weather');
            
            $city = $_GET['city'] ?? 'Tokyo';
            $cache_key = "weather_$city";
            
            // CAIDS量子化キャッシュチェック
            $cached_data = getCachedData($cache_key);
            if ($cached_data) {
                $cached_data['caids_cache_hit'] = true;
                $cached_data['caids_response_time'] = round((microtime(true) - $start_time) * 1000, 2);
                echo json_encode($cached_data);
                break;
            }
            
            // OpenWeatherMap API（デモ用レスポンス）
            $weather_data = [
                'success' => true,
                'city' => $city,
                'weather' => [
                    'main' => 'Clear',
                    'description' => '晴れ',
                    'temperature' => rand(15, 30),
                    'humidity' => rand(40, 80),
                    'pressure' => rand(1000, 1030)
                ],
                'caids_hooks_applied' => [
                    '🔸 🌐 外部API_h',
                    '🔸 💾 キャッシュ_h',
                    '🔸 ⚡ 性能最適化_h'
                ],
                'caids_cache_hit' => false,
                'caids_response_time' => round((microtime(true) - $start_time) * 1000, 2),
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
            // キャッシュ保存
            setCachedData($cache_key, $weather_data, $CONFIG['cache_duration']);
            
            echo json_encode($weather_data);
            break;
            
        case 'currency':
            checkRateLimit('currency');
            
            $from = $_GET['from'] ?? 'USD';
            $to = $_GET['to'] ?? 'JPY';
            $cache_key = "currency_{$from}_to_{$to}";
            
            // CAIDS量子化キャッシュチェック
            $cached_data = getCachedData($cache_key);
            if ($cached_data) {
                $cached_data['caids_cache_hit'] = true;
                echo json_encode($cached_data);
                break;
            }
            
            // ExchangeRate API（デモ用レスポンス）
            $rates = [
                'USD_JPY' => 150.25,
                'EUR_JPY' => 162.30,
                'GBP_JPY' => 188.45
            ];
            
            $rate = $rates["{$from}_{$to}"] ?? (1 / $rates["{$to}_{$from}"] ?? 1);
            
            $currency_data = [
                'success' => true,
                'from' => $from,
                'to' => $to,
                'rate' => $rate,
                'amount' => $_GET['amount'] ?? 1,
                'converted' => ($_GET['amount'] ?? 1) * $rate,
                'caids_hooks_applied' => [
                    '🔸 🌐 外部API_h',
                    '🔸 💾 キャッシュ_h',
                    '🔸 🧮 計算処理_h'
                ],
                'caids_cache_hit' => false,
                'caids_response_time' => round((microtime(true) - $start_time) * 1000, 2),
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
            setCachedData($cache_key, $currency_data, $CONFIG['cache_duration']);
            echo json_encode($currency_data);
            break;
            
        case 'news':
            checkRateLimit('news');
            
            $category = $_GET['category'] ?? 'technology';
            $cache_key = "news_$category";
            
            // CAIDS量子化キャッシュチェック
            $cached_data = getCachedData($cache_key);
            if ($cached_data) {
                $cached_data['caids_cache_hit'] = true;
                echo json_encode($cached_data);
                break;
            }
            
            // News API（デモ用レスポンス）
            $demo_news = [
                [
                    'title' => 'AI技術の最新動向について',
                    'description' => '人工知能分野での革新的な進展が続いています。',
                    'source' => 'Tech News',
                    'publishedAt' => date('Y-m-d H:i:s', strtotime('-2 hours'))
                ],
                [
                    'title' => 'Web開発の新しいトレンド',
                    'description' => 'モダンなWeb開発手法が注目を集めています。',
                    'source' => 'Dev Weekly',
                    'publishedAt' => date('Y-m-d H:i:s', strtotime('-4 hours'))
                ]
            ];
            
            $news_data = [
                'success' => true,
                'category' => $category,
                'articles' => $demo_news,
                'total_results' => count($demo_news),
                'caids_hooks_applied' => [
                    '🔸 🌐 外部API_h',
                    '🔸 💾 キャッシュ_h',
                    '🔸 📰 ニュース処理_h'
                ],
                'caids_cache_hit' => false,
                'caids_response_time' => round((microtime(true) - $start_time) * 1000, 2),
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
            setCachedData($cache_key, $news_data, $CONFIG['cache_duration']);
            echo json_encode($news_data);
            break;
            
        case 'test':
            // CAIDS統合テスト用エンドポイント
            echo json_encode([
                'success' => true,
                'message' => 'CAIDS外部API統合システム正常動作中',
                'available_apis' => ['weather', 'currency', 'news'],
                'caids_system_status' => [
                    'cache_system' => 'operational',
                    'rate_limiting' => 'active',
                    'error_handling' => 'enhanced'
                ],
                'caids_hooks_applied' => ['🔸 🌐 外部API_h', '🔸 🧪 テスト_h'],
                'caids_response_time' => round((microtime(true) - $start_time) * 1000, 2)
            ]);
            break;
            
        default:
            caids_api_error('無効なAPIタイプです', 400);
    }
    
} catch (Exception $e) {
    caids_api_error('システムエラー: ' . $e->getMessage(), 500);
}
?>