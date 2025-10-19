# 🪝 高精度専用質問回答・自動Hooks統合システム開発指示書【自然言語対応修正版】

## 🎯 **システム目的**
既存の優秀な指示書システム（Phase0-4、Universal Hooks、NAGANO3 Hooks）の効果を100%維持しながら、**あらゆる形式の指示書からの自動Hooks生成**機能を追加する。自然言語指示書、Markdown、箇条書き等の多様な形式に対応し、既存の43個実際エラーパターン予防システムと完全統合することで、開発成功率95%以上を全プロジェクトで実現する。

---

## 📊 **システム全体アーキテクチャ（既存システム完全統合）**

### **🔄 統合設計原則**
```python
class IntegratedHooksSystem:
    def __init__(self):
        # 【重要】既存の優秀なシステムを100%活用
        self.existing_universal_hooks = UniversalHooksSystem()        # 既存システム
        self.existing_nagano3_hooks = NAGANO3ProjectHooksSystem()     # 既存システム
        self.existing_phase_systems = ExistingPhaseSystem()           # Phase0-4システム
        
        # 【新機能】自然言語対応システム
        self.natural_language_parser = UniversalInstructionParser()   # 新機能
        self.hooks_auto_generator = HooksAutoGenerator()              # 新機能
        self.auto_directory_manager = AutoDirectoryManager()          # 自動検出システム
        
    def execute_enhanced_system(self, project_materials, development_request, instruction_files=None):
        """既存システム完全活用 + 自然言語対応の統合実行"""
        
        # Step 1: 既存システム優先実行（必須）
        existing_results = self.execute_existing_systems(project_materials, development_request)
        
        # Step 2: 自然言語指示書がある場合は追加処理
        natural_results = {}
        if instruction_files:
            natural_results = self.process_natural_language_instructions(instruction_files)
        
        # Step 3: 統合・相互補完
        integrated_results = self.integrate_existing_and_natural(existing_results, natural_results)
        
        return integrated_results
```

---

## 🔍 **Phase 1: 自然言語指示書統合解析エンジン（新機能）**

### **🎯 あらゆる形式の指示書対応（既存NAGANO3形式優先）**

#### **1. Universal指示書解析システム**
```python
class UniversalInstructionParser:
    """既存NAGANO3形式を最優先とし、あらゆる形式に対応する解析システム"""
    
    def __init__(self):
        # 既存システムとの完全互換性確保
        self.existing_error_patterns = self.load_43_error_patterns()      # 既存Phase1の43パターン
        self.existing_phase0_questions = self.load_10_forced_questions()  # 既存Phase0の10質問
        self.existing_hooks_knowledge = self.load_existing_hooks_data()   # 既存Hooksシステム
        
        # 自然言語解析パターン（既存システム互換）
        self.natural_language_patterns = {
            'database_requirements': {
                'keywords': ['データベース', 'PostgreSQL', 'MySQL', 'SQLite', 'DB', 'database'],
                'existing_integration': {
                    'phase0_question': 'Q1: データベース接続（実DB必須・模擬データ禁止）',
                    'phase1_errors': [4, 10, 25],  # PHP構文エラー、SECURE_ACCESS未定義、CSRF検証失敗
                    'universal_hooks': ['セキュリティ検証', 'コード品質検証']
                },
                'hooks_generation_template': 'enhanced_database_check'
            },
            'security_requirements': {
                'keywords': ['セキュリティ', 'CSRF', '認証', '権限', 'XSS', 'SQLインジェクション', 'security'],
                'existing_integration': {
                    'phase0_question': 'セキュリティ実装方針',
                    'phase1_errors': [5, 10, 25, 26],  # CSRF403エラー、SECURE_ACCESS、XSS対策不備
                    'universal_hooks': ['セキュリティ検証', '基本機能検証']
                },
                'hooks_generation_template': 'enhanced_security_check'
            },
            'api_requirements': {
                'keywords': ['API', '連携', 'FastAPI', 'REST', 'Python API', 'api'],
                'existing_integration': {
                    'phase0_question': 'Q2: Python API連携（実連携必須・模擬レスポンス禁止）',
                    'phase1_errors': [3, 15, 21],  # Ajax処理失敗、Python API連携エラー、ネットワークエラー
                    'universal_hooks': ['基本機能検証']
                },
                'hooks_generation_template': 'enhanced_api_check'
            },
            'ai_learning_requirements': {
                'keywords': ['AI学習', '機械学習', '自動分類', 'ai', 'learning'],
                'existing_integration': {
                    'phase0_question': 'Q8: AI学習動作（実Python連携必須・模擬処理禁止）',
                    'phase1_errors': [15, 31],  # Python API連携エラー、AI学習精度エラー
                    'universal_hooks': ['基本機能検証']
                },
                'hooks_generation_template': 'enhanced_ai_learning_check'
            }
        }
    
    def auto_detect_instruction_format(self, instruction_text):
        """指示書形式の自動検出（既存NAGANO3形式を最優先）"""
        
        # 既存NAGANO3形式の検出（最優先）
        nagano3_indicators = [
            r'## 🎯',           # 目的セクション
            r'Phase\d+',        # Phaseシステム
            r'✅.*❌',         # チェックマーク
            r'🚨.*📊',        # 絵文字システム
            r'Universal.*Hooks', # Hooksシステム言及
            r'43.*エラー'       # 43エラーパターン言及
        ]
        
        if any(re.search(pattern, instruction_text) for pattern in nagano3_indicators):
            return 'nagano3_structured'  # 既存システムで処理
        
        # その他の形式検出
        elif re.search(r'^#{1,6}\s', instruction_text, re.MULTILINE):
            return 'markdown_generic'
        elif re.search(r'^\s*[-*•]\s', instruction_text, re.MULTILINE):
            return 'bullet_points'
        elif re.search(r'^\s*\d+\.\s', instruction_text, re.MULTILINE):
            return 'numbered_list'
        else:
            return 'plain_text'
    
    def parse_instruction_with_existing_integration(self, instruction_text):
        """既存システム互換性を保った指示書解析"""
        
        format_type = self.auto_detect_instruction_format(instruction_text)
        
        if format_type == 'nagano3_structured':
            # 既存システムで処理（新機能は使用しない）
            return self.delegate_to_existing_system(instruction_text)
        else:
            # 自然言語解析（既存システム互換）
            return self.parse_natural_language_with_existing_compatibility(instruction_text)
    
    def parse_natural_language_with_existing_compatibility(self, text):
        """自然言語解析（既存システム完全互換）"""
        
        extracted_requirements = {}
        
        for category, pattern_data in self.natural_language_patterns.items():
            # キーワードマッチング
            detected_keywords = []
            for keyword in pattern_data['keywords']:
                if keyword.lower() in text.lower():
                    detected_keywords.append(keyword)
            
            if detected_keywords:
                # 既存システム互換のHooks要件生成
                requirement = {
                    'category': category,
                    'detected_keywords': detected_keywords,
                    'confidence_score': len(detected_keywords) / len(pattern_data['keywords']),
                    'source_text': self.extract_context_around_keywords(text, detected_keywords),
                    
                    # 【重要】既存システムとの統合情報
                    'existing_system_integration': pattern_data['existing_integration'],
                    'phase0_question_mapping': pattern_data['existing_integration']['phase0_question'],
                    'phase1_error_prevention': pattern_data['existing_integration']['phase1_errors'],
                    'universal_hooks_integration': pattern_data['existing_integration']['universal_hooks'],
                    
                    # Hooks生成テンプレート
                    'hooks_template': pattern_data['hooks_generation_template'],
                    'auto_generation_enabled': True
                }
                
                extracted_requirements[category] = requirement
        
        return extracted_requirements
    
    def extract_context_around_keywords(self, text, keywords):
        """キーワード周辺のコンテキスト抽出"""
        
        contexts = []
        for keyword in keywords:
            # キーワード前後50文字のコンテキストを抽出
            pattern = rf'.{{0,50}}{re.escape(keyword)}.{{0,50}}'
            matches = re.findall(pattern, text, re.IGNORECASE)
            contexts.extend(matches[:2])  # 最大2つまで
        
        return ' | '.join(contexts)
```

