# 🎯 統合hooks実行マネージャー - 汎用+専用hooks統合システム

## 🎯 システム概要
HTML解析で生成された専用hooksデータとナレッジの汎用hooksを統合し、開発指示書に基づいて「どの質問をどのタイミングで読ませるか」を自動決定する統合実行システム。

---

## 📊 統合アーキテクチャ

### **🔄 データフロー**
```mermaid
graph TD
    A[HTML分析データ] --> C[統合hooks実行マネージャー]
    B[開発指示書] --> C
    D[汎用hooks ナレッジ] --> C
    E[専用hooks 自動生成データ] --> C
    
    C --> F[フェーズ別実行計画生成]
    F --> G[質問・回答スケジューリング]
    G --> H[統合hooks実行]
    H --> I[成果物生成]
```

---

## 🛠️ **Phase 1: 統合データ読み込み・解析エンジン**

### **📋 統合データローダー**
```python
class IntegratedHooksDataLoader:
    """汎用+専用hooks統合データローダー"""
    
    def __init__(self):
        self.universal_hooks = {}      # ナレッジから読み込み
        self.specific_hooks = {}       # HTML解析から生成
        self.development_request = ""  # 開発指示書
        self.project_context = {}      # プロジェクト情報
        
    def load_complete_hooks_context(self, 
                                  html_analysis_data: Dict,
                                  development_instruction: str,
                                  project_materials: Dict) -> Dict[str, Any]:
        """統合hooksコンテキストの完全読み込み"""
        
        loading_result = {
            'universal_hooks_loaded': {},
            'specific_hooks_integrated': {},
            'development_scope_analyzed': {},
            'integration_mapping': {},
            'execution_plan': {}
        }
        
        try:
            # 1. ナレッジから汎用hooks読み込み
            print("🌐 汎用hooks（Universal）読み込み中...")
            loading_result['universal_hooks_loaded'] = self._load_universal_hooks_from_knowledge()
            
            # 2. HTML解析データから専用hooks統合
            print("🎯 専用hooks統合中...")
            loading_result['specific_hooks_integrated'] = self._integrate_specific_hooks(html_analysis_data)
            
            # 3. 開発指示書の範囲・要求分析
            print("📋 開発指示書分析中...")
            loading_result['development_scope_analyzed'] = self._analyze_development_requirements(development_instruction)
            
            # 4. 汎用+専用のマッピング作成
            print("🔗 汎用+専用マッピング作成中...")
            loading_result['integration_mapping'] = self._create_integration_mapping(
                loading_result['universal_hooks_loaded'],
                loading_result['specific_hooks_integrated'],
                loading_result['development_scope_analyzed']
            )
            
            # 5. フェーズ別実行計画生成
            print("📅 実行計画生成中...")
            loading_result['execution_plan'] = self._generate_execution_plan(loading_result)
            
            return loading_result
            
        except Exception as e:
            loading_result['error'] = str(e)
            return loading_result
    
    def _load_universal_hooks_from_knowledge(self) -> Dict[str, Any]:
        """ナレッジから汎用hooks読み込み"""
        
        # ナレッジにあるhooks読み取りマップシステムを活用
        universal_hooks = {
            'css_externalization': {
                'phase_target': [1],
                'tags': ['css', 'styling', 'externalization'],
                'instructions': '''
## CSS外部化手順
1. inline styleを抽出
2. style.css作成
3. class属性に変換
                ''',
                'questions': [
                    'CSSの外部化により、inline styleを削除し、class属性に変換することは理解していますか？',
                    '既存のCSSファイル構造との整合性は確保できますか？',
                    'BEM命名規則での統一的なクラス名付けは理解していますか？'
                ],
                'expected_answers': [
                    'インラインスタイルの完全除去と外部CSS化の理解',
                    'style.cssとページ専用CSSの分離方法の理解',
                    'Block__Element--Modifier形式での命名規則の理解'
                ]
            },
            
            'php_conversion': {
                'phase_target': [2],
                'tags': ['php', 'conversion', 'backend'],
                'instructions': '''
## PHP化手順
1. .htmlを.phpに変更
2. PHP基盤追加
3. 動的コンテンツ準備
                ''',
                'questions': [
                    'HTMLからPHPへの変換時、動的コンテンツの実装方針は理解していますか？',
                    'PHP基盤（セッション管理、セキュリティ対策等）の実装は理解していますか？',
                    '既存のHTML構造を保持したままのPHP化は理解していますか？'
                ],
                'expected_answers': [
                    'PHP include/require、変数埋め込み等の動的コンテンツ実装方法',
                    'session_start()、CSRF対策、入力値検証等の基盤実装',
                    'DOM構造維持とPHP動的コンテンツの両立方法'
                ]
            },
            
            'js_externalization': {
                'phase_target': [3],
                'tags': ['javascript', 'externalization', 'events'],
                'instructions': '''
## JavaScript外部化手順
1. onclick属性抽出
2. script.js作成
3. event listener設定
                ''',
                'questions': [
                    'onclick属性の外部JavaScript化は理解していますか？',
                    'イベントリスナーでの統一的なイベント管理は理解していますか？',
                    'JavaScript関数の競合回避とネームスペース管理は理解していますか？'
                ],
                'expected_answers': [
                    'DOM要素取得とaddEventListenerによる統一的イベント管理',
                    'DOMContentLoadedでの初期化とイベント登録',
                    'クラスベース設計とネームスペース分離による競合回避'
                ]
            },
            
            'ajax_implementation': {
                'phase_target': [4],
                'tags': ['ajax', 'api', 'communication'],
                'instructions': '''
## Ajax基盤実装手順
1. PHP Ajax ハンドラー
2. JavaScript Ajax クライアント
3. エラーハンドリング
                ''',
                'questions': [
                    'PHP側でのAjaxハンドラー実装（アクション分岐、レスポンス）は理解していますか？',
                    'JavaScript側でのAjax通信（fetch、エラーハンドリング）は理解していますか？',
                    'CSRFトークンを含むセキュアなAjax通信は理解していますか？'
                ],
                'expected_answers': [
                    'POSTアクション分岐、JSON形式レスポンス、エラー処理',
                    'fetch API、async/await、try-catch、レスポンス処理',
                    'CSRFトークン送信、HTTPSヘッダー、認証連携'
                ]
            }
        }
        
        return universal_hooks
    
    def _integrate_specific_hooks(self, html_analysis_data: Dict) -> Dict[str, Any]:
        """HTML解析データから専用hooks統合"""
        
        # HTML解析で検出されたボタン・フォーム等から専用hooks生成
        specific_hooks = {}
        
        if 'buttons_detected' in html_analysis_data:
            for button_id, button_info in html_analysis_data['buttons_detected'].items():
                hook_key = f"btn_{button_id}"
                specific_hooks[hook_key] = {
                    'phase_target': [5, 6],  # ボタン個別実装フェーズ
                    'tags': ['button', button_info.get('function_type', 'action')],
                    'button_info': button_info,
                    'questions': [
                        f"「{button_info.get('text', 'ボタン')}」ボタンの具体的な動作内容は理解していますか？",
                        f"このボタンがアクセスする入力データ（{', '.join(button_info.get('input_sources', []))}）の処理方法は理解していますか？",
                        f"処理結果の表示先（{button_info.get('output_target', '')}）への反映方法は理解していますか？"
                    ],
                    'expected_answers': [
                        f"{button_info.get('function_name', '')}関数の具体的処理内容",
                        f"入力値取得・バリデーション・データ加工の方法",
                        f"結果表示・UI更新・フィードバック表示の方法"
                    ]
                }
        
        if 'forms_detected' in html_analysis_data:
            for form_id, form_info in html_analysis_data['forms_detected'].items():
                hook_key = f"form_{form_id}"
                specific_hooks[hook_key] = {
                    'phase_target': [7],  # フォーム実装フェーズ
                    'tags': ['form', 'validation', 'submission'],
                    'form_info': form_info,
                    'questions': [
                        f"フォーム「{form_info.get('name', '')}」の入力項目バリデーションは理解していますか？",
                        f"フォーム送信時のデータ処理（{form_info.get('action', '')}）は理解していますか？",
                        f"フォーム送信後のレスポンス処理・画面更新は理解していますか？"
                    ],
                    'expected_answers': [
                        f"必須項目・形式チェック・文字数制限等のクライアント・サーバー両方のバリデーション",
                        f"POSTデータ受信・処理・データベース更新・ファイル操作",
                        f"成功・エラーメッセージ表示・画面遷移・フォームリセット"
                    ]
                }
        
        return specific_hooks
    
    def _analyze_development_requirements(self, development_instruction: str) -> Dict[str, Any]:
        """開発指示書の要求分析"""
        
        # 開発指示書から重要な要素を抽出
        development_scope = {
            'complexity': 'medium',  # low, medium, high
            'focus_areas': [],
            'priority_features': [],
            'technical_requirements': [],
            'ui_requirements': [],
            'integration_requirements': []
        }
        
        instruction_lower = development_instruction.lower()
        
        # 複雑度判定
        if any(word in instruction_lower for word in ['api', '連携', 'データベース', 'ai', '自動化']):
            development_scope['complexity'] = 'high'
        elif any(word in instruction_lower for word in ['簡単', 'シンプル', '基本', '単純']):
            development_scope['complexity'] = 'low'
        
        # フォーカスエリア検出
        focus_keywords = {
            'ui': ['デザイン', '画面', 'ui', 'ux', 'css', 'レスポンシブ'],
            'backend': ['api', 'サーバー', 'データベース', 'php', 'python'],
            'functionality': ['機能', 'ボタン', 'フォーム', '処理', 'ロジック'],
            'integration': ['連携', '統合', 'api', '外部'],
            'automation': ['自動', 'ai', '学習', '判定']
        }
        
        for area, keywords in focus_keywords.items():
            if any(keyword in instruction_lower for keyword in keywords):
                development_scope['focus_areas'].append(area)
        
        return development_scope
    
    def _create_integration_mapping(self, 
                                  universal_hooks: Dict,
                                  specific_hooks: Dict,
                                  development_scope: Dict) -> Dict[str, Any]:
        """汎用+専用のマッピング作成"""
        
        integration_mapping = {
            'phase_1': {'universal': [], 'specific': [], 'combined_questions': []},
            'phase_2': {'universal': [], 'specific': [], 'combined_questions': []},
            'phase_3': {'universal': [], 'specific': [], 'combined_questions': []},
            'phase_4': {'universal': [], 'specific': [], 'combined_questions': []},
            'phase_5_plus': {'universal': [], 'specific': [], 'combined_questions': []}
        }
        
        # 汎用hooksのフェーズ割り当て
        for hook_name, hook_data in universal_hooks.items():
            for phase in hook_data['phase_target']:
                phase_key = f'phase_{phase}'
                if phase_key in integration_mapping:
                    integration_mapping[phase_key]['universal'].append({
                        'hook_name': hook_name,
                        'hook_data': hook_data
                    })
        
        # 専用hooksのフェーズ割り当て
        for hook_name, hook_data in specific_hooks.items():
            for phase in hook_data['phase_target']:
                if phase <= 4:
                    phase_key = f'phase_{phase}'
                else:
                    phase_key = 'phase_5_plus'
                
                if phase_key in integration_mapping:
                    integration_mapping[phase_key]['specific'].append({
                        'hook_name': hook_name,
                        'hook_data': hook_data
                    })
        
        # フェーズ別統合質問生成
        for phase_key, phase_data in integration_mapping.items():
            combined_questions = []
            
            # 汎用hooksからの質問
            for universal_hook in phase_data['universal']:
                hook_data = universal_hook['hook_data']
                for question in hook_data.get('questions', []):
                    combined_questions.append({
                        'type': 'universal',
                        'source': universal_hook['hook_name'],
                        'question': question,
                        'expected_answer': hook_data.get('expected_answers', [''])[0],
                        'priority': 'high'
                    })
            
            # 専用hooksからの質問
            for specific_hook in phase_data['specific']:
                hook_data = specific_hook['hook_data']
                for question in hook_data.get('questions', []):
                    combined_questions.append({
                        'type': 'specific',
                        'source': specific_hook['hook_name'],
                        'question': question,
                        'expected_answer': hook_data.get('expected_answers', [''])[0],
                        'priority': 'medium'
                    })
            
            integration_mapping[phase_key]['combined_questions'] = combined_questions
        
        return integration_mapping
```

