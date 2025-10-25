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

    // モードに応じた同期処理
    if (mode === 'safe') {
      // 安全モード: ローカル変更を一時保存
      steps.push('1️⃣ ローカル変更を一時保存中...')
      try {
        const { stdout: stashOut } = await execAsync('git stash push -m "Auto stash before sync"', {
          cwd: projectRoot
        })
        outputs.push(`Stash結果: ${stashOut}`)
        steps.push('✅ ローカル変更を保存しました')
      } catch (error: any) {
        // stashできない場合（変更がない場合など）は続行
        outputs.push(`Stash不要: ${error.message}`)
        steps.push('ℹ️ 保存する変更がありませんでした')
      }

      // Git pullを実行
      steps.push('2️⃣ Gitから最新データを取得中...')
      const { stdout: pullOut } = await execAsync('git pull origin main', {
        cwd: projectRoot
      })
      outputs.push(`Pull結果: ${pullOut}`)
      steps.push('✅ 最新データを取得しました')

      // Stashを復元
      steps.push('3️⃣ ローカル変更を復元中...')
      try {
        const { stdout: stashListOut } = await execAsync('git stash list', {
          cwd: projectRoot
        })

        if (stashListOut.includes('Auto stash before sync')) {
          const { stdout: popOut } = await execAsync('git stash pop', {
            cwd: projectRoot
          })
          outputs.push(`Stash復元結果: ${popOut}`)
          steps.push('✅ ローカル変更を復元しました')
        } else {
          steps.push('ℹ️ 復元する変更がありませんでした')
        }
      } catch (error: any) {
        outputs.push(`Stash復元エラー: ${error.message}`)
        steps.push('⚠️ 変更の復元に失敗しました（手動で git stash pop を実行してください）')
      }

      return NextResponse.json({
        success: true,
        message: '✅ 安全同期が完了しました！ローカル変更は保護されています。',
        steps,
        outputs
      })

    } else if (mode === 'force') {
      // 上書きモード: ローカル変更を破棄
      steps.push('⚠️ ローカル変更を破棄します...')
      const { stdout: resetOut } = await execAsync('git reset --hard HEAD', {
        cwd: projectRoot
      })
      outputs.push(`Reset結果: ${resetOut}`)
      steps.push('✅ ローカル変更を破棄しました')

      steps.push('2️⃣ Gitから最新データを取得中...')
      const { stdout: pullOut } = await execAsync('git pull origin main', {
        cwd: projectRoot
      })
      outputs.push(`Pull結果: ${pullOut}`)
      steps.push('✅ 最新データを取得しました')

      return NextResponse.json({
        success: true,
        message: '✅ 上書き同期が完了しました！Gitと完全に一致しています。',
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
