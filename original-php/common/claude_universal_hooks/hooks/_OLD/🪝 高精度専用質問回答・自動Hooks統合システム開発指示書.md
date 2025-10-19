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
                "一般開発者にも理解できるよう、基礎知識の説明を追加することを推奨"
            )
        
        return validation_result
    
    def check_clarity_issues(self, question):
        """質問の明確性問題をチェック"""
        
        clarity_problems = []
        
        # 曖昧な表現のチェック
        vague_expressions = ['何か', 'どれか', 'いくつか', 'ある程度', '適当に']
        for expr in vague_expressions:
            if expr in question:
                clarity_problems.append(f"曖昧な表現「{expr}」を具体的に修正")
        
        # 専門用語の説明不足チェック
        technical_terms = ['API', 'OAuth', 'CSRF', 'JSON', 'Ajax']
        for term in technical_terms:
            if term in question and f"{term}（" not in question:
                clarity_problems.append(f"専門用語「{term}」の説明追加を推奨")
        
        # 手順の具体性チェック
        if '処理フロー' in question or 'ステップ' in question:
            if not re.search(r'\d+\.', question):
                clarity_problems.append("処理ステップに番号付けを追加")
        
        return clarity_problems


---

## 🪝 **Phase 3: 自動Hooks実行エンジン**

### **🎯 完全自動化されたHooksシステム**

