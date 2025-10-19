# 🚀 AI処理活用事例集

## 📋 **1. 商品管理システム**

### JavaScript実装例
```javascript
// AI処理マネージャー初期化
const aiProcessor = new UniversalAIProcessor({
    provider: 'ollama',        // ローカルで無料
    ollamaModel: 'phi3:mini',  // 軽量高速
    timeout: 30000,
    enableCache: true          // 重複処理回避
});

// 商品タイトル最適化
async function optimizeProductTitle(product) {
    try {
        const result = await aiProcessor.processWithAI(
            { title: product.title, category: product.category },
            'product_title_optimize',
            { temperature: 0.3 }
        );
        
        return result.success ? result.result : product.title;
    } catch (error) {
        console.warn('AI処理失敗、元タイトルを使用:', error);
        return product.title;
    }
}

// 商品説明生成
async function generateProductDescription(product) {
    const result = await aiProcessor.processWithAI(product, 'product_description');
    return result.result;
}

// 大量商品の一括処理
async function bulkOptimizeProducts(products) {
    return await aiProcessor.processBatch(products, 'product_title_optimize');
}
```

### PHP実装例
```php
class ProductAIProcessor {
    private $aiService;
    
    public function __construct() {
        $this->aiService = new OllamaService([
            'model' => 'phi3:mini',
            'timeout' => 30
        ]);
    }
    
    public function optimizeTitle($title, $category = '') {
        $prompt = "商品タイトルを最適化: {$title}";
        
        try {
            $result = $this->aiService->generate($prompt);
            return $result['response'] ?? $title;
        } catch (Exception $e) {
            // エラー時はオリジナルタイトルを返す
            return $title;
        }
    }
    
    public function bulkProcess($products) {
        $results = [];
        foreach ($products as $product) {
            $optimized = $this->optimizeTitle($product['title'], $product['category']);
            $results[] = array_merge($product, ['optimized_title' => $optimized]);
            
            // サーバー負荷軽減
            usleep(100000); // 0.1秒待機
        }
        return $results;
    }
}
```

## 📊 **2. カスタマーサポートシステム**

### JavaScript実装例
```javascript
// カスタマーサポートAI
const supportAI = new UniversalAIProcessor({
    provider: 'claude',  // 高品質応答が必要な場合
    claudeModel: 'claude-3-haiku-20240307',  // 最高速Claude
    enableCache: true
});

// 問い合わせ自動分類
async function categorizeInquiry(message) {
    return await supportAI.processWithAI(
        { text: message },
        'category_classify',
        { customPrompt: '以下の問い合わせを分類してください（技術的/販売/返品/その他）: ' + message }
    );
}

// 自動返信生成
async function generateAutoReply(inquiry) {
    return await supportAI.processWithAI(
        { text: inquiry },
        'custom',
        { customPrompt: '丁寧なカスタマーサポート返信を生成してください: ' + inquiry }
    );
}

// 感情分析
async function analyzeSentiment(message) {
    return await supportAI.processWithAI({ text: message }, 'sentiment_analysis');
}
```

## 📝 **3. コンテンツ管理システム**

### ブログ記事自動生成
```javascript
const contentAI = new UniversalAIProcessor({
    provider: 'ollama',
    ollamaModel: 'llama3.2:1b',  // コンテンツ生成用
    timeout: 60000  // 長文生成のため延長
});

// ブログ記事生成
async function generateBlogPost(topic, keywords) {
    const result = await contentAI.processWithAI(
        { theme: topic, keywords: keywords },
        'content_generate',
        { 
            contentType: 'SEO最適化ブログ記事',
            maxTokens: 1000,
            temperature: 0.7  // 創造性を高める
        }
    );
    
    return result.result;
}

// 記事要約
async function summarizeArticle(article) {
    return await contentAI.processWithAI({ text: article }, 'text_summarize');
}

// SEOキーワード抽出
async function extractSEOKeywords(content) {
    return await contentAI.processWithAI({ text: content }, 'product_seo_keywords');
}
```

## 💼 **4. 営業支援システム**

### メール自動作成
```javascript
const salesAI = new UniversalAIProcessor({
    provider: 'claude',
    enableCache: true,
    batchSize: 5  // 営業メールは個別性重視
});

// 営業メール生成
async function generateSalesEmail(prospect, product) {
    return await salesAI.processWithAI(
        { 
            subject: `${prospect.company}様へ ${product.name}のご提案`,
            prospect: prospect,
            product: product
        },
        'email_compose',
        { 
            emailType: '営業提案',
            customPrompt: `${prospect.company}の${prospect.role}である${prospect.name}様に、${product.name}を提案する営業メールを作成してください。`
        }
    );
}

// 顧客データ分析
async function analyzeCustomerData(customerData) {
    return await salesAI.processWithAI(customerData, 'data_analysis');
}
```

## 🏪 **5. ECサイト管理**

### 商品データ自動処理
```javascript
const ecommerceAI = new UniversalAIProcessor({
    provider: 'ollama',
    ollamaModel: 'phi3:mini',
    enableBatch: true,
    batchSize: 20
});

// カテゴリ自動分類
async function autoClassifyProducts(products) {
    return await ecommerceAI.processBatch(products, 'category_classify');
}

// 価格最適化分析
async function analyzePricing(product, marketData) {
    return await ecommerceAI.processWithAI(
        { product: product, market: marketData },
        'custom',
        { customPrompt: '市場データを分析して最適価格を提案してください' }
    );
}

// レビュー感情分析
async function analyzeReviews(reviews) {
    return await ecommerceAI.processBatch(
        reviews.map(r => ({ text: r.comment })),
        'sentiment_analysis'
    );
}
```

## 📈 **6. データ分析システム**

### 自動レポート生成
```javascript
const analyticsAI = new UniversalAIProcessor({
    provider: 'claude',
    claudeModel: 'claude-3-haiku-20240307',
    timeout: 45000
});

// データ分析レポート生成
async function generateAnalyticsReport(data) {
    return await analyticsAI.processWithAI(
        data,
        'custom',
        { 
            customPrompt: '以下のデータを分析し、インサイトと推奨アクションを含むレポートを生成してください：' + JSON.stringify(data),
            maxTokens: 1500
        }
    );
}

// トレンド分析
async function analyzeTrends(timeSeriesData) {
    return await analyticsAI.processWithAI(
        { data: timeSeriesData },
        'data_analysis',
        { customPrompt: 'このデータのトレンドと将来予測を分析してください' }
    );
}
```

---

## 🚀 **実装のベストプラクティス**

### 1. **プロバイダー選択指針**
```
軽量・高速必要 → Ollama (phi3:mini)
高品質・正確性 → Claude API (haiku)
創造性・長文 → Claude API (sonnet)
コスト重視 → Ollama (llama3.2:1b)
```

### 2. **処理時間最適化**
- **キャッシュ活用**: 同じ入力の重複処理回避
- **バッチ処理**: 大量データの効率処理
- **タイムアウト設定**: 30-60秒が現実的
- **フォールバック**: AI失敗時の代替処理

### 3. **エラーハンドリング**
- **段階的劣化**: AI → 基本処理 → 元データ
- **ログ記録**: 失敗パターンの分析
- **リトライ機能**: 一時的エラーの対応
- **ユーザー通知**: 処理状況の透明性

### 4. **パフォーマンス監視**
- **応答時間測定**: 処理速度の最適化
- **成功率追跡**: システム安定性確認
- **キャッシュ効率**: メモリ使用量最適化
- **統計分析**: 改善点の特定

これで、**どんなシステムでもAI処理を効率的に実装**できます！
