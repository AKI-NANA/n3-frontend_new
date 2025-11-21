/**
 * src/services/MultiMarketplaceListingService.ts
 * 目的: SKUマスターデータを出品先モールに合わせて変換し、利益計算を行う。
 * このロジックは、既存の利益計算ロジックと置き換えることを想定したインターフェースである。
 */

import {
  EXCHANGE_RATES,
  MARKETPLACE_FEES,
  SHIPPING_COSTS,
  getCountryCodeByMallId,
} from "../db/master_data_mock";

// --- 型定義 ---
// SKUマスターデータの型定義 (簡略化)
export interface Product {
  id: number;
  title_jp: string;
  cost_price: number; // 仕入れ原価 (JPY)
  weight_g: number; // 商品重量 (g)
  current_stock: number;
  category_id: string; // 共通カテゴリID (モール固有IDへのマッピングが必要)
}

// 出品ターゲットモールのIDリスト (ListingExecutorServiceから参照される想定)
export type TargetMallId =
  | "AMAZON_JP"
  | "SHOPEE_SG"
  | "MERCADO_LIBRE"
  | "REVERB"
  | "QOO10_JP"
  | "BUYMA"
  | "ALLEGRO"
  | "OTTO"
  | "COUPANG"
  | "TCGPLAYER"
  | "CHRONO24"
  | "NOON"
  | "FALABELLA"
  | "ETSY"
  | "DISCOGS"
  | "GRAILED"
  | "CATAWIKI"
  | "BONANZA"
  | "FACEBOOK_MARKETPLACE"
  | "EBAY_US";

// 変換結果の型
export interface ConversionResult {
  data: Record<string, unknown> | null; // モールAPI向けの最終データ
  gross_profit_jpy: number | null; // 粗利 (JPY)
  errors: string[]; // 変換エラーリスト
}

// --- ヘルパー関数 ---

/**
 * モールIDから現地通貨コードを取得する
 */
function getCurrencyByMallId(mallId: TargetMallId): string {
  switch (mallId) {
    case "AMAZON_JP":
    case "QOO10_JP":
    case "BUYMA":
      return "JPY";
    case "SHOPEE_SG":
      return "SGD";
    case "COUPANG":
      return "KRW";
    case "ALLEGRO":
      return "PLN";
    case "OTTO":
    case "CHRONO24":
      return "EUR";
    case "CATAWIKI":
      return "EUR"; // Catawikiは主にEUR（ヨーロッパ市場）
    case "NOON":
    case "FALABELLA":
    case "MERCADO_LIBRE":
    case "REVERB":
    case "ETSY":
    case "DISCOGS":
    case "GRAILED":
    case "TCGPLAYER":
    case "BONANZA":
    case "FACEBOOK_MARKETPLACE":
    case "EBAY_US":
      return "USD"; // これらのモールはUSD圏/USD決済を想定
    default:
      return "USD";
  }
}

/**
 * 商品重量と配送国コードに基づいて国際送料を計算する
 * @param {number} weight_g - 商品重量 (g)
 * @param {string} countryCode - 配送国コード (SG, US, EU, KRなど)
 * @returns {number} 送料 (JPY)
 */
function calculateShippingCost(weight_g: number, countryCode: string): number {
  const shippingMaster = SHIPPING_COSTS.find(
    (s) =>
      s.country_code === countryCode &&
      weight_g >= s.min_weight_g &&
      weight_g <= s.max_weight_g
  );
  // マスタになければ、安全を見て高めのデフォルト値を返す
  return shippingMaster ? shippingMaster.cost_jpy : 4500;
}

// --- メインロジック ---

