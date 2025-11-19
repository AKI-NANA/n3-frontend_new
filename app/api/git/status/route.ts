import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    const projectRoot = process.cwd()
    console.log('Project root:', projectRoot)

    // 現在のブランチを取得
    const { stdout: branchOutput } = await execAsync('git branch --show-current', { cwd: projectRoot })
    const branch = branchOutput.trim()
    console.log('Current branch:', branch)

    // Git status確認
    const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: projectRoot })
    console.log('Git status output:', statusOutput)
    const hasChanges = !!statusOutput.trim()
    
    // 変更されたファイルのリスト
    const files = statusOutput
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.substring(3)) // ステータスコードを除去
    
    console.log('Files detected:', files.length, 'Has changes:', hasChanges)

    return NextResponse.json({
      hasChanges,
      files,
      branch,
    })
  } catch (error: any) {
    console.error('Git status error:', error)
    return NextResponse.json(
      { error: `Git status取得に失敗しました: ${error.message}`, details: error.stderr || error.message },
      { status: 500 }
    )
  }
}
