#!/bin/bash

# 🎯 Hooks一括リネーム・整理スクリプト
# 既存データを直接リネーム・フォルダ整理

set -e  # エラー時停止

echo "🎯 Hooks一括リネーム・整理開始"
echo "=========================================="

# 作業ディレクトリ設定
CURRENT_DIR="$(pwd)"
CLAUDE_HOOKS_DIR="$CURRENT_DIR/claude_hooks"

# バックアップ作成
echo "📦 バックアップ作成中..."
BACKUP_DIR="$CURRENT_DIR/claude_hooks_backup_$(date '+%Y%m%d_%H%M%S')"
cp -r "$CLAUDE_HOOKS_DIR" "$BACKUP_DIR"
echo "✅ バックアップ完了: $BACKUP_DIR"

# 新しいディレクトリ構造作成
echo "🏗️ 新しいディレクトリ構造作成中..."

# system/ ディレクトリ作成
mkdir -p "$CLAUDE_HOOKS_DIR/system"/{registry,engines,utils}

# hooks/ ディレクトリ作成（技術別）
mkdir -p "$CLAUDE_HOOKS_DIR/hooks/by_technology"/{php,javascript,python,css,html,database,infrastructure}/{foundation,security,web,api,advanced}

# hooks/ ディレクトリ作成（機能別クロスリファレンス）
mkdir -p "$CLAUDE_HOOKS_DIR/hooks/by_function"/{security,performance,testing,api,ui_ux}

# resources/ ディレクトリ作成
mkdir -p "$CLAUDE_HOOKS_DIR/resources"/{templates,css,js,images,docs}

# workspace/ ディレクトリ作成
mkdir -p "$CLAUDE_HOOKS_DIR/workspace"/{logs,cache,temp,exports}

echo "✅ ディレクトリ構造作成完了"

# ファイル移動・リネーム
echo "🔄 ファイル移動・リネーム中..."

# システム関連ファイル移動
echo "  📋 システムファイル移動中..."

# 設定ファイル → system/registry/
if [[ -f "$CLAUDE_HOOKS_DIR/hooks_registry.json" ]]; then
    mv "$CLAUDE_HOOKS_DIR/hooks_registry.json" "$CLAUDE_HOOKS_DIR/system/registry/"
    echo "    ✓ hooks_registry.json → system/registry/"
fi

if [[ -f "$CLAUDE_HOOKS_DIR/claude_settings.json" ]]; then
    mv "$CLAUDE_HOOKS_DIR/claude_settings.json" "$CLAUDE_HOOKS_DIR/system/registry/"
    echo "    ✓ claude_settings.json → system/registry/"
fi

if [[ -f "$CLAUDE_HOOKS_DIR/auto_answer_database.json" ]]; then
    mv "$CLAUDE_HOOKS_DIR/auto_answer_database.json" "$CLAUDE_HOOKS_DIR/system/registry/"
    echo "    ✓ auto_answer_database.json → system/registry/"
fi

if [[ -f "$CLAUDE_HOOKS_DIR/hooks_registry_implementation.json" ]]; then
    mv "$CLAUDE_HOOKS_DIR/hooks_registry_implementation.json" "$CLAUDE_HOOKS_DIR/system/registry/"
    echo "    ✓ hooks_registry_implementation.json → system/registry/"
fi

if [[ -f "$CLAUDE_HOOKS_DIR/settings.json" ]]; then
    mv "$CLAUDE_HOOKS_DIR/settings.json" "$CLAUDE_HOOKS_DIR/system/registry/"
    echo "    ✓ settings.json → system/registry/"
fi

# コアシステムファイル → system/engines/
if [[ -f "$CLAUDE_HOOKS_DIR/auto_classifier.py" ]]; then
    mv "$CLAUDE_HOOKS_DIR/auto_classifier.py" "$CLAUDE_HOOKS_DIR/system/engines/"
    echo "    ✓ auto_classifier.py → system/engines/"
fi

if [[ -f "$CLAUDE_HOOKS_DIR/handover_generator.py" ]]; then
    mv "$CLAUDE_HOOKS_DIR/handover_generator.py" "$CLAUDE_HOOKS_DIR/system/engines/"
    echo "    ✓ handover_generator.py → system/engines/"