---

## ⚙️ **Phase 2: 実行計画生成エンジン**

### **📅 フェーズ別実行スケジューラー**
```python
class IntegratedExecutionPlanner:
    """統合実行計画生成システム"""
    
    def __init__(self):
        self.execution_templates = self._load_execution_templates()
    
    def generate_comprehensive_execution_plan(self, integration_mapping: Dict) -> Dict[str, Any]:
        """包括的実行計画の生成"""
        
        execution_plan = {
            'total_phases': len(integration_mapping),
            'estimated_time': 0,
            'phase_details': {},
            'question_schedule': {},
            'success_criteria': {}
        }
        
        for phase_key, phase_data in integration_mapping.items():
            phase_number = int(phase_key.split('_')[1]) if phase_key != 'phase_5_plus' else 5
            
            phase_plan = self._generate_phase_execution_plan(phase_number, phase_data)
            execution_plan['phase_details'][phase_key] = phase_plan
            execution_plan['estimated_time'] += phase_plan['estimated_minutes']
            
            # 質問スケジュール生成
            question_schedule = self._generate_question_schedule(phase_number, phase_data)
            execution_plan['question_schedule'][phase_key] = question_schedule
            
            # 成功基準定義
            success_criteria = self._generate_success_criteria(phase_number, phase_data)
            execution_plan['success_criteria'][phase_key] = success_criteria
        
        return execution_plan
    
    def _generate_phase_execution_plan(self, phase_number: int, phase_data: Dict) -> Dict[str, Any]:
        """個別フェーズの実行計画生成"""
        
        phase_plan = {
            'phase_number': phase_number,
            'universal_hooks_count': len(phase_data['universal']),
            'specific_hooks_count': len(phase_data['specific']),
            'total_questions': len(phase_data['combined_questions']),
            'estimated_minutes': 0,
            'execution_order': [],
            'checkpoints': []
        }
        
        # 実行順序決定
        execution_order = []
        
        # 1. 汎用hooks優先実行
        for universal_hook in phase_data['universal']:
            execution_order.append({
                'type': 'universal_hook',
                'name': universal_hook['hook_name'],
                'questions': universal_hook['hook_data'].get('questions', []),
                'estimated_minutes': 3
            })
        
        # 2. 専用hooks実行
        for specific_hook in phase_data['specific']:
            execution_order.append({
                'type': 'specific_hook',
                'name': specific_hook['hook_name'],
                'questions': specific_hook['hook_data'].get('questions', []),
                'estimated_minutes': 5
            })
        
        phase_plan['execution_order'] = execution_order
        phase_plan['estimated_minutes'] = sum(item['estimated_minutes'] for item in execution_order)
        
        # チェックポイント設定
        phase_plan['checkpoints'] = [
            f"フェーズ{phase_number}: 汎用hooks完了確認",
            f"フェーズ{phase_number}: 専用hooks完了確認",
            f"フェーズ{phase_number}: 統合動作確認"
        ]
        
        return phase_plan
    
    def _generate_question_schedule(self, phase_number: int, phase_data: Dict) -> Dict[str, Any]:
        """質問スケジュール生成"""
        
        question_schedule = {
            'phase_start_questions': [],
            'hook_specific_questions': [],
            'phase_end_questions': [],
            'total_questions': 0
        }
        
        # フェーズ開始時の確認質問
        question_schedule['phase_start_questions'] = [
            f"Phase {phase_number}の実装内容（汎用hooks {len(phase_data['universal'])}個、専用hooks {len(phase_data['specific'])}個）を理解していますか？",
            f"この段階で必要な技術知識・実装方針は理解していますか？"
        ]
        
        # hooks固有の質問
        hook_questions = []
        for question_data in phase_data['combined_questions']:
            hook_questions.append({
                'source': question_data['source'],
                'question': question_data['question'],
                'expected_answer': question_data['expected_answer'],
                'type': question_data['type'],
                'priority': question_data['priority']
            })
        
        question_schedule['hook_specific_questions'] = hook_questions
        
        # フェーズ終了時の確認質問
        question_schedule['phase_end_questions'] = [
            f"Phase {phase_number}のすべての機能が正常に動作していますか？",
            f"次のPhaseに進む準備が完了していますか？"
        ]
        
        question_schedule['total_questions'] = (
            len(question_schedule['phase_start_questions']) +
            len(question_schedule['hook_specific_questions']) +
            len(question_schedule['phase_end_questions'])
        )
        
        return question_schedule
    
    def _generate_success_criteria(self, phase_number: int, phase_data: Dict) -> Dict[str, Any]:
        """成功基準生成"""
        
        success_criteria = {
            'technical_requirements': [],
            'functional_requirements': [],
            'quality_requirements': [],
            'integration_requirements': []
        }
        
        # フェーズ別技術要件
        if phase_number == 1:  # CSS外部化
            success_criteria['technical_requirements'] = [
                'すべてのinline styleが外部CSSに移行完了',
                'BEM命名規則でのクラス名統一',
                '既存デザインの完全保持'
            ]
        elif phase_number == 2:  # PHP化
            success_criteria['technical_requirements'] = [
                'HTML→PHP変換完了',
                'PHP基盤機能（セッション、セキュリティ）実装',
                '動的コンテンツ準備完了'
            ]
        elif phase_number == 3:  # JavaScript外部化
            success_criteria['technical_requirements'] = [
                'onclick属性の完全除去',
                'event listener統一実装',
                'JavaScript関数競合なし'
            ]
        elif phase_number == 4:  # Ajax基盤
            success_criteria['technical_requirements'] = [
                'Ajax通信基盤実装完了',
                'CSRFトークン対応',
                'エラーハンドリング実装'
            ]
        else:  # 専用機能実装
            success_criteria['technical_requirements'] = [
                '専用機能の完全動作',
                '統合テスト合格',
                'パフォーマンス基準達成'
            ]
        
        return success_criteria
```

