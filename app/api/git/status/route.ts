import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    // 現在のブランチを取得
    const { stdout: branchOutput } = await execAsync('git branch --show-current')
    const branch = branchOutput.trim()

    // Git status確認
    const { stdout: statusOutput } = await execAsync('git status --porcelain')
    const hasChanges = !!statusOutput.trim()
    
    // 変更されたファイルのリスト
    const files = statusOutput
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.substring(3)) // ステータスコードを除去
    
    return NextResponse.json({
      hasChanges,
      files,
      branch,
    })
  } catch (error: any) {
    console.error('Git status error:', error)
    return NextResponse.json(
      { error: 'Git status取得に失敗しました' },
      { status: 500 }
    )
  }
}
