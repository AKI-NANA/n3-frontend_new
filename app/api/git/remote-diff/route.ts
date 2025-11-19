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
    console.log('Current branch:', currentBranch)

    // リモートから最新情報を取得
    await execAsync(`git fetch origin ${currentBranch}`, { cwd: projectRoot })

    // リモートブランチが存在するか確認
    let remoteBranch = `origin/${currentBranch}`
    try {
      await execAsync(`git rev-parse --verify ${remoteBranch}`, { cwd: projectRoot })
      console.log('Remote branch exists:', remoteBranch)
    } catch (error) {
      console.log('Remote branch does not exist, falling back to origin/main')
      remoteBranch = 'origin/main'
      await execAsync('git fetch origin main', { cwd: projectRoot })
    }

    // リモートにあってローカルにないファイルを取得
    const { stdout: remoteOnlyFiles } = await execAsync(
      `git diff --name-only HEAD ${remoteBranch}`,
      { cwd: projectRoot }
    )

    // リモートにある全ファイル一覧を取得
    const { stdout: remoteFiles } = await execAsync(
      `git ls-tree -r ${remoteBranch} --name-only`,
      { cwd: projectRoot }
    )

    // ローカルにある全ファイル一覧を取得
    const { stdout: localFiles } = await execAsync(
      'git ls-tree -r HEAD --name-only',
      { cwd: projectRoot }
    )

    const remoteFilesList = remoteFiles.trim().split('\n').filter(f => f)
    const localFilesList = localFiles.trim().split('\n').filter(f => f)
    
    console.log('Remote files count:', remoteFilesList.length)
    console.log('Local files count:', localFilesList.length)

    // リモートにのみ存在するファイル
    const onlyInRemote = remoteFilesList.filter(
      file => !localFilesList.includes(file)
    )

    // ローカルにのみ存在するファイル
    const onlyInLocal = localFilesList.filter(
      file => !remoteFilesList.includes(file)
    )

    console.log('Only in remote:', onlyInRemote.length)
    console.log('Only in local:', onlyInLocal.length)

    // 差分があるファイル（両方に存在するが内容が異なる）
    const modifiedFiles = remoteOnlyFiles
      .trim()
      .split('\n')
      .filter(f => f && !onlyInRemote.includes(f) && !onlyInLocal.includes(f))

    console.log('Modified files:', modifiedFiles.length)

    return NextResponse.json({
      success: true,
      branch: currentBranch,
      remoteBranch,
      onlyInRemote,
      onlyInLocal,
      modifiedFiles,
      totalRemoteFiles: remoteFilesList.length,
      totalLocalFiles: localFilesList.length,
    })
  } catch (error: any) {
    console.error('Remote diff error:', error)
    return NextResponse.json(
      { error: 'リモート差分の取得に失敗しました', details: error.message },
      { status: 500 }
    )
  }
}
