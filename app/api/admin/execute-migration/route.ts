import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { migrationFile } = body

    if (!migrationFile) {
      return NextResponse.json(
        { error: 'migrationFile parameter is required' },
        { status: 400 }
      )
    }

    // マイグレーションファイルを読み込む
    const migrationPath = join(process.cwd(), 'database', 'migrations', migrationFile)
    let sqlContent: string
    
    try {
      sqlContent = readFileSync(migrationPath, 'utf-8')
    } catch (error) {
      return NextResponse.json(
        { error: `Migration file not found: ${migrationFile}` },
        { status: 404 }
      )
    }

    console.log(`📝 Executing migration: ${migrationFile}`)
    console.log(`📄 SQL length: ${sqlContent.length} characters`)

    // Supabase Management APIを使用してSQLを実行
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const projectRef = supabaseUrl.split('//')[1].split('.')[0]
    
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({
        query: sqlContent
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Migration failed:', errorText)
      return NextResponse.json(
        {
          success: false,
          error: `Migration failed: ${response.status} ${response.statusText}`,
          details: errorText
        },
        { status: 500 }
      )
    }

    const result = await response.json()
    console.log('✅ Migration completed successfully')

    return NextResponse.json({
      success: true,
      message: `Migration ${migrationFile} executed successfully`,
      result
    })

  } catch (error: any) {
    console.error('❌ Error executing migration:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}
