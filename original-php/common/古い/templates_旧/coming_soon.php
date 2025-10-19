<?php
/**
 * 準備中ページテンプレート - CSS修正版
 * /common/templates/coming_soon.php
 * ✅ CSS変数読み込み修正・スタイル崩れ解消
 */
$module_titles = [
    'chumon' => '注文管理',
    'bunseki' => '分析',
    'amazon' => 'Amazon連携',
    'kicho' => '記帳管理',
    'sales_report' => '売上レポート',
    'profit_analysis' => '利益分析',
    'period_comparison' => '期間比較',
    'shipping_queue' => '出荷待ち',
    'shipping_status' => '配送状況',
    'tracking_number' => '追跡番号',
    'task_calendar' => 'タスクカレンダー',
    'image_management' => '画像管理',
    'mall_integration' => 'モール統合管理',
    'domestic_sales' => '国内販売',
    'international_sales' => '海外販売',
    'inquiry_management' => '問い合わせ一元化'
];

$current_module_title = $module_titles[$current_page] ?? 'モジュール';
?>

<div class="coming-soon">
    <div class="coming-soon__container">
        <div class="coming-soon__icon">
            <i class="fas fa-cog fa-spin"></i>
        </div>
        <h2 class="coming-soon__title"><?= htmlspecialchars($current_module_title) ?></h2>
        <p class="coming-soon__message">この機能は現在開発中です</p>
        <div class="coming-soon__details">
            <p>近日中に以下の機能を提供予定です：</p>
            <ul class="coming-soon__features">
                <?php if ($current_page === 'chumon'): ?>
                <li>注文の受付・管理</li>
                <li>顧客情報の管理</li>
                <li>配送状況の追跡</li>
                <li>売上レポート</li>
                <?php elseif ($current_page === 'bunseki'): ?>
                <li>売上分析ダッシュボード</li>
                <li>商品別収益分析</li>
                <li>顧客行動分析</li>
                <li>予測分析機能</li>
                <?php elseif ($current_page === 'amazon'): ?>
                <li>Amazon出品管理</li>
                <li>在庫同期機能</li>
                <li>価格最適化</li>
                <li>売上データ連携</li>
                <?php elseif (strpos($current_page, 'sales') !== false || strpos($current_page, 'profit') !== false): ?>
                <li>詳細売上分析</li>
                <li>利益率計算</li>
                <li>期間別比較</li>
                <li>グラフ表示</li>
                <?php elseif (strpos($current_page, 'shipping') !== false): ?>
                <li>出荷管理システム</li>
                <li>配送業者連携</li>
                <li>追跡機能</li>
                <li>配送完了通知</li>
                <?php elseif (strpos($current_page, 'mall') !== false): ?>
                <li>Amazon・eBay・楽天連携</li>
                <li>在庫同期</li>
                <li>価格管理</li>
                <li>注文統合管理</li>
                <?php else: ?>
                <li>データ管理機能</li>
                <li>レポート作成</li>
                <li>統計分析</li>
                <li>システム連携</li>
                <?php endif; ?>
            </ul>
        </div>
        <div class="coming-soon__actions">
            <a href="/?page=dashboard" class="btn btn--primary coming-soon__btn">
                <i class="fas fa-home"></i>
                ダッシュボードに戻る
            </a>
        </div>
    </div>
</div>

<style>
/* ===== 準備中ページ専用CSS（CSS変数対応版） ===== */
.coming-soon {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 70px); /* ヘッダー分を除く */
  padding: 2rem;
  background: var(--bg-primary, #f7f8f9);
}

.coming-soon__container {
  text-align: center;
  max-width: 600px;
  background: var(--bg-secondary, #fcfcfd);
  padding: 3rem 2rem;
  border-radius: 16px; /* var(--radius-xl, 16px) */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15); /* var(--shadow-lg) */
  border: 1px solid var(--border-color, #d1d5db);
}

.coming-soon__icon {
  font-size: 4rem;
  color: var(--color-primary, #3b82f6);
  margin-bottom: 1.5rem;
}

.coming-soon__title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary, #1f2937);
  margin-bottom: 1rem;
}

.coming-soon__message {
  font-size: 1.125rem;
  color: var(--text-secondary, #4b5563);
  margin-bottom: 2rem;
}

.coming-soon__details {
  text-align: left;
  background: var(--bg-primary, #f7f8f9);
  padding: 1.5rem;
  border-radius: 12px; /* var(--radius-lg) */
  margin-bottom: 2rem;
  border: 1px solid var(--border-color, #d1d5db);
}

.coming-soon__details p {
  margin-bottom: 1rem;
  color: var(--text-primary, #1f2937);
  font-weight: 600;
}

.coming-soon__features {
  margin: 1rem 0 0 1.5rem;
  color: var(--text-primary, #1f2937);
  list-style: none;
}

.coming-soon__features li {
  margin-bottom: 0.75rem;
  position: relative;
  padding-left: 1.5rem;
}

.coming-soon__features li::before {
  content: "✓";
  color: var(--color-success, #059669);
  font-weight: bold;
  position: absolute;
  left: 0;
  top: 0;
}

.coming-soon__actions {
  margin-top: 2rem;
}

.coming-soon__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6));
  color: white;
  text-decoration: none;
  border-radius: 8px; /* var(--radius-md) */
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.3s ease; /* var(--transition-normal) */
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  border: none;
}

.coming-soon__btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
  background: linear-gradient(135deg, var(--color-secondary, #8b5cf6), var(--color-primary, #3b82f6));
}

.coming-soon__btn i {
  font-size: 1rem;
}

/* ダークテーマ対応 */
[data-theme="dark"] .coming-soon {
  background: #1f2937;
}

[data-theme="dark"] .coming-soon__container {
  background: #374151;
  border-color: #4b5563;
}

[data-theme="dark"] .coming-soon__title {
  color: #f9fafb;
}

[data-theme="dark"] .coming-soon__message {
  color: #d1d5db;