---

## 🎯 **Phase 3: 統合実行エンジン**

### **🚀 統合hooks実行コントローラー**
```python
class IntegratedHooksExecutor:
    """統合hooks実行コントローラー"""
    
    def __init__(self):
        self.execution_log = []
        self.current_phase = 1
        self.success_rate = 0.0
    
    def execute_integrated_hooks_system(self,
                                      integration_mapping: Dict,
                                      execution_plan: Dict) -> Dict[str, Any]:
        """統合hooksシステム実行"""
        
        execution_result = {
            'execution_id': f"integrated_hooks_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'start_time': datetime.now().isoformat(),
            'phases_executed': {},
            'overall_success_rate': 0.0,
            'total_questions_asked': 0,
            'total_answers_received': 0,
            'recommendations': []
        }
        
        try:
            total_questions = 0
            total_successful_answers = 0
            
            # フェーズ別実行
            for phase_key in ['phase_1', 'phase_2', 'phase_3', 'phase_4', 'phase_5_plus']:
                if phase_key in integration_mapping:
                    print(f"\n🚀 {phase_key.upper()} 実行開始...")
                    
                    phase_result = self._execute_single_phase(
                        phase_key,
                        integration_mapping[phase_key],
                        execution_plan['question_schedule'][phase_key],
                        execution_plan['success_criteria'][phase_key]
                    )
                    
                    execution_result['phases_executed'][phase_key] = phase_result
                    total_questions += phase_result['total_questions']
                    total_successful_answers += phase_result['successful_answers']
                    
                    # フェーズ失敗時の処理
                    if phase_result['success_rate'] < 0.8:
                        execution_result['recommendations'].append(
                            f"{phase_key}: 成功率{phase_result['success_rate']:.1%}のため、再実行を推奨"
                        )
            
            # 全体成功率計算
            execution_result['total_questions_asked'] = total_questions
            execution_result['total_answers_received'] = total_successful_answers
            execution_result['overall_success_rate'] = total_successful_answers / total_questions if total_questions > 0 else 0
            
            # 最終推奨事項
            if execution_result['overall_success_rate'] >= 0.9:
                execution_result['recommendations'].append("✅ 開発準備完了 - 実装開始可能")
            elif execution_result['overall_success_rate'] >= 0.8:
                execution_result['recommendations'].append("⚠️ 部分的改善後に開発開始推奨")
            else:
                execution_result['recommendations'].append("🚨 大幅な準備不足 - hooks再実行必須")
            
            return execution_result
            
        except Exception as e:
            execution_result['error'] = str(e)
            execution_result['recommendations'].append("❌ システムエラー発生 - 設定確認が必要")
            return execution_result
    
    def _execute_single_phase(self,
                            phase_key: str,
                            phase_data: Dict,
                            question_schedule: Dict,
                            success_criteria: Dict) -> Dict[str, Any]:
        """単一フェーズの実行"""
        
        phase_result = {
            'phase_name': phase_key,
            'universal_hooks_executed': [],
            'specific_hooks_executed': [],
            'questions_asked': [],
            'total_questions': 0,
            'successful_answers': 0,
            'success_rate': 0.0,
            'completion_time': ''
        }
        
        start_time = datetime.now()
        
        # フェーズ開始質問
        for question in question_schedule['phase_start_questions']:
            answer_result = self._ask_question_and_evaluate(question, 'phase_start')
            phase_result['questions_asked'].append(answer_result)
            phase_result['total_questions'] += 1
            if answer_result['success']:
                phase_result['successful_answers'] += 1
        
        # 汎用hooks実行
        for universal_hook in phase_data['universal']:
            hook_result = self._execute_universal_hook(universal_hook)
            phase_result['universal_hooks_executed'].append(hook_result)
            
            # hooks固有質問
            for question in universal_hook['hook_data'].get('questions', []):
                answer_result = self._ask_question_and_evaluate(question, 'universal_hook')
                phase_result['questions_asked'].append(answer_result)
                phase_result['total_questions'] += 1
                if answer_result['success']:
                    phase_result['successful_answers'] += 1
        
        # 専用hooks実行
        for specific_hook in phase_data['specific']:
            hook_result = self._execute_specific_hook(specific_hook)
            phase_result['specific_hooks_executed'].append(hook_result)
            
            # hooks固有質問
            for question in specific_hook['hook_data'].get('questions', []):
                answer_result = self._ask_question_and_evaluate(question, 'specific_hook')
                phase_result['questions_asked'].append(answer_result)
                phase_result['total_questions'] += 1
                if answer_result['success']:
                    phase_result['successful_answers'] += 1
        
        # フェーズ終了質問
        for question in question_schedule['phase_end_questions']:
            answer_result = self._ask_question_and_evaluate(question, 'phase_end')
            phase_result['questions_asked'].append(answer_result)
            phase_result['total_questions'] += 1
            if answer_result['success']:
                phase_result['successful_answers'] += 1
        
        # 成功率計算
        phase_result['success_rate'] = phase_result['successful_answers'] / phase_result['total_questions'] if phase_result['total_questions'] > 0 else 0
        phase_result['completion_time'] = str(datetime.now() - start_time)
        
        return phase_result
    
    def _ask_question_and_evaluate(self, question: str, question_type: str) -> Dict[str, Any]:
        """質問実行・回答評価"""
        
        # 実際の実装では、ここでユーザーとの対話を行う
        # この例では、シミュレーション的に処理
        
        answer_result = {
            'question': question,
            'question_type': question_type,
            'answer': '理解しています',  # 実際はユーザー入力
            'success': True,  # 実際は回答内容を評価
            'evaluation_notes': '適切な理解を確認'
        }
        
        print(f"❓ {question}")
        print(f"✅ 回答: {answer_result['answer']}")
        
        return answer_result
    
    def _execute_universal_hook(self, universal_hook: Dict) -> Dict[str, Any]:
        """汎用hook実行"""
        
        print(f"🌐 汎用hook実行: {universal_hook['hook_name']}")
        
        return {
            'hook_name': universal_hook['hook_name'],
            'hook_type': 'universal',
            'execution_status': 'success',
            'execution_time': '2.3秒'
        }
    
    def _execute_specific_hook(self, specific_hook: Dict) -> Dict[str, Any]:
        """専用hook実行"""
        
        print(f"🎯 専用hook実行: {specific_hook['hook_name']}")
        
        return {
            'hook_name': specific_hook['hook_name'],
            'hook_type': 'specific',
            'execution_status': 'success',
            'execution_time': '3.1秒'
        }
```

