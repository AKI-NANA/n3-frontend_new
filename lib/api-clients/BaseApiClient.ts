/**
 * APIクライアント基盤クラス
 *
 * 各モールのAPIクライアントが継承する抽象クラス
 */

import type {
  ListingPayload,
  ExecutionResult,
  ErrorType,
} from '@/types/listing';

/**
 * APIレスポンス共通インターフェース
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    type: ErrorType;
  };
}

/**
 * 基盤APIクライアント抽象クラス
 */
export abstract class BaseApiClient {
  protected platformName: string;

  constructor(platformName: string) {
    this.platformName = platformName;
  }

  /**
   * 出品データの検証（事前チェック）
   * eBayのVerifyAddItemなど、実行前の検証APIを持つプラットフォーム用
   */
  abstract verifyListing(payload: ListingPayload): Promise<ApiResponse>;

  /**
   * 出品実行
   */
  abstract addListing(payload: ListingPayload): Promise<ApiResponse<string>>;

  /**
   * 出品更新
   */
  abstract updateListing(
    listingId: string,
    payload: Partial<ListingPayload>
  ): Promise<ApiResponse>;

  /**
   * 出品削除（取り下げ）
   */
  abstract deleteListing(listingId: string): Promise<ApiResponse>;

  /**
   * 在庫数更新
   */
  abstract updateQuantity(
    listingId: string,
    quantity: number
  ): Promise<ApiResponse>;

  /**
   * 価格更新
   */
  abstract updatePrice(
    listingId: string,
    price: number
  ): Promise<ApiResponse>;

  /**
   * エラー判定（一時的 or 致命的）
   */
  protected classifyError(errorCode: string, errorMessage: string): ErrorType {
    // 一時的エラーのパターン
    const temporaryPatterns = [
      'timeout',
      'rate limit',
      'service unavailable',
      '503',
      '429',
      'throttle',
      'try again',
    ];

    const lowerMessage = errorMessage.toLowerCase();
    const lowerCode = errorCode.toLowerCase();

    for (const pattern of temporaryPatterns) {
      if (lowerMessage.includes(pattern) || lowerCode.includes(pattern)) {
        return 'temporary';
      }
    }

    return 'fatal';
  }

  /**
   * 実行結果を構築
   */
  protected buildResult(
    sku: string,
    accountId: string,
    success: boolean,
    listingId?: string,
    error?: { code: string; message: string; type?: ErrorType }
  ): ExecutionResult {
    return {
      sku,
      platform: this.platformName as any,
      accountId,
      success,
      listingId,
      errorType: error?.type,
      errorCode: error?.code,
      errorMessage: error?.message,
      timestamp: new Date(),
    };
  }

  /**
   * HTTPリクエストのリトライロジック
   */
  protected async retryRequest<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.warn(
          `[${this.platformName}] リトライ ${attempt}/${maxRetries}:`,
          error
        );

        if (attempt < maxRetries) {
          // 指数バックオフ
          await new Promise((resolve) =>
            setTimeout(resolve, delayMs * Math.pow(2, attempt - 1))
          );
        }
      }
    }

    throw lastError;
  }

  /**
   * ログ出力ヘルパー
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.platformName}]`;

    switch (level) {
      case 'info':
        console.log(`${prefix} ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, data || '');
        break;
      case 'error':
        console.error(`${prefix} ${message}`, data || '');
        break;
    }
  }
}