#### **2. 既存システム統合エンジン**
```python
class ExistingSystemIntegrator:
    """既存の優秀なシステムとの完全統合"""
    
    def enhance_natural_requirements_with_existing_knowledge(self, natural_requirements):
        """自然言語要件を既存システムの知見で強化"""
        
        enhanced_requirements = {}
        
        for category, requirement in natural_requirements.items():
            enhanced = {
                'natural_language_source': requirement,
                
                # 既存Phase0との統合
                'phase0_enhancement': self.enhance_with_phase0_questions(category, requirement),
                
                # 既存Phase1との統合
                'phase1_enhancement': self.enhance_with_43_error_patterns(category, requirement),
                
                # 既存Hooksとの統合
                'hooks_enhancement': self.enhance_with_existing_hooks(category, requirement),
                
                # 統合質問生成
                'enhanced_questions': self.generate_integrated_questions(category, requirement)
            }
            enhanced_requirements[category] = enhanced
        
        return enhanced_requirements
    
    def enhance_with_phase0_questions(self, category, requirement):
        """既存Phase0の10個質問との統合"""
        
        existing_integration = requirement.get('existing_system_integration', {})
        phase0_question = existing_integration.get('phase0_question', '')
        
        if category == 'database_requirements':
            return {
                'base_question': 'Q1: データベース接続（実DB必須・模擬データ禁止）',
                'enhanced_question': f"""
既存Phase0 Q1と自然言語要件の統合確認：

【既存Phase0 Q1】
データベース接続（実DB必須・模擬データ禁止）

【自然言語要件】
{', '.join(requirement['detected_keywords'])}

【統合実装確認】
1. 指定されたデータベース（{', '.join(requirement['detected_keywords'])}）への実接続
2. getKichoDatabase()関数との互換性確保（既存システム準拠）
3. Phase1エラー{requirement['phase1_error_prevention']}の予防実装
4. 模擬データ・フォールバック禁止の徹底

この統合データベースシステムの実装方法は理解していますか？
                """,
                'config_requirements': [
                    'データベース接続情報の設定',
                    'getKichoDatabase()関数の確認',
                    '既存コード保護の確保'
                ]
            }
        
        elif category == 'api_requirements':
            return {
                'base_question': 'Q2: Python API連携（実連携必須・模擬レスポンス禁止）',
                'enhanced_question': f"""
既存Phase0 Q2と自然言語要件の統合確認：

【既存Phase0 Q2】
Python API連携（実連携必須・模擬レスポンス禁止）

【自然言語要件】
{', '.join(requirement['detected_keywords'])}

【統合実装確認】
1. 指定されたAPI形式（{', '.join(requirement['detected_keywords'])}）での実装
2. FastAPIとの確実な連携（既存システム準拠）
3. Phase1エラー{requirement['phase1_error_prevention']}の予防実装
4. 模擬レスポンス・モック禁止の徹底

この統合API連携システムの実装方法は理解していますか？
                """,
                'config_requirements': [
                    'Python API URL設定',
                    'FastAPIエンドポイント確認',
                    '実連携の確保'
                ]
            }
        
        return {
            'base_question': f'Phase0関連質問（{category}）',
            'enhanced_question': f'自然言語要件「{", ".join(requirement["detected_keywords"])}」の実装方法は理解していますか？',
            'config_requirements': [f'{category}実装要件の確認']
        }
    
    def enhance_with_43_error_patterns(self, category, requirement):
        """既存Phase1の43エラーパターンとの統合"""
        
        error_numbers = requirement.get('phase1_error_prevention', [])
        error_descriptions = []
        
        # 43エラーパターンから該当エラーの詳細を取得
        error_mapping = {
            1: 'JavaScript競合エラー（header.js と kicho.js の競合）',
            3: 'Ajax処理失敗（get_statistics アクションエラー）',
            4: 'PHP構文エラー（return vs => 記法エラー）',
            5: 'CSRF 403エラー（CSRFトークンの取得・送信失敗）',
            10: 'SECURE_ACCESS未定義エラー（直接アクセス防止失敗）',
            15: 'Python API連携エラー（PHP ↔ Python FastAPI通信失敗）',
            21: 'ネットワークエラー（404, 500等の通信エラー）',
            25: 'CSRF検証失敗（health_check以外のアクションでトークンエラー）',
            26: 'XSS対策不備（HTMLエスケープ未実装）',
            31: 'AI学習精度エラー（勘定科目自動判定の精度低下）'
        }
        
        for error_num in error_numbers:
            if error_num in error_mapping:
                error_descriptions.append(f'Phase1エラー{error_num}: {error_mapping[error_num]}')
        
        return {
            'applicable_errors': error_descriptions,
            'prevention_focus': f'{category}要件実装時の重点予防エラー',
            'error_count': len(error_descriptions),
            'integration_with_43_patterns': True
        }
```

