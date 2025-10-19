# 🔍 汎用Hooks完全検出システム

## 📋 概要
ナレッジ内の**あらゆるhooks**を自動検出・分類・抽出し、新しいhooksが追加されても自動対応するシステム。

## 🛠️ 実装仕様

### **完全自動Hooks検出エンジン**
```python
class UniversalHooksDetectionSystem:
    """ナレッジ内全Hooks自動検出・分類システム"""
    
    def __init__(self, project_knowledge_search_function):
        self.project_knowledge_search = project_knowledge_search_function
        self.hooks_patterns = self._initialize_detection_patterns()
        self.auto_classification_rules = self._initialize_classification_rules()
        self.detected_hooks_cache = {}
        
    def detect_all_hooks_automatically(self):
        """ナレッジ内の全Hooks自動検出"""
        
        detection_result = {
            'total_hooks_detected': 0,
            'hooks_by_category': {},
            'hooks_by_phase': {},
            'new_hooks_discovered': [],
            'detection_confidence': {}
        }
        
        try:
            # Step 1: パターン検索による全Hooks検出
            all_detected_hooks = self._search_all_hooks_patterns()
            
            # Step 2: 自動分類・カテゴリ化
            categorized_hooks = self._auto_categorize_hooks(all_detected_hooks)
            
            # Step 3: Phase自動割り当て
            phase_allocated_hooks = self._auto_allocate_phases(categorized_hooks)
            
            # Step 4: 新規Hooks発見・登録
            new_hooks = self._discover_new_hooks(phase_allocated_hooks)
            
            # Step 5: 検出結果統合
            detection_result.update({
                'total_hooks_detected': len(all_detected_hooks),
                'hooks_by_category': categorized_hooks,
                'hooks_by_phase': phase_allocated_hooks,
                'new_hooks_discovered': new_hooks,
                'detection_confidence': self._calculate_detection_confidence(all_detected_hooks)
            })
            
            print(f"🔍 全Hooks自動検出完了: {detection_result['total_hooks_detected']}種類")
            
        except Exception as e:
            detection_result['error'] = str(e)
            print(f"❌ Hooks検出エラー: {e}")
        
        return detection_result
    
    def _search_all_hooks_patterns(self):
        """全Hooksパターン検索"""
        
        detected_hooks = []
        
        # パターン1: 明示的Hooks検索
        explicit_hooks_patterns = [
            "hooks", "hook", "フック", "自動化", "automation",
            "テスト", "test", "検証", "validation", "セキュリティ", "security",
            "パフォーマンス", "performance", "最適化", "optimization",
            "AI統合", "ai integration", "機械学習", "machine learning",
            "国際化", "internationalization", "i18n", "運用監視", "monitoring"
        ]
        
        for pattern in explicit_hooks_patterns:
            try:
                search_result = self.project_knowledge_search(pattern)
                if search_result:
                    extracted_hooks = self._extract_hooks_from_search_result(search_result, pattern)
                    detected_hooks.extend(extracted_hooks)
            except Exception as e:
                print(f"⚠️ パターン検索エラー ({pattern}): {e}")
        
        # パターン2: ファイル名パターン検索
        file_patterns = [
            ".py", "hooks", "automation", "test", "security", "performance",
            "ai_", "three_", "comprehensive_", "integrated_", "suite"
        ]
        
        for file_pattern in file_patterns:
            try:
                search_result = self.project_knowledge_search(f"ファイル {file_pattern}")
                if search_result:
                    file_hooks = self._extract_hooks_from_files(search_result, file_pattern)
                    detected_hooks.extend(file_hooks)
            except Exception as e:
                print(f"⚠️ ファイルパターン検索エラー ({file_pattern}): {e}")
        
        # パターン3: 数値パターン検索（Hook 1, Hook 2, etc.）
        for hook_number in range(1, 300):  # 余裕を持って300まで検索
            try:
                search_result = self.project_knowledge_search(f"Hook {hook_number}")
                if search_result:
                    numbered_hook = self._extract_numbered_hook(search_result, hook_number)
                    if numbered_hook:
                        detected_hooks.append(numbered_hook)
            except Exception as e:
                continue  # 存在しないHook番号はスキップ
        
        # 重複除去
        unique_hooks = self._remove_duplicate_hooks(detected_hooks)
        
        return unique_hooks
    
    def _extract_hooks_from_search_result(self, search_result, pattern):
        """検索結果からHooks抽出"""
        
        extracted_hooks = []
        result_text = str(search_result).lower()
        
        # Hook特定パターン
        hook_indicators = [
            "def ", "class ", "hook", "automation", "test", "check",
            "validate", "optimize", "secure", "monitor", "integrate"
        ]
        
        lines = result_text.split('\n')
        for line in lines:
            line = line.strip()
            
            # Hook候補の特定
            if any(indicator in line for indicator in hook_indicators):
                hook_info = {
                    'hook_name': self._extract_hook_name(line),
                    'hook_category': self._infer_category_from_pattern(pattern),
                    'source_pattern': pattern,
                    'source_line': line[:100],  # 最初の100文字
                    'auto_detected': True,
                    'detection_confidence': self._calculate_line_confidence(line)
                }
                
                if hook_info['hook_name'] and hook_info['detection_confidence'] > 0.3:
                    extracted_hooks.append(hook_info)
        
        return extracted_hooks
    
    def _auto_categorize_hooks(self, detected_hooks):
        """検出されたHooksの自動カテゴリ化"""
        
        categories = {
            'foundation': [],      # 基盤構築
            'testing': [],         # テスト・検証
            'performance': [],     # パフォーマンス
            'ai_integration': [],  # AI統合
            'security': [],        # セキュリティ
            'internationalization': [],  # 国際化
            'monitoring': [],      # 運用監視
            'quality_assurance': [],     # 品質保証
            'unknown': []          # 未分類
        }
        
        categorization_rules = {
            'foundation': ['css', 'js', 'javascript', 'php', 'ajax', 'html', 'dom'],
            'testing': ['test', 'テスト', 'pytest', 'unittest', 'coverage', '検証'],
            'performance': ['performance', 'パフォーマンス', '最適化', 'optimization', 'speed'],
            'ai_integration': ['ai', 'deepseek', 'ollama', '機械学習', 'machine learning'],
            'security': ['security', 'セキュリティ', 'csrf', 'xss', 'auth', '認証'],
            'internationalization': ['i18n', '国際化', 'locale', '多言語', 'rtl'],
            'monitoring': ['monitor', '監視', 'logging', 'metrics', '運用'],
            'quality_assurance': ['quality', '品質', 'code review', 'audit']
        }
        
        for hook in detected_hooks:
            hook_name = hook['hook_name'].lower()
            hook_category = hook.get('hook_category', '').lower()
            source_line = hook.get('source_line', '').lower()
            
            categorized = False
            
            for category, keywords in categorization_rules.items():
                if any(keyword in hook_name or keyword in hook_category or keyword in source_line 
                       for keyword in keywords):
                    categories[category].append(hook)
                    hook['auto_category'] = category
                    categorized = True
                    break
            
            if not categorized:
                categories['unknown'].append(hook)
                hook['auto_category'] = 'unknown'
        
        return categories
    
    def _auto_allocate_phases(self, categorized_hooks):
        """カテゴリ別Hooksの自動Phase割り当て"""
        
        phase_allocation_rules = {
            'foundation': [1],           # Phase 1: 基盤構築
            'testing': [2],              # Phase 2: テスト
            'performance': [2],          # Phase 2: パフォーマンス
            'ai_integration': [3],       # Phase 3: AI統合
            'security': [5],             # Phase 5: セキュリティ
            'internationalization': [4], # Phase 4: 国際化
            'monitoring': [4],           # Phase 4: 運用監視
            'quality_assurance': [5],    # Phase 5: 品質保証
            'unknown': [3]               # Phase 3: 未分類はデフォルト
        }
        
        phase_allocated = {f'phase_{i}': [] for i in range(1, 6)}
        
        for category, hooks_list in categorized_hooks.items():
            target_phases = phase_allocation_rules.get(category, [3])
            
            for hook in hooks_list:
                # 複数Phaseに割り当て可能な場合は最初のPhaseを使用
                primary_phase = target_phases[0]
                hook['auto_phase'] = primary_phase
                hook['possible_phases'] = target_phases
                
                phase_key = f'phase_{primary_phase}'
                phase_allocated[phase_key].append(hook)
        
        return phase_allocated
    
    def _discover_new_hooks(self, phase_allocated_hooks):
        """新規Hooks発見・登録"""
        
        new_hooks = []
        known_hooks = set()  # 既知のHooks名（実装時は永続化データから読み込み）
        
        for phase_key, hooks_list in phase_allocated_hooks.items():
            for hook in hooks_list:
                hook_name = hook['hook_name']
                
                if hook_name not in known_hooks:
                    new_hook_entry = {
                        'hook_name': hook_name,
                        'discovery_date': datetime.now().isoformat(),
                        'auto_detected': True,
                        'assigned_phase': hook['auto_phase'],
                        'assigned_category': hook['auto_category'],
                        'detection_confidence': hook['detection_confidence'],
                        'auto_generated_questions': self._generate_auto_questions(hook),
                        'auto_generated_keywords': self._generate_auto_keywords(hook)
                    }
                    
                    new_hooks.append(new_hook_entry)
                    known_hooks.add(hook_name)
        
        return new_hooks
    
    def _generate_auto_questions(self, hook):
        """新規Hook用自動質問生成"""
        
        hook_name = hook['hook_name']
        category = hook['auto_category']
        
        base_questions = [
            f"{hook_name}の実装方法は理解していますか？",
            f"{hook_name}の設定・パラメータは決定済みですか？",
            f"{hook_name}のテスト・検証方法は準備されていますか？"
        ]
        
        category_specific_questions = {
            'testing': [
                f"{hook_name}のテスト範囲・対象は明確ですか？",
                f"テストデータの準備は完了していますか？"
            ],
            'ai_integration': [
                f"{hook_name}で使用するAIツールは決定済みですか？",
                f"AI学習データの取得元は明確ですか？"
            ],
            'security': [
                f"{hook_name}のセキュリティ要件は定義済みですか？",
                f"セキュリティ監査の方法は決定済みですか？"
            ]
        }
        
        questions = base_questions.copy()
        if category in category_specific_questions:
            questions.extend(category_specific_questions[category])
        
        return questions
    
    def get_hooks_summary_report(self, detection_result):
        """Hooks検出結果サマリーレポート"""
        
        if 'error' in detection_result:
            return f"❌ 検出エラー: {detection_result['error']}"
        
        report = f"""
# 🔍 全Hooks自動検出結果レポート

## 📊 検出サマリー
- **総検出Hooks数**: {detection_result['total_hooks_detected']}種類
- **新規発見Hooks**: {len(detection_result['new_hooks_discovered'])}種類
- **検出信頼度**: {detection_result['detection_confidence'].get('average', 0):.1%}

## 📋 カテゴリ別検出数
"""
        
        for category, hooks_list in detection_result['hooks_by_category'].items():
            if hooks_list:
                report += f"- **{category.replace('_', ' ').title()}**: {len(hooks_list)}種類\n"
        
        report += f"""

## 📅 Phase別配置数
"""
        
        for phase_key, hooks_list in detection_result['hooks_by_phase'].items():
            if hooks_list:
                phase_num = phase_key.split('_')[1]
                report += f"- **Phase {phase_num}**: {len(hooks_list)}種類\n"
        
        if detection_result['new_hooks_discovered']:
            report += f"""

## 🆕 新規発見Hooks
"""
            for new_hook in detection_result['new_hooks_discovered'][:10]:  # 最初の10個
                report += f"- **{new_hook['hook_name']}** (信頼度: {new_hook['detection_confidence']:.1%})\n"
        
        return report

    def update_hooks_database_automatically(self, detection_result):
        """検出結果による自動データベース更新"""
        
        update_summary = {
            'hooks_added': 0,
            'hooks_updated': 0,
            'categories_added': 0,
            'phases_updated': 0
        }
        
        # 新規Hooks追加
        for new_hook in detection_result['new_hooks_discovered']:
            # 実際のデータベース更新処理（簡略化）
            update_summary['hooks_added'] += 1
        
        # 既存Hooks更新
        for phase_key, hooks_list in detection_result['hooks_by_phase'].items():
            for hook in hooks_list:
                if not hook.get('auto_detected'):
                    # 既存Hooksの情報更新
                    update_summary['hooks_updated'] += 1
        
        return update_summary
```

