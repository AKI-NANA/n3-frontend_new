<?php
/**
 * NAGANO-3 API連携マニュアルページ
 * 
 * @package NAGANO-3
 * @subpackage Manual
 * @version 1.0.0
 */

// セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    die('直接アクセス禁止');
}

// 現在のページ設定
$current_page = 'manual_api_integration';
$page_title = 'API連携マニュアル - NAGANO-3';

// アセットファイル自動探索
function findAssetPath($filename) {
    $webRoot = $_SERVER['DOCUMENT_ROOT'];
    $possiblePaths = [
        '/common/css/' . $filename,
        '/common/js/' . $filename,
        '/modules/manual/' . $filename,
        '/modules/manual/css/' . $filename,
        '/modules/manual/js/' . $filename,
        '/assets/css/' . $filename,
        '/assets/js/' . $filename,
        '/' . $filename
    ];
    
    foreach ($possiblePaths as $path) {
        if (file_exists($webRoot . $path)) {
            return $path;
        }
    }
    return null;
}

$manualCssPath = findAssetPath('manual.css');
$manualJsPath = findAssetPath('manual.js');

// データベース確認コマンド定義
$db_check_commands = [
    'basic' => [
        'title' => '基本確認',
        'commands' => [
            [
                'name' => 'APIキー一覧確認',
                'command' => 'psql nagano3_apikeys -c "SELECT id, key_name, api_service, status, created_at FROM api_keys ORDER BY created_at DESC;"',
                'description' => '登録済みAPIキーの一覧を表示'
            ],
            [
                'name' => 'APIキー件数確認',
                'command' => 'psql nagano3_apikeys -c "SELECT api_service, COUNT(*) as count FROM api_keys GROUP BY api_service;"',
                'description' => 'サービス別のAPIキー登録数'
            ],
            [
                'name' => 'データベース接続確認',
                'command' => 'psql nagano3_apikeys -c "\\dt"',
                'description' => 'テーブル一覧を表示してDB接続確認'
            ]
        ]
    ],
    'detailed' => [
        'title' => '詳細確認',
        'commands' => [
            [
                'name' => '使用状況確認',
                'command' => 'psql nagano3_apikeys -c "SELECT key_name, daily_usage, daily_limit, success_rate FROM api_keys WHERE status = \'active\';"',
                'description' => 'アクティブなAPIキーの使用状況'
            ],
            [
                'name' => 'エラー状況確認',
                'command' => 'psql nagano3_apikeys -c "SELECT key_name, total_requests, successful_requests, (total_requests - successful_requests) as errors FROM api_keys WHERE total_requests > 0;"',
                'description' => 'APIキーのエラー状況'
            ],
            [
                'name' => '期限切れ確認',
                'command' => 'psql nagano3_apikeys -c "SELECT key_name, expires_at FROM api_keys WHERE expires_at < NOW();"',
                'description' => '期限切れのAPIキー確認'
            ]
        ]
    ],
    'maintenance' => [
        'title' => 'メンテナンス',
        'commands' => [
            [
                'name' => 'テーブル構造確認',
                'command' => 'psql nagano3_apikeys -c "\\d api_keys"',
                'description' => 'api_keysテーブルの構造詳細'
            ],
            [
                'name' => 'インデックス確認',
                'command' => 'psql nagano3_apikeys -c "\\di"',
                'description' => 'データベースインデックス一覧'
            ],
            [
                'name' => 'データベースサイズ確認',
                'command' => 'psql nagano3_apikeys -c "SELECT pg_size_pretty(pg_database_size(\'nagano3_apikeys\'));"',
                'description' => 'データベースの使用容量'
            ]
        ]
    ]
];

