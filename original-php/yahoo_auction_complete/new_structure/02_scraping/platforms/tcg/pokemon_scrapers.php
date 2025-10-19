<?php
/**
 * ポケモンカード専門スクレイパー
 * 
 * - フルアヘッド
 * - カードラッシュ
 * 
 * @version 1.0.0
 * @created 2025-09-26
 */

require_once __DIR__ . '/../../common/TCGScraperBase.php';

// ============================================
// フルアヘッドスクレイパー
// ============================================

class FullaheadScraper extends TCGScraperBase {
    
    public function __construct($pdo) {
        parent::__construct($pdo, 'fullahead');
    }
    
    protected function loadConfig() {
        $allConfigs = require __DIR__ . '/../../config/tcg_platforms_config.php';
        $this->config = $allConfigs['fullahead'];
    }
    
    protected function extractProductId($url) {
        $patterns = [
            '/\/product\/([a-zA-Z0-9_-]+)/',
            '/product_id=([a-zA-Z0-9_-]+)/',
            '/id=([a-zA-Z0-9_-]+)/'
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $url, $matches)) {
                return 'fa_' . $matches[1]; // fa = FullAhead
            }
        }
        
        throw new Exception('フルアヘッド商品ID抽出失敗: ' . $url);
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
            'card_number' => $this->extractCardNumber($html, $xpath),
            'tcg_category' => 'Pokemon',
            'specific' => [
                'pokemon_name' => $this->extractPokemonName($html, $xpath),
                'pokemon_hp' => $this->extractHP($html, $xpath),
                'pokemon_type' => $this->extractType($html, $xpath),
                'evolution_stage' => $this->extractEvolutionStage($html, $xpath),
                'regulation_mark' => $this->extractRegulationMark($html, $xpath),
                'series' => $this->extractSeries($html, $xpath)
            ]
        ];
    }
    
    private function extractTitle($html, $xpath) {
        $selectors = $this->config['selectors']['title'];
        $title = $this->extractBySelectors($xpath, $selectors);
        
        if (empty($title) && preg_match('/<h1[^>]*>([^<]+)<\/h1>/i', $html, $matches)) {
            $title = trim($matches[1]);
        }
        
        return $title ?: 'タイトル取得失敗';
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
        
        // 正規表現フォールバック
        if (preg_match('/¥\s*(\d{1,3}(?:,\d{3})*)/u', $html, $matches)) {
            return $this->extractNumericPrice($matches[1]);
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
        $selectors = ['.description', '.product-description', '.item-desc'];
        return strip_tags($this->extractBySelectors($xpath, $selectors));
    }
    
    private function extractRarity($html, $xpath) {
        $selectors = $this->config['selectors']['rarity'];
        $rarity = $this->extractBySelectors($xpath, $selectors);
        
        // ポケカレアリティ正規化
        $rarityMap = [
            'RR' => 'Double Rare',
            'RRR' => 'Triple Rare',
            'SR' => 'Super Rare',
            'UR' => 'Ultra Rare',
            'HR' => 'Hyper Rare',
            'AR' => 'Art Rare',
            'SAR' => 'Special Art Rare',
            'R' => 'Rare',
            'U' => 'Uncommon',
            'C' => 'Common'
        ];
        
        foreach ($rarityMap as $short => $full) {
            if (stripos($rarity, $short) !== false) {
                return $full;
            }
        }
        
        return $rarity ?: 'Unknown';
    }
    
    private function extractSetName($html, $xpath) {
        $selectors = ['.set-name', '.expansion', '.series-name'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractCardNumber($html, $xpath) {
        $selectors = ['.card-number', '.number', '.collector-number'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractPokemonName($html, $xpath) {
        // タイトルからポケモン名抽出
        $title = $this->extractTitle($html, $xpath);
        
        // 【】や()内を除去してポケモン名を取得
        $name = preg_replace('/【.*?】/', '', $title);
        $name = preg_replace('/\(.*?\)/', '', $name);
        
        return trim($name);
    }
    
    private function extractHP($html, $xpath) {
        $hpSelectors = ['.pokemon-hp', '.hp', '.hp-value'];
        $hp = $this->extractBySelectors($xpath, $hpSelectors);
        
        // HP数値のみ抽出
        if (preg_match('/HP\s*(\d+)/i', $hp, $matches)) {
            return $matches[1];
        }
        
        if (preg_match('/(\d+)/', $hp, $matches)) {
            return $matches[1];
        }
        
        return '';
    }
    
    private function extractType($html, $xpath) {
        $typeSelectors = ['.pokemon-type', '.type', '.type-icon'];
        $type = $this->extractBySelectors($xpath, $typeSelectors);
        
        // ポケモンタイプ正規化
        $types = [
            '草', '炎', '水', '雷', '超', '闘', '悪', '鋼', 
            '無', 'ドラゴン', 'フェアリー',
            'Grass', 'Fire', 'Water', 'Lightning', 'Psychic',
            'Fighting', 'Darkness', 'Metal', 'Colorless', 
            'Dragon', 'Fairy'
        ];
        
        foreach ($types as $typeKeyword) {
            if (stripos($type, $typeKeyword) !== false) {
                return $typeKeyword;
            }
        }
        
        return $type;
    }
    
    private function extractEvolutionStage($html, $xpath) {
        $stageSelectors = ['.evolution-stage', '.stage', '.evolution'];
        $stage = $this->extractBySelectors($xpath, $stageSelectors);
        
        // 進化段階判定
        if (stripos($stage, 'たね') !== false || stripos($stage, 'Basic') !== false) {
            return 'Basic';
        } elseif (stripos($stage, '1進化') !== false || stripos($stage, 'Stage 1') !== false) {
            return 'Stage 1';
        } elseif (stripos($stage, '2進化') !== false || stripos($stage, 'Stage 2') !== false) {
            return 'Stage 2';
        }
        
        return $stage ?: 'Unknown';
    }
    
    private function extractRegulationMark($html, $xpath) {
        $regSelectors = ['.regulation-mark', '.regulation', '.reg'];
        return $this->extractBySelectors($xpath, $regSelectors);
    }
    
    private function extractSeries($html, $xpath) {
        $seriesSelectors = ['.series', '.expansion-series', '.set-series'];
        return $this->extractBySelectors($xpath, $seriesSelectors);
    }
}

// ============================================
// カードラッシュスクレイパー
// ============================================

class CardRushScraper extends TCGScraperBase {
    
    public function __construct($pdo) {
        parent::__construct($pdo, 'cardrush');
    }
    
    protected function loadConfig() {
        $allConfigs = require __DIR__ . '/../../config/tcg_platforms_config.php';
        $this->config = $allConfigs['cardrush'];
    }
    
    protected function extractProductId($url) {
        $patterns = [
            '/\/product\/([a-zA-Z0-9_-]+)/',
            '/product_id=([a-zA-Z0-9_-]+)/'
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $url, $matches)) {
                return 'cr_' . $matches[1]; // cr = CardRush
            }
        }
        
        throw new Exception('カードラッシュ商品ID抽出失敗: ' . $url);
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
            'card_number' => $this->extractCardNumber($html, $xpath),
            'tcg_category' => 'Pokemon',
            'specific' => [
                'pokemon_hp' => $this->extractHP($html, $xpath),
                'pokemon_type' => $this->extractType($html, $xpath),
                'regulation_mark' => $this->extractRegulation($html, $xpath)
            ]
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
        $selectors = ['.description', '.item-description'];
        return strip_tags($this->extractBySelectors($xpath, $selectors));
    }
    
    private function extractRarity($html, $xpath) {
        $selectors = $this->config['selectors']['rarity'];
        return $this->extractBySelectors($xpath, $selectors) ?: 'Unknown';
    }
    
    private function extractSetName($html, $xpath) {
        $selectors = ['.set-name', '.expansion-name'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractCardNumber($html, $xpath) {
        $selectors = ['.card-number', '.number'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    private function extractHP($html, $xpath) {
        $hpSelectors = ['.hp', '.pokemon-hp'];
        $hp = $this->extractBySelectors($xpath, $hpSelectors);
        
        if (preg_match('/(\d+)/', $hp, $matches)) {
            return $matches[1];
        }
        
        return '';
    }
    
    private function extractType($html, $xpath) {
        $typeSelectors = ['.type', '.pokemon-type'];
        return $this->extractBySelectors($xpath, $typeSelectors);
    }
    
    private function extractRegulation($html, $xpath) {
        $regSelectors = ['.regulation', '.reg-mark'];
        return $this->extractBySelectors($xpath, $regSelectors);
    }
}
