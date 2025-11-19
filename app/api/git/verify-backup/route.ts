import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * GitHubバックアップ検証API
 * 指定されたブランチがGitHub上に存在するか確認
 */
export async function POST(request: Request) {
  try {
    const { branchName } = await request.json()

    if (!branchName) {
      return NextResponse.json(
        { success: false, error: 'ブランチ名が指定されていません' },
        { status: 400 }
      )
    }

    // GitHub上のブランチ一覧を取得
    const { stdout: remoteBranches } = await execAsync(
      `cd /Users/aritahiroaki/n3-frontend_new && git ls-remote --heads origin ${branchName}`
    )

    if (!remoteBranches.includes(branchName)) {
      return NextResponse.json({
        success: false,
        exists: false,
        message: `❌ GitHub上にブランチ「${branchName}」が見つかりません`
      })
    }

    // ローカルとリモートのコミットハッシュを取得
    const { stdout: localHash } = await execAsync(
      `cd /Users/aritahiroaki/n3-frontend_new && git rev-parse ${branchName}`
    )
    const { stdout: remoteHash } = await execAsync(
      `cd /Users/aritahiroaki/n3-frontend_new && git rev-parse origin/${branchName}`
    )

    const isMatch = localHash.trim() === remoteHash.trim()

    // ブランチの詳細情報を取得
    const { stdout: branchInfo } = await execAsync(
      `cd /Users/aritahiroaki/n3-frontend_new && git log origin/${branchName} -1 --format="%H%n%an%n%ae%n%at%n%s"`
    )

    const [commitHash, authorName, authorEmail, timestamp, commitMessage] = branchInfo.trim().split('\n')
    const commitDate = new Date(parseInt(timestamp) * 1000).toLocaleString('ja-JP')

    return NextResponse.json({
      success: true,
      exists: true,
      verified: isMatch,
      data: {
        branchName,
        commitHash: commitHash.trim(),
        commitHashShort: commitHash.trim().substring(0, 8),
        localHash: localHash.trim(),
        remoteHash: remoteHash.trim(),
        isMatch,
        authorName,
        authorEmail,
        commitDate,
        commitMessage,
        githubUrl: `https://github.com/AKI-NANA/n3-frontend_new/tree/${branchName}`,
        message: isMatch 
          ? `✅ GitHub上にバックアップが存在し、ローカルと一致しています` 
          : `⚠️ バックアップは存在しますが、ローカルと一致しません`
      }
    })

  } catch (error) {
    console.error('Verify backup error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'バックアップの確認に失敗しました' 
      },
      { status: 500 }
    )
  }
}
