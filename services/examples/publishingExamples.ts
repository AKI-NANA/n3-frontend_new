// services/examples/publishingExamples.ts

/**
 * マルチマーケットプレイス出品システム
 * 実用的な使用例
 */

import { publishToGroup, publishToMultipleGroups, testPublishToGroup } from "../IntegratedPublisher";
import type { MasterListingData } from "../SpecializedDataMapper";
import type { GroupId } from "../ListingGroupManager";

// ============================================================================
// 例1: 高級時計をハイエンド・鑑定グループに出品
// ============================================================================

export async function example1_PublishLuxuryWatch() {
  console.log("\n=== Example 1: Publishing Luxury Watch ===\n");

  const rolexData: MasterListingData = {
    // 基本情報
    master_id: "WATCH_001",
    title: "Rolex Submariner 116610LN - Black Dial - Box & Papers",
    description: `
      Authentic Rolex Submariner 116610LN in excellent condition.

      Specifications:
      - Movement: Automatic
      - Case Material: Stainless Steel
      - Dial Color: Black
      - Water Resistance: 300m
      - Year: 2020
      - Condition: Excellent (minimal wear)
      - Includes: Box, Papers, Warranty Card
    `.trim(),
    price_jpy: 1200000,
    currency: "JPY",
    quantity: 1,
    images: [
      "https://example.com/rolex-front.jpg",
      "https://example.com/rolex-side.jpg",
      "https://example.com/rolex-clasp.jpg",
      "https://example.com/rolex-papers.jpg",
    ],
    category: "Watches > Luxury Watches > Rolex",
    condition: "Excellent",
    sku: "ROL-SUB-116610LN-001",

    // HSコード（必須 - フェーズ8要件）
    hs_code_final: "9101.21.00",
    hs_code_confirmed: true,
    tariff_rate: 0.045, // 4.5%
    ddp_cost_calculated: true,

    // 専門属性 - Chrono24用
    watch_condition: "1", // 1 = Unworn, 2 = Very Good, 3 = Good, 4 = Fair
    certificate_type: "manufacturer",
    movement_type: "automatic",
    case_material: "stainless_steel",
    brand: "Rolex",
    model_number: "116610LN",
    year_of_manufacture: 2020,
  };

  // ハイエンド・鑑定グループに出品
  // 対象: Chrono24, The RealReal, 1stDibs など
  const result = await publishToGroup(rolexData, "HIGH_END_LUXURY");

  console.log("\n--- Results ---");
  console.log(result.summary);
  console.log(`Success rate: ${(result.successCount / result.totalMarketplaces * 100).toFixed(2)}%`);

  return result;
}

// ============================================================================
// 例2: 限定スニーカーをStockX/GOATに出品
// ============================================================================

export async function example2_PublishLimitedSneakers() {
  console.log("\n=== Example 2: Publishing Limited Edition Sneakers ===\n");

  const sneakerData: MasterListingData = {
    // 基本情報
    master_id: "SNEAKER_001",
    title: "Nike Air Jordan 1 Retro High OG 'Chicago' 2015",
    description: `
      Deadstock Nike Air Jordan 1 Retro High OG in the iconic 'Chicago' colorway.

      Details:
      - Color: White/Varsity Red-Black
      - Style Code: 555088-101
      - Release Year: 2015
      - Condition: Brand New, Deadstock
      - Authentication: StockX Verified
      - Includes: Original Box, Extra Laces
    `.trim(),
    price_jpy: 350000,
    currency: "JPY",
    quantity: 1,
    images: [
      "https://example.com/aj1-chicago-front.jpg",
      "https://example.com/aj1-chicago-side.jpg",
      "https://example.com/aj1-chicago-sole.jpg",
      "https://example.com/aj1-chicago-box.jpg",
    ],
    category: "Shoes > Sneakers > Air Jordan",
    condition: "Brand New",
    sku: "NKE-AJ1-555088-101",

    // HSコード
    hs_code_final: "6403.99.00",
    hs_code_confirmed: true,
    tariff_rate: 0.12, // 12%
    ddp_cost_calculated: true,

    // 専門属性 - StockX/GOAT用（必須）
    authentication_id: "STOCKX_AUTH_12345678",
    authentication_provider: "StockX Authentication Center",
    deadstock_status: true,
    authenticity_guarantee: true,
    brand: "Nike",
    size: "US 10",
    color: "White/Varsity Red-Black",
    model_number: "555088-101",
  };

  // ハイエンド・鑑定グループに出品
  // StockX, GOATが含まれる
  const result = await publishToGroup(sneakerData, "HIGH_END_LUXURY", {
    maxConcurrency: 2, // StockX/GOATは並列実行を控えめに
  });

  console.log("\n--- Results ---");
  console.log(result.summary);

  return result;
}

