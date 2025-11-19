import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * mainブランチを完全リセットAPI
 * バックアップブランチから新しいmainを作成し、不要ファイルを削除
 */
export async function POST(request: Request) {
  try {
    const { backupBranchName } = await request.json()

    if (!backupBranchName) {
      return NextResponse.json(
        { success: false, error: 'バックアップブランチ名が指定されていません' },
        { status: 400 }
      )
    }

    const workDir = '/Users/aritahiroaki/n3-frontend_new'

    // 1. 現在の状態を確認
    const { stdout: currentBranch } = await execAsync(
      `cd ${workDir} && git branch --show-current`
    )

    if (currentBranch.trim() !== 'main') {
      return NextResponse.json(
        { success: false, error: `現在のブランチがmainではありません: ${currentBranch.trim()}` },
        { status: 400 }
      )
    }

    // 2. バックアップブランチの存在確認
    try {
      await execAsync(`cd ${workDir} && git rev-parse ${backupBranchName}`)
    } catch {
      return NextResponse.json(
        { success: false, error: `バックアップブランチ ${backupBranchName} が見つかりません` },
        { status: 404 }
      )
    }

    // 3. 変更をすべてコミット（未コミットの変更があれば）
    try {
      await execAsync(`cd ${workDir} && git add -A && git commit -m "backup: 作業中の変更を保存" || true`)
    } catch {
      // コミットするものがない場合はスキップ
    }

    // 4. バックアップブランチから新しいクリーンブランチを作成
    await execAsync(`cd ${workDir} && git checkout ${backupBranchName}`)
    await execAsync(`cd ${workDir} && git checkout -b main-clean`)

    // 5. 不要ファイルを削除
    const filesToDelete = [
      '*.bak',
      '*.original',
      '*_old.*',
      '*_backup.*',
      '_archive/'
    ]

    let deletedFiles: string[] = []
    for (const pattern of filesToDelete) {
      try {
        const { stdout } = await execAsync(
          `cd ${workDir} && git rm -r "${pattern}" 2>/dev/null || true`
        )
        if (stdout.trim()) {
          deletedFiles.push(...stdout.trim().split('\n'))
        }
      } catch {
        // ファイルが存在しない場合はスキップ
      }
    }

    // 6. 削除をコミット
    if (deletedFiles.length > 0) {
      await execAsync(`cd ${workDir} && git commit -m "clean: 不要ファイルを削除 (${deletedFiles.length}件)"`)
    }

    // 7. 古いmainブランチを削除
    await execAsync(`cd ${workDir} && git branch -D main`)

    // 8. main-cleanをmainにリネーム
    await execAsync(`cd ${workDir} && git branch -m main-clean main`)

    // 9. GitHubに強制プッシュ
    await execAsync(`cd ${workDir} && git push -f origin main`)

    // 10. 最終状態を確認
    const { stdout: finalBranch } = await execAsync(`cd ${workDir} && git branch --show-current`)
    const { stdout: fileCount } = await execAsync(`cd ${workDir} && git ls-files | wc -l`)

    return NextResponse.json({
      success: true,
      data: {
        message: '✅ mainブランチを完全リセットしました',
        currentBranch: finalBranch.trim(),
        deletedFiles: deletedFiles.length,
        remainingFiles: parseInt(fileCount.trim()),
        backupBranch: backupBranchName,
        steps: [
          `✅ バックアップブランチから新しいmainを作成`,
          `✅ 不要ファイルを削除 (${deletedFiles.length}件)`,
          `✅ 古いmainブランチを削除`,
          `✅ GitHubに強制プッシュ`
        ]
      }
    })

  } catch (error) {
    console.error('Reset main branch error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'mainブランチのリセットに失敗しました' 
      },
      { status: 500 }
    )
  }
}
