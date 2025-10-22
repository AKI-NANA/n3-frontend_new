import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

const VPS_HOST = 'ubuntu@tk2-236-27682.vs.sakura.ne.jp'
const VPS_PROJECT_PATH = '~/n3-frontend_new'

export async function POST() {
  try {
    // 1. ローカルの .env.local を読み取る
    const envLocalPath = path.join(process.cwd(), '.env.local')

    if (!fs.existsSync(envLocalPath)) {
      return NextResponse.json({
        success: false,
        message: '.env.local ファイルが見つかりません'
      }, { status: 404 })
    }

    const envContent = fs.readFileSync(envLocalPath, 'utf-8')

    // 2. 一時ファイルに保存
    const tempFilePath = path.join(process.cwd(), '.env.local.tmp')
    fs.writeFileSync(tempFilePath, envContent)

    // 3. VPSにSCP経由でアップロード
    const scpCommand = `scp -o StrictHostKeyChecking=no ${tempFilePath} ${VPS_HOST}:${VPS_PROJECT_PATH}/.env.local`

    try {
      const { stdout, stderr } = await execAsync(scpCommand, {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024
      })

      // 一時ファイルを削除
      fs.unlinkSync(tempFilePath)

      // 4. VPSでpm2を再起動
      const restartCommand = `ssh -o StrictHostKeyChecking=no ${VPS_HOST} "cd ${VPS_PROJECT_PATH} && pm2 restart n3-frontend"`
      await execAsync(restartCommand, { timeout: 30000 })

      return NextResponse.json({
        success: true,
        message: '環境変数をVPSに同期し、アプリケーションを再起動しました',
        details: {
          envFileSize: envContent.length,
          lines: envContent.split('\n').length,
          timestamp: new Date().toISOString()
        }
      })

    } catch (error: any) {
      // 一時ファイルをクリーンアップ
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath)
      }

      console.error('VPS同期エラー:', error)

      return NextResponse.json({
        success: false,
        message: 'VPSへの同期に失敗しました',
        error: error.message,
        details: error.stderr || error.stdout
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('環境変数同期エラー:', error)
    return NextResponse.json({
      success: false,
      message: '環境変数の同期に失敗しました',
      error: error.message
    }, { status: 500 })
  }
}

// GET: 現在の環境変数の状態を確認
export async function GET() {
  try {
    const envLocalPath = path.join(process.cwd(), '.env.local')

    if (!fs.existsSync(envLocalPath)) {
      return NextResponse.json({
        exists: false,
        message: '.env.local ファイルが見つかりません'
      })
    }

    const envContent = fs.readFileSync(envLocalPath, 'utf-8')
    const lines = envContent.split('\n').filter(line =>
      line.trim() && !line.trim().startsWith('#')
    )

    // 環境変数のキーだけを抽出（値は表示しない）
    const envKeys = lines.map(line => {
      const match = line.match(/^([^=]+)=/)
      return match ? match[1].trim() : null
    }).filter(Boolean)

    return NextResponse.json({
      exists: true,
      fileSize: envContent.length,
      totalLines: envContent.split('\n').length,
      envVariables: envKeys.length,
      keys: envKeys,
      lastModified: fs.statSync(envLocalPath).mtime
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '環境変数の確認に失敗しました',
      error: error.message
    }, { status: 500 })
  }
}
