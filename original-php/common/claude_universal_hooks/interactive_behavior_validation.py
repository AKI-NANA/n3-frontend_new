"""
🪝 NAGANO-3 JavaScript検証hooks実装
ナレッジベース準拠: 05-JavaScript エラー防止・開発指示書【品質保証強化版】312行仕様

実装対象: Hook 1-6 JavaScript品質検証hooks
基盤仕様: 分割ファイルシステム、NAGANO3名前空間、BEM準拠
"""

import re
import ast
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

class BaseValidationHook:
    """全hookの基底クラス（ナレッジベース統合）"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.knowledge_base_specs = self._load_knowledge_base_specs()
        self.execution_start_time = None
        
    def _load_knowledge_base_specs(self) -> Dict[str, Any]:
        """ナレッジベース仕様読み込み"""
        return {
            "javascript_error_prevention_spec": {
                "source": "05-JavaScript エラー防止・開発指示書【品質保証強化版】",
                "lines": 312,
                "split_file_system": True,
                "nagano3_namespace": True,
                "bem_compliance": True
            },
            "php_js_integration_spec": {
                "source": "03-PHPとJavaScript連携",
                "lines": 797,
                "ajax_processing": True,
                "error_handling": True
            }
        }
    
    def execute_validation(self, target_files: List[str]) -> Dict[str, Any]:
        """検証実行（統一インターフェース）"""
        self.execution_start_time = datetime.now()
        
        return {
            'hook_name': self.__class__.__name__,
            'knowledge_base_source': self._get_knowledge_source(),
            'validation_status': 'pending',
            'findings': [],
            'compliance_score': 0.0,
            'existing_system_compatibility': True,
            'execution_time': 0.0,
            'recommendations': []
        }
    
    def _get_knowledge_source(self) -> str:
        """ナレッジソース特定"""
        return "NAGANO-3 ナレッジベース準拠実装"
    
    def _calculate_execution_time(self) -> float:
        """実行時間計算"""
        if self.execution_start_time:
            return (datetime.now() - self.execution_start_time).total_seconds()
        return 0.0


class JavaScriptES6SyntaxValidationHook(BaseValidationHook):
    """Hook 1: ES6+モダンJavaScript構文検証
    基盤: 05-JavaScript エラー防止・開発指示書 312行仕様
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.es6_patterns = self._load_es6_patterns()
        self.forbidden_patterns = self._load_forbidden_patterns()
    
    def _load_es6_patterns(self) -> Dict[str, str]:
        """ES6推奨パターン（ナレッジベース準拠）"""
        return {
            "const_let_usage": r'\b(const|let)\s+\w+',
            "arrow_functions": r'\w+\s*=>\s*',
            "template_literals": r'`[^`]*\${[^}]+}[^`]*`',
            "destructuring": r'(?:const|let|var)\s*{\s*\w+[^}]*}\s*=',
            "async_await": r'async\s+function|\basync\s*\([^)]*\)|\bawait\s+',
            "class_declaration": r'class\s+\w+\s*{',
            "export_import": r'\b(export|import)\s+'
        }
    
    def _load_forbidden_patterns(self) -> Dict[str, str]:
        """禁止パターン（ナレッジベース準拠）"""
        return {
            "var_usage": r'\bvar\s+\w+',
            "function_declaration_in_php": r'<script[^>]*>[\s\S]*function\s+\w+\([^)]*\)\s*{[\s\S]*?</script>',
            "es6_export_browser": r'export\s+(default\s+)?(?:class|function|const|let)',
            "return_outside_function": r'^\s*return\s+',
            "global_pollution": r'window\.\w+\s*=\s*(?!function|class)',
            "missing_namespace": r'(?<!NAGANO3\.)\w+\s*=\s*(?:function|class)'
        }
    
    def execute_validation(self, js_files: List[str]) -> Dict[str, Any]:
        """ES6構文検証実行"""
        result = super().execute_validation(js_files)
        findings = []
        
        for file_path in js_files:
            try:
                file_findings = self._validate_single_file(file_path)
                findings.extend(file_findings)
            except Exception as e:
                findings.append({
                    'type': 'error',
                    'file': file_path,
                    'message': f'ファイル検証エラー: {str(e)}',
                    'severity': 'critical'
                })
        
        # 検証結果集計
        critical_issues = [f for f in findings if f.get('severity') == 'critical']
        warning_issues = [f for f in findings if f.get('severity') == 'warning']
        
        result.update({
            'validation_status': 'failed' if critical_issues else ('warning' if warning_issues else 'passed'),
            'findings': findings,
            'compliance_score': self._calculate_es6_compliance_score(findings),
            'execution_time': self._calculate_execution_time(),
            'recommendations': self._generate_es6_recommendations(findings)
        })
        
        return result
    
    def _validate_single_file(self, file_path: str) -> List[Dict[str, Any]]:
        """単一ファイルのES6検証"""
        findings = []
        
        if not Path(file_path).exists():
            findings.append({
                'type': 'file_not_found',
                'file': file_path,
                'message': 'ファイルが存在しません',
                'severity': 'critical'
            })
            return findings
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            findings.append({
                'type': 'read_error',
                'file': file_path,
                'message': f'ファイル読み込みエラー: {str(e)}',
                'severity': 'critical'
            })
            return findings
        
        # 禁止パターンチェック
        for pattern_name, pattern in self.forbidden_patterns.items():
            matches = re.finditer(pattern, content, re.MULTILINE)
            for match in matches:
                findings.append({
                    'type': 'forbidden_pattern',
                    'file': file_path,
                    'pattern': pattern_name,
                    'line': content[:match.start()].count('\n') + 1,
                    'message': f'禁止パターン検出: {pattern_name}',
                    'severity': 'critical' if pattern_name in ['return_outside_function', 'es6_export_browser'] else 'warning',
                    'suggestion': self._get_pattern_suggestion(pattern_name)
                })
        
        # ES6推奨パターンチェック
        es6_usage = {}
        for pattern_name, pattern in self.es6_patterns.items():
            matches = list(re.finditer(pattern, content, re.MULTILINE))
            es6_usage[pattern_name] = len(matches)
        
        # ES6使用率評価
        if sum(es6_usage.values()) == 0:
            findings.append({
                'type': 'es6_underutilization',
                'file': file_path,
                'message': 'ES6構文が使用されていません（モダンJavaScript推奨）',
                'severity': 'warning',
                'suggestion': 'const/let、アロー関数、テンプレートリテラルの使用を検討してください'
            })
        
        return findings
    
    def _get_pattern_suggestion(self, pattern_name: str) -> str:
        """パターン別改善提案"""
        suggestions = {
            "var_usage": "const または let を使用してください",
            "function_declaration_in_php": "分割ファイル内で関数を定義してください",
            "es6_export_browser": "window.functionName = の形式を使用してください",
            "return_outside_function": "関数外でのreturn文は削除してください",
            "global_pollution": "NAGANO3名前空間を使用してください",
            "missing_namespace": "NAGANO3.module形式で名前空間を使用してください"
        }
        return suggestions.get(pattern_name, "ナレッジベース仕様に準拠してください")
    
    def _calculate_es6_compliance_score(self, findings: List[Dict[str, Any]]) -> float:
        """ES6準拠スコア計算"""
        if not findings:
            return 1.0
        
        critical_count = len([f for f in findings if f.get('severity') == 'critical'])
        warning_count = len([f for f in findings if f.get('severity') == 'warning'])
        
        # 重要度に応じた減点
        penalty = critical_count * 0.2 + warning_count * 0.05
        return max(0.0, 1.0 - penalty)
    
    def _generate_es6_recommendations(self, findings: List[Dict[str, Any]]) -> List[str]:
        """ES6改善推奨事項生成"""
        recommendations = []
        
        if any(f.get('pattern') == 'var_usage' for f in findings):
            recommendations.append("var を const/let に変更してください")
        
        if any(f.get('pattern') == 'function_declaration_in_php' for f in findings):
            recommendations.append("PHP内の関数定義を分割ファイルに移動してください")
        
        if any(f.get('pattern') == 'missing_namespace' for f in findings):
            recommendations.append("NAGANO3名前空間を使用してください")
        
        return recommendations


