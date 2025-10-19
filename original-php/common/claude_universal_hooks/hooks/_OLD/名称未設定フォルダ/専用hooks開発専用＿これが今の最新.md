# 🪝 人間質問特化Hooks自動生成システム開発指示書【修正版】

## 🎯 **システム目的**

どんなツールでも「HTML + 開発指示書」を分析し、人間への質問を自動生成して回答を得ることで、専用Hooksを自動作成するシステム。既存の汎用Hooksシステムと完全統合し、マネージャーが開発順序に従って実行できる専用Hooks生成を実現する。

---

## 📊 **システム全体アーキテクチャ**

### **🔄 基本フロー**

```python
class HumanQuestionHooksSystem:
    """人間質問特化Hooks自動生成システム"""

    def __init__(self):
        # 既存汎用Hooksとの統合
        self.existing_universal_hooks = UniversalHooksSystem()        # 既存汎用システム
        
        # 新機能：人間質問特化システム
        self.html_analyzer = HTMLAnalysisEngine()                    # HTML解析
        self.instruction_parser = InstructionParsingEngine()         # 指示書解析
        self.question_generator = HumanQuestionGenerator()           # 質問生成
        self.hooks_builder = SpecificHooksBuilder()                  # 専用hooks構築
        self.manager_controller = HooksExecutionManager()            # 実行制御

    def execute_complete_system(self, html_content, instruction_content):
        """完全自動専用Hooks生成実行"""

        # Step 1: 入力分析
        analysis_result = self.analyze_inputs(html_content, instruction_content)
        
        # Step 2: 人間への質問生成・実行
        human_responses = self.generate_and_ask_questions(analysis_result)
        
        # Step 3: 専用Hooks自動生成
        specific_hooks = self.build_specific_hooks(analysis_result, human_responses)
        
        # Step 4: マネージャー用実行計画生成
        execution_plan = self.create_execution_plan(specific_hooks)
        
        return {
            'analysis_result': analysis_result,
            'human_responses': human_responses,
            'specific_hooks': specific_hooks,
            'execution_plan': execution_plan
        }
```

---

## 🔍 **Phase 1: 入力分析エンジン**

### **📋 HTML + 指示書統合分析**

