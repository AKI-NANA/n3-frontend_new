import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { sshHost, sshUser, projectPath } = await request.json();

    if (!sshHost || !sshUser || !projectPath) {
      return NextResponse.json(
        { success: false, error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    const commands = [
      // Phase 1: .env ファイルをバックアップ
      `ssh ${sshUser}@${sshHost} "if [ -f ${projectPath}/.env ]; then cp ${projectPath}/.env /tmp/.env.backup; echo '.env をバックアップしました'; else echo '.env は存在しません'; fi"`,
      
      // Phase 2: プロジェクトディレクトリを完全削除
      `ssh ${sshUser}@${sshHost} "if [ -d ${projectPath} ]; then rm -rf ${projectPath} && echo 'プロジェクトディレクトリを削除しました'; else echo 'プロジェクトディレクトリは既に存在しません'; fi"`,
      
      // Phase 3: ディレクトリ再作成（.envを戻すため）
      `ssh ${sshUser}@${sshHost} "mkdir -p ${projectPath}"`,
      
      // Phase 4: .env を復元
      `ssh ${sshUser}@${sshHost} "if [ -f /tmp/.env.backup ]; then cp /tmp/.env.backup ${projectPath}/.env && echo '.env を復元しました'; else echo '.env のバックアップがありません'; fi"`,
      
      // Phase 5: 一時ファイル削除
      `ssh ${sshUser}@${sshHost} "rm -f /tmp/.env.backup"`
    ];

    const results = [];
    for (const command of commands) {
      try {
        const { stdout, stderr } = await execAsync(command);
        results.push({
          command: command.split('"')[1] || command,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          success: true
        });
      } catch (error: any) {
        results.push({
          command: command.split('"')[1] || command,
          error: error.message,
          success: false
        });
      }
    }

    const allSuccess = results.every(r => r.success);

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess 
        ? 'VPSを完全クリーンアップしました（.env保持）'
        : '一部のコマンドが失敗しました',
      results
    });

  } catch (error: any) {
    console.error('VPSクリーンアップエラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'VPSクリーンアップ中にエラーが発生しました',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
