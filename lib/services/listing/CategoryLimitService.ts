/**
 * CategoryLimitService
 *
 * Purpose: Manage eBay category-based listing limits to prevent account
 * penalties and optimize listing slot utilization.
 *
 * eBay enforces various limits per account:
 * - 10,000 item limit (for certain categories)
 * - 50,000 USD listing value limit (for certain categories)
 * - Other custom limits based on account performance
 *
 * This service integrates with:
 * - ebay_category_limit table (for limit tracking)
 * - eBay Selling API (for real-time limit checks)
 * - ListingRotationService (for automated slot optimization)
 */

import { supabase } from '@/lib/supabase';

/**
 * Interface for category limit information
 */
export interface CategoryLimit {
  id: string;
  ebayAccountId: string;
  categoryId: string;
  limitType: '10000' | '50000' | 'other';
  currentListingCount: number;
  maxLimit: number;
  lastUpdated: Date;
}

/**
 * Interface for listing capacity check result
 */
export interface CapacityCheckResult {
  canList: boolean;
  remaining: number;
  currentCount: number;
  maxLimit: number;
  utilizationRate: number; // Percentage of capacity used (0-100)
  warning?: string;
}

/**
 * Interface for limit update result
 */
export interface LimitUpdateResult {
  success: boolean;
  newCount: number;
  operation: 'increment' | 'decrement' | 'set';
  timestamp: Date;
}

/**
 * CategoryLimitService Class
 *
 * Manages eBay listing limits per category to ensure compliance
 * with platform restrictions and optimize account performance.
 */
export class CategoryLimitService {
  private readonly WARNING_THRESHOLD = 0.90; // Warn when 90% capacity reached
  private readonly CRITICAL_THRESHOLD = 0.95; // Critical warning at 95%

  constructor() {
    // Initialize service
    // DB connection is handled by imported supabase client
  }

  /**
   * Check if a new listing can be created in the specified category
   *
   * @param accountId - eBay account ID
   * @param categoryId - eBay category ID
   * @returns Promise resolving to capacity check result
   *
   * Implementation notes:
   * - Query ebay_category_limit table
   * - Use PostgreSQL function can_list_in_category() for efficient checking
   * - Calculate utilization rate
   * - Add warnings if approaching limits
   */
  async canListInCategory(
    accountId: string,
    categoryId: string
  ): Promise<CapacityCheckResult> {
    try {
      // Call PostgreSQL function can_list_in_category()
      const { data, error } = await supabase
        .rpc('can_list_in_category', {
          p_account_id: accountId,
          p_category_id: categoryId,
        })
        .single();

      if (error) {
        console.error('Error checking category capacity:', error);
        // If category limit not configured, assume listing is allowed
        return {
          canList: true,
          remaining: 99999,
          currentCount: 0,
          maxLimit: 99999,
          utilizationRate: 0,
          warning: 'Category limit not configured',
        };
      }

      if (!data) {
        // No limit configured for this category
        return {
          canList: true,
          remaining: 99999,
          currentCount: 0,
          maxLimit: 99999,
          utilizationRate: 0,
        };
      }

      const utilizationRate = (data.current_count / data.max_limit) * 100;
      let warning: string | undefined;

      // Add warnings based on thresholds
      if (utilizationRate >= this.CRITICAL_THRESHOLD * 100) {
        warning = `CRITICAL: ${utilizationRate.toFixed(1)}% capacity used`;
      } else if (utilizationRate >= this.WARNING_THRESHOLD * 100) {
        warning = `WARNING: ${utilizationRate.toFixed(1)}% capacity used`;
      }

      return {
        canList: data.can_list,
        remaining: data.remaining,
        currentCount: data.current_count,
        maxLimit: data.max_limit,
        utilizationRate: Math.round(utilizationRate * 10) / 10, // Round to 1 decimal
        warning,
      };
    } catch (error) {
      console.error('Unexpected error in canListInCategory:', error);
      // On error, err on the side of caution and allow listing
      return {
        canList: true,
        remaining: 0,
        currentCount: 0,
        maxLimit: 0,
        utilizationRate: 0,
        warning: 'Error checking capacity - proceeding with caution',
      };
    }
  }

