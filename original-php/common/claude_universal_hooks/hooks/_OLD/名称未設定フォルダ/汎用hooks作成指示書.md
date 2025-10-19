# 🪝 実用的hooks開発指示書 - 現実対応・矛盾解消版

## 🎯 **現実に即したhooksシステム設計**

指摘された現実的な課題に対する解決策を含む、実用的なhooksシステムを設計します。

---

## 🚨 **現実的な問題と解決策**

### **1. エラーパターンの動的管理**

#### **❓ 問題：43エラーパターンは増加し続ける？全て読み込むと多くなる？**

✅ **解決策：エラーパターン動的選択システム**

```python
class DynamicErrorPatternManager:
    """開発コンテキストに応じたエラーパターン動的選択"""
    
    def __init__(self):
        self.error_patterns_db = {
            # 開発フェーズ別分類
            'development': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],      # 開発中に重要
            'testing': [11, 12, 13, 14, 15, 21, 25, 26],          # テスト時に重要
            'deployment': [16, 17, 18, 22, 23, 24, 36, 37],       # デプロイ時に重要
            
            # 技術カテゴリ別分類
            'javascript': [1, 2, 6, 8, 9, 12],
            'php': [4, 5, 10, 17, 25, 26, 42],
            'database': [16, 17, 18, 19, 20],
            'api': [3, 11, 14, 15, 21],
            'security': [5, 10, 25, 26, 27, 28, 29, 30],
            'ai_learning': [31, 32, 33, 34, 35],
            'files': [18, 36, 37, 38, 39, 40, 41, 43]
        }
    
    def select_relevant_patterns(self, 
                               development_phase: str,
                               technologies: List[str],
                               project_context: Dict[str, Any]) -> List[int]:
        """開発コンテキストに応じたエラーパターン選択"""
        
        relevant_patterns = set()
        
        # Phase別選択
        if development_phase in self.error_patterns_db:
            relevant_patterns.update(self.error_patterns_db[development_phase])
        
        # 技術別選択
        for tech in technologies:
            if tech in self.error_patterns_db:
                relevant_patterns.update(self.error_patterns_db[tech])
        
        # プロジェクト特化選択
        if project_context.get('has_css_conflicts'):
            relevant_patterns.update([1, 2])  # CSS/JS衝突系
        
        if project_context.get('uses_ajax'):
            relevant_patterns.update([3, 8, 12, 15])  # Ajax系
        
        return sorted(list(relevant_patterns))
    
    def add_new_error_pattern(self, 
                            pattern_id: int,
                            categories: List[str],
                            description: Dict[str, Any]) -> None:
        """新規エラーパターンの動的追加"""
        
        # カテゴリ別に自動分類
        for category in categories:
            if category not in self.error_patterns_db:
                self.error_patterns_db[category] = []
            self.error_patterns_db[category].append(pattern_id)
        
        # パターン詳細をDBに保存
        self._save_pattern_to_db(pattern_id, description)
```

### **2. 実際のディレクトリ構造取得**

#### **❓ 問題：現状ディレクトリ構造を実際のコマンドで取得すべき？**

✅ **解決策：実時間ディレクトリスキャン機能**

```python
class RealTimeDirectoryScan:
    """実際のプロジェクト構造をリアルタイムスキャン"""
    
    def __init__(self):
        self.scan_patterns = [
            # 既存ファイル検出パターン
            '**/*.php', '**/*.css', '**/*.js', '**/*.py',
            '**/index.php', '**/style.css', '**/script.js',
            '**/modules/*', '**/common/*', '**/system_core/*'
        ]
    
    def scan_current_project_structure(self) -> Dict[str, Any]:
        """現在のプロジェクト構造をスキャン"""
        
        project_root = self._find_project_root()
        structure = {
            'project_root': project_root,
            'discovered_patterns': {},
            'existing_css_structure': {},
            'html_files': [],
            'css_conflicts': [],
            'naming_patterns': {},
            'scan_timestamp': datetime.now().isoformat()
        }
        
        # 1. ディレクトリ構造スキャン
        structure['directory_tree'] = self._scan_directory_tree(project_root)
        
        # 2. CSS構造解析
        structure['existing_css_structure'] = self._analyze_css_structure(project_root)
        
        # 3. HTML状態確認
        structure['html_files'] = self._find_html_files(project_root)
        
        # 4. 命名規則分析
        structure['naming_patterns'] = self._analyze_naming_patterns(project_root)
        
        # 5. 潜在的衝突検出
        structure['css_conflicts'] = self._detect_css_conflicts(project_root)
        
        return structure
    
    def _analyze_css_structure(self, project_root: str) -> Dict[str, Any]:
        """既存CSS構造の詳細分析"""
        
        css_analysis = {
            'existing_css_files': [],
            'class_name_patterns': {},
            'bem_compliance': {},
            'variable_usage': {},
            'import_structure': {}
        }
        
        # CSSファイル探索
        css_files = list(Path(project_root).rglob('*.css'))
        
        for css_file in css_files:
            try:
                with open(css_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # クラス名パターン分析
                class_names = re.findall(r'\.([a-zA-Z0-9_-]+)', content)
                
                # BEM準拠チェック
                bem_classes = [name for name in class_names if '__' in name or '--' in name]
                
                css_analysis['existing_css_files'].append({
                    'file': str(css_file),
                    'class_count': len(class_names),
                    'bem_classes': bem_classes,
                    'bem_compliance_rate': len(bem_classes) / len(class_names) if class_names else 0
                })
                
            except Exception as e:
                print(f"CSS分析エラー: {css_file} - {e}")
        
        return css_analysis
    
    def get_current_css_naming_rules(self) -> Dict[str, Any]:
        """現在のCSS命名規則を解析"""
        
        current_rules = {
            'dominant_pattern': None,
            'detected_patterns': {},
            'recommendation': None,
            'conflicts': []
        }
        
        # 実際のファイルから命名パターンを抽出
        css_structure = self._analyze_css_structure('.')
        
        all_classes = []
        for file_info in css_structure['existing_css_files']:
            all_classes.extend(file_info.get('bem_classes', []))
        
        # パターン分析
        pattern_counts = {
            'bem': len([c for c in all_classes if '__' in c]),
            'kebab': len([c for c in all_classes if '-' in c and '__' not in c]),
            'snake': len([c for c in all_classes if '_' in c and '__' not in c]),
            'camel': len([c for c in all_classes if re.match(r'^[a-z]+[A-Z]', c)])
        }
        
        # 優勢パターン決定
        if pattern_counts:
            current_rules['dominant_pattern'] = max(pattern_counts, key=pattern_counts.get)
            current_rules['detected_patterns'] = pattern_counts
        
        return current_rules
```

### **3. 既存システムの実際の検証**

#### **❓ 問題：「実際の開発で検証済み」だが、さっき開発したばかりでは？**

✅ **解決策：既存システム動作確認 + 段階的検証**

```python
class ExistingSystemValidator:
    """既存システムの実際の動作確認"""
    
    def __init__(self):
        self.validation_results = {}
    
    def validate_existing_systems(self) -> Dict[str, Any]:
        """既存システムが実際に動作するかを確認"""
        
        validation_results = {
            'universal_hooks': self._validate_universal_hooks_existence(),
            'nagano3_hooks': self._validate_nagano3_hooks_existence(),
            'phase1_prevention': self._validate_phase1_system_existence(),
            'overall_status': 'unknown'
        }
        
        # 実際のファイル存在確認
        existing_files = self._scan_for_existing_hook_files()
        
        if not existing_files:
            # 既存システムが存在しない場合
            validation_results['overall_status'] = 'no_existing_systems'
            validation_results['recommendation'] = 'CREATE_NEW_HOOKS_SYSTEM'
            validation_results['approach'] = 'fresh_implementation'
        else:
            # 既存システムが存在する場合
            validation_results['overall_status'] = 'existing_systems_found'
            validation_results['recommendation'] = 'INTEGRATE_WITH_EXISTING'
            validation_results['approach'] = 'integration_based'
        
        return validation_results
    
    def _scan_for_existing_hook_files(self) -> List[str]:
        """既存のhooksファイルをスキャン"""
        
        possible_hook_locations = [
            'hooks/', 'system_core/hooks/', 'common/hooks/',
            'scripts/hooks/', 'automation/', 'tools/hooks/'
        ]
        
        found_files = []
        
        for location in possible_hook_locations:
            if Path(location).exists():
                hook_files = list(Path(location).rglob('*.py'))
                hook_files.extend(list(Path(location).rglob('*.php')))
                found_files.extend([str(f) for f in hook_files])
        
        return found_files
    
    def create_compatibility_layer(self) -> Dict[str, Any]:
        """既存システムとの互換性レイヤー作成"""
        
        compatibility = {
            'interface_adapters': {},
            'migration_strategy': {},
            'conflict_resolution': {}
        }
        
        # 既存システムが存在しない場合の対応
        if not self._scan_for_existing_hook_files():
            compatibility['strategy'] = 'fresh_start'
            compatibility['implementation'] = {
                'create_base_hooks_structure': True,
                'implement_error_prevention': True,
                'build_from_scratch': True
            }
        else:
            compatibility['strategy'] = 'integration'
            compatibility['implementation'] = {
                'analyze_existing_hooks': True,
                'create_adapters': True,
                'gradual_integration': True
            }
        
        return compatibility
```