fi

if [[ -f "$CLAUDE_HOOKS_DIR/infrastructure_check.py" ]]; then
    mv "$CLAUDE_HOOKS_DIR/infrastructure_check.py" "$CLAUDE_HOOKS_DIR/system/engines/"
    echo "    ✓ infrastructure_check.py → system/engines/"
fi

# 実行スクリプト → system/engines/
if [[ -f "$CURRENT_DIR/main_hooks_executor.sh" ]]; then
    mv "$CURRENT_DIR/main_hooks_executor.sh" "$CLAUDE_HOOKS_DIR/system/engines/"
    echo "    ✓ main_hooks_executor.sh → system/engines/"
fi

if [[ -f "$CURRENT_DIR/main_hooks_executor2.sh" ]]; then
    mv "$CURRENT_DIR/main_hooks_executor2.sh" "$CLAUDE_HOOKS_DIR/system/engines/"
    echo "    ✓ main_hooks_executor2.sh → system/engines/"
fi

if [[ -f "$CURRENT_DIR/test_system.sh" ]]; then
    mv "$CURRENT_DIR/test_system.sh" "$CLAUDE_HOOKS_DIR/system/engines/"
    echo "    ✓ test_system.sh → system/engines/"
fi

# ユーティリティスクリプト → system/utils/
if [[ -f "$CURRENT_DIR/check_files.sh" ]]; then
    mv "$CURRENT_DIR/check_files.sh" "$CLAUDE_HOOKS_DIR/system/utils/"
    echo "    ✓ check_files.sh → system/utils/"
fi

if [[ -f "$CURRENT_DIR/verify_stage_a.sh" ]]; then
    mv "$CURRENT_DIR/verify_stage_a.sh" "$CLAUDE_HOOKS_DIR/system/utils/"
    echo "    ✓ verify_stage_a.sh → system/utils/"
fi

# Hooksファイル移動・リネーム
echo "  🪝 Hooksファイル移動・リネーム中..."

# Foundation hooks（基盤系）
if [[ -f "$CLAUDE_HOOKS_DIR/security_validation.py" ]]; then
    mv "$CLAUDE_HOOKS_DIR/security_validation.py" "$CLAUDE_HOOKS_DIR/hooks/by_technology/python/foundation/safety_guard.py"
    echo "    ✓ security_validation.py → hooks/by_technology/python/foundation/safety_guard.py"
fi

if [[ -f "$CLAUDE_HOOKS_DIR/quality_assurance.py" ]]; then
    mv "$CLAUDE_HOOKS_DIR/quality_assurance.py" "$CLAUDE_HOOKS_DIR/hooks/by_technology/python/foundation/excellence_standard.py"
    echo "    ✓ quality_assurance.py → hooks/by_technology/python/foundation/excellence_standard.py"
fi

# CSS関連hooks
if [[ -f "$CLAUDE_HOOKS_DIR/hooks_css_validation_implementation.py" ]]; then
    mv "$CLAUDE_HOOKS_DIR/hooks_css_validation_implementation.py" "$CLAUDE_HOOKS_DIR/hooks/by_technology/css/foundation/user_experience_validation.py"
    echo "    ✓ hooks_css_validation_implementation.py → hooks/by_technology/css/foundation/user_experience_validation.py"
fi

# JavaScript関連hooks
if [[ -f "$CLAUDE_HOOKS_DIR/hooks_javascript_implementation.py" ]]; then
    mv "$CLAUDE_HOOKS_DIR/hooks_javascript_implementation.py" "$CLAUDE_HOOKS_DIR/hooks/by_technology/javascript/foundation/interactive_behavior_validation.py"
    echo "    ✓ hooks_javascript_implementation.py → hooks/by_technology/javascript/foundation/interactive_behavior_validation.py"
fi

# FastAPI関連hooks
if [[ -f "$CLAUDE_HOOKS_DIR/hooks_fastapi_implementation.py" ]]; then
    mv "$CLAUDE_HOOKS_DIR/hooks_fastapi_implementation.py" "$CLAUDE_HOOKS_DIR/hooks/by_technology/python/api/service_connection_validation.py"
    echo "    ✓ hooks_fastapi_implementation.py → hooks/by_technology/python/api/service_connection_validation.py"
