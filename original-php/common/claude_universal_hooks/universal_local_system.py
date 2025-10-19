#!/usr/bin/env python3
"""
🌟 汎用ローカル参照・自動保存システム
全プロジェクト対応 - どこでも使えるローカル連携システム

特徴:
- プロジェクト自動検出
- 関連ファイル自動参照
- 日付フォルダ自動作成
- 成果物自動保存・整理
"""

import os
import json
import shutil
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import re
from datetime import datetime
import logging

class UniversalLocalSystem:
    """汎用ローカルシステム - 全プロジェクト対応"""
    
    def __init__(self, project_root: str = None):
        """
        初期化
        project_root: プロジェクトルートパス（自動検出も可能）
        """
        self.project_root = self._detect_project_root(project_root)
        self.auto_save_enabled = True
        self.current_session = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 保存先設定
        self.save_config = {
            "base_folder": "claude_generated",
            "date_format": "%Y-%m-%d",
            "session_format": "session_%H%M%S",
            "auto_organize": True
        }
        
        # 検索対象設定
        self.search_config = {
            "target_extensions": [
                ".py", ".js", ".html", ".css", ".md", ".json", 
                ".yaml", ".yml", ".sql", ".sh", ".php", ".txt"
            ],
            "search_depths": {
                "shallow": 2,   # config, src レベル
                "medium": 4,    # src/components/... レベル 
                "deep": 6       # 深い階層まで
            },
            "priority_folders": [
                "src", "common", "config", "components", 
                "modules", "hooks", "services", "database",
                "N3-Development", "claude_hooks", "claude_universal_hooks"
            ]
        }
        
        self._initialize_system()
    
    def _detect_project_root(self, provided_root: str = None) -> Path:
        """プロジェクトルート自動検出"""
        
        if provided_root:
            return Path(provided_root).resolve()
        
        # 現在のディレクトリから上位へ遡ってプロジェクトルート検出
        current_path = Path.cwd()
        
        # プロジェクトマーカーファイル/フォルダ
        project_markers = [
            ".git", "package.json", "composer.json", "requirements.txt",
            "Makefile", "docker-compose.yml", "README.md"
        ]
        
        # 上位ディレクトリを探索
        for parent in [current_path] + list(current_path.parents):
            for marker in project_markers:
                if (parent / marker).exists():
                    print(f"🎯 プロジェクトルート検出: {parent}")
                    return parent
        
        # マーカーが見つからない場合は現在のディレクトリ
        print(f"⚠️ プロジェクトルート未検出 - 現在ディレクトリ使用: {current_path}")
        return current_path
    
    def _initialize_system(self):
        """システム初期化"""
        print(f"🚀 汎用ローカルシステム初期化")
        print(f"📂 プロジェクトルート: {self.project_root}")
        
        # 保存ディレクトリ構造作成
        self._setup_save_directories()
        
        # ファイルインデックス構築
        self.file_index = self._build_comprehensive_index()
        
        print(f"✅ システム初期化完了 - {len(self.file_index)}ファイル検出")
    
    def _setup_save_directories(self):
        """自動保存ディレクトリ構造作成"""
        
        today = datetime.now().strftime(self.save_config["date_format"])
        session = datetime.now().strftime(self.save_config["session_format"])
        
        # ベースディレクトリ
        self.save_base = self.project_root / self.save_config["base_folder"]
        
        # 日付ディレクトリ
        self.save_date_dir = self.save_base / today
        
        # セッションディレクトリ
        self.save_session_dir = self.save_date_dir / session
        
        # カテゴリディレクトリ
        self.save_categories = {
            "code": self.save_session_dir / "01_code",
            "config": self.save_session_dir / "02_config", 
            "docs": self.save_session_dir / "03_docs",
            "scripts": self.save_session_dir / "04_scripts",
            "data": self.save_session_dir / "05_data",
            "analysis": self.save_session_dir / "06_analysis"
        }
        
        # ディレクトリ作成
        for category_path in self.save_categories.values():
            category_path.mkdir(parents=True, exist_ok=True)
        
        # メタデータファイル作成
        self._create_session_metadata()
        
        print(f"📁 保存先準備完了: {self.save_session_dir}")
    
    def _create_session_metadata(self):
        """セッションメタデータ作成"""
        
        metadata = {
            "session_id": self.current_session,
            "created_at": datetime.now().isoformat(),
            "project_root": str(self.project_root),
            "save_directories": {k: str(v) for k, v in self.save_categories.items()},
            "files_processed": [],
            "generated_files": []
        }
        
        metadata_file = self.save_session_dir / "session_metadata.json"
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        self.session_metadata_file = metadata_file
    
    def _build_comprehensive_index(self) -> Dict[str, Dict[str, Any]]:
        """包括的ファイルインデックス構築"""
        
        file_index = {}
        
        # 優先フォルダから検索
        for priority_folder in self.search_config["priority_folders"]:
            folder_path = self.project_root / priority_folder
            if folder_path.exists():
                self._index_directory(folder_path, file_index, depth=0, max_depth=4)
        
        # 追加でルートディレクトリも軽く検索
        self._index_directory(self.project_root, file_index, depth=0, max_depth=2)
        
        return file_index
    
    def _index_directory(self, directory: Path, index: Dict, depth: int, max_depth: int):
        """ディレクトリインデックス化"""
        
        if depth > max_depth:
            return
        
        try:
            for item in directory.iterdir():
                if item.is_file() and self._is_target_file(item):
                    relative_path = str(item.relative_to(self.project_root))
                    
                    index[relative_path] = {
                        "full_path": str(item),
                        "name": item.name,
                        "extension": item.suffix,
                        "size": item.stat().st_size,
                        "modified": datetime.fromtimestamp(item.stat().st_mtime),
                        "category": self._categorize_file(item),
                        "keywords": self._extract_keywords(item.name),
                        "depth": depth
                    }
                
                elif item.is_dir() and not self._is_ignored_directory(item):
                    self._index_directory(item, index, depth + 1, max_depth)
        
        except PermissionError:
            pass  # アクセス権限がない場合はスキップ
    
    def _is_target_file(self, file_path: Path) -> bool:
        """対象ファイル判定"""
        return file_path.suffix.lower() in self.search_config["target_extensions"]
    
    def _is_ignored_directory(self, dir_path: Path) -> bool:
        """無視ディレクトリ判定"""
        ignored = {
            ".git", ".svn", "node_modules", "__pycache__", 
            ".venv", "venv", ".env", "build", "dist"
        }
        return dir_path.name in ignored
    
    def _categorize_file(self, file_path: Path) -> str:
        """ファイルカテゴリ分類"""
        
        name_lower = file_path.name.lower()
        parent_lower = file_path.parent.name.lower()
        
        # 拡張子ベース分類
        if file_path.suffix == '.py':
            return "python"
        elif file_path.suffix in ['.js', '.ts']:
            return "javascript"
        elif file_path.suffix in ['.html', '.css']:
            return "web"
        elif file_path.suffix in ['.json', '.yaml', '.yml']:
            return "config"
        elif file_path.suffix == '.md':
            return "documentation"
        elif file_path.suffix in ['.sql']:
            return "database"
        elif file_path.suffix in ['.sh']:
            return "script"
        
        # ディレクトリベース分類
        if "config" in parent_lower:
            return "config"
        elif "hook" in parent_lower:
            return "hooks"
        elif "test" in parent_lower:
            return "test"
        elif "doc" in parent_lower:
            return "documentation"
        
        return "general"
    
    def _extract_keywords(self, filename: str) -> List[str]:
        """キーワード抽出"""
        keywords = re.split(r'[_\-\.]', filename.lower())
        return [kw for kw in keywords if len(kw) > 2]
    
    def smart_search(self, query: str) -> List[Dict[str, Any]]:
        """スマート検索"""
        
        query_lower = query.lower()
        results = []
        
        # 検索パターン
        search_patterns = {
            "hooks": ["hook", "validation", "check", "unified", "統一"],
            "config": ["config", "setting", "database", "auth", "設定"],
            "ai": ["ai", "intelligent", "smart", "auto", "machine"],
            "development": ["dev", "build", "deploy", "run", "開発"],
            "database": ["db", "database", "sql", "データベース"],
            "api": ["api", "service", "endpoint", "rest"],
            "frontend": ["frontend", "ui", "component", "フロント"],
            "backend": ["backend", "server", "バック"]
        }
        
        for file_path, file_info in self.file_index.items():
            relevance_score = 0
            matched_keywords = []
            
            # 直接キーワードマッチ
            for keyword in file_info["keywords"]:
                if keyword in query_lower:
                    relevance_score += 3
                    matched_keywords.append(keyword)
            
            # パターンマッチ
            for pattern_name, patterns in search_patterns.items():
                if any(pattern in query_lower for pattern in patterns):
                    if file_info["category"] == pattern_name or any(pattern in file_info["keywords"] for pattern in patterns):
                        relevance_score += 2
                        matched_keywords.extend(patterns)
            
            # ファイル名マッチ
            if any(word in file_info["name"].lower() for word in query_lower.split()):
                relevance_score += 1
            
            if relevance_score > 0:
                results.append({
                    "file_path": file_path,
                    "full_path": file_info["full_path"],
                    "relevance_score": relevance_score,
                    "matched_keywords": list(set(matched_keywords)),
                    "category": file_info["category"],
                    "name": file_info["name"],
                    "size": file_info["size"],
                    "modified": file_info["modified"]
                })
        
        # 関連度でソート
        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return results[:10]  # 上位10件
    
    def auto_save_file(self, content: str, filename: str, category: str = "code", metadata: Dict = None) -> str:
        """自動ファイル保存"""
        
        if not self.auto_save_enabled:
            return None
        
        # カテゴリディレクトリ取得
        if category not in self.save_categories:
            category = "code"  # デフォルト
        
        save_dir = self.save_categories[category]
        
        # ファイル名処理（重複回避）
        base_name, ext = os.path.splitext(filename)
        counter = 1
        final_filename = filename
        
        while (save_dir / final_filename).exists():
            final_filename = f"{base_name}_{counter:02d}{ext}"
            counter += 1
        
        # ファイル保存
        file_path = save_dir / final_filename
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # メタデータ更新
        self._update_session_metadata("generated_files", {
            "filename": final_filename,
            "category": category,
            "path": str(file_path),
            "size": len(content),
            "created_at": datetime.now().isoformat(),
            "metadata": metadata or {}
        })
        
        print(f"💾 自動保存: {file_path}")
        return str(file_path)
    
    def _update_session_metadata(self, key: str, value: Any):
        """セッションメタデータ更新"""
        
        try:
            with open(self.session_metadata_file, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            if key not in metadata:
                metadata[key] = []
            
            if isinstance(metadata[key], list):
                metadata[key].append(value)
            else:
                metadata[key] = value
            
            metadata["last_updated"] = datetime.now().isoformat()
            
            with open(self.session_metadata_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        except Exception as e:
            print(f"⚠️ メタデータ更新エラー: {e}")
    
    def generate_context_summary(self, query: str) -> str:
        """コンテキスト要約生成"""
        
        search_results = self.smart_search(query)
        
        if not search_results:
            return "関連ファイルが見つかりませんでした。"
        
        summary = f"""
# 🔍 汎用ローカル参照システム - 検索結果

## 📊 クエリ: "{query}"
## 📂 プロジェクト: {self.project_root.name}
## 💾 自動保存先: {self.save_session_dir}

## 📁 関連ファイル ({len(search_results)}件)

"""
        
        for i, result in enumerate(search_results, 1):
            summary += f"""
### {i}. {result["name"]}
**パス**: `{result["file_path"]}`
**関連度**: {result["relevance_score"]}点
**カテゴリ**: {result["category"]}
**サイズ**: {result["size"]:,}bytes
**更新**: {result["modified"].strftime("%Y-%m-%d %H:%M")}
**キーワード**: {', '.join(result["matched_keywords"])}

---
"""
        
        summary += f"""
## 🎯 次のアクション
1. **詳細確認**: `filesystem:read_file` で内容確認
2. **自動保存**: 修正・作成したファイルは自動的に保存
3. **整理**: 日付・セッション別で自動整理

## 📁 保存先構造
```
{self.save_session_dir}/
├── 01_code/     - Pythonファイル、JSファイル等
├── 02_config/   - 設定ファイル、JSONファイル等  
├── 03_docs/     - ドキュメント、MDファイル等
├── 04_scripts/  - 実行スクリプト、シェルスクリプト等
├── 05_data/     - データファイル、CSVファイル等
└── 06_analysis/ - 分析レポート、調査結果等
```
"""
        
        return summary
    
    def get_session_summary(self) -> str:
        """セッション要約取得"""
        
        try:
            with open(self.session_metadata_file, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            generated_count = len(metadata.get("generated_files", []))
            
            summary = f"""
# 📊 セッション要約

## 🕐 セッション情報
- **セッションID**: {metadata["session_id"]}
- **開始時刻**: {metadata["created_at"]}
- **プロジェクト**: {Path(metadata["project_root"]).name}

## 📁 生成ファイル数
- **総数**: {generated_count}ファイル

## 💾 保存先
- **ベース**: {self.save_session_dir}

## 📋 ファイル詳細
"""
            
            for file_info in metadata.get("generated_files", []):
                summary += f"- {file_info['filename']} ({file_info['category']}) - {file_info['size']:,}bytes\n"
            
            return summary
            
        except Exception as e:
            return f"セッション要約取得エラー: {e}"

# ===================================================
# 🚀 使用例・テスト
# ===================================================

def demo_universal_system():
    """汎用システムデモ"""
    
    print("🌟 汎用ローカル参照・自動保存システム - デモ")
    print("=" * 60)
    
    # システム初期化
    system = UniversalLocalSystem()
    
    # 検索テスト
    test_queries = [
        "hooksシステムの統一",
        "データベース設定",
        "AI統合機能",
        "設定ファイル"
    ]
    
    for query in test_queries:
        print(f"\n🔍 検索: {query}")
        context = system.generate_context_summary(query)
        print(context[:500] + "..." if len(context) > 500 else context)
    
    # 自動保存テスト
    print("\n💾 自動保存テスト")
    test_content = '''
def unified_hooks_example():
    """統一Hooksシステム例"""
    return "Hello World"
'''
    
    saved_path = system.auto_save_file(
        content=test_content,
        filename="unified_hooks_example.py",
        category="code",
        metadata={"description": "テスト用統一Hooksファイル"}
    )
    
    print(f"✅ 保存完了: {saved_path}")
    
    # セッション要約
    print("\n📊 セッション要約")
    print(system.get_session_summary())

if __name__ == "__main__":
    demo_universal_system()
