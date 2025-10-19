#!/usr/bin/env python3
"""
🏗️ インフラ確認Hooks
Universal Hooks - インフラ・環境・依存関係確認

ファイル: ~/.claude/hooks/universal/infrastructure_check.py
"""

import os
import json
import subprocess
import platform
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

class InfrastructureCheckHooks:
    """インフラ確認Hooks"""
    
    def __init__(self, project_path: str = "."):
        self.project_path = Path(project_path).resolve()
        self.auto_answers = self.load_auto_answers()
        self.infrastructure_checks = []
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
    
    def execute_infrastructure_check(self, project_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """インフラ確認メイン実行"""
        
        print("🏗️ インフラ確認Hooks実行中...")
        
        check_results = {
            "timestamp": datetime.now().isoformat(),
            "project_path": str(self.project_path),
            "project_type": project_analysis.get("project_type", {}).get("primary_type", "unknown"),
            "infrastructure_checks": [],
            "environment_info": {},
            "dependencies_status": {},
            "database_config": {},
            "api_connections": {},
            "issues_found": [],
            "recommendations": [],
            "auto_answers_applied": [],
            "questions_for_human": [],
            "overall_score": 0
        }
        
        try:
            # 1. システム環境確認
            env_result = self.check_system_environment()
            check_results["infrastructure_checks"].append(env_result)
            check_results["environment_info"] = env_result.get("details", {})
            
            # 2. 依存関係確認
            deps_result = self.check_dependencies()
            check_results["infrastructure_checks"].append(deps_result)
            check_results["dependencies_status"] = deps_result.get("details", {})
            
            # 3. データベース設定確認
            db_result = self.check_database_configuration()
            check_results["infrastructure_checks"].append(db_result)
            check_results["database_config"] = db_result.get("details", {})
            
            # 4. 外部API接続確認
            api_result = self.check_external_api_connections()
            check_results["infrastructure_checks"].append(api_result)
            check_results["api_connections"] = api_result.get("details", {})
            
            # 5. Web サーバー設定確認
            web_result = self.check_web_server_configuration()
            check_results["infrastructure_checks"].append(web_result)
            
            # 6. ファイル権限・ディレクトリ構造確認
            permissions_result = self.check_file_permissions()
            check_results["infrastructure_checks"].append(permissions_result)
            
            # 7. ログ・バックアップ設定確認
            backup_result = self.check_backup_and_logging()
            check_results["infrastructure_checks"].append(backup_result)
            
            # 自動回答適用
            check_results["auto_answers_applied"] = self.apply_auto_answers(
                check_results["project_type"]
            )
            
            # 問題集計・推奨事項生成
            check_results["issues_found"] = self.collect_all_issues()
            check_results["recommendations"] = self.generate_recommendations()
            check_results["questions_for_human"] = self.generate_human_questions()
            check_results["overall_score"] = self.calculate_infrastructure_score()
            
            print(f"✅ インフラ確認完了 - スコア: {check_results['overall_score']}/100")
            return check_results
            
        except Exception as e:
            check_results["error"] = str(e)
            print(f"❌ インフラ確認エラー: {e}")
            return check_results
    
    def check_system_environment(self) -> Dict[str, Any]:
        """システム環境確認"""
        
        check_result = {
            "check_name": "System Environment",
            "status": "unknown",
            "details": {},
            "issues": [],
            "auto_fixable": False
        }
        
        try:
            # OS情報
            check_result["details"]["os"] = {
                "platform": platform.system(),
                "release": platform.release(),
                "architecture": platform.architecture()[0]
            }
            
            # PHP バージョン確認
            try:
                php_version = subprocess.run(
                    ['php', '--version'], 
                    capture_output=True, 
                    text=True, 
                    timeout=10
                )
                if php_version.returncode == 0:
                    version_line = php_version.stdout.split('\n')[0]
                    check_result["details"]["php_version"] = version_line
                    
                    # バージョン要件チェック
                    if "PHP 8." in version_line:
                        check_result["details"]["php_status"] = "✅ PHP 8.x 対応"
                    elif "PHP 7." in version_line:
                        check_result["details"]["php_status"] = "⚠️ PHP 7.x (アップグレード推奨)"
                        check_result["issues"].append("PHP 8.x へのアップグレードを推奨")
                    else:
                        check_result["details"]["php_status"] = "❌ 古いPHPバージョン"
                        check_result["issues"].append("PHP バージョンが古すぎます")
                else:
                    check_result["issues"].append("PHP が見つかりません")
            except:
                check_result["issues"].append("PHP バージョン確認失敗")
            
            # Python バージョン確認
            try:
                python_version = subprocess.run(
                    ['python3', '--version'], 
                    capture_output=True, 
                    text=True, 
                    timeout=10
                )
                if python_version.returncode == 0:
                    check_result["details"]["python_version"] = python_version.stdout.strip()
                    
                    if "Python 3.9" in python_version.stdout or "Python 3.1" in python_version.stdout:
                        check_result["details"]["python_status"] = "✅ Python 3.9+ 対応"
                    else:
                        check_result["details"]["python_status"] = "⚠️ Python バージョン確認必要"
                else:
                    check_result["details"]["python_status"] = "❌ Python3 未インストール"
            except:
                check_result["details"]["python_status"] = "Python3 確認失敗"
            
            # Node.js バージョン確認（JavaScriptプロジェクトの場合）
            try:
                node_version = subprocess.run(
                    ['node', '--version'], 
                    capture_output=True, 
                    text=True, 
                    timeout=10
                )
                if node_version.returncode == 0:
                    check_result["details"]["node_version"] = node_version.stdout.strip()
                    check_result["details"]["node_status"] = "✅ Node.js 利用可能"
            except:
                check_result["details"]["node_status"] = "Node.js 未インストール"
            
            # Composer 確認
            try:
                composer_version = subprocess.run(
                    ['composer', '--version'], 
                    capture_output=True, 
                    text=True, 
                    timeout=10
                )
                if composer_version.returncode == 0:
                    check_result["details"]["composer_status"] = "✅ Composer 利用可能"
                else:
                    check_result["issues"].append("Composer が見つかりません")
            except:
                check_result["issues"].append("Composer 確認失敗")
            
            # メモリ・ディスク容量確認
            try:
                if platform.system() != "Windows":
                    # Unix系システムでの確認
                    df_result = subprocess.run(
                        ['df', '-h', '.'], 
                        capture_output=True, 
                        text=True, 
                        timeout=10
                    )
                    if df_result.returncode == 0:
                        lines = df_result.stdout.strip().split('\n')
                        if len(lines) > 1:
                            disk_info = lines[1].split()
                            check_result["details"]["disk_space"] = {
                                "total": disk_info[1] if len(disk_info) > 1 else "不明",
                                "used": disk_info[2] if len(disk_info) > 2 else "不明",
                                "available": disk_info[3] if len(disk_info) > 3 else "不明"
                            }
            except:
                check_result["details"]["disk_space"] = "確認失敗"
            
            # 総合判定
            critical_issues = [issue for issue in check_result["issues"] if "❌" in issue]
            if not critical_issues:
                check_result["status"] = "good"
            elif len(critical_issues) == 1:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"システム環境確認エラー: {e}")
        
        return check_result
    
    def check_dependencies(self) -> Dict[str, Any]:
        """依存関係確認"""
        
        check_result = {
            "check_name": "Dependencies Check",
            "status": "unknown",
            "details": {},
            "issues": [],
            "auto_fixable": True
        }
        
        try:
            # composer.json 確認
            composer_file = self.project_path / "composer.json"
            if composer_file.exists():
                try:
                    with open(composer_file, 'r', encoding='utf-8') as f:
                        composer_data = json.load(f)
                    
                    check_result["details"]["composer"] = {
                        "file_exists": True,
                        "require": composer_data.get("require", {}),
                        "require_dev": composer_data.get("require-dev", {})
                    }
                    
                    # vendor ディレクトリの確認
                    vendor_dir = self.project_path / "vendor"
                    if vendor_dir.exists():
                        check_result["details"]["composer"]["vendor_installed"] = True
                    else:
                        check_result["issues"].append("❌ composer install が必要")
                        check_result["auto_fixable"] = True
                    
                except Exception as e:
                    check_result["issues"].append(f"composer.json 読み込みエラー: {e}")
            else:
                check_result["details"]["composer"] = {"file_exists": False}
            
            # package.json 確認
            package_file = self.project_path / "package.json"
            if package_file.exists():
                try:
                    with open(package_file, 'r', encoding='utf-8') as f:
                        package_data = json.load(f)
                    
                    check_result["details"]["npm"] = {
                        "file_exists": True,
                        "dependencies": package_data.get("dependencies", {}),
                        "devDependencies": package_data.get("devDependencies", {})
                    }
                    
                    # node_modules ディレクトリの確認
                    node_modules_dir = self.project_path / "node_modules"
                    if node_modules_dir.exists():
                        check_result["details"]["npm"]["node_modules_installed"] = True
                    else:
                        check_result["issues"].append("❌ npm install が必要")
                        check_result["auto_fixable"] = True
                    
                except Exception as e:
                    check_result["issues"].append(f"package.json 読み込みエラー: {e}")
            else:
                check_result["details"]["npm"] = {"file_exists": False}
            
            # requirements.txt 確認（Python）
            requirements_file = self.project_path / "requirements.txt"
            if requirements_file.exists():
                try:
                    with open(requirements_file, 'r', encoding='utf-8') as f:
                        requirements = f.read().strip().split('\n')
                    
                    check_result["details"]["python"] = {
                        "file_exists": True,
                        "requirements": [req for req in requirements if req.strip()]
                    }
                    
                    # pip freeze で確認（可能な場合）
                    try:
                        pip_list = subprocess.run(
                            ['pip', 'list'], 
                            capture_output=True, 
                            text=True, 
                            timeout=15
                        )
                        if pip_list.returncode == 0:
                            check_result["details"]["python"]["pip_packages"] = "確認済み"
                        else:
                            check_result["issues"].append("⚠️ pip パッケージ確認失敗")
                    except:
                        pass
                    
                except Exception as e:
                    check_result["issues"].append(f"requirements.txt 読み込みエラー: {e}")
            else:
                check_result["details"]["python"] = {"file_exists": False}
            
            # 総合判定
            if not check_result["issues"]:
                check_result["status"] = "good"
            elif all("⚠️" in issue for issue in check_result["issues"]):
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"依存関係確認エラー: {e}")
        
        return check_result
    
    def check_database_configuration(self) -> Dict[str, Any]:
        """データベース設定確認"""
        
        check_result = {
            "check_name": "Database Configuration",
            "status": "unknown",
            "details": {},
            "issues": [],
            "auto_fixable": False
        }
        
        try:
            # .env ファイルからDB設定確認
            env_file = self.project_path / ".env"
            db_config = {}
            
            if env_file.exists():
                with open(env_file, 'r', encoding='utf-8') as f:
                    env_content = f.read()
                
                # DB設定項目の確認
                db_settings = [
                    "DB_HOST", "DB_NAME", "DB_USER", "DB_PASS", "DB_PORT"
                ]
                
                for setting in db_settings:
                    if setting in env_content:
                        # 値の抽出（セキュリティ考慮で実際の値は非表示）
                        line = [line for line in env_content.split('\n') if line.startswith(setting)]
                        if line:
                            value = line[0].split('=', 1)[1] if '=' in line[0] else ''
                            db_config[setting] = "設定済み" if value.strip() else "未設定"
                    else:
                        db_config[setting] = "未設定"
                
                check_result["details"]["database_config"] = db_config
                
                # 必須設定の確認
                missing_settings = [k for k, v in db_config.items() if v == "未設定"]
                if missing_settings:
                    check_result["issues"].append(f"❌ 未設定のDB項目: {', '.join(missing_settings)}")
                else:
                    check_result["details"]["config_status"] = "✅ 基本設定完了"
                
                # データベースタイプの推測
                if "postgresql" in env_content.lower() or "postgres" in env_content.lower():
                    check_result["details"]["db_type"] = "PostgreSQL"
                elif "mysql" in env_content.lower():
                    check_result["details"]["db_type"] = "MySQL"
                elif "sqlite" in env_content.lower():
                    check_result["details"]["db_type"] = "SQLite"
                else:
                    check_result["details"]["db_type"] = "不明"
                
            else:
                check_result["issues"].append("❌ .env ファイルが見つかりません")
            
            # データベース接続テスト（実際の接続は行わず、設定の妥当性のみ）
            if db_config.get("DB_HOST") == "設定済み":
                check_result["details"]["connection_test"] = "設定ファイル確認済み（接続テストは手動実行推奨）"
            else:
                check_result["issues"].append("⚠️ データベース接続テストが必要")
            
            # SQL ファイルの確認
            sql_files = list(self.project_path.rglob("*.sql"))
            if sql_files:
                check_result["details"]["sql_files"] = f"{len(sql_files)}個のSQLファイル発見"
                check_result["details"]["sql_file_list"] = [str(f.name) for f in sql_files[:5]]
            else:
                check_result["details"]["sql_files"] = "SQLファイルなし"
            
            # 総合判定
            critical_issues = [issue for issue in check_result["issues"] if "❌" in issue]
            if not critical_issues:
                check_result["status"] = "good"
            elif len(critical_issues) == 1:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"データベース設定確認エラー: {e}")
        
        return check_result
    
    def check_external_api_connections(self) -> Dict[str, Any]:
        """外部API接続確認"""
        
        check_result = {
            "check_name": "External API Connections",
            "status": "unknown",
            "details": {},
            "issues": [],
            "auto_fixable": False
        }
        
        try:
            # .env ファイルからAPI設定確認
            env_file = self.project_path / ".env"
            api_configs = {}
            
            if env_file.exists():
                with open(env_file, 'r', encoding='utf-8') as f:
                    env_content = f.read()
                
                # 主要なAPI設定の確認
                api_patterns = {
                    "MoneyForward": ["MF_CLIENT_ID", "MF_CLIENT_SECRET"],
                    "OpenAI": ["OPENAI_API_KEY", "CHATWORK_API_KEY"],
                    "AWS": ["AMAZON_CLIENT_ID", "AWS_ACCESS_KEY"],
                    "Stripe": ["STRIPE_PUBLIC_KEY", "STRIPE_SECRET_KEY"],
                    "Shopify": ["SHOPIFY_ACCESS_TOKEN", "SHOPIFY_API_KEY"],
                    "GitHub": ["GITHUB_TOKEN"],
                    "Google": ["GOOGLE_API_KEY", "GOOGLE_CLIENT_ID"]
                }
                
                for service_name, keys in api_patterns.items():
                    service_config = {}
                    for key in keys:
                        if key in env_content:
                            line = [line for line in env_content.split('\n') if line.startswith(key)]
                            if line and '=' in line[0]:
                                value = line[0].split('=', 1)[1].strip()
                                service_config[key] = "設定済み" if value else "未設定"
                            else:
                                service_config[key] = "未設定"
                        else:
                            service_config[key] = "未設定"
                    
                    # サービスが設定されている場合のみ追加
                    if any(status == "設定済み" for status in service_config.values()):
                        api_configs[service_name] = service_config
                
                check_result["details"]["api_configurations"] = api_configs
                
                # 設定不備の確認
                for service_name, config in api_configs.items():
                    missing_keys = [key for key, status in config.items() if status == "未設定"]
                    if missing_keys:
                        check_result["issues"].append(f"⚠️ {service_name}: 未設定キー {', '.join(missing_keys)}")
                    else:
                        check_result["details"][f"{service_name}_status"] = "✅ 設定完了"
                
            else:
                check_result["issues"].append("❌ .env ファイルが見つかりません")
            
            # APIクライアント実装の確認
            api_implementations = {}
            php_files = list(self.project_path.rglob("*.php"))[:20]
            
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # API実装パターンの検索
                    if "curl" in content.lower() or "guzzle" in content.lower():
                        api_implementations["HTTP_Client"] = f"確認済み: {php_file.name}"
                    
                    if "mf_api" in content.lower() or "moneyforward" in content.lower():
                        api_implementations["MoneyForward"] = f"実装確認: {php_file.name}"
                    
                    if "openai" in content.lower() or "chatgpt" in content.lower():
                        api_implementations["OpenAI"] = f"実装確認: {php_file.name}"
                        
                except:
                    continue
            
            check_result["details"]["api_implementations"] = api_implementations
            
            # 総合判定
            if api_configs and not check_result["issues"]:
                check_result["status"] = "good"
            elif api_configs:
                check_result["status"] = "warning"
            elif not api_configs:
                check_result["status"] = "not_applicable"
                check_result["details"]["note"] = "外部API使用なし"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"外部API確認エラー: {e}")
        
        return check_result
    
    def check_web_server_configuration(self) -> Dict[str, Any]:
        """Webサーバー設定確認"""
        
        check_result = {
            "check_name": "Web Server Configuration",
            "status": "unknown",
            "details": {},
            "issues": [],
            "auto_fixable": True
        }
        
        try:
            # .htaccess ファイル確認
            htaccess_file = self.project_path / ".htaccess"
            if htaccess_file.exists():
                with open(htaccess_file, 'r', encoding='utf-8') as f:
                    htaccess_content = f.read()
                
                check_result["details"]["htaccess"] = {"exists": True}
                
                # 重要な設定の確認
                important_settings = {
                    "RewriteEngine": "URL書き換え",
                    "DirectoryIndex": "デフォルトファイル",
                    "ErrorDocument": "エラーページ",
                    "Header": "セキュリティヘッダー",
                    "ExpiresActive": "キャッシュ制御"
                }
                
                found_settings = {}
                for setting, description in important_settings.items():
                    if setting in htaccess_content:
                        found_settings[setting] = f"✅ {description}設定済み"
                    else:
                        found_settings[setting] = f"❌ {description}未設定"
                        check_result["issues"].append(f"⚠️ {description}の設定推奨")
                
                check_result["details"]["htaccess_settings"] = found_settings
                
            else:
                check_result["details"]["htaccess"] = {"exists": False}
                check_result["issues"].append("❌ .htaccess ファイル未作成")
                check_result["auto_fixable"] = True
            
            # index.php の確認
            index_file = self.project_path / "index.php"
            if index_file.exists():
                check_result["details"]["index_php"] = "✅ エントリーポイント確認"
            else:
                check_result["issues"].append("❌ index.php が見つかりません")
            
            # public ディレクトリの確認
            public_dir = self.project_path / "public"
            if public_dir.exists():
                check_result["details"]["public_directory"] = "✅ public ディレクトリ存在"
                
                # 静的ファイルの確認
                css_files = list(public_dir.rglob("*.css"))
                js_files = list(public_dir.rglob("*.js"))
                
                check_result["details"]["static_files"] = {
                    "css_files": len(css_files),
                    "js_files": len(js_files)
                }
            else:
                check_result["details"]["public_directory"] = "❌ public ディレクトリなし"
            
            # robots.txt の確認
            robots_file = self.project_path / "robots.txt"
            if robots_file.exists():
                check_result["details"]["robots_txt"] = "✅ robots.txt 存在"
            else:
                check_result["details"]["robots_txt"] = "⚠️ robots.txt 未作成"
            
            # 総合判定
            critical_issues = [issue for issue in check_result["issues"] if "❌" in issue]
            if not critical_issues:
                check_result["status"] = "good"
            elif len(critical_issues) <= 2:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"Webサーバー設定確認エラー: {e}")
        
        return check_result
    
    def check_file_permissions(self) -> Dict[str, Any]:
        """ファイル権限・ディレクトリ構造確認"""
        
        check_result = {
            "check_name": "File Permissions & Directory Structure",
            "status": "unknown",
            "details": {},
            "issues": [],
            "auto_fixable": True
        }
        
        try:
            # ディレクトリ構造の確認
            important_dirs = {
                "common": "共通ライブラリ",
                "modules": "モジュール",
                "assets": "静的ファイル",
                "uploads": "アップロードファイル",
                "logs": "ログファイル",
                "cache": "キャッシュ",
                "config": "設定ファイル"
            }
            
            directory_status = {}
            for dir_name, description in important_dirs.items():
                target_dir = self.project_path / dir_name
                if target_dir.exists():
                    directory_status[dir_name] = f"✅ {description}ディレクトリ存在"
                    
                    # 書き込み権限確認（Unix系のみ）
                    if os.name != 'nt' and dir_name in ['uploads', 'logs', 'cache']:
                        try:
                            if os.access(target_dir, os.W_OK):
                                directory_status[f"{dir_name}_writable"] = "✅ 書き込み権限OK"
                            else:
                                directory_status[f"{dir_name}_writable"] = "❌ 書き込み権限なし"
                                check_result["issues"].append(f"❌ {dir_name} ディレクトリの書き込み権限が必要")
                        except:
                            pass
                else:
                    directory_status[dir_name] = f"⚠️ {description}ディレクトリなし"
                    if dir_name in ['uploads', 'logs']:
                        check_result["issues"].append(f"⚠️ {dir_name} ディレクトリの作成推奨")
            
            check_result["details"]["directory_structure"] = directory_status
            
            # 重要ファイルの権限確認（Unix系のみ）
            if os.name != 'nt':
                important_files = {
                    ".env": "環境設定",
                    "composer.json": "依存関係",
                    "index.php": "エントリーポイント"
                }
                
                file_permissions = {}
                for file_name, description in important_files.items():
                    target_file = self.project_path / file_name
                    if target_file.exists():
                        try:
                            file_mode = oct(target_file.stat().st_mode)[-3:]
                            file_permissions[file_name] = f"{description}: {file_mode}"
                            
                            # .env ファイルは特に厳格に
                            if file_name == ".env" and file_mode != "600":
                                check_result["issues"].append(f"⚠️ .env ファイルの権限を600に変更推奨")
                                
                        except:
                            file_permissions[file_name] = f"{description}: 権限確認失敗"
                    else:
                        file_permissions[file_name] = f"{description}: ファイルなし"
                
                check_result["details"]["file_permissions"] = file_permissions
            
            # ファイルサイズ・容量確認
            total_size = 0
            file_count = 0
            large_files = []
            
            for file_path in self.project_path.rglob("*"):
                if file_path.is_file():
                    try:
                        size = file_path.stat().st_size
                        total_size += size
                        file_count += 1
                        
                        # 10MB以上のファイルを記録
                        if size > 10 * 1024 * 1024:
                            large_files.append(f"{file_path.name}: {size // (1024*1024)}MB")
                            
                    except:
                        continue
            
            check_result["details"]["project_size"] = {
                "total_files": file_count,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "large_files": large_files[:5]  # 最大5個まで
            }
            
            if large_files:
                check_result["issues"].append(f"⚠️ 大容量ファイル{len(large_files)}個発見")
            
            # 総合判定
            critical_issues = [issue for issue in check_result["issues"] if "❌" in issue]
            if not critical_issues:
                check_result["status"] = "good"
            elif len(critical_issues) <= 2:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"ファイル権限確認エラー: {e}")
        
        return check_result
    
    def check_backup_and_logging(self) -> Dict[str, Any]:
        """ログ・バックアップ設定確認"""
        
        check_result = {
            "check_name": "Backup & Logging Configuration",
            "status": "unknown",
            "details": {},
            "issues": [],
            "auto_fixable": True
        }
        
        try:
            # ログ設定確認
            log_configs = {}
            
            # ログディレクトリの確認
            log_dirs = ["logs", "log", "var/log"]
            log_dir_found = False
            
            for log_dir_name in log_dirs:
                log_dir = self.project_path / log_dir_name
                if log_dir.exists():
                    log_dir_found = True
                    log_files = list(log_dir.rglob("*.log"))
                    log_configs[log_dir_name] = {
                        "exists": True,
                        "log_files": len(log_files),
                        "writable": os.access(log_dir, os.W_OK) if os.name != 'nt' else True
                    }
                    break
            
            if not log_dir_found:
                check_result["issues"].append("❌ ログディレクトリが見つかりません")
                check_result["auto_fixable"] = True
            else:
                check_result["details"]["logging"] = log_configs
            
            # PHP ログ設定確認
            php_files = list(self.project_path.rglob("*.php"))[:10]
            logging_implementation = False
            
            for php_file in php_files:
                try:
                    with open(php_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    log_patterns = [
                        "error_log(",
                        "file_put_contents(",
                        "fwrite(",
                        "log_message(",
                        "logger->"
                    ]
                    
                    for pattern in log_patterns:
                        if pattern in content:
                            logging_implementation = True
                            check_result["details"]["php_logging"] = f"✅ ログ実装確認: {php_file.name}"
                            break
                    
                    if logging_implementation:
                        break
                        
                except:
                    continue
            
            if not logging_implementation:
                check_result["issues"].append("⚠️ PHPログ実装未確認")
            
            # バックアップ関連ファイルの確認
            backup_files = []
            backup_patterns = ["backup", "dump", ".sql", ".bak"]
            
            for pattern in backup_patterns:
                files = list(self.project_path.rglob(f"*{pattern}*"))
                backup_files.extend([f.name for f in files[:3]])  # 最大3個まで
            
            if backup_files:
                check_result["details"]["backup_files"] = backup_files
            else:
                check_result["issues"].append("⚠️ バックアップファイル未確認")
            
            # データベースバックアップスクリプト確認
            backup_scripts = list(self.project_path.rglob("*backup*.sh")) + \
                           list(self.project_path.rglob("*backup*.php"))
            
            if backup_scripts:
                check_result["details"]["backup_scripts"] = [s.name for s in backup_scripts]
            else:
                check_result["issues"].append("⚠️ バックアップスクリプト未確認")
            
            # cron設定ファイル確認
            cron_files = list(self.project_path.rglob("*cron*")) + \
                        list(self.project_path.rglob("*schedule*"))
            
            if cron_files:
                check_result["details"]["cron_files"] = [c.name for c in cron_files]
            else:
                check_result["details"]["cron_files"] = "自動実行設定なし"
            
            # .gitignore でログファイル除外確認
            gitignore_file = self.project_path / ".gitignore"
            log_ignored = False
            
            if gitignore_file.exists():
                with open(gitignore_file, 'r', encoding='utf-8') as f:
                    gitignore_content = f.read()
                
                if "*.log" in gitignore_content or "logs/" in gitignore_content:
                    log_ignored = True
                    check_result["details"]["gitignore_logs"] = "✅ ログファイル除外設定済み"
                else:
                    check_result["issues"].append("⚠️ .gitignore にログファイル除外を追加推奨")
            
            # 総合判定
            critical_issues = [issue for issue in check_result["issues"] if "❌" in issue]
            if not critical_issues and logging_implementation:
                check_result["status"] = "good"
            elif not critical_issues:
                check_result["status"] = "warning"
            else:
                check_result["status"] = "critical"
                
        except Exception as e:
            check_result["status"] = "error"
            check_result["issues"].append(f"ログ・バックアップ確認エラー: {e}")
        
        return check_result
    
    def apply_auto_answers(self, project_type: str) -> List[str]:
        """自動回答適用"""
        
        applied_answers = []
        
        try:
            project_templates = self.auto_answers.get("auto_answers_database", {}).get("project_templates", {})
            
            if project_type in project_templates:
                template = project_templates[project_type]
                performance_reqs = template.get("universal_answers", {}).get("performance_requirements", {})
                
                for requirement, answer in performance_reqs.items():
                    applied_answers.append(f"自動回答適用: {requirement} = {answer}")
                    
        except Exception as e:
            applied_answers.append(f"自動回答適用エラー: {e}")
        
        return applied_answers
    
    def collect_all_issues(self) -> List[str]:
        """全問題点の集計"""
        
        all_issues = []
        for check in self.infrastructure_checks:
            all_issues.extend(check.get("issues", []))
        
        return all_issues
    
    def generate_recommendations(self) -> List[str]:
        """推奨事項生成"""
        
        recommendations = [
            "依存関係の定期的な更新・セキュリティチェック",
            "ログローテーション・容量監視の設定",
            "データベースの定期バックアップ自動化",
            "開発・本番環境の設定分離",
            "パフォーマンス監視・アラート設定",
            "ディスク容量・メモリ使用量の監視",
            "SSL証明書の有効期限管理",
            "外部APIの利用制限・エラーハンドリング強化"
        ]
        
        return recommendations
    
    def generate_human_questions(self) -> List[str]:
        """人間への質問生成"""
        
        questions = [
            "このプロジェクトの想定同時接続数・負荷要件は？",
            "データベースのバックアップ・復旧手順は決まっていますか？",
            "外部APIの利用制限・エラー時の代替手段は？",
            "開発・ステージング・本番環境の構成は？",
            "監視・アラート（サーバーダウン等）の要件は？",
            "CDN・ロードバランサーの使用予定は？",
            "ログの保存期間・分析要件は？",
            "災害対策・事業継続計画（BCP）の要件は？"
        ]
        
        return questions
    
    def calculate_infrastructure_score(self) -> int:
        """インフラスコア計算"""
        
        total_checks = len(self.infrastructure_checks)
        good_checks = sum(1 for check in self.infrastructure_checks if check.get("status") == "good")
        warning_checks = sum(1 for check in self.infrastructure_checks if check.get("status") == "warning")
        not_applicable = sum(1 for check in self.infrastructure_checks if check.get("status") == "not_applicable")
        
        # not_applicable は除外して計算
        effective_total = total_checks - not_applicable
        
        if effective_total == 0:
            return 0
        
        # スコア計算: good=100点, warning=70点, その他=0点
        score = (good_checks * 100 + warning_checks * 70) // effective_total
        return min(100, max(0, score))

def main():
    """インフラ確認Hooks単体テスト"""
    
    import sys
    project_path = sys.argv[1] if len(sys.argv) > 1 else "."
    
    print("🏗️ インフラ確認Hooks - 単体テスト")
    print("=" * 50)
    
    # テスト用プロジェクト分析データ
    test_analysis = {
        "project_type": {"primary_type": "nagano3_kicho"},
        "technology_stack": {"backend": ["PHP"], "frontend": ["JavaScript"]}
    }
    
    # インフラ確認実行
    hooks = InfrastructureCheckHooks(project_path)
    result = hooks.execute_infrastructure_check(test_analysis)
    
    # 結果表示
    print(f"📊 インフラスコア: {result['overall_score']}/100")
    print(f"🔍 実行した確認: {len(result['infrastructure_checks'])}項目")
    print(f"⚠️ 発見した問題: {len(result['issues_found'])}件")
    
    # 主要な確認結果表示
    if result['environment_info']:
        print(f"\n🖥️ システム環境:")
        env_info = result['environment_info']
        if 'php_version' in env_info:
            print(f"  PHP: {env_info['php_version']}")
        if 'python_version' in env_info:
            print(f"  Python: {env_info['python_version']}")
    
    if result['dependencies_status']:
        print(f"\n📦 依存関係:")
        deps = result['dependencies_status']
        for pkg_manager, info in deps.items():
            if isinstance(info, dict) and info.get('file_exists'):
                print(f"  {pkg_manager}: ファイル存在")
    
    if result['issues_found']:
        print("\n🚨 発見された問題:")
        for issue in result['issues_found'][:5]:
            print(f"  - {issue}")
    
    return result['overall_score'] >= 70

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)