fi

# セキュリティ関連hooks
if [[ -f "$CLAUDE_HOOKS_DIR/hooks_security_implementation.py" ]]; then
    mv "$CLAUDE_HOOKS_DIR/hooks_security_implementation.py" "$CLAUDE_HOOKS_DIR/hooks/by_technology/python/security/fortress_protection.py"
    echo "    ✓ hooks_security_implementation.py → hooks/by_technology/python/security/fortress_protection.py"
fi

# Phase別hooks
if [[ -f "$CLAUDE_HOOKS_DIR/phase2_performance_hooks.py" ]]; then
    mv "$CLAUDE_HOOKS_DIR/phase2_performance_hooks.py" "$CLAUDE_HOOKS_DIR/hooks/by_technology/python/advanced/performance_boost.py"
    echo "    ✓ phase2_performance_hooks.py → hooks/by_technology/python/advanced/performance_boost.py"
fi

if [[ -f "$CLAUDE_HOOKS_DIR/phase2_testing_validation_hooks.py" ]]; then
    mv "$CLAUDE_HOOKS_DIR/phase2_testing_validation_hooks.py" "$CLAUDE_HOOKS_DIR/hooks/by_technology/python/advanced/reliability_proof.py"
    echo "    ✓ phase2_testing_validation_hooks.py → hooks/by_technology/python/advanced/reliability_proof.py"
fi

if [[ -f "$CLAUDE_HOOKS_DIR/phase2_web_development_complete.py" ]]; then
    mv "$CLAUDE_HOOKS_DIR/phase2_web_development_complete.py" "$CLAUDE_HOOKS_DIR/hooks/by_technology/python/web/comprehensive_web_validation.py"
    echo "    ✓ phase2_web_development_complete.py → hooks/by_technology/python/web/comprehensive_web_validation.py"
fi

# Phase3関連hooks
if [[ -f "$CLAUDE_HOOKS_DIR/phase3_comprehensive_hooks_106_120.py" ]]; then
    mv "$CLAUDE_HOOKS_DIR/phase3_comprehensive_hooks_106_120.py" "$CLAUDE_HOOKS_DIR/hooks/by_technology/python/advanced/comprehensive_system_validation.py"
    echo "    ✓ phase3_comprehensive_hooks_106_120.py → hooks/by_technology/python/advanced/comprehensive_system_validation.py"
fi

if [[ -f "$CLAUDE_HOOKS_DIR/phase3_security_hooks_101_105.py" ]]; then
    mv "$CLAUDE_HOOKS_DIR/phase3_security_hooks_101_105.py" "$CLAUDE_HOOKS_DIR/hooks/by_technology/python/security/advanced_security_validation.py"
    echo "    ✓ phase3_security_hooks_101_105.py → hooks/by_technology/python/security/advanced_security_validation.py"
fi

# 高度なhooks
if [[ -f "$CLAUDE_HOOKS_DIR/advanced_performance_hooks_121_140.py" ]]; then
    mv "$CLAUDE_HOOKS_DIR/advanced_performance_hooks_121_140.py" "$CLAUDE_HOOKS_DIR/hooks/by_technology/python/advanced/elite_performance_optimization.py"
    echo "    ✓ advanced_performance_hooks_121_140.py → hooks/by_technology/python/advanced/elite_performance_optimization.py"
fi

if [[ -f "$CLAUDE_HOOKS_DIR/remaining_70_hooks_141_190.py" ]]; then
    mv "$CLAUDE_HOOKS_DIR/remaining_70_hooks_141_190.py" "$CLAUDE_HOOKS_DIR/hooks/by_technology/python/advanced/global_adaptation_system.py"
    echo "    ✓ remaining_70_hooks_141_190.py → hooks/by_technology/python/advanced/global_adaptation_system.py"
fi

# リソースファイル移動
echo "  📁 リソースファイル移動中..."

# CSS関連リソース
if [[ -d "$CLAUDE_HOOKS_DIR/css" ]]; then
    mv "$CLAUDE_HOOKS_DIR/css" "$CLAUDE_HOOKS_DIR/resources/"
    echo "    ✓ css/ → resources/css/"