// 未実装機能リスト（sidebar.phpから抽出）
$unimplemented_features = [
    '売上・利益集計' => [
        'pages' => ['売上レポート', '利益分析', '期間比較'],
        'priority' => 'high',
        'description' => '売上データの集計・分析機能'
    ],
    '出荷管理' => [
        'pages' => ['出荷待ち', '配送状況', '追跡番号'],
        'priority' => 'high',
        'description' => '商品出荷と配送管理'
    ],
    '受注管理' => [
        'pages' => ['受注一覧', '受注処理', 'キャンセル処理'],
        'priority' => 'high',
        'description' => '注文受付と処理管理'
    ],
    'モール統合管理' => [
        'pages' => ['Amazon', 'eBay', 'Shopify', '楽天市場'],
        'priority' => 'medium',
        'description' => '複数販売モールの統合管理'
    ],
    '国内販売' => [
        'pages' => ['楽天市場', 'Yahoo!ショッピング', 'Amazon Japan'],
        'priority' => 'medium',
        'description' => '国内ECモール連携'
    ],
    '海外販売' => [
        'pages' => ['eBay US', 'Amazon US', 'Amazon EU'],
        'priority' => 'medium',
        'description' => '海外販売モール連携'
    ],
    'AI制御デッキ' => [
        'pages' => ['AI設定', '学習データ', '予測結果'],
        'priority' => 'medium',
        'description' => 'AI機能の制御管理'
    ],
    'AI予測分析' => [
        'pages' => ['需要予測', '価格予測', '在庫予測'],
        'priority' => 'medium',
        'description' => 'AI による各種予測機能'
    ],
    '問い合わせ一元化' => [
        'pages' => ['問い合わせ管理'],
        'priority' => 'low',
        'description' => '顧客問い合わせの一元管理'
    ],
    'タスクカレンダー' => [
        'pages' => ['タスク管理'],
        'priority' => 'low',
        'description' => 'スケジュール・タスク管理'
    ],
    '画像管理' => [
        'pages' => ['画像アップロード', '画像編集'],
        'priority' => 'low',
        'description' => '商品画像等の管理機能'
    ],
    '通知設定' => [
        'pages' => ['通知設定'],
        'priority' => 'low',
        'description' => 'システム通知の設定'
    ]
];

// CSS読み込み
if ($manualCssPath) {
    echo '<link rel="stylesheet" href="' . htmlspecialchars($manualCssPath, ENT_QUOTES, 'UTF-8') . '">' . "\n";
}
?>

