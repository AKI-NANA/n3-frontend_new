import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST() {
  try {
    // SSH経由でVPSにデプロイコマンド実行
    const commands = [
      'cd ~/n3-frontend_new',
      'git fetch origin',
      'git reset --hard origin/main',
      'npm install',
      'npm run build',
      'pm2 restart n3-frontend'
    ].join(' && ')

    const sshCommand = `ssh ubuntu@tk2-236-27682.vs.sakura.ne.jp "${commands}"`
    
    const { stdout, stderr } = await execAsync(sshCommand, {
      timeout: 300000 // 5分タイムアウト
    })
    
    return NextResponse.json(
      { 
        success: true,
        message: 'VPSへのデプロイが完了しました',
        output: stdout
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('VPS deploy error:', error)
    return NextResponse.json(
      { error: error.message || 'VPSデプロイに失敗しました' },
      { status: 500 }
    )
  }
}
