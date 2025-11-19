import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    const projectRoot = process.cwd()
    console.log('Git push - Project root:', projectRoot)

    // リクエストボディからコミットメッセージを取得（オプション）
    const body = await request.json().catch(() => ({}))
    const customMessage = body.message
    console.log('Commit message:', customMessage)

    // Git status確認
    const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: projectRoot })
    console.log('Git status before push:', statusOutput)
    
    if (!statusOutput.trim()) {
      console.log('No changes detected')
      return NextResponse.json(
        { message: '変更がありません' },
        { status: 200 }
      )
    }

    console.log('Changes detected, proceeding with push...')

    // ⭐ 重要: まずpullして最新を取り込む
    try {
      console.log('Pulling latest changes...')
      const { stdout: pullOutput } = await execAsync('git pull origin main', { cwd: projectRoot })
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
    
    // Git push
    console.log('Pushing to origin...')
    const { stdout: pushOutput } = await execAsync('git push origin main', { cwd: projectRoot })
    console.log('Push output:', pushOutput)
    
    return NextResponse.json(
      { 
        success: true,
        message: 'GitHubへのプッシュが完了しました' 
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
