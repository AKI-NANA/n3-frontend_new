import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const backupName = `n3-frontend_new_backup_${timestamp}`
    const backupPath = `/Users/aritahiroaki/${backupName}`

    // バックアップを作成
    await execAsync(`cp -r /Users/aritahiroaki/n3-frontend_new "${backupPath}"`)

    // バックアップサイズを取得
    const { stdout: sizeOutput } = await execAsync(`du -sh "${backupPath}"`)
    const size = sizeOutput.trim().split('\t')[0]

    return NextResponse.json({
      success: true,
      data: {
        backupPath,
        backupName,
        size,
        timestamp,
        message: `バックアップを作成しました: ${backupName}`
      }
    })

  } catch (error) {
    console.error('Backup error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'バックアップに失敗しました' 
      },
      { status: 500 }
    )
  }
}

// バックアップ一覧を取得
export async function GET() {
  try {
    const { stdout } = await execAsync(`ls -dt /Users/aritahiroaki/n3-frontend_new_backup_* 2>/dev/null || echo ""`)
    const backups = stdout.trim().split('\n').filter(b => b.length > 0)

    const backupList = await Promise.all(
      backups.map(async (path) => {
        const name = path.split('/').pop() || ''
        const { stdout: sizeOutput } = await execAsync(`du -sh "${path}"`)
        const size = sizeOutput.trim().split('\t')[0]
        const { stdout: dateOutput } = await execAsync(`stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "${path}"`)
        const date = dateOutput.trim()

        return {
          name,
          path,
          size,
          date
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        count: backupList.length,
        backups: backupList
      }
    })

  } catch (error) {
    console.error('Backup list error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'バックアップ一覧の取得に失敗しました' 
      },
      { status: 500 }
    )
  }
}
