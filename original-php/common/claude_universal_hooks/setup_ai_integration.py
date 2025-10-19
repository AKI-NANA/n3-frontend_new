#!/usr/bin/env python3
"""
🔗 AI Hooks統合テスト・セットアップスクリプト
既存Hooksシステムとの統合確認
"""

import os
import sys
import json
import shutil
from pathlib import Path

def main():
    """統合テスト・セットアップ実行"""
    
    print("🔗 AI Hooks統合テスト・セットアップ")
    print("=" * 60)
    
    current_dir = Path(__file__).parent
    
    # Step 1: バックアップ作成
    print("📁 Step 1: 既存設定のバックアップ作成...")
    original_registry = current_dir / "config" / "hooks_registry.json"
    backup_registry = current_dir / "config" / "hooks_registry_backup.json"
    
    if original_registry.exists():
        shutil.copy2(original_registry, backup_registry)
        print(f"  ✅ バックアップ作成: {backup_registry}")
    else:
        print(f"  ⚠️ 既存レジストリが見つかりません: {original_registry}")
    
    # Step 2: レジストリ更新
    print("\n🔄 Step 2: Hooksレジストリ更新...")
    new_registry = current_dir / "config" / "hooks_registry_v2.json"
    
    if new_registry.exists():
        # 新しいレジストリで上書き
        shutil.copy2(new_registry, original_registry)
        print(f"  ✅ レジストリ更新完了: AI Hooks統合版に更新")
        
        # 更新内容確認
        with open(original_registry, 'r', encoding='utf-8') as f:
            registry = json.load(f)
            ai_hooks_count = len(registry.get('ai_hooks', {}))
            print(f"  📊 AI Hooks登録数: {ai_hooks_count}個")
    else:
        print(f"  ❌ 新しいレジストリが見つかりません: {new_registry}")
        return False
    
    # Step 3: AI Hooksファイル確認
    print("\n📋 Step 3: AI Hooksファイル確認...")
    ai_files = [
        "ai_intelligent_system.py",
        "ai_development_suite.py", 
        "ai_system_monitor.py",
        "ai_hooks_executor.py"
    ]
    
    missing_files = []
    for ai_file in ai_files:
        file_path = current_dir / ai_file
        if file_path.exists():
            file_size = file_path.stat().st_size
            print(f"  ✅ {ai_file} ({file_size:,} bytes)")
        else:
            print(f"  ❌ {ai_file} (不足)")
            missing_files.append(ai_file)
    
    if missing_files:
        print(f"  ⚠️ 不足ファイル: {', '.join(missing_files)}")
    
    # Step 4: AI Hooks実行テスト
    print("\n🧪 Step 4: AI Hooks実行テスト...")
    
    try:
        # AI Hooksエグゼキューターのテスト
        sys.path.insert(0, str(current_dir))
        from ai_hooks_executor import AIHooksExecutor
        
        executor = AIHooksExecutor()
        
        # AI Hooks一覧取得
        hooks_info = executor.list_available_ai_hooks()
        print(f"  📋 検出されたAI Hooks: {hooks_info['ai_hooks_count']}個")
        
        for hook_name, hook_info in hooks_info['available_hooks'].items():
            print(f"    🤖 {hook_name}: {hook_info['description']}")
        
        # 簡易実行テスト
        if hooks_info['ai_hooks_count'] > 0:
            print("\n  🚀 簡易実行テスト...")
            
            # AI分析システムテスト
            test_result = executor.execute_ai_hook(
                "ai_intelligent_analysis",
                development_context={"project_path": ".", "description": "test"}
            )
            
            if test_result.get("success"):
                print("    ✅ AI分析システム: 正常動作")
            else:
                print(f"    ⚠️ AI分析システム: {test_result.get('error', 'エラー')}")
        
    except Exception as e:
        print(f"  ❌ AI Hooks実行テストエラー: {e}")
    
    # Step 5: 既存Hooksシステムとの互換性確認
    print("\n🔧 Step 5: 既存システム互換性確認...")
    
    # 既存のHooksファイル確認
    hooks_dir = current_dir / "hooks"
    if hooks_dir.exists():
        existing_hooks = list(hooks_dir.glob("*.py"))
        print(f"  📁 既存Hooks: {len(existing_hooks)}個")
        for hook_file in existing_hooks[:3]:  # 最初の3個表示
            print(f"    📄 {hook_file.name}")
        if len(existing_hooks) > 3:
            print(f"    ... 他{len(existing_hooks) - 3}個")
    
    # サーバーファイル確認
    server_file = current_dir / "hooks_server_code.py"
    if server_file.exists():
        print(f"  ✅ Hooksサーバー: 既存")
    else:
        print(f"  ⚠️ Hooksサーバー: 見つからない")
    
    # Step 6: 統合状況サマリー
    print("\n📊 Step 6: 統合状況サマリー")
    print("=" * 60)
    
    integration_score = 0
    total_checks = 4
    
    # レジストリ更新チェック
    if original_registry.exists():
        integration_score += 1
        print("✅ Hooksレジストリ更新: 完了")
    else:
        print("❌ Hooksレジストリ更新: 失敗")
    
    # AIファイルチェック
    if len(missing_files) == 0:
        integration_score += 1
        print("✅ AIファイル配置: 完了")
    else:
        print("❌ AIファイル配置: 不完全")
    
    # AI Hooks動作チェック
    try:
        executor = AIHooksExecutor()
        if executor.list_available_ai_hooks()['ai_hooks_count'] > 0:
            integration_score += 1
            print("✅ AI Hooks動作: 確認")
        else:
            print("❌ AI Hooks動作: 問題あり")
    except:
        print("❌ AI Hooks動作: エラー")
    
    # 既存システム保持チェック
    if hooks_dir.exists() and server_file.exists():
        integration_score += 1
        print("✅ 既存システム保持: 確認")
    else:
        print("❌ 既存システム保持: 問題あり")
    
    # 最終評価
    success_rate = integration_score / total_checks
    print(f"\n🎯 統合成功率: {success_rate:.1%} ({integration_score}/{total_checks})")
    
    if success_rate >= 0.75:
        print("🎉 AI Hooks統合成功！既存システムとの統合が完了しました")
        print("\n🚀 次のステップ:")
        print("  1. python3 ai_hooks_executor.py list (AI Hooks一覧確認)")
        print("  2. python3 ai_hooks_executor.py integrated (統合AI分析実行)")
        print("  3. python3 hooks_server_code.py (サーバー起動でAPI経由アクセス)")
        return True
    else:
        print("⚠️ 統合に問題があります。上記のエラーを確認してください")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