```python
class InputAnalysisEngine:
    """HTML + 開発指示書の統合分析エンジン"""
    
    def analyze_complete_inputs(self, html_content: str, instruction_content: str) -> Dict[str, Any]:
        """HTML + 指示書の完全分析"""
        
        analysis_result = {
            'html_analysis': {},
            'instruction_analysis': {},
            'integration_mapping': {},
            'question_requirements': {},
            'hooks_specifications': {}
        }
        
        # HTML構造分析
        analysis_result['html_analysis'] = self._analyze_html_structure(html_content)
        
        # 開発指示書分析
        analysis_result['instruction_analysis'] = self._analyze_instruction_content(instruction_content)
        
        # 統合マッピング生成
        analysis_result['integration_mapping'] = self._create_integration_mapping(
            analysis_result['html_analysis'],
            analysis_result['instruction_analysis']
        )
        
        # 質問要件生成
        analysis_result['question_requirements'] = self._generate_question_requirements(
            analysis_result['integration_mapping']
        )
        
        return analysis_result
    
    def _analyze_html_structure(self, html_content: str) -> Dict[str, Any]:
        """HTML構造の詳細分析"""
        
        html_analysis = {
            'buttons_detected': {},
            'forms_detected': {},
            'inputs_detected': {},
            'ajax_patterns': {},
            'event_handlers': {},
            'data_flows': {}
        }
        
        # ボタン要素検出・分析
        button_pattern = r'<(button|input[^>]*type=["\']button["\'])[^>]*>'
        buttons = re.findall(button_pattern, html_content, re.IGNORECASE)
        
        for i, button in enumerate(buttons):
            button_id = f"btn_{i+1}"
            html_analysis['buttons_detected'][button_id] = {
                'element': button,
                'onclick_pattern': self._extract_onclick_pattern(button),
                'target_function': self._identify_target_function(button),
                'input_sources': self._identify_input_sources(button, html_content),
                'output_targets': self._identify_output_targets(button, html_content),
                'ajax_dependency': self._check_ajax_dependency(button)
            }
        
        # フォーム要素検出・分析
        form_pattern = r'<form[^>]*>(.*?)</form>'
        forms = re.findall(form_pattern, html_content, re.IGNORECASE | re.DOTALL)
        
        for i, form in enumerate(forms):
            form_id = f"form_{i+1}"
            html_analysis['forms_detected'][form_id] = {
                'content': form,
                'method': self._extract_form_method(form),
                'action': self._extract_form_action(form),
                'fields': self._extract_form_fields(form),
                'validation_requirements': self._identify_validation_requirements(form)
            }
        
        return html_analysis
    
    def _analyze_instruction_content(self, instruction_content: str) -> Dict[str, Any]:
        """開発指示書の詳細分析"""
        
        instruction_analysis = {
            'project_type': '',
            'technology_stack': [],
            'functional_requirements': [],
            'technical_requirements': [],
            'integration_requirements': [],
            'quality_requirements': [],
            'priority_levels': {}
        }
        
        # プロジェクトタイプ推定
        if any(keyword in instruction_content.lower() for keyword in ['在庫', '管理', 'inventory']):
            instruction_analysis['project_type'] = 'inventory_management'
        elif any(keyword in instruction_content.lower() for keyword in ['会計', '経理', 'accounting']):
            instruction_analysis['project_type'] = 'accounting_system'
        elif any(keyword in instruction_content.lower() for keyword in ['顧客', 'crm', 'customer']):
            instruction_analysis['project_type'] = 'crm_system'
        else:
            instruction_analysis['project_type'] = 'general_application'
        
        # 技術スタック検出
        tech_keywords = {
            'php': ['php'],
            'javascript': ['javascript', 'js', 'ajax'],
            'python': ['python', 'fastapi'],
            'database': ['postgresql', 'mysql', 'database', 'db'],
            'css': ['css', 'bootstrap', 'responsive']
        }
        
        for tech, keywords in tech_keywords.items():
            if any(keyword in instruction_content.lower() for keyword in keywords):
                instruction_analysis['technology_stack'].append(tech)
        
        # 機能要件抽出
        functional_patterns = [
            r'([登録編集削除][機能])',
            r'([自動計算更新][機能])',
            r'([レスポンシブ対応])',
            r'([ajax][による]?[非同期通信])',
            r'([バリデーション][機能])'
        ]
        
        for pattern in functional_patterns:
            matches = re.findall(pattern, instruction_content, re.IGNORECASE)
            instruction_analysis['functional_requirements'].extend(matches)
        
        return instruction_analysis
```

---

## 💬 **Phase 2: 人間質問生成・実行エンジン**

### **🎯 分析結果に基づく質問自動生成**

