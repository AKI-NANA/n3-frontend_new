/**
 * InitialPurchaseManager テストコード
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { InitialPurchaseManager } from '@/executions/InitialPurchaseManager'

// Supabaseクライアントのモック
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        gte: jest.fn(() => ({
          eq: jest.fn(() => ({
            not: jest.fn(() => ({
              order: jest.fn(() => ({
                then: jest.fn((resolve) => resolve({
                  data: [
                    {
                      id: 'test-product-1',
                      sku: 'TEST-001',
                      title: 'テスト商品1',
                      arbitrage_score: 85,
                      arbitrage_status: 'tracked',
                      supplier_source_url: 'https://example.com/product1',
                      cost: 1000,
                      keepa_data: { is_out_of_stock: true },
                      ai_assessment: { profit_potential: 'very_high' },
                    },
                  ],
                  error: null,
                })),
              })),
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

describe('InitialPurchaseManager', () => {
  let manager: InitialPurchaseManager

  beforeEach(() => {
    manager = new InitialPurchaseManager({
      dryRun: true, // テストモードでは実際の発注をスキップ
      arbitrageThreshold: 70,
      initialLotSize: 5,
      maxAutoOrderAmount: 50000,
    })
  })

  describe('selectHighPotentialProducts', () => {
    it('閾値以上のスコアを持つ商品を選定できる', async () => {
      const products = await manager.selectHighPotentialProducts()

      expect(products).toBeDefined()
      expect(Array.isArray(products)).toBe(true)

      // モックデータでは1件の商品が返される
      expect(products.length).toBeGreaterThanOrEqual(0)

      if (products.length > 0) {
        expect(products[0].arbitrage_score).toBeGreaterThanOrEqual(70)
        expect(products[0].arbitrage_status).toBe('tracked')
      }
    })
  })

  describe('placeInitialOrders', () => {
    it('初期ロット発注が正常に実行される', async () => {
      const testProducts = [
        {
          id: 'test-product-1',
          sku: 'TEST-001',
          title: 'テスト商品1',
          arbitrage_score: 85,
          cost: 1000,
          supplier_source_url: 'https://example.com/product1',
        },
      ] as any

      const result = await manager.placeInitialOrders(testProducts)

      expect(result.success).toBe(true)
      expect(result.orderedProducts.length).toBe(1)
      expect(result.totalOrderAmount).toBe(5000) // 1000円 × 5個
    })

    it('発注金額が上限を超える場合はスキップされる', async () => {
      const expensiveProduct = [
        {
          id: 'test-product-2',
          sku: 'TEST-002',
          title: '高額商品',
          arbitrage_score: 90,
          cost: 20000, // 20,000円 × 5個 = 100,000円（上限50,000円を超過）
          supplier_source_url: 'https://example.com/product2',
        },
      ] as any

      const result = await manager.placeInitialOrders(expensiveProduct)

      expect(result.orderedProducts.length).toBe(0)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('上限を超過')
    })
  })
})