---

## 🤖 **Phase 2: 統合質問生成エンジン（既存活用+自然言語拡張）**

### **🎯 既存の優秀な質問システムを最大活用**

#### **1. 既存質問テンプレートの活用・拡張**
```python
class EnhancedQuestionGenerator:
    """既存の優秀な質問システムを活用し、自然言語対応で拡張"""
    
    def __init__(self):
        # 既存の優秀なテンプレートシステムを継承
        self.existing_templates = self.load_existing_nagano3_templates()
        
        # 自然言語対応拡張テンプレート（既存互換）
        self.natural_enhancement_templates = {
            'database_integration_template': {
                'base_existing_template': 'nagano3_database_detailed_flow',  # 既存テンプレート参照
                'natural_language_enhancement': """
自然言語指示書でのデータベース要件と既存システムの統合について：

【自然言語要件】
検出されたキーワード: {detected_keywords}
要件の詳細: {source_context}

【既存システム統合】
Phase0 Q1対応: データベース接続（実DB必須・模擬データ禁止）
Phase1予防対象: エラー{phase1_errors}
既存Hooks統合: {universal_hooks_integration}

【統合実装フロー】
1. 自然言語要件の技術仕様への変換
2. 既存Phase0 Q1との整合性確保
3. getKichoDatabase()関数との互換性実装
4. Phase1エラー予防策の適用
5. 既存Hooksシステムとの連携

この統合データベースシステムについて、既存システムとの完全互換性を保ちながら、自然言語要件を満たす実装方法は理解していますか？
                """,
                'follow_up_questions': [
                    '既存getKichoDatabase()関数と新要件の統合方法は？',
                    'Phase1エラー{phase1_errors}の具体的予防策は？',
                    '既存コード保護と新機能追加の両立方法は？'
                ],
                'existing_compatibility_check': True
            },
            
            'api_integration_template': {
                'base_existing_template': 'nagano3_api_detailed_flow',
                'natural_language_enhancement': """
自然言語指示書でのAPI要件と既存システムの統合について：

【自然言語要件】
検出されたキーワード: {detected_keywords}
API形式の推定: {api_type_inference}

【既存システム統合】
Phase0 Q2対応: Python API連携（実連携必須・模擬レスポンス禁止）
Phase1予防対象: エラー{phase1_errors}
既存実装基準: FastAPI準拠・実連携必須

【統合実装フロー】
1. 自然言語API要件の技術仕様化
2. 既存FastAPI連携システムとの整合
3. Phase1エラー15,21の予防実装
4. 模擬レスポンス・モック禁止の徹底
5. callPythonAIService()等既存関数との連携

この統合API連携システムについて、既存の実連携必須方針を維持しながら、自然言語要件を実現する方法は理解していますか？
                """,
                'existing_compatibility_check': True
            }
        }
    
    def generate_integrated_question(self, category, natural_requirement, existing_match=None):
        """既存テンプレート + 自然言語要件の統合質問生成"""
        
        if existing_match and existing_match in self.existing_templates:
            # 既存の優秀なテンプレートをベースに拡張
            base_template = self.existing_templates[existing_match]
            enhanced_question = self.enhance_existing_template_with_natural_language(
                base_template, natural_requirement
            )
        else:
            # 自然言語テンプレートを使用（既存システム互換）
            template_key = f'{category}_integration_template'
            if template_key in self.natural_enhancement_templates:
                template = self.natural_enhancement_templates[template_key]
                enhanced_question = self.generate_from_natural_template(template, natural_requirement)
            else:
                enhanced_question = self.generate_generic_integrated_question(category, natural_requirement)
        
        return enhanced_question
    
    def enhance_existing_template_with_natural_language(self, existing_template, natural_requirement):
        """既存テンプレートを自然言語要件で強化"""
        
        enhanced = existing_template.copy()
        
        # 既存の優秀な質問構造を保持
        base_question = enhanced.get('question_template', '')
        
        # 自然言語要件の情報を統合
        natural_enhancement = f"""

【自然言語要件統合】
検出された要件: {', '.join(natural_requirement.get('detected_keywords', []))}
要件ソース: {natural_requirement.get('source_text', '')}
既存システム統合: {natural_requirement.get('existing_system_integration', {})}

"""
        
        enhanced['question_template'] = base_question + natural_enhancement
        
        # 既存のfollow_up_questionsを保持し、自然言語特有の質問を追加
        existing_follow_ups = enhanced.get('follow_up_questions', [])
        natural_follow_ups = [
            f"自然言語要件「{', '.join(natural_requirement.get('detected_keywords', []))}」の技術実装への変換方法は？",
            "既存システムとの互換性確保で注意すべき点は？"
        ]
        enhanced['follow_up_questions'] = existing_follow_ups + natural_follow_ups
        
        return enhanced
```