<!-- API連携マニュアルページ -->
<div class="manual__container">
    
    <!-- ページヘッダー -->
    <div class="manual__header">
        <div class="manual__header-content">
            <div class="manual__header-left">
                <h1 class="manual__title">
                    <i class="fas fa-plug manual__title-icon"></i>
                    API連携マニュアル
                </h1>
                <p class="manual__subtitle">
                    NAGANO-3システムとAPIキーの連携方法を詳しく解説します。初回設定から運用まで、ステップバイステップでガイドします。
                </p>
            </div>
            <div class="manual__header-actions">
                <a href="/?page=apikey_content" class="btn btn--primary">
                    <i class="fas fa-key"></i>
                    APIキー管理へ
                </a>
                <a href="/?page=manual/manual_main_content" class="btn btn--secondary">
                    <i class="fas fa-arrow-left"></i>
                    マニュアル一覧へ
                </a>
            </div>
        </div>
    </div>

    <!-- 目次 -->
    <div class="manual__toc-section">
        <h2 class="manual__section-title">
            <i class="fas fa-list"></i>
            このマニュアルの内容
        </h2>
        <div class="manual__toc-grid">
            <a href="#step1" class="manual__toc-item">
                <div class="manual__toc-number">1</div>
                <div class="manual__toc-content">
                    <h3>APIキーとは</h3>
                    <p>基本概念と重要性</p>
                </div>
            </a>
            <a href="#step2" class="manual__toc-item">
                <div class="manual__toc-number">2</div>
                <div class="manual__toc-content">
                    <h3>登録手順</h3>
                    <p>ステップバイステップガイド</p>
                </div>
            </a>
            <a href="#step3" class="manual__toc-item">
                <div class="manual__toc-number">3</div>
                <div class="manual__toc-content">
                    <h3>使用開始</h3>
                    <p>ツール連携と確認方法</p>
                </div>
            </a>
            <a href="#step4" class="manual__toc-item">
                <div class="manual__toc-number">4</div>
                <div class="manual__toc-content">
                    <h3>データベース確認</h3>
                    <p>登録状況のチェック方法</p>
                </div>
            </a>
            <a href="#step5" class="manual__toc-item">
                <div class="manual__toc-number">5</div>
                <div class="manual__toc-content">
                    <h3>トラブルシューティング</h3>
                    <p>よくある問題と解決方法</p>
                </div>
            </a>
            <a href="#step6" class="manual__toc-item">
                <div class="manual__toc-number">6</div>
                <div class="manual__toc-content">
                    <h3>未実装機能</h3>
                    <p>今後追加予定の機能一覧</p>
                </div>
            </a>
        </div>
    </div>

    <!-- Step 1: APIキーとは -->
    <section id="step1" class="manual__content-section">
        <h2 class="manual__section-title">
            <i class="fas fa-info-circle"></i>
            Step 1: APIキーとは？
        </h2>
        
        <div class="manual__content-card">
            <div class="manual__intro-grid">
                <div class="manual__intro-text">
                    <h3>🔑 APIキーの基本概念</h3>
                    <p>APIキーは、外部サービス（Amazon、eBay、AI分析ツール等）とNAGANO-3システムを<strong>安全に連携</strong>するための認証情報です。</p>
                    
                    <h4>📋 APIキーが必要な理由</h4>
                    <ul>
                        <li><strong>セキュリティ確保</strong>：正当なユーザーのみがサービス利用可能</li>
                        <li><strong>使用量管理</strong>：API呼び出し回数の監視・制御</li>
                        <li><strong>個別設定</strong>：ユーザー固有の権限・設定の適用</li>
                        <li><strong>費用管理</strong>：従量課金サービスの予算管理</li>
                    </ul>
                </div>
                <div class="manual__intro-diagram">
                    <div class="manual__flow-diagram">
                        <div class="manual__flow-step">
                            <div class="manual__flow-icon manual__flow-icon--blue">
                                <i class="fas fa-desktop"></i>
                            </div>
                            <span>NAGANO-3</span>
                        </div>
                        <div class="manual__flow-arrow">
                            <i class="fas fa-arrow-right"></i>
                            <span>APIキー認証</span>
                        </div>
                        <div class="manual__flow-step">
                            <div class="manual__flow-icon manual__flow-icon--green">
                                <i class="fas fa-cloud"></i>
                            </div>
                            <span>外部サービス</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="manual__content-card">
            <h3>🎯 NAGANO-3で使用する主なAPIサービス</h3>
            <div class="manual__service-grid">
                <div class="manual__service-item">
                    <div class="manual__service-icon manual__service-icon--purple">
                        <i class="fas fa-calculator"></i>
                    </div>
                    <h4>会計・記帳サービス</h4>
                    <p>自動記帳・財務管理用API</p>
                </div>
                <div class="manual__service-item">
                    <div class="manual__service-icon manual__service-icon--orange">
                        <i class="fas fa-robot"></i>
                    </div>
                    <h4>AI分析サービス</h4>
                    <p>商品分析・予測処理用API</p>
                </div>
                <div class="manual__service-item">
                    <div class="manual__service-icon manual__service-icon--blue">
                        <i class="fas fa-store"></i>
                    </div>
                    <h4>ECモールAPI</h4>
                    <p>商品管理・在庫連携用API</p>
                </div>
                <div class="manual__service-item">
                    <div class="manual__service-icon manual__service-icon--green">
                        <i class="fas fa-shipping-fast"></i>
                    </div>
                    <h4>物流・配送API</h4>
                    <p>出荷管理・追跡用API</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Step 2: 登録手順 -->
    <section id="step2" class="manual__content-section">
        <h2 class="manual__section-title">
            <i class="fas fa-cog"></i>
            Step 2: APIキー登録手順
        </h2>

        <div class="manual__content-card">
            <h3>🚀 基本的な登録フロー</h3>
            <div class="manual__step-flow">
                <div class="manual__step-item">
                    <div class="manual__step-number">1</div>
                    <div class="manual__step-content">
                        <h4>APIキー管理画面にアクセス</h4>
                        <p>ダッシュボード → 設定・構成管理 → API設定</p>
                        <a href="/?page=apikey_content" class="btn btn--sm btn--primary">APIキー管理を開く</a>
                    </div>
                </div>
                <div class="manual__step-item">
                    <div class="manual__step-number">2</div>
                    <div class="manual__step-content">
                        <h4>新規APIキー作成</h4>
                        <p>「新規作成」ボタンをクリックしてフォームを開く</p>
                    </div>
                </div>
                <div class="manual__step-item">
                    <div class="manual__step-number">3</div>
                    <div class="manual__step-content">
                        <h4>サービス・キー情報入力</h4>
                        <p>連携したいサービスを選択し、APIキーを入力</p>
                    </div>
                </div>
                <div class="manual__step-item">
                    <div class="manual__step-number">4</div>
                    <div class="manual__step-content">
                        <h4>保存・確認</h4>
                        <p>設定を保存し、接続テストで動作確認</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="manual__content-card">
            <h3>📝 入力項目の詳細説明</h3>
            <div class="manual__form-guide">
                <div class="manual__form-item">
                    <label class="manual__form-label">キー名</label>
                    <div class="manual__form-description">
                        <p>わかりやすい識別名を設定（例：Shopify本店API、Amazon販売用API）</p>
                        <div class="manual__form-example">
                            <strong>良い例：</strong> Shopify本店API、DeepSeek AI主力キー<br>
                            <strong>悪い例：</strong> API1、test、キー
                        </div>
                    </div>
                </div>
                <div class="manual__form-item">
                    <label class="manual__form-label">サービス種別</label>
                    <div class="manual__form-description">
                        <p>連携するサービスをプルダウンから選択</p>
                    </div>
                </div>
                <div class="manual__form-item">
                    <label class="manual__form-label">階層レベル</label>
                    <div class="manual__form-description">
                        <p>APIキーの重要度・優先度を設定</p>
                        <ul>
                            <li><strong>Premium：</strong>メインで使用する最重要キー</li>
                            <li><strong>Standard：</strong>通常運用で使用するキー</li>
                            <li><strong>Basic：</strong>テスト・開発用キー</li>
                            <li><strong>Backup：</strong>障害時のバックアップキー</li>
                        </ul>
                    </div>
                </div>
                <div class="manual__form-item">
                    <label class="manual__form-label">日次制限</label>
                    <div class="manual__form-description">
                        <p>1日あたりの最大API呼び出し数（予算管理用）</p>
                        <div class="manual__form-example">
                            <strong>推奨値：</strong> 会計API: 1,000回、AI API: 10,000回、EC API: 5,000回
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Step 3: 使用開始 -->
    <section id="step3" class="manual__content-section">
        <h2 class="manual__section-title">
            <i class="fas fa-play-circle"></i>
            Step 3: ツール連携と使用開始
        </h2>

        <div class="manual__content-card">
            <h3>🔗 ツール要件確認システム</h3>
            <p>APIキー登録後、ダッシュボードで各ツールの<strong>準備状況</strong>を自動確認できます。</p>
            
            <div class="manual__status-examples">
                <div class="manual__status-item manual__status-item--ready">
                    <div class="manual__status-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="manual__status-content">
                        <h4>✅ 記帳ツール KICHO</h4>
                        <p><strong>準備完了</strong> (2/2 API) - すぐに使用開始できます</p>
                        <button class="btn btn--sm btn--success">開く</button>
                    </div>
                </div>
                <div class="manual__status-item manual__status-item--incomplete">
                    <div class="manual__status-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="manual__status-content">
                        <h4>⚠️ 商品管理ツール</h4>
                        <p><strong>設定必要</strong> (1/2 API) - APIキーが不足しています</p>
                        <button class="btn btn--sm btn--warning">設定必要</button>
                        <button class="btn btn--sm btn--outline">要件</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="manual__content-card">
            <h3>⚡ 使用開始の流れ</h3>
            <div class="manual__usage-flow">
                <div class="manual__usage-step">
                    <h4>1. 要件確認</h4>
                    <p>「要件」ボタンで必要なAPIキーを確認</p>
                </div>
                <div class="manual__usage-arrow">→</div>
                <div class="manual__usage-step">
                    <h4>2. 不足APIキー登録</h4>
                    <p>「設定必要」→「追加」で不足分を登録</p>
                </div>
                <div class="manual__usage-arrow">→</div>
                <div class="manual__usage-step">
                    <h4>3. ツール使用開始</h4>
                    <p>「開く」ボタンでツールを使用開始</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Step 4: データベース確認 -->
    <section id="step4" class="manual__content-section">
        <h2 class="manual__section-title">
            <i class="fas fa-database"></i>
            Step 4: データベース確認方法
        </h2>

        <div class="manual__content-card">
            <h3>🖱️ ワンクリックコマンド確認</h3>
            <p>以下のコマンドをクリックでコピーし、ターミナルに貼り付けて実行してください。</p>
            
            <?php foreach ($db_check_commands as $category_key => $category): ?>
            <div class="manual__db-section">
                <h4 class="manual__db-category-title"><?= htmlspecialchars($category['title']) ?></h4>
                <div class="manual__db-commands">
                    <?php foreach ($category['commands'] as $cmd): ?>
                    <div class="manual__db-command-item">
                        <div class="manual__db-command-header">
                            <h5><?= htmlspecialchars($cmd['name']) ?></h5>
                            <button class="btn btn--sm btn--outline manual__copy-btn" 
                                    onclick="copyToClipboard('<?= htmlspecialchars($cmd['command'], ENT_QUOTES) ?>', this)"
                                    data-tooltip="クリックでコピー">
                                <i class="fas fa-copy"></i>
                                コピー
                            </button>
                        </div>
                        <div class="manual__db-command-description">
                            <?= htmlspecialchars($cmd['description']) ?>
                        </div>
                        <div class="manual__db-command-code">
                            <code><?= htmlspecialchars($cmd['command']) ?></code>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <div class="manual__content-card">
            <h3>📊 確認結果の見方</h3>
            <div class="manual__result-guide">
                <div class="manual__result-item">
                    <h4>✅ 正常な結果例</h4>
                    <div class="manual__result-example manual__result-example--success">
                        <pre>id | key_name        | api_service      | status
