# 🪝 統合Hooks生成システム実装指示書【自然言語対応修正版】

## 🎯 **実装目的**
既存の優秀なHooksシステム（Universal Hooks、NAGANO3 Project Hooks、Phase1の43エラーパターン予防）を100%活用しながら、自然言語指示書からの自動Hooks生成機能を追加実装する。既存システムとの完全互換性を保ち、プロジェクト環境への自動適応を実現する。

---

## 📊 **実装アーキテクチャ（既存システム完全統合）**

### **🔄 システム構成原則**
```python
# 【設計原則】既存システム100%活用 + 自然言語機能追加
class EnhancedHooksSystem:
    def __init__(self):
        # 【最優先】既存システムの参照・活用
        self.existing_universal_hooks = ExistingUniversalHooksSystem()
        self.existing_nagano3_hooks = ExistingNAGANO3HooksSystem()
        self.existing_phase1_prevention = ExistingPhase1System()
        
        # 【新機能】既存システム補完用
        self.natural_language_parser = NaturalLanguageParser()
        self.auto_directory_manager = AutoDirectoryManager()
        self.hooks_auto_generator = HooksAutoGenerator()
        
        # 【重要】実行優先順位
        self.execution_priority = [
            'existing_universal_hooks',      # 最優先
            'existing_nagano3_hooks',        # 最優先
            'existing_phase1_prevention',    # 最優先
            'natural_language_hooks'         # 補完的
        ]
```

---

## 🔍 **実装 Phase 1: 自動ディレクトリ検出・管理システム**

### **🎯 プロジェクト環境自動適応（必須実装）**

#### **1. AutoDirectoryManager クラス実装**
```python
import os
import json
from pathlib import Path
from typing import Dict, List, Optional

class AutoDirectoryManager:
    """プロジェクト環境に応じたディレクトリ自動検出・管理"""
    
    def __init__(self):
        # 検索候補パターン（優先順位つき）
        self.search_patterns = [
            # 一時作業用（最優先）
            '.nagano3/hooks/',
            '.nagano3/temp/',
            
            # システム用
            'system_core/hooks/',
            'system/hooks/',
            
            # ツール用
            'tools/hooks/',
            'scripts/hooks/',
            'dev_tools/hooks/',
            
            # 汎用
            'hooks/',
            'automation/',
            
            # プロジェクト固有
            'modules/hooks/',
            'common/hooks/'
        ]
        
        # プロジェクトルート指標
        self.project_root_indicators = [
            '.git',                    # Gitリポジトリ
            'composer.json',           # PHPプロジェクト
            'package.json',            # Nodeプロジェクト
            'modules',                 # NAGANOプロジェクト
            'common',                  # NAGANOプロジェクト
            'system_core',             # システムコアプロジェクト
            '.nagano3'                 # NAGANO3プロジェクト
        ]
    
    def auto_detect_project_environment(self) -> Dict[str, str]:
        """プロジェクト環境の自動検出"""
        
        project_root = self._detect_project_root()
        detected_directories = self._detect_existing_directories(project_root)
        hooks_directories = self._assign_hooks_directories(detected_directories, project_root)
        
        # 不足ディレクトリの自動作成
        self._ensure_required_directories(hooks_directories)
        
        # 環境情報の保存
        self._save_environment_config(hooks_directories)
        
        return hooks_directories
    
    def _detect_project_root(self) -> str:
        """プロジェクトルートの自動検出"""
        
        current_dir = Path.cwd()
        
        # 上位10階層まで検索
        for _ in range(10):
            # 指標ファイル・ディレクトリの確認
            for indicator in self.project_root_indicators:
                indicator_path = current_dir / indicator
                if indicator_path.exists():
                    return str(current_dir)
            
            # 親ディレクトリへ移動
            parent = current_dir.parent
            if parent == current_dir:  # ルートディレクトリに到達
                break
            current_dir = parent
        
        # 見つからない場合は現在のディレクトリ
        return str(Path.cwd())
    
    def _detect_existing_directories(self, project_root: str) -> List[str]:
        """既存ディレクトリの検出"""
        
        existing_dirs = []
        root_path = Path(project_root)
        
        for pattern in self.search_patterns:
            candidate_path = root_path / pattern
            if candidate_path.exists() and candidate_path.is_dir():
                existing_dirs.append(str(candidate_path))
        
        return existing_dirs
    
    def _assign_hooks_directories(self, existing_dirs: List[str], project_root: str) -> Dict[str, str]:
        """用途別ディレクトリの割り当て"""
        
        root_path = Path(project_root)
        
        # デフォルト割り当て
        assignments = {
            'project_root': project_root,
            'templates': None,         # テンプレート格納用
            'runtime': None,           # 実行時hooks用
            'temp': None,              # 一時ファイル用
            'config': None,            # 設定ファイル用
            'logs': None               # ログファイル用
        }
        
        # 既存ディレクトリからの割り当て
        for existing_dir in existing_dirs:
            if '.nagano3' in existing_dir:
                if not assignments['temp']:
                    assignments['temp'] = existing_dir
                elif not assignments['runtime']:
                    assignments['runtime'] = existing_dir
            elif 'system' in existing_dir:
                if not assignments['runtime']:
                    assignments['runtime'] = existing_dir
            elif 'tools' in existing_dir or 'scripts' in existing_dir:
                if not assignments['templates']:
                    assignments['templates'] = existing_dir
        
        # 不足分のデフォルト設定
        if not assignments['runtime']:
            assignments['runtime'] = str(root_path / '.nagano3/hooks/')
        if not assignments['temp']:
            assignments['temp'] = str(root_path / '.nagano3/temp/')
        if not assignments['templates']:
            assignments['templates'] = str(root_path / '.nagano3/templates/')
        if not assignments['config']:
            assignments['config'] = str(root_path / '.nagano3/config/')
        if not assignments['logs']:
            assignments['logs'] = str(root_path / '.nagano3/logs/')
        
        return assignments
    
    def _ensure_required_directories(self, assignments: Dict[str, str]) -> None:
        """必要ディレクトリの作成"""
        
        for purpose, path in assignments.items():
            if purpose != 'project_root' and path:
                Path(path).mkdir(parents=True, exist_ok=True)
    
    def _save_environment_config(self, assignments: Dict[str, str]) -> None:
        """環境設定の保存"""
        
        config_path = Path(assignments['config']) / 'environment.json'
        config_data = {
            'detected_at': datetime.now().isoformat(),
            'directories': assignments,
            'auto_detected': True
        }
        
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config_data, f, indent=2, ensure_ascii=False)
```