fi

# JavaScript関連リソース
if [[ -d "$CLAUDE_HOOKS_DIR/js" ]]; then
    mv "$CLAUDE_HOOKS_DIR/js" "$CLAUDE_HOOKS_DIR/resources/"
    echo "    ✓ js/ → resources/js/"
fi

# 画像リソース
if [[ -d "$CLAUDE_HOOKS_DIR/images" ]]; then
    mv "$CLAUDE_HOOKS_DIR/images" "$CLAUDE_HOOKS_DIR/resources/"
    echo "    ✓ images/ → resources/images/"
fi

# テンプレート
if [[ -d "$CLAUDE_HOOKS_DIR/templates" ]]; then
    mv "$CLAUDE_HOOKS_DIR/templates" "$CLAUDE_HOOKS_DIR/resources/"
    echo "    ✓ templates/ → resources/templates/"
fi

# ビューファイル
if [[ -d "$CLAUDE_HOOKS_DIR/views" ]]; then
    mv "$CLAUDE_HOOKS_DIR/views" "$CLAUDE_HOOKS_DIR/resources/"
    echo "    ✓ views/ → resources/views/"
fi

# 作業領域ファイル移動
echo "  🗂️ 作業領域ファイル移動中..."

# ログファイル
if [[ -d "$CLAUDE_HOOKS_DIR/logs" ]]; then
    mv "$CLAUDE_HOOKS_DIR/logs" "$CLAUDE_HOOKS_DIR/workspace/"
    echo "    ✓ logs/ → workspace/logs/"
fi

# デバッグファイル
if [[ -d "$CLAUDE_HOOKS_DIR/debug" ]]; then
    mv "$CLAUDE_HOOKS_DIR/debug" "$CLAUDE_HOOKS_DIR/workspace/temp/"
    echo "    ✓ debug/ → workspace/temp/"
fi

# 設定ディレクトリ（残りのファイル）
echo "  ⚙️ その他設定ファイル整理中..."

# config関連
if [[ -d "$CLAUDE_HOOKS_DIR/config" ]]; then
    # 設定ファイルをsystem/registryに統合
    find "$CLAUDE_HOOKS_DIR/config" -name "*.json" -exec mv {} "$CLAUDE_HOOKS_DIR/system/registry/" \;
    # 空になったconfigディレクトリを削除
    rmdir "$CLAUDE_HOOKS_DIR/config" 2>/dev/null || mv "$CLAUDE_HOOKS_DIR/config" "$CLAUDE_HOOKS_DIR/workspace/temp/"
    echo "    ✓ config/ → system/registry/ (JSONファイル)"
fi

# env関連
if [[ -d "$CLAUDE_HOOKS_DIR/env" ]]; then
    mv "$CLAUDE_HOOKS_DIR/env" "$CLAUDE_HOOKS_DIR/workspace/temp/"
    echo "    ✓ env/ → workspace/temp/"
fi

# helpers関連
if [[ -d "$CLAUDE_HOOKS_DIR/helpers" ]]; then
    mv "$CLAUDE_HOOKS_DIR/helpers" "$CLAUDE_HOOKS_DIR/system/utils/"
    echo "    ✓ helpers/ → system/utils/"
fi

# services関連
if [[ -d "$CLAUDE_HOOKS_DIR/services" ]]; then
    mv "$CLAUDE_HOOKS_DIR/services" "$CLAUDE_HOOKS_DIR/system/engines/"
    echo "    ✓ services/ → system/engines/"
fi

# data関連
if [[ -d "$CLAUDE_HOOKS_DIR/data" ]]; then
    mv "$CLAUDE_HOOKS_DIR/data" "$CLAUDE_HOOKS_DIR/workspace/"
    echo "    ✓ data/ → workspace/data/"
fi

# database関連
if [[ -d "$CLAUDE_HOOKS_DIR/database" ]]; then
    mv "$CLAUDE_HOOKS_DIR/database" "$CLAUDE_HOOKS_DIR/workspace/"
    echo "    ✓ database/ → workspace/database/"
fi