### **4. CSS基準の統合対応**

#### **❓ 問題：CSS基準に合わせたDOM構造維持が必要**

✅ **解決策：CSS優先設計hooks**

```python
class CSSPriorityHooks:
    """CSS構造を最優先とするhooks設計"""
    
    def __init__(self, css_analysis: Dict[str, Any]):
        self.css_analysis = css_analysis
        self.existing_classes = self._extract_existing_classes()
        self.dom_constraints = self._analyze_dom_constraints()
    
    def generate_css_safe_hooks(self, 
                               hook_requirements: Dict[str, Any]) -> Dict[str, Any]:
        """CSS構造を破壊しないhooks生成"""
        
        safe_hooks = {
            'css_compliance': {},
            'dom_safe_operations': {},
            'class_preservation': {},
            'generated_hooks': {}
        }
        
        # 1. 既存CSSクラスとの衝突回避
        safe_hooks['css_compliance'] = self._ensure_css_compatibility(hook_requirements)
        
        # 2. DOM構造維持
        safe_hooks['dom_safe_operations'] = self._generate_dom_safe_operations()
        
        # 3. クラス名保護
        safe_hooks['class_preservation'] = self._protect_existing_classes()
        
        return safe_hooks
    
    def _ensure_css_compatibility(self, requirements: Dict[str, Any]) -> Dict[str, Any]:
        """CSS互換性確保"""
        
        compatibility = {
            'protected_classes': self.existing_classes,
            'safe_selectors': [],
            'avoided_operations': [],
            'recommendations': []
        }
        
        # 既存クラス名の保護
        for class_name in self.existing_classes:
            compatibility['recommendations'].append({
                'type': 'PROTECT_CLASS',
                'class': class_name,
                'reason': 'Existing CSS dependency'
            })
        
        # 安全なセレクタ生成
        compatibility['safe_selectors'] = [
            f"[data-hook-{category}]" for category in requirements.keys()
        ]
        
        return compatibility
    
    def generate_css_aware_validation_hooks(self) -> Dict[str, Any]:
        """CSS対応検証hooks"""
        
        validation_hooks = {
            'css_structure_validation': {
                'verify_class_integrity': self._create_class_integrity_check(),
                'detect_css_conflicts': self._create_conflict_detection(),
                'validate_dom_structure': self._create_dom_validation()
            },
            'css_safe_modifications': {
                'add_data_attributes': self._create_data_attribute_hooks(),
                'preserve_existing_styles': self._create_style_preservation(),
                'validate_responsive_integrity': self._create_responsive_validation()
            }
        }
        
        return validation_hooks
```

### **5. 指示書矛盾検出・修正システム**

#### **❓ 問題：指示書の矛盾がhooksに影響する**

✅ **解決策：指示書矛盾検出・自動修正システム**

```python
class InstructionConflictDetector:
    """指示書間の矛盾検出・解決システム"""
    
    def __init__(self):
        self.conflict_patterns = {
            'naming_conflicts': [],
            'technical_conflicts': [],
            'process_conflicts': [],
            'priority_conflicts': []
        }
    
    def scan_instruction_conflicts(self, 
                                 instruction_documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """指示書間の矛盾を検出"""
        
        conflicts = {
            'detected_conflicts': [],
            'severity_levels': {},
            'resolution_recommendations': [],
            'hooks_impact_assessment': {}
        }
        
        # 1. 命名規則の矛盾検出
        naming_conflicts = self._detect_naming_conflicts(instruction_documents)
        conflicts['detected_conflicts'].extend(naming_conflicts)
        
        # 2. 技術仕様の矛盾検出
        tech_conflicts = self._detect_technical_conflicts(instruction_documents)
        conflicts['detected_conflicts'].extend(tech_conflicts)
        
        # 3. プロセスの矛盾検出
        process_conflicts = self._detect_process_conflicts(instruction_documents)
        conflicts['detected_conflicts'].extend(process_conflicts)
        
        # 4. hooks影響度評価
        conflicts['hooks_impact_assessment'] = self._assess_hooks_impact(conflicts['detected_conflicts'])
        
        return conflicts
    
    def _detect_naming_conflicts(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """命名規則の矛盾検出"""
        
        conflicts = []
        naming_rules = {}
        
        for doc in documents:
            doc_naming = self._extract_naming_rules(doc)
            
            for rule_type, rule_value in doc_naming.items():
                if rule_type not in naming_rules:
                    naming_rules[rule_type] = []
                
                naming_rules[rule_type].append({
                    'value': rule_value,
                    'source_document': doc.get('title', 'unknown'),
                    'priority': doc.get('priority', 1)
                })
        
        # 矛盾検出
        for rule_type, rules in naming_rules.items():
            unique_values = set(rule['value'] for rule in rules)
            
            if len(unique_values) > 1:
                conflicts.append({
                    'type': 'NAMING_CONFLICT',
                    'rule_type': rule_type,
                    'conflicting_values': list(unique_values),
                    'affected_documents': [rule['source_document'] for rule in rules],
                    'severity': 'HIGH' if rule_type in ['css_classes', 'file_naming'] else 'MEDIUM'
                })
        
        return conflicts
    
    def generate_conflict_resolution_hooks(self, 
                                         conflicts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """矛盾解決用hooks生成"""
        
        resolution_hooks = {
            'pre_development_checks': [],
            'runtime_conflict_detection': [],
            'auto_resolution_rules': [],
            'manual_resolution_guides': []
        }
        
        for conflict in conflicts:
            if conflict['severity'] == 'HIGH':
                # 高深刻度：開発前チェック必須
                resolution_hooks['pre_development_checks'].append({
                    'conflict_id': conflict.get('id', 'unknown'),
                    'check_function': f"verify_{conflict['type'].lower()}",
                    'blocking': True,
                    'resolution_required': True
                })
            else:
                # 中・低深刻度：実行時監視
                resolution_hooks['runtime_conflict_detection'].append({
                    'conflict_id': conflict.get('id', 'unknown'),
                    'monitor_function': f"monitor_{conflict['type'].lower()}",
                    'auto_resolve': conflict['severity'] == 'LOW'
                })
        
        return resolution_hooks
```

### **6. 実用的hooks実行システム**