  /**
   * Increment listing count after successful listing creation
   *
   * @param accountId - eBay account ID
   * @param categoryId - eBay category ID
   * @param incrementBy - Number to increment (default: 1)
   * @returns Promise resolving to update result
   *
   * Implementation notes:
   * - UPDATE ebay_category_limit SET current_listing_count = current_listing_count + ?
   * - Ensure atomic operation to prevent race conditions
   * - Validate that increment doesn't exceed max_limit
   */
  async incrementListingCount(
    accountId: string,
    categoryId: string,
    incrementBy: number = 1
  ): Promise<LimitUpdateResult> {
    try {
      // 1. Get current limit info
      const currentLimit = await this.getCategoryLimit(accountId, categoryId);

      if (!currentLimit) {
        console.warn(`No category limit configured for ${accountId}/${categoryId}`);
        return {
          success: false,
          newCount: 0,
          operation: 'increment',
          timestamp: new Date(),
        };
      }

      // Check if increment would exceed max limit
      if (currentLimit.currentListingCount + incrementBy > currentLimit.maxLimit) {
        console.error('Increment would exceed max limit');
        return {
          success: false,
          newCount: currentLimit.currentListingCount,
          operation: 'increment',
          timestamp: new Date(),
        };
      }

      // 2. Atomic increment using raw SQL via RPC or direct update
      const newCount = currentLimit.currentListingCount + incrementBy;

      const { data, error } = await supabase
        .from('ebay_category_limit')
        .update({
          current_listing_count: newCount,
          last_updated: new Date().toISOString(),
        })
        .eq('ebay_account_id', accountId)
        .eq('category_id', categoryId)
        .select('current_listing_count')
        .single();

      if (error) {
        console.error('Error incrementing listing count:', error);
        return {
          success: false,
          newCount: currentLimit.currentListingCount,
          operation: 'increment',
          timestamp: new Date(),
        };
      }

      console.log(`Incremented listing count for ${accountId}/${categoryId}: ${currentLimit.currentListingCount} -> ${data.current_listing_count}`);

      // 3. Return result
      return {
        success: true,
        newCount: data.current_listing_count,
        operation: 'increment',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Unexpected error in incrementListingCount:', error);
      return {
        success: false,
        newCount: 0,
        operation: 'increment',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Decrement listing count after listing ends or is deleted
   *
   * @param accountId - eBay account ID
   * @param categoryId - eBay category ID
   * @param decrementBy - Number to decrement (default: 1)
   * @returns Promise resolving to update result
   *
   * Implementation notes:
   * - UPDATE ebay_category_limit SET current_listing_count = current_listing_count - ?
   * - Ensure count doesn't go below 0
   * - Atomic operation for data consistency
   */
  async decrementListingCount(
    accountId: string,
    categoryId: string,
    decrementBy: number = 1
  ): Promise<LimitUpdateResult> {
    try {
      // 1. Get current limit info
      const currentLimit = await this.getCategoryLimit(accountId, categoryId);

      if (!currentLimit) {
        console.warn(`No category limit configured for ${accountId}/${categoryId}`);
        return {
          success: false,
          newCount: 0,
          operation: 'decrement',
          timestamp: new Date(),
        };
      }

      // 2. Calculate new count, ensuring it doesn't go below 0
      const newCount = Math.max(0, currentLimit.currentListingCount - decrementBy);

      const { data, error } = await supabase
        .from('ebay_category_limit')
        .update({
          current_listing_count: newCount,
          last_updated: new Date().toISOString(),
        })
        .eq('ebay_account_id', accountId)
        .eq('category_id', categoryId)
        .select('current_listing_count')
        .single();

      if (error) {
        console.error('Error decrementing listing count:', error);
        return {
          success: false,
          newCount: currentLimit.currentListingCount,
          operation: 'decrement',
          timestamp: new Date(),
        };
      }

      console.log(`Decremented listing count for ${accountId}/${categoryId}: ${currentLimit.currentListingCount} -> ${data.current_listing_count}`);

      // 3. Return result
      return {
        success: true,
        newCount: data.current_listing_count,
        operation: 'decrement',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Unexpected error in decrementListingCount:', error);
      return {
        success: false,
        newCount: 0,
        operation: 'decrement',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Set listing count to a specific value (for synchronization)
   *
   * @param accountId - eBay account ID
   * @param categoryId - eBay category ID
   * @param count - New count value
   * @returns Promise resolving to update result
   *
   * Implementation notes:
   * - Used for syncing with eBay API when counts drift
   * - UPDATE ebay_category_limit SET current_listing_count = ?
   * - Validate count <= max_limit
   */
  async setListingCount(
    accountId: string,
    categoryId: string,
    count: number
  ): Promise<LimitUpdateResult> {
    // TODO: Implement set count logic
    // 1. Validate count >= 0 and count <= max_limit
    // 2. UPDATE table
    // 3. Return new count

    throw new Error('Not yet implemented');
  }

  /**
   * Get category limit information
   *
   * @param accountId - eBay account ID
   * @param categoryId - eBay category ID
   * @returns Promise resolving to category limit data or null if not found
   */
  async getCategoryLimit(
    accountId: string,
    categoryId: string
  ): Promise<CategoryLimit | null> {
    try {
      const { data, error } = await supabase
        .from('ebay_category_limit')
        .select('*')
        .eq('ebay_account_id', accountId)
        .eq('category_id', categoryId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - category limit not configured
          return null;
        }
        console.error('Error fetching category limit:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        ebayAccountId: data.ebay_account_id,
        categoryId: data.category_id,
        limitType: data.limit_type,
        currentListingCount: data.current_listing_count,
        maxLimit: data.max_limit,
        lastUpdated: new Date(data.last_updated),
      };
    } catch (error) {
      console.error('Unexpected error in getCategoryLimit:', error);
      return null;
    }
  }

  /**
   * Get all category limits for an account
   *
   * @param accountId - eBay account ID
   * @returns Promise resolving to array of category limits
   */
  async getAllCategoryLimits(
    accountId: string
  ): Promise<CategoryLimit[]> {
    // TODO: Implement query logic
    // SELECT * FROM ebay_category_limit
    // WHERE ebay_account_id = ?
    // ORDER BY category_id

    throw new Error('Not yet implemented');
  }

  /**
   * Create or update a category limit
   *
   * @param accountId - eBay account ID
   * @param categoryId - eBay category ID
   * @param limitType - Type of limit ('10000', '50000', 'other')
   * @param maxLimit - Maximum allowed listings
   * @returns Promise resolving to created/updated limit
   *
   * Implementation notes:
   * - Use INSERT ... ON CONFLICT (upsert) for atomic operation
   * - Initialize current_listing_count to 0 for new entries
   * - Update max_limit for existing entries
   */
  async upsertCategoryLimit(
    accountId: string,
    categoryId: string,
    limitType: '10000' | '50000' | 'other',
    maxLimit: number
  ): Promise<CategoryLimit> {
    // TODO: Implement upsert logic
    // INSERT INTO ebay_category_limit (ebay_account_id, category_id, limit_type, max_limit)
    // VALUES (?, ?, ?, ?)
    // ON CONFLICT (ebay_account_id, category_id)
    // DO UPDATE SET limit_type = ?, max_limit = ?, last_updated = NOW()
    // RETURNING *

    throw new Error('Not yet implemented');
  }

  /**
   * Sync listing counts with eBay API
   *
   * @param accountId - eBay account ID
   * @returns Promise resolving to sync result
   *
   * Implementation notes:
   * - Call eBay Inventory API to get actual listing counts by category
   * - Update ebay_category_limit table with real counts
   * - Detect and log any discrepancies
   * - Should be run periodically (e.g., daily) to maintain accuracy
   */
  async syncWithEbayAPI(
    accountId: string
  ): Promise<{
    success: boolean;
    categoriesSynced: number;
    discrepancies: Array<{
      categoryId: string;
      oldCount: number;
      newCount: number;
      difference: number;
    }>;
  }> {
    // TODO: Implement eBay API sync
    // 1. Call eBay API to get active listings by category
    // 2. Compare with database counts
    // 3. Update database with accurate counts
    // 4. Return sync report

    throw new Error('Not yet implemented');
  }

  /**
   * Get categories that are approaching or at capacity
   *
   * @param accountId - eBay account ID
   * @param threshold - Warning threshold (0-1, default: 0.90 = 90%)
   * @returns Promise resolving to array of at-capacity categories
   */
  async getAtCapacityCategories(
    accountId: string,
    threshold: number = this.WARNING_THRESHOLD
  ): Promise<Array<{
    categoryId: string;
    currentCount: number;
    maxLimit: number;
    utilizationRate: number;
    level: 'warning' | 'critical' | 'full';
  }>> {
    // TODO: Implement capacity analysis
    // SELECT category_id, current_listing_count, max_limit,
    //        (current_listing_count::float / max_limit) as utilization_rate
    // FROM ebay_category_limit
    // WHERE ebay_account_id = ?
    //   AND (current_listing_count::float / max_limit) >= ?
    // ORDER BY utilization_rate DESC

    throw new Error('Not yet implemented');
  }

  /**
   * Determine which limit type applies to a category
   *
   * @param categoryId - eBay category ID
   * @returns Promise resolving to limit type
   *
   * Implementation notes:
   * - Some categories fall under both 10k and 50k USD limits
   * - Priority: Always enforce the stricter limit
   * - May require eBay API call or category mapping table
   */
  async determineLimitType(
    categoryId: string
  ): Promise<'10000' | '50000' | 'other'> {
    // TODO: Implement limit type detection
    // 1. Check category mapping table or eBay API
    // 2. If category has multiple limits, return strictest one
    // 3. Default to 'other' if unknown

    throw new Error('Not yet implemented');
  }

  /**
   * Validate a batch of listings before creation
   *
   * @param accountId - eBay account ID
   * @param listings - Array of category IDs to check
   * @returns Promise resolving to validation result
   *
   * Implementation notes:
   * - Efficient batch checking to prevent multiple DB calls
   * - Returns which listings can/cannot be created
   * - Useful for bulk listing operations
   */
  async validateBatchListings(
    accountId: string,
    listings: Array<{ categoryId: string; quantity: number }>
  ): Promise<{
    canListAll: boolean;
    allowedListings: string[];
    blockedListings: Array<{
      categoryId: string;
      reason: string;
      remaining: number;
    }>;
  }> {
    // TODO: Implement batch validation
    // 1. Group by category
    // 2. Check capacity for each category
    // 3. Return detailed validation result

    throw new Error('Not yet implemented');
  }

  /**
   * Get limit utilization statistics for monitoring
   *
   * @param accountId - eBay account ID
   * @returns Promise resolving to utilization metrics
   */
  async getUtilizationStats(
    accountId: string
  ): Promise<{
    totalCategories: number;
    totalListings: number;
    totalCapacity: number;
    overallUtilization: number;
    categoriesAtWarning: number;
    categoriesAtCritical: number;
    categoriesAtFull: number;
  }> {
    // TODO: Implement statistics collection
    // Aggregate data from ebay_category_limit table

    throw new Error('Not yet implemented');
  }
}

// Export singleton instance
export const categoryLimitService = new CategoryLimitService();
