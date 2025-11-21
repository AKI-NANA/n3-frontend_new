// services/SpecializedDataMapper.ts

/**
 * T30: 特化型データマッパー
 * マーケットプレイス別の専門属性マッピングロジック
 *
 * このモジュールは、共通のマスターデータから各マーケットプレイスが要求する
 * 専門的な属性を抽出し、適切なペイロード形式に変換します。
 */

import type { MarketplaceId } from "./ListingGroupManager";
import type { ApiPayload } from "./UniversalApiConnector";

// ============================================================================
// 型定義
// ============================================================================

/**
 * マスターデータ
 * 全マーケットプレイス共通の商品情報
 */
export interface MasterListingData {
  // 基本情報
  master_id: string;
  title: string;
  description: string;
  price_jpy: number;
  currency: string;
  quantity: number;
  images: string[];
  category: string;
  condition: string;
  sku: string;

  // HSコード・関税情報（フェーズ8要件）
  hs_code_final?: string;
  hs_code_confirmed: boolean;
  tariff_rate?: number;
  ddp_cost_calculated: boolean;

  // 専門属性 - ハイエンド・鑑定
  authentication_id?: string; // StockX/GOAT用: 鑑定書のユニークID
  authentication_provider?: string; // 鑑定機関名
  deadstock_status?: boolean; // StockX/GOAT用: デッドストック状態
  watch_condition?: string; // Chrono24用: 時計のコンディションコード
  certificate_type?: string; // Chrono24用: 国際保証書の有無
  movement_type?: string; // Chrono24用: ムーブメントタイプ（自動巻き等）
  case_material?: string; // Chrono24用: ケース素材

  // 専門属性 - ホビー・コレクティブル
  edition_type?: string; // Card Market用: エディション（初版/再販）
  foil_status?: boolean; // Card Market用: ホイル加工の有無
  card_condition_grade?: string; // TCG用: カードグレード（PSA 10等）
  card_language?: string; // Card Market用: カード言語
  tcg_game?: string; // TCG用: ゲーム名（MTG, Pokemon等）
  vinyl_pressing?: string; // Discogs用: レコードプレス情報
  vinyl_speed?: string; // Discogs用: 回転数（33rpm等）

  // 専門属性 - ファッション
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  season?: string;
  gender?: string;
  authenticity_guarantee?: boolean;

  // 専門属性 - 産業・専門機器
  model_number?: string;
  manufacturer?: string;
  year_of_manufacture?: number;
  calibration_date?: string;
  technical_specifications?: Record<string, unknown>;

  // メタデータ
  created_at?: string;
  updated_at?: string;
}

/**
 * マーケットプレイス別の特化型マッパー関数の型
 */
type SpecializedMapper = (
  masterData: MasterListingData
) => Partial<ApiPayload>;

// ============================================================================
// マーケットプレイス別の特化型マッパー
// ============================================================================

/**
 * StockX / GOAT 専用マッパー
 * 限定スニーカー・ストリートウェア向け
 */
const mapForStockXGoat: SpecializedMapper = (masterData) => {
  console.log(`  🔍 [Mapper] Applying StockX/GOAT specialized mapping...`);

  if (!masterData.authentication_id) {
    console.warn(
      `  ⚠️ [Mapper] authentication_id is missing. StockX/GOAT requires authentication.`
    );
  }

  return {
    // 専門属性
    authentication_id: masterData.authentication_id,
    authentication_provider: masterData.authentication_provider || "N3_SYSTEM",
    deadstock_status: masterData.deadstock_status ?? false,
    authenticity_guarantee: masterData.authenticity_guarantee ?? true,

    // 必須フィールド
    brand: masterData.brand || "Unknown",
    size: masterData.size || "N/A",
    color: masterData.color || "N/A",
    condition: masterData.deadstock_status ? "Brand New" : masterData.condition,
  };
};

/**
 * Chrono24 専用マッパー
 * 高級時計向け
 */
const mapForChrono24: SpecializedMapper = (masterData) => {
  console.log(`  🔍 [Mapper] Applying Chrono24 specialized mapping...`);

  if (!masterData.watch_condition) {
    console.warn(
      `  ⚠️ [Mapper] watch_condition is missing. Chrono24 requires condition code.`
    );
  }

  return {
    // 専門属性
    watch_condition: masterData.watch_condition || "2", // 2 = Very Good
    certificate_type: masterData.certificate_type || "manufacturer",
    movement_type: masterData.movement_type || "automatic",
    case_material: masterData.case_material || "stainless_steel",

    // 必須フィールド
    brand: masterData.brand || "Unknown",
    model_number: masterData.model_number || "N/A",
    year_of_manufacture: masterData.year_of_manufacture || new Date().getFullYear(),
  };
};

