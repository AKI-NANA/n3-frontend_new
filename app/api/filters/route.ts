import { NextRequest, NextResponse } from 'next/server'

// GET: フィルター一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'patent'
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '25'

    // PHPバックエンドへプロキシ
    const phpUrl = `http://localhost:8080/modules/yahoo_auction_complete/new_structure/07_filters/api/filter_handler.php?type=${type}&page=${page}&page_size=${pageSize}`
    
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
    const mockFilters = generateMockFilters(type)
    return NextResponse.json({
      success: true,
      filters: mockFilters,
      total: mockFilters.length,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// POST: 新規フィルター追加
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // PHPバックエンドへプロキシ
    const phpUrl = 'http://localhost:8080/modules/yahoo_auction_complete/new_structure/07_filters/api/filter_handler.php'
    
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
      message: 'フィルターを追加しました（モックモード）',
      id: Date.now()
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// モックデータ生成関数
function generateMockFilters(type: string) {
  const mockData: Record<string, any[]> = {
    patent: [
      { id: 1, keyword: 'Apple', reason: '特許侵害リスク', priority: 9, is_active: true, updated_at: '2024-01-15' },
      { id: 2, keyword: 'Samsung', reason: '特許訴訟履歴', priority: 8, is_active: true, updated_at: '2024-01-14' },
      { id: 3, keyword: 'Sony', reason: '知的財産権', priority: 7, is_active: true, updated_at: '2024-01-13' },
      { id: 4, keyword: 'Microsoft', reason: 'ソフトウェア特許', priority: 8, is_active: true, updated_at: '2024-01-12' },
      { id: 5, keyword: 'Nintendo', reason: 'ゲーム関連特許', priority: 9, is_active: true, updated_at: '2024-01-11' },
    ],
    export: [
      { id: 1, keyword: '武器', reason: '輸出規制対象', priority: 10, is_active: true, updated_at: '2024-01-15' },
      { id: 2, keyword: '薬品', reason: '医薬品規制', priority: 9, is_active: true, updated_at: '2024-01-14' },
      { id: 3, keyword: '危険物', reason: '輸送制限', priority: 10, is_active: true, updated_at: '2024-01-13' },
      { id: 4, keyword: 'ドローン', reason: '航空規制', priority: 8, is_active: true, updated_at: '2024-01-12' },
      { id: 5, keyword: '暗号化', reason: '技術規制', priority: 7, is_active: true, updated_at: '2024-01-11' },
    ],
    country: [
      { id: 1, keyword: '象牙', reason: 'ワシントン条約', priority: 10, is_active: true, updated_at: '2024-01-15' },
      { id: 2, keyword: '文化財', reason: '文化財保護法', priority: 9, is_active: true, updated_at: '2024-01-14' },
      { id: 3, keyword: '医薬品', reason: '薬事法規制', priority: 8, is_active: true, updated_at: '2024-01-13' },
      { id: 4, keyword: '食品', reason: '食品衛生法', priority: 7, is_active: true, updated_at: '2024-01-12' },
      { id: 5, keyword: '化粧品', reason: '薬機法規制', priority: 6, is_active: true, updated_at: '2024-01-11' },
    ],
    mall: [
      { id: 1, keyword: '偽ブランド', reason: 'プラットフォーム規約', priority: 10, is_active: true, updated_at: '2024-01-15' },
      { id: 2, keyword: 'コピー品', reason: '知的財産権侵害', priority: 10, is_active: true, updated_at: '2024-01-14' },
      { id: 3, keyword: '海賊版', reason: '著作権侵害', priority: 9, is_active: true, updated_at: '2024-01-13' },
      { id: 4, keyword: '非正規品', reason: '販売権なし', priority: 8, is_active: true, updated_at: '2024-01-12' },
      { id: 5, keyword: '転売', reason: '規約違反', priority: 7, is_active: true, updated_at: '2024-01-11' },
    ],
    vero: [
      { id: 1, keyword: 'Louis Vuitton', reason: 'VERO登録ブランド', priority: 10, is_active: true, updated_at: '2024-01-15' },
      { id: 2, keyword: 'Chanel', reason: 'VERO登録ブランド', priority: 10, is_active: true, updated_at: '2024-01-14' },
      { id: 3, keyword: 'Rolex', reason: 'VERO登録ブランド', priority: 10, is_active: true, updated_at: '2024-01-13' },
      { id: 4, keyword: 'Nike', reason: 'VERO登録ブランド', priority: 9, is_active: true, updated_at: '2024-01-12' },
      { id: 5, keyword: 'Adidas', reason: 'VERO登録ブランド', priority: 9, is_active: true, updated_at: '2024-01-11' },
    ]
  }

  return mockData[type] || []
}
