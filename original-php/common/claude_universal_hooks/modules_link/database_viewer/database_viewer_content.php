<?php
/**
 * N3 Database Viewer - データベース表示専用ページ
 * universal_data_hub のデータベースデータ表示専用
 * 作成日: 2025-08-25
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

// CSRF トークン生成
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
$csrf_token = isset($_SESSION['csrf_token']) ? $_SESSION['csrf_token'] : bin2hex(random_bytes(32));

// PostgreSQL データベース接続設定（universal_data_hub準拠）
$pg_configs = [
    ['host' => 'localhost', 'port' => 5432, 'user' => 'postgres', 'pass' => 'Kn240914', 'dbname' => 'nagano3_db'],
    ['host' => 'localhost', 'port' => 5432, 'user' => 'postgres', 'pass' => 'postgres', 'dbname' => 'nagano3_db'],
    ['host' => 'localhost', 'port' => 5432, 'user' => 'postgres', 'pass' => 'Kn240914', 'dbname' => 'ebay_kanri_db'],
    ['host' => 'localhost', 'port' => 5432, 'user' => 'postgres', 'pass' => '', 'dbname' => 'nagano3_db']
];

$connection_info = null;
$database_data = [];
$error_message = '';

// データベース接続試行
foreach ($pg_configs as $config) {
    try {
        $dsn = "pgsql:host={$config['host']};port={$config['port']};dbname={$config['dbname']}";
        $pdo = new PDO($dsn, $config['user'], $config['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 5
        ]);
        
        $connection_info = $config;
        break;
    } catch (PDOException $e) {
        continue;
    }
}

if (!$connection_info) {
    $error_message = 'データベース接続に失敗しました。設定を確認してください。';
} else {
    // データベース情報取得
    try {
        // テーブル一覧取得
        $tables_stmt = $pdo->query("
            SELECT 
                table_name, 
                table_schema,
                table_type
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            ORDER BY table_name
        ");
        $tables = $tables_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 各テーブルの詳細情報取得
        foreach ($tables as &$table) {
            try {
                // レコード数取得
                $count_stmt = $pdo->query("SELECT COUNT(*) as count FROM {$table['table_name']}");
                $table['record_count'] = $count_stmt->fetch()['count'];
                
                // カラム情報取得
                $columns_stmt = $pdo->query("
                    SELECT 
                        column_name, 
                        data_type, 
                        is_nullable,
                        column_default
                    FROM information_schema.columns 
                    WHERE table_name = '{$table['table_name']}'
                    ORDER BY ordinal_position
                ");
                $table['columns'] = $columns_stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // サンプルデータ取得（最大10件）
                $sample_stmt = $pdo->query("SELECT * FROM {$table['table_name']} LIMIT 10");
                $table['sample_data'] = $sample_stmt->fetchAll(PDO::FETCH_ASSOC);
                
            } catch (PDOException $e) {
                $table['error'] = $e->getMessage();
            }
        }
        
        $database_data = $tables;
        
    } catch (PDOException $e) {
        $error_message = 'データ取得中にエラーが発生しました: ' . $e->getMessage();
    }
}

// ヘルパー関数
function formatDataValue($value) {
    if (is_null($value)) {
        return '<span class="null-value">NULL</span>';
    }
    
    if (is_bool($value)) {
        return $value ? '<span class="bool-true">TRUE</span>' : '<span class="bool-false">FALSE</span>';
    }
    
    if (is_numeric($value)) {
        return '<span class="numeric-value">' . htmlspecialchars($value) . '</span>';
    }
    
    // 長いテキストは省略
    $text = htmlspecialchars($value);
    if (strlen($text) > 50) {
        return '<span class="text-value" title="' . $text . '">' . substr($text, 0, 47) . '...</span>';
    }
    
    return '<span class="text-value">' . $text . '</span>';
}

function getDataTypeIcon($type) {
    $icons = [
        'integer' => 'fas fa-hashtag',
        'bigint' => 'fas fa-hashtag',
        'text' => 'fas fa-align-left',
        'varchar' => 'fas fa-font',
        'boolean' => 'fas fa-toggle-on',
        'timestamp' => 'fas fa-clock',
        'date' => 'fas fa-calendar',
        'json' => 'fas fa-code',
        'numeric' => 'fas fa-calculator'
    ];
    
    foreach ($icons as $pattern => $icon) {
        if (strpos(strtolower($type), $pattern) !== false) {
            return $icon;
        }
    }
    
    return 'fas fa-question';
}
?>

<!-- N3 Database Viewer CSS読み込み -->
<link rel="stylesheet" href="modules/database_viewer/css/database_viewer.css">

<!-- N3 Database Viewer - Main Content -->
<div class="n3-database-viewer-container">
    
    <!-- ページヘッダー -->
    <div class="n3-page-header">
        <div class="n3-header-content">
            <div class="n3-header-left">
                <h1 class="n3-page-title">
                    <i class="fas fa-database"></i>
                    N3 Database Viewer
                </h1>
                <p class="n3-page-subtitle">PostgreSQL データベース表示専用システム - universal_data_hub 連携版</p>
            </div>
            <div class="n3-header-right">
                <button class="btn btn--primary" onclick="refreshData()">
                    <i class="fas fa-sync-alt"></i>
                    データ更新
                </button>
                <button class="btn btn--secondary" onclick="exportData()">
                    <i class="fas fa-download"></i>
                    データ出力
                </button>
            </div>
        </div>
        
        <!-- 接続状態表示 -->
        <div class="n3-connection-status">
            <?php if ($connection_info): ?>
            <div class="connection-success">
                <i class="fas fa-check-circle"></i>
                <span>PostgreSQL 接続成功: <?= htmlspecialchars($connection_info['dbname']) ?> @ <?= htmlspecialchars($connection_info['host']) ?></span>
                <span class="connection-details">ユーザー: <?= htmlspecialchars($connection_info['user']) ?></span>
            </div>
            <?php else: ?>
            <div class="connection-error">
                <i class="fas fa-exclamation-triangle"></i>
                <span>データベース接続エラー</span>
            </div>
            <?php endif; ?>
        </div>
    </div>
    
    <!-- エラー表示 -->
    <?php if (!empty($error_message)): ?>
    <div class="n3-error-container">
        <div class="n3-error-content">
            <i class="fas fa-exclamation-triangle"></i>
            <div>
                <h3>エラーが発生しました</h3>
                <p><?= htmlspecialchars($error_message) ?></p>
            </div>
        </div>
        <div class="n3-error-actions">
            <button class="btn btn--primary" onclick="location.reload()">
                <i class="fas fa-redo"></i> 再試行
            </button>
            <a href="?page=universal_data_hub" class="btn btn--secondary">
                <i class="fas fa-arrow-left"></i> Universal Data Hub へ
            </a>
        </div>
    </div>
    <?php endif; ?>
    
    <!-- データベース情報表示 -->
    <?php if (!empty($database_data)): ?>
    
    <!-- 概要統計 -->
    <div class="n3-overview-stats">
        <div class="n3-stat-card">
            <div class="n3-stat-icon">
                <i class="fas fa-table"></i>
            </div>
            <div class="n3-stat-content">
                <div class="n3-stat-value"><?= count($database_data) ?></div>
                <div class="n3-stat-label">テーブル数</div>
            </div>
        </div>
        
        <div class="n3-stat-card">
            <div class="n3-stat-icon">
                <i class="fas fa-list"></i>
            </div>
            <div class="n3-stat-content">
                <div class="n3-stat-value"><?= array_sum(array_column($database_data, 'record_count')) ?></div>
                <div class="n3-stat-label">総レコード数</div>
            </div>
        </div>
        
        <div class="n3-stat-card">
            <div class="n3-stat-icon">
                <i class="fas fa-server"></i>
            </div>
            <div class="n3-stat-content">
                <div class="n3-stat-value"><?= htmlspecialchars($connection_info['dbname']) ?></div>
                <div class="n3-stat-label">データベース名</div>
            </div>
        </div>
        
        <div class="n3-stat-card">
            <div class="n3-stat-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="n3-stat-content">
                <div class="n3-stat-value">正常</div>
                <div class="n3-stat-label">接続状態</div>
            </div>
        </div>
    </div>
    
    <!-- テーブル一覧 -->
    <div class="n3-tables-container">
        <h2 class="n3-section-title">
            <i class="fas fa-table"></i> テーブル一覧とデータ
        </h2>
        
        <?php foreach ($database_data as $table): ?>
        <div class="n3-table-section" id="table-<?= htmlspecialchars($table['table_name']) ?>">
            <div class="n3-table-header">
                <div class="n3-table-title">
                    <h3>
                        <i class="fas fa-table"></i>
                        <?= htmlspecialchars($table['table_name']) ?>
                    </h3>
                    <div class="n3-table-meta">
                        <span class="n3-table-schema">スキーマ: <?= htmlspecialchars($table['table_schema']) ?></span>
                        <span class="n3-table-type"><?= htmlspecialchars($table['table_type']) ?></span>
                        <span class="n3-record-count"><?= number_format($table['record_count']) ?> 件</span>
                    </div>
                </div>
                
                <div class="n3-table-actions">
                    <button class="btn btn--sm btn--secondary" onclick="toggleTableDetails('<?= htmlspecialchars($table['table_name']) ?>')">
                        <i class="fas fa-eye"></i> 詳細
                    </button>
                    <button class="btn btn--sm btn--info" onclick="exportTable('<?= htmlspecialchars($table['table_name']) ?>')">
                        <i class="fas fa-download"></i> 出力
                    </button>
                </div>
            </div>
            
            <?php if (isset($table['error'])): ?>
            <div class="n3-table-error">
                <i class="fas fa-exclamation-triangle"></i>
                エラー: <?= htmlspecialchars($table['error']) ?>
            </div>
            <?php else: ?>
            
            <!-- カラム情報 -->
            <div class="n3-columns-info">
                <h4>カラム構成 (<?= count($table['columns']) ?> カラム)</h4>
                <div class="n3-columns-grid">
                    <?php foreach ($table['columns'] as $column): ?>
                    <div class="n3-column-item">
                        <div class="n3-column-header">
                            <i class="<?= getDataTypeIcon($column['data_type']) ?>"></i>
                            <strong><?= htmlspecialchars($column['column_name']) ?></strong>
                        </div>
                        <div class="n3-column-details">
                            <span class="n3-data-type"><?= htmlspecialchars($column['data_type']) ?></span>
                            <span class="n3-nullable"><?= $column['is_nullable'] === 'YES' ? 'NULL可' : 'NOT NULL' ?></span>
                            <?php if ($column['column_default']): ?>
                            <span class="n3-default" title="デフォルト値: <?= htmlspecialchars($column['column_default']) ?>">DEF</span>
                            <?php endif; ?>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            
            <!-- サンプルデータ -->
            <?php if (!empty($table['sample_data'])): ?>
            <div class="n3-sample-data">
                <h4>サンプルデータ (最大10件表示)</h4>
                <div class="n3-data-table-wrapper">
                    <table class="n3-data-table">
                        <thead>
                            <tr>
                                <?php foreach (array_keys($table['sample_data'][0]) as $column): ?>
                                <th><?= htmlspecialchars($column) ?></th>
                                <?php endforeach; ?>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($table['sample_data'] as $row): ?>
                            <tr>
                                <?php foreach ($row as $value): ?>
                                <td><?= formatDataValue($value) ?></td>
                                <?php endforeach; ?>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
            <?php else: ?>
            <div class="n3-no-data">
                <i class="fas fa-inbox"></i>
                <p>このテーブルにはデータがありません</p>
            </div>
            <?php endif; ?>
            
            <?php endif; ?>
        </div>
        <?php endforeach; ?>
    </div>
    
    <?php endif; ?>
    
    <!-- 操作パネル -->
    <div class="n3-operation-panel">
        <h3>
            <i class="fas fa-cogs"></i> データベース操作
        </h3>
        
        <div class="n3-operation-buttons">
            <a href="?page=universal_data_hub" class="btn btn--primary">
                <i class="fas fa-arrow-left"></i> Universal Data Hub へ戻る
            </a>
            <button class="btn btn--info" onclick="showConnectionInfo()">
                <i class="fas fa-info-circle"></i> 接続情報
            </button>
            <button class="btn btn--success" onclick="runHealthCheck()">
                <i class="fas fa-heart"></i> ヘルスチェック
            </button>
            <button class="btn btn--warning" onclick="optimizeDatabase()">
                <i class="fas fa-tachometer-alt"></i> 最適化
            </button>
        </div>
    </div>
    
</div>

<!-- JavaScript機能 -->
<script>
// グローバル変数
window.DATABASE_VIEWER = {
    csrf_token: "<?= $csrf_token ?>",
    connection_info: <?= json_encode($connection_info) ?>,
    tables: <?= json_encode($database_data) ?>
};

// データ更新
function refreshData() {
    console.log('🔄 データベースデータ更新中...');
    location.reload();
}

// データ出力
function exportData() {
    alert('📊 全データベースデータの出力機能\n\n実装準備中です。\n現在は各テーブル個別の出力をご利用ください。');
}

// テーブル出力
function exportTable(tableName) {
    alert(`📋 テーブル「${tableName}」のデータ出力\n\n実装準備中です。\nCSV形式での出力を準備しています。`);
}

// テーブル詳細切り替え
function toggleTableDetails(tableName) {
    const section = document.getElementById(`table-${tableName}`);
    const sampleData = section.querySelector('.n3-sample-data');
    const columnsInfo = section.querySelector('.n3-columns-info');
    
    if (sampleData && columnsInfo) {
        const isVisible = sampleData.style.display !== 'none';
        sampleData.style.display = isVisible ? 'none' : 'block';
        columnsInfo.style.display = isVisible ? 'none' : 'block';
    }
}

// 接続情報表示
function showConnectionInfo() {
    const info = window.DATABASE_VIEWER.connection_info;
    if (info) {
        alert(`📊 データベース接続情報

🏠 ホスト: ${info.host}:${info.port}
🗄️ データベース: ${info.dbname}
👤 ユーザー: ${info.user}
✅ 状態: 接続成功

このデータベースは universal_data_hub システムで使用されています。`);
    } else {
        alert('❌ データベース接続情報が取得できません');
    }
}

// ヘルスチェック
async function runHealthCheck() {
    try {
        console.log('🏥 データベースヘルスチェック実行中...');
        
        // 簡易ヘルスチェック（実際のAPIコールに置き換え可能）
        const stats = window.DATABASE_VIEWER.tables;
        const totalTables = stats.length;
        const totalRecords = stats.reduce((sum, table) => sum + (table.record_count || 0), 0);
        const errorTables = stats.filter(table => table.error).length;
        
        alert(`🏥 データベースヘルスチェック結果

📊 テーブル数: ${totalTables}
📝 総レコード数: ${totalRecords.toLocaleString()}
❌ エラーテーブル数: ${errorTables}
✅ 健康度: ${errorTables === 0 ? '100%' : Math.round((totalTables - errorTables) / totalTables * 100) + '%'}

${errorTables === 0 ? '🎉 データベースは正常に動作しています！' : '⚠️ 一部テーブルにエラーがあります。'}`);
        
    } catch (error) {
        console.error('ヘルスチェックエラー:', error);
        alert('❌ ヘルスチェック実行中にエラーが発生しました。');
    }
}

// データベース最適化
function optimizeDatabase() {
    alert('⚡ データベース最適化機能\n\n🔧 実装予定の機能:\n\n• インデックス最適化\n• クエリパフォーマンス分析\n• ストレージ使用量分析\n• 不要データクリーンアップ\n\n現在開発中です。');
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🗄️ N3 Database Viewer 初期化完了');
    console.log('📊 接続情報:', window.DATABASE_VIEWER.connection_info);
    console.log('📋 テーブル数:', window.DATABASE_VIEWER.tables.length);
    
    // 統計情報をコンソールに表示
    const totalRecords = window.DATABASE_VIEWER.tables.reduce((sum, table) => sum + (table.record_count || 0), 0);
    console.log('📝 総レコード数:', totalRecords);
    
    // 成功メッセージ
    setTimeout(() => {
        console.log('✅ Database Viewer 準備完了 - データ表示中');
    }, 1000);
});
</script>
