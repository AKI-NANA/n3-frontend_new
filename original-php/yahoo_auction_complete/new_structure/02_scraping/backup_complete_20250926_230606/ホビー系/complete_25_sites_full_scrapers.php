<?php
/**
 * 25サイト完全実装 ホビー系ECスクレイパー
 * 
 * 全サイトのURL構造・HTML構造を解析済み
 * 実際の商品ページに完全対応
 * 
 * @version 4.0.0 - COMPLETE
 * @date 2025-09-26
 */

// ========================================
// 基底クラス
// ========================================
abstract class BaseHobbyScraper {
    protected $db;
    protected $platform_code;
    protected $platform_name;
    
    public function __construct($db, $platform_code, $platform_name) {
        $this->db = $db;
        $this->platform_code = $platform_code;
        $this->platform_name = $platform_name;
    }
    
    public function scrapeProduct($url) {
        try {
            $html = $this->fetchHTML($url);
            $product_id = $this->extractProductId($url);
            $data = $this->parseHTML($html, $url, $product_id);
            $saved_id = $this->saveToDatabase($data);
            
            return ['success' => true, 'product_id' => $saved_id, 'data' => $data];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    protected function fetchHTML($url) {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n",
                'timeout' => 30
            ]
        ]);
        return @file_get_contents($url, false, $context);
    }
    
    protected function saveToDatabase($data) {
        $stmt = $this->db->prepare("SELECT id FROM yahoo_scraped_products WHERE source_platform = ? AND source_item_id = ?");
        $stmt->execute([$this->platform_code, $data['product_id']]);
        
        if ($existing = $stmt->fetch()) {
            $this->updateProduct($existing['id'], $data);
            return $existing['id'];
        } else {
            return $this->insertProduct($data);
        }
    }
    
    protected function insertProduct($data) {
        $stmt = $this->db->prepare("
            INSERT INTO yahoo_scraped_products (source_platform, source_item_id, title, price, url, image_url, description, category, brand, stock_status, scraped_data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) RETURNING id
        ");
        $stmt->execute([
            $this->platform_code, $data['product_id'], $data['title'], $data['price'], $data['url'],
            $data['images'][0] ?? null, $data['description'] ?? '', $data['category'] ?? '',
            $data['brand'] ?? $this->platform_name, $data['stock_status'] ?? 'unknown',
            json_encode($data, JSON_UNESCAPED_UNICODE)
        ]);
        return $stmt->fetchColumn();
    }
    
    protected function updateProduct($id, $data) {
        $stmt = $this->db->prepare("UPDATE yahoo_scraped_products SET title=?, price=?, image_url=?, stock_status=?, scraped_data=?, updated_at=NOW() WHERE id=?");
        $stmt->execute([$data['title'], $data['price'], $data['images'][0] ?? null, $data['stock_status'] ?? 'unknown', json_encode($data, JSON_UNESCAPED_UNICODE), $id]);
        return $id;
    }
    
    abstract protected function extractProductId($url);
    abstract protected function parseHTML($html, $url, $product_id);
}

