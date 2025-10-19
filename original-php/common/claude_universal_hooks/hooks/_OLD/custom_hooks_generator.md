# 🪝 高精度専用質問回答・自動Hooks統合システム開発指示書【修正版】

## 🎯 **システム目的**
汎用質問システムの基盤の上に、**プロジェクト固有の超精密質問・自動実行Hooks・リアルタイム検証**システムを構築する。開発者が迷うことなく確実に回答できる質問を生成し、開発成功率を95%以上に向上させる。

---

## 📊 **システム全体アーキテクチャ**

### **データフロー全体像**
```python
class IntegratedPrecisionSystem:
    def __init__(self):
        self.universal_analyzer = UniversalAnalyzer()      # Phase 1システム
        self.precision_generator = PrecisionGenerator()    # Phase 2システム  
        self.hooks_engine = HooksEngine()                  # 自動Hooks実行
        self.verification_system = VerificationSystem()   # リアルタイム検証
        
    def execute_complete_development_preparation(self, project_materials, development_request):
        """完全自動化された開発準備システム"""
        
        # Step 1: 汎用分析（Phase 1基盤）
        universal_analysis = self.universal_analyzer.analyze(project_materials)
        
        # Step 2: 専用精密分析（Phase 2）
        precision_analysis = self.precision_generator.deep_analyze(universal_analysis, development_request)
        
        # Step 3: 超精密質問生成
        precision_questions = self.precision_generator.generate_precision_questions(precision_analysis)
        
        # Step 4: 自動Hooks生成・実行
        auto_hooks = self.hooks_engine.generate_and_execute_hooks(precision_analysis)
        
        # Step 5: リアルタイム検証
        verification_results = self.verification_system.continuous_verification(precision_analysis)
        
        # Step 6: 統合判定
        final_assessment = self.integrate_all_results(precision_questions, auto_hooks, verification_results)
        
        return final_assessment
```

---

## 🔍 **Phase 1: 超精密プロジェクト分析エンジン**

### **🎯 プロジェクト固有要素の完全抽出**

#### **1. ドメイン特化分析システム**
```python
class DomainSpecificAnalyzer:
    def __init__(self):
        self.domain_analyzers = {
            'accounting': AccountingDomainAnalyzer(),
            'crm': CRMDomainAnalyzer(), 
            'inventory': InventoryDomainAnalyzer(),
            'ecommerce': EcommerceDomainAnalyzer(),
            'generic': GenericDomainAnalyzer()
        }
    
    def analyze_domain_specifics(self, project_materials, detected_domain):
        """ドメイン特化の詳細分析"""
        
        analyzer = self.domain_analyzers.get(detected_domain, self.domain_analyzers['generic'])
        
        return analyzer.analyze(project_materials)

class AccountingDomainAnalyzer:
    """記帳システム専用の分析エンジン"""
    
    def analyze(self, materials):
        return {
            'business_processes': self.extract_accounting_processes(materials),
            'ai_learning_requirements': self.analyze_ai_learning_specifics(materials),
            'mf_integration_details': self.analyze_mf_integration_details(materials),
            'compliance_requirements': self.extract_compliance_requirements(materials),
            'data_accuracy_requirements': self.extract_accuracy_requirements(materials),
            'workflow_patterns': self.extract_workflow_patterns(materials)
        }
    
    def extract_accounting_processes(self, materials):
        """記帳業務プロセスの詳細抽出"""
        
        accounting_patterns = {
            'transaction_flow': {
                'input_methods': ['manual_entry', 'csv_import', 'api_sync', 'ai_learning'],
                'validation_steps': ['format_check', 'duplicate_check', 'business_rule_check'],
                'approval_workflow': ['auto_approval', 'manual_review', 'batch_approval'],
                'posting_methods': ['real_time', 'batch_posting', 'scheduled_posting']
            },
            'ai_learning_specifics': {
                'learning_data_types': ['transaction_text', 'receipt_ocr', 'bank_descriptions'],
                'inference_targets': ['account_classification', 'tax_category', 'approval_prediction'],
                'accuracy_requirements': {'minimum': 0.85, 'target': 0.95, 'critical_threshold': 0.90},
                'visualization_requirements': ['accuracy_trends', 'confidence_distribution', 'rule_usage_stats']
            },
            'integration_requirements': {
                'mf_cloud_sync': {
                    'auth_method': 'oauth2',
                    'sync_frequency': 'real_time',
                    'data_types': ['transactions', 'accounts', 'categories'],
                    'error_handling': ['retry_logic', 'manual_intervention', 'notification_system']
                }
            }
        }
        
        detected_processes = {}
        
        for process_category, patterns in accounting_patterns.items():
            detected_processes[process_category] = self.match_patterns_in_materials(materials, patterns)
        
        return detected_processes
    
    def analyze_ai_learning_specifics(self, materials):
        """AI学習機能の詳細要件分析"""
        
        ai_indicators = {
            'learning_endpoints': self.extract_api_endpoints(materials, ['ai-learning', 'learning', 'inference']),
            'data_preprocessing': self.extract_preprocessing_logic(materials),
            'model_types': self.detect_model_types(materials),
            'result_visualization': self.extract_visualization_requirements(materials),
            'feedback_loops': self.detect_feedback_mechanisms(materials)
        }
        
        return ai_indicators
```