class JavaScriptConflictDetectionHook(BaseValidationHook):
    """Hook 2: JavaScript競合・重複検出
    基盤: 312行仕様のエラーパターン対応
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.protected_functions = self._load_protected_functions()
        self.library_conflicts = self._load_library_conflicts()
    
    def _load_protected_functions(self) -> List[str]:
        """保護対象関数（ナレッジベース準拠）"""
        return [
            'showNotification', 'toggleSidebar', 'toggleTheme',
            'loadEnvToUI', 'testAPIKey', 'deleteAPIKey',
            'showCreateModal', 'hideCreateModal', 'editAPIKey',
            'refreshToolStatus'
        ]
    
    def _load_library_conflicts(self) -> Dict[str, List[str]]:
        """ライブラリ競合パターン"""
        return {
            'jquery': ['$', 'jQuery'],
            'bootstrap': ['bootstrap', 'Bootstrap'],
            'nagano3': ['NAGANO3', 'N3'],
            'global': ['window', 'document', 'console']
        }
    
    def execute_validation(self, project_files: List[str]) -> Dict[str, Any]:
        """競合検出実行"""
        result = super().execute_validation(project_files)
        findings = []
        
        # 関数重複検出
        function_definitions = self._scan_function_definitions(project_files)
        conflicts = self._detect_function_conflicts(function_definitions)
        findings.extend(conflicts)
        
        # ライブラリ競合検出
        library_conflicts = self._detect_library_conflicts(project_files)
        findings.extend(library_conflicts)
        
        # グローバル変数競合検出
        global_conflicts = self._detect_global_conflicts(project_files)
        findings.extend(global_conflicts)
        
        result.update({
            'validation_status': 'failed' if any(f.get('severity') == 'critical' for f in findings) else 'passed',
            'findings': findings,
            'compliance_score': self._calculate_conflict_score(findings),
            'execution_time': self._calculate_execution_time(),
            'recommendations': self._generate_conflict_recommendations(findings)
        })
        
        return result
    
    def _scan_function_definitions(self, files: List[str]) -> Dict[str, List[Dict[str, Any]]]:
        """関数定義スキャン"""
        definitions = {}
        
        for file_path in files:
            if not file_path.endswith('.js'):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # 関数定義パターン検索
                patterns = [
                    r'function\s+(\w+)\s*\(',
                    r'(\w+)\s*=\s*function',
                    r'(\w+)\s*:\s*function',
                    r'window\.(\w+)\s*=\s*function'
                ]
                
                for pattern in patterns:
                    matches = re.finditer(pattern, content, re.MULTILINE)
                    for match in matches:
                        func_name = match.group(1)
                        if func_name not in definitions:
                            definitions[func_name] = []
                        
                        definitions[func_name].append({
                            'file': file_path,
                            'line': content[:match.start()].count('\n') + 1,
                            'pattern': pattern,
                            'context': match.group(0)
                        })
            
            except Exception as e:
                continue
        
        return definitions
    
    def _detect_function_conflicts(self, definitions: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """関数競合検出"""
        conflicts = []
        
        for func_name, occurrences in definitions.items():
            if len(occurrences) > 1:
                # 重複定義検出
                conflicts.append({
                    'type': 'function_conflict',
                    'function_name': func_name,
                    'occurrences': occurrences,
                    'message': f'関数 {func_name} が {len(occurrences)} 箇所で定義されています',
                    'severity': 'critical' if func_name in self.protected_functions else 'warning',
                    'suggestion': 'NAGANO3名前空間または異なる名前を使用してください'
                })
        
        return conflicts
    
    def _detect_library_conflicts(self, files: List[str]) -> List[Dict[str, Any]]:
        """ライブラリ競合検出"""
        conflicts = []
        
        for file_path in files:
            if not file_path.endswith('.js'):
                continue
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # jQuery競合チェック
                if re.search(r'\$\s*\(', content) and not re.search(r'jQuery\.noConflict\(\)', content):
                    conflicts.append({
                        'type': 'library_conflict',
                        'file': file_path,
                        'library': 'jQuery',
                        'message': 'jQuery $ 使用時は noConflict() の使用を推奨',
                        'severity': 'warning',
                        'suggestion': 'jQuery.noConflict() を使用するか、NAGANO3.ajax を使用してください'
                    })
                
                # NAGANO3名前空間チェック
                if not re.search(r'NAGANO3\.|window\.NAGANO3', content) and re.search(r'window\.\w+\s*=', content):
                    conflicts.append({
                        'type': 'namespace_violation',
                        'file': file_path,
                        'message': 'NAGANO3名前空間の使用が推奨されます',
                        'severity': 'warning',
                        'suggestion': 'window.NAGANO3.module.function の形式を使用してください'
                    })
            
            except Exception:
                continue
        
        return conflicts
    
    def _detect_global_conflicts(self, files: List[str]) -> List[Dict[str, Any]]:
        """グローバル変数競合検出"""
        conflicts = []
        global_vars = {}
        
        for file_path in files:
            if not file_path.endswith('.js'):
                continue
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # グローバル変数定義検索
                patterns = [
                    r'var\s+(\w+)\s*=',
                    r'let\s+(\w+)\s*=',
                    r'const\s+(\w+)\s*=',
                    r'window\.(\w+)\s*='
                ]
                
                for pattern in patterns:
                    matches = re.finditer(pattern, content)
                    for match in matches:
                        var_name = match.group(1)
                        if var_name not in global_vars:
                            global_vars[var_name] = []
                        
                        global_vars[var_name].append({
                            'file': file_path,
                            'line': content[:match.start()].count('\n') + 1
                        })
            
            except Exception:
                continue
        
        # グローバル変数重複チェック
        for var_name, occurrences in global_vars.items():
            if len(occurrences) > 1:
                conflicts.append({
                    'type': 'global_variable_conflict',
                    'variable_name': var_name,
                    'occurrences': occurrences,
                    'message': f'グローバル変数 {var_name} が重複定義されています',
                    'severity': 'warning',
                    'suggestion': 'NAGANO3名前空間内で定義してください'
                })
        
        return conflicts
    
    def _calculate_conflict_score(self, findings: List[Dict[str, Any]]) -> float:
        """競合スコア計算"""
        if not findings:
            return 1.0
        
        critical_count = len([f for f in findings if f.get('severity') == 'critical'])
        warning_count = len([f for f in findings if f.get('severity') == 'warning'])
        
        penalty = critical_count * 0.3 + warning_count * 0.1
        return max(0.0, 1.0 - penalty)
    
    def _generate_conflict_recommendations(self, findings: List[Dict[str, Any]]) -> List[str]:
        """競合解決推奨事項"""
        recommendations = []
        
        if any(f.get('type') == 'function_conflict' for f in findings):
            recommendations.append("重複関数名を解決してください")
        
        if any(f.get('type') == 'library_conflict' for f in findings):
            recommendations.append("ライブラリ競合を解決してください")
        
        if any(f.get('type') == 'namespace_violation' for f in findings):
            recommendations.append("NAGANO3名前空間を使用してください")
        
        return recommendations


class PHPJavaScriptIntegrationValidationHook(BaseValidationHook):
    """Hook 3: PHP-JavaScript連携検証
    基盤: 03-PHPとJavaScript連携 797行仕様
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.ajax_patterns = self._load_ajax_patterns()
        self.integration_requirements = self._load_integration_requirements()
    
    def _load_ajax_patterns(self) -> Dict[str, str]:
        """Ajax連携パターン（ナレッジベース準拠）"""
        return {
            "nagano3_ajax_usage": r'NAGANO3\.ajax\.request\s*\(',
            "csrf_token_handling": r'csrf_token["\']?\s*:\s*["\']?\w+',
            "php_ajax_handler": r'function\s+handle_\w+_ajax\s*\(',
            "error_handling": r'catch\s*\([^)]*\)\s*{[\s\S]*?error',
            "success_response": r'success["\']?\s*:\s*true',
            "data_binding": r'data-\w+\s*=\s*["\'][^"\']*["\']'
        }
    
    def _load_integration_requirements(self) -> Dict[str, Any]:
        """統合要件（ナレッジベース準拠）"""
        return {
            "required_ajax_structure": {
                "csrf_protection": True,
                "error_handling": True,
                "data_validation": True,
                "response_format": "unified"
            },
            "php_requirements": {
                "handle_ajax_function": True,
                "secure_access_check": True,
                "input_sanitization": True,
                "unified_response": True
            }
        }
    
    def execute_validation(self, php_files: List[str], js_files: List[str]) -> Dict[str, Any]:
        """PHP-JavaScript統合検証"""
        result = super().execute_validation(php_files + js_files)
        findings = []
        
        # Ajax エンドポイント整合性チェック
        ajax_consistency = self._validate_ajax_endpoints(php_files, js_files)
        findings.extend(ajax_consistency)
        
        # CSRF トークン実装チェック
        csrf_validation = self._validate_csrf_implementation(php_files, js_files)
        findings.extend(csrf_validation)
        
        # データバインディング検証
        data_binding = self._validate_data_binding(php_files, js_files)
        findings.extend(data_binding)
        
        # エラーハンドリング統合チェック
        error_handling = self._validate_error_handling(php_files, js_files)
        findings.extend(error_handling)
        
        result.update({
            'validation_status': 'failed' if any(f.get('severity') == 'critical' for f in findings) else 'passed',
            'findings': findings,
            'compliance_score': self._calculate_integration_score(findings),
            'execution_time': self._calculate_execution_time(),
            'recommendations': self._generate_integration_recommendations(findings)
        })
        
        return result
    
    def _validate_ajax_endpoints(self, php_files: List[str], js_files: List[str]) -> List[Dict[str, Any]]:
        """Ajaxエンドポイント整合性検証"""
        findings = []
        
        # PHP側のAjaxハンドラー検索
        php_handlers = {}
        for file_path in php_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # handle_*_ajax 関数検索
                handler_matches = re.finditer(r'function\s+(handle_(\w+)_ajax)\s*\(', content)
                for match in handler_matches:
                    handler_name = match.group(1)
                    action_name = match.group(2)
                    php_handlers[action_name] = {
                        'file': file_path,
                        'function': handler_name,
                        'line': content[:match.start()].count('\n') + 1
                    }
            
            except Exception:
                continue
        
        # JavaScript側のAjax呼び出し検索
        js_calls = {}
        for file_path in js_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # NAGANO3.ajax.request 呼び出し検索
                ajax_matches = re.finditer(r'NAGANO3\.ajax\.request\s*\(\s*["\'](\w+)["\']', content)
                for match in matches:
                    action_name = match.group(1)
                    if action_name not in js_calls:
                        js_calls[action_name] = []
                    
                    js_calls[action_name].append({
                        'file': file_path,
                        'line': content[:match.start()].count('\n') + 1
                    })
            
            except Exception:
                continue
        
        # 整合性チェック
        for action_name in js_calls:
            if action_name not in php_handlers:
                findings.append({
                    'type': 'missing_php_handler',
                    'action': action_name,
                    'js_calls': js_calls[action_name],
                    'message': f'Ajax action "{action_name}" に対応するPHPハンドラーが見つかりません',
                    'severity': 'critical',
                    'suggestion': f'handle_{action_name}_ajax() 関数を実装してください'
                })
        
        for action_name in php_handlers:
            if action_name not in js_calls:
                findings.append({
                    'type': 'unused_php_handler',
                    'action': action_name,
                    'php_handler': php_handlers[action_name],
                    'message': f'PHPハンドラー "{action_name}" が使用されていません',
                    'severity': 'warning',
                    'suggestion': 'JavaScript側でAjax呼び出しを実装するか、不要な場合は削除してください'
                })
        
        return findings
    
    def _validate_csrf_implementation(self, php_files: List[str], js_files: List[str]) -> List[Dict[str, Any]]:
        """CSRF実装検証"""
        findings = []
        
        # JavaScript側CSRF実装チェック
        js_csrf_count = 0
        for file_path in js_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                csrf_matches = re.findall(r'csrf_token', content, re.IGNORECASE)
                js_csrf_count += len(csrf_matches)
            
            except Exception:
                continue
        
        # PHP側CSRF実装チェック
        php_csrf_count = 0
        for file_path in php_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                csrf_matches = re.findall(r'csrf_token|CSRF.*token', content, re.IGNORECASE)
                php_csrf_count += len(csrf_matches)
            
            except Exception:
                continue
        
        # CSRF実装評価
        if js_csrf_count == 0 and php_csrf_count == 0:
            findings.append({
                'type': 'missing_csrf_protection',
                'message': 'CSRF保護が実装されていません',
                'severity': 'critical',
                'suggestion': 'Ajax呼び出し時にCSRFトークンを送信してください'
            })
        elif js_csrf_count > 0 and php_csrf_count == 0:
            findings.append({
                'type': 'incomplete_csrf_protection',
                'message': 'JavaScript側にCSRF実装がありますが、PHP側で検証されていません',
                'severity': 'critical',
                'suggestion': 'PHP側でCSRFトークン検証を実装してください'
            })
        
        return findings
    
    def _validate_data_binding(self, php_files: List[str], js_files: List[str]) -> List[Dict[str, Any]]:
        """データバインディング検証"""
        findings = []
        
        # data-* 属性使用チェック
        for file_path in php_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # data-* 属性検索
                data_attrs = re.findall(r'data-([a-zA-Z0-9-]+)', content)
                
                # JavaScript側での対応チェック（簡易版）
                for attr in set(data_attrs):
                    js_usage_found = False
                    for js_file in js_files:
                        try:
                            with open(js_file, 'r', encoding='utf-8') as js_f:
                                js_content = js_f.read()
                            
                            if f'data-{attr}' in js_content or attr.replace('-', '') in js_content:
                                js_usage_found = True
                                break
                        except Exception:
                            continue
                    
                    if not js_usage_found:
                        findings.append({
                            'type': 'unused_data_attribute',
                            'attribute': f'data-{attr}',
                            'file': file_path,
                            'message': f'data-{attr} 属性がJavaScript側で使用されていません',
                            'severity': 'warning',
                            'suggestion': 'JavaScript側でデータ属性を活用するか、不要な場合は削除してください'
                        })
            
            except Exception:
                continue
        
        return findings
    
    def _validate_error_handling(self, php_files: List[str], js_files: List[str]) -> List[Dict[str, Any]]:
        """エラーハンドリング統合検証"""
        findings = []
        
        # JavaScript側エラーハンドリングチェック
        for file_path in js_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Ajax呼び出しでエラーハンドリングがあるかチェック
                ajax_calls = re.finditer(r'NAGANO3\.ajax\.request\s*\([^)]+\)', content, re.DOTALL)
                for match in ajax_calls:
                    call_text = match.group(0)
                    line_num = content[:match.start()].count('\n') + 1
                    
                    # try-catch または .catch() の存在確認
                    context_start = max(0, match.start() - 200)
                    context_end = min(len(content), match.end() + 200)
                    context = content[context_start:context_end]
                    
                    has_error_handling = (
                        'try' in context and 'catch' in context or
                        '.catch(' in context or
                        'error' in call_text.lower()
                    )
                    
                    if not has_error_handling:
                        findings.append({
                            'type': 'missing_ajax_error_handling',
                            'file': file_path,
                            'line': line_num,
                            'message': 'Ajax呼び出しにエラーハンドリングがありません',
                            'severity': 'warning',
                            'suggestion': 'try-catch または .catch() でエラーハンドリングを実装してください'
                        })
            
            except Exception:
                continue
        
        return findings
    
    def _calculate_integration_score(self, findings: List[Dict[str, Any]]) -> float:
        """統合スコア計算"""
        if not findings:
            return 1.0
        
        critical_count = len([f for f in findings if f.get('severity') == 'critical'])
        warning_count = len([f for f in findings if f.get('severity') == 'warning'])
        
        penalty = critical_count * 0.25 + warning_count * 0.1
        return max(0.0, 1.0 - penalty)
    
    def _generate_integration_recommendations(self, findings: List[Dict[str, Any]]) -> List[str]:
        """統合改善推奨事項"""
        recommendations = []
        
        if any(f.get('type') == 'missing_php_handler' for f in findings):
            recommendations.append("不足しているPHP Ajaxハンドラーを実装してください")
        
        if any(f.get('type') == 'missing_csrf_protection' for f in findings):
            recommendations.append("CSRF保護を実装してください")
        
        if any(f.get('type') == 'missing_ajax_error_handling' for f in findings):
            recommendations.append("Ajax呼び出しにエラーハンドリングを追加してください")
        
        return recommendations