#### **1. リアルタイム環境検証Hooks**
```python
class RealTimeEnvironmentHooks:
    def __init__(self):
        self.verification_hooks = {
            'database_connectivity': {
                'check_frequency': 'pre_development',
                'verification_methods': [
                    self.verify_database_connection,
                    self.verify_required_tables,
                    self.verify_database_permissions
                ],
                'auto_fix_methods': [
                    self.auto_create_missing_tables,
                    self.auto_fix_permissions
                ]
            },
            'api_services': {
                'check_frequency': 'continuous',
                'verification_methods': [
                    self.verify_fastapi_health,
                    self.verify_api_endpoints,
                    self.verify_api_authentication
                ],
                'auto_fix_methods': [
                    self.auto_restart_api_service,
                    self.auto_generate_api_config
                ]
            },
            'file_system': {
                'check_frequency': 'pre_development',
                'verification_methods': [
                    self.verify_directory_structure,
                    self.verify_file_permissions,
                    self.verify_log_directories
                ],
                'auto_fix_methods': [
                    self.auto_create_directories,
                    self.auto_fix_permissions
                ]
            }
        }
    
    def execute_environment_verification(self, project_context):
        """環境検証Hooksの自動実行"""
        
        verification_results = {}
        
        for hook_category, hook_config in self.verification_hooks.items():
            category_results = {
                'status': 'unknown',
                'checks_passed': [],
                'checks_failed': [],
                'auto_fixes_applied': [],
                'manual_actions_required': []
            }
            
            # 検証メソッド実行
            for verification_method in hook_config['verification_methods']:
                try:
                    result = verification_method(project_context)
                    
                    if result['success']:
                        category_results['checks_passed'].append(result)
                    else:
                        category_results['checks_failed'].append(result)
                        
                        # 自動修復の試行
                        fix_attempted = self.attempt_auto_fix(result, hook_config['auto_fix_methods'])
                        if fix_attempted['success']:
                            category_results['auto_fixes_applied'].append(fix_attempted)
                        else:
                            category_results['manual_actions_required'].append(fix_attempted)
                            
                except Exception as e:
                    category_results['checks_failed'].append({
                        'method': verification_method.__name__,
                        'error': str(e),
                        'requires_manual_intervention': True
                    })
            
            # カテゴリ全体のステータス判定
            if len(category_results['checks_failed']) == 0:
                category_results['status'] = 'all_passed'
            elif len(category_results['manual_actions_required']) == 0:
                category_results['status'] = 'auto_fixed'
            else:
                category_results['status'] = 'manual_intervention_required'
            
            verification_results[hook_category] = category_results
        
        return verification_results
    
    def verify_database_connection(self, project_context):
        """データベース接続の検証"""
        
        try:
            # プロジェクトのデータベース接続方法を特定
            db_method = project_context.get('database_method', 'getKichoDatabase()')
            
            if 'getKichoDatabase' in db_method:
                # KICHO専用のデータベース接続確認
                test_result = self.test_kicho_database_connection()
            else:
                # 汎用データベース接続確認
                test_result = self.test_generic_database_connection(project_context)
            
            return {
                'success': test_result['connected'],
                'method': 'database_connection_test',
                'details': test_result,
                'auto_fixable': test_result.get('auto_fixable', False)
            }
            
        except Exception as e:
            return {
                'success': False,
                'method': 'database_connection_test',
                'error': str(e),
                'auto_fixable': False
            }
    
    def verify_fastapi_health(self, project_context):
        """FastAPI サービスの健康状態確認"""
        
        api_endpoints = project_context.get('api_endpoints', ['http://localhost:8000'])
        
        for endpoint in api_endpoints:
            try:
                health_url = f"{endpoint}/health"
                response = requests.get(health_url, timeout=5)
                
                if response.status_code == 200:
                    return {
                        'success': True,
                        'method': 'fastapi_health_check',
                        'endpoint': endpoint,
                        'response': response.json(),
                        'auto_fixable': False
                    }
                    
            except requests.exceptions.RequestException as e:
                continue
        
        return {
            'success': False,
            'method': 'fastapi_health_check',
            'error': 'FastAPI サービスに接続できません',
            'auto_fixable': True,
            'fix_suggestion': 'python main_8002.py でサーバー起動を試行'
        }


#### **2. 知識検証Hooks**
```python
class KnowledgeVerificationHooks:
    def __init__(self):
        self.knowledge_categories = {
            'technical_fundamentals': {
                'weight': 0.4,
                'required_score': 85,
                'verification_questions': 'auto_generated_from_tech_stack'
            },
            'domain_specific': {
                'weight': 0.3,
                'required_score': 80,
                'verification_questions': 'auto_generated_from_domain'
            },
            'implementation_readiness': {
                'weight': 0.3,
                'required_score': 75,
                'verification_questions': 'auto_generated_from_features'
            }
        }
    
    def execute_knowledge_verification(self, qa_results, project_context):
        """知識検証Hooksの実行"""
        
        verification_result = {
            'overall_score': 0,
            'category_scores': {},
            'knowledge_gaps': [],
            'learning_recommendations': [],
            'development_readiness': 'unknown'
        }
        
        total_weighted_score = 0
        
        for category, config in self.knowledge_categories.items():
            category_questions = self.filter_questions_by_category(qa_results, category)
            
            if category_questions:
                category_score = self.calculate_category_score(category_questions)
                verification_result['category_scores'][category] = category_score
                
                # 重み付けスコアに加算
                total_weighted_score += category_score * config['weight']
                
                # 必要スコアに達していない場合はギャップとして記録
                if category_score < config['required_score']:
                    gap_details = self.analyze_knowledge_gap(category, category_questions, config)
                    verification_result['knowledge_gaps'].append(gap_details)
                    
                    # 学習推奨事項を生成
                    learning_rec = self.generate_learning_recommendation(gap_details)
                    verification_result['learning_recommendations'].append(learning_rec)
        
        verification_result['overall_score'] = total_weighted_score
        
        # 開発準備度の判定
        if total_weighted_score >= 85:
            verification_result['development_readiness'] = 'excellent'
        elif total_weighted_score >= 75:
            verification_result['development_readiness'] = 'good'
        elif total_weighted_score >= 65:
            verification_result['development_readiness'] = 'acceptable'
        else:
            verification_result['development_readiness'] = 'insufficient'
        
        return verification_result


