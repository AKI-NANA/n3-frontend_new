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
      // 安全モード: 通常のGit開発フロー

      if (hasChanges) {
        steps.push('⚠️ ローカルに未コミットの変更があります')

        // 1. 変更を自動コミット
        steps.push('1️⃣ ローカル変更を自動コミット中...')
        try {
          await execAsync('git add .', { cwd: projectRoot })
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const { stdout: commitOut } = await execAsync(
            `git commit -m "auto: 同期前の自動保存 (${timestamp})"`,
            { cwd: projectRoot }
          )
          outputs.push(`コミット結果: ${commitOut}`)
          steps.push('✅ ローカル変更をコミットしました')
        } catch (error: any) {
          outputs.push(`コミット情報: ${error.message}`)
          steps.push('ℹ️ コミット不要でした')
        }

        // 2. ローカルをGitにプッシュ（重要！先にGitに保存）
        steps.push('2️⃣ ローカル変更をGitにプッシュ中...')
        try {
          const { stdout: pushOut } = await execAsync(
            `git push origin ${currentBranch}`,
            { cwd: projectRoot }
          )
          outputs.push(`プッシュ結果: ${pushOut}`)
          steps.push('✅ ローカルデータをGitに保存しました')
        } catch (error: any) {
          outputs.push(`プッシュ情報: ${error.message}`)
          steps.push('ℹ️ プッシュ不要でした（すでに最新）')
        }
      } else {
        steps.push('ℹ️ ローカルに変更はありません')
      }

      // 3. Gitから最新を取得
      steps.push('3️⃣ Gitから最新データを取得中...')
      try {
        const { stdout: pullOut } = await execAsync(`git pull --rebase origin ${currentBranch}`, {
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
          message: '✅ Git同期完了！すべての変更はGitのコミット履歴に保存されています。',
          steps,
          outputs,
          recovery: 'もし問題があれば: git reflog で履歴を確認し、git reset --hard HEAD@{n} で復元できます'
        })
      } catch (error: any) {
        steps.push('❌ 同期に失敗しました')
        outputs.push(`エラー: ${error.message}`)

        return NextResponse.json({
          success: false,
          error: 'Git同期に失敗しました',
          steps,
          outputs,
          recovery: 'git reflog で履歴を確認してください'
        })
      }

    } else if (mode === 'force') {
      // 上書きモード: ローカル変更を破棄してGitに合わせる

      if (hasChanges) {
        steps.push('⚠️ ローカルに未コミットの変更があります')
        steps.push('⚠️ これらの変更は破棄されます')

        // ローカル変更を破棄
        steps.push('1️⃣ ローカル変更を破棄します...')
        const { stdout: resetOut } = await execAsync('git reset --hard HEAD', {
          cwd: projectRoot
        })
        outputs.push(`Reset結果: ${resetOut}`)
        steps.push('✅ ローカル変更を破棄しました')
      } else {
        steps.push('ℹ️ ローカルに変更はありません')
      }

      // Gitから最新を取得
      steps.push('2️⃣ Gitから最新データを取得中...')
      const { stdout: pullOut } = await execAsync(`git pull origin ${currentBranch}`, {
        cwd: projectRoot
      })
      outputs.push(`Pull結果: ${pullOut}`)
      steps.push('✅ 最新データを取得しました')

      return NextResponse.json({
        success: true,
        message: '✅ 上書き同期完了！Gitと完全一致しています。',
        steps,
        outputs
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
