// app/api/ebay/get-categories/route.ts (修正版)
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const EBAY_APP_ID = process.env.EBAY_APP_ID || process.env.EBAY_CLIENT_ID
    const EBAY_AUTH_TOKEN = process.env.EBAY_AUTH_TOKEN
    const EBAY_DEV_ID = process.env.EBAY_DEV_ID
    const EBAY_CERT_ID = process.env.EBAY_CERT_ID

    if (!EBAY_APP_ID || !EBAY_AUTH_TOKEN) {
      return NextResponse.json({ error: 'eBay API credentials not configured' }, { status: 500 })
    }

    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${EBAY_AUTH_TOKEN}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnAll</DetailLevel>
  <CategorySiteID>0</CategorySiteID>
  <ViewAllNodes>true</ViewAllNodes>
</GetCategoriesRequest>`

    console.log('Calling eBay API...')

    const response = await fetch('https://api.ebay.com/ws/api.dll', {
      method: 'POST',
      headers: {
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-CALL-NAME': 'GetCategories',
        'X-EBAY-API-APP-NAME': EBAY_APP_ID,
        'X-EBAY-API-DEV-NAME': EBAY_DEV_ID || '',
        'X-EBAY-API-CERT-NAME': EBAY_CERT_ID || '',
        'Content-Type': 'text/xml',
      },
      body: xmlRequest,
    })

    if (!response.ok) {
      return NextResponse.json({ error: `eBay API HTTP Error: ${response.status}` }, { status: response.status })
    }

    const xmlResponse = await response.text()
    console.log('eBay API Response Length:', xmlResponse.length)

    if (xmlResponse.includes('<Errors>')) {
      const errorMatch = xmlResponse.match(/<ShortMessage>([^<]+)<\/ShortMessage>/)
      const errorMessage = errorMatch ? errorMatch[1] : 'Unknown error'
      return NextResponse.json({ error: `eBay API Error: ${errorMessage}` }, { status: 400 })
    }

    const categories = parseEbayCategoriesXML(xmlResponse)
    console.log('Parsed Categories Count:', categories.length)

    const categoriesWithFees = categories.map(cat => ({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      categoryPath: cat.categoryPath,
      categoryLevel: cat.level,
      categoryParentId: cat.parentId,
      fvfRate: getKnownFVFRate(cat.categoryName),
      insertionFee: 0.35,
    }))

    console.log('Success! Sample:', categoriesWithFees.slice(0, 3))

    return NextResponse.json({
      categories: categoriesWithFees,
      count: categoriesWithFees.length,
    })

  } catch (error: any) {
    console.error('Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function parseEbayCategoriesXML(xml: string): Array<{
  categoryId: string
  categoryName: string
  categoryPath: string
  level: number
  parentId: string | null
}> {
  const categories: Array<{
    categoryId: string
    categoryName: string
    categoryPath: string
    level: number
    parentId: string | null
  }> = []

  // <Category>タグを1つずつ抽出（ネストを考慮）
  let pos = 0
  while (pos < xml.length) {
    const startIdx = xml.indexOf('<Category>', pos)
    if (startIdx === -1) break

    // 対応する</Category>を探す（ネストを考慮）
    let depth = 0
    let endIdx = startIdx
    let inCategory = false

    for (let i = startIdx; i < xml.length; i++) {
      if (xml.substring(i, i + 10) === '<Category>') {
        depth++
        inCategory = true
      } else if (xml.substring(i, i + 11) === '</Category>') {
        depth--
        if (depth === 0 && inCategory) {
          endIdx = i + 11
          break
        }
      }
    }

    if (endIdx > startIdx) {
      const block = xml.substring(startIdx, endIdx)
      
      // ネストした<Category>タグを含まない、最も外側のタグ情報のみを抽出
      const firstNestedStart = block.indexOf('<Category>', 10)
      const contentToCheck = firstNestedStart > 0 ? block.substring(0, firstNestedStart) : block

      const idMatch = contentToCheck.match(/<CategoryID>(\d+)<\/CategoryID>/)
      const nameMatch = contentToCheck.match(/<CategoryName>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/CategoryName>/)
      const levelMatch = contentToCheck.match(/<CategoryLevel>(\d+)<\/CategoryLevel>/)
      const parentMatch = contentToCheck.match(/<CategoryParentID>(\d+)<\/CategoryParentID>/)

      if (idMatch && nameMatch && levelMatch) {
        const categoryId = idMatch[1]
        const parentId = parentMatch ? parentMatch[1] : null
        
        // 自己参照を修正
        const actualParentId = parentId === categoryId ? null : parentId

        let categoryName = nameMatch[1].trim()
        categoryName = categoryName
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')

        categories.push({
          categoryId: categoryId,
          categoryName: categoryName,
          categoryPath: categoryName,
          level: parseInt(levelMatch[1]),
          parentId: actualParentId,
        })
      }

      pos = endIdx
    } else {
      break
    }
  }

  console.log(`Parsed ${categories.length} categories`)
  return categories
}

function getKnownFVFRate(categoryName: string): number {
  const lowerName = categoryName.toLowerCase()
  
  if (lowerName.includes('guitar') && lowerName.includes('bass')) return 0.035
  if (lowerName.includes('musical') && !lowerName.includes('guitar')) return 0.0635
  if (lowerName.includes('art') && !lowerName.includes('smart')) return 0.15
  if (lowerName.includes('antique')) return 0.15
  if (lowerName.includes('cloth') || lowerName.includes('fashion')) return 0.15
  if (lowerName.includes('book')) return 0.1495
  
  return 0.1315
}
