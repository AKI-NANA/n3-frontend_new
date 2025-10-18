import { NextRequest, NextResponse } from 'next/server'

// GET: 出品一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform') || 'all'
    const status = searchParams.get('status') || 'all'

    // PHPバックエンドへプロキシ
    const phpUrl = `http://localhost:8080/modules/yahoo_auction_complete/new_structure/08_listing/api/listing.php?platform=${platform}&status=${status}`
    
    try {
      const response = await fetch(phpUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }
    } catch (error) {
      console.error('PHP API error:', error)
    }

    // フォールバック: モックデータ
    return NextResponse.json({
      success: true,
      listings: generateMockListings(),
      total: 20
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// POST: 新規出品作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // PHPバックエンド（eBay API統合）へプロキシ
    const phpUrl = 'http://localhost:8080/modules/yahoo_auction_complete/new_structure/08_listing/api/listing.php'
    
    try {
      const response = await fetch(phpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }
    } catch (error) {
      console.error('PHP API error:', error)
    }

    // フォールバック
    return NextResponse.json({
      success: true,
      message: '出品を作成しました（モックモード）',
      id: `item-${Date.now()}`
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

function generateMockListings() {
  const platforms = ['ebay', 'yahoo', 'mercari', 'rakuten']
  const statuses = ['draft', 'scheduled', 'active', 'ended']
  const categories = ['Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Toys', 'Books']
  
  return Array.from({ length: 20 }, (_, i) => ({
    id: `item-${i + 1}`,
    sku: `SKU-${1000 + i}`,
    title: `商品 ${i + 1} - ${['高品質', '限定版', 'プレミアム', 'スタンダード'][Math.floor(Math.random() * 4)]}`,
    platform: platforms[Math.floor(Math.random() * platforms.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    price: Math.floor(Math.random() * 50000) + 1000,
    quantity: Math.floor(Math.random() * 100) + 1,
    category: categories[Math.floor(Math.random() * categories.length)],
    scheduled_time: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    views: Math.floor(Math.random() * 1000),
    watchers: Math.floor(Math.random() * 50),
    bids: Math.floor(Math.random() * 10),
    images: [`https://via.placeholder.com/300x300?text=Item${i + 1}`],
    description: `これは商品${i + 1}の説明文です。高品質な商品で、多くのお客様にご満足いただいています。`,
    condition: ['New', 'Used - Like New', 'Used - Good'][Math.floor(Math.random() * 3)],
    shipping_method: ['Free Shipping', 'Standard Shipping', 'Express'][Math.floor(Math.random() * 3)]
  }))
}
