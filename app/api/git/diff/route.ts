import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    const projectRoot = process.cwd()
    
    // Git fetch実行
    await execAsync('git fetch origin', { cwd: projectRoot })
    
    // 差分チェック
    const { stdout: diffStat } = await execAsync('git diff HEAD origin/main --stat', {
      cwd: projectRoot
    })
    
    const { stdout: diffFiles } = await execAsync('git diff HEAD origin/main --name-status', {
      cwd: projectRoot
    })
    
    // ローカルの変更
    const { stdout: localChanges } = await execAsync('git status --short', {
      cwd: projectRoot
    })
    
    return NextResponse.json({
      success: true,
      remoteDiffStat: diffStat.trim(),
      remoteDiffFiles: diffFiles.trim(),
      localChanges: localChanges.trim(),
      hasRemoteDiff: diffStat.trim().length > 0,
      hasLocalChanges: localChanges.trim().length > 0
    })
  } catch (error: any) {
    console.error('Git diff error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '差分チェックに失敗しました', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
