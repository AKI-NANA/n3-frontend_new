#!/usr/bin/env python3
"""
🌟 ハイブリッド生成+自動保存システム統合版
COMPLETE_KNOWLEDGE_INTEGRATION.md準拠版.py + AutoSaveManager統合

【統合機能】
✅ 完全データ保証システム（既存）
✅ 汎用hooks選定システム（既存） 
✅ 自動保存システム（新規統合）
✅ ハイブリッド生成機能（新規）
"""

# === 既存インポートとクラス定義 ===
from dataclasses import dataclass, asdict
from typing import Dict, List, Any, Set, Optional, Tuple, Callable
import json
import os
from pathlib import Path
from datetime import datetime
from enum import Enum
import re

# === 既存のKnowledgeComponent、CompleteKnowledgeGuaranteeSystemは保持 ===
# （既存のCOMPLETE_KNOWLEDGE_INTEGRATION.md準拠版.pyの内容をそのまま保持）

# === 自動保存システム統合 ===

class AutoSaveManager:
    """自動保存マネージャー - 統合版"""
    
    def __init__(self, project_root: str = None):
        # プロジェクトルート設定
        if project_root:
            self.project_root = Path(project_root)
        else:
            self.project_root = Path.cwd()
        
        # 保存ディレクトリ構造
        self.save_directories = {
            'generated_hooks': self.project_root / 'generated_hooks',
            'development_plans': self.project_root / 'development_plans', 
            'customizations': self.project_root / 'customizations',
            'history': self.project_root / 'history',
            'sessions': self.project_root / 'sessions'
        }
        
        self._create_directory_structure()
        self.session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        print(f"💾 自動保存システム初期化完了")
        print(f"📁 プロジェクトルート: {self.project_root}")
        print(f"🔑 セッションID: {self.session_id}")
        
    def _create_directory_structure(self):
        """ディレクトリ構造作成"""
        for dir_name, dir_path in self.save_directories.items():
            dir_path.mkdir(parents=True, exist_ok=True)
    
    def save_hooks_package(self, package, auto_save: bool = True) -> Optional[str]:
        """生成hooksパッケージ自動保存"""
        
        if not auto_save:
            return None
            
        package_id = getattr(package, 'package_id', f"package_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        
        # パッケージデータ準備
        if hasattr(package, '__dict__'):
            package_data = asdict(package)
        elif isinstance(package, dict):
            package_data = package
        else:
            package_data = {'raw_data': str(package)}
        
        save_data = {
            'package_id': package_id,
            'session_id': self.session_id,
            'saved_at': datetime.now().isoformat(),
            'package': package_data
        }
        
        save_path = self.save_directories['generated_hooks'] / f"{package_id}.json"
        
        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)
        
        print(f"💾 自動保存: {save_path}")
        return str(save_path)
    
    def save_development_plan(self, plan_content: str, plan_name: str = None, auto_save: bool = True) -> Optional[str]:
        """開発計画MD自動保存"""
        
        if not auto_save:
            return None
            
        if plan_name is None:
            plan_name = f"development_plan_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        if not plan_name.endswith('.md'):
            plan_name += '.md'
        
        # メタデータ付きMD
        md_with_meta = f"""---
title: {plan_name.replace('.md', '')}
session_id: {self.session_id}
generated_at: {datetime.now().isoformat()}
type: development_plan
auto_generated: true
---

{plan_content}
"""
        
        save_path = self.save_directories['development_plans'] / plan_name
        
        with open(save_path, 'w', encoding='utf-8') as f:
            f.write(md_with_meta)
        
        print(f"💾 開発計画自動保存: {save_path}")
        return str(save_path)
    
    def save_session_summary(self, session_data: Dict) -> str:
        """セッション全体サマリー保存"""
        
        session_summary = {
            'session_id': self.session_id,
            'started_at': session_data.get('started_at', datetime.now().isoformat()),
            'completed_at': datetime.now().isoformat(),
            'session_data': session_data,
            'files_generated': session_data.get('generated_files', []),
            'statistics': {
                'total_hooks_generated': session_data.get('total_hooks', 0),
                'total_files_saved': len(session_data.get('generated_files', [])),
                'session_duration_minutes': session_data.get('duration_minutes', 0)
            }
        }
        
        save_path = self.save_directories['sessions'] / f"{self.session_id}_summary.json"
        
        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(session_summary, f, ensure_ascii=False, indent=2)
        
        print(f"💾 セッションサマリー保存: {save_path}")
        return str(save_path)

# === ハイブリッド生成システム ===

