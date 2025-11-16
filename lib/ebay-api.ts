/**
 * eBay Trading API 共通ヘルパー
 * https://developer.ebay.com/DevZone/XML/docs/Reference/eBay/index.html
 * OAuth 2.0対応版
 */

import { getEbayAccessToken } from './ebay-oauth'

interface EbayCredentials {
  appId: string
  devId: string
}

interface EbayApiOptions {
  callName: string
  siteId?: string
  body: string
}

/**
 * 環境変数からeBay認証情報を取得
 */
export function getEbayCredentials(): EbayCredentials {
  const appId = process.env.EBAY_APP_ID || process.env.EBAY_CLIENT_ID
  const devId = process.env.EBAY_DEV_ID

  if (!appId || !devId) {
    throw new Error(
      'eBay API credentials not configured. Check .env.local for: EBAY_APP_ID (or EBAY_CLIENT_ID), EBAY_DEV_ID'
    )
  }

  return { appId, devId }
}

/**
 * eBay Trading API呼び出し (XML-based with OAuth 2.0)
 * @param options - API呼び出しオプション
 * @returns XMLレスポンス文字列
 */
export async function callEbayTradingAPI(
  options: EbayApiOptions
): Promise<string> {
  const credentials = getEbayCredentials()
  const { callName, siteId = '0', body } = options

  // OAuth 2.0 アクセストークンを取得
  const accessToken = await getEbayAccessToken()

  const url = 'https://api.ebay.com/ws/api.dll'

  const headers = {
    'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
    'X-EBAY-API-DEV-NAME': credentials.devId,
    'X-EBAY-API-APP-NAME': credentials.appId,
    'X-EBAY-API-CALL-NAME': callName,
    'X-EBAY-API-SITEID': siteId,
    'Content-Type': 'text/xml; charset=utf-8',
    'X-EBAY-API-IAF-TOKEN': accessToken, // OAuth 2.0 トークン
  }

  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<${callName}Request xmlns="urn:ebay:apis:eBLBaseComponents">
  ${body}
</${callName}Request>`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: xmlRequest,
    })

    if (!response.ok) {
      throw new Error(`eBay API HTTP Error: ${response.status} ${response.statusText}`)
    }

    const xmlResponse = await response.text()
    
    // エラーチェック
    if (xmlResponse.includes('<Ack>Failure</Ack>') || xmlResponse.includes('<Ack>Warning</Ack>')) {
      console.error('eBay API Error Response:', xmlResponse)
    }

    return xmlResponse
  } catch (error) {
    console.error('eBay Trading API Call Failed:', {
      callName,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

/**
 * XML応答から特定のタグの値を抽出
 */
export function extractXmlValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`)
  const match = xml.match(regex)
  return match ? match[1] : null
}

/**
 * XML応答が成功かどうかをチェック
 */
export function isEbayApiSuccess(xml: string): boolean {
  return xml.includes('<Ack>Success</Ack>')
}

/**
 * XML応答からエラーメッセージを抽出
 */
export function extractEbayErrors(xml: string): string[] {
  const errors: string[] = []
  const errorRegex = /<ShortMessage>([^<]*)<\/ShortMessage>/g
  let match

  while ((match = errorRegex.exec(xml)) !== null) {
    errors.push(match[1])
  }

  return errors
}
