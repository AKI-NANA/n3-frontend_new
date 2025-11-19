import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * リポジトリクリーンアップAPI
 * GitHubバックアップ後に不要ファイルを削除してGit履歴をクリーンにする
 */
export async function POST() {
  try {
    const logs: string[] = []
    const addLog = (message: string) => {
      logs.push(message)
      console.log(message)
    }

    addLog('🚀 リポジトリクリーンアップを開始します...')
    addLog('')

    // Step 1: 不要ファイルを削除
    addLog('🗑️ Step 1: 不要ファイルを削除中...')
    
    // .bak ファイル
    await execAsync('cd /Users/aritahiroaki/n3-frontend_new && find . -name "*.bak" -type f -delete 2>/dev/null || true')
    addLog('  ✅ *.bak 削除')

    // .original ファイル
    await execAsync('cd /Users/aritahiroaki/n3-frontend_new && find . -name "*.original" -type f -delete 2>/dev/null || true')
    addLog('  ✅ *.original 削除')

    // *_old.tsx, *_old.ts
    await execAsync('cd /Users/aritahiroaki/n3-frontend_new && find . -name "*_old.tsx" -type f -delete 2>/dev/null || true')
    await execAsync('cd /Users/aritahiroaki/n3-frontend_new && find . -name "*_old.ts" -type f -delete 2>/dev/null || true')
    addLog('  ✅ *_old.tsx, *_old.ts 削除')

    // *_backup.*
    await execAsync('cd /Users/aritahiroaki/n3-frontend_new && find . -name "*_backup.*" -type f -delete 2>/dev/null || true')
    addLog('  ✅ *_backup.* 削除')

    // _archive ディレクトリ
    await execAsync('cd /Users/aritahiroaki/n3-frontend_new && rm -rf _archive 2>/dev/null || true')
    addLog('  ✅ _archive/ 削除')

    addLog('')

    // Step 2: .gitignoreを更新
    addLog('📝 Step 2: .gitignore を更新中...')
    const { stdout: gitignoreContent } = await execAsync('cd /Users/aritahiroaki/n3-frontend_new && cat .gitignore 2>/dev/null || echo ""')
    
    const patterns = ['*.bak', '*.original', '*_old.tsx', '*_old.ts', '*_backup.*', '_archive/']
    const missingPatterns = patterns.filter(pattern => !gitignoreContent.includes(pattern))

    if (missingPatterns.length > 0) {
      const newContent = `\n# 不要ファイルパターン（自動追加）\n${missingPatterns.join('\n')}\n`
      await execAsync(`cd /Users/aritahiroaki/n3-frontend_new && printf "${newContent}" >> .gitignore`)
      addLog(`  ✅ .gitignore に ${missingPatterns.length}個のパターンを追加`)
    } else {
      addLog('  ✅ .gitignore は既に最新')
    }
    addLog('')

    // Step 3: Gitキャッシュから削除
    addLog('🧹 Step 3: Gitキャッシュをクリーンアップ中...')
    
    // Git追跡から削除（ファイルは残す）
    await execAsync(`cd /Users/aritahiroaki/n3-frontend_new && git rm -r --cached . 2>/dev/null || true`)
    addLog('  ✅ Gitキャッシュをクリア')

    // 再度追加（.gitignoreが適用される）
    await execAsync('cd /Users/aritahiroaki/n3-frontend_new && git add .')
    addLog('  ✅ ファイルを再追加（.gitignore適用済み）')

    addLog('')

    // Step 4: 変更をコミット
    addLog('💾 Step 4: 変更をコミット中...')
    
    // 変更があるかチェック
    const { stdout: statusOutput } = await execAsync('cd /Users/aritahiroaki/n3-frontend_new && git status --porcelain')
    if (statusOutput.trim().length > 0) {
      await execAsync('cd /Users/aritahiroaki/n3-frontend_new && git commit -m "chore: 不要ファイルを完全削除してクリーン化"')
      addLog('  ✅ コミット完了')
    } else {
      addLog('  ✅ 変更なし（コミット不要）')
    }
    addLog('')

    // Step 5: リポジトリサイズを確認
    addLog('📊 Step 5: リポジトリサイズ確認...')
    const { stdout: repoSize } = await execAsync('cd /Users/aritahiroaki/n3-frontend_new && du -sh . | cut -f1')
    const { stdout: gitSize } = await execAsync('cd /Users/aritahiroaki/n3-frontend_new && du -sh .git | cut -f1')
    addLog(`  リポジトリ全体: ${repoSize.trim()}`)
    addLog(`  .gitディレクトリ: ${gitSize.trim()}`)
    addLog('')

    addLog('✅ クリーンアップ完了！')
    addLog('')
    addLog('📝 次のステップ:')
    addLog('1. 「デプロイ」タブで「Git Push」を実行')
    addLog('2. GitHubにクリーンな状態がプッシュされます')
    addLog('')

    return NextResponse.json({
      success: true,
      data: {
        logs,
        repoSize: repoSize.trim(),
        gitSize: gitSize.trim()
      }
    })

  } catch (error) {
    console.error('Clean repository error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'リポジトリクリーンアップに失敗しました',
        logs: []
      },
      { status: 500 }
    )
  }
}
