import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    // Git追跡されている不要ファイルをカテゴリ別に検索
    const categories = [
      { name: 'bak', pattern: '\\.bak$', description: 'バックアップファイル (.bak)' },
      { name: 'original', pattern: '\\.original$', description: 'オリジナルファイル (.original)' },
      { name: 'old', pattern: '_old\\.(tsx|ts)$', description: '旧ファイル (*_old.tsx, *_old.ts)' },
      { name: 'backup', pattern: '_backup\\.', description: 'バックアップファイル (*_backup.*)' },
      { name: 'archive', pattern: '^_archive/', description: 'アーカイブディレクトリ (_archive/)' }
    ]

    const results: any = {
      total: 0,
      categories: [],
      gitignoreStatus: {},
      recommendations: [],
      source: 'local_and_remote' // どこを見たか
    }

    // ローカルとリモート（GitHub）の両方をチェック
    for (const category of categories) {
      try {
        // ローカルのファイル
        const { stdout: localStdout } = await execAsync(`git ls-files | grep -E "${category.pattern}" || true`)
        const localFiles = localStdout.trim().split('\n').filter(f => f.length > 0)
        
        // GitHub上のファイル
        const { stdout: remoteStdout } = await execAsync(`git ls-tree -r --name-only origin/main | grep -E "${category.pattern}" || true`)
        const remoteFiles = remoteStdout.trim().split('\n').filter(f => f.length > 0)
        
        // 両方をマージ（重複排除）
        const allFiles = [...new Set([...localFiles, ...remoteFiles])]
        const files = allFiles.filter(f => f.length > 0)
        
        results.categories.push({
          name: category.name,
          description: category.description,
          pattern: category.pattern,
          count: files.length,
          files: files.slice(0, 20), // 最大20件
          hasMore: files.length > 20,
          localCount: localFiles.length,
          remoteCount: remoteFiles.length
        })
        
        results.total += files.length
      } catch (error) {
        console.error(`Error searching for ${category.name}:`, error)
      }
    }

    // .gitignore の状態を確認
    try {
      const patterns = ['*.bak', '*.original', '*_old.tsx', '*_old.ts', '*_backup.*', '_archive/']
      
      for (const pattern of patterns) {
        try {
          const { stdout } = await execAsync(`grep -q "^${pattern.replace(/\*/g, '\\*')}$" .gitignore && echo "found" || echo "missing"`)
          results.gitignoreStatus[pattern] = stdout.trim() === 'found'
        } catch {
          results.gitignoreStatus[pattern] = false
        }
      }
    } catch (error) {
      console.error('Error checking .gitignore:', error)
    }

    // 推奨アクションを生成
    if (results.total > 0) {
      results.recommendations.push({
        type: 'warning',
        message: `${results.total}件の不要ファイルが見つかりました（ローカルまたはGitHub上）`,
        action: 'cleanup'
      })
    }

    const missingPatterns = Object.entries(results.gitignoreStatus)
      .filter(([_, found]) => !found)
      .map(([pattern]) => pattern)

    if (missingPatterns.length > 0) {
      results.recommendations.push({
        type: 'info',
        message: `${missingPatterns.length}個のパターンが.gitignoreに不足しています`,
        action: 'update_gitignore',
        patterns: missingPatterns
      })
    }

    if (results.total === 0 && missingPatterns.length === 0) {
      results.recommendations.push({
        type: 'success',
        message: 'クリーンな状態です！不要ファイルはありません',
        action: 'none'
      })
    }

    return NextResponse.json({
      success: true,
      data: results
    })

  } catch (error) {
    console.error('Unnecessary files check error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'ファイルチェックに失敗しました' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { categories, updateGitignore } = await request.json()

    const results: any = {
      deleted: [],
      failed: [],
      gitignoreUpdated: false
    }

    // カテゴリごとに削除
    for (const category of categories) {
      try {
        // ローカルとGitHub両方から削除
        // まずローカルのGit追跡から削除
        await execAsync(`git ls-files | grep -E "${category.pattern}" | xargs -r git rm --cached || true`)
        
        // GitHub上にあってローカルにないファイルも削除
        await execAsync(`git ls-tree -r --name-only origin/main | grep -E "${category.pattern}" | xargs -r git rm --cached || true`)
        
        // ローカルファイルシステムから削除
        if (category.name === 'bak') {
          await execAsync(`find . -name "*.bak" -type f -delete || true`)
        } else if (category.name === 'original') {
          await execAsync(`find . -name "*.original" -type f -delete || true`)
        } else if (category.name === 'old') {
          await execAsync(`find . -name "*_old.tsx" -type f -delete || true`)
          await execAsync(`find . -name "*_old.ts" -type f -delete || true`)
        } else if (category.name === 'backup') {
          await execAsync(`find . -name "*_backup.*" -type f -delete || true`)
        } else if (category.name === 'archive') {
          await execAsync(`git rm -r --cached _archive 2>/dev/null || true`)
          await execAsync(`rm -rf _archive || true`)
        }

        results.deleted.push({
          category: category.name,
          description: category.description
        })
      } catch (error) {
        results.failed.push({
          category: category.name,
          error: error instanceof Error ? error.message : '削除失敗'
        })
      }
    }

    // .gitignore を更新
    if (updateGitignore) {
      try {
        const patterns = ['*.bak', '*.original', '*_old.tsx', '*_old.ts', '*_backup.*', '_archive/']
        let gitignoreContent = ''
        
        try {
          const { stdout } = await execAsync('cat .gitignore')
          gitignoreContent = stdout
        } catch {
          // .gitignore が存在しない場合は新規作成
        }

        const missingPatterns = patterns.filter(pattern => 
          !gitignoreContent.includes(pattern)
        )

        if (missingPatterns.length > 0) {
          const newContent = '\\n# 自動追加: 不要ファイルパターン\\n' + missingPatterns.join('\\n') + '\\n'
          await execAsync(`printf "${newContent}" >> .gitignore`)
          await execAsync('git add .gitignore')
          results.gitignoreUpdated = true
        }
      } catch (error) {
        console.error('Error updating .gitignore:', error)
      }
    }

    return NextResponse.json({
      success: true,
      data: results
    })

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'クリーンアップに失敗しました' 
      },
      { status: 500 }
    )
  }
}