# Hook 4-6: 追加実装（分割ファイルシステム、エラーハンドリング、ライブラリ競合）
class SplitFileSystemValidationHook(BaseValidationHook):
    """Hook 4: 分割ファイルシステム検証"""
    
    def execute_validation(self, js_files: List[str]) -> Dict[str, Any]:
        """分割ファイルシステム検証実行"""
        result = super().execute_validation(js_files)
        findings = []
        
        # main.js 存在確認
        main_js_found = any('main.js' in f for f in js_files)
        if not main_js_found:
            findings.append({
                'type': 'missing_main_js',
                'message': 'main.js が見つかりません',
                'severity': 'critical',
                'suggestion': 'main.js を実装してください'
            })
        
        # NAGANO3.splitFiles.markLoaded() 使用チェック
        for file_path in js_files:
            if 'main.js' in file_path:
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if 'markLoaded' not in content:
                    findings.append({
                        'type': 'missing_mark_loaded',
                        'file': file_path,
                        'message': 'markLoaded() 呼び出しがありません',
                        'severity': 'warning',
                        'suggestion': 'NAGANO3.splitFiles.markLoaded() を追加してください'
                    })
            
            except Exception:
                continue
        
        result.update({
            'validation_status': 'failed' if any(f.get('severity') == 'critical' for f in findings) else 'passed',
            'findings': findings,
            'compliance_score': 1.0 - len(findings) * 0.1,
            'execution_time': self._calculate_execution_time(),
            'recommendations': ['分割ファイルシステムに完全準拠してください']
        })
        
        return result


