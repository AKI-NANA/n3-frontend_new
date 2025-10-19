#!/usr/bin/env python3
"""
✅ 品質保証Hooks
Universal Hooks - 品質基準・テスト・コーディング規約確認

ファイル: ~/.claude/hooks/universal/quality_assurance.py
"""

import os
import re
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

class QualityAssuranceHooks:
    """品質保証Hooks"""
    
    def __init__(self, project_path: str = "."):
        self.project_path = Path(project_path).resolve()
        self.auto_answers = self.load_auto_answers()
        self.quality_checks = []
        self.issues_found = []
        
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
    
    def execute_quality_assurance(self, project_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """品質保証メイン実行"""
        
        print("✅ 品質保証Hooks実行中...")
        
        qa_results = {
            "timestamp": datetime.now().isoformat(),
            "project_path": str(self.project_path),
            "project_type": project_analysis.get("project_type", {}).get("primary_type", "unknown"),
            "quality_checks": [],
            "code_metrics": {},
            "test_coverage": {},
            "documentation_status": {},
            "coding_standards": {},
            "issues_found": [],
            "recommendations": [],
            "auto_answers_applied": [],
            "questions_for_human": [],
            "overall_score": 0
        }
        
        try:
            # 1. コード品質メトリクス確認
            metrics_result = self.check_code_metrics()
            qa_results["quality_checks"].append(metrics_result)
            qa_results["code_metrics"] = metrics_result.get("details", {})
            
            # 2. テスト実装・カバレッジ確認
            test_result = self.check_test_implementation()
            qa_results["quality_checks"].append(test_result)
            qa_results["test_coverage"] = test_result.get("details", {})
            
            # 3. ドキュメント確認
            doc_result = self.check_documentation()
            qa_results["quality_checks"].append(doc_result)
            qa_results["documentation_status"] = doc_result.get("details", {})
            
            # 4. コーディング規約確認
            standards_result = self.check_coding_standards()
            qa_results["quality_checks"].append(standards_result)
            qa_results["coding_standards"] = standards_result.get("details", {})
            
            # 5. エラーハンドリング確認
            error_result = self.check_error_handling()
            qa_results["quality_checks"].append(error_result)
            
            # 6. パフォーマンス考慮確認
            performance_result = self.check_performance_considerations()
            qa_results["quality_checks"].append(performance_result)
            
            # 7. コードレビュー・CI/CD確認
            review_result = self.check_review_and_cicd()
            qa_results["quality_checks"].append(review_result)
            
            # 自動回答適用
            qa_results["auto_answers_applied"] = self.apply_auto_answers(
                qa_results["project_type"]
            )
            
            # 問題集計・推奨事項生成
            qa_results["issues_found"] = self.collect_all_issues()
            qa_results["recommendations"] = self.generate_recommendations()
            qa_results["questions_for_human"] = self.generate_human_questions()
            qa_results["overall_score"] = self.calculate_quality_score()
            
            print(f"✅ 品質保証確認完了 - スコア: {qa_results['overall_score']}/100")
            return qa_results
            
        except Exception as e:
            qa_results["error"] = str(e)
            print(f"❌ 品質保証確認エラー: {e}")
            return qa_results
    
    def check_code_metrics(self) -> Dict[str, Any]:
        """コード品質メトリクス確認"""
        
        check_result = {
            "check_name": "Code Quality Metrics",
            "status": "unknown",
            "details": {},
            "issues": [],
            "auto_fixable": False
        }
        
        try:
            # ファイル・行数統計
            code_stats = {
                "total_files": 0,
                "php_files": 0,
                "js_files": 0,
                "py_files": 0,
                "total_lines": 0,
                "code_lines": 0,
                "comment_lines": 0,
                "blank_lines": 0
            }
            
            # ファイル解析
            code_extensions = {".php", ".js", ".py", ".html", ".css"}
            
            for file_path in self.project_path.rglob("*"):
                if file_path.is_file() and file_path.suffix.lower() in code_extensions:
                    code_stats["total_files"] += 1
                    
                    # ファイルタイプ別カウント
                    if file_path.suffix.lower() == ".php":
                        code_stats["php_files"] += 1
                    elif file_path.suffix.lower() == ".js":
                        code_stats["js_files"] += 1
                    elif file_path.suffix.lower() == ".py":
                        code_stats["py_files"] += 1
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            lines = f.readlines()
                            
                        code_stats["total_lines"] += len(lines)
                        
                        # 行の分類
                        for line in lines:
                            stripped_line = line.strip()
                            if not stripped_line:
                                code_stats["blank_lines"] += 1
                            elif (stripped_line.startswith("//") or 
                                  stripped_line.startswith("#") or 
                                  stripped_line.startswith("/*") or
                                  stripped_line.startswith("*")):
                                code_stats["comment_lines"] += 1
                            else:
                                code_stats["code_lines"] += 1
                                
                    except:
                        continue
            
            check_result["details"]["statistics"] = code_stats
            
            # 品質指標計算
            if code_stats["total_lines"] > 0:
                comment_ratio = (code_stats["comment_lines"] / code_stats["total_lines"]) * 100
                check_result["details"]["comment_ratio"] = round(comment_ratio, 2)
                
                if comment_ratio >= 20:
                    check_result["details"]["comment_assessment"] = "✅ 適切なコメント比率"
                elif comment_ratio >= 10:
                    check_result["details"]["comment_assessment"] = "⚠️ コメント比率やや低"
                    check_result["issues"].append("⚠️ コメント・ドキュメント不足")
                else:
                    check_result["details"]["comment_assessment"] = "❌ コメント比率低"
                    check_result["issues"].append("❌ コメント・ドキュメント大幅不足")
            
            # 複雑性の簡易指標
            avg_lines_per_file = (code_stats["code_lines"] / code_stats["total_files"]) if code_stats["total_files"] > 0 else 0
            check_result["details"]["avg_lines_per_file"] = round(avg_lines_per_file, 1)
            
            if avg_lines_per_file <= 200:
                check_result["details"]["complexity_assessment"] = "✅ 適切なファイルサイズ"
            elif avg_lines_per_file <= 500:
                check_result["details"]["complexity_assessment"] = "⚠️ ファイルサイズやや大"
                check_result["issues"].append("⚠️ 大きなファイルの分割検討")
            else:
                check_result["details"]["complexity_assessment"] = "❌ ファイルサイズ大"
                check_result["issues"].append("❌ ファイル分割・リファクタリング必要")
            
            # 重複コード簡易チェック（PHPファイル）
            duplicate_patterns = self.check_code_duplication()
            if duplicate_patterns:
                check_result["details"]["duplicate_code"] = f"⚠️ 重複パターン{len(duplicate_patterns)}個発見"
                check_result["issues"].append("⚠️ コード重複の解消推奨")
            else:
                check_result["details"]["duplicate_code"] = "✅ 重複コード未検出"
            
            # 総合判定
            issues_count = len(check_result["issues"])
            if issues_count == 0:
                check_result["status"] = "good"
            elif issues_count <= 2:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"コードレビュー・CI/CD確認エラー: {e}")
        
        return check_result
    
    def apply_auto_answers(self, project_type: str) -> List[str]:
        """自動回答適用"""
        
        applied_answers = []
        
        try:
            project_templates = self.auto_answers.get("auto_answers_database", {}).get("project_templates", {})
            
            if project_type in project_templates:
                template = project_templates[project_type]
                quality_standards = template.get("universal_answers", {}).get("quality_standards", {})
                
                for standard, answer in quality_standards.items():
                    applied_answers.append(f"自動回答適用: {standard} = {answer}")
                    
        except Exception as e:
            applied_answers.append(f"自動回答適用エラー: {e}")
        
        return applied_answers
    
    def collect_all_issues(self) -> List[str]:
        """全問題点の集計"""
        
        all_issues = []
        for check in self.quality_checks:
            all_issues.extend(check.get("issues", []))
        
        return all_issues
    
    def generate_recommendations(self) -> List[str]:
        """推奨事項生成"""
        
        recommendations = [
            "コードレビュープロセスの確立・徹底",
            "自動テスト・CI/CDパイプラインの導入",
            "コーディング規約の文書化・ツール導入",
            "テストカバレッジの向上・品質メトリクス監視",
            "ドキュメントの継続的更新・保守",
            "静的コード解析ツールの導入",
            "パフォーマンステスト・プロファイリング実施",
            "セキュリティコードレビューの実施"
        ]
        
        return recommendations
    
    def generate_human_questions(self) -> List[str]:
        """人間への質問生成"""
        
        questions = [
            "このプロジェクトの品質基準・目標は何ですか？",
            "コードレビューのプロセス・担当者は決まっていますか？",
            "テストの種類・カバレッジ目標は？",
            "リリース前の品質チェック項目は？",
            "技術負債の管理・解消計画は？",
            "パフォーマンス要件・ベンチマーク基準は？",
            "ドキュメント更新の責任者・頻度は？",
            "品質メトリクス（バグ率等）の監視方法は？"
        ]
        
        return questions
    
    def calculate_quality_score(self) -> int:
        """品質スコア計算"""
        
        total_checks = len(self.quality_checks)
        good_checks = sum(1 for check in self.quality_checks if check.get("status") == "good")
        warning_checks = sum(1 for check in self.quality_checks if check.get("status") == "warning")
        
        if total_checks == 0:
            return 0
        
        # スコア計算: good=100点, warning=65点, その他=0点
        score = (good_checks * 100 + warning_checks * 65) // total_checks
        return min(100, max(0, score))

