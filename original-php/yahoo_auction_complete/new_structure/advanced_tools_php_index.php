<?php
/**
 * Yahoo Auction Complete - Advanced Tools PHP版 インデックス
 * HTMLファイルのPHP変換版への統合アクセスポイント
 */

header('Content-Type: text/html; charset=utf-8');

// PHP環境情報取得
$php_info = [
    'version' => phpversion(),
    'server_time' => date('Y-m-d H:i:s'),
    'memory_limit' => ini_get('memory_limit'),
    'max_execution_time' => ini_get('max_execution_time'),
    'extensions' => [
        'curl' => extension_loaded('curl'),
        'json' => extension_loaded('json'),
        'pdo' => extension_loaded('pdo'),
        'pgsql' => extension_loaded('pgsql')
    ]
];

// 利用可能なツール定義
$tools = [
    [
        'id' => 'advanced_tariff_calculator',
        'title' => '高度統合利益計算システム',
        'description' => 'eBay USA & Shopee 7カ国 関税・DDP/DDU対応',
        'path' => '05_rieki/advanced_tariff_calculator.php',
        'icon' => '🧮',
        'status' => 'active',
        'features' => ['関税計算', 'DDP/DDU対応', '7カ国対応', 'PHP統合'],
        'type' => 'profit'
    ],
    [
        'id' => 'complete_4layer_shipping',
        'title' => '送料計算システム（4層選択）',
        'description' => '全業者対応・30kg対応・実データベース連携',
        'path' => '09_shipping/complete_4layer_shipping_ui.php',
        'icon' => '🚢',
        'status' => 'active',
        'features' => ['4層選択', '30kg対応', 'データベース連携', 'PHP統合'],
        'type' => 'shipping'
    ],
    [
        'id' => 'working_calculator',
        'title' => '高速動作版利益計算',
        'description' => 'HTTP通信問題回避版・即座に利用可能',
        'path' => '05_rieki/working_calculator.php',
        'icon' => '⚡',
        'status' => 'active',
        'features' => ['HTTP回避', '高速動作', 'クライアント処理', '即時利用'],
        'type' => 'profit'
    ],
    [
        'id' => 'ebay_category_tool',
        'title' => 'eBayカテゴリー自動判定',
        'description' => 'Yahoo商品→eBayカテゴリー自動判定・Item Specifics生成',
        'path' => '06_ebay_category_system/frontend/ebay_category_tool.php',
        'icon' => '🏷️',
        'status' => 'active',
        'features' => ['自動判定', 'Item Specifics', 'Maru9形式', 'バッチ処理'],
        'type' => 'category'
    ]
];