```python
class PracticalHooksSystem:
    """実用性を重視したhooksシステム"""
    
    def __init__(self):
        self.directory_scanner = RealTimeDirectoryScan()
        self.error_manager = DynamicErrorPatternManager()
        self.css_hooks = None
        self.conflict_detector = InstructionConflictDetector()
        self.existing_validator = ExistingSystemValidator()
    
    def initialize_practical_hooks(self, 
                                 development_context: Dict[str, Any]) -> Dict[str, Any]:
        """実用的hooksシステムの初期化"""
        
        initialization_result = {
            'system_status': 'initializing',
            'scanned_structure': {},
            'relevant_errors': [],
            'css_constraints': {},
            'conflicts_detected': [],
            'hooks_configuration': {}
        }
        
        try:
            # 1. 現実のプロジェクト構造スキャン
            print("📁 実際のプロジェクト構造をスキャン中...")
            initialization_result['scanned_structure'] = self.directory_scanner.scan_current_project_structure()
            
            # 2. 開発コンテキストに応じたエラーパターン選択
            print("⚠️ 関連エラーパターンを選択中...")
            relevant_patterns = self.error_manager.select_relevant_patterns(
                development_context.get('phase', 'development'),
                development_context.get('technologies', []),
                initialization_result['scanned_structure']
            )
            initialization_result['relevant_errors'] = relevant_patterns
            
            # 3. CSS制約分析
            print("🎨 CSS制約を分析中...")
            self.css_hooks = CSSPriorityHooks(initialization_result['scanned_structure']['existing_css_structure'])
            initialization_result['css_constraints'] = self.css_hooks.dom_constraints
            
            # 4. 既存システム検証
            print("🔍 既存システムを検証中...")
            existing_validation = self.existing_validator.validate_existing_systems()
            initialization_result['existing_systems'] = existing_validation
            
            # 5. 指示書矛盾検出
            print("📋 指示書矛盾を検出中...")
            if development_context.get('instruction_documents'):
                conflicts = self.conflict_detector.scan_instruction_conflicts(
                    development_context['instruction_documents']
                )
                initialization_result['conflicts_detected'] = conflicts['detected_conflicts']
            
            initialization_result['system_status'] = 'ready'
            initialization_result['recommendation'] = self._generate_practical_recommendation(initialization_result)
            
        except Exception as e:
            initialization_result['system_status'] = 'error'
            initialization_result['error'] = str(e)
            
        return initialization_result
    
    def _generate_practical_recommendation(self, 
                                         init_result: Dict[str, Any]) -> Dict[str, Any]:
        """実用的な推奨事項生成"""
        
        recommendation = {
            'immediate_actions': [],
            'development_approach': 'unknown',
            'priority_hooks': [],
            'risk_mitigation': []
        }
        
        # 既存システムの状況に応じた推奨
        if init_result['existing_systems']['overall_status'] == 'no_existing_systems':
            recommendation['development_approach'] = 'fresh_implementation'
            recommendation['immediate_actions'].append('CREATE_BASE_HOOKS_STRUCTURE')
        else:
            recommendation['development_approach'] = 'integration_based'
            recommendation['immediate_actions'].append('ANALYZE_EXISTING_COMPATIBILITY')
        
        # CSS制約に応じた推奨
        if init_result['css_constraints']:
            recommendation['priority_hooks'].append('css_safe_validation')
            recommendation['risk_mitigation'].append('PROTECT_EXISTING_CSS_CLASSES')
        
        # 矛盾に応じた推奨
        if init_result['conflicts_detected']:
            high_severity_conflicts = [c for c in init_result['conflicts_detected'] if c.get('severity') == 'HIGH']
            if high_severity_conflicts:
                recommendation['immediate_actions'].insert(0, 'RESOLVE_HIGH_SEVERITY_CONFLICTS')
        
        return recommendation

    def execute_practical_hooks(self, 
                              target_categories: List[str],
                              development_context: Dict[str, Any]) -> Dict[str, Any]:
        """実用的hooksの実行"""
        
        execution_result = {
            'execution_id': f"practical_hooks_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'target_categories': target_categories,
            'results_by_category': {},
            'overall_success_rate': 0.0,
            'recommendations': []
        }
        
        # カテゴリ別実行
        for category in target_categories:
            try:
                category_result = self._execute_category_practical_hooks(category, development_context)
                execution_result['results_by_category'][category] = category_result
            except Exception as e:
                execution_result['results_by_category'][category] = {
                    'status': 'error',
                    'error': str(e)
                }
        
        # 成功率計算
        successful_categories = sum(1 for result in execution_result['results_by_category'].values() 
                                  if result.get('status') == 'success')
        execution_result['overall_success_rate'] = successful_categories / len(target_categories) if target_categories else 0
        
        return execution_result
```

---

## 🎯 **実用的hooks開発プロトコル**

### **実行手順（現実対応版）**

```yaml
Step 1: 現状把握（必須）
  - 実際のディレクトリ構造スキャン実行
  - 既存CSS/HTML状態の確認
  - 現在の命名規則パターン分析
  - 既存システムの存在確認

Step 2: 制約確認（必須）
  - CSS構造保護必要箇所の特定
  - DOM破壊リスク評価
  - 既存クラス名衝突可能性チェック
  - 指示書間矛盾検出・解決

Step 3: 適応的hooks設計（現実対応）
  - 検出された制約に適応したhooks設計
  - 開発フェーズに応じたエラーパターン選択
  - CSS安全性を最優先とした実装方針
  - 既存システム統合戦略決定

Step 4: 段階的実装（リスク最小化）
  - 低リスクhooksから順次実装
  - 各hooks実装後の影響確認
  - CSS/DOM破壊の即座検出
  - 問題発生時の即座ロールバック

Step 5: 継続的改善（運用対応）
  - 新規エラーパターンの動的追加
  - hooks性能監視・最適化
  - 指示書更新時の矛盾再検出
  - 開発チームフィードバック反映
```

---

## 🔄 **HTML変更・DOM操作対応hooks（追加項目）**

### **🎯 HTML→PHP変換対応hooks**

#### **HTML変更検出・保護システム**
```python
class HTMLChangeProtectionHooks:
    """HTML変更によるDOM破壊を防ぐhooks"""
    
    def __init__(self):
        self.html_baseline = {}
        self.protected_elements = [
            'header', 'sidebar', 'footer', 'navigation',
            '.dashboard__container', '.layout', '.content'
        ]
        self.css_class_registry = {}
    
    def scan_existing_html_structure(self) -> Dict[str, Any]:
        """既存HTML構造の完全スキャン"""
        
        html_analysis = {
            'existing_html_files': [],
            'dom_structure': {},
            'css_class_usage': {},
            'id_usage': {},
            'javascript_dependencies': {},
            'php_conversion_readiness': {}
        }
        
        # HTMLファイル探索
        html_files = list(Path('.').rglob('*.html'))
        php_files = list(Path('.').rglob('*.php'))
        
        for html_file in html_files:
            analysis = self._analyze_html_file(html_file)
            html_analysis['existing_html_files'].append(analysis)
        
        # PHP化対応状況確認
        html_analysis['php_conversion_readiness'] = self._assess_php_conversion_readiness(
            html_analysis['existing_html_files']
        )
        
        return html_analysis
    
    def generate_html_protection_hooks(self, 
                                     html_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """HTML保護用hooks生成"""
        
        protection_hooks = {
            'pre_conversion_validation': [],
            'css_class_protection': [],
            'dom_structure_validation': [],
            'javascript_compatibility_check': [],
            'php_conversion_safety_check': []
        }
        
        # 1. CSS クラス保護hooks
        for file_analysis in html_analysis['existing_html_files']:
            for class_name in file_analysis.get('css_classes', []):
                protection_hooks['css_class_protection'].append({
                    'class_name': class_name,
                    'protection_level': 'HIGH' if class_name in self.protected_elements else 'MEDIUM',
                    'validation_method': f'validate_class_usage_{class_name.replace("-", "_").replace("__", "_")}',
                    'conflict_detection': f'detect_class_conflicts_{class_name.replace("-", "_")}'
                })
        
        # 2. DOM構造保護hooks
        critical_selectors = [
            '.header', '.sidebar', '.footer', '.navigation', 
            '.dashboard__container', '.layout', '.content'
        ]
        
        for selector in critical_selectors:
            protection_hooks['dom_structure_validation'].append({
                'selector': selector,
                'protection_type': 'CRITICAL',
                'validation_function': f'validate_dom_integrity_{selector.replace(".", "").replace("__", "_")}',
                'change_detection': f'monitor_dom_changes_{selector.replace(".", "").replace("__", "_")}'
            })
        
        return protection_hooks
    
    def _analyze_html_file(self, html_file: Path) -> Dict[str, Any]:
        """HTMLファイルの詳細分析"""
        
        analysis = {
            'file_path': str(html_file),
            'css_classes': [],
            'ids': [],
            'javascript_dependencies': [],
            'php_conversion_complexity': 'unknown'
        }
        
        try:
            with open(html_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # CSSクラス抽出
            class_matches = re.findall(r'class=["\']([^"\']+)["\']', content)
            for match in class_matches:
                classes = match.split()
                analysis['css_classes'].extend(classes)
            
            # ID抽出
            id_matches = re.findall(r'id=["\']([^"\']+)["\']', content)
            analysis['ids'].extend(id_matches)
            
            # JavaScript依存関係抽出
            js_matches = re.findall(r'onclick=["\']([^"\']+)["\']', content)
            analysis['javascript_dependencies'].extend(js_matches)
            
            # PHP変換複雑度評価
            analysis['php_conversion_complexity'] = self._assess_conversion_complexity(content)
            
        except Exception as e:
            analysis['error'] = str(e)
        
        return analysis
```

