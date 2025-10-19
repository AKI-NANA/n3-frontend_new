<?php
/**
 * eBayテストビューアー完全データ項目表示システム
 * N3準拠 - インライン汚染なし - 外部JS専用
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

require_once(__DIR__ . '/../../common/config/database.php');

try {
    $pdo = getDBConnection();
    
    // 全カラム情報取得
    $columnQuery = $pdo->query("
        SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ebay_complete_api_data'
        ORDER BY ordinal_position
    ");
    $columns = $columnQuery->fetchAll(PDO::FETCH_ASSOC);
    
    // サンプルデータ取得（全カラム）
    $sampleQuery = $pdo->query("
        SELECT * FROM ebay_complete_api_data 
        ORDER BY updated_at DESC 
        LIMIT 10
    ");
    $sampleData = $sampleQuery->fetchAll(PDO::FETCH_ASSOC);
    
    // データ完全性チェック
    $completenessData = [];
    foreach ($columns as $column) {
        $colName = $column['column_name'];
        $checkQuery = $pdo->prepare("
            SELECT 
                COUNT(*) as total,
                COUNT($colName) as filled,
                ROUND(COUNT($colName) * 100.0 / COUNT(*), 2) as percentage
            FROM ebay_complete_api_data
        ");
        $checkQuery->execute();
        $result = $checkQuery->fetch(PDO::FETCH_ASSOC);
        
        $completenessData[$colName] = [
            'total' => $result['total'],
            'filled' => $result['filled'],
            'percentage' => $result['percentage']
        ];
    }
    
} catch (Exception $e) {
    error_log("Database error: " . $e->getMessage());
    $columns = [];
    $sampleData = [];
    $completenessData = [];
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eBayデータ完全項目表示システム</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <!-- N3準拠: 外部CSSファイル参照のみ -->
    <link rel="stylesheet" href="/css_button_visibility_fix.css">
    <link rel="stylesheet" href="../../common/css/components/ebay_complete_data_viewer.css">
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-database"></i> eBayデータ完全項目表示システム</h1>
            <p>データベース全項目の可視化・画像表示・HTML商品説明・データ完全性分析</p>
        </div>
        
        <!-- 完全性統計 -->
        <div class="completeness-overview">
            <h2><i class="fas fa-chart-pie"></i> データ完全性概要</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number"><?= count($columns) ?></div>
                    <div class="stat-label">総カラム数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number"><?= count($sampleData) ?></div>
                    <div class="stat-label">総商品数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="avg-completeness">-</div>
                    <div class="stat-label">平均完全性</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="image-fields">-</div>
                    <div class="stat-label">画像フィールド</div>
                </div>
            </div>
        </div>
        
        <!-- 全カラム詳細表示 -->
        <div class="columns-section">
            <h2><i class="fas fa-columns"></i> 全データ項目詳細</h2>
            <div class="filter-controls">
                <input type="text" id="column-filter" placeholder="項目名で絞り込み...">
                <select id="completeness-filter">
                    <option value="">すべて表示</option>
                    <option value="high">完全性80%以上</option>
                    <option value="medium">完全性50-80%</option>
                    <option value="low">完全性50%未満</option>
                    <option value="empty">データなし</option>
                </select>
            </div>
            
            <div class="columns-grid" id="columns-grid">
                <?php foreach ($columns as $column): 
                    $colName = $column['column_name'];
                    $completeness = $completenessData[$colName] ?? ['total' => 0, 'filled' => 0, 'percentage' => 0];
                    $percentage = $completeness['percentage'];
                    
                    $statusClass = '';
                    if ($percentage >= 80) $statusClass = 'status-excellent';
                    elseif ($percentage >= 50) $statusClass = 'status-good';
                    elseif ($percentage > 0) $statusClass = 'status-poor';
                    else $statusClass = 'status-empty';
                    
                    $isImageField = strpos($colName, 'image') !== false || 
                                   strpos($colName, 'picture') !== false || 
                                   strpos($colName, 'gallery') !== false;
                    $isDescriptionField = strpos($colName, 'description') !== false;
                ?>
                <div class="column-card <?= $statusClass ?>" data-column="<?= $colName ?>">
                    <div class="column-header">
                        <h3><?= ucfirst(str_replace('_', ' ', $colName)) ?></h3>
                        <div class="column-badges">
                            <?php if ($isImageField): ?>
                                <span class="badge badge-image"><i class="fas fa-image"></i> 画像</span>
                            <?php endif; ?>
                            <?php if ($isDescriptionField): ?>
                                <span class="badge badge-html"><i class="fas fa-code"></i> HTML</span>
                            <?php endif; ?>
                        </div>
                    </div>
                    
                    <div class="column-details">
                        <div class="detail-row">
                            <span class="label">フィールド名:</span>
                            <code><?= $colName ?></code>
                        </div>
                        <div class="detail-row">
                            <span class="label">データ型:</span>
                            <span><?= $column['data_type'] ?></span>
                        </div>
                        <div class="detail-row">
                            <span class="label">NULL許可:</span>
                            <span><?= $column['is_nullable'] === 'YES' ? '可' : '不可' ?></span>
                        </div>
                        <div class="detail-row">
                            <span class="label">データ完全性:</span>
                            <div class="completeness-bar">
                                <div class="completeness-fill" style="width: <?= $percentage ?>%"></div>
                                <span class="completeness-text"><?= $percentage ?>%</span>
                            </div>
                        </div>
                        <div class="detail-row">
                            <span class="label">データ状況:</span>
                            <span><?= $completeness['filled'] ?>件 / <?= $completeness['total'] ?>件</span>
                        </div>
                    </div>
                    
                    <div class="column-actions">
                        <button class="btn-view-samples" onclick="viewColumnSamples('<?= $colName ?>')">
                            <i class="fas fa-eye"></i> サンプル表示
                        </button>
                        <?php if ($isImageField): ?>
                        <button class="btn-test-images" onclick="testImageField('<?= $colName ?>')">
                            <i class="fas fa-image"></i> 画像テスト
                        </button>
                        <?php endif; ?>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
        
        <!-- サンプルデータ表示 -->
        <div class="samples-section">
            <h2><i class="fas fa-table"></i> 実際のデータサンプル</h2>
            <div class="view-controls">
                <button class="btn-view-mode active" data-mode="table">テーブル表示</button>
                <button class="btn-view-mode" data-mode="cards">カード表示</button>
                <button class="btn-view-mode" data-mode="images">画像専用表示</button>
            </div>
            
            <div id="samples-container">
                <!-- 動的生成 -->
            </div>
        </div>
        
        <!-- モーダル -->
        <div id="sample-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modal-title">サンプルデータ</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" id="modal-body">
                    <!-- 動的生成 -->
                </div>
            </div>
        </div>
    </div>
    
    <!-- N3準拠: 外部JSファイル参照のみ -->
    <script src="../../common/js/components/ebay_complete_data_viewer.js"></script>
    <script>
        // データ埋め込み（N3許可済み）
        window.EBAY_COLUMNS = <?= json_encode($columns, JSON_UNESCAPED_UNICODE) ?>;
        window.EBAY_SAMPLE_DATA = <?= json_encode($sampleData, JSON_UNESCAPED_UNICODE) ?>;
        window.EBAY_COMPLETENESS = <?= json_encode($completenessData, JSON_UNESCAPED_UNICODE) ?>;
        
        // 初期化（外部JSファイルで処理）
        document.addEventListener('DOMContentLoaded', function() {
            window.EbayCompleteDataViewer.init();
        });
    </script>
</body>
</html>
