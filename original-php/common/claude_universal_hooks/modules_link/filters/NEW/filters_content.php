<?php
/**
 * フィルター管理メインコンテンツ
 * 
 * @package NAGANO-3
 * @subpackage Filters
 * @version 1.0.0
 * @author Emverze SaaS
 */

// CSSファイルの読み込み
?>
<link rel="stylesheet" href="/modules/ai_seigyo/filters.css">
<?php

// フィルター統計データ取得（将来的にはデータベースから）
$filter_stats = [
    'today_processed' => 1243,
    'filtered_out' => 127,
    'pending_review' => 15,
    'accuracy' => 99.2
];

// 段階別統計データ
$stage_stats = [
    1 => ['input' => 1243, 'passed' => 1180, 'filtered' => 63, 'accuracy' => 99.1, 'progress' => 95],
    2 => ['input' => 1180, 'passed' => 1142, 'filtered' => 38, 'accuracy' => 98.7, 'progress' => 88],
    3 => ['input' => 1142, 'passed' => 1120, 'filtered' => 22, 'accuracy' => 97.8, 'progress' => 72],
    4 => ['input' => 1120, 'passed' => 1105, 'filtered' => 15, 'accuracy' => 99.8, 'progress' => 65]
];

// NGワードデータ（将来的にはデータベースから）
$ng_words = [
    'R18', '成人向け', 'アダルト', '中古', '電子タバコ', 
    '偽造品', '医薬品', '危険物'
];

// 人間確認待ち商品データ
$pending_reviews = [
    [
        'id' => 2100,
        'sku' => 'EMV-STOCK-NEW-2100',
        'product' => 'Generic Bluetooth イヤホン',
        'reason' => '知的財産権の懸念',
        'reason_type' => 'ip',
        'confidence' => 85,
        'stage' => 3,
        'stage_name' => '画像AI'
    ],
    [
        'id' => 950,
        'sku' => 'EMV-STOCK-USED-950',
        'product' => '中古 電子体温計',
        'reason' => '医療機器の可能性',
        'reason_type' => 'medical',
        'confidence' => 92,
        'stage' => 2,
        'stage_name' => 'カテゴリ'
    ],
    [
        'id' => 1800,
        'sku' => 'EMV-STOCK-NEW-1800',
        'product' => 'ハーブティー ダイエットブレンド',
        'reason' => '医薬品的効果の表現',
        'reason_type' => 'health',
        'confidence' => 88,
        'stage' => 4,
        'stage_name' => 'テキストAI'
    ]
];

// カテゴリ除外設定
$blocked_categories = [
    'アダルト商品',
    '武器・危険物', 
    '医薬品・健康食品',
    'タバコ・電子タバコ',
    'アルコール',
    '偽造品・模造品'
];

// AIモデル設定
$ai_models = [
    'local' => [
        'name' => 'ローカルAI (DeepSeek)',
        'desc' => 'MacBook対応の軽量モデル。精度97%、処理速度: 高',
        'accuracy' => 97,
        'speed' => '高',
        'cost' => '無料',
        'icon' => 'fas fa-microchip'
    ],
    'google' => [
        'name' => 'Google Vision API',
        'desc' => '高精度モデル。精度99%、処理速度: 中、API料金あり',
        'accuracy' => 99,
        'speed' => '中',
        'cost' => '有料',
        'icon' => 'fas fa-cloud'
    ],
    'custom' => [
        'name' => '自社開発モデル',
        'desc' => '商品画像に特化したモデル。精度98%、処理速度: 中',
        'accuracy' => 98,
        'speed' => '中', 
        'cost' => '無料',
        'icon' => 'fas fa-cogs'
    ]
];

// フィルター段階設定
$filter_stages = [
    1 => [
        'title' => 'NGワードフィルター',
        'description' => 'キーワードベースのフィルタリングで、99%の危険商品を検出',
        'enabled' => true
    ],
    2 => [
        'title' => 'カテゴリベース判定',
        'description' => 'カテゴリベースのフィルタリングで、残り0.8%を検出',
        'enabled' => true
    ],
    3 => [
        'title' => '画像AI判定',
        'description' => '画像認識AIによるフィルタリングで、残り0.15%を検出',
        'enabled' => true
    ],
    4 => [
        'title' => '商品説明文AI解析',
        'description' => 'テキスト解析AIで残り0.05%を検出し、人間確認が必要な商品を特定',
        'enabled' => true
    ]
];

