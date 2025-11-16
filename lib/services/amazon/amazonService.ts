// /services/amazonService.ts の一部を修正・追記

// -----------------------------------------------------
// AmazonConfig の型定義 (DBスキーマと一致させる)
// -----------------------------------------------------
export interface AmazonConfig {
    id: number;
    config_name: string;
    search_keywords?: string;
    target_category_id?: string;
    min_rating: number;
    max_bsr_rank: number;
    min_image_count: number;
    min_title_length: number;
    is_active: boolean;
    // ... 他のフィールド
}

// -----------------------------------------------------
// スコアリング定数 (必要に応じて調整)
// -----------------------------------------------------
const W1 = 0.5; // レビュー数重み
const W2 = 100; // 評価点数重み
const W3 = 100000; // BSR重み
const INFO_PENALTY = 500; // 情報量不足による減点

/**
 * Amazonのデータ品質（情報量）を加味したスコアを付与するロジック
 * 💡 新製品、売れ筋、情報量の3要素でスコアリング
 * @param productDetails Amazon APIから取得した商品の詳細データ
 * @param config 適用する設定値 (amazon_configテーブルから取得)
 * @returns 取得優先度スコア (NUMERIC)。閾値以下の場合は -1
 */
export function calculateAcquisitionScore(productDetails: any, config: AmazonConfig): number {
    const rating = productDetails.averageRating || 0;
    const bsr = productDetails.bestSellerRank || 9999999; // BSRがない場合は極めて低い順位とする
    const reviewCount = productDetails.reviewCount || 0;
    const titleLength = productDetails.title?.length || 0;
    const imageCount = productDetails.imageUrls?.length || 0;
    
    // 1. 閾値フィルタリング (売れないカタログの第一段階排除)
    // BSRが設定閾値より大きい OR 評価が設定閾値より小さい
    if (bsr > config.max_bsr_rank || rating < config.min_rating) {
        return -1; // 即座に除外
    }
    
    // 2. 基本スコア: 売れ筋と評価
    // (レビュー数 * W1) + (評価点 * W2) + (W3 / BSR)
    let score = (W1 * reviewCount) + (W2 * rating) + (W3 / bsr);
    
    // 3. 情報量チェック (売れないカタログの最終確認/減点)
    if (imageCount < config.min_image_count || titleLength < config.min_title_length) {
        score -= INFO_PENALTY; // 情報量不足による大幅減点
    }

    // 4. 新製品ボーナス (リリース日から30日以内など)
    const releaseDate = productDetails.releaseDate ? new Date(productDetails.releaseDate) : null;
    const thirtyDaysAgo = new Date(new Date().getTime() - (30 * 24 * 60 * 60 * 1000));

    if (releaseDate && releaseDate > thirtyDaysAgo) {
        score += 300; // 加点: 新製品ボーナス
    }
    
    return score;
}

// 💡 既存のサービス関数（例: processTopScoredItem）は、
// この calculateAcquisitionScore 関数を呼び出し、スコアが -1 の場合は処理をスキップするように修正してください。

// ... (既存のAmazon Serviceロジックの続き) ...