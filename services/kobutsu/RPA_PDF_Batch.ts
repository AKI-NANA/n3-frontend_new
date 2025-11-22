// services/kobutsu/RPA_PDF_Batch.ts
// RPA夜間バッチサービス
// Puppeteer/Playwrightを使用して仕入先の取引証明書PDFを自動取得

import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

/**
 * PDF取得結果の型定義
 */
export interface PdfBatchResult {
  success: boolean;
  pdfPath?: string;
  error?: string;
  orderId: string;
  url: string;
}

/**
 * RPA PDF Batch クラス
 * 夜間バッチでフリマサイトの取引完了画面からPDFを自動取得
 */
export class RPAPDFBatch {
  private browser: Browser | null = null;
  private readonly pdfStoragePath: string;

  constructor(pdfStoragePath: string = './storage/kobutsu-pdfs') {
    this.pdfStoragePath = pdfStoragePath;
    this.ensureStorageDirectory();
  }

  /**
   * ストレージディレクトリの確認・作成
   */
  private ensureStorageDirectory() {
    if (!fs.existsSync(this.pdfStoragePath)) {
      fs.mkdirSync(this.pdfStoragePath, { recursive: true });
    }
  }

  /**
   * ブラウザの初期化
   */
  async initBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
  }

  /**
   * ブラウザのクローズ
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * 取引証明書PDFを取得
   */
  async fetchTransactionPDF(
    orderId: string,
    url: string,
    credentials?: { username: string; password: string }
  ): Promise<PdfBatchResult> {
    try {
      await this.initBrowser();

      if (!this.browser) {
        throw new Error('ブラウザの初期化に失敗しました');
      }

      const page = await this.browser.newPage();

      // URLの種類を判定して適切な処理を実行
      if (url.includes('yahoo.co.jp') || url.includes('auctions.yahoo.co.jp')) {
        return await this.handleYahooAuction(orderId, url, page, credentials);
      } else if (url.includes('amazon.co.jp') || url.includes('amazon.com')) {
        return await this.handleAmazon(orderId, url, page, credentials);
      } else if (url.includes('rakuten.co.jp')) {
        return await this.handleRakuten(orderId, url, page, credentials);
      } else if (url.includes('mercari.com')) {
        return await this.handleMercari(orderId, url, page, credentials);
      } else {
        return await this.handleGenericPage(orderId, url, page);
      }
    } catch (error: any) {
      console.error(`PDF取得エラー [${orderId}]:`, error);
      return {
        success: false,
        orderId,
        url,
        error: error.message || 'PDF取得に失敗しました',
      };
    }
  }

  /**
   * Yahoo!オークション専用処理
   */
  private async handleYahooAuction(
    orderId: string,
    url: string,
    page: Page,
    credentials?: { username: string; password: string }
  ): Promise<PdfBatchResult> {
    try {
      // ログインが必要な場合
      if (credentials) {
        await this.loginYahoo(page, credentials);
      }

      // 取引ページに移動
      await page.goto(url, { waitUntil: 'networkidle' });

      // 取引完了画面が表示されるまで待機
      await page.waitForSelector('.TransactionDetail', { timeout: 10000 });

      // PDFとして保存
      const pdfFileName = `yahoo_${orderId}_${Date.now()}.pdf`;
      const pdfPath = path.join(this.pdfStoragePath, pdfFileName);

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
      });

      await page.close();

      return {
        success: true,
        orderId,
        url,
        pdfPath,
      };
    } catch (error: any) {
      throw new Error(`Yahoo!オークション処理エラー: ${error.message}`);
    }
  }

  /**
   * Amazon専用処理
   */
  private async handleAmazon(
    orderId: string,
    url: string,
    page: Page,
    credentials?: { username: string; password: string }
  ): Promise<PdfBatchResult> {
    try {
      if (credentials) {
        await this.loginAmazon(page, credentials);
      }

      await page.goto(url, { waitUntil: 'networkidle' });

      // 注文履歴ページまたは領収書ページ
      await page.waitForSelector('.order-info', { timeout: 10000 });

      const pdfFileName = `amazon_${orderId}_${Date.now()}.pdf`;
      const pdfPath = path.join(this.pdfStoragePath, pdfFileName);

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
      });

      await page.close();

      return {
        success: true,
        orderId,
        url,
        pdfPath,
      };
    } catch (error: any) {
      throw new Error(`Amazon処理エラー: ${error.message}`);
    }
  }

  /**
   * 楽天市場専用処理
   */
  private async handleRakuten(
    orderId: string,
    url: string,
    page: Page,
    credentials?: { username: string; password: string }
  ): Promise<PdfBatchResult> {
    try {
      if (credentials) {
        await this.loginRakuten(page, credentials);
      }

      await page.goto(url, { waitUntil: 'networkidle' });

      const pdfFileName = `rakuten_${orderId}_${Date.now()}.pdf`;
      const pdfPath = path.join(this.pdfStoragePath, pdfFileName);

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
      });

      await page.close();

      return {
        success: true,
        orderId,
        url,
        pdfPath,
      };
    } catch (error: any) {
      throw new Error(`楽天市場処理エラー: ${error.message}`);
    }
  }

  /**
   * メルカリ専用処理
   */
  private async handleMercari(
    orderId: string,
    url: string,
    page: Page,
    credentials?: { username: string; password: string }
  ): Promise<PdfBatchResult> {
    try {
      if (credentials) {
        await this.loginMercari(page, credentials);
      }

      await page.goto(url, { waitUntil: 'networkidle' });

      const pdfFileName = `mercari_${orderId}_${Date.now()}.pdf`;
      const pdfPath = path.join(this.pdfStoragePath, pdfFileName);

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
      });

      await page.close();

      return {
        success: true,
        orderId,
        url,
        pdfPath,
      };
    } catch (error: any) {
      throw new Error(`メルカリ処理エラー: ${error.message}`);
    }
  }

  /**
   * 汎用ページ処理
   */
  private async handleGenericPage(
    orderId: string,
    url: string,
    page: Page
  ): Promise<PdfBatchResult> {
    try {
      await page.goto(url, { waitUntil: 'networkidle' });

      const pdfFileName = `generic_${orderId}_${Date.now()}.pdf`;
      const pdfPath = path.join(this.pdfStoragePath, pdfFileName);

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
      });

      await page.close();

      return {
        success: true,
        orderId,
        url,
        pdfPath,
      };
    } catch (error: any) {
      throw new Error(`汎用ページ処理エラー: ${error.message}`);
    }
  }

  /**
   * Yahoo!ログイン処理
   */
  private async loginYahoo(page: Page, credentials: { username: string; password: string }) {
    await page.goto('https://login.yahoo.co.jp/', { waitUntil: 'networkidle' });
    await page.fill('input[name="login"]', credentials.username);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    await page.fill('input[name="password"]', credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
  }

  /**
   * Amazonログイン処理
   */
  private async loginAmazon(page: Page, credentials: { username: string; password: string }) {
    await page.goto('https://www.amazon.co.jp/ap/signin', { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', credentials.username);
    await page.click('input[type="submit"]');
    await page.waitForNavigation();
    await page.fill('input[name="password"]', credentials.password);
    await page.click('input[type="submit"]');
    await page.waitForNavigation();
  }

  /**
   * 楽天ログイン処理
   */
  private async loginRakuten(page: Page, credentials: { username: string; password: string }) {
    await page.goto('https://grp02.id.rakuten.co.jp/rms/nid/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="u"]', credentials.username);
    await page.fill('input[name="p"]', credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
  }

  /**
   * メルカリログイン処理
   */
  private async loginMercari(page: Page, credentials: { username: string; password: string }) {
    await page.goto('https://jp.mercari.com/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', credentials.username);
    await page.fill('input[name="password"]', credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
  }
}

/**
 * シングルトンインスタンス
 */
let rpaBatchInstance: RPAPDFBatch | null = null;

export function getRPABatch(pdfStoragePath?: string): RPAPDFBatch {
  if (!rpaBatchInstance) {
    rpaBatchInstance = new RPAPDFBatch(pdfStoragePath);
  }
  return rpaBatchInstance;
}