// 理由バッジのCSSクラス設定
function getReasonBadgeClass($reason_type) {
    $classes = [
        'ip' => 'filters__reason-badge--ip',
        'medical' => 'filters__reason-badge--medical',
        'health' => 'filters__reason-badge--health'
    ];
    return $classes[$reason_type] ?? 'filters__reason-badge--default';
}

// 段階バッジのCSSクラス設定
function getStageBadgeClass($stage) {
    return "filters__stage-badge--{$stage}";
}

// 数値フォーマット関数
function formatNumber($number) {
    return number_format($number);
}

// パーセンテージフォーマット関数
function formatPercentage($percentage) {
    return number_format($percentage, 1) . '%';
}
?>

<!-- フィルター概要セクション -->
<div class="filters__overview-section">
  <div class="filters__header">
    <h1 class="filters__title">
      <i class="fas fa-filter filters__title-icon"></i>
      AI多段階フィルター管理
    </h1>
    <div class="filters__header-actions">
      <button class="btn btn--secondary filters__export-btn" id="exportConfig">
        <i class="fas fa-download"></i>
        設定エクスポート
      </button>
      <button class="btn btn--primary filters__run-btn" id="runAllFilters">
        <i class="fas fa-play"></i>
        全フィルター実行
      </button>
    </div>
  </div>

  <div class="filters__description">
    <p>AIを活用した4段階フィルタリングにより、出品禁止商品や危険商品を自動的に検出します。フィルター精度は98.5%以上を実現しています。</p>
  </div>

  <!-- フィルター統計カード -->
  <div class="filters__stats-grid">
    <div class="filters__stat-card filters__stat-card--primary">
      <div class="filters__stat-header">
        <span class="filters__stat-title">今日の処理商品</span>
        <i class="fas fa-box filters__stat-icon"></i>
      </div>
      <div class="filters__stat-value" id="todayProcessed"><?= formatNumber($filter_stats['today_processed']) ?></div>
      <div class="filters__stat-trend">
        <i class="fas fa-arrow-up"></i>
        <span>+12.3% 前日比</span>
      </div>
    </div>

    <div class="filters__stat-card filters__stat-card--warning">
      <div class="filters__stat-header">
        <span class="filters__stat-title">フィルター除外</span>
        <i class="fas fa-ban filters__stat-icon"></i>
      </div>
      <div class="filters__stat-value" id="filteredOut"><?= formatNumber($filter_stats['filtered_out']) ?></div>
      <div class="filters__stat-trend">
        <i class="fas fa-arrow-down"></i>
        <span>-5.2% 前日比</span>
      </div>
    </div>

    <div class="filters__stat-card filters__stat-card--danger">
      <div class="filters__stat-header">
        <span class="filters__stat-title">人間確認待ち</span>
        <i class="fas fa-user-check filters__stat-icon"></i>
      </div>
      <div class="filters__stat-value" id="pendingReview"><?= formatNumber($filter_stats['pending_review']) ?></div>
      <div class="filters__stat-trend">
        <span>要対応</span>
      </div>
    </div>

    <div class="filters__stat-card filters__stat-card--success">
      <div class="filters__stat-header">
        <span class="filters__stat-title">フィルター精度</span>
        <i class="fas fa-target filters__stat-icon"></i>
      </div>
      <div class="filters__stat-value" id="accuracy"><?= formatPercentage($filter_stats['accuracy']) ?></div>
      <div class="filters__stat-trend">
        <i class="fas fa-arrow-up"></i>
        <span>+0.3% 先週比</span>
      </div>
    </div>
  </div>
</div>

