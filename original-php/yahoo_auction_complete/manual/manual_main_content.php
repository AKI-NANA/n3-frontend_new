<?php
/**
 * NAGANO-3 マニュアルシステム - メインページコンテンツ（API連携追加版）
 * 
 * @package NAGANO-3
 * @subpackage Manual
 * @version 1.1.0
 */

// セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    die('直接アクセス禁止');
}

/**
 * 階層破綻対応: アセットファイル自動探索システム
 */
function findAssetPath($filename) {
    $webRoot = $_SERVER['DOCUMENT_ROOT'];
    $possiblePaths = [
        // 共通CSSディレクトリ
        '/common/css/' . $filename,
        '/common/js/' . $filename,
        
        // モジュール専用ディレクトリ
        '/modules/manual/' . $filename,
        '/modules/manual/css/' . $filename,
        '/modules/manual/js/' . $filename,
        
        // その他の可能性のあるパス
        '/assets/css/' . $filename,
        '/assets/js/' . $filename,
        '/css/' . $filename,
        '/js/' . $filename,
        '/static/css/' . $filename,
        '/static/js/' . $filename,
        '/' . $filename,
        
        // 上位ディレクトリも探索
        '/../common/css/' . $filename,
        '/../common/js/' . $filename,
        '/../assets/css/' . $filename,
        '/../assets/js/' . $filename
    ];
    
    foreach ($possiblePaths as $path) {
        $fullPath = $webRoot . $path;
        if (file_exists($fullPath)) {
            error_log("✅ アセット発見: {$filename} -> {$path}");
            return $path;
        }
    }
    
    error_log("❌ アセット未発見: {$filename}");
    return null;
}

// CSS/JSパスを事前に解決
$manualCssPath = findAssetPath('manual.css');
$manualJsPath = findAssetPath('manual.js');

