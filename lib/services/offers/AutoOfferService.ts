/**
 * AutoOfferService
 *
 * Purpose: Automate eBay Best Offer negotiations while preventing losses
 * by calculating optimal offer prices based on cost, fees, and minimum margins.
 *
 * This service integrates with:
 * - eBay Trading API (for sending offers)
 * - products_master table (for profit margin settings)
 * - Price calculation services (for fee estimation)
 *
 * Key features:
 * - Loss prevention through min_profit_margin_jpy enforcement
 * - Configurable discount limits per product
 * - Automatic offer price optimization
 */

import { supabase } from '@/lib/supabase';

/**
 * Interface for product offer settings
 */
export interface ProductOfferSettings {
  sku: string;
  autoOfferEnabled: boolean;
  minProfitMarginJpy: number;
  maxDiscountRate: number;
  purchasePriceJpy: number;
  currentListingPriceUsd: number;
}

/**
 * Interface for offer calculation result
 */
export interface OfferCalculation {
  offerPrice: number | null;
  isProfitable: boolean;
  breakEvenPrice: number;
  minimumOfferPrice: number;
  calculationDetails: {
    purchasePrice: number;
    fixedCosts: number;
    ebayFees: number;
    paypalFees: number;
    shippingCost: number;
    minProfitMargin: number;
    discountFromListing: number;
    maxAllowedDiscount: number;
  };
}

/**
 * Interface for offer send result
 */
export interface OfferSendResult {
  success: boolean;
  offerId?: string;
  offerPrice?: number;
  buyerId?: string;
  errorMessage?: string;
  timestamp: Date;
}

/**
 * Interface for interested buyer event
 */
export interface InterestedBuyerEvent {
  itemId: string;
  buyerId: string;
  eventType: 'watchlist' | 'cart' | 'offer_request';
  timestamp: Date;
}

/**
 * AutoOfferService Class
 *
 * Manages automated offer calculation and sending to prevent losses
 * while maximizing sales conversion through strategic pricing.
 */
export class AutoOfferService {
  private readonly DEFAULT_EBAY_FEE_RATE = 0.1319; // 13.19% (eBay final value fee + international fee)
  private readonly DEFAULT_PAYPAL_FEE_RATE = 0.044; // 4.4%
  private readonly DEFAULT_PAYPAL_FIXED_FEE = 0.30; // $0.30 USD
  private readonly JPY_TO_USD_RATE = 0.0067; // Approximate exchange rate (should be fetched from API)

  constructor() {
    // Initialize service
    // Exchange rates should be fetched from external API in production
  }

  /**
   * Check if auto-offer is enabled for a product
   *
   * @param productId - Product ID in products_master
   * @returns Promise resolving to offer settings
   *
   * Implementation notes:
   * - Query products_master for auto_offer_enabled, min_profit_margin_jpy, max_discount_rate
   * - Return null if product not found or auto-offer disabled
   */
  async getProductOfferSettings(
    productId: string
  ): Promise<ProductOfferSettings | null> {
    try {
      const { data, error } = await supabase
        .from('products_master')
        .select('sku, auto_offer_enabled, min_profit_margin_jpy, max_discount_rate, purchase_price_jpy, price_jpy, ddp_price_usd')
        .eq('id', productId)
        .single();

      if (error) {
        console.error('Error fetching product offer settings:', error);
        return null;
      }

      if (!data) {
        console.warn(`Product not found: ${productId}`);
        return null;
      }

      // Auto-offer disabled
      if (!data.auto_offer_enabled) {
        return null;
      }

      // Map database fields to interface
      return {
        sku: data.sku,
        autoOfferEnabled: data.auto_offer_enabled,
        minProfitMarginJpy: data.min_profit_margin_jpy || 0,
        maxDiscountRate: data.max_discount_rate || 0,
        purchasePriceJpy: data.purchase_price_jpy || 0,
        currentListingPriceUsd: data.ddp_price_usd || data.price_jpy * this.JPY_TO_USD_RATE || 0,
      };
    } catch (error) {
      console.error('Unexpected error in getProductOfferSettings:', error);
      return null;
    }
  }

