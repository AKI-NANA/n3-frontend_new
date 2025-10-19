#!/usr/bin/env python3
"""
✅ 品質保証Hooks
Universal Hooks - コード品質・テスト・標準準拠確認

ファイル: ~/.claude/hooks/universal/quality_assurance.py
"""

import os
import re
import json
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

class QualityAssuranceHooks:
    """品質保証Hooks"""
    
    def __init__(self, project_path: str = "."):
        self.project_path = Path(project_path).resolve()
        self.hooks_name = "Quality Assurance"
        self.auto_answers = self.load_auto_answers()
        
    def load_auto_answers(self) -> Dict:
        """自動回答データベース読み込み"""
        try:
            answers_path = Path("~/.claude/database/auto_answers.json").expanduser()
            if answers_path.exists():
                with open(answers_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except:
            pass
        return {}
    
    def execute_hooks(self, project_analysis: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """品質保証メイン実行"""
        
        print(f"✅ {self.hooks_name} 実行中...")
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "hooks_name": self.hooks_name,
            "project_path": str(self.project_path),
            "project_type": project_analysis.get("project_type", {}).get("primary_type", "unknown") if project_analysis else "unknown",
            "quality_checks": {},
            "issues_found": [],
            "recommendations": [],
            "auto_answers_applied": [],
            "questions_for_human": [],
            "overall_score": 0
        }
        
        try:
            # 品質チェック実行
            quality_checks = {
                "coding_standards": self._check_coding_standards(),
                "documentation": self._check_documentation(),
                "testing_framework": self._check_testing_framework(),
                "error_handling": self._check_error_handling(),
                "performance": self._check_performance(),
                "maintainability": self._check_maintainability(),
                "code_organization": self._check_code_organization(),
                "best_practices": self._check_best_practices()
            }
            
            result["quality_checks"] = quality_checks
            result["overall_score"] = self._calculate_quality_score(quality_checks)
            
            # 問題点・推奨事項生成
            result["issues_found"] = self._collect_quality_issues(quality_checks)
            result["recommendations"] = self._generate_quality_recommendations(quality_checks)
            
            # 自動回答適用
            result["auto_answers_applied"] = self.apply_auto_answers(result["project_type"])
            
            # 人間への質問生成
            result["questions_for_human"] = self._generate_human_questions(quality_checks, result["project_type"])
            
            print(f"✅ {self.hooks_name} 完了 - スコア: {result['overall_score']}/100")
            return result
            
        except Exception as e:
            result["error"] = str(e)
            result["overall_score"] = 0
            print(f"❌ {self.hooks_name} エラー: {e}")
            return result
    
    def _check_coding_standards(self) -> Dict[str, Any]:
        """コーディング規約チェック"""
        
        standards_compliance = []
        issues = []
        php_files = list(self.project_path.rglob("*.php"))
        js_files = list(self.project_path.rglob("*.js"))
        
        # PHP コーディング規約チェック
        for php_file in php_files[:10]:  # 最初の10ファイルをサンプル
            try:
                content = php_file.read_text(encoding='utf-8')
                
                # PSR準拠チェック
                if re.search(r'<\?php\s*\n', content):
                    standards_compliance.append("PHP opening tag (PSR-1)")
                
                # 命名規則チェック
                if re.search(r'class\s+[A-Z][A-Za-z0-9]*', content):
                    standards_compliance.append("Class naming (PascalCase)")
                
                if re.search(r'function\s+[a-z][A-Za-z0-9]*', content):
                    standards_compliance.append("Function naming (camelCase)")
                
                # インデントチェック（4スペース推奨）
                lines = content.split('\n')
                inconsistent_indent = False
                for line in lines:
                    if line.startswith(' '):
                        if not (len(line) - len(line.lstrip())) % 4 == 0:
                            inconsistent_indent = True
                            break
                
                if inconsistent_indent:
                    issues.append(f"Inconsistent indentation: {php_file.name}")
                
                # 長い行のチェック（120文字制限）
                long_lines = [i+1 for i, line in enumerate(lines) if len(line) > 120]
                if long_lines:
                    issues.append(f"Long lines (>120 chars): {php_file.name}")
                
            except:
                continue
        
        # JavaScript コーディング規約チェック
        for js_file in js_files[:5]:  # 最初の5ファイルをサンプル
            try:
                content = js_file.read_text(encoding='utf-8')
                
                # ES6+ 機能の使用
                if 'const ' in content or 'let ' in content:
                    standards_compliance.append("Modern JavaScript (ES6+)")
                
                # セミコロンの使用
                semicolon_lines = len([line for line in content.split('\n') 
                                     if line.strip().endswith(';') and 
                                     not line.strip().startswith('//')])
                total_statements = len([line for line in content.split('\n') 
                                      if line.strip() and 
                                      not line.strip().startswith('//') and
                                      not line.strip().startswith('/*')])
                
                if total_statements > 0 and semicolon_lines / total_statements > 0.8:
                    standards_compliance.append("Consistent semicolon usage")
                
            except:
                continue
        
        # コード整形ツールの使用確認
        formatter_configs = []
        for config_file in [".prettierrc", ".eslintrc", "phpcs.xml", ".php_cs"]:
            if (self.project_path / config_file).exists():
                formatter_configs.append(config_file)
        
        if formatter_configs:
            standards_compliance.append(f"Code formatting tools: {', '.join(formatter_configs)}")
        
        compliance_score = len(set(standards_compliance))
        issues_count = len(issues)
        
        status = "pass" if compliance_score >= 4 and issues_count <= 2 else "warning" if compliance_score >= 2 else "fail"
        
        return {
            "status": status,
            "compliance": list(set(standards_compliance)),
            "issues": issues,
            "formatter_configs": formatter_configs,
            "score": f"{compliance_score}/6",
            "message": f"コーディング規約: {status}"
        }
    
    def _check_documentation(self) -> Dict[str, Any]:
        """ドキュメント品質チェック"""
        
        documentation_files = []
        inline_docs = []
        api_docs = []
        
        # READMEファイル
        readme_files = list(self.project_path.rglob("README*"))
        documentation_files.extend([str(f) for f in readme_files])
        
        # その他のドキュメント
        doc_patterns = ["*.md", "docs/*", "doc/*", "documentation/*"]
        for pattern in doc_patterns:
            doc_files = list(self.project_path.rglob(pattern))
            documentation_files.extend([str(f) for f in doc_files if f not in readme_files])
        
        # インラインドキュメント（PHPDoc、JSDoc）
        code_files = list(self.project_path.rglob("*.php")) + list(self.project_path.rglob("*.js"))
        
        for code_file in code_files[:10]:  # サンプル
            try:
                content = code_file.read_text(encoding='utf-8')
                
                # PHPDoc
                if re.search(r'/\*\*.*@param.*\*/', content, re.DOTALL):
                    inline_docs.append(f"PHPDoc: {code_file.name}")
                
                # JSDoc
                if re.search(r'/\*\*.*@param.*\*/', content, re.DOTALL) and code_file.suffix == '.js':
                    inline_docs.append(f"JSDoc: {code_file.name}")
                
                # コメント率
                comment_lines = len(re.findall(r'^\s*(/\*|\*|//)', content, re.MULTILINE))
                total_lines = len(content.split('\n'))
                
                if total_lines > 0 and comment_lines / total_lines > 0.1:
                    inline_docs.append(f"Good comment ratio: {code_file.name}")
                
            except:
                continue
        
        # API ドキュメント
        api_doc_files = list(self.project_path.rglob("*api*")) + list(self.project_path.rglob("*swagger*"))
        api_docs.extend([str(f) for f in api_doc_files if f.suffix in ['.md', '.yml', '.yaml', '.json']])
        
        doc_score = len(documentation_files) + len(set(inline_docs)) + len(api_docs)
        status = "pass" if doc_score >= 5 else "warning" if doc_score >= 2 else "fail"
        
        return {
            "status": status,
            "documentation_files": list(set(documentation_files)),
            "inline_docs": list(set(inline_docs)),
            "api_docs": api_docs,
            "score": f"{doc_score}/10",
            "message": f"ドキュメント: {status}"
        }
    
    def _check_testing_framework(self) -> Dict[str, Any]:
        """テストフレームワークチェック"""
        
        test_frameworks = []
        test_files = []
        test_configs = []
        
        # PHPテストフレームワーク
        if (self.project_path / "phpunit.xml").exists():
            test_frameworks.append("PHPUnit")
            test_configs.append("phpunit.xml")
        
        # JavaScriptテストフレームワーク
        package_json = self.project_path / "package.json"
        if package_json.exists():
            try:
                content = package_json.read_text(encoding='utf-8')
                js_test_frameworks = ['jest', 'mocha', 'jasmine', 'cypress', 'playwright']
                for framework in js_test_frameworks:
                    if framework in content.lower():
                        test_frameworks.append(framework.title())
            except:
                pass
        
        # テストディレクトリ
        test_dirs = ["tests", "test", "__tests__", "spec"]
        for test_dir in test_dirs:
            test_path = self.project_path / test_dir
            if test_path.exists() and test_path.is_dir():
                test_files.extend([str(f) for f in test_path.rglob("*.php")])
                test_files.extend([str(f) for f in test_path.rglob("*.js")])
        
        # テストファイルパターン
        test_patterns = ["*Test.php", "*test.js", "*.test.js", "*.spec.js"]
        for pattern in test_patterns:
            test_files.extend([str(f) for f in self.project_path.rglob(pattern)])
        
        test_files = list(set(test_files))
        
        # カバレッジ設定
        coverage_configs = []
        if (self.project_path / ".coveralls.yml").exists():
            coverage_configs.append("Coveralls")
        if (self.project_path / "codecov.yml").exists():
            coverage_configs.append("Codecov")
        
        framework_count = len(test_frameworks)
        test_file_count = len(test_files)
        
        status = "pass" if framework_count >= 1 and test_file_count >= 3 else "warning" if framework_count >= 1 or test_file_count >= 1 else "fail"
        
        return {
            "status": status,
            "frameworks": test_frameworks,
            "test_files": test_files,
            "test_configs": test_configs,
            "coverage_configs": coverage_configs,
            "test_file_count": test_file_count,
            "message": f"テストフレームワーク: {status}"
        }
    
    def _check_error_handling(self) -> Dict[str, Any]:
        """エラーハンドリングチェック"""
        
        error_handling = []
        exception_patterns = []
        
        php_files = list(self.project_path.rglob("*.php"))
        js_files = list(self.project_path.rglob("*.js"))
        
        # PHP エラーハンドリング
        for php_file in php_files[:10]:
            try:
                content = php_file.read_text(encoding='utf-8')
                
                # try-catch の使用
                if re.search(r'try\s*{.*catch\s*\(', content, re.DOTALL):
                    error_handling.append(f"Try-catch: {php_file.name}")
                
                # カスタム例外
                if re.search(r'class\s+\w*Exception\s+extends', content):
                    exception_patterns.append(f"Custom exceptions: {php_file.name}")
                
                # エラーログ
                if 'error_log(' in content:
                    error_handling.append(f"Error logging: {php_file.name}")
                
                # 例外の再スロー
                if 'throw new' in content:
                    exception_patterns.append(f"Exception throwing: {php_file.name}")
                
            except:
                continue
        
        # JavaScript エラーハンドリング
        for js_file in js_files[:5]:
            try:
                content = js_file.read_text(encoding='utf-8')
                
                # try-catch
                if re.search(r'try\s*{.*catch\s*\(', content, re.DOTALL):
                    error_handling.append(f"JS Try-catch: {js_file.name}")
                
                # Promise error handling
                if '.catch(' in content:
                    error_handling.append(f"Promise error handling: {js_file.name}")
                
                # Console error
                if 'console.error' in content:
                    error_handling.append(f"Console error logging: {js_file.name}")
                
            except:
                continue
        
        error_handling = list(set(error_handling))
        exception_patterns = list(set(exception_patterns))
        
        handling_score = len(error_handling) + len(exception_patterns)
        status = "pass" if handling_score >= 4 else "warning" if handling_score >= 2 else "fail"
        
        return {
            "status": status,
            "error_handling": error_handling,
            "exception_patterns": exception_patterns,
            "score": f"{handling_score}/8",
            "message": f"エラーハンドリング: {status}"
        }
    
    def _check_performance(self) -> Dict[str, Any]:
        """パフォーマンスチェック"""
        
        performance_practices = []
        potential_issues = []
        
        php_files = list(self.project_path.rglob("*.php"))
        js_files = list(self.project_path.rglob("*.js"))
        
        # PHP パフォーマンス
        for php_file in php_files[:10]:
            try:
                content = php_file.read_text(encoding='utf-8')
                
                # データベースクエリ最適化
                if 'prepare(' in content:
                    performance_practices.append("Prepared statements")
                
                # キャッシュの使用
                cache_patterns = ['cache', 'redis', 'memcache', 'apc']
                for pattern in cache_patterns:
                    if pattern.lower() in content.lower():
                        performance_practices.append(f"Caching: {pattern}")
                        break
                
                # 潜在的な問題
                if re.search(r'SELECT\s+\*\s+FROM', content, re.IGNORECASE):
                    potential_issues.append(f"SELECT * usage: {php_file.name}")
                
                # ループ内クエリ（N+1問題）
                if re.search(r'for.*{.*query.*}', content, re.DOTALL | re.IGNORECASE):
                    potential_issues.append(f"Potential N+1 queries: {php_file.name}")
                
            except:
                continue
        
        # JavaScript パフォーマンス
        for js_file in js_files[:5]:
            try:
                content = js_file.read_text(encoding='utf-8')
                
                # 非同期処理
                if 'async' in content or 'await' in content:
                    performance_practices.append("Async/await usage")
                
                # DOM クエリ最適化
                if 'getElementById' in content or 'querySelector' in content:
                    performance_practices.append("Efficient DOM queries")
                
                # 潜在的な問題
                if 'document.write' in content:
                    potential_issues.append(f"document.write usage: {js_file.name}")
                
            except:
                continue
        
        performance_practices = list(set(performance_practices))
        
        perf_score = len(performance_practices)
        issues_count = len(potential_issues)
        
        status = "pass" if perf_score >= 3 and issues_count <= 1 else "warning" if perf_score >= 1 else "fail"
        
        return {
            "status": status,
            "practices": performance_practices,
            "potential_issues": potential_issues,
            "score": f"{perf_score}/6",
            "message": f"パフォーマンス: {status}"
        }
    
    def _check_maintainability(self) -> Dict[str, Any]:
        """保守性チェック"""
        
        maintainability_factors = []
        complexity_issues = []
        
        php_files = list(self.project_path.rglob("*.php"))
        
        # ファイルサイズチェック
        large_files = []
        for php_file in php_files:
            try:
                content = php_file.read_text(encoding='utf-8')
                lines = len(content.split('\n'))
                
                if lines > 500:
                    large_files.append(f"{php_file.name} ({lines} lines)")
                elif lines < 200:
                    maintainability_factors.append(f"Manageable file size: {php_file.name}")
                
                # 関数の複雑度（簡易チェック）
                functions = re.findall(r'function\s+(\w+)', content)
                for func in functions:
                    func_content = content[content.find(f'function {func}'):]
                    if func_content.find('function ') != -1:
                        next_func = func_content.find('function ', 1)
                        if next_func != -1:
                            func_content = func_content[:next_func]
                    
                    # 分岐の数（if, for, while, switch）
                    branches = len(re.findall(r'\b(if|for|while|switch)\b', func_content))
                    if branches > 10:
                        complexity_issues.append(f"Complex function {func}: {branches} branches")
                
            except:
                continue
        
        if large_files:
            complexity_issues.extend(large_files)
        
        # モジュール構造
        has_modules = False
        module_dirs = ['src', 'lib', 'classes', 'modules', 'components']
        for module_dir in module_dirs:
            if (self.project_path / module_dir).exists():
                has_modules = True
                maintainability_factors.append(f"Modular structure: {module_dir}")
        
        # 設定の分離
        config_separation = []
        config_files = list(self.project_path.rglob("*config*"))
        if config_files:
            config_separation.append("Configuration separation")
            maintainability_factors.append("Config files present")
        
        maintainability_score = len(maintainability_factors)
        complexity_score = len(complexity_issues)
        
        status = "pass" if maintainability_score >= 3 and complexity_score <= 2 else "warning" if maintainability_score >= 2 else "fail"
        
        return {
            "status": status,
            "factors": maintainability_factors,
            "complexity_issues": complexity_issues,
            "has_modules": has_modules,
            "score": f"{maintainability_score}/6",
            "message": f"保守性: {status}"
        }
    
    def _check_code_organization(self) -> Dict[str, Any]:
        """コード組織化チェック"""
        
        organization_patterns = []
        structure_score = 0
        
        # ディレクトリ構造の確認
        common_dirs = [
            ('src', 'ソースコード'),
            ('lib', 'ライブラリ'),
            ('config', '設定'),
            ('public', '公開ファイル'),
            ('assets', 'アセット'),
            ('vendor', '外部依存関係'),
            ('tests', 'テスト'),
            ('docs', 'ドキュメント')
        ]
        
        for dir_name, description in common_dirs:
            if (self.project_path / dir_name).exists():
                organization_patterns.append(f"{description}: {dir_name}")
                structure_score += 1
        
        # ファイル命名規則
        naming_patterns = []
        
        php_files = list(self.project_path.rglob("*.php"))
        for php_file in php_files[:5]:
            # PascalCase for classes
            if re.search(r'^[A-Z][A-Za-z0-9]*\.php$', php_file.name):
                naming_patterns.append("PascalCase class files")
            
            # camelCase for regular files
            if re.search(r'^[a-z][A-Za-z0-9]*\.php$', php_file.name):
                naming_patterns.append("camelCase naming")
        
        naming_patterns = list(set(naming_patterns))
        
        # 分離の確認
        separation_patterns = []
        
        # MVC パターン
        mvc_dirs = ['models', 'views', 'controllers']
        mvc_found = sum(1 for dir_name in mvc_dirs if (self.project_path / dir_name).exists())
        if mvc_found >= 2:
            separation_patterns.append("MVC pattern separation")
        
        # CSS/JS 分離
        if (self.project_path / "css").exists() or (self.project_path / "js").exists():
            separation_patterns.append("CSS/JS separation")
        
        organization_score = structure_score + len(naming_patterns) + len(separation_patterns)
        status = "pass" if organization_score >= 5 else "warning" if organization_score >= 3 else "fail"
        
        return {
            "status": status,
            "organization_patterns": organization_patterns,
            "naming_patterns": naming_patterns,
            "separation_patterns": separation_patterns,
            "structure_score": structure_score,
            "score": f"{organization_score}/10",
            "message": f"コード組織化: {status}"
        }
    
    def _check_best_practices(self) -> Dict[str, Any]:
        """ベストプラクティスチェック"""
        
        best_practices = []
        anti_patterns = []
        
        php_files = list(self.project_path.rglob("*.php"))
        
        for php_file in php_files[:10]:
            try:
                content = php_file.read_text(encoding='utf-8')
                
                # ベストプラクティス
                if 'namespace' in content:
                    best_practices.append("Namespace usage")
                
                if 'use ' in content:
                    best_practices.append("Use statements")
                
                if re.search(r'class\s+\w+\s+implements\s+\w+', content):
                    best_practices.append("Interface implementation")
                
                if 'private ' in content or 'protected ' in content:
                    best_practices.append("Encapsulation")
                
                # アンチパターン
                if 'global $' in content:
                    anti_patterns.append(f"Global variables: {php_file.name}")
                
                if 'goto ' in content:
                    anti_patterns.append(f"Goto usage: {php_file.name}")
                
                if re.search(r'eval\s*\(', content):
                    anti_patterns.append(f"Eval usage: {php_file.name}")
                
            except:
                continue
        
        best_practices = list(set(best_practices))
        
        practices_score = len(best_practices)
        anti_patterns_count = len(anti_patterns)
        
        status = "pass" if practices_score >= 3 and anti_patterns_count == 0 else "warning" if practices_score >= 2 else "fail"
        
        return {
            "status": status,
            "best_practices": best_practices,
            "anti_patterns": anti_patterns,
            "score": f"{practices_score}/6",
            "message": f"ベストプラクティス: {status}"
        }
    
    def _calculate_quality_score(self, checks: Dict[str, Any]) -> int:
        """品質スコア計算"""
        
        total_score = 0
        max_score = 0
        
        weights = {
            "coding_standards": 20,
            "documentation": 15,
            "testing_framework": 15,
            "error_handling": 15,
            "performance": 10,
            "maintainability": 10,
            "code_organization": 10,
            "best_practices": 5
        }
        
        for check_name, weight in weights.items():
            max_score += weight
            
            if check_name in checks:
                status = checks[check_name].get("status", "fail")
                if status == "pass":
                    total_score += weight
                elif status == "warning":
                    total_score += weight // 2
        
        return int((total_score / max_score) * 100) if max_score > 0 else 0
    
    def _collect_quality_issues(self, checks: Dict[str, Any]) -> List[str]:
        """品質問題収集"""
        
        issues = []
        
        for check_name, result in checks.items():
            if result.get("status") == "fail":
                issues.append(f"{check_name}: {result.get('message', 'Failed')}")
            elif result.get("status") == "warning":
                issues.append(f"{check_name}: {result.get('message', 'Needs improvement')}")
        
        return issues
    
    def _generate_quality_recommendations(self, checks: Dict[str, Any]) -> List[str]:
        """品質推奨事項生成"""
        
        recommendations = []
        
        # コーディング規約
        if checks.get("coding_standards", {}).get("status") != "pass":
            recommendations.append("コーディング規約の採用（PSR-12 for PHP、ESLint for JavaScript）")
        
        # ドキュメント
        if checks.get("documentation", {}).get("status") != "pass":
            recommendations.append("READMEファイルとインラインドキュメント（PHPDoc/JSDoc）の作成")
        
        # テスト
        if checks.get("testing_framework", {}).get("status") != "pass":
            recommendations.append("テストフレームワーク（PHPUnit/Jest等）の導入と単体テストの作成")
        
        # エラーハンドリング
        if checks.get("error_handling", {}).get("status") != "pass":
            recommendations.append("適切なエラーハンドリング（try-catch、カスタム例外）の実装")
        
        # パフォーマンス
        if checks.get("performance", {}).get("status") != "pass":
            recommendations.append("パフォーマンス最適化（クエリ最適化、キャッシュ活用）")
        
        # 保守性
        if checks.get("maintainability", {}).get("status") != "pass":
            recommendations.append("コードの分割とモジュール化による保守性向上")
        
        return recommendations
    
    def apply_auto_answers(self, project_type: str) -> List[str]:
        """品質関連自動回答適用"""
        
        answers = []
        
        # NAGANO3プロジェクト特有の自動回答
        if "nagano3" in project_type.lower() or "kicho" in project_type.lower():
            nagano3_answers = self.auto_answers.get("auto_answers_database", {}).get("project_templates", {}).get("nagano3_kicho", {}).get("universal_answers", {}).get("quality_standards", {})
            
            for key, value in nagano3_answers.items():
                answers.append(f"{key}: {value}")
        else:
            # 汎用プロジェクト自動回答
            answers.extend([
                "コーディング規約: PSR-12（PHP）、ESLint（JavaScript）準拠",
                "ドキュメント: README + インラインドキュメント必須",
                "テスト: PHPUnit/Jest等のフレームワーク使用",
                "エラーハンドリング: 全例外の適切な処理",
                "品質目標: コードカバレッジ80%以上",
                "コードレビュー: プルリクエストベースのレビュー"
            ])
        
        return answers
    
    def _generate_human_questions(self, checks: Dict[str, Any], project_type: str) -> List[str]:
        """人間への質問生成"""
        
        questions = []
        
        # テスト戦略
        if checks.get("testing_framework", {}).get("status") == "fail":
            questions.append("テスト戦略を教えてください（単体テスト・結合テスト・E2Eテストの方針）")
        
        # コード品質目標
        questions.append("コード品質の目標を教えてください（カバレッジ率・静的解析基準等）")
        
        # ドキュメント要件
        if checks.get("documentation", {}).get("status") == "fail":
            questions.append("ドキュメント要件を教えてください（API仕様書・運用マニュアル等）")
        
        # レビュープロセス
        if "nagano3" not in project_type.lower():
            questions.append("コードレビュープロセスを教えてください（レビュアー・承認フロー等）")
        
        return questions

def main():
    """品質保証Hooks単体テスト"""
    
    project_path = sys.argv[1] if len(sys.argv) > 1 else "."
    
    hooks = QualityAssuranceHooks(project_path)
    result = hooks.execute_hooks()
    
    print("\n" + "="*60)
    print("✅ Quality Assurance Hooks 実行結果")
    print("="*60)
    print(f"📊 総合スコア: {result['overall_score']}/100")
    print(f"⚠️ 検出問題: {len(result['issues_found'])}件")
    print(f"💡 推奨事項: {len(result['recommendations'])}件")
    print(f"✅ 自動回答: {len(result['auto_answers_applied'])}件")
    
    return result['overall_score'] >= 75

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)