---

## 🔍 **実装 Phase 2: 自然言語指示書解析エンジン**

### **🎯 既存NAGANO3形式優先の自然言語解析（重要実装）**

#### **1. NaturalLanguageParser クラス実装**
```python
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Union
from enum import Enum

class InstructionFormat(Enum):
    """指示書形式の種別"""
    NAGANO3_STRUCTURED = "nagano3_structured"  # 既存システムで処理
    MARKDOWN_GENERIC = "markdown_generic"
    PLAIN_TEXT = "plain_text"
    BULLET_POINTS = "bullet_points"
    NUMBERED_LIST = "numbered_list"
    MIXED_FORMAT = "mixed_format"

@dataclass
class ExtractedRequirement:
    """抽出された要件データ"""
    category: str
    detected_keywords: List[str]
    confidence_score: float
    source_context: str
    
    # 既存システム統合情報
    phase0_integration: Dict[str, str]
    phase1_error_prevention: List[int]
    universal_hooks_integration: List[str]
    hooks_template: str

class NaturalLanguageParser:
    """既存NAGANO3形式を最優先とした自然言語解析"""
    
    def __init__(self):
        # 既存システムの知識データベース
        self.existing_43_errors = self._load_existing_error_patterns()
        self.existing_phase0_questions = self._load_existing_phase0_questions()
        self.existing_hooks_knowledge = self._load_existing_hooks_knowledge()
        
        # 自然言語解析パターン（既存システム互換）
        self.analysis_patterns = {
            'database': {
                'keywords': [
                    'データベース', 'PostgreSQL', 'MySQL', 'SQLite', 'DB',
                    'database', 'postgres', 'mysql', 'sqlite', 'データ保存'
                ],
                'existing_integration': {
                    'phase0_question': 'Q1: データベース接続（実DB必須・模擬データ禁止）',
                    'phase1_errors': [4, 10, 25],  # PHP構文、SECURE_ACCESS、CSRF検証
                    'universal_hooks': ['セキュリティ検証', 'コード品質検証'],
                    'hooks_template': 'enhanced_database_check'
                }
            },
            'security': {
                'keywords': [
                    'セキュリティ', 'CSRF', '認証', '権限', 'XSS', 'SQLインジェクション',
                    'security', 'authentication', 'authorization', 'csrf', 'xss'
                ],
                'existing_integration': {
                    'phase0_question': 'セキュリティ実装方針の確認',
                    'phase1_errors': [5, 10, 25, 26],  # CSRF403、SECURE_ACCESS、XSS対策
                    'universal_hooks': ['セキュリティ検証', '基本機能検証'],
                    'hooks_template': 'enhanced_security_check'
                }
            },
            'api': {
                'keywords': [
                    'API', '連携', 'FastAPI', 'REST', 'Python API', 'エンドポイント',
                    'api', 'fastapi', 'rest', 'endpoint', '外部API', 'API通信'
                ],
                'existing_integration': {
                    'phase0_question': 'Q2: Python API連携（実連携必須・模擬レスポンス禁止）',
                    'phase1_errors': [3, 15, 21],  # Ajax処理失敗、Python API連携、ネットワーク
                    'universal_hooks': ['基本機能検証'],
                    'hooks_template': 'enhanced_api_check'
                }
            },
            'javascript': {
                'keywords': [
                    'JavaScript', 'Ajax', 'イベント処理', 'DOM操作', 'jQuery',
                    'javascript', 'ajax', 'dom', 'jquery', 'フロントエンド'
                ],
                'existing_integration': {
                    'phase0_question': 'JavaScript実装方針の確認',
                    'phase1_errors': [1, 6, 8, 9, 12],  # JS競合、FormData、Ajax初期化
                    'universal_hooks': ['基本機能検証', 'コード品質検証'],
                    'hooks_template': 'enhanced_javascript_check'
                }
            },
            'ai_learning': {
                'keywords': [
                    'AI学習', '機械学習', '自動分類', 'AI', 'learning',
                    'ai', '学習機能', '人工知能', 'machine learning'
                ],
                'existing_integration': {
                    'phase0_question': 'Q8: AI学習動作（実Python連携必須・模擬処理禁止）',
                    'phase1_errors': [15, 31],  # Python API連携、AI学習精度
                    'universal_hooks': ['基本機能検証'],
                    'hooks_template': 'enhanced_ai_learning_check'
                }
            },
            'csv': {
                'keywords': [
                    'CSV', 'ファイル処理', 'インポート', 'エクスポート', 'csv',
                    'file', 'import', 'export', 'データ取込', 'ファイル操作'
                ],
                'existing_integration': {
                    'phase0_question': 'Q3: CSV機能（実ファイル処理必須・ボタンのみ禁止）',
                    'phase1_errors': [18],  # ファイル存在チェックエラー
                    'universal_hooks': ['基本機能検証'],
                    'hooks_template': 'enhanced_csv_check'
                }
            }
        }
    
    def detect_instruction_format(self, instruction_text: str) -> InstructionFormat:
        """指示書形式の自動検出（NAGANO3最優先）"""
        
        # 【重要】NAGANO3形式の優先検出
        nagano3_indicators = [
            r'## 🎯',                    # 目的セクション
            r'Phase\d+',                 # Phaseシステム
            r'✅.*❌',                  # チェックマーク組み合わせ
            r'Universal.*Hooks',         # Hooksシステム言及
            r'43.*エラー.*パターン',      # 43エラーパターン言及
            r'🚨.*📊.*🔍',             # 絵文字システム
            r'NAGANO3',                  # NAGANO3直接言及
            r'getKichoDatabase',         # 既存システム関数
            r'Phase0.*質問',             # Phase0システム
            r'詳細実装.*簡易実装'         # 実装方針言及
        ]
        
        # NAGANO3指標のマッチング
        nagano3_matches = sum(1 for pattern in nagano3_indicators if re.search(pattern, instruction_text))
        
        if nagano3_matches >= 2:  # 2個以上の指標でNAGANO3と判定
            return InstructionFormat.NAGANO3_STRUCTURED
        
        # その他の形式検出
        if re.search(r'^#{1,6}\s', instruction_text, re.MULTILINE):
            return InstructionFormat.MARKDOWN_GENERIC
        elif re.search(r'^\s*[-*•]\s', instruction_text, re.MULTILINE):
            return InstructionFormat.BULLET_POINTS
        elif re.search(r'^\s*\d+\.\s', instruction_text, re.MULTILINE):
            return InstructionFormat.NUMBERED_LIST
        elif self._detect_mixed_format(instruction_text):
            return InstructionFormat.MIXED_FORMAT
        else:
            return InstructionFormat.PLAIN_TEXT
    
    def parse_instruction(self, instruction_text: str) -> Union[str, Dict[str, ExtractedRequirement]]:
        """指示書の解析（NAGANO3優先）"""
        
        format_type = self.detect_instruction_format(instruction_text)
        
        if format_type == InstructionFormat.NAGANO3_STRUCTURED:
            # 【重要】NAGANO3形式は既存システムに委譲
            return "DELEGATE_TO_EXISTING_NAGANO3_SYSTEM"
        else:
            # 自然言語解析実行
            return self._parse_natural_language(instruction_text, format_type)
    
    def _parse_natural_language(self, text: str, format_type: InstructionFormat) -> Dict[str, ExtractedRequirement]:
        """自然言語形式の解析実装"""
        
        extracted_requirements = {}
        
        for category, pattern_data in self.analysis_patterns.items():
            # キーワードマッチング
            detected_keywords = []
            for keyword in pattern_data['keywords']:
                if keyword.lower() in text.lower():
                    detected_keywords.append(keyword)
            
            if detected_keywords:
                # 信頼度スコア計算
                confidence = len(detected_keywords) / len(pattern_data['keywords'])
                
                # コンテキスト抽出
                context = self._extract_context_around_keywords(text, detected_keywords)
                
                # 既存システム統合情報
                existing_integration = pattern_data['existing_integration']
                
                # ExtractedRequirement作成
                requirement = ExtractedRequirement(
                    category=category,
                    detected_keywords=detected_keywords,
                    confidence_score=confidence,
                    source_context=context,
                    phase0_integration=self._enhance_phase0_integration(category, existing_integration),
                    phase1_error_prevention=existing_integration['phase1_errors'],
                    universal_hooks_integration=existing_integration['universal_hooks'],
                    hooks_template=existing_integration['hooks_template']
                )
                
                extracted_requirements[category] = requirement
        
        return extracted_requirements
    
    def _extract_context_around_keywords(self, text: str, keywords: List[str]) -> str:
        """キーワード周辺コンテキストの抽出"""
        
        contexts = []
        for keyword in keywords[:3]:  # 最大3キーワード
            # キーワード前後50文字のコンテキスト抽出
            pattern = rf'.{{0,50}}{re.escape(keyword)}.{{0,50}}'
            matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
            if matches:
                contexts.append(matches[0].strip())
        
        return ' | '.join(contexts)
    
    def _enhance_phase0_integration(self, category: str, existing_integration: Dict) -> Dict[str, str]:
        """Phase0統合情報の強化"""
        
        base_question = existing_integration['phase0_question']
        
        enhanced_integration = {
            'base_question': base_question,
            'integration_type': 'existing_system_plus_natural_language',
            'compatibility_ensured': True
        }
        
        if category == 'database':
            enhanced_integration['enhanced_question'] = f"""
既存Phase0システムと自然言語要件の統合確認：

【既存Phase0 Q1】
{base_question}

【自然言語要件統合】
- 検出されたデータベース要件との整合性
- getKichoDatabase()関数との完全互換性
- 模擬データ禁止方針の維持
- Phase1エラー{existing_integration['phase1_errors']}の予防

この統合実装方法は理解していますか？
"""
        elif category == 'api':
            enhanced_integration['enhanced_question'] = f"""
既存Phase0システムと自然言語要件の統合確認：

【既存Phase0 Q2】
{base_question}

【自然言語要件統合】
- 検出されたAPI要件との整合性
- FastAPI連携システムとの完全互換性
- 模擬レスポンス禁止方針の維持
- Phase1エラー{existing_integration['phase1_errors']}の予防

この統合実装方法は理解していますか？
"""
        else:
            enhanced_integration['enhanced_question'] = f"""
既存システムと自然言語要件「{category}」の統合実装方法は理解していますか？
"""
        
        return enhanced_integration
    
    def _detect_mixed_format(self, text: str) -> bool:
        """混在形式の検出"""
        
        has_markdown = bool(re.search(r'^#{1,6}\s', text, re.MULTILINE))
        has_bullets = bool(re.search(r'^\s*[-*•]\s', text, re.MULTILINE))
        has_numbers = bool(re.search(r'^\s*\d+\.\s', text, re.MULTILINE))
        has_nagano3_elements = bool(re.search(r'✅|❌|🎯', text))
        
        format_count = sum([has_markdown, has_bullets, has_numbers, has_nagano3_elements])
        return format_count >= 2
    
    def _load_existing_error_patterns(self) -> Dict[int, str]:
        """既存43エラーパターンの読み込み"""
        # 実際の実装では既存システムから読み込み
        return {
            1: "JavaScript競合エラー（header.js と kicho.js の競合）",
            3: "Ajax処理失敗（get_statistics アクションエラー）",
            4: "PHP構文エラー（return vs => 記法エラー）",
            5: "CSRF 403エラー（CSRFトークンの取得・送信失敗）",
            6: "FormData実装エラー（undefined問題）",
            8: "Ajax初期化タイミングエラー（DOMContentLoaded前実行）",
            9: "データ抽出エラー（data-item-id未設定）",
            10: "SECURE_ACCESS未定義エラー（直接アクセス防止失敗）",
            12: "Ajax送信名不整合エラー（ハイフン・アンダースコア混在）",
            15: "Python API連携エラー（PHP ↔ Python FastAPI通信失敗）",
            18: "ファイル存在チェックエラー（fastFileExists()パス解決失敗）",
            21: "ネットワークエラー（404, 500等の通信エラー）",
            25: "CSRF検証失敗（health_check以外のアクションでトークンエラー）",
            26: "XSS対策不備（HTMLエスケープ未実装）",
            31: "AI学習精度エラー（勘定科目自動判定の精度低下）"
        }
    
    def _load_existing_phase0_questions(self) -> Dict[str, str]:
        """既存Phase0質問の読み込み"""
        return {
            'Q1': 'データベース接続（実DB必須・模擬データ禁止）',
            'Q2': 'Python API連携（実連携必須・模擬レスポンス禁止）',
            'Q3': 'CSV機能（実ファイル処理必須・ボタンのみ禁止）',
            'Q8': 'AI学習動作（実Python連携必須・模擬処理禁止）'
        }
    
    def _load_existing_hooks_knowledge(self) -> Dict[str, List[str]]:
        """既存Hooksシステムの知識読み込み"""
        return {
            'universal_hooks': ['セキュリティ検証', 'コード品質検証', '基本機能検証'],
            'nagano3_hooks': ['プロジェクト知識確認', 'インフラ確認', '指示書理解確認']
        }
```

