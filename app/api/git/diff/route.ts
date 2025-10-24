import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    const projectRoot = process.cwd()

    // 現在のブランチを取得
    const { stdout: branchOutput } = await execAsync('git branch --show-current', {
      cwd: projectRoot
    })
    const currentBranch = branchOutput.trim()

    // Git fetch実行
    await execAsync(`git fetch origin ${currentBranch}`, { cwd: projectRoot })

    // 差分チェック（現在のブランチのリモートと比較）
    const { stdout: diffStat } = await execAsync(`git diff HEAD origin/${currentBranch} --stat`, {
      cwd: projectRoot
    })

    const { stdout: diffFiles } = await execAsync(`git diff HEAD origin/${currentBranch} --name-status`, {
      cwd: projectRoot
    })

    // ローカルの変更
    const { stdout: localChanges } = await execAsync('git status --short', {
      cwd: projectRoot
    })

    return NextResponse.json({
      success: true,
      branch: currentBranch,
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
