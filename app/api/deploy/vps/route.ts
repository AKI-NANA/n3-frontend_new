import { NextResponse } from 'next/server'

const VPS_URL = process.env.VPS_URL || 'https://n3.emverze.com'

/**
 * VPSデプロイAPI
 * VPS上のNext.jsアプリに自己デプロイを指示する
 */
export async function POST(request: Request) {
  try {
    // リクエストボディからブランチを取得
    const body = await request.json().catch(() => ({}))
    const targetBranch = body.branch

    // ローカルの現在のブランチを取得
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)

    const { stdout: branchOutput } = await execAsync('git branch --show-current')
    const currentBranch = targetBranch || branchOutput.trim()

    console.log('[VPS Deploy] Requesting deployment to VPS...')
    console.log('[VPS Deploy] Target branch:', currentBranch)
    console.log('[VPS Deploy] VPS URL:', VPS_URL)

    // VPS上のself-deployエンドポイントを呼び出し
    const response = await fetch(`${VPS_URL}/api/deploy/self`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ branch: currentBranch })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'VPSデプロイに失敗しました')
    }

    return NextResponse.json({
      success: true,
      message: `VPSへのデプロイが完了しました (${currentBranch}ブランチ)`,
      branch: currentBranch,
      vpsResponse: data
    })

  } catch (error: any) {
    console.error('[VPS Deploy] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'VPSデプロイに失敗しました',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