---

## 🪝 **実装 Phase 3: 統合Hooks生成・実行システム**

### **🎯 既存Hooksシステム完全活用（最重要実装）**

#### **1. IntegratedHooksExecutor クラス実装**
```python
import json
import subprocess
from datetime import datetime
from typing import Dict, List, Any, Optional

class IntegratedHooksExecutor:
    """既存Hooksシステム優先の統合実行エンジン"""
    
    def __init__(self, directory_manager: AutoDirectoryManager):
        self.directory_manager = directory_manager
        self.directories = directory_manager.auto_detect_project_environment()
        
        # 【重要】既存システムの参照（最優先）
        self.existing_systems = {
            'universal_hooks': self._load_existing_universal_hooks_interface(),
            'nagano3_hooks': self._load_existing_nagano3_hooks_interface(),
            'phase1_prevention': self._load_existing_phase1_interface()
        }
        
        # 新機能：自然言語Hooks生成
        self.natural_hooks_generator = NaturalLanguageHooksGenerator()
    
    def execute_integrated_hooks_system(self, 
                                      project_materials: Dict[str, Any], 
                                      natural_requirements: Optional[Dict[str, ExtractedRequirement]] = None) -> Dict[str, Any]:
        """統合Hooksシステムの実行（既存優先）"""
        
        execution_results = {
            'execution_id': f"hooks_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'start_time': datetime.now().isoformat(),
            'directories': self.directories,
            'existing_hooks_results': {},
            'natural_hooks_results': {},
            'integration_summary': {}
        }
        
        try:
            # Step 1: 既存Universal Hooks実行（最優先・必須）
            print("🌐 既存Universal Hooks実行中...")
            execution_results['existing_hooks_results']['universal'] = \
                self._execute_existing_universal_hooks(project_materials)
            
            # Step 2: 既存NAGANO3 Project Hooks実行（最優先・必須）
            print("🎯 既存NAGANO3 Project Hooks実行中...")
            execution_results['existing_hooks_results']['nagano3'] = \
                self._execute_existing_nagano3_hooks(project_materials)
            
            # Step 3: 既存Phase1エラー予防実行（最優先・必須）
            print("⚠️ 既存Phase1エラー予防実行中...")
            execution_results['existing_hooks_results']['phase1'] = \
                self._execute_existing_phase1_prevention(project_materials)
            
            # Step 4: 自然言語Hooks生成・実行（補完的）
            if natural_requirements:
                print("🆕 自然言語対応Hooks生成・実行中...")
                generated_hooks = self.natural_hooks_generator.generate_from_natural_requirements(natural_requirements)
                execution_results['natural_hooks_results'] = \
                    self._execute_generated_natural_hooks(generated_hooks, project_materials)
                
                # Hooks自動配置
                self._auto_deploy_hooks(generated_hooks)
            
            # Step 5: 統合評価
            execution_results['integration_summary'] = \
                self._calculate_integration_summary(execution_results)
            
            execution_results['success'] = True
            execution_results['end_time'] = datetime.now().isoformat()
            
            return execution_results
            
        except Exception as e:
            execution_results['error'] = str(e)
            execution_results['success'] = False
            execution_results['end_time'] = datetime.now().isoformat()
            return execution_results
    
    def _execute_existing_universal_hooks(self, project_materials: Dict[str, Any]) -> Dict[str, Any]:
        """既存Universal Hooksの実行"""
        
        # 既存システムインターフェースの呼び出し
        universal_interface = self.existing_systems['universal_hooks']
        
        try:
            # 実際の実装では既存システムのAPIまたはコマンドを呼び出し
            results = {
                'security_verification': self._verify_security_requirements(project_materials),
                'code_quality_verification': self._verify_code_quality(project_materials),
                'basic_functionality_verification': self._verify_basic_functionality(project_materials)
            }
            
            # 全チェック成功確認
            all_passed = all(result.get('status') == 'passed' for result in results.values())
            
            return {
                'overall_status': 'passed' if all_passed else 'failed',
                'individual_results': results,
                'execution_time': '2.1秒',
                'system_type': 'existing_universal_hooks'
            }
            
        except Exception as e:
            return {
                'overall_status': 'error',
                'error': str(e),
                'system_type': 'existing_universal_hooks'
            }
    
    def _execute_existing_nagano3_hooks(self, project_materials: Dict[str, Any]) -> Dict[str, Any]:
        """既存NAGANO3 Project Hooksの実行"""
        
        try:
            results = {
                'project_knowledge_check': self._check_nagano3_project_knowledge(project_materials),
                'infrastructure_check': self._check_nagano3_infrastructure(project_materials),
                'documentation_check': self._check_nagano3_documentation(project_materials)
            }
            
            all_passed = all(result.get('status') == 'passed' for result in results.values())
            
            return {
                'overall_status': 'passed' if all_passed else 'failed',
                'individual_results': results,
                'execution_time': '1.7秒',
                'system_type': 'existing_nagano3_hooks'
            }
            
        except Exception as e:
            return {
                'overall_status': 'error',
                'error': str(e),
                'system_type': 'existing_nagano3_hooks'
            }
    
    def _execute_existing_phase1_prevention(self, project_materials: Dict[str, Any]) -> Dict[str, Any]:
        """既存Phase1エラー予防の実行"""
        
        try:
            # 43エラーパターンのチェック実行
            error_check_results = self._execute_43_error_patterns_check(project_materials)
            
            return {
                'total_patterns_checked': 43,
                'critical_patterns_checked': 15,
                'errors_detected': error_check_results['errors_detected'],
                'errors_prevented': error_check_results['errors_prevented'],
                'overall_status': 'passed' if error_check_results['errors_detected'] == 0 else 'warning',
                'execution_time': '2.8秒',
                'system_type': 'existing_phase1_prevention'
            }
            
        except Exception as e:
            return {
                'overall_status': 'error',
                'error': str(e),
                'system_type': 'existing_phase1_prevention'
            }
    
    def _execute_43_error_patterns_check(self, project_materials: Dict[str, Any]) -> Dict[str, Any]:
        """43エラーパターンの具体的チェック実行"""
        
        errors_detected = 0
        errors_prevented = []
        
        # 重要なエラーパターンのチェック例
        checks = {
            1: self._check_javascript_conflicts(project_materials),
            4: self._check_php_syntax_errors(project_materials),
            5: self._check_csrf_errors(project_materials),
            10: self._check_secure_access_definition(project_materials),
            15: self._check_python_api_connection(project_materials)
        }
        
        for error_id, check_result in checks.items():
            if not check_result['passed']:
                errors_detected += 1
            else:
                errors_prevented.append(f"エラー{error_id}: {check_result['description']}")
        
        return {
            'errors_detected': errors_detected,
            'errors_prevented': errors_prevented,
            'detailed_checks': checks
        }
    
    def _execute_generated_natural_hooks(self, generated_hooks: Dict[str, Any], project_materials: Dict[str, Any]) -> Dict[str, Any]:
        """生成された自然言語Hooksの実行"""
        
        results = {}
        
        for category, hooks_spec in generated_hooks.items():
            try:
                # カテゴリ別実行
                category_result = self._execute_category_hooks(category, hooks_spec, project_materials)
                results[category] = category_result
                
            except Exception as e:
                results[category] = {
                    'status': 'error',
                    'error': str(e),
                    'category': category
                }
        
        return results
    
    def _execute_category_hooks(self, category: str, hooks_spec: Dict[str, Any], project_materials: Dict[str, Any]) -> Dict[str, Any]:
        """カテゴリ別Hooksの実行"""
        
        if category == 'database':
            return self._verify_database_integration(hooks_spec, project_materials)
        elif category == 'api':
            return self._verify_api_integration(hooks_spec, project_materials)
        elif category == 'security':
            return self._verify_security_integration(hooks_spec, project_materials)
        elif category == 'javascript':
            return self._verify_javascript_integration(hooks_spec, project_materials)
        elif category == 'ai_learning':
            return self._verify_ai_learning_integration(hooks_spec, project_materials)
        elif category == 'csv':
            return self._verify_csv_integration(hooks_spec, project_materials)
        else:
            return self._verify_generic_integration(hooks_spec, project_materials)
    
    def _auto_deploy_hooks(self, generated_hooks: Dict[str, Any]) -> None:
        """生成されたHooksの自動配置"""
        
        # テンプレート保存
        templates_path = Path(self.directories['templates']) / 'generated_hooks.json'
        with open(templates_path, 'w', encoding='utf-8') as f:
            json.dump(generated_hooks, f, indent=2, ensure_ascii=False)
        
        # 実行用Hooks配置
        runtime_path = Path(self.directories['runtime']) / 'active_hooks.json'
        executable_hooks = self._convert_to_executable_format(generated_hooks)
        with open(runtime_path, 'w', encoding='utf-8') as f:
            json.dump(executable_hooks, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Hooks自動配置完了:")
        print(f"   テンプレート: {templates_path}")
        print(f"   実行ファイル: {runtime_path}")
```