```python
class HumanQuestionGenerator:
    """人間への質問自動生成・実行エンジン"""
    
    def generate_comprehensive_questions(self, analysis_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """分析結果に基づく包括的質問生成"""
        
        question_sets = []
        
        # 1. プロジェクト基本確認質問
        question_sets.extend(self._generate_project_basic_questions(analysis_result))
        
        # 2. HTML要素別機能確認質問
        question_sets.extend(self._generate_html_element_questions(analysis_result))
        
        # 3. 技術実装詳細質問
        question_sets.extend(self._generate_technical_detail_questions(analysis_result))
        
        # 4. 統合・連携確認質問
        question_sets.extend(self._generate_integration_questions(analysis_result))
        
        # 5. 品質・運用要件質問
        question_sets.extend(self._generate_quality_questions(analysis_result))
        
        return question_sets
    
    def _generate_project_basic_questions(self, analysis_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """プロジェクト基本確認質問生成"""
        
        project_type = analysis_result['instruction_analysis']['project_type']
        tech_stack = analysis_result['instruction_analysis']['technology_stack']
        
        questions = [
            {
                'category': 'project_basic',
                'priority': 'high',
                'question': f"このプロジェクトは「{project_type}」として認識されましたが、正確ですか？",
                'options': [
                    f"はい、{project_type}です",
                    "いいえ、別のタイプです",
                    "部分的に正しいです"
                ],
                'follow_up_required': True,
                'validation_method': 'choice_validation'
            },
            {
                'category': 'project_basic',
                'priority': 'high',
                'question': f"使用技術スタック「{', '.join(tech_stack)}」は正確ですか？",
                'options': [
                    "完全に正確です",
                    "一部追加が必要です",
                    "一部修正が必要です",
                    "大幅に違います"
                ],
                'follow_up_required': True,
                'validation_method': 'choice_validation'
            },
            {
                'category': 'project_basic',
                'priority': 'medium',
                'question': "開発環境の詳細を教えてください",
                'sub_questions': [
                    "ローカル開発環境は何ですか？（XAMPP、Docker、その他）",
                    "データベースの接続設定は既に完了していますか？",
                    "外部APIとの連携は必要ですか？",
                    "既存システムとの統合はありますか？"
                ],
                'validation_method': 'free_text_validation'
            }
        ]
        
        return questions
    
    def _generate_html_element_questions(self, analysis_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """HTML要素別機能確認質問生成"""
        
        html_analysis = analysis_result['html_analysis']
        questions = []
        
        # ボタン機能詳細質問
        for button_id, button_info in html_analysis['buttons_detected'].items():
            target_function = button_info.get('target_function', '不明')
            
            questions.append({
                'category': 'html_elements',
                'element_type': 'button',
                'element_id': button_id,
                'priority': 'high',
                'question': f"ボタン「{button_id}」の具体的な動作を教えてください",
                'sub_questions': [
                    f"このボタンは何を実行しますか？（現在推定: {target_function}）",
                    "どのデータを入力として使用しますか？",
                    "処理結果はどこに表示されますか？",
                    "エラーが発生した場合の動作は？",
                    "この機能で使用する外部連携はありますか？"
                ],
                'button_info': button_info,
                'validation_method': 'detailed_function_validation'
            })
        
        # フォーム機能詳細質問
        for form_id, form_info in html_analysis['forms_detected'].items():
            action = form_info.get('action', '不明')
            fields = form_info.get('fields', [])
            
            questions.append({
                'category': 'html_elements',
                'element_type': 'form',
                'element_id': form_id,
                'priority': 'high',
                'question': f"フォーム「{form_id}」の詳細仕様を教えてください",
                'sub_questions': [
                    f"送信先「{action}」での処理内容は？",
                    f"フィールド「{', '.join(fields)}」のバリデーションルールは？",
                    "必須項目と任意項目の区別は？",
                    "送信成功・失敗時の動作は？",
                    "このフォームで連携する外部システムは？"
                ],
                'form_info': form_info,
                'validation_method': 'form_specification_validation'
            })
        
        return questions
    
    def _generate_technical_detail_questions(self, analysis_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """技術実装詳細質問生成"""
        
        tech_stack = analysis_result['instruction_analysis']['technology_stack']
        questions = []
        
        # データベース実装質問
        if 'database' in tech_stack:
            questions.append({
                'category': 'technical_details',
                'tech_area': 'database',
                'priority': 'high',
                'question': "データベース実装の詳細を教えてください",
                'sub_questions': [
                    "使用するテーブル名は何ですか？",
                    "テーブル構造（カラム名・型）は決まっていますか？",
                    "主キー・外部キーの設定は？",
                    "インデックスが必要なカラムは？",
                    "データの初期投入は必要ですか？"
                ],
                'validation_method': 'database_schema_validation'
            })
        
        # API連携実装質問
        if any(tech in tech_stack for tech in ['python', 'javascript']):
            questions.append({
                'category': 'technical_details',
                'tech_area': 'api_integration',
                'priority': 'high',
                'question': "API連携実装の詳細を教えてください",
                'sub_questions': [
                    "連携するAPIのエンドポイントは？",
                    "認証方法（APIキー、Token等）は？",
                    "リクエスト・レスポンス形式は？",
                    "エラーハンドリングの要件は？",
                    "タイムアウト・リトライの設定は？"
                ],
                'validation_method': 'api_specification_validation'
            })
        
        # セキュリティ実装質問
        questions.append({
            'category': 'technical_details',
            'tech_area': 'security',
            'priority': 'medium',
            'question': "セキュリティ実装の要件を教えてください",
            'sub_questions': [
                "CSRFトークンの実装は必要ですか？",
                "XSS対策の具体的な要件は？",
                "入力値検証のルールは？",
                "ファイルアップロードのセキュリティ要件は？",
                "アクセス制御・認証の要件は？"
            ],
            'validation_method': 'security_requirements_validation'
        })
        
        return questions
    
    def ask_questions_and_collect_responses(self, questions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """質問実行・回答収集"""
        
        responses = {
            'answered_questions': [],
            'collected_responses': {},
            'validation_results': {},
            'follow_up_needed': [],
            'completion_status': {}
        }
        
        print("🎯 専用Hooks生成のための質問を開始します\n")
        
        for question_data in questions:
            category = question_data['category']
            priority = question_data['priority']
            
            print(f"📋 [{category.upper()}] 優先度: {priority.upper()}")
            print(f"❓ {question_data['question']}")
            
            if 'sub_questions' in question_data:
                print("   詳細質問:")
                for i, sub_q in enumerate(question_data['sub_questions'], 1):
                    print(f"   {i}. {sub_q}")
            
            if 'options' in question_data:
                print("   選択肢:")
                for i, option in enumerate(question_data['options'], 1):
                    print(f"   {i}. {option}")
            
            # 実際の実装では、ここでユーザー入力を待機
            response = input("\n回答を入力してください: ")
            
            # 回答の記録・検証
            validation_result = self._validate_response(question_data, response)
            
            responses['answered_questions'].append(question_data)
            responses['collected_responses'][question_data.get('element_id', category)] = response
            responses['validation_results'][question_data.get('element_id', category)] = validation_result
            
            if validation_result.get('follow_up_needed'):
                responses['follow_up_needed'].append(question_data)
            
            print("✅ 回答を記録しました\n")
        
        return responses
    
    def _validate_response(self, question_data: Dict[str, Any], response: str) -> Dict[str, Any]:
        """回答検証"""
        
        validation_method = question_data.get('validation_method', 'basic_validation')
        
        validation_result = {
            'is_valid': True,
            'validation_score': 1.0,
            'issues_found': [],
            'follow_up_needed': False,
            'suggested_improvements': []
        }
        
        # 基本的な回答検証
        if not response or response.strip() == "":
            validation_result['is_valid'] = False
            validation_result['issues_found'].append("回答が空です")
            validation_result['follow_up_needed'] = True
            return validation_result
        
        # カテゴリ別詳細検証
        if validation_method == 'choice_validation':
            options = question_data.get('options', [])
            if response not in options and not any(str(i) in response for i in range(1, len(options)+1)):
                validation_result['issues_found'].append("選択肢から選択してください")
                validation_result['validation_score'] = 0.5
        
        elif validation_method == 'detailed_function_validation':
            required_elements = ['機能説明', 'データ', '表示', 'エラー処理']
            for element in required_elements:
                if element not in response:
                    validation_result['suggested_improvements'].append(f"{element}について詳しく説明してください")
        
        elif validation_method == 'database_schema_validation':
            db_keywords = ['テーブル', 'カラム', '型', 'キー']
            if not any(keyword in response for keyword in db_keywords):
                validation_result['suggested_improvements'].append("データベース設計の詳細を追加してください")
        
        return validation_result
```

