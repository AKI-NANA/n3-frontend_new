/**
 * eBay配送ポリシー用の定数
 */

// デフォルト除外国（121カ国）
export const DEFAULT_EXCLUDED_COUNTRIES = [
  "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AS", "AZ", "BA",
  "BB", "BD", "BF", "BH", "BI", "BJ", "BM", "BN", "BO", "BT",
  "BW", "BY", "BZ", "CD", "CF", "CG", "CI", "CK", "CM", "CV",
  "DJ", "DM", "DZ", "EC", "EG", "ER", "ET", "FJ", "FK", "GA",
  "GD", "GF", "GG", "GH", "GL", "GM", "GN", "GP", "GQ", "GT",
  "GU", "GW", "GY", "HT", "IQ", "JE", "JM", "JP", "KE", "KG",
  "KH", "KI", "KM", "KY", "LA", "LB", "LK", "LR", "LS", "LY",
  "MA", "MG", "ML", "MN", "MO", "MR", "MU", "MV", "MW", "MY",
  "MZ", "NA", "NE", "NG", "NP", "OM", "PF", "PH", "PK", "PR",
  "QA", "RU", "RW", "SA", "SC", "SG", "SL", "SN", "SO", "SZ",
  "TD", "TG", "TH", "TJ", "TM", "TN", "TR", "TW", "TZ", "UG",
  "UZ", "VA", "VI", "VN", "YE", "ZA", "ZM", "ZW"
]

// USA Domestic除外（Alaska/Hawaii等）
export const USA_DOMESTIC_EXCLUDED = [
  "Alaska/Hawaii",
  "US Protectorates", 
  "APO/FPO",
  "PO Box"
]

// Rate Table ID
export const RATE_TABLE_EXPRESS_1 = "5286584019"

// 配送サービスコード
export const SHIPPING_SERVICES = {
  DOMESTIC_EXPEDITED: "ExpeditedShippingFromOutsideUS",
  INTERNATIONAL_EXPEDITED: "ExpeditedInternational",
  INTERNATIONAL_STANDARD: "StandardInternational"
}
