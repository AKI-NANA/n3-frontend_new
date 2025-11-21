// ============================================
// Phase 7: オークションアンカー管理サービス
// 機能7-1, 7-2対応
// ============================================

import {
  AuctionAnchor,
  AuctionBatchExecutionRequest,
  AuctionBatchExecutionResponse,
  AuctionExecutionResult,
} from './types';

/**
 * オークションアンカーの最低開始価格を計算
 * 「利益損失にならないスタート価格」を算出
 */
export function calculateMinStartPrice(
  costPriceJpy: number,
  shippingCostUsd: number,
  targetProfitMargin: number = 0.10, // デフォルト10%利益確保
  exchangeRate: number = 150 // JPY/USD
): number {
  // 仕入れ価格をUSDに変換
  const costPriceUsd = costPriceJpy / exchangeRate;

  // 最低価格 = 仕入れ価格 + 送料 + 目標利益
  const minStartPrice = costPriceUsd + shippingCostUsd + (costPriceUsd * targetProfitMargin);

  // 0.99で終わる価格に調整（心理的価格設定）
  return Math.ceil(minStartPrice) - 0.01;
}

/**
 * オークション終了後の自動措置を決定
 * 機能7-2: 入札なし（0ドル終了）の場合の処理
 */
export function determinePostAuctionAction(
  anchor: AuctionAnchor,
  finalBidCount: number,
  finalBidAmount?: number
): {
  action: 'relist_auction' | 'convert_to_fixed' | 'end_listing';
  reason: string;
  fixed_price_usd?: number;
} {
  // 入札なし（0ドル終了）の場合
  if (finalBidCount === 0) {
    if (anchor.auto_convert_to_fixed) {
      // 定額出品に自動切り替え
      const fixedPrice = anchor.fixed_price_usd || anchor.min_start_price_usd * 1.3;
      return {
        action: 'convert_to_fixed',
        reason: '入札なしで終了。自動的に定額出品に切り替えます（機能7-2）',
        fixed_price_usd: fixedPrice,
      };
    } else {
      // オークション再出品
      return {
        action: 'relist_auction',
        reason: '入札なしで終了。オークションを再出品します',
      };
    }
  }

  // 入札あり
  if (finalBidAmount && finalBidAmount >= anchor.min_start_price_usd) {
    return {
      action: 'end_listing',
      reason: '落札成功。リスティングを終了します',
    };
  }

  // 入札額が最低価格を下回る場合（通常発生しない）
  return {
    action: 'relist_auction',
    reason: '入札額が最低価格を下回ったため、再出品します',
  };
}

/**
 * 一点もの在庫監視
 * 機能7-3: 入札がない状態で在庫ロスが確認された場合の処理
 */
export function checkInventoryLossAction(
  anchor: AuctionAnchor,
  currentBidCount: number,
  inventoryLost: boolean
): {
  shouldEndAuction: boolean;
  shouldAlert: boolean;
  reason: string;
} {
  if (!inventoryLost) {
    return {
      shouldEndAuction: false,
      shouldAlert: false,
      reason: '在庫は正常です',
    };
  }

  // 入札がない状態で在庫ロス → 即時終了
  if (currentBidCount === 0) {
    return {
      shouldEndAuction: true,
      shouldAlert: true,
      reason: '在庫ロス検出。入札なしのため即時終了します（機能7-3）',
    };
  }

  // 入札後の在庫ロス → 人間にアラート
  return {
    shouldEndAuction: false,
    shouldAlert: true,
    reason: '⚠️ 在庫ロス検出。入札があるため人間の判断が必要です（機能7-3）',
  };
}

/**
 * オークション一括実行
 * BulkSourcingApproval_V1.jsxからの呼び出し用
 */
export async function executeBatchAuctions(
  request: AuctionBatchExecutionRequest,
  anchors: AuctionAnchor[]
): Promise<AuctionBatchExecutionResponse> {
  const results: AuctionExecutionResult[] = [];

  for (const anchorId of request.anchor_ids) {
    const anchor = anchors.find(a => a.id === anchorId);
    if (!anchor) {
      results.push({
        anchor_id: anchorId,
        success: false,
        error_message: 'アンカーが見つかりません',
        executed_at: new Date().toISOString(),
      });
      continue;
    }

    try {
      // 在庫チェック（モック実装）
      const inventoryCheck = await checkInventoryStatus(anchor.product_id);
      if (!inventoryCheck.available) {
        results.push({
          anchor_id: anchorId,
          success: false,
          error_message: '在庫なし。オークション開始を中止しました',
          executed_at: new Date().toISOString(),
        });
        continue;
      }

      // eBay APIへのオークション開始リクエスト（モック実装）
      const ebayResponse = await createEbayAuction(anchor);

      results.push({
        anchor_id: anchorId,
        success: true,
        ebay_auction_id: ebayResponse.auctionId,
        executed_at: new Date().toISOString(),
      });
    } catch (error: any) {
      results.push({
        anchor_id: anchorId,
        success: false,
        error_message: error.message || '不明なエラー',
        executed_at: new Date().toISOString(),
      });
    }
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    total_requested: request.anchor_ids.length,
    successful,
    failed,
    results,
  };
}

// モック関数: 在庫ステータス確認
async function checkInventoryStatus(productId: string): Promise<{ available: boolean; quantity: number }> {
  // 実際の実装では、仕入れ元サイトのスクレイピングやAPI連携を行う
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ available: true, quantity: 1 });
    }, 100);
  });
}

// モック関数: eBayオークション作成
async function createEbayAuction(anchor: AuctionAnchor): Promise<{ auctionId: string }> {
  // 実際の実装では、eBay APIを使用してオークションを作成
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ auctionId: `EBAY-${Date.now()}` });
    }, 200);
  });
}

/**
 * カテゴリー別の推奨開始価格を取得
 * 過去のオークション実績から最適な価格を算出
 */
export function getRecommendedStartPriceByCategory(
  category: string,
  costPriceUsd: number
): number {
  // カテゴリー別の利益率設定
  const categoryMargins: Record<string, number> = {
    'Video Games': 0.25,
    'Electronics': 0.15,
    'Collectibles': 0.40,
    'Cameras': 0.20,
    'Toys': 0.30,
  };

  const margin = categoryMargins[category] || 0.20; // デフォルト20%
  return costPriceUsd * (1 + margin);
}