  /**
   * Calculate optimal offer price with loss prevention
   *
   * @param productId - Product ID in products_master
   * @param requestedOfferPrice - Optional: buyer's requested price (if applicable)
   * @returns Promise resolving to offer calculation result
   *
   * Implementation notes:
   * - Fetch product settings
   * - Calculate break-even price: purchase_price + fixed_costs + fees + min_profit_margin
   * - Calculate max discount price: listing_price × (1 - max_discount_rate)
   * - Final offer price = MAX(break_even, max_discount_price)
   * - Ensure offer_price >= break_even to prevent losses
   */
  async calculateOptimalOffer(
    productId: string,
    requestedOfferPrice?: number
  ): Promise<OfferCalculation> {
    // 1. Get product settings
    const settings = await this.getProductOfferSettings(productId);

    if (!settings) {
      // Auto-offer not enabled or product not found
      return {
        offerPrice: null,
        isProfitable: false,
        breakEvenPrice: 0,
        minimumOfferPrice: 0,
        calculationDetails: {
          purchasePrice: 0,
          fixedCosts: 0,
          ebayFees: 0,
          paypalFees: 0,
          shippingCost: 0,
          minProfitMargin: 0,
          discountFromListing: 0,
          maxAllowedDiscount: 0,
        },
      };
    }

    const purchasePriceUsd = this.convertJpyToUsd(settings.purchasePriceJpy);
    const minProfitMarginUsd = this.convertJpyToUsd(settings.minProfitMarginJpy);
    const listingPrice = settings.currentListingPriceUsd;

    // 2. Calculate fees (eBay + PayPal)
    // Use listing price as base for fee calculation
    const ebayFees = this.calculateFees(listingPrice);

    // 3. Calculate break-even point
    // Break-even = Purchase Price + Fees + Min Profit Margin
    // Note: Fees are recalculated based on actual sale price later
    const fixedCosts = 0; // Can be extended with shipping, handling, etc.
    const shippingCost = 0; // Assuming DDP (shipping included in price)

    const breakEvenPrice = purchasePriceUsd + fixedCosts + shippingCost + minProfitMarginUsd;

    // 4. Apply discount constraints
    // Maximum discount allowed from listing price
    const maxAllowedDiscount = listingPrice * settings.maxDiscountRate;
    const minPriceFromDiscount = listingPrice - maxAllowedDiscount;

    // The minimum offer price is the HIGHER of:
    // - Break-even price (to prevent losses)
    // - Min price from discount constraint
    const minimumOfferPrice = Math.max(breakEvenPrice, minPriceFromDiscount);

    // 5. Calculate final offer price
    // Add small buffer above minimum (e.g., +$1) to ensure profitability
    const bufferAmount = 1.0;
    let finalOfferPrice = minimumOfferPrice + bufferAmount;

    // If buyer requested a specific price, check if it's acceptable
    if (requestedOfferPrice !== undefined) {
      if (requestedOfferPrice >= minimumOfferPrice) {
        finalOfferPrice = requestedOfferPrice;
      } else {
        // Buyer's offer is too low, propose our minimum instead
        finalOfferPrice = minimumOfferPrice;
      }
    }

    // Recalculate fees based on final offer price
    const actualEbayFees = this.calculateFees(finalOfferPrice);
    const actualProfit = finalOfferPrice - purchasePriceUsd - actualEbayFees - fixedCosts - shippingCost;
    const isProfitable = actualProfit >= minProfitMarginUsd;

    return {
      offerPrice: Math.round(finalOfferPrice * 100) / 100, // Round to 2 decimal places
      isProfitable,
      breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
      minimumOfferPrice: Math.round(minimumOfferPrice * 100) / 100,
      calculationDetails: {
        purchasePrice: purchasePriceUsd,
        fixedCosts,
        ebayFees: actualEbayFees,
        paypalFees: finalOfferPrice * this.DEFAULT_PAYPAL_FEE_RATE + this.DEFAULT_PAYPAL_FIXED_FEE,
        shippingCost,
        minProfitMargin: minProfitMarginUsd,
        discountFromListing: listingPrice - finalOfferPrice,
        maxAllowedDiscount,
      },
    };
  }

  /**
   * Calculate eBay and payment processing fees
   *
   * @param salePrice - Sale price in USD
   * @returns Estimated total fees in USD
   *
   * Implementation notes:
   * - eBay final value fee: ~13.19% (varies by category)
   * - PayPal fee: 4.4% + $0.30
   * - Should integrate with actual fee calculation service in production
   */
  private calculateFees(salePrice: number): number {
    const ebayFee = salePrice * this.DEFAULT_EBAY_FEE_RATE;
    const paypalFee = salePrice * this.DEFAULT_PAYPAL_FEE_RATE + this.DEFAULT_PAYPAL_FIXED_FEE;
    return ebayFee + paypalFee;
  }

  /**
   * Convert JPY to USD using current exchange rate
   *
   * @param amountJpy - Amount in Japanese Yen
   * @returns Amount in USD
   *
   * Implementation notes:
   * - Should fetch live exchange rate from API in production
   * - Consider caching exchange rate with TTL
   */
  private convertJpyToUsd(amountJpy: number): number {
    // TODO: Integrate with exchange rate API
    return amountJpy * this.JPY_TO_USD_RATE;
  }