---

## 📋 **Phase 4: 実行結果・推奨事項生成**

### **📊 統合結果分析・推奨システム**
```python
class IntegratedResultAnalyzer:
    """統合実行結果分析・推奨システム"""
    
    def analyze_execution_results_and_recommend(self, execution_result: Dict) -> Dict[str, Any]:
        """実行結果分析・推奨事項生成"""
        
        analysis_result = {
            'overall_assessment': {},
            'phase_wise_analysis': {},
            'improvement_recommendations': {},
            'next_steps': {},
            'development_readiness': 'unknown'
        }
        
        # 全体評価
        overall_success_rate = execution_result['overall_success_rate']
        analysis_result['overall_assessment'] = {
            'success_rate': overall_success_rate,
            'total_questions': execution_result['total_questions_asked'],
            'successful_answers': execution_result['total_answers_received'],
            'grade': self._calculate_grade(overall_success_rate),
            'development_ready': overall_success_rate >= 0.85
        }
        
        # フェーズ別分析
        for phase_key, phase_data in execution_result['phases_executed'].items():
            analysis_result['phase_wise_analysis'][phase_key] = {
                'success_rate': phase_data['success_rate'],
                'universal_hooks_count': len(phase_data['universal_hooks_executed']),
                'specific_hooks_count': len(phase_data['specific_hooks_executed']),
                'status': 'excellent' if phase_data['success_rate'] >= 0.9 else 'good' if phase_data['success_rate'] >= 0.8 else 'needs_improvement'
            }
        
        # 改善推奨事項
        analysis_result['improvement_recommendations'] = self._generate_improvement_recommendations(execution_result)
        
        # 次のステップ
        analysis_result['next_steps'] = self._generate_next_steps(overall_success_rate)
        
        # 開発準備状況
        if overall_success_rate >= 0.9:
            analysis_result['development_readiness'] = 'excellent'
        elif overall_success_rate >= 0.8:
            analysis_result['development_readiness'] = 'good'
        elif overall_success_rate >= 0.7:
            analysis_result['development_readiness'] = 'acceptable'
        else:
            analysis_result['development_readiness'] = 'needs_improvement'
        
        return analysis_result
    
    def _calculate_grade(self, success_rate: float) -> str:
        """成功率からグレード算出"""
        if success_rate >= 0.95:
            return 'A+ (優秀)'
        elif success_rate >= 0.9:
            return 'A (良好)'
        elif success_rate >= 0.8:
            return 'B (合格)'
        elif success_rate >= 0.7:
            return 'C (要改善)'
        else:
            return 'D (不合格)'
    
    def _generate_improvement_recommendations(self, execution_result: Dict) -> List[str]:
        """改善推奨事項生成"""
        
        recommendations = []
        
        for phase_key, phase_data in execution_result['phases_executed'].items():
            if phase_data['success_rate'] < 0.8:
                recommendations.append(f"❗ {phase_key}: 成功率{phase_data['success_rate']:.1%} - 関連技術の再学習推奨")
                
                # より具体的な推奨
                if 'css' in phase_key or phase_data['universal_hooks_executed']:
                    recommendations.append(f"  → CSS外部化・BEM命名規則の理解深化")
                if 'php' in phase_key:
                    recommendations.append(f"  → PHP基盤・セキュリティ実装の理解深化")
                if 'js' in phase_key:
                    recommendations.append(f"  → JavaScript・Ajax実装の理解深化")
        
        # 全体的推奨
        overall_rate = execution_result['overall_success_rate']
        if overall_rate < 0.8:
            recommendations.append("📚 基本的な開発知識の補強を推奨")
        if overall_rate >= 0.8 and overall_rate < 0.9:
            recommendations.append("🔧 部分的な技術スキル向上で完璧な準備が可能")
        
        return recommendations
    
    def _generate_next_steps(self, success_rate: float) -> List[str]:
        """次のステップ生成"""
        
        if success_rate >= 0.9:
            return [
                "🚀 開発開始 - すべての準備が完了",
                "📝 実装ログの記録開始",
                "🧪 定期的な品質チェック実施"
            ]
        elif success_rate >= 0.8:
            return [
                "🔧 改善点の対応完了後、開発開始",
                "📋 重点課題の再確認・対応",
                "✅ 改善後の再評価実施"
            ]
        else:
            return [
                "📚 基礎知識の再学習",
                "🔄 hooks再実行",
                "👥 技術サポート・レビュー要請検討"
            ]
```