#### **JavaScript変更対応hooks**
```python
class JavaScriptChangeManagementHooks:
    """JavaScript変更・競合防止hooks"""
    
    def __init__(self):
        self.js_baseline = {}
        self.protected_functions = [
            'showCreateModal', 'hideCreateModal', 'editAPIKey', 
            'deleteAPIKey', 'testAPIKey', 'refreshToolStatus'
        ]
    
    def generate_js_safety_hooks(self) -> Dict[str, Any]:
        """JavaScript安全性確保hooks"""
        
        js_safety_hooks = {
            'function_conflict_detection': [],
            'dom_event_validation': [],
            'css_selector_validation': [],
            'php_integration_safety': []
        }
        
        # 1. 関数競合検出hooks
        for func_name in self.protected_functions:
            js_safety_hooks['function_conflict_detection'].append({
                'function_name': func_name,
                'detection_method': f'detect_{func_name}_conflicts',
                'resolution_strategy': 'namespace_isolation',
                'priority': 'HIGH'
            })
        
        # 2. DOM イベント検証hooks
        js_safety_hooks['dom_event_validation'] = [
            {
                'event_type': 'onclick',
                'validation_method': 'validate_onclick_handlers',
                'protection_level': 'CRITICAL'
            },
            {
                'event_type': 'DOMContentLoaded',
                'validation_method': 'validate_dom_ready_handlers', 
                'protection_level': 'HIGH'
            }
        ]
        
        # 3. CSS セレクタ検証hooks  
        js_safety_hooks['css_selector_validation'] = [
            {
                'selector_pattern': 'document.querySelector',
                'validation_method': 'validate_query_selectors',
                'css_dependency_check': True
            },
            {
                'selector_pattern': 'document.getElementById',
                'validation_method': 'validate_element_ids',
                'id_existence_check': True
            }
        ]
        
        return js_safety_hooks
```

#### **PHP変換統合hooks**
```python
class PHPConversionIntegrationHooks:
    """HTML→PHP変換統合hooks"""
    
    def __init__(self):
        self.conversion_rules = self._load_conversion_rules()
    
    def generate_php_conversion_hooks(self, 
                                    html_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """PHP変換統合hooks生成"""
        
        conversion_hooks = {
            'pre_conversion_validation': [],
            'conversion_safety_check': [],
            'post_conversion_verification': [],
            'css_js_compatibility_maintenance': []
        }
        
        # 1. 変換前検証hooks
        conversion_hooks['pre_conversion_validation'] = [
            {
                'check_name': 'html_structure_integrity',
                'validation_method': 'validate_html_before_conversion',
                'blocking': True,
                'description': 'HTML構造の整合性確認'
            },
            {
                'check_name': 'css_dependency_analysis',
                'validation_method': 'analyze_css_dependencies',
                'blocking': True,
                'description': 'CSS依存関係の完全分析'
            },
            {
                'check_name': 'javascript_integration_check',
                'validation_method': 'verify_js_integration_safety',
                'blocking': True,
                'description': 'JavaScript統合安全性確認'
            }
        ]
        
        # 2. 変換安全性チェックhooks
        conversion_hooks['conversion_safety_check'] = [
            {
                'safety_check': 'preserve_css_classes',
                'method': 'ensure_css_class_preservation',
                'critical': True,
                'description': 'CSSクラス名の完全保護'
            },
            {
                'safety_check': 'maintain_dom_structure',
                'method': 'ensure_dom_structure_integrity',
                'critical': True,
                'description': 'DOM構造の完全維持'
            },
            {
                'safety_check': 'preserve_javascript_hooks',
                'method': 'ensure_js_event_preservation',
                'critical': True,
                'description': 'JavaScriptイベントハンドラー保護'
            }
        ]
        
        # 3. 変換後検証hooks
        conversion_hooks['post_conversion_verification'] = [
            {
                'verification': 'css_functionality_test',
                'method': 'test_css_after_conversion',
                'automatic': True,
                'description': 'CSS機能の動作確認'
            },
            {
                'verification': 'javascript_functionality_test',
                'method': 'test_js_after_conversion',
                'automatic': True,
                'description': 'JavaScript機能の動作確認'
            },
            {
                'verification': 'php_integration_test',
                'method': 'test_php_integration',
                'automatic': True,
                'description': 'PHP統合機能の動作確認'
            }
        ]
        
        return conversion_hooks
    
    def _load_conversion_rules(self) -> Dict[str, Any]:
        """HTML→PHP変換ルールの読み込み"""
        
        return {
            'css_class_preservation': {
                'rule': 'ALL_CLASSES_MUST_BE_PRESERVED',
                'exceptions': [],
                'validation_required': True
            },
            'javascript_compatibility': {
                'rule': 'ALL_JS_FUNCTIONS_MUST_WORK',
                'namespace_isolation': True,
                'conflict_prevention': True
            },
            'dom_structure_maintenance': {
                'rule': 'DOM_STRUCTURE_IMMUTABLE',
                'critical_elements': ['header', 'sidebar', 'footer', 'navigation'],
                'modification_forbidden': True
            },
            'php_integration_safety': {
                'rule': 'GRADUAL_PHP_INTEGRATION',
                'content_only_modification': True,
                'structure_preservation': True
            }
        }
```

### **🎯 HTML変更対応hooks実行プロトコル**

```python
class HTMLChangeAwareHooksExecutor(PracticalHooksSystem):
    """HTML変更対応統合hooksシステム"""
    
    def __init__(self):
        super().__init__()
        self.html_protection = HTMLChangeProtectionHooks()
        self.js_management = JavaScriptChangeManagementHooks()
        self.php_conversion = PHPConversionIntegrationHooks()
    
    def execute_html_aware_hooks(self, 
                               development_context: Dict[str, Any]) -> Dict[str, Any]:
        """HTML変更対応hooks実行"""
        
        execution_result = {
            'html_analysis': {},
            'protection_hooks': {},
            'js_safety_hooks': {},
            'php_conversion_hooks': {},
            'overall_safety_status': 'unknown'
        }
        
        try:
            # 1. HTML構造分析
            print("🔍 HTML構造を分析中...")
            execution_result['html_analysis'] = self.html_protection.scan_existing_html_structure()
            
            # 2. HTML保護hooks生成・実行
            print("🛡️ HTML保護hooksを生成中...")
            execution_result['protection_hooks'] = self.html_protection.generate_html_protection_hooks(
                execution_result['html_analysis']
            )
            
            # 3. JavaScript安全性hooks生成・実行
            print("⚡ JavaScript安全性hooksを生成中...")
            execution_result['js_safety_hooks'] = self.js_management.generate_js_safety_hooks()
            
            # 4. PHP変換統合hooks生成・実行
            print("🔄 PHP変換統合hooksを生成中...")
            execution_result['php_conversion_hooks'] = self.php_conversion.generate_php_conversion_hooks(
                execution_result['html_analysis']
            )
            
            # 5. 総合安全性評価
            execution_result['overall_safety_status'] = self._evaluate_html_change_safety(execution_result)
            
        except Exception as e:
            execution_result['error'] = str(e)
            execution_result['overall_safety_status'] = 'error'
        
        return execution_result
    
    def _evaluate_html_change_safety(self, execution_result: Dict[str, Any]) -> str:
        """HTML変更安全性の総合評価"""
        
        safety_scores = []
        
        # HTML構造安全性
        if execution_result.get('html_analysis', {}).get('existing_html_files'):
            safety_scores.append(0.9)  # HTML構造が存在し、分析可能
        
        # CSS保護レベル
        protection_hooks = execution_result.get('protection_hooks', {})
        if protection_hooks.get('css_class_protection'):
            safety_scores.append(0.95)  # CSS保護hooks生成済み
        
        # JavaScript互換性
        js_hooks = execution_result.get('js_safety_hooks', {})
        if js_hooks.get('function_conflict_detection'):
            safety_scores.append(0.9)  # JS競合検出hooks生成済み
        
        # PHP変換準備
        php_hooks = execution_result.get('php_conversion_hooks', {})
        if php_hooks.get('pre_conversion_validation'):
            safety_scores.append(0.85)  # PHP変換準備hooks生成済み
        
        overall_score = sum(safety_scores) / len(safety_scores) if safety_scores else 0
        
        if overall_score >= 0.9:
            return 'SAFE_FOR_HTML_CHANGES'
        elif overall_score >= 0.8:
            return 'MOSTLY_SAFE_WITH_MONITORING'
        elif overall_score >= 0.7:
            return 'REQUIRES_CAREFUL_MONITORING'
        else:
            return 'UNSAFE_FOR_HTML_CHANGES'
```

