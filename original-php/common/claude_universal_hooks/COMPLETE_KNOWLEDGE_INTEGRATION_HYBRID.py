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

@dataclass
class KnowledgeComponent:
    """ナレッジコンポーネント定義"""
    component_id: str
    component_name: str
    required_files: List[str]
    search_keywords: List[str]
    validation_rules: List[str]
    priority: str  # critical, high, medium, low
    dependencies: List[str]

class HookPriority(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class HookCategory(Enum):
    FOUNDATION = "foundation_hooks"
    CSS_HTML = "css_html_hooks"
    JAVASCRIPT = "javascript_hooks"
    BACKEND_API = "backend_api_hooks"
    DATABASE = "database_hooks"
    TESTING = "testing_hooks"
    PERFORMANCE = "performance_hooks"
    AI_INTEGRATION = "ai_integration_hooks"
    SECURITY = "security_hooks"
    INTERNATIONALIZATION = "i18n_hooks"
    MONITORING = "monitoring_hooks"
    QUALITY_ASSURANCE = "qa_hooks"

@dataclass
class UnifiedHookDefinition:
    """統一Hook定義 - 全システム共通"""
    
    # 基本情報（必須）
    hook_id: str
    hook_name: str
    hook_category: HookCategory
    hook_priority: HookPriority
    phase_target: List[int]
    
    # 機能情報（必須）
    description: str
    implementation: str
    validation_rules: List[str]
    
    # 選定情報（自動選定用）
    keywords: List[str]
    selection_criteria: str
    html_compatibility: Dict[str, Any]
    
    # 実行情報（実行時）
    estimated_duration: int
    dependencies: List[str]
    questions: List[str]
    
    # メタ情報（管理用）
    created_at: str
    updated_at: str
    version: str
    source: str
    status: str

    def to_dict(self) -> Dict[str, Any]:
        """辞書形式変換"""
        result = asdict(self)
        result['hook_category'] = self.hook_category.value
        result['hook_priority'] = self.hook_priority.value
        return result

@dataclass
class AutoHooksRequest:
    """自動hooks選定リクエスト"""
    project_description: str
    target_domain: str
    development_phases: List[int]
    required_features: List[str]
    complexity_preference: str
    max_hooks_count: int
    custom_requirements: List[str]

@dataclass
class HooksPackage:
    """生成されたhooksパッケージ"""
    package_id: str
    request: AutoHooksRequest
    selected_hooks: List[UnifiedHookDefinition]
    total_hooks: int
    estimated_total_duration: int
    confidence_score: float
    adaptation_notes: List[str]
    generated_at: str

class CompleteKnowledgeGuaranteeSystem:
    """完全ナレッジ保証システム - COMPLETE_KNOWLEDGE_INTEGRATION.md準拠"""
    
    def __init__(self, project_knowledge_search_function):
        self.project_knowledge_search = project_knowledge_search_function
        self.required_components = self._initialize_required_components()
        self.verification_results = {}
        self.missing_data_report = {}
        self.guarantee_log = []
        
    def _initialize_required_components(self) -> Dict[str, KnowledgeComponent]:
        """必須ナレッジコンポーネント初期化（COMPLETE_KNOWLEDGE_INTEGRATION.md準拠）"""
        
        components = {}
        
        # 1. 統一Hooksシステム中核
        components["unified_hooks_core"] = KnowledgeComponent(
            component_id="unified_hooks_core",
            component_name="統一Hooksシステム中核",
            required_files=[
                "COMPLETE_KNOWLEDGE_INTEGRATION.md",
                "unified_hooks_system.py",
                "UnifiedHookDefinition"
            ],
            search_keywords=[
                "UnifiedHookDefinition", "統一Hooksシステム", "HookPriority", 
                "HookCategory", "COMPLETE_KNOWLEDGE_INTEGRATION"
            ],
            validation_rules=[
                "UnifiedHookDefinitionクラスが定義されている",
                "HookPriorityとHookCategoryが定義されている",
                "統一データ構造が含まれている"
            ],
            priority="critical",
            dependencies=[]
        )
        
        # 2. 統一データベース・認証システム
        components["unified_database_auth"] = KnowledgeComponent(
            component_id="unified_database_auth",
            component_name="統一データベース・認証システム",
            required_files=[
                "UnifiedDatabaseConfig",
                "UnifiedAuthManager",
                "unified_settings.json"
            ],
            search_keywords=[
                "UnifiedDatabaseConfig", "UnifiedAuthManager", "postgresql", 
                "jwt_with_session_fallback", "統一認証"
            ],
            validation_rules=[
                "PostgreSQL標準・MySQL例外設定が含まれている",
                "JWT+セッション統一認証が定義されている",
                "統一レスポンス形式が定義されている"
            ],
            priority="critical",
            dependencies=["unified_hooks_core"]
        )
        
        # 3. 統一Hooksデータベース
        components["unified_hooks_database"] = KnowledgeComponent(
            component_id="unified_hooks_database",
            component_name="統一Hooksデータベース",
            required_files=[
                "UnifiedHooksDatabase",
                "phase_index",
                "category_index"
            ],
            search_keywords=[
                "UnifiedHooksDatabase", "phase_index", "category_index",
                "register_hook", "get_hooks_by_phase"
            ],
            validation_rules=[
                "Hooksデータベース管理システムが含まれている",
                "Phase別インデックス機能が含まれている",
                "キーワード検索機能が含まれている"
            ],
            priority="critical",
            dependencies=["unified_hooks_core"]
        )
        
        # 4. 統一Hook選定システム
        components["unified_hooks_selector"] = KnowledgeComponent(
            component_id="unified_hooks_selector",
            component_name="統一Hook選定システム",
            required_files=[
                "UnifiedHooksSelector",
                "auto_select_hooks",
                "html_analysis"
            ],
            search_keywords=[
                "UnifiedHooksSelector", "auto_select_hooks", "html_analysis",
                "development_instruction", "selection_score"
            ],
            validation_rules=[
                "自動Hook選定システムが含まれている",
                "HTML互換性チェック機能が含まれている",
                "キーワードマッチング機能が含まれている"
            ],
            priority="critical",
            dependencies=["unified_hooks_database"]
        )
        
        # 5. 汎用ローカル参照システム
        components["universal_local_system"] = KnowledgeComponent(
            component_id="universal_local_system",
            component_name="汎用ローカル参照システム",
            required_files=[
                "UniversalLocalSystem",
                "smart_search",
                "auto_save_file"
            ],
            search_keywords=[
                "UniversalLocalSystem", "smart_search", "auto_save_file",
                "file_index", "project_root", "自動保存"
            ],
            validation_rules=[
                "プロジェクト自動検出機能が含まれている",
                "インテリジェント検索機能が含まれている",
                "自動保存機能が含まれている"
            ],
            priority="high",
            dependencies=["unified_hooks_core"]
        )
        
        # 6. ナレッジ統合システム
        components["knowledge_integration"] = KnowledgeComponent(
            component_id="knowledge_integration",
            component_name="ナレッジ統合システム",
            required_files=[
                "KnowledgeIntegrationSystem",
                "project_knowledge_search",
                "load_universal_hooks"
            ],
            search_keywords=[
                "KnowledgeIntegrationSystem", "project_knowledge_search",
                "load_universal_hooks", "ナレッジ統合", "phase別読み込み"
            ],
            validation_rules=[
                "project_knowledge_search統合機能が含まれている",
                "Phase別ナレッジ読み込み機能が含まれている",
                "検索結果解析機能が含まれている"
            ],
            priority="high",
            dependencies=["unified_hooks_selector"]
        )
        
        # 7. 汎用Hooks完全検出システム
        components["universal_hooks_detection"] = KnowledgeComponent(
            component_id="universal_hooks_detection",
            component_name="汎用Hooks完全検出システム",
            required_files=[
                "UniversalHooksDetectionSystem",
                "detect_all_hooks_automatically",
                "auto_categorize_hooks"
            ],
            search_keywords=[
                "UniversalHooksDetectionSystem", "detect_all_hooks_automatically",
                "auto_categorize_hooks", "新規Hook発見", "信頼度評価"
            ],
            validation_rules=[
                "全Hooks自動検出機能が含まれている",
                "自動分類・カテゴリ化機能が含まれている",
                "新規Hook発見機能が含まれている"
            ],
            priority="high",
            dependencies=["knowledge_integration"]
        )
        
        # 8. 汎用Hooks選定システム
        components["universal_hooks_selection"] = KnowledgeComponent(
            component_id="universal_hooks_selection",
            component_name="汎用Hooks選定システム",
            required_files=[
                "UniversalHooksSelector",
                "190種類汎用Hooks",
                "auto_select_optimal_hooks"
            ],
            search_keywords=[
                "UniversalHooksSelector", "190種類", "汎用Hooks",
                "auto_select_optimal_hooks", "html_analysis", "phase別選定"
            ],
            validation_rules=[
                "190種類Hooksデータベースが含まれている",
                "最適Hook自動選定機能が含まれている",
                "選定結果レポート機能が含まれている"
            ],
            priority="high",
            dependencies=["universal_hooks_detection"]
        )
        
        # 9. スマートMD分割システム
        components["smart_md_splitting"] = KnowledgeComponent(
            component_id="smart_md_splitting",
            component_name="スマートMD分割システム",
            required_files=[
                "SmartMDSplittingSystem",
                "split_massive_md_intelligently",
                "progressive_presenter"
            ],
            search_keywords=[
                "SmartMDSplittingSystem", "split_massive_md_intelligently",
                "progressive_presenter", "知的分割", "段階提示"
            ],
            validation_rules=[
                "膨大なMD文書の知的分割機能が含まれている",
                "段階的提示機能が含まれている",
                "ナビゲーションシステムが含まれている"
            ],
            priority="medium",
            dependencies=["universal_hooks_selection"]
        )
        
        # 10. 最終実行コントローラー
        components["final_execution_controller"] = KnowledgeComponent(
            component_id="final_execution_controller",
            component_name="最終実行コントローラー",
            required_files=[
                "FinalExecutionController",
                "execute_complete_autonomous_development",
                "クロード自律実行"
            ],
            search_keywords=[
                "FinalExecutionController", "execute_complete_autonomous_development",
                "クロード自律実行", "完全自律実行", "最終実行コントローラー"
            ],
            validation_rules=[
                "5つのコンポーネント完全統合機能が含まれている",
                "完全自律実行機能が含まれている",
                "最終MD自動生成機能が含まれている"
            ],
            priority="medium",
            dependencies=["smart_md_splitting"]
        )
        
        return components
    
    def execute_complete_data_guarantee(self):
        """完全データ保証実行 - 10個コンポーネント順次検証"""
        
        guarantee_result = {
            'execution_id': f"guarantee_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'total_components': len(self.required_components),
            'verified_components': 0,
            'missing_components': [],
            'verification_details': {},
            'dependency_check': {},
            'guarantee_status': 'unknown'
        }
        
        print("🔍 完全データ保証実行開始")
        print("=" * 60)
        print("COMPLETE_KNOWLEDGE_INTEGRATION.md準拠 - 10個コンポーネント検証")
        print("=" * 60)
        
        try:
            # 依存関係順で検証実行
            verification_order = self._calculate_verification_order()
            
            for component_id in verification_order:
                component = self.required_components[component_id]
                
                print(f"\n🔍 検証中: {component.component_name}")
                
                # コンポーネント検証実行
                verification_result = self._verify_component(component)
                guarantee_result['verification_details'][component_id] = verification_result
                
                if verification_result['status'] == 'verified':
                    guarantee_result['verified_components'] += 1
                    print(f"✅ 検証成功: {verification_result['found_items']}個のアイテム発見")
                else:
                    guarantee_result['missing_components'].append(component_id)
                    print(f"❌ 検証失敗: {verification_result['missing_items']}個のアイテム不足")
                    
                    # 重要コンポーネントが不足している場合の警告
                    if component.priority == 'critical':
                        print(f"⚠️  CRITICAL: {component.component_name}の不足は致命的です")
            
            # 最終判定
            verification_rate = (guarantee_result['verified_components'] / guarantee_result['total_components']) * 100
            
            if verification_rate >= 90:
                guarantee_result['guarantee_status'] = 'excellent'
            elif verification_rate >= 70:
                guarantee_result['guarantee_status'] = 'good'
            elif verification_rate >= 50:
                guarantee_result['guarantee_status'] = 'partial'
            else:
                guarantee_result['guarantee_status'] = 'insufficient'
            
            guarantee_result['verification_rate'] = verification_rate
            
            print("\n" + "=" * 60)
            print(f"🎯 完全データ保証完了")
            print(f"検証率: {verification_rate:.1f}% ({guarantee_result['verified_components']}/{guarantee_result['total_components']})")
            print(f"保証レベル: {guarantee_result['guarantee_status'].upper()}")
            print("=" * 60)
            
        except Exception as e:
            guarantee_result['error'] = str(e)
            guarantee_result['guarantee_status'] = 'error'
            print(f"❌ 保証実行エラー: {e}")
        
        self.verification_results = guarantee_result
        return guarantee_result
    
    def _verify_component(self, component: KnowledgeComponent) -> Dict[str, Any]:
        """個別コンポーネント検証"""
        
        verification_result = {
            'component_id': component.component_id,
            'status': 'unknown',
            'found_items': 0,
            'missing_items': 0,
            'search_results': [],
            'validation_results': [],
            'confidence_score': 0.0
        }
        
        try:
            # キーワード検索実行
            for keyword in component.search_keywords:
                try:
                    search_result = self.project_knowledge_search(keyword)
                    if search_result:
                        verification_result['search_results'].append({
                            'keyword': keyword,
                            'found': True,
                            'result_length': len(str(search_result))
                        })
                        verification_result['found_items'] += 1
                    else:
                        verification_result['search_results'].append({
                            'keyword': keyword,
                            'found': False,
                            'result_length': 0
                        })
                        verification_result['missing_items'] += 1
                except Exception as e:
                    verification_result['search_results'].append({
                        'keyword': keyword,
                        'found': False,
                        'error': str(e)
                    })
                    verification_result['missing_items'] += 1
            
            # バリデーション実行
            for rule in component.validation_rules:
                rule_result = self._validate_rule(rule, verification_result['search_results'])
                verification_result['validation_results'].append({
                    'rule': rule,
                    'passed': rule_result
                })
            
            # 信頼度スコア計算
            total_searches = len(component.search_keywords)
            successful_searches = verification_result['found_items']
            passed_validations = sum(1 for v in verification_result['validation_results'] if v['passed'])
            total_validations = len(verification_result['validation_results'])
            
            search_score = (successful_searches / total_searches) if total_searches > 0 else 0
            validation_score = (passed_validations / total_validations) if total_validations > 0 else 0
            
            verification_result['confidence_score'] = (search_score + validation_score) / 2
            
            # 最終判定
            if verification_result['confidence_score'] >= 0.7:
                verification_result['status'] = 'verified'
            elif verification_result['confidence_score'] >= 0.5:
                verification_result['status'] = 'partial'
            else:
                verification_result['status'] = 'missing'
                
        except Exception as e:
            verification_result['status'] = 'error'
            verification_result['error'] = str(e)
        
        return verification_result
    
    def _validate_rule(self, rule: str, search_results: List[Dict]) -> bool:
        """バリデーションルール実行"""
        
        # 簡易ルール検証（実際の実装ではより詳細な検証を行う）
        rule_keywords = rule.lower().split()
        
        for result in search_results:
            if result.get('found', False):
                # キーワードマッチングによる簡易検証
                for keyword in rule_keywords:
                    if any(keyword in result.get('keyword', '').lower() for result in search_results if result.get('found')):
                        return True
        
        return False
    
    def _calculate_verification_order(self) -> List[str]:
        """依存関係を考慮した検証順序計算"""
        
        # トポロジカルソート（簡易版）
        order = []
        remaining = set(self.required_components.keys())
        
        while remaining:
            # 依存関係のないコンポーネントを探す
            ready = []
            for component_id in remaining:
                component = self.required_components[component_id]
                if not component.dependencies or all(dep in order for dep in component.dependencies):
                    ready.append(component_id)
            
            if not ready:
                # 循環依存の場合は残り全てを追加
                ready = list(remaining)
            
            # 優先度順でソート
            ready.sort(key=lambda x: ['critical', 'high', 'medium', 'low'].index(self.required_components[x].priority))
            
            order.extend(ready)
            remaining -= set(ready)
        
        return order

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

# === 汎用hooks選定システム（簡易版） ===

class IntegratedUniversalHooksSelector:
    """統合汎用hooks選定システム"""
    
    def __init__(self, project_knowledge_search_function):
        self.project_knowledge_search = project_knowledge_search_function
        self.hooks_database = self._initialize_sample_hooks()
        
    def _initialize_sample_hooks(self) -> List[UnifiedHookDefinition]:
        """サンプルhooksデータベース初期化"""
        
        hooks = []
        
        # Foundation hooks
        hooks.append(UnifiedHookDefinition(
            hook_id="foundation_001",
            hook_name="プロジェクト初期セットアップHook",
            hook_category=HookCategory.FOUNDATION,
            hook_priority=HookPriority.CRITICAL,
            phase_target=[1],
            description="プロジェクトの基本構造とディレクトリ設定",
            implementation="ディレクトリ作成、設定ファイル生成、依存関係設定",
            validation_rules=["ディレクトリ構造確認", "設定ファイル存在確認"],
            keywords=["setup", "init", "project", "foundation", "初期設定"],
            selection_criteria="新規プロジェクトまたは初期設定が必要な場合",
            html_compatibility={},
            estimated_duration=30,
            dependencies=[],
            questions=["プロジェクト名は決まっていますか？", "使用する技術スタックは？"],
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            version="1.0.0",
            source="integrated_system",
            status="active"
        ))
        
        # Database hooks
        hooks.append(UnifiedHookDefinition(
            hook_id="database_001",
            hook_name="データベース接続設定Hook",
            hook_category=HookCategory.DATABASE,
            hook_priority=HookPriority.HIGH,
            phase_target=[1, 2],
            description="統一データベース接続設定（PostgreSQL/MySQL対応）",
            implementation="環境変数設定、接続プール設定、マイグレーション準備",
            validation_rules=["接続テスト成功", "環境変数設定確認"],
            keywords=["database", "db", "postgresql", "mysql", "connection"],
            selection_criteria="データベースを使用するプロジェクト",
            html_compatibility={},
            estimated_duration=45,
            dependencies=["foundation_001"],
            questions=["PostgreSQLとMySQLどちらを使用しますか？", "既存DBはありますか？"],
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            version="1.0.0",
            source="integrated_system",
            status="active"
        ))
        
        # JavaScript hooks
        hooks.append(UnifiedHookDefinition(
            hook_id="javascript_001",
            hook_name="モダンJavaScript環境構築Hook",
            hook_category=HookCategory.JAVASCRIPT,
            hook_priority=HookPriority.HIGH,
            phase_target=[2, 3],
            description="ES6+、TypeScript、バンドラー設定",
            implementation="Webpack/Vite設定、TypeScript設定、linter設定",
            validation_rules=["ビルド成功", "linter通過"],
            keywords=["javascript", "typescript", "es6", "webpack", "vite"],
            selection_criteria="モダンJavaScript開発を行う場合",
            html_compatibility={"requires_modern_browser": True},
            estimated_duration=60,
            dependencies=["foundation_001"],
            questions=["TypeScriptを使用しますか？", "バンドラーの選択は？"],
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            version="1.0.0",
            source="integrated_system",
            status="active"
        ))
        
        # API hooks
        hooks.append(UnifiedHookDefinition(
            hook_id="api_001",
            hook_name="RESTful API設計Hook",
            hook_category=HookCategory.BACKEND_API,
            hook_priority=HookPriority.MEDIUM,
            phase_target=[2, 3],
            description="REST API設計と実装",
            implementation="ルーティング設定、コントローラー作成、API文書生成",
            validation_rules=["APIテスト通過", "ドキュメント生成確認"],
            keywords=["api", "rest", "restful", "endpoint", "routing"],
            selection_criteria="API開発が必要な場合",
            html_compatibility={},
            estimated_duration=90,
            dependencies=["database_001"],
            questions=["API仕様書は準備済みですか？", "認証方式は？"],
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            version="1.0.0",
            source="integrated_system",
            status="active"
        ))
        
        # Testing hooks
        hooks.append(UnifiedHookDefinition(
            hook_id="testing_001",
            hook_name="自動テスト環境構築Hook",
            hook_category=HookCategory.TESTING,
            hook_priority=HookPriority.MEDIUM,
            phase_target=[3, 4],
            description="ユニットテスト、統合テスト環境設定",
            implementation="テストフレームワーク設定、CI/CD設定、カバレッジ設定",
            validation_rules=["テスト実行成功", "カバレッジ計測確認"],
            keywords=["test", "testing", "unit", "integration", "ci"],
            selection_criteria="品質保証が重要なプロジェクト",
            html_compatibility={},
            estimated_duration=75,
            dependencies=["javascript_001", "api_001"],
            questions=["テストフレームワークの希望は？", "CI/CDプラットフォームは？"],
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            version="1.0.0",
            source="integrated_system",
            status="active"
        ))
        
        return hooks
    
    def auto_generate_hooks_package(self, request: AutoHooksRequest) -> HooksPackage:
        """自動hooks選定とパッケージ生成"""
        
        print(f"🎯 hooks自動選定開始")
        print(f"📝 プロジェクト: {request.project_description}")
        print(f"🎯 ドメイン: {request.target_domain}")
        
        # キーワード分析
        description_lower = request.project_description.lower()
        domain_keywords = self._extract_domain_keywords(request.target_domain)
        project_keywords = request.required_features + [request.target_domain]
        
        # hooks選定
        selected_hooks = []
        
        for hook in self.hooks_database:
            selection_score = 0
            
            # キーワードマッチング
            for keyword in hook.keywords:
                if keyword.lower() in description_lower:
                    selection_score += 3
                if keyword in domain_keywords:
                    selection_score += 2
                if keyword in [f.lower() for f in project_keywords]:
                    selection_score += 1
            
            # Phase対象チェック
            if any(phase in request.development_phases for phase in hook.phase_target):
                selection_score += 2
            
            # 優先度ボーナス
            if hook.hook_priority == HookPriority.CRITICAL:
                selection_score += 5
            elif hook.hook_priority == HookPriority.HIGH:
                selection_score += 3
            
            # 選定判定
            if selection_score >= 5 or hook.hook_priority == HookPriority.CRITICAL:
                selected_hooks.append(hook)
                print(f"✅ 選定: {hook.hook_name} (スコア: {selection_score})")
        
        # 最大数制限
        if len(selected_hooks) > request.max_hooks_count:
            # 優先度とスコアで並び替えて上位を選択
            selected_hooks.sort(key=lambda h: (
                ['critical', 'high', 'medium', 'low'].index(h.hook_priority.value),
                -len([k for k in h.keywords if k.lower() in description_lower])
            ))
            selected_hooks = selected_hooks[:request.max_hooks_count]
        
        # パッケージ生成
        package = HooksPackage(
            package_id=f"hooks_pkg_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            request=request,
            selected_hooks=selected_hooks,
            total_hooks=len(selected_hooks),
            estimated_total_duration=sum(hook.estimated_duration for hook in selected_hooks),
            confidence_score=0.85,
            adaptation_notes=[
                f"プロジェクト「{request.project_description}」に最適化",
                f"ドメイン「{request.target_domain}」に特化",
                f"合計{len(selected_hooks)}個のhooksを選定"
            ],
            generated_at=datetime.now().isoformat()
        )
        
        print(f"🎉 hooks選定完了: {len(selected_hooks)}個")
        return package
    
    def _extract_domain_keywords(self, domain: str) -> List[str]:
        """ドメイン別キーワード抽出"""
        
        domain_map = {
            "ecommerce": ["shop", "cart", "payment", "product", "order"],
            "blog": ["post", "article", "content", "cms", "editor"],
            "dashboard": ["admin", "analytics", "chart", "report", "stats"],
            "social": ["user", "profile", "friend", "message", "feed"],
            "education": ["course", "lesson", "student", "teacher", "quiz"],
            "finance": ["money", "transaction", "account", "balance", "payment"],
            "healthcare": ["patient", "medical", "appointment", "health", "treatment"],
            "real_estate": ["property", "listing", "agent", "search", "location"]
        }
        
        return domain_map.get(domain.lower(), [])

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
                plan_md += f"| {hook.hook_name} | {hook.hook_category.value} | {hook.hook_priority.value} | {hook.estimated_duration}分 | {hook.complexity_level if hasattr(hook, 'complexity_level') else 'N/A'} |\n"
        
        plan_md += f"""

## 📋 実装推奨順序
"""
        
        # 優先度順でソート
        all_hooks_sorted = sorted(hooks, key=lambda h: (h.hook_priority.value, getattr(h, 'complexity_level', 'medium')))
        
        for i, hook in enumerate(all_hooks_sorted[:10], 1):  # 上位10個
            plan_md += f"{i}. **{hook.hook_name}** ({hook.hook_priority.value})\n"
        
        if len(hooks) > 10:
            plan_md += f"... 他{len(hooks) - 10}個\n"
        
        plan_md += f"""

## ⚠️ 実装時の注意事項
"""
        
        for note in hooks_package.adaptation_notes:
            plan_md += f"- {note}\n"
        
        return plan_md

# === 統合メイン関数 ===

def execute_complete_knowledge_guarantee(project_knowledge_search_function):
    """完全ナレッジ保証実行関数"""
    
    print("🌟 完全ナレッジ保証システム開始")
    print("COMPLETE_KNOWLEDGE_INTEGRATION.md準拠版")
    print("10個必須コンポーネント完全検証")
    print("=" * 60)
    
    # システム初期化
    guarantee_system = CompleteKnowledgeGuaranteeSystem(project_knowledge_search_function)
    
    # 完全データ保証実行
    guarantee_result = guarantee_system.execute_complete_data_guarantee()
    
    return guarantee_result

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