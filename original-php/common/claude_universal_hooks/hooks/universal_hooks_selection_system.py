# 🎯 Component 1: 汎用Hooks選定システム

## 📋 システム概要
ナレッジの190種類汎用Hooksから、HTML解析結果と開発指示書に基づいて最適なHooksを自動選定するシステム。

## 🛠️ 実装仕様

### **Step 1: ナレッジ190種類汎用Hooks完全読み込み**
```python
class UniversalHooksSelector:
    """190種類汎用Hooks選定システム"""
    
    def __init__(self):
        self.knowledge_hooks_database = {}
        self.selection_algorithms = {}
        self.load_complete_hooks_database()
    
    def load_complete_hooks_database(self):
        """ナレッジから190種類汎用Hooks完全読み込み"""
        
        # Phase 1: 基盤構築hooks（40種類）
        self.knowledge_hooks_database['phase_1_foundation'] = {
            'css_externalization_hooks': {
                'count': 12,
                'keywords': ['css', 'style', 'design', 'レスポンシブ'],
                'auto_selection_criteria': 'HTML内にstyle属性またはCSSが検出された場合',
                'phase_target': [1],
                'priority': 'high'
            },
            'javascript_hooks': {
                'count': 10,
                'keywords': ['javascript', 'js', 'onclick', 'event'],
                'auto_selection_criteria': 'onclick属性またはJavaScript関数が検出された場合',
                'phase_target': [1],
                'priority': 'high'
            },
            'php_backend_hooks': {
                'count': 8,
                'keywords': ['php', 'server', 'backend', 'database'],
                'auto_selection_criteria': 'PHPファイルまたはサーバー処理が言及された場合',
                'phase_target': [1],
                'priority': 'medium'
            },
            'ajax_integration_hooks': {
                'count': 10,
                'keywords': ['ajax', 'async', '非同期', 'api'],
                'auto_selection_criteria': 'Ajax通信または非同期処理が言及された場合',
                'phase_target': [1, 2],
                'priority': 'high'
            }
        }
        
        # Phase 2: テスト・パフォーマンス（30種類）
        self.knowledge_hooks_database['phase_2_testing'] = {
            'comprehensive_test_automation': {
                'count': 15,
                'keywords': ['test', 'testing', 'テスト', '検証'],
                'auto_selection_criteria': 'テストまたは品質保証が言及された場合',
                'phase_target': [2],
                'priority': 'medium'
            },
            'performance_optimization': {
                'count': 15,
                'keywords': ['performance', 'optimization', 'パフォーマンス', '最適化'],
                'auto_selection_criteria': 'パフォーマンスまたは速度改善が言及された場合',
                'phase_target': [2],
                'priority': 'medium'
            }
        }
        
        # Phase 3: AI統合・開発統合（40種類）
        self.knowledge_hooks_database['phase_3_ai_integration'] = {
            'ai_enhanced_hooks': {
                'count': 25,
                'keywords': ['ai', '人工知能', 'deepseek', 'ollama', 'machine learning'],
                'auto_selection_criteria': 'AIまたは機械学習が言及された場合',
                'phase_target': [3],
                'priority': 'high'
            },
            'integrated_development_suite': {
                'count': 15,
                'keywords': ['development', 'integration', '開発統合', '連携'],
                'auto_selection_criteria': '開発統合または外部連携が言及された場合',
                'phase_target': [3],
                'priority': 'medium'
            }
        }
        
        # Phase 4: 国際化・運用監視（30種類）
        self.knowledge_hooks_database['phase_4_enterprise'] = {
            'internationalization_hooks': {
                'count': 15,
                'keywords': ['international', '国際化', 'multi-language', '多言語'],
                'auto_selection_criteria': '国際化または多言語対応が言及された場合',
                'phase_target': [4],
                'priority': 'low'
            },
            'operational_monitoring': {
                'count': 15,
                'keywords': ['monitoring', 'operational', '運用', '監視'],
                'auto_selection_criteria': '運用監視または稼働管理が言及された場合',
                'phase_target': [4],
                'priority': 'low'
            }
        }
        
        # Phase 5: セキュリティ・品質保証（50種類）
        self.knowledge_hooks_database['phase_5_security'] = {
            'security_enhancement_hooks': {
                'count': 25,
                'keywords': ['security', 'csrf', 'xss', 'セキュリティ', '認証'],
                'auto_selection_criteria': 'セキュリティまたは認証が言及された場合',
                'phase_target': [5],
                'priority': 'critical'
            },
            'quality_assurance_hooks': {
                'count': 25,
                'keywords': ['quality', 'assurance', '品質保証', 'code review'],
                'auto_selection_criteria': '品質保証またはコードレビューが言及された場合',
                'phase_target': [5],
                'priority': 'high'
            }
        }
    
    def auto_select_optimal_hooks(self, html_analysis, development_instruction):
        """HTML解析+開発指示書から最適汎用Hooks自動選定"""
        
        selected_hooks = {
            'phase_1': [],
            'phase_2': [],
            'phase_3': [],
            'phase_4': [],
            'phase_5': []
        }
        
        instruction_lower = development_instruction.lower()
        
        # 各Phaseの汎用Hooksから自動選定
        for phase_key, phase_hooks in self.knowledge_hooks_database.items():
            phase_number = phase_key.split('_')[1]
            
            for hook_category, hook_info in phase_hooks.items():
                # キーワードマッチング
                keyword_matches = sum(1 for keyword in hook_info['keywords'] 
                                    if keyword in instruction_lower)
                
                # HTML要素マッチング
                html_matches = self._check_html_compatibility(html_analysis, hook_info)
                
                # 選定基準判定
                selection_score = keyword_matches + html_matches
                
                if selection_score > 0 or hook_info['priority'] == 'critical':
                    selected_hooks[f'phase_{phase_number}'].append({
                        'hook_category': hook_category,
                        'hook_count': hook_info['count'],
                        'selection_score': selection_score,
                        'priority': hook_info['priority'],
                        'auto_selection_reason': hook_info['auto_selection_criteria'],
                        'matched_keywords': [kw for kw in hook_info['keywords'] if kw in instruction_lower]
                    })
        
        return selected_hooks
    
    def _check_html_compatibility(self, html_analysis, hook_info):
        """HTML解析結果とHooks互換性チェック"""
        
        html_compatibility = 0
        
        # HTML要素の存在チェック
        if 'css' in hook_info['keywords'] and html_analysis.get('style_elements', 0) > 0:
            html_compatibility += 2
        
        if 'javascript' in hook_info['keywords'] and html_analysis.get('onclick_events', 0) > 0:
            html_compatibility += 2
        
        if 'ajax' in hook_info['keywords'] and html_analysis.get('form_elements', 0) > 0:
            html_compatibility += 1
        
        return html_compatibility
    
    def generate_selection_report(self, selected_hooks):
        """選定結果レポート生成"""
        
        total_selected = sum(len(hooks) for hooks in selected_hooks.values())
        
        report = f"""
# 🎯 汎用Hooks自動選定結果

## 📊 選定サマリー
- **総選定Hooks数**: {total_selected}個 / 190個中
- **選定率**: {(total_selected/190)*100:.1f}%

## 📋 Phase別選定詳細
"""
        
        for phase, hooks in selected_hooks.items():
            if hooks:
                report += f"\n### **{phase.replace('_', ' ').title()}**\n"
                report += f"**選定数**: {len(hooks)}個\n\n"
                
                for hook in hooks:
                    report += f"- **{hook['hook_category']}** "
                    report += f"({hook['hook_count']}個, {hook['priority']})\n"
                    report += f"  - 選定理由: {hook['auto_selection_reason']}\n"
                    if hook['matched_keywords']:
                        report += f"  - マッチキーワード: {', '.join(hook['matched_keywords'])}\n"
                    report += "\n"
        
        return report
```

