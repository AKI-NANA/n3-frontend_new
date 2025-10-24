import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * VPS上で自分自身をデプロイするAPI
 * このAPIはVPS上で動いているNext.jsアプリから呼び出される
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const targetBranch = body.branch

    // 現在のブランチを取得
    const projectRoot = process.cwd()
    const { stdout: branchOutput } = await execAsync('git branch --show-current', {
      cwd: projectRoot
    })
    const currentBranch = targetBranch || branchOutput.trim()

    console.log('[Deploy] Starting self-deployment...')
    console.log('[Deploy] Project root:', projectRoot)
    console.log('[Deploy] Target branch:', currentBranch)

    // デプロイコマンドを直接実行
    const commands = [
      `cd "${projectRoot}"`,
      `git fetch origin ${currentBranch}`,
      `git checkout ${currentBranch}`,
      `git pull origin ${currentBranch}`,
      'npm install',
      'npm run build',
      'pm2 restart n3-frontend'
    ].join(' && ')

    console.log('[Deploy] Executing:', commands)

    const { stdout, stderr } = await execAsync(commands, {
      cwd: projectRoot,
      timeout: 300000, // 5分タイムアウト
      env: {
        ...process.env,
        HOME: process.env.HOME || '/home/ubuntu'
      }
    })

    console.log('[Deploy] stdout:', stdout)
    if (stderr) {
      console.log('[Deploy] stderr:', stderr)
    }

    return NextResponse.json({
      success: true,
      message: `デプロイが完了しました (${currentBranch}ブランチ)`,
      branch: currentBranch,
      output: stdout,
      warnings: stderr || null
    })

  } catch (error: any) {
    console.error('[Deploy] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'デプロイに失敗しました',
        output: error.stdout || null,
        stderr: error.stderr || null
      },
      { status: 500 }
    )
  }
}