#### **2. 機能依存関係マッピング**
```python
class FunctionDependencyMapper:
    def map_feature_dependencies(self, materials, target_features):
        """機能間の詳細な依存関係をマッピング"""
        
        dependency_map = {}
        
        for feature in target_features:
            dependencies = {
                'direct_dependencies': self.find_direct_dependencies(feature, materials),
                'indirect_dependencies': self.find_indirect_dependencies(feature, materials),
                'data_dependencies': self.find_data_dependencies(feature, materials),
                'ui_dependencies': self.find_ui_dependencies(feature, materials),
                'api_dependencies': self.find_api_dependencies(feature, materials),
                'security_dependencies': self.find_security_dependencies(feature, materials)
            }
            
            dependency_map[feature] = dependencies
        
        return dependency_map
    
    def find_direct_dependencies(self, feature, materials):
        """直接的な機能依存関係"""
        
        # HTMLからdata-action属性の関連性を分析
        html_content = materials.get('html', '')
        related_actions = []
        
        # 同じフォーム内の他のアクション
        feature_context = self.extract_feature_context(feature, html_content)
        if feature_context:
            related_actions.extend(self.find_contextual_actions(feature_context))
        
        # JavaScriptからの関数呼び出し関係
        js_content = materials.get('javascript', '')
        js_dependencies = self.extract_js_dependencies(feature, js_content)
        
        # PHPからのcase文関係
        php_content = materials.get('php', '')
        php_dependencies = self.extract_php_dependencies(feature, php_content)
        
        return {
            'related_actions': related_actions,
            'js_dependencies': js_dependencies,
            'php_dependencies': php_dependencies
        }
```

---

## 🤖 **Phase 2: 超精密質問生成エンジン**

### **🎯 開発者が確実に回答できる具体的質問**

#### **1. ドメイン特化質問テンプレート**
```python
class DomainSpecificQuestionTemplates:
    def __init__(self):
        self.accounting_templates = {
            'ai_learning_flow': {
                'question_template': """
KICHO AI学習機能の完全なデータフローについて確認します：

【入力段階】
1. テキストエリア（#aiTextInput）からの学習データ取得
2. 入力データの前処理：{preprocessing_details}

【API連携段階】  
3. FastAPI呼び出し：{api_endpoint}
4. リクエスト形式：{request_format}
5. 認証・エラーハンドリング：{auth_error_handling}

【処理段階】
6. Python AI処理：{ai_processing_details}
7. 学習結果生成：{result_generation}

【応答段階】
8. レスポンス受信：{response_format}
9. 結果パース・検証：{result_validation}

【UI更新段階】
10. 視覚化表示：{visualization_details}
11. 学習履歴更新：{history_update}
12. 通知表示：{notification_details}

この12ステップのAI学習フローについて、各段階の処理内容は理解していますか？
                """,
                'follow_up_questions': [
                    "ステップ2の前処理で具体的に実行される処理は何ですか？",
                    "ステップ5でAPI呼び出しが失敗した場合の処理フローは？",
                    "ステップ10の視覚化で表示される要素（グラフ・数値）は何ですか？"
                ],
                'expected_knowledge_areas': [
                    'テキスト前処理の方法',
                    'FastAPI通信プロトコル',
                    'JSON形式でのデータ交換',
                    'JavaScript DOM操作',
                    'エラーハンドリング戦略'
                ]
            },
            'delete_transaction_flow': {
                'question_template': """
KICHO削除機能（{feature_name}）の完全な処理フローについて確認します：

【フロントエンド段階】
1. 削除ボタンクリック（data-action="{action_name}"）
2. JavaScript イベント捕捉：{js_event_handling}
3. 削除対象データ抽出：{data_extraction_method}
4. 確認ダイアログ表示：{confirmation_ui}

【Ajax通信段階】
5. FormData作成：{form_data_structure}
6. CSRF トークン追加：{csrf_implementation}
7. Ajax送信：{ajax_config}

【バックエンド段階】
8. PHP 受信処理：{php_reception}
9. 入力値検証：{input_validation}
10. 権限確認：{permission_check}
11. トランザクション開始：{transaction_start}
12. データ削除実行：{delete_execution}
13. ログ記録：{log_recording}
14. 関連データ処理：{related_data_handling}
15. トランザクション確定：{transaction_commit}

【レスポンス段階】
16. JSON応答生成：{response_generation}
17. UI更新指示：{ui_update_instructions}

【UI更新段階】
18. 要素削除アニメーション：{delete_animation}
19. 統計カウンタ更新：{counter_update}
20. 成功通知表示：{success_notification}

この20ステップの削除処理フローについて、各段階の処理内容は理解していますか？
                """,
                'critical_checkpoints': [
                    'ステップ11-15のトランザクション処理',
                    'ステップ12のデータ削除実行',
                    'ステップ18-20のUI更新処理'
                ]
            }
        }
    
    def generate_domain_question(self, template_name, feature_details, materials):
        """ドメイン特化質問を実際のコードから生成"""
        
        template = self.accounting_templates.get(template_name)
        if not template:
            return None
        
        # 実際のコードから具体的な値を抽出
        template_values = self.extract_template_values(feature_details, materials, template_name)
        
        # テンプレートに値を埋め込み
        formatted_question = template['question_template'].format(**template_values)
        
        return {
            'question': formatted_question,
            'follow_up_questions': template['follow_up_questions'],
            'expected_knowledge_areas': template.get('expected_knowledge_areas', []),
            'critical_checkpoints': template.get('critical_checkpoints', []),
            'verification_methods': self.generate_verification_methods(template_name, template_values)
        }
```

