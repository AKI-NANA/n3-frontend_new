<?php
/**
 * 将来実装予定ページのプレースホルダー
 * common/templates/placeholder_page.php
 */

// ページ情報の完全定義
$page_info = [
    'shohin_add' => [
        'title' => '商品登録',
        'icon' => 'fas fa-plus',
        'description' => '新しい商品をシステムに登録する機能です。商品の基本情報から価格設定まで、包括的な商品管理を行います。',
        'features' => [
            '商品基本情報の入力（名前、説明、型番等）',
            'カテゴリ・タグの設定と管理',
            '価格・在庫情報の詳細管理',
            '商品画像の複数アップロード',
            'Amazon・eBay連携による自動出品',
            'バーコード・JAN コード対応'
        ],
        'status' => 'development',
        'progress' => 75,
        'estimated_release' => '2024年8月'
    ],
    'view_shohin_touroku' => [
        'title' => '商品登録画面',
        'icon' => 'fas fa-edit',
        'description' => '商品登録のための最適化されたユーザーインターフェース。直感的な操作で効率的な商品登録を実現します。',
        'features' => [
            '直感的な入力フォーム設計',
            'リアルタイムバリデーション',
            'CSV一括登録機能',
            '商品テンプレート機能',
            'ドラッグ&ドロップ画像アップロード',
            '入力内容の自動保存'
        ],
        'status' => 'planning',
        'progress' => 45,
        'estimated_release' => '2024年9月'
    ],
    'asin_upload_content' => [
        'title' => 'Amazon商品登録',
        'icon' => 'fab fa-amazon',
        'description' => 'Amazon ASINを使った商品の一括登録・管理機能。Amazon APIとの連携による自動化を実現します。',
        'features' => [
            'ASINによる商品情報自動取得',
            'Amazon Seller API完全連携',
            '商品データの自動更新・同期',
            '価格・在庫のリアルタイム同期',
            'カテゴリマッピング自動化',
            'レビュー・評価情報の取得'
        ],
        'status' => 'development',
        'progress' => 60,
        'estimated_release' => '2024年7月'
    ],
    'shohin_category' => [
        'title' => 'カテゴリ管理',
        'icon' => 'fas fa-tags',
        'description' => '商品カテゴリの階層管理システム。効率的な商品分類と検索性の向上を実現します。',
        'features' => [
            '無制限階層カテゴリの作成',
            'ドラッグ&ドロップによる階層変更',
            '商品カテゴリの一括変更',
            'カテゴリ別売上・利益分析',
            'Amazon・eBayカテゴリとの連携',
            'カテゴリテンプレート機能'
        ],
        'status' => 'planning',
        'progress' => 30,
        'estimated_release' => '2024年10月'
    ],
    'zaiko_input' => [
        'title' => '入庫処理',
        'icon' => 'fas fa-arrow-down',
        'description' => '商品の入庫処理と在庫更新システム。効率的な入庫管理で在庫精度を向上させます。',
        'features' => [
            '入庫データの簡単入力',
            'バーコードスキャナー対応',
            '自動在庫更新・ロット管理',
            '入庫履歴の詳細記録',
            '仕入先別入庫管理',
            '入庫予定・実績の比較分析'
        ],
        'status' => 'development',
        'progress' => 55,
        'estimated_release' => '2024年8月'
    ],
    'zaiko_output' => [
        'title' => '出庫処理',
        'icon' => 'fas fa-arrow-up',
        'description' => '商品の出庫処理と在庫管理システム。正確な在庫管理と効率的な出荷を実現します。',
        'features' => [
            '出庫データの効率的処理',
            '在庫の自動減算・更新',
            '出庫履歴の完全記録',
            'ピッキングリスト自動作成',
            '出荷ラベル印刷連携',
            '在庫切れアラート機能'
        ],
        'status' => 'development',
        'progress' => 50,
        'estimated_release' => '2024年8月'
    ],
    'tanaoroshi' => [
        'title' => '棚卸し処理',
        'icon' => 'fas fa-clipboard-check',
        'description' => '定期的な棚卸し処理と在庫差異の管理システム。正確な在庫管理を支援します。',
        'features' => [
            '棚卸し計画の作成・管理',
            'モバイル対応棚卸しアプリ',
            '在庫差異の自動検出・分析',
            '棚卸し結果のレポート出力',
            '差異原因の追跡機能',
            '定期棚卸しのスケジュール管理'
        ],
        'status' => 'planning',
        'progress' => 25,
        'estimated_release' => '2024年11月'
    ],
    'ai_control_deck' => [
        'title' => 'AI制御ダッシュボード',
        'icon' => 'fas fa-tachometer-alt',
        'description' => 'AI技術を活用した総合制御システム。ビジネスの自動化と最適化を実現します。',
        'features' => [
            'AI予測分析ダッシュボード',
            '自動価格調整システム',
            '需要予測・在庫最適化',
            '異常値検知・アラート',
            '機械学習モデルの管理',
            'A/Bテスト自動実行'
        ],
        'status' => 'planning',
        'progress' => 15,
        'estimated_release' => '2025年1月'
    ],
    'ebay_kicho_content' => [
        'title' => 'eBay売上記帳',
        'icon' => 'fab fa-ebay',
        'description' => 'eBay売上の自動記帳システム。税務対応と収益管理を効率化します。',
        'features' => [
            'eBay売上データ自動取得',
            '為替レート自動変換',
            '手数料・税金の自動計算',
            '会計ソフト連携出力',
            '月次・年次レポート生成',
            '税務申告データ準備'
        ],
        'status' => 'development',
        'progress' => 40,
        'estimated_release' => '2024年9月'
    ],
    'working_system' => [
        'title' => '実動システム',
        'icon' => 'fas fa-server',
        'description' => '本格稼働用の実動システム管理機能。安定した運用を支援します。',
        'features' => [
            'システム監視・アラート',
            'パフォーマンス最適化',
            'バックアップ・復旧管理',
            'セキュリティ管理',
            'ログ分析・監査'
        ],
        'status' => 'planning',
        'progress' => 20,
        'estimated_release' => '2024年12月'
    ],
    'settings_content' => [
        'title' => '基本設定',
        'icon' => 'fas fa-sliders-h',
        'description' => 'システム全体の基本設定管理機能。',
        'features' => [
            'ユーザー設定管理',
            'システム環境設定',
            'API設定管理',
            'テーマ・UI設定'
        ],
        'status' => 'planning',
        'progress' => 35,
        'estimated_release' => '2024年10月'
    ]
];

