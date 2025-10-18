// app/api/ebay/debug-categories/route.ts
// XMLレスポンスをデバッグ
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const EBAY_APP_ID = process.env.EBAY_APP_ID || process.env.EBAY_CLIENT_ID
    const EBAY_AUTH_TOKEN = process.env.EBAY_AUTH_TOKEN
    const EBAY_DEV_ID = process.env.EBAY_DEV_ID
    const EBAY_CERT_ID = process.env.EBAY_CERT_ID

    if (!EBAY_APP_ID || !EBAY_AUTH_TOKEN) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 500 })
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

    const xmlResponse = await response.text()

    // Collectibles カテゴリ(ID=1)のXMLブロックを抽出
    const collectiblesMatch = xmlResponse.match(
      /<Category>[\s\S]*?<CategoryID>1<\/CategoryID>[\s\S]*?<\/Category>/
    )

    if (collectiblesMatch) {
      console.log('Collectibles XML Block:')
      console.log(collectiblesMatch[0])
    }

    // 最初の10カテゴリのXMLブロックを抽出
    const categoryBlocks = xmlResponse.match(/<Category>[\s\S]*?<\/Category>/g)?.slice(0, 10) || []

    return NextResponse.json({
      totalLength: xmlResponse.length,
      collectiblesBlock: collectiblesMatch ? collectiblesMatch[0] : 'Not found',
      sampleBlocks: categoryBlocks,
      firstCategories: categoryBlocks.map(block => {
        const idMatch = block.match(/<CategoryID>(\d+)<\/CategoryID>/)
        const nameMatch = block.match(/<CategoryName>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/CategoryName>/)
        const parentMatch = block.match(/<CategoryParentID>(\d+)<\/CategoryParentID>/)
        const levelMatch = block.match(/<CategoryLevel>(\d+)<\/CategoryLevel>/)
        
        return {
          id: idMatch ? idMatch[1] : null,
          name: nameMatch ? nameMatch[1] : null,
          parentId: parentMatch ? parentMatch[1] : null,
          level: levelMatch ? levelMatch[1] : null,
        }
      })
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
