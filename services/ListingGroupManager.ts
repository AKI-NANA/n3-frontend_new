// services/ListingGroupManager.ts

/**
 * T28: 戦略的グルーピング機能
 * マルチマーケットプレイス出品のための戦略的グルーピングロジック
 *
 * ユーザーは商品の特性に応じて適切なグループを選択することで、
 * 複数のマーケットプレイスに効率的に出品できます。
 */

// ============================================================================
// 型定義
// ============================================================================

/**
 * 戦略的グループID
 */
export type GroupId =
  | "GLOBAL_MAJOR"           // 🥇 グローバル主力
  | "HIGH_END_LUXURY"        // 💎 ハイエンド・鑑定
  | "HOBBY_COLLECTIBLES"     // 🃏 ホビー・コレクティブル
  | "ASIA_MAJOR"             // 🛍️ アジア主要市場
  | "INDUSTRIAL_EQUIPMENT"   // 🛠️ 産業・専門機器
  | "FASHION_VINTAGE";       // 👗 ファッション・古着

/**
 * マーケットプレイスID
 */
export type MarketplaceId =
  // グローバル主力
  | "EBAY_US" | "EBAY_UK" | "EBAY_DE" | "EBAY_AU"
  | "AMAZON_US" | "AMAZON_CA" | "AMAZON_UK" | "AMAZON_DE"
  | "WALMART_US"
  | "MERCARI_US"
  | "RAKUTEN_JP"
  | "YAHOO_SHOPPING_JP"

  // ハイエンド・鑑定
  | "CHRONO24"
  | "THE_REAL_REAL"
  | "STOCKX"
  | "GOAT"
  | "ARTSY"
  | "VESTIAIRE_COLLECTIVE"
  | "1STDIBS"

  // ホビー・コレクティブル
  | "CARD_MARKET"
  | "TCGPLAYER"
  | "DISCOGS"
  | "REVERB"

  // アジア主要市場
  | "SHOPEE_SG" | "SHOPEE_TH" | "SHOPEE_MY" | "SHOPEE_ID" | "SHOPEE_VN"
  | "QOO10_JP" | "QOO10_SG"
  | "COUPANG_KR"
  | "LAZADA_SG" | "LAZADA_MY" | "LAZADA_TH" | "LAZADA_ID"
  | "TOKOPEDIA_ID"
  | "INTERPARK_KR"

  // 産業・専門機器
  | "EBAY_BUSINESS"
  | "EXAPRO"
  | "MACHINIO"
  | "DIGIKEY"
  | "BH_PHOTO"

  // ファッション・古着
  | "BUYMA"
  | "DEPOP"
  | "POSHMARK"
  | "VINTED"
  | "GRAILED"
  | "ZALANDO"
  | "ASOS";

/**
 * グループ定義
 */
export interface GroupDefinition {
  id: GroupId;
  name: string;
  description: string;
  icon: string;
  marketplaces: MarketplaceId[];
  targetProducts: string[];
}

// ============================================================================
// グループ定義データ
// ============================================================================

/**
 * すべての戦略的グループの定義
 */
export const GROUP_DEFINITIONS: Record<GroupId, GroupDefinition> = {
  GLOBAL_MAJOR: {
    id: "GLOBAL_MAJOR",
    name: "グローバル主力",
    description: "汎用性の高い商品の、最大ボリュームを狙う出品",
    icon: "🥇",
    marketplaces: [
      "EBAY_US",
      "EBAY_UK",
      "EBAY_DE",
      "EBAY_AU",
      "AMAZON_US",
      "AMAZON_CA",
      "AMAZON_UK",
      "AMAZON_DE",
      "WALMART_US",
      "MERCARI_US",
      "RAKUTEN_JP",
      "YAHOO_SHOPPING_JP",
    ],
    targetProducts: [
      "家電製品",
      "日用品",
      "一般書籍",
      "玩具・ゲーム",
      "スポーツ用品",
    ],
  },

  HIGH_END_LUXURY: {
    id: "HIGH_END_LUXURY",
    name: "ハイエンド・鑑定",
    description: "高額品、真贋鑑定が求められる商品の、高利益販売",
    icon: "💎",
    marketplaces: [
      "CHRONO24",
      "THE_REAL_REAL",
      "STOCKX",
      "GOAT",
      "ARTSY",
      "VESTIAIRE_COLLECTIVE",
      "1STDIBS",
    ],
    targetProducts: [
      "高級時計",
      "ブランドバッグ",
      "限定スニーカー",
      "美術品・アート",
      "宝飾品",
      "ヴィンテージ高級品",
    ],
  },

  HOBBY_COLLECTIBLES: {
    id: "HOBBY_COLLECTIBLES",
    name: "ホビー・コレクティブル",
    description: "特定の趣味・ジャンルに熱狂的なファンを持つ顧客へのリーチ",
    icon: "🃏",
    marketplaces: [
      "CARD_MARKET",
      "TCGPLAYER",
      "DISCOGS",
      "REVERB",
    ],
    targetProducts: [
      "トレーディングカード",
      "TCG（ポケモン、MTG等）",
      "レコード・CD",
      "楽器・音響機器",
      "フィギュア・模型",
    ],
  },

  ASIA_MAJOR: {
    id: "ASIA_MAJOR",
    name: "アジア主要市場",
    description: "東アジア・東南アジアの成長市場への戦略的出品",
    icon: "🛍️",
    marketplaces: [
      "SHOPEE_SG",
      "SHOPEE_TH",
      "SHOPEE_MY",
      "SHOPEE_ID",
      "SHOPEE_VN",
      "QOO10_JP",
      "QOO10_SG",
      "COUPANG_KR",
      "LAZADA_SG",
      "LAZADA_MY",
      "LAZADA_TH",
      "LAZADA_ID",
      "TOKOPEDIA_ID",
      "INTERPARK_KR",
    ],
    targetProducts: [
      "K-Beauty",
      "日本製品",
      "アジア向けファッション",
      "電化製品",
      "コスメ・美容",
    ],
  },

  INDUSTRIAL_EQUIPMENT: {
    id: "INDUSTRIAL_EQUIPMENT",
    name: "産業・専門機器",
    description: "B2Bやニッチな専門部品の、高単価な取引",
    icon: "🛠️",
    marketplaces: [
      "EBAY_BUSINESS",
      "EXAPRO",
      "MACHINIO",
      "DIGIKEY",
      "BH_PHOTO",
    ],
    targetProducts: [
      "産業用機械",
      "電子部品",
      "測定器",
      "業務用カメラ・機材",
      "工具・設備",
    ],
  },

  FASHION_VINTAGE: {
    id: "FASHION_VINTAGE",
    name: "ファッション・古着",
    description: "ユーズド・ストリート系ファッションの顧客基盤を狙う出品",
    icon: "👗",
    marketplaces: [
      "BUYMA",
      "DEPOP",
      "POSHMARK",
      "VINTED",
      "GRAILED",
      "ZALANDO",
      "ASOS",
    ],
    targetProducts: [
      "古着",
      "ストリートファッション",
      "ヴィンテージ衣料",
      "ブランド古着",
      "アクセサリー",
    ],
  },
};

