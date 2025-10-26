/**
 * eBay Inventory API - モックデータ版（開発用）
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const account = searchParams.get('account') || 'green'

  // モックデータ
  const mockProducts = [
    {
      id: 'TEST-001',
      unique_id: `EBAY-${account.toUpperCase()}-TEST-001`,
      product_name: 'Vintage Japanese Kimono - Beautiful Red & Gold Pattern',
      sku: 'KIM-001',
      product_type: 'stock',
      marketplace: 'ebay',
      account: account,
      physical_quantity: 5,
      listing_quantity: 3,
      cost_price: 45.00,
      selling_price: 129.99,
      currency: 'USD',
      condition_name: 'USED_EXCELLENT',
      category: '155184',
      images: [
        'https://i.ebayimg.com/images/g/abc123/s-l1600.jpg',
        'https://i.ebayimg.com/images/g/abc124/s-l1600.jpg'
      ],
      ebay_data: {
        offer_id: '1234567890',
        listing_id: '123456789012',
        status: 'PUBLISHED',
        marketplace_id: 'EBAY_US'
      },
      source_data: {
        from: 'mock_data',
        account: account,
        fetched_at: new Date().toISOString()
      }
    },
    {
      id: 'TEST-002',
      unique_id: `EBAY-${account.toUpperCase()}-TEST-002`,
      product_name: 'Pokemon Card - Pikachu VMAX PSA 10',
      sku: 'PKM-PIKA-001',
      product_type: 'stock',
      marketplace: 'ebay',
      account: account,
      physical_quantity: 2,
      listing_quantity: 2,
      cost_price: 80.00,
      selling_price: 199.99,
      currency: 'USD',
      condition_name: 'NEW',
      category: '183454',
      images: [
        'https://i.ebayimg.com/images/g/pokemon1/s-l1600.jpg'
      ],
      ebay_data: {
        offer_id: '1234567891',
        listing_id: '123456789013',
        status: 'PUBLISHED',
        marketplace_id: 'EBAY_US'
      },
      source_data: {
        from: 'mock_data',
        account: account,
        fetched_at: new Date().toISOString()
      }
    },
    {
      id: 'TEST-003',
      unique_id: `EBAY-${account.toUpperCase()}-TEST-003`,
      product_name: 'Sony PlayStation 5 Console - Disc Edition',
      sku: 'PS5-DISC-001',
      product_type: 'stock',
      marketplace: 'ebay',
      account: account,
      physical_quantity: 0,
      listing_quantity: 0,
      cost_price: 450.00,
      selling_price: 549.99,
      currency: 'USD',
      condition_name: 'NEW',
      category: '139971',
      images: [
        'https://i.ebayimg.com/images/g/ps5-1/s-l1600.jpg'
      ],
      ebay_data: {
        offer_id: '1234567892',
        listing_id: '123456789014',
        status: 'OUT_OF_STOCK',
        marketplace_id: 'EBAY_US'
      },
      source_data: {
        from: 'mock_data',
        account: account,
        fetched_at: new Date().toISOString()
      }
    },
    {
      id: 'TEST-004',
      unique_id: `EBAY-${account.toUpperCase()}-TEST-004`,
      product_name: 'Apple iPhone 14 Pro Max 256GB - Space Black (Unlocked)',
      sku: 'IPHN-14PM-256-BLK',
      product_type: 'stock',
      marketplace: 'ebay',
      account: account,
      physical_quantity: 8,
      listing_quantity: 5,
      cost_price: 850.00,
      selling_price: 1099.99,
      currency: 'USD',
      condition_name: 'NEW',
      category: '9355',
      images: [
        'https://i.ebayimg.com/images/g/iphone14/s-l1600.jpg'
      ],
      ebay_data: {
        offer_id: '1234567893',
        listing_id: '123456789015',
        status: 'PUBLISHED',
        marketplace_id: 'EBAY_US'
      },
      source_data: {
        from: 'mock_data',
        account: account,
        fetched_at: new Date().toISOString()
      }
    },
    {
      id: 'TEST-005',
      unique_id: `EBAY-${account.toUpperCase()}-TEST-005`,
      product_name: 'Rolex Submariner Watch - Vintage 1980s (Authentic)',
      sku: 'RLXSUB-80S-001',
      product_type: 'stock',
      marketplace: 'ebay',
      account: account,
      physical_quantity: 1,
      listing_quantity: 1,
      cost_price: 5000.00,
      selling_price: 8999.99,
      currency: 'USD',
      condition_name: 'USED_EXCELLENT',
      category: '31387',
      images: [
        'https://i.ebayimg.com/images/g/rolex1/s-l1600.jpg'
      ],
      ebay_data: {
        offer_id: '1234567894',
        listing_id: '123456789016',
        status: 'PUBLISHED',
        marketplace_id: 'EBAY_US'
      },
      source_data: {
        from: 'mock_data',
        account: account,
        fetched_at: new Date().toISOString()
      }
    }
  ]

  console.log(`📦 Mock data: ${mockProducts.length}件の商品を返却 (account: ${account})`)

  return NextResponse.json({
    success: true,
    account: account,
    total: mockProducts.length,
    products: mockProducts,
    message: `モックデータ: ${mockProducts.length}件の商品`,
    _note: 'これは開発用のモックデータです。本番では実際のeBay APIからデータを取得します。'
  })
}