// 現在のページ情報を取得
$current_page = $_GET['page'] ?? 'default';
$page_data = $page_info[$current_page] ?? [
    'title' => '準備中の機能',
    'icon' => 'fas fa-cog',
    'description' => 'この機能は現在開発中です。詳細な仕様を検討し、最適なユーザー体験を提供できるよう準備を進めています。',
    'features' => [
        '基本機能の設計・実装',
        'ユーザーインターフェースの最適化',
        '包括的なテスト・検証',
        'パフォーマンス最適化',
        'セキュリティ強化'
    ],
    'status' => 'planning',
    'progress' => 25,
    'estimated_release' => '未定'
];

// ステータス情報
$status_info = [
    'planning' => [
        'label' => '企画・設計中', 
        'color' => '#6c757d', 
        'bg_color' => '#f8f9fa',
        'icon' => 'fas fa-lightbulb',
        'description' => '機能の仕様策定と設計を行っています'
    ],
    'development' => [
        'label' => '開発中', 
        'color' => '#ffc107', 
        'bg_color' => '#fff3cd',
        'icon' => 'fas fa-code',
        'description' => '実装作業を進行中です'
    ],
    'testing' => [
        'label' => 'テスト中', 
        'color' => '#17a2b8', 
        'bg_color' => '#d1ecf1',
        'icon' => 'fas fa-vial',
        'description' => '品質確認とテストを実施中です'
    ],
    'ready' => [
        'label' => 'リリース準備完了', 
        'color' => '#28a745', 
        'bg_color' => '#d4edda',
        'icon' => 'fas fa-check-circle',
        'description' => 'まもなくリリース予定です'
    ]
];

$current_status = $status_info[$page_data['status']] ?? $status_info['planning'];
?>