/**
 * 粗利を確保するための最終販売価格を計算する (汎用ロジック)
 * * 💡 クロード様への注釈:
 * この関数全体を、既存の「利益計算サービス」の呼び出しに置き換えることができます。
 * その際、引数 (product, mallId, targetProfitRate) が既存サービスと互換性を持つよう調整してください。
 *
 * @param {Product} product - SKUデータ
 * @param {TargetMallId} mallId - モールID
 * @param {number} targetProfitRate - 目標粗利率 (例: 0.20 -> 20%)
 * @returns {{ localPrice: number, grossProfitJPY: number, localShippingCost: number }}
 */
function calculateTargetPrice(
  product: Product,
  mallId: TargetMallId,
  targetProfitRate: number = 0.25 // デフォルト25%
): { localPrice: number; grossProfitJPY: number; localShippingCost: number } {
  // 1. マスターデータの取得 (DB連携のシミュレート)
  const countryCode = getCountryCodeByMallId(mallId);
  const currency = getCurrencyByMallId(mallId);
  const fee = MARKETPLACE_FEES[mallId] || {
    sales_fee_rate: 15.0,
    payment_fee_rate: 4.0,
    fixed_fee: 0,
  };
  const exchangeRate = EXCHANGE_RATES[currency] || 0.007; // JPY -> 現地通貨

  // 2. 総原価 (JPY) の算出
  const shippingCostJPY = calculateShippingCost(product.weight_g, countryCode);
  const fulfillmentCostJPY = 500; // 梱包・国内送料など (固定値でモック)
  const totalCostJPY =
    product.cost_price + fulfillmentCostJPY + shippingCostJPY;

  // 3. 販売価格の逆算
  const profitMargin = 1 + targetProfitRate;
  const feeRateTotal = (fee.sales_fee_rate + fee.payment_fee_rate) / 100;

  // 現地通貨に換算された総原価 + 目標利益
  const priceRequiredToCoverCostLocal = totalCostJPY * exchangeRate;

  // 総原価と目標利益を確保するための販売価格
  // P = ((T_local * M_profit) + F_fixed) / (1 - R_fee)
  const targetLocalPrice =
    (priceRequiredToCoverCostLocal * profitMargin + fee.fixed_fee) /
    (1 - feeRateTotal);

  // 4. 結果の検証 (粗利の再計算)
  const calculatedFeeLocal = targetLocalPrice * feeRateTotal + fee.fixed_fee;
  const netRevenueLocal = targetLocalPrice - calculatedFeeLocal;
  const netRevenueJPY = netRevenueLocal / exchangeRate;
  const finalGrossProfitJPY = netRevenueJPY - totalCostJPY;

  return {
    localPrice: parseFloat(targetLocalPrice.toFixed(2)),
    grossProfitJPY: parseFloat(finalGrossProfitJPY.toFixed(0)),
    localShippingCost: parseFloat((shippingCostJPY * exchangeRate).toFixed(2)),
  };
}

/**
 * メインのデータ変換関数。全モールIDに対応する枠組みを提供する。
 * * 💡 クロード様への注釈:
 * 各 case ブロック内のデータ構造 (`convertedData`) を、既存の「モール別データマッピング」ロジックに置き換えるか、
 * 既存マッピングロジックを呼び出す形に変更してください。
 *
 * @param {Product} product - SKUマスターデータ
 * @param {TargetMallId} mallId - モールID
 * @param {'API_JSON' | 'CSV_UPLOAD'} outputFormat - 出力データの形式
 * @returns {ConversionResult} 変換結果と粗利
 */