1  | Shopify本店API  | shopify_api      | active
2  | DeepSeek AI     | deepseek_ai      | active</pre>
                    </div>
                    <p>APIキーが正常に登録され、アクティブ状態です。</p>
                </div>
                <div class="manual__result-item">
                    <h4>⚠️ 注意が必要な結果例</h4>
                    <div class="manual__result-example manual__result-example--warning">
                        <pre>ERROR: relation "api_keys" does not exist</pre>
                    </div>
                    <p>データベースが未初期化またはテーブルが存在しません。セットアップが必要です。</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Step 5: トラブルシューティング -->
    <section id="step5" class="manual__content-section">
        <h2 class="manual__section-title">
            <i class="fas fa-wrench"></i>
            Step 5: トラブルシューティング
        </h2>

        <div class="manual__content-card">
            <h3>❓ よくある問題と解決方法</h3>
            <div class="manual__faq-list">
                <div class="manual__faq-item">
                    <div class="manual__faq-question">
                        <i class="fas fa-exclamation-circle manual__faq-icon"></i>
                        <h4>「設定必要」ボタンが表示される</h4>
                        <button class="manual__faq-toggle">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    <div class="manual__faq-answer">
                        <p><strong>原因：</strong>必要なAPIキーが不足しています</p>
                        <p><strong>解決方法：</strong></p>
                        <ol>
                            <li>「要件」ボタンで不足APIを確認</li>
                            <li>「追加」ボタンでAPIキー登録画面へ</li>
                            <li>不足しているAPIキーを登録</li>
                            <li>ダッシュボードで「開く」ボタンが有効化されることを確認</li>
                        </ol>
                    </div>
                </div>

                <div class="manual__faq-item">
                    <div class="manual__faq-question">
                        <i class="fas fa-exclamation-circle manual__faq-icon"></i>
                        <h4>APIキーが認識されない</h4>
                        <button class="manual__faq-toggle">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    <div class="manual__faq-answer">
                        <p><strong>確認ポイント：</strong></p>
                        <ul>
                            <li>APIキーの入力ミス（スペース・改行が含まれていないか）</li>
                            <li>サービス選択が正しいか</li>
                            <li>APIキーの有効期限・権限設定</li>
                            <li>外部サービス側での認証設定</li>
                        </ul>
                        <p><strong>解決方法：</strong>APIキー一覧で「テスト」ボタンを押して接続確認</p>
                    </div>
                </div>

                <div class="manual__faq-item">
                    <div class="manual__faq-question">
                        <i class="fas fa-exclamation-circle manual__faq-icon"></i>
                        <h4>ツールで「APIキーエラー」が発生</h4>
                        <button class="manual__faq-toggle">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    <div class="manual__faq-answer">
                        <p><strong>対処手順：</strong></p>
                        <ol>
                            <li>APIキー一覧で該当キーの状態確認</li>
                            <li>「テスト」ボタンで接続確認</li>
                            <li>使用量が制限に達していないか確認</li>
                            <li>外部サービスの障害情報をチェック</li>
                            <li>問題が解決しない場合はAPIキーを再登録</li>
                        </ol>
                    </div>
                </div>

                <div class="manual__faq-item">
                    <div class="manual__faq-question">
                        <i class="fas fa-exclamation-circle manual__faq-icon"></i>
                        <h4>データベースに接続できない</h4>
                        <button class="manual__faq-toggle">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    <div class="manual__faq-answer">
                        <p><strong>確認手順：</strong></p>
                        <ol>
                            <li>PostgreSQLサービスが起動しているか確認</li>
                            <li>データベース「nagano3_apikeys」が存在するか確認</li>
                            <li>接続情報（ホスト・ポート・ユーザー・パスワード）を確認</li>
                            <li>ファイアウォール設定をチェック</li>
                        </ol>
                        <div class="manual__code-example">
                            <p><strong>PostgreSQL起動確認：</strong></p>
                            <code>brew services list | grep postgresql</code>
                            <p><strong>データベース存在確認：</strong></p>
                            <code>psql -l | grep nagano3</code>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Step 6: 未実装機能一覧 -->
    <section id="step6" class="manual__content-section">
        <h2 class="manual__section-title">
            <i class="fas fa-roadmap"></i>
            Step 6: 未実装機能一覧
        </h2>

        <div class="manual__content-card">
            <h3>🚧 今後追加予定の機能</h3>
            <p>以下の機能は現在開発中または今後実装予定です。APIキー連携の準備として参考にしてください。</p>
            
            <div class="manual__feature-priority-tabs">
                <button class="manual__tab-btn manual__tab-btn--active" onclick="showFeaturesByPriority('high')">
                    高優先度
                </button>
                <button class="manual__tab-btn" onclick="showFeaturesByPriority('medium')">
                    中優先度
                </button>
                <button class="manual__tab-btn" onclick="showFeaturesByPriority('low')">
                    低優先度
                </button>
            </div>

            <div class="manual__feature-lists">
                <?php foreach (['high', 'medium', 'low'] as $priority): ?>
                <div class="manual__feature-list" data-priority="<?= $priority ?>" 
                     style="<?= $priority !== 'high' ? 'display: none;' : '' ?>">
                    <?php foreach ($unimplemented_features as $feature_name => $feature_data): ?>
                        <?php if ($feature_data['priority'] === $priority): ?>
                        <div class="manual__feature-item">
                            <div class="manual__feature-header">
                                <div class="manual__feature-icon">
                                    <i class="fas fa-<?= 
                                        $priority === 'high' ? 'exclamation' : 
                                        ($priority === 'medium' ? 'clock' : 'info-circle') 
                                    ?>"></i>
                                </div>
                                <div class="manual__feature-info">
                                    <h4><?= htmlspecialchars($feature_name) ?></h4>
                                    <p><?= htmlspecialchars($feature_data['description']) ?></p>
                                </div>
                                <div class="manual__feature-status">
                                    <span class="manual__priority-badge manual__priority-badge--<?= $priority ?>">
                                        <?= $priority === 'high' ? '高' : ($priority === 'medium' ? '中' : '低') ?>
                                    </span>
                                </div>
                            </div>
                            <div class="manual__feature-pages">
                                <strong>含まれる機能：</strong>
                                <?= htmlspecialchars(implode('、', $feature_data['pages'])) ?>
                            </div>
                        </div>
                        <?php endif; ?>
                    <?php endforeach; ?>
                </div>
                <?php endforeach; ?>
            </div>
        </div>

        <div class="manual__content-card">
            <h3>📅 開発ロードマップ</h3>
            <div class="manual__roadmap">
                <div class="manual__roadmap-item">
                    <div class="manual__roadmap-date">2024年12月</div>
                    <div class="manual__roadmap-content">
                        <h4>✅ APIキー管理システム</h4>
                        <p>完成・運用開始</p>
                    </div>
                </div>
                <div class="manual__roadmap-item">
                    <div class="manual__roadmap-date">2025年1月</div>
                    <div class="manual__roadmap-content">
                        <h4>🚧 売上・利益集計</h4>
                        <p>レポート機能開発中</p>
                    </div>
                </div>
                <div class="manual__roadmap-item">
                    <div class="manual__roadmap-date">2025年2月</div>
                    <div class="manual__roadmap-content">
                        <h4>📋 出荷・受注管理</h4>
                        <p>物流機能の実装予定</p>
                    </div>
                </div>
                <div class="manual__roadmap-item">
                    <div class="manual__roadmap-date">2025年3月</div>
                    <div class="manual__roadmap-content">
                        <h4>🤖 AI制御デッキ</h4>
                        <p>AI機能の拡張予定</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- フッター・関連リンク -->
    <div class="manual__footer">
        <div class="manual__footer-content">
            <div class="manual__footer-section">
                <h4>関連マニュアル</h4>
                <ul class="manual__footer-links">
                    <li><a href="/?page=manual/manual_kicho_basic_content">記帳ツール基本マニュアル</a></li>
                    <li><a href="/?page=manual/manual_shohin_content">商品管理マニュアル</a></li>
                    <li><a href="/?page=manual/manual_zaiko_content">在庫管理マニュアル</a></li>
                </ul>
            </div>
            <div class="manual__footer-section">
                <h4>システム設定</h4>
                <ul class="manual__footer-links">
                    <li><a href="/?page=apikey_content">APIキー管理</a></li>
                    <li><a href="/?page=settings_content">基本設定</a></li>
                    <li><a href="/?page=manual/manual_main_content">マニュアル一覧</a></li>
                </ul>
            </div>
            <div class="manual__footer-section">
                <h4>サポート</h4>
                <p>平日 9:00-17:00</p>
                <p>support@emverze.com</p>
                <p>マニュアル最終更新: 2024年12月20日</p>
            </div>
        </div>
    </div>
