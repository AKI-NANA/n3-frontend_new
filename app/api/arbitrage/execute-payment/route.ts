/**
 * Amazon自動決済API（実装版）
 *
 * Puppeteerを使用してAmazonへの自動ログイン、カート追加、決済を実行する。
 *
 * エンドポイント: POST /api/arbitrage/execute-payment
 *
 * セキュリティ対策:
 * - アカウント・IP分散（プロキシ使用）
 * - 決済情報はシステムに保存せず、Amazonアカウントの設定を利用
 * - Stealth Pluginでbot検出を回避
 * - アカウント停止リスクの最小化
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAvailableAccount, markAccountAsUsed, getProxyForAccount, getAccountCredentials } from '@/lib/arbitrage/account-manager';

interface PurchaseResult {
  success: boolean;
  order_id?: string;
  account_id?: string;
  quantity?: number;
  error?: string;
  final_price?: number;
}

/**
 * Amazon自動決済を実行（Puppeteer実装）
 */
async function executePuppeteerPurchase(
  asin: string,
  quantity: number,
  accountId: string,
  targetCountry: 'US' | 'JP' = 'US'
): Promise<PurchaseResult> {
  // Puppeteerが本番環境でインストールされていない場合はモック実行
  const USE_MOCK = process.env.PUPPETEER_SKIP_DOWNLOAD === 'true' || process.env.NODE_ENV === 'development';

  if (USE_MOCK) {
    console.log('🤖 [MOCK] Puppeteer自動決済を実行中...');
    console.log(`   ASIN: ${asin}`);
    console.log(`   数量: ${quantity}`);
    console.log(`   アカウント: ${accountId}`);
    console.log(`   対象国: ${targetCountry}`);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    return {
      success: true,
      order_id: `${targetCountry}-${Math.random().toString(36).substr(2, 12).toUpperCase()}`,
      account_id: accountId,
      quantity,
      final_price: targetCountry === 'US' ? 29.99 : 3299,
    };
  }

  try {
    // 動的インポート（Puppeteerがインストールされている場合のみ）
    const puppeteer = require('puppeteer-extra');
    const StealthPlugin = require('puppeteer-extra-plugin-stealth');
    puppeteer.use(StealthPlugin());

    // アカウント情報とプロキシ設定を取得
    const account = getAccountCredentials(accountId);
    const proxy = getProxyForAccount(accountId);

    if (!account) {
      throw new Error(`Account credentials not found for ${accountId}`);
    }

    // Amazon URLを国別に設定
    const amazonDomain = targetCountry === 'US' ? 'amazon.com' : 'amazon.co.jp';
    const baseUrl = `https://www.${amazonDomain}`;

    // ブラウザ起動オプション
    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ],
    };

    // プロキシ設定
    if (proxy) {
      launchOptions.args.push(`--proxy-server=${proxy.host}:${proxy.port}`);
    }

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // User Agentを設定
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // ビューポート設定
    await page.setViewport({ width: 1920, height: 1080 });

    // プロキシ認証
    if (proxy?.username && proxy?.password) {
      await page.authenticate({
        username: proxy.username,
        password: proxy.password,
      });
    }

    console.log(`🌐 Amazonにログイン中: ${baseUrl}`);

    // 1. Amazonにログイン
    await page.goto(`${baseUrl}/ap/signin`, { waitUntil: 'networkidle2', timeout: 30000 });

    // メールアドレス入力
    await page.waitForSelector('#ap_email', { timeout: 10000 });
    await page.type('#ap_email', account.email, { delay: 100 });
    await page.click('#continue');

    // パスワード入力
    await page.waitForSelector('#ap_password', { timeout: 10000 });
    await page.type('#ap_password', account.password, { delay: 100 });
    await page.click('#signInSubmit');

    // ログイン完了を待つ
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    console.log(`📦 商品ページに移動: ${asin}`);

    // 2. 商品ページに移動
    await page.goto(`${baseUrl}/dp/${asin}`, { waitUntil: 'networkidle2', timeout: 30000 });

    // 数量を設定（デフォルトは1）
    if (quantity > 1) {
      try {
        await page.select('#quantity', quantity.toString());
      } catch {
        console.warn('⚠️ 数量セレクタが見つかりません。デフォルト（1個）で続行します。');
      }
    }

    console.log(`🛒 カートに追加中...`);

    // 3. カートに追加
    const addToCartButton = await page.$('#add-to-cart-button');
    if (!addToCartButton) {
      throw new Error('カートに追加ボタンが見つかりません');
    }

    await addToCartButton.click();
    await page.waitForTimeout(2000);

    console.log(`💳 決済を開始...`);

    // 4. カートページへ移動
    await page.goto(`${baseUrl}/gp/cart/view.html`, { waitUntil: 'networkidle2', timeout: 30000 });

    // 5. 決済ページへ進む
    const checkoutButton = await page.$('input[name="proceedToRetailCheckout"]');
    if (!checkoutButton) {
      throw new Error('決済ボタンが見つかりません');
    }

    await checkoutButton.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    // 配送先確認（既に設定されている場合はスキップ）
    const continueButton = await page.$('#addressChangeLinkId, input[name="continue"]');
    if (continueButton) {
      await continueButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    }

    // 6. 注文を確定
    const placeOrderButton = await page.$('#placeYourOrder, input[name="placeYourOrder1"]');
    if (!placeOrderButton) {
      throw new Error('注文確定ボタンが見つかりません');
    }

    await placeOrderButton.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    console.log(`✅ 注文完了 - 注文IDを取得中...`);

    // 7. 注文IDと最終価格を取得
    let orderId: string | null = null;
    let finalPrice: number | null = null;

    try {
      // 注文IDを取得
      const orderIdElement = await page.$(
        '.order-confirmation-order-number, [data-test-id="order-confirmation-order-number"]'
      );
      if (orderIdElement) {
        const orderIdText = await page.evaluate((el) => el.textContent, orderIdElement);
        orderId = orderIdText?.trim().replace(/[^0-9-]/g, '') || null;
      }

      // 最終価格を取得
      const priceElement = await page.$('.grand-total-price, .order-summary-total');
      if (priceElement) {
        const priceText = await page.evaluate((el) => el.textContent, priceElement);
        finalPrice = parseFloat(priceText?.replace(/[^0-9.]/g, '') || '0');
      }
    } catch (error) {
      console.warn('⚠️ 注文情報の取得に失敗しましたが、注文は完了しています:', error);
    }

    await browser.close();

    return {
      success: true,
      order_id: orderId || `AUTO-${Date.now()}`,
      account_id: accountId,
      quantity,
      final_price: finalPrice || 0,
    };
  } catch (error) {
    console.error('❌ Puppeteer決済エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { asin, quantity = 1, trigger_source, target_country = 'US' } = await request.json();

    if (!asin) {
      return NextResponse.json(
        { success: false, error: 'ASIN is required' },
        { status: 400 }
      );
    }

    console.log(`🚀 自動決済開始: ASIN=${asin}, 数量=${quantity}, トリガー=${trigger_source}, 国=${target_country}`);

    // 1. 利用可能なアカウントを取得（分散ロジック）
    const account = await getAvailableAccount(target_country);

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'No available purchase accounts' },
        { status: 503 }
      );
    }

    console.log(`📋 使用アカウント: ${account.id}`);

    // 2. Puppeteerで自動決済を実行
    const result = await executePuppeteerPurchase(asin, quantity, account.id, target_country);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Purchase execution failed',
          details: result.error,
        },
        { status: 500 }
      );
    }

    // 3. アカウントを使用済みとしてマーク（分散ロジック）
    await markAccountAsUsed(account.id);

    console.log(`✅ 自動決済成功: 注文ID=${result.order_id}`);

    return NextResponse.json({
      success: true,
      message: 'Purchase executed successfully',
      order_id: result.order_id,
      account_id: account.id,
      quantity: result.quantity,
      final_price: result.final_price,
    });
  } catch (error) {
    console.error('❌ 自動決済APIエラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET: 自動決済設定の確認（テスト用）
 */
export async function GET(request: NextRequest) {
  const isMock = process.env.PUPPETEER_SKIP_DOWNLOAD === 'true' || process.env.NODE_ENV === 'development';

  return NextResponse.json({
    success: true,
    message: 'Auto-purchase API is active',
    endpoint: '/api/arbitrage/execute-payment',
    method: 'POST',
    implementation: isMock ? 'MOCK (Development)' : 'REAL (Puppeteer)',
    required_fields: {
      asin: 'string',
      quantity: 'number (optional, default: 1)',
      trigger_source: 'string (optional)',
      target_country: '"US" | "JP" (optional, default: "US")',
    },
  });
}