---

## 🛠️ **Phase 3: 専用Hooks自動構築エンジン**

### **🎯 回答に基づく専用Hooks生成**

```python
class SpecificHooksBuilder:
    """回答に基づく専用Hooks自動構築エンジン"""
    
    def build_comprehensive_hooks(self, 
                                analysis_result: Dict[str, Any], 
                                human_responses: Dict[str, Any]) -> Dict[str, Any]:
        """包括的専用Hooks構築"""
        
        hooks_specifications = {
            'button_hooks': {},
            'form_hooks': {},
            'integration_hooks': {},
            'validation_hooks': {},
            'error_handling_hooks': {},
            'execution_metadata': {}
        }
        
        # ボタン専用Hooks生成
        hooks_specifications['button_hooks'] = self._build_button_hooks(
            analysis_result, human_responses
        )
        
        # フォーム専用Hooks生成
        hooks_specifications['form_hooks'] = self._build_form_hooks(
            analysis_result, human_responses
        )
        
        # 統合・連携Hooks生成
        hooks_specifications['integration_hooks'] = self._build_integration_hooks(
            analysis_result, human_responses
        )
        
        # バリデーションHooks生成
        hooks_specifications['validation_hooks'] = self._build_validation_hooks(
            analysis_result, human_responses
        )
        
        # エラーハンドリングHooks生成
        hooks_specifications['error_handling_hooks'] = self._build_error_handling_hooks(
            analysis_result, human_responses
        )
        
        # 実行メタデータ生成
        hooks_specifications['execution_metadata'] = self._generate_execution_metadata(
            hooks_specifications
        )
        
        return hooks_specifications
    
    def _build_button_hooks(self, 
                          analysis_result: Dict[str, Any], 
                          human_responses: Dict[str, Any]) -> Dict[str, Any]:
        """ボタン専用Hooks構築"""
        
        button_hooks = {}
        html_analysis = analysis_result['html_analysis']
        
        for button_id, button_info in html_analysis['buttons_detected'].items():
            if button_id in human_responses['collected_responses']:
                response = human_responses['collected_responses'][button_id]
                
                button_hooks[button_id] = {
                    'hook_type': 'button_specific',
                    'element_info': button_info,
                    'human_specification': response,
                    'generated_implementation': self._generate_button_implementation(
                        button_info, response
                    ),
                    'validation_rules': self._extract_validation_rules(response),
                    'error_handling': self._extract_error_handling(response),
                    'integration_points': self._extract_integration_points(response),
                    'testing_requirements': self._generate_testing_requirements(
                        button_info, response
                    )
                }
        
        return button_hooks
    
    def _generate_button_implementation(self, 
                                      button_info: Dict[str, Any], 
                                      human_response: str) -> Dict[str, Any]:
        """ボタン実装仕様生成"""
        
        implementation = {
            'frontend_code': {},
            'backend_code': {},
            'database_operations': {},
            'api_calls': {},
            'validation_logic': {}
        }
        
        # フロントエンド実装
        implementation['frontend_code'] = {
            'event_handler': f"""
function handle_{button_info.get('target_function', 'button')}() {{
    // 入力値取得
    const inputData = getInputData();
    
    // バリデーション
    if (!validateInput(inputData)) {{
        displayError('入力値エラー');
        return;
    }}
    
    // Ajax通信
    performAjaxRequest(inputData);
}}
            """,
            'validation_function': self._generate_validation_function(human_response),
            'error_display': self._generate_error_display_function(human_response),
            'success_handling': self._generate_success_handling(human_response)
        }
        
        # バックエンド実装
        if 'データベース' in human_response or 'DB' in human_response:
            implementation['backend_code'] = {
                'action_handler': self._generate_action_handler(human_response),
                'database_function': self._generate_database_function(human_response),
                'response_format': self._generate_response_format(human_response)
            }
        
        # データベース操作
        if 'INSERT' in human_response.upper() or '登録' in human_response:
            implementation['database_operations']['insert'] = self._generate_insert_operation(human_response)
        if 'UPDATE' in human_response.upper() or '更新' in human_response:
            implementation['database_operations']['update'] = self._generate_update_operation(human_response)
        if 'DELETE' in human_response.upper() or '削除' in human_response:
            implementation['database_operations']['delete'] = self._generate_delete_operation(human_response)
        
        return implementation
    
    def _build_form_hooks(self, 
                        analysis_result: Dict[str, Any], 
                        human_responses: Dict[str, Any]) -> Dict[str, Any]:
        """フォーム専用Hooks構築"""
        
        form_hooks = {}
        html_analysis = analysis_result['html_analysis']
        
        for form_id, form_info in html_analysis['forms_detected'].items():
            if form_id in human_responses['collected_responses']:
                response = human_responses['collected_responses'][form_id]
                
                form_hooks[form_id] = {
                    'hook_type': 'form_specific',
                    'element_info': form_info,
                    'human_specification': response,
                    'field_specifications': self._extract_field_specifications(response),
                    'validation_rules': self._extract_form_validation_rules(response),
                    'submission_handling': self._extract_submission_handling(response),
                    'backend_processing': self._extract_backend_processing(response),
                    'success_failure_handling': self._extract_success_failure_handling(response)
                }
        
        return form_hooks
    
    def _build_integration_hooks(self, 
                               analysis_result: Dict[str, Any], 
                               human_responses: Dict[str, Any]) -> Dict[str, Any]:
        """統合・連携Hooks構築"""
        
        integration_hooks = {}
        
        # API連携Hooks
        api_responses = [resp for key, resp in human_responses['collected_responses'].items() 
                        if 'api' in key.lower() or 'API' in resp]
        
        if api_responses:
            integration_hooks['api_integration'] = {
                'hook_type': 'api_integration_specific',
                'endpoints': self._extract_api_endpoints(api_responses),
                'authentication': self._extract_api_authentication(api_responses),
                'request_formats': self._extract_request_formats(api_responses),
                'response_handling': self._extract_response_handling(api_responses),
                'error_scenarios': self._extract_api_error_scenarios(api_responses)
            }
        
        # データベース連携Hooks
        db_responses = [resp for key, resp in human_responses['collected_responses'].items() 
                       if 'database' in key.lower() or 'データベース' in resp]
        
        if db_responses:
            integration_hooks['database_integration'] = {
                'hook_type': 'database_integration_specific',
                'table_specifications': self._extract_table_specifications(db_responses),
                'connection_config': self._extract_connection_config(db_responses),
                'query_patterns': self._extract_query_patterns(db_responses),
                'transaction_handling': self._extract_transaction_handling(db_responses)
            }
        
        return integration_hooks
```