// ============================================================================
// 例3: トレーディングカードをホビー・コレクティブルグループに出品
// ============================================================================

export async function example3_PublishTradingCard() {
  console.log("\n=== Example 3: Publishing Trading Card ===\n");

  const cardData: MasterListingData = {
    // 基本情報
    master_id: "CARD_001",
    title: "Pokemon Charizard Holo 1st Edition Base Set 4/102 PSA 9",
    description: `
      Iconic Pokemon Trading Card Game card - Charizard Holo from Base Set.

      Card Details:
      - Set: Base Set (1st Edition)
      - Card Number: 4/102
      - Rarity: Holo Rare
      - Grade: PSA 9 (Mint)
      - Language: English
      - Year: 1999

      This is one of the most sought-after Pokemon cards in existence.
      Professionally graded by PSA with a grade of 9 (Mint).
    `.trim(),
    price_jpy: 2500000,
    currency: "JPY",
    quantity: 1,
    images: [
      "https://example.com/charizard-front.jpg",
      "https://example.com/charizard-psa-case.jpg",
      "https://example.com/charizard-cert.jpg",
    ],
    category: "Trading Cards > Pokemon > Base Set",
    condition: "Mint",
    sku: "PKM-CHAR-BS-001",

    // HSコード
    hs_code_final: "4911.99.00",
    hs_code_confirmed: true,
    tariff_rate: 0.00, // 0%
    ddp_cost_calculated: true,

    // 専門属性 - TCG用
    tcg_game: "Pokemon",
    edition_type: "1st_edition",
    foil_status: true,
    card_condition_grade: "PSA 9",
    card_language: "en",
  };

  // ホビー・コレクティブルグループに出品
  // Card Market, TCGplayerなど
  const result = await publishToGroup(cardData, "HOBBY_COLLECTIBLES");

  console.log("\n--- Results ---");
  console.log(result.summary);

  return result;
}

// ============================================================================
// 例4: 汎用商品を複数グループに同時出品
// ============================================================================

export async function example4_PublishToMultipleGroups() {
  console.log("\n=== Example 4: Publishing to Multiple Groups ===\n");

  const electronicData: MasterListingData = {
    // 基本情報
    master_id: "ELEC_001",
    title: "Sony PlayStation 5 Console - Disc Edition",
    description: `
      Brand new Sony PlayStation 5 Console with Disc Drive.

      Specifications:
      - Model: CFI-1218A
      - Storage: 825GB SSD
      - Includes: Console, Controller, HDMI Cable, Power Cable, Base
      - Region: Japan
      - Warranty: 1 Year Manufacturer Warranty
    `.trim(),
    price_jpy: 65000,
    currency: "JPY",
    quantity: 10,
    images: [
      "https://example.com/ps5-console.jpg",
      "https://example.com/ps5-controller.jpg",
      "https://example.com/ps5-box.jpg",
    ],
    category: "Video Games > Consoles > PlayStation",
    condition: "Brand New",
    sku: "SNY-PS5-CFI1218A-001",

    // HSコード
    hs_code_final: "9504.50.00",
    hs_code_confirmed: true,
    tariff_rate: 0.00,
    ddp_cost_calculated: true,

    // 基本属性
    brand: "Sony",
    model_number: "CFI-1218A",
    manufacturer: "Sony Interactive Entertainment",
    year_of_manufacture: 2023,
  };

  // グローバル主力とアジア主要市場の両方に出品
  const results = await publishToMultipleGroups(
    electronicData,
    ["GLOBAL_MAJOR", "ASIA_MAJOR"],
    {
      maxConcurrency: 5,
    }
  );

  console.log("\n--- Overall Results ---");
  const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
  const totalMarketplaces = results.reduce((sum, r) => sum + r.totalMarketplaces, 0);
  console.log(`Total marketplaces: ${totalMarketplaces}`);
  console.log(`Total success: ${totalSuccess}`);
  console.log(`Success rate: ${(totalSuccess / totalMarketplaces * 100).toFixed(2)}%`);

  return results;
}

// ============================================================================
// 例5: ドライランでテスト
// ============================================================================

