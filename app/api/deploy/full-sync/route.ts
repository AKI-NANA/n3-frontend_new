import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { createBackup = true, branch = 'main' } = body

    const logs: string[] = []
    const addLog = (message: string) => {
      logs.push(message)
      console.log(message)
    }

    // VPS情報
    const vpsHost = 'ubuntu@n3.emverze.com'
    const vpsPath = '/home/ubuntu/n3-frontend_new'
    
    addLog('🔗 VPSに接続中...')

    // SSH接続テスト
    try {
      const { stdout: testOutput } = await execAsync(`ssh -o ConnectTimeout=10 ${vpsHost} "echo 'connection test'"`)
      if (!testOutput.includes('connection test')) {
        throw new Error('SSH接続テストに失敗しました')
      }
      addLog('✅ VPS接続成功')
    } catch (error: any) {
      addLog('❌ VPS接続失敗')
      return NextResponse.json({
        error: 'VPSへのSSH接続に失敗しました。SSH鍵の設定を確認してください。',
        details: error.message,
        logs
      }, { status: 500 })
    }

    // バックアップ作成（オプション）
    if (createBackup) {
      addLog('💾 VPSバックアップを作成中...')
      try {
        const backupCmd = `ssh ${vpsHost} "cd ~ && cp -r ${vpsPath} ${vpsPath}.backup.\\$(date +%Y%m%d_%H%M%S)"`
        await execAsync(backupCmd, { timeout: 30000 })
        addLog('✅ バックアップ作成完了')
      } catch (error: any) {
        addLog('⚠️ バックアップ作成に失敗（続行します）')
        console.error('Backup error:', error)
      }
    }

    // Git Pull
    addLog(`📥 VPSでGit Pull実行中 (${branch}ブランチ)...`)
    try {
      const pullCmd = `ssh ${vpsHost} "cd ${vpsPath} && git pull origin ${branch}"`
      const { stdout: pullOutput } = await execAsync(pullCmd, { timeout: 60000 })
      addLog(pullOutput.trim() || '✅ Git Pull完了')
    } catch (error: any) {
      addLog('❌ Git Pull失敗')
      return NextResponse.json({
        error: 'VPSでのGit Pullに失敗しました',
        details: error.message,
        logs
      }, { status: 500 })
    }

    // npm install
    addLog('📦 依存関係をインストール中...')
    try {
      const installCmd = `ssh ${vpsHost} "cd ${vpsPath} && npm install"`
      await execAsync(installCmd, { timeout: 180000 }) // 3分タイムアウト
      addLog('✅ npm install完了')
    } catch (error: any) {
      addLog('⚠️ npm install警告（続行します）')
      console.error('npm install error:', error)
    }

    // npm run build
    addLog('🔨 ビルド実行中...')
    try {
      const buildCmd = `ssh ${vpsHost} "cd ${vpsPath} && npm run build"`
      await execAsync(buildCmd, { timeout: 300000 }) // 5分タイムアウト
      addLog('✅ ビルド完了')
    } catch (error: any) {
      addLog('❌ ビルド失敗')
      return NextResponse.json({
        error: 'ビルドに失敗しました',
        details: error.message,
        logs
      }, { status: 500 })
    }

    // PM2 restart
    addLog('🔄 アプリを再起動中...')
    try {
      const restartCmd = `ssh ${vpsHost} "pm2 restart n3-frontend"`
      const { stdout: restartOutput } = await execAsync(restartCmd, { timeout: 30000 })
      addLog('✅ アプリ再起動完了')
      addLog(restartOutput.trim())
    } catch (error: any) {
      addLog('❌ PM2再起動失敗')
      return NextResponse.json({
        error: 'アプリの再起動に失敗しました',
        details: error.message,
        logs
      }, { status: 500 })
    }

    addLog('')
    addLog('🎉 VPSデプロイが完了しました！')
    addLog('🌐 https://n3.emverze.com で確認できます')

    return NextResponse.json({
      success: true,
      message: 'VPSデプロイが成功しました',
      logs
    })

  } catch (error: any) {
    console.error('Full sync deploy error:', error)
    return NextResponse.json(
      { 
        error: 'VPSデプロイ中にエラーが発生しました', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