---

## 🎮 **Phase 4: マネージャー実行制御システム**

### **🔄 開発順序制御・自動実行**

```python
class HooksExecutionManager:
    """専用Hooks実行制御マネージャー"""
    
    def create_execution_plan(self, specific_hooks: Dict[str, Any]) -> Dict[str, Any]:
        """専用Hooks実行計画生成"""
        
        execution_plan = {
            'phase_1_setup': {},
            'phase_2_core_implementation': {},
            'phase_3_integration': {},
            'phase_4_validation': {},
            'phase_5_deployment': {},
            'execution_order': [],
            'dependencies': {},
            'success_criteria': {}
        }
        
        # Phase 1: セットアップ・準備
        execution_plan['phase_1_setup'] = {
            'hooks_to_execute': self._select_setup_hooks(specific_hooks),
            'questions_to_ask': self._generate_setup_questions(specific_hooks),
            'expected_duration': '15-30分',
            'success_criteria': [
                'データベース接続確認完了',
                '基本設定ファイル準備完了',
                '開発環境動作確認完了'
            ]
        }
        
        # Phase 2: コア機能実装
        execution_plan['phase_2_core_implementation'] = {
            'hooks_to_execute': self._select_core_hooks(specific_hooks),
            'questions_to_ask': self._generate_core_questions(specific_hooks),
            'expected_duration': '45-90分',
            'success_criteria': [
                '全ボタン機能動作確認完了',
                '全フォーム送信処理確認完了',
                'データベース操作動作確認完了'
            ]
        }
        
        # Phase 3: 統合・連携実装
        execution_plan['phase_3_integration'] = {
            'hooks_to_execute': self._select_integration_hooks(specific_hooks),
            'questions_to_ask': self._generate_integration_questions(specific_hooks),
            'expected_duration': '30-60分',
            'success_criteria': [
                'API連携動作確認完了',
                'フロントエンド・バックエンド連携確認完了',
                'エラーハンドリング動作確認完了'
            ]
        }
        
        # 実行順序決定
        execution_plan['execution_order'] = self._determine_execution_order(specific_hooks)
        
        # 依存関係設定
        execution_plan['dependencies'] = self._map_hook_dependencies(specific_hooks)
        
        return execution_plan
    
    def execute_managed_hooks_system(self, 
                                   specific_hooks: Dict[str, Any], 
                                   execution_plan: Dict[str, Any]) -> Dict[str, Any]:
        """マネージャー制御による実行"""
        
        execution_result = {
            'execution_id': f"managed_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'phases_completed': {},
            'hooks_executed': {},
            'questions_answered': {},
            'success_metrics': {},
            'next_steps': [],
            'completion_status': 'in_progress'
        }
        
        print("🎮 専用Hooks マネージャー実行開始")
        print("=" * 50)
        
        # Phase 1: セットアップ実行
        phase_1_result = self._execute_phase(
            'phase_1_setup',
            execution_plan['phase_1_setup'],
            specific_hooks
        )
        execution_result['phases_completed']['phase_1'] = phase_1_result
        
        if phase_1_result['success_rate'] < 0.8:
            print("⚠️ Phase 1 で問題が発生しました。修正が必要です。")
            execution_result['next_steps'].append("Phase 1 の問題解決が必要")
            return execution_result
        
        # Phase 2: コア実装実行
        phase_2_result = self._execute_phase(
            'phase_2_core_implementation',
            execution_plan['phase_2_core_implementation'],
            specific_hooks
        )
        execution_result['phases_completed']['phase_2'] = phase_2_result
        
        # Phase 3: 統合実装実行
        phase_3_result = self._execute_phase(
            'phase_3_integration',
            execution_plan['phase_3_integration'],
            specific_hooks
        )
        execution_result['phases_completed']['phase_3'] = phase_3_result
        
        # 全体成功率計算
        total_success_rate = self._calculate_total_success_rate(execution_result)
        execution_result['success_metrics']['overall_success_rate'] = total_success_rate
        
        # 完了判定
        if total_success_rate >= 0.9:
            execution_result['completion_status'] = 'completed'
            execution_result['next_steps'] = [
                "実装完了！本格的な開発を開始できます",
                "必要に応じて詳細テストを実行してください"
            ]
        elif total_success_rate >= 0.7:
            execution_result['completion_status'] = 'mostly_completed'
            execution_result['next_steps'] = [
                "基本実装完了。一部改善が推奨されます",
                "残った問題を解決後、開発を継続してください"
            ]
        else:
            execution_result['completion_status'] = 'needs_improvement'
            execution_result['next_steps'] = [
                "重要な問題が残っています",
                "問題解決後にHooks実行を再実行してください"
            ]
        
        return execution_result
    
    def _execute_phase(self, 
                      phase_name: str, 
                      phase_config: Dict[str, Any], 
                      specific_hooks: Dict[str, Any]) -> Dict[str, Any]:
        """単一フェーズ実行"""
        
        phase_result = {
            'phase_name': phase_name,
            'hooks_executed': [],
            'questions_answered': [],
            'success_rate': 0.0,
            'issues_found': [],
            'execution_time': ''
        }
        
        start_time = datetime.now()
        
        print(f"\n📋 {phase_name.upper()} 実行開始")
        print(f"予想時間: {phase_config.get('expected_duration', '不明')}")
        
        # フェーズ内Hooks実行
        hooks_to_execute = phase_config.get('hooks_to_execute', [])
        for hook_spec in hooks_to_execute:
            hook_result = self._execute_single_hook(hook_spec, specific_hooks)
            phase_result['hooks_executed'].append(hook_result)
        
        # フェーズ内質問実行
        questions_to_ask = phase_config.get('questions_to_ask', [])
        for question in questions_to_ask:
            answer_result = self._ask_phase_question(question)
            phase_result['questions_answered'].append(answer_result)
        
        # 成功基準チェック
        success_criteria = phase_config.get('success_criteria', [])
        success_count = 0
        for criterion in success_criteria:
            if self._check_success_criterion(criterion, phase_result):
                success_count += 1
            else:
                phase_result['issues_found'].append(f"未達成: {criterion}")
        
        phase_result['success_rate'] = success_count / len(success_criteria) if success_criteria else 1.0
        phase_result['execution_time'] = str(datetime.now() - start_time)
        
        print(f"✅ {phase_name} 完了 - 成功率: {phase_result['success_rate']:.1%}")
        
        return phase_result
    
    def _execute_single_hook(self, 
                           hook_spec: Dict[str, Any], 
                           specific_hooks: Dict[str, Any]) -> Dict[str, Any]:
        """単一Hook実行"""
        
        hook_type = hook_spec.get('type')
        hook_id = hook_spec.get('id')
        
        print(f"  🪝 実行中: {hook_type} - {hook_id}")
        
        # 実際の実装では、ここで具体的なHook処理を実行
        # この例では、シミュレーション的に処理
        
        hook_result = {
            'hook_type': hook_type,
            'hook_id': hook_id,
            'execution_status': 'success',
            'execution_time': '3.2秒',
            'output': f"{hook_type} の {hook_id} が正常に実行されました"
        }
        
        return hook_result
    
    def _ask_phase_question(self, question: str) -> Dict[str, Any]:
        """フェーズ質問実行"""
        
        print(f"  ❓ {question}")
        
        # 実際の実装では、ユーザー入力を待機
        # この例では、シミュレーション回答
        answer = "理解しています"
        
        answer_result = {
            'question': question,
            'answer': answer,
            'validation_score': 1.0,
            'timestamp': datetime.now().strftime('%H:%M:%S')
        }
        
        print(f"  ✅ 回答: {answer}")
        
        return answer_result
```