#### **2. 既存コード分析との統合**
```python
class IntegratedCodeAnalyzer:
    """既存の優秀なコード分析システムと自然言語要件の統合"""
    
    def extract_integrated_values(self, natural_requirement, project_materials, existing_analysis=None):
        """既存分析 + 自然言語要件の統合値抽出"""
        
        # 既存の優秀な分析結果を活用
        existing_values = existing_analysis or {}
        
        # 自然言語要件からの追加抽出
        natural_values = self.extract_natural_language_specific_values(natural_requirement, project_materials)
        
        # 統合・補完
        integrated_values = self.merge_existing_and_natural_values(existing_values, natural_values, natural_requirement)
        
        return integrated_values
    
    def extract_natural_language_specific_values(self, requirement, materials):
        """自然言語要件特有の値抽出"""
        
        category = requirement.get('category', 'generic')
        detected_keywords = requirement.get('detected_keywords', [])
        
        natural_values = {
            'natural_language_keywords': detected_keywords,
            'confidence_score': requirement.get('confidence_score', 0.8),
            'source_context': requirement.get('source_text', ''),
            'existing_integration': requirement.get('existing_system_integration', {})
        }
        
        if category == 'database_requirements':
            natural_values.update({
                'detected_db_type': self.infer_database_type(detected_keywords),
                'existing_q1_compliance': 'Phase0 Q1: データベース接続（実DB必須・模擬データ禁止）',
                'phase1_error_prevention': requirement.get('phase1_error_prevention', []),
                'mock_data_prohibition': '模擬データ使用禁止（既存方針準拠）'
            })
        
        elif category == 'api_requirements':
            natural_values.update({
                'detected_api_type': self.infer_api_type(detected_keywords),
                'existing_q2_compliance': 'Phase0 Q2: Python API連携（実連携必須・模擬レスポンス禁止）',
                'fastapi_integration': 'FastAPI連携（既存システム準拠）',
                'mock_response_prohibition': '模擬レスポンス禁止（既存方針準拠）'
            })
        
        return natural_values
    
    def merge_existing_and_natural_values(self, existing_values, natural_values, requirement):
        """既存値と自然言語値の統合"""
        
        integrated = existing_values.copy()
        
        # 自然言語値で既存値を補完・強化
        for key, value in natural_values.items():
            if key in integrated:
                # 既存値に自然言語情報を追加
                integrated[f'{key}_enhanced'] = f'{integrated[key]} | 自然言語要件: {value}'
            else:
                # 新規値として追加
                integrated[key] = value
        
        # 統合メタデータ
        integrated.update({
            'integration_type': 'existing_system_plus_natural_language',
            'existing_system_priority': True,
            'natural_language_complement': True,
            'compatibility_ensured': True
        })
        
        return integrated
```

---

## 🪝 **Phase 3: 統合Hooks自動生成・実行エンジン（既存+新機能）**

### **🎯 既存Hooksシステムの完全活用**

