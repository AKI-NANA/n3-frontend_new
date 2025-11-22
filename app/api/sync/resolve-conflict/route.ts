import { NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function POST(request: Request) {
  try {
    const { conflictFile } = await request.json()

    if (!conflictFile) {
      return NextResponse.json({
        success: false,
        error: 'conflictFile is required'
      }, { status: 400 })
    }

    // 競合ファイルの内容を取得
    let fileContent: string
    try {
      fileContent = execSync(`cat "${conflictFile}"`, {
        encoding: 'utf-8',
        cwd: process.cwd()
      })
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: `ファイルの読み込みに失敗: ${error.message}`
      }, { status: 500 })
    }

    // 競合マーカーを検出
    const conflictPattern = /<<<<<<< HEAD\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> .*/g
    const conflicts = []
    let match

    while ((match = conflictPattern.exec(fileContent)) !== null) {
      conflicts.push({
        full: match[0],
        macSide: match[1],
        gitSide: match[2]
      })
    }

    if (conflicts.length === 0) {
      return NextResponse.json({
        success: false,
        error: '競合マーカーが見つかりません。すでに解決済みの可能性があります。'
      }, { status: 400 })
    }

    // ファイルの種類を判定
    const fileExtension = conflictFile.split('.').pop()?.toLowerCase() || ''
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'json': 'json',
      'md': 'markdown'
    }
    const language = languageMap[fileExtension] || fileExtension

    // 最初の競合のみ処理（複数ある場合は1つずつ）
    const conflict = conflicts[0]

    // Claude APIに送信するプロンプト
    const prompt = `# 競合解消タスク：インテリジェント・マージ・アシスタント

## 目的
以下の2つのコードブロックは、同じファイルの同じ箇所で競合しています。
あなたは、これら2つの変更の意図と機能を論理的に理解し、**両方の変更が正しく機能する**ように統合した、**最終的な完成形のコードブロック**を生成してください。

## 競合情報
- **ファイル:** ${conflictFile}
- **言語:** ${language}
- **競合箇所:** ${conflicts.length}箇所（現在1つ目を処理中）

## 変更ブロック 1: Mac側 (<<<<<<< HEAD)
\`\`\`${language}
${conflict.macSide}
\`\`\`

## 変更ブロック 2: Git Origin側 (>>>>>>> )
\`\`\`${language}
${conflict.gitSide}
\`\`\`

## 最終アウトプット

上記2つのブロックを統合し、両方の変更意図を活かした完成形のコードブロックのみを、以下の形式で出力してください。
余分なコメントや説明は不要です。コードのみを出力してください。

<SOLUTION_CODE>
[ここに統合後の完成コードを記述]
</SOLUTION_CODE>

## 重要な注意事項
1. 統合後のコードは、Mac側とGit側の**両方の意図を反映**すること
2. 構文エラーがないこと
3. インデントや改行は元のコードスタイルを維持すること
4. 重複する変更は1つにまとめること
5. 競合マーカー（<<<<<<< や ======= など）は含めないこと
6. <SOLUTION_CODE>タグの中身だけを返してください。説明文は不要です。`

    // Claude APIを呼び出し
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'ANTHROPIC_API_KEY が設定されていません'
      }, { status: 500 })
    }

    console.log('Calling Claude API for conflict resolution...')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Claude API error: ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()

    // レスポンスからコードを抽出
    const responseText = data.content && data.content[0] && data.content[0].type === 'text' 
      ? data.content[0].text 
      : ''

    // <SOLUTION_CODE>タグから解決済みコードを抽出
    const solutionMatch = responseText.match(/<SOLUTION_CODE>\s*([\s\S]*?)\s*<\/SOLUTION_CODE>/i)
    
    if (!solutionMatch) {
      return NextResponse.json({
        success: false,
        error: 'Claude APIのレスポンスからコードを抽出できませんでした',
        rawResponse: responseText
      }, { status: 500 })
    }

    const resolvedCode = solutionMatch[1].trim()

    // 競合マーカーを解決済みコードに置き換え
    const resolvedContent = fileContent.replace(conflict.full, resolvedCode)

    return NextResponse.json({
      success: true,
      conflict: {
        file: conflictFile,
        macSide: conflict.macSide,
        gitSide: conflict.gitSide,
        resolvedCode,
        totalConflicts: conflicts.length,
        currentConflict: 1
      },
      resolvedFileContent: resolvedContent,
      message: `✅ AI統合案を生成しました（${conflicts.length}箇所中1箇所目）`
    })

  } catch (error: any) {
    console.error('Conflict resolution error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

// 競合ファイル一覧を取得
export async function GET(request: Request) {
  try {
    // 競合ファイルを検出
    const conflictFiles = execSync('git diff --name-only --diff-filter=U', {
      encoding: 'utf-8',
      cwd: process.cwd()
    }).trim()

    if (!conflictFiles) {
      return NextResponse.json({
        success: true,
        conflicts: [],
        message: '競合ファイルはありません'
      })
    }

    const files = conflictFiles.split('\n')

    // 各ファイルの競合数をカウント
    const fileDetails = files.map(file => {
      try {
        const content = execSync(`cat "${file}"`, {
          encoding: 'utf-8',
          cwd: process.cwd()
        })

        const conflictCount = (content.match(/<<<<<<< HEAD/g) || []).length

        return {
          file,
          conflictCount,
          exists: true
        }
      } catch (error) {
        return {
          file,
          conflictCount: 0,
          exists: false
        }
      }
    })

    return NextResponse.json({
      success: true,
      conflicts: fileDetails,
      totalFiles: files.length,
      totalConflicts: fileDetails.reduce((sum, f) => sum + f.conflictCount, 0)
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
