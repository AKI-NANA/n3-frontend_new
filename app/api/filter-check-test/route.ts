// app/api/filter-check-test/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Filter check API is working!',
    timestamp: new Date().toISOString()
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('📦 Received body:', JSON.stringify(body, null, 2))
    
    return NextResponse.json({
      success: true,
      message: 'POST request received',
      receivedData: body
    })
  } catch (error: any) {
    console.error('❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