</div>

<!-- JavaScript -->
<?php if ($manualJsPath): ?>
<script src="<?= htmlspecialchars($manualJsPath, ENT_QUOTES, 'UTF-8') ?>"></script>
<?php endif; ?>

<script>
document.addEventListener('DOMContentLoaded', function() {
    console.log('API連携マニュアル初期化');
    
    // FAQアコーディオン
    const faqToggles = document.querySelectorAll('.manual__faq-toggle');
    faqToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const faqItem = this.closest('.manual__faq-item');
            const answer = faqItem.querySelector('.manual__faq-answer');
            const icon = this.querySelector('i');
            
            if (faqItem.classList.contains('manual__faq-item--open')) {
                faqItem.classList.remove('manual__faq-item--open');
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            } else {
                faqItem.classList.add('manual__faq-item--open');
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            }
        });
    });
    
    // スムーススクロール
    const tocLinks = document.querySelectorAll('.manual__toc-item');
    tocLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

// クリップボードコピー機能
function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> コピー済み';
        button.classList.add('btn--success');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('btn--success');
        }, 2000);
    }).catch(err => {
        console.error('コピーに失敗:', err);
        alert('クリップボードコピーに失敗しました。手動でコピーしてください。');
    });
}

// 未実装機能の優先度別表示
function showFeaturesByPriority(priority) {
    // タブボタンの状態更新
    document.querySelectorAll('.manual__tab-btn').forEach(btn => {
        btn.classList.remove('manual__tab-btn--active');
    });
    event.target.classList.add('manual__tab-btn--active');
    
    // 機能リストの表示切り替え
    document.querySelectorAll('.manual__feature-list').forEach(list => {
        if (list.dataset.priority === priority) {
            list.style.display = 'block';
        } else {
            list.style.display = 'none';
        }
    });
}
</script>

