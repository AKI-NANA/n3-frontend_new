<?php
/**
 * 総合TCGサイトスクレイパー
 * 
 * - 遊々亭
 * - 駿河屋
 * - ドラスタ
 * - ポケカネット
 * - SNKRDUNK
 * 
 * @version 1.0.0
 * @created 2025-09-26
 */

require_once __DIR__ . '/../../common/TCGScraperBase.php';

// ============================================
// 遊々亭スクレイパー（総合TCG）
// ============================================

class YuyuTeiScraper extends TCGScraperBase {
    
    public function __construct($pdo) {
        parent::__construct($pdo, 'yuyu_tei');
    }
    
    protected function loadConfig() {
        $allConfigs = require __DIR__ . '/../../config/tcg_platforms_config.php';
        $this->config = $allConfigs['yuyu_tei'];
    }
    
    protected function extractProductId($url) {
        $patterns = [
            '/game_([a-zA-Z0-9_-]+)/',
            '/sell\/([a-zA-Z0-9_-]+)/'
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $url, $matches)) {
                return 'yyt_' . $matches[1];
            }
        }
        
        throw new Exception('遊々亭商品ID抽出失敗: ' . $url);
    }
    
    protected function parseProductPage($html, $url) {
        $dom = new DOMDocument();
        @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
        $xpath = new DOMXPath($dom);
        
        $tcgCategory = $this->detectTCGCategory($url);
        
        return [
            'title' => $this->extractTitle($html, $xpath),
            'price' => $this->extractPrice($html, $xpath),
            'condition' => $this->extractCondition($html, $xpath),
            'stock_text' => $this->extractStockText($html, $xpath),
            'image_url' => $this->extractImage($html, $xpath),
            'description' => $this->extractDescription($html, $xpath),
            'rarity' => $this->extractRarity($html, $xpath),
            'set_name' => $this->extractSetName($html, $xpath),
            'card_number' => $this->extractCardNumber($html, $xpath),
            'tcg_category' => $tcgCategory,
            'specific' => $this->extractCategorySpecific($html, $xpath, $tcgCategory)
        ];
    }
    
    private function detectTCGCategory($url) {
        if (stripos($url, '/poc/') !== false) return 'Pokemon';
        if (stripos($url, '/ygo/') !== false) return 'Yugioh';
        if (stripos($url, '/mtg/') !== false) return 'MTG';
        
        return 'Multi_TCG';
    }
    
    private function extractTitle($html, $xpath) {
        $selectors = $this->config['selectors']['title'];
        return $this->extractBySelectors($xpath, $selectors) ?: 'タイトル取得失敗';
    }
    
    private function extractPrice($html, $xpath) {
        $selectors = $this->config['selectors']['price'];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $priceText = $this->extractByXPath($xpath, $xpathQuery);
            
            if (!empty($priceText)) {
                return $this->extractNumericPrice($priceText);
            }
        }
        
        return 0.0;
    }
    
    private function extractCondition($html, $xpath) {
        $selectors = $this->config['selectors']['condition'];
        return $this->extractBySelectors($xpath, $selectors) ?: 'unknown';
    }
    
    private function extractStockText($html, $xpath) {
        $selectors = $this->config['selectors']['stock'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractImage($html, $xpath) {
        $selectors = $this->config['selectors']['image'];
        
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
    
    private function extractDescription($html, $xpath) {
        $selectors = ['.description', '.item-desc'];
        return strip_tags($this->extractBySelectors($xpath, $selectors));
    }
    
    private function extractRarity($html, $xpath) {
        $selectors = $this->config['selectors']['rarity'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractSetName($html, $xpath) {
        $selectors = ['.set-name', '.expansion'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractCardNumber($html, $xpath) {
        $selectors = ['.card-number', '.number'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractCategorySpecific($html, $xpath, $category) {
        switch ($category) {
            case 'Pokemon':
                return [
                    'pokemon_hp' => $this->extractBySelectors($xpath, ['.hp', '.pokemon-hp']),
                    'pokemon_type' => $this->extractBySelectors($xpath, ['.type'])
                ];
            case 'MTG':
                return [
                    'mtg_color' => $this->extractBySelectors($xpath, ['.color']),
                    'mtg_type' => $this->extractBySelectors($xpath, ['.type'])
                ];
            default:
                return ['category' => $category];
        }
    }
}

// ============================================
// 駿河屋スクレイパー
// ============================================

class Furu1Scraper extends TCGScraperBase {
    
    public function __construct($pdo) {
        parent::__construct($pdo, 'furu1');
    }
    
    protected function loadConfig() {
        $allConfigs = require __DIR__ . '/../../config/tcg_platforms_config.php';
        $this->config = $allConfigs['furu1'];
    }
    
    protected function extractProductId($url) {
        if (preg_match('/\/([a-zA-Z0-9_-]+)$/', $url, $matches)) {
            return 'f1_' . $matches[1];
        }
        
        throw new Exception('駿河屋商品ID抽出失敗: ' . $url);
    }
    
    protected function parseProductPage($html, $url) {
        $dom = new DOMDocument();
        @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
        $xpath = new DOMXPath($dom);
        
        return [
            'title' => $this->extractTitle($html, $xpath),
            'price' => $this->extractPrice($html, $xpath),
            'condition' => $this->extractCondition($html, $xpath),
            'stock_text' => $this->extractStockText($html, $xpath),
            'image_url' => $this->extractImage($html, $xpath),
            'description' => $this->extractDescription($html, $xpath),
            'rarity' => $this->extractRarity($html, $xpath),
            'set_name' => $this->extractSetName($html, $xpath),
            'card_number' => '',
            'tcg_category' => 'Pokemon',
            'specific' => ['source' => 'Surugaya']
        ];
    }
    
    private function extractTitle($html, $xpath) {
        $selectors = $this->config['selectors']['title'];
        return $this->extractBySelectors($xpath, $selectors) ?: 'タイトル取得失敗';
    }
    
    private function extractPrice($html, $xpath) {
        $selectors = $this->config['selectors']['price'];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $priceText = $this->extractByXPath($xpath, $xpathQuery);
            
            if (!empty($priceText)) {
                return $this->extractNumericPrice($priceText);
            }
        }
        
        return 0.0;
    }
    
    private function extractCondition($html, $xpath) {
        $selectors = $this->config['selectors']['condition'];
        return $this->extractBySelectors($xpath, $selectors) ?: 'unknown';
    }
    
    private function extractStockText($html, $xpath) {
        $selectors = $this->config['selectors']['stock'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractImage($html, $xpath) {
        $selectors = $this->config['selectors']['image'];
        
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
    
    private function extractDescription($html, $xpath) {
        $selectors = ['.item-description', '.description'];
        return strip_tags($this->extractBySelectors($xpath, $selectors));
    }
    
    private function extractRarity($html, $xpath) {
        $selectors = $this->config['selectors']['rarity'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractSetName($html, $xpath) {
        $selectors = ['.set-name', '.expansion'];
        return $this->extractBySelectors($xpath, $selectors);
    }
}

// ============================================
// ドラスタスクレイパー
// ============================================

class DorastaScraper extends TCGScraperBase {
    
    public function __construct($pdo) {
        parent::__construct($pdo, 'dorasuta');
    }
    
    protected function loadConfig() {
        $allConfigs = require __DIR__ . '/../../config/tcg_platforms_config.php';
        $this->config = $allConfigs['dorasuta'];
    }
    
    protected function extractProductId($url) {
        if (preg_match('/\/([a-zA-Z0-9_-]+)$/', $url, $matches)) {
            return 'ds_' . $matches[1];
        }
        
        throw new Exception('ドラスタ商品ID抽出失敗: ' . $url);
    }
    
    protected function parseProductPage($html, $url) {
        $dom = new DOMDocument();
        @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
        $xpath = new DOMXPath($dom);
        
        return [
            'title' => $this->extractTitle($html, $xpath),
            'price' => $this->extractPrice($html, $xpath),
            'condition' => $this->extractCondition($html, $xpath),
            'stock_text' => $this->extractStockText($html, $xpath),
            'image_url' => $this->extractImage($html, $xpath),
            'description' => $this->extractDescription($html, $xpath),
            'rarity' => $this->extractRarity($html, $xpath),
            'set_name' => $this->extractSetName($html, $xpath),
            'card_number' => '',
            'tcg_category' => 'Multi_TCG',
            'specific' => ['source' => 'DragonStar']
        ];
    }
    
    private function extractTitle($html, $xpath) {
        $selectors = $this->config['selectors']['title'];
        return $this->extractBySelectors($xpath, $selectors) ?: 'タイトル取得失敗';
    }
    
    private function extractPrice($html, $xpath) {
        $selectors = $this->config['selectors']['price'];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $priceText = $this->extractByXPath($xpath, $xpathQuery);
            
            if (!empty($priceText)) {
                return $this->extractNumericPrice($priceText);
            }
        }
        
        return 0.0;
    }
    
    private function extractCondition($html, $xpath) {
        $selectors = $this->config['selectors']['condition'];
        return $this->extractBySelectors($xpath, $selectors) ?: 'unknown';
    }
    
    private function extractStockText($html, $xpath) {
        $selectors = $this->config['selectors']['stock'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractImage($html, $xpath) {
        $selectors = $this->config['selectors']['image'];
        
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
    
    private function extractDescription($html, $xpath) {
        return '';
    }
    
    private function extractRarity($html, $xpath) {
        $selectors = $this->config['selectors']['rarity'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractSetName($html, $xpath) {
        return '';
    }
}

// ============================================
// ポケカネットスクレイパー
// ============================================

class PokecaNetScraper extends TCGScraperBase {
    
    public function __construct($pdo) {
        parent::__construct($pdo, 'pokeca_net');
    }
    
    protected function loadConfig() {
        $allConfigs = require __DIR__ . '/../../config/tcg_platforms_config.php';
        $this->config = $allConfigs['pokeca_net'];
    }
    
    protected function extractProductId($url) {
        if (preg_match('/\/product\/([a-zA-Z0-9_-]+)/', $url, $matches)) {
            return 'pn_' . $matches[1];
        }
        
        throw new Exception('ポケカネット商品ID抽出失敗: ' . $url);
    }
    
    protected function parseProductPage($html, $url) {
        $dom = new DOMDocument();
        @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
        $xpath = new DOMXPath($dom);
        
        return [
            'title' => $this->extractTitle($html, $xpath),
            'price' => $this->extractPrice($html, $xpath),
            'condition' => $this->extractCondition($html, $xpath),
            'stock_text' => $this->extractStockText($html, $xpath),
            'image_url' => $this->extractImage($html, $xpath),
            'description' => '',
            'rarity' => $this->extractRarity($html, $xpath),
            'set_name' => '',
            'card_number' => '',
            'tcg_category' => 'Pokemon',
            'specific' => ['source' => 'PokecaNet']
        ];
    }
    
    private function extractTitle($html, $xpath) {
        $selectors = $this->config['selectors']['title'];
        return $this->extractBySelectors($xpath, $selectors) ?: 'タイトル取得失敗';
    }
    
    private function extractPrice($html, $xpath) {
        $selectors = $this->config['selectors']['price'];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $priceText = $this->extractByXPath($xpath, $xpathQuery);
            
            if (!empty($priceText)) {
                return $this->extractNumericPrice($priceText);
            }
        }
        
        return 0.0;
    }
    
    private function extractCondition($html, $xpath) {
        $selectors = $this->config['selectors']['condition'];
        return $this->extractBySelectors($xpath, $selectors) ?: 'unknown';
    }
    
    private function extractStockText($html, $xpath) {
        $selectors = $this->config['selectors']['stock'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractImage($html, $xpath) {
        $selectors = $this->config['selectors']['image'];
        
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
    
    private function extractRarity($html, $xpath) {
        $selectors = $this->config['selectors']['rarity'];
        return $this->extractBySelectors($xpath, $selectors);
    }
}

// ============================================
// SNKRDUNKスクレイパー
// ============================================

class SnkrdunkScraper extends TCGScraperBase {
    
    public function __construct($pdo) {
        parent::__construct($pdo, 'snkrdunk');
    }
    
    protected function loadConfig() {
        $allConfigs = require __DIR__ . '/../../config/tcg_platforms_config.php';
        $this->config = $allConfigs['snkrdunk'];
    }
    
    protected function extractProductId($url) {
        if (preg_match('/\/brands\/pokemon\/([a-zA-Z0-9_-]+)/', $url, $matches)) {
            return 'sd_' . $matches[1];
        }
        
        throw new Exception('SNKRDUNK商品ID抽出失敗: ' . $url);
    }
    
    protected function parseProductPage($html, $url) {
        $dom = new DOMDocument();
        @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
        $xpath = new DOMXPath($dom);
        
        return [
            'title' => $this->extractTitle($html, $xpath),
            'price' => $this->extractPrice($html, $xpath),
            'condition' => $this->extractCondition($html, $xpath),
            'stock_text' => $this->extractStockText($html, $xpath),
            'image_url' => $this->extractImage($html, $xpath),
            'description' => '',
            'rarity' => '',
            'set_name' => '',
            'card_number' => '',
            'tcg_category' => 'Pokemon',
            'specific' => ['marketplace' => 'SNKRDUNK']
        ];
    }
    
    private function extractTitle($html, $xpath) {
        $selectors = $this->config['selectors']['title'];
        return $this->extractBySelectors($xpath, $selectors) ?: 'タイトル取得失敗';
    }
    
    private function extractPrice($html, $xpath) {
        $selectors = $this->config['selectors']['price'];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $priceText = $this->extractByXPath($xpath, $xpathQuery);
            
            if (!empty($priceText)) {
                return $this->extractNumericPrice($priceText);
            }
        }
        
        return 0.0;
    }
    
    private function extractCondition($html, $xpath) {
        $selectors = $this->config['selectors']['condition'];
        return $this->extractBySelectors($xpath, $selectors) ?: 'unknown';
    }
    
    private function extractStockText($html, $xpath) {
        $selectors = $this->config['selectors']['stock'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractImage($html, $xpath) {
        $selectors = $this->config['selectors']['image'];
        
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
}
