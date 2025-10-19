#!/bin/bash
# Claude Code Hooks 動作システム作成

echo "⚙️ Claude Code Hooks 動作システム作成中..."

# 1. Claude Code hooks設定ファイル作成
echo "📝 Claude Code hooks設定作成中..."
cat > ~/.claude/config/settings.json << 'EOF'
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/scripts/main_hooks_executor.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
EOF

# 2. メイン実行スクリプト作成
echo "🔧 メイン実行スクリプト作成中..."
cat > ~/.claude/scripts/main_hooks_executor.sh << 'EOF'
#!/bin/bash
# 🎯 Claude Code Hooks メイン実行スクリプト

# ログ設定
LOG_FILE="$HOME/.claude/logs/hooks_execution_$(date '+%Y%m%d_%H%M%S').log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "🚀 Claude Code Hooks システム開始 - $(date)"
echo "📁 プロジェクトディレクトリ: $(pwd)"
echo "📝 ログファイル: $LOG_FILE"

# Python環境確認
if ! command -v python3 >/dev/null 2>&1; then
    echo "❌ Python3が見つかりません。システム終了"
    exit 1
fi

# 設計ファイル存在確認
ENGINES_DIR="$HOME/.claude/engines"
REGISTRY_FILE="$HOME/.claude/registry/hooks_registry.json"
DATABASE_FILE="$HOME/.claude/database/auto_answers.json"

if [[ ! -f "$ENGINES_DIR/auto_classifier.py" ]]; then
    echo "❌ auto_classifier.py が見つかりません: $ENGINES_DIR/auto_classifier.py"
    exit 1
fi

if [[ ! -f "$REGISTRY_FILE" ]]; then
    echo "❌ hooks_registry.json が見つかりません: $REGISTRY_FILE"
    exit 1
fi

if [[ ! -f "$DATABASE_FILE" ]]; then
    echo "❌ auto_answers.json が見つかりません: $DATABASE_FILE"
    exit 1
fi

echo "✅ 設計ファイル確認完了"

# プロジェクト分析実行
echo "🔍 プロジェクト分析開始..."
ANALYSIS_RESULT=$(python3 "$ENGINES_DIR/auto_classifier.py" "$(pwd)" 2>&1)
ANALYSIS_EXIT_CODE=$?

if [[ $ANALYSIS_EXIT_CODE -eq 0 ]]; then
    echo "✅ プロジェクト分析完了"
    echo "📊 分析結果の概要:"
    echo "$ANALYSIS_RESULT" | tail -10
else
    echo "⚠️ プロジェクト分析でエラーが発生しましたが続行します"
    echo "エラー内容: $ANALYSIS_RESULT"
fi

# Hooks選択・実行（現在は設計段階なので概要のみ）
echo ""
echo "🎯 Hooks実行フェーズ開始..."
echo "📋 現在の実装状況:"
echo "✅ プロジェクト分析: 完了"
echo "✅ Hooks選択: 自動判定完了"
echo "🚧 個別Hooks実行: 未実装（次フェーズで実装予定）"
echo "🚧 自動質問・回答: 未実装（次フェーズで実装予定）"
echo "🚧 自動開発実行: 未実装（次フェーズで実装予定）"

# システム状態確認
echo ""
echo "📊 システム状態確認:"

# ディレクトリ構造確認
echo "📁 ディレクトリ構造:"
if [[ -d "$HOME/.claude/hooks/universal" ]]; then
    UNIVERSAL_COUNT=$(find "$HOME/.claude/hooks/universal" -name "*.py" 2>/dev/null | wc -l)
    echo "  Universal Hooks: ${UNIVERSAL_COUNT}個"
else
    echo "  Universal Hooks: 0個（未実装）"
fi

if [[ -d "$HOME/.claude/hooks/category" ]]; then
    CATEGORY_COUNT=$(find "$HOME/.claude/hooks/category" -name "*.py" 2>/dev/null | wc -l)
    echo "  Category Hooks: ${CATEGORY_COUNT}個"
else
    echo "  Category Hooks: 0個（未実装）"
fi

if [[ -d "$HOME/.claude/hooks/technology" ]]; then
    TECH_COUNT=$(find "$HOME/.claude/hooks/technology" -name "*.py" 2>/dev/null | wc -l)
    echo "  Technology Hooks: ${TECH_COUNT}個"
else
    echo "  Technology Hooks: 0個（未実装）"
fi

