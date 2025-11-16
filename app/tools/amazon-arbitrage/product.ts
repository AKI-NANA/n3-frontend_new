// ファイル: /types/product.ts

import { Product as BaseProduct } from "./base_product"; // 既存のProduct型を拡張すると仮定

// AIによるリスク分析の結果型
export interface AiAssessment {
  potential: 'high' | 'low'; // 刈り取りポテンシャル
  reason: string;            // ポテンシャルの根拠
  risk: 'high' | 'low';      // リスク判定（需要減退/偽物など）
  risk_reason: string;       // リスクの根拠
}

// 刈り取り自動化ツールのための拡張型
export interface Product extends BaseProduct {
  // スコアリングと分析
  research_score: number | null; // 無在庫販売スコア
  arbitrage_score: number | null; // 刈り取り販売スコア (最終値。自動決済のトリガー)
  keepa_data: Record<string, any> | null; // Keepa履歴データ (波形分析用)
  market_text_data: string | null; // 市場調査で収集したテキストデータ
  ai_arbitrage_assessment: AiAssessment | null; // AIによるリスク/ポテンシャル判定
  is_discontinued_category: boolean; // 廃盤で価値上昇しやすいカテゴリーか否か

  // 刈り取り管理と自動化
  is_arbitrage_target: boolean; // 刈り取り対象として仕入れが承認されたか
  arbitrage_status: 'in_research' | 'tracked' | 'purchased' | 'awaiting_inspection' | 'ready_to_list' | 'listed'; // ステータス追跡
  amazon_order_id: string | null; // Amazonの注文ID
  purchase_account_id: string | null; // 使用した法人/個人購入アカウントID (リスク分散用)
  
  // 多販路利益最適化 (既存のcost_price, profit_amount等を使用)
  profit_ebay_usd: number | null;
  profit_amazon_jpy: number | null;
  profit_domestic_jpy: number | null;
}