class JavaScriptErrorHandlingValidationHook(BaseValidationHook):
    """Hook 5: JavaScriptエラーハンドリング検証"""
    
    def execute_validation(self, js_files: List[str]) -> Dict[str, Any]:
        """エラーハンドリング検証実行"""
        result = super().execute_validation(js_files)
        findings = []
        
        for file_path in js_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # グローバルエラーハンドリング確認
                if 'window.addEventListener' in content and 'error' in content:
                    findings.append({
                        'type': 'global_error_handler_found',
                        'file': file_path,
                        'message': 'グローバルエラーハンドリングが実装されています',
                        'severity': 'info'
                    })
                
                # try-catch 使用確認
                try_catch_count = len(re.findall(r'try\s*{[\s\S]*?}\s*catch', content))
                if try_catch_count == 0:
                    findings.append({
                        'type': 'no_try_catch',
                        'file': file_path,
                        'message': 'try-catch によるエラーハンドリングがありません',
                        'severity': 'warning',
                        'suggestion': '重要な処理にはtry-catchを追加してください'
                    })
            
            except Exception:
                continue
        
        result.update({
            'validation_status': 'passed',
            'findings': findings,
            'compliance_score': 0.9,
            'execution_time': self._calculate_execution_time(),
            'recommendations': ['エラーハンドリングを強化してください']
        })
        
        return result


