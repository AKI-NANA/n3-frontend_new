// ========================================
// supabase/functions/auto-orchestrator/index.ts
// Complete Automation Orchestrator
// ========================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import {
  AmazonPAAPI,
  CoupangWingAPI,
  ExchangeRateAPI,
  TranslationAPI,
  DHLShippingAPI,
  type AmazonAPIConfig,
  type CoupangAPIConfig
} from '../_shared/api-integrations.ts';
import {
  withRetry,
  withTimeout,
  executeBatch,
  getCircuitBreaker,
  getRateLimiter,
  ErrorLogger,
  MetricsCollector,
  safeHandler,
  ApplicationError,
  ErrorCode,
  BusinessLogicError
} from '../_shared/error-handling.ts';

// ========================================
// Configuration & Interfaces
// ========================================

interface AutomationConfig {
  minProfitMargin: number;
  maxCompetitorPriceDiff: number;
  autoListingEnabled: boolean;
  autoStockSyncEnabled: boolean;
  autoPricingEnabled: boolean;
  excludeCategories?: string[];
  maxDailyListings?: number;
  exchangeRateMargin?: number;
}

interface AutomationResult {
  userId: string;
  status: 'success' | 'partial' | 'error';
  newProductsListed: number;
  pricesUpdated: number;
  stockSynced: number;
  ordersProcessed: number;
  errors: string[];
  duration: number;
  metrics: any;
}

// ========================================
// API Clients Initialization
// ========================================

class APIClients {
  amazon: AmazonPAAPI;
  coupang: CoupangWingAPI;
  exchangeRate: ExchangeRateAPI;
  translation: TranslationAPI;
  shipping: DHLShippingAPI;

  constructor(userCredentials: any) {
    this.amazon = new AmazonPAAPI({
      accessKey: userCredentials.amazon_api_credentials?.accessKey || Deno.env.get('AMAZON_ACCESS_KEY')!,
      secretKey: userCredentials.amazon_api_credentials?.secretKey || Deno.env.get('AMAZON_SECRET_KEY')!,
      partnerTag: userCredentials.amazon_api_credentials?.partnerTag || Deno.env.get('AMAZON_PARTNER_TAG')!,
      region: userCredentials.amazon_api_credentials?.region || 'com'
    });

    this.coupang = new CoupangWingAPI({
      accessKey: userCredentials.coupang_api_credentials?.accessKey || Deno.env.get('COUPANG_ACCESS_KEY')!,
      secretKey: userCredentials.coupang_api_credentials?.secretKey || Deno.env.get('COUPANG_SECRET_KEY')!,
      vendorId: userCredentials.coupang_api_credentials?.vendorId || Deno.env.get('COUPANG_VENDOR_ID')!
    });

    this.exchangeRate = new ExchangeRateAPI(Deno.env.get('EXCHANGE_RATE_API_KEY'));
    this.translation = new TranslationAPI(Deno.env.get('GOOGLE_TRANSLATE_API_KEY')!);
    this.shipping = new DHLShippingAPI(
      Deno.env.get('DHL_API_KEY')!,
      Deno.env.get('DHL_API_SECRET')!
    );
  }
}

// ========================================
// Main Handler
// ========================================

serve(safeHandler(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const metrics = new MetricsCollector();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const errorLogger = new ErrorLogger(supabase);

  try {
    // Get all users with automation enabled
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auto_sync_enabled', true);

    if (usersError) throw usersError;

    metrics.record('users_to_process', users?.length || 0);

    const automationResults: AutomationResult[] = [];

    // Process users in batches with concurrency control
    const { results, successCount, failureCount } = await executeBatch(
      users || [],
      async (user) => {
        const userStartTime = Date.now();
        console.log(`🤖 Starting automation for user: ${user.id}`);

        const apiClients = new APIClients(user);
        const config: AutomationConfig = {
          minProfitMargin: user.default_profit_margin || 20,
          maxCompetitorPriceDiff: 10000,
          autoListingEnabled: true,
          autoStockSyncEnabled: true,
          autoPricingEnabled: true,
          maxDailyListings: 50,
          exchangeRateMargin: 0.02 // 2% margin for exchange rate fluctuation
        };

        const result = await runUserAutomation(
          supabase,
          apiClients,
          user.id,
          config,
          errorLogger,
          metrics
        );

        const duration = Date.now() - userStartTime;
        metrics.recordTiming('user_automation_duration', userStartTime, { userId: user.id });

        return {
          ...result,
          userId: user.id,
          duration
        };
      },
      {
        concurrency: 3,
        continueOnError: true,
        retryConfig: { maxAttempts: 2 }
      }
    );

    // Collect all results
    results.forEach(r => {
      if (r.success && r.data) {
        automationResults.push(r.data);
      }
    });

    // Flush metrics
    await metrics.flush();

    const totalDuration = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        processedUsers: users?.length || 0,
        successfulUsers: successCount,
        failedUsers: failureCount,
        results: automationResults,
        totalDuration,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    await errorLogger.log(error as Error, { function: 'auto-orchestrator' });
    throw error;
  }
}, new ErrorLogger(createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)))));

// ========================================
// User Automation Runner
// ========================================

async function runUserAutomation(
  supabase: any,
  apis: APIClients,
  userId: string,
  config: AutomationConfig,
  errorLogger: ErrorLogger,
  metrics: MetricsCollector
): Promise<AutomationResult> {
  const result: AutomationResult = {
    userId,
    status: 'success',
    newProductsListed: 0,
    pricesUpdated: 0,
    stockSynced: 0,
    ordersProcessed: 0,
    errors: [],
    duration: 0,
    metrics: {}
  };

  try {
    // 1. Auto-list new products
    if (config.autoListingEnabled) {
      const listingResult = await autoListNewProducts(
        supabase,
        apis,
        userId,
        config,
        metrics
      );
      result.newProductsListed = listingResult.count;
      result.errors.push(...listingResult.errors);
    }

    // 2. Auto-update prices
    if (config.autoPricingEnabled) {
      const pricingResult = await autoUpdatePrices(
        supabase,
        apis,
        userId,
        config,
        metrics
      );
      result.pricesUpdated = pricingResult.count;
      result.errors.push(...pricingResult.errors);
    }

    // 3. Auto-sync stock
    if (config.autoStockSyncEnabled) {
      const stockResult = await autoSyncStock(
        supabase,
        apis,
        userId,
        metrics
      );
      result.stockSynced = stockResult.count;
      result.errors.push(...stockResult.errors);
    }

    // 4. Auto-process new orders
    const orderResult = await autoProcessNewOrders(
      supabase,
      apis,
      userId,
      metrics
    );
    result.ordersProcessed = orderResult.count;
    result.errors.push(...orderResult.errors);

    // Determine overall status
    if (result.errors.length > 0) {
      result.status = result.errors.length > 10 ? 'error' : 'partial';
    }

  } catch (error) {
    result.status = 'error';
    result.errors.push(`Fatal error: ${(error as Error).message}`);
    await errorLogger.log(error as Error, { userId, function: 'runUserAutomation' });
  }

  return result;
}

// ========================================
// 1. Auto-List New Products
// ========================================

async function autoListNewProducts(
  supabase: any,
  apis: APIClients,
  userId: string,
  config: AutomationConfig,
  metrics: MetricsCollector
): Promise<{ count: number; errors: string[] }> {
  const result = { count: 0, errors: [] as string[] };
  const rateLimiter = getRateLimiter('coupang-listing', {
    maxRequests: 10,
    windowMs: 60000 // 10 requests per minute
  });

  try {
    // Get draft products ready for listing
    const { data: draftProducts, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .eq('coupang_listing_status', 'draft')
      .eq('is_active', true)
      .gte('profit_margin', config.minProfitMargin)
      .eq('amazon_stock_status', 'in_stock')
      .limit(config.maxDailyListings || 50);

    if (error) throw error;

    for (const product of draftProducts || []) {
      try {
        // Rate limiting
        if (!await rateLimiter.checkLimit(userId)) {
          result.errors.push('Rate limit reached for listings');
          break;
        }

        // Profitability check
        const currentRate = await apis.exchangeRate.getRate('USD', 'KRW');
        const isProfitable = await checkProfitability(
          product,
          config.minProfitMargin,
          currentRate
        );

        if (!isProfitable) {
          console.log(`⏭️  Product ${product.id}: Not profitable`);
          continue;
        }

        // Competitor price check
        const competitorCheck = await checkCompetitorPricing(
          apis.coupang,
          product,
          config.maxCompetitorPriceDiff
        );

        if (!competitorCheck.competitive) {
          // Adjust price to be competitive
          const adjustedPrice = await adjustPriceForCompetition(
            supabase,
            product,
            competitorCheck.suggestedPrice,
            config.minProfitMargin,
            currentRate
          );

          if (!adjustedPrice) {
            console.log(`⏭️  Product ${product.id}: Cannot be competitive`);
            continue;
          }

          product.selling_price_krw = adjustedPrice;
        }

        // Translate product name if needed
        let productNameKr = product.product_name_kr;
        if (!productNameKr) {
          productNameKr = await withRetry(
            () => apis.translation.translate(product.product_name, 'ko', 'en'),
            { maxAttempts: 3 },
            'translate-product-name'
          );
        }

        // Map to Coupang category
        const coupangCategoryId = await mapToCoupangCategory(
          supabase,
          product.amazon_category
        );

        // Generate product description
        const description = await generateProductDescription(
          product,
          apis.translation
        );

        // List on Coupang with circuit breaker
        const breaker = getCircuitBreaker('coupang-api');
        const listingResult = await breaker.execute(async () => {
          return await apis.coupang.createProduct({
            sellerProductId: product.id,
            displayCategoryCode: coupangCategoryId,
            sellerProductName: productNameKr,
            vendorId: apis.coupang['config'].vendorId,
            salePrice: product.selling_price_krw,
            outboundShippingTimeDay: 7,
            items: [{
              itemName: productNameKr,
              salePrice: product.selling_price_krw,
              maximumBuyCount: 10,
              maximumBuyForPerson: 5,
              outboundShippingTimeDay: 7,
              maximumBuyForPersonPeriod: 1,
              unitCount: 1
            }],
            images: (product.images || []).map((url: string, index: number) => ({
              imageOrder: index + 1,
              vendorPath: url
            })),
            detailContents: description
          });
        });

        if (listingResult.success) {
          // Update product status
          await supabase
            .from('products')
            .update({
              coupang_product_id: listingResult.productId,
              coupang_listing_status: 'listed',
              product_name_kr: productNameKr,
              coupang_category_id: coupangCategoryId,
              coupang_data: { listedAt: new Date().toISOString() }
            })
            .eq('id', product.id);

          result.count++;
          metrics.increment('products_listed', { userId });
          console.log(`✅ Listed product: ${product.product_name}`);

        } else {
          result.errors.push(`Failed to list ${product.product_name}: ${listingResult.error}`);
        }

        // API throttling
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        const errorMsg = `Product ${product.id}: ${(error as Error).message}`;
        result.errors.push(errorMsg);
        await new ErrorLogger(supabase).log(error as Error, {
          userId,
          productId: product.id,
          function: 'autoListNewProducts'
        });
      }
    }

  } catch (error) {
    result.errors.push(`Auto-listing failed: ${(error as Error).message}`);
  }

  return result;
}

// ========================================
// 2. Auto-Update Prices
// ========================================

async function autoUpdatePrices(
  supabase: any,
  apis: APIClients,
  userId: string,
  config: AutomationConfig,
  metrics: MetricsCollector
): Promise<{ count: number; errors: string[] }> {
  const result = { count: 0, errors: [] as string[] };

  try {
    // Get listed products with auto-sync enabled
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .eq('coupang_listing_status', 'listed')
      .eq('auto_sync', true);

    if (error) throw error;

    const currentRate = await withRetry(
      () => apis.exchangeRate.getRate('USD', 'KRW'),
      { maxAttempts: 3 },
      'get-exchange-rate'
    );

    // Store exchange rate
    await supabase
      .from('exchange_rates')
      .insert({
        base_currency: 'USD',
        target_currency: 'KRW',
        exchange_rate: currentRate,
        source: 'exchangerate-api'
      });

    for (const product of products || []) {
      try {
        // Check Amazon price with circuit breaker
        const breaker = getCircuitBreaker('amazon-api');
        const amazonData = await breaker.execute(async () => {
          return await withTimeout(
            () => apis.amazon.getProductData(product.amazon_asin),
            10000,
            'fetch-amazon-data'
          );
        });

        if (!amazonData || amazonData.price === product.amazon_price) {
          continue; // No price change
        }

        // Calculate new selling price
        const shippingCost = apis.shipping.calculateEstimatedCost(
          product.weight_kg || 1,
          product.dimensions || { length: 30, width: 20, height: 10 }
        );

        const { data: pricingData, error: pricingError } = await supabase.rpc(
          'calculate_selling_price',
          {
            amazon_price_usd: amazonData.price,
            exchange_rate: currentRate,
            profit_margin_percent: config.minProfitMargin,
            shipping_cost_usd: shippingCost
          }
        );

        if (pricingError) throw pricingError;

        // Check if still profitable
        if (pricingData.profit_margin_percent < config.minProfitMargin) {
          console.log(`⚠️  Product ${product.id}: New price not profitable`);
          continue;
        }

        let finalPrice = pricingData.final_price_krw;

        // Competitor price adjustment
        const competitorPrices = await apis.coupang.searchProducts(
          product.product_name_kr || product.product_name
        );

        if (competitorPrices.length > 0) {
          const prices = competitorPrices.map((p: any) => p.salePrice || 0).filter(p => p > 0);
          if (prices.length > 0) {
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            
            if (finalPrice > avgPrice + config.maxCompetitorPriceDiff) {
              finalPrice = Math.floor(avgPrice * 0.98);
              
              // Recalculate profit margin
              const actualProfit = finalPrice - pricingData.subtotal_krw - (finalPrice * 0.12);
              const actualMargin = (actualProfit / finalPrice) * 100;
              
              if (actualMargin < config.minProfitMargin) {
                console.log(`❌ Product ${product.id}: Adjusted price not profitable`);
                continue;
              }
            }
          }
        }

        // Update database
        await supabase
          .from('products')
          .update({
            amazon_price: amazonData.price,
            selling_price_krw: finalPrice,
            profit_margin: pricingData.profit_margin_percent,
            amazon_stock_status: amazonData.availability,
            amazon_data: amazonData
          })
          .eq('id', product.id);

        // Update Coupang price
        if (product.coupang_product_id) {
          await withRetry(
            () => apis.coupang.updateProductPrice(product.coupang_product_id, finalPrice),
            { maxAttempts: 3 },
            'update-coupang-price'
          );
        }

        result.count++;
        metrics.increment('prices_updated', { userId });
        console.log(`💰 Updated price for: ${product.product_name}`);

        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (error) {
        result.errors.push(`Price update failed for ${product.id}: ${(error as Error).message}`);
      }
    }

  } catch (error) {
    result.errors.push(`Auto-pricing failed: ${(error as Error).message}`);
  }

  return result;
}

// ========================================
// 3. Auto-Sync Stock
// ========================================

async function autoSyncStock(
  supabase: any,
  apis: APIClients,
  userId: string,
  metrics: MetricsCollector
): Promise<{ count: number; errors: string[] }> {
  const result = { count: 0, errors: [] as string[] };

  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .eq('coupang_listing_status', 'listed')
      .eq('auto_sync', true);

    if (error) throw error;

    for (const product of products || []) {
      try {
        const amazonData = await withRetry(
          () => apis.amazon.getProductData(product.amazon_asin),
          { maxAttempts: 3 },
          'fetch-amazon-stock'
        );

        if (!amazonData) continue;

        const oldStatus = product.amazon_stock_status;
        const newStatus = amazonData.availability;

        if (oldStatus !== newStatus) {
          if (newStatus === 'out_of_stock') {
            // Pause Coupang listing
            await apis.coupang.updateProductStatus(
              product.coupang_product_id,
              'SUSPENSION'
            );

            await supabase
              .from('products')
              .update({
                amazon_stock_status: newStatus,
                coupang_listing_status: 'paused',
                amazon_data: amazonData
              })
              .eq('id', product.id);

            console.log(`⏸️  Paused listing: ${product.product_name}`);

          } else if (newStatus === 'in_stock' && oldStatus === 'out_of_stock') {
            // Resume Coupang listing
            await apis.coupang.updateProductStatus(
              product.coupang_product_id,
              'APPROVAL'
            );

            await supabase
              .from('products')
              .update({
                amazon_stock_status: newStatus,
                coupang_listing_status: 'listed',
                amazon_data: amazonData
              })
              .eq('id', product.id);

            console.log(`▶️  Resumed listing: ${product.product_name}`);
          }

          result.count++;
          metrics.increment('stock_synced', { userId, status: newStatus });
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        result.errors.push(`Stock sync failed for ${product.id}: ${(error as Error).message}`);
      }
    }

  } catch (error) {
    result.errors.push(`Stock sync failed: ${(error as Error).message}`);
  }

  return result;
}

// ========================================
// 4. Auto-Process New Orders
// ========================================

async function autoProcessNewOrders(
  supabase: any,
  apis: APIClients,
  userId: string,
  metrics: MetricsCollector
): Promise<{ count: number; errors: string[] }> {
  const result = { count: 0, errors: [] as string[] };

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        products (*)
      `)
      .eq('user_id', userId)
      .eq('order_status', 'received');

    if (error) throw error;

    for (const order of orders || []) {
      try {
        // Check if auto-fulfillment is enabled
        if (order.products?.fulfillment_method !== 'auto') {
          continue;
        }

        // Verify Amazon stock
        const amazonData = await apis.amazon.getProductData(order.products.amazon_asin);
        
        if (!amazonData || amazonData.availability !== 'in_stock') {
          await handleOutOfStockOrder(supabase, order.id);
          continue;
        }

        // Calculate costs
        const shippingCost = apis.shipping.calculateEstimatedCost(
          order.products.weight_kg * order.quantity,
          order.products.dimensions
        );

        const exchangeRate = await apis.exchangeRate.getRate('USD', 'KRW');
        const costUSD = (amazonData.price * order.quantity) + shippingCost;
        const costKRW = costUSD * exchangeRate;
        const coupangFeeKRW = order.total_amount_krw * 0.12;
        const profitKRW = order.total_amount_krw - costKRW - coupangFeeKRW;

        // In real implementation, place Amazon order here
        // const amazonOrderResult = await placeAmazonOrder(...);
        
        // For now, simulate success
        const amazonOrderId = `AMZ-${Date.now()}`;

        await supabase
          .from('orders')
          .update({
            amazon_order_id: amazonOrderId,
            order_status: 'amazon_ordered',
            amazon_order_date: new Date().toISOString(),
            shipping_cost_usd: shippingCost,
            cost_usd: costUSD,
            shipping_cost_krw: costKRW,
            coupang_fee_krw: coupangFeeKRW,
            profit_krw: profitKRW
          })
          .eq('id', order.id);

        result.count++;
        metrics.increment('orders_processed', { userId });
        console.log(`📦 Auto-fulfilled order: ${order.coupang_order_id}`);

        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        result.errors.push(`Order processing failed for ${order.id}: ${(error as Error).message}`);
      }
    }

  } catch (error) {
    result.errors.push(`Order processing failed: ${(error as Error).message}`);
  }

  return result;
}

// ========================================
// Helper Functions
// ========================================

async function checkProfitability(
  product: any,
  minMargin: number,
  exchangeRate: number
): Promise<boolean> {
  const shippingCost = 30; // Simplified
  const baseCostKRW = (product.amazon_price + shippingCost) * exchangeRate;
  const coupangFeeKRW = product.selling_price_krw * 0.12;
  const profitKRW = product.selling_price_krw - baseCostKRW - coupangFeeKRW;
  const actualMargin = (profitKRW / product.selling_price_krw) * 100;
  
  return actualMargin >= minMargin;
}

async function checkCompetitorPricing(
  coupangAPI: CoupangWingAPI,
  product: any,
  maxDiff: number
): Promise<{ competitive: boolean; suggestedPrice?: number }> {
  try {
    const competitors = await coupangAPI.searchProducts(
      product.product_name_kr || product.product_name
    );

    if (competitors.length === 0) {
      return { competitive: true };
    }

    const prices = competitors
      .map((p: any) => p.salePrice)
      .filter((p: number) => p > 0);

    if (prices.length === 0) {
      return { competitive: true };
    }

    const minPrice = Math.min(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    if (product.selling_price_krw > minPrice + maxDiff) {
      return {
        competitive: false,
        suggestedPrice: Math.floor(avgPrice * 0.95)
      };
    }

    return { competitive: true };

  } catch (error) {
    console.error('Competitor check failed:', error);
    return { competitive: true }; // Assume competitive if check fails
  }
}

async function adjustPriceForCompetition(
  supabase: any,
  product: any,
  targetPrice: number,
  minMargin: number,
  exchangeRate: number
): Promise<number | null> {
  const shippingCost = 30;
  const baseCostKRW = (product.amazon_price + shippingCost) * exchangeRate;
  const coupangFeeKRW = targetPrice * 0.12;
  const profitKRW = targetPrice - baseCostKRW - coupangFeeKRW;
  const margin = (profitKRW / targetPrice) * 100;

  if (margin < minMargin) {
    return null;
  }

  return targetPrice;
}

async function mapToCoupangCategory(
  supabase: any,
  amazonCategory: string
): Promise<string> {
  const { data, error } = await supabase
    .from('coupang_categories')
    .select('id')
    .ilike('name_en', `%${amazonCategory}%`)
    .limit(1)
    .single();

  if (error || !data) {
    return '1001'; // Default: Electronics
  }

  return data.id;
}

async function generateProductDescription(
  product: any,
  translationAPI: TranslationAPI
): Promise<string> {
  const features = [
    `🏷️ 브랜드: ${product.brand || 'N/A'}`,
    `📦 무게: ${product.weight_kg || 'N/A'}kg`,
    '🚚 미국 직배송',
    '✅ 정품 보장',
    '🔄 교환/반품 가능',
    '📍 배송기간: 5-7일 (DHL Express)',
    '💳 관세 포함 가격',
    '📞 고객센터 지원'
  ];

  return [
    product.product_name_kr || product.product_name,
    '',
    '✨ 상품 특징:',
    ...features,
    '',
    '📝 주의사항:',
    '• 해외 직구 상품으로 배송 기간이 소요됩니다',
    '• 전자제품의 경우 한국 전압(220V) 확인이 필요합니다',
    '• A/S는 판매자를 통해 진행됩니다'
  ].join('\n');
}

async function handleOutOfStockOrder(supabase: any, orderId: string): Promise<void> {
  await supabase
    .from('orders')
    .update({
      order_status: 'cancelled',
      notes: 'Amazon 재고 부족으로 인한 자동 취소'
    })
    .eq('id', orderId);

  console.log(`❌ Order ${orderId} cancelled due to stock shortage`);
}