class HybridGenerationSystem:
    """ハイブリッド生成+自動保存システム"""
    
    def __init__(self, project_knowledge_search_function, enable_auto_save: bool = True, project_root: str = None):
        self.project_knowledge_search = project_knowledge_search_function
        self.enable_auto_save = enable_auto_save
        
        # 自動保存マネージャー初期化
        if enable_auto_save:
            self.auto_save = AutoSaveManager(project_root)
        else:
            self.auto_save = None
        
        # 既存システム初期化
        self.hooks_selector = None
        self.session_start_time = datetime.now()
        self.generated_files = []
        self.session_stats = {
            'hooks_generated': 0,
            'plans_created': 0,
            'files_saved': 0
        }
        
        print(f"🚀 ハイブリッド生成システム初期化")
        print(f"📊 自動保存: {'有効' if enable_auto_save else '無効'}")
    
    def _initialize_hooks_selector_if_needed(self):
        """hooks選定システム遅延初期化"""
        
        if self.hooks_selector is None:
            # IntegratedUniversalHooksSelectorの初期化
            # （既存のCOMPLETE_KNOWLEDGE_INTEGRATION.md準拠版.pyから）
            self.hooks_selector = IntegratedUniversalHooksSelector(self.project_knowledge_search)
    
    def generate_hooks_with_auto_save(self, 
                                    project_description: str,
                                    target_domain: str = "general",
                                    max_hooks: int = 15,
                                    complexity: str = "medium",
                                    create_development_plan: bool = True) -> Dict[str, Any]:
        """ハイブリッド生成：hooks生成+自動保存+開発計画作成"""
        
        print(f"🌟 ハイブリッド生成開始")
        print(f"📝 プロジェクト: {project_description}")
        print(f"🎯 ドメイン: {target_domain}")
        print(f"📊 最大hooks数: {max_hooks}")
        print(f"💾 自動保存: {'有効' if self.enable_auto_save else '無効'}")
        
        generation_result = {
            'success': False,
            'hooks_package': None,
            'development_plan': None,
            'saved_files': [],
            'session_id': getattr(self.auto_save, 'session_id', 'no_session'),
            'generation_timestamp': datetime.now().isoformat()
        }
        
        try:
            # 1. hooks選定システム初期化
            self._initialize_hooks_selector_if_needed()
            
            # 2. hooks生成実行
            print(f"\n🎯 Step 1: hooks自動生成")
            
            request = AutoHooksRequest(
                project_description=project_description,
                target_domain=target_domain,
                development_phases=[1, 2, 3, 4],
                required_features=project_description.split(),
                complexity_preference=complexity,
                max_hooks_count=max_hooks,
                custom_requirements=[]
            )
            
            hooks_package = self.hooks_selector.auto_generate_hooks_package(request)
            generation_result['hooks_package'] = hooks_package
            self.session_stats['hooks_generated'] = hooks_package.total_hooks
            
            # 3. hooks自動保存
            if self.enable_auto_save:
                print(f"\n💾 Step 2: hooks自動保存")
                
                hooks_save_path = self.auto_save.save_hooks_package(hooks_package)
                if hooks_save_path:
                    generation_result['saved_files'].append(hooks_save_path)
                    self.generated_files.append(hooks_save_path)
                    self.session_stats['files_saved'] += 1
            
            # 4. 開発計画生成・保存
            if create_development_plan:
                print(f"\n📋 Step 3: 開発計画生成")
                
                development_plan = self._generate_development_plan_from_hooks(hooks_package)
                generation_result['development_plan'] = development_plan
                self.session_stats['plans_created'] = 1
                
                if self.enable_auto_save:
                    plan_save_path = self.auto_save.save_development_plan(
                        development_plan,
                        f"{target_domain}_development_plan"
                    )
                    if plan_save_path:
                        generation_result['saved_files'].append(plan_save_path)
                        self.generated_files.append(plan_save_path)
                        self.session_stats['files_saved'] += 1
            
            # 5. セッション情報保存
            if self.enable_auto_save:
                print(f"\n📊 Step 4: セッション情報保存")
                
                session_data = {
                    'started_at': self.session_start_time.isoformat(),
                    'project_description': project_description,
                    'target_domain': target_domain,
                    'generated_files': self.generated_files,
                    'total_hooks': self.session_stats['hooks_generated'],
                    'duration_minutes': (datetime.now() - self.session_start_time).total_seconds() / 60
                }
                
                session_save_path = self.auto_save.save_session_summary(session_data)
                generation_result['saved_files'].append(session_save_path)
            
            generation_result['success'] = True
            
            print(f"\n🎉 ハイブリッド生成完了!")
            print(f"✅ 生成hooks数: {self.session_stats['hooks_generated']}個")
            print(f"✅ 保存ファイル数: {len(generation_result['saved_files'])}個")
            
            if generation_result['saved_files']:
                print(f"📁 保存ファイル:")
                for file_path in generation_result['saved_files']:
                    print(f"  - {file_path}")
            
        except Exception as e:
            generation_result['error'] = str(e)
            print(f"❌ ハイブリッド生成エラー: {e}")
        
        return generation_result
    
    def _generate_development_plan_from_hooks(self, hooks_package) -> str:
        """hooksパッケージから開発計画MD生成"""
        
        # 選定されたhooksを分析
        hooks = hooks_package.selected_hooks
        phases = {}
        
        for hook in hooks:
            for phase in hook.phase_target:
                if phase not in phases:
                    phases[phase] = []
                phases[phase].append(hook)
        
        # 開発計画MD生成
        plan_md = f"""# 🎯 {hooks_package.request.target_domain.title()}プロジェクト開発計画

## 📊 プロジェクト概要
- **プロジェクト**: {hooks_package.request.project_description}
- **ドメイン**: {hooks_package.request.target_domain}
- **選定hooks数**: {hooks_package.total_hooks}個
- **推定総時間**: {hooks_package.estimated_total_duration}分
- **信頼度**: {hooks_package.confidence_score:.2f}

## 📅 フェーズ別実装計画

"""
        
        for phase in sorted(phases.keys()):
            phase_hooks = phases[phase]
            phase_duration = sum(hook.estimated_duration for hook in phase_hooks)
            
            plan_md += f"""
### 🚀 Phase {phase} ({len(phase_hooks)}個のhooks, {phase_duration}分)

| Hook名 | カテゴリ | 優先度 | 推定時間 | 複雑度 |
|--------|----------|--------|----------|--------|
"""
            
            for hook in phase_hooks:
                plan_md += f"| {hook.hook_name} | {hook.hook_category.value} | {hook.hook_priority.value} | {hook.estimated_duration}分 | {hook.complexity_level} |\n"
        
        plan_md += f"""

## 📋 実装推奨順序
"""
        
        # 優先度順でソート
        all_hooks_sorted = sorted(hooks, key=lambda h: (h.hook_priority.value, h.complexity_level))
        
        for i, hook in enumerate(all_hooks_sorted[:10], 1):  # 上位10個
            plan_md += f"{i}. **{hook.hook_name}** ({hook.hook_priority.value}, {hook.complexity_level})\n"
        
        if len(hooks) > 10:
            plan_md += f"... 他{len(hooks) - 10}個\n"
        
        plan_md += f"""

## ⚠️ 実装時の注意事項
"""
        
        for note in hooks_package.adaptation_notes:
            plan_md += f"- {note}\n"
        
        return plan_md

