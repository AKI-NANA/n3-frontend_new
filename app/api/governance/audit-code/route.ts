// app/api/governance/audit-code/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { RuleChecker } from '@/lib/governance/rule-checker'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const logs: string[] = []
    const addLog = (msg: string) => {
      console.log(msg)
      logs.push(msg)
    }

    addLog('🔍 コード監査を開始します...')

    // ステップ1: ESLintチェック
    addLog('📋 ESLintチェック中...')
    try {
      const { stdout, stderr } = await execAsync('npm run lint')
      if (stderr && !stderr.includes('warn')) {
        addLog(`⚠️ ESLint警告: ${stderr}`)
      } else {
        addLog('✅ ESLintチェック完了（問題なし）')
      }
    } catch (error: any) {
      // ESLintエラーがある場合
      addLog(`❌ ESLintエラー: ${error.message}`)
      return NextResponse.json({
        success: false,
        message: 'ESLintエラーが見つかりました',
        logs,
        eslintErrors: error.stdout
      }, { status: 400 })
    }

    // ステップ2: Prettierチェック
    addLog('🎨 Prettierチェック中...')
    try {
      await execAsync('npx prettier --check . --ignore-path .gitignore')
      addLog('✅ Prettierチェック完了（フォーマット済み）')
    } catch (error: any) {
      addLog('⚠️ フォーマットが必要なファイルがあります（自動修正可能）')
      // Prettierは警告のみで続行
    }

    // ステップ3: カスタムルールチェック
    addLog('🛡️ カスタムルール（A, B, C）チェック中...')
    const checker = new RuleChecker()
    const violations = await checker.checkAll()

    if (violations.length > 0) {
      addLog(`❌ ${violations.length}件のルール違反を検出`)
      violations.slice(0, 10).forEach(v => {
        addLog(`  - [ルール${v.rule}] ${v.file}:${v.line} - ${v.message}`)
      })

      if (violations.length > 10) {
        addLog(`  ... 他${violations.length - 10}件の違反`)
      }

      return NextResponse.json({
        success: false,
        message: `${violations.length}件のルール違反があります`,
        logs,
        violations
      }, { status: 400 })
    }

    addLog('✅ カスタムルールチェック完了（問題なし）')
    addLog('')
    addLog('🎉 すべての監査をパスしました！デプロイ可能です。')

    return NextResponse.json({
      success: true,
      message: 'コード監査完了（問題なし）',
      logs,
      violations: []
    })

  } catch (error) {
    console.error('Code audit failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'コード監査に失敗しました'
    }, { status: 500 })
  }
}
