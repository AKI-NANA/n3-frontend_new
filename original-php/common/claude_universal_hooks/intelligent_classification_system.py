#!/usr/bin/env python3
"""
🤖 Hooks自動判定エンジン
指示書・HTML・プロジェクト構造から必要なHooksを自動判定

ファイル: ~/.claude/engines/auto_classifier.py
"""

import os
import re
import json
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

class HooksAutoClassifier:
    """Hooks自動判定エンジン"""
    
    def __init__(self, config_path: str = "~/.claude/settings.json"):
        self.config_path = Path(config_path).expanduser()
        self.config = self.load_config()
        self.project_patterns = self.load_project_patterns()
        self.hooks_registry_path = Path("~/.claude/registry/hooks_registry.json").expanduser()
        self.auto_answers_path = Path("~/.claude/database/auto_answers.json").expanduser()
        
    def load_config(self) -> Dict:
        """設定ファイル読み込み"""
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️ 設定ファイル読み込みエラー: {e}")
        return self.get_default_config()
    
    def get_default_config(self) -> Dict:
        """デフォルト設定"""
        return {
            "classifier_settings": {
                "confidence_threshold": 0.7,
                "max_hooks_per_category": 10,
                "enable_auto_answers": True,
                "enable_learning": True
            },
            "detection_rules": {
                "project_type_weight": 0.4,
                "technology_stack_weight": 0.3,
                "file_structure_weight": 0.2,
                "content_analysis_weight": 0.1
            }
        }
    
    def analyze_project_context(self, project_path: str = ".") -> Dict[str, Any]:
        """プロジェクト全体の分析"""
        
        project_path = Path(project_path).resolve()
        print(f"🔍 プロジェクト分析開始: {project_path}")
        
        analysis = {
            "timestamp": datetime.now().isoformat(),
            "project_path": str(project_path),
            "project_type": self.detect_project_type(project_path),
            "technology_stack": self.detect_technology_stack(project_path),
            "file_structure": self.analyze_file_structure(project_path),
            "content_analysis": self.analyze_file_contents(project_path),
            "complexity_metrics": self.calculate_complexity_metrics(project_path),
            "integration_needs": self.detect_integration_needs(project_path),
            "special_requirements": self.extract_special_requirements(project_path)
        }
        
        print(f"✅ プロジェクト分析完了")
        return analysis
    
    def detect_project_type(self, project_path: Path) -> Dict[str, Any]:
        """プロジェクトタイプの自動検出"""
        
        detection_result = {
            "primary_type": "unknown",
            "sub_types": [],
            "confidence": 0.0,
            "evidence": []
        }
        
        # ディレクトリ構造による判定
        dir_indicators = {
            "nagano3_kicho": {
                "patterns": [
                    "modules/kicho", "common/js/hooks", "kicho_content.php", 
                    "kicho_ai_visualization.js", "MF_", "NAGANO3"
                ],
                "confidence": 0.95
            },
            "nagano3_generic": {
                "patterns": ["modules/", "common/", "NAGANO3", "N3-Development"],
                "confidence": 0.8
            },
            "e_commerce": {
                "patterns": ["cart/", "payment/", "order/", "product/", "SHOPIFY_", "STRIPE_"],
                "confidence": 0.85
            },
            "api_service": {
                "patterns": ["api/", "endpoints/", "services/", "fastapi", "OPENAI_API"],
                "confidence": 0.8
            },
            "web_application": {
                "patterns": ["public/", "assets/", "views/", "templates/", "css/", "js/"],
                "confidence": 0.7
            }
        }
        
        max_confidence = 0
        detected_type = "unknown"
        evidence_list = []
        
        # ファイル・ディレクトリ検索
        for project_type, indicators in dir_indicators.items():
            matches = 0
            total_patterns = len(indicators["patterns"])
            
            for pattern in indicators["patterns"]:
                if self.find_pattern_in_directory(project_path, pattern):
                    matches += 1
                    evidence_list.append(f"Found: {pattern}")
            
            confidence = (matches / total_patterns) * indicators["confidence"]
            
            if confidence > max_confidence:
                max_confidence = confidence
                detected_type = project_type
        
        detection_result.update({
            "primary_type": detected_type,
            "confidence": max_confidence,
            "evidence": evidence_list
        })
        
        print(f"🎯 プロジェクトタイプ検出: {detected_type} (信頼度: {max_confidence:.2f})")
        return detection_result
    
    def detect_technology_stack(self, project_path: Path) -> Dict[str, List[str]]:
        """技術スタックの自動検出"""
        
        tech_stack = {
            "backend": [],
            "frontend": [],
            "database": [],
            "api": [],
            "tools": [],
            "frameworks": []
        }
        
        # ファイル拡張子による検出
        file_extensions = {
            ".php": ("backend", "PHP"),
            ".py": ("backend", "Python"), 
            ".js": ("frontend", "JavaScript"),
            ".ts": ("frontend", "TypeScript"),
            ".html": ("frontend", "HTML"),
            ".css": ("frontend", "CSS"),
            ".sql": ("database", "SQL")
        }
        
        # 設定ファイルによる検出
        config_files = {
            "composer.json": ("backend", "PHP/Composer"),
            "package.json": ("frontend", "Node.js"),
            "requirements.txt": ("backend", "Python"),
            ".env": ("tools", "Environment"),
            "docker-compose.yml": ("tools", "Docker")
        }
        
        # ファイル走査
        processed_extensions = set()
        processed_configs = set()
        
        for file_path in project_path.rglob("*"):
            if file_path.is_file():
                # 拡張子チェック
                suffix = file_path.suffix.lower()
                if suffix in file_extensions and suffix not in processed_extensions:
                    category, tech_name = file_extensions[suffix]
                    tech_stack[category].append(tech_name)
                    processed_extensions.add(suffix)
                
                # 設定ファイルチェック
                filename = file_path.name
                if filename in config_files and filename not in processed_configs:
                    category, tech_name = config_files[filename]
                    tech_stack[category].append(tech_name)
                    processed_configs.add(filename)
        
        # フレームワーク・ライブラリ検出
        tech_stack["frameworks"] = self.detect_frameworks(project_path)
        
        print(f"🔧 技術スタック検出: {dict((k, v) for k, v in tech_stack.items() if v)}")
        return tech_stack
    
    def detect_frameworks(self, project_path: Path) -> List[str]:
        """フレームワーク・ライブラリの検出"""
        
        frameworks = []
        
        # composer.json からPHPフレームワーク検出
        composer_file = project_path / "composer.json"
        if composer_file.exists():
            try:
                with open(composer_file, 'r', encoding='utf-8') as f:
                    composer_data = json.load(f)
                    
                require = composer_data.get("require", {})
                for package in require.keys():
                    if "laravel" in package.lower():
                        frameworks.append("Laravel")
                    elif "symfony" in package.lower():
                        frameworks.append("Symfony")
                    elif "codeigniter" in package.lower():
                        frameworks.append("CodeIgniter")
            except:
                pass
        
        # package.json からJavaScriptフレームワーク検出
        package_file = project_path / "package.json"
        if package_file.exists():
            try:
                with open(package_file, 'r', encoding='utf-8') as f:
                    package_data = json.load(f)
                    
                dependencies = {**package_data.get("dependencies", {}), 
                              **package_data.get("devDependencies", {})}
                
                for package in dependencies.keys():
                    if package == "react":
                        frameworks.append("React")
                    elif package == "vue":
                        frameworks.append("Vue")
                    elif package == "angular" or package.startswith("@angular"):
                        frameworks.append("Angular")
            except:
                pass
        
        # FastAPI/Flask検出（ファイル内容から）
        if self.find_pattern_in_files(project_path, "from fastapi import"):
            frameworks.append("FastAPI")
        if self.find_pattern_in_files(project_path, "from flask import"):
            frameworks.append("Flask")
        
        # NAGANO3独自システム検出
        if self.find_pattern_in_directory(project_path, "NAGANO3"):
            frameworks.append("NAGANO3 Custom System")
        
        return frameworks
    
    def analyze_file_contents(self, project_path: Path) -> Dict[str, Any]:
        """ファイル内容の分析"""
        
        content_analysis = {
            "data_actions": [],
            "api_endpoints": [],
            "database_operations": [],
            "security_features": [],
            "integration_points": []
        }
        
        # 分析対象ファイル拡張子
        target_extensions = [".php", ".html", ".js", ".py"]
        file_count = 0
        
        for file_path in project_path.rglob("*"):
            if (file_path.suffix.lower() in target_extensions and 
                file_path.is_file() and 
                file_count < 100):  # パフォーマンス制限
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        file_count += 1
                        
                    # data-action属性の検出
                    data_actions = re.findall(r'data-action="([^"]+)"', content)
                    content_analysis["data_actions"].extend(data_actions)
                    
                    # API エンドポイントの検出
                    api_patterns = [
                        r'@app\.(get|post|put|delete)\("([^"]+)"',  # FastAPI
                        r'Route::(get|post|put|delete)\("([^"]+)"',  # Laravel
                        r'app\.(get|post|put|delete)\("([^"]+)"'     # Express
                    ]
                    
                    for pattern in api_patterns:
                        matches = re.findall(pattern, content)
                        for match in matches:
                            endpoint = match[1] if len(match) > 1 else match[0]
                            content_analysis["api_endpoints"].append(endpoint)
                    
                    # セキュリティ機能の検出
                    security_patterns = [
                        "csrf_token", "session", "authentication", 
                        "authorization", "encrypt", "hash", "CSRF_TOKEN_SECRET"
                    ]
                    
                    for pattern in security_patterns:
                        if pattern.lower() in content.lower():
                            if pattern not in content_analysis["security_features"]:
                                content_analysis["security_features"].append(pattern)
                    
                except:
                    continue
        
        # 重複除去
        for key in content_analysis:
            if isinstance(content_analysis[key], list):
                content_analysis[key] = list(set(content_analysis[key]))
        
        print(f"📄 ファイル内容分析完了: {file_count}ファイル処理")
        return content_analysis
    
    def auto_select_hooks(self, analysis_result: Dict[str, Any]) -> Dict[str, List[str]]:
        """分析結果に基づく自動Hooks選択"""
        
        selected_hooks = {
            "universal": [],
            "category": [],
            "technology": [],
            "project": []
        }
        
        # Universal Hooks（常に選択）
        selected_hooks["universal"] = [
            "security_validation_hooks",
            "infrastructure_check_hooks", 
            "quality_assurance_hooks"
        ]
        
        # プロジェクトタイプ別選択
        project_type = analysis_result["project_type"]["primary_type"]
        
        if project_type == "nagano3_kicho":
            selected_hooks["project"].extend([
                "nagano3_kicho_specific_hooks",
                "nagano3_phase_validation_hooks"
            ])
            selected_hooks["category"].extend([
                "web_application_hooks",
                "ui_intensive_hooks"
            ])
        elif project_type == "nagano3_generic":
            selected_hooks["project"].append("nagano3_generic_hooks")
        elif project_type == "api_service":
            selected_hooks["category"].append("api_development_hooks")
        
        # 技術スタック別選択
        tech_stack = analysis_result["technology_stack"]
        
        if "PHP" in [item for sublist in tech_stack.values() for item in sublist]:
            selected_hooks["technology"].append("php_development_hooks")
        if "Python" in [item for sublist in tech_stack.values() for item in sublist]:
            selected_hooks["technology"].append("python_development_hooks")
        if "JavaScript" in [item for sublist in tech_stack.values() for item in sublist]:
            selected_hooks["technology"].append("javascript_development_hooks")
        
        # 特殊要件による選択
        content_analysis = analysis_result["content_analysis"]
        
        if len(content_analysis["data_actions"]) > 10:
            selected_hooks["category"].append("ui_intensive_hooks")
        if content_analysis["api_endpoints"]:
            selected_hooks["category"].append("api_development_hooks")
        
        print(f"🎯 選択されたHooks: {dict((k, v) for k, v in selected_hooks.items() if v)}")
        return selected_hooks
    
    def find_pattern_in_directory(self, project_path: Path, pattern: str) -> bool:
        """ディレクトリ内でパターンを検索"""
        try:
            pattern_lower = pattern.lower()
            for item in project_path.rglob("*"):
                if pattern_lower in str(item).lower():
                    return True
            return False
        except:
            return False
    
    def find_pattern_in_files(self, project_path: Path, pattern: str) -> bool:
        """ファイル内容でパターンを検索（限定的）"""
        try:
            search_count = 0
            for file_path in project_path.rglob("*.py"):
                if file_path.is_file() and search_count < 20:  # パフォーマンス制限
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        if pattern in content:
                            return True
                    search_count += 1
            return False
        except:
            return False
    
    def calculate_complexity_metrics(self, project_path: Path) -> Dict[str, int]:
        """複雑度メトリクスの計算"""
        
        metrics = {
            "total_files": 0,
            "code_files": 0,
            "php_files": 0,
            "js_files": 0,
            "py_files": 0,
            "data_actions_count": 0
        }
        
        code_extensions = [".php", ".js", ".py", ".html", ".css"]
        
        for file_path in project_path.rglob("*"):
            if file_path.is_file():
                metrics["total_files"] += 1
                
                if file_path.suffix.lower() in code_extensions:
                    metrics["code_files"] += 1
                    
                    # ファイルタイプ別カウント
                    if file_path.suffix.lower() == ".php":
                        metrics["php_files"] += 1
                    elif file_path.suffix.lower() == ".js":
                        metrics["js_files"] += 1
                    elif file_path.suffix.lower() == ".py":
                        metrics["py_files"] += 1
        
        print(f"📊 複雑度メトリクス: {metrics}")
        return metrics
    
    def detect_integration_needs(self, project_path: Path) -> List[str]:
        """統合要件の検出"""
        
        integrations = []
        
        # .envファイルから検出
        env_file = project_path / ".env"
        if env_file.exists():
            try:
                with open(env_file, 'r', encoding='utf-8') as f:
                    env_content = f.read()
                    
                integration_patterns = {
                    "MoneyForward": ["MF_"],
                    "OpenAI": ["OPENAI_", "CHATWORK_API"],
                    "AWS": ["AMAZON_", "AWS_"],
                    "Stripe": ["STRIPE_"],
                    "Shopify": ["SHOPIFY_"],
                    "GitHub": ["GITHUB_"]
                }
                
                for integration_name, patterns in integration_patterns.items():
                    for pattern in patterns:
                        if pattern in env_content:
                            integrations.append(integration_name)
                            break
                    
            except:
                pass
        
        print(f"🔗 統合要件検出: {integrations}")
        return list(set(integrations))
    
    def extract_special_requirements(self, project_path: Path) -> List[str]:
        """特殊要件の抽出"""
        
        requirements = []
        
        # ファイル分析から特殊要件検出
        if self.find_pattern_in_files(project_path, "websocket"):
            requirements.append("Real-time Communication")
        if self.find_pattern_in_files(project_path, "ai_learning"):
            requirements.append("AI Learning System")
        if self.find_pattern_in_directory(project_path, "kicho"):
            requirements.append("KICHO Specialized System")
            
        print(f"⭐ 特殊要件: {requirements}")
        return list(set(requirements))

