import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { sshHost, sshUser, projectPath, githubRepo } = await request.json();

    if (!sshHost || !sshUser || !projectPath || !githubRepo) {
      return NextResponse.json(
        { success: false, error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupBranchName = `backup-before-clean-${timestamp}`;
    const vpsBackupPath = `${projectPath}.backup.${timestamp}`;
    const localProjectPath = process.cwd(); // Next.jsプロジェクトのルート

    const commands = [
      // Phase 0: ローカルでGitHubバックアップブランチ作成
      {
        name: 'GitHubバックアップブランチ作成',
        command: `cd ${localProjectPath} && git branch ${backupBranchName} && git push origin ${backupBranchName} && echo 'バックアップブランチ作成: ${backupBranchName}'`
      },

      // Phase 1: ローカル変更を全てコミット
      {
        name: 'ローカル変更をコミット',
        command: `cd ${localProjectPath} && git add -A && git commit -m "deploy: 完全クリーンデプロイ前の自動コミット ${timestamp}" || echo '変更なし、またはコミット済み'`
      },

      // Phase 1.5: GitHubの最新を取得（リベース）
      {
        name: 'GitHubの最新を取得',
        command: `cd ${localProjectPath} && git pull origin main --rebase && echo 'Git pull --rebase 完了'`
      },

      // Phase 2: mainブランチにプッシュ
      {
        name: 'GitHubにプッシュ',
        command: `cd ${localProjectPath} && git push origin main && echo 'GitHubプッシュ完了'`
      },

      // Phase 3: VPSバックアップ作成
      {
        name: 'VPSバックアップ作成',
        command: `ssh ${sshUser}@${sshHost} "if [ -d ${projectPath} ]; then cp -r ${projectPath} ${vpsBackupPath} && echo 'VPSバックアップ作成: ${vpsBackupPath}'; else echo 'プロジェクトディレクトリが存在しません'; fi"`
      },
      
      // Phase 4: .env バックアップ
      {
        name: '.env バックアップ',
        command: `ssh ${sshUser}@${sshHost} "if [ -f ${projectPath}/.env ]; then cp ${projectPath}/.env /tmp/.env.backup && cp ${projectPath}/.env.production /tmp/.env.production.backup 2>/dev/null; echo '.env をバックアップしました'; else echo '.env は存在しません'; fi"`
      },
      
      // Phase 5: 既存ディレクトリ削除
      {
        name: '既存ディレクトリ削除',
        command: `ssh ${sshUser}@${sshHost} "if [ -d ${projectPath} ]; then rm -rf ${projectPath} && echo '既存ディレクトリを削除しました'; else echo 'ディレクトリは既に存在しません'; fi"`
      },
      
      // Phase 6: GitHubから完全クローン
      {
        name: 'GitHubから完全クローン',
        command: `ssh ${sshUser}@${sshHost} "cd ~ && git clone ${githubRepo} && echo 'クローン完了'"`
      },
      
      // Phase 7: .env 復元
      {
        name: '.env 復元',
        command: `ssh ${sshUser}@${sshHost} "if [ -f /tmp/.env.backup ]; then cp /tmp/.env.backup ${projectPath}/.env && cp /tmp/.env.production.backup ${projectPath}/.env.production 2>/dev/null; echo '.env を復元しました'; else echo '.env のバックアップがありません'; fi"`
      },
      
      // Phase 8: 依存関係インストール
      {
        name: '依存関係インストール',
        command: `ssh ${sshUser}@${sshHost} "cd ${projectPath} && npm install && echo 'npm install 完了'"`
      },
      
      // Phase 9: lightningcss を強制インストール
      {
        name: 'lightningcss 強制インストール',
        command: `ssh ${sshUser}@${sshHost} "cd ${projectPath} && npm install lightningcss-linux-x64-gnu --save-optional --force && echo 'lightningcss インストール完了'"`
      },
      
      // Phase 10: ネイティブモジュール再ビルド
      {
        name: 'ネイティブモジュール再ビルド',
        command: `ssh ${sshUser}@${sshHost} "cd ${projectPath} && npm rebuild --verbose && echo 'npm rebuild 完了'"`
      },
      
      // Phase 11: 本番ビルド
      {
        name: '本番ビルド',
        command: `ssh ${sshUser}@${sshHost} "cd ${projectPath} && npm run build && echo 'ビルド完了'"`
      },
      
      // Phase 12: PM2再起動
      {
        name: 'PM2再起動',
        command: `ssh ${sshUser}@${sshHost} "pm2 restart n3-frontend || (pm2 start npm --name 'n3-frontend' -- start && pm2 save) && echo 'PM2再起動完了'"`
      },
      
      // Phase 13: 一時ファイル削除
      {
        name: '一時ファイル削除',
        command: `ssh ${sshUser}@${sshHost} "rm -f /tmp/.env.backup /tmp/.env.production.backup"`
      }
    ];

    const results = [];
    let shouldRollback = false;
    let failedPhase = '';

    for (const { name, command } of commands) {
      try {
        const { stdout, stderr } = await execAsync(command, { 
          timeout: 300000, // 5分タイムアウト
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });
        results.push({
          phase: name,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          success: true
        });

        // ビルド失敗時はロールバックフラグ
        if (name === '本番ビルド' && (stderr.includes('Failed to compile') || stderr.includes('error'))) {
          shouldRollback = true;
          failedPhase = name;
          break;
        }
      } catch (error: any) {
        results.push({
          phase: name,
          error: error.message,
          stdout: error.stdout?.trim() || '',
          stderr: error.stderr?.trim() || '',
          success: false
        });
        
        // クリティカルなフェーズで失敗したらロールバック（ただしGit pull --rebaseは除く）
        if (['GitHubから完全クローン', '依存関係インストール', 'lightningcss 強制インストール', 'ネイティブモジュール再ビルド', '本番ビルド'].includes(name)) {
          shouldRollback = true;
          failedPhase = name;
          break;
        }
        
        // GitHubにプッシュが失敗した場合もロールバック
        if (name === 'GitHubにプッシュ') {
          shouldRollback = true;
          failedPhase = name;
          break;
        }
      }
    }

    // ロールバック実行
    if (shouldRollback) {
      try {
        // VPSをバックアップから復元
        await execAsync(`ssh ${sshUser}@${sshHost} "rm -rf ${projectPath} && mv ${vpsBackupPath} ${projectPath} && pm2 restart n3-frontend"`);
        
        return NextResponse.json({
          success: false,
          message: `${failedPhase}に失敗しました。VPSをバックアップから復元しました。GitHubのバックアップブランチ: ${backupBranchName}`,
          results,
          rollback: true,
          backupBranch: backupBranchName,
          vpsBackupPath
        });
      } catch (rollbackError: any) {
        return NextResponse.json({
          success: false,
          message: 'デプロイとロールバックの両方が失敗しました',
          results,
          rollbackError: rollbackError.message,
          backupBranch: backupBranchName,
          vpsBackupPath
        }, { status: 500 });
      }
    }

    const allSuccess = results.every(r => r.success);

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess 
        ? `完全クリーンデプロイが成功しました。GitHubバックアップブランチ: ${backupBranchName}`
        : '一部のフェーズが失敗しました',
      results,
      backupBranch: backupBranchName,
      vpsBackupPath
    });

  } catch (error: any) {
    console.error('完全クリーンデプロイエラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '完全クリーンデプロイ中にエラーが発生しました',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
