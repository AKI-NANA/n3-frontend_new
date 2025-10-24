import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { promises as fs } from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// マイグレーションファイルの内容を取得
export async function POST(request: NextRequest) {
  try {
    const { migrationFile } = await request.json()

    if (!migrationFile) {
      return NextResponse.json(
        { error: 'マイグレーションファイル名を指定してください' },
        { status: 400 }
      )
    }

    // マイグレーションファイルのパスを構築
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
    const filePath = path.join(migrationsDir, migrationFile)

    // ファイルが存在するか確認
    try {
      await fs.access(filePath)
    } catch {
      return NextResponse.json(
        { error: `マイグレーションファイルが見つかりません: ${migrationFile}` },
        { status: 404 }
      )
    }

    // SQLファイルを読み込み
    const sql = await fs.readFile(filePath, 'utf-8')

    return NextResponse.json({
      success: true,
      fileName: migrationFile,
      content: sql,
      message: 'マイグレーションファイルの内容を取得しました'
    })
  } catch (error: any) {
    console.error('Migration read error:', error)
    return NextResponse.json(
      { error: error.message || 'マイグレーションファイル読み込みに失敗しました' },
      { status: 500 }
    )
  }
}

// 利用可能なマイグレーションファイルのリストを取得
export async function GET() {
  try {
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')

    // ディレクトリが存在するか確認
    try {
      await fs.access(migrationsDir)
    } catch {
      return NextResponse.json({
        migrations: [],
        message: 'マイグレーションディレクトリが見つかりません'
      })
    }

    // SQLファイルのリストを取得
    const files = await fs.readdir(migrationsDir)
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort()
      .reverse() // 新しいファイルを先頭に

    return NextResponse.json({
      migrations: sqlFiles,
      count: sqlFiles.length
    })
  } catch (error: any) {
    console.error('Migration list error:', error)
    return NextResponse.json(
      { error: error.message || 'マイグレーションリスト取得に失敗しました' },
      { status: 500 }
    )
  }
}
