#!/usr/bin/env python3
"""
🚀 AI統合システム実行・テストスクリプト

3つのAIシステムファイルの統合動作確認
"""

import sys
import os
from pathlib import Path

def main():
    """統合テスト実行"""
    
    print("🤖 AI統合Hooksシステム - 3ファイル統合テスト")
    print("=" * 70)
    
    current_dir = Path(__file__).parent
    
    # 必要ファイルの存在確認
    required_files = [
        "ai_intelligent_system.py",
        "ai_development_suite.py", 
        "ai_system_monitor.py",
        "ai_integration_validator.py"
    ]
    
    print("📋 ファイル存在確認:")
    all_files_exist = True
    for file_name in required_files:
        file_path = current_dir / file_name
        exists = file_path.exists()
        status = "✅" if exists else "❌"
        print(f"  {status} {file_name}")
        if not exists:
            all_files_exist = False
    
    if not all_files_exist:
        print("\n❌ 必要ファイルが不足しています")
        return False
    
    print("\n🧪 個別システムテスト実行:")
    
    # 1. AI Intelligent System テスト
    print("\n🔍 AI Intelligent System テスト...")
    try:
        from ai_intelligent_system import AIIntelligentSystem
        ai_system = AIIntelligentSystem()
        result = ai_system.execute_comprehensive_ai_analysis()
        print(f"  ✅ AI分析実行成功 - {len(result.get('detailed_questions', []))}個の質問生成")
    except Exception as e:
        print(f"  ❌ AI Intelligent System エラー: {e}")
    
    # 2. AI Development Suite テスト
    print("\n🛠️ AI Development Suite テスト...")
    try:
        from ai_development_suite import AIDevelopmentSuite
        dev_suite = AIDevelopmentSuite()
        result = dev_suite.setup_comprehensive_ai_development_environment()
        print(f"  ✅ 開発環境セットアップ成功 - ワークスペース作成: {result.get('workspace_created', False)}")
    except Exception as e:
        print(f"  ❌ AI Development Suite エラー: {e}")
    
    # 3. AI System Monitor テスト
    print("\n📊 AI System Monitor テスト...")
    try:
        from ai_system_monitor import AISystemMonitor
        monitor = AISystemMonitor()
        result = monitor.execute_comprehensive_ai_monitoring()
        print(f"  ✅ システム監視成功 - 健全性スコア: {result.get('overall_health_score', 0):.2f}")
    except Exception as e:
        print(f"  ❌ AI System Monitor エラー: {e}")
    
    # 4. 統合テスト
    print("\n🔗 統合テスト実行...")
    try:
        from ai_integration_validator import AIHooksIntegrationValidator
        validator = AIHooksIntegrationValidator()
        result = validator.execute_comprehensive_ai_integration_test()
        
        score = result.get('comprehensive_integration_score', 0)
        ready = result.get('production_readiness', False)
        
        print(f"  ✅ 統合テスト完了")
        print(f"  📊 統合スコア: {score:.2f}/1.00")
        print(f"  🚀 本番準備: {'✅ 完了' if ready else '⚠️ 調整必要'}")
        
        # 推奨事項表示
        recommendations = result.get('recommendations', [])
        if recommendations:
            print(f"\n💡 推奨事項 ({len(recommendations)}件):")
            for i, rec in enumerate(recommendations[:3], 1):
                print(f"  {i}. {rec}")
        
    except Exception as e:
        print(f"  ❌ 統合テスト エラー: {e}")
    
    # ワークスペース状況確認
    print("\n📁 ワークスペース状況:")
    workspace_path = current_dir / "ai_workspace"
    if workspace_path.exists():
        file_count = sum(1 for f in workspace_path.rglob("*") if f.is_file())
        dir_count = sum(1 for d in workspace_path.rglob("*") if d.is_dir())
        print(f"  ✅ ai_workspace作成済み - {dir_count}ディレクトリ, {file_count}ファイル")
    else:
        print(f"  ⚠️ ai_workspaceが未作成")
    
    print("\n" + "=" * 70)
    print("🎉 AI統合システム差し替え・テスト完了")
    print("\n📋 差し替え完了ファイル:")
    print("  • ai_intelligent_system.py (intelligent_classification_system.py差し替え)")
    print("  • ai_development_suite.py (integrated_development_suite.py差し替え)")
    print("  • ai_system_monitor.py (system_health_monitor.py差し替え)")
    print("  • ai_integration_validator.py (統合テストシステム)")
    
    print("\n🚀 次のステップ:")
    print("  1. 各AIツール(DeepSeek, Ollama, Transformers)のインストール")
    print("  2. AI学習データの準備・設定")
    print("  3. CSS/JS/Python開発での実際のAI活用")
    print("  4. 将来AI機能の段階的展開")
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
