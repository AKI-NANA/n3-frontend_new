// services/ListingService.ts

/**
 * 出品・オファー自動化サービス
 * カテゴリー枠管理と赤字防止オファー計算ロジックをシミュレート
 */

// -- データ型定義 --

// 商品マスターに追加されるべき設定
export interface ProductAutoOfferConfig {
  productId: string;
  listingPriceJPY: number; // 出品価格 (為替調整後)
  acquisitionCostJPY: number; // 仕入れ値
  fixedCostJPY: number; // 固定経費 (梱包材など)
  commissionRate: number; // モール手数料率 (例: 0.15 = 15%)

  // 赤字防止設定 (指示書 III.A)
  minProfitMarginJPY: number; // 確保したい最低利益額
  maxDiscountRate: number; // 許容できる最大割引率 (0.0 - 1.0)
  autoOfferEnabled: boolean; // 自動オファーの有効/無効
}

// eBayカテゴリー枠
export interface EbayCategoryLimit {
  accountId: string;
  categoryId: string;
  limitType: "10000_ITEM" | "50000_ITEM";
  currentListingCount: number;
  maxLimit: number;
}

/**
 * 損益分岐点を計算するコア関数
 * @param config 商品のオファー設定
 * @returns 損益分岐価格 (JPY)
 */
function calculateBreakeven(config: ProductAutoOfferConfig): number {
  // 損益分岐点 = (仕入れ値 + 固定経費 + 最低利益) / (1 - 手数料率)
  // 販売価格 - 手数料 - 仕入れ値 - 固定経費 >= 最低利益
  // 販売価格 * (1 - 手数料率) >= 仕入れ値 + 固定経費 + 最低利益

  const numerator =
    config.acquisitionCostJPY + config.fixedCostJPY + config.minProfitMarginJPY;
  const denominator = 1 - config.commissionRate;

  // 手数料率を考慮した最低販売価格
  return Math.ceil(numerator / denominator);
}

/**
 * 自動オファー価格の計算と決定ロジック (指示書 III.B)
 * @param config 商品のオファー設定
 * @returns 自動送信すべき推奨オファー価格 (JPY)
 */
export function determineAutoOfferPrice(
  config: ProductAutoOfferConfig
): number {
  if (!config.autoOfferEnabled) {
    console.log(`[OFFER-LOGIC] ${config.productId}: 自動オファーは無効です。`);
    return 0;
  }

  // 1. 損益分岐点 (利益ベースの最低価格)
  const breakevenPrice = calculateBreakeven(config);

  // 2. 割引率ベースの最低価格 (出品価格 * (1 - MaxDiscountRate))
  const discountPrice = Math.floor(
    config.listingPriceJPY * (1 - config.maxDiscountRate)
  );

  // 最終オファー最低ライン: 利益保証と最大割引率のうち、より高い方の価格を採用 (赤字防止保証)
  const finalOfferFloor = Math.max(breakevenPrice, discountPrice);

  // 最終オファー価格: 最低ラインをわずかに上回る価格を推奨 (例: +100円)
  const recommendedOfferPrice = finalOfferFloor + 100;

  console.log(`[OFFER-LOGIC] ${config.productId}:`);
  console.log(`  - 損益分岐点 (利益保証): ¥${breakevenPrice.toLocaleString()}`);
  console.log(`  - 割引率ベース最低価格: ¥${discountPrice.toLocaleString()}`);
  console.log(
    `  - 推奨オファー価格: ¥${recommendedOfferPrice.toLocaleString()}`
  );

  // 出品価格を超えないように保証
  return Math.min(recommendedOfferPrice, config.listingPriceJPY);
}

/**
 * カテゴリー枠の自動出品前チェックロジック (指示書 II.B)
 * @param categoryId 出品しようとしているカテゴリーID
 * @param accountLimit 現在のアカウントのカテゴリー枠情報
 * @returns 出品が可能かどうか (boolean)
 */
export function checkAndManageListingLimit(
  categoryId: string,
  accountLimit: EbayCategoryLimit
): { canList: boolean; message: string } {
  console.log(`[LIMIT-CHECK] カテゴリー ${categoryId} の出品枠をチェック中...`);

  const availableSlots =
    accountLimit.maxLimit - accountLimit.currentListingCount;

  if (availableSlots <= 0) {
    // 上限に達している場合: 自動ストップまたは自動交代
    console.warn(
      `[LIMIT-ALERT] カテゴリー ${categoryId} は上限(${accountLimit.maxLimit})に達しています。`
    );

    // 自動ストップ
    if (availableSlots === 0) {
      return {
        canList: false,
        message: "出品枠の上限に達しました。自動出品を停止します。",
      };
    }

    // 自動交代 (スコア計算ロジックは別途必要)
    // ここでは、交代ロジックが有効な場合のメッセージを返す
    return {
      canList: true,
      message:
        "出品枠が上限に達しているため、スコアの低い商品を自動で取り下げてから出品します (自動交代)",
    };
  }

  return {
    canList: true,
    message: `出品枠は十分にあります。残り ${availableSlots} 枠。`,
  };
}

/**
 * オファー有効化後の価格自動調整ロジック (指示書 III.C)
 * @param listingPrice 現在の出品価格
 * @param adjustmentRate 上乗せ率 (例: 0.05 = 5%)
 * @returns 調整後の新しい出品価格
 */
export function adjustPriceAfterOfferActivation(
  listingPrice: number,
  adjustmentRate: number
): number {
  const newPrice = Math.ceil(listingPrice * (1 + adjustmentRate));
  console.log(
    `[PRICE-ADJUST] オファー有効化に伴い、価格を ${
      adjustmentRate * 100
    }% 上乗せしました: ¥${listingPrice} -> ¥${newPrice}`
  );
  return newPrice;
}