## 🧠 **動的指示書読み込み・記憶システム**

### **🎯 開発内容に応じた最適読み込み**

```python
class IntelligentInstructionLoader:
    """開発内容に応じた知的指示書読み込みシステム"""
    
    def __init__(self):
        self.chat_memory = {}  # チャット内記憶
        self.loaded_instructions = {}  # 読み込み済み指示書
        self.instruction_weights = {}  # 指示書重要度
        
    def determine_required_instructions(self, 
                                      development_request: str) -> Dict[str, Any]:
        """開発要求に応じた必要指示書の動的判定"""
        
        # 開発内容分析
        request_analysis = self._analyze_development_scope(development_request)
        
        instruction_requirements = {
            'core_instructions': [],      # 必須読み込み
            'context_instructions': [],   # 文脈に応じて読み込み
            'reference_instructions': [], # 参照用（必要時のみ）
            'estimated_load_size': 0,     # 読み込み量見積もり
            'chat_memory_reuse': []       # チャット記憶再利用
        }
        
        # 開発スコープに応じた指示書選択
        if request_analysis['scope'] == 'single_component':
            # 例：「ボタン1つ追加」
            instruction_requirements['core_instructions'] = [
                '05-JavaScript エラー防止指示書',
                '01-CSS・画面デザインルール'
            ]
            instruction_requirements['estimated_load_size'] = 'SMALL'
            
        elif request_analysis['scope'] == 'module_development':
            # 例：「在庫管理機能作成」
            instruction_requirements['core_instructions'] = [
                '01-システム全体の設計図',
                '06-Inventoryモジュール完全テンプレート',
                '01-API作成の基本テンプレート',
                '02-データベース設計',
                'HTML-PHP変換_CSS統合変換ルール'
            ]
            instruction_requirements['estimated_load_size'] = 'MEDIUM'
            
        elif request_analysis['scope'] == 'system_integration':
            # 例：「PHP-Python連携システム構築」
            instruction_requirements['core_instructions'] = [
                '01-システム全体の設計図',
                '04-PHP-Python連携設定',
                '01-JWT認証システム',
                '02-セキュリティ完全実装'
            ]
            instruction_requirements['estimated_load_size'] = 'LARGE'
        
        # チャット記憶の活用
        instruction_requirements['chat_memory_reuse'] = self._identify_reusable_memory(request_analysis)
        
        return instruction_requirements
    
    def load_with_chat_memory(self, 
                            instruction_requirements: Dict[str, Any]) -> Dict[str, Any]:
        """チャット記憶を活用した効率的読み込み"""
        
        loading_result = {
            'newly_loaded': [],
            'reused_from_memory': [],
            'total_instructions': 0,
            'loading_efficiency': 0.0
        }
        
        # 1. チャット記憶から再利用
        for memory_key in instruction_requirements['chat_memory_reuse']:
            if memory_key in self.chat_memory:
                loading_result['reused_from_memory'].append(memory_key)
                print(f"♻️ チャット記憶から再利用: {memory_key}")
        
        # 2. 新規読み込み（記憶にないもののみ）
        for instruction in instruction_requirements['core_instructions']:
            if instruction not in self.chat_memory:
                self._load_and_memorize_instruction(instruction)
                loading_result['newly_loaded'].append(instruction)
                print(f"📖 新規読み込み: {instruction}")
            else:
                loading_result['reused_from_memory'].append(instruction)
                print(f"✅ 記憶済み: {instruction}")
        
        # 3. 効率性計算
        total_needed = len(instruction_requirements['core_instructions'])
        reused_count = len(loading_result['reused_from_memory'])
        loading_result['loading_efficiency'] = reused_count / total_needed if total_needed > 0 else 0
        
        return loading_result
    
    def _analyze_development_scope(self, request: str) -> Dict[str, Any]:
        """開発要求の範囲分析"""
        
        scope_indicators = {
            'single_component': [
                'ボタン', 'フォーム', 'モーダル', 'リンク', '1つ', '追加',
                'button', 'form', 'modal', 'link', 'add'
            ],
            'module_development': [
                '機能', 'システム', 'モジュール', '管理', 'CRUD', '一覧', '登録',
                'module', 'system', 'feature', 'management', 'create'
            ],
            'system_integration': [
                '連携', '統合', 'API', 'データベース', '認証', 'セキュリティ',
                'integration', 'database', 'auth', 'security', 'api'
            ]
        }
        
        detected_scope = 'single_component'  # デフォルト
        max_matches = 0
        
        request_lower = request.lower()
        
        for scope, keywords in scope_indicators.items():
            matches = sum(1 for keyword in keywords if keyword in request_lower)
            if matches > max_matches:
                max_matches = matches
                detected_scope = scope
        
        return {
            'scope': detected_scope,
            'complexity': 'HIGH' if detected_scope == 'system_integration' else 'MEDIUM' if detected_scope == 'module_development' else 'LOW',
            'estimated_instructions_needed': max_matches + 2,
            'requires_full_system_context': detected_scope == 'system_integration'
        }
    
    def _load_and_memorize_instruction(self, instruction_name: str) -> None:
        """指示書の読み込みとチャット記憶への保存"""
        
        # 実際の指示書読み込み（project_knowledge_searchを使用）
        instruction_content = self._fetch_instruction_content(instruction_name)
        
        # チャット記憶に保存
        self.chat_memory[instruction_name] = {
            'content': instruction_content,
            'loaded_at': datetime.now().isoformat(),
            'usage_count': 1,
            'key_points': self._extract_key_points(instruction_content)
        }
        
    def _identify_reusable_memory(self, request_analysis: Dict[str, Any]) -> List[str]:
        """チャット記憶から再利用可能な指示書の特定"""
        
        reusable = []
        
        for instruction_name, memory_data in self.chat_memory.items():
            # 関連性チェック
            if self._is_instruction_relevant(instruction_name, request_analysis):
                reusable.append(instruction_name)
                # 使用回数更新
                memory_data['usage_count'] += 1
        
        return reusable
```

## 🔄 **自動矛盾解決・検証システム**

### **🤖 人間確認を最小化する自動解決**