// マニュアルデータ構造（PHP配列ベース）
$manual_categories = [
    'basic' => [
        'title' => '基本操作',
        'icon' => 'fas fa-play-circle',
        'color' => 'blue',
        'description' => 'システムの基本的な使い方を学びましょう',
        'items' => [
            [
                'id' => 'dashboard_overview',
                'title' => 'ダッシュボードの見方',
                'description' => 'メイン画面の各項目について',
                'difficulty' => 'beginner',
                'read_time' => 3,
                'views' => 1250
            ],
            [
                'id' => 'navigation_guide',
                'title' => 'メニューの使い方',
                'description' => 'サイドバーとナビゲーション',
                'difficulty' => 'beginner',
                'read_time' => 2,
                'views' => 980
            ],
            [
                'id' => 'search_functions',
                'title' => '検索機能の活用',
                'description' => '効率的な情報検索方法',
                'difficulty' => 'beginner',
                'read_time' => 4,
                'views' => 650
            ]
        ]
    ],
    'apikey' => [
        'title' => 'API連携',
        'icon' => 'fas fa-plug',
        'color' => 'purple',
        'description' => 'APIキーの登録と外部サービス連携',
        'items' => [
            [
                'id' => 'api_integration',
                'title' => 'API連携完全ガイド',
                'description' => 'APIキー登録から使用開始まで',
                'difficulty' => 'intermediate',
                'read_time' => 15,
                'views' => 2800,
                'is_featured' => true
            ],
            [
                'id' => 'apikey_basic',
                'title' => 'APIキー基本登録',
                'description' => 'APIキーの基本的な登録方法',
                'difficulty' => 'beginner',
                'read_time' => 8,
                'views' => 1950
            ],
            [
                'id' => 'database_check',
                'title' => 'データベース確認方法',
                'description' => '登録データの確認とトラブルシューティング',
                'difficulty' => 'advanced',
                'read_time' => 10,
                'views' => 850
            ]
        ]
    ],
    'products' => [
        'title' => '商品管理',
        'icon' => 'fas fa-cube',
        'color' => 'orange',
        'description' => '商品の登録・編集・管理方法',
        'items' => [
            [
                'id' => 'product_registration',
                'title' => '商品登録の手順',
                'description' => '新しい商品を登録する方法',
                'difficulty' => 'beginner',
                'read_time' => 8,
                'views' => 2100
            ],
            [
                'id' => 'product_categories',
                'title' => 'カテゴリ管理',
                'description' => '商品カテゴリの設定と整理',
                'difficulty' => 'intermediate',
                'read_time' => 6,
                'views' => 890
            ],
            [
                'id' => 'bulk_operations',
                'title' => '一括操作の方法',
                'description' => '複数商品の一括編集',
                'difficulty' => 'advanced',
                'read_time' => 10,
                'views' => 420
            ]
        ]
    ],
    'inventory' => [
        'title' => '在庫管理',
        'icon' => 'fas fa-warehouse',
        'color' => 'green',
        'description' => '在庫の入出庫と管理',
        'items' => [
            [
                'id' => 'inventory_overview',
                'title' => '在庫一覧の見方',
                'description' => '在庫状況の確認方法',
                'difficulty' => 'beginner',
                'read_time' => 5,
                'views' => 1680
            ],
            [
                'id' => 'stock_in',
                'title' => '入庫処理',
                'description' => '商品の入庫登録手順',
                'difficulty' => 'beginner',
                'read_time' => 7,
                'views' => 1420
            ],
            [
                'id' => 'stock_out',
                'title' => '出庫処理',
                'description' => '商品の出庫登録手順',
                'difficulty' => 'beginner',
                'read_time' => 6,
                'views' => 1380
            ]
        ]
    ],
    'sales' => [
        'title' => '売上・分析',
        'icon' => 'fas fa-chart-line',
        'color' => 'cyan',
        'description' => '売上データと分析機能',
        'items' => [
            [
                'id' => 'sales_report',
                'title' => '売上レポートの見方',
                'description' => '売上データの分析方法',
                'difficulty' => 'intermediate',
                'read_time' => 12,
                'views' => 950
            ],
            [
                'id' => 'profit_analysis',
                'title' => '利益分析',
                'description' => '利益率の計算と分析',
                'difficulty' => 'advanced',
                'read_time' => 15,
                'views' => 680
            ]
        ]
    ],
    'marketplace' => [
        'title' => 'モール連携',
        'icon' => 'fas fa-store',
        'color' => 'teal',
        'description' => 'Amazon・楽天等との連携',
        'items' => [
            [
                'id' => 'amazon_setup',
                'title' => 'Amazon連携設定',
                'description' => 'Amazon APIの設定方法',
                'difficulty' => 'advanced',
                'read_time' => 20,
                'views' => 580
            ],
            [
                'id' => 'rakuten_setup',
                'title' => '楽天市場連携',
                'description' => '楽天APIの設定手順',
                'difficulty' => 'advanced',
                'read_time' => 18,
                'views' => 320
            ]
        ]
    ],
    'ai' => [
        'title' => 'AI機能',
        'icon' => 'fas fa-robot',
        'color' => 'indigo',
        'description' => 'AI予測と自動化機能',
        'items' => [
            [
                'id' => 'ai_prediction',
                'title' => 'AI需要予測',
                'description' => '売上予測機能の使い方',
                'difficulty' => 'intermediate',
                'read_time' => 10,
                'views' => 450
            ],
            [
                'id' => 'filter_management',
                'title' => 'フィルター管理',
                'description' => 'AI多段階フィルターの設定',
                'difficulty' => 'advanced',
                'read_time' => 25,
                'views' => 220
            ]
        ]
    ],
    'accounting' => [
        'title' => '会計・記帳',
        'icon' => 'fas fa-calculator',
        'color' => 'yellow',
        'description' => '自動記帳と会計機能',
        'items' => [
            [
                'id' => 'auto_bookkeeping',
                'title' => '記帳自動化',
                'description' => '自動記帳機能の設定',
                'difficulty' => 'intermediate',
                'read_time' => 12,
                'views' => 780
            ],
            [
                'id' => 'financial_reports',
                'title' => '収支レポート',
                'description' => '財務レポートの作成',
                'difficulty' => 'intermediate',
                'read_time' => 8,
                'views' => 520
            ]
        ]
    ],
    'custom' => [
        'title' => 'カスタムマニュアル',
        'icon' => 'fas fa-book',
        'color' => 'gray',
        'description' => 'システム独自のマニュアル',
        'items' => [
            [ 'id' => 'manual_kicho_basic', 'title' => '記帳 基本マニュアル', 'description' => '基本的な記帳操作', 'difficulty' => 'beginner', 'read_time' => 5, 'views' => 100 ],
            [ 'id' => 'manual_kicho_complete', 'title' => '記帳 完全マニュアル', 'description' => '完全版の記帳マニュアル', 'difficulty' => 'advanced', 'read_time' => 15, 'views' => 50 ],
            [ 'id' => 'manual_kicho_simple', 'title' => '記帳 超簡易マニュアル', 'description' => '超分かりやすい記帳手順', 'difficulty' => 'beginner', 'read_time' => 3, 'views' => 80 ],
            [ 'id' => 'manual_shohin', 'title' => '商品管理マニュアル', 'description' => '商品の登録・管理方法', 'difficulty' => 'intermediate', 'read_time' => 7, 'views' => 200 ],
            [ 'id' => 'manual_zaiko', 'title' => '在庫管理マニュアル', 'description' => '在庫の管理方法', 'difficulty' => 'intermediate', 'read_time' => 6, 'views' => 180 ],
            [ 'id' => 'manual_menu_update', 'title' => 'メニュー更新マニュアル', 'description' => 'メニューの更新方法', 'difficulty' => 'advanced', 'read_time' => 8, 'views' => 120 ],
            [ 'id' => 'manual_help', 'title' => 'ヘルプマニュアル', 'description' => 'ヘルプとサポートガイド', 'difficulty' => 'beginner', 'read_time' => 4, 'views' => 90 ]
        ]
    ]
];