#### **1. 自動ディレクトリ検出・管理システム**
```python
class AutoDirectoryManager:
    """プロジェクト環境に応じた自動ディレクトリ検出・管理"""
    
    def __init__(self):
        # 検索候補パターン（優先順）
        self.directory_candidates = [
            '.nagano3/hooks/',              # 一時作業用（推奨）
            'system_core/hooks/',           # システムコア用
            'tools/hooks/',                 # ツール用
            'scripts/hooks/',               # スクリプト用
            'hooks/',                       # 汎用
            'development/hooks/',           # 開発用
        ]
    
    def auto_detect_hooks_directories(self):
        """Hooksディレクトリの自動検出・作成"""
        
        project_root = self.detect_project_root()
        
        hooks_directories = {
            'templates': None,      # テンプレート格納用
            'runtime': None,        # 実行時hooks格納用
            'temp': None,           # 一時ファイル用
            'config': None          # 設定ファイル用
        }
        
        # 既存ディレクトリの検索
        for candidate in self.directory_candidates:
            full_path = os.path.join(project_root, candidate)
            if os.path.exists(full_path):
                # 用途に応じて割り当て
                if not hooks_directories['runtime']:
                    hooks_directories['runtime'] = full_path
                elif not hooks_directories['templates']:
                    hooks_directories['templates'] = full_path
                elif not hooks_directories['temp']:
                    hooks_directories['temp'] = full_path
        
        # 見つからない場合は自動作成
        if not hooks_directories['runtime']:
            runtime_path = os.path.join(project_root, '.nagano3/hooks/')
            os.makedirs(runtime_path, exist_ok=True)
            hooks_directories['runtime'] = runtime_path
        
        if not hooks_directories['temp']:
            temp_path = os.path.join(project_root, '.nagano3/temp/')
            os.makedirs(temp_path, exist_ok=True)
            hooks_directories['temp'] = temp_path
        
        return hooks_directories
    
    def detect_project_root(self):
        """プロジェクトルートの自動検出"""
        
        current_dir = os.getcwd()
        indicators = [
            '.git',                 # Gitリポジトリ
            'composer.json',        # PHPプロジェクト
            'package.json',         # Nodeプロジェクト
            'modules',              # NAGANOプロジェクト
            'common',               # NAGANOプロジェクト
        ]
        
        # 上位ディレクトリへ遡って検索
        check_dir = current_dir
        for _ in range(10):
            for indicator in indicators:
                if os.path.exists(os.path.join(check_dir, indicator)):
                    return check_dir
            
            parent_dir = os.path.dirname(check_dir)
            if parent_dir == check_dir:
                break
            check_dir = parent_dir
        
        return current_dir
```

#### **2. 統合Hooks生成・実行システム**
```python
class IntegratedHooksExecutor:
    """既存Hooksシステム + 自然言語対応Hooksの統合実行"""
    
    def __init__(self):
        # 既存システムの参照（重要：既存を優先活用）
        self.existing_universal_hooks = self.load_existing_universal_hooks()
        self.existing_nagano3_hooks = self.load_existing_nagano3_hooks()
        self.existing_phase1_prevention = self.load_existing_phase1_system()
        
        # ディレクトリ自動管理
        self.directory_manager = AutoDirectoryManager()
        
        # 新機能：自然言語Hooks生成
        self.natural_hooks_generator = NaturalLanguageHooksGenerator()
    
    def execute_integrated_hooks_system(self, project_materials, natural_requirements=None):
        """既存Hooks優先 + 自然言語Hooks補完の統合実行"""
        
        execution_results = {
            'directories': self.directory_manager.auto_detect_hooks_directories(),
            'existing_hooks_results': {},
            'natural_hooks_results': {},
            'integration_assessment': {}
        }
        
        try:
            # Step 1: 既存Universal Hooks実行（必須・最優先）
            print("🌐 既存Universal Hooks実行中...")
            execution_results['existing_hooks_results']['universal'] = \
                self.execute_existing_universal_hooks(project_materials)
            
            # Step 2: 既存NAGANO3 Project Hooks実行（必須・最優先）
            print("🎯 既存NAGANO3 Project Hooks実行中...")
            execution_results['existing_hooks_results']['nagano3'] = \
                self.execute_existing_nagano3_hooks(project_materials)
            
            # Step 3: 既存Phase1エラー予防実行（必須・最優先）
            print("⚠️ 既存43エラーパターン予防実行中...")
            execution_results['existing_hooks_results']['phase1'] = \
                self.execute_existing_phase1_prevention(project_materials)
            
            # Step 4: 自然言語Hooks生成・実行（補完的）
            if natural_requirements:
                print("🆕 自然言語対応Hooks生成・実行中...")
                generated_hooks = self.natural_hooks_generator.generate_compatible_hooks(natural_requirements)
                execution_results['natural_hooks_results'] = \
                    self.execute_generated_natural_hooks(generated_hooks, project_materials)
                
                # 自動配置
                self.auto_deploy_hooks(generated_hooks, execution_results['directories'])
            
            # Step 5: 統合評価
            execution_results['integration_assessment'] = \
                self.assess_integrated_results(execution_results)
            
            return execution_results
            
        except Exception as e:
            execution_results['error'] = str(e)
            return execution_results
    
    def execute_existing_universal_hooks(self, project_materials):
        """既存Universal Hooksの実行（既存システム活用）"""
        
        # 既存システムの実行ロジックを呼び出し
        # ここでは簡略化して結果例を返す
        return {
            'security_check': {'status': 'passed', 'details': 'CSRF・XSS・SQLインジェクション対策確認'},
            'code_quality_check': {'status': 'passed', 'details': 'PHP構文・命名規則・ファイル構成確認'},
            'basic_functionality_check': {'status': 'passed', 'details': 'Ajax通信・データフロー・UI更新確認'},
            'overall_status': 'passed',
            'execution_time': '2.3秒',
            'existing_system': True
        }
    
    def execute_existing_nagano3_hooks(self, project_materials):
        """既存NAGANO3 Project Hooksの実行（既存システム活用）"""
        
        return {
            'project_knowledge_check': {'status': 'passed', 'details': 'data-action連携・Phase違い理解確認'},
            'infrastructure_check': {'status': 'passed', 'details': 'PostgreSQL・FastAPI・ディレクトリ確認'},
            'documentation_check': {'status': 'passed', 'details': 'Phase0-4指示書理解確認'},
            'overall_status': 'passed',
            'execution_time': '1.8秒',
            'existing_system': True
        }
    
    def execute_existing_phase1_prevention(self, project_materials):
        """既存Phase1エラー予防の実行（43エラーパターン）"""
        
        # 43エラーパターンのチェック実行
        return {
            'total_patterns_checked': 43,
            'critical_patterns_checked': 15,
            'errors_detected': 0,
            'errors_prevented': ['JavaScript競合', 'PHP構文エラー', 'CSRF403エラー'],
            'overall_status': 'passed',
            'execution_time': '3.1秒',
            'existing_system': True
        }
```