<div class="placeholder-page">
    <div class="placeholder-container">
        
        <!-- ページヘッダー -->
        <div class="placeholder-header">
            <div class="placeholder-icon-container">
                <div class="placeholder-icon">
                    <i class="<?php echo $page_data['icon']; ?>"></i>
                </div>
            </div>
            <div class="placeholder-title-section">
                <h1 class="placeholder-title"><?php echo htmlspecialchars($page_data['title']); ?></h1>
                <div class="placeholder-status" style="background: <?php echo $current_status['bg_color']; ?>; color: <?php echo $current_status['color']; ?>;">
                    <i class="<?php echo $current_status['icon']; ?>"></i>
                    <span><?php echo $current_status['label']; ?></span>
                </div>
            </div>
        </div>
        
        <!-- 説明セクション -->
        <div class="placeholder-description">
            <p><?php echo htmlspecialchars($page_data['description']); ?></p>
            <p class="status-description">
                <i class="fas fa-info-circle"></i>
                <?php echo $current_status['description']; ?>
            </p>
        </div>
        
        <!-- 進捗セクション -->
        <div class="placeholder-progress-section">
            <div class="progress-header">
                <h3>開発進捗</h3>
                <div class="progress-percentage"><?php echo $page_data['progress']; ?>%</div>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: <?php echo $page_data['progress']; ?>%"></div>
                </div>
            </div>
            <div class="progress-info">
                <span>リリース予定: <?php echo htmlspecialchars($page_data['estimated_release']); ?></span>
            </div>
        </div>
        
        <!-- 予定機能セクション -->
        <div class="placeholder-features">
            <h3>実装予定の機能</h3>
            <div class="features-grid">
                <?php foreach ($page_data['features'] as $index => $feature): ?>
                    <div class="feature-item">
                        <div class="feature-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="feature-text">
                            <?php echo htmlspecialchars($feature); ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
        
        <!-- モックアップセクション -->
        <div class="placeholder-mockup">
            <h3>画面イメージ</h3>
            <div class="mockup-container">
                <div class="mockup-placeholder">
                    <div class="mockup-header">
                        <div class="mockup-title"><?php echo htmlspecialchars($page_data['title']); ?></div>
                        <div class="mockup-controls">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                    <div class="mockup-content">
                        <div class="mockup-sidebar"></div>
                        <div class="mockup-main">
                            <div class="mockup-form">
                                <div class="mockup-field"></div>
                                <div class="mockup-field"></div>
                                <div class="mockup-field short"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <p class="mockup-note">
                    <i class="fas fa-exclamation-triangle"></i>
                    ※これは開発中の画面イメージです。実際の画面とは異なる場合があります。
                </p>
            </div>
        </div>
        
        <!-- フィードバックセクション -->
        <div class="placeholder-feedback">
            <h3>ご意見・ご要望</h3>
            <p>この機能に関するご意見やご要望がございましたら、お気軽にお聞かせください。</p>
            <div class="feedback-actions">
                <button class="btn btn--primary" onclick="openFeedbackModal('<?php echo $current_page; ?>')">
                    <i class="fas fa-comment"></i>
                    フィードバックを送信
                </button>
                <button class="btn btn--secondary" onclick="requestNotification('<?php echo $current_page; ?>')">
                    <i class="fas fa-bell"></i>
                    リリース通知を受け取る
                </button>
            </div>
        </div>
        
        <!-- ナビゲーションセクション -->
        <div class="placeholder-navigation">
            <div class="nav-actions">
                <a href="/?page=dashboard" class="btn btn--outline">
                    <i class="fas fa-home"></i>
                    ダッシュボードに戻る
                </a>
                <a href="/#roadmap" class="btn btn--outline">
                    <i class="fas fa-road"></i>
                    開発ロードマップを見る
                </a>
            </div>
        </div>
        
    </div>
</div>

<!-- プレースホルダーページ専用CSS -->
<style>
.placeholder-page {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg-primary, #f8fafc);
    min-height: calc(100vh - var(--header-height, 80px));
}

