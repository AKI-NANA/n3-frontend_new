/**
 * Keepa API Type Definitions
 *
 * Keepa APIレスポンスとスコアリングの型定義
 */

/**
 * Keepa商品データ
 */
export interface KeepaProduct {
  /** ASIN */
  asin: string

  /** ドメインID（1=US, 5=JP, etc） */
  domainId: number

  /** 商品タイトル */
  title?: string

  /** 画像URL */
  imagesCSV?: string

  /** カテゴリーツリー */
  categoryTree?: Array<{ catId: number; name: string }>

  /** ルートカテゴリー */
  rootCategory: number

  /** 製品コード（UPC, EAN, etc） */
  eanList?: string[]
  upcList?: string[]

  /** ブランド */
  brand?: string

  /** 製品グループ */
  productGroup?: string

  /** 製品タイプ */
  productType?: string

  /** モデル番号 */
  model?: string

  /** カラー */
  color?: string

  /** サイズ */
  size?: string

  /** 商品説明 */
  description?: string

  /** パッケージ寸法（mm） */
  packageWidth?: number
  packageHeight?: number
  packageLength?: number
  packageWeight?: number

  /** アイテム寸法（mm） */
  itemWidth?: number
  itemHeight?: number
  itemLength?: number
  itemWeight?: number

  /**
   * CSV形式の時系列データ
   * 配列のインデックス：
   * 0: Amazon価格
   * 1: Marketplace新品価格
   * 2: 中古価格
   * 3: Sales Rank (BSR)
   * 4: リストされた新品出品者数
   * 5: リストされた中古出品者数
   * 6: コレクター価格
   * 7: レビュー数
   * 8: レビュー評価
   * 9: New Buy Box Price
   * 10: Used Buy Box Price
   * ...
   *
   * 各配列は [timestamp, value, timestamp, value, ...] の形式
   * timestamp: Keepa Time Minutes (2011/01/01からの分数)
   * value: 価格は1/100単位、-1は在庫切れ
   */
  csv?: number[][]

  /**
   * 統計データ
   */
  stats?: {
    /** 現在の値 */
    current: number[]

    /** 平均値 */
    avg: number[]

    /** 最小値 */
    min: number[]

    /** 最大値 */
    max: number[]

    /** 90日間の平均 */
    avg90?: number[]

    /** 30日間の平均 */
    avg30?: number[]

    /** 価格下落回数（90日） */
    outOfStockPercentage90?: number

    /** 価格下落回数（30日） */
    outOfStockPercentage30?: number
  }

  /** オファー情報 */
  offers?: Array<{
    offerId: string
    lastSeen: number
    sellerId: string
    isPrime: boolean
    isFBA: boolean
    condition: number // 0=Used, 1=New, etc.
    price: number
    shipping: number
  }>

  /** FBA手数料 */
  fbaFees?: {
    storageFee: number
    pickAndPackFee: number
  }

  /** セールスランク履歴 */
  salesRanks?: Record<number, number[]> // categoryId -> [timestamp, rank, ...]

  /** Buy Boxの統計 */
  buyBoxStats?: {
    isFBA: boolean
    isAmazon: boolean
    price: number
  }

  /** ライバル分析 */
  variations?: string[] // バリエーションASINs

  /** レビュー数 */
  reviewsCount?: number

  /** レビュー評価 */
  rating?: number

  /** 最終更新日 */
  lastUpdate?: number

  /** トラッキング開始日 */
  trackingSince?: number

  /** ライトニングディール */
  isLightningDeal?: boolean

  /** プライム専用 */
  isPrimeExclusive?: boolean

  /** Amazonブランド */
  isAmazonBrand?: boolean

  /** 成人向け */
  isAdultProduct?: boolean

  /** ハザードマット */
  hazardousMaterialType?: string
}

/**
 * Keepa APIレスポンス
 */
export interface KeepaAPIResponse {
  /** トークン残高 */
  tokensLeft?: number

  /** トークン補充時間（分） */
  refillIn?: number

  /** トークン補充レート（トークン/分） */
  refillRate?: number

  /** タイムスタンプ */
  timestamp?: number

  /** 商品データ */
  products?: KeepaProduct[]

  /** エラーメッセージ */
  error?: string
}

/**
 * P-4スコア（市場枯渇戦略）
 */
export interface P4Score {
  /** 総合スコア（0-100） */
  totalScore: number

  /** 在庫切れ頻度スコア（0-40） */
  stockOutFrequency: number

  /** 価格上昇スコア（0-30） */
  priceIncrease: number

  /** BSRボラティリティスコア（0-20） */
  bsrVolatility: number

  /** 現在の機会スコア（0-10） */
  currentOpportunity: number

  /** 推奨レベル */
  recommendation: 'excellent' | 'good' | 'moderate' | 'none'
}

/**
 * P-1スコア（価格ミス戦略）
 */
export interface P1Score {
  /** 総合スコア（0-100） */
  totalScore: number

  /** 価格下落率スコア（0-50） */
  priceDropPercentage: number

  /** 価格下落速度スコア（0-20） */
  dropSpeed: number

  /** 歴史的安定性スコア（0-15） */
  historicalStability: number

  /** BSRクオリティスコア（0-15） */
  salesRankQuality: number

  /** 推奨レベル */
  recommendation: 'excellent' | 'good' | 'moderate' | 'none'
}

/**
 * 統合スコア
 */
export interface CombinedScore {
  /** P-4スコア */
  p4Score: P4Score

  /** P-1スコア */
  p1Score: P1Score

  /** 主要戦略 */
  primaryStrategy: 'P-4' | 'P-1'

  /** 主要スコア */
  primaryScore: number

  /** 購入推奨 */
  shouldPurchase: boolean

  /** 緊急度 */
  urgency: 'high' | 'medium' | 'low'
}

/**
 * Keepa時間形式をJavaScript Dateに変換
 * Keepa Time Minutes = 2011/01/01 00:00からの分数
 */
export function keepaTimeToDate(keepaMinutes: number): Date {
  const keepaEpoch = new Date('2011-01-01T00:00:00Z').getTime()
  return new Date(keepaEpoch + keepaMinutes * 60 * 1000)
}

/**
 * JavaScript DateをKeepa時間形式に変換
 */
export function dateToKeepaTime(date: Date): number {
  const keepaEpoch = new Date('2011-01-01T00:00:00Z').getTime()
  return Math.floor((date.getTime() - keepaEpoch) / (60 * 1000))
}

/**
 * Keepa価格を実際の価格に変換（1/100単位）
 */
export function keepaPriceToActual(keepaPrice: number): number {
  if (keepaPrice === -1) return 0 // 在庫切れ
  return keepaPrice / 100
}

/**
 * 実際の価格をKeepa価格に変換
 */
export function actualPriceToKeepa(price: number): number {
  return Math.round(price * 100)
}

/**
 * Keepa ドメインマッピング
 */
export const KEEPA_DOMAINS = {
  US: 1,
  GB: 6,
  DE: 3,
  FR: 4,
  JP: 5,
  CA: 7,
  IT: 8,
  ES: 9,
  IN: 10,
  MX: 11,
  BR: 12,
  AU: 13
} as const

export type KeepaDomain = typeof KEEPA_DOMAINS[keyof typeof KEEPA_DOMAINS]