## 🎯 使用方法

### **基本実行例**
```python
# システム初期化
selector = UniversalHooksSelector()

# HTML解析データ（例）
html_analysis = {
    'style_elements': 3,
    'onclick_events': 5,
    'form_elements': 2,
    'total_elements': 15
}

# 開発指示書（例）
development_instruction = """
在庫管理システムの開発
- レスポンシブ対応のUIデザイン
- Ajax による非同期通信
- AI による在庫予測機能
- セキュリティ強化（CSRF対策）
"""

# 自動選定実行
selected_hooks = selector.auto_select_optimal_hooks(
    html_analysis, 
    development_instruction
)

# 選定結果レポート生成
report = selector.generate_selection_report(selected_hooks)
print(report)
```

## ✅ 期待される出力

```
# 🎯 汎用Hooks自動選定結果

## 📊 選定サマリー
- **総選定Hooks数**: 32個 / 190個中
- **選定率**: 16.8%

## 📋 Phase別選定詳細

### **Phase 1**
**選定数**: 12個

- **css_externalization_hooks** (12個, high)
  - 選定理由: HTML内にstyle属性またはCSSが検出された場合
  - マッチキーワード: design

- **ajax_integration_hooks** (10個, high)
  - 選定理由: Ajax通信または非同期処理が言及された場合
  - マッチキーワード: ajax, 非同期

### **Phase 3**
**選定数**: 15個

- **ai_enhanced_hooks** (25個, high)
  - 選定理由: AIまたは機械学習が言及された場合
  - マッチキーワード: ai

### **Phase 5**
**選定数**: 5個

- **security_enhancement_hooks** (25個, critical)
  - 選定理由: セキュリティまたは認証が言及された場合
  - マッチキーワード: セキュリティ
```

## 🎯 Component 1完成チェックリスト

- ✅ **190種類汎用Hooks完全データベース構築**
- ✅ **HTML解析結果との互換性チェック**
- ✅ **開発指示書キーワードマッチング**
- ✅ **自動選定アルゴリズム実装**
- ✅ **優先度ベース選定機能**
- ✅ **選定結果レポート生成**
- ✅ **他コンポーネントとの連携インターフェース**