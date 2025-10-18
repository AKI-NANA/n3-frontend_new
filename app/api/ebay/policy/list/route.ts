import { NextRequest, NextResponse } from 'next/server'

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID_GREEN || process.env.EBAY_CLIENT_ID || ''
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET_GREEN || process.env.EBAY_CLIENT_SECRET || ''
const EBAY_REFRESH_TOKEN_GREEN = process.env.EBAY_REFRESH_TOKEN_GREEN || ''

async function getAccessToken() {
  try {
    const credentials = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64')

    const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: EBAY_REFRESH_TOKEN_GREEN,
        scope: 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to get access token')
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('Error getting access token:', error)
    throw error
  }
}

export async function GET(req: NextRequest) {
  try {
    const accessToken = await getAccessToken()

    const response = await fetch('https://api.ebay.com/sell/account/v1/fulfillment_policy', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch policies')
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch policies' },
      { status: 500 }
    )
  }
}
