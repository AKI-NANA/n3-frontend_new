// API Route for data collection/scraping
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { urls, platforms } = body

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'URLsが指定されていません' },
        { status: 400 }
      )
    }

    // PHPバックエンドへのプロキシ
    const phpEndpoints = [
      'http://localhost:8080/modules/yahoo_auction_complete/new_structure/02_scraping/api_endpoint.php',
      'http://localhost:8080/02_scraping/api/scrape_workflow.php',
      'http://localhost:5002/api/scrape'
    ]

    const errors: string[] = []

    // 最初に利用可能なエンドポイントを試す
    for (const endpoint of phpEndpoints) {
      try {
        console.log(`[Scraping] Trying endpoint: ${endpoint}`)
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls, platforms, action: 'scrape' }),
          signal: AbortSignal.timeout(10000) // 10秒タイムアウト
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`[Scraping] Success from ${endpoint}`)
          return NextResponse.json(data)
        } else {
          const errorMsg = `${endpoint}: HTTP ${response.status}`
          console.error(`[Scraping] ${errorMsg}`)
          errors.push(errorMsg)
        }
      } catch (error) {
        const errorMsg = `${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`[Scraping] ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    console.warn(`[Scraping] All endpoints failed. Errors: ${errors.join(', ')}`)

    // フォールバック: モックデータを返す
    const mockResults = urls.map((url: string, index: number) => ({
      id: `result-${Date.now()}-${index}`,
      url,
      platform: platforms[0] || 'auto-detect',
      title: `商品 ${index + 1}`,
      price: Math.floor(Math.random() * 50000) + 1000,
      status: Math.random() > 0.1 ? 'success' : 'error',
      timestamp: new Date().toISOString(),
      stock: Math.random() > 0.3 ? '在庫あり' : '在庫なし',
      condition: ['新品', '中古-良', '中古-可'][Math.floor(Math.random() * 3)]
    }))

    return NextResponse.json({
      success: true,
      results: mockResults,
      message: 'データ取得完了（モックモード）',
      warning: 'PHPバックエンドに接続できませんでした',
      errors: errors,
      isMockData: true
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Data Collection API is running',
    endpoints: {
      scrape: '/api/scraping/execute',
      status: '/api/scraping/status',
      history: '/api/scraping/history'
    }
  })
}