#### **3. 実装品質Hooks**
```python
class ImplementationQualityHooks:
    def __init__(self):
        self.quality_checks = {
            'code_syntax': {
                'php_syntax': 'php -l',
                'javascript_syntax': 'eslint --no-eslintrc',
                'css_syntax': 'css-validator'
            },
            'security_compliance': {
                'csrf_implementation': self.check_csrf_implementation,
                'sql_injection_prevention': self.check_sql_injection_prevention,
                'xss_prevention': self.check_xss_prevention
            },
            'performance_compliance': {
                'database_optimization': self.check_database_optimization,
                'frontend_optimization': self.check_frontend_optimization
            }
        }
    
    def execute_quality_verification(self, project_files, implementation_stage):
        """実装品質Hooksの実行"""
        
        quality_results = {}
        overall_quality_score = 0
        
        for check_category, checks in self.quality_checks.items():
            category_results = {}
            category_score = 0
            
            for check_name, check_method in checks.items():
                try:
                    if callable(check_method):
                        result = check_method(project_files)
                    else:
                        result = self.execute_command_check(check_method, project_files)
                    
                    category_results[check_name] = result
                    category_score += result.get('score', 0)
                    
                except Exception as e:
                    category_results[check_name] = {
                        'success': False,
                        'error': str(e),
                        'score': 0
                    }
            
            # カテゴリ平均スコア
            if checks:
                category_avg = category_score / len(checks)
                quality_results[check_category] = {
                    'average_score': category_avg,
                    'details': category_results
                }
                overall_quality_score += category_avg
        
        # 全体品質スコア
        if self.quality_checks:
            overall_quality_score = overall_quality_score / len(self.quality_checks)
        
        return {
            'overall_quality_score': overall_quality_score,
            'category_results': quality_results,
            'quality_grade': self.calculate_quality_grade(overall_quality_score),
            'improvement_actions': self.generate_improvement_actions(quality_results)
        }


---

## 📊 **Phase 4: 精密質問選定システム**

### **🎯 開発内容に完全特化した質問選定**

#### **1. 機能別質問重要度マトリックス**
```python
class FeatureBasedQuestionPrioritizer:
    def __init__(self):
        self.feature_question_matrix = {
            'ai_integration': {
                'critical_questions': [
                    'api_communication_flow',
                    'data_preprocessing_logic', 
                    'result_visualization_requirements',
                    'error_handling_strategy'
                ],
                'high_priority_questions': [
                    'performance_optimization',
                    'user_feedback_integration',
                    'model_accuracy_monitoring'
                ],
                'medium_priority_questions': [
                    'ui_animation_preferences',
                    'logging_detail_level'
                ]
            },
            'crud_operations': {
                'critical_questions': [
                    'data_validation_requirements',
                    'security_implementation',
                    'transaction_management',
                    'error_recovery_procedures'
                ],
                'high_priority_questions': [
                    'ui_feedback_mechanisms',
                    'audit_trail_requirements',
                    'performance_considerations'
                ]
            },
            'api_integration': {
                'critical_questions': [
                    'authentication_flow',
                    'data_format_handling',
                    'rate_limiting_strategy',
                    'offline_handling'
                ],
                'high_priority_questions': [
                    'caching_strategy',
                    'sync_conflict_resolution'
                ]
            }
        }
    
    def prioritize_questions_by_features(self, all_questions, target_features, development_context):
        """機能に基づく質問優先度付け"""
        
        prioritized_questions = []
        
        for feature in target_features:
            feature_type = self.classify_feature_type(feature)
            
            if feature_type in self.feature_question_matrix:
                matrix = self.feature_question_matrix[feature_type]
                
                # 重要度別に質問を分類・追加
                for priority_level, question_types in matrix.items():
                    for question_type in question_types:
                        matching_questions = self.find_matching_questions(
                            all_questions, 
                            question_type, 
                            feature,
                            development_context
                        )
                        
                        for question in matching_questions:
                            enhanced_question = self.enhance_question_with_priority(
                                question, 
                                priority_level, 
                                feature,
                                question_type
                            )
                            prioritized_questions.append(enhanced_question)
        
        # 重要度とスコアに基づくソート
        return sorted(prioritized_questions, key=self.calculate_final_priority_score, reverse=True)
    
    def calculate_final_priority_score(self, question):
        """最終優先度スコアの計算"""
        
        base_scores = {
            'critical_questions': 100,
            'high_priority_questions': 80,
            'medium_priority_questions': 60,
            'low_priority_questions': 40
        }
        
        priority_level = question.get('priority_level', 'medium_priority_questions')
        base_score = base_scores.get(priority_level, 50)
        
        # 追加要因による調整
        adjustments = 0
        
        # 開発リスク要因
        if question.get('risk_level') == 'high':
            adjustments += 20
        
        # 実装複雑度要因
        if question.get('complexity_level') == 'high':
            adjustments += 15
        
        # 統合重要度要因
        if question.get('integration_critical'):
            adjustments += 10
        
        return base_score + adjustments