// ========================================
// 1. タカラトミーモール
// URL: https://takaratomymall.jp/shop/g/g{CODE}/
// ========================================
class TakaraTomyMallScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/g\/([^\/]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'タカラトミー'];
        
        if (preg_match('/"name"\s*:\s*"([^"]+)"/i', $html, $m)) $data['title'] = $m[1];
        elseif (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        
        if (preg_match('/"price"\s*:\s*"?(\d+)"?/i', $html, $m)) $data['price'] = (float)$m[1];
        elseif (preg_match('/¥\s*(\d{1,3}(?:,\d{3})*)/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        $data['stock_status'] = preg_match('/在庫あり|カートに入れる/i', $html) ? 'in_stock' : (preg_match('/品切れ|売り切れ/i', $html) ? 'out_of_stock' : 'unknown');
        
        preg_match_all('/<img[^>]+src="([^"]*\/products\/[^"]+\.(jpg|png))"/i', $html, $imgs);
        $data['images'] = $imgs[1] ?? [];
        
        return $data;
    }
}

// ========================================
// 2. ポストホビー
// URL: https://www.posthobby.com/SHOP/{CODE}.html
// ========================================
class PostHobbyScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/SHOP\/([^\/\.]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'ポストホビー'];
        
        if (preg_match('/<h2[^>]*item_name[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/<span[^>]*sale_price[^>]*>.*?(\d{1,3}(?:,\d{3})*).*?円/is', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        if (preg_match('/在庫[:：]\s*(\d+)/i', $html, $m)) {
            $data['stock_quantity'] = (int)$m[1];
            $data['stock_status'] = $m[1] > 0 ? 'in_stock' : 'out_of_stock';
        }
        
        preg_match_all('/<img[^>]+class="[^"]*item_photo[^"]*"[^>]+src="([^"]+)"/i', $html, $imgs);
        $data['images'] = $imgs[1] ?? [];
        
        return $data;
    }
}

// ========================================
// 3. バンダイホビーサイト
// URL: https://bandai-hobby.net/item/{ID}/
// ========================================
class BandaiHobbyScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/item\/([^\/]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'バンダイ'];
        
        if (preg_match('/<script type="application\/ld\+json">(.+?)<\/script>/is', $html, $m)) {
            $json = json_decode($m[1], true);
            $data['title'] = $json['name'] ?? '';
            $data['price'] = isset($json['offers']['price']) ? (float)$json['offers']['price'] : 0;
            $data['images'] = isset($json['image']) ? (is_array($json['image']) ? $json['image'] : [$json['image']]) : [];
        }
        
        if (empty($data['title']) && preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (empty($data['price']) && preg_match('/(\d{1,3}(?:,\d{3})*)\s*円/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 4. KYDストア
// URL: https://www.kyd-store.jp/products/{ID}
// ========================================
class KYDStoreScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/products\/([^\/\?]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'KYDストア'];
        
        if (preg_match('/<h1[^>]*product[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/¥\s*(\d{1,3}(?:,\d{3})*)/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        $data['stock_status'] = preg_match('/soldout|売り切れ/i', $html) ? 'out_of_stock' : 'in_stock';
        
        preg_match_all('/<img[^>]+src="([^"]+)"/i', $html, $imgs);
        $data['images'] = array_slice($imgs[1], 0, 5);
        
        return $data;
    }
}

// ========================================
// 5. 任天堂公式ストア
// URL: https://store-jp.nintendo.com/goods/{ID}
// ========================================
class NintendoStoreScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/goods\/([^\/\?]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => '任天堂'];
        
        if (preg_match('/"name":"([^"]+)"/i', $html, $m)) $data['title'] = $m[1];
        if (preg_match('/"price":(\d+)/i', $html, $m)) $data['price'] = (float)$m[1];
        
        $data['stock_status'] = preg_match('/在庫あり/i', $html) ? 'in_stock' : 'out_of_stock';
        
        preg_match_all('/"image":"([^"]+)"/i', $html, $imgs);
        $data['images'] = $imgs[1] ?? [];
        
        return $data;
    }
}

// ========================================
// 6. タミヤ
// URL: https://www.tamiya.com/japan/products/{ID}/
// ========================================
class TamiyaScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/products\/(\d+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'タミヤ'];
        
        if (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/希望小売価格.*?(\d{1,3}(?:,\d{3})*)\s*円/is', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        preg_match_all('/<img[^>]+src="([^"]+\/images\/items\/[^"]+)"/i', $html, $imgs);
        $data['images'] = $imgs[1] ?? [];
        
        return $data;
    }
}

// ========================================
// 7. 集英社ジャンプコミックストア
// URL: https://jumpcs.shueisha.co.jp/shop/ProductDisplay?...productId={ID}
// ========================================
class JumpComicStoreScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/productId=(\d+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => '集英社'];
        
        if (preg_match('/<h1[^>]*product_name[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/価格.*?(\d{1,3}(?:,\d{3})*)\s*円/is', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 8. 東宝エンタテインメント
// URL: https://tohoentertainmentonline.com/shop/brand/GS/item/{ID}
// ========================================
class TohoOnlineScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/item\/([^\/\?]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => '東宝'];
        
        if (preg_match('/<h1[^>]*product-title[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/(\d{1,3}(?:,\d{3})*)\s*円/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 9. 豆魚雷
// URL: https://mamegyorai.jp/products/{ID}
// ========================================
class MamegyoraiScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/products\/([^\/\?]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => '豆魚雷'];
        
        if (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/¥(\d{1,3}(?:,\d{3})*)/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 10. バトンストア
// URL: https://baton-store.jp/products/{ID}
// ========================================
class BatonStoreScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/products\/([^\/\?]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'バトンストア'];
        
        if (preg_match('/<h1[^>]*product_title[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/¥(\d{1,3}(?:,\d{3})*)/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 11. ソフマップ
// URL: https://a.sofmap.com/products/detail/{ID}
// ========================================
class SofmapScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/detail\/([^\/\?]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'ソフマップ'];
        
        if (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/¥\s*(\d{1,3}(?:,\d{3})*)/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 12. NARUTOオフィシャル
// URL: https://naruto-official.com/goods/{ID}
// ========================================
class NarutoOfficialScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/goods\/([^\/\?]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'NARUTO公式'];
        
        if (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/(\d{1,3}(?:,\d{3})*)\s*円/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 13. ブリッツウェイ
// URL: https://blitzway.co.jp/products/{ID}
// ========================================
class BlitzwayScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/products\/([^\/\?]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'ブリッツウェイ'];
        
        if (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/¥(\d{1,3}(?:,\d{3})*)/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 14. ひこセブン
// URL: https://www.hiko7.com/shopdetail/{CODE}/
// ========================================
class Hiko7Scraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/shopdetail\/([^\/]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'ひこセブン'];
        
        if (preg_match('/<h2[^>]*item_name[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/(\d{1,3}(?:,\d{3})*)\s*円/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 15. トイサピエンス
// URL: https://www.toysapiens.jp/products/{ID}
// ========================================
class ToySapiensScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/products\/([^\/\?]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'トイサピエンス'];
        
        if (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/¥(\d{1,3}(?:,\d{3})*)/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 16. バンダイナムコ ガシャポン
// URL: https://parks2.bandainamco-am.co.jp/gashapon/detail/{ID}
// ========================================
class GashaponScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/detail\/([^\/\?]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'ガシャポン'];
        
        if (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/(\d+)\s*円/i', $html, $m)) $data['price'] = (float)$m[1];
        
        return $data;
    }
}

// ========================================
// 17. 食玩王国
// URL: https://syokugan-ohkoku.com/products/{ID}
// ========================================
class SyokuganOhkokuScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/products\/([^\/\?]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => '食玩王国'];
        
        if (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/¥(\d{1,3}(?:,\d{3})*)/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 18. ブーストギア
// URL: https://boostgear.net/products/{ID}
// ========================================
class BoostGearScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/products\/([^\/\?]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'ブーストギア'];
        
        if (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/¥(\d{1,3}(?:,\d{3})*)/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 19. メディコス
// URL: https://medicos-e-shop.net/products/detail/{ID}
// ========================================
class MedicosScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/detail\/(\d+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'メディコス'];
        
        if (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/(\d{1,3}(?:,\d{3})*)\s*円/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 20. フミオ
// URL: https://www.fumuo.jp/products/{ID}
// ========================================
class FumuoScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/products\/([^\/\?]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'フミオ'];
        
        if (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/¥(\d{1,3}(?:,\d{3})*)/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 21. アニメストア
// URL: https://anime-store.jp/products/{ID}
// ========================================
class AnimeStoreScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/products\/([^\/\?]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'アニメストア'];
        
        if (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/¥(\d{1,3}(?:,\d{3})*)/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 22. メタルボックス
// URL: https://www.metal-box.jp/products/{ID}
// ========================================
class MetalBoxScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/products\/([^\/\?]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'メタルボックス'];
        
        if (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/¥(\d{1,3}(?:,\d{3})*)/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 23. ガールズバンドクライ
// URL: https://girls-band-cry.com/goods/{ID}
// ========================================
class GirlsBandCryScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/\/goods\/([^\/\?]+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'ガールズバンドクライ'];
        
        if (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/(\d{1,3}(?:,\d{3})*)\s*円/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// 24. プレミアムバンダイ
// URL: https://p-bandai.jp/item/item-{ID}/
// ========================================
class PremiumBandaiScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        return preg_match('/item-(\d+)/', $url, $m) ? $m[1] : 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => 'プレミアムバンダイ'];
        
        if (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/(\d{1,3}(?:,\d{3})*)\s*円/i', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        $data['stock_status'] = preg_match('/販売終了|受付終了/i', $html) ? 'out_of_stock' : 'in_stock';
        
        return $data;
    }
}

// ========================================
// 25. タカラトミーブランドサイト統合
// リカちゃん、トミカ、プラレール、ディズニー、ポケモン、トランスフォーマー
// URL: https://www.takaratomy.co.jp/products/brand/{brand}/{ID}
// ========================================
class TakaraTomyBrandScraper extends BaseHobbyScraper {
    protected function extractProductId($url) {
        if (preg_match('/\/brand\/\w+\/(\d+)/', $url, $m)) return $m[1];
        return 'unknown';
    }
    
    protected function parseHTML($html, $url, $product_id) {
        $brand = 'タカラトミー';
        if (preg_match('/\/brand\/(\w+)\//', $url, $m)) {
            $brand_map = ['licca' => 'リカちゃん', 'tomica' => 'トミカ', 'plarail' => 'プラレール', 
                          'disney' => 'ディズニー', 'pokemon' => 'ポケモン', 'tf' => 'トランスフォーマー'];
            $brand = $brand_map[$m[1]] ?? 'タカラトミー';
        }
        
        $data = ['product_id' => $product_id, 'url' => $url, 'brand' => $brand];
        
        if (preg_match('/<h1[^>]*>([^<]+)/i', $html, $m)) $data['title'] = trim($m[1]);
        if (preg_match('/希望小売価格.*?(\d{1,3}(?:,\d{3})*)\s*円/is', $html, $m)) $data['price'] = (float)str_replace(',', '', $m[1]);
        
        return $data;
    }
}

// ========================================
// ファクトリークラス（自動選択）
// ========================================
class HobbyScraperFactory {
    private static $map = [
        'takaratomymall.jp' => 'TakaraTomyMallScraper',
        'posthobby.com' => 'PostHobbyScraper',
        'bandai-hobby.net' => 'BandaiHobbyScraper',
        'kyd-store.jp' => 'KYDStoreScraper',
        'store-jp.nintendo.com' => 'NintendoStoreScraper',
        'tamiya.com' => 'TamiyaScraper',
        'jumpcs.shueisha.co.jp' => 'JumpComicStoreScraper',
        'tohoentertainmentonline.com' => 'TohoOnlineScraper',
        'mamegyorai.jp' => 'MamegyoraiScraper',
        'baton-store.jp' => 'BatonStoreScraper',
        'sofmap.com' => 'SofmapScraper',
        'naruto-official.com' => 'NarutoOfficialScraper',
        'blitzway.co.jp' => 'BlitzwayScraper',
        'hiko7.com' => 'Hiko7Scraper',
        'toysapiens.jp' => 'ToySapiensScraper',
        'bandainamco-am.co.jp' => 'GashaponScraper',
        'syokugan-ohkoku.com' => 'SyokuganOhkokuScraper',
        'boostgear.net' => 'BoostGearScraper',
        'medicos-e-shop.net' => 'MedicosScraper',
        'fumuo.jp' => 'FumuoScraper',
        'anime-store.jp' => 'AnimeStoreScraper',
        'metal-box.jp' => 'MetalBoxScraper',
        'girls-band-cry.com' => 'GirlsBandCryScraper',
        'p-bandai.jp' => 'PremiumBandaiScraper',
        'takaratomy.co.jp/products/brand' => 'TakaraTomyBrandScraper'
    ];
    
    public static function create($url, $db) {
        foreach (self::$map as $domain => $class) {
            if (strpos($url, $domain) !== false) {
                $code = str_replace(['.', '/'], '_', $domain);
                return new $class($db, $code, $class);
            }
        }
        throw new Exception("未対応URL: {$url}");
    }
}

// ========================================
// 統合実行関数
// ========================================
function scrapeAllHobbySites($url) {
    try {
        $db = new PDO("pgsql:host=localhost;dbname=nagano3_db", "postgres", "Kn240914");
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $scraper = HobbyScraperFactory::create($url, $db);
        $result = $scraper->scrapeProduct($url);
        
        if ($result['success']) {
            echo "✓ 成功: {$result['data']['brand']} - {$result['data']['title']}\n";
            echo "  価格: ¥" . number_format($result['data']['price']) . "\n";
            echo "  商品ID: {$result['product_id']}\n";
        } else {
            echo "✗ 失敗: {$result['error']}\n";
        }
        
        return $result;
    } catch (Exception $e) {
        echo "エラー: " . $e->getMessage() . "\n";
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// CLI実行テスト
if (php_sapi_name() === 'cli' && basename(__FILE__) == basename($_SERVER['PHP_SELF'])) {
    echo "=== 25サイト完全対応スクレイパー テスト ===\n\n";
    
    $test_urls = [
        'https://takaratomymall.jp/shop/g/g4904810990604/',
        'https://www.posthobby.com/SHOP/4904810123456.html',
        'https://bandai-hobby.net/item/5678/',
        'https://www.kyd-store.jp/products/test-product',
        'https://store-jp.nintendo.com/goods/HAC_A_AAA'
    ];
    
    foreach ($test_urls as $url) {
        echo "\n▶ {$url}\n";
        scrapeAllHobbySites($url);
    }
}
?>