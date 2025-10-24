import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    // リクエストボディからコミットメッセージを取得（オプション）
    const body = await request.json().catch(() => ({}))
    const customMessage = body.message

    // 現在のブランチを取得
    const { stdout: branchOutput } = await execAsync('git branch --show-current')
    const currentBranch = branchOutput.trim()

    // Git status確認
    const { stdout: statusOutput } = await execAsync('git status --porcelain')

    if (!statusOutput.trim()) {
      return NextResponse.json(
        { message: '変更がありません' },
        { status: 200 }
      )
    }

    // ⭐ 重要: まずpullして最新を取り込む
    try {
      await execAsync(`git pull origin ${currentBranch}`)
    } catch (pullError: any) {
      return NextResponse.json(
        {
          error: 'Git pullに失敗しました。競合がある可能性があります。',
          details: pullError.message
        },
        { status: 500 }
      )
    }

    // Git add
    await execAsync('git add .')

    // Git commit
    const commitMessage = customMessage || `Update: ${new Date().toISOString()}`
    await execAsync(`git commit -m "${commitMessage}"`)

    // Git push
    await execAsync(`git push -u origin ${currentBranch}`)
    
    return NextResponse.json(
      {
        success: true,
        message: `GitHubへのプッシュが完了しました (${currentBranch}ブランチ)`,
        branch: currentBranch
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Git push error:', error)
    return NextResponse.json(
      { error: error.message || 'Git pushに失敗しました' },
      { status: 500 }
    )
  }
}