export function convertProductData(
  product: Product,
  mallId: TargetMallId,
  _outputFormat: "API_JSON" | "CSV_UPLOAD" = "API_JSON" // デフォルトをAPI_JSONに設定（未使用だがインターフェース保持のため残す）
): ConversionResult {
  const errors: string[] = [];
  let convertedData: Record<string, unknown> = {};

  // 1. 利益計算と価格決定
  const pricingResult = calculateTargetPrice(product, mallId);
  const grossProfitJPY = pricingResult.grossProfitJPY;

  if (grossProfitJPY === null || grossProfitJPY < 0) {
    errors.push(
      "利益計算の結果、目標利益を確保できませんでした。出品をスキップします。"
    );
    return { data: null, gross_profit_jpy: grossProfitJPY, errors };
  }

  // 2. モール固有のデータ変換 (全モールへの対応枠組み)
  switch (mallId) {
    case "SHOPEE_SG":
      // シンガポール向けデータ変換ロジック
      convertedData = {
        item_name: product.title_jp + " [SG]",
        price: pricingResult.localPrice,
        currency: "SGD",
        weight_kg: product.weight_g / 1000,
        shipping_fee_sgd: pricingResult.localShippingCost,
        category_id: 100001,
        delivery_options: { international_logistics: true },
      };
      break;

    case "MERCADO_LIBRE":
      // Mercado Libre向けデータ変換ロジック (USDベースの南米市場)
      convertedData = {
        title: product.title_jp,
        price: pricingResult.localPrice,
        currency: "USD",
        listing_type: "gold_special",
        country_code: "AR", // 例: アルゼンチン
        estimated_profit_usd: grossProfitJPY * EXCHANGE_RATES["USD"],
        condition: "new",
      };
      break;

    case "ALLEGRO":
      // Allegro (ポーランド) 向けデータ変換ロジック
      convertedData = {
        title: product.title_jp,
        price: pricingResult.localPrice,
        currency: "PLN",
        shipping_profile_id: "GLOBAL_1",
        vat_rate: 23, // ポーランドVAT (モック)
        market_segment: "standard",
      };
      break;

    case "COUPANG":
      // Coupang (韓国) 向けデータ変換ロジック
      convertedData = {
        seller_product_code: `SKU-${product.id}`,
        price: pricingResult.localPrice,
        currency: "KRW",
        delivery_method: "OverseasDirect",
        ship_from_country: "JP",
      };
      break;

    case "REVERB":
      // Reverb (音楽機器) 向けデータ変換ロジック
      convertedData = {
        title: product.title_jp,
        price: pricingResult.localPrice,
        currency: "USD",
        category_path: "Guitars/Acoustic", // 音楽機器カテゴリ (モック)
        shipping_details: {
          type: "international",
          cost: pricingResult.localShippingCost,
        },
      };
      break;

    case "OTTO":
      // OTTO (ドイツ) 向けデータ変換ロジック (EURベースの欧州市場)
      convertedData = {
        name: product.title_jp,
        price: pricingResult.localPrice,
        currency: "EUR",
        tax_rate: 19, // ドイツVAT (モック)
        delivery_time_days: 14,
      };
      break;

    case "TCGPLAYER":
      // TCGPlayer (TCG) 向けデータ変換ロジック
      convertedData = {
        name: product.title_jp,
        price: pricingResult.localPrice,
        currency: "USD",
        condition: "Near Mint", // 状態
        quantity: product.current_stock,
      };
      break;

    case "CHRONO24":
      // Chrono24 (時計) 向けデータ変換ロジック (EURベース)
      convertedData = {
        watch_title: product.title_jp,
        price: pricingResult.localPrice,
        currency: "EUR",
        reference_number: `REF-${product.id}`,
        box_and_papers: "yes",
      };
      break;

    case "NOON":
      // NOON (中東) 向けデータ変換ロジック (USDベース)
      convertedData = {
        product_name: product.title_jp,
        price: pricingResult.localPrice,
        currency: "USD",
        fulfillment_type: "CrossBorder",
        region: "KSA", // サウジアラビア (例)
      };
      break;

    case "FALABELLA":
      // Falabella (中南米) 向けデータ変換ロジック (USDベース)
      convertedData = {
        product_name: product.title_jp,
        price: pricingResult.localPrice,
        currency: "USD",
        seller_sku: `SKU-${product.id}`,
        warranty: "1 year",
      };
      break;

    case "ETSY":
      // Etsy (ハンドメイド) 向けデータ変換ロジック (USDベース)
      convertedData = {
        listing_title: product.title_jp,
        price: pricingResult.localPrice,
        currency: "USD",
        shipping_profile_id: "ETSY_GLOBAL",
        quantity: product.current_stock,
      };
      break;

    case "DISCOGS":
      // Discogs (音楽ソフト) 向けデータ変換ロジック (USDベース)
      convertedData = {
        title: product.title_jp,
        price: pricingResult.localPrice,
        currency: "USD",
        media_condition: "Near Mint",
        sleeve_condition: "VG+",
      };
      break;

    case "GRAILED":
      // Grailed (ファッション) 向けデータ変換ロジック (USDベース)
      convertedData = {
        title: product.title_jp,
        price: pricingResult.localPrice,
        currency: "USD",
        size: "One Size", // サイズ情報が必要
        category: "Outerwear",
      };
      break;

    case "CATAWIKI":
      // Catawiki (オークション) 向けデータ変換ロジック (EURベース)
      convertedData = {
        title: product.title_jp,
        starting_price: pricingResult.localPrice * 0.7, // 開始価格を販売価格の70%に設定
        reserve_price: pricingResult.localPrice, // 最低落札価格
        estimated_value: {
          min: pricingResult.localPrice * 0.8,
          max: pricingResult.localPrice * 1.2,
        },
        currency: "EUR",
        category: "collectables", // デフォルトカテゴリ
        auction_duration: 7, // 7日間
        shipping_method: "DDP",
        origin_country: "JP",
        authenticity: "uncertified",
        expertise: "requested",
      };
      break;

    case "BONANZA":
      // Bonanza 向けデータ変換ロジック (USDベース)
      convertedData = {
        title: product.title_jp,
        price: pricingResult.localPrice,
        currency: "USD",
        format: "fixedPrice",
        shipping_profile: "INTERNATIONAL_STANDARD",
        returns_accepted: true,
        return_period: 30,
        payment_methods: ["PayPal", "Credit Card"],
        quantity: product.current_stock,
      };
      break;

    case "FACEBOOK_MARKETPLACE":
      // Facebook Marketplace 向けデータ変換ロジック (USDベース)
      convertedData = {
        title: product.title_jp,
        price: pricingResult.localPrice,
        currency: "USD",
        category: "products",
        location: {
          city: "Tokyo",
          country: "JP",
        },
        shipping_options: {
          ships_from: "JP",
          shipping_method: "international",
          shipping_cost: pricingResult.localShippingCost,
        },
        availability: product.current_stock > 0 ? "in_stock" : "out_of_stock",
        inventory_sync: true,
      };
      break;

    case "EBAY_US":
      // eBay US 向けデータ変換ロジック (USDベース)
      convertedData = {
        title: product.title_jp,
        price: pricingResult.localPrice,
        currency: "USD",
        format: "fixedPrice",
        location: "JP",
        shipping_type: "calculated",
        returns_accepted: true,
        return_period: 30,
        quantity: product.current_stock,
      };
      break;

    case "AMAZON_JP":
    case "QOO10_JP":
    case "BUYMA":
    default:
      // 日本国内モールや、まだ詳細ロジックをモックしていないモールのFallback処理
      convertedData = {
        warning: `⚠️ ${mallId} の詳細なマッピングはクロード様によって実装される必要があります。`,
        sku_id: product.id,
        title_original: product.title_jp,
        price_local: pricingResult.localPrice,
        currency: getCurrencyByMallId(mallId),
        estimated_profit_jpy: grossProfitJPY,
      };
      errors.push(`[${mallId}] カテゴリマッピングと必須属性が未定義です。`);
      break;
  }

  // 3. 共通の検証
  if (!convertedData.price) {
    errors.push("販売価格のフィールドが正しく設定されていません。");
  }

  return {
    data: convertedData,
    gross_profit_jpy: grossProfitJPY,
    errors: errors,
  };
}
