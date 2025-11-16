import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// ファイル内容読み取り
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')
    
    if (!filePath) {
      return NextResponse.json({ error: 'パスが指定されていません' }, { status: 400 })
    }
    
    const fullPath = path.join(process.cwd(), filePath)
    
    // セキュリティチェック
    if (!fullPath.startsWith(process.cwd())) {
      return NextResponse.json({ error: '不正なパス' }, { status: 403 })
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8')
    
    return NextResponse.json({
      success: true,
      content,
      path: filePath,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// ファイル上書き保存
export async function POST(request: Request) {
  try {
    const { path: filePath, content } = await request.json()
    
    if (!filePath || content === undefined) {
      return NextResponse.json({ error: 'パスとコンテンツが必要です' }, { status: 400 })
    }
    
    const fullPath = path.join(process.cwd(), filePath)
    
    // セキュリティチェック
    if (!fullPath.startsWith(process.cwd())) {
      return NextResponse.json({ error: '不正なパス' }, { status: 403 })
    }
    
    fs.writeFileSync(fullPath, content, 'utf-8')
    
    return NextResponse.json({
      success: true,
      message: '保存しました',
      path: filePath,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