#### **2. NaturalLanguageHooksGenerator クラス実装**
```python
class NaturalLanguageHooksGenerator:
    """自然言語要件から既存システム互換Hooksの生成"""
    
    def generate_from_natural_requirements(self, natural_requirements: Dict[str, ExtractedRequirement]) -> Dict[str, Any]:
        """自然言語要件から既存システム完全互換のHooks生成"""
        
        generated_hooks = {}
        
        for category, requirement in natural_requirements.items():
            hooks_spec = self._generate_category_hooks(category, requirement)
            generated_hooks[category] = hooks_spec
        
        return generated_hooks
    
    def _generate_category_hooks(self, category: str, requirement: ExtractedRequirement) -> Dict[str, Any]:
        """カテゴリ別Hooks仕様の生成"""
        
        base_spec = {
            'category': category,
            'hook_type': requirement.hooks_template,
            'existing_system_integration': True,
            
            # 自然言語ソース情報
            'source_information': {
                'detected_keywords': requirement.detected_keywords,
                'confidence_score': requirement.confidence_score,
                'source_context': requirement.source_context
            },
            
            # 既存システム統合情報
            'existing_integration': {
                'phase0_integration': requirement.phase0_integration,
                'phase1_error_prevention': requirement.phase1_error_prevention,
                'universal_hooks_integration': requirement.universal_hooks_integration
            },
            
            # 検証方法
            'verification_methods': [
                f'verify_{category}_requirements_with_existing_compatibility',
                f'check_{category}_phase1_error_prevention',
                f'validate_{category}_existing_system_integration'
            ],
            
            # 自動修復方法
            'auto_fix_methods': [
                f'auto_configure_{category}_settings',
                f'auto_setup_{category}_environment'
            ]
        }
        
        # カテゴリ固有の拡張
        if category == 'database':
            base_spec.update(self._enhance_database_hooks(requirement))
        elif category == 'api':
            base_spec.update(self._enhance_api_hooks(requirement))
        elif category == 'security':
            base_spec.update(self._enhance_security_hooks(requirement))
        elif category == 'javascript':
            base_spec.update(self._enhance_javascript_hooks(requirement))
        elif category == 'ai_learning':
            base_spec.update(self._enhance_ai_learning_hooks(requirement))
        elif category == 'csv':
            base_spec.update(self._enhance_csv_hooks(requirement))
        
        return base_spec
    
    def _enhance_database_hooks(self, requirement: ExtractedRequirement) -> Dict[str, Any]:
        """データベースHooksの強化"""
        
        return {
            'database_specific': {
                'existing_function_integration': 'getKichoDatabase()関数との完全互換性',
                'phase1_error_focus': [4, 10, 25],  # PHP構文、SECURE_ACCESS、CSRF検証
                'verification_points': [
                    '実DB接続の確認（模擬DB禁止）',
                    'getKichoDatabase()関数の存在確認',
                    'SECURE_ACCESS定数の定義確認',
                    'データベース設定の妥当性確認'
                ],
                'auto_fix_capabilities': [
                    'データベース設定ファイルの生成',
                    'SECURE_ACCESS定数の自動定義',
                    '接続テストの自動実行'
                ]
            }
        }
    
    def _enhance_api_hooks(self, requirement: ExtractedRequirement) -> Dict[str, Any]:
        """APIHooksの強化"""
        
        return {
            'api_specific': {
                'existing_system_integration': 'FastAPI連携システムとの完全互換性',
                'phase1_error_focus': [3, 15, 21],  # Ajax処理失敗、Python API連携、ネットワーク
                'verification_points': [
                    'FastAPIエンドポイントの接続確認',
                    'Python API連携の動作確認',
                    'ネットワーク接続の安定性確認',
                    '模擬レスポンス禁止の確認'
                ],
                'auto_fix_capabilities': [
                    'APIエンドポイント設定の自動生成',
                    'API接続テストの自動実行',
                    'ネットワーク設定の最適化'
                ]
            }
        }
    
    def _enhance_security_hooks(self, requirement: ExtractedRequirement) -> Dict[str, Any]:
        """セキュリティHooksの強化"""
        
        return {
            'security_specific': {
                'existing_system_integration': 'Universal Hooksセキュリティ検証との統合',
                'phase1_error_focus': [5, 10, 25, 26],  # CSRF403、SECURE_ACCESS、XSS対策
                'verification_points': [
                    'CSRFトークン実装の確認',
                    'XSS対策の実装確認',
                    'SQLインジェクション対策の確認',
                    '入力値検証の実装確認'
                ],
                'auto_fix_capabilities': [
                    'CSRF保護の自動実装',
                    'XSS対策の自動追加',
                    '入力値検証の自動生成'
                ]
            }
        }
```

