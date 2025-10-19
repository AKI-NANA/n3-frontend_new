/**
 * 🚀 Maru9 データ修正ツール - 商用品質処理JavaScript深化版
 * 
 * 既存UIを保持しながらAI統合システムと連携
 */

// ====================================================================================================
// 汎用AI統合システム連携クラス
// ====================================================================================================
class Maru9AIIntegration {
    constructor() {
        this.isProcessing = false;
        this.processingHistory = [];
        this.commercialQualityThreshold = 75;
        this.scientificNotationIssues = [];
        
        // AI処理結果キャッシュ
        this.aiProcessingCache = new Map();
        
        console.log('🤖 Maru9 AI統合システム初期化完了');
    }
    
    /**
     * 商用品質CSV処理 - 既存AI開発スイートとの連携
     */
    async processCommercialQualityCSV(csvData, headers) {
        if (this.isProcessing) {
            throw new Error('既に処理が実行中です');
        }
        
        this.isProcessing = true;
        const startTime = Date.now();
        
        try {
            // Phase 1: 科学的記数法完全排除
            const scientificProtectedData = this.applyScientificNotationProtection(csvData, headers);
            
            // Phase 2: 商用品質検証
            const qualityAssessment = this.assessCommercialQuality(scientificProtectedData, headers);
            
            // Phase 3: Amazon/eBay互換性チェック
            const platformCompatibility = this.checkPlatformCompatibility(scientificProtectedData, headers);
            
            // Phase 4: VERO リスク評価
            const veroRiskAssessment = this.assessVeroRisks(scientificProtectedData, headers);
            
            // Phase 5: 深度AI処理（バックエンド連携想定）
            const aiEnhancedData = await this.applyAIEnhancements(scientificProtectedData, headers);
            
            const processingTime = Date.now() - startTime;
            
            const result = {
                originalDataCount: csvData.length,
                processedDataCount: aiEnhancedData.length,
                headers: headers,
                enhancedData: aiEnhancedData,
                qualityAssessment: qualityAssessment,
                platformCompatibility: platformCompatibility,
                veroRiskAssessment: veroRiskAssessment,
                scientificNotationIssues: this.scientificNotationIssues,
                processingTime: processingTime,
                processingSummary: {
                    qualityScore: qualityAssessment.qualityScore,
                    commercialReadiness: qualityAssessment.commercialReadiness,
                    scientificNotationFixes: this.scientificNotationIssues.length,
                    amazonCompatible: platformCompatibility.amazon.compatible,
                    ebayCompatible: platformCompatibility.ebay.compatible,
                    veroRiskLevel: veroRiskAssessment.riskLevel
                }
            };
            
            // 処理履歴に記録
            this.processingHistory.push({
                timestamp: new Date().toISOString(),
                dataCount: csvData.length,
                qualityScore: qualityAssessment.qualityScore,
                processingTime: processingTime
            });
            
            console.log('✅ 商用品質CSV処理完了', result.processingSummary);
            return result;
            
        } catch (error) {
            console.error('❌ 商用品質CSV処理エラー:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * 科学的記数法完全保護システム
     */
    applyScientificNotationProtection(csvData, headers) {
        const protectedColumns = [
            'product_id', 'id', 'sku', 'asin', 'jan', 'code', 
            'barcode', 'isbn', 'model_number'
        ];
        
        this.scientificNotationIssues = [];
        
        return csvData.map((row, rowIndex) => {
            const protectedRow = {};
            
            headers.forEach(header => {
                const originalValue = row[header] || '';
                const isProtectedColumn = protectedColumns.some(col => 
                    header.toLowerCase().includes(col.toLowerCase())
                );
                
                if (isProtectedColumn || this.isLargeNumber(originalValue)) {
                    const protectedValue = this.scientificToString(originalValue);
                    protectedRow[header] = protectedValue;
                    
                    if (this.hasScientificNotation(originalValue)) {
                        this.scientificNotationIssues.push({
                            row: rowIndex + 1,
                            column: header,
                            original: originalValue,
                            fixed: protectedValue
                        });
                    }
                } else {
                    protectedRow[header] = originalValue;
                }
            });
            
            return protectedRow;
        });
    }
    
    /**
     * 科学的記数法を元の数値文字列に復元
     */
    scientificToString(value) {
        const valueStr = String(value);
        const scientificPattern = /^-?\d+\.?\d*[eE][+-]?\d+$/;
        
        if (scientificPattern.test(valueStr)) {
            try {
                const num = parseFloat(valueStr);
                const restored = String(Math.floor(num));
                console.log(`🔧 科学的記数法修復: ${valueStr} -> ${restored}`);
                return restored;
            } catch (error) {
                console.error(`❌ 科学的記数法復元エラー ${valueStr}:`, error);
                return valueStr;
            }
        }
        
        // 大きな数値は文字列として保護
        if (typeof value === 'number' && Math.abs(value) > 999999999) {
            return String(Math.floor(value));
        }
        
        return String(value);
    }
    
    /**
     * 科学的記数法検出
     */
    hasScientificNotation(value) {
        return /\d+\.?\d*[eE][+-]?\d+/.test(String(value));
    }
    
    /**
     * 大数値判定
     */
    isLargeNumber(value) {
        const num = Number(value);
        return !isNaN(num) && Math.abs(num) > 999999999;
    }
    
    /**
     * 商用品質評価
     */
    assessCommercialQuality(csvData, headers) {
        const requiredColumns = {
            essential: ['product_id', 'product_name', 'price'],
            commercial: ['category', 'brand', 'description', 'stock_quantity'],
            ecommerce: ['weight', 'dimensions', 'image_url'],
            optional: ['sku', 'barcode', 'tags', 'manufacturer']
        };
        
        // 構造スコア算出
        const allRequired = Object.values(requiredColumns).flat();
        const presentColumns = allRequired.filter(col => headers.includes(col));
        const structureScore = Math.round((presentColumns.length / allRequired.length) * 100);
        
        // データ品質スコア算出
        const qualityIssues = this.validateDataQuality(csvData, headers);
        const dataQualityScore = Math.round(((csvData.length - qualityIssues.length) / csvData.length) * 100);
        
        // 科学的記数法スコア
        const scientificScore = this.scientificNotationIssues.length === 0 ? 100 : 
                               Math.max(90 - (this.scientificNotationIssues.length * 2), 50);
        
        // 総合品質スコア（重み付き平均）
        const qualityScore = Math.round(
            (structureScore * 0.3) + 
            (dataQualityScore * 0.4) + 
            (scientificScore * 0.3)
        );
        
        // 商用準備度判定
        let commercialReadiness;
        if (qualityScore >= 90) commercialReadiness = 'excellent';
        else if (qualityScore >= 75) commercialReadiness = 'good';
        else if (qualityScore >= 60) commercialReadiness = 'acceptable';
        else commercialReadiness = 'needs_improvement';
        
        return {
            qualityScore: qualityScore,
            commercialReadiness: commercialReadiness,
            structureScore: structureScore,
            dataQualityScore: dataQualityScore,
            scientificScore: scientificScore,
            presentColumns: presentColumns,
            missingColumns: allRequired.filter(col => !headers.includes(col)),
            qualityIssues: qualityIssues
        };
    }
    
    /**
     * プラットフォーム互換性チェック
     */
    checkPlatformCompatibility(csvData, headers) {
        // Amazon必須フィールド
        const amazonRequired = ['product_id', 'product_name', 'price', 'description', 'category'];
        const amazonMissing = amazonRequired.filter(field => !headers.includes(field));
        const amazonCompatible = amazonMissing.length === 0;
        
        // eBay必須フィールド
        const ebayRequired = ['product_name', 'price', 'description', 'category', 'condition'];
        const ebayMissing = ebayRequired.filter(field => !headers.includes(field));
        const ebayCompatible = ebayMissing.length === 0;
        
        return {
            amazon: {
                compatible: amazonCompatible,
                compatibilityScore: (amazonRequired.length - amazonMissing.length) / amazonRequired.length,
                missingFields: amazonMissing,
                recommendation: amazonCompatible ? 'Amazon出品準備完了' : 
                               `不足フィールド: ${amazonMissing.join(', ')}`
            },
            ebay: {
                compatible: ebayCompatible,
                compatibilityScore: (ebayRequired.length - ebayMissing.length) / ebayRequired.length,
                missingFields: ebayMissing,
                recommendation: ebayCompatible ? 'eBay出品準備完了' : 
                               `不足フィールド: ${ebayMissing.join(', ')}`
            }
        };
    }
    
    /**
     * VERO リスク評価
     */
    assessVeroRisks(csvData, headers) {
        const highRiskKeywords = [
            'apple', 'sony', 'nike', 'adidas', 'samsung', 'lg', 'canon', 'nikon',
            'louis vuitton', 'gucci', 'prada', 'chanel', 'rolex'
        ];
        
        const riskDetections = [];
        
        csvData.forEach((row, rowIndex) => {
            ['product_name', 'description', 'brand'].forEach(header => {
                if (headers.includes(header) && row[header]) {
                    const value = String(row[header]).toLowerCase();
                    highRiskKeywords.forEach(keyword => {
                        if (value.includes(keyword)) {
                            riskDetections.push({
                                row: rowIndex + 1,
                                field: header,
                                keyword: keyword,
                                context: value.substring(0, 100) + (value.length > 100 ? '...' : '')
                            });
                        }
                    });
                }
            });
        });
        
        const riskLevel = riskDetections.length > 5 ? 'high' : 
                         riskDetections.length > 0 ? 'medium' : 'low';
        
        return {
            riskLevel: riskLevel,
            detectedRisks: riskDetections,
            riskCount: riskDetections.length,
            recommendation: riskDetections.length > 0 ? 
                'ブランド名の除去または汎用名称への置換が必要' : 'VERO リスク低'
        };
    }
    
    /**
     * AI強化処理（バックエンド連携想定）
     */
    async applyAIEnhancements(csvData, headers) {
        // 実際の実装では、ここでバックエンドのAI処理システムを呼び出す
        // 現在はフロントエンド側での基本的な処理のみ実装
        
        return csvData.map(row => {
            const enhancedRow = { ...row };
            
            // タイトル最適化（基本的な処理）
            if (headers.includes('product_name')) {
                enhancedRow.product_name = this.optimizeProductTitle(row.product_name);
            }
            
            // 説明文VERO対策（基本的な処理）
            if (headers.includes('description')) {
                enhancedRow.description = this.applyVeroProtection(row.description);
            }
            
            return enhancedRow;
        });
    }
    
    /**
     * 商品タイトル最適化（基本版）
     */
    optimizeProductTitle(title) {
        if (!title) return title;
        
        // 基本的なブランド名除去（汎用名称への置換）
        const brandReplacements = {
            'apple': 'スマートフォン',
            'sony': '高品質オーディオ',
            'nike': 'スポーツシューズ',
            'adidas': 'アスレチックウェア'
        };
        
        let optimizedTitle = title;
        Object.entries(brandReplacements).forEach(([brand, replacement]) => {
            const regex = new RegExp(brand, 'gi');
            optimizedTitle = optimizedTitle.replace(regex, replacement);
        });
        
        return optimizedTitle;
    }
    
    /**
     * VERO保護処理（基本版）
     */
    applyVeroProtection(description) {
        if (!description) return description;
        
        // 基本的なリスクワード除去
        const riskWords = ['apple', 'sony', 'nike', 'adidas', 'samsung'];
        let protectedDescription = description;
        
        riskWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            protectedDescription = protectedDescription.replace(regex, '高品質ブランド');
        });
        
        return protectedDescription;
    }
    
    /**
     * 処理統計取得
     */
    getProcessingStatistics() {
        return {
            totalProcessed: this.processingHistory.length,
            averageQualityScore: this.processingHistory.length > 0 ? 
                Math.round(this.processingHistory.reduce((sum, h) => sum + h.qualityScore, 0) / this.processingHistory.length) : 0,
            averageProcessingTime: this.processingHistory.length > 0 ?
                Math.round(this.processingHistory.reduce((sum, h) => sum + h.processingTime, 0) / this.processingHistory.length) : 0,
            lastProcessedAt: this.processingHistory.length > 0 ? 
                this.processingHistory[this.processingHistory.length - 1].timestamp : null
        };
    }
}

// グローバル変数
let maru9AI = null;
let commercialProcessingResult = null;
let commercialQualityReporter = null;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    // AI統合システム初期化
    maru9AI = new Maru9AIIntegration();
    console.log('🚀 Maru9 AI統合システム準備完了');
});

// デバッグ用エクスポート
window.maru9Debug = {
    getAISystem: () => maru9AI,
    getLastProcessingResult: () => commercialProcessingResult,
    getProcessingStats: () => maru9AI ? maru9AI.getProcessingStatistics() : null,
    testScientificNotation: (value) => maru9AI ? maru9AI.hasScientificNotation(value) : false,
    testLargeNumber: (value) => maru9AI ? maru9AI.isLargeNumber(value) : false
};

console.log('✅ Maru9 汎用AI統合システム準備完了 - 商用品質処理可能');
