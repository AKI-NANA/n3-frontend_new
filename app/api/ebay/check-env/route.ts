import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    mjt: {
      clientId: process.env.EBAY_CLIENT_ID_MJT?.substring(0, 20) + '...',
      clientSecret: process.env.EBAY_CLIENT_SECRET_MJT?.substring(0, 10) + '...',
      refreshTokenLength: process.env.EBAY_REFRESH_TOKEN_MJT?.length || 0,
      refreshTokenPreview: process.env.EBAY_REFRESH_TOKEN_MJT?.substring(0, 30) + '...'
    },
    green: {
      clientId: process.env.EBAY_CLIENT_ID_GREEN?.substring(0, 20) + '...',
      clientSecret: process.env.EBAY_CLIENT_SECRET_GREEN?.substring(0, 10) + '...',
      refreshTokenLength: process.env.EBAY_REFRESH_TOKEN_GREEN?.length || 0,
      refreshTokenPreview: process.env.EBAY_REFRESH_TOKEN_GREEN?.substring(0, 30) + '...'
    }
  })
}
