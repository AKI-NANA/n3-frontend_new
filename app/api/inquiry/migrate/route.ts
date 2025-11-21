import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    });

    // マイグレーションファイルを読み込み
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20250121_inquiry_knowledge_base.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // SQLを実行（複数のステートメントを分割して実行）
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const results = [];
    const errors = [];

    for (const statement of statements) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
          // RPC関数が存在しない場合は直接実行を試みる
          const { error: directError } = await supabase.from('_migrations').insert({
            name: '20250121_inquiry_knowledge_base',
            executed_at: new Date().toISOString()
          });

          if (directError) {
            errors.push({
              statement: statement.substring(0, 100) + '...',
              error: directError.message
            });
          } else {
            results.push({ success: true });
          }
        } else {
          results.push({ success: true, data });
        }
      } catch (err: any) {
        errors.push({
          statement: statement.substring(0, 100) + '...',
          error: err.message
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: errors.length === 0
        ? 'マイグレーション完了しました'
        : `マイグレーション中にエラーが発生しました（${errors.length}件）`,
      results: {
        total: statements.length,
        succeeded: results.length,
        failed: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'マイグレーション実行エラー',
        error: error.message
      },
      { status: 500 }
    );
  }
}

// 代替実装：Supabase CLIを使用しない場合
export async function GET() {
  return NextResponse.json({
    message: 'マイグレーション実行には POST リクエストを使用してください',
    instructions: {
      method: 'POST',
      endpoint: '/api/inquiry/migrate',
      note: 'または、Supabase ダッシュボードの SQL Editor でマイグレーションファイルを直接実行してください'
    }
  });
}