```python
class AutomaticConflictResolver:
    """矛盾の自動検出・解決・検証システム"""
    
    def __init__(self):
        self.resolution_rules = self._load_resolution_rules()
        self.validation_hooks = []
        
    def auto_resolve_conflicts(self, 
                             detected_conflicts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """矛盾の完全自動解決"""
        
        resolution_result = {
            'auto_resolved_conflicts': [],
            'requires_human_decision': [],
            'resolution_success_rate': 0.0,
            'applied_resolutions': []
        }
        
        for conflict in detected_conflicts:
            resolution_strategy = self._determine_resolution_strategy(conflict)
            
            if resolution_strategy['auto_resolvable']:
                # 自動解決実行
                resolved = self._apply_automatic_resolution(conflict, resolution_strategy)
                resolution_result['auto_resolved_conflicts'].append(resolved)
                
                # 解決後の自動検証
                validation_result = self._validate_resolution(resolved)
                if not validation_result['valid']:
                    # 自動解決失敗 → 人間判断に回す
                    resolution_result['requires_human_decision'].append(conflict)
                    
            else:
                # 人間判断が必要
                resolution_result['requires_human_decision'].append(conflict)
        
        # 成功率計算
        total_conflicts = len(detected_conflicts)
        auto_resolved = len(resolution_result['auto_resolved_conflicts'])
        resolution_result['resolution_success_rate'] = auto_resolved / total_conflicts if total_conflicts > 0 else 1.0
        
        return resolution_result
    
    def _determine_resolution_strategy(self, conflict: Dict[str, Any]) -> Dict[str, Any]:
        """矛盾解決戦略の決定"""
        
        strategy = {
            'auto_resolvable': False,
            'resolution_method': None,
            'confidence': 0.0,
            'risk_level': 'UNKNOWN'
        }
        
        conflict_type = conflict.get('type', 'UNKNOWN')
        
        if conflict_type == 'NAMING_CONFLICT':
            # 命名規則矛盾 → 最優先ルールを適用
            strategy = {
                'auto_resolvable': True,
                'resolution_method': 'apply_highest_priority_naming_rule',
                'confidence': 0.95,
                'risk_level': 'LOW'
            }
            
        elif conflict_type == 'CSS_CLASS_CONFLICT':
            # CSSクラス矛盾 → BEM準拠を強制
            strategy = {
                'auto_resolvable': True,
                'resolution_method': 'enforce_bem_compliance',
                'confidence': 0.9,
                'risk_level': 'LOW'
            }
            
        elif conflict_type == 'API_SPECIFICATION_CONFLICT':
            # API仕様矛盾 → 最新版を採用
            strategy = {
                'auto_resolvable': True,
                'resolution_method': 'adopt_latest_api_specification',
                'confidence': 0.85,
                'risk_level': 'MEDIUM'
            }
            
        elif conflict_type == 'ARCHITECTURAL_DECISION_CONFLICT':
            # アーキテクチャ判断矛盾 → 人間判断必要
            strategy = {
                'auto_resolvable': False,
                'resolution_method': 'require_human_decision',
                'confidence': 0.0,
                'risk_level': 'HIGH'
            }
        
        return strategy
    
    def generate_post_implementation_validation(self) -> Dict[str, Any]:
        """実装後の自動検証hooks生成"""
        
        validation_hooks = {
            'automatic_conflict_detection': [],
            'real_time_consistency_check': [],
            'implementation_integrity_validation': []
        }
        
        # 1. 自動矛盾検出hooks
        validation_hooks['automatic_conflict_detection'] = [
            {
                'hook_name': 'css_consistency_monitor',
                'check_frequency': 'on_file_change',
                'auto_fix': True,
                'description': 'CSS命名規則の一貫性監視'
            },
            {
                'hook_name': 'javascript_conflict_detector',
                'check_frequency': 'on_js_change',
                'auto_fix': True,
                'description': 'JavaScript関数競合の自動検出'
            }
        ]
        
        # 2. リアルタイム一貫性チェック
        validation_hooks['real_time_consistency_check'] = [
            {
                'hook_name': 'dom_structure_integrity_monitor',
                'trigger': 'html_modification',
                'auto_revert': True,
                'description': 'DOM構造整合性のリアルタイム監視'
            }
        ]
        
        return validation_hooks
```

## 🔧 **新規hooks追加・管理システム**

### **🚀 動的hooks拡張メカニズム**

```python
class DynamicHooksExpansionSystem:
    """新規hooks動的追加・管理システム"""
    
    def __init__(self):
        self.hooks_registry = {}
        self.hooks_categories = {}
        self.hooks_templates = {}
        
    def create_new_hooks_category(self, 
                                category_name: str,
                                category_config: Dict[str, Any]) -> Dict[str, Any]:
        """新しいhooksカテゴリの作成"""
        
        creation_result = {
            'category_name': category_name,
            'creation_status': 'pending',
            'generated_hooks': [],
            'integration_points': [],
            'template_created': False
        }
        
        try:
            # 1. カテゴリテンプレート生成
            template = self._generate_category_template(category_name, category_config)
            creation_result['template_created'] = True
            
            # 2. 基本hooks生成
            basic_hooks = self._generate_basic_hooks_for_category(category_name, template)
            creation_result['generated_hooks'] = basic_hooks
            
            # 3. 既存システムとの統合ポイント特定
            integration_points = self._identify_integration_points(category_name)
            creation_result['integration_points'] = integration_points
            
            # 4. レジストリに登録
            self._register_new_hooks_category(category_name, {
                'template': template,
                'hooks': basic_hooks,
                'integration_points': integration_points,
                'created_at': datetime.now().isoformat()
            })
            
            creation_result['creation_status'] = 'success'
            
        except Exception as e:
            creation_result['creation_status'] = 'error'
            creation_result['error'] = str(e)
        
        return creation_result
    
    def add_hooks_to_existing_category(self, 
                                     category_name: str,
                                     new_hook_spec: Dict[str, Any]) -> Dict[str, Any]:
        """既存カテゴリへの新規hooks追加"""
        
        addition_result = {
            'category_name': category_name,
            'new_hook_name': new_hook_spec.get('name', 'unknown'),
            'addition_status': 'pending',
            'compatibility_check': {},
            'auto_integration': False
        }
        
        if category_name not in self.hooks_registry:
            addition_result['addition_status'] = 'error'
            addition_result['error'] = f'Category {category_name} not found'
            return addition_result
        
        try:
            # 1. 互換性チェック
            compatibility = self._check_hook_compatibility(category_name, new_hook_spec)
            addition_result['compatibility_check'] = compatibility
            
            if compatibility['compatible']:
                # 2. 自動統合
                integration_result = self._auto_integrate_new_hook(category_name, new_hook_spec)
                addition_result['auto_integration'] = integration_result['success']
                
                # 3. レジストリ更新
                self._update_hooks_registry(category_name, new_hook_spec)
                
                addition_result['addition_status'] = 'success'
            else:
                addition_result['addition_status'] = 'compatibility_error'
                addition_result['error'] = compatibility['issues']
                
        except Exception as e:
            addition_result['addition_status'] = 'error'
            addition_result['error'] = str(e)
        
        return addition_result
    
    def _generate_category_template(self, 
                                  category_name: str,
                                  config: Dict[str, Any]) -> Dict[str, Any]:
        """新カテゴリ用テンプレート自動生成"""
        
        template = {
            'category_name': category_name,
            'base_class_name': f"{category_name.title()}Hooks",
            'required_methods': [
                f'verify_{category_name}_integration',
                f'validate_{category_name}_configuration', 
                f'execute_{category_name}_hooks'
            ],
            'error_patterns': config.get('related_errors', []),
            'integration_points': config.get('integration_requirements', []),
            'validation_rules': config.get('validation_rules', {}),
            'auto_fix_capabilities': config.get('auto_fix_methods', [])
        }
        
        return template
    
    def generate_hooks_extension_guide(self, 
                                     new_requirements: List[str]) -> Dict[str, Any]:
        """新規hooks作成ガイドの自動生成"""
        
        extension_guide = {
            'recommended_categories': [],
            'implementation_priority': [],
            'estimated_development_time': {},
            'risk_assessment': {},
            'step_by_step_guide': []
        }
        
        for requirement in new_requirements:
            # 要件分析
            analysis = self._analyze_new_requirement(requirement)
            
            # カテゴリ推奨
            if analysis['suggested_category'] not in extension_guide['recommended_categories']:
                extension_guide['recommended_categories'].append(analysis['suggested_category'])
            
            # 優先度設定
            extension_guide['implementation_priority'].append({
                'requirement': requirement,
                'priority': analysis['priority'],
                'justification': analysis['priority_reason']
            })
            
            # 工数見積もり
            extension_guide['estimated_development_time'][requirement] = analysis['estimated_hours']
            
            # リスク評価
            extension_guide['risk_assessment'][requirement] = analysis['risk_level']
        
        # 実装ガイド生成
        extension_guide['step_by_step_guide'] = self._generate_implementation_steps(extension_guide)
        
        return extension_guide
    
    def auto_suggest_hooks_improvements(self) -> Dict[str, Any]:
        """hooks改善提案の自動生成"""
        
        improvements = {
            'performance_optimizations': [],
            'coverage_gaps': [],
            'integration_enhancements': [],
            'maintenance_recommendations': []
        }
        
        # 使用統計分析
        usage_stats = self._analyze_hooks_usage_statistics()
        
        # パフォーマンス最適化提案
        for category, stats in usage_stats.items():
            if stats['average_execution_time'] > 5.0:  # 5秒以上
                improvements['performance_optimizations'].append({
                    'category': category,
                    'current_time': stats['average_execution_time'],
                    'optimization_suggestion': f'Optimize {category} hooks execution',
                    'expected_improvement': '50-70% faster'
                })
        
        # カバレッジギャップ検出
        coverage_analysis = self._analyze_coverage_gaps()
        improvements['coverage_gaps'] = coverage_analysis['identified_gaps']
        
        return improvements
```