export async function example5_DryRunTest() {
  console.log("\n=== Example 5: Dry Run Test ===\n");

  const testData: MasterListingData = {
    master_id: "TEST_001",
    title: "Test Product",
    description: "This is a test product for dry run",
    price_jpy: 10000,
    currency: "JPY",
    quantity: 1,
    images: ["https://example.com/test.jpg"],
    category: "Test",
    condition: "New",
    sku: "TEST-001",

    // HSコード
    hs_code_final: "0000.00.00",
    hs_code_confirmed: true,
    ddp_cost_calculated: true,
  };

  // ドライランでテスト（実際のAPI呼び出しは行われない）
  const result = await testPublishToGroup(testData, "GLOBAL_MAJOR");

  console.log("\n--- Dry Run Results ---");
  console.log(result.summary);
  console.log("Note: No actual API calls were made");

  return result;
}

// ============================================================================
// 例6: エラーハンドリング
// ============================================================================

export async function example6_ErrorHandling() {
  console.log("\n=== Example 6: Error Handling ===\n");

  const incompleteData: MasterListingData = {
    master_id: "INCOMPLETE_001",
    title: "Incomplete Product Data",
    description: "This product has missing required attributes",
    price_jpy: 50000,
    currency: "JPY",
    quantity: 1,
    images: ["https://example.com/image.jpg"],
    category: "Watches",
    condition: "Good",
    sku: "INC-001",

    // HSコードが未確定（エラーになる）
    hs_code_confirmed: false, // ❌ これがfalseだとエラー
    ddp_cost_calculated: false,

    // 必須専門属性が不足（Chrono24用）
    // watch_condition が不足
  };

  try {
    const result = await publishToGroup(incompleteData, "HIGH_END_LUXURY");
    console.log(result.summary);
  } catch (error) {
    console.error("\n--- Error Caught ---");
    console.error(`Error: ${(error as Error).message}`);

    if ((error as Error).message.includes("HS Code not finalized")) {
      console.log("\n💡 Solution: Please finalize the HS Code before publishing");
    }
  }

  return null;
}

// ============================================================================
// 例7: カスタムオプションの使用
// ============================================================================

export async function example7_CustomOptions() {
  console.log("\n=== Example 7: Custom Options ===\n");

  const productData: MasterListingData = {
    master_id: "PROD_001",
    title: "Custom Options Example Product",
    description: "Demonstrating custom publication options",
    price_jpy: 30000,
    currency: "JPY",
    quantity: 5,
    images: ["https://example.com/product.jpg"],
    category: "Electronics",
    condition: "New",
    sku: "CUSTOM-001",

    // HSコード
    hs_code_final: "8517.62.00",
    hs_code_confirmed: true,
    ddp_cost_calculated: true,
  };

  const result = await publishToGroup(productData, "GLOBAL_MAJOR", {
    // 並列実行数を増やす
    maxConcurrency: 5,

    // エラーが発生しても続行
    stopOnError: false,

    // 特定のマーケットプレイスをスキップ
    skipMarketplaces: ["EBAY_UK", "AMAZON_DE"],

    // API呼び出しオプション
    apiOptions: {
      retryCount: 5,
      retryDelay: 2000,
      timeout: 45000,
    },
  });

  console.log("\n--- Results with Custom Options ---");
  console.log(result.summary);
  console.log(`Skipped marketplaces: ${result.skippedCount}`);

  return result;
}

// ============================================================================
// メイン実行関数（すべての例を実行）
// ============================================================================

export async function runAllExamples() {
  console.log("\n");
  console.log("=".repeat(80));
  console.log("マルチマーケットプレイス出品システム - 実用例集");
  console.log("=".repeat(80));

  try {
    // 例1: 高級時計
    await example1_PublishLuxuryWatch();
    await sleep(2000);

    // 例2: 限定スニーカー
    await example2_PublishLimitedSneakers();
    await sleep(2000);

    // 例3: トレーディングカード
    await example3_PublishTradingCard();
    await sleep(2000);

    // 例4: 複数グループ
    await example4_PublishToMultipleGroups();
    await sleep(2000);

    // 例5: ドライラン
    await example5_DryRunTest();
    await sleep(2000);

    // 例6: エラーハンドリング
    await example6_ErrorHandling();
    await sleep(2000);

    // 例7: カスタムオプション
    await example7_CustomOptions();

    console.log("\n");
    console.log("=".repeat(80));
    console.log("✅ All examples completed!");
    console.log("=".repeat(80));
    console.log("\n");
  } catch (error) {
    console.error("\n❌ Error running examples:", error);
  }
}

// ユーティリティ関数
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 個別の例を実行する場合はコメントを外してください
// runAllExamples();