# === 統合メイン関数 ===

def execute_hybrid_complete_system(project_knowledge_search_function, 
                                 enable_auto_save: bool = True,
                                 project_root: str = None):
    """ハイブリッド完全システム実行"""
    
    print("🌟 ハイブリッド完全システム実行開始")
    print("=" * 70)
    print("✅ 完全データ保証")
    print("✅ 汎用hooks選定") 
    print("✅ 自動保存システム")
    print("✅ 開発計画生成")
    print("=" * 70)
    
    # 1. 完全データ保証実行
    print(f"\n🔍 Step 1: 完全データ保証実行")
    guarantee_result = execute_complete_knowledge_guarantee(project_knowledge_search_function)
    
    # 2. ハイブリッド生成システム初期化
    print(f"\n🚀 Step 2: ハイブリッド生成システム初期化")
    hybrid_system = HybridGenerationSystem(
        project_knowledge_search_function, 
        enable_auto_save, 
        project_root
    )
    
    return {
        'guarantee_result': guarantee_result,
        'hybrid_system': hybrid_system,
        'ready_for_generation': True
    }

# === 簡単使用関数 ===

def create_project_with_auto_save(project_description: str,
                                target_domain: str = "general", 
                                max_hooks: int = 15,
                                complexity: str = "medium",
                                project_root: str = None) -> Dict[str, Any]:
    """
    🎯 プロジェクト生成+自動保存【ワンライナー関数】
    
    Args:
        project_description: プロジェクト説明
        target_domain: ドメイン
        max_hooks: 最大hooks数
        complexity: 複雑度
        project_root: 保存先ルート
    
    Returns:
        Dict: 生成結果（hooks, 計画, 保存ファイル）
    """
    
    print(f"🚀 プロジェクト生成+自動保存実行")
    print(f"📝 {project_description}")
    
    # デフォルト検索関数
    def dummy_search(keyword):
        return f"検索結果: {keyword}"
    
    # ハイブリッドシステム初期化
    hybrid_system = HybridGenerationSystem(dummy_search, True, project_root)
    
    # 生成+自動保存実行
    result = hybrid_system.generate_hooks_with_auto_save(
        project_description,
        target_domain,
        max_hooks,
        complexity,
        create_development_plan=True
    )
    
    print(f"\n🎉 完了! 保存ファイル数: {len(result['saved_files'])}")
    
    return result

"""
✅ ハイブリッド生成+自動保存システム統合完了

🎯 統合完了機能:
✅ 既存の完全データ保証システム（保持）
✅ 既存の汎用hooks選定システム（保持）
✅ 自動保存システム（新規統合）
✅ ハイブリッド生成機能（新規）
✅ 開発計画自動生成（新規）

🧪 簡単使用方法:
# ワンライナーで生成+自動保存
result = create_project_with_auto_save("ECサイト構築", "ecommerce", 12)

# フルコントロール
hybrid_system = HybridGenerationSystem(project_knowledge_search, True)
result = hybrid_system.generate_hooks_with_auto_save("プロジェクト説明", "domain")

🎉 これで生成と同時に自動保存されます！
📁 保存場所: プロジェクトルート/generated_hooks/ 他
"""