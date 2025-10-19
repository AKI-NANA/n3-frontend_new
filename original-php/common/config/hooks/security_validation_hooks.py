#!/usr/bin/env python3
"""
🔒 セキュリティ検証Hooks
Universal Hooks - セキュリティ基本チェック・CSRF・認証確認

ファイル: ~/.claude/hooks/universal/security_validation.py
"""

import os
import re
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

class SecurityValidationHooks:
    """セキュリティ検証Hooks"""
    
    def __init__(self, project_path: str = "."):
        self.project_path = Path(project_path).resolve()
        self.auto_answers = self.load_auto_answers()
        self.security_checks = []
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
    
    def execute_security_validation(self, project_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """セキュリティ検証メイン実行"""
        
        print("🔒 セキュリティ検証Hooks実行中...")
        
        validation_results = {
            "timestamp": datetime.now().isoformat(),
            "project_path": str(self.project_path),
            "project_type": project_analysis.get("project_type", {}).get("primary_type", "unknown"),
            "security_checks": [],
            "issues_found": [],
            "recommendations": [],
            "auto_answers_applied": [],
            "questions_for_human": [],
            "overall_score": 0
        }
        
        try:
            # 1. CSRF保護確認
            csrf_result = self.check_csrf_protection()
            validation_results["security_checks"].append(csrf_result)
            
            # 2. 認証・セッション管理確認
            auth_result = self.check_authentication_security()
            validation_results["security_checks"].append(auth_result)
            
            # 3. 入力値検証確認
            input_result = self.check_input_validation()
            validation_results["security_checks"].append(input_result)
            
            # 4. SQLインジェクション対策確認
            sql_result = self.check_sql_injection_prevention()
            validation_results["security_checks"].append(sql_result)
            
            # 5. XSS対策確認
            xss_result = self.check_xss_prevention()
            validation_results["security_checks"].append(xss_result)
            
            # 6. HTTPS・暗号化確認
            encryption_result = self.check_encryption_settings()
            validation_results["security_checks"].append(encryption_result)
            
            # 7. ファイルアップロード安全性確認
            upload_result = self.check_file_upload_security()
            validation_results["security_checks"].append(upload_result)
            
            # 8. 環境変数・設定ファイル安全性確認
            config_result = self.check_configuration_security()
            validation_results["security_checks"].append(config_result)
            
            # 自動回答適用
            validation_results["auto_answers_applied"] = self.apply_auto_answers(
                validation_results["project_type"]
            )
            
            # 問題集計・推奨事項生成
            validation_results["issues_found"] = self.collect_all_issues()
            validation_results["recommendations"] = self.generate_recommendations()
            validation_results["questions_for_human"] = self.generate_human_questions()
            validation_results["overall_score"] = self.calculate_security_score()
            
            print(f"✅ セキュリティ検証完了 - スコア: {validation_results['overall_score']}/100")
            return validation_results
            
        except Exception as e:
            validation_results["error"] = str(e)
            print(f"❌ セキュリティ検証エラー: {e}")
            return validation_results
    
    def check_csrf_protection(self) -> Dict[str, Any]:
        """CSRF保護確認"""
        
        check_result = {
            "check_name": "CSRF Protection",
            "status": "unknown",
            "details": [],
            "issues": [],
            "auto_fixable": False
        }
        
        try:
            # .envでCSRF設定確認
            env_file = self.project_path / ".env"
            csrf_found = False
            
            if env_file.exists():
                with open(env_file, 'r', encoding='utf-8') as f:
                    env_content = f.read()
                    
                if "CSRF_TOKEN_SECRET" in env_content:
                    csrf_found = True
                    check_result["details"].append("✅ CSRF_TOKEN_SECRET設定確認")
                else:
                    check_result["issues"].append("❌ CSRF_TOKEN_SECRET未設定")
            
            # PHPファイルでCSRF実装確認
            csrf_implementation = False
            php_files = list(self.project_path.rglob("*.php"))[:20]  # パフォーマンス制限
            
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        
                    if re.search(r'csrf_token|CSRF_TOKEN', content, re.IGNORECASE):
                        csrf_implementation = True
                        check_result["details"].append(f"✅ CSRF実装確認: {php_file.name}")
                        break
                except:
                    continue
            
            if not csrf_implementation:
                check_result["issues"].append("❌ CSRF実装が見つからない")
            
            # 総合判定
            if csrf_found and csrf_implementation:
                check_result["status"] = "good"
            elif csrf_found or csrf_implementation:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                check_result["auto_fixable"] = True
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"検査エラー: {e}")
        
        return check_result
    
    def check_authentication_security(self) -> Dict[str, Any]:
        """認証・セッション管理確認"""
        
        check_result = {
            "check_name": "Authentication & Session Security",
            "status": "unknown",
            "details": [],
            "issues": [],
            "auto_fixable": False
        }
        
        try:
            # セッション設定確認
            session_secure = False
            php_files = list(self.project_path.rglob("*.php"))[:15]
            
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # セッション設定パターン検索
                    session_patterns = [
                        r'session_start\(\)',
                        r'ini_set\(["\']session\.',
                        r'session_set_cookie_params'
                    ]
                    
                    for pattern in session_patterns:
                        if re.search(pattern, content):
                            session_secure = True
                            check_result["details"].append(f"✅ セッション設定確認: {php_file.name}")
                            break
                            
                except:
                    continue
            
            # パスワードハッシュ化確認
            password_secure = False
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    hash_patterns = [
                        r'password_hash\(',
                        r'password_verify\(',
                        r'bcrypt',
                        r'hash\('
                    ]
                    
                    for pattern in hash_patterns:
                        if re.search(pattern, content):
                            password_secure = True
                            check_result["details"].append(f"✅ パスワードハッシュ化確認: {php_file.name}")
                            break
                            
                except:
                    continue
            
            # 認証実装確認
            auth_implementation = False
            auth_patterns = [
                r'login|authenticate',
                r'user.*session',
                r'auth.*check'
            ]
            
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    for pattern in auth_patterns:
                        if re.search(pattern, content, re.IGNORECASE):
                            auth_implementation = True
                            check_result["details"].append(f"✅ 認証実装確認: {php_file.name}")
                            break
                            
                except:
                    continue
            
            # 問題点チェック
            if not session_secure:
                check_result["issues"].append("❌ セッション設定が不適切")
            if not password_secure:
                check_result["issues"].append("❌ パスワードハッシュ化未実装")
            if not auth_implementation:
                check_result["issues"].append("❌ 認証システム未確認")
            
            # 総合判定
            score = sum([session_secure, password_secure, auth_implementation])
            if score >= 3:
                check_result["status"] = "good"
            elif score >= 2:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"検査エラー: {e}")
        
        return check_result
    
    def check_input_validation(self) -> Dict[str, Any]:
        """入力値検証確認"""
        
        check_result = {
            "check_name": "Input Validation",
            "status": "unknown",
            "details": [],
            "issues": [],
            "auto_fixable": False
        }
        
        try:
            validation_found = False
            sanitization_found = False
            
            php_files = list(self.project_path.rglob("*.php"))[:15]
            
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # 入力値検証パターン
                    validation_patterns = [
                        r'filter_var\(',
                        r'is_numeric\(',
                        r'preg_match\(',
                        r'validate_',
                        r'empty\(',
                        r'isset\('
                    ]
                    
                    # サニタイゼーションパターン
                    sanitization_patterns = [
                        r'htmlspecialchars\(',
                        r'strip_tags\(',
                        r'filter_input\(',
                        r'mysqli_real_escape_string\(',
                        r'addslashes\('
                    ]
                    
                    for pattern in validation_patterns:
                        if re.search(pattern, content):
                            validation_found = True
                            break
                    
                    for pattern in sanitization_patterns:
                        if re.search(pattern, content):
                            sanitization_found = True
                            break
                            
                except:
                    continue
            
            if validation_found:
                check_result["details"].append("✅ 入力値検証実装確認")
            else:
                check_result["issues"].append("❌ 入力値検証未確認")
            
            if sanitization_found:
                check_result["details"].append("✅ サニタイゼーション実装確認")
            else:
                check_result["issues"].append("❌ サニタイゼーション未確認")
            
            # JavaScript側の検証確認
            js_validation = False
            js_files = list(self.project_path.rglob("*.js"))[:10]
            
            for js_file in js_files:
                try:
                    with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    if re.search(r'validate|validation', content, re.IGNORECASE):
                        js_validation = True
                        check_result["details"].append("✅ フロントエンド検証確認")
                        break
                        
                except:
                    continue
            
            if not js_validation:
                check_result["issues"].append("⚠️ フロントエンド検証未確認")
            
            # 総合判定
            score = sum([validation_found, sanitization_found, js_validation])
            if score >= 3:
                check_result["status"] = "good"
            elif score >= 2:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"検査エラー: {e}")
        
        return check_result
    
    def check_sql_injection_prevention(self) -> Dict[str, Any]:
        """SQLインジェクション対策確認"""
        
        check_result = {
            "check_name": "SQL Injection Prevention",
            "status": "unknown",
            "details": [],
            "issues": [],
            "auto_fixable": False
        }
        
        try:
            prepared_statements = False
            dangerous_queries = []
            
            php_files = list(self.project_path.rglob("*.php"))[:20]
            
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # 準備文使用確認
                    prepared_patterns = [
                        r'prepare\(',
                        r'bindParam\(',
                        r'bindValue\(',
                        r'execute\('
                    ]
                    
                    for pattern in prepared_patterns:
                        if re.search(pattern, content):
                            prepared_statements = True
                            check_result["details"].append(f"✅ 準備文使用確認: {php_file.name}")
                            break
                    
                    # 危険なクエリパターン検索
                    dangerous_patterns = [
                        r'\$.*SELECT.*\,
                        r'\$.*INSERT.*\,
                        r'\$.*UPDATE.*\,
                        r'\$.*DELETE.*\
                    ]
                    
                    for pattern in dangerous_patterns:
                        matches = re.findall(pattern, content, re.IGNORECASE)
                        if matches:
                            dangerous_queries.extend(matches)
                            check_result["issues"].append(f"⚠️ 危険なクエリ: {php_file.name}")
                            
                except:
                    continue
            
            if prepared_statements:
                check_result["details"].append("✅ PDO準備文実装確認")
            else:
                check_result["issues"].append("❌ 準備文使用未確認")
            
            if dangerous_queries:
                check_result["issues"].append(f"❌ 危険なクエリ{len(dangerous_queries)}個発見")
            else:
                check_result["details"].append("✅ 危険なクエリなし")
            
            # 総合判定
            if prepared_statements and not dangerous_queries:
                check_result["status"] = "good"
            elif prepared_statements:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"検査エラー: {e}")
        
        return check_result
    
    def check_xss_prevention(self) -> Dict[str, Any]:
        """XSS対策確認"""
        
        check_result = {
            "check_name": "XSS Prevention",
            "status": "unknown",
            "details": [],
            "issues": [],
            "auto_fixable": False
        }
        
        try:
            output_escaping = False
            csp_headers = False
            
            # 出力エスケープ確認
            php_files = list(self.project_path.rglob("*.php"))[:15]
            
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    escape_patterns = [
                        r'htmlspecialchars\(',
                        r'htmlentities\(',
                        r'strip_tags\(',
                        r'esc_html\(',
                        r'h\('  # 短縮関数
                    ]
                    
                    for pattern in escape_patterns:
                        if re.search(pattern, content):
                            output_escaping = True
                            check_result["details"].append(f"✅ 出力エスケープ確認: {php_file.name}")
                            break
                            
                except:
                    continue
            
            # CSPヘッダー確認
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    if re.search(r'Content-Security-Policy', content):
                        csp_headers = True
                        check_result["details"].append("✅ CSPヘッダー設定確認")
                        break
                        
                except:
                    continue
            
            # .htaccessでのセキュリティヘッダー確認
            htaccess_file = self.project_path / ".htaccess"
            if htaccess_file.exists():
                try:
                    with open(htaccess_file, 'r', encoding='utf-8') as f:
                        htaccess_content = f.read()
                    
                    if "X-XSS-Protection" in htaccess_content:
                        check_result["details"].append("✅ X-XSS-Protection設定確認")
                    if "X-Content-Type-Options" in htaccess_content:
                        check_result["details"].append("✅ X-Content-Type-Options設定確認")
                        
                except:
                    pass
            
            if not output_escaping:
                check_result["issues"].append("❌ 出力エスケープ未確認")
            if not csp_headers:
                check_result["issues"].append("⚠️ CSPヘッダー未設定")
            
            # 総合判定
            score = sum([output_escaping, csp_headers])
            if score >= 2:
                check_result["status"] = "good"
            elif score >= 1:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"検査エラー: {e}")
        
        return check_result
    
    def check_encryption_settings(self) -> Dict[str, Any]:
        """HTTPS・暗号化確認"""
        
        check_result = {
            "check_name": "Encryption & HTTPS",
            "status": "unknown",
            "details": [],
            "issues": [],
            "auto_fixable": False
        }
        
        try:
            # 暗号化キー確認
            env_file = self.project_path / ".env"
            encryption_key = False
            
            if env_file.exists():
                with open(env_file, 'r', encoding='utf-8') as f:
                    env_content = f.read()
                
                encryption_patterns = [
                    "ENCRYPTION_KEY",
                    "APP_KEY",
                    "SECRET_KEY",
                    "CRYPTO_KEY"
                ]
                
                for pattern in encryption_patterns:
                    if pattern in env_content:
                        encryption_key = True
                        check_result["details"].append(f"✅ 暗号化キー確認: {pattern}")
                        break
            
            # HTTPS強制設定確認
            https_redirect = False
            htaccess_file = self.project_path / ".htaccess"
            
            if htaccess_file.exists():
                try:
                    with open(htaccess_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if "RewriteRule.*https" in content:
                        https_redirect = True
                        check_result["details"].append("✅ HTTPS リダイレクト設定確認")
                        
                except:
                    pass
            
            # セキュアクッキー設定確認
            secure_cookies = False
            php_files = list(self.project_path.rglob("*.php"))[:10]
            
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    if re.search(r'secure.*true|httponly.*true', content, re.IGNORECASE):
                        secure_cookies = True
                        check_result["details"].append("✅ セキュアクッキー設定確認")
                        break
                        
                except:
                    continue
            
            if not encryption_key:
                check_result["issues"].append("❌ 暗号化キー未設定")
            if not https_redirect:
                check_result["issues"].append("⚠️ HTTPS強制未設定")
            if not secure_cookies:
                check_result["issues"].append("⚠️ セキュアクッキー未設定")
            
            # 総合判定
            score = sum([encryption_key, https_redirect, secure_cookies])
            if score >= 3:
                check_result["status"] = "good"
            elif score >= 2:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"検査エラー: {e}")
        
        return check_result
    
    def check_file_upload_security(self) -> Dict[str, Any]:
        """ファイルアップロード安全性確認"""
        
        check_result = {
            "check_name": "File Upload Security",
            "status": "unknown",
            "details": [],
            "issues": [],
            "auto_fixable": False
        }
        
        try:
            upload_validation = False
            file_type_check = False
            size_limit = False
            
            php_files = list(self.project_path.rglob("*.php"))[:15]
            
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # ファイルアップロード処理検索
                    if "$_FILES" in content:
                        upload_validation = True
                        check_result["details"].append(f"✅ ファイルアップロード処理確認: {php_file.name}")
                        
                        # ファイルタイプチェック
                        if re.search(r'mime.*type|getimagesize|pathinfo.*PATHINFO_EXTENSION', content):
                            file_type_check = True
                            check_result["details"].append("✅ ファイルタイプ検証確認")
                        
                        # ファイルサイズ制限
                        if re.search(r'size.*limit|MAX_FILE_SIZE', content):
                            size_limit = True
                            check_result["details"].append("✅ ファイルサイズ制限確認")
                            
                except:
                    continue
            
            if upload_validation:
                if not file_type_check:
                    check_result["issues"].append("❌ ファイルタイプ検証未実装")
                if not size_limit:
                    check_result["issues"].append("❌ ファイルサイズ制限未実装")
            else:
                check_result["details"].append("ℹ️ ファイルアップロード機能なし")
                check_result["status"] = "not_applicable"
                return check_result
            
            # 総合判定
            if upload_validation and file_type_check and size_limit:
                check_result["status"] = "good"
            elif upload_validation:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"検査エラー: {e}")
        
        return check_result
    
    def check_configuration_security(self) -> Dict[str, Any]:
        """環境変数・設定ファイル安全性確認"""
        
        check_result = {
            "check_name": "Configuration Security",
            "status": "unknown",
            "details": [],
            "issues": [],
            "auto_fixable": True
        }
        
        try:
            # .env ファイル確認
            env_file = self.project_path / ".env"
            env_secure = True
            
            if env_file.exists():
                check_result["details"].append("✅ .env ファイル存在確認")
                
                # .gitignore で .env が除外されているか確認
                gitignore_file = self.project_path / ".gitignore"
                env_ignored = False
                
                if gitignore_file.exists():
                    with open(gitignore_file, 'r', encoding='utf-8') as f:
                        gitignore_content = f.read()
                    
                    if ".env" in gitignore_content:
                        env_ignored = True
                        check_result["details"].append("✅ .env が .gitignore に追加済み")
                
                if not env_ignored:
                    check_result["issues"].append("❌ .env が .gitignore に未追加")
                    env_secure = False
                
                # 重要な設定の存在確認
                with open(env_file, 'r', encoding='utf-8') as f:
                    env_content = f.read()
                
                required_settings = [
                    "DB_HOST", "DB_NAME", "DB_USER", "DB_PASS",
                    "ENCRYPTION_KEY", "CSRF_TOKEN_SECRET"
                ]
                
                missing_settings = []
                for setting in required_settings:
                    if setting not in env_content:
                        missing_settings.append(setting)
                
                if missing_settings:
                    check_result["issues"].append(f"⚠️ 未設定項目: {', '.join(missing_settings)}")
                else:
                    check_result["details"].append("✅ 必須設定項目すべて存在")
            else:
                check_result["issues"].append("❌ .env ファイル未作成")
                env_secure = False
            
            # 設定ファイルのアクセス権限確認（Unix系）
            if os.name != 'nt':  # Windows以外
                try:
                    if env_file.exists():
                        file_mode = oct(env_file.stat().st_mode)[-3:]
                        if file_mode == '600':
                            check_result["details"].append("✅ .env ファイル権限適切")
                        else:
                            check_result["issues"].append(f"⚠️ .env ファイル権限不適切: {file_mode}")
                except:
                    pass
            
            # 総合判定
            if env_secure and not missing_settings:
                check_result["status"] = "good"
            elif env_secure:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"検査エラー: {e}")
        
        return check_result
    
    def apply_auto_answers(self, project_type: str) -> List[str]:
        """自動回答適用"""
        
        applied_answers = []
        
        try:
            # プロジェクトタイプ別自動回答取得
            project_templates = self.auto_answers.get("auto_answers_database", {}).get("project_templates", {})
            
            if project_type in project_templates:
                template = project_templates[project_type]
                security_reqs = template.get("universal_answers", {}).get("security_requirements", {})
                
                for requirement, answer in security_reqs.items():
                    applied_answers.append(f"自動回答適用: {requirement} = {answer}")
                    
        except Exception as e:
            applied_answers.append(f"自動回答適用エラー: {e}")
        
        return applied_answers
    
    def collect_all_issues(self) -> List[str]:
        """全問題点の集計"""
        
        all_issues = []
        for check in self.security_checks:
            all_issues.extend(check.get("issues", []))
        
        return all_issues
    
    def generate_recommendations(self) -> List[str]:
        """推奨事項生成"""
        
        recommendations = []
        
        # 一般的なセキュリティ推奨事項
        recommendations.extend([
            "CSRF保護の実装・強化",
            "全入力値の厳密な検証・サニタイゼーション",
            "PDO準備文によるSQLインジェクション対策",
            "出力エスケープによるXSS対策",
            "HTTPS強制・セキュアクッキー設定",
            "定期的なセキュリティ監査・脆弱性検査"
        ])
        
        return recommendations
    
    def generate_human_questions(self) -> List[str]:
        """人間への質問生成"""
        
        questions = [
            "このプロジェクトの主要なセキュリティ要件は何ですか？",
            "データの機密レベル・保護要件を教えてください",
            "ユーザー認証の方式（シングルサインオン等）の要件は？",
            "コンプライアンス要件（個人情報保護法等）はありますか？",
            "セキュリティ監査・ペネトレーションテストの予定は？"
        ]
        
        return questions
    
    def calculate_security_score(self) -> int:
        """セキュリティスコア計算"""
        
        total_checks = len(self.security_checks)
        good_checks = sum(1 for check in self.security_checks if check.get("status") == "good")
        warning_checks = sum(1 for check in self.security_checks if check.get("status") == "warning")
        
        if total_checks == 0:
            return 0
        
        # スコア計算: good=100点, warning=60点, その他=0点
        score = (good_checks * 100 + warning_checks * 60) // total_checks
        return min(100, max(0, score))

def main():
    """セキュリティ検証Hooks単体テスト"""
    
    import sys
    project_path = sys.argv[1] if len(sys.argv) > 1 else "."
    
    print("🔒 セキュリティ検証Hooks - 単体テスト")
    print("=" * 50)
    
    # テスト用プロジェクト分析データ
    test_analysis = {
        "project_type": {"primary_type": "nagano3_kicho"},
        "technology_stack": {"backend": ["PHP"], "frontend": ["JavaScript"]}
    }
    
    # セキュリティ検証実行
    hooks = SecurityValidationHooks(project_path)
    result = hooks.execute_security_validation(test_analysis)
    
    # 結果表示
    print(f"📊 セキュリティスコア: {result['overall_score']}/100")
    print(f"🔍 実行した検査: {len(result['security_checks'])}項目")
    print(f"⚠️ 発見した問題: {len(result['issues_found'])}件")
    
    if result['issues_found']:
        print("\n🚨 発見された問題:")
        for issue in result['issues_found'][:5]:  # 最初の5件表示
            print(f"  - {issue}")
    
    return result['overall_score'] >= 70

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)