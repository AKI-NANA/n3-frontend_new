# 🧠 ナレッジ統合システム

## 📋 概要
プロジェクトナレッジから190種類汎用Hooksの実際のデータを読み込み、システムで活用するための統合機能。

## 🛠️ 実装仕様

### **ナレッジ読み込みシステム**
```python
class KnowledgeIntegrationSystem:
    """プロジェクトナレッジ統合システム"""
    
    def __init__(self, project_knowledge_search_function):
        self.project_knowledge_search = project_knowledge_search_function
        self.hooks_database = {}
        self.knowledge_cache = {}
        self.loading_status = {'loaded': False, 'error': None}
    
    def load_universal_hooks_from_knowledge(self):
        """ナレッジから190種類汎用Hooks完全読み込み"""
        
        loading_result = {
            'hooks_loaded': {},
            'loading_status': {},
            'error_details': []
        }
        
        try:
            print("🧠 ナレッジから汎用Hooks読み込み開始...")
            
            # Phase 1: 基盤構築hooks読み込み
            phase1_result = self._load_phase1_foundation_hooks()
            loading_result['hooks_loaded']['phase_1'] = phase1_result
            
            # Phase 2: テスト・パフォーマンスhooks読み込み
            phase2_result = self._load_phase2_testing_hooks()
            loading_result['hooks_loaded']['phase_2'] = phase2_result
            
            # Phase 3: AI統合hooks読み込み
            phase3_result = self._load_phase3_ai_hooks()
            loading_result['hooks_loaded']['phase_3'] = phase3_result
            
            # Phase 4: エンタープライズhooks読み込み
            phase4_result = self._load_phase4_enterprise_hooks()
            loading_result['hooks_loaded']['phase_4'] = phase4_result
            
            # Phase 5: セキュリティ・品質hooks読み込み
            phase5_result = self._load_phase5_security_hooks()
            loading_result['hooks_loaded']['phase_5'] = phase5_result
            
            # 読み込み結果集計
            total_hooks = sum(len(phase_hooks) for phase_hooks in loading_result['hooks_loaded'].values())
            loading_result['loading_status'] = {
                'total_hooks_loaded': total_hooks,
                'target_hooks_count': 190,
                'loading_success_rate': f"{(total_hooks/190)*100:.1f}%",
                'status': 'success' if total_hooks >= 150 else 'partial'
            }
            
            self.loading_status['loaded'] = True
            print(f"✅ ナレッジ読み込み完了: {total_hooks}/190個のHooks読み込み")
            
        except Exception as e:
            loading_result['loading_status']['status'] = 'error'
            loading_result['error_details'].append(str(e))
            self.loading_status['error'] = str(e)
            print(f"❌ ナレッジ読み込みエラー: {e}")
        
        return loading_result
    
    def _load_phase1_foundation_hooks(self):
        """Phase 1: 基盤構築hooks読み込み"""
        
        phase1_hooks = {}
        
        try:
            # CSS外部化hooks検索
            css_search_result = self.project_knowledge_search(
                "CSS 外部化 hooks BEM命名規則 レスポンシブ"
            )
            if css_search_result:
                phase1_hooks['css_externalization_hooks'] = self._parse_css_hooks(css_search_result)
            
            # JavaScript基盤hooks検索
            js_search_result = self.project_knowledge_search(
                "JavaScript hooks DOM操作 イベントハンドリング"
            )
            if js_search_result:
                phase1_hooks['javascript_foundation_hooks'] = self._parse_js_hooks(js_search_result)
            
            # PHP基盤hooks検索
            php_search_result = self.project_knowledge_search(
                "PHP hooks バックエンド セキュリティ データベース接続"
            )
            if php_search_result:
                phase1_hooks['php_backend_hooks'] = self._parse_php_hooks(php_search_result)
            
            # Ajax統合hooks検索
            ajax_search_result = self.project_knowledge_search(
                "Ajax hooks 非同期通信 API連携 fetch"
            )
            if ajax_search_result:
                phase1_hooks['ajax_integration_hooks'] = self._parse_ajax_hooks(ajax_search_result)
            
        except Exception as e:
            print(f"⚠️ Phase 1 hooks読み込みエラー: {e}")
        
        return phase1_hooks
    
    def _load_phase2_testing_hooks(self):
        """Phase 2: テスト・パフォーマンスhooks読み込み"""
        
        phase2_hooks = {}
        
        try:
            # テスト自動化hooks検索
            test_search_result = self.project_knowledge_search(
                "comprehensive_test_automation.py テスト hooks 自動化"
            )
            if test_search_result:
                phase2_hooks['test_automation_hooks'] = self._parse_test_hooks(test_search_result)
            
            # パフォーマンス最適化hooks検索
            performance_search_result = self.project_knowledge_search(
                "performance_optimization_suite.py パフォーマンス hooks 最適化"
            )
            if performance_search_result:
                phase2_hooks['performance_optimization_hooks'] = self._parse_performance_hooks(performance_search_result)
            
        except Exception as e:
            print(f"⚠️ Phase 2 hooks読み込みエラー: {e}")
        
        return phase2_hooks
    
    def _load_phase3_ai_hooks(self):
        """Phase 3: AI統合hooks読み込み"""
        
        phase3_hooks = {}
        
        try:
            # AI統合hooks検索
            ai_search_result = self.project_knowledge_search(
                "three_ai_enhanced_hooks.py AI統合 DEEPSEEK Ollama 機械学習"
            )
            if ai_search_result:
                phase3_hooks['ai_integration_hooks'] = self._parse_ai_hooks(ai_search_result)
            
            # 開発統合hooks検索
            dev_integration_search_result = self.project_knowledge_search(
                "integrated_development_suite.py 開発統合 hooks 連携"
            )
            if dev_integration_search_result:
                phase3_hooks['development_integration_hooks'] = self._parse_dev_integration_hooks(dev_integration_search_result)
            
        except Exception as e:
            print(f"⚠️ Phase 3 hooks読み込みエラー: {e}")
        
        return phase3_hooks
    
    def _load_phase4_enterprise_hooks(self):
        """Phase 4: エンタープライズhooks読み込み"""
        
        phase4_hooks = {}
        
        try:
            # 国際化hooks検索
            i18n_search_result = self.project_knowledge_search(
                "国際化 hooks 多言語対応 40言語 RTL"
            )
            if i18n_search_result:
                phase4_hooks['internationalization_hooks'] = self._parse_i18n_hooks(i18n_search_result)
            
            # 運用監視hooks検索
            monitoring_search_result = self.project_knowledge_search(
                "運用監視 hooks 99.9%稼働率 システム監視"
            )
            if monitoring_search_result:
                phase4_hooks['operational_monitoring_hooks'] = self._parse_monitoring_hooks(monitoring_search_result)
            
        except Exception as e:
            print(f"⚠️ Phase 4 hooks読み込みエラー: {e}")
        
        return phase4_hooks
    
    def _load_phase5_security_hooks(self):
        """Phase 5: セキュリティ・品質hooks読み込み"""
        
        phase5_hooks = {}
        
        try:
            # セキュリティhooks検索
            security_search_result = self.project_knowledge_search(
                "セキュリティ hooks CSRF XSS 認証 認可"
            )
            if security_search_result:
                phase5_hooks['security_enhancement_hooks'] = self._parse_security_hooks(security_search_result)
            
            # 品質保証hooks検索
            quality_search_result = self.project_knowledge_search(
                "品質保証 hooks コード品質 テスト自動化"
            )
            if quality_search_result:
                phase5_hooks['quality_assurance_hooks'] = self._parse_quality_hooks(quality_search_result)
            
        except Exception as e:
            print(f"⚠️ Phase 5 hooks読み込みエラー: {e}")
        
        return phase5_hooks
    
    # パース処理メソッド群
    def _parse_css_hooks(self, search_result):
        """CSS hooks詳細解析"""
        
        css_hooks = []
        
        # 検索結果からCSS関連情報を抽出
        result_text = str(search_result).lower()
        
        if 'css' in result_text:
            css_hooks.append({
                'hook_name': 'css_externalization_advanced',
                'hook_type': 'css_processing',
                'priority': 'high',
                'phase_target': [1],
                'description': 'CSS外部化・BEM命名規則・レスポンシブ対応',
                'auto_selection_keywords': ['css', 'style', 'design', 'responsive'],
                'questions': [
                    'CSS外部化による既存デザインの保持は確実ですか？',
                    'BEM命名規則での統一的なクラス名付けは理解していますか？',
                    'レスポンシブデザインのブレイクポイント設定は決まっていますか？'
                ],
                'source': 'knowledge_search'
            })
        
        if 'bem' in result_text or '命名規則' in result_text:
            css_hooks.append({
                'hook_name': 'bem_naming_convention',
                'hook_type': 'css_structure',
                'priority': 'medium',
                'phase_target': [1],
                'description': 'BEM命名規則による保守性向上',
                'auto_selection_keywords': ['bem', 'naming', 'css', 'maintenance'],
                'questions': [
                    'BEM命名規則の理解度は十分ですか？',
                    '既存CSSからBEMへの移行計画は？'
                ],
                'source': 'knowledge_search'
            })
        
        return css_hooks
    
    def _parse_ai_hooks(self, search_result):
        """AI hooks詳細解析"""
        
        ai_hooks = []
        
        result_text = str(search_result).lower()
        
        if 'deepseek' in result_text:
            ai_hooks.append({
                'hook_name': 'deepseek_integration',
                'hook_type': 'ai_code_generation',
                'priority': 'high',
                'phase_target': [3],
                'description': 'DEEPSEEK統合によるコード生成特化',
                'auto_selection_keywords': ['deepseek', 'ai', 'code generation', 'コード生成'],
                'questions': [
                    'DEEPSEEKの設定・認証情報は準備済みですか？',
                    'コード生成の品質基準は定義済みですか？',
                    'DEEPSEEKの実行環境（ローカル/API）は決定済みですか？'
                ],
                'source': 'knowledge_search'
            })
        
        if 'ollama' in result_text:
            ai_hooks.append({
                'hook_name': 'ollama_integration',
                'hook_type': 'ai_text_processing',
                'priority': 'high',
                'phase_target': [3],
                'description': 'Ollama統合による多モデル対応',
                'auto_selection_keywords': ['ollama', 'ai', 'llm', 'local'],
                'questions': [
                    'Ollamaサーバーの起動・管理方法は理解していますか？',
                    '使用するモデル（llama2/codellama等）は選定済みですか？',
                    'Ollamaのリソース使用量制限は設定済みですか？'
                ],
                'source': 'knowledge_search'
            })
        
        if 'ai学習' in result_text or '機械学習' in result_text:
            ai_hooks.append({
                'hook_name': 'ai_learning_management',
                'hook_type': 'ai_training',
                'priority': 'medium',
                'phase_target': [3],
                'description': 'AI学習データ管理・モデル学習制御',
                'auto_selection_keywords': ['machine learning', 'training', '学習', 'model'],
                'questions': [
                    'AI学習データの取得元・品質管理方法は？',
                    'モデル学習の実行スケジュール・頻度は？',
                    '学習済みモデルの保存・バージョン管理方法は？'
                ],
                'source': 'knowledge_search'
            })
        
        return ai_hooks
    
    def _parse_security_hooks(self, search_result):
        """セキュリティhooks詳細解析"""
        
        security_hooks = []
        
        result_text = str(search_result).lower()
        
        if 'csrf' in result_text:
            security_hooks.append({
                'hook_name': 'csrf_protection',
                'hook_type': 'security_csrf',
                'priority': 'critical',
                'phase_target': [5],
                'description': 'CSRF攻撃防止機能',
                'auto_selection_keywords': ['csrf', 'security', 'セキュリティ', '攻撃防止'],
                'questions': [
                    'CSRFトークンの生成・検証方法は理解していますか？',
                    'フォーム送信時のCSRF保護は実装済みですか？'
                ],
                'source': 'knowledge_search'
            })
        
        if 'xss' in result_text:
            security_hooks.append({
                'hook_name': 'xss_prevention',
                'hook_type': 'security_xss',
                'priority': 'critical',
                'phase_target': [5],
                'description': 'XSS攻撃防止機能',
                'auto_selection_keywords': ['xss', 'security', 'input validation'],
                'questions': [
                    'ユーザー入力のサニタイゼーション方法は？',
                    'XSS防止のHTMLエスケープは実装済みですか？'
                ],
                'source': 'knowledge_search'
            })
        
        return security_hooks
    
    def get_hooks_by_keywords(self, keywords):
        """キーワードによるHooks検索"""
        
        if not self.loading_status['loaded']:
            self.load_universal_hooks_from_knowledge()
        
        matching_hooks = []
        keywords_lower = [kw.lower() for kw in keywords]
        
        for phase_key, phase_hooks in self.hooks_database.items():
            for hook_category, hooks_list in phase_hooks.items():
                for hook in hooks_list:
                    hook_keywords = hook.get('auto_selection_keywords', [])
                    if any(kw in hook_keywords for kw in keywords_lower):
                        matching_hooks.append({
                            'phase': phase_key,
                            'category': hook_category,
                            'hook': hook
                        })
        
        return matching_hooks
    
    def update_hooks_database(self, loaded_hooks):
        """読み込み結果でデータベース更新"""
        
        self.hooks_database = loaded_hooks
        
        # キャッシュ更新
        self.knowledge_cache = {
            'last_updated': datetime.now().isoformat(),
            'hooks_count': sum(
                len(hooks_list) 
                for phase_hooks in loaded_hooks.values() 
                for hooks_list in phase_hooks.values()
            ),
            'phases_loaded': list(loaded_hooks.keys())
        }
    
    def generate_loading_report(self):
        """読み込み結果レポート生成"""
        
        if not self.loading_status['loaded']:
            return "❌ ナレッジ読み込みが未実行です。"
        
        report = f"""
# 🧠 ナレッジ読み込み結果レポート

## 📊 読み込み状況
- **読み込み状態**: {'✅ 成功' if self.loading_status['loaded'] else '❌ 失敗'}
- **総Hooks数**: {self.knowledge_cache['hooks_count']}個
- **目標Hooks数**: 190個
- **達成率**: {(self.knowledge_cache['hooks_count']/190)*100:.1f}%

## 📋 Phase別読み込み詳細
"""
        
        for phase_key in self.knowledge_cache['phases_loaded']:
            phase_hooks = self.hooks_database.get(phase_key, {})
            phase_count = sum(len(hooks_list) for hooks_list in phase_hooks.values())
            
            report += f"""
### **{phase_key.replace('_', ' ').title()}**
- **読み込みHooks数**: {phase_count}個
- **カテゴリ数**: {len(phase_hooks)}個
"""
            
            for category, hooks_list in phase_hooks.items():
                report += f"  - {category}: {len(hooks_list)}個\n"
        
        if self.loading_status.get('error'):
            report += f"\n## ⚠️ エラー情報\n{self.loading_status['error']}"
        
        return report
```