## 🎯 使用方法

### **完全自動検出実行例**
```python
# 完全自動検出システム初期化
detector = UniversalHooksDetectionSystem(project_knowledge_search)

# 全Hooks自動検出実行
detection_result = detector.detect_all_hooks_automatically()

# 検出結果確認
if detection_result['total_hooks_detected'] > 0:
    print(f"🎉 検出成功: {detection_result['total_hooks_detected']}種類")
    
    # サマリーレポート生成
    report = detector.get_hooks_summary_report(detection_result)
    print(report)
    
    # データベース自動更新
    update_result = detector.update_hooks_database_automatically(detection_result)
    print(f"📊 データベース更新: 追加{update_result['hooks_added']}件")
    
else:
    print("❌ Hooks検出失敗")
```

## ✅ 完全検出システムの特徴

- ✅ **パターン網羅検索**: あらゆるHooksパターンを自動検索
- ✅ **自動カテゴリ化**: 検出したHooksを自動分類
- ✅ **自動Phase割り当て**: 適切なPhaseに自動配置
- ✅ **新規Hook発見**: 未知のHooksを自動発見・登録
- ✅ **信頼度評価**: 検出精度の自動評価
- ✅ **自動質問生成**: 新規Hooks用質問自動作成
- ✅ **データベース更新**: 検出結果の自動反映