/**
 * Card Market 専用マッパー
 * トレーディングカード向け
 */
const mapForCardMarket: SpecializedMapper = (masterData) => {
  console.log(`  🔍 [Mapper] Applying Card Market specialized mapping...`);

  if (!masterData.edition_type) {
    console.warn(
      `  ⚠️ [Mapper] edition_type is missing. Card Market requires edition info.`
    );
  }

  return {
    // 専門属性
    edition_type: masterData.edition_type || "unlimited",
    foil_status: masterData.foil_status ?? false,
    card_condition_grade: masterData.card_condition_grade || "NM", // Near Mint
    card_language: masterData.card_language || "en",
    tcg_game: masterData.tcg_game || "Magic",

    // 必須フィールド
    condition: masterData.card_condition_grade || masterData.condition,
  };
};

/**
 * TCGplayer 専用マッパー
 * トレーディングカード向け（北米市場）
 */
const mapForTCGPlayer: SpecializedMapper = (masterData) => {
  console.log(`  🔍 [Mapper] Applying TCGplayer specialized mapping...`);

  return {
    // 専門属性
    tcg_game: masterData.tcg_game || "Magic",
    card_condition_grade: masterData.card_condition_grade || "Near Mint",
    foil_status: masterData.foil_status ?? false,
    edition_type: masterData.edition_type || "Normal",

    // 必須フィールド
    condition: masterData.card_condition_grade || "Near Mint",
  };
};

/**
 * The RealReal 専用マッパー
 * ラグジュアリー古着・ヴィンテージ向け
 */
const mapForTheRealReal: SpecializedMapper = (masterData) => {
  console.log(`  🔍 [Mapper] Applying The RealReal specialized mapping...`);

  return {
    // 専門属性
    brand: masterData.brand || "Unknown",
    authenticity_guarantee: masterData.authenticity_guarantee ?? true,
    authentication_id: masterData.authentication_id,
    authentication_provider: masterData.authentication_provider || "TRR_AUTHENTICATION",

    // ファッション属性
    size: masterData.size || "One Size",
    color: masterData.color || "N/A",
    material: masterData.material || "N/A",
    season: masterData.season || "N/A",
    gender: masterData.gender || "Unisex",

    // 必須フィールド
    condition: masterData.condition || "Gently Used",
  };
};

/**
 * Discogs 専用マッパー
 * レコード・音楽メディア向け
 */
const mapForDiscogs: SpecializedMapper = (masterData) => {
  console.log(`  🔍 [Mapper] Applying Discogs specialized mapping...`);

  return {
    // 専門属性
    vinyl_pressing: masterData.vinyl_pressing || "Original",
    vinyl_speed: masterData.vinyl_speed || "33rpm",

    // 必須フィールド
    condition: masterData.condition || "Very Good Plus (VG+)",
  };
};

/**
 * Reverb 専用マッパー
 * 楽器・音響機器向け
 */
const mapForReverb: SpecializedMapper = (masterData) => {
  console.log(`  🔍 [Mapper] Applying Reverb specialized mapping...`);

  return {
    // 専門属性
    brand: masterData.brand || "Unknown",
    model_number: masterData.model_number || "N/A",
    year_of_manufacture: masterData.year_of_manufacture,

    // 必須フィールド
    condition: masterData.condition || "Good",
  };
};

/**
 * eBay Business / 産業機器モール 専用マッパー
 * B2B・産業機器向け
 */
const mapForIndustrialEquipment: SpecializedMapper = (masterData) => {
  console.log(`  🔍 [Mapper] Applying Industrial Equipment specialized mapping...`);

  return {
    // 専門属性
    manufacturer: masterData.manufacturer || "Unknown",
    model_number: masterData.model_number || "N/A",
    year_of_manufacture: masterData.year_of_manufacture,
    calibration_date: masterData.calibration_date,
    technical_specifications: masterData.technical_specifications || {},

    // 必須フィールド
    condition: masterData.condition || "Used - Working",
  };
};

/**
 * 汎用マッパー（デフォルト）
 * 専門属性が不要なマーケットプレイス向け
 */
const mapForGeneric: SpecializedMapper = (masterData) => {
  console.log(`  🔍 [Mapper] Applying generic mapping...`);

  return {
    brand: masterData.brand,
    size: masterData.size,
    color: masterData.color,
    material: masterData.material,
    model_number: masterData.model_number,
  };
};

// ============================================================================
// マーケットプレイスIDとマッパーのマッピング
// ============================================================================

