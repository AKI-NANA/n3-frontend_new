import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    const projectRoot = process.cwd()

    // 現在のブランチを取得
    const { stdout: branchOutput } = await execAsync('git branch --show-current', { cwd: projectRoot })
    const currentBranch = branchOutput.trim()

    // VPS (実行中の環境) のコミット情報
    const { stdout: vpsCommit } = await execAsync('git rev-parse HEAD', { cwd: projectRoot })
    const { stdout: vpsCommitShort } = await execAsync('git rev-parse --short HEAD', { cwd: projectRoot })
    const { stdout: vpsMessage } = await execAsync('git log -1 --pretty=format:"%s"', { cwd: projectRoot })

    // Git (GitHub) のコミット情報
    await execAsync(`git fetch origin ${currentBranch}`, { cwd: projectRoot })
    const { stdout: gitCommit } = await execAsync(`git rev-parse origin/${currentBranch}`, { cwd: projectRoot })
    const { stdout: gitCommitShort } = await execAsync(`git rev-parse --short origin/${currentBranch}`, { cwd: projectRoot })
    const { stdout: gitMessage } = await execAsync(`git log origin/${currentBranch} -1 --pretty=format:"%s"`, { cwd: projectRoot })

    // 未コミットの変更をチェック
    const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: projectRoot })
    const hasUncommitted = statusOutput.trim().length > 0
    const uncommittedFiles = statusOutput.trim().split('\n').filter(line => line).length

    // 同期状態を判定
    const vpsGitSync = vpsCommit.trim() === gitCommit.trim()

    let overallStatus: 'synced' | 'vps-outdated' | 'uncommitted' | 'unknown'
    let statusMessage: string
    let nextAction: string | null = null

    if (hasUncommitted) {
      overallStatus = 'uncommitted'
      statusMessage = 'VPSに未コミットの変更があります'
      nextAction = 'git add . && git commit -m "message" && git push'
    } else if (!vpsGitSync) {
      overallStatus = 'vps-outdated'
      statusMessage = 'VPSがGitより古い状態です'
      nextAction = 'git pull && npm run build && pm2 restart n3-frontend'
    } else {
      overallStatus = 'synced'
      statusMessage = '完全同期済み'
      nextAction = null
    }

    return NextResponse.json({
      branch: currentBranch,
      status: overallStatus,
      message: statusMessage,
      nextAction,
      environments: {
        vps: {
          commit: vpsCommitShort.trim(),
          commitFull: vpsCommit.trim(),
          message: vpsMessage.trim(),
          uncommitted: hasUncommitted,
          uncommittedCount: uncommittedFiles,
          status: hasUncommitted ? 'uncommitted' : (vpsGitSync ? 'synced' : 'outdated')
        },
        git: {
          commit: gitCommitShort.trim(),
          commitFull: gitCommit.trim(),
          message: gitMessage.trim(),
          status: 'reference'
        }
      },
      sync: {
        vpsGit: vpsGitSync
      }
    })
  } catch (error: any) {
    console.error('Sync status check error:', error)
    return NextResponse.json(
      {
        error: '同期状態の確認に失敗しました',
        details: error.message
      },
      { status: 500 }
    )
  }
}
