<?php
/**
 * サイズ補正設定管理システム
 * 梱包時のサイズ・重量補正設定をデータベースで管理
 */

// エラー表示設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

// データベース接続
function getDatabaseConnection() {
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        return $pdo;
    } catch (PDOException $e) {
        throw new Exception('データベース接続失敗: ' . $e->getMessage());
    }
}

// JSON APIリクエスト処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' && 
    strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
    
    header('Content-Type: application/json; charset=utf-8');
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    try {
        $pdo = getDatabaseConnection();
        
        switch ($action) {
            case 'get_settings':
                $result = getAllCorrectionSettings($pdo);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
                
            case 'save_setting':
                $result = saveCorrectionSetting($pdo, $input['setting']);
                echo json_encode(['success' => true, 'message' => '設定を保存しました', 'id' => $result]);
                break;
                
            case 'delete_setting':
                $result = deleteCorrectionSetting($pdo, $input['id']);
                echo json_encode(['success' => true, 'message' => '設定を削除しました']);
                break;
                
            case 'set_default':
                $result = setDefaultSetting($pdo, $input['id']);
                echo json_encode(['success' => true, 'message' => 'デフォルト設定を変更しました']);
                break;
                
            case 'apply_correction':
                $result = applySizeCorrection($pdo, $input['values'], $input['setting_id'] ?? null);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
                
            default:
                echo json_encode(['success' => false, 'error' => '不明なアクション']);
        }
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    
    exit;
}

// 補正設定取得
function getAllCorrectionSettings($pdo) {
    $stmt = $pdo->query("SELECT * FROM v_active_size_corrections ORDER BY priority_order ASC, created_at ASC");
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// 補正設定保存
function saveCorrectionSetting($pdo, $setting) {
    if (isset($setting['id']) && $setting['id']) {
        // 更新
        $sql = "
            UPDATE size_correction_settings SET
                setting_name = ?,
                description = ?,
                weight_correction_type = ?,
                weight_correction_value = ?,
                length_correction_type = ?,
                length_correction_value = ?,
                width_correction_type = ?,
                width_correction_value = ?,
                height_correction_type = ?,
                height_correction_value = ?,
                uniform_size_correction = ?,
                uniform_size_correction_type = ?,
                uniform_size_correction_value = ?,
                product_category = ?,
                weight_range_min = ?,
                weight_range_max = ?,
                is_active = ?,
                notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $setting['setting_name'],
            $setting['description'] ?? '',
            $setting['weight_correction_type'] ?? 'percentage',
            $setting['weight_correction_value'] ?? 5.0,
            $setting['length_correction_type'] ?? 'percentage',
            $setting['length_correction_value'] ?? 10.0,
            $setting['width_correction_type'] ?? 'percentage',
            $setting['width_correction_value'] ?? 10.0,
            $setting['height_correction_type'] ?? 'percentage',
            $setting['height_correction_value'] ?? 10.0,
            $setting['uniform_size_correction'] ?? false,
            $setting['uniform_size_correction_type'] ?? 'percentage',
            $setting['uniform_size_correction_value'] ?? 10.0,
            $setting['product_category'] ?? null,
            $setting['weight_range_min'] ?? null,
            $setting['weight_range_max'] ?? null,
            $setting['is_active'] ?? true,
            $setting['notes'] ?? '',
            $setting['id']
        ]);
        return $setting['id'];
    } else {
        // 新規作成
        $sql = "
            INSERT INTO size_correction_settings (
                setting_name, description,
                weight_correction_type, weight_correction_value,
                length_correction_type, length_correction_value,
                width_correction_type, width_correction_value,
                height_correction_type, height_correction_value,
                uniform_size_correction, uniform_size_correction_type, uniform_size_correction_value,
                product_category, weight_range_min, weight_range_max,
                is_active, notes, priority_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                      COALESCE((SELECT MAX(priority_order) + 1 FROM size_correction_settings), 1))
            RETURNING id
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $setting['setting_name'],
            $setting['description'] ?? '',
            $setting['weight_correction_type'] ?? 'percentage',
            $setting['weight_correction_value'] ?? 5.0,
            $setting['length_correction_type'] ?? 'percentage',
            $setting['length_correction_value'] ?? 10.0,
            $setting['width_correction_type'] ?? 'percentage',
            $setting['width_correction_value'] ?? 10.0,
            $setting['height_correction_type'] ?? 'percentage',
            $setting['height_correction_value'] ?? 10.0,
            $setting['uniform_size_correction'] ?? false,
            $setting['uniform_size_correction_type'] ?? 'percentage',
            $setting['uniform_size_correction_value'] ?? 10.0,
            $setting['product_category'] ?? null,
            $setting['weight_range_min'] ?? null,
            $setting['weight_range_max'] ?? null,
            $setting['is_active'] ?? true,
            $setting['notes'] ?? ''
        ]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['id'];
    }
}