<!-- フィルター段階セクション -->
<div class="filters__stages-section">
  
  <?php foreach($filter_stages as $stage_num => $stage_config): ?>
  <?php $stats = $stage_stats[$stage_num]; ?>
  
  <!-- 段階<?= $stage_num ?>: <?= $stage_config['title'] ?> -->
  <div class="filters__stage-card" data-stage="<?= $stage_num ?>">
    <div class="filters__stage-header">
      <div class="filters__stage-info">
        <div class="filters__stage-number"><?= $stage_num ?></div>
        <div class="filters__stage-title-group">
          <h3 class="filters__stage-title"><?= htmlspecialchars($stage_config['title']) ?></h3>
          <p class="filters__stage-description"><?= htmlspecialchars($stage_config['description']) ?></p>
        </div>
      </div>
      <div class="filters__stage-actions">
        <label class="filters__toggle">
          <input type="checkbox" <?= $stage_config['enabled'] ? 'checked' : '' ?> id="stage<?= $stage_num ?>Toggle" />
          <span class="filters__toggle-slider"></span>
        </label>
        <button class="btn btn--small btn--secondary filters__stage-settings" data-stage="<?= $stage_num ?>">
          <i class="fas fa-cog"></i>
          設定
        </button>
      </div>
    </div>

    <div class="filters__stage-stats">
      <div class="filters__stage-stat">
        <span class="filters__stage-stat-label">対象商品</span>
        <span class="filters__stage-stat-value"><?= formatNumber($stats['input']) ?></span>
      </div>
      <div class="filters__stage-stat">
        <span class="filters__stage-stat-label">通過</span>
        <span class="filters__stage-stat-value"><?= formatNumber($stats['passed']) ?></span>
      </div>
      <div class="filters__stage-stat">
        <span class="filters__stage-stat-label">除外</span>
        <span class="filters__stage-stat-value"><?= formatNumber($stats['filtered']) ?></span>
      </div>
      <div class="filters__stage-stat">
        <span class="filters__stage-stat-label">精度</span>
        <span class="filters__stage-stat-value"><?= formatPercentage($stats['accuracy']) ?></span>
      </div>
    </div>

    <div class="filters__stage-progress">
      <div class="filters__progress-bar">
        <div class="filters__progress-fill" style="width: <?= $stats['progress'] ?>%"></div>
      </div>
      <span class="filters__progress-text"><?= $stats['progress'] ?>% 完了</span>
    </div>

    <?php if($stage_num == 1): ?>
    <!-- NGワード管理 -->
    <div class="filters__ngword-section">
      <div class="filters__ngword-add">
        <input 
          type="text" 
          class="filters__ngword-input" 
          placeholder="NGワードを入力..." 
          id="ngwordInput"
        />
        <button class="btn btn--primary filters__ngword-add-btn" id="addNgword">
          <i class="fas fa-plus"></i>
          追加
        </button>
      </div>
      
      <div class="filters__ngword-tags" id="ngwordTags">
        <?php foreach($ng_words as $word): ?>
        <div class="filters__ngword-tag" data-word="<?= htmlspecialchars($word) ?>">
          <?= htmlspecialchars($word) ?> <button class="filters__ngword-remove">×</button>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
    <?php endif; ?>

    <?php if($stage_num == 2): ?>
    <!-- カテゴリ選択 -->
    <div class="filters__category-section">
      <div class="filters__category-info">
        <span class="filters__category-count">カテゴリデータベース: 10,432カテゴリ登録済み</span>
        <span class="filters__category-updated">最終更新: 2024/05/22</span>
      </div>
      
      <div class="filters__category-grid">
        <?php foreach($blocked_categories as $category): ?>
        <div class="filters__category-item filters__category-item--blocked">
          <i class="fas fa-times-circle"></i>
          <span><?= htmlspecialchars($category) ?></span>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
    <?php endif; ?>

    <?php if($stage_num == 3): ?>
    <!-- AI モデル選択 -->
    <div class="filters__ai-section">
      <div class="filters__ai-models">
        <?php foreach($ai_models as $model_key => $model): ?>
        <div class="filters__ai-model <?= $model_key === 'local' ? 'filters__ai-model--selected' : '' ?>" data-model="<?= $model_key ?>">
          <div class="filters__ai-model-header">
            <i class="<?= $model['icon'] ?>"></i>
            <span class="filters__ai-model-name"><?= htmlspecialchars($model['name']) ?></span>
          </div>
          <div class="filters__ai-model-desc"><?= htmlspecialchars($model['desc']) ?></div>
          <div class="filters__ai-model-stats">
            <span class="filters__ai-model-stat">精度: <?= $model['accuracy'] ?>%</span>
            <span class="filters__ai-model-stat">速度: <?= htmlspecialchars($model['speed']) ?></span>
            <span class="filters__ai-model-stat">コスト: <?= htmlspecialchars($model['cost']) ?></span>
          </div>
        </div>
        <?php endforeach; ?>
      </div>

      <!-- 検出しきい値 -->
      <div class="filters__threshold-section">
        <label class="filters__threshold-label">検出しきい値</label>
        <div class="filters__threshold-slider">
          <input 
            type="range" 
            class="filters__threshold-input" 
            min="0" 
            max="100" 
            value="85" 
            id="imageThreshold"
          />
          <div class="filters__threshold-labels">
            <span>緩い (誤検出↑)</span>
            <span id="imageThresholdValue">85%</span>
            <span>厳しい (見逃し↑)</span>
          </div>
        </div>
      </div>
    </div>
    <?php endif; ?>

    <?php if($stage_num == 4): ?>
    <!-- テキストAI設定 -->
    <div class="filters__text-ai-section">
      <div class="filters__setting-group">
        <label class="filters__setting-label">精度優先度</label>
        <select class="filters__setting-select" id="textAiMode">
          <option value="precision">精度優先 (偽陽性↓ 偽陰性↑)</option>
          <option value="balanced" selected>バランス型 (偽陽性↔ 偽陰性)</option>
          <option value="recall">検出優先 (偽陽性↑ 偽陰性↓)</option>
        </select>
      </div>

      <div class="filters__setting-group">
        <label class="filters__setting-label">人間確認しきい値</label>
        <div class="filters__threshold-slider">
          <input 
            type="range" 
            class="filters__threshold-input" 
            min="0" 
            max="100" 
            value="95" 
            id="humanThreshold"
          />
          <div class="filters__threshold-labels">
            <span>少ない確認作業</span>
            <span id="humanThresholdValue">95%</span>
            <span>多くの確認作業</span>
          </div>
        </div>
      </div>
    </div>
    <?php endif; ?>
  </div>
  <?php endforeach; ?>
