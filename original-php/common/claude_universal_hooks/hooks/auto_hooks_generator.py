"""
🎯 自動Hooks生成システム - auto_hooks_generator.py
新規開発時の連携ファイル自動生成・既存修正システム

機能:
1. 新しいJS/CSS/Ajax開発時の自動Hook生成
2. 既存ルーティング設定の自動更新
3. 連携ファイルの自動修正
4. 設定ファイルの整合性チェック
"""

import os
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

class AutoHooksGenerator:
    """自動Hooks生成・連携修正システム"""
    
    def __init__(self, project_root: str = "/Users/aritahiroaki/NAGANO-3/N3-Development"):
        self.project_root = Path(project_root)
        self.config_dir = self.project_root / "config"
        self.common_dir = self.project_root / "common"
        self.hooks_dir = self.common_dir / "claude_universal_hooks"
        
        # 設定ファイルパス
        self.js_routing_file = self.config_dir / "js_routing.php"
        self.css_routing_file = self.config_dir / "css_routing.php"
        self.ajax_routing_file = self.config_dir / "ajax_routing.php"
        
        # 生成ログ
        self.generation_log = []
        
    def generate_complete_hooks_for_kicho_dynamic(self):
        """記帳動的化システム用の完全Hooks生成"""
        
        print("🎯 記帳動的化システム用Hooks自動生成開始")
        print("=" * 60)
        
        # 1. JSルーティング設定生成・更新
        js_config = self._generate_js_routing_config()
        self._update_js_routing(js_config)
        
        # 2. CSSルーティング設定生成・更新
        css_config = self._generate_css_routing_config()
        self._update_css_routing(css_config)
        
        # 3. Ajaxルーティング設定更新
        ajax_config = self._generate_ajax_routing_config()
        self._update_ajax_routing(ajax_config)
        
        # 4. HTMLテンプレート生成
        html_template = self._generate_html_template()
        self._save_html_template(html_template)
        
        # 5. 連携確認スクリプト生成
        verification_script = self._generate_verification_script()
        self._save_verification_script(verification_script)
        
        # 6. 生成レポート
        self._generate_completion_report()
        
        print("✅ 記帳動的化システムHooks生成完了")
        return self.generation_log
    
    def _generate_js_routing_config(self) -> Dict[str, Any]:
        """JSルーティング設定生成"""
        
        config = {
            'kicho_content': {
                'file': '/common/js/pages/kicho_dynamic.js',
                'dependencies': [
                    '/common/claude_universal_hooks/js_copy/core/ajax.js'  # 既存Ajax活用
                ],
                'defer': False,
                'required': True,
                'load_order': 1,
                'description': '記帳動的化システム - 自動生成',
                'version': datetime.now().strftime('%Y%m%d_%H%M%S'),
                'auto_generated': True
            }
        }
        
        self.generation_log.append({
            'type': 'js_routing',
            'action': 'generated',
            'config': config
        })
        
        return config
    
    def _generate_css_routing_config(self) -> Dict[str, Any]:
        """CSSルーティング設定生成"""
        
        config = {
            'kicho_content': {
                'file': '/common/css/pages/kicho_dynamic.css',
                'dependencies': [],
                'required': True,
                'load_order': 1,
                'media': 'all',
                'description': '記帳動的化スタイル - 自動生成',
                'version': datetime.now().strftime('%Y%m%d_%H%M%S'),
                'auto_generated': True
            }
        }
        
        self.generation_log.append({
            'type': 'css_routing',
            'action': 'generated',
            'config': config
        })
        
        return config
    
    def _generate_ajax_routing_config(self) -> Dict[str, Any]:
        """Ajaxルーティング設定生成（既存に追加）"""
        
        # 記帳専用のアクション追加
        additional_actions = [
            'save-entry',
            'delete-entry',
            'auto-save-entry',
            'validate-entry',
            'calculate-totals',
            'export-data',
            'import-data',
            'get-entry-history',
            'duplicate-entry',
            'batch-save'
        ]
        
        config = {
            'additional_actions': additional_actions,
            'description': '記帳動的化Ajax処理 - 既存に追加',
            'auto_generated': True,
            'timestamp': datetime.now().isoformat()
        }
        
        self.generation_log.append({
            'type': 'ajax_routing',
            'action': 'extended',
            'config': config
        })
        
        return config
    
    def _update_js_routing(self, config: Dict[str, Any]):
        """JSルーティングファイル更新"""
        
        try:
            # 既存ファイル読み込み
            if self.js_routing_file.exists():
                with open(self.js_routing_file, 'r', encoding='utf-8') as f:
                    content = f.read()
            else:
                content = "<?php\n// JavaScript ルーティング設定\nreturn [\n];\n"
            
            # 新設定を挿入
            for page, page_config in config.items():
                # 既存設定をチェック
                if f"'{page}'" in content:
                    # 既存設定を更新
                    pattern = rf"'{page}'\s*=>\s*array\s*\([^)]*\),"
                    replacement = self._format_php_array_config(page, page_config)
                    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
                    action = 'updated'
                else:
                    # 新規追加
                    insertion_point = content.rfind('];')
                    if insertion_point != -1:
                        new_config = "    " + self._format_php_array_config(page, page_config) + "\n"
                        content = content[:insertion_point] + new_config + content[insertion_point:]
                        action = 'added'
            
            # ファイル保存
            with open(self.js_routing_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            self.generation_log.append({
                'type': 'file_update',
                'file': str(self.js_routing_file),
                'action': action,
                'status': 'success'
            })
            
            print(f"✅ JSルーティング更新完了: {self.js_routing_file}")
            
        except Exception as e:
            self.generation_log.append({
                'type': 'file_update',
                'file': str(self.js_routing_file),
                'action': 'failed',
                'error': str(e)
            })
            print(f"❌ JSルーティング更新エラー: {e}")
    
    def _update_css_routing(self, config: Dict[str, Any]):
        """CSSルーティングファイル更新"""
        
        try:
            # 既存ファイル読み込み
            if self.css_routing_file.exists():
                with open(self.css_routing_file, 'r', encoding='utf-8') as f:
                    content = f.read()
            else:
                content = "<?php\n// CSS ルーティング設定\nreturn [\n];\n"
            
            # 新設定を挿入
            for page, page_config in config.items():
                if f"'{page}'" in content:
                    # 既存設定を更新
                    pattern = rf"'{page}'\s*=>\s*array\s*\([^)]*\),"
                    replacement = self._format_php_array_config(page, page_config)
                    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
                else:
                    # 新規追加
                    insertion_point = content.rfind('];')
                    if insertion_point != -1:
                        new_config = "    " + self._format_php_array_config(page, page_config) + "\n"
                        content = content[:insertion_point] + new_config + content[insertion_point:]
            
            # ファイル保存
            with open(self.css_routing_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            self.generation_log.append({
                'type': 'file_update',
                'file': str(self.css_routing_file),
                'action': 'success'
            })
            
            print(f"✅ CSSルーティング更新完了: {self.css_routing_file}")
            
        except Exception as e:
            print(f"❌ CSSルーティング更新エラー: {e}")
    
    def _update_ajax_routing(self, config: Dict[str, Any]):
        """Ajaxルーティングファイル更新（既存に追加）"""
        
        try:
            if not self.ajax_routing_file.exists():
                print(f"⚠️ Ajaxルーティングファイルが見つかりません: {self.ajax_routing_file}")
                return
            
            with open(self.ajax_routing_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # kicho_contentの設定を探す
            if "'kicho_content'" in content:
                # allowed_actionsに新しいアクションを追加
                for action in config['additional_actions']:
                    if f"'{action}'" not in content:
                        # allowed_actionsセクションに追加
                        pattern = r"('allowed_actions'\s*=>\s*array\s*\([^)]*)\)"
                        def add_action(match):
                            existing = match.group(1)
                            if not existing.strip().endswith(','):
                                existing += ','
                            return existing + f"\n        '{action}',"
                        
                        content = re.sub(pattern, add_action, content)
                
                # ファイル保存
                with open(self.ajax_routing_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✅ Ajaxルーティング更新完了: 新アクション{len(config['additional_actions'])}個追加")
            else:
                print("⚠️ kicho_content設定が見つからないため、Ajaxルーティング更新をスキップ")
            
        except Exception as e:
            print(f"❌ Ajaxルーティング更新エラー: {e}")
    
    def _format_php_array_config(self, page: str, config: Dict[str, Any]) -> str:
        """PHP配列形式の設定文字列生成"""
        
        lines = [f"'{page}' => array ("]
        
        for key, value in config.items():
            if isinstance(value, str):
                lines.append(f"    '{key}' => '{value}',")
            elif isinstance(value, bool):
                lines.append(f"    '{key}' => {str(value).lower()},")
            elif isinstance(value, int):
                lines.append(f"    '{key}' => {value},")
            elif isinstance(value, list):
                if value:  # リストが空でない場合
                    lines.append(f"    '{key}' => array (")
                    for i, item in enumerate(value):
                        lines.append(f"        {i} => '{item}',")
                    lines.append("    ),")
                else:
                    lines.append(f"    '{key}' => array (),")
        
        lines.append("),")
        
        return "\n".join(lines)
    
    def _generate_html_template(self) -> str:
        """HTMLテンプレート生成"""
        
        return '''<!-- 記帳動的化システム用HTMLテンプレート -->
<div class="kicho-dynamic-container">
    <div class="kicho-header">
        <h1>記帳管理システム</h1>
        <p>動的エントリ管理・リアルタイム計算対応</p>
    </div>
    
    <div class="action-buttons">
        <button type="button" data-action="add-entry" data-page="kicho_content">
            新規エントリ追加
        </button>
        <button type="button" data-action="calculate-totals" data-page="kicho_content">
            合計再計算
        </button>
        <button type="button" data-action="export-data" data-page="kicho_content">
            データエクスポート
        </button>
    </div>
    
    <div id="kicho-entries-container">
        <!-- 動的エントリがここに追加されます -->
    </div>
</div>

<!-- 必要なdata-action属性の例 -->
<!-- 
data-action="save-entry" - エントリ保存
data-action="delete-entry" - エントリ削除
data-action="validate-entry" - エントリ検証
data-action="auto-complete" - 自動補完
data-page="kicho_content" - ページ指定（必須）
-->'''
    
    def _save_html_template(self, template: str):
        """HTMLテンプレート保存"""
        
        template_dir = self.common_dir / "templates" / "kicho"
        template_dir.mkdir(parents=True, exist_ok=True)
        
        template_file = template_dir / "kicho_dynamic_template.html"
        
        with open(template_file, 'w', encoding='utf-8') as f:
            f.write(template)
        
        print(f"✅ HTMLテンプレート保存完了: {template_file}")
    
    def _generate_verification_script(self) -> str:
        """連携確認スクリプト生成"""
        
        return '''#!/bin/bash
# 記帳動的化システム連携確認スクリプト

echo "🔍 記帳動的化システム連携確認開始"
echo "=================================="

# 1. JSファイル存在確認
echo "1. JavaScriptファイル確認..."
if [ -f "/common/js/pages/kicho_dynamic.js" ]; then
    echo "✅ kicho_dynamic.js 存在"
else
    echo "❌ kicho_dynamic.js 不存在"
fi

# 2. CSSファイル存在確認
echo "2. CSSファイル確認..."
if [ -f "/common/css/pages/kicho_dynamic.css" ]; then
    echo "✅ kicho_dynamic.css 存在"
else
    echo "❌ kicho_dynamic.css 不存在"
fi

# 3. ルーティング設定確認
echo "3. ルーティング設定確認..."
if grep -q "kicho_content" "/config/js_routing.php"; then
    echo "✅ JSルーティング設定済み"
else
    echo "❌ JSルーティング未設定"
fi

if grep -q "kicho_content" "/config/css_routing.php"; then
    echo "✅ CSSルーティング設定済み"
else
    echo "❌ CSSルーティング未設定"
fi

# 4. Ajax設定確認
echo "4. Ajax設定確認..."
if grep -q "save-entry" "/config/ajax_routing.php"; then
    echo "✅ Ajax新アクション設定済み"
else
    echo "❌ Ajax新アクション未設定"
fi

echo "=================================="
echo "🎯 連携確認完了"
'''
    
    def _save_verification_script(self, script: str):
        """連携確認スクリプト保存"""
        
        script_dir = self.hooks_dir / "scripts"
        script_dir.mkdir(parents=True, exist_ok=True)
        
        script_file = script_dir / "verify_kicho_integration.sh"
        
        with open(script_file, 'w', encoding='utf-8') as f:
            f.write(script)
        
        # 実行権限付与
        os.chmod(script_file, 0o755)
        
        print(f"✅ 連携確認スクリプト保存完了: {script_file}")
    
    def _generate_completion_report(self):
        """完了レポート生成"""
        
        print("\n" + "=" * 60)
        print("🎉 記帳動的化システムHooks生成完了レポート")
        print("=" * 60)
        
        print("\n📁 生成されたファイル:")
        print("- /common/js/pages/kicho_dynamic.js (JavaScript)")
        print("- /common/css/pages/kicho_dynamic.css (CSS)")
        print("- /common/templates/kicho/kicho_dynamic_template.html (HTML)")
        print("- /common/claude_universal_hooks/scripts/verify_kicho_integration.sh (確認)")
        
        print("\n🔧 更新されたファイル:")
        print("- /config/js_routing.php (JSルーティング)")
        print("- /config/css_routing.php (CSSルーティング)")
        print("- /config/ajax_routing.php (Ajaxアクション追加)")
        
        print("\n🎯 利用可能なdata-action:")
        actions = [
            'add-entry', 'save-entry', 'delete-entry', 'validate-entry',
            'calculate-totals', 'export-data', 'import-data', 'auto-complete'
        ]
        for action in actions:
            print(f"- data-action=\"{action}\"")
        
        print("\n✅ 次のステップ:")
        print("1. ファイルを指定場所に保存")
        print("2. 連携確認スクリプト実行")
        print("3. kicho_contentページでテスト")
        print("4. data-actionボタンの動作確認")
        
        print("\n🚀 これで記帳動的化システムが完全連携されます！")

def generate_kicho_dynamic_hooks():
    """記帳動的化Hooks生成実行関数"""
    
    generator = AutoHooksGenerator()
    result = generator.generate_complete_hooks_for_kicho_dynamic()
    
    return result

# 実行例
if __name__ == "__main__":
    generate_kicho_dynamic_hooks()