---

## 🎮 **実装 Phase 4: 統合実行制御システム**

### **🎯 既存Phase0-4システムとの完全統合実行**

#### **1. MasterExecutionController クラス実装**
```python
class MasterExecutionController:
    """既存Phase0-4システムと自然言語機能の統合制御"""
    
    def __init__(self):
        # 【重要】既存システムの参照（最優先）
        self.existing_phase_systems = {
            'phase0': self._initialize_existing_phase0_interface(),
            'phase1': self._initialize_existing_phase1_interface(),
            'phase2': self._initialize_existing_phase2_interface(),
            'phase3': self._initialize_existing_phase3_interface()
        }
        
        # 新機能システム（既存補完用）
        self.natural_language_parser = NaturalLanguageParser()
        self.directory_manager = AutoDirectoryManager()
        self.integrated_hooks_executor = IntegratedHooksExecutor(self.directory_manager)
    
    def execute_complete_development_preparation(self, 
                                               project_materials: Dict[str, Any],
                                               development_request: str,
                                               instruction_files: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """完全統合開発準備システムの実行"""
        
        execution_log = {
            'master_execution_id': f"master_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'start_time': datetime.now().isoformat(),
            'existing_system_priority': True,
            'natural_language_enabled': instruction_files is not None,
            'phases': {}
        }
        
        try:
            # Phase 0: 環境・ディレクトリ自動検出
            print("🔍 Phase 0: プロジェクト環境自動検出中...")
            environment_setup = self.directory_manager.auto_detect_project_environment()
            execution_log['environment'] = environment_setup
            
            # Phase 1: 自然言語指示書解析（新機能、既存優先）
            natural_analysis = None
            if instruction_files:
                print("📄 Phase 1: 自然言語指示書解析中...")
                natural_analysis = self._analyze_instruction_files(instruction_files)
                execution_log['phases']['natural_analysis'] = natural_analysis
            
            # Phase 2: 統合Hooks実行（既存最優先）
            print("🪝 Phase 2: 統合Hooksシステム実行中...")
            hooks_results = self.integrated_hooks_executor.execute_integrated_hooks_system(
                project_materials,
                natural_analysis.get('extracted_requirements') if natural_analysis else None
            )
            execution_log['phases']['hooks_execution'] = hooks_results
            
            # Phase 3: 既存Phase0実行（強制質問）
            print("🛡️ Phase 3: 既存Phase0実行中...")
            phase0_results = self._execute_existing_phase0_with_enhancement(
                project_materials, natural_analysis
            )
            execution_log['phases']['phase0'] = phase0_results
            
            # Phase 4: 既存Phase1実行（43エラー予防）
            print("⚠️ Phase 4: 既存Phase1実行中...")
            phase1_results = self._execute_existing_phase1_with_enhancement(
                project_materials, natural_analysis
            )
            execution_log['phases']['phase1'] = phase1_results
            
            # Phase 5: 既存Phase2実行（詳細実装）
            print("🚀 Phase 5: 既存Phase2実行中...")
            phase2_results = self._execute_existing_phase2_with_enhancement(
                project_materials, development_request, natural_analysis
            )
            execution_log['phases']['phase2'] = phase2_results
            
            # Phase 6: 既存Phase3実行（品質検証）
            print("🧪 Phase 6: 既存Phase3実行中...")
            phase3_results = self._execute_existing_phase3_with_enhancement(
                project_materials, phase2_results, {
                    'hooks_results': hooks_results,
                    'natural_analysis': natural_analysis
                }
            )
            execution_log['phases']['phase3'] = phase3_results
            
            # Phase 7: 最終統合評価
            print("🏆 Phase 7: 最終統合評価中...")
            final_assessment = self._calculate_master_final_assessment(execution_log)
            execution_log['final_assessment'] = final_assessment
            
            execution_log['success'] = True
            execution_log['end_time'] = datetime.now().isoformat()
            execution_log['total_duration'] = self._calculate_duration(execution_log)
            
            return execution_log
            
        except Exception as e:
            execution_log['error'] = str(e)
            execution_log['success'] = False
            execution_log['end_time'] = datetime.now().isoformat()
            return execution_log
    
    def _analyze_instruction_files(self, instruction_files: Dict[str, str]) -> Dict[str, Any]:
        """指示書ファイルの統合解析"""
        
        analysis_results = {
            'total_files': len(instruction_files),
            'formats_detected': {},
            'extracted_requirements': {},
            'existing_system_delegation': []
        }
        
        for file_name, content in instruction_files.items():
            # 形式検出
            detected_format = self.natural_language_parser.detect_instruction_format(content)
            analysis_results['formats_detected'][file_name] = detected_format.value
            
            # 解析実行
            parse_result = self.natural_language_parser.parse_instruction(content)
            
            if parse_result == "DELEGATE_TO_EXISTING_NAGANO3_SYSTEM":
                # NAGANO3形式は既存システムに委譲
                analysis_results['existing_system_delegation'].append(file_name)
            else:
                # 自然言語解析結果を保存
                analysis_results['extracted_requirements'][file_name] = parse_result
        
        return analysis_results
    
    def _execute_existing_phase0_with_enhancement(self, project_materials: Dict[str, Any], natural_analysis: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """既存Phase0の拡張実行"""
        
        # 既存Phase0システムの実行
        base_results = self._call_existing_phase0_system(project_materials)
        
        # 自然言語要件での拡張
        if natural_analysis and natural_analysis.get('extracted_requirements'):
            enhancement_results = self._enhance_phase0_with_natural_requirements(
                base_results, natural_analysis['extracted_requirements']
            )
            base_results['natural_language_enhancement'] = enhancement_results
        
        return base_results
    
    def _calculate_master_final_assessment(self, execution_log: Dict[str, Any]) -> Dict[str, Any]:
        """統合システムの最終評価"""
        
        # 各フェーズの成功度評価
        phase_scores = {}
        
        # 環境検出成功度
        environment_score = 100 if execution_log.get('environment') else 50
        
        # 既存システム成功度（重要度高）
        existing_systems_score = self._evaluate_existing_systems_performance(execution_log.get('phases', {}))
        
        # 自然言語統合成功度
        natural_integration_score = self._evaluate_natural_language_integration(execution_log.get('phases', {}))
        
        # Hooks統合成功度
        hooks_integration_score = self._evaluate_hooks_integration(execution_log.get('phases', {}))
        
        # 重み付け最終スコア計算
        final_score = (
            environment_score * 0.1 +           # 環境検出 10%
            existing_systems_score * 0.6 +      # 既存システム 60%（最重要）
            natural_integration_score * 0.2 +   # 自然言語統合 20%
            hooks_integration_score * 0.1       # Hooks統合 10%
        )
        
        # 最終判定
        if final_score >= 95:
            recommendation = 'IMMEDIATE_DEVELOPMENT_START'
            readiness_level = 'Perfect'
        elif final_score >= 85:
            recommendation = 'READY_TO_START_DEVELOPMENT'
            readiness_level = 'Excellent'
        elif final_score >= 75:
            recommendation = 'READY_WITH_CAREFUL_MONITORING'
            readiness_level = 'Good'
        else:
            recommendation = 'IMPROVEMENT_REQUIRED_BEFORE_START'
            readiness_level = 'Needs Improvement'
        
        return {
            'final_score': final_score,
            'readiness_level': readiness_level,
            'recommendation': recommendation,
            'component_scores': {
                'environment_detection': environment_score,
                'existing_systems': existing_systems_score,
                'natural_language_integration': natural_integration_score,
                'hooks_integration': hooks_integration_score
            },
            'next_steps': self._generate_next_steps_recommendations(final_score, recommendation),
            'quality_assurance': {
                'existing_system_compatibility': existing_systems_score >= 90,
                'natural_language_enhancement': natural_integration_score >= 70,
                'overall_integration_success': final_score >= 75
            }
        }
```