</div>

<!-- 人間確認待ち商品セクション -->
<div class="filters__review-section">
  <div class="filters__review-header">
    <h2 class="filters__review-title">
      <i class="fas fa-user-check"></i>
      人間確認待ち商品
    </h2>
    <div class="filters__review-actions">
      <button class="btn btn--success filters__batch-approve" id="batchApprove">
        <i class="fas fa-check-double"></i>
        一括承認
      </button>
      <button class="btn btn--secondary" id="viewAllReviews">
        <i class="fas fa-list"></i>
        すべて表示
      </button>
    </div>
  </div>

  <div class="filters__review-table-container">
    <table class="filters__review-table">
      <thead>
        <tr>
          <th>
            <input type="checkbox" id="selectAllReviews" />
          </th>
          <th>SKU</th>
          <th>商品名</th>
          <th>確認理由</th>
          <th>信頼度</th>
          <th>検出段階</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody id="reviewTableBody">
        <?php foreach($pending_reviews as $review): ?>
        <tr class="filters__review-row">
          <td>
            <input type="checkbox" class="filters__review-checkbox" />
          </td>
          <td class="filters__review-sku"><?= htmlspecialchars($review['sku']) ?></td>
          <td class="filters__review-product"><?= htmlspecialchars($review['product']) ?></td>
          <td class="filters__review-reason">
            <span class="filters__reason-badge <?= getReasonBadgeClass($review['reason_type']) ?>">
              <?= htmlspecialchars($review['reason']) ?>
            </span>
          </td>
          <td class="filters__review-confidence">
            <span class="filters__confidence-value"><?= $review['confidence'] ?>%</span>
          </td>
          <td class="filters__review-stage">
            <span class="filters__stage-badge <?= getStageBadgeClass($review['stage']) ?>">
              <?= htmlspecialchars($review['stage_name']) ?>
            </span>
          </td>
          <td class="filters__review-actions">
            <button class="btn btn--small btn--success filters__approve-btn" data-id="<?= $review['id'] ?>">
              <i class="fas fa-check"></i>
              承認
            </button>
            <button class="btn btn--small btn--danger filters__reject-btn" data-id="<?= $review['id'] ?>">
              <i class="fas fa-times"></i>
              拒否
            </button>
          </td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>