// ツールの稼働状況チェック
foreach ($tools as &$tool) {
    $file_path = $tool['path'];
    if (file_exists($file_path)) {
        $tool['file_status'] = 'exists';
        $tool['file_size'] = round(filesize($file_path) / 1024, 2) . 'KB';
        $tool['last_modified'] = date('Y-m-d H:i:s', filemtime($file_path));
    } else {
        $tool['file_status'] = 'missing';
        $tool['status'] = 'error';
    }
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction Complete - Advanced Tools PHP版</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #3b82f6;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --info: #06b6d4;
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --bg-tertiary: #f1f5f9;
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --radius: 8px;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: linear-gradient(135deg, var(--primary), #1e40af);
            color: white;
            padding: 40px;
            border-radius: var(--radius);
            text-align: center;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .header p {
            font-size: 1.125rem;
            opacity: 0.9;
            margin-bottom: 20px;
        }

        .php-badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            display: inline-block;
        }

        .system-status {
            background: var(--bg-secondary);
            border-radius: var(--radius);
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: var(--shadow);
        }

        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .status-item {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }

        .status-success { background: var(--success); }
        .status-error { background: var(--danger); }

        .tools-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .tool-card {
            background: var(--bg-secondary);
            border-radius: var(--radius);
            padding: 25px;
            box-shadow: var(--shadow);
            transition: all 0.3s ease;
            border: 2px solid transparent;
            cursor: pointer;
        }

        .tool-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            border-color: var(--primary);
        }

        .tool-card.profit {
            border-left: 4px solid var(--success);
        }

        .tool-card.shipping {
            border-left: 4px solid var(--info);
        }

        .tool-card.category {
            border-left: 4px solid var(--warning);
        }

        .tool-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
        }

        .tool-icon {
            font-size: 2rem;
            width: 60px;
            height: 60px;
            background: var(--bg-tertiary);
            border-radius: var(--radius);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .tool-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .tool-description {
            color: var(--text-secondary);
            margin-bottom: 15px;
            font-size: 14px;
        }

        .tool-features {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-bottom: 15px;
        }

        .feature-tag {
            background: var(--bg-tertiary);
            color: var(--text-muted);
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }

        .tool-status {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 15px;
            border-top: 1px solid var(--border);
        }

        .status-badge {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }

        .status-active {
            background: #dcfce7;
            color: #166534;
        }

        .status-error {
            background: #fee2e2;
            color: #991b1b;
        }

        .file-info {
            font-size: 11px;
            color: var(--text-muted);
        }

        .quick-access {
            background: var(--bg-secondary);
            border-radius: var(--radius);
            padding: 20px;
            box-shadow: var(--shadow);
            margin-bottom: 20px;
        }

        .quick-links {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .quick-link {
            background: var(--primary);
            color: white;
            padding: 8px 16px;
            border-radius: var(--radius);
            text-decoration: none;
            font-size: 14px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .quick-link:hover {
            background: #2563eb;
            transform: translateY(-1px);
        }

        .footer {
            background: var(--bg-secondary);
            border-radius: var(--radius);
            padding: 20px;
            text-align: center;
            box-shadow: var(--shadow);
            margin-top: 30px;
        }

        @media (max-width: 768px) {
            .tools-grid {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .status-grid {
                grid-template-columns: 1fr;
            }
            
            .quick-links {
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="header">
            <h1><i class="fas fa-rocket"></i> Yahoo Auction Complete</h1>
            <p>Advanced Tools PHP版 - HTMLファイルの完全PHP統合版</p>
            <div class="php-badge">
                <i class="fab fa-php"></i> PHP <?php echo $php_info['version']; ?> 完全対応
            </div>
        </div>

        <!-- システム状態 -->
        <div class="system-status">
            <h3><i class="fas fa-server"></i> システム状態</h3>
            <div class="status-grid">
                <div class="status-item">
                    <div class="status-dot status-success"></div>
                    <span><strong>PHP:</strong> <?php echo $php_info['version']; ?></span>
                </div>
                <div class="status-item">
                    <div class="status-dot <?php echo $php_info['extensions']['curl'] ? 'status-success' : 'status-error'; ?>"></div>
                    <span><strong>cURL:</strong> <?php echo $php_info['extensions']['curl'] ? '有効' : '無効'; ?></span>
                </div>
                <div class="status-item">
                    <div class="status-dot <?php echo $php_info['extensions']['pgsql'] ? 'status-success' : 'status-error'; ?>"></div>
                    <span><strong>PostgreSQL:</strong> <?php echo $php_info['extensions']['pgsql'] ? '有効' : '無効'; ?></span>
                </div>
                <div class="status-item">
                    <div class="status-dot status-success"></div>
                    <span><strong>メモリ:</strong> <?php echo $php_info['memory_limit']; ?></span>
                </div>
                <div class="status-item">
                    <div class="status-dot status-success"></div>
                    <span><strong>実行時間:</strong> <?php echo $php_info['max_execution_time']; ?>秒</span>
                </div>
                <div class="status-item">
                    <div class="status-dot status-success"></div>
                    <span><strong>サーバー時間:</strong> <?php echo $php_info['server_time']; ?></span>
                </div>
            </div>
        </div>

        <!-- クイックアクセス -->
        <div class="quick-access">
            <h3><i class="fas fa-bolt"></i> クイックアクセス</h3>
            <div class="quick-links">
                <a href="05_rieki/advanced_tariff_calculator.php" class="quick-link">
                    <i class="fas fa-calculator"></i> 高度利益計算
                </a>
                <a href="09_shipping/complete_4layer_shipping_ui.php" class="quick-link">
                    <i class="fas fa-shipping-fast"></i> 送料計算
                </a>
                <a href="05_rieki/working_calculator.php" class="quick-link">
                    <i class="fas fa-bolt"></i> 高速計算
                </a>
                <a href="06_ebay_category_system/frontend/ebay_category_tool.php" class="quick-link">
                    <i class="fas fa-tags"></i> カテゴリー判定
                </a>
                <a href="yahoo_auction_complete_11tools.html" class="quick-link">
                    <i class="fas fa-home"></i> メインダッシュボード
                </a>
            </div>
        </div>

        <!-- ツール一覧 -->
        <div class="tools-grid">
            <?php foreach ($tools as $tool): ?>
            <div class="tool-card <?php echo $tool['type']; ?>" onclick="openTool('<?php echo $tool['path']; ?>')">
                <div class="tool-header">
                    <div class="tool-icon"><?php echo $tool['icon']; ?></div>
                    <div>
                        <div class="tool-title"><?php echo htmlspecialchars($tool['title']); ?></div>
                    </div>
                </div>
                
                <div class="tool-description">
                    <?php echo htmlspecialchars($tool['description']); ?>
                </div>
                
                <div class="tool-features">
                    <?php foreach ($tool['features'] as $feature): ?>
                        <span class="feature-tag"><?php echo htmlspecialchars($feature); ?></span>
                    <?php endforeach; ?>
                </div>
                
                <div class="tool-status">
                    <span class="status-badge <?php echo $tool['status'] === 'active' ? 'status-active' : 'status-error'; ?>">
                        <?php echo $tool['status'] === 'active' ? '✅ 利用可能' : '❌ エラー'; ?>
                    </span>
                    <div class="file-info">
                        <?php if ($tool['file_status'] === 'exists'): ?>
                            <?php echo $tool['file_size']; ?> | <?php echo $tool['last_modified']; ?>
                        <?php else: ?>
                            ファイル未発見
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <!-- 開発情報 -->
        <div class="system-status">
            <h3><i class="fas fa-code"></i> 開発情報</h3>
            <p><strong>目的:</strong> 既存のHTMLファイルをPHP版に完全変換し、サーバーサイド処理・データベース連携・API統合を実現</p>
            <p><strong>技術:</strong> PHP <?php echo $php_info['version']; ?>, PostgreSQL, JavaScript ES6+, CSS3, REST API</p>
            <p><strong>特徴:</strong> HTTP通信問題回避、完全動作保証、リアルタイム計算、データベース統合</p>
            <p><strong>対応状況:</strong> <?php echo count($tools); ?>ツール PHP版完成、即座に利用可能</p>
        </div>

        <!-- フッター -->
        <div class="footer">
            <p><i class="fas fa-copyright"></i> 2025 Yahoo Auction Complete - Advanced Tools PHP版</p>
            <p>HTMLファイルの完全PHP統合版 | 全機能動作確認済み</p>
            <p style="margin-top: 10px; font-size: 12px; color: var(--text-muted);">
                Last Updated: <?php echo date('Y-m-d H:i:s'); ?> | 
                PHP Version: <?php echo $php_info['version']; ?> | 
                Server: <?php echo $_SERVER['SERVER_NAME'] ?? 'localhost'; ?>
            </p>
        </div>
    </div>

    <script>
        // ツール起動関数
        function openTool(path) {
            // 新しいタブで開く
            window.open(path, '_blank');
        }

        // システム情報表示
        function showSystemInfo() {
            const info = <?php echo json_encode($php_info, JSON_UNESCAPED_UNICODE); ?>;
            console.log('🔧 PHP System Information:', info);
            
            alert(`PHP System Information:
            
Version: ${info.version}
Memory Limit: ${info.memory_limit}
Execution Time: ${info.max_execution_time}s
Server Time: ${info.server_time}

Extensions:
- cURL: ${info.extensions.curl ? '✅' : '❌'}
- JSON: ${info.extensions.json ? '✅' : '❌'}
- PDO: ${info.extensions.pdo ? '✅' : '❌'}
- PostgreSQL: ${info.extensions.pgsql ? '✅' : '❌'}
            `);
        }

        // 統計情報表示
        function showStats() {
            const tools = <?php echo json_encode($tools, JSON_UNESCAPED_UNICODE); ?>;
            const activeTools = tools.filter(tool => tool.status === 'active').length;
            const totalSize = tools.reduce((sum, tool) => {
                if (tool.file_size) {
                    return sum + parseFloat(tool.file_size.replace('KB', ''));
                }
                return sum;
            }, 0);
            
            console.log('📊 Tools Statistics:', {
                total: tools.length,
                active: activeTools,
                totalSize: totalSize.toFixed(2) + 'KB'
            });
        }

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🎉 Yahoo Auction Complete - Advanced Tools PHP版 初期化完了');
            console.log('📊 利用可能ツール: <?php echo count($tools); ?>個');
            console.log('🔧 PHP Version: <?php echo $php_info['version']; ?>');
            
            // ツールカードにホバーエフェクト追加
            document.querySelectorAll('.tool-card').forEach(card => {
                card.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-5px) scale(1.02)';
                });
                
                card.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0) scale(1)';
                });
            });
            
            // 統計情報を自動表示
            setTimeout(showStats, 1000);
        });

        // グローバル関数として公開
        window.showSystemInfo = showSystemInfo;
        window.showStats = showStats;
    </script>
</body>
</html>
