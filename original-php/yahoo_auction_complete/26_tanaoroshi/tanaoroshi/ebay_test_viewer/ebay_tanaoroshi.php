<?php
/**
 * eBayデータテストビューアー - 完全診断・表示ページ
 * 全データベース項目の存在確認とeBay出品状況の完全調査
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// CSRF トークン生成
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
$csrf_token = isset($_SESSION['csrf_token']) ? $_SESSION['csrf_token'] : bin2hex(random_bytes(32));
$_SESSION['csrf_token'] = $csrf_token;
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eBayデータテストビューアー - 完全診断</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../../../common/css/style.css">
    <link rel="stylesheet" href="../../../common/css/components/ebay_view_switcher_n3.css">
    <link rel="stylesheet" href="../../../common/css/components/n3_modal_system.css">
    <script src="../../../common/js/components/n3_modal_system.js"></script>
    <script src="../../../common/js/components/ebay_view_switcher.js"></script>
    <script src="../../../common/js/components/ebay_enhanced_excel.js"></script>
    <!-- N3準拠版eBayビューアー -->
    <script src="../../../common/js/components/ebay_test_viewer_n3.js"></script>
    <!-- eBay編集機能統合 -->
    <script src="../../../common/js/components/ebay_edit_manager_n3.js"></script>
    <script src="../../../common/js/pages/tanaoroshi.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; }
        
        .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        .header { text-align: center; margin-bottom: 2rem; }
        .header h1 { color: #1e293b; font-size: 2rem; margin-bottom: 0.5rem; }
        .header p { color: #64748b; }
        
        .diagnostic-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; }
        .diagnostic-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .diagnostic-card h3 { color: #1e293b; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .status-item { background: white; padding: 1rem; border-radius: 8px; text-align: center; }
        .status-value { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; }
        .status-label { color: #64748b; font-size: 0.875rem; }
        
        .field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .field-item { background: #f8fafc; padding: 0.75rem; border-radius: 6px; border-left: 4px solid #3b82f6; }
        .field-name { font-weight: 600; color: #1e293b; }
        .field-type { color: #64748b; font-size: 0.875rem; }
        .field-status { float: right; }
        .field-status.available { color: #10b981; }
        .field-status.missing { color: #dc2626; }
        
        .data-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        .data-table th, .data-table td { padding: 0.75rem; border: 1px solid #e5e7eb; text-align: left; }
        .data-table th { background: #f9fafb; font-weight: 600; }
        .data-table tr:nth-child(even) { background: #f9fafb; }
        
        .json-display { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 6px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 0.875rem; }
        
        .alert { padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
        .alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
        .alert-warning { background: #fffbeb; border: 1px solid #fed7aa; color: #92400e; }
        .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
        
        .loading { text-align: center; padding: 2rem; }
        .spinner { display: inline-block; width: 2rem; height: 2rem; border: 3px solid #e5e7eb; border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        @media (max-width: 768px) {
            .diagnostic-grid { grid-template-columns: 1fr; }
            .status-grid { grid-template-columns: 1fr 1fr; }
            .field-grid { grid-template-columns: 1fr; }
        }
        
        /* ✨ 永続ヘッダースタイル */
        .ebay-data-header-persistent {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .ebay-data-title {
            font-size: 1.25rem;
            font-weight: 700;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        
        .ebay-data-title i {
            font-size: 1.5rem;
            color: #60a5fa;
        }
        
        .data-count {
            background: rgba(96, 165, 250, 0.2);
            color: #93c5fd;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.875rem;
            font-weight: 500;
        }
        
        .ebay-header-actions {
            display: flex;
            gap: 0.75rem;
        }
        
        .ebay-action-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.875rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s ease;
        }
        
        .ebay-action-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-1px);
        }
        
        .ebay-action-btn--refresh {
            background: rgba(34, 197, 94, 0.2);
            border-color: rgba(34, 197, 94, 0.3);
        }
        
        .ebay-action-btn--refresh:hover {
            background: rgba(34, 197, 94, 0.3);
        }
        
        .ebay-action-btn--sync {
            background: rgba(139, 69, 19, 0.2);
            border-color: rgba(139, 69, 19, 0.3);
        }
        
        .ebay-action-btn--sync:hover {
            background: rgba(139, 69, 19, 0.3);
        }
        
        .ebay-action-btn--delete {
            background: rgba(220, 38, 38, 0.2);
            border-color: rgba(220, 38, 38, 0.3);
        }
        
        .ebay-action-btn--delete:hover {
            background: rgba(220, 38, 38, 0.3);
        }
        
        /* N3ボタンスタイル追加 */
        .n3-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
        }
        
        .n3-btn--primary {
            background: #3b82f6;
            color: white;
        }
        
        .n3-btn--primary:hover {
            background: #2563eb;
            transform: translateY(-1px);
        }
        
        .n3-btn--secondary {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
        }
        
        .n3-btn--secondary:hover {
            background: #e2e8f0;
            transform: translateY(-1px);
        }
        
        .n3-btn--warning {
            background: #f59e0b;
            color: white;
        }
        
        .n3-btn--warning:hover {
            background: #d97706;
            transform: translateY(-1px);
        }
        
        .n3-btn--danger {
            background: #dc2626;
            color: white;
        }
        
        .n3-btn--danger:hover {
            background: #b91c1c;
            transform: translateY(-1px);
        }
        
        .n3-btn--success {
            background: #059669;
            color: white;
        }
        
        .n3-btn--success:hover {
            background: #047857;
            transform: translateY(-1px);
        }
        
        .n3-btn--info {
            background: #0284c7;
            color: white;
        }
        
        .n3-btn--info:hover {
            background: #0369a1;
            transform: translateY(-1px);
        }
        
        @media (max-width: 768px) {
            .ebay-data-header-persistent {
                flex-direction: column;
                gap: 1rem;
                text-align: center;
            }
            
            .ebay-data-title {
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-microscope"></i> eBayデータテストビューアー</h1>
            <p>データベース全項目とeBay出品状況の完全診断</p>
            
            <!-- モーダルテストボタン -->
            <div style="margin: 2rem 0; text-align: center;">
                <button onclick="testModal()" class="n3-btn n3-btn--primary">
                    <i class="fas fa-window-maximize"></i> モーダルテスト
                </button>
                <button onclick="testAlert()" class="n3-btn n3-btn--success">
                    <i class="fas fa-bell"></i> アラートテスト
                </button>
                <button onclick="testConfirm()" class="n3-btn n3-btn--warning">
                    <i class="fas fa-question"></i> 確認テスト
                </button>
            </div>
            
            <!-- データ作成ボタン -->
            <div style="margin: 1rem 0; text-align: center;">
                <button onclick="createSampleData()" class="n3-btn n3-btn--info">
                    <i class="fas fa-plus-circle"></i> サンプルデータ作成
                </button>
                <button onclick="refreshData()" class="n3-btn n3-btn--secondary">
                    <i class="fas fa-sync"></i> データ更新
                </button>
            </div>
        </div>
        
        <div id="loading" class="loading">
            <div class="spinner"></div>
            <p>データベースを診断中...</p>
        </div>
        
        <div id="content" style="display: none;">
            
            <!-- 診断結果サマリー -->
            <div class="diagnostic-grid">
                <div class="diagnostic-card">
                    <h3><i class="fas fa-database"></i> データベース状況</h3>
                    <div id="database-summary"></div>
                </div>
                <div class="diagnostic-card">
                    <h3><i class="fab fa-ebay"></i> eBay出品状況</h3>
                    <div id="ebay-summary"></div>
                </div>
            </div>
            
            <!-- 統計情報 -->
            <div class="status-grid" id="stats-grid">
                <!-- 動的生成 -->
            </div>
            
            <!-- フィールド一覧 -->
            <div class="diagnostic-card">
                <h3><i class="fas fa-list"></i> データベース格納可能項目一覧</h3>
                <div class="field-grid" id="fields-grid">
                    <!-- 動的生成 -->
                </div>
            </div>
            
            <!-- サンプルデータ表示 -->
            <div class="diagnostic-card">
                <h3><i class="fas fa-table"></i> 実際のサンプルデータ</h3>
                <div id="sample-data">
                    <!-- 動的生成 -->
                </div>
            </div>
            
            <!-- JSON詳細表示 -->
            <div class="diagnostic-card">
                <h3><i class="fas fa-code"></i> 完全診断結果（JSON）</h3>
                <div class="json-display" id="json-output">
                    <!-- 動的生成 -->
                </div>
            </div>
            
        </div>
        
        <!-- N3モーダルシステムテスト用 -->
        <div id="test-modal" class="n3-modal n3-modal--large" aria-hidden="true" role="dialog" aria-modal="true">
            <div class="n3-modal__container">
                <div class="n3-modal__header">
                    <h2 class="n3-modal__title">
                        <i class="fas fa-microscope"></i> eBayデータ詳細情報
                    </h2>
                    <button class="n3-modal__close" onclick="N3Modal.close('test-modal')">
                        <span class="n3-sr-only">閉じる</span>
                        &times;
                    </button>
                </div>
                <div class="n3-modal__body">
                    <div id="modal-content">
                        <p>モーダルコンテンツがここに表示されます。</p>
                    </div>
                </div>
                <div class="n3-modal__footer">
                    <button class="n3-btn n3-btn--secondary" onclick="N3Modal.close('test-modal')">
                        閉じる
                    </button>
                    <button class="n3-btn n3-btn--primary" onclick="refreshModalData()">
                        <i class="fas fa-sync"></i> データ更新
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // システム設定（PHPで生成）
        window.CSRF_TOKEN = "<?= $csrf_token ?>";
    </script>
</body>
</html>