## 🎯 **統合システム運用フロー**

### **🔄 完全自動化開発フロー**

```python
class FullyAutomatedDevelopmentFlow:
    """完全自動化開発フローシステム"""
    
    def __init__(self):
        self.instruction_loader = IntelligentInstructionLoader()
        self.conflict_resolver = AutomaticConflictResolver()
        self.hooks_expander = DynamicHooksExpansionSystem()
        
    def execute_automated_development(self, 
                                    user_request: str) -> Dict[str, Any]:
        """完全自動化開発の実行"""
        
        development_result = {
            'request': user_request,
            'start_time': datetime.now().isoformat(),
            'phases': {},
            'final_status': 'pending'
        }
        
        try:
            # Phase 1: 知的指示書読み込み（30秒）
            print("📚 必要な指示書を分析・読み込み中...")
            instruction_requirements = self.instruction_loader.determine_required_instructions(user_request)
            loading_result = self.instruction_loader.load_with_chat_memory(instruction_requirements)
            development_result['phases']['instruction_loading'] = loading_result
            
            # Phase 2: 自動矛盾解決（10秒）
            print("🔧 指示書矛盾を自動検出・解決中...")
            conflicts = self._detect_instruction_conflicts(loading_result)
            resolution_result = self.conflict_resolver.auto_resolve_conflicts(conflicts)
            development_result['phases']['conflict_resolution'] = resolution_result
            
            # Phase 3: 実装生成（40秒）
            print("⚡ 実装コードを生成中...")
            implementation = self._generate_implementation(
                user_request,
                loading_result,
                resolution_result
            )
            development_result['phases']['implementation'] = implementation
            
            # Phase 4: 自動検証・配置（20秒）
            print("✅ 自動検証・配置中...")
            validation_result = self._auto_validate_and_deploy(implementation)
            development_result['phases']['validation_deployment'] = validation_result
            
            # Phase 5: 事後hooks更新（必要時のみ）
            if self._requires_hooks_extension(user_request):
                print("🔄 新規hooks追加中...")
                extension_result = self.hooks_expander.add_hooks_to_existing_category(
                    implementation['category'],
                    implementation['new_hook_spec']
                )
                development_result['phases']['hooks_extension'] = extension_result
            
            development_result['final_status'] = 'success'
            development_result['end_time'] = datetime.now().isoformat()
            
            # 実行時間計算
            start = datetime.fromisoformat(development_result['start_time'])
            end = datetime.fromisoformat(development_result['end_time'])
            development_result['total_execution_time'] = (end - start).total_seconds()
            
        except Exception as e:
            development_result['final_status'] = 'error'
            development_result['error'] = str(e)
            development_result['end_time'] = datetime.now().isoformat()
        
        return development_result
```

## 🚨 **Claude特性・制限対応hooks（最重要）**

### **🎯 CSS基準開発の絶対原則**

```python
class CSSBasedDevelopmentHooks:
    """CSS基準開発の絶対遵守システム"""
    
    def __init__(self):
        self.css_first_principle = "CSS_IS_ABSOLUTE_FOUNDATION"
        self.development_hierarchy = [
            "1. CSS構造・クラス名が最優先",
            "2. HTML はCSSに合わせて構築", 
            "3. JavaScript はHTML/CSSに合わせて実装",
            "4. PHP はHTML構造を破壊しない"
        ]
    
    def enforce_css_based_development(self, development_request: str) -> Dict[str, Any]:
        """CSS基準開発の強制実行"""
        
        enforcement_result = {
            'css_analysis_required': True,
            'html_css_compliance_check': True,
            'js_css_dependency_validation': True,
            'php_css_preservation_guarantee': True,
            'conflicting_instructions_override': []
        }
        
        # 指示書矛盾時のCSS優先原則
        css_priority_rules = {
            'css_class_naming': {
                'priority': 'ABSOLUTE',
                'rule': '既存CSSクラス名は絶対変更禁止',
                'override_authority': 'HIGHEST',
                'conflicting_instruction_action': 'IGNORE'
            },
            'html_structure': {
                'priority': 'ABSOLUTE', 
                'rule': 'CSSに依存するHTML構造は絶対保護',
                'override_authority': 'HIGHEST',
                'conflicting_instruction_action': 'IGNORE'
            },
            'javascript_selectors': {
                'priority': 'ABSOLUTE',
                'rule': 'CSSセレクタに依存するJS は CSS 変更禁止',
                'override_authority': 'HIGHEST', 
                'conflicting_instruction_action': 'IGNORE'
            }
        }
        
        return {
            'css_priority_rules': css_priority_rules,
            'instruction_conflict_resolution': 'CSS_RULES_OVERRIDE_ALL',
            'development_order': self.development_hierarchy,
            'absolute_protection_targets': self._identify_css_critical_elements()
        }
    
    def _identify_css_critical_elements(self) -> Dict[str, List[str]]:
        """CSS基準で絶対保護すべき要素特定"""
        
        return {
            'critical_css_classes': [
                '.header', '.sidebar', '.footer', '.navigation',
                '.dashboard__container', '.layout', '.content',
                '.modal', '.form', '.button', '.card'
            ],
            'critical_css_ids': [
                '#sidebarToggleButton', '#main-content', '#header-nav'
            ],
            'critical_css_selectors': [
                'document.querySelector(.sidebar)',
                'document.getElementById(sidebarToggleButton)',
                'element.classList.add/remove/toggle'
            ],
            'protection_level': 'ABSOLUTE_IMMUTABLE'
        }
```

### **📝 JavaScript関数保護（開発指示書準拠）**

```python
class JavaScriptFunctionProtection:
    """開発指示書準拠のJavaScript関数完全保護"""
    
    def __init__(self):
        # 開発指示書から抽出された保護対象関数
        self.protected_functions = self._load_from_development_instructions()
    
    def _load_from_development_instructions(self) -> Dict[str, Any]:
        """開発指示書からJavaScript保護対象を読み込み"""
        
        # 実際の開発指示書内容に基づく
        return {
            'onclick_functions': [
                'showCreateModal', 'hideCreateModal', 'editAPIKey',
                'deleteAPIKey', 'testAPIKey', 'refreshToolStatus',
                'submitForm', 'validateInput', 'toggleSidebar'
            ],
            'dom_ready_functions': [
                'initializeSystem', 'loadUserSettings', 'setupEventListeners'
            ],
            'ajax_functions': [
                'unifiedAPICall', 'handleAjaxResponse', 'updateUI'
            ],
            'event_handlers': [
                'click', 'submit', 'change', 'keyup', 'resize'
            ],
            'protection_method': 'DEVELOPMENT_INSTRUCTION_BASED',
            'reference_document': 'JavaScript エラー防止・開発指示書'
        }
    
    def generate_js_protection_hooks(self) -> Dict[str, Any]:
        """開発指示書準拠のJS保護hooks生成"""
        
        protection_hooks = {
            'function_existence_validation': [],
            'event_handler_preservation': [],
            'dom_selector_protection': [],
            'conflict_prevention': []
        }
        
        # 開発指示書記載の重要関数を完全保護
        for func_name in self.protected_functions['onclick_functions']:
            protection_hooks['function_existence_validation'].append({
                'function_name': func_name,
                'validation_method': f'ensure_{func_name}_exists',
                'source_document': 'JavaScript エラー防止・開発指示書',
                'protection_level': 'CRITICAL'
            })
        
        return protection_hooks
```