// よく読まれているマニュアル（上位5位）
$popular_manuals = [];
foreach ($manual_categories as $category) {
    foreach ($category['items'] as $item) {
        $popular_manuals[] = array_merge($item, ['category' => $category['title']]);
    }
}
usort($popular_manuals, function($a, $b) {
    return $b['views'] - $a['views'];
});
$popular_manuals = array_slice($popular_manuals, 0, 5);

// 注目マニュアル（featured）
$featured_manuals = [];
foreach ($manual_categories as $category) {
    foreach ($category['items'] as $item) {
        if (isset($item['is_featured']) && $item['is_featured']) {
            $featured_manuals[] = array_merge($item, ['category' => $category['title'], 'category_color' => $category['color']]);
        }
    }
}

// FAQ データ
$faq_items = [
    [
        'question' => 'システムにログインできません',
        'answer' => 'ユーザー名とパスワードを正しく入力してください。ブラウザのキャッシュをクリアしてから再度お試しください。',
        'category' => 'login'
    ],
    [
        'question' => '商品登録がうまくいきません',
        'answer' => '必須項目（商品名、価格、カテゴリ）がすべて入力されているか確認してください。画像ファイルのサイズは2MB以下にしてください。',
        'category' => 'products'
    ],
    [
        'question' => 'APIキーの登録方法がわかりません',
        'answer' => 'API連携マニュアルをご確認ください。ステップバイステップで詳しく解説しています。',
        'category' => 'apikey'
    ],
    [
        'question' => '在庫数が合わないのですが',
        'answer' => '在庫調整機能を使用して実在庫と帳簿在庫を合わせてください。定期的な棚卸しの実施もおすすめします。',
        'category' => 'inventory'
    ],
    [
        'question' => 'データのバックアップはありますか？',
        'answer' => 'システムでは自動的に日次バックアップを取得しています。手動でのデータエクスポートも各画面から可能です。',
        'category' => 'system'
    ],
    [
        'question' => 'モバイルからも使用できますか？',
        'answer' => 'はい、レスポンシブ対応しており、スマートフォンやタブレットからもご利用いただけます。',
        'category' => 'system'
    ]
];