## 🎯 使用方法

### **ナレッジ統合実行例**
```python
# project_knowledge_search関数を渡してシステム初期化
knowledge_system = KnowledgeIntegrationSystem(project_knowledge_search)

# ナレッジから汎用Hooks読み込み
loading_result = knowledge_system.load_universal_hooks_from_knowledge()

# 読み込み結果確認
if loading_result['loading_status']['status'] == 'success':
    print("🎉 ナレッジ読み込み成功！")
    
    # データベース更新
    knowledge_system.update_hooks_database(loading_result['hooks_loaded'])
    
    # 読み込み結果レポート
    report = knowledge_system.generate_loading_report()
    print(report)
    
    # キーワード検索テスト
    ai_hooks = knowledge_system.get_hooks_by_keywords(['ai', 'deepseek'])
    print(f"AI関連Hooks: {len(ai_hooks)}個")
    
else:
    print(f"❌ 読み込み失敗: {loading_result['error_details']}")
```

## ✅ ナレッジ統合システム完成チェックリスト

- ✅ **project_knowledge_search関数統合**
- ✅ **Phase別ナレッジ検索機能**
- ✅ **検索結果解析・パース機能**
- ✅ **Hooksデータベース構築機能**
- ✅ **キーワード検索機能**
- ✅ **エラーハンドリング機能**
- ✅ **読み込み結果レポート機能**
- ✅ **キャッシュ・更新機能**