// 補正設定削除
function deleteCorrectionSetting($pdo, $id) {
    $stmt = $pdo->prepare("DELETE FROM size_correction_settings WHERE id = ? AND is_default = false");
    $stmt->execute([$id]);
    if ($stmt->rowCount() == 0) {
        throw new Exception('デフォルト設定は削除できません');
    }
}

// デフォルト設定変更
function setDefaultSetting($pdo, $id) {
    $pdo->beginTransaction();
    try {
        // 全てのデフォルトフラグをクリア
        $pdo->exec("UPDATE size_correction_settings SET is_default = false");
        
        // 指定されたIDをデフォルトに設定
        $stmt = $pdo->prepare("UPDATE size_correction_settings SET is_default = true WHERE id = ?");
        $stmt->execute([$id]);
        
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// サイズ補正適用
function applySizeCorrection($pdo, $values, $setting_id = null) {
    // 設定取得
    if ($setting_id) {
        $stmt = $pdo->prepare("SELECT * FROM size_correction_settings WHERE id = ? AND is_active = true");
        $stmt->execute([$setting_id]);
        $setting = $stmt->fetch(PDO::FETCH_ASSOC);
    } else {
        // デフォルト設定を使用
        $stmt = $pdo->query("SELECT * FROM size_correction_settings WHERE is_default = true AND is_active = true LIMIT 1");
        $setting = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    if (!$setting) {
        throw new Exception('補正設定が見つかりません');
    }
    
    $original_weight = floatval($values['weight'] ?? 0);
    $original_length = floatval($values['length'] ?? 0);
    $original_width = floatval($values['width'] ?? 0);
    $original_height = floatval($values['height'] ?? 0);
    
    // 重量補正
    $corrected_weight = applyCorrection(
        $original_weight, 
        $setting['weight_correction_type'], 
        $setting['weight_correction_value']
    );
    
    // サイズ補正（一括または個別）
    if ($setting['uniform_size_correction']) {
        $corrected_length = applyCorrection($original_length, $setting['uniform_size_correction_type'], $setting['uniform_size_correction_value']);
        $corrected_width = applyCorrection($original_width, $setting['uniform_size_correction_type'], $setting['uniform_size_correction_value']);
        $corrected_height = applyCorrection($original_height, $setting['uniform_size_correction_type'], $setting['uniform_size_correction_value']);
    } else {
        $corrected_length = applyCorrection($original_length, $setting['length_correction_type'], $setting['length_correction_value']);
        $corrected_width = applyCorrection($original_width, $setting['width_correction_type'], $setting['width_correction_value']);
        $corrected_height = applyCorrection($original_height, $setting['height_correction_type'], $setting['height_correction_value']);
    }
    
    // 容積重量計算
    $volumetric_weight = 0;
    if ($corrected_length > 0 && $corrected_width > 0 && $corrected_height > 0) {
        $volumetric_weight = ($corrected_length * $corrected_width * $corrected_height) / 5000;
    }
    
    // 課金重量
    $chargeable_weight = max($corrected_weight, $volumetric_weight);
    
    return [
        'setting_used' => $setting['setting_name'],
        'original' => [
            'weight' => $original_weight,
            'length' => $original_length,
            'width' => $original_width,
            'height' => $original_height
        ],
        'corrected' => [
            'weight' => round($corrected_weight, 3),
            'length' => round($corrected_length, 2),
            'width' => round($corrected_width, 2),
            'height' => round($corrected_height, 2)
        ],
        'calculated' => [
            'volumetric_weight' => round($volumetric_weight, 3),
            'chargeable_weight' => round($chargeable_weight, 3)
        ],
        'corrections_applied' => [
            'weight' => sprintf('%+.1f%%', (($corrected_weight - $original_weight) / max($original_weight, 0.001)) * 100),
            'length' => sprintf('%+.1f%%', (($corrected_length - $original_length) / max($original_length, 0.001)) * 100),
            'width' => sprintf('%+.1f%%', (($corrected_width - $original_width) / max($original_width, 0.001)) * 100),
            'height' => sprintf('%+.1f%%', (($corrected_height - $original_height) / max($original_height, 0.001)) * 100)
        ]
    ];
}

// 補正値適用関数
function applyCorrection($original_value, $correction_type, $correction_value) {
    switch ($correction_type) {
        case 'percentage':
            return $original_value * (1 + ($correction_value / 100));
        case 'fixed':
            return $original_value + $correction_value;
        case 'formula':
            // 将来的な拡張用
            return $original_value * 1.1; // デフォルト10%増
        default:
            return $original_value;
    }
}

// 初期データベースセットアップ確認
try {
    $pdo = getDatabaseConnection();
    
    // テーブル存在確認
    $stmt = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'size_correction_settings'");
    $table_exists = $stmt->fetchColumn() > 0;
    
    $db_status = $table_exists ? 'ready' : 'need_setup';
    
} catch (Exception $e) {
    $db_status = 'error';
    $db_error = $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>サイズ補正設定管理システム</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: rgba(255,255,255,0.95);
            color: #1e293b;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .header h1 {
            font-size: 2.2rem;
            margin-bottom: 10px;
            color: #374151;
        }

        .db-status {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            margin-top: 10px;
        }

        .db-ready { background: #10b981; color: white; }
        .db-error { background: #ef4444; color: white; }
        .db-setup { background: #f59e0b; color: white; }

        .main-grid {
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 30px;
        }

        .settings-panel, .test-panel {
            background: rgba(255,255,255,0.95);
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
        }

        .panel-title {
            font-size: 1.4rem;
            font-weight: 700;
            color: #374151;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
        }

        .btn-primary {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
        }

        .btn-success {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
        }

        .btn-danger {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
        }

        .btn-secondary {
            background: #f8fafc;
            color: #475569;
            border: 2px solid #e2e8f0;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .settings-list {
            max-height: 500px;
            overflow-y: auto;
        }

        .setting-item {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            transition: all 0.3s;
        }

        .setting-item:hover {
            border-color: #3b82f6;
            transform: translateY(-2px);
        }

        .setting-item.default {
            border-color: #10b981;
            background: rgba(16, 185, 129, 0.05);
        }

        .setting-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .setting-name {
            font-size: 1.1rem;
            font-weight: 600;
            color: #374151;
        }

        .setting-badges {
            display: flex;
            gap: 5px;
        }

        .badge {
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }

        .badge-default {
            background: #10b981;
            color: white;
        }

        .badge-category {
            background: #3b82f6;
            color: white;
        }

        .setting-values {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 10px;
        }

        .value-item {
            text-align: center;
            padding: 8px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }

        .value-label {
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 2px;
        }

        .value-number {
            font-size: 14px;
            font-weight: 600;
            color: #374151;
        }

        .setting-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }

        .btn-sm {
            padding: 6px 12px;
            font-size: 12px;
        }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }

        .form-group {
            margin-bottom: 15px;
        }

        .form-group.full-width {
            grid-column: 1 / -1;
        }

        .form-label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #374151;
            font-size: 14px;
        }

        .form-input, .form-select, .form-textarea {
            width: 100%;
            padding: 10px;
            border: 2px solid #e2e8f0;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.3s;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
            outline: none;
            border-color: #3b82f6;
        }

        .form-textarea {
            resize: vertical;
            min-height: 80px;
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 5px;
        }

        .test-section {
            margin-bottom: 25px;
        }

        .test-section h3 {
            margin-bottom: 15px;
            color: #374151;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .test-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 15px;
        }

        .test-input {
            padding: 8px;
            border: 2px solid #e2e8f0;
            border-radius: 6px;
            font-size: 14px;
        }

        .results-display {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin-top: 15px;
        }

        .result-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }

        .result-row:last-child {
            border-bottom: none;
        }

        .result-label {
            font-weight: 600;
            color: #374151;
        }

        .result-value {
            font-family: monospace;
            color: #10b981;
            font-weight: 600;
        }

        .correction-display {
            font-size: 12px;
            color: #64748b;
            font-style: italic;
        }

        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 1000;
        }

        .modal-content {
            background: white;
            border-radius: 12px;
            padding: 30px;
            max-width: 800px;
            margin: 50px auto;
            max-height: 80vh;
            overflow-y: auto;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
        }

        .modal-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #374151;
        }

        .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #64748b;
        }

        .close-btn:hover {
            color: #374151;
        }

        @media (max-width: 1200px) {
            .main-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 768px) {
            .form-grid {
                grid-template-columns: 1fr;
            }

            .test-grid {
                grid-template-columns: 1fr;
            }

            .setting-values {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-cog"></i> サイズ補正設定管理システム</h1>
            <p>梱包時のサイズ・重量補正設定をデータベースで管理・適用</p>
            <div class="db-status <?= $db_status === 'ready' ? 'db-ready' : ($db_status === 'error' ? 'db-error' : 'db-setup') ?>">
                <?php if ($db_status === 'ready'): ?>
                    ✅ データベース準備完了
                <?php elseif ($db_status === 'error'): ?>
                    ❌ データベース接続エラー: <?= isset($db_error) ? htmlspecialchars($db_error) : '不明なエラー' ?>
                <?php else: ?>
                    ⚠️ データベースセットアップが必要
                <?php endif; ?>
            </div>
        </div>

        <div class="main-grid">
            <!-- 設定管理パネル -->
            <div class="settings-panel">
                <div class="panel-header">
                    <div class="panel-title">
                        <i class="fas fa-list"></i> 補正設定一覧
                    </div>
                    <button class="btn btn-primary" onclick="openAddSettingModal()">
                        <i class="fas fa-plus"></i> 新規追加
                    </button>
                </div>

                <div class="settings-list" id="settingsList">
                    <div style="text-align: center; padding: 40px; color: #64748b;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>
                        <p>設定を読み込み中...</p>
                    </div>
                </div>
            </div>

            <!-- テストパネル -->
            <div class="test-panel">
                <div class="panel-header">
                    <div class="panel-title">
                        <i class="fas fa-calculator"></i> 補正テスト
                    </div>
                </div>

                <div class="test-section">
                    <h3><i class="fas fa-input"></i> 元データ入力</h3>
                    <div class="test-grid">
                        <div>
                            <label class="form-label">重量 (kg)</label>
                            <input type="number" id="testWeight" class="test-input" step="0.01" placeholder="1.50">
                        </div>
                        <div>
                            <label class="form-label">長さ (cm)</label>
                            <input type="number" id="testLength" class="test-input" step="0.1" placeholder="20.0">
                        </div>
                        <div>
                            <label class="form-label">幅 (cm)</label>
                            <input type="number" id="testWidth" class="test-input" step="0.1" placeholder="15.0">
                        </div>
                        <div>
                            <label class="form-label">高さ (cm)</label>
                            <input type="number" id="testHeight" class="test-input" step="0.1" placeholder="10.0">
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label class="form-label">使用する設定</label>
                        <select id="testSetting" class="form-select">
                            <option value="">デフォルト設定</option>
                        </select>
                    </div>

                    <button class="btn btn-success" onclick="testCorrection()" style="width: 100%;">
                        <i class="fas fa-play"></i> 補正テスト実行
                    </button>
                </div>

                <div class="results-display" id="resultsDisplay" style="display: none;">
                    <h3><i class="fas fa-chart-line"></i> 補正結果</h3>
                    <div id="resultsContent"></div>
                </div>
            </div>
        </div>

        <!-- 設定編集モーダル -->
        <div class="modal" id="settingModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title" id="modalTitle">新規補正設定</h2>
                    <button class="close-btn" onclick="closeSettingModal()">&times;</button>
                </div>

                <form id="settingForm">
                    <input type="hidden" id="settingId">
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">設定名</label>
                            <input type="text" id="settingName" class="form-input" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">商品カテゴリー</label>
                            <input type="text" id="productCategory" class="form-input" placeholder="例: 小物, 壊れ物">
                        </div>
                        
                        <div class="form-group full-width">
                            <label class="form-label">説明</label>
                            <textarea id="description" class="form-textarea" placeholder="この設定の用途や特徴"></textarea>
                        </div>
                        
                        <!-- 重量補正 -->
                        <div class="form-group">
                            <label class="form-label">重量補正タイプ</label>
                            <select id="weightCorrectionType" class="form-select">
                                <option value="percentage">パーセンテージ</option>
                                <option value="fixed">固定値追加</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">重量補正値</label>
                            <input type="number" id="weightCorrectionValue" class="form-input" step="0.1" value="5.0">
                        </div>
                        
                        <!-- 一括サイズ補正チェック -->
                        <div class="form-group full-width">
                            <div class="checkbox-group">
                                <input type="checkbox" id="uniformSizeCorrection">
                                <label for="uniformSizeCorrection" class="form-label">全辺一括補正を使用</label>
                            </div>
                        </div>
                        
                        <!-- 一括補正設定 -->
                        <div id="uniformCorrectionSettings" style="display: none;">
                            <div class="form-group">
                                <label class="form-label">一括補正タイプ</label>
                                <select id="uniformSizeCorrectionType" class="form-select">
                                    <option value="percentage">パーセンテージ</option>
                                    <option value="fixed">固定値追加</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">一括補正値</label>
                                <input type="number" id="uniformSizeCorrectionValue" class="form-input" step="0.1" value="10.0">
                            </div>
                        </div>
                        
                        <!-- 個別補正設定 -->
                        <div id="individualCorrectionSettings">
                            <div class="form-group">
                                <label class="form-label">長さ補正値</label>
                                <input type="number" id="lengthCorrectionValue" class="form-input" step="0.1" value="10.0">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">幅補正値</label>
                                <input type="number" id="widthCorrectionValue" class="form-input" step="0.1" value="10.0">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">高さ補正値</label>
                                <input type="number" id="heightCorrectionValue" class="form-input" step="0.1" value="10.0">
                            </div>
                        </div>
                        
                        <div class="form-group full-width">
                            <label class="form-label">備考</label>
                            <textarea id="notes" class="form-textarea" placeholder="追加の注意事項や設定理由"></textarea>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="closeSettingModal()">
                            キャンセル
                        </button>
                        <button type="submit" class="btn btn-success">
                            <i class="fas fa-save"></i> 保存
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        // グローバル変数
        var settings = [];
        
        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('サイズ補正設定管理システム初期化');
            loadSettings();
            
            // 一括補正チェックボックスイベント
            document.getElementById('uniformSizeCorrection').addEventListener('change', function() {
                toggleUniformCorrection();
            });
            
            // フォーム送信イベント
            document.getElementById('settingForm').addEventListener('submit', function(e) {
                e.preventDefault();
                saveSetting();
            });
        });
        
        // 設定読み込み
        function loadSettings() {
            fetch('size_correction_manager.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_settings' })
            })
            .then(function(response) { return response.json(); })
            .then(function(result) {
                if (result.success) {
                    settings = result.data;
                    displaySettings();
                    populateTestSettingsSelect();
                } else {
                    alert('設定の読み込みに失敗しました: ' + result.error);
                }
            })
            .catch(function(error) {
                console.error('設定読み込みエラー:', error);
                alert('設定の読み込みに失敗しました');
            });
        }
        
        // 設定表示
        function displaySettings() {
            var html = '';
            
            if (settings.length === 0) {
                html = '<div style="text-align: center; padding: 40px; color: #64748b;"><i class="fas fa-inbox"></i><p>設定がありません</p></div>';
            } else {
                for (var i = 0; i < settings.length; i++) {
                    var setting = settings[i];
                    html += buildSettingHTML(setting);
                }
            }
            
            document.getElementById('settingsList').innerHTML = html;
        }
        
        // 設定HTML構築
        function buildSettingHTML(setting) {
            var badgesHtml = '';
            if (setting.is_default) {
                badgesHtml += '<span class="badge badge-default">デフォルト</span>';
            }
            if (setting.product_category) {
                badgesHtml += '<span class="badge badge-category">' + setting.product_category + '</span>';
            }
            
            return '<div class="setting-item ' + (setting.is_default ? 'default' : '') + '">' +
                '<div class="setting-header">' +
                    '<div class="setting-name">' + setting.setting_name + '</div>' +
                    '<div class="setting-badges">' + badgesHtml + '</div>' +
                '</div>' +
                '<div class="setting-values">' +
                    '<div class="value-item">' +
                        '<div class="value-label">重量</div>' +
                        '<div class="value-number">+' + setting.weight_correction_value + '%</div>' +
                    '</div>' +
                    '<div class="value-item">' +
                        '<div class="value-label">長さ</div>' +
                        '<div class="value-number">+' + setting.length_correction_value + '%</div>' +
                    '</div>' +
                    '<div class="value-item">' +
                        '<div class="value-label">幅</div>' +
                        '<div class="value-number">+' + setting.width_correction_value + '%</div>' +
                    '</div>' +
                    '<div class="value-item">' +
                        '<div class="value-label">高さ</div>' +
                        '<div class="value-number">+' + setting.height_correction_value + '%</div>' +
                    '</div>' +
                '</div>' +
                (setting.description ? '<div style="font-size: 14px; color: #64748b; margin-bottom: 10px;">' + setting.description + '</div>' : '') +
                '<div class="setting-actions">' +
                    '<button class="btn btn-secondary btn-sm" onclick="editSetting(' + setting.id + ')">' +
                        '<i class="fas fa-edit"></i> 編集' +
                    '</button>' +
                    (!setting.is_default ? 
                        '<button class="btn btn-primary btn-sm" onclick="setDefault(' + setting.id + ')">' +
                            '<i class="fas fa-star"></i> デフォルトに' +
                        '</button>' +
                        '<button class="btn btn-danger btn-sm" onclick="deleteSetting(' + setting.id + ')">' +
                            '<i class="fas fa-trash"></i> 削除' +
                        '</button>' 
                    : '') +
                '</div>' +
            '</div>';
        }
        
        // テスト用設定選択肢を設定
        function populateTestSettingsSelect() {
            var select = document.getElementById('testSetting');
            var html = '<option value="">デフォルト設定</option>';
            
            for (var i = 0; i < settings.length; i++) {
                var setting = settings[i];
                html += '<option value="' + setting.id + '">' + setting.setting_name + '</option>';
            }
            
            select.innerHTML = html;
        }
        
        // 新規設定モーダル表示
        function openAddSettingModal() {
            document.getElementById('modalTitle').textContent = '新規補正設定';
            clearForm();
            document.getElementById('settingModal').style.display = 'block';
        }
        
        // 設定編集
        function editSetting(id) {
            var setting = settings.find(function(s) { return s.id == id; });
            if (!setting) return;
            
            document.getElementById('modalTitle').textContent = '補正設定編集';
            fillForm(setting);
            document.getElementById('settingModal').style.display = 'block';
        }
        
        // フォームクリア
        function clearForm() {
            document.getElementById('settingId').value = '';
            document.getElementById('settingName').value = '';
            document.getElementById('productCategory').value = '';
            document.getElementById('description').value = '';
            document.getElementById('weightCorrectionValue').value = '5.0';
            document.getElementById('lengthCorrectionValue').value = '10.0';
            document.getElementById('widthCorrectionValue').value = '10.0';
            document.getElementById('heightCorrectionValue').value = '10.0';
            document.getElementById('uniformSizeCorrection').checked = false;
            document.getElementById('uniformSizeCorrectionValue').value = '10.0';
            document.getElementById('notes').value = '';
            toggleUniformCorrection();
        }
        
        // フォーム入力
        function fillForm(setting) {
            document.getElementById('settingId').value = setting.id;
            document.getElementById('settingName').value = setting.setting_name;
            document.getElementById('productCategory').value = setting.product_category || '';
            document.getElementById('description').value = setting.description || '';
            document.getElementById('weightCorrectionValue').value = setting.weight_correction_value;
            document.getElementById('lengthCorrectionValue').value = setting.length_correction_value;
            document.getElementById('widthCorrectionValue').value = setting.width_correction_value;
            document.getElementById('heightCorrectionValue').value = setting.height_correction_value;
            document.getElementById('uniformSizeCorrection').checked = setting.uniform_size_correction;
            document.getElementById('uniformSizeCorrectionValue').value = setting.uniform_size_correction_value;
            document.getElementById('notes').value = setting.notes || '';
            toggleUniformCorrection();
        }
        
        // 一括補正切り替え
        function toggleUniformCorrection() {
            var isUniform = document.getElementById('uniformSizeCorrection').checked;
            document.getElementById('uniformCorrectionSettings').style.display = isUniform ? 'block' : 'none';
            document.getElementById('individualCorrectionSettings').style.display = isUniform ? 'none' : 'block';
        }
        
        // 設定保存
        function saveSetting() {
            var settingData = {
                id: document.getElementById('settingId').value || null,
                setting_name: document.getElementById('settingName').value,
                description: document.getElementById('description').value,
                product_category: document.getElementById('productCategory').value,
                weight_correction_type: 'percentage',
                weight_correction_value: parseFloat(document.getElementById('weightCorrectionValue').value),
                length_correction_type: 'percentage',
                length_correction_value: parseFloat(document.getElementById('lengthCorrectionValue').value),
                width_correction_type: 'percentage',
                width_correction_value: parseFloat(document.getElementById('widthCorrectionValue').value),
                height_correction_type: 'percentage',
                height_correction_value: parseFloat(document.getElementById('heightCorrectionValue').value),
                uniform_size_correction: document.getElementById('uniformSizeCorrection').checked,
                uniform_size_correction_type: 'percentage',
                uniform_size_correction_value: parseFloat(document.getElementById('uniformSizeCorrectionValue').value),
                is_active: true,
                notes: document.getElementById('notes').value
            };
            
            fetch('size_correction_manager.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_setting',
                    setting: settingData
                })
            })
            .then(function(response) { return response.json(); })
            .then(function(result) {
                if (result.success) {
                    alert('設定を保存しました');
                    closeSettingModal();
                    loadSettings();
                } else {
                    alert('保存に失敗しました: ' + result.error);
                }
            })
            .catch(function(error) {
                console.error('保存エラー:', error);
                alert('保存に失敗しました');
            });
        }
        
        // 設定削除
        function deleteSetting(id) {
            if (!confirm('この設定を削除しますか？')) return;
            
            fetch('size_correction_manager.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete_setting',
                    id: id
                })
            })
            .then(function(response) { return response.json(); })
            .then(function(result) {
                if (result.success) {
                    alert('設定を削除しました');
                    loadSettings();
                } else {
                    alert('削除に失敗しました: ' + result.error);
                }
            })
            .catch(function(error) {
                console.error('削除エラー:', error);
                alert('削除に失敗しました');
            });
        }
        
        // デフォルト設定変更
        function setDefault(id) {
            if (!confirm('この設定をデフォルトに変更しますか？')) return;
            
            fetch('size_correction_manager.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set_default',
                    id: id
                })
            })
            .then(function(response) { return response.json(); })
            .then(function(result) {
                if (result.success) {
                    alert('デフォルト設定を変更しました');
                    loadSettings();
                } else {
                    alert('変更に失敗しました: ' + result.error);
                }
            })
            .catch(function(error) {
                console.error('変更エラー:', error);
                alert('変更に失敗しました');
            });
        }
        
        // 補正テスト実行
        function testCorrection() {
            var values = {
                weight: parseFloat(document.getElementById('testWeight').value) || 0,
                length: parseFloat(document.getElementById('testLength').value) || 0,
                width: parseFloat(document.getElementById('testWidth').value) || 0,
                height: parseFloat(document.getElementById('testHeight').value) || 0
            };
            
            var settingId = document.getElementById('testSetting').value || null;
            
            if (values.weight <= 0) {
                alert('重量を正しく入力してください');
                return;
            }
            
            fetch('size_correction_manager.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'apply_correction',
                    values: values,
                    setting_id: settingId
                })
            })
            .then(function(response) { return response.json(); })
            .then(function(result) {
                if (result.success) {
                    displayTestResults(result.data);
                } else {
                    alert('テストに失敗しました: ' + result.error);
                }
            })
            .catch(function(error) {
                console.error('テストエラー:', error);
                alert('テストに失敗しました');
            });
        }
        
        // テスト結果表示
        function displayTestResults(data) {
            var html = 
                '<div class="result-row">' +
                    '<span class="result-label">使用設定:</span>' +
                    '<span class="result-value">' + data.setting_used + '</span>' +
                '</div>' +
                '<div class="result-row">' +
                    '<span class="result-label">補正後重量:</span>' +
                    '<span class="result-value">' + data.corrected.weight + ' kg</span>' +
                    '<div class="correction-display">(' + data.corrections_applied.weight + ')</div>' +
                '</div>' +
                '<div class="result-row">' +
                    '<span class="result-label">補正後長さ:</span>' +
                    '<span class="result-value">' + data.corrected.length + ' cm</span>' +
                    '<div class="correction-display">(' + data.corrections_applied.length + ')</div>' +
                '</div>' +
                '<div class="result-row">' +
                    '<span class="result-label">補正後幅:</span>' +
                    '<span class="result-value">' + data.corrected.width + ' cm</span>' +
                    '<div class="correction-display">(' + data.corrections_applied.width + ')</div>' +
                '</div>' +
                '<div class="result-row">' +
                    '<span class="result-label">補正後高さ:</span>' +
                    '<span class="result-value">' + data.corrected.height + ' cm</span>' +
                    '<div class="correction-display">(' + data.corrections_applied.height + ')</div>' +
                '</div>' +
                '<div class="result-row">' +
                    '<span class="result-label">容積重量:</span>' +
                    '<span class="result-value">' + data.calculated.volumetric_weight + ' kg</span>' +
                '</div>' +
                '<div class="result-row">' +
                    '<span class="result-label">課金重量:</span>' +
                    '<span class="result-value">' + data.calculated.chargeable_weight + ' kg</span>' +
                '</div>';
                
            document.getElementById('resultsContent').innerHTML = html;
            document.getElementById('resultsDisplay').style.display = 'block';
        }
        
        // モーダル閉じる
        function closeSettingModal() {
            document.getElementById('settingModal').style.display = 'none';
        }
        
        // モーダル外クリックで閉じる
        document.getElementById('settingModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeSettingModal();
            }
        });
    </script>
</body>
</html>
