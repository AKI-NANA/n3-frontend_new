// app/api/database/migrate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { MigrationManager } from '@/lib/governance/migration-manager'

export async function GET(request: NextRequest) {
  try {
    const manager = new MigrationManager()
    const migrations = await manager.listMigrations()

    const pending = migrations.filter(m => !m.applied)
    const applied = migrations.filter(m => m.applied)

    return NextResponse.json({
      success: true,
      migrations,
      summary: {
        total: migrations.length,
        applied: applied.length,
        pending: pending.length
      }
    })
  } catch (error) {
    console.error('List migrations failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'マイグレーション一覧取得に失敗しました'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { migrationId, action } = await request.json()

    const logs: string[] = []
    const addLog = (msg: string) => {
      console.log(msg)
      logs.push(msg)
    }

    if (action === 'apply') {
      addLog(`⚠️ マイグレーション適用はSupabase CLIを使用してください`)
      addLog(`実行コマンド: supabase db push`)

      return NextResponse.json({
        success: false,
        message: 'マイグレーション適用はSupabase CLIを使用してください',
        logs,
        command: 'supabase db push'
      }, { status: 400 })
    } else if (action === 'rollback') {
      addLog(`⚠️ ロールバックはSupabase CLIを使用してください`)
      addLog(`実行コマンド: supabase migration repair`)

      return NextResponse.json({
        success: false,
        message: 'ロールバックはSupabase CLIを使用してください',
        logs,
        command: 'supabase migration repair'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: '無効なアクションです'
    }, { status: 400 })

  } catch (error) {
    console.error('Migration operation failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'マイグレーション操作に失敗しました'
    }, { status: 500 })
  }
}
