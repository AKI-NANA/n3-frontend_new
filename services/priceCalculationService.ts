// Price Calculation Service

/**
 * 基本的な価格計算
 */
export const calculatePrice = (cost: number, markup: number) => {
  return cost * (1 + markup / 100);
};

/**
 * 動的配送料+関税計算（DDP）
 * @param weight 重量（g）
 * @param destinationCountry 配送先国コード
 * @param itemValue 商品価値（USD）
 * @returns 配送料+関税の合計（USD）
 */
export const calculateDynamicShippingDdp = (
  weight: number,
  destinationCountry: string,
  itemValue: number
): number => {
  // 簡易実装：実際のロジックは後で実装
  const baseShipping = Math.ceil(weight / 100) * 5; // 100gごとに$5
  const tariffRate = destinationCountry === 'US' ? 0.025 : 0.05; // 米国2.5%、その他5%
  const tariff = itemValue * tariffRate;
  
  return baseShipping + tariff;
};

export default {
  calculatePrice,
  calculateDynamicShippingDdp
};