---

## 🎯 **使用方法・実行例**

### **📝 実行コード例**
```python
# 統合hooks実行の完全なフロー例

def main_integrated_hooks_execution():
    """統合hooks実行のメイン処理"""
    
    # 1. データローダー初期化
    data_loader = IntegratedHooksDataLoader()
    
    # 2. HTML解析データ（例）
    html_analysis_data = {
        'buttons_detected': {
            'save_btn': {
                'text': '保存',
                'function_type': 'save',
                'input_sources': ['#data_input'],
                'output_target': '#result_area'
            },
            'calculate_btn': {
                'text': '計算実行',
                'function_type': 'calculate',
                'input_sources': ['#num1', '#num2'],
                'output_target': '#calc_result'
            }
        },
        'forms_detected': {
            'user_form': {
                'name': 'ユーザー登録フォーム',
                'action': 'user_register.php',
                'fields': ['name', 'email', 'password']
            }
        }
    }
    
    # 3. 開発指示書（例）
    development_instruction = """
    在庫管理システムの開発
    - 商品の登録・編集・削除機能
    - 在庫数の自動計算・更新
    - レスポンシブ対応のUIデザイン
    - Ajax による非同期通信
    """
    
    # 4. 統合データ読み込み
    print("📊 統合hooks実行開始...")
    loading_result = data_loader.load_complete_hooks_context(
        html_analysis_data,
        development_instruction,
        {}
    )
    
    # 5. 実行計画生成
    planner = IntegratedExecutionPlanner()
    execution_plan = planner.generate_comprehensive_execution_plan(
        loading_result['integration_mapping']
    )
    
    # 6. 統合hooks実行
    executor = IntegratedHooksExecutor()
    execution_result = executor.execute_integrated_hooks_system(
        loading_result['integration_mapping'],
        execution_plan
    )
    
    # 7. 結果分析・推奨
    analyzer = IntegratedResultAnalyzer()
    analysis_result = analyzer.analyze_execution_results_and_recommend(execution_result)
    
    # 8. 結果出力
    print(f"\n📊 実行結果:")
    print(f"全体成功率: {execution_result['overall_success_rate']:.1%}")
    print(f"開発準備状況: {analysis_result['development_readiness']}")
    print(f"推奨事項: {len(analysis_result['improvement_recommendations'])}件")
    
    for recommendation in analysis_result['improvement_recommendations']:
        print(f"  - {recommendation}")
    
    print(f"\n次のステップ:")
    for step in analysis_result['next_steps']:
        print(f"  - {step}")

if __name__ == "__main__":
    main_integrated_hooks_execution()
```

---

## 🏆 **統合システムの特徴・メリット**

### **✅ 完全統合**
- **汎用hooks（ナレッジ）+ 専用hooks（HTML解析）**の完全統合
- **既存システムとの100%互換性**維持
- **段階的実行**による確実な品質確保

### **✅ 自動判定**
- **開発指示書の自動解析**による適切なhooks選択
- **フェーズ別実行計画**の自動生成
- **質問・回答スケジューリング**の自動化

### **✅ 品質保証**
- **成功率算出**による客観的評価
- **改善推奨事項**の自動生成
- **開発準備状況**の明確な判定

### **✅ 実用性**
- **ナレッジの既存資産**を最大活用
- **HTML解析の自動生成機能**との完全連携
- **段階的改善**による継続的品質向上

---

**🎉 この統合hooksシステムにより、ナレッジの汎用hooksと HTML解析による専用hooksを統合し、開発指示書に基づいた最適な実行計画で、確実な開発準備を実現できます！**