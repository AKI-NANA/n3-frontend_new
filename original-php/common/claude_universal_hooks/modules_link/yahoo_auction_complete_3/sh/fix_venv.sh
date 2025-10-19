#!/bin/bash
# 🔧 仮想環境完全修復スクリプト

echo "🔧 Python仮想環境完全修復開始"
echo "========================================="

# 現在のディレクトリ確認
WORK_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/yahoo_auction_tool"
cd "$WORK_DIR" || { echo "❌ 作業ディレクトリに移動できません"; exit 1; }

echo "📁 現在のディレクトリ: $(pwd)"

# Step 1: 既存仮想環境の無効化・バックアップ
echo ""
echo "📦 Step 1: 既存仮想環境の確認・バックアップ"

# deactivate実行（エラーでも続行）
deactivate 2>/dev/null || echo "仮想環境は既に無効化されています"

# 既存venvをバックアップ
if [ -d "venv" ]; then
    echo "既存の仮想環境をバックアップ中..."
    mv venv venv_backup_$(date +%Y%m%d_%H%M%S)
    echo "✅ バックアップ完了"
else
    echo "既存の仮想環境は見つかりません"
fi

# Step 2: 新しい仮想環境作成
echo ""
echo "🆕 Step 2: 新しい仮想環境作成"

echo "Python3バージョン確認:"
python3 --version

echo "新しい仮想環境作成中..."
python3 -m venv venv

if [ $? -eq 0 ]; then
    echo "✅ 仮想環境作成成功"
else
    echo "❌ 仮想環境作成失敗"
    exit 1
fi

# Step 3: 仮想環境有効化確認
echo ""
echo "🔌 Step 3: 仮想環境有効化・確認"

source venv/bin/activate

echo "仮想環境有効化後のパス確認:"
echo "Python3パス: $(which python3)"
echo "pipパス: $(which pip)"

# 正しい仮想環境パスかチェック
EXPECTED_PYTHON="$WORK_DIR/venv/bin/python3"
ACTUAL_PYTHON=$(which python3)

if [ "$ACTUAL_PYTHON" = "$EXPECTED_PYTHON" ]; then
    echo "✅ 仮想環境正常に有効化されました"
else
    echo "⚠️ 仮想環境のパスが正しくありません"
    echo "期待値: $EXPECTED_PYTHON"
    echo "実際値: $ACTUAL_PYTHON"
fi

# Step 4: 基本パッケージインストール
echo ""
echo "📦 Step 4: 必要パッケージインストール"

echo "pipアップグレード中..."
pip install --upgrade pip

echo "基本パッケージインストール中..."
pip install flask flask-cors pandas requests

# requirements.txtがあればそれも使用
if [ -f "requirements.txt" ]; then
    echo "requirements.txtからパッケージインストール中..."
    pip install -r requirements.txt
fi

# Step 5: パッケージ確認
echo ""
echo "🔍 Step 5: インストール確認"

echo "インストール済みパッケージ一覧:"
pip list

echo ""
echo "重要パッケージ個別確認:"

python3 -c "import flask; print('✅ Flask: OK')" 2>/dev/null || echo "❌ Flask: NG"
python3 -c "import flask_cors; print('✅ Flask-CORS: OK')" 2>/dev/null || echo "❌ Flask-CORS: NG"
python3 -c "import pandas; print('✅ Pandas: OK')" 2>/dev/null || echo "❌ Pandas: NG"  
python3 -c "import requests; print('✅ Requests: OK')" 2>/dev/null || echo "❌ Requests: NG"

# Step 6: 最終確認
echo ""
echo "📊 最終確認"
echo "========================================="

if python3 -c "import flask_cors" 2>/dev/null; then
    echo "✅ 仮想環境修復完了！"
    echo ""
    echo "🚀 次のステップ:"
    echo "  1. APIサーバー起動テスト: python3 api_server_complete.py"
    echo "  2. システム動作確認: ./system_health_check.sh"
    echo ""
    echo "⚠️ 注意: ターミナルセッションで以下を実行してください:"
    echo "  source venv/bin/activate"
else
    echo "❌ まだ問題があります。手動で確認が必要です。"
fi

echo ""
echo "現在の仮想環境状態:"
echo "Python: $(which python3)"
echo "Pip: $(which pip)"
echo "アクティブ: $VIRTUAL_ENV"
