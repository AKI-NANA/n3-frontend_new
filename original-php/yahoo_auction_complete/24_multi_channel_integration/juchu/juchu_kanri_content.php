<?php
/**
 * NAGANO-3 eBay受注管理システム UI表示コンテンツ
 * 
 * 機能: 受注一覧表示・フィルター・詳細モーダル・統合UI
 * CSS: BEM準拠・日本語ローマ字命名・動的生成システム対応
 * JS: camelCase統一・window.N3_CONFIG連携
 */

// 受注データ取得（コントローラーから渡される）
$orders = $juchu_data['data'] ?? [];
$total_count = $juchu_data['total_count'] ?? 0;
$current_filters = $filter_params ?? [];
$is_fallback = ($juchu_data['status'] ?? '') === 'fallback';
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NAGANO-3 eBay受注管理システム</title>
    
    <!-- NAGANO-3動的CSS生成システム -->
    <link rel="stylesheet" href="/common/css/generate-n3.php?module=juchu_kanri&v=<?php echo time(); ?>">
    <link rel="stylesheet" href="/modules/juchu_kanri/css/juchu-kanri-layout.css?v=<?php echo time(); ?>">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>

<div class="juchu-kanri__container">
    <!-- システムヘッダー -->
    <header class="juchu-kanri__header">
        <div class="juchu-kanri__header-content">
            <h1 class="juchu-kanri__title">
                <i class="fas fa-shopping-cart"></i>
                eBay受注管理システム
            </h1>
            
            <div class="juchu-kanri__header-stats">
                <div class="juchu-kanri__stat-item">
                    <span class="juchu-kanri__stat-label">総件数</span>
                    <span class="juchu-kanri__stat-value"><?php echo number_format($total_count); ?></span>
                </div>
                
                <?php if ($is_fallback): ?>
                <div class="juchu-kanri__fallback-notice">
                    <i class="fas fa-exclamation-triangle"></i>
                    <?php echo htmlspecialchars($juchu_data['error_message']); ?>
                </div>
                <?php endif; ?>
            </div>
            
            <div class="juchu-kanri__header-actions">
                <button class="juchu-kanri__refresh-btn" onclick="juchuKanriManager.refreshData()">
                    <i class="fas fa-sync-alt"></i> 更新
                </button>
                
                <button class="juchu-kanri__export-btn" onclick="juchuKanriManager.exportData()">
                    <i class="fas fa-download"></i> エクスポート
                </button>
            </div>
        </div>
    </header>

    <!-- フィルターパネル -->
    <section class="juchu-kanri__filter-panel">
        <form class="juchu-kanri__filter-form" method="GET" action="">
            <input type="hidden" name="action" value="index">
            
            <div class="juchu-kanri__filter-row">
                <!-- アカウント別フィルター -->
                <div class="juchu-kanri__filter-group">
                    <label class="juchu-kanri__filter-label">アカウント</label>
                    <select class="juchu-kanri__filter-select" name="account">
                        <option value="">全アカウント</option>
                        <option value="eBay-JP-Main" <?php echo ($current_filters['account_filter'] === 'eBay-JP-Main') ? 'selected' : ''; ?>>eBay-JP-Main</option>
                        <option value="eBay-US-Sub" <?php echo ($current_filters['account_filter'] === 'eBay-US-Sub') ? 'selected' : ''; ?>>eBay-US-Sub</option>
                        <option value="eBay-EU-001" <?php echo ($current_filters['account_filter'] === 'eBay-EU-001') ? 'selected' : ''; ?>>eBay-EU-001</option>
                    </select>
                </div>
                
                <!-- ステータス別フィルター -->
                <div class="juchu-kanri__filter-group">
                    <label class="juchu-kanri__filter-label">ステータス</label>
                    <select class="juchu-kanri__filter-select" name="status">
                        <option value="">全ステータス</option>
                        <option value="awaiting_payment" <?php echo ($current_filters['status_filter'] === 'awaiting_payment') ? 'selected' : ''; ?>>支払い待ち</option>
                        <option value="payment_received" <?php echo ($current_filters['status_filter'] === 'payment_received') ? 'selected' : ''; ?>>支払い済み</option>
                        <option value="shipped" <?php echo ($current_filters['status_filter'] === 'shipped') ? 'selected' : ''; ?>>出荷済み</option>
                        <option value="delivered" <?php echo ($current_filters['status_filter'] === 'delivered') ? 'selected' : ''; ?>>配達完了</option>
                    </select>
                </div>
                
                <!-- 日付範囲フィルター -->
                <div class="juchu-kanri__filter-group">
                    <label class="juchu-kanri__filter-label">受注期間</label>
                    <div class="juchu-kanri__date-range">
                        <input type="date" class="juchu-kanri__filter-date" name="date_from" 
                               value="<?php echo htmlspecialchars($current_filters['date_from'] ?? ''); ?>">
                        <span class="juchu-kanri__date-separator">〜</span>
                        <input type="date" class="juchu-kanri__filter-date" name="date_to" 
                               value="<?php echo htmlspecialchars($current_filters['date_to'] ?? ''); ?>">
                    </div>
                </div>
                
                <!-- 支払い状況フィルター -->
                <div class="juchu-kanri__filter-group">
                    <label class="juchu-kanri__filter-label">支払い状況</label>
                    <select class="juchu-kanri__filter-select" name="payment_status">
                        <option value="">全支払い状況</option>
                        <option value="pending" <?php echo ($current_filters['payment_status'] === 'pending') ? 'selected' : ''; ?>>支払い待ち</option>
                        <option value="completed" <?php echo ($current_filters['payment_status'] === 'completed') ? 'selected' : ''; ?>>支払い完了</option>
                        <option value="failed" <?php echo ($current_filters['payment_status'] === 'failed') ? 'selected' : ''; ?>>支払い失敗</option>
                    </select>
                </div>
            </div>
            
            <div class="juchu-kanri__filter-actions">
                <button type="submit" class="juchu-kanri__filter-apply">
                    <i class="fas fa-search"></i> フィルター適用
                </button>
                
                <button type="button" class="juchu-kanri__filter-clear" onclick="juchuKanriManager.clearFilters()">
                    <i class="fas fa-times"></i> クリア
                </button>
            </div>
        </form>
    </section>

    <!-- タブナビゲーション -->
    <nav class="juchu-kanri__tab-navigation">
        <ul class="juchu-kanri__tab-list">
            <li class="juchu-kanri__tab-item juchu-kanri__tab-item--active">
                <a href="#" class="juchu-kanri__tab-link" data-tab="juchu">
                    <i class="fas fa-list"></i> 受注管理
                </a>
            </li>
            <li class="juchu-kanri__tab-item">
                <a href="/modules/shiire_kanri/php/shiire_kanri_controller.php" class="juchu-kanri__tab-link" data-tab="shiire">
                    <i class="fas fa-shopping-basket"></i> 仕入れ管理
                </a>
            </li>
            <li class="juchu-kanri__tab-item">
                <a href="/modules/shukka_kanri/php/shukka_kanri_controller.php" class="juchu-kanri__tab-link" data-tab="shukka">
                    <i class="fas fa-truck"></i> 出荷管理
                </a>
            </li>
            <li class="juchu-kanri__tab-item">
                <a href="/modules/rieki_bunseki/php/rieki_bunseki_controller.php" class="juchu-kanri__tab-link" data-tab="rieki">
                    <i class="fas fa-chart-line"></i> 利益分析
                </a>
            </li>
        </ul>
    </nav>

    <!-- 受注一覧メインテーブル -->
    <main class="juchu-kanri__main-content">
        <div class="juchu-kanri__table-container">
            <table class="juchu-kanri__order-table">
                <thead class="juchu-kanri__table-header">
                    <tr>
                        <th class="juchu-kanri__header-cell juchu-kanri__header-cell--renban">連番</th>
                        <th class="juchu-kanri__header-cell juchu-kanri__header-cell--order-id">受注番号</th>
                        <th class="juchu-kanri__header-cell juchu-kanri__header-cell--date">受注日</th>
                        <th class="juchu-kanri__header-cell juchu-kanri__header-cell--product">商品情報</th>
                        <th class="juchu-kanri__header-cell juchu-kanri__header-cell--price">売上・利益</th>
                        <th class="juchu-kanri__header-cell juchu-kanri__header-cell--payment">支払い</th>
                        <th class="juchu-kanri__header-cell juchu-kanri__header-cell--status">ステータス</th>
                        <th class="juchu-kanri__header-cell juchu-kanri__header-cell--score">AIスコア</th>
                        <th class="juchu-kanri__header-cell juchu-kanri__header-cell--actions">操作</th>
                    </tr>
                </thead>
                <tbody class="juchu-kanri__table-body">
                    <?php if (empty($orders)): ?>
                    <tr class="juchu-kanri__empty-row">
                        <td colspan="9" class="juchu-kanri__empty-cell">
                            <div class="juchu-kanri__empty-message">
                                <i class="fas fa-inbox"></i>
                                <p>条件に一致する受注データがありません。</p>
                            </div>
                        </td>
                    </tr>
                    <?php else: ?>
                        <?php foreach ($orders as $order): ?>
                        <tr class="juchu-kanri__order-row" data-order-id="<?php echo htmlspecialchars($order['juchu_bangou']); ?>">
                            <!-- 連番 -->
                            <td class="juchu-kanri__table-cell juchu-kanri__cell-renban">
                                <?php echo htmlspecialchars($order['renban']); ?>
                            </td>
                            
                            <!-- 受注番号 -->
                            <td class="juchu-kanri__table-cell juchu-kanri__cell-order-id">
                                <div class="juchu-kanri__order-info">
                                    <span class="juchu-kanri__order-number"><?php echo htmlspecialchars($order['juchu_bangou']); ?></span>
                                    <span class="juchu-kanri__account-badge juchu-kanri__account-badge--<?php echo strtolower(str_replace('-', '', $order['mall_account'])); ?>">
                                        <?php echo htmlspecialchars($order['mall_account']); ?>
                                    </span>
                                </div>
                            </td>
                            
                            <!-- 受注日・発送期限 -->
                            <td class="juchu-kanri__table-cell juchu-kanri__cell-date">
                                <div class="juchu-kanri__date-info">
                                    <div class="juchu-kanri__order-date">
                                        <?php echo date('m/d', strtotime($order['juchu_nichiji'])); ?>
                                    </div>
                                    <div class="juchu-kanri__shipping-deadline">
                                        期限: <?php echo date('m/d', strtotime($order['hakko_kigen'])); ?>
                                        <?php 
                                        $days_left = ceil((strtotime($order['hakko_kigen']) - time()) / (60*60*24));
                                        if ($days_left <= 2): ?>
                                            <span class="juchu-kanri__urgent-badge">急</span>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            </td>
                            
                            <!-- 商品情報 -->
                            <td class="juchu-kanri__table-cell juchu-kanri__cell-product">
                                <div class="juchu-kanri__product-info">
                                    <div class="juchu-kanri__product-image">
                                        <img src="<?php echo htmlspecialchars($order['shohin_gazo']); ?>" 
                                             alt="商品画像" class="juchu-kanri__product-img">
                                    </div>
                                    <div class="juchu-kanri__product-details">
                                        <div class="juchu-kanri__product-title">
                                            <?php echo htmlspecialchars($order['shohin_title']); ?>
                                        </div>
                                        <div class="juchu-kanri__product-sku">
                                            SKU: <?php echo htmlspecialchars($order['custom_label']); ?>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            
                            <!-- 売上・利益 -->
                            <td class="juchu-kanri__table-cell juchu-kanri__cell-price">
                                <div class="juchu-kanri__price-info">
                                    <div class="juchu-kanri__sale-price">
                                        ¥<?php echo number_format($order['uriage_kakaku']); ?>
                                    </div>
                                    <div class="juchu-kanri__profit-info">
                                        <span class="juchu-kanri__profit-amount">
                                            ¥<?php echo number_format($order['tesuryo_sashihiki_rieki']); ?>
                                        </span>
                                        <span class="juchu-kanri__profit-rate juchu-kanri__profit-rate--<?php echo ($order['rieki_ritsu'] >= 20) ? 'good' : (($order['rieki_ritsu'] >= 10) ? 'normal' : 'low'); ?>">
                                            (<?php echo number_format($order['rieki_ritsu'], 1); ?>%)
                                        </span>
                                    </div>
                                </div>
                            </td>
                            
                            <!-- 支払い情報 -->
                            <td class="juchu-kanri__table-cell juchu-kanri__cell-payment">
                                <div class="juchu-kanri__payment-info">
                                    <span class="juchu-kanri__payment-status juchu-kanri__payment-status--<?php echo $order['shiharai_jotai']; ?>">
                                        <?php 
                                        $payment_labels = [
                                            'pending' => '支払い待ち',
                                            'completed' => '支払い済み',
                                            'failed' => '支払い失敗'
                                        ];
                                        echo $payment_labels[$order['shiharai_jotai']] ?? $order['shiharai_jotai'];
                                        ?>
                                    </span>
                                    <?php if ($order['shiharai_bi']): ?>
                                    <div class="juchu-kanri__payment-date">
                                        <?php echo date('m/d H:i', strtotime($order['shiharai_bi'])); ?>
                                    </div>
                                    <?php endif; ?>
                                </div>
                            </td>
                            
                            <!-- ステータス -->
                            <td class="juchu-kanri__table-cell juchu-kanri__cell-status">
                                <div class="juchu-kanri__status-badges">
                                    <span class="juchu-kanri__order-status juchu-kanri__order-status--<?php echo $order['order_status']; ?>">
                                        <?php 
                                        $status_labels = [
                                            'awaiting_payment' => '支払い待ち',
                                            'payment_received' => '支払い済み',
                                            'shipped' => '出荷済み',
                                            'delivered' => '配達完了'
                                        ];
                                        echo $status_labels[$order['order_status']] ?? $order['order_status'];
                                        ?>
                                    </span>
                                    
                                    <?php if (!empty($order['shukka_status'])): ?>
                                    <span class="juchu-kanri__shipping-status juchu-kanri__shipping-status--<?php echo $order['shukka_status']; ?>">
                                        <?php echo htmlspecialchars($order['shukka_status']); ?>
                                    </span>
                                    <?php endif; ?>
                                    
                                    <span class="juchu-kanri__risk-level juchu-kanri__risk-level--<?php echo $order['risk_level']; ?>">
                                        <?php 
                                        $risk_labels = ['low' => '低', 'medium' => '中', 'high' => '高'];
                                        echo 'リスク' . $risk_labels[$order['risk_level']];
                                        ?>
                                    </span>
                                </div>
                            </td>
                            
                            <!-- AIスコア -->
                            <td class="juchu-kanri__table-cell juchu-kanri__cell-score">
                                <?php if ($order['ai_score']): ?>
                                <div class="juchu-kanri__ai-score">
                                    <div class="juchu-kanri__score-value juchu-kanri__score-value--<?php echo ($order['ai_score'] >= 70) ? 'high' : (($order['ai_score'] >= 40) ? 'medium' : 'low'); ?>">
                                        <?php echo $order['ai_score']; ?>
                                    </div>
                                    <div class="juchu-kanri__score-bar">
                                        <div class="juchu-kanri__score-fill" style="width: <?php echo $order['ai_score']; ?>%"></div>
                                    </div>
                                </div>
                                <?php else: ?>
                                <span class="juchu-kanri__score-na">-</span>
                                <?php endif; ?>
                            </td>
                            
                            <!-- 操作ボタン -->
                            <td class="juchu-kanri__table-cell juchu-kanri__cell-actions">
                                <div class="juchu-kanri__action-buttons">
                                    <button class="juchu-kanri__action-btn juchu-kanri__action-btn--detail" 
                                            onclick="juchuKanriManager.showOrderDetail('<?php echo htmlspecialchars($order['juchu_bangou']); ?>')">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    
                                    <?php if ($order['ebay_detail_url']): ?>
                                    <a href="<?php echo htmlspecialchars($order['ebay_detail_url']); ?>" 
                                       target="_blank" class="juchu-kanri__action-btn juchu-kanri__action-btn--ebay">
                                        <i class="fab fa-ebay"></i>
                                    </a>
                                    <?php endif; ?>
                                    
                                    <button class="juchu-kanri__action-btn juchu-kanri__action-btn--shiire" 
                                            onclick="juchuKanriManager.openShiireView('<?php echo htmlspecialchars($order['custom_label']); ?>')">
                                        <i class="fas fa-shopping-basket"></i>
                                    </button>
                                    
                                    <button class="juchu-kanri__action-btn juchu-kanri__action-btn--shukka" 
                                            onclick="juchuKanriManager.openShukkaView('<?php echo htmlspecialchars($order['juchu_bangou']); ?>')">
                                        <i class="fas fa-truck"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        
        <!-- ページネーション -->
        <div class="juchu-kanri__pagination">
            <div class="juchu-kanri__pagination-info">
                表示中: 1-<?php echo count($orders); ?> / 全<?php echo $total_count; ?>件
            </div>
            
            <div class="juchu-kanri__pagination-controls">
                <button class="juchu-kanri__page-btn juchu-kanri__page-btn--prev" disabled>
                    <i class="fas fa-chevron-left"></i> 前へ
                </button>
                
                <span class="juchu-kanri__page-numbers">
                    <span class="juchu-kanri__page-number juchu-kanri__page-number--current">1</span>
                </span>
                
                <button class="juchu-kanri__page-btn juchu-kanri__page-btn--next" disabled>
                    次へ <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    </main>