#### **3. 自然言語Hooks生成器**
```python
class NaturalLanguageHooksGenerator:
    """自然言語要件から既存システム互換のHooks生成"""
    
    def generate_compatible_hooks(self, natural_requirements):
        """既存システム完全互換のHooks生成"""
        
        generated_hooks = {}
        
        for category, requirement in natural_requirements.items():
            # 既存システム統合情報を活用
            existing_integration = requirement.get('existing_system_integration', {})
            
            hooks_spec = {
                'category': category,
                'hook_type': f'enhanced_{category}_check',
                'existing_compatibility': True,
                
                # 既存Phase0統合
                'phase0_integration': {
                    'base_question': existing_integration.get('phase0_question', ''),
                    'enhanced_question': self.generate_enhanced_phase0_question(category, requirement)
                },
                
                # 既存Phase1統合
                'phase1_integration': {
                    'target_errors': existing_integration.get('phase1_errors', []),
                    'prevention_methods': self.generate_error_prevention_methods(existing_integration.get('phase1_errors', []))
                },
                
                # 既存Universal Hooks統合
                'universal_hooks_integration': existing_integration.get('universal_hooks', []),
                
                # 検証方法
                'verification_methods': [
                    f'verify_{category}_with_existing_system_compatibility',
                    f'check_{category}_phase1_error_prevention',
                    f'validate_{category}_phase0_requirements'
                ],
                
                # 自動修復
                'auto_fix_methods': [
                    f'auto_fix_{category}_configuration',
                    f'auto_setup_{category}_environment'
                ],
                
                # 自然言語ソース情報
                'natural_language_source': {
                    'keywords': requirement.get('detected_keywords', []),
                    'confidence': requirement.get('confidence_score', 0.8),
                    'context': requirement.get('source_text', '')
                }
            }
            
            generated_hooks[category] = hooks_spec
        
        return generated_hooks
    
    def generate_enhanced_phase0_question(self, category, requirement):
        """既存Phase0質問の拡張バージョン生成"""
        
        keywords = ', '.join(requirement.get('detected_keywords', []))
        existing_integration = requirement.get('existing_system_integration', {})
        base_question = existing_integration.get('phase0_question', '')
        
        if category == 'database_requirements':
            return f"""
既存Phase0システムと自然言語要件の統合確認：

【既存Phase0 Q1】
{base_question}

【自然言語で検出された要件】
{keywords}

【統合実装確認事項】
1. 指定データベース（{keywords}）への実接続実装
2. getKichoDatabase()関数との完全互換性
3. 模擬データ・フォールバック処理の完全禁止
4. 既存コード保護方針の遵守
5. Phase1エラー{existing_integration.get('phase1_errors', [])}の予防策実装

この統合実装について、既存システムとの完全互換性を保ちながら自然言語要件を満たす方法は理解していますか？
"""
        
        return f"自然言語要件「{keywords}」と既存システムの統合実装方法は理解していますか？"
    
    def generate_error_prevention_methods(self, error_numbers):
        """Phase1エラー予防方法の生成"""
        
        prevention_methods = []
        
        for error_num in error_numbers:
            if error_num == 4:  # PHP構文エラー
                prevention_methods.append('PHP構文チェック・return記法確認')
            elif error_num == 5:  # CSRF 403エラー
                prevention_methods.append('CSRFトークン生成・送信・検証の確認')
            elif error_num == 10:  # SECURE_ACCESS未定義
                prevention_methods.append('SECURE_ACCESS定数定義の確認')
            elif error_num == 15:  # Python API連携エラー
                prevention_methods.append('FastAPI接続・エンドポイント確認')
            elif error_num == 21:  # ネットワークエラー
                prevention_methods.append('ネットワーク接続・タイムアウト設定確認')
            elif error_num == 25:  # CSRF検証失敗
                prevention_methods.append('CSRFトークン検証ロジック確認')
            elif error_num == 26:  # XSS対策不備
                prevention_methods.append('HTMLエスケープ・入力値検証確認')
            elif error_num == 31:  # AI学習精度エラー
                prevention_methods.append('AI学習精度監視・データ品質確認')
        
        return prevention_methods
```

