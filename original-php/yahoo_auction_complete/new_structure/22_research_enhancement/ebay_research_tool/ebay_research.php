<?php
/**
 * eBay プロダクトリサーチツール
 * 独立したツールとして機能
 */

define('TOOL_NAME', 'eBay Product Research');
define('TOOL_DESCRIPTION', '日本での仕入れを考慮した利益商品分析ツール');

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= TOOL_NAME ?></title>
    <meta name="description" content="<?= TOOL_DESCRIPTION ?>">
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../assets/css/n3-core.css">
    <link rel="stylesheet" href="../assets/css/n3-components.css">
    
    <link rel="stylesheet" href="ebay_research.css">
</head>
<body class="n3-body">
    <header class="n3-header">
        <h1 class="n3-header-title">
            <i class="fas fa-search-dollar"></i>
            <?= TOOL_NAME ?>
        </h1>
        <p class="n3-header-description"><?= TOOL_DESCRIPTION ?></p>
    </header>

    <main class="n3-container">
        <div class="search-form-container n3-card">
            <form id="researchForm" class="search-form">
                <input type="text" id="query" class="n3-input n3-input-lg" placeholder="商品名、モデル、キーワードを入力..." required>
                <div class="advanced-filters-section">
                    <a href="#" id="toggleFilters" class="n3-link-sm">
                        <i class="fas fa-sliders-h"></i> 詳細フィルター
                    </a>
                    <div id="advancedFilters" style="display:none;">
                        <div class="filter-group">
                            <label for="sellerCountry">セラーの国</label>
                            <input type="text" id="sellerCountry" class="n3-input" placeholder="例: AU, GB, US">
                        </div>
                        <div class="filter-group">
                            <label for="condition">商品状態</label>
                            <select id="condition" class="n3-select">
                                <option value="">すべて</option>
                                <option value="NEW">新品</option>
                                <option value="USED">中古</option>
                            </select>
                        </div>
                        <div class="filter-group price-range">
                            <label>価格帯 (USD)</label>
                            <input type="number" id="priceMin" class="n3-input" placeholder="最低価格">
                            <span>-</span>
                            <input type="number" id="priceMax" class="n3-input" placeholder="最高価格">
                        </div>
                        </div>
                </div>
                <button type="submit" class="n3-btn n3-btn-primary n3-btn-lg">
                    <i class="fas fa-paper-plane"></i> リサーチ開始
                </button>
            </form>
        </div>

        <div id="resultsContainer" class="results-container">
            <div class="welcome-message">
                <i class="fas fa-chart-line"></i>
                <p>キーワードを入力して、利益の出る商品を見つけましょう。</p>
            </div>
        </div>
    </main>

    <script src="ebay_research.js"></script>
</body>
</html>