// 現在のページ設定
$current_page = 'manual_main_page';
$page_title = 'マニュアル・ヘルプセンター';

// 階層破綻対応CSS読み込み
if ($manualCssPath) {
    echo '<link rel="stylesheet" href="' . htmlspecialchars($manualCssPath, ENT_QUOTES, 'UTF-8') . '">' . "\n";
} else {
    // CSS未発見時のフォールバック: インラインCSS
    echo '<style>';
    include 'manual_fallback.css'; // フォールバック用CSS（後で作成）
    echo '</style>';
}
?>

<!-- マニュアルメインページ -->
<div class="manual__container">
    
    <!-- ページヘッダー -->
    <div class="manual__header">
        <div class="manual__header-content">
            <div class="manual__header-left">
                <h1 class="manual__title">
                    <i class="fas fa-book manual__title-icon"></i>
                    NAGANO-3 マニュアル・ヘルプセンター
                </h1>
                <p class="manual__subtitle">
                    システムの使い方を分かりやすく解説します。困ったときはこちらをご覧ください。
                </p>
            </div>
            <div class="manual__header-actions">
                <a href="/?page=apikey_content" class="btn btn--primary">
                    <i class="fas fa-key"></i>
                    APIキー管理
                </a>
                <button class="btn btn--secondary manual__print-btn" onclick="window.print()">
                    <i class="fas fa-print"></i>
                    印刷
                </button>
            </div>
        </div>
    </div>

    <!-- 注目マニュアル（Featured） -->
    <?php if (!empty($featured_manuals)): ?>
    <div class="manual__featured-section">
        <h2 class="manual__section-title">
            <i class="fas fa-star"></i>
            注目マニュアル
        </h2>
        <div class="manual__featured-grid">
            <?php foreach ($featured_manuals as $featured): ?>
            <a href="/?page=manual/<?= $featured['id'] ?>_content" class="manual__featured-card">
                <div class="manual__featured-header">
                    <div class="manual__featured-badge">NEW</div>
                    <div class="manual__featured-category manual__featured-category--<?= $featured['category_color'] ?>">
                        <?= htmlspecialchars($featured['category']) ?>
                    </div>
                </div>
                <div class="manual__featured-content">
                    <h3><?= htmlspecialchars($featured['title']) ?></h3>
                    <p><?= htmlspecialchars($featured['description']) ?></p>
                    <div class="manual__featured-meta">
                        <span class="manual__featured-time">
                            <i class="fas fa-clock"></i>
                            <?= $featured['read_time'] ?>分
                        </span>
                        <span class="manual__featured-difficulty manual__featured-difficulty--<?= $featured['difficulty'] ?>">
                            <?= 
                                $featured['difficulty'] === 'beginner' ? '初級' : 
                                ($featured['difficulty'] === 'intermediate' ? '中級' : '上級') 
                            ?>
                        </span>
                    </div>
                </div>
                <div class="manual__featured-footer">
                    <span class="manual__featured-cta">詳しく見る</span>
                    <i class="fas fa-arrow-right"></i>
                </div>
            </a>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- 検索セクション -->
    <div class="manual__search-section">
        <div class="manual__search-container">
            <div class="manual__search-box">
                <i class="fas fa-search manual__search-icon"></i>
                <input 
                    type="text" 
                    class="manual__search-input" 
                    placeholder="マニュアルを検索... (例: 商品登録、在庫管理、API連携)"
                    id="manualSearchInput"
                />
                <button class="manual__search-clear" id="searchClearBtn" style="display: none;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="manual__search-suggestions" id="searchSuggestions" style="display: none;">
                <!-- 検索候補がここに表示される -->
            </div>
        </div>
    </div>

    <!-- クイックアクセス -->
    <div class="manual__quick-access">
        <h2 class="manual__section-title">
            <i class="fas fa-bolt"></i>
            よく使われる機能
        </h2>
        <div class="manual__quick-grid">
            <a href="/?page=manual/api_integration_content" class="manual__quick-item">
                <div class="manual__quick-icon manual__quick-icon--purple">
                    <i class="fas fa-plug"></i>
                </div>
                <span class="manual__quick-text">API連携</span>
            </a>
            <a href="/?page=manual/product_registration_content" class="manual__quick-item">
                <div class="manual__quick-icon manual__quick-icon--orange">
                    <i class="fas fa-plus-circle"></i>
                </div>
                <span class="manual__quick-text">商品登録</span>
            </a>
            <a href="/?page=manual/inventory_overview_content" class="manual__quick-item">
                <div class="manual__quick-icon manual__quick-icon--green">
                    <i class="fas fa-warehouse"></i>
                </div>
                <span class="manual__quick-text">在庫確認</span>
            </a>
            <a href="/?page=manual/sales_report_content" class="manual__quick-item">
                <div class="manual__quick-icon manual__quick-icon--cyan">
                    <i class="fas fa-chart-bar"></i>
                </div>
                <span class="manual__quick-text">売上分析</span>
            </a>
            <a href="/?page=ai_control_content" class="manual__quick-item">
                <div class="manual__quick-icon manual__quick-icon--indigo">
                    <i class="fas fa-robot"></i>
                </div>
                <span class="manual__quick-text">AI制御デッキ</span>
            </a>
        </div>
    </div>

    <!-- メインコンテンツエリア -->
    <div class="manual__main-content">
        
        <!-- 左側：マニュアルカテゴリ -->
        <div class="manual__categories-section">
            <h2 class="manual__section-title">
                <i class="fas fa-list"></i>
                カテゴリ別マニュアル
            </h2>
            
            <div class="manual__categories-grid">
                <?php foreach ($manual_categories as $category_id => $category): ?>
                <div class="manual__category-card" data-category="<?= $category_id ?>">
                    <div class="manual__category-header">
                        <div class="manual__category-icon manual__category-icon--<?= $category['color'] ?>">
                            <i class="<?= $category['icon'] ?>"></i>
                        </div>
                        <div class="manual__category-info">
                            <h3 class="manual__category-title"><?= htmlspecialchars($category['title']) ?></h3>
                            <p class="manual__category-description"><?= htmlspecialchars($category['description']) ?></p>
                        </div>
                        <div class="manual__category-count">
                            <?= count($category['items']) ?>件
                        </div>
                    </div>
                    
                    <div class="manual__category-items">
                        <?php foreach ($category['items'] as $item): ?>
                        <a href="/?page=manual/<?= $item['id'] ?>_content" class="manual__item-link">
                            <div class="manual__item">
                                <div class="manual__item-main">
                                    <h4 class="manual__item-title">
                                        <?= htmlspecialchars($item['title']) ?>
                                        <?php if (isset($item['is_featured'])): ?>
                                        <span class="manual__item-badge">NEW</span>
                                        <?php endif; ?>
                                    </h4>
                                    <p class="manual__item-description"><?= htmlspecialchars($item['description']) ?></p>
                                </div>
                                <div class="manual__item-meta">
                                    <span class="manual__item-difficulty manual__item-difficulty--<?= $item['difficulty'] ?>">
                                        <?= 
                                            $item['difficulty'] === 'beginner' ? '初級' : 
                                            ($item['difficulty'] === 'intermediate' ? '中級' : '上級') 
                                        ?>
                                    </span>
                                    <span class="manual__item-time">
                                        <i class="fas fa-clock"></i>
                                        <?= $item['read_time'] ?>分
                                    </span>
                                    <span class="manual__item-views">
                                        <i class="fas fa-eye"></i>
                                        <?= number_format($item['views']) ?>
                                    </span>
                                </div>
                            </div>
                        </a>
                        <?php endforeach; ?>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- 右側：サイドバー -->
        <div class="manual__sidebar">
            
            <!-- 人気マニュアル -->
            <div class="manual__sidebar-section">
                <h3 class="manual__sidebar-title">
                    <i class="fas fa-fire"></i>
                    よく読まれるマニュアル
                </h3>
                <div class="manual__popular-list">
                    <?php foreach ($popular_manuals as $index => $item): ?>
                    <div class="manual__popular-item">
                        <div class="manual__popular-rank"><?= $index + 1 ?></div>
                        <div class="manual__popular-content">
                            <a href="/?page=manual/<?= $item['id'] ?>_content" class="manual__popular-link">
                                <?= htmlspecialchars($item['title']) ?>
                            </a>
                            <div class="manual__popular-meta">
                                <span class="manual__popular-category"><?= htmlspecialchars($item['category']) ?></span>
                                <span class="manual__popular-views"><?= number_format($item['views']) ?>回閲覧</span>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- 最近の更新 -->
            <div class="manual__sidebar-section">
                <h3 class="manual__sidebar-title">
                    <i class="fas fa-clock"></i>
                    最近の更新
                </h3>
                <div class="manual__updates-list">
                    <div class="manual__update-item">
                        <div class="manual__update-date">2024/12/20</div>
                        <div class="manual__update-content">
                            <a href="/?page=manual/api_integration_content">API連携完全ガイドを追加</a>
                        </div>
                    </div>
                    <div class="manual__update-item">
                        <div class="manual__update-date">2024/12/18</div>
                        <div class="manual__update-content">
                            <a href="/?page=manual/filter_management_content">フィルター管理機能を追加</a>
                        </div>
                    </div>
                    <div class="manual__update-item">
                        <div class="manual__update-date">2024/12/15</div>
                        <div class="manual__update-content">
                            <a href="/?page=manual/product_registration_content">商品登録手順を更新</a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ヘルプ・サポート -->
            <div class="manual__sidebar-section">
                <h3 class="manual__sidebar-title">
                    <i class="fas fa-headset"></i>
                    ヘルプ・サポート
                </h3>
                <div class="manual__help-options">
                    <a href="#faq" class="manual__help-link" onclick="scrollToFAQ()">
                        <i class="fas fa-question-circle"></i>
                        よくある質問
                    </a>
                    <a href="mailto:support@emverze.com" class="manual__help-link">
                        <i class="fas fa-envelope"></i>
                        メールサポート
                    </a>
                    <a href="/?page=contact" class="manual__help-link">
                        <i class="fas fa-comments"></i>
                        お問い合わせ
                    </a>
                </div>
            </div>
        </div>
    </div>

    <!-- FAQ セクション -->
    <div class="manual__faq-section" id="faq">
        <h2 class="manual__section-title">
            <i class="fas fa-question-circle"></i>
            よくある質問（FAQ）
        </h2>
        
        <div class="manual__faq-container">
            <?php foreach ($faq_items as $faq): ?>
            <div class="manual__faq-item">
                <div class="manual__faq-question">
                    <i class="fas fa-question-circle manual__faq-icon"></i>
                    <h3><?= htmlspecialchars($faq['question']) ?></h3>
                    <button class="manual__faq-toggle">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="manual__faq-answer">
                    <p><?= htmlspecialchars($faq['answer']) ?></p>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- フッター情報 -->
    <div class="manual__footer">
        <div class="manual__footer-content">
            <div class="manual__footer-section">
                <h4>システム情報</h4>
                <p>NAGANO-3 統合管理システム v1.0.0</p>
                <p>最終更新: 2024年12月20日</p>
            </div>
            <div class="manual__footer-section">
                <h4>サポート</h4>
                <p>平日 9:00-17:00</p>
                <p>support@emverze.com</p>
            </div>
            <div class="manual__footer-section">
                <h4>ご利用状況</h4>
                <p>マニュアル総数: <?= array_sum(array_map(function($cat) { return count($cat['items']); }, $manual_categories)) ?>件</p>
                <p>今月の閲覧数: <?= number_format(array_sum(array_map(function($cat) { return array_sum(array_column($cat['items'], 'views')); }, $manual_categories))) ?>回</p>
            </div>
        </div>
    </div>
</div>

<!-- JavaScript