def main():
    """品質保証Hooks単体テスト"""
    
    import sys
    project_path = sys.argv[1] if len(sys.argv) > 1 else "."
    
    print("✅ 品質保証Hooks - 単体テスト")
    print("=" * 50)
    
    # テスト用プロジェクト分析データ
    test_analysis = {
        "project_type": {"primary_type": "nagano3_kicho"},
        "technology_stack": {"backend": ["PHP"], "frontend": ["JavaScript"]}
    }
    
    # 品質保証確認実行
    hooks = QualityAssuranceHooks(project_path)
    result = hooks.execute_quality_assurance(test_analysis)
    
    # 結果表示
    print(f"📊 品質スコア: {result['overall_score']}/100")
    print(f"🔍 実行した確認: {len(result['quality_checks'])}項目")
    print(f"⚠️ 発見した問題: {len(result['issues_found'])}件")
    
    # 主要な確認結果表示
    if result['code_metrics']:
        metrics = result['code_metrics']
        if 'statistics' in metrics:
            stats = metrics['statistics']
            print(f"\n📈 コードメトリクス:")
            print(f"  総ファイル数: {stats.get('total_files', 0)}")
            print(f"  総行数: {stats.get('total_lines', 0)}")
            print(f"  コメント比率: {metrics.get('comment_ratio', 0)}%")
    
    if result['test_coverage']:
        test_info = result['test_coverage']
        print(f"\n🧪 テスト状況:")
        print(f"  テストファイル数: {test_info.get('test_files_count', 0)}")
        if 'estimated_coverage' in test_info:
            print(f"  推定カバレッジ: {test_info['estimated_coverage']}%")
    
    if result['issues_found']:
        print("\n🚨 発見された問題:")
        for issue in result['issues_found'][:5]:
            print(f"  - {issue}")
    
    if result['recommendations']:
        print("\n💡 推奨事項:")
        for rec in result['recommendations'][:3]:
            print(f"  - {rec}")
    
    return result['overall_score'] >= 70

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
            check_result["status"] = "error"
            check_result["issues"].append(f"コード品質確認エラー: {e}")
        
        return check_result
    
    def check_code_duplication(self) -> List[str]:
        """簡易重複コードチェック"""
        
        try:
            php_files = list(self.project_path.rglob("*.php"))[:20]  # パフォーマンス制限
            code_blocks = {}
            duplicates = []
            
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # 関数定義の抽出
                    function_patterns = re.findall(r'function\s+\w+\s*\([^)]*\)\s*{[^}]+}', content, re.MULTILINE)
                    
                    for pattern in function_patterns:
                        # 空白・コメントを正規化
                        normalized = re.sub(r'\s+', ' ', pattern).strip()
                        if len(normalized) > 100:  # 十分な長さのみチェック
                            if normalized in code_blocks:
                                duplicates.append(f"重複関数: {php_file.name}")
                            else:
                                code_blocks[normalized] = php_file.name
                                
                except:
                    continue
            
            return duplicates
            
        except:
            return []
    
    def check_test_implementation(self) -> Dict[str, Any]:
        """テスト実装・カバレッジ確認"""
        
        check_result = {
            "check_name": "Test Implementation & Coverage",
            "status": "unknown",
            "details": {},
            "issues": [],
            "auto_fixable": True
        }
        
        try:
            # テストディレクトリ・ファイル確認
            test_dirs = ["tests", "test", "spec", "__tests__"]
            test_files = []
            test_dir_found = False
            
            for test_dir_name in test_dirs:
                test_dir = self.project_path / test_dir_name
                if test_dir.exists():
                    test_dir_found = True
                    test_files.extend(list(test_dir.rglob("*Test.php")))
                    test_files.extend(list(test_dir.rglob("*test.py")))
                    test_files.extend(list(test_dir.rglob("*.test.js")))
                    break
            
            check_result["details"]["test_directory"] = test_dir_found
            check_result["details"]["test_files_count"] = len(test_files)
            
            if not test_dir_found:
                check_result["issues"].append("❌ テストディレクトリが見つかりません")
                check_result["auto_fixable"] = True
            elif len(test_files) == 0:
                check_result["issues"].append("❌ テストファイルが見つかりません")
            else:
                check_result["details"]["test_files"] = [f.name for f in test_files[:5]]
            
            # PHPUnit設定確認
            phpunit_config = self.project_path / "phpunit.xml"
            if phpunit_config.exists():
                check_result["details"]["phpunit_config"] = "✅ PHPUnit設定ファイル存在"
            else:
                check_result["details"]["phpunit_config"] = "❌ PHPUnit設定ファイルなし"
                check_result["issues"].append("⚠️ PHPUnit設定ファイル作成推奨")
            
            # package.json でテストスクリプト確認
            package_file = self.project_path / "package.json"
            if package_file.exists():
                try:
                    with open(package_file, 'r', encoding='utf-8') as f:
                        package_data = json.load(f)
                    
                    scripts = package_data.get("scripts", {})
                    test_script = scripts.get("test")
                    
                    if test_script:
                        check_result["details"]["npm_test_script"] = "✅ npmテストスクリプト設定済み"
                    else:
                        check_result["details"]["npm_test_script"] = "❌ npmテストスクリプト未設定"
                        
                except:
                    pass
            
            # テスト実装パターンの確認
            test_patterns = {
                "assertion_found": False,
                "mock_found": False,
                "setup_teardown": False
            }
            
            for test_file in test_files[:10]:  # 最大10ファイル確認
                try:
                    with open(test_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # アサーション確認
                    if re.search(r'assert|expect|should', content, re.IGNORECASE):
                        test_patterns["assertion_found"] = True
                    
                    # モック・スタブ確認
                    if re.search(r'mock|stub|fake', content, re.IGNORECASE):
                        test_patterns["mock_found"] = True
                    
                    # セットアップ・ティアダウン確認
                    if re.search(r'setUp|tearDown|beforeEach|afterEach', content):
                        test_patterns["setup_teardown"] = True
                        
                except:
                    continue
            
            check_result["details"]["test_patterns"] = test_patterns
            
            # テストカバレッジ推定
            code_files = len(list(self.project_path.rglob("*.php"))) + \
                        len(list(self.project_path.rglob("*.js"))) + \
                        len(list(self.project_path.rglob("*.py")))
            
            if len(test_files) > 0 and code_files > 0:
                coverage_estimate = min(100, (len(test_files) / code_files) * 100)
                check_result["details"]["estimated_coverage"] = round(coverage_estimate, 1)
                
                if coverage_estimate >= 80:
                    check_result["details"]["coverage_assessment"] = "✅ 高カバレッジ推定"
                elif coverage_estimate >= 50:
                    check_result["details"]["coverage_assessment"] = "⚠️ 中程度カバレッジ推定"
                    check_result["issues"].append("⚠️ テストカバレッジ向上推奨")
                else:
                    check_result["details"]["coverage_assessment"] = "❌ 低カバレッジ推定"
                    check_result["issues"].append("❌ テストカバレッジ大幅向上必要")
            
            # 総合判定
            critical_issues = [issue for issue in check_result["issues"] if "❌" in issue]
            if not critical_issues and test_patterns["assertion_found"]:
                check_result["status"] = "good"
            elif not critical_issues:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"テスト確認エラー: {e}")
        
        return check_result
    
    def check_documentation(self) -> Dict[str, Any]:
        """ドキュメント確認"""
        
        check_result = {
            "check_name": "Documentation",
            "status": "unknown",
            "details": {},
            "issues": [],
            "auto_fixable": True
        }
        
        try:
            # README ファイル確認
            readme_files = list(self.project_path.glob("README*"))
            if readme_files:
                check_result["details"]["readme"] = f"✅ READMEファイル存在: {readme_files[0].name}"
                
                # README内容確認
                try:
                    with open(readme_files[0], 'r', encoding='utf-8', errors='ignore') as f:
                        readme_content = f.read()
                    
                    readme_sections = {
                        "installation": "インストール" in readme_content.lower() or "install" in readme_content.lower(),
                        "usage": "使用方法" in readme_content or "usage" in readme_content.lower(),
                        "requirements": "要件" in readme_content or "requirements" in readme_content.lower(),
                        "api": "api" in readme_content.lower() or "endpoint" in readme_content.lower()
                    }
                    
                    check_result["details"]["readme_sections"] = readme_sections
                    
                    missing_sections = [section for section, exists in readme_sections.items() if not exists]
                    if missing_sections:
                        check_result["issues"].append(f"⚠️ README不足セクション: {', '.join(missing_sections)}")
                        
                except:
                    pass
            else:
                check_result["details"]["readme"] = "❌ READMEファイルなし"
                check_result["issues"].append("❌ READMEファイル作成必要")
                check_result["auto_fixable"] = True
            
            # API ドキュメント確認
            api_doc_files = []
            api_patterns = ["api", "swagger", "openapi", "docs"]
            
            for pattern in api_patterns:
                files = list(self.project_path.rglob(f"*{pattern}*"))
                api_doc_files.extend([f for f in files if f.suffix.lower() in [".md", ".yml", ".yaml", ".json"]])
            
            if api_doc_files:
                check_result["details"]["api_documentation"] = f"✅ API文書{len(api_doc_files)}個存在"
            else:
                check_result["details"]["api_documentation"] = "⚠️ API文書未確認"
            
            # インラインドキュメント確認（PHPDoc、JSDoc等）
            inline_doc_stats = {
                "php_documented": 0,
                "php_total": 0,
                "js_documented": 0,
                "js_total": 0
            }
            
            # PHP ファイルのドキュメント確認
            php_files = list(self.project_path.rglob("*.php"))[:15]
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # 関数定義数
                    functions = len(re.findall(r'function\s+\w+', content))
                    inline_doc_stats["php_total"] += functions
                    
                    # PHPDoc コメント数
                    phpdoc_comments = len(re.findall(r'/\*\*.*?\*/', content, re.DOTALL))
                    inline_doc_stats["php_documented"] += phpdoc_comments
                    
                except:
                    continue
            
            # JavaScript ファイルのドキュメント確認
            js_files = list(self.project_path.rglob("*.js"))[:15]
            for js_file in js_files:
                try:
                    with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # 関数定義数
                    functions = len(re.findall(r'function\s+\w+', content))
                    inline_doc_stats["js_total"] += functions
                    
                    # JSDoc コメント数
                    jsdoc_comments = len(re.findall(r'/\*\*.*?\*/', content, re.DOTALL))
                    inline_doc_stats["js_documented"] += jsdoc_comments
                    
                except:
                    continue
            
            check_result["details"]["inline_documentation"] = inline_doc_stats
            
            # ドキュメント比率計算
            if inline_doc_stats["php_total"] > 0:
                php_doc_ratio = (inline_doc_stats["php_documented"] / inline_doc_stats["php_total"]) * 100
                check_result["details"]["php_doc_ratio"] = round(php_doc_ratio, 1)
                
                if php_doc_ratio < 30:
                    check_result["issues"].append("⚠️ PHPインラインドキュメント不足")
            
            if inline_doc_stats["js_total"] > 0:
                js_doc_ratio = (inline_doc_stats["js_documented"] / inline_doc_stats["js_total"]) * 100
                check_result["details"]["js_doc_ratio"] = round(js_doc_ratio, 1)
                
                if js_doc_ratio < 30:
                    check_result["issues"].append("⚠️ JSインラインドキュメント不足")
            
            # CHANGELOG確認
            changelog_files = list(self.project_path.glob("CHANGELOG*")) + \
                            list(self.project_path.glob("HISTORY*"))
            
            if changelog_files:
                check_result["details"]["changelog"] = "✅ CHANGELOGファイル存在"
            else:
                check_result["details"]["changelog"] = "⚠️ CHANGELOGファイルなし"
            
            # 総合判定
            critical_issues = [issue for issue in check_result["issues"] if "❌" in issue]
            if not critical_issues:
                check_result["status"] = "good"
            elif len(critical_issues) <= 1:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"ドキュメント確認エラー: {e}")
        
        return check_result
    
    def check_coding_standards(self) -> Dict[str, Any]:
        """コーディング規約確認"""
        
        check_result = {
            "check_name": "Coding Standards",
            "status": "unknown",
            "details": {},
            "issues": [],
            "auto_fixable": True
        }
        
        try:
            # PHP コーディング規約確認
            php_standards = self.check_php_standards()
            check_result["details"]["php_standards"] = php_standards
            
            # JavaScript コーディング規約確認
            js_standards = self.check_js_standards()
            check_result["details"]["js_standards"] = js_standards
            
            # Git コミット規約確認
            git_standards = self.check_git_standards()
            check_result["details"]["git_standards"] = git_standards
            
            # 命名規則確認
            naming_conventions = self.check_naming_conventions()
            check_result["details"]["naming_conventions"] = naming_conventions
            
            # 問題集計
            all_standards = [php_standards, js_standards, git_standards, naming_conventions]
            for standard in all_standards:
                if isinstance(standard, dict):
                    check_result["issues"].extend(standard.get("issues", []))
            
            # 総合判定
            total_issues = len(check_result["issues"])
            if total_issues == 0:
                check_result["status"] = "good"
            elif total_issues <= 3:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"コーディング規約確認エラー: {e}")
        
        return check_result
    
    def check_php_standards(self) -> Dict[str, Any]:
        """PHP コーディング規約確認"""
        
        php_check = {
            "psr_compliance": "unknown",
            "indentation": "unknown",
            "naming": "unknown",
            "issues": []
        }
        
        try:
            php_files = list(self.project_path.rglob("*.php"))[:10]
            
            indentation_consistent = True
            psr_violations = 0
            
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()
                    
                    # インデント確認
                    indents = []
                    for line in lines:
                        if line.strip() and line.startswith((' ', '\t')):
                            leading_space = len(line) - len(line.lstrip(' '))
                            if leading_space > 0:
                                indents.append(leading_space)
                    
                    if indents:
                        # 4スペースインデントの確認
                        non_four_space = [i for i in indents if i % 4 != 0]
                        if len(non_four_space) > len(indents) * 0.3:  # 30%以上違反
                            indentation_consistent = False
                    
                    # PSR-12 基本パターン確認
                    content = ''.join(lines)
                    
                    # 開始タグ確認
                    if not content.startswith('<?php'):
                        psr_violations += 1
                    
                    # クラス・メソッド命名確認（簡易）
                    class_matches = re.findall(r'class\s+([a-zA-Z_][a-zA-Z0-9_]*)', content)
                    for class_name in class_matches:
                        if not class_name[0].isupper():  # PascalCase
                            psr_violations += 1
                    
                except:
                    continue
            
            # 結果設定
            if indentation_consistent:
                php_check["indentation"] = "✅ 一貫したインデント"
            else:
                php_check["indentation"] = "❌ インデント不統一"
                php_check["issues"].append("❌ PHPインデント（4スペース）統一推奨")
            
            if psr_violations == 0:
                php_check["psr_compliance"] = "✅ PSR準拠"
            elif psr_violations <= 2:
                php_check["psr_compliance"] = "⚠️ PSR軽微な違反"
                php_check["issues"].append("⚠️ PSR-12準拠の改善推奨")
            else:
                php_check["psr_compliance"] = "❌ PSR重大な違反"
                php_check["issues"].append("❌ PSR-12準拠の大幅改善必要")
            
        except:
            php_check["issues"].append("PHP規約確認エラー")
        
        return php_check
    
    def check_js_standards(self) -> Dict[str, Any]:
        """JavaScript コーディング規約確認"""
        
        js_check = {
            "semicolon_usage": "unknown",
            "variable_naming": "unknown",
            "indentation": "unknown",
            "issues": []
        }
        
        try:
            js_files = list(self.project_path.rglob("*.js"))[:10]
            
            for js_file in js_files:
                try:
                    with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # セミコロン使用確認
                    statements = len(re.findall(r'[a-zA-Z0-9)}\]]\s*$', content, re.MULTILINE))
                    semicolons = len(re.findall(r';', content))
                    
                    if statements > 0:
                        semicolon_ratio = semicolons / statements
                        if semicolon_ratio > 0.8:
                            js_check["semicolon_usage"] = "✅ セミコロン統一"
                        else:
                            js_check["semicolon_usage"] = "⚠️ セミコロン不統一"
                            js_check["issues"].append("⚠️ JavaScriptセミコロン使用統一推奨")
                    
                    # 変数命名確認（camelCase）
                    var_declarations = re.findall(r'(?:var|let|const)\s+([a-zA-Z_][a-zA-Z0-9_]*)', content)
                    non_camel_case = [var for var in var_declarations if not (var[0].islower() and '_' not in var)]
                    
                    if len(var_declarations) > 0:
                        camel_ratio = (len(var_declarations) - len(non_camel_case)) / len(var_declarations)
                        if camel_ratio > 0.8:
                            js_check["variable_naming"] = "✅ camelCase準拠"
                        else:
                            js_check["variable_naming"] = "⚠️ camelCase不統一"
                            js_check["issues"].append("⚠️ JavaScript変数名camelCase統一推奨")
                    
                    break  # 最初のファイルのみ確認
                    
                except:
                    continue
            
        except:
            js_check["issues"].append("JavaScript規約確認エラー")
        
        return js_check
    
    def check_git_standards(self) -> Dict[str, Any]:
        """Git コミット規約確認"""
        
        git_check = {
            "commit_messages": "unknown",
            "branch_naming": "unknown",
            "issues": []
        }
        
        try:
            # .git ディレクトリの確認
            git_dir = self.project_path / ".git"
            if not git_dir.exists():
                git_check["issues"].append("⚠️ Gitリポジトリ未初期化")
                return git_check
            
            # 最近のコミットメッセージ確認（可能な場合）
            try:
                result = subprocess.run(
                    ['git', 'log', '--oneline', '-10'], 
                    capture_output=True, 
                    text=True, 
                    cwd=self.project_path,
                    timeout=10
                )
                
                if result.returncode == 0:
                    commit_lines = result.stdout.strip().split('\n')
                    
                    # コミットメッセージ品質確認
                    good_commits = 0
                    for line in commit_lines:
                        if len(line) > 8:  # ハッシュ以外に内容がある
                            message = line[8:].strip()  # ハッシュ部分を除去
                            if len(message) >= 10 and message[0].isupper():
                                good_commits += 1
                    
                    if len(commit_lines) > 0:
                        commit_quality = good_commits / len(commit_lines)
                        if commit_quality > 0.7:
                            git_check["commit_messages"] = "✅ 適切なコミットメッセージ"
                        else:
                            git_check["commit_messages"] = "⚠️ コミットメッセージ改善推奨"
                            git_check["issues"].append("⚠️ Gitコミットメッセージの品質向上推奨")
                    
            except:
                git_check["commit_messages"] = "確認不可"
            
            # .gitignore 確認
            gitignore_file = self.project_path / ".gitignore"
            if gitignore_file.exists():
                git_check["gitignore"] = "✅ .gitignore存在"
            else:
                git_check["gitignore"] = "❌ .gitignore未作成"
                git_check["issues"].append("❌ .gitignoreファイル作成必要")
            
        except:
            git_check["issues"].append("Git設定確認エラー")
        
        return git_check
    
    def check_naming_conventions(self) -> Dict[str, Any]:
        """命名規則確認"""
        
        naming_check = {
            "file_naming": "unknown",
            "directory_naming": "unknown",
            "issues": []
        }
        
        try:
            # ファイル命名規則確認
            problematic_files = []
            
            for file_path in self.project_path.rglob("*"):
                if file_path.is_file():
                    filename = file_path.name
                    
                    # 問題のある命名パターン
                    if (' ' in filename or 
                        filename.isupper() or 
                        '&' in filename or 
                        '%' in filename):
                        problematic_files.append(filename)
            
            if len(problematic_files) == 0:
                naming_check["file_naming"] = "✅ 適切なファイル命名"
            elif len(problematic_files) <= 3:
                naming_check["file_naming"] = "⚠️ 一部ファイル命名改善推奨"
                naming_check["issues"].append("⚠️ ファイル命名規則の統一推奨")
            else:
                naming_check["file_naming"] = "❌ ファイル命名規則違反多数"
                naming_check["issues"].append("❌ ファイル命名規則の大幅改善必要")
            
            # ディレクトリ命名確認
            problematic_dirs = []
            
            for dir_path in self.project_path.rglob("*"):
                if dir_path.is_dir() and dir_path != self.project_path:
                    dirname = dir_path.name
                    
                    if (' ' in dirname or dirname.isupper()):
                        problematic_dirs.append(dirname)
            
            if len(problematic_dirs) == 0:
                naming_check["directory_naming"] = "✅ 適切なディレクトリ命名"
            else:
                naming_check["directory_naming"] = "⚠️ ディレクトリ命名改善推奨"
                naming_check["issues"].append("⚠️ ディレクトリ命名規則の統一推奨")
            
        except:
            naming_check["issues"].append("命名規則確認エラー")
        
        return naming_check
    
    def check_error_handling(self) -> Dict[str, Any]:
        """エラーハンドリング確認"""
        
        check_result = {
            "check_name": "Error Handling",
            "status": "unknown",
            "details": {},
            "issues": [],
            "auto_fixable": False
        }
        
        try:
            error_handling_stats = {
                "try_catch_blocks": 0,
                "error_logging": 0,
                "input_validation": 0,
                "files_checked": 0
            }
            
            # PHP ファイルのエラーハンドリング確認
            php_files = list(self.project_path.rglob("*.php"))[:15]
            
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    error_handling_stats["files_checked"] += 1
                    
                    # try-catch ブロック
                    if re.search(r'try\s*{.*?catch', content, re.DOTALL):
                        error_handling_stats["try_catch_blocks"] += 1
                    
                    # エラーログ出力
                    if re.search(r'error_log|file_put_contents.*error|log_error', content):
                        error_handling_stats["error_logging"] += 1
                    
                    # 入力値検証
                    if re.search(r'empty\(|isset\(|is_numeric\(|filter_var\(', content):
                        error_handling_stats["input_validation"] += 1
                        
                except:
                    continue
            
            check_result["details"]["error_handling_stats"] = error_handling_stats
            
            # 評価
            if error_handling_stats["files_checked"] > 0:
                try_catch_ratio = error_handling_stats["try_catch_blocks"] / error_handling_stats["files_checked"]
                logging_ratio = error_handling_stats["error_logging"] / error_handling_stats["files_checked"]
                validation_ratio = error_handling_stats["input_validation"] / error_handling_stats["files_checked"]
                
                if try_catch_ratio < 0.3:
                    check_result["issues"].append("⚠️ try-catch エラーハンドリング不足")
                
                if logging_ratio < 0.2:
                    check_result["issues"].append("⚠️ エラーログ出力不足")
                
                if validation_ratio < 0.5:
                    check_result["issues"].append("⚠️ 入力値検証不足")
                
                # 総合評価
                avg_ratio = (try_catch_ratio + logging_ratio + validation_ratio) / 3
                if avg_ratio >= 0.6:
                    check_result["status"] = "good"
                    check_result["details"]["assessment"] = "✅ 適切なエラーハンドリング"
                elif avg_ratio >= 0.3:
                    check_result["status"] = "warning"
                    check_result["details"]["assessment"] = "⚠️ エラーハンドリング改善推奨"
                else:
                    check_result["status"] = "critical"
                    check_result["details"]["assessment"] = "❌ エラーハンドリング大幅改善必要"
            
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"エラーハンドリング確認エラー: {e}")
        
        return check_result
    
    def check_performance_considerations(self) -> Dict[str, Any]:
        """パフォーマンス考慮確認"""
        
        check_result = {
            "check_name": "Performance Considerations",
            "status": "unknown",
            "details": {},
            "issues": [],
            "auto_fixable": False
        }
        
        try:
            performance_issues = []
            performance_optimizations = []
            
            # PHP パフォーマンス確認
            php_files = list(self.project_path.rglob("*.php"))[:10]
            
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # パフォーマンス問題パターン
                    if re.search(r'SELECT\s+\*\s+FROM', content, re.IGNORECASE):
                        performance_issues.append("SELECT * クエリ発見")
                    
                    if re.search(r'for.*{.*mysql_query', content, re.IGNORECASE):
                        performance_issues.append("ループ内SQL実行発見")
                    
                    # 最適化パターン
                    if re.search(r'prepare\(|mysqli_prepare', content):
                        performance_optimizations.append("準備文使用")
                    
                    if re.search(r'cache|memcache|redis', content, re.IGNORECASE):
                        performance_optimizations.append("キャッシュ実装")
                        
                except:
                    continue
            
            # JavaScript パフォーマンス確認
            js_files = list(self.project_path.rglob("*.js"))[:5]
            
            for js_file in js_files:
                try:
                    with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # jQuery大量使用チェック
                    jquery_selectors = len(re.findall(r'\$\(', content))
                    if jquery_selectors > 20:
                        performance_issues.append("jQuery セレクタ多用")
                    
                    # 最適化パターン
                    if 'addEventListener' in content:
                        performance_optimizations.append("ネイティブイベント使用")
                        
                except:
                    continue
            
            check_result["details"]["performance_issues"] = performance_issues
            check_result["details"]["performance_optimizations"] = performance_optimizations
            
            # 総合評価
            issues_count = len(performance_issues)
            optimizations_count = len(performance_optimizations)
            
            if issues_count == 0 and optimizations_count > 0:
                check_result["status"] = "good"
                check_result["details"]["assessment"] = "✅ パフォーマンス考慮良好"
            elif issues_count <= 2:
                check_result["status"] = "warning"
                check_result["details"]["assessment"] = "⚠️ パフォーマンス改善余地あり"
                for issue in performance_issues:
                    check_result["issues"].append(f"⚠️ {issue}")
            else:
                check_result["status"] = "critical"
                check_result["details"]["assessment"] = "❌ パフォーマンス問題多数"
                for issue in performance_issues:
                    check_result["issues"].append(f"❌ {issue}")
            
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"パフォーマンス確認エラー: {e}")
        
        return check_result
    
    def check_review_and_cicd(self) -> Dict[str, Any]:
        """コードレビュー・CI/CD確認"""
        
        check_result = {
            "check_name": "Code Review & CI/CD",
            "status": "unknown",
            "details": {},
            "issues": [],
            "auto_fixable": True
        }
        
        try:
            # GitHub Actions 確認
            github_dir = self.project_path / ".github"
            workflows_dir = github_dir / "workflows"
            
            if workflows_dir.exists():
                workflow_files = list(workflows_dir.rglob("*.yml")) + list(workflows_dir.rglob("*.yaml"))
                check_result["details"]["github_actions"] = f"✅ GitHub Actions設定{len(workflow_files)}個"
            else:
                check_result["details"]["github_actions"] = "❌ GitHub Actions未設定"
                check_result["issues"].append("⚠️ CI/CD パイプライン設定推奨")
                check_result["auto_fixable"] = True
            
            # プルリクエストテンプレート確認
            pr_template_paths = [
                github_dir / "pull_request_template.md",
                github_dir / "PULL_REQUEST_TEMPLATE.md",
                self.project_path / ".github" / "PULL_REQUEST_TEMPLATE" / "pull_request_template.md"
            ]
            
            pr_template_exists = any(path.exists() for path in pr_template_paths)
            
            if pr_template_exists:
                check_result["details"]["pr_template"] = "✅ PRテンプレート存在"
            else:
                check_result["details"]["pr_template"] = "❌ PRテンプレート未設定"
                check_result["issues"].append("⚠️ プルリクエストテンプレート作成推奨")
            
            # Issue テンプレート確認
            issue_template_dir = github_dir / "ISSUE_TEMPLATE"
            if issue_template_dir.exists():
                issue_templates = list(issue_template_dir.rglob("*.md"))
                check_result["details"]["issue_templates"] = f"✅ Issueテンプレート{len(issue_templates)}個"
            else:
                check_result["details"]["issue_templates"] = "❌ Issueテンプレート未設定"
                check_result["issues"].append("⚠️ Issueテンプレート作成推奨")
            
            # ブランチ保護・レビュー設定（設定ファイルベース確認）
            # 実際のGitHub設定は外部APIなので、ここではファイルベースの推測のみ
            
            # 総合判定
            issues_count = len(check_result["issues"])
            if issues_count == 0:
                check_result["status"] = "good"
            elif issues_count <= 2:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e: