import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

export async function GET() {
  try {
    const envLocalPath = path.join(process.cwd(), '.env.local')

    if (!fs.existsSync(envLocalPath)) {
      return NextResponse.json({
        success: false,
        message: '.env.local ファイルが見つかりません'
      }, { status: 404 })
    }

    const envContent = fs.readFileSync(envLocalPath, 'utf-8')

    return NextResponse.json({
      success: true,
      content: envContent
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '環境変数の読み取りに失敗しました',
      error: error.message
    }, { status: 500 })
  }
}