#### **2. 実コード分析による値抽出**
```python
class CodeAnalysisExtractor:
    def extract_template_values(self, feature_details, materials, template_type):
        """実際のコードから質問テンプレートに埋め込む値を抽出"""
        
        if template_type == 'ai_learning_flow':
            return self.extract_ai_learning_values(materials)
        elif template_type == 'delete_transaction_flow':
            return self.extract_delete_flow_values(feature_details, materials)
        
    def extract_ai_learning_values(self, materials):
        """AI学習フローの実装詳細を抽出"""
        
        html_content = materials.get('html', '')
        js_content = materials.get('javascript', '')
        php_content = materials.get('php', '')
        
        values = {
            'preprocessing_details': self.find_preprocessing_logic(html_content, js_content),
            'api_endpoint': self.extract_api_endpoint(js_content, php_content),
            'request_format': self.extract_request_format(js_content),
            'auth_error_handling': self.extract_error_handling(js_content, php_content),
            'ai_processing_details': self.extract_ai_processing_info(php_content),
            'result_generation': self.extract_result_generation_logic(php_content),
            'response_format': self.extract_response_format(php_content),
            'result_validation': self.extract_validation_logic(js_content),
            'visualization_details': self.extract_visualization_logic(js_content),
            'history_update': self.extract_history_update_logic(js_content, php_content),
            'notification_details': self.extract_notification_logic(js_content)
        }
        
        return values
    
    def find_preprocessing_logic(self, html_content, js_content):
        """テキスト前処理ロジックを特定"""
        
        preprocessing_patterns = [
            r'\.trim\(\)',
            r'\.replace\(',
            r'\.split\(',
            r'validation',
            r'sanitize'
        ]
        
        found_preprocessing = []
        for pattern in preprocessing_patterns:
            if re.search(pattern, js_content):
                found_preprocessing.append(self.extract_context_around_pattern(js_content, pattern))
        
        if found_preprocessing:
            return "テキストのトリミング・バリデーション・サニタイゼーション"
        else:
            return "基本的なテキスト取得のみ"
    
    def extract_api_endpoint(self, js_content, php_content):
        """API エンドポイントを特定"""
        
        # JavaScript から fetch URL を抽出
        fetch_pattern = r'fetch\([\'"`]([^\'"`]+)[\'"`]'
        fetch_matches = re.findall(fetch_pattern, js_content)
        
        # PHP から API URL を抽出
        api_pattern = r'http://[^\'"`\s]+'
        api_matches = re.findall(api_pattern, php_content)
        
        if fetch_matches:
            return fetch_matches[0]
        elif api_matches:
            return api_matches[0]
        else:
            return "http://localhost:8000/api/ai-learning（推定）"
```

#### **3. 回答可能性検証システム**
```python
class AnswerabilityValidator:
    def validate_question_answerability(self, question, expected_knowledge):
        """質問が人間に回答可能かを検証"""
        
        validation_result = {
            'is_answerable': True,
            'clarity_score': 0,
            'specificity_score': 0,
            'knowledge_requirement_level': 'unknown',
            'improvement_suggestions': []
        }
        
        # 明確性の検証
        clarity_issues = self.check_clarity_issues(question)
        if clarity_issues:
            validation_result['is_answerable'] = False
            validation_result['improvement_suggestions'].extend(clarity_issues)
        
        # 具体性の検証
        specificity_score = self.calculate_specificity_score(question)
        validation_result['specificity_score'] = specificity_score
        
        if specificity_score < 70:
            validation_result['improvement_suggestions'].append(
                "より具体的な例・手順・コードを含めることを推奨"
            )
        
        # 知識要件レベルの判定
        knowledge_level = self.assess_knowledge_requirement_level(question, expected_knowledge)
        validation_result['knowledge_requirement_level'] = knowledge_level
        
        if knowledge_level == 'expert_only':
            validation_result['improvement_suggestions'].append(
                "一般開発者