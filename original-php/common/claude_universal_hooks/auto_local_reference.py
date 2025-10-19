#!/usr/bin/env python3
"""
🔍 自動ローカル参照システム
毎回のやり取りで指定ディレクトリから関連ファイルを自動検索・参照
文字数削減とデータ効率化を実現
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import re
from datetime import datetime

class AutoLocalReferenceSystem:
    """自動ローカル参照システム"""
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.file_index = {}
        self.content_cache = {}
        self.reference_patterns = self._setup_reference_patterns()
        
        # 初期化時にファイルインデックス構築
        self._build_file_index()
    
    def _setup_reference_patterns(self) -> Dict[str, List[str]]:
        """参照パターン設定"""
        return {
            "hooks": [
                "hooks", "hook", "validation", "check", "test",
                "統一", "矛盾", "修正", "システム"
            ],
            "config": [
                "config", "setting", "database", "auth", "api",
                "設定", "データベース", "認証", "構成"
            ],
            "development": [
                "dev", "development", "build", "deploy", "run",
                "開発", "実行", "構築", "デプロイ"
            ],
            "documentation": [
                "doc", "readme", "manual", "guide", "instruction",
                "説明", "手順", "指示", "ガイド", "マニュアル"
            ],
            "ai_integration": [
                "ai", "intelligent", "smart", "auto", "machine",
                "AI", "人工知能", "自動", "統合"
            ]
        }
    
    def _build_file_index(self):
        """ファイルインデックス構築"""
        print("🔍 ローカルファイルインデックス構築中...")
        
        for file_path in self.base_path.rglob("*"):
            if file_path.is_file() and self._is_text_file(file_path):
                relative_path = str(file_path.relative_to(self.base_path))
                
                # ファイル情報登録
                self.file_index[relative_path] = {
                    "full_path": str(file_path),
                    "name": file_path.name,
                    "extension": file_path.suffix,
                    "size": file_path.stat().st_size,
                    "modified": datetime.fromtimestamp(file_path.stat().st_mtime),
                    "category": self._categorize_file(file_path),
                    "keywords": self._extract_keywords_from_filename(file_path.name)
                }
        
        print(f"✅ {len(self.file_index)}個のファイルをインデックス化")
    
    def _is_text_file(self, file_path: Path) -> bool:
        """テキストファイル判定"""
        text_extensions = {
            '.py', '.js', '.html', '.css', '.md', '.txt', '.json', 
            '.yaml', '.yml', '.ini', '.conf', '.sh', '.sql'
        }
        return file_path.suffix.lower() in text_extensions
    
    def _categorize_file(self, file_path: Path) -> str:
        """ファイルカテゴリ分類"""
        name_lower = file_path.name.lower()
        
        if any(keyword in name_lower for keyword in ["hook", "validation", "check"]):
            return "hooks"
        elif any(keyword in name_lower for keyword in ["config", "setting", "database"]):
            return "config"
        elif any(keyword in name_lower for keyword in ["ai", "intelligent", "smart"]):
            return "ai_integration"
        elif any(keyword in name_lower for keyword in ["readme", "manual", "guide"]):
            return "documentation"
        elif file_path.suffix == '.py':
            return "python_code"
        elif file_path.suffix in ['.js', '.html', '.css']:
            return "web_development"
        else:
            return "general"
    
    def _extract_keywords_from_filename(self, filename: str) -> List[str]:
        """ファイル名からキーワード抽出"""
        # アンダースコア、ハイフンで分割
        keywords = re.split(r'[_\-\.]', filename.lower())
        return [kw for kw in keywords if len(kw) > 2]
    
    def auto_find_relevant_files(self, user_query: str) -> List[Dict[str, Any]]:
        """ユーザークエリから関連ファイル自動検索"""
        query_lower = user_query.lower()
        relevant_files = []
        
        # キーワードマッチング
        for file_path, file_info in self.file_index.items():
            relevance_score = 0
            matched_keywords = []
            
            # ファイル名マッチング
            for keyword in file_info["keywords"]:
                if keyword in query_lower:
                    relevance_score += 3
                    matched_keywords.append(keyword)
            
            # カテゴリマッチング
            for category, patterns in self.reference_patterns.items():
                if file_info["category"] == category:
                    for pattern in patterns:
                        if pattern in query_lower:
                            relevance_score += 2
                            matched_keywords.append(pattern)
            
            # 関連度が高いファイルを選択
            if relevance_score > 2:
                relevant_files.append({
                    "file_path": file_path,
                    "full_path": file_info["full_path"],
                    "relevance_score": relevance_score,
                    "matched_keywords": matched_keywords,
                    "category": file_info["category"],
                    "name": file_info["name"]
                })
        
        # 関連度でソート
        relevant_files.sort(key=lambda x: x["relevance_score"], reverse=True)
        return relevant_files[:5]  # 上位5件
    
    def get_file_summary(self, file_path: str, max_lines: int = 30) -> Dict[str, Any]:
        """ファイル要約取得"""
        full_path = self.base_path / file_path
        
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # ファイル要約生成
            summary = {
                "file_path": file_path,
                "total_lines": len(lines),
                "preview": "".join(lines[:max_lines]),
                "file_type": self._analyze_file_type(lines),
                "key_sections": self._extract_key_sections(lines),
                "imports": self._extract_imports(lines) if file_path.endswith('.py') else [],
                "functions": self._extract_functions(lines) if file_path.endswith('.py') else [],
                "classes": self._extract_classes(lines) if file_path.endswith('.py') else []
            }
            
            return summary
            
        except Exception as e:
            return {"error": f"ファイル読み取りエラー: {e}"}
    
    def _analyze_file_type(self, lines: List[str]) -> str:
        """ファイルタイプ分析"""
        content = "".join(lines[:20]).lower()
        
        if "#!/usr/bin/env python" in content or "import " in content:
            return "python_script"
        elif "<!doctype html" in content or "<html" in content:
            return "html_document"
        elif "function " in content or "const " in content:
            return "javascript_code"
        elif "{" in content and ":" in content:
            return "json_config"
        else:
            return "text_document"
    
    def _extract_key_sections(self, lines: List[str]) -> List[str]:
        """重要セクション抽出"""
        key_sections = []
        
        for i, line in enumerate(lines[:50]):  # 最初の50行から抽出
            line_stripped = line.strip()
            
            # Pythonクラス・関数
            if line_stripped.startswith(('class ', 'def ', 'async def ')):
                key_sections.append(f"L{i+1}: {line_stripped}")
            
            # コメント（重要そうなもの）
            elif line_stripped.startswith(('#', '"""', "'''")):
                if len(line_stripped) > 20:  # 長いコメントのみ
                    key_sections.append(f"L{i+1}: {line_stripped[:60]}...")
            
            # 設定・定数
            elif '=' in line_stripped and line_stripped.isupper():
                key_sections.append(f"L{i+1}: {line_stripped}")
        
        return key_sections[:10]  # 上位10個
    
    def _extract_imports(self, lines: List[str]) -> List[str]:
        """import文抽出"""
        imports = []
        for line in lines[:30]:  # 最初の30行
            line_stripped = line.strip()
            if line_stripped.startswith(('import ', 'from ')):
                imports.append(line_stripped)
        return imports
    
    def _extract_functions(self, lines: List[str]) -> List[str]:
        """関数定義抽出"""
        functions = []
        for line in lines:
            line_stripped = line.strip()
            if line_stripped.startswith(('def ', 'async def ')):
                functions.append(line_stripped.split('(')[0].replace('def ', '').replace('async ', ''))
        return functions[:10]  # 上位10個
    
    def _extract_classes(self, lines: List[str]) -> List[str]:
        """クラス定義抽出"""
        classes = []
        for line in lines:
            line_stripped = line.strip()
            if line_stripped.startswith('class '):
                class_name = line_stripped.split('(')[0].replace('class ', '').replace(':', '')
                classes.append(class_name)
        return classes
    
    def generate_context_summary(self, user_query: str) -> str:
        """ユーザークエリに対するコンテキスト要約生成"""
        relevant_files = self.auto_find_relevant_files(user_query)
        
        if not relevant_files:
            return "関連ローカルファイルが見つかりませんでした。"
        
        summary = f"""
# 🔍 自動検索されたローカル参照ファイル

## 📊 クエリ: "{user_query}"

## 📁 関連ファイル ({len(relevant_files)}件)

"""
        
        for i, file_info in enumerate(relevant_files, 1):
            file_summary = self.get_file_summary(file_info["file_path"])
            
            summary += f"""
### {i}. {file_info["name"]}
**パス**: `{file_info["file_path"]}`
**関連度**: {file_info["relevance_score"]}点
**カテゴリ**: {file_info["category"]}
**マッチキーワード**: {', '.join(file_info["matched_keywords"])}

**ファイル概要**:
- 総行数: {file_summary.get('total_lines', 'N/A')}行
- タイプ: {file_summary.get('file_type', 'N/A')}
- 主要セクション: {len(file_summary.get('key_sections', []))}個

**プレビュー**:
```
{file_summary.get('preview', 'プレビュー取得エラー')[:200]}...
```

---
"""
        
        summary += f"""
## 💡 参照活用方法
- 詳細確認: `filesystem:read_file` で完全内容取得
- 修正版作成: 既存ファイルベースで改良版生成
- 統合作業: 複数ファイルの内容を統合
"""
        
        return summary

