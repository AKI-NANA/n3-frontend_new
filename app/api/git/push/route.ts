import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST() {
  try {
    // Git status確認
    const { stdout: statusOutput } = await execAsync('git status --porcelain')
    
    if (!statusOutput.trim()) {
      return NextResponse.json(
        { message: '変更がありません' },
        { status: 200 }
      )
    }

    // Git add
    await execAsync('git add .')
    
    // Git commit
    const commitMessage = `Update: ${new Date().toISOString()}`
    await execAsync(`git commit -m "${commitMessage}"`)
    
    // Git push
    await execAsync('git push origin main')
    
    return NextResponse.json(
      { 
        success: true,
        message: 'GitHubへのプッシュが完了しました' 
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Git push error:', error)
    return NextResponse.json(
      { error: error.message || 'Git pushに失敗しました' },
      { status: 500 }
    )
  }
}
