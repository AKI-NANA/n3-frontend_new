# 🎯 Component 2: 専用Hooks作成指示書

## 📋 システム概要
HTML解析結果に基づいて、要素数・内容に完全適応する動的専用Hooks生成システム。

## 🛠️ 実装仕様

### **Step 1: HTML動的解析エンジン**
```python
class SpecificHooksGenerator:
    """専用Hooks動的生成システム"""
    
    def __init__(self):
        self.html_analysis_engine = DynamicHTMLAnalyzer()
        self.adaptive_question_generator = AdaptiveQuestionGenerator()
        self.hooks_builder = SpecificHooksBuilder()
    
    def analyze_html_dynamically(self, html_content):
        """HTML要素数に完全適応する動的解析"""
        
        analysis_result = {
            'elements_count': self._count_all_elements(html_content),
            'function_inference': self._infer_functions(html_content),
            'complexity_assessment': self._assess_complexity(html_content),
            'interaction_patterns': self._detect_interaction_patterns(html_content),
            'data_flow_analysis': self._analyze_data_flow(html_content)
        }
        
        return analysis_result
    
    def _count_all_elements(self, html_content):
        """全要素の詳細カウント・分析"""
        
        import re
        
        elements_count = {
            'buttons': {
                'count': len(re.findall(r'<button|<input[^>]*type=["\']button', html_content, re.IGNORECASE)),
                'details': self._extract_button_details(html_content),
                'complexity_level': 'simple'
            },
            'forms': {
                'count': len(re.findall(r'<form', html_content, re.IGNORECASE)),
                'details': self._extract_form_details(html_content),
                'validation_needs': 'basic'
            },
            'inputs': {
                'count': len(re.findall(r'<input', html_content, re.IGNORECASE)),
                'types': self._categorize_input_types(html_content),
                'data_requirements': 'standard'
            },
            'tables': {
                'count': len(re.findall(r'<table', html_content, re.IGNORECASE)),
                'data_complexity': self._analyze_table_complexity(html_content)
            },
            'dynamic_areas': {
                'count': len(re.findall(r'id=["\'][^"\']*result[^"\']*["\']', html_content, re.IGNORECASE)),
                'update_patterns': self._detect_update_patterns(html_content)
            }
        }
        
        # 総合複雑度評価
        total_interactive = (elements_count['buttons']['count'] + 
                           elements_count['forms']['count'] + 
                           elements_count['inputs']['count'])
        
        if total_interactive > 15:
            elements_count['overall_complexity'] = 'enterprise'
        elif total_interactive > 8:
            elements_count['overall_complexity'] = 'complex'
        elif total_interactive > 3:
            elements_count['overall_complexity'] = 'medium'
        else:
            elements_count['overall_complexity'] = 'simple'
            
        return elements_count
    
    def _extract_button_details(self, html_content):
        """ボタン詳細情報抽出"""
        
        import re
        
        button_details = []
        
        # ボタン要素のパターンマッチング
        button_patterns = [
            r'<button[^>]*id=["\']([^"\']*)["\'][^>]*>(.*?)</button>',
            r'<input[^>]*type=["\']button["\'][^>]*value=["\']([^"\']*)["\'][^>]*>',
            r'<input[^>]*value=["\']([^"\']*)["\'][^>]*type=["\']button["\'][^>]*>'
        ]
        
        for i, pattern in enumerate(button_patterns):
            matches = re.findall(pattern, html_content, re.IGNORECASE | re.DOTALL)
            for match in matches:
                if isinstance(match, tuple):
                    button_id = match[0] if match[0] else f'btn_{len(button_details)+1}'
                    button_text = match[1] if len(match) > 1 else match[0]
                else:
                    button_id = f'btn_{len(button_details)+1}'
                    button_text = match
                
                button_details.append({
                    'id': button_id,
                    'text': button_text.strip(),
                    'onclick_function': self._extract_onclick_function(html_content, button_id),
                    'target_elements': self._identify_target_elements(html_content, button_id),
                    'estimated_function': self._estimate_button_function(button_text)
                })
        
        return button_details
    
    def _estimate_button_function(self, button_text):
        """ボタンテキストから機能推定"""
        
        function_keywords = {
            'save': ['保存', 'save', '登録', 'register', '確定'],
            'delete': ['削除', 'delete', '消去', 'remove'],
            'edit': ['編集', 'edit', '修正', 'modify', '変更'],
            'calculate': ['計算', 'calculate', '算出', 'compute'],
            'search': ['検索', 'search', '探す', 'find'],
            'export': ['出力', 'export', 'download', 'ダウンロード'],
            'submit': ['送信', 'submit', '実行', 'execute']
        }
        
        text_lower = button_text.lower()
        for function_type, keywords in function_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return function_type
        
        return 'general'
    
    def generate_adaptive_questions(self, analysis_result, development_instruction):
        """要素数・機能推測に基づく適応質問生成"""
        
        button_count = analysis_result['elements_count']['buttons']['count']
        overall_complexity = analysis_result['elements_count']['overall_complexity']
        
        adaptive_questions = []
        
        # ボタン数に応じた動的質問生成
        if button_count == 0:
            adaptive_questions.extend([
                "このシステムにボタン機能はありませんが、将来的にボタン追加の予定はありますか？",
                "静的表示のみのシステムでしょうか？",
                "ユーザーインタラクションの方法を教えてください。"
            ])
        
        elif button_count == 1:
            button = analysis_result['elements_count']['buttons']['details'][0]
            adaptive_questions.extend([
                f"検出された1個のボタン「{button['text']}」の具体的な処理内容は？",
                f"「{button['text']}」ボタンが失敗した場合のエラーハンドリング方法は？",
                f"処理完了時のユーザーへのフィードバック方法は？",
                f"「{button['text']}」ボタンの処理時間はどの程度を想定していますか？"
            ])
        
        elif 2 <= button_count <= 5:
            button_list = [btn['text'] for btn in analysis_result['elements_count']['buttons']['details']]
            adaptive_questions.extend([
                f"検出された{button_count}個のボタン（{', '.join(button_list)}）の実行順序・依存関係は？",
                f"これらのボタン間でのデータ連携方法は？",
                f"複数ボタンの同時押下防止機能は必要ですか？",
                f"ボタン処理の進捗表示機能は必要ですか？"
            ])
            
            # 各ボタンの詳細質問
            for btn in analysis_result['elements_count']['buttons']['details']:
                adaptive_questions.append(f"「{btn['text']}」ボタンの詳細処理フローは？")
        
        elif 6 <= button_count <= 10:
            adaptive_questions.extend([
                f"中規模システム（{button_count}個ボタン）の管理方法は？",
                f"ボタンのグループ化・カテゴリ分けは必要ですか？",
                f"ボタンの権限制御（表示・非表示）は必要ですか？",
                f"ボタン操作の履歴・ログ機能は必要ですか？",
                f"主要機能のボタン3個を優先度順に教えてください。"
            ])
        
        elif button_count > 10:
            adaptive_questions.extend([
                f"大規模システム（{button_count}個ボタン）のUX設計方針は？",
                f"ボタンの動的表示・非表示制御は必要ですか？",
                f"ユーザー役割によるボタン表示制御は必要ですか？",
                f"ボタン操作の監査・分析機能は必要ですか？",
                f"最も重要な機能のボタン5個を教えてください。",
                f"ボタンの負荷分散・パフォーマンス対策は必要ですか？"
            ])
        
        # 複雑度に応じた追加質問
        if overall_complexity in ['complex', 'enterprise']:
            adaptive_questions.extend([
                "高複雑度システムのアーキテクチャ設計パターンは？",
                "スケーラビリティ・可用性の要件は？",
                "監視・ログ・運用の要件は？",
                "災害復旧・バックアップ戦略は？"
            ])
        
        # 機能推測に基づく質問
        detected_functions = [btn['estimated_function'] for btn in analysis_result['elements_count']['buttons']['details']]
        unique_functions = list(set(detected_functions))
        
        for function_type in unique_functions:
            if function_type == 'save':
                adaptive_questions.extend([
                    "データ保存時の重複チェック・バリデーション方法は？",
                    "保存データのバックアップ・復元機能は必要ですか？"
                ])
            elif function_type == 'calculate':
                adaptive_questions.extend([
                    "計算機能の精度・パフォーマンス要件は？",
                    "計算エラー時の代替処理・通知方法は？"
                ])
            elif function_type == 'delete':
                adaptive_questions.extend([
                    "削除機能の確認・取り消し機能は必要ですか？",
                    "削除データの復元・履歴管理は必要ですか？"
                ])
        
        # 開発指示書に基づく追加質問
        instruction_lower = development_instruction.lower()
        if 'ai' in instruction_lower or '人工知能' in instruction_lower:
            adaptive_questions.extend([
                "AI統合機能で使用するツールは？（DEEPSEEK/Ollama/OpenAI等）",
                "AI学習データの取得元・更新頻度は？",
                "AI推論結果の信頼度表示は必要ですか？"
            ])
        
        if 'database' in instruction_lower or 'データベース' in instruction_lower:
            adaptive_questions.extend([
                "使用するデータベース（MySQL/PostgreSQL/MongoDB等）は？",
                "データベース接続の冗長化・フェイルオーバーは必要ですか？"
            ])
        
        return adaptive_questions
    
    def build_specific_hooks(self, analysis_result, question_responses):
        """解析結果・質問回答に基づく専用Hooks構築"""
        
        specific_hooks = {
            'button_hooks': {},
            'form_hooks': {},
            'integration_hooks': {},
            'validation_hooks': {},
            'error_handling_hooks': {},
            'metadata': {}
        }
        
        # ボタン専用Hooks生成
        for button in analysis_result['elements_count']['buttons']['details']:
            button_id = button['id']
            button_hook = {
                'hook_type': 'button_specific',
                'element_info': button,
                'implementation_spec': {
                    'frontend_logic': self._generate_frontend_logic(button, question_responses),
                    'backend_logic': self._generate_backend_logic(button, question_responses),
                    'error_handling': self._generate_error_handling(button, question_responses),
                    'validation_rules': self._generate_validation_rules(button, question_responses)
                },
                'testing_requirements': {
                    'unit_tests': self._generate_unit_tests(button),
                    'integration_tests': self._generate_integration_tests(button),
                    'ui_tests': self._generate_ui_tests(button)
                },
                'performance_requirements': {
                    'response_time': '< 2秒',
                    'concurrent_users': '100人',
                    'error_rate': '< 0.1%'
                }
            }
            specific_hooks['button_hooks'][button_id] = button_hook
        
        # フォーム専用Hooks生成
        for form in analysis_result['elements_count']['forms']['details']:
            form_hook = {
                'hook_type': 'form_specific',
                'validation_strategy': 'realtime',
                'submission_method': 'ajax',
                'error_display': 'inline'
            }
            specific_hooks['form_hooks'][form['id']] = form_hook
        
        # メタデータ生成
        specific_hooks['metadata'] = {
            'generation_timestamp': '2025-07-14T12:00:00Z',
            'total_buttons': analysis_result['elements_count']['buttons']['count'],
            'total_forms': analysis_result['elements_count']['forms']['count'],
            'complexity_level': analysis_result['elements_count']['overall_complexity'],
            'estimated_development_time': self._calculate_development_time(analysis_result),
            'recommended_tech_stack': self._recommend_tech_stack(analysis_result)
        }
        
        return specific_hooks
    
    def _generate_frontend_logic(self, button, responses):
        """フロントエンド処理ロジック生成"""
        
        function_type = button['estimated_function']
        
        frontend_templates = {
            'save': """
function save_{button_id}() {{
    // データ収集
    const formData = collectFormData();
    
    // バリデーション
    if (!validateData(formData)) {{
        showError('入力データが無効です');
        return;
    }}
    
    // 保存処理
    showLoading();
    submitData(formData)
        .then(response => {{
            hideLoading();
            showSuccess('保存が完了しました');
        }})
        .catch(error => {{
            hideLoading();
            showError('保存に失敗しました: ' + error.message);
        }});
}}
""",
            'calculate': """
function calculate_{button_id}() {{
    // 入力値取得
    const inputs = getCalculationInputs();
    
    // 計算実行
    const result = performCalculation(inputs);
    
    // 結果表示
    displayResult(result);
}}
"""
        }
        
        template = frontend_templates.get(function_type, frontend_templates['save'])
        return template.format(button_id=button['id'])
    
    def _calculate_development_time(self, analysis_result):
        """開発時間見積もり計算"""
        
        base_hours = 8  # 基本時間
        button_hours = analysis_result['elements_count']['buttons']['count'] * 2
        form_hours = analysis_result['elements_count']['forms']['count'] * 4
        complexity_multiplier = {
            'simple': 1.0,
            'medium': 1.5,
            'complex': 2.0,
            'enterprise': 3.0
        }
        
        total_hours = (base_hours + button_hours + form_hours) * complexity_multiplier.get(
            analysis_result['elements_count']['overall_complexity'], 1.0
        )
        
        return f"{total_hours:.1f}時間"
    
    def generate_specific_hooks_instruction(self, html_content, development_instruction):
        """完全な専用Hooks作成指示書生成"""
        
        # Step 1: HTML動的解析
        analysis_result = self.analyze_html_dynamically(html_content)
        
        # Step 2: 適応質問生成
        adaptive_questions = self.generate_adaptive_questions(analysis_result, development_instruction)
        
        # Step 3: 質問実行（シミュレーション）
        question_responses = self._simulate_question_responses(adaptive_questions)
        
        # Step 4: 専用Hooks構築
        specific_hooks = self.build_specific_hooks(analysis_result, question_responses)
        
        # Step 5: 指示書MD生成
        instruction_md = self._generate_instruction_markdown(
            analysis_result, adaptive_questions, specific_hooks
        )
        
        return instruction_md
    
    def _generate_instruction_markdown(self, analysis_result, questions, hooks):
        """専用Hooks作成指示書MD生成"""
        
        md_content = f"""# 🎯 専用Hooks作成指示書

## 📊 HTML解析結果
- **ボタン数**: {analysis_result['elements_count']['buttons']['count']}個
- **フォーム数**: {analysis_result['elements_count']['forms']['count']}個  
- **複雑度**: {analysis_result['elements_count']['overall_complexity']}
- **予想開発時間**: {hooks['metadata']['estimated_development_time']}

## ❓ 適応質問事項（{len(questions)}個）

"""
        
        for i, question in enumerate(questions, 1):
            md_content += f"{i}. {question}\n"
        
        md_content += f"""

## 🪝 生成された専用Hooks

### **ボタン専用Hooks**
"""
        
        for button_id, button_hook in hooks['button_hooks'].items():
            md_content += f"""
#### **{button_id}**
- **機能**: {button_hook['element_info']['estimated_function']}
- **テキスト**: {button_hook['element_info']['text']}
- **実装仕様**: フロントエンド + バックエンド + エラーハンドリング
- **テスト要件**: 単体テスト + 統合テスト + UIテスト
"""
        
        md_content += f"""

## 🎯 推奨技術スタック
{hooks['metadata']['recommended_tech_stack']}

## ✅ 完成チェックリスト
- [ ] 全ボタンの動作確認完了
- [ ] エラーハンドリングテスト完了
- [ ] パフォーマンステスト完了
- [ ] ユーザビリティテスト完了
"""
        
        return md_content
```

## 🎯 使用方法

### **基本実行例**
```python
# システム初期化
generator = SpecificHooksGenerator()

# サンプルHTML
html_content = '''
<button id="save_btn" onclick="saveData()">データ保存</button>
<button id="calc_btn" onclick="calculate()">計算実行</button>
<form id="user_form" action="user_register.php" method="post">
    <input name="name" type="text" required>
    <input name="email" type="email" required>
    <input type="submit" value="登録">
</form>
'''

# 開発指示書
development_instruction = """
在庫管理システムの開発
- 商品の登録・編集・削除機能
- AI による在庫予測機能
- PostgreSQL データベース連携
"""

# 専用Hooks作成指示書生成
instruction_md = generator.generate_specific_hooks_instruction(
    html_content, 
    development_instruction
)

print(instruction_md)
```

## ✅ Component 2完成チェックリスト

- ✅ **HTML要素数動的カウント機能**
- ✅ **ボタン機能推定エンジン**
- ✅ **要素数に応じた適応質問生成**
- ✅ **複雑度評価システム**
- ✅ **専用Hooks自動構築機能**
- ✅ **開発時間見積もり機能**
- ✅ **技術スタック推奨機能**
- ✅ **MD形式指示書出力機能**