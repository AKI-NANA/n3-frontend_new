#!/usr/bin/env python3
"""
MROエラー修正スクリプト
動的継承を削除して正しいクラス継承に修正
"""

import re
from pathlib import Path

def fix_mro_error_in_file(file_path: Path) -> bool:
    """ファイル内のMROエラーを修正"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # 1. 動的継承を削除
        dangerous_patterns = [
            r'.*\.__bases__\s*\+=.*',
            r'.*\.__bases__\s*=.*',
            r'.*setattr\s*\(.*,\s*["\']__bases__["\'].*\)'
        ]
        
        for pattern in dangerous_patterns:
            content = re.sub(pattern, '# 動的継承削除（MRO問題修正）', content, flags=re.MULTILINE)
        
        # 2. 正しいクラス継承に修正
        # 例: class InternationalizationHooks(BaseValidationHook, HooksHelperMethods):
        class_fixes = {
            r'class\s+(\w+Hooks?)\s*\([^)]*\):': r'class \1(BaseValidationHook):',
            r'class\s+(\w+System)\s*\([^)]*\):': r'class \1:',
        }
        
        for pattern, replacement in class_fixes.items():
            content = re.sub(pattern, replacement, content)
        
        # 3. HooksHelperMethods を直接使用に変更
        # 継承の代わりに組み込み（composition）を使用
        if 'HooksHelperMethods' in content:
            helper_integration = """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # HooksHelperMethods を組み込み（継承の代わり）
        from hooks_helper_methods import HooksHelperMethods
        self.helper = HooksHelperMethods()
        
        # ヘルパーメソッドを自身のメソッドとして登録
        for method_name in dir(self.helper):
            if not method_name.startswith('_') and callable(getattr(self.helper, method_name)):
                setattr(self, method_name, getattr(self.helper, method_name))
"""
            
            # __init__ メソッドが存在しない場合は追加
            if 'def __init__' not in content:
                content = re.sub(
                    r'(class\s+\w+.*:)',
                    r'\1' + helper_integration,
                    content
                )
        
        # 4. インポート修正
        if 'from base_validation_hook import' not in content:
            import_section = """
import os
import re
import json
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

# 修正されたインポート
try:
    from base_validation_hook import BaseValidationHook, create_check_result
except ImportError:
    from .base_validation_hook import BaseValidationHook, create_check_result

"""
            
            # 既存のimport文の前に挿入
            first_import = re.search(r'^(import|from)', content, re.MULTILINE)
            if first_import:
                content = content[:first_import.start()] + import_section + content[first_import.start():]
            else:
                content = import_section + content
        
        # 変更があった場合のみ書き込み
        if content != original_content:
            # バックアップ作成
            backup_path = file_path.with_suffix('.py.mro_backup')
            with open(backup_path, 'w', encoding='utf-8') as f:
                f.write(original_content)
            
            # 修正内容書き込み
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ MROエラー修正完了: {file_path.name}")
            print(f"   📄 バックアップ: {backup_path.name}")
            return True
        else:
            print(f"ℹ️ MRO修正不要: {file_path.name}")
            return True
            
    except Exception as e:
        print(f"❌ MRO修正エラー {file_path.name}: {e}")
        return False

def main():
    """MROエラー修正実行"""
    print("🔧 MROエラー修正開始")
    
    # hooks ディレクトリを探索
    hooks_dirs = ["hooks", "common/claude_hooks", "."]
    target_files = []
    
    for hooks_dir in hooks_dirs:
        hooks_path = Path(hooks_dir)
        if hooks_path.exists():
            target_files.extend(hooks_path.glob("*.py"))
    
    if not target_files:
        print("❌ Python ファイルが見つかりません")
        return False
    
    success_count = 0
    for file_path in target_files:
        if file_path.name in ["__init__.py", "fix_mro_error.py"]:
            continue
        
        if fix_mro_error_in_file(file_path):
            success_count += 1
    
    print(f"\n📊 MRO修正結果: {success_count}/{len(target_files)-1} ファイル成功")
    return success_count > 0

if __name__ == "__main__":
    success = main()
    if success:
        print("🎉 MROエラー修正完了！")
    else:
        print("⚠️ MRO修正に失敗しました")
