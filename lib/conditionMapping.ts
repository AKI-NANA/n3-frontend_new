// Yahoo状態 → eBay状態のマッピング
export const YAHOO_TO_EBAY_CONDITION_MAPPING: { [key: string]: { ebayCondition: string, conditionId: number } } = {
  // 新品系
  '新品': { ebayCondition: 'New', conditionId: 1000 },
  '未使用': { ebayCondition: 'New', conditionId: 1000 },
  '未使用に近い': { ebayCondition: 'Like New', conditionId: 1500 },
  
  // 中古系
  '目立った傷や汚れなし': { ebayCondition: 'Very Good', conditionId: 4000 },
  'やや傷や汚れあり': { ebayCondition: 'Good', conditionId: 5000 },
  '傷や汚れあり': { ebayCondition: 'Acceptable', conditionId: 6000 },
  '全体的に状態が悪い': { ebayCondition: 'For Parts', conditionId: 7000 },
  
  // デフォルト（中古）
  '中古': { ebayCondition: 'Used', conditionId: 3000 },
};

// eBay Condition ID → 日本語名のマッピング
export const EBAY_CONDITION_NAMES: { [key: number]: string } = {
  1000: 'New (新品)',
  1500: 'Like New (未使用に近い)',
  3000: 'Used (中古)',
  4000: 'Very Good (目立った傷なし)',
  5000: 'Good (やや傷あり)',
  6000: 'Acceptable (傷あり)',
  7000: 'For Parts (ジャンク)',
};

// Yahoo状態をeBay状態に変換する関数
export function convertYahooToEbayCondition(yahooCondition: string): { ebayCondition: string, conditionId: number } {
  // 完全一致を試みる
  if (YAHOO_TO_EBAY_CONDITION_MAPPING[yahooCondition]) {
    return YAHOO_TO_EBAY_CONDITION_MAPPING[yahooCondition];
  }
  
  // 部分一致で判定
  if (yahooCondition.includes('新品') || yahooCondition.includes('未使用')) {
    if (yahooCondition.includes('近い')) {
      return { ebayCondition: 'Like New', conditionId: 1500 };
    }
    return { ebayCondition: 'New', conditionId: 1000 };
  }
  
  if (yahooCondition.includes('目立った傷') && yahooCondition.includes('なし')) {
    return { ebayCondition: 'Very Good', conditionId: 4000 };
  }
  
  if (yahooCondition.includes('やや傷')) {
    return { ebayCondition: 'Good', conditionId: 5000 };
  }
  
  if (yahooCondition.includes('傷') || yahooCondition.includes('汚れ')) {
    return { ebayCondition: 'Acceptable', conditionId: 6000 };
  }
  
  if (yahooCondition.includes('状態が悪い') || yahooCondition.includes('ジャンク')) {
    return { ebayCondition: 'For Parts', conditionId: 7000 };
  }
  
  // デフォルト: Used
  return { ebayCondition: 'Used', conditionId: 3000 };
}