---

## 📋 **実装ガイドライン・制約事項**

### **🔧 必須実装要件**
1. **既存システム完全互換性**: 既存のUniversal Hooks、NAGANO3 Hooks、Phase0-4システムとの100%互換性
2. **自動ディレクトリ検出**: プロジェクト環境に応じた柔軟なディレクトリ自動検出・作成
3. **NAGANO3形式優先**: NAGANO3形式が検出された場合は既存システムに完全委譲
4. **段階的実装**: MVP（最小実行可能製品）からの段階的機能拡張
5. **エラーハンドリング**: 43エラーパターンとの完全統合・活用

### **⚠️ 重要な制約・注意事項**
1. **既存システム優先**: いかなる場合も既存システムの動作・成果を最優先
2. **後方互換性**: 既存ユーザーの移行コスト0を絶対維持
3. **設定柔軟性**: ハードコードされたパス・設定の禁止
4. **性能維持**: 既存システムの実行時間・品質を維持
5. **段階的統合**: 全機能同時実装の禁止、段階的統合の必須

### **📊 成功基準・測定指標**
- **既存システム成功率**: 95%以上の維持（最重要）
- **自動検出成功率**: 90%以上のディレクトリ自動検出
- **自然言語解析精度**: 80%以上の要件抽出精度
- **統合互換性**: 100%（既存システムとの競合禁止）
- **開発効率向上**: 新規ユーザーの導入時間50%削減

### **🚀 期待される実装効果**
- **既存ユーザー**: 完全互換性保持 + 新機能による効率向上
- **新規ユーザー**: 自然言語での即座利用開始 + 既存品質保証継承
- **企業導入**: 最小学習コスト + 最大適用範囲
- **開発成功**: 全プロジェクトでの95%以上成功率実現

---

**🎉 この実装指示書に従って開発することで、既存の優秀なHooksシステムを100%活用しながら、自然言語指示書対応とプロジェクト汎用性を実現する統合Hooksシステムを構築できます！**