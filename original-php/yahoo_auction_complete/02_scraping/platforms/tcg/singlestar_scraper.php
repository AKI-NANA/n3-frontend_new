<?php
/**
 * シングルスター(MTG専門)スクレイパー
 * 
 * TCGScraperBaseを継承
 * MTG固有のデータ抽出ロジック実装
 * 
 * @version 1.0.0
 * @created 2025-09-26
 */

require_once __DIR__ . '/../../common/TCGScraperBase.php';

class SingleStarScraper extends TCGScraperBase {
    
    public function __construct($pdo) {
        parent::__construct($pdo, 'singlestar');
    }
    
    /**
     * 設定読み込み
     */
    protected function loadConfig() {
        $allConfigs = require __DIR__ . '/../../config/tcg_platforms_config.php';
        $this->config = $allConfigs['singlestar'];
    }
    
    /**
     * 商品ID抽出
     */
    protected function extractProductId($url) {
        // シングルスターのURLパターン: /product/12345 or /item/12345
        $patterns = [
            '/\/product\/([a-zA-Z0-9_-]+)/',
            '/\/item\/([a-zA-Z0-9_-]+)/',
            '/product_id=([a-zA-Z0-9_-]+)/',
            '/id=([a-zA-Z0-9_-]+)/'
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $url, $matches)) {
                return 'ss_' . $matches[1]; // ss_ = SingleStar prefix
            }
        }
        
        throw new Exception('シングルスター商品ID抽出失敗: ' . $url);
    }
    
    /**
     * 商品ページ解析
     */
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
            'tcg_category' => 'MTG',
            'specific' => [
                'mtg_color' => $this->extractMTGColor($html, $xpath),
                'mtg_type' => $this->extractMTGType($html, $xpath),
                'mtg_mana_cost' => $this->extractManaCost($html, $xpath),
                'mtg_format' => $this->extractFormat($html, $xpath),
                'language' => $this->extractLanguage($html, $xpath)
            ]
        ];
    }
    
    /**
     * タイトル抽出
     */
    private function extractTitle($html, $xpath) {
        $selectors = $this->config['selectors']['title'];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $value = $this->extractByXPath($xpath, $xpathQuery);
            if (!empty($value)) {
                return $value;
            }
        }
        
        // フォールバック: 正規表現
        if (preg_match('/<h1[^>]*>([^<]+)<\/h1>/i', $html, $matches)) {
            return trim($matches[1]);
        }
        
        return 'タイトル取得失敗';
    }
    
    /**
     * 価格抽出
     */
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
        $pricePatterns = [
            '/¥\s*(\d{1,3}(?:,\d{3})*)/u',
            '/(\d{1,3}(?:,\d{3})*)\s*円/u',
            '/価格[^0-9]*(\d{1,3}(?:,\d{3})*)/u'
        ];
        
        foreach ($pricePatterns as $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                return $this->extractNumericPrice($matches[1]);
            }
        }
        
        return 0.0;
    }
    
    /**
     * 状態抽出
     */
    private function extractCondition($html, $xpath) {
        $selectors = $this->config['selectors']['condition'];
        return $this->extractBySelectors($xpath, $selectors) ?: 'unknown';
    }
    
    /**
     * 在庫テキスト抽出
     */
    private function extractStockText($html, $xpath) {
        $selectors = $this->config['selectors']['stock'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    /**
     * 画像URL抽出
     */
    private function extractImage($html, $xpath) {
        $selectors = $this->config['selectors']['image'];
        
        foreach ($selectors as $selector) {
            $xpathQuery = $this->convertCssToXpath($selector);
            $nodes = $xpath->query($xpathQuery);
            
            if ($nodes->length > 0) {
                $img = $nodes->item(0);
                if ($img->hasAttribute('src')) {
                    $src = $img->getAttribute('src');
                    // 相対URLを絶対URLに変換
                    if (strpos($src, 'http') !== 0) {
                        $src = $this->config['base_url'] . $src;
                    }
                    return $src;
                }
            }
        }
        
        return '';
    }
    
    /**
     * 説明文抽出
     */
    private function extractDescription($html, $xpath) {
        $descSelectors = ['.product-description', '.item-desc', '.description'];
        $description = $this->extractBySelectors($xpath, $descSelectors);
        
        // HTMLタグ除去
        return strip_tags($description);
    }
    
    /**
     * レアリティ抽出
     */
    private function extractRarity($html, $xpath) {
        $selectors = $this->config['selectors']['rarity'];
        $rarity = $this->extractBySelectors($xpath, $selectors);
        
        // レアリティ正規化
        $rarityMap = [
            'M' => 'Mythic Rare',
            'R' => 'Rare',
            'U' => 'Uncommon',
            'C' => 'Common',
            'S' => 'Special'
        ];
        
        foreach ($rarityMap as $short => $full) {
            if (stripos($rarity, $short) !== false) {
                return $full;
            }
        }
        
        return $rarity ?: 'Unknown';
    }
    
    /**
     * セット名抽出
     */
    private function extractSetName($html, $xpath) {
        $selectors = $this->config['selectors']['set_name'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    /**
     * カード番号抽出
     */
    private function extractCardNumber($html, $xpath) {
        $selectors = $this->config['selectors']['card_number'];
        return $this->extractBySelectors($xpath, $selectors);
    }
    
    /**
     * MTG色抽出
     */
    private function extractMTGColor($html, $xpath) {
        $colorSelectors = ['.card-color', '.mana-color', '.color-identity'];
        $colorText = $this->extractBySelectors($xpath, $colorSelectors);
        
        // 色の正規化
        $colors = [];
        $colorMap = [
            'W' => 'White', '白' => 'White',
            'U' => 'Blue', '青' => 'Blue',
            'B' => 'Black', '黒' => 'Black',
            'R' => 'Red', '赤' => 'Red',
            'G' => 'Green', '緑' => 'Green',
            'C' => 'Colorless', '無' => 'Colorless'
        ];
        
        foreach ($colorMap as $key => $value) {
            if (stripos($colorText, $key) !== false) {
                $colors[] = $value;
            }
        }
        
        return implode(', ', array_unique($colors)) ?: 'Colorless';
    }
    
    /**
     * MTGカードタイプ抽出
     */
    private function extractMTGType($html, $xpath) {
        $typeSelectors = ['.card-type', '.type-line', '.card-types'];
        return $this->extractBySelectors($xpath, $typeSelectors);
    }
    
    /**
     * マナコスト抽出
     */
    private function extractManaCost($html, $xpath) {
        $manaSelectors = ['.mana-cost', '.casting-cost', '.card-cost'];
        return $this->extractBySelectors($xpath, $manaSelectors);
    }
    
    /**
     * フォーマット抽出
     */
    private function extractFormat($html, $xpath) {
        $formatSelectors = ['.format', '.legality', '.card-format'];
        $format = $this->extractBySelectors($xpath, $formatSelectors);
        
        // フォーマット検出
        $formats = [];
        $formatKeywords = [
            'Standard', 'Modern', 'Pioneer', 'Legacy', 
            'Vintage', 'Commander', 'Pauper', 'Historic'
        ];
        
        foreach ($formatKeywords as $keyword) {
            if (stripos($format, $keyword) !== false) {
                $formats[] = $keyword;
            }
        }
        
        return implode(', ', $formats) ?: 'Unknown';
    }
    
    /**
     * 言語抽出
     */
    private function extractLanguage($html, $xpath) {
        $langSelectors = ['.language', '.lang', '.card-language'];
        $lang = $this->extractBySelectors($xpath, $langSelectors);
        
        // 言語判定
        if (stripos($lang, '日本語') !== false || stripos($lang, 'Japanese') !== false) {
            return 'Japanese';
        } elseif (stripos($lang, '英語') !== false || stripos($lang, 'English') !== false) {
            return 'English';
        }
        
        return $lang ?: 'Unknown';
    }
}