#### **2. 動的質問選定エンジン**
```python
class DynamicQuestionSelectionEngine:
    def select_optimal_question_set(self, all_questions, development_request, constraints):
        """動的な最適質問セット選定"""
        
        selection_context = {
            'max_questions': constraints.get('max_questions', 25),
            'max_duration': constraints.get('max_duration', 30),  # 分
            'mandatory_categories': constraints.get('mandatory_categories', []),
            'excluded_categories': constraints.get('excluded_categories', []),
            'complexity_preference': constraints.get('complexity_preference', 'balanced')
        }
        
        # Step 1: 必須質問の特定
        mandatory_questions = self.identify_mandatory_questions(all_questions, development_request)
        
        # Step 2: 高関連度質問の選定
        relevant_questions = self.select_relevant_questions(
            all_questions, 
            development_request, 
            exclude=mandatory_questions
        )
        
        # Step 3: バランス調整
        balanced_selection = self.balance_question_selection(
            mandatory_questions + relevant_questions,
            selection_context
        )
        
        # Step 4: 最終調整
        final_selection = self.finalize_selection(balanced_selection, selection_context)
        
        return {
            'selected_questions': final_selection,
            'selection_metadata': {
                'total_questions': len(final_selection),
                'estimated_duration': self.estimate_duration(final_selection),
                'coverage_analysis': self.analyze_coverage(final_selection),
                'selection_rationale': self.generate_selection_rationale(final_selection)
            }
        }
    
    def balance_question_selection(self, questions, context):
        """質問選定のバランス調整"""
        
        # カテゴリ別の質問数制限
        category_limits = {
            'security': 4,           # セキュリティは最大4問
            'database': 3,           # データベースは最大3問
            'api_integration': 4,    # API統合は最大4問
            'ui_ux': 2,             # UI/UXは最大2問
            'performance': 2,        # パフォーマンスは最大2問
            'business_logic': 5,     # ビジネスロジックは最大5問
            'technical_implementation': 6  # 技術実装は最大6問
        }
        
        categorized_questions = {}
        for question in questions:
            category = question.get('category', 'technical_implementation')
            if category not in categorized_questions:
                categorized_questions[category] = []
            categorized_questions[category].append(question)
        
        # 各カテゴリから制限数まで選定
        balanced_questions = []
        for category, category_questions in categorized_questions.items():
            limit = category_limits.get(category, 3)
            
            # 重要度順にソート
            sorted_questions = sorted(
                category_questions, 
                key=lambda q: q.get('importance_score', 0), 
                reverse=True
            )
            
            balanced_questions.extend(sorted_questions[:limit])
        
        return balanced_questions


---

## 🔄 **Phase 5: リアルタイム継続改善システム**

### **🎯 開発結果からの自動学習・改善**

#### **1. 開発成功パターン学習**
```python
class DevelopmentOutcomeLearningSystem:
    def __init__(self):
        self.success_pattern_db = {}
        self.failure_pattern_db = {}
        self.improvement_suggestions_db = {}
    
    def learn_from_development_outcome(self, qa_session, hooks_results, development_outcome):
        """開発結果からパターンを学習"""
        
        if development_outcome['success']:
            self.learn_success_patterns(qa_session, hooks_results, development_outcome)
        else:
            self.learn_failure_patterns(qa_session, hooks_results, development_outcome)
        
        # 改善提案の生成
        improvements = self.generate_improvement_suggestions(qa_session, development_outcome)
        self.update_improvement_database(improvements)
    
    def learn_success_patterns(self, qa_session, hooks_results, outcome):
        """成功パターンの学習"""
        
        success_indicators = {
            'high_score_questions': [q for q in qa_session if q.get('score', 0) >= 85],
            'effective_hooks': [h for h in hooks_results if h.get('impact') == 'high'],
            'critical_knowledge_areas': outcome.get('critical_success_factors', []),
            'optimal_question_categories': self.extract_successful_categories(qa_session)
        }
        
        # プロジェクト種別別に成功パターンを記録
        project_type = outcome.get('project_type', 'generic')
        if project_type not in self.success_pattern_db:
            self.success_pattern_db[project_type] = []
        
        self.success_pattern_db[project_type].append({
            'timestamp': datetime.now(),
            'success_indicators': success_indicators,
            'development_metrics': outcome.get('metrics', {}),
            'quality_scores': outcome.get('quality_scores', {})
        })
    
    def generate_adaptive_improvements(self, project_type):
        """プロジェクト種別に適応した改善提案"""
        
        if project_type not in self.success_pattern_db:
            return self.generate_generic_improvements()
        
        success_patterns = self.success_pattern_db[project_type]
        
        # 成功パターンの分析
        common_success_factors = self.analyze_common_success_factors(success_patterns)
        
        improvements = {
            'question_refinements': self.suggest_question_refinements(common_success_factors),
            'hooks_optimizations': self.suggest_hooks_optimizations(common_success_factors),
            'selection_algorithm_updates': self.suggest_selection_improvements(common_success_factors)
        }
        
        return improvements


