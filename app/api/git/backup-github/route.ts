import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * GitHubバックアップAPI
 * n3-frontend_newリポジトリのみをバックアップ
 * 全リポジトリではなく、このプロジェクト専用
 */
export async function POST() {
  try {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const branchName = `backup-before-cleanup-${timestamp}`

    // 現在のブランチを確認
    const { stdout: currentBranch } = await execAsync(
      'cd /Users/aritahiroaki/n3-frontend_new && git branch --show-current'
    )
    
    // 既存のローカルブランチを削除
    try {
      await execAsync(
        `cd /Users/aritahiroaki/n3-frontend_new && git branch -D ${branchName}`
      )
    } catch (error) {
      console.log('Local branch does not exist, skipping deletion')
    }
    
    // 既存のリモートブランチを削除
    try {
      await execAsync(
        `cd /Users/aritahiroaki/n3-frontend_new && git push origin --delete ${branchName}`
      )
    } catch (error) {
      console.log('Remote branch does not exist, skipping deletion')
    }
    
    // バックアップブランチを作成（n3-frontend_newリポジトリのみ）
    await execAsync(
      `cd /Users/aritahiroaki/n3-frontend_new && git branch ${branchName}`
    )
    
    // GitHubにプッシュ（n3-frontend_newリポジトリのみ）
    await execAsync(
      `cd /Users/aritahiroaki/n3-frontend_new && git push origin ${branchName}`
    )

    // ✅ 重要: GitHub上にブランチが存在するか検証
    const { stdout: remoteBranches } = await execAsync(
      `cd /Users/aritahiroaki/n3-frontend_new && git ls-remote --heads origin ${branchName}`
    )

    if (!remoteBranches.includes(branchName)) {
      throw new Error(`GitHub上にブランチ${branchName}が見つかりません`)
    }

    // ローカルとリモートのコミットハッシュを比較
    const { stdout: localHash } = await execAsync(
      `cd /Users/aritahiroaki/n3-frontend_new && git rev-parse ${branchName}`
    )
    const { stdout: remoteHash } = await execAsync(
      `cd /Users/aritahiroaki/n3-frontend_new && git rev-parse origin/${branchName}`
    )

    if (localHash.trim() !== remoteHash.trim()) {
      throw new Error('ローカルとGitHubのコミットハッシュが一致しません')
    }

    return NextResponse.json({
      success: true,
      data: {
        branchName,
        currentBranch: currentBranch.trim(),
        repository: 'n3-frontend_new',
        repositoryUrl: 'https://github.com/AKI-NANA/n3-frontend_new',
        commitHash: localHash.trim(),
        verified: true,
        message: `✅ GitHubバックアップが成功し、検証されました: ${branchName}`
      }
    })

  } catch (error) {
    console.error('GitHub backup error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'GitHubバックアップに失敗しました' 
      },
      { status: 500 }
    )
  }
}