# ===================================================
# 🚀 実行・テスト用システム
# ===================================================

def demo_auto_reference_system():
    """自動参照システムデモ"""
    
    # システム初期化
    base_path = "/Users/aritahiroaki/NAGANO-3/N3-Development/common/claude_universal_hooks"
    auto_ref = AutoLocalReferenceSystem(base_path)
    
    # テストクエリ
    test_queries = [
        "hooksの統一システムについて",
        "データベース設定の修正",
        "AI統合機能の実装",
        "設定ファイルの確認",
        "実行スクリプトの作成"
    ]
    
    print("🎯 自動ローカル参照システム - デモ実行")
    print("=" * 60)
    
    for query in test_queries:
        print(f"\n📝 クエリ: {query}")
        print("-" * 40)
        
        relevant_files = auto_ref.auto_find_relevant_files(query)
        
        if relevant_files:
            print(f"✅ {len(relevant_files)}件の関連ファイルを発見:")
            for file_info in relevant_files[:3]:  # 上位3件
                print(f"  - {file_info['name']} (関連度: {file_info['relevance_score']})")
        else:
            print("❌ 関連ファイルなし")
    
    # 詳細コンテキスト生成テスト
    print("\n" + "=" * 60)
    print("📋 詳細コンテキスト生成テスト")
    
    test_query = "統一hooksシステムの実装"
    context = auto_ref.generate_context_summary(test_query)
    print(context[:1000] + "..." if len(context) > 1000 else context)

if __name__ == "__main__":
    demo_auto_reference_system()