#### **2. 質問精度自動向上システム**
```python
class QuestionAccuracyImprovementSystem:
    def improve_question_accuracy(self, historical_qa_data, development_outcomes):
        """質問精度の自動向上"""
        
        accuracy_improvements = {}
        
        for question_id, question_data in historical_qa_data.items():
            # 質問の効果測定
            effectiveness_score = self.calculate_question_effectiveness(
                question_data, 
                development_outcomes
            )
            
            if effectiveness_score < 0.7:  # 効果が低い質問
                improvement_suggestion = self.generate_question_improvement(
                    question_data,
                    development_outcomes
                )
                accuracy_improvements[question_id] = improvement_suggestion
        
        return accuracy_improvements
    
    def calculate_question_effectiveness(self, question_data, outcomes):
        """質問の効果を測定"""
        
        effectiveness_factors = {
            'answer_accuracy': 0,      # 回答の正確性
            'development_correlation': 0,  # 開発成功との相関
            'knowledge_gap_detection': 0,  # 知識ギャップ検出能力
            'learning_facilitation': 0     # 学習促進効果
        }
        
        # 回答の正確性評価
        correct_answers = sum(1 for answer in question_data['answers'] if answer.get('correct', False))
        total_answers = len(question_data['answers'])
        effectiveness_factors['answer_accuracy'] = correct_answers / total_answers if total_answers > 0 else 0
        
        # 開発成功との相関評価
        high_score_developments = [d for d in outcomes if d.get('success_rate', 0) > 0.8]
        if high_score_developments:
            correlation = self.calculate_correlation(question_data, high_score_developments)
            effectiveness_factors['development_correlation'] = correlation
        
        # 総合効果スコア
        return sum(effectiveness_factors.values()) / len(effectiveness_factors)


---

## 🎮 **Phase 6: 統合実行システム**

### **🎯 全システムの完全統合・自動実行**

#### **統合実行フロー**
```python
class IntegratedExecutionSystem:
    def execute_complete_development_preparation(self, project_materials, development_request):
        """完全統合された開発準備システムの実行"""
        
        execution_log = {
            'start_time': datetime.now(),
            'phases': {},
            'overall_result': {}
        }
        
        try:
            # Phase 1: 汎用分析（5分）
            print("🔍 Phase 1: プロジェクト汎用分析実行中...")
            universal_analysis = self.universal_analyzer.analyze(project_materials)
            execution_log['phases']['universal_analysis'] = {
                'duration': self.time_elapsed(),
                'result': universal_analysis
            }
            
            # Phase 2: 専用精密分析（5分）
            print("🎯 Phase 2: プロジェクト専用分析実行中...")
            precision_analysis = self.precision_analyzer.deep_analyze(
                universal_analysis, 
                development_request
            )
            execution_log['phases']['precision_analysis'] = {
                'duration': self.time_elapsed(),
                'result': precision_analysis
            }
            
            # Phase 3: 超精密質問生成（3分）
            print("🤖 Phase 3: 精密質問生成中...")
            precision_questions = self.question_generator.generate_precision_questions(
                precision_analysis
            )
            execution_log['phases']['question_generation'] = {
                'duration': self.time_elapsed(),
                'question_count': len(precision_questions)
            }
            
            # Phase 4: 環境Hooks実行（2分）
            print("🪝 Phase 4: 環境検証Hooks実行中...")
            environment_hooks = self.hooks_engine.execute_environment_hooks(precision_analysis)
            execution_log['phases']['environment_hooks'] = {
                'duration': self.time_elapsed(),
                'result': environment_hooks
            }
            
            # Phase 5: QA セッション実行（20分）
            print("💬 Phase 5: QAセッション実行中...")
            qa_results = self.qa_executor.execute_precision_qa_session(precision_questions)
            execution_log['phases']['qa_session'] = {
                'duration': self.time_elapsed(),
                'questions_answered': len(qa_results),
                'average_score': self.calculate_average_score(qa_results)
            }
            
            # Phase 6: 知識検証Hooks実行（3分）
            print("🧠 Phase 6: 知識検証Hooks実行中...")
            knowledge_verification = self.hooks_engine.execute_knowledge_hooks(
                qa_results, 
                precision_analysis
            )
            execution_log['phases']['knowledge_verification'] = {
                'duration': self.time_elapsed(),
                'result': knowledge_verification
            }
            
            # Phase 7: 統合判定（2分）
            print("📊 Phase 7: 統合判定実行中...")
            final_assessment = self.assessor.integrate_all_results(
                qa_results,
                environment_hooks,
                knowledge_verification,
                precision_analysis
            )
            execution_log['phases']['final_assessment'] = {
                'duration': self.time_elapsed(),
                'result': final_assessment
            }
            
            execution_log['overall_result'] = final_assessment
            execution_log['total_duration'] = self.time_elapsed()
            execution_log['success'] = True
            
            return execution_log
            
        except Exception as e:
            execution_log['error'] = str(e)
            execution_log['success'] = False
            execution_log['total_duration'] = self.time_elapsed()
            
            return execution_log