class LibraryConflictValidationHook(BaseValidationHook):
    """Hook 6: 外部ライブラリ競合検証"""
    
    def execute_validation(self, js_files: List[str]) -> Dict[str, Any]:
        """ライブラリ競合検証実行"""
        result = super().execute_validation(js_files)
        findings = []
        
        for file_path in js_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # jQuery noConflict チェック
                if '$(' in content and 'noConflict' not in content:
                    findings.append({
                        'type': 'jquery_conflict_risk',
                        'file': file_path,
                        'message': 'jQuery $ 使用時は noConflict() を推奨',
                        'severity': 'warning',
                        'suggestion': 'jQuery.noConflict() を使用してください'
                    })
                
                # NAGANO3 名前空間チェック
                if 'NAGANO3.' in content:
                    findings.append({
                        'type': 'nagano3_namespace_used',
                        'file': file_path,
                        'message': 'NAGANO3名前空間が使用されています',
                        'severity': 'info'
                    })
            
            except Exception:
                continue
        
        result.update({
            'validation_status': 'passed',
            'findings': findings,
            'compliance_score': 0.95,
            'execution_time': self._calculate_execution_time(),
            'recommendations': ['ライブラリ競合リスクを確認してください']
        })
        
        return result


# 実行例
if __name__ == "__main__":
    # テスト用の設定
    config = {
        "strict_mode": True,
        "knowledge_base_compliance": True
    }
    
    # Hook 1: ES6構文検証テスト
    es6_hook = JavaScriptES6SyntaxValidationHook(config)
    result1 = es6_hook.execute_validation(['test.js', 'main.js'])
    print("Hook 1 (ES6構文検証):", json.dumps(result1, ensure_ascii=False, indent=2))
    
    # Hook 2: 競合検出テスト
    conflict_hook = JavaScriptConflictDetectionHook(config)
    result2 = conflict_hook.execute_validation(['test.js', 'main.js', 'module.js'])
    print("Hook 2 (競合検出):", json.dumps(result2, ensure_ascii=False, indent=2))
    
    # Hook 3: PHP-JS統合テスト
    integration_hook = PHPJavaScriptIntegrationValidationHook(config)
    result3 = integration_hook.execute_validation(['test.php'], ['test.js'])
    print("Hook 3 (PHP-JS統合):", json.dumps(result3, ensure_ascii=False, indent=2))
