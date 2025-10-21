import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST() {
  try {
    const projectRoot = process.cwd()
    
    // Git pull実行
    const { stdout, stderr } = await execAsync('git pull origin main', {
      cwd: projectRoot
    })
    
    return NextResponse.json({
      success: true,
      message: 'Git pullが完了しました',
      output: stdout + stderr
    })
  } catch (error: any) {
    console.error('Git pull error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Git pullに失敗しました', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
