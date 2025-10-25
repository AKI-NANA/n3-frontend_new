import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // SSHキーがないため、直接デプロイはできない
    // 代わりに手動デプロイの手順を返す

    const deployCommands = `
ssh ubuntu@n3.emverze.com
cd /home/ubuntu/n3-frontend_new
git fetch origin
git pull origin main  # または git pull origin <your-branch>
PUPPETEER_SKIP_DOWNLOAD=true npm install
npm run build
pm2 restart n3-frontend
pm2 logs n3-frontend --lines 50
    `.trim()

    return NextResponse.json(
      {
        success: false,
        error: 'VPSへの自動デプロイは利用できません',
        message: '手動でVPSにSSH接続してデプロイしてください',
        commands: deployCommands,
        instructions: [
          '1. ターミナルを開く',
          '2. 以下のコマンドを実行してVPSに接続',
          '3. デプロイコマンドを実行',
          '4. ログで確認'
        ]
      },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('VPS deploy error:', error)
    return NextResponse.json(
      { error: error.message || 'VPSデプロイに失敗しました' },
      { status: 500 }
    )
  }
}