---

## 📊 **Phase 4: 統合実行制御システム（既存Phase0-4活用）**

### **🎯 既存システムとの完全統合実行**

#### **1. 統合実行コントローラー**
```python
class IntegratedExecutionController:
    """既存Phase0-4システムと自然言語対応の統合実行制御"""
    
    def __init__(self):
        # 【重要】既存システムを最優先で参照・活用
        self.existing_phase0 = ExistingPhase0System()           # 10個強制質問
        self.existing_phase1 = ExistingPhase1System()           # 43エラー予防
        self.existing_phase2 = ExistingPhase2System()           # 詳細実装
        self.existing_phase3 = ExistingPhase3System()           # 品質検証
        
        # 新機能（既存システム補完用）
        self.natural_language_processor = UniversalInstructionParser()
        self.existing_system_integrator = ExistingSystemIntegrator()
        self.integrated_hooks_executor = IntegratedHooksExecutor()
        self.directory_manager = AutoDirectoryManager()
    
    def execute_enhanced_development_preparation(self, project_materials, development_request, instruction_files=None):
        """既存システム完全活用 + 自然言語補完の統合実行"""
        
        execution_log = {
            'execution_id': f"integrated_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'start_time': datetime.now().isoformat(),
            'existing_system_priority': True,
            'natural_language_complement': instruction_files is not None,
            'phases': {}
        }
        
        try:
            # Phase 0: 自然言語指示書解析（新機能・既存システム優先）
            natural_analysis = None
            if instruction_files:
                print("📄 自然言語指示書解析実行中...")
                natural_analysis = self.analyze_natural_language_instructions(instruction_files)
                execution_log['phases']['natural_analysis'] = {
                    'formats_detected': len(natural_analysis.get('formats', {})),
                    'requirements_extracted': len(natural_analysis.get('requirements', {})),
                    'existing_compatibility': natural_analysis.get('existing_compatibility', True)
                }
            
            # Phase 1: 統合Hooks実行（既存優先 + 自然言語補完）
            print("🪝 統合Hooksシステム実行中...")
            hooks_results = self.integrated_hooks_executor.execute_integrated_hooks_system(
                project_materials,
                natural_analysis.get('requirements', {}) if natural_analysis else None
            )
            execution_log['phases']['integrated_hooks'] = hooks_results
            
            # Phase 2: 既存Phase0実行（10個強制質問）+ 自然言語拡張
            print("🛡️ 既存Phase0実行中...")
            phase0_results = self.execute_enhanced_phase0(project_materials, natural_analysis)
            execution_log['phases']['phase0'] = phase0_results
            
            # Phase 3: 既存Phase1実行（43エラー予防）+ 自然言語統合
            print("⚠️ 既存Phase1実行中...")
            phase1_results = self.execute_enhanced_phase1(project_materials, natural_analysis)
            execution_log['phases']['phase1'] = phase1_results
            
            # Phase 4: 既存Phase2実行（詳細実装）+ 自然言語統合
            print("🚀 既存Phase2実行中...")
            phase2_results = self.execute_enhanced_phase2(
                project_materials, development_request, natural_analysis, phase0_results, phase1_results
            )
            execution_log['phases']['phase2'] = phase2_results
            
            # Phase 5: 既存Phase3実行（品質検証）+ 統合評価
            print("🧪 既存Phase3実行中...")
            phase3_results = self.execute_enhanced_phase3(
                project_materials, phase2_results, 
                {'natural_analysis': natural_analysis, 'hooks_results': hooks_results}
            )
            execution_log['phases']['phase3'] = phase3_results
            
            # Phase 6: 最終統合評価
            print("🏆 最終統合評価中...")
            final_assessment = self.calculate_final_integrated_assessment(execution_log)
            execution_log['final_assessment'] = final_assessment
            execution_log['success'] = True
            
            return execution_log
            
        except Exception as e:
            execution_log['error'] = str(e)
            execution_log['success'] = False
            return execution_log
    
    def analyze_natural_language_instructions(self, instruction_files):
        """自然言語指示書の統合解析"""
        
        analysis_results = {'formats': {}, 'requirements': {}, 'existing_compatibility': {}}
        
        for file_name, content in instruction_files.items():
            # 形式検出
            format_type = self.natural_language_processor.auto_detect_instruction_format(content)
            analysis_results['formats'][file_name] = format_type
            
            if format_type == 'nagano3_structured':
                # 既存システムで処理（新機能は使用しない）
                analysis_results['requirements'][file_name] = 'processed_by_existing_system'
                analysis_results['existing_compatibility'][file_name] = 'full_compatibility'
            else:
                # 自然言語解析
                requirements = self.natural_language_processor.parse_instruction_with_existing_integration(content)
                analysis_results['requirements'][file_name] = requirements
                analysis_results['existing_compatibility'][file_name] = 'enhanced_compatibility'
        
        return analysis_results
    
    def execute_enhanced_phase0(self, project_materials, natural_analysis):
        """既存Phase0 + 自然言語拡張実行"""
        
        # 既存Phase0の10個強制質問を実行
        base_results = self.existing_phase0.execute_forced_questions(project_materials)
        
        # 自然言語要件がある場合は質問を拡張
        if natural_analysis and natural_analysis.get('requirements'):
            enhanced_questions = self.existing_system_integrator.enhance_natural_requirements_with_existing_knowledge(
                natural_analysis['requirements']
            )
            base_results['natural_language_enhancement'] = enhanced_questions
            base_results['enhanced_questions_count'] = len(enhanced_questions)
        
        return base_results
    
    def execute_enhanced_phase1(self, project_materials, natural_analysis):
        """既存Phase1 + 自然言語統合実行"""
        
        # 既存Phase1の43エラーパターンチェックを実行
        base_results = self.existing_phase1.execute_43_error_prevention(project_materials)
        
        # 自然言語要件に基づく追加エラーチェック
        if natural_analysis and natural_analysis.get('requirements'):
            additional_checks = self.calculate_additional_error_checks(natural_analysis['requirements'])
            base_results['natural_language_integration'] = additional_checks
        
        return base_results
    
    def calculate_final_integrated_assessment(self, execution_log):
        """最終統合評価の計算"""
        
        # 既存システムの成功度（重み70%）
        existing_success = self.calculate_existing_system_success(execution_log)
        
        # 自然言語統合の成功度（重み20%）
        natural_success = self.calculate_natural_integration_success(execution_log)
        
        # 統合効果（重み10%）
        integration_effect = self.calculate_integration_effect(execution_log)
        
        # 重み付け最終スコア
        final_score = (existing_success * 0.7) + (natural_success * 0.2) + (integration_effect * 0.1)
        
        # 判定
        if final_score >= 95:
            recommendation = 'IMMEDIATE_DEVELOPMENT_START'
            readiness = 'Perfect'
        elif final_score >= 85:
            recommendation = 'READY_TO_START_DEVELOPMENT'
            readiness = 'Excellent'
        elif final_score >= 75:
            recommendation = 'READY_WITH_MONITORING'
            readiness = 'Good'
        else:
            recommendation = 'IMPROVEMENT_REQUIRED'
            readiness = 'Needs Improvement'
        
        return {
            'final_score': final_score,
            'existing_system_success': existing_success,
            'natural_integration_success': natural_success,
            'integration_effect': integration_effect,
            'development_readiness': readiness,
            'recommendation': recommendation,
            'next_steps': self.generate_next_steps(final_score, recommendation)
        }
```