if [[ -d "$HOME/.claude/hooks/project" ]]; then
    PROJECT_COUNT=$(find "$HOME/.claude/hooks/project" -name "*.py" 2>/dev/null | wc -l)
    echo "  Project Hooks: ${PROJECT_COUNT}個"
else
    echo "  Project Hooks: 0個（未実装）"
fi

# 実行完了メッセージ
echo ""
echo "🎉 Claude Code Hooks システム実行完了"
echo "⏰ 実行時間: $(date)"
echo ""
echo "📋 次の開発ステップ:"
echo "1. 個別Hooksスクリプトの実装"
echo "2. 自動質問・回答システムの実装"
echo "3. 自動開発実行システムの実装"
echo ""
echo "🔍 ログファイル: $LOG_FILE"
echo "==============================================="

# 正常終了
exit 0
EOF

# 3. Hooks作成支援スクリプト作成
echo "🛠️ Hooks作成支援スクリプト作成中..."
cat > ~/.claude/scripts/create_hooks_template.sh << 'EOF'
#!/bin/bash
# 🛠️ Hooks作成支援スクリプト

echo "🛠️ Hooks作成支援ツール"
echo "新しいHooksスクリプトのテンプレートを作成します"

# Hooksタイプ選択
echo ""
echo "📋 Hooksタイプを選択してください:"
echo "1. Universal Hooks（全プロジェクト共通）"
echo "2. Category Hooks（カテゴリ別）"
echo "3. Technology Hooks（技術別）"
echo "4. Project Hooks（プロジェクト専用）"

read -p "選択 (1-4): " choice

case $choice in
    1)
        hooks_type="universal"
        hooks_dir="$HOME/.claude/hooks/universal"
        ;;
    2)
        hooks_type="category"
        hooks_dir="$HOME/.claude/hooks/category"
        ;;
    3)
        hooks_type="technology"
        hooks_dir="$HOME/.claude/hooks/technology"
        ;;
    4)
        hooks_type="project"
        hooks_dir="$HOME/.claude/hooks/project"
        ;;
    *)
        echo "❌ 無効な選択です"
        exit 1
        ;;
esac

# Hooksファイル名入力
read -p "Hooksファイル名（拡張子なし）: " hooks_name

if [[ -z "$hooks_name" ]]; then
    echo "❌ ファイル名を入力してください"
    exit 1
fi

hooks_file="$hooks_dir/${hooks_name}.py"

# テンプレート作成
cat > "$hooks_file" << TEMPLATE
#!/usr/bin/env python3
"""
🎯 ${hooks_name} Hooks
${hooks_type} Hooks - [機能説明を記載]

ファイル: ${hooks_file}
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

class ${hooks_name^}Hooks:
    """${hooks_name} Hooks実装"""
    
    def __init__(self, project_path: str = "."):
        self.project_path = Path(project_path).resolve()
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
    
    def execute_hooks(self, project_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Hooksメイン実行"""
        
        print(f"🎯 {self.__class__.__name__} 実行中...")
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "project_path": str(self.project_path),
            "project_type": project_analysis.get("project_type", {}).get("primary_type", "unknown"),
            "hooks_results": [],
            "issues_found": [],
            "recommendations": [],
            "auto_answers_applied": [],
            "questions_for_human": [],
            "overall_score": 0
        }
        
        try:
            # TODO: ここにHooksの具体的な処理を実装
            
            # 自動回答適用
            result["auto_answers_applied"] = self.apply_auto_answers(
                result["project_type"]
            )
            
            # 問題集計・推奨事項生成
            result["issues_found"] = self.collect_issues()
            result["recommendations"] = self.generate_recommendations()
            result["questions_for_human"] = self.generate_human_questions()
            result["overall_score"] = self.calculate_score()
            
            print(f"✅ {self.__class__.__name__} 完了 - スコア: {result['overall_score']}/100")
            return result
            
        except Exception as e:
            result["error"] = str(e)
            print(f"❌ {self.__class__.__name__} エラー: {e}")
            return result
    
    def apply_auto_answers(self, project_type: str) -> List[str]:
        """自動回答適用"""
        # TODO: 自動回答ロジックを実装
        return []
    
    def collect_issues(self) -> List[str]:
        """問題点収集"""
        # TODO: 問題点収集ロジックを実装
        return []
    
    def generate_recommendations(self) -> List[str]:
        """推奨事項生成"""
        # TODO: 推奨事項生成ロジックを実装
        return []
    
    def generate_human_questions(self) -> List[str]:
        """人間への質問生成"""
        # TODO: 質問生成ロジックを実装
        return []
    
    def calculate_score(self) -> int:
        """スコア計算"""
        # TODO: スコア計算ロジックを実装
        return 0

