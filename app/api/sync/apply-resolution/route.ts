import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

export async function POST(request: Request) {
  try {
    const { conflictFile, resolvedContent } = await request.json()

    if (!conflictFile || !resolvedContent) {
      return NextResponse.json({
        success: false,
        error: 'conflictFile and resolvedContent are required'
      }, { status: 400 })
    }

    // ファイルパスを解決
    const filePath = path.join(process.cwd(), conflictFile)

    // ファイルが存在するか確認
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        error: `ファイルが見つかりません: ${conflictFile}`
      }, { status: 404 })
    }

    // バックアップ作成
    const backupPath = `${filePath}.backup-${Date.now()}`
    fs.copyFileSync(filePath, backupPath)

    // 解決済みコンテンツを書き込み
    fs.writeFileSync(filePath, resolvedContent, 'utf-8')

    // Git add
    execSync(`git add "${conflictFile}"`, {
      cwd: process.cwd(),
      stdio: 'inherit'
    })

    console.log(`✅ 競合解決を適用: ${conflictFile}`)
    console.log(`📦 バックアップ: ${backupPath}`)

    return NextResponse.json({
      success: true,
      file: conflictFile,
      backup: backupPath,
      message: '✅ 競合解決を適用しました（git addまで完了）'
    })

  } catch (error: any) {
    console.error('Apply resolution error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