</div>

<!-- 詳細モーダル -->
<div class="juchu-kanri__modal-overlay" id="orderDetailModal" style="display: none;">
    <div class="juchu-kanri__modal-container">
        <div class="juchu-kanri__modal-header">
            <h3 class="juchu-kanri__modal-title">受注詳細情報</h3>
            <button class="juchu-kanri__modal-close" onclick="juchuKanriManager.closeOrderDetail()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="juchu-kanri__modal-content" id="orderDetailContent">
            <!-- 詳細内容はJavaScriptで動的生成 -->
        </div>
    </div>
</div>

<!-- NAGANO-3動的JS生成システム -->
<script src="/common/js/generate-n3.php?module=juchu_kanri&v=<?php echo time(); ?>"></script>
<script src="/modules/juchu_kanri/js/juchuKanriManager.js?v=<?php echo time(); ?>"></script>

<script>
// ページ読み込み完了時の初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 NAGANO-3 eBay受注管理システム ページ初期化開始');
    
    // 受注データをJavaScriptに渡す
    window.juchuOrderData = <?php echo json_encode($orders); ?>;
    window.juchuTotalCount = <?php echo $total_count; ?>;
    window.juchuCurrentFilters = <?php echo json_encode($current_filters); ?>;
    
    // 受注管理マネージャー初期化
    if (typeof juchuKanriManager !== 'undefined') {
        juchuKanriManager.init();
    }
    
    console.log('✅ eBay受注管理システム 初期化完了');
});
</script>

</body>
</html>