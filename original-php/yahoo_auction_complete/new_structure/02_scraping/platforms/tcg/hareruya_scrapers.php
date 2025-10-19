<?php
/**
 * 晴れる屋共通基底クラス + 3サイト実装
 * 
 * - 晴れる屋MTG
 * - 晴れる屋2 (ポケカ)
 * - 晴れる屋3 (総合)
 * 
 * @version 1.0.0
 * @created 2025-09-26
 */

require_once __DIR__ . '/../../common/TCGScraperBase.php';

// ============================================
// 晴れる屋共通基底クラス
// ============================================

abstract class HareruyaBaseScraper extends TCGScraperBase {
    
    /**
     * 晴れる屋共通の商品ID抽出
     */
    protected function extractProductId($url) {
        $patterns = [
            '/\/products\/([a-zA-Z0-9_-]+)/',
            '/\/product\/([a-zA-Z0-9_-]+)/',
            '/product_id=([a-zA-Z0-9_-]+)/'
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $url, $matches)) {
                return $this->platformName . '_' . $matches[1];
            }
        }
        
        throw new Exception('晴れる屋商品ID抽出失敗: ' . $url);
    }
    
    /**
     * 晴れる屋共通の商品ページ解析
     */
    protected function parseProductPage($html, $url) {
        $dom = new DOMDocument();
        @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
        $xpath = new DOMXPath($dom);
        
        $baseData = [
            'title' => $this->extractTitle($html, $xpath),
            'price' => $this->extractPrice($html, $xpath),
            'condition' => $this->extractCondition($html, $xpath),
            'stock_text' => $this->extractStockText($html, $xpath),
            'image_url' => $this->extractImage($html, $xpath),
            'description' => $this->extractDescription($html, $xpath),
            'rarity' => $this->extractRarity($html, $xpath),
            'set_name' => $this->extractSetName($html, $xpath),
            'card_number' => $this->extractCardNumber($html, $xpath)
        ];
        
        // サブクラス固有のデータ追加
        $baseData['specific'] = $this->extractSpecificData($html, $xpath);
        $baseData['tcg_category'] = $this->getTCGCategory();
        
        return $baseData;
    }
    
    /**
     * TCGカテゴリ取得（サブクラスで実装）
     */
    abstract protected function getTCGCategory();
    
    /**
     * 固有データ抽出（サブクラスで実装）
     */
    abstract protected function extractSpecificData($html, $xpath);
    
    /**
     * 共通タイトル抽出
     */
    protected function extractTitle($html, $xpath) {
        $selectors = $this->config['selectors']['title'] ?? ['h1.product-name', '.card-name', 'h1'];
        return $this->extractBySelectors($xpath, $selectors) ?: 'タイトル取得失敗';
    }
    
    /**
     * 共通価格抽出
     */
    protected function extractPrice($html, $xpath) {
        $selectors = $this->config['selectors']['price'] ?? ['.product-price', '.price', '.price-tag'];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $priceText = $this->extractByXPath($xpath, $xpathQuery);
            
            if (!empty($priceText)) {
                return $this->extractNumericPrice($priceText);
            }
        }
        
        return 0.0;
    }
    
    /**
     * 共通状態抽出
     */
    protected function extractCondition($html, $xpath) {
        $selectors = $this->config['selectors']['condition'] ?? ['.condition', '.grade'];
        return $this->extractBySelectors($xpath, $selectors) ?: 'unknown';
    }
    
    /**
     * 共通在庫テキスト抽出
     */
    protected function extractStockText($html, $xpath) {
        $selectors = $this->config['selectors']['stock'] ?? ['.stock-info', '.availability'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    /**
     * 共通画像抽出
     */
    protected function extractImage($html, $xpath) {
        $selectors = $this->config['selectors']['image'] ?? ['.product-image img', '.card-image img'];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $nodes = $xpath->query($xpathQuery);
            
            if ($nodes->length > 0) {
                $img = $nodes->item(0);
                if ($img->hasAttribute('src')) {
                    return $img->getAttribute('src');
                }
            }
        }
        
        return '';
    }
    
    /**
     * 共通説明文抽出
     */
    protected function extractDescription($html, $xpath) {
        $selectors = ['.product-description', '.description', '.item-desc'];
        return strip_tags($this->extractBySelectors($xpath, $selectors));
    }
    
    /**
     * 共通レアリティ抽出
     */
    protected function extractRarity($html, $xpath) {
        $selectors = $this->config['selectors']['rarity'] ?? ['.rarity', '.rare-symbol'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    /**
     * 共通セット名抽出
     */
    protected function extractSetName($html, $xpath) {
        $selectors = $this->config['selectors']['set_name'] ?? ['.set-name', '.expansion'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    /**
     * 共通カード番号抽出
     */
    protected function extractCardNumber($html, $xpath) {
        $selectors = $this->config['selectors']['card_number'] ?? ['.card-number', '.collector-number'];
        return $this->extractBySelectors($xpath, $selectors);
    }
}

// ============================================
// 晴れる屋MTGスクレイパー
// ============================================

class HareruyaMTGScraper extends HareruyaBaseScraper {
    
    public function __construct($pdo) {
        parent::__construct($pdo, 'hareruya_mtg');
    }
    
    protected function loadConfig() {
        $allConfigs = require __DIR__ . '/../../config/tcg_platforms_config.php';
        $this->config = $allConfigs['hareruya_mtg'];
    }
    
    protected function getTCGCategory() {
        return 'MTG';
    }
    
    protected function extractSpecificData($html, $xpath) {
        return [
            'mtg_color' => $this->extractMTGColor($html, $xpath),
            'mtg_type' => $this->extractMTGType($html, $xpath),
            'mtg_mana_cost' => $this->extractManaCost($html, $xpath),
            'language' => $this->extractLanguage($html, $xpath)
        ];
    }
    
    private function extractMTGColor($html, $xpath) {
        $selectors = ['.color-identity', '.card-color', '.mana-color'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractMTGType($html, $xpath) {
        $selectors = ['.type-line', '.card-type'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractManaCost($html, $xpath) {
        $selectors = ['.mana-cost', '.casting-cost'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractLanguage($html, $xpath) {
        $selectors = ['.language', '.lang'];
        $lang = $this->extractBySelectors($xpath, $selectors);
        
        if (stripos($lang, '日本') !== false) return 'Japanese';
        if (stripos($lang, '英語') !== false) return 'English';
        
        return $lang ?: 'Unknown';
    }
}

// ============================================
// 晴れる屋2 (ポケカ) スクレイパー
// ============================================

class Hareruya2Scraper extends HareruyaBaseScraper {
    
    public function __construct($pdo) {
        parent::__construct($pdo, 'hareruya2');
    }
    
    protected function loadConfig() {
        $allConfigs = require __DIR__ . '/../../config/tcg_platforms_config.php';
        $this->config = $allConfigs['hareruya2'];
    }
    
    protected function getTCGCategory() {
        return 'Pokemon';
    }
    
    protected function extractSpecificData($html, $xpath) {
        return [
            'pokemon_hp' => $this->extractPokemonHP($html, $xpath),
            'pokemon_type' => $this->extractPokemonType($html, $xpath),
            'regulation_mark' => $this->extractRegulationMark($html, $xpath),
            'evolution' => $this->extractEvolution($html, $xpath)
        ];
    }
    
    private function extractPokemonHP($html, $xpath) {
        $hpSelectors = ['.pokemon-hp', '.hp-value', '.hp'];
        $hp = $this->extractBySelectors($xpath, $hpSelectors);
        
        // 数値のみ抽出
        if (preg_match('/(\d+)/', $hp, $matches)) {
            return $matches[1];
        }
        
        return '';
    }
    
    private function extractPokemonType($html, $xpath) {
        $typeSelectors = ['.pokemon-type', '.type-icon', '.type'];
        return $this->extractBySelectors($xpath, $typeSelectors);
    }
    
    private function extractRegulationMark($html, $xpath) {
        $regSelectors = ['.regulation-mark', '.regulation', '.reg-mark'];
        return $this->extractBySelectors($xpath, $regSelectors);
    }
    
    private function extractEvolution($html, $xpath) {
        $evoSelectors = ['.evolution', '.evolution-stage', '.stage'];
        return $this->extractBySelectors($xpath, $evoSelectors);
    }
}

// ============================================
// 晴れる屋3 (総合) スクレイパー
// ============================================

class Hareruya3Scraper extends HareruyaBaseScraper {
    
    public function __construct($pdo) {
        parent::__construct($pdo, 'hareruya3');
    }
    
    protected function loadConfig() {
        $allConfigs = require __DIR__ . '/../../config/tcg_platforms_config.php';
        $this->config = $allConfigs['hareruya3'];
    }
    
    protected function getTCGCategory() {
        // URLやコンテンツからカテゴリ判定
        return $this->detectCategoryFromUrl() ?: 'Multi_TCG';
    }
    
    protected function extractSpecificData($html, $xpath) {
        $category = $this->getTCGCategory();
        
        // カテゴリに応じた固有データ抽出
        switch ($category) {
            case 'MTG':
                return $this->extractMTGData($html, $xpath);
            case 'Pokemon':
                return $this->extractPokemonData($html, $xpath);
            default:
                return ['category' => $category];
        }
    }
    
    private function detectCategoryFromUrl() {
        $url = $this->config['base_url'] ?? '';
        
        if (stripos($url, 'mtg') !== false) return 'MTG';
        if (stripos($url, 'pokemon') !== false) return 'Pokemon';
        if (stripos($url, 'yugioh') !== false) return 'Yugioh';
        
        return null;
    }
    
    private function extractMTGData($html, $xpath) {
        return [
            'mtg_color' => $this->extractBySelectors($xpath, ['.color', '.mana-color']),
            'mtg_type' => $this->extractBySelectors($xpath, ['.type', '.card-type'])
        ];
    }
    
    private function extractPokemonData($html, $xpath) {
        return [
            'pokemon_hp' => $this->extractBySelectors($xpath, ['.hp', '.pokemon-hp']),
            'pokemon_type' => $this->extractBySelectors($xpath, ['.type', '.pokemon-type'])
        ];
    }
}
