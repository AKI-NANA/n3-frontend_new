#!/bin/bash

echo "🔍 エラー原因詳細分析"
echo "==================="

BASE_DIR="./hooks"

for file in "$BASE_DIR"/*.py; do
    if [[ -f "$file" ]]; then
        filename=$(basename "$file")
        echo ""
        echo "📄 分析中: $filename"
        echo "------------------------"
        
        # 依存関係チェック
        echo "📦 外部ライブラリ依存:"
        missing_libs=$(python3 -c "
import ast
import sys
try:
    with open('$file', 'r') as f:
        content = f.read()
    tree = ast.parse(content)
    missing = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                try:
                    __import__(alias.name)
                except ImportError:
                    missing.append(alias.name)
        elif isinstance(node, ast.ImportFrom) and node.module:
            try:
                __import__(node.module)
            except ImportError:
                missing.append(node.module)
    
    if missing:
        for lib in set(missing):
            print(f'  ❌ {lib}')
    else:
        print('  ✅ 依存関係OK')
        
except SyntaxError as e:
    print(f'  💥 構文エラー: {e}')
except Exception as e:
    print(f'  ⚠️ 解析エラー: {e}')
        " 2>/dev/null)
        
        echo "$missing_libs"
    fi
done

echo ""
echo "🎯 解決方法:"
echo "==========="
echo "1. pip3 install --break-system-packages <ライブラリ名>"
echo "2. または仮想環境使用: python3 -m venv venv && source venv/bin/activate"
echo "3. または依存関係を削除してスタンドアロン化"

