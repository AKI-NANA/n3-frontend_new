#!/bin/bash
# Yahoo→eBay統合ワークフロー完全版起動スクリプト

echo "Yahoo→eBayワークフロー システム起動中..."

# 作業ディレクトリに移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool

# 仮想環境のアクティベート（存在する場合）
if [ -d "venv" ]; then
    echo "仮想環境をアクティベート中..."
    source venv/bin/activate
fi

# 必要なPythonパッケージのインストール
echo "必要なパッケージをインストール中..."
pip install flask flask-cors pandas requests

# APIサーバーの起動
echo "APIサーバーを起動中..."
echo "アクセス先: http://localhost:8080/modules/yahoo_auction_tool/index.php"
echo "API サーバー: http://localhost:5000"

# バックグラウンドで実行
python3 api_server_complete.py &

# プロセスIDを保存
echo $! > .api_server.pid

echo "APIサーバーが起動しました (PID: $!)"
echo ""
echo "ブラウザで以下のURLにアクセスしてください:"
echo "http://localhost:8080/modules/yahoo_auction_tool/index.php"
echo ""
echo "システムを停止するには以下のコマンドを実行してください:"
echo "kill $(cat .api_server.pid)"