---

## 🎯 **実装指示・開発ガイドライン**

### **📋 開発優先順位**
1. **【最優先】既存システムの完全活用** - Phase0-4、Universal/NAGANO3 Hooksの100%活用
2. **【高優先】自動ディレクトリ検出** - プロジェクト環境に自動適応
3. **【高優先】自然言語解析エンジン** - NAGANO3形式を最優先とした解析
4. **【中優先】統合Hooks生成** - 既存システム互換の新Hooks生成
5. **【中優先】統合実行制御** - 既存+新機能の統合実行

### **🔧 技術実装要件**
- **既存システム互換性**: 100%必須（既存の動作を一切阻害しない）
- **自動検出機能**: プロジェクト構造の自動認識・適応
- **段階的実装**: MVP → 機能拡張の段階的開発
- **エラーハンドリング**: 43エラーパターンとの完全統合
- **パフォーマンス**: 既存システムの実行時間を維持

### **📊 成功基準**
- **既存システム成功率**: 95%以上を維持
- **自然言語対応率**: 85%以上の要件抽出精度
- **統合互換性**: 100%（既存システムとの競合なし）
- **自動検出成功率**: 90%以上のディレクトリ自動検出
- **開発効率**: 既存ユーザーの学習コスト0、新規ユーザーの導入時間50%削減

### **⚠️ 重要な制約・注意事項**
1. **既存システム優先**: いかなる場合も既存システムの動作を優先
2. **NAGANO3形式優先**: NAGANO3形式が検出された場合は既存システムで処理
3. **段階的統合**: 一度に全機能を実装せず、段階的に統合
4. **後方互換性**: 既存ユーザーの移行コスト0を維持
5. **設定柔軟性**: ディレクトリ構造の多様性に対応

### **🚀 期待される最終効果**
- **既存ユーザー**: そのまま利用継続 + 新機能による効率向上
- **新規ユーザー**: 自然言語での即座利用開始 + 高品質保証
- **企業導入**: 学習コスト最小 + 適用範囲最大
- **開発成功**: 全プロジェクトで95%以上の成功率実現

---

**🎉 この統合システム開発により、既存の優秀な指示書システムの効果を100%維持しながら、自然言語指示書対応とプロジェクト汎用性を実現し、真の意味での「完全自動化開発準備システム」を構築できます！**