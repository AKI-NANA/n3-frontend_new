// app/api/kobutsu/setup-database/route.ts
// 古物台帳データベースセットアップAPI

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // マイグレーションスクリプトを読み込み
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20251122_create_kobutsu_ledger.sql'
    );

    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json(
        { success: false, error: 'マイグレーションファイルが見つかりません' },
        { status: 404 }
      );
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // SQLを実行（複数のステートメントを分割して実行）
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';',
        });

        if (error) {
          // すでに存在する場合のエラーは無視
          if (
            error.message.includes('already exists') ||
            error.message.includes('already defined')
          ) {
            results.push({
              statement: statement.substring(0, 50) + '...',
              status: 'skipped',
              message: 'Already exists',
            });
            successCount++;
          } else {
            results.push({
              statement: statement.substring(0, 50) + '...',
              status: 'error',
              error: error.message,
            });
            errorCount++;
          }
        } else {
          results.push({
            statement: statement.substring(0, 50) + '...',
            status: 'success',
          });
          successCount++;
        }
      } catch (err: any) {
        results.push({
          statement: statement.substring(0, 50) + '...',
          status: 'error',
          error: err.message,
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: errorCount === 0,
      message: `マイグレーション完了: ${successCount}件成功, ${errorCount}件失敗`,
      results,
      summary: {
        total: statements.length,
        success: successCount,
        errors: errorCount,
      },
    });
  } catch (error: any) {
    console.error('Database setup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'データベースセットアップに失敗しました',
      },
      { status: 500 }
    );
  }
}

// データベース状態確認API
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // テーブル存在確認
    const tables = ['sales_orders', 'sales_order_items', 'kobutsu_ledger'];
    const tableStatus = [];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      tableStatus.push({
        table,
        exists: !error,
        error: error?.message,
      });
    }

    return NextResponse.json({
      success: true,
      tables: tableStatus,
    });
  } catch (error: any) {
    console.error('Database check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'データベース確認に失敗しました',
      },
      { status: 500 }
    );
  }
}
