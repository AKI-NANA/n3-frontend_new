// /services/ai_pipeline/EUComplianceChecker.ts

// 💡 データベースまたはコンフィグからの高リスクHTSコードリスト
const HIGH_RISK_HTS_CODES = ['9503', '8501', '9019']; // おもちゃ, 電子機器など

interface ProductAnalysis {
    hts_code: string;
    brand_name: string | null;
    origin_country: string;
    title: string;
    eu_ar_status: 'REQUIRED_NO_AR' | 'AR_SECURED' | 'NOT_REQUIRED';
}

/**
 * EUリスクを判定し、推奨タイトルを生成する
 * トークン消費を抑えるため、W1, W2がTRUEの場合にのみW3をチェックする設計
 */
export async function checkAndScoreEuRisk(product: ProductAnalysis): Promise<{ eu_risk_flag: boolean, reason: string, suggestedTitle: string }> {
    let riskFlag = false;
    let reason = '';
    
    // --- Step 1: 自動予備スクリーニング (低コスト) ---
    
    // W1: CE高リスクカテゴリチェック
    const W1 = HIGH_RISK_HTS_CODES.includes(product.hts_code);
    if (W1) reason += '高リスクカテゴリ(' + product.hts_code + ') ';
    
    // W2: ノーブランド中国製品チェック
    const isNoBrand = !product.brand_name || product.brand_name.toLowerCase().includes('unbranded');
    const isChina = product.origin_country.toLowerCase() === 'china';
    const W2 = isChina && isNoBrand;
    if (W2) reason += 'AND ノーブランド中国製品 ';

    if (W1 && W2) {
        // --- Step 2: AIによる詳細な市場調査 (高コスト) ---
        
        // 💡 AIへのプロンプト例: "過去の警告商品DBとタイトル'${product.title}'を比較し、類似するリスクパターンがあるか、またリスク回避のためのタイトル案を提示してください。"
        // const aiResponse = await callGeminiForRiskCheck(product.title);
        
        // W3: 過去の警告パターン一致 (AIの結果をモック)
        const W3 = true; // 予備リスクがある場合、ここではAIが何らかの類似性を見つけたと仮定
        if (W3) reason += 'AND 過去の警告パターンに類似';
        
        riskFlag = true;
        
        // リスク回避用タイトルを生成
        const suggestedTitle = product.title.replace(product.brand_name || '', 'Compatible with XXX');
        
        return { 
            eu_risk_flag: riskFlag, 
            reason: reason.trim(), 
            suggestedTitle: suggestedTitle
        };
    }

    // W1/W2でリスクが確定しない場合は低リスクと判断
    return { 
        eu_risk_flag: riskFlag, 
        reason: '低リスク (CE対象外または安全と判定)', 
        suggestedTitle: product.title 
    };
}