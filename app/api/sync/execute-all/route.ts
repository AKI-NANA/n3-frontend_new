/**
 * 一括同期実行API
 * POST /api/sync/execute-all
 *
 * Git Push/Pull、Drive同期チェック、VPSスナップショットを実行
 */

import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

interface ExecuteRequest {
  action: 'git-push' | 'git-pull' | 'drive-check' | 'vps-snapshot'
}

export async function POST(req: NextRequest) {
  try {
    const body: ExecuteRequest = await req.json()
    const { action } = body

    if (!action) {
      return NextResponse.json(
        { error: 'actionパラメータが必要です' },
        { status: 400 }
      )
    }

    let result: any

    switch (action) {
      case 'git-push':
        result = await executeGitPush()
        break
      case 'git-pull':
        result = await executeGitPull()
        break
      case 'drive-check':
        result = await executeDriveCheck()
        break
      case 'vps-snapshot':
        result = await executeVPSSnapshot()
        break
      default:
        return NextResponse.json(
          { error: '無効なアクションです' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('同期実行エラー:', error)
    return NextResponse.json(
      { error: `実行失敗: ${error.message}` },
      { status: 500 }
    )
  }
}

/**
 * Git Push実行
 * ローカルの全Gitリポジトリに対してgit pushを実行
 */
async function executeGitPush() {
  try {
    const repos = await findGitRepositories()

    const results = []
    let successCount = 0
    let errorCount = 0

    for (const repo of repos) {
      try {
        // 変更があるかチェック
        const { stdout: statusOutput } = await execAsync('git status --porcelain', {
          cwd: repo
        })

        // コミットされていない変更がある場合はスキップ
        if (statusOutput.trim()) {
          results.push({
            repo,
            status: 'skipped',
            message: 'コミットされていない変更があります'
          })
          continue
        }

        // git push実行
        const { stdout, stderr } = await execAsync('git push', {
          cwd: repo,
          timeout: 30000
        })

        successCount++
        results.push({
          repo,
          status: 'success',
          message: 'プッシュ成功',
          output: stdout || stderr
        })

      } catch (error: any) {
        errorCount++
        results.push({
          repo,
          status: 'error',
          message: error.message
        })
      }
    }

    return {
      success: errorCount === 0,
      message: `Git Push完了: ${successCount}件成功, ${errorCount}件エラー`,
      details: results
    }

  } catch (error: any) {
    return {
      success: false,
      message: `Git Push失敗: ${error.message}`
    }
  }
}

/**
 * Git Pull実行
 * ローカルの全Gitリポジトリに対してgit pullを実行
 */
async function executeGitPull() {
  try {
    const repos = await findGitRepositories()

    const results = []
    let successCount = 0
    let errorCount = 0

    for (const repo of repos) {
      try {
        // git pull実行
        const { stdout, stderr } = await execAsync('git pull', {
          cwd: repo,
          timeout: 30000
        })

        successCount++
        results.push({
          repo,
          status: 'success',
          message: 'プル成功',
          output: stdout || stderr
        })

      } catch (error: any) {
        errorCount++
        results.push({
          repo,
          status: 'error',
          message: error.message
        })
      }
    }

    return {
      success: errorCount === 0,
      message: `Git Pull完了: ${successCount}件成功, ${errorCount}件エラー`,
      details: results
    }

  } catch (error: any) {
    return {
      success: false,
      message: `Git Pull失敗: ${error.message}`
    }
  }
}

/**
 * Drive同期チェック
 * Google Drive/Dropboxの同期状態を確認
 */
async function executeDriveCheck() {
  try {
    // Google Driveのパスをチェック
    const homeDir = os.homedir()
    const drivePaths = [
      path.join(homeDir, 'Google Drive'),
      path.join(homeDir, 'GoogleDrive'),
      path.join(homeDir, 'Dropbox')
    ]

    const foundDrives: string[] = []

    for (const drivePath of drivePaths) {
      try {
        const { stdout } = await execAsync(`test -d "${drivePath}" && echo "exists"`)
        if (stdout.trim() === 'exists') {
          foundDrives.push(drivePath)
        }
      } catch (error) {
        // ディレクトリが存在しない場合は無視
      }
    }

    if (foundDrives.length === 0) {
      return {
        success: true,
        message: 'ローカル環境でDriveフォルダが見つかりませんでした（VPS環境の可能性があります）',
        details: {
          foundDrives: [],
          recommendation: 'VPS環境ではDrive同期は不要です'
        }
      }
    }

    return {
      success: true,
      message: `Drive同期確認完了: ${foundDrives.length}個のDriveフォルダを検出`,
      details: {
        foundDrives,
        recommendation: 'Driveの同期設定を確認し、オンデマンドモードを有効にすることをお勧めします'
      }
    }

  } catch (error: any) {
    return {
      success: false,
      message: `Drive同期チェック失敗: ${error.message}`
    }
  }
}

/**
 * VPSスナップショット実行
 * VPS側でDBとコードのバックアップをトリガー
 */
async function executeVPSSnapshot() {
  try {
    // 既存のVPS APIエンドポイントを呼び出す（存在する場合）
    // TODO: 実際のVPS APIエンドポイント（/api/sync/execute-full-backup）を実装後に有効化

    // プレースホルダー実装: 将来の拡張に備えた構造
    const vpsApiUrl = process.env.VPS_API_URL || 'http://localhost:3000'
    const backupEndpoint = `${vpsApiUrl}/api/backup/create-snapshot`

    // 本番環境の場合は実際のAPIを呼び出す
    if (process.env.NODE_ENV === 'production' && process.env.VPS_API_URL) {
      try {
        const response = await fetch(backupEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.VPS_API_KEY || ''}`
          },
          body: JSON.stringify({
            type: 'full',
            includeDB: true,
            includeCode: true
          })
        })

        const data = await response.json()

        if (data.success) {
          return {
            success: true,
            message: 'VPSスナップショット作成成功',
            details: {
              snapshotId: data.snapshotId,
              timestamp: new Date().toISOString(),
              type: 'full'
            }
          }
        } else {
          throw new Error(data.message || 'スナップショット作成失敗')
        }

      } catch (error: any) {
        return {
          success: false,
          message: `VPSスナップショット失敗: ${error.message}`
        }
      }
    }

    // 開発環境またはVPS APIが未設定の場合はモックレスポンス
    return {
      success: true,
      message: 'VPSスナップショット作成完了（開発モード）',
      details: {
        snapshotId: `mock-snapshot-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'full',
        note: '本番環境ではVPS_API_URLとVPS_API_KEYを設定してください'
      }
    }

  } catch (error: any) {
    return {
      success: false,
      message: `VPSスナップショット失敗: ${error.message}`
    }
  }
}

/**
 * Gitリポジトリを検索
 */
async function findGitRepositories(): Promise<string[]> {
  try {
    const homeDir = os.homedir()
    const searchDirs = [
      path.join(homeDir, 'Documents'),
      path.join(homeDir, 'Projects'),
      path.join(homeDir, 'Desktop'),
      process.cwd() // 現在の作業ディレクトリも含める
    ]

    const repos: string[] = []

    for (const searchDir of searchDirs) {
      try {
        const { stdout } = await execAsync(
          `find "${searchDir}" -maxdepth 3 -type d -name ".git" 2>/dev/null`,
          { timeout: 10000 }
        )

        const gitDirs = stdout.trim().split('\n').filter(Boolean)

        for (const gitDir of gitDirs) {
          const repoDir = path.dirname(gitDir)
          if (!repos.includes(repoDir)) {
            repos.push(repoDir)
          }
        }
      } catch (error) {
        // ディレクトリが存在しない場合は無視
        continue
      }
    }

    // 重複を削除
    return [...new Set(repos)]

  } catch (error: any) {
    console.error('リポジトリ検索エラー:', error)
    // フォールバック: 現在のディレクトリのみを返す
    return [process.cwd()]
  }
}
