#!/bin/bash
echo "🚀 Yahoo Auction Tool 統合システム起動中..."

# 仮想環境確認・作成
if [ ! -d "venv" ]; then
    echo "📦 仮想環境作成中..."
    python3 -m venv venv
fi

# 仮想環境有効化
source venv/bin/activate

# 依存関係インストール
echo "📚 依存関係インストール中..."
pip install -r requirements.txt

# APIサーバー起動
echo "🌐 APIサーバー起動中..."
if [ -f "api_server_complete.py" ]; then
    python3 api_server_complete.py
else
    python3 api_server_simple.py
fi
