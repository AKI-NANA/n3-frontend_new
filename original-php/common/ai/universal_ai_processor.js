/**
 * 汎用AI処理マネージャー v1.0
 * 
 * 🎯 用途: あらゆるシステムでAI処理を効率的に実装
 * ✅ Ollama対応
 * ✅ Claude API対応  
 * ✅ 処理時間最適化
 * ✅ エラーハンドリング
 */

class UniversalAIProcessor {
    constructor(config = {}) {
        this.config = {
            // AI プロバイダー設定
            provider: config.provider || 'ollama', // 'ollama' | 'claude' | 'openai'
            
            // Ollama設定
            ollamaUrl: config.ollamaUrl || 'http://localhost:11434',
            ollamaModel: config.ollamaModel || 'phi3:mini', // 軽量モデル
            
            // Claude API設定
            claudeApiKey: config.claudeApiKey || process.env.CLAUDE_API_KEY,
            claudeModel: config.claudeModel || 'claude-3-haiku-20240307', // 最高速
            
            // 処理設定
            timeout: config.timeout || 30000,
            retryCount: config.retryCount || 3,
            batchSize: config.batchSize || 10,
            
            // パフォーマンス設定
            enableCache: config.enableCache !== false,
            enableBatch: config.enableBatch !== false,
            enableFallback: config.enableFallback !== false
        };
        
        this.cache = new Map();
        this.stats = {
            totalRequests: 0,
            successCount: 0,
            errorCount: 0,
            cacheHits: 0,
            avgResponseTime: 0
        };
    }
    
    /**
     * 🚀 メイン処理関数 - あらゆるAI処理に対応
     */
    async processWithAI(data, processingType, options = {}) {
        const startTime = Date.now();
        
        try {
            // データ形式を統一
            const normalizedData = this.normalizeInput(data);
            
            // 処理タイプに応じてプロンプト生成
            const prompt = this.generatePrompt(normalizedData, processingType, options);
            
            // キャッシュチェック
            if (this.config.enableCache) {
                const cached = this.getCachedResult(prompt);
                if (cached) {
                    this.stats.cacheHits++;
                    return cached;
                }
            }
            
            // AI処理実行
            const result = await this.executeAIProcessing(prompt, options);
            
            // 結果をキャッシュ
            if (this.config.enableCache && result.success) {
                this.setCachedResult(prompt, result);
            }
            
            // 統計更新
            this.updateStats(Date.now() - startTime, true);
            
            return result;
            
        } catch (error) {
            this.updateStats(Date.now() - startTime, false);
            
            // フォールバック処理
            if (this.config.enableFallback) {
                return this.fallbackProcessing(data, processingType, options);
            }
            
            throw error;
        }
    }
    
    /**
     * 📊 バッチ処理（大量データ対応）
     */
    async processBatch(dataArray, processingType, options = {}) {
        if (!this.config.enableBatch || dataArray.length <= this.config.batchSize) {
            // 小量データは個別処理
            const results = [];
            for (const item of dataArray) {
                const result = await this.processWithAI(item, processingType, options);
                results.push(result);
                
                // CPU負荷軽減
                if (results.length % 10 === 0) {
                    await this.sleep(100);
                }
            }
            return results;
        }
        
        // 大量データはチャンク処理
        const chunks = this.createChunks(dataArray, this.config.batchSize);
        const allResults = [];
        
        for (let i = 0; i < chunks.length; i++) {
            console.log(`🔄 バッチ処理 ${i + 1}/${chunks.length}`);
            
            const chunkResults = await Promise.allSettled(
                chunks[i].map(item => this.processWithAI(item, processingType, options))
            );
            
            const successResults = chunkResults
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
                
            allResults.push(...successResults);
            
            // チャンク間で休憩
            if (i < chunks.length - 1) {
                await this.sleep(1000);
            }
        }
        
        return allResults;
    }
    
    /**
     * 🎯 処理タイプ別プロンプト生成
     */
    generatePrompt(data, processingType, options) {
        const prompts = {
            // 商品関連
            'product_title_optimize': `商品タイトルを最適化してください: "${data.title}"`,
            'product_description': `商品説明を生成してください。商品名: "${data.title}", カテゴリ: "${data.category}"`,
            'product_seo_keywords': `SEOキーワードを5個生成してください。商品: "${data.title}"`,
            
            // テキスト処理
            'text_summarize': `以下のテキストを要約してください: "${data.text}"`,
            'text_translate': `以下を${options.targetLang || '英語'}に翻訳してください: "${data.text}"`,
            'text_improve': `以下のテキストを改善してください: "${data.text}"`,
            
            // データ分析
            'data_analysis': `以下のデータを分析してください: ${JSON.stringify(data)}`,
            'category_classify': `以下のアイテムのカテゴリを判定してください: "${data.item}"`,
            'sentiment_analysis': `以下のテキストの感情分析をしてください: "${data.text}"`,
            
            // コンテンツ生成
            'content_generate': `${options.contentType || 'ブログ記事'}を生成してください。テーマ: "${data.theme}"`,
            'email_compose': `${options.emailType || 'ビジネス'}メールを作成してください。件名: "${data.subject}"`,
            
            // 汎用処理
            'custom': options.customPrompt || data.prompt || '処理してください'
        };
        
        return prompts[processingType] || prompts.custom;
    }
    
