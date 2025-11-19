import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    const projectRoot = process.cwd()
    console.log('Git push - Project root:', projectRoot)

    // 現在のブランチを取得
    const { stdout: branchOutput } = await execAsync('git branch --show-current', { cwd: projectRoot })
    const currentBranch = branchOutput.trim()
    console.log('Current branch:', currentBranch)

    // リクエストボディからコミットメッセージを取得（オプション）
    const body = await request.json().catch(() => ({}))
    const customMessage = body.message
    console.log('Commit message:', customMessage)

    // Git status確認
    const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: projectRoot })
    console.log('Git status before push:', statusOutput)
    
    const hasUncommittedChanges = !!statusOutput.trim()

    // ローカルコミットがあるか確認
    try {
      const { stdout: commitCheck } = await execAsync(
        `git rev-list --count ${currentBranch} ^origin/${currentBranch}`,
        { cwd: projectRoot }
      )
      const localCommitsAhead = parseInt(commitCheck.trim())
      console.log('Local commits ahead of remote:', localCommitsAhead)

      if (!hasUncommittedChanges && localCommitsAhead === 0) {
        console.log('No changes to push')
        return NextResponse.json(
          { message: '変更がありません（既にプッシュ済みです）' },
          { status: 200 }
        )
      }
    } catch (error) {
      console.log('Could not check remote commits (branch may not exist on remote)')
    }

    console.log('Changes detected, proceeding with push...')

    // 未コミットの変更がある場合のみ、add と commit を実行
    if (hasUncommittedChanges) {
      // ⭐ 重要: まずpullして最新を取り込む
      try {
        console.log('Pulling latest changes...')
        const { stdout: pullOutput } = await execAsync(`git pull origin ${currentBranch}`, { cwd: projectRoot })
        console.log('Pull output:', pullOutput)
      } catch (pullError: any) {
        console.error('Pull error:', pullError)
        return NextResponse.json(
          { 
            error: 'Git pullに失敗しました。競合がある可能性があります。',
            details: pullError.message,
            stderr: pullError.stderr
          },
          { status: 500 }
        )
      }

      // Git add
      console.log('Adding files...')
      await execAsync('git add .', { cwd: projectRoot })
      
      // Git commit
      const commitMessage = customMessage || `Update: ${new Date().toISOString()}`
      console.log('Committing with message:', commitMessage)
      
      try {
        await execAsync(`git commit -m "${commitMessage}"`, { cwd: projectRoot })
      } catch (commitError: any) {
        // コミットするものがない場合もエラーになるので確認
        if (commitError.message.includes('nothing to commit')) {
          console.log('Nothing to commit (already committed)')
        } else {
          console.error('Commit error:', commitError)
          throw commitError
        }
      }
    } else {
      console.log('No uncommitted changes, pushing existing commits...')
    }
    
    // Git push（現在のブランチを自動検出）
    console.log(`Pushing to origin/${currentBranch}...`)
    const { stdout: pushOutput } = await execAsync(`git push origin ${currentBranch}`, { cwd: projectRoot })
    console.log('Push output:', pushOutput)
    
    return NextResponse.json(
      { 
        success: true,
        message: `GitHubへのプッシュが完了しました（ブランチ: ${currentBranch}）`,
        branch: currentBranch
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Git push error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Git pushに失敗しました',
        details: error.stderr || error.message
      },
      { status: 500 }
    )
  }
}