const MARKETPLACE_MAPPERS: Partial<Record<MarketplaceId, SpecializedMapper>> = {
  // ハイエンド・鑑定
  STOCKX: mapForStockXGoat,
  GOAT: mapForStockXGoat,
  CHRONO24: mapForChrono24,
  THE_REAL_REAL: mapForTheRealReal,
  VESTIAIRE_COLLECTIVE: mapForTheRealReal,
  "1STDIBS": mapForTheRealReal,

  // ホビー・コレクティブル
  CARD_MARKET: mapForCardMarket,
  TCGPLAYER: mapForTCGPlayer,
  DISCOGS: mapForDiscogs,
  REVERB: mapForReverb,

  // 産業・専門機器
  EBAY_BUSINESS: mapForIndustrialEquipment,
  EXAPRO: mapForIndustrialEquipment,
  MACHINIO: mapForIndustrialEquipment,
  DIGIKEY: mapForIndustrialEquipment,
  BH_PHOTO: mapForIndustrialEquipment,
};

// ============================================================================
// メイン関数
// ============================================================================

/**
 * マスターデータをマーケットプレイス別の特化型ペイロードに変換
 *
 * @param masterData - マスターデータ
 * @param marketplaceId - マーケットプレイスID
 * @returns マーケットプレイス向けの特化型ペイロード
 */
export function mapDataToSpecializedPayload(
  masterData: MasterListingData,
  marketplaceId: MarketplaceId
): ApiPayload {
  console.log(
    `\n🔧 [SpecializedDataMapper] Mapping data for ${marketplaceId}...`
  );

  // 基本ペイロード（全マーケットプレイス共通）
  const basePayload: ApiPayload = {
    title: masterData.title,
    description: masterData.description,
    price: masterData.price_jpy,
    currency: masterData.currency || "JPY",
    quantity: masterData.quantity,
    images: masterData.images,
    category: masterData.category,
    condition: masterData.condition,
    sku: masterData.sku,
  };

  // マーケットプレイス別の特化型マッパーを取得
  const specializedMapper =
    MARKETPLACE_MAPPERS[marketplaceId] || mapForGeneric;

  // 特化型属性を適用
  const specializedAttributes = specializedMapper(masterData);

  // ペイロードを結合
  const finalPayload: ApiPayload = {
    ...basePayload,
    ...specializedAttributes,

    // メタデータ
    master_id: masterData.master_id,
    hs_code: masterData.hs_code_final,
    marketplace_id: marketplaceId,
  };

  console.log(
    `✅ [SpecializedDataMapper] Payload prepared for ${marketplaceId}`
  );

  return finalPayload;
}

/**
 * HSコード確定チェック（フェーズ8要件）
 *
 * @param masterData - マスターデータ
 * @throws HSコードが確定していない場合
 */
export function validateHsCodeFinalized(
  masterData: MasterListingData
): void {
  if (!masterData.hs_code_confirmed || !masterData.hs_code_final) {
    throw new Error(
      `❌ [SpecializedDataMapper] Publication Blocked: HS Code not finalized for ${masterData.master_id}. ` +
      `Please complete HS code verification before publishing.`
    );
  }

  if (!masterData.ddp_cost_calculated) {
    console.warn(
      `⚠️ [SpecializedDataMapper] Warning: DDP cost not calculated for ${masterData.master_id}. ` +
      `Pricing may be inaccurate.`
    );
  }
}

/**
 * 必須属性の検証
 *
 * @param masterData - マスターデータ
 * @param marketplaceId - マーケットプレイスID
 * @returns 検証結果とエラーメッセージ
 */
export function validateRequiredAttributes(
  masterData: MasterListingData,
  marketplaceId: MarketplaceId
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 基本属性の検証
  if (!masterData.title || masterData.title.trim() === "") {
    errors.push("Title is required");
  }
  if (!masterData.description || masterData.description.trim() === "") {
    errors.push("Description is required");
  }
  if (!masterData.price_jpy || masterData.price_jpy <= 0) {
    errors.push("Valid price is required");
  }
  if (!masterData.images || masterData.images.length === 0) {
    errors.push("At least one image is required");
  }

  // マーケットプレイス別の必須属性検証
  switch (marketplaceId) {
    case "STOCKX":
    case "GOAT":
      if (!masterData.authentication_id) {
        errors.push("authentication_id is required for StockX/GOAT");
      }
      if (!masterData.brand) {
        errors.push("brand is required for StockX/GOAT");
      }
      break;

    case "CHRONO24":
      if (!masterData.watch_condition) {
        errors.push("watch_condition is required for Chrono24");
      }
      if (!masterData.brand) {
        errors.push("brand is required for Chrono24");
      }
      break;

    case "CARD_MARKET":
    case "TCGPLAYER":
      if (!masterData.tcg_game) {
        errors.push(`tcg_game is required for ${marketplaceId}`);
      }
      if (!masterData.card_condition_grade) {
        errors.push(`card_condition_grade is required for ${marketplaceId}`);
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
