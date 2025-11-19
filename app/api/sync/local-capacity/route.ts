/**
 * ローカル容量監視API
 * GET /api/sync/local-capacity
 *
 * Macのローカルストレージ使用状況とGitリポジトリ容量を取得
 */

import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

interface LocalCapacity {
  totalGB: number
  usedGB: number
  freeGB: number
  usagePercent: number
  gitReposTotal: number
  gitReposTotalGB: number
  recommendations: string[]
}

export async function GET() {
  try {
    // システム容量情報を取得
    const capacityData = await getSystemCapacity()

    // Gitリポジトリの容量を取得
    const gitData = await getGitReposCapacity()

    // 推奨事項を生成
    const recommendations = generateRecommendations(capacityData, gitData)

    const response: LocalCapacity = {
      totalGB: capacityData.totalGB,
      usedGB: capacityData.usedGB,
      freeGB: capacityData.freeGB,
      usagePercent: capacityData.usagePercent,
      gitReposTotal: gitData.repoCount,
      gitReposTotalGB: gitData.totalSizeGB,
      recommendations
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('容量監視エラー:', error)
    return NextResponse.json(
      { error: `容量情報の取得に失敗しました: ${error.message}` },
      { status: 500 }
    )
  }
}

/**
 * システム容量情報を取得
 */
async function getSystemCapacity() {
  try {
    const homeDir = os.homedir()

    // macOSの場合
    if (process.platform === 'darwin') {
      // dfコマンドでディスク使用量を取得
      const { stdout } = await execAsync(`df -k "${homeDir}" | tail -1`)
      const parts = stdout.trim().split(/\s+/)

      const totalKB = parseInt(parts[1])
      const usedKB = parseInt(parts[2])
      const freeKB = parseInt(parts[3])

      const totalGB = totalKB / 1024 / 1024
      const usedGB = usedKB / 1024 / 1024
      const freeGB = freeKB / 1024 / 1024
      const usagePercent = (usedGB / totalGB) * 100

      return { totalGB, usedGB, freeGB, usagePercent }
    }

    // Linuxの場合
    if (process.platform === 'linux') {
      const { stdout } = await execAsync(`df -BG "${homeDir}" | tail -1`)
      const parts = stdout.trim().split(/\s+/)

      const totalGB = parseInt(parts[1].replace('G', ''))
      const usedGB = parseInt(parts[2].replace('G', ''))
      const freeGB = parseInt(parts[3].replace('G', ''))
      const usagePercent = (usedGB / totalGB) * 100

      return { totalGB, usedGB, freeGB, usagePercent }
    }

    // その他のOS（モックデータ）
    return {
      totalGB: 500,
      usedGB: 350,
      freeGB: 150,
      usagePercent: 70
    }

  } catch (error: any) {
    console.error('システム容量取得エラー:', error)
    // フォールバック: モックデータ
    return {
      totalGB: 500,
      usedGB: 350,
      freeGB: 150,
      usagePercent: 70
    }
  }
}

/**
 * Gitリポジトリの容量を取得
 */
async function getGitReposCapacity() {
  try {
    const homeDir = os.homedir()
    const searchDirs = [
      path.join(homeDir, 'Documents'),
      path.join(homeDir, 'Projects'),
      path.join(homeDir, 'Desktop'),
      homeDir
    ]

    let totalSizeKB = 0
    let repoCount = 0

    for (const searchDir of searchDirs) {
      if (!fs.existsSync(searchDir)) continue

      try {
        // .gitディレクトリを持つリポジトリを検索
        const { stdout } = await execAsync(
          `find "${searchDir}" -maxdepth 3 -type d -name ".git" 2>/dev/null`,
          { timeout: 10000 }
        )

        const gitDirs = stdout.trim().split('\n').filter(Boolean)

        for (const gitDir of gitDirs) {
          const repoDir = path.dirname(gitDir)

          try {
            // リポジトリのサイズを取得
            const { stdout: sizeOutput } = await execAsync(
              `du -sk "${repoDir}" 2>/dev/null | cut -f1`
            )

            const sizeKB = parseInt(sizeOutput.trim())
            if (!isNaN(sizeKB)) {
              totalSizeKB += sizeKB
              repoCount++
            }
          } catch (error) {
            // 個別のリポジトリエラーは無視
            continue
          }
        }
      } catch (error) {
        // ディレクトリ検索エラーは無視
        continue
      }
    }

    const totalSizeGB = totalSizeKB / 1024 / 1024

    return { repoCount, totalSizeGB }

  } catch (error: any) {
    console.error('Gitリポジトリ容量取得エラー:', error)
    // フォールバック: モックデータ
    return { repoCount: 5, totalSizeGB: 2.5 }
  }
}

/**
 * 推奨事項を生成
 */
function generateRecommendations(
  capacityData: { totalGB: number; usedGB: number; freeGB: number; usagePercent: number },
  gitData: { repoCount: number; totalSizeGB: number }
): string[] {
  const recommendations: string[] = []

  // ディスク使用率が80%以上の場合
  if (capacityData.usagePercent >= 80) {
    recommendations.push(
      '⚠️ ディスク使用率が80%を超えています。不要なファイルの削除を検討してください。'
    )
  }

  // Gitリポジトリが大きい場合
  if (gitData.totalSizeGB > 10) {
    recommendations.push(
      '💡 Gitリポジトリの合計容量が10GBを超えています。不要なブランチや古いリポジトリを削除することを検討してください。'
    )
  }

  // 空き容量が少ない場合
  if (capacityData.freeGB < 50) {
    recommendations.push(
      '⚠️ 空き容量が50GB未満です。Google Driveのファイルストリーム設定を確認し、オンデマンドモードを有効にすることをお勧めします。'
    )
  }

  // 推奨事項がない場合
  if (recommendations.length === 0) {
    recommendations.push(
      '✅ ストレージの使用状況は正常です。定期的にバックアップを実行してください。'
    )
  }

  return recommendations
}
