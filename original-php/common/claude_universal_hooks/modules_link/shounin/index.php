<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>商品承認グリッドシステム | NAGANO-3</title>

  <!-- 外部ライブラリ -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />

  <style>
    /* ===== NAGANO-3共通変数 ===== */
    :root {
      --bg-primary: #f8fafc;
      --bg-secondary: #ffffff;
      --bg-tertiary: #f1f5f9;
      --bg-hover: #e2e8f0;
      --bg-active: #cbd5e1;
      
      --text-primary: #1e293b;
      --text-secondary: #475569;
      --text-tertiary: #64748b;
      --text-muted: #94a3b8;
      --text-white: #ffffff;
      
      --border-color: #e2e8f0;
      --border-light: #f1f5f9;
      --border-dark: #cbd5e1;
      
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      
      --filter-primary: #dc2626;
      --filter-primary-rgb: 220, 38, 38;
      --filter-secondary: #f59e0b;
      --filter-success: #10b981;
      --filter-warning: #f59e0b;
      --filter-danger: #dc2626;
      --filter-info: #06b6d4;
      
      --accent-blue: #06b6d4;
      --accent-purple: #8b5cf6;
      --accent-green: #10b981;
      --accent-yellow: #f59e0b;
      --accent-red: #ef4444;
      --accent-orange: #f97316;
      
      --risk-high: #dc2626;
      --risk-high-light: #fef2f2;
      --risk-medium: #f59e0b;
      --risk-medium-light: #fefbf0;
      --risk-low: #10b981;
      --risk-low-light: #f0fdf4;
      
      --ai-approved: #10b981;
      --ai-rejected: #dc2626;
      --ai-pending: #6b7280;
      
      --space-1: 0.25rem;
      --space-2: 0.5rem;
      --space-3: 0.75rem;
      --space-4: 1rem;
      --space-5: 1.25rem;
      --space-6: 1.5rem;
      --space-8: 2rem;
      
      --radius-sm: 0.25rem;
      --radius-md: 0.375rem;
      --radius-lg: 0.5rem;
      --radius-xl: 0.75rem;
      --radius-2xl: 1rem;
      
      --transition-fast: all 0.15s ease;
      --transition-normal: all 0.3s ease;
    }

    body {
      font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      margin: 0;
      padding: 0;
      transition: var(--transition-normal);
    }

    .approval__main-container {
      padding: var(--space-2);
      max-width: none;
      width: 100%;
      margin: 0;
      background: var(--bg-primary);
      min-height: 100vh;
    }

    /* ===== タブナビゲーション ===== */
    .approval__tab-nav {
      background: var(--bg-secondary);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      border: 1px solid var(--border-color);
      border-bottom: none;
      display: flex;
      margin-bottom: 0;
      box-shadow: var(--shadow-sm);
      overflow-x: auto;
    }

    .approval__tab-btn {
      background: none;
      border: none;
      padding: var(--space-3) var(--space-4);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      border-bottom: 3px solid transparent;
      transition: var(--transition-fast);
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-shrink: 0;
    }

    .approval__tab-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .approval__tab-btn--active {
      background: var(--bg-tertiary);
      color: var(--filter-primary);
      border-bottom-color: var(--filter-primary);
    }

    .approval__tab-content {
      display: none;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
      padding: var(--space-4);
      box-shadow: var(--shadow-md);
    }

    .approval__tab-content--active {
      display: block;
    }

    /* ===== ヘッダーセクション ===== */
    .approval__page-header {
      background: linear-gradient(135deg, #1e40af, #3b82f6);
      border-radius: var(--radius-xl);
      padding: var(--space-3);
      margin-bottom: var(--space-3);
      color: var(--text-white);
      box-shadow: var(--shadow-lg);
      position: relative;
      overflow: hidden;
    }

    .approval__page-header::before {
      content: '';
      position: absolute;
      top: -30%;
      right: -10%;
      width: 200px;
      height: 200px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      transform: rotate(45deg);
    }

    .approval__header-content {
      position: relative;
      z-index: 2;
    }

    .approval__page-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: var(--space-1);
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .approval__title-icon {
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      backdrop-filter: blur(10px);
    }

    /* ===== 統計・フィルターセクション ===== */
    .approval__controls {
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      padding: var(--space-3);
      margin-bottom: var(--space-3);
      box-shadow: var(--shadow-md);
      border: 1px solid var(--border-light);
    }

    .approval__stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: var(--space-2);
      margin-bottom: var(--space-3);
    }

    .approval__stat-card {
      background: var(--bg-tertiary);
      border-radius: var(--radius-md);
      padding: var(--space-2);
      text-align: center;
      border: 1px solid var(--border-color);
    }

    .approval__stat-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: var(--space-1);
    }

    .approval__stat-label {
      font-size: 0.7rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ===== フィルターコントロール ===== */
    .approval__filter-controls {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      align-items: center;
      margin-bottom: var(--space-2);
    }

    .approval__filter-group {
      display: flex;
      gap: var(--space-1);
      align-items: center;
      flex-wrap: wrap;
    }

    .approval__filter-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .approval__filter-btn {
      padding: 0.25rem 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 0.7rem;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition-fast);
      white-space: nowrap;
    }

    .approval__filter-btn:hover {
      background: var(--bg-hover);
      border-color: var(--filter-primary);
    }

    .approval__filter-btn--active {
      background: var(--filter-primary);
      border-color: var(--filter-primary);
      color: var(--text-white);
    }

    .approval__filter-count {
      background: var(--bg-hover);
      color: var(--text-secondary);
      padding: 2px 4px;
      border-radius: var(--radius-sm);
      font-size: 0.6rem;
      margin-left: var(--space-1);
    }

    .approval__filter-btn--active .approval__filter-count {
      background: rgba(255, 255, 255, 0.2);
      color: var(--text-white);
    }

    /* ===== 超高密度グリッドレイアウト ===== */
    .approval__grid-container {
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      padding: var(--space-1);
      box-shadow: var(--shadow-md);
      border: 1px solid var(--border-light);
    }

    .approval__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 4px;
      margin-bottom: var(--space-2);
    }

    /* ===== コンパクト商品カード（画像重視・半透明テキスト） ===== */
    .product-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      overflow: hidden;
      cursor: pointer;
      transition: var(--transition-fast);
      position: relative;
      height: 180px;
      display: flex;
      flex-direction: column;
    }

    .product-card:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
      border-color: var(--filter-info);
    }

    /* ===== 選択状態 ===== */
    .product-card--selected {
      border-color: var(--filter-primary);
      background: rgba(var(--filter-primary-rgb), 0.05);
      box-shadow: 0 0 0 2px rgba(var(--filter-primary-rgb), 0.3);
      transform: translateY(-2px);
    }

    .product-card--selected::after {
      content: '✓';
      position: absolute;
      top: 4px;
      right: 4px;
      background: var(--filter-primary);
      color: white;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6rem;
      font-weight: 700;
      z-index: 20;
    }

    /* ===== AI判定・リスク表示（極細ボーダー） ===== */
    .product-card--ai-approved { border-color: var(--ai-approved); }
    .product-card--ai-rejected { border-color: var(--ai-rejected); }
    .product-card--ai-pending { border-color: var(--ai-pending); }

    /* ===== 画像セクション（背景画像使用） ===== */
    .product-card__image-container {
      position: relative;
      height: 120px;
      background: var(--bg-tertiary);
      overflow: hidden;
      flex-shrink: 0;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }

    .product-card__image-placeholder {
      color: var(--text-muted);
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
    }

    /* ===== 半透明テキストオーバーレイ ===== */
    .product-card__text-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.4), transparent);
      color: white;
      padding: 8px 6px 4px;
      z-index: 10;
    }

    .product-card__title {
      font-size: 0.7rem;
      font-weight: 600;
      line-height: 1.1;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .product-card__price {
      font-size: 0.75rem;
      font-weight: 700;
      margin-bottom: 1px;
    }

    .product-card__details {
      display: flex;
      justify-content: space-between;
      font-size: 0.55rem;
      opacity: 0.9;
    }

    /* ===== バッジ（画像上） ===== */
    .product-card__badges {
      position: absolute;
      top: 3px;
      left: 3px;
      right: 3px;
      display: flex;
      justify-content: space-between;
      gap: 2px;
      z-index: 15;
      pointer-events: none;
    }

    .product-card__badge-left {
      display: flex;
      gap: 2px;
    }

    .product-card__badge-right {
      display: flex;
      gap: 2px;
    }

    .product-card__risk-badge,
    .product-card__ai-badge,
    .product-card__mall-badge {
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 0.5rem;
      font-weight: 700;
      color: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      backdrop-filter: blur(4px);
    }

    .product-card__risk-badge--high { background: rgba(220, 38, 38, 0.9); }
    .product-card__risk-badge--medium { background: rgba(245, 158, 11, 0.9); }
    .product-card__ai-badge--approved { background: rgba(16, 185, 129, 0.9); }
    .product-card__ai-badge--rejected { background: rgba(220, 38, 38, 0.9); }
    .product-card__ai-badge--pending { background: rgba(107, 114, 128, 0.9); }
    .product-card__mall-badge { background: rgba(255, 255, 255, 0.9); color: var(--text-primary); }

    /* ===== 情報セクション（コンパクト） ===== */
    .product-card__info {
      padding: 4px 6px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: var(--bg-secondary);
      font-size: 0.6rem;
    }

    .product-card__category {
      font-size: 0.5rem;
      font-weight: 600;
      color: var(--filter-info);
      text-transform: uppercase;
      margin-bottom: 1px;
    }

    .product-card__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2px;
    }

    .product-card__condition {
      padding: 1px 3px;
      border-radius: 2px;
      font-size: 0.45rem;
      font-weight: 700;
      color: white;
    }

    .product-card__condition--new { background: #2e7d32; }
    .product-card__condition--used { background: #5d4037; }
    .product-card__condition--preorder { background: #1565c0; }
    .product-card__condition--refurbished { background: #6a1b9a; }

    .product-card__sku {
      font-size: 0.45rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    /* ===== 主要操作ボタン ===== */
    .approval__main-actions {
      display: flex;
      justify-content: space-between;
      gap: var(--space-3);
      margin-top: var(--space-3);
      padding: var(--space-2);
      background: var(--bg-tertiary);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
    }

    .approval__selection-controls,
    .approval__decision-controls {
      display: flex;
      gap: var(--space-2);
    }

    .approval__main-btn {
      padding: var(--space-2) var(--space-4);
      border: none;
      border-radius: var(--radius-md);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition-fast);
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 80px;
      justify-content: center;
    }

    .approval__main-btn--select {
      background: var(--accent-blue);
      color: white;
    }

    .approval__main-btn--select:hover {
      background: #0891b2;
    }

    .approval__main-btn--deselect {
      background: var(--text-muted);
      color: white;
    }

    .approval__main-btn--deselect:hover {
      background: #64748b;
    }

    .approval__main-btn--approve {
      background: var(--filter-success);
      color: white;
    }

    .approval__main-btn--approve:hover {
      background: #059669;
    }

    .approval__main-btn--reject {
      background: var(--filter-danger);
      color: white;
    }

    .approval__main-btn--reject:hover {
      background: #dc2626;
    }

    /* ===== 一括操作バー ===== */
    .approval__bulk-actions {
      background: var(--bg-secondary);
      border: 2px solid var(--filter-primary);
      border-radius: var(--radius-lg);
      padding: var(--space-2);
      margin-bottom: var(--space-3);
      display: none;
      align-items: center;
      justify-content: space-between;
      box-shadow: var(--shadow-lg);
      position: sticky;
      top: var(--space-2);
      z-index: 100;
    }

    .approval__bulk-actions--show {
      display: flex;
    }

    .approval__bulk-info {
      font-weight: 600;
      color: var(--filter-primary);
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.9rem;
    }

    .approval__bulk-buttons {
      display: flex;
      gap: var(--space-2);
    }

    .approval__bulk-btn {
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition-fast);
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }

    .approval__bulk-btn--success {
      background: var(--filter-success);
      border-color: var(--filter-success);
      color: var(--text-white);
    }

    .approval__bulk-btn--danger {
      background: var(--filter-danger);
      border-color: var(--filter-danger);
      color: var(--text-white);
    }

    /* ===== ページネーション ===== */
    .approval__pagination {
      background: var(--bg-tertiary);
      border-radius: var(--radius-lg);
      padding: var(--space-2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      border: 1px solid var(--border-color);
    }

    /* ===== AIレコメンデーション ===== */
    .approval__ai-recommendations {
      background: linear-gradient(135deg, var(--accent-purple), var(--filter-info));
      border-radius: var(--radius-lg);
      padding: var(--space-3);
      margin-bottom: var(--space-3);
      color: var(--text-white);
    }

    .approval__ai-title {
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: var(--space-2);
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .approval__ai-summary {
      font-size: 0.8rem;
      opacity: 0.9;
    }

    /* ===== アニメーション ===== */
    @keyframes cardSlideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .product-card {
      animation: cardSlideIn 0.3s ease;
    }

    /* ===== レスポンシブ対応 ===== */
    @media (max-width: 768px) {
      .approval__main-container {
        padding: var(--space-1);
      }
      .approval__grid {
        grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
        gap: 3px;
      }
      .product-card {
        height: 140px;
      }
    }
  </style>
</head>

<body>
  <!-- メインコンテナ -->
  <main class="approval__main-container">
    
    <!-- ページヘッダー -->
    <header class="approval__page-header">
      <div class="approval__header-content">
        <h1 class="approval__page-title">
          <div class="approval__title-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          商品承認グリッドシステム（統合版）
        </h1>
        <p class="approval__page-subtitle">
          AI推奨システム × 高速グリッド承認 - クリック選択 × ボーダー色リスク判定
        </p>
      </div>
    </header>

    <!-- タブナビゲーション -->
    <nav class="approval__tab-nav">
      <button class="approval__tab-btn approval__tab-btn--active" data-tab="approval">
        <i class="fas fa-check-circle"></i>
        商品承認
      </button>
      <button class="approval__tab-btn" data-tab="analytics">
        <i class="fas fa-chart-bar"></i>
        承認分析
      </button>
    </nav>

    <!-- 商品承認タブ -->
    <div class="approval__tab-content approval__tab-content--active" id="approval">
      <!-- AI推奨セクション -->
      <section class="approval__ai-recommendations">
        <h2 class="approval__ai-title">
          <i class="fas fa-brain"></i>
          AI推奨: 要確認商品のみ表示中
        </h2>
        <div class="approval__ai-summary">
          低リスク商品 1,847件は自動承認済み。高・中リスク商品 <span id="totalProductCount">25</span>件を人間判定待ちで表示しています。
        </div>
      </section>

      <!-- 統計・コントロールセクション -->
      <section class="approval__controls">
        <!-- 統計表示 -->
        <div class="approval__stats-grid">
          <div class="approval__stat-card">
            <div class="approval__stat-value" id="pendingCount">25</div>
            <div class="approval__stat-label">承認待ち</div>
          </div>
          <div class="approval__stat-card">
            <div class="approval__stat-value">1,847</div>
            <div class="approval__stat-label">自動承認済み</div>
          </div>
          <div class="approval__stat-card">
            <div class="approval__stat-value" id="highRiskCount">13</div>
            <div class="approval__stat-label">高リスク</div>
          </div>
          <div class="approval__stat-card">
            <div class="approval__stat-value" id="mediumRiskCount">12</div>
            <div class="approval__stat-label">中リスク</div>
          </div>
          <div class="approval__stat-card">
            <div class="approval__stat-value">2.3分</div>
            <div class="approval__stat-label">平均処理時間</div>
          </div>
        </div>

        <!-- フィルターコントロール -->
        <div class="approval__filter-controls">
          <div class="approval__filter-group">
            <span class="approval__filter-label">表示:</span>
            <button class="approval__filter-btn approval__filter-btn--active" data-filter="all">
              すべて <span class="approval__filter-count" id="countAll">25</span>
            </button>
          </div>

          <div class="approval__filter-group">
            <span class="approval__filter-label">AI判定:</span>
            <button class="approval__filter-btn" data-filter="ai-approved">
              AI承認済み <span class="approval__filter-count" id="countAiApproved">13</span>
            </button>
            <button class="approval__filter-btn" data-filter="ai-rejected">
              AI非承認 <span class="approval__filter-count" id="countAiRejected">8</span>
            </button>
            <button class="approval__filter-btn" data-filter="ai-pending">
              AI判定待ち <span class="approval__filter-count" id="countAiPending">4</span>
            </button>
          </div>

          <div class="approval__filter-group">
            <span class="approval__filter-label">リスク:</span>
            <button class="approval__filter-btn" data-filter="high-risk">
              高リスク <span class="approval__filter-count" id="countHighRisk">13</span>
            </button>
            <button class="approval__filter-btn" data-filter="medium-risk">
              中リスク <span class="approval__filter-count" id="countMediumRisk">12</span>
            </button>
          </div>
        </div>

        <!-- 主要操作ボタン -->
        <div class="approval__main-actions">
          <div class="approval__selection-controls">
            <button class="approval__main-btn approval__main-btn--select" onclick="selectAllVisible()">
              <i class="fas fa-check-square"></i>
              全選択
            </button>
            <button class="approval__main-btn approval__main-btn--deselect" onclick="deselectAll()">
              <i class="fas fa-square"></i>
              全解除
            </button>
          </div>
          
          <div class="approval__decision-controls">
            <button class="approval__main-btn approval__main-btn--approve" onclick="bulkApprove()">
              <i class="fas fa-check"></i>
              承認
            </button>
            <button class="approval__main-btn approval__main-btn--reject" onclick="bulkReject()">
              <i class="fas fa-times"></i>
              非承認
            </button>
          </div>
        </div>
      </section>

      <!-- 一括操作バー -->
      <div class="approval__bulk-actions" id="bulkActions">
        <div class="approval__bulk-info">
          <i class="fas fa-check-square"></i>
          <span id="selectedCount">0</span>件 を選択中
        </div>
        <div class="approval__bulk-buttons">
          <button class="approval__bulk-btn approval__bulk-btn--success" onclick="bulkApprove()">
            <i class="fas fa-check"></i>
            一括承認
          </button>
          <button class="approval__bulk-btn approval__bulk-btn--danger" onclick="bulkReject()">
            <i class="fas fa-ban"></i>
            一括否認
          </button>
          <button class="approval__bulk-btn" onclick="bulkHold()">
            <i class="fas fa-pause"></i>
            一括保留
          </button>
          <button class="approval__bulk-btn" onclick="clearSelection()">
            <i class="fas fa-times"></i>
            選択クリア
          </button>
        </div>
      </div>

      <!-- メイングリッド -->
      <section class="approval__grid-container">
        <div class="approval__grid" id="productGrid">
          <!-- 商品カード動的生成領域 -->
        </div>

        <div class="approval__pagination">
          <div class="approval__pagination-info">
            <span id="displayRange">1-25件表示</span> / 全<span id="totalCount">25</span>件
          </div>
        </div>
      </section>
    </div>

    <!-- 承認分析タブ -->
    <div class="approval__tab-content" id="analytics">
      <h2>承認分析</h2>
      <p>承認データの分析機能は開発中です。</p>
    </div>
  </main>

  <script>
    // ===== グローバル変数 =====
    let selectedProducts = new Set();
    let currentFilter = 'all';
    let approvedCount = 0;
    let rejectedCount = 0;
    let heldCount = 0;
    let currentTab = 'approval';

    // ===== カテゴリ日本語名マッピング =====
    const categoryNames = {
      electronics: "電子機器",
      toys: "おもちゃ",
      books: "書籍",
      clothing: "衣類"
    };

    // ===== 仕入先名マッピング =====
    const sourceNames = {
      amazon: "Amazon",
      ebay: "eBay",
      shopify: "Shopify"
    };

    // ===== 初期化 =====
    document.addEventListener('DOMContentLoaded', function() {
      console.log('商品承認グリッドシステム 初期化開始');
      
      // タブ機能初期化
      initializeTabs();
      
      // 承認システム初期化
      initializeApprovalSystem();
      
      console.log('商品承認グリッドシステム 初期化完了');
    });

    // ===== タブ機能 =====
    function initializeTabs() {
      const tabButtons = document.querySelectorAll('.approval__tab-btn');
      const tabContents = document.querySelectorAll('.approval__tab-content');

      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          const targetTab = button.dataset.tab;
          
          // 全タブボタンの非アクティブ化
          tabButtons.forEach(btn => btn.classList.remove('approval__tab-btn--active'));
          
          // 全タブコンテンツの非表示
          tabContents.forEach(content => content.classList.remove('approval__tab-content--active'));
          
          // クリックされたタブのアクティブ化
          button.classList.add('approval__tab-btn--active');
          document.getElementById(targetTab).classList.add('approval__tab-content--active');
          
          currentTab = targetTab;
          console.log('タブ切り替え:', targetTab);
        });
      });
    }

    // ===== 承認システム初期化 =====
    function initializeApprovalSystem() {
      initializeFilters();
      updateBulkActions();
      updateStats();
      
      // 承認待ちデータ取得
      fetchApprovalQueue();
    }

    // ===== 承認待ちデータ取得API =====
    async function fetchApprovalQueue() {
      try {
        const response = await fetch('/api/approval_system.php/approval_queue', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.items) {
            console.log('API データ取得成功:', result.data.items.length, '件');
            renderProducts(result.data.items);
            updateStats();
          }
        } else {
          console.log('API接続失敗 - サンプルデータを使用');
          renderSampleProducts();
        }
      } catch (error) {
        console.log('API接続エラー - サンプルデータを使用:', error.message);
        renderSampleProducts();
      }
    }

    // ===== 商品ステータス更新API =====
    async function updateListingStatus(action, skus) {
      try {
        const response = await fetch('/api/approval_system.php/update_listing_status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: action,
            item_skus: skus
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('ステータス更新成功:', action, skus.length, '件');
          return true;
        } else {
          console.error('ステータス更新失敗:', result.error);
          return false;
        }
      } catch (error) {
        console.error('API通信エラー:', error);
        return false;
      }
    }

    // ===== サンプルデータレンダリング =====
    function renderSampleProducts() {
      const sampleData = [
        {
          sku: "EMV-ELE-H-001",
          title: "Apple Watch Series 9 GPS 45mm",
          price: 18500,
          stock: 1,
          condition: "new",
          category: "electronics",
          source: "amazon",
          image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300&h=200&fit=crop",
          risk: "high",
          ai: "approved",
          profitRate: 23.5
        },
        {
          sku: "EMV-TOY-M-002",
          title: "LEGO Creator Expert 10242",
          price: 12800,
          stock: 3,
          condition: "new",
          category: "toys",
          source: "ebay",
          image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=200&fit=crop",
          risk: "medium",
          ai: "approved",
          profitRate: 18.2
        },
        {
          sku: "EMV-BK-H-003",
          title: "Clean Code プログラマー必読書",
          price: 4200,
          stock: 1,
          condition: "used",
          category: "books",
          source: "shopify",
          image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=200&fit=crop",
          risk: "high",
          ai: "rejected",
          profitRate: 31.8
        },
        {
          sku: "EMV-ELE-H-005",
          title: "Sony WH-1000XM5 ヘッドフォン",
          price: 28900,
          stock: 1,
          condition: "preorder",
          category: "electronics",
          source: "ebay",
          image: "https://images.unsplash.com/photo-1567581935884-3349723552ca?w=300&h=200&fit=crop",
          risk: "high",
          ai: "rejected",
          profitRate: 27.3
        },
        {
          sku: "EMV-TOY-M-006",
          title: "1000ピース ジグソーパズル",
          price: 6750,
          stock: 2,
          condition: "used",
          category: "toys",
          source: "shopify",
          image: "https://images.unsplash.com/photo-1594736797933-d0bc02e4bb66?w=300&h=200&fit=crop",
          risk: "medium",
          ai: "approved",
          profitRate: 22.1
        }
      ];
      
      renderProducts(sampleData);
    }

    // ===== 商品カード生成 =====
    function createProductCard(product) {
      const aiClass = `product-card--ai-${product.ai}`;
      
      return `
        <div class="product-card ${aiClass}" 
             data-risk="${product.risk}" 
             data-ai="${product.ai}"
             data-category="${product.category}" 
             data-condition="${product.condition}"
             data-price="${product.price}"
             data-source="${product.source}"
             data-sku="${product.sku}"
             onclick="toggleSelection(this)">
          
          <div class="product-card__image-container" style="background-image: url('${product.image}')">
            <div class="product-card__badges">
              <div class="product-card__badge-left">
                <div class="product-card__risk-badge product-card__risk-badge--${product.risk}">
                  ${product.risk === 'high' ? '高' : '中'}
                </div>
                <div class="product-card__ai-badge product-card__ai-badge--${product.ai}">
                  ${product.ai === 'approved' ? 'AI承認' : product.ai === 'rejected' ? 'AI否認' : 'AI判定待ち'}
                </div>
              </div>
              <div class="product-card__badge-right">
                <div class="product-card__mall-badge">${sourceNames[product.source]}</div>
              </div>
            </div>
            
            <div class="product-card__text-overlay">
              <div class="product-card__title">${product.title}</div>
              <div class="product-card__price">¥${product.price.toLocaleString()}</div>
              <div class="product-card__details">
                <span>在庫: ${product.stock}個</span>
                <span>利益率: ${product.profitRate}%</span>
              </div>
            </div>
          </div>
          
          <div class="product-card__info">
            <div class="product-card__category">${categoryNames[product.category]}</div>
            <div class="product-card__footer">
              <div class="product-card__condition product-card__condition--${product.condition}">
                ${getConditionName(product.condition)}
              </div>
              <div class="product-card__sku">${product.sku}</div>
            </div>
          </div>
        </div>
      `;
    }

    // ===== コンディション名取得 =====
    function getConditionName(condition) {
      const names = {
        new: "新品",
        used: "中古",
        preorder: "予約",
        refurbished: "整備済"
      };
      return names[condition] || condition;
    }

    // ===== 商品レンダリング =====
    function renderProducts(products) {
      const grid = document.getElementById('productGrid');
      if (!grid) return;
      
      grid.innerHTML = products.map(product => createProductCard(product)).join('');
    }

    // ===== フィルター初期化 =====
    function initializeFilters() {
      const filterButtons = document.querySelectorAll('.approval__filter-btn');
      
      filterButtons.forEach(button => {
        button.addEventListener('click', function() {
          if (this.dataset.filter) {
            const group = this.closest('.approval__filter-group');
            const groupButtons = group.querySelectorAll('.approval__filter-btn');
            groupButtons.forEach(btn => btn.classList.remove('approval__filter-btn--active'));
            
            this.classList.add('approval__filter-btn--active');
            applyFilter(this.dataset.filter);
          }
        });
      });
    }

    // ===== フィルター適用 =====
    function applyFilter(filter) {
      currentFilter = filter;
      const cards = document.querySelectorAll('.product-card');
      
      cards.forEach(card => {
        let show = true;
        
        if (filter === 'all') {
          show = true;
        } else if (filter === 'ai-approved') {
          show = card.dataset.ai === 'approved';
        } else if (filter === 'ai-rejected') {
          show = card.dataset.ai === 'rejected';
        } else if (filter === 'ai-pending') {
          show = card.dataset.ai === 'pending';
        } else if (filter === 'high-risk') {
          show = card.dataset.risk === 'high';
        } else if (filter === 'medium-risk') {
          show = card.dataset.risk === 'medium';
        }
        
        if (show) {
          card.style.display = 'block';
          card.style.animation = 'cardSlideIn 0.3s ease';
        } else {
          card.style.display = 'none';
        }
      });
      
      console.log(`フィルター適用: ${filter}`);
    }

    // ===== 一括選択機能 =====
    function selectAllVisible() {
      const visibleCards = document.querySelectorAll('.product-card:not([style*="display: none"])');
      visibleCards.forEach(card => {
        if (card.dataset.sku && !selectedProducts.has(card.dataset.sku)) {
          selectedProducts.add(card.dataset.sku);
          card.classList.add('product-card--selected');
        }
      });
      updateBulkActions();
      showNotification(`${visibleCards.length}件の商品を選択しました`, 'info');
    }

    function deselectAll() {
      selectedProducts.clear();
      const cards = document.querySelectorAll('.product-card');
      cards.forEach(card => {
        card.classList.remove('product-card--selected');
      });
      updateBulkActions();
      showNotification('全選択を解除しました', 'info');
    }

    // ===== 商品選択の切り替え =====
    function toggleSelection(card) {
      if (!card || !card.dataset.sku) return;
      
      const sku = card.dataset.sku;
      
      if (selectedProducts.has(sku)) {
        selectedProducts.delete(sku);
        card.classList.remove('product-card--selected');
      } else {
        selectedProducts.add(sku);
        card.classList.add('product-card--selected');
      }
      
      updateBulkActions();
    }

    // ===== 承認・否認・保留処理 =====
    async function bulkApprove() {
      if (selectedProducts.size === 0) {
        showNotification('商品が選択されていません', 'warning');
        return;
      }
      
      if (confirm(`${selectedProducts.size}件の商品を承認しますか？`)) {
        const skuArray = Array.from(selectedProducts);
        const success = await updateListingStatus('approve', skuArray);
        
        if (success) {
          removeSelectedCards();
          approvedCount += selectedProducts.size;
          showNotification(`${selectedProducts.size}件の商品を承認しました`, 'success');
          
          selectedProducts.clear();
          updateBulkActions();
          updateStats();
        } else {
          showNotification('承認処理に失敗しました', 'danger');
        }
      }
    }

    async function bulkReject() {
      if (selectedProducts.size === 0) {
        showNotification('商品が選択されていません', 'warning');
        return;
      }
      
      if (confirm(`${selectedProducts.size}件の商品を否認しますか？`)) {
        const skuArray = Array.from(selectedProducts);
        const success = await updateListingStatus('reject', skuArray);
        
        if (success) {
          removeSelectedCards();
          rejectedCount += selectedProducts.size;
          showNotification(`${selectedProducts.size}件の商品を否認しました`, 'danger');
          
          selectedProducts.clear();
          updateBulkActions();
          updateStats();
        } else {
          showNotification('否認処理に失敗しました', 'danger');
        }
      }
    }

    async function bulkHold() {
      if (selectedProducts.size === 0) {
        showNotification('商品が選択されていません', 'warning');
        return;
      }
      
      if (confirm(`${selectedProducts.size}件の商品を保留にしますか？`)) {
        const skuArray = Array.from(selectedProducts);
        const success = await updateListingStatus('hold', skuArray);
        
        if (success) {
          removeSelectedCards();
          heldCount += selectedProducts.size;
          showNotification(`${selectedProducts.size}件の商品を保留にしました`, 'warning');
          
          selectedProducts.clear();
          updateBulkActions();
          updateStats();
        } else {
          showNotification('保留処理に失敗しました', 'danger');
        }
      }
    }

    // ===== 選択されたカードを削除 =====
    function removeSelectedCards() {
      document.querySelectorAll('.product-card').forEach(card => {
        if (card.dataset.sku && selectedProducts.has(card.dataset.sku)) {
          card.style.transform = 'scale(0.9)';
          card.style.opacity = '0.5';
          setTimeout(() => {
            if (card.parentNode) {
              card.remove();
            }
          }, 300);
        }
      });
    }

    // ===== 一括操作バーの更新 =====
    function updateBulkActions() {
      const bulkActions = document.getElementById('bulkActions');
      const selectedCount = document.getElementById('selectedCount');
      
      if (selectedProducts.size > 0) {
        bulkActions.classList.add('approval__bulk-actions--show');
        selectedCount.textContent = selectedProducts.size;
      } else {
        bulkActions.classList.remove('approval__bulk-actions--show');
      }
    }

    // ===== 選択クリア =====
    function clearSelection() {
      selectedProducts.clear();
      
      const cards = document.querySelectorAll('.product-card');
      cards.forEach(card => {
        card.classList.remove('product-card--selected');
      });
      
      updateBulkActions();
      showNotification('選択をクリアしました', 'info');
    }

    // ===== 統計更新 =====
    function updateStats() {
      const remainingCards = document.querySelectorAll('.product-card').length;
      
      const pendingCountEl = document.getElementById('pendingCount');
      const totalProductCountEl = document.getElementById('totalProductCount');
      const totalCountEl = document.getElementById('totalCount');
      const displayRangeEl = document.getElementById('displayRange');
      
      if (pendingCountEl) pendingCountEl.textContent = remainingCards;
      if (totalProductCountEl) totalProductCountEl.textContent = remainingCards;
      if (totalCountEl) totalCountEl.textContent = remainingCards;
      if (displayRangeEl) displayRangeEl.textContent = `1-${remainingCards}件表示`;
      
      updateFilterCounts();
    }

    // ===== フィルターカウント更新 =====
    function updateFilterCounts() {
      const cards = document.querySelectorAll('.product-card');
      
      const counts = {
        all: cards.length,
        aiApproved: 0,
        aiRejected: 0,
        aiPending: 0,
        highRisk: 0,
        mediumRisk: 0
      };
      
      cards.forEach(card => {
        const ai = card.dataset.ai;
        const risk = card.dataset.risk;
        
        if (ai === 'approved') counts.aiApproved++;
        if (ai === 'rejected') counts.aiRejected++;
        if (ai === 'pending') counts.aiPending++;
        
        if (risk === 'high') counts.highRisk++;
        if (risk === 'medium') counts.mediumRisk++;
      });
      
      // DOM更新
      const updateElement = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      };
      
      updateElement('countAll', counts.all);
      updateElement('countAiApproved', counts.aiApproved);
      updateElement('countAiRejected', counts.aiRejected);
      updateElement('countAiPending', counts.aiPending);
      updateElement('countHighRisk', counts.highRisk);
      updateElement('countMediumRisk', counts.mediumRisk);
    }

    // ===== 通知表示 =====
    function showNotification(message, type = 'info') {
      const notification = document.createElement('div');
      const bgColors = {
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#06b6d4'
      };
      
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${bgColors[type] || bgColors.info};
        color: white;
        border-radius: 8px;
        font-weight: 500;
        z-index: 1000;
        animation: cardSlideIn 0.3s ease;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        max-width: 300px;
      `;
      notification.textContent = message;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }, 3000);
    }

    console.log('商品承認グリッドシステム JavaScript読み込み完了');
  </script>
</body>
</html>