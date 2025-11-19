import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export async function GET() {
  try {
    const projectRoot = process.cwd()
    console.log('=== Git Status Debug ===')
    console.log('Project root:', projectRoot)
    console.log('Expected path:', path.join(projectRoot, '.git'))

    // .gitディレクトリの存在確認
    const { stdout: gitCheck } = await execAsync('ls -la .git', { cwd: projectRoot }).catch(() => ({ stdout: 'NOT FOUND' }))
    console.log('Git directory check:', gitCheck)

    // 現在のブランチを取得
    const { stdout: branchOutput, stderr: branchError } = await execAsync('git branch --show-current', { cwd: projectRoot })
    const branch = branchOutput.trim()
    console.log('Current branch:', branch)
    if (branchError) console.log('Branch error:', branchError)

    // Git status確認（詳細版）
    const { stdout: statusOutput, stderr: statusError } = await execAsync('git status --porcelain', { cwd: projectRoot })
    console.log('Git status raw output:', JSON.stringify(statusOutput))
    console.log('Status output length:', statusOutput.length)
    console.log('Status output trimmed length:', statusOutput.trim().length)
    if (statusError) console.log('Status error:', statusError)

    // 追加のステータス確認
    const { stdout: statusLong } = await execAsync('git status', { cwd: projectRoot })
    console.log('Git status (long format):', statusLong)

    // 差分確認
    const { stdout: diffOutput } = await execAsync('git diff --name-only', { cwd: projectRoot })
    console.log('Modified files (diff):', diffOutput)

    // ステージングされていないファイル
    const { stdout: untrackedOutput } = await execAsync('git ls-files --others --exclude-standard', { cwd: projectRoot })
    console.log('Untracked files:', untrackedOutput)

    const hasChanges = !!statusOutput.trim()
    console.log('Has changes calculated:', hasChanges)
    
    // 変更されたファイルのリスト
    const files = statusOutput
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        console.log('Processing line:', JSON.stringify(line))
        // 最初の2文字がステータス、3文字目以降がファイル名
        return line.substring(3)
      })
    
    console.log('Files array:', files)
    console.log('Files count:', files.length)

    const result = {
      hasChanges,
      files,
      branch,
      debug: {
        projectRoot,
        statusOutputLength: statusOutput.length,
        statusOutputTrimmedLength: statusOutput.trim().length,
        filesDetected: files.length,
        rawStatusOutput: statusOutput,
        longStatus: statusLong.substring(0, 500), // 最初の500文字のみ
        diffFiles: diffOutput.trim().split('\n').filter(f => f),
        untrackedFiles: untrackedOutput.trim().split('\n').filter(f => f)
      }
    }

    console.log('Returning result:', JSON.stringify(result, null, 2))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Git status error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: `Git status取得に失敗しました: ${error.message}`, 
        details: error.stderr || error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}