---

## 🎯 **実行例・デモンストレーション**

### **📋 使用例**

```python
def main_human_question_hooks_demo():
    """人間質問特化Hooks システム デモ実行"""
    
    # サンプルHTML
    html_content = """
    <button id="save_btn" onclick="saveData()">データ保存</button>
    <button id="calc_btn" onclick="calculate()">計算実行</button>
    <form id="user_form" action="user_register.php" method="post">
        <input name="name" type="text" required>
        <input name="email" type="email" required>
        <input type="submit" value="登録">
    </form>
    """
    
    # サンプル開発指示書
    instruction_content = """
    在庫管理システムの開発
    - 商品の登録・編集・削除機能
    - 在庫数の自動計算・更新
    - Ajax による非同期通信
    - PostgreSQL データベース連携
    - レスポンシブ対応のUIデザイン
    """
    
    # システム初期化
    hooks_system = HumanQuestionHooksSystem()
    
    print("🎯 人間質問特化Hooks自動生成システム デモ")
    print("=" * 60)
    
    # 完全自動実行
    result = hooks_system.execute_complete_system(html_content, instruction_content)
    
    # 結果表示
    print(f"\n📊 実行結果:")
    print(f"検出ボタン数: {len(result['analysis_result']['html_analysis']['buttons_detected'])}")
    print(f"検出フォーム数: {len(result['analysis_result']['html_analysis']['forms_detected'])}")
    print(f"生成された質問数: {len(result['human_responses']['answered_questions'])}")
    print(f"構築されたHooks数: {sum(len(hooks) for hooks in result['specific_hooks'].values())}")
    print(f"実行フェーズ数: {len(result['execution_plan'])}")
    
    print(f"\n🎮 次のステップ:")
    for step in result['execution_plan'].get('execution_order', []):
        print(f"  - {step}")

if __name__ == "__main__":
    main_human_question_hooks_demo()
```

---

## 🏆 **システムの特徴・利点**

### **✅ 人間質問特化**
- **HTML + 指示書の自動分析**による的確な質問生成
- **段階的質問システム**による詳細仕様収集
- **回答検証・フォローアップ**による品質確保

### **✅ 専用Hooks自動生成**
- **汎用Hooksとの完全分離**で特化機能に集中
- **回答に基づく実装仕様**の自動生成
- **テスト・検証要件**の自動作成

### **✅ マネージャー制御**
- **開発順序に従った自動実行**
- **フェーズ別成功基準**による品質管理
- **依存関係管理**による確実な実行

### **✅ 既存システム統合**
- **汎用Hooksとの完全互換性**
- **Phase0-4システムとの連携**
- **43エラーパターン予防**との統合

---

**🎉 この人間質問特化Hooksシステムにより、どんなツールでも HTML + 開発指示書から人間への質問を通じて専用Hooksを自動生成し、マネージャーが開発順序に従って確実に実行できるシステムが実現できます！**