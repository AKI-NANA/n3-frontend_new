import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    const { mode } = await request.json()
    const projectRoot = process.cwd()

    let steps: string[] = []
    let outputs: string[] = []
    let backupBranch = ''

    // 現在のブランチを取得
    const { stdout: currentBranchOut } = await execAsync('git branch --show-current', {
      cwd: projectRoot
    })
    const currentBranch = currentBranchOut.trim()
    steps.push(`📍 現在のブランチ: ${currentBranch}`)

    // 変更があるかチェック
    const { stdout: statusOut } = await execAsync('git status --porcelain', {
      cwd: projectRoot
    })
    const hasChanges = statusOut.trim().length > 0

    if (mode === 'safe') {
      // 安全モード: データを絶対に失わない

      if (hasChanges) {
        steps.push('⚠️ ローカルに未コミットの変更があります')

        // 1. 変更を自動コミット
        steps.push('1️⃣ ローカル変更を自動コミット中...')
        try {
          await execAsync('git add .', { cwd: projectRoot })
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const { stdout: commitOut } = await execAsync(
            `git commit -m "backup: 同期前の自動保存 (${timestamp})"`,
            { cwd: projectRoot }
          )
          outputs.push(`コミット結果: ${commitOut}`)
          steps.push('✅ ローカル変更をコミットしました（データ保護完了）')
        } catch (error: any) {
          outputs.push(`コミット情報: ${error.message}`)
          steps.push('ℹ️ コミット不要でした')
        }

        // 2. バックアップブランチを作成
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
        backupBranch = `backup-${timestamp}`
        steps.push(`2️⃣ バックアップブランチを作成中: ${backupBranch}`)
        try {
          await execAsync(`git branch ${backupBranch}`, { cwd: projectRoot })
          steps.push(`✅ バックアップ完了: ${backupBranch}`)
          outputs.push(`バックアップブランチ: ${backupBranch}`)
        } catch (error: any) {
          outputs.push(`バックアップエラー: ${error.message}`)
        }
      } else {
        steps.push('ℹ️ ローカルに変更はありません（バックアップ不要）')
      }

      // 3. Gitから最新を取得
      steps.push('3️⃣ Gitから最新データを取得中...')
      try {
        const { stdout: pullOut } = await execAsync('git pull --rebase origin main', {
          cwd: projectRoot
        })
        outputs.push(`Pull結果: ${pullOut}`)

        if (pullOut.includes('Already up to date')) {
          steps.push('✅ すでに最新です')
        } else {
          steps.push('✅ 最新データを取得しました')
        }

        return NextResponse.json({
          success: true,
          message: hasChanges
            ? `✅ 安全同期完了！ローカル変更は保護されています。\nバックアップ: ${backupBranch}`
            : '✅ 安全同期完了！すでに最新でした。',
          steps,
          outputs,
          backupBranch: hasChanges ? backupBranch : null
        })
      } catch (error: any) {
        steps.push('❌ 同期に失敗しました')
        outputs.push(`エラー: ${error.message}`)

        return NextResponse.json({
          success: false,
          error: 'Git同期に失敗しました',
          steps,
          outputs,
          recovery: hasChanges
            ? `データは保護されています。\n復元方法: git checkout ${backupBranch}`
            : '変更はありませんでした。',
          backupBranch: hasChanges ? backupBranch : null
        })
      }

    } else if (mode === 'force') {
      // 上書きモード: でも一応バックアップを取る

      if (hasChanges) {
        steps.push('⚠️ ローカルに未コミットの変更があります')

        // 念のためバックアップブランチを作成
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
        backupBranch = `backup-before-reset-${timestamp}`
        steps.push(`1️⃣ 念のためバックアップブランチ作成: ${backupBranch}`)

        try {
          // まず現在の状態をコミット
          await execAsync('git add .', { cwd: projectRoot })
          await execAsync(
            `git commit -m "backup: reset前の自動保存 (${timestamp})"`,
            { cwd: projectRoot }
          )
          // バックアップブランチ作成
          await execAsync(`git branch ${backupBranch}`, { cwd: projectRoot })
          steps.push(`✅ バックアップ完了: ${backupBranch}（必要なら復元可能）`)
          outputs.push(`バックアップブランチ: ${backupBranch}`)
        } catch (error: any) {
          outputs.push(`バックアップエラー: ${error.message}`)
        }

        // ローカル変更を破棄
        steps.push('2️⃣ ローカル変更を破棄します...')
        const { stdout: resetOut } = await execAsync('git reset --hard HEAD', {
          cwd: projectRoot
        })
        outputs.push(`Reset結果: ${resetOut}`)
        steps.push('✅ ローカル変更を破棄しました')
      } else {
        steps.push('ℹ️ ローカルに変更はありません')
      }

      // Gitから最新を取得
      steps.push('3️⃣ Gitから最新データを取得中...')
      const { stdout: pullOut } = await execAsync('git pull origin main', {
        cwd: projectRoot
      })
      outputs.push(`Pull結果: ${pullOut}`)
      steps.push('✅ 最新データを取得しました')

      return NextResponse.json({
        success: true,
        message: hasChanges
          ? `✅ 上書き同期完了！Gitと完全一致しています。\n念のためバックアップ: ${backupBranch}`
          : '✅ 上書き同期完了！Gitと完全一致しています。',
        steps,
        outputs,
        backupBranch: hasChanges ? backupBranch : null
      })

    } else {
      return NextResponse.json(
        {
          success: false,
          error: '無効な同期モードです'
        },
        { status: 400 }
      )
    }

  } catch (error: any) {
    console.error('Git sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Git同期に失敗しました',
        details: error.message
      },
      { status: 500 }
    )
  }
}
