// lib/governance/migration-manager.ts
import * as fs from 'fs/promises'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

export interface Migration {
  id: string
  name: string
  applied: boolean
  appliedAt?: Date
  sql?: string
}

export class MigrationManager {
  private supabaseUrl: string
  private supabaseKey: string
  private migrationsDir: string

  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    this.migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  }

  async listMigrations(): Promise<Migration[]> {
    const migrations: Migration[] = []

    // マイグレーションディレクトリが存在するかチェック
    try {
      await fs.access(this.migrationsDir)
    } catch {
      // ディレクトリが存在しない場合は空配列を返す
      return migrations
    }

    const supabase = createClient(this.supabaseUrl, this.supabaseKey)

    // マイグレーション履歴テーブルを取得（存在しない場合もエラーハンドリング）
    let appliedMigrations: any[] = []
    try {
      const { data, error } = await supabase
        .from('schema_migrations')
        .select('*')
        .order('applied_at', { ascending: false })

      if (!error && data) {
        appliedMigrations = data
      }
    } catch (error) {
      console.warn('schema_migrations テーブルが存在しないか、アクセスできません')
    }

    // ローカルのマイグレーションファイルを取得
    try {
      const files = await fs.readdir(this.migrationsDir)
      const sqlFiles = files.filter(f => f.endsWith('.sql')).sort()

      for (const file of sqlFiles) {
        const id = file.replace('.sql', '')
        const applied = appliedMigrations?.some(m => m.version === id) || false
        const appliedRecord = appliedMigrations?.find(m => m.version === id)

        migrations.push({
          id,
          name: file,
          applied,
          appliedAt: appliedRecord ? new Date(appliedRecord.applied_at) : undefined
        })
      }
    } catch (error) {
      console.error('Failed to read migrations directory:', error)
    }

    return migrations
  }

  async applyMigration(migrationId: string): Promise<void> {
    // 注: Supabaseの場合、マイグレーションはSupabase CLIで管理するのが推奨
    // ここではプレースホルダー実装
    throw new Error('マイグレーション適用はSupabase CLIを使用してください: supabase db push')
  }

  async rollbackMigration(migrationId: string): Promise<void> {
    // 注: ロールバックもSupabase CLIで管理
    throw new Error('ロールバックはSupabase CLIを使用してください: supabase migration repair')
  }
}
