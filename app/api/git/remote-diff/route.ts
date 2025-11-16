import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    // リモートから最新情報を取得
    await execAsync('git fetch origin')

    // リモートにあってローカルにないファイルを取得
    const { stdout: remoteOnlyFiles } = await execAsync(
      'git diff --name-only HEAD origin/main'
    )

    // リモートにある全ファイル一覧を取得
    const { stdout: remoteFiles } = await execAsync(
      'git ls-tree -r origin/main --name-only'
    )

    // ローカルにある全ファイル一覧を取得
    const { stdout: localFiles } = await execAsync(
      'git ls-tree -r HEAD --name-only'
    )

    const remoteFilesList = remoteFiles.trim().split('\n').filter(f => f)
    const localFilesList = localFiles.trim().split('\n').filter(f => f)
    
    // リモートにのみ存在するファイル
    const onlyInRemote = remoteFilesList.filter(
      file => !localFilesList.includes(file)
    )

    // ローカルにのみ存在するファイル
    const onlyInLocal = localFilesList.filter(
      file => !remoteFilesList.includes(file)
    )

    // 差分があるファイル
    const modifiedFiles = remoteOnlyFiles
      .trim()
      .split('\n')
      .filter(f => f && !onlyInRemote.includes(f) && !onlyInLocal.includes(f))

    return NextResponse.json({
      success: true,
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