// ============================================================================
// グループ管理関数
// ============================================================================

/**
 * グループIDから対象マーケットプレイスIDの配列を取得
 *
 * @param groupId - グループID
 * @returns マーケットプレイスIDの配列
 * @throws グループIDが無効な場合
 */
export function getMarketplacesByGroup(groupId: GroupId): MarketplaceId[] {
  const group = GROUP_DEFINITIONS[groupId];

  if (!group) {
    throw new Error(
      `❌ Invalid group ID: ${groupId}. ` +
      `Available groups: ${Object.keys(GROUP_DEFINITIONS).join(", ")}`
    );
  }

  console.log(
    `✅ [ListingGroupManager] Group "${group.icon} ${group.name}" selected. ` +
    `Target marketplaces: ${group.marketplaces.length} platforms.`
  );

  return group.marketplaces;
}

/**
 * すべてのグループ定義を取得
 *
 * @returns グループ定義の配列
 */
export function getAllGroups(): GroupDefinition[] {
  return Object.values(GROUP_DEFINITIONS);
}

/**
 * グループIDからグループ定義を取得
 *
 * @param groupId - グループID
 * @returns グループ定義
 */
export function getGroupDefinition(groupId: GroupId): GroupDefinition {
  const group = GROUP_DEFINITIONS[groupId];

  if (!group) {
    throw new Error(`❌ Invalid group ID: ${groupId}`);
  }

  return group;
}

/**
 * マーケットプレイスIDが特定のグループに含まれているか確認
 *
 * @param marketplaceId - マーケットプレイスID
 * @param groupId - グループID
 * @returns 含まれている場合はtrue
 */
export function isMarketplaceInGroup(
  marketplaceId: MarketplaceId,
  groupId: GroupId
): boolean {
  const group = GROUP_DEFINITIONS[groupId];
  return group ? group.marketplaces.includes(marketplaceId) : false;
}

/**
 * マーケットプレイスIDが属するすべてのグループを取得
 *
 * @param marketplaceId - マーケットプレイスID
 * @returns グループIDの配列
 */
export function getGroupsByMarketplace(
  marketplaceId: MarketplaceId
): GroupId[] {
  return Object.entries(GROUP_DEFINITIONS)
    .filter(([_, group]) => group.marketplaces.includes(marketplaceId))
    .map(([groupId, _]) => groupId as GroupId);
}

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * グループ情報をコンソールに出力（デバッグ用）
 *
 * @param groupId - グループID（省略時は全グループ）
 */
export function printGroupInfo(groupId?: GroupId): void {
  if (groupId) {
    const group = GROUP_DEFINITIONS[groupId];
    console.log(`\n${group.icon} ${group.name}`);
    console.log(`説明: ${group.description}`);
    console.log(`対象商品: ${group.targetProducts.join(", ")}`);
    console.log(`マーケットプレイス数: ${group.marketplaces.length}`);
    console.log(`マーケットプレイス: ${group.marketplaces.join(", ")}`);
  } else {
    console.log("\n=== 全戦略的グループ ===");
    Object.values(GROUP_DEFINITIONS).forEach((group) => {
      console.log(
        `\n${group.icon} ${group.name} (${group.marketplaces.length}モール)`
      );
      console.log(`  ${group.description}`);
    });
  }
}
