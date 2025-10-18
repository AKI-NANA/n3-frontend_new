// app/api/ebay/get-categories-taxonomy/route.ts (修正版)
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID || process.env.EBAY_APP_ID
    const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET

    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 500 })
    }

    console.log('Getting OAuth token...')

    const tokenResponse = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      return NextResponse.json({ error: 'OAuth failed', details: error }, { status: 500 })
    }

    const { access_token } = await tokenResponse.json()
    console.log('Got OAuth token')

    const treeResponse = await fetch(
      'https://api.ebay.com/commerce/taxonomy/v1/category_tree/0',
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!treeResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch tree' }, { status: 500 })
    }

    const treeData = await treeResponse.json()
    console.log('Tree version:', treeData.categoryTreeVersion)
    
    // ルートノードの子カテゴリから開始（Root自体は除外）
    const categories: Array<{
      categoryId: string
      categoryName: string
      categoryPath: string
      level: number
      parentId: string | null
    }> = []

    if (treeData.rootCategoryNode?.childCategoryTreeNodes) {
      for (const child of treeData.rootCategoryNode.childCategoryTreeNodes) {
        categories.push(...extractAllCategories(child, 1, null, ''))
      }
    }
    
    console.log('Extracted', categories.length, 'categories')

    const categoriesWithFees = categories.map(cat => ({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      categoryPath: cat.categoryPath,
      categoryLevel: cat.level,
      categoryParentId: cat.parentId,
      fvfRate: getFVFRate(cat.categoryName),
      insertionFee: 0.35,
    }))

    return NextResponse.json({
      categories: categoriesWithFees,
      count: categoriesWithFees.length,
      treeVersion: treeData.categoryTreeVersion,
    })

  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function extractAllCategories(
  node: any,
  level: number,
  parentId: string | null,
  parentPath: string
): Array<{
  categoryId: string
  categoryName: string
  categoryPath: string
  level: number
  parentId: string | null
}> {
  const result: Array<{
    categoryId: string
    categoryName: string
    categoryPath: string
    level: number
    parentId: string | null
  }> = []

  if (!node?.category) return result

  const { categoryId, categoryName } = node.category
  const path = parentPath ? `${parentPath} > ${categoryName}` : categoryName

  result.push({
    categoryId,
    categoryName,
    categoryPath: path,
    level,
    parentId,
  })

  if (node.childCategoryTreeNodes && node.childCategoryTreeNodes.length > 0) {
    for (const child of node.childCategoryTreeNodes) {
      result.push(...extractAllCategories(child, level + 1, categoryId, path))
    }
  }

  return result
}

function getFVFRate(name: string): number {
  const n = name.toLowerCase()
  if (n.includes('guitar') && n.includes('bass')) return 0.035
  if (n.includes('musical')) return 0.0635
  if (n.includes('art') || n.includes('antique')) return 0.15
  if (n.includes('book')) return 0.1495
  return 0.1315
}