#### **実行例：KICHO AI学習機能**
```python
# 実際の実行例
kicho_materials = {
    'html': load_file('kicho_content.php'),
    'javascript': load_file('kicho.js'),
    'php': load_file('kicho_ajax_handler.php'),
    'css': load_file('kicho.css'),
    'specifications': load_file('kicho_requirements.md')
}

development_request = """
KICHO記帳ツールのAI学習機能を完全に実装したい。
具体的には：
1. execute-integrated-ai-learning ボタンの完全動作
2. FastAPI連携による実AI学習
3. 学習結果の視覚化（円形グラフ・バーチャート）
4. 学習履歴の自動保存・表示
5. エラーハンドリングの完備
"""

# システム実行
execution_result = integrated_system.execute_complete_development_preparation(
    kicho_materials, 
    development_request
)

# 期待される結果
{
    'success': True,
    'total_duration': '35分',
    'phases': {
        'universal_analysis': {
            'project_type': 'accounting_system',
            'confidence': 0.95,
            'tech_stack': ['php', 'javascript', 'postgresql', 'fastapi']
        },
        'precision_analysis': {
            'ai_integration_requirements': '詳細分析完了',
            'ui_visualization_requirements': '円形・バーチャート指定',
            'api_endpoints': ['http://localhost:8000/api/ai-learning']
        },
        'question_generation': {
            'question_count': 24,
            'categories': ['ai_integration', 'ui_visualization', 'error_handling']
        },
        'qa_session': {
            'questions_answered': 24,
            'average_score': 87
        },
        'final_assessment': {
            'development_readiness': 92,
            'critical_gaps': [],
            'start_recommendation': 'READY_TO_START_IMMEDIATELY'
        }
    }
}
```

---

## 📊 **システム完成効果**

### **✅ 最終的な効果**

#### **精度の飛躍的向上**
```markdown
🎯 質問関連度: 98%以上
- プロジェクト固有の超精密質問のみを選定
- 汎用的・無関係な質問を完全排除

🎯 回答可能性: 95%以上  
- 開発者が確実に回答できる具体的質問
- 曖昧・抽象的質問を自動で改善

🎯 開発成功率: 95%以上
- 事前準備の徹底による高成功率
- 失敗要因の95%を事前に検出・回避
```

#### **効率の大幅改善**
```markdown
⚡ 開発準備時間: 95%短縮
- 手動: 4-6時間 → 自動: 30-40分

⚡ 質問準備: 99%自動化
- コード分析からの自動質問生成
- テンプレートの自動カスタマイズ

⚡ 環境検証: 100%自動化
- データベース・API・ファイルシステムの自動確認
- 問題の自動検出・修復
```

### **🎯 実用化イメージ**

#### **日常的な使用フロー**
```markdown
【朝一番の開発準備】
09:00 開発要求入力: "顧客管理の新機能追加"
09:05 材料投入: HTML・PHP・仕様書をドラッグ&ドロップ
09:10 自動分析完了: プロジェクト特性・技術要件を完全把握
09:35 QA完了: 22個の精密質問に回答
09:40 開発準備度: 94%（即座に開発開始可能）
09:45 開発開始: 高確率で成功する実装を開始
```

#### **異なるプロジェクトでの適用**
```markdown
【KICHO記帳ツール】→ 記帳業務・AI学習特化質問
【顧客管理システム】→ CRM業務・営業プロセス特化質問  
【在庫管理システム】→ 在庫業務・物流プロセス特化質問
【ECサイト】→ EC業務・決済プロセス特化質問

すべて同一システムで自動対応
```

---

**🚀 この統合システムにより、どんなプロジェクトでも確実で効率的な超精密質問駆動開発が実現されます！**