def main():
    """メイン実行関数"""
    
    # 引数からプロジェクトパス取得
    project_path = sys.argv[1] if len(sys.argv) > 1 else "."
    
    print("🤖 完全自動化Hooksシステム - 自動判定エンジン")
    print("=" * 60)
    
    try:
        # 分析実行
        classifier = HooksAutoClassifier()
        analysis = classifier.analyze_project_context(project_path)
        
        # Hooks選択
        selected_hooks = classifier.auto_select_hooks(analysis)
        
        # 結果保存
        results = {
            "analysis": analysis,
            "selected_hooks": selected_hooks,
            "execution_timestamp": datetime.now().isoformat()
        }
        
        # 結果ファイル保存
        output_dir = Path("~/.claude/results").expanduser()
        output_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_file = output_dir / f"analysis_{timestamp}.json"
        
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print("\n" + "=" * 60)
        print("✅ 分析完了")
        print(f"📁 結果保存: {result_file}")
        print(f"🎯 プロジェクトタイプ: {analysis['project_type']['primary_type']}")
        print(f"🔧 主要技術: {', '.join(analysis['technology_stack']['backend'] + analysis['technology_stack']['frontend'])}")
        print(f"📊 複雑度: {analysis['complexity_metrics']['code_files']}ファイル")
        print(f"🪝 選択Hooks: {sum(len(hooks) for hooks in selected_hooks.values())}個")
        
        # 次のステップ表示
        print("\n🚀 次のステップ:")
        print("1. Hooks分類システム実装")
        print("2. 自動回答データベース実装")
        print("3. 実際のHooks実装・統合")
        
        return True
        
    except Exception as e:
        print(f"❌ エラー発生: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

    # ==========================================
# 🤖 AI拡張機能 - 2025年1月追加
# ==========================================

class AIEnhancedHooksClassifier(HooksAutoClassifier):
    """AI拡張版Hooks自動判定エンジン"""
    
    def __init__(self, config_path: str = "~/.claude/settings.json"):
        super().__init__(config_path)
        self.ai_tools_config = {
            "deepseek": {"specialty": "code_generation"},
            "ollama": {"specialty": "text_processing"}, 
            "transformers": {"specialty": "custom_training"}
        }
        self.ai_enabled = self._check_ai_availability()
    
    def execute_ai_enhanced_analysis(self, development_context: Dict = None) -> Dict[str, Any]:
        """AI拡張分析実行"""
        # 既存の基本分析
        basic_result = self.analyze_project_context(development_context or ".")
        
        # AI拡張分析（利用可能な場合のみ）
        if self.ai_enabled:
            ai_result = self._execute_comprehensive_ai_analysis(development_context)
            return self._merge_analysis_results(basic_result, ai_result)
        else:
            # AI未利用時は既存機能をそのまま返す
            return basic_result
    
    def _execute_comprehensive_ai_analysis(self, context):
        """AI分析実行（paste.txtの機能を統合）"""
        return {
            "ai_requirements_detected": self._detect_ai_requirements(context),
            "tool_availability": self._check_ai_tools(),
            "recommended_configuration": self._generate_ai_config(context),
            "ai_enhanced": True
        }
    
    def _check_ai_availability(self) -> bool:
        """AI機能利用可能性チェック"""
        try:
            # 簡易チェック
            import transformers
            return True
        except ImportError:
            return False