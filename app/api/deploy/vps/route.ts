import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    // リクエストボディからブランチを取得（オプション）
    const body = await request.json().catch(() => ({}))
    const targetBranch = body.branch

    // ローカルの現在のブランチを取得
    const { stdout: branchOutput } = await execAsync('git branch --show-current')
    const currentBranch = targetBranch || branchOutput.trim()

    // SSH経由でVPSにデプロイコマンド実行
    const commands = [
      'cd ~/n3-frontend_new',
      `git fetch origin ${currentBranch}`,
      `git checkout ${currentBranch}`,
      `git pull origin ${currentBranch}`,
      'npm install',
      'npm run build',
      'pm2 restart n3-frontend'
    ].join(' && ')

    // SSH鍵を指定してVPSに接続
    const sshCommand = `ssh -i ~/.ssh/id_rsa ubuntu@tk2-236-27682.vs.sakura.ne.jp "${commands}"`

    const { stdout, stderr } = await execAsync(sshCommand, {
      timeout: 300000 // 5分タイムアウト
    })

    return NextResponse.json(
      {
        success: true,
        message: `VPSへのデプロイが完了しました (${currentBranch}ブランチ)`,
        branch: currentBranch,
        output: stdout
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('VPS deploy error:', error)
    return NextResponse.json(
      { error: error.message || 'VPSデプロイに失敗しました' },
      { status: 500 }
    )
  }
}
