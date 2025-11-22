import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface DiffFile {
  path: string
  status: 'local-only' | 'remote-only' | 'modified' | 'conflict'
  localHash?: string
  remoteHash?: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'check-diff') {
      return await checkDiff()
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Local sync error:', error)
    return NextResponse.json(
      {
        success: false,
        message: `エラーが発生しました: ${error.message}`,
        details: error.stderr || error.message
      },
      { status: 500 }
    )
  }
}

async function checkDiff() {
  const projectRoot = process.cwd()

  try {
    // 1. 現在のブランチを取得
    const { stdout: branchOutput } = await execAsync('git branch --show-current', { cwd: projectRoot })
    const localBranch = branchOutput.trim()

    // 2. リモートから最新情報を取得（fetch）
    await execAsync('git fetch origin', { cwd: projectRoot })

    // 3. リモートブランチ名を取得
    const { stdout: remoteBranchOutput } = await execAsync(
      `git rev-parse --abbrev-ref ${localBranch}@{upstream}`,
      { cwd: projectRoot }
    )
    const remoteBranch = remoteBranchOutput.trim().replace('origin/', '')

    // 4. ローカルとリモートのコミット数を比較
    const { stdout: localCommitsOutput } = await execAsync(
      `git rev-list --count ${localBranch} ^origin/${remoteBranch}`,
      { cwd: projectRoot }
    )
    const localCommits = parseInt(localCommitsOutput.trim(), 10)

    const { stdout: remoteCommitsOutput } = await execAsync(
      `git rev-list --count origin/${remoteBranch} ^${localBranch}`,
      { cwd: projectRoot }
    )
    const remoteCommits = parseInt(remoteCommitsOutput.trim(), 10)

    // 5. 分岐しているかチェック
    const diverged = localCommits > 0 && remoteCommits > 0

    // 6. ファイル差分を取得
    const files: DiffFile[] = []

    // 6a. ローカルのみに存在するファイル（ステージング含む）
    const { stdout: localOnlyOutput } = await execAsync(
      'git ls-files --others --exclude-standard',
      { cwd: projectRoot }
    )
    const localOnlyFiles = localOnlyOutput.trim().split('\n').filter(f => f)
    for (const file of localOnlyFiles) {
      files.push({
        path: file,
        status: 'local-only'
      })
    }

    // 6b. ローカルでコミット済みだがリモートにないファイル
    if (localCommits > 0) {
      const { stdout: localCommittedOutput } = await execAsync(
        `git diff --name-only origin/${remoteBranch}...${localBranch}`,
        { cwd: projectRoot }
      )
      const localCommittedFiles = localCommittedOutput.trim().split('\n').filter(f => f)
      for (const file of localCommittedFiles) {
        // すでにlocal-onlyに含まれていないかチェック
        if (!files.find(f => f.path === file)) {
          // リモートに存在するかチェック
          try {
            await execAsync(
              `git cat-file -e origin/${remoteBranch}:${file}`,
              { cwd: projectRoot }
            )
            // リモートにも存在 = 変更されている
            files.push({
              path: file,
              status: 'modified'
            })
          } catch {
            // リモートに存在しない = ローカルのみ
            files.push({
              path: file,
              status: 'local-only'
            })
          }
        }
      }
    }

    // 6c. リモートのみに存在するファイル
    if (remoteCommits > 0) {
      const { stdout: remoteOnlyOutput } = await execAsync(
        `git diff --name-only ${localBranch}...origin/${remoteBranch}`,
        { cwd: projectRoot }
      )
      const remoteOnlyFiles = remoteOnlyOutput.trim().split('\n').filter(f => f)
      for (const file of remoteOnlyFiles) {
        // すでに処理済みでないかチェック
        const existing = files.find(f => f.path === file)
        if (!existing) {
          // ローカルに存在するかチェック
          try {
            await execAsync(`git cat-file -e ${localBranch}:${file}`, { cwd: projectRoot })
            // ローカルにも存在 = 変更されている（既に処理済みのはず）
            files.push({
              path: file,
              status: 'modified'
            })
          } catch {
            // ローカルに存在しない = リモートのみ
            files.push({
              path: file,
              status: 'remote-only'
            })
          }
        }
      }
    }

    // 6d. 両方で変更されているファイル（コンフリクトの可能性）
    if (diverged) {
      const { stdout: conflictCheckOutput } = await execAsync(
        `git diff --name-only ${localBranch} origin/${remoteBranch}`,
        { cwd: projectRoot }
      )
      const potentialConflicts = conflictCheckOutput.trim().split('\n').filter(f => f)

      for (const file of potentialConflicts) {
        const existing = files.find(f => f.path === file)
        if (existing && existing.status === 'modified') {
          // 両方で変更されている = 潜在的なコンフリクト
          existing.status = 'conflict'
        }
      }
    }

    // 7. ローカルで変更されているが未コミットのファイル
    const { stdout: modifiedOutput } = await execAsync(
      'git status --porcelain',
      { cwd: projectRoot }
    )
    const modifiedFiles = modifiedOutput.trim().split('\n').filter(f => f)
    for (const line of modifiedFiles) {
      if (!line.trim()) continue
      const file = line.substring(3)
      const existing = files.find(f => f.path === file)
      if (!existing) {
        files.push({
          path: file,
          status: 'local-only'
        })
      }
    }

    // 重複を除去
    const uniqueFiles = files.filter((file, index, self) =>
      index === self.findIndex(f => f.path === file.path)
    )

    const status = {
      localBranch,
      remoteBranch,
      localCommits,
      remoteCommits,
      diverged,
      files: uniqueFiles
    }

    return NextResponse.json({
      success: true,
      status
    })

  } catch (error: any) {
    console.error('Check diff error:', error)
    throw error
  }
}