<style>
/* API連携マニュアル専用スタイル */
.manual__content-section {
    margin-bottom: 3rem;
}

.manual__content-card {
    background: var(--bg-secondary, #ffffff);
    border-radius: 1rem;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(0, 0, 0, 0.1);
}

.manual__toc-section {
    margin-bottom: 3rem;
}

.manual__toc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
}

.manual__toc-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: var(--bg-secondary, #ffffff);
    border-radius: 0.75rem;
    text-decoration: none;
    color: var(--text-primary, #1f2937);
    transition: all 0.3s ease;
    border: 1px solid rgba(0, 0, 0, 0.1);
}

.manual__toc-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    border-color: var(--accent-blue, #8b5cf6);
}

.manual__toc-number {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--accent-blue, #8b5cf6), var(--accent-purple, #a855f7));
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    flex-shrink: 0;
}

.manual__toc-content h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.125rem;
    font-weight: 600;
}

.manual__toc-content p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
}

.manual__intro-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
    align-items: center;
}

.manual__intro-text h4 {
    margin: 1.5rem 0 1rem 0;
    color: var(--text-primary, #1f2937);
}

.manual__intro-text ul {
    list-style: none;
    padding: 0;
}

.manual__intro-text li {
    padding: 0.5rem 0;
    padding-left: 1.5rem;
    position: relative;
}

.manual__intro-text li::before {
    content: "✓";
    position: absolute;
    left: 0;
    color: var(--accent-green, #10b981);
    font-weight: bold;
}

.manual__flow-diagram {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 1rem;
    background: var(--bg-primary, #f9fafb);
    padding: 2rem;
    border-radius: 0.75rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
}

.manual__flow-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
}

.manual__flow-icon {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.25rem;
}

.manual__flow-icon--blue {
    background: linear-gradient(135deg, var(--accent-blue, #3b82f6), #1d4ed8);
}

.manual__flow-icon--green {
    background: linear-gradient(135deg, var(--accent-green, #10b981), #059669);
}

.manual__flow-arrow {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    color: var(--text-secondary, #6b7280);
}

.manual__flow-arrow span {
    font-size: 0.75rem;
    font-weight: 500;
}

.manual__service-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
}

.manual__service-item {
    text-align: center;
    padding: 1.5rem;
    background: var(--bg-primary, #f9fafb);
    border-radius: 0.75rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
}

.manual__service-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem;
    color: white;
    font-size: 1.5rem;
}

.manual__service-icon--purple {
    background: linear-gradient(135deg, var(--accent-purple, #8b5cf6), #a855f7);
}

.manual__service-icon--orange {
    background: linear-gradient(135deg, var(--accent-orange, #f59e0b), #ea580c);
}

.manual__service-icon--blue {
    background: linear-gradient(135deg, var(--accent-blue, #3b82f6), #1d4ed8);
}

.manual__service-icon--green {
    background: linear-gradient(135deg, var(--accent-green, #10b981), #059669);
}

.manual__service-item h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
}

.manual__service-item p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
}

.manual__step-flow {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-top: 1.5rem;
}

.manual__step-item {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
}

.manual__step-number {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--accent-blue, #8b5cf6), var(--accent-purple, #a855f7));
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    flex-shrink: 0;
}

.manual__step-content h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
}

.manual__step-content p {
    margin: 0 0 1rem 0;
    color: var(--text-secondary, #6b7280);
}

.manual__form-guide {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.manual__form-item {
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.5rem;
    overflow: hidden;
}

.manual__form-label {
    display: block;
    background: var(--bg-primary, #f9fafb);
    padding: 1rem 1.5rem;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.manual__form-description {
    padding: 1.5rem;
}

.manual__form-description p {
    margin: 0 0 1rem 0;
}

.manual__form-description ul {
    margin: 1rem 0;
    padding-left: 1.5rem;
}

.manual__form-example {
    background: var(--bg-primary, #f9fafb);
    padding: 1rem;
    border-radius: 0.5rem;
    border-left: 4px solid var(--accent-blue, #8b5cf6);
    margin-top: 1rem;
    font-size: 0.875rem;
}

.manual__status-examples {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 1.5rem 0;
}

.manual__status-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    border-radius: 0.75rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
}

.manual__status-item--ready {
    background: rgba(16, 185, 129, 0.05);
    border-color: rgba(16, 185, 129, 0.2);
}

.manual__status-item--incomplete {
    background: rgba(245, 158, 11, 0.05);
    border-color: rgba(245, 158, 11, 0.2);
}

.manual__status-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
}

.manual__status-item--ready .manual__status-icon {
    color: var(--accent-green, #10b981);
}

.manual__status-item--incomplete .manual__status-icon {
    color: var(--accent-yellow, #f59e0b);
}

.manual__status-content {
    flex: 1;
}

.manual__status-content h4 {
    margin: 0 0 0.25rem 0;
    font-size: 1.125rem;
    font-weight: 600;
}

.manual__status-content p {
    margin: 0 0 1rem 0;
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
}

.manual__usage-flow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin: 2rem 0;
    flex-wrap: wrap;
}

.manual__usage-step {
    text-align: center;
    max-width: 200px;
}

.manual__usage-step h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
}

.manual__usage-step p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
}

.manual__usage-arrow {
    font-size: 1.5rem;
    color: var(--accent-blue, #8b5cf6);
    font-weight: bold;
}

.manual__db-section {
    margin-bottom: 2rem;
}

.manual__db-category-title {
    background: linear-gradient(135deg, var(--accent-blue, #8b5cf6), var(--accent-purple, #a855f7));
    color: white;
    padding: 1rem 1.5rem;
    margin: 0 0 1rem 0;
    border-radius: 0.5rem;
    font-size: 1.125rem;
    font-weight: 600;
}

.manual__db-commands {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.manual__db-command-item {
    background: var(--bg-primary, #f9fafb);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.75rem;
    overflow: hidden;
}

.manual__db-command-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: var(--bg-secondary, #ffffff);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.manual__db-command-header h5 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
}

.manual__copy-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.manual__db-command-description {
    padding: 1rem 1.5rem;
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
}

.manual__db-command-code {
    padding: 1rem 1.5rem;
    background: #1f2937;
    color: #f9fafb;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 0.875rem;
    overflow-x: auto;
}

.manual__db-command-code code {
    color: #f9fafb;
    background: none;
    padding: 0;
}

.manual__result-guide {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.manual__result-item h4 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
}

.manual__result-example {
    padding: 1rem;
    border-radius: 0.5rem;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 0.875rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    margin: 0.5rem 0;
}

.manual__result-example--success {
    background: rgba(16, 185, 129, 0.05);
    border-color: rgba(16, 185, 129, 0.2);
    color: #065f46;
}

.manual__result-example--warning {
    background: rgba(239, 68, 68, 0.05);
    border-color: rgba(239, 68, 68, 0.2);
    color: #991b1b;
}

.manual__result-example pre {
    margin: 0;
    white-space: pre-wrap;
}

.manual__faq-list {
    display: flex;
    flex-direction: column;
}

.manual__faq-item {
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.manual__faq-item:last-child {
    border-bottom: none;
}

.manual__code-example {
    background: var(--bg-primary, #f9fafb);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.5rem;
    padding: 1rem;
    margin: 1rem 0;
}

.manual__code-example code {
    background: #1f2937;
    color: #f9fafb;
    padding: 0.5rem;
    border-radius: 0.25rem;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 0.875rem;
    display: block;
    margin: 0.5rem 0;
}

.manual__feature-priority-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.manual__tab-btn {
    padding: 1rem 2rem;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-weight: 600;
    color: var(--text-secondary, #6b7280);
    transition: all 0.3s ease;
}

.manual__tab-btn--active {
    color: var(--accent-blue, #8b5cf6);
    border-bottom-color: var(--accent-blue, #8b5cf6);
}

.manual__tab-btn:hover {
    color: var(--text-primary, #1f2937);
}

.manual__feature-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.manual__feature-item {
    background: var(--bg-primary, #f9fafb);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.75rem;
    padding: 1.5rem;
}

.manual__feature-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
}

.manual__feature-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
}

.manual__feature-icon {
    background: var(--accent-blue, #8b5cf6);
}

.manual__feature-info {
    flex: 1;
}

.manual__feature-info h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
}

.manual__feature-info p {
    margin: 0;
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
}

.manual__priority-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 50px;
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
}

.manual__priority-badge--high {
    background: var(--accent-red, #ef4444);
}

.manual__priority-badge--medium {
    background: var(--accent-yellow, #f59e0b);
}

.manual__priority-badge--low {
    background: var(--accent-blue, #8b5cf6);
}

.manual__feature-pages {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
}

.manual__roadmap {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.manual__roadmap-item {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
}

.manual__roadmap-date {
    background: var(--accent-blue, #8b5cf6);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 50px;
    font-size: 0.875rem;
    font-weight: 600;
    min-width: 120px;
    text-align: center;
    flex-shrink: 0;
}

.