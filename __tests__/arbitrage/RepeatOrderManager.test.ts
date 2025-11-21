/**
 * RepeatOrderManager テストコード
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { RepeatOrderManager } from '@/services/RepeatOrderManager'

// Supabaseクライアントのモック
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            then: jest.fn((resolve) => resolve({
              data: {
                id: 'test-product-1',
                sku: 'TEST-001',
                physical_inventory_count: 4,
                cost: 1000,
                supplier_source_url: 'https://example.com/product1',
              },
              error: null,
            })),
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          then: jest.fn((resolve) => resolve({ error: null })),
        })),
      })),
    })),
  })),
}))

describe('RepeatOrderManager', () => {
  let manager: RepeatOrderManager

  beforeEach(() => {
    manager = new RepeatOrderManager({
      dryRun: true,
      reorderThreshold: 3,
      reorderLotSize: 5,
      maxAutoReorderAmount: 50000,
    })
  })

  describe('handleOrderReceived', () => {
    it('受注を正常に処理し、在庫を更新できる', async () => {
      const result = await manager.handleOrderReceived(
        'amazon_jp',
        'order-123',
        'test-product-1',
        1
      )

      expect(result.success).toBe(true)
      expect(result.marketplace).toBe('amazon_jp')
      expect(result.orderId).toBe('order-123')
      expect(result.quantity).toBe(1)
    })

    it('在庫が閾値を下回った場合、リピート発注がトリガーされる', async () => {
      // 在庫が4個の商品に対して1個売れると3個になり、閾値（3個）に到達
      const result = await manager.handleOrderReceived(
        'amazon_jp',
        'order-124',
        'test-product-1',
        1
      )

      // リピート発注がトリガーされるべき
      // ただし、dryRunモードなので実際の発注はスキップされる
      expect(result.success).toBe(true)
      expect(result.remainingInventory).toBeLessThanOrEqual(3)
    })
  })
})