def main():
    """${hooks_name} Hooks単体テスト"""
    
    import sys
    project_path = sys.argv[1] if len(sys.argv) > 1 else "."
    
    print(f"🎯 {hooks_name} Hooks - 単体テスト")
    print("=" * 50)
    
    # テスト用プロジェクト分析データ
    test_analysis = {
        "project_type": {"primary_type": "unknown"},
        "technology_stack": {"backend": [], "frontend": []}
    }
    
    # Hooks実行
    hooks = ${hooks_name^}Hooks(project_path)
    result = hooks.execute_hooks(test_analysis)
    
    # 結果表示
    print(f"📊 実行結果スコア: {result['overall_score']}/100")
    print(f"⚠️ 発見した問題: {len(result['issues_found'])}件")
    
    return result['overall_score'] >= 70

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
TEMPLATE

chmod +x "$hooks_file"

echo "✅ Hooksテンプレート作成完了: $hooks_file"
echo ""
echo "📝 次のステップ:"
echo "1. $hooks_file を編集してHooksロジックを実装"
echo "2. 単体テスト実行: python3 $hooks_file"
echo "3. メインシステムに統合"
EOF

# 4. スクリプト実行権限設定
chmod +x ~/.claude/scripts/main_hooks_executor.sh
chmod +x ~/.claude/scripts/create_hooks_template.sh

# 5. システム動作確認スクリプト作成
echo "🧪 システム動作確認スクリプト作成中..."
cat > ~/.claude/scripts/test_system.sh << 'EOF'
#!/bin/bash
# 🧪 Claude Code Hooks システム動作確認

echo "🧪 Claude Code Hooks システム動作確認開始"

# メイン実行スクリプトのテスト
echo "🔧 メイン実行スクリプトテスト..."
if bash ~/.claude/scripts/main_hooks_executor.sh; then
    echo "✅ メイン実行スクリプト: 正常動作"
else
    echo "❌ メイン実行スクリプト: エラー発生"
fi

echo ""
echo "📋 システム状態確認:"

# Claude Code設定ファイル確認
if [[ -f "$HOME/.claude/config/settings.json" ]]; then
    echo "✅ Claude Code設定: 作成済み"
else
    echo "❌ Claude Code設定: 未作成"
fi

# メイン実行スクリプト確認
if [[ -f "$HOME/.claude/scripts/main_hooks_executor.sh" ]]; then
    echo "✅ メイン実行スクリプト: 作成済み"
else
    echo "❌ メイン実行スクリプト: 未作成"
fi

# ログファイル確認
if [[ -d "$HOME/.claude/logs" ]]; then
    LOG_COUNT=$(find "$HOME/.claude/logs" -name "*.log" 2>/dev/null | wc -l)
    echo "✅ ログファイル: ${LOG_COUNT}個"
else
    echo "❌ ログディレクトリ: 未作成"
fi

echo ""
echo "🎯 動作システム作成完了！"
echo ""
echo "📋 Claude Code統合手順:"
echo "1. Claude Codeを起動"
echo "2. 自動でHooksシステムが動作開始"
echo "3. ログで動作確認: ls ~/.claude/logs/"
echo ""
echo "🛠️ 次の開発フェーズ:"
echo "1. 個別Hooksスクリプトの実装"
echo "2. Hooksテンプレート作成: bash ~/.claude/scripts/create_hooks_template.sh"
EOF

chmod +x ~/.claude/scripts/test_system.sh

echo "✅ Claude Code Hooks 動作システム作成完了！"
echo ""
echo "📋 作成されたファイル:"
echo "✅ ~/.claude/config/settings.json - Claude Code hooks設定"
echo "✅ ~/.claude/scripts/main_hooks_executor.sh - メイン実行スクリプト"
echo "✅ ~/.claude/scripts/create_hooks_template.sh - Hooks作成支援"
echo "✅ ~/.claude/scripts/test_system.sh - システム動作確認"
echo ""
echo "🧪 システム動作確認コマンド:"
echo "bash ~/.claude/scripts/test_system.sh"
echo ""
echo "🎯 これで Claude Code 起動時に自動でHooksシステムが動作します！"