    /**
     * 🤖 AI処理実行（プロバイダー別）
     */
    async executeAIProcessing(prompt, options) {
        switch (this.config.provider) {
            case 'ollama':
                return await this.processWithOllama(prompt, options);
            case 'claude':
                return await this.processWithClaude(prompt, options);
            case 'openai':
                return await this.processWithOpenAI(prompt, options);
            default:
                throw new Error(`Unsupported AI provider: ${this.config.provider}`);
        }
    }
    
    /**
     * 🦙 Ollama処理
     */
    async processWithOllama(prompt, options) {
        const payload = {
            model: this.config.ollamaModel,
            prompt: prompt,
            stream: false,
            options: {
                temperature: options.temperature || 0.3,
                num_ctx: options.contextLength || 2048,
                num_predict: options.maxTokens || 200,
                top_p: options.topP || 0.9
            }
        };
        
        const response = await this.fetchWithTimeout(
            `${this.config.ollamaUrl}/api/generate`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }
        );
        
        if (!response.ok) {
            throw new Error(`Ollama API Error: ${response.status}`);
        }
        
        const result = await response.json();
        
        return {
            success: true,
            result: result.response,
            provider: 'ollama',
            model: this.config.ollamaModel,
            tokens: result.eval_count || 0
        };
    }
    
    /**
     * 🤖 Claude API処理
     */
    async processWithClaude(prompt, options) {
        if (!this.config.claudeApiKey) {
            throw new Error('Claude API key not configured');
        }
        
        const payload = {
            model: this.config.claudeModel,
            max_tokens: options.maxTokens || 1000,
            messages: [{ role: 'user', content: prompt }],
            temperature: options.temperature || 0.3
        };
        
        const response = await this.fetchWithTimeout(
            'https://api.anthropic.com/v1/messages',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.config.claudeApiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(payload)
            }
        );
        
        if (!response.ok) {
            throw new Error(`Claude API Error: ${response.status}`);
        }
        
        const result = await response.json();
        
        return {
            success: true,
            result: result.content[0].text,
            provider: 'claude',
            model: this.config.claudeModel,
            tokens: result.usage?.total_tokens || 0
        };
    }
    
    /**
     * 🛡️ フォールバック処理
     */
    fallbackProcessing(data, processingType, options) {
        const fallbackResults = {
            'product_title_optimize': data.title || data,
            'text_summarize': data.text?.substring(0, 100) + '...' || data,
            'category_classify': 'General',
            'sentiment_analysis': 'Neutral'
        };
        
        return {
            success: true,
            result: fallbackResults[processingType] || data,
            provider: 'fallback',
            fallback: true
        };
    }
    
    // ========================================
    // ユーティリティ関数
    // ========================================
    
    normalizeInput(data) {
        if (typeof data === 'string') {
            return { text: data };
        }
        return data;
    }
    
    async fetchWithTimeout(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    createChunks(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    getCachedResult(key) {
        return this.cache.get(key);
    }
    
    setCachedResult(key, value) {
        // LRUキャッシュ（簡易版）
        if (this.cache.size >= 1000) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
    
    updateStats(responseTime, success) {
        this.stats.totalRequests++;
        if (success) {
            this.stats.successCount++;
        } else {
            this.stats.errorCount++;
        }
        
        // 移動平均で応答時間を更新
        this.stats.avgResponseTime = 
            (this.stats.avgResponseTime * (this.stats.totalRequests - 1) + responseTime) / 
            this.stats.totalRequests;
    }
    
    getStats() {
        return {
            ...this.stats,
            successRate: (this.stats.successCount / this.stats.totalRequests * 100).toFixed(1) + '%',
            cacheHitRate: (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(1) + '%'
        };
    }
}

// 使用例のエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalAIProcessor;
}

if (typeof window !== 'undefined') {
    window.UniversalAIProcessor = UniversalAIProcessor;
}