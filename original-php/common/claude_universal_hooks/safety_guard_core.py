#!/usr/bin/env python3
"""
🔒 セキュリティ検証Hooks
Universal Hooks - 全プロジェクト必須セキュリティチェック

ファイル: ~/.claude/hooks/universal/security_validation.py
"""

import os
import re
import json
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

class SecurityValidationHooks:
    """セキュリティ検証Hooks"""
    
    def __init__(self, project_path: str = "."):
        self.project_path = Path(project_path).resolve()
        self.hooks_name = "Security Validation"
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
        """セキュリティ検証メイン実行"""
        
        print(f"🔒 {self.hooks_name} 実行中...")
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "hooks_name": self.hooks_name,
            "project_path": str(self.project_path),
            "project_type": project_analysis.get("project_type", {}).get("primary_type", "unknown") if project_analysis else "unknown",
            "security_checks": {},
            "issues_found": [],
            "recommendations": [],
            "auto_answers_applied": [],
            "questions_for_human": [],
            "overall_score": 0
        }
        
        try:
            # セキュリティチェック実行
            security_checks = {
                "csrf_protection": self._check_csrf_protection(),
                "sql_injection_prevention": self._check_sql_injection_prevention(),
                "xss_prevention": self._check_xss_prevention(),
                "session_security": self._check_session_security(),
                "input_validation": self._check_input_validation(),
                "authentication": self._check_authentication_mechanism(),
                "file_permissions": self._check_file_permissions(),
                "sensitive_data": self._check_sensitive_data_exposure()
            }
            
            result["security_checks"] = security_checks
            result["overall_score"] = self._calculate_security_score(security_checks)
            
            # 問題点・推奨事項生成
            result["issues_found"] = self._collect_security_issues(security_checks)
            result["recommendations"] = self._generate_security_recommendations(security_checks)
            
            # 自動回答適用
            result["auto_answers_applied"] = self.apply_auto_answers(result["project_type"])
            
            # 人間への質問生成
            result["questions_for_human"] = self._generate_human_questions(security_checks, result["project_type"])
            
            print(f"✅ {self.hooks_name} 完了 - スコア: {result['overall_score']}/100")
            return result
            
        except Exception as e:
            result["error"] = str(e)
            result["overall_score"] = 0
            print(f"❌ {self.hooks_name} エラー: {e}")
            return result
    
    def _check_csrf_protection(self) -> Dict[str, Any]:
        """CSRF保護チェック"""
        
        csrf_patterns = [
            r'csrf[_-]?token',
            r'_token',
            r'authenticity[_-]?token',
            r'CSRF_TOKEN_SECRET'
        ]
        
        csrf_found = False
        csrf_files = []
        csrf_methods = []
        
        # PHP ファイルでCSRF関連コード検索
        for php_file in self.project_path.rglob("*.php"):
            try:
                content = php_file.read_text(encoding='utf-8')
                for pattern in csrf_patterns:
                    if re.search(pattern, content, re.IGNORECASE):
                        csrf_found = True
                        csrf_files.append(str(php_file))
                        
                        # CSRF実装方法の検出
                        if 'session_start' in content:
                            csrf_methods.append('Session-based')
                        if 'hash' in content or 'md5' in content:
                            csrf_methods.append('Hash-based')
                        break
            except:
                continue
        
        # 設定ファイルでCSRF設定確認
        env_files = list(self.project_path.rglob(".env*"))
        for env_file in env_files:
            try:
                content = env_file.read_text(encoding='utf-8')
                if 'CSRF_TOKEN_SECRET' in content:
                    csrf_found = True
                    csrf_files.append(str(env_file))
                    csrf_methods.append('Environment-based')
            except:
                continue
        
        return {
            "status": "pass" if csrf_found else "fail",
            "found": csrf_found,
            "files": list(set(csrf_files)),
            "methods": list(set(csrf_methods)),
            "message": "CSRF保護が実装されています" if csrf_found else "CSRF保護が見つかりません - 実装が必要です"
        }
    
    def _check_sql_injection_prevention(self) -> Dict[str, Any]:
        """SQLインジェクション対策チェック"""
        
        prepared_statements = False
        direct_sql_issues = []
        good_practices = []
        
        for php_file in self.project_path.rglob("*.php"):
            try:
                content = php_file.read_text(encoding='utf-8')
                
                # プリペアドステートメントチェック（良い実装）
                if re.search(r'prepare\s*\(', content):
                    prepared_statements = True
                    good_practices.append(f"Prepared statements: {php_file.name}")
                
                if 'bindParam' in content or 'bindValue' in content:
                    good_practices.append(f"Parameter binding: {php_file.name}")
                
                # 危険な直接SQL実行検出
                dangerous_patterns = [
                    r'\$[^;]*=.*\$.*[\'"][^\'";]*\$[^\'";]*[\'"]',  # 変数直接埋め込み
                    r'mysql_query\s*\(',  # 非推奨関数
                    r'mysqli_query\s*\([^,]*,\s*[\'"][^\'";]*\$[^\'";]*[\'"]'  # 危険なmysqli
                ]
                
                for pattern in dangerous_patterns:
                    if re.search(pattern, content):
                        direct_sql_issues.append(f"Potential SQL injection: {php_file.name}")
                        break
                        
            except:
                continue
        
        # PDO使用の確認
        pdo_usage = False
        for php_file in self.project_path.rglob("*.php"):
            try:
                content = php_file.read_text(encoding='utf-8')
                if 'PDO' in content or 'new PDO' in content:
                    pdo_usage = True
                    good_practices.append("PDO usage detected")
                    break
            except:
                continue
        
        severity = "pass" if prepared_statements and not direct_sql_issues else "warning" if prepared_statements else "fail"
        
        return {
            "status": severity,
            "prepared_statements": prepared_statements,
            "pdo_usage": pdo_usage,
            "good_practices": good_practices,
            "issues": direct_sql_issues,
            "message": f"SQLインジェクション対策: {severity} - {'適切な実装' if severity == 'pass' else '改善が必要'}"
        }
    
    def _check_xss_prevention(self) -> Dict[str, Any]:
        """XSS対策チェック"""
        
        xss_prevention = []
        potential_issues = []
        
        for php_file in self.project_path.rglob("*.php"):
            try:
                content = php_file.read_text(encoding='utf-8')
                
                # XSS対策の検出
                if 'htmlspecialchars' in content:
                    xss_prevention.append(f"htmlspecialchars usage: {php_file.name}")
                if 'strip_tags' in content:
                    xss_prevention.append(f"strip_tags usage: {php_file.name}")
                if 'filter_var' in content and 'FILTER_SANITIZE' in content:
                    xss_prevention.append(f"filter_var sanitization: {php_file.name}")
                
                # 潜在的なXSS脆弱性
                if re.search(r'echo\s+\$[^;]*;', content) and 'htmlspecialchars' not in content:
                    potential_issues.append(f"Unescaped output: {php_file.name}")
                
            except:
                continue
        
        status = "pass" if xss_prevention and not potential_issues else "warning" if xss_prevention else "fail"
        
        return {
            "status": status,
            "prevention_methods": xss_prevention,
            "potential_issues": potential_issues,
            "message": f"XSS対策: {status}"
        }
    
    def _check_session_security(self) -> Dict[str, Any]:
        """セッションセキュリティチェック"""
        
        session_security = []
        session_config = {}
        
        # PHP設定ファイルチェック
        for config_file in self.project_path.rglob("*.php"):
            try:
                content = config_file.read_text(encoding='utf-8')
                
                if 'session_start' in content:
                    session_security.append("Session mechanism found")
                
                # セキュアなセッション設定の検出
                secure_patterns = {
                    'httponly': r'session_set_cookie_params.*httponly.*true',
                    'secure': r'session_set_cookie_params.*secure.*true',
                    'regenerate': r'session_regenerate_id',
                    'destroy': r'session_destroy'
                }
                
                for key, pattern in secure_patterns.items():
                    if re.search(pattern, content, re.IGNORECASE):
                        session_config[key] = True
                        session_security.append(f"Secure session {key}")
                
            except:
                continue
        
        score = len(session_config)
        status = "pass" if score >= 3 else "warning" if score >= 1 else "fail"
        
        return {
            "status": status,
            "security_features": session_security,
            "config": session_config,
            "score": f"{score}/4",
            "message": f"セッションセキュリティ: {status}"
        }
    
    def _check_input_validation(self) -> Dict[str, Any]:
        """入力値検証チェック"""
        
        validation_methods = []
        
        for php_file in self.project_path.rglob("*.php"):
            try:
                content = php_file.read_text(encoding='utf-8')
                
                # 入力値検証パターン
                validation_patterns = {
                    'filter_var': r'filter_var\s*\(',
                    'is_numeric': r'is_numeric\s*\(',
                    'preg_match': r'preg_match\s*\(',
                    'strlen_check': r'strlen\s*\([^)]*\)\s*[<>]',
                    'empty_check': r'empty\s*\(',
                    'isset_check': r'isset\s*\('
                }
                
                for method, pattern in validation_patterns.items():
                    if re.search(pattern, content):
                        validation_methods.append(method)
                
            except:
                continue
        
        validation_methods = list(set(validation_methods))
        score = len(validation_methods)
        status = "pass" if score >= 4 else "warning" if score >= 2 else "fail"
        
        return {
            "status": status,
            "methods": validation_methods,
            "score": f"{score}/6",
            "message": f"入力値検証: {status}"
        }
    
    def _check_authentication_mechanism(self) -> Dict[str, Any]:
        """認証メカニズムチェック"""
        
        auth_features = []
        auth_files = []
        
        for php_file in self.project_path.rglob("*.php"):
            try:
                content = php_file.read_text(encoding='utf-8')
                
                # 認証関連パターン
                auth_patterns = {
                    'login': r'(login|signin|authenticate)',
                    'password_hash': r'password_(hash|verify)',
                    'session_auth': r'session.*auth|auth.*session',
                    'jwt': r'jwt|json.*web.*token',
                    'oauth': r'oauth',
                    'two_factor': r'(2fa|two.*factor|totp)'
                }
                
                for feature, pattern in auth_patterns.items():
                    if re.search(pattern, content, re.IGNORECASE):
                        auth_features.append(feature)
                        auth_files.append(str(php_file))
                
            except:
                continue
        
        auth_features = list(set(auth_features))
        score = len(auth_features)
        status = "pass" if score >= 3 else "warning" if score >= 1 else "fail"
        
        return {
            "status": status,
            "features": auth_features,
            "files": list(set(auth_files)),
            "score": f"{score}/6",
            "message": f"認証メカニズム: {status}"
        }
    
    def _check_file_permissions(self) -> Dict[str, Any]:
        """ファイル権限チェック"""
        
        permission_issues = []
        config_files = []
        
        # 重要ファイルの権限チェック
        important_patterns = [".env*", "config.*", "*config*", "*.key", "*.pem"]
        
        for pattern in important_patterns:
            for file_path in self.project_path.rglob(pattern):
                if file_path.is_file():
                    config_files.append(str(file_path))
                    
                    # 権限チェック（Unix系のみ）
                    try:
                        stat = file_path.stat()
                        mode = stat.st_mode & 0o777
                        
                        if mode & 0o004:  # 他者読み取り可能
                            permission_issues.append(f"World-readable: {file_path}")
                        if mode & 0o002:  # 他者書き込み可能
                            permission_issues.append(f"World-writable: {file_path}")
                            
                    except:
                        continue
        
        status = "pass" if not permission_issues else "warning" if len(permission_issues) <= 2 else "fail"
        
        return {
            "status": status,
            "config_files": config_files,
            "issues": permission_issues,
            "message": f"ファイル権限: {status}"
        }
    
    def _check_sensitive_data_exposure(self) -> Dict[str, Any]:
        """機密データ露出チェック"""
        
        sensitive_patterns = [
            r'password\s*=\s*[\'"][^\'"]{3,}[\'"]',
            r'api[_-]?key\s*[=:]\s*[\'"][^\'"]{10,}[\'"]',
            r'secret\s*[=:]\s*[\'"][^\'"]{10,}[\'"]',
            r'token\s*[=:]\s*[\'"][^\'"]{20,}[\'"]'
        ]
        
        exposed_data = []
        safe_files = []
        
        for file_path in self.project_path.rglob("*"):
            if file_path.is_file() and file_path.suffix in ['.php', '.js', '.py', '.txt', '.md']:
                try:
                    content = file_path.read_text(encoding='utf-8')
                    
                    # .envファイルは除外（適切な機密データ管理）
                    if file_path.name.startswith('.env'):
                        safe_files.append(f"Environment file: {file_path.name}")
                        continue
                    
                    for pattern in sensitive_patterns:
                        if re.search(pattern, content, re.IGNORECASE):
                            exposed_data.append(f"Potential exposure: {file_path}")
                            break
                            
                except:
                    continue
        
        status = "pass" if not exposed_data else "fail"
        
        return {
            "status": status,
            "exposed_data": exposed_data,
            "safe_files": safe_files,
            "message": f"機密データ保護: {status}"
        }
    
    def _calculate_security_score(self, checks: Dict[str, Any]) -> int:
        """セキュリティスコア計算"""
        
        total_score = 0
        max_score = 0
        
        weights = {
            "csrf_protection": 20,
            "sql_injection_prevention": 25,
            "xss_prevention": 15,
            "session_security": 15,
            "input_validation": 10,
            "authentication": 10,
            "file_permissions": 3,
            "sensitive_data": 2
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
    
    def _collect_security_issues(self, checks: Dict[str, Any]) -> List[str]:
        """セキュリティ問題収集"""
        
        issues = []
        
        for check_name, result in checks.items():
            if result.get("status") == "fail":
                issues.append(f"{check_name}: {result.get('message', 'Failed')}")
            elif result.get("status") == "warning":
                issues.append(f"{check_name}: {result.get('message', 'Needs improvement')}")
        
        return issues
    
    def _generate_security_recommendations(self, checks: Dict[str, Any]) -> List[str]:
        """セキュリティ推奨事項生成"""
        
        recommendations = []
        
        # CSRF対策
        if checks.get("csrf_protection", {}).get("status") != "pass":
            recommendations.append("CSRF保護の実装: トークンベース認証の導入")
        
        # SQLインジェクション対策
        if checks.get("sql_injection_prevention", {}).get("status") != "pass":
            recommendations.append("SQLインジェクション対策: PDOプリペアドステートメントの使用")
        
        # XSS対策
        if checks.get("xss_prevention", {}).get("status") != "pass":
            recommendations.append("XSS対策: htmlspecialchars()による出力エスケープ")
        
        # セッションセキュリティ
        if checks.get("session_security", {}).get("status") != "pass":
            recommendations.append("セッションセキュリティ: HttpOnly・Secureフラグの設定")
        
        return recommendations
    
    def apply_auto_answers(self, project_type: str) -> List[str]:
        """セキュリティ関連自動回答適用"""
        
        answers = []
        
        # NAGANO3プロジェクト特有の自動回答
        if "nagano3" in project_type.lower() or "kicho" in project_type.lower():
            nagano3_answers = self.auto_answers.get("auto_answers_database", {}).get("project_templates", {}).get("nagano3_kicho", {}).get("universal_answers", {}).get("security_requirements", {})
            
            for key, value in nagano3_answers.items():
                answers.append(f"{key}: {value}")
        else:
            # 汎用プロジェクト自動回答
            answers.extend([
                "CSRF保護の実装推奨",
                "SQLインジェクション対策必須",
                "XSS対策の実装",
                "セッションセキュリティ強化",
                "入力値検証の厳密化",
                "機密データの適切な管理"
            ])
        
        return answers
    
    def _generate_human_questions(self, checks: Dict[str, Any], project_type: str) -> List[str]:
        """人間への質問生成"""
        
        questions = []
        
        # セキュリティレベルの確認
        if checks.get("authentication", {}).get("status") == "fail":
            questions.append("このプロジェクトで必要な認証レベルを教えてください（基本認証/多要素認証/OAuth等）")
        
        # HTTPS要件の確認
        questions.append("本番環境でHTTPS（SSL/TLS）を使用しますか？")
        
        # データ保護要件
        if "nagano3" not in project_type.lower():
            questions.append("個人情報や機密データを扱いますか？（GDPR/個人情報保護法対応）")
        
        return questions

def main():
    """セキュリティHooks単体テスト"""
    
    project_path = sys.argv[1] if len(sys.argv) > 1 else "."
    
    hooks = SecurityValidationHooks(project_path)
    result = hooks.execute_hooks()
    
    print("\n" + "="*60)
    print("🔒 Security Validation Hooks 実行結果")
    print("="*60)
    print(f"📊 総合スコア: {result['overall_score']}/100")
    print(f"⚠️ 検出問題: {len(result['issues_found'])}件")
    print(f"💡 推奨事項: {len(result['recommendations'])}件")
    print(f"✅ 自動回答: {len(result['auto_answers_applied'])}件")
    
    return result['overall_score'] >= 75

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)