  /**
   * Send automated offer to buyer via eBay API
   *
   * @param itemId - eBay item ID
   * @param offerPrice - Offer price in USD
   * @param buyerId - Optional: specific buyer ID (if known)
   * @returns Promise resolving to send result
   *
   * Implementation notes:
   * - Call eBay Trading API AddMemberMessageAAQToPartner or similar
   * - For Best Offer: use RespondToBestOffer if responding to buyer's offer
   * - For proactive offers: use AddMemberMessage with offer details
   * - Log all offer activities for audit
   */
  async sendOfferToBuyer(
    itemId: string,
    offerPrice: number,
    buyerId?: string
  ): Promise<OfferSendResult> {
    try {
      // 1. Validate offer price
      if (offerPrice <= 0) {
        return {
          success: false,
          errorMessage: 'Offer price must be greater than 0',
          timestamp: new Date(),
        };
      }

      console.log('Sending offer to buyer:', { itemId, offerPrice, buyerId });

      // 2. Call eBay API to send offer
      // Note: This will be implemented in Phase 4 (API Integration)
      // For now, we'll call the API route when it's available
      const response = await fetch('/api/ebay/auto-offer/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          offerPrice,
          buyerId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Offer send failed:', errorData);
        return {
          success: false,
          errorMessage: errorData.error || 'Failed to send offer',
          timestamp: new Date(),
        };
      }

      const result = await response.json();

      // 3. Log successful offer
      console.log('Offer sent successfully:', result);

      // 4. Return result
      return {
        success: true,
        offerId: result.offerId,
        offerPrice,
        buyerId,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error sending offer:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Process interested buyer event and auto-send offer if applicable
   *
   * @param event - Interested buyer event (from eBay webhook/notification)
   * @returns Promise resolving to processing result
   *
   * Implementation notes:
   * - This is triggered by eBay event notifications (watchlist add, cart add, etc.)
   * - Check if auto-offer is enabled for the item
   * - Calculate optimal offer
   * - Send offer if profitable
   * - Return execution status
   */
  async processInterestedBuyerEvent(
    event: InterestedBuyerEvent
  ): Promise<{
    processed: boolean;
    offerSent: boolean;
    offerPrice?: number;
    reason?: string;
  }> {
    // TODO: Implement event processing workflow
    // 1. Get product ID from eBay item ID
    // 2. Check if auto-offer enabled
    // 3. Calculate optimal offer
    // 4. Send offer if profitable
    // 5. Return status

    throw new Error('Not yet implemented');
  }

  /**
   * Auto-adjust listing price after enabling Best Offer
   *
   * @param productId - Product ID
   * @param adjustmentRate - Rate to increase price (e.g., 0.10 = 10% increase)
   * @returns Promise resolving to new price
   *
   * Implementation notes:
   * - Purpose: Offset expected discounts from offers
   * - New price = current_price × (1 + adjustment_rate)
   * - Update products_master and eBay listing
   * - This makes buyers feel they got a deal while maintaining revenue
   */
  async adjustPriceForOfferMode(
    productId: string,
    adjustmentRate: number = 0.10
  ): Promise<{
    success: boolean;
    oldPrice: number;
    newPrice: number;
    updated: boolean;
  }> {
    // TODO: Implement price adjustment logic
    // 1. Get current price from products_master
    // 2. Calculate new price
    // 3. Update products_master
    // 4. Update eBay listing via API
    // 5. Return result

    throw new Error('Not yet implemented');
  }

  /**
   * Get offer activity statistics for monitoring
   *
   * @param productId - Optional: filter by product
   * @param dateFrom - Start date for statistics
   * @returns Promise resolving to offer metrics
   */
  async getOfferStats(
    productId?: string,
    dateFrom: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  ): Promise<{
    totalOffersSent: number;
    offersAccepted: number;
    acceptanceRate: number;
    averageDiscountRate: number;
    totalRevenue: number;
    totalProfit: number;
  }> {
    // TODO: Implement statistics collection
    // Query offer log/audit table for metrics

    throw new Error('Not yet implemented');
  }

  /**
   * Validate offer settings to ensure they prevent losses
   *
   * @param settings - Product offer settings to validate
   * @returns Validation result with any issues
   */
  validateOfferSettings(
    settings: ProductOfferSettings
  ): {
    valid: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check minimum profit margin is set
    if (settings.minProfitMarginJpy <= 0) {
      issues.push('Minimum profit margin must be greater than 0 to prevent losses');
    }

    // Check max discount rate is reasonable
    if (settings.maxDiscountRate >= 1.0) {
      issues.push('Maximum discount rate must be less than 100%');
    }

    if (settings.maxDiscountRate > 0.3) {
      warnings.push('Discount rate above 30% may significantly impact profit margins');
    }

    // Check purchase price is set
    if (settings.purchasePriceJpy <= 0) {
      issues.push('Purchase price must be set to calculate break-even point');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
    };
  }
}

// Export singleton instance
export const autoOfferService = new AutoOfferService();