.placeholder-container {
    background: var(--bg-secondary, white);
    border-radius: 16px;
    box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
    overflow: hidden;
    border: 1px solid var(--border-color, #e2e8f0);
}

.placeholder-header {
    background: linear-gradient(135deg, var(--color-primary, #3b82f6) 0%, var(--color-secondary, #8b5cf6) 100%);
    color: white;
    padding: 3rem 2rem 2rem;
    display: flex;
    align-items: center;
    gap: 2rem;
}

.placeholder-icon-container {
    flex-shrink: 0;
}

.placeholder-icon {
    width: 80px;
    height: 80px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.placeholder-title-section {
    flex: 1;
}

.placeholder-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 1rem 0;
    line-height: 1.2;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.placeholder-status {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 25px;
    font-size: 0.9rem;
    font-weight: 600;
    border: 2px solid currentColor;
    backdrop-filter: blur(10px);
}

.placeholder-description {
    padding: 2rem;
    border-bottom: 1px solid var(--border-light, #f1f5f9);
}

.placeholder-description p {
    font-size: 1.1rem;
    line-height: 1.7;
    margin: 0 0 1rem 0;
    color: var(--text-secondary, #4a5568);
}

.status-description {
    background: var(--bg-tertiary, #f7fafc);
    padding: 1rem;
    border-radius: 8px;
    border-left: 4px solid var(--color-primary, #4299e1);
    margin-top: 1rem !important;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.placeholder-progress-section {
    padding: 2rem;
    border-bottom: 1px solid var(--border-light, #f1f5f9);
}

.progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.progress-header h3 {
    margin: 0;
    color: var(--text-primary, #2d3748);
    font-size: 1.25rem;
}

.progress-percentage {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-primary, #4299e1);
}

.progress-bar-container {
    margin-bottom: 1rem;
}

.progress-bar {
    height: 12px;
    background: var(--bg-tertiary, #e2e8f0);
    border-radius: 6px;
    overflow: hidden;
    position: relative;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-primary, #4299e1), var(--color-secondary, #667eea));
    border-radius: 6px;
    transition: width 0.5s ease;
    position: relative;
}

.progress-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    animation: progress-shine 2s infinite;
}

@keyframes progress-shine {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

.progress-info {
    text-align: center;
    color: var(--text-tertiary, #718096);
    font-size: 0.9rem;
}

.placeholder-features {
    padding: 2rem;
    border-bottom: 1px solid var(--border-light, #f1f5f9);
}

.placeholder-features h3 {
    margin: 0 0 1.5rem 0;
    color: var(--text-primary, #2d3748);
    font-size: 1.25rem;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
}

.feature-item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-tertiary, #f7fafc);
    border-radius: 8px;
    border: 1px solid var(--border-light, #e2e8f0);
    transition: var(--transition-fast, all 0.15s ease);
}

.feature-item:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05));
}

.feature-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    color: var(--color-success, #48bb78);
    font-size: 1.2rem;
}

.feature-text {
    flex: 1;
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--text-secondary, #4a5568);
}

.placeholder-mockup {
    padding: 2rem;
    border-bottom: 1px solid var(--border-light, #f1f5f9);
}

.placeholder-mockup h3 {
    margin: 0 0 1.5rem 0;
    color: var(--text-primary, #2d3748);
    font-size: 1.25rem;
}

.mockup-container {
    text-align: center;
}

.mockup-placeholder {
    background: var(--bg-tertiary, #f7fafc);
    border: 2px solid var(--border-color, #e2e8f0);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}

.mockup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    background: var(--text-primary, #4a5568);
    color: white;
    border-radius: 6px;
    margin-bottom: 1rem;
}

.mockup-title {
    font-weight: 600;
    font-size: 0.9rem;
}

.mockup-controls {
    display: flex;
    gap: 0.3rem;
}

.mockup-controls span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border-color, #cbd5e0);
}

.mockup-content {
    display: flex;
    gap: 1rem;
    height: 200px;
}

.mockup-sidebar {
    width: 60px;
    background: var(--border-color, #e2e8f0);
    border-radius: 4px;
}

.mockup-main {
    flex: 1;
    background: white;
    border-radius: 4px;
    padding: 1rem;
}

.mockup-form {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
}

.mockup-field {
    height: 20px;
    background: var(--bg-tertiary, #f7fafc);
    border-radius: 4px;
}

.mockup-field.short {
    width: 60%;
}

.mockup-note {
    font-size: 0.85rem;
    color: var(--text-tertiary, #718096);
    margin: 1rem 0 0 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: center;
}

.placeholder-feedback {
    padding: 2rem;
    border-bottom: 1px solid var(--border-light, #f1f5f9);
    text-align: center;
}

.placeholder-feedback h3 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #2d3748);
    font-size: 1.25rem;
}

.placeholder-feedback p {
    color: var(--text-secondary, #4a5568);
    margin-bottom: 2rem;
    line-height: 1.6;
}

.feedback-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.placeholder-navigation {
    padding: 2rem;
    text-align: center;
    background: var(--bg-tertiary, #f7fafc);
}

.nav-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
    transition: all 0.2s;
    border: 2px solid transparent;
    cursor: pointer;
    white-space: nowrap;
}

.btn--primary {
    background: var(--color-primary, #4299e1);
    color: white;
}

.btn--primary:hover {
    background: var(--color-secondary, #3182ce);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
}

.btn--secondary {
    background: var(--text-tertiary, #718096);
    color: white;
}

.btn--secondary:hover {
    background: var(--text-secondary, #4a5568);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
}

.btn--outline {
    background: transparent;
    color: var(--color-primary, #4299e1);
    border-color: var(--color-primary, #4299e1);
}

.btn--outline:hover {
    background: var(--color-primary, #4299e1);
    color: white;
    transform: translateY(-1px);
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
    .placeholder-page {
        padding: 1rem;
    }
    
    .placeholder-header {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
        padding: 2rem 1rem 1.5rem;
    }
    
    .placeholder-title {
        font-size: 2rem;
    }
    
    .placeholder-icon {
        width: 60px;
        height: 60px;
        font-size: 2rem;
    }
    
    .features-grid {
        grid-template-columns: 1fr;
    }
    
    .feedback-actions,
    .nav-actions {
        flex-direction: column;
        align-items: center;
    }
    
    .btn {
        width: 200px;
        justify-content: center;
    }
    
    .progress-header {
        flex-direction: column;
        gap: 0.5rem;
        text-align: center;
    }
}

@media (max-width: 480px) {
    .placeholder-container {
        border-radius: 8px;
    }
    
    .placeholder-header {
        padding: 1.5rem 1rem;
    }
    
    .placeholder-title {
        font-size: 1.75rem;
    }
    
    .placeholder-description,
    .placeholder-progress-section,
    .placeholder-features,
    .placeholder-mockup,
    .placeholder-feedback,
    .placeholder-navigation {
        padding: 1.5rem;
    }
}

/* ダークテーマ対応 */
[data-theme="dark"] .placeholder-page {
    background: #0f172a;
}

[data-theme="dark"] .placeholder-container {
    background: #1e293b;
    border-color: #374151;
}

[data-theme="dark"] .mockup-placeholder {
    background: #374151;
    border-color: #4b5563;
}

[data-theme="dark"] .mockup-main {
    background: #1e293b;
}

/* アニメーション強化 */
.placeholder-container {
    animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.feature-item {
    animation: fadeInUp 0.5s ease-out;
    animation-fill-mode: both;
}

.feature-item:nth-child(1) { animation-delay: 0.1s; }
.feature-item:nth-child(2) { animation-delay: 0.2s; }
.feature-item:nth-child(3) { animation-delay: 0.3s; }
.feature-item:nth-child(4) { animation-delay: 0.4s; }
.feature-item:nth-child(5) { animation-delay: 0.5s; }
.feature-item:nth-child(6) { animation-delay: 0.6s; }
</style>

<script>
// フィードバックモーダル表示
function openFeedbackModal(pageName) {
    const modal = prompt(`「${pageName}」機能に関するご意見・ご要望をお聞かせください：`);
    if (modal && modal.trim()) {
        console.log('フィードバック受信:', pageName, modal);
        if (typeof showNotification === 'function') {
            showNotification('フィードバックをありがとうございます！開発の参考にさせていただきます。', 'success');
        } else {
            alert('フィードバックをありがとうございます！');
        }
        
        // Ajax送信（もしシステムがあれば）
        if (typeof NAGANO3 !== 'undefined' && NAGANO3.ajax) {
            NAGANO3.ajax.request('submit_feedback', {
                page: pageName,
                feedback: modal,
                timestamp: new Date().toISOString()
            }).catch(error => {
                console.warn('フィードバック送信エラー:', error);
            });
        }
    }
}

// リリース通知登録
function requestNotification(pageName) {
    console.log('リリース通知登録:', pageName);
    if (typeof showNotification === 'function') {
        showNotification(`「${pageName}」のリリース通知を登録しました。`, 'success');
    } else {
        alert('リリース通知を登録しました！');
    }
    
    // Ajax送信（もしシステムがあれば）
    if (typeof NAGANO3 !== 'undefined' && NAGANO3.ajax) {
        NAGANO3.ajax.request('register_notification', {
            page: pageName,
            email: 'user@example.com', // 実際はユーザー情報から取得
            timestamp: new Date().toISOString()
        }).catch(error => {
            console.warn('通知登録エラー:', error);
        });
    }
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ プレースホルダーページ初期化完了');
    
    // 進捗バーアニメーション
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        const targetWidth = progressFill.style.width;
        progressFill.style.width = '0%';
        setTimeout(() => {
            progressFill.style.width = targetWidth;
        }, 500);
    }
});
</script>