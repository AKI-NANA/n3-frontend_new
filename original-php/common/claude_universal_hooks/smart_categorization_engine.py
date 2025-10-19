#!/usr/bin/env python3
"""
🤖 NAGANO3プロジェクト自動判定エンジン
Claude Code Hooks システム - 自動分析・分類システム
"""

import os
import json
import sys
from pathlib import Path
from datetime import datetime

class ProjectClassifier:
    """プロジェクト自動判定エンジン"""
    
    def __init__(self, project_path: str = "."):
        self.project_path = Path(project_path).resolve()
        self.analysis_result = {}
        
    def analyze_project(self) -> dict:
        """プロジェクト総合分析"""
        print(f"🔍 プロジェクト分析開始: {self.project_path}")
        
        # 基本構造分析
        structure = self._analyze_structure()
        
        # プロジェクトタイプ判定
        project_type = self._classify_project_type(structure)
        
        # 技術スタック分析
        tech_stack = self._analyze_technology_stack(structure)
        
        # データベース分析
        database_info = self._analyze_database()
        
        # 総合結果
        self.analysis_result = {
            "timestamp": datetime.now().isoformat(),
            "project_path": str(self.project_path),
            "project_type": project_type,
            "technology_stack": tech_stack,
            "database_info": database_info,
            "structure_analysis": structure,
            "confidence_score": self._calculate_confidence(project_type, tech_stack)
        }
        
        return self.analysis_result
    
    def _analyze_structure(self) -> dict:
        """ファイル構造分析"""
        structure = {
            "files": [],
            "directories": [],
            "key_files": {},
            "patterns": []
        }
        
        try:
            # ルートディレクトリのファイル・フォルダ確認
            for item in self.project_path.iterdir():
                if item.is_file():
                    structure["files"].append(item.name)
                elif item.is_dir():
                    structure["directories"].append(item.name)
            
            # 重要ファイルの確認
            key_files = [
                "common/env", "composer.json", "package.json", "index.php", 
                "index.html", "requirements.txt"
            ]
            
            for file_name in key_files:
                file_path = self.project_path / file_name
                structure["key_files"][file_name] = file_path.exists()
            
            # NAGANO3パターン検出
            env_file = self.project_path / "common" / "env" / ".env" / ".env"
            if env_file.exists() and "modules" in structure["directories"]:
                try:
                    env_content = env_file.read_text(encoding="utf-8", errors="ignore")
                    if "NAGANO3" in env_content or "nagano3" in env_content:
                        structure["patterns"].append("nagano3_web_application")
                except:
                    pass
            
        except Exception as e:
            print(f"⚠️ 構造分析エラー: {e}")
        
        return structure
    
    def _classify_project_type(self, structure: dict) -> dict:
        """プロジェクトタイプ分類"""
        project_type = {
            "primary_type": "unknown",
            "secondary_types": [],
            "confidence": 0
        }
        
        # NAGANO3判定（最優先）
        if "nagano3_web_application" in structure["patterns"]:
            project_type.update({
                "primary_type": "nagano3_web_application",
                "secondary_types": ["php_web_application", "database_driven"],
                "confidence": 95
            })
            return project_type
        
        # PHP判定
        if structure["key_files"].get("composer.json", False) or structure["key_files"].get("index.php", False):
            project_type.update({
                "primary_type": "php_web_application",
                "secondary_types": ["web_application"],
                "confidence": 80
            })
        
        return project_type
    
    def _analyze_technology_stack(self, structure: dict) -> dict:
        """技術スタック分析"""
        tech_stack = {
            "backend": [],
            "frontend": [],
            "database": [],
            "tools": []
        }
        
        # バックエンド技術
        if structure["key_files"].get("composer.json", False):
            tech_stack["backend"].append("PHP")
        if structure["key_files"].get("index.php", False):
            tech_stack["backend"].append("PHP")
        
        # フロントエンド技術
        if any(d in structure["directories"] for d in ["js", "javascript", "assets"]):
            tech_stack["frontend"].append("JavaScript")
        if any(d in structure["directories"] for d in ["css", "styles"]):
            tech_stack["frontend"].append("CSS")
        
        # データベース
        env_file = self.project_path / "common" / "env" / ".env" / ".env"
        if env_file.exists():
            try:
                env_content = env_file.read_text(encoding="utf-8", errors="ignore")
                if "DB_HOST" in env_content:
                    if "5432" in env_content:
                        tech_stack["database"].append("PostgreSQL")
                    elif "3306" in env_content:
                        tech_stack["database"].append("MySQL")
            except:
                pass
        
        return tech_stack
    
    def _analyze_database(self) -> dict:
        """データベース分析"""
        db_info = {
            "has_database": False,
            "type": "unknown",
            "host": "",
            "name": "",
            "user": ""
        }
        
        env_file = self.project_path / "common" / "env" / ".env" / ".env"
        if env_file.exists():
            try:
                env_content = env_file.read_text(encoding="utf-8", errors="ignore")
                
                for line in env_content.split('\n'):
                    if line.startswith('DB_HOST='):
                        db_info["host"] = line.split('=', 1)[1]
                        db_info["has_database"] = True
                    elif line.startswith('DB_NAME='):
                        db_info["name"] = line.split('=', 1)[1]
                    elif line.startswith('DB_USER='):
                        db_info["user"] = line.split('=', 1)[1]
                    elif line.startswith('DB_PORT='):
                        port = line.split('=', 1)[1]
                        if port == "5432":
                            db_info["type"] = "PostgreSQL"
                        elif port == "3306":
                            db_info["type"] = "MySQL"
            except:
                pass
        
        return db_info
    
    def _calculate_confidence(self, project_type: dict, tech_stack: dict) -> int:
        """信頼度計算"""
        base_confidence = project_type.get("confidence", 0)
        total_tech = sum(len(stack) for stack in tech_stack.values())
        tech_bonus = min(total_tech * 2, 10)
        return min(base_confidence + tech_bonus, 100)

def main():
    """メイン実行"""
    project_path = sys.argv[1] if len(sys.argv) > 1 else "."
    
    print("🤖 NAGANO3プロジェクト自動判定エンジン起動")
    
    classifier = ProjectClassifier(project_path)
    result = classifier.analyze_project()
    
    # 結果表示
    print(f"📊 分析結果:")
    print(f"  プロジェクトタイプ: {result['project_type']['primary_type']}")
    print(f"  信頼度: {result['confidence_score']}%")
    print(f"  技術スタック: {', '.join(sum(result['technology_stack'].values(), []))}")
    
    if result['database_info']['has_database']:
        print(f"  データベース: {result['database_info']['type']} ({result['database_info']['name']})")
    
    return 0

if __name__ == "__main__":
    exit(main())