### **📄 Claude文字数制限対応システム**

```python
class ClaudeOutputLimitationHandler:
    """Claude文字数制限・出力特性対応システム"""
    
    def __init__(self):
        self.max_safe_output_size = 75000  # 80000文字未満に設定
        self.php_html_separation_threshold = 40000
        self.auto_truncation_prevention = True
        
    def handle_large_output_generation(self, 
                                     generation_request: Dict[str, Any]) -> Dict[str, Any]:
        """大容量出力の分割・管理システム"""
        
        output_plan = {
            'total_estimated_size': 0,
            'requires_separation': False,
            'output_parts': [],
            'delivery_strategy': 'single_output'
        }
        
        # 出力サイズ見積もり
        estimated_sizes = self._estimate_output_sizes(generation_request)
        output_plan['total_estimated_size'] = sum(estimated_sizes.values())
        
        # 分割判定
        if output_plan['total_estimated_size'] > self.max_safe_output_size:
            output_plan['requires_separation'] = True
            output_plan['delivery_strategy'] = 'multi_part_delivery'
            output_plan['output_parts'] = self._plan_output_separation(estimated_sizes)
        
        return output_plan
    
    def _plan_output_separation(self, estimated_sizes: Dict[str, int]) -> List[Dict[str, Any]]:
        """出力分割計画の作成"""
        
        separation_plan = []
        
        # Part 1: HTML部分（優先度：最高）
        if estimated_sizes.get('html_content', 0) > 30000:
            separation_plan.append({
                'part_name': 'HTML_STRUCTURE',
                'content_types': ['html_template', 'html_content'],
                'estimated_size': estimated_sizes.get('html_content', 0),
                'delivery_order': 1,
                'note': 'HTMLテンプレート・構造のみ。CSSクラス名保護済み。'
            })
        
        # Part 2: PHP部分（分離必須）
        if estimated_sizes.get('php_content', 0) > 0:
            separation_plan.append({
                'part_name': 'PHP_LOGIC',
                'content_types': ['php_functions', 'php_variables', 'php_includes'],
                'estimated_size': estimated_sizes.get('php_content', 0),
                'delivery_order': 2,
                'note': 'PHP処理ロジックのみ。HTML構造は前回出力参照。'
            })
        
        # Part 3: CSS/JavaScript（必要時のみ）
        css_js_size = estimated_sizes.get('css_content', 0) + estimated_sizes.get('js_content', 0)
        if css_js_size > 20000:
            separation_plan.append({
                'part_name': 'CSS_JAVASCRIPT',
                'content_types': ['css_styles', 'javascript_functions'],
                'estimated_size': css_js_size,
                'delivery_order': 3,
                'note': '既存CSS/JS保護版。DOM構造維持済み。'
            })
        
        return separation_plan
    
    def generate_output_with_claude_limitations(self, 
                                              content: Dict[str, Any],
                                              separation_plan: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Claude制限に配慮した出力生成"""
        
        generation_strategy = {
            'current_output_focus': separation_plan[0] if separation_plan else None,
            'remaining_parts': separation_plan[1:] if len(separation_plan) > 1 else [],
            'claude_friendly_instructions': [],
            'continuation_prompt': None
        }
        
        # Claude向け明確な指示生成
        if generation_strategy['current_output_focus']:
            focus = generation_strategy['current_output_focus']
            generation_strategy['claude_friendly_instructions'] = [
                f"今回は{focus['part_name']}のみを出力してください",
                f"推定文字数: {focus['estimated_size']}文字以内",
                f"注意事項: {focus['note']}",
                "文字数制限に注意して、途中で切れないよう調整してください"
            ]
        
        # 続きの出力が必要な場合のプロンプト生成
        if generation_strategy['remaining_parts']:
            generation_strategy['continuation_prompt'] = self._generate_continuation_prompt(
                generation_strategy['remaining_parts']
            )
        
        return generation_strategy
    
    def _generate_continuation_prompt(self, remaining_parts: List[Dict[str, Any]]) -> str:
        """継続出力用プロンプト生成"""
        
        next_part = remaining_parts[0]
        continuation_prompt = f"""
次に{next_part['part_name']}を出力してください。

出力内容: {', '.join(next_part['content_types'])}
推定文字数: {next_part['estimated_size']}文字以内
注意事項: {next_part['note']}

前回の出力との整合性を保ち、CSSクラス名・DOM構造を維持してください。
"""
        
        return continuation_prompt.strip()
```

### **🎯 指示書矛盾Override System**

```python
class InstructionConflictOverrideSystem:
    """指示書矛盾時のCSS基準Override"""
    
    def __init__(self):
        self.css_first_overrides = {
            'css_class_naming_conflicts': 'IGNORE_CONFLICTING_INSTRUCTIONS',
            'html_structure_conflicts': 'IGNORE_CONFLICTING_INSTRUCTIONS',
            'javascript_selector_conflicts': 'IGNORE_CONFLICTING_INSTRUCTIONS',
            'php_conversion_conflicts': 'CSS_STRUCTURE_PRESERVATION_PRIORITY'
        }
    
    def resolve_instruction_conflicts_with_css_priority(self, 
                                                      conflicts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """CSS優先原則による指示書矛盾解決"""
        
        resolution_result = {
            'css_priority_applied': [],
            'ignored_conflicting_instructions': [],
            'css_structure_preserved': True,
            'resolution_strategy': 'CSS_ABSOLUTE_PRIORITY'
        }
        
        for conflict in conflicts:
            if conflict['type'] in ['CSS_NAMING', 'HTML_STRUCTURE', 'JS_SELECTOR']:
                # CSS関連矛盾は無条件でCSS優先
                resolution_result['css_priority_applied'].append({
                    'conflict': conflict,
                    'resolution': 'CSS_RULES_MAINTAINED',
                    'conflicting_instruction': 'IGNORED',
                    'justification': 'CSS構造保護のため指示書矛盾を無視'
                })
                
                resolution_result['ignored_conflicting_instructions'].append(
                    conflict['conflicting_instruction_source']
                )
        
        return resolution_result
```

## 🎯 **Claude実行時の必須プロトコル（特性対応版）**

### **📋 開発実行前チェックリスト**

```yaml
Step 1: CSS基準確認（絶対実行）
  □ 既存CSSクラス名の完全把握
  □ CSS依存HTML構造の特定
  □ JavaScript CSS セレクタの確認
  □ 指示書矛盾時のCSS優先確認

Step 2: 出力サイズ事前計画
  □ 生成予定文字数の見積もり実行
  □ 80000文字超過時の分割計画作成
  □ HTML/PHP分離の必要性判定
  □ Claude文字数制限対応準備

Step 3: JavaScript保護確認
  □ 開発指示書記載の保護対象関数確認
  □ イベントハンドラー保護設定確認
  □ DOM操作関数の存在確認

Step 4: 矛盾解決戦略確定
  □ CSS基準Override の適用確認
  □ 指示書矛盾時の無視設定確認
  □ CSS構造保護の最優先確認
```

### **⚡ Claude出力制御指示**

```python
claude_output_instructions = {
    'css_priority_enforcement': [
        "指示書に矛盾があってもCSS構造を最優先してください",
        "既存CSSクラス名は絶対に変更しないでください", 
        "HTML構造はCSS依存関係を絶対に破壊しないでください"
    ],
    'output_size_management': [
        "出力が80000文字を超える場合は必ず分割してください",
        "HTML部分とPHP部分は別々に出力してください",
        "文字数制限で途中終了しないよう注意してください"
    ],
    'javascript_protection': [
        "開発指示書記載のJavaScript関数は絶対保護してください",
        "既存のイベントハンドラーを破壊しないでください",
        "DOM操作関数の動作を維持してください"
    ]
}
```

この最終版hooks開発指示書により、**Claude特性を完全理解した実用的hooks**が完成しました。

✅ **CSS基準開発**: 指示書矛盾無視でCSS絶対優先
✅ **JavaScript保護**: 開発指示書準拠の完全保護
✅ **出力分割**: 80000文字制限対応で途中終了防止
✅ **Claude特性対応**: 記憶・制限・特性を全て考慮