# oauth関連
if [[ -d "$CLAUDE_HOOKS_DIR/oauth" ]]; then
    mv "$CLAUDE_HOOKS_DIR/oauth" "$CLAUDE_HOOKS_DIR/workspace/temp/"
    echo "    ✓ oauth/ → workspace/temp/"
fi

# php関連
if [[ -d "$CLAUDE_HOOKS_DIR/php" ]]; then
    mv "$CLAUDE_HOOKS_DIR/php" "$CLAUDE_HOOKS_DIR/workspace/temp/"
    echo "    ✓ php/ → workspace/temp/"
fi

# hooks管理ファイル生成
echo "📊 Hooks管理ファイル生成中..."

# hooks数管理ファイル作成
cat > "$CLAUDE_HOOKS_DIR/system/registry/hooks_counter.json" << 'EOF'
{
  "version": "1.0.0",
  "last_updated": "2025-01-15",
  "technology_stats": {
    "python": {
      "foundation": 2,
      "api": 1,
      "security": 2,
      "web": 1,
      "advanced": 4,
      "total": 10
    },
    "css": {
      "foundation": 1,
      "total": 1
    },
    "javascript": {
      "foundation": 1,
      "total": 1
    },
    "php": {
      "total": 0
    },
    "html": {
      "total": 0
    },
    "database": {
      "total": 0
    },
    "infrastructure": {
      "total": 0
    }
  },
  "function_stats": {
    "security": 2,
    "performance": 2,
    "testing": 1,
    "api": 1,
    "ui_ux": 1
  },
  "total_hooks": 12,
  "migration_status": "completed"
}
EOF

# ディレクトリマッピング作成
cat > "$CLAUDE_HOOKS_DIR/system/registry/directory_mapping.json" << 'EOF'
{
  "structure_version": "2.0.0",
  "migration_date": "2025-01-15",
  "directory_structure": {
    "system/": "システム管理・設定・実行エンジン",
    "hooks/": "実行可能hooks（技術別・機能別）",
    "resources/": "CSS・JS・画像・テンプレート等",
    "workspace/": "ログ・キャッシュ・一時ファイル"
  },
  "hooks_categories": {
    "by_technology/": "技術別hooks分類",
    "by_function/": "機能別hooks分類（クロスリファレンス）"
  },
  "technology_mapping": {
    "php/": "PHP開発関連hooks",
    "javascript/": "JavaScript・フロントエンド関連hooks",
    "python/": "Python・API・AI関連hooks",
    "css/": "CSS・デザイン関連hooks",
    "html/": "HTML・マークアップ関連hooks",
    "database/": "データベース関連hooks",
    "infrastructure/": "インフラ・DevOps関連hooks"
  }
}
EOF

echo "✅ ファイル移動・リネーム完了"

# 実行権限設定
echo "🔐 実行権限設定中..."
find "$CLAUDE_HOOKS_DIR/system/engines" -name "*.sh" -exec chmod +x {} \;
find "$CLAUDE_HOOKS_DIR/system/utils" -name "*.sh" -exec chmod +x {} \;
echo "✅ 実行権限設定完了"

# 最終構造確認
echo ""
echo "📋 新しいディレクトリ構造:"
echo "=========================================="
tree "$CLAUDE_HOOKS_DIR" -I '__pycache__|*.pyc' -L 3 2>/dev/null || find "$CLAUDE_HOOKS_DIR" -type d | head -20

echo ""
echo "🎉 Hooks一括リネーム・整理完了！"
echo "=========================================="
echo "📦 バックアップ: $BACKUP_DIR"
echo "📂 新構造: $CLAUDE_HOOKS_DIR"
echo ""
echo "📊 移行統計:"
echo "  🪝 Python hooks: 10個"
echo "  🎨 CSS hooks: 1個" 
echo "  ⚡ JavaScript hooks: 1個"
echo "  📋 総hooks数: 12個"
echo ""
echo "🚀 次のステップ:"
echo "  1. cd $CLAUDE_HOOKS_DIR"
echo "  2. ./system/engines/test_system.sh"
echo "  3. 新しいhooks追加時は技術別ディレクトリを使用"
echo ""
echo "✅ すべて完了しました！"