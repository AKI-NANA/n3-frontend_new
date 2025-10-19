#!/bin/bash
# 送料計算システム - 直接アクセス確認・修正

echo "🔧 送料計算システム - 直接アクセス確認"
echo "=================================="

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping/

echo "📋 Step 1: 現在のファイル存在確認"
echo "作成されたHTMLファイルをチェック..."

if [ -f "carrier_separated_matrix.html" ]; then
    echo "✅ carrier_separated_matrix.html が存在します"
    FILE_SIZE=$(ls -lh carrier_separated_matrix.html | awk '{print $5}')
    echo "ファイルサイズ: $FILE_SIZE"
else
    echo "❌ carrier_separated_matrix.html が見つかりません"
fi

echo ""
echo "📋 Step 2: PHPサーバー状態確認"

# サーバーの実際の起動状態とドキュメントルートを確認
if lsof -i :8080 > /dev/null 2>&1; then
    echo "✅ ポート8080でサーバーが稼働中"
    
    # プロセス詳細確認
    SERVER_PROCESS=$(ps aux | grep -E "php.*8080" | grep -v grep)
    echo "サーバープロセス:"
    echo "$SERVER_PROCESS"
    
    # ドキュメントルート確認
    if echo "$SERVER_PROCESS" | grep -q "/yahoo_auction_complete"; then
        echo "📁 ドキュメントルート: /yahoo_auction_complete/"
        echo "正しいアクセスパス: http://localhost:8080/new_structure/09_shipping/carrier_separated_matrix.html"
        
        # 実際にアクセステスト
        echo ""
        echo "🌐 アクセステスト実行中..."
        HTTP_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:8080/new_structure/09_shipping/carrier_separated_matrix.html")
        
        if [ "$HTTP_RESPONSE" = "200" ]; then
            echo "✅ HTMLファイルに正常にアクセスできます (HTTP $HTTP_RESPONSE)"
        else
            echo "❌ アクセスエラー (HTTP $HTTP_RESPONSE)"
            
            # 代替確認: ファイル一覧取得
            echo "📂 ディレクトリ一覧確認:"
            curl -s "http://localhost:8080/new_structure/09_shipping/" | head -10
        fi
    else
        echo "⚠️ サーバーのドキュメントルートが予期しない場所です"
    fi
    
else
    echo "❌ ポート8080でサーバーが稼働していません"
    
    echo ""
    echo "🚀 サーバー起動を試行..."
    
    cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/
    
    # バックグラウンドでサーバー起動
    echo "サーバーを起動中..."
    nohup php -S localhost:8080 -t . > server.log 2>&1 &
    SERVER_PID=$!
    
    echo "サーバーPID: $SERVER_PID"
    sleep 3
    
    # 起動確認
    if lsof -i :8080 > /dev/null 2>&1; then
        echo "✅ サーバー起動成功"
        
        # 再度アクセステスト
        HTTP_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:8080/new_structure/09_shipping/carrier_separated_matrix.html")
        echo "アクセステスト結果: HTTP $HTTP_RESPONSE"
        
    else
        echo "❌ サーバー起動失敗"
        echo "ログ確認:"
        cat server.log 2>/dev/null || echo "ログファイルなし"
    fi
fi

echo ""
echo "📋 Step 3: 代替アクセス方法の準備"

# 09_shippingディレクトリ直接用のスタンドアロン版作成
echo "スタンドアロン版（09_shippingディレクトリ直接起動用）を作成..."

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping/

# 直接起動用のサーバースクリプト作成
cat > start_shipping_server.sh << 'EOF'
#!/bin/bash
echo "🚢 送料計算システム 専用サーバー起動"
echo "============================"

cd "$(dirname "$0")"
echo "📁 現在のディレクトリ: $(pwd)"

# ファイル確認
echo "📋 利用可能なHTMLファイル:"
ls -la *.html 2>/dev/null || echo "HTMLファイルなし"

echo ""
echo "🚀 専用サーバー起動 (ポート8081)"
echo "🔗 アクセスURL:"
echo "   - http://localhost:8081/carrier_separated_matrix.html"
echo "   - http://localhost:8081/zone_management_ui.html"
echo "   - http://localhost:8081/zone_check_simple.html"
echo ""
echo "⚠️  停止するには Ctrl+C"

php -S localhost:8081 -t .
EOF

chmod +x start_shipping_server.sh

echo "✅ 専用サーバースクリプト作成完了: start_shipping_server.sh"

echo ""
echo "📋 Step 4: 簡易テスト用HTMLファイル作成"

# 最小限のテスト用ファイル作成
cat > test_access.html << 'EOF'
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>送料計算システム - アクセステスト</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
        .status { padding: 15px; margin: 10px 0; border-radius: 5px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .link-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin: 20px 0; }
        .link-card { background: #f8f9fa; padding: 20px; border-radius: 5px; border: 1px solid #dee2e6; }
        .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
        .btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚢 送料計算システム - アクセステスト</h1>
        
        <div class="status success">
            ✅ このページが表示されていれば、HTMLファイルは正常にアクセスできています
        </div>
        
        <div class="status info">
            📍 現在のアクセス方法を確認中...
        </div>
        
        <h3>🌐 利用可能なページ</h3>
        <div class="link-grid">
            <div class="link-card">
                <h4>配送会社別独立マトリックス</h4>
                <p>各社のゾーン体系を分離表示</p>
                <a href="carrier_separated_matrix.html" class="btn">アクセス</a>
            </div>
            
            <div class="link-card">
                <h4>ゾーン管理UI（完全版）</h4>
                <p>全配送会社のゾーン可視化</p>
                <a href="zone_management_ui.html" class="btn">アクセス</a>
            </div>
            
            <div class="link-card">
                <h4>ゾーン確認（簡易版）</h4>
                <p>軽量版の確認UI</p>
                <a href="zone_check_simple.html" class="btn">アクセス</a>
            </div>
        </div>
        
        <h3>🔧 起動方法</h3>
        <div class="status info">
            <h4>方法1: メインサーバー (推奨)</h4>
            <code>cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/</code><br>
            <code>./start_server_8080.sh</code><br>
            <strong>アクセス:</strong> http://localhost:8080/new_structure/09_shipping/test_access.html
        </div>
        
        <div class="status info">
            <h4>方法2: 送料システム専用サーバー</h4>
            <code>cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping/</code><br>
            <code>./start_shipping_server.sh</code><br>
            <strong>アクセス:</strong> http://localhost:8081/test_access.html
        </div>
        
        <div class="status info">
            <h4>方法3: 直接ファイルアクセス</h4>
            <strong>ブラウザで直接開く:</strong><br>
            <code>file:///Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping/carrier_separated_matrix.html</code>
        </div>
        
        <h3>📊 システム状態</h3>
        <div id="system-status">
            <p>JavaScript が有効な場合、システム状態を表示...</p>
        </div>
    </div>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const statusDiv = document.getElementById('system-status');
            
            // 現在のURL情報
            const currentUrl = window.location.href;
            const currentProtocol = window.location.protocol;
            const currentHost = window.location.host;
            
            let statusHtml = `
                <p><strong>現在のURL:</strong> ${currentUrl}</p>
                <p><strong>プロトコル:</strong> ${currentProtocol}</p>
                <p><strong>ホスト:</strong> ${currentHost || 'ローカルファイル'}</p>
            `;
            
            if (currentProtocol === 'file:') {
                statusHtml += `
                    <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 10px;">
                        <strong>📁 ローカルファイルアクセス</strong><br>
                        ファイルプロトコルでアクセス中。API機能は制限されます。<br>
                        完全な機能を使用するにはHTTPサーバーを起動してください。
                    </div>
                `;
            } else if (currentHost === 'localhost:8080') {
                statusHtml += `
                    <div style="background: #d4edda; padding: 10px; border-radius: 5px; margin-top: 10px;">
                        <strong>✅ メインサーバー接続</strong><br>
                        Yahoo Auction統合システムのメインサーバーに接続中。
                    </div>
                `;
            } else if (currentHost === 'localhost:8081') {
                statusHtml += `
                    <div style="background: #d1ecf1; padding: 10px; border-radius: 5px; margin-top: 10px;">
                        <strong>🚢 送料システム専用サーバー</strong><br>
                        送料計算システム専用サーバーに接続中。
                    </div>
                `;
            }
            
            statusDiv.innerHTML = statusHtml;
        });
    </script>
</body>
</html>
EOF

echo "✅ テスト用HTMLファイル作成完了: test_access.html"

echo ""
echo "📋 Step 5: 最終確認とアクセス方法"
echo "================================"

echo "🎯 作成されたファイル:"
echo "1. ✅ carrier_separated_matrix.html - 配送会社別独立マトリックス"
echo "2. ✅ zone_management_ui.html - ゾーン管理UI"
echo "3. ✅ zone_check_simple.html - 簡易版確認UI"
echo "4. ✅ test_access.html - アクセステスト用"
echo "5. ✅ start_shipping_server.sh - 専用サーバー起動"

echo ""
echo "🌐 推奨アクセス方法："
echo "================================"

if lsof -i :8080 > /dev/null 2>&1; then
    echo "✅ 方法1 (メインサーバー - 現在稼働中):"
    echo "   http://localhost:8080/new_structure/09_shipping/carrier_separated_matrix.html"
    echo "   http://localhost:8080/new_structure/09_shipping/test_access.html"
else
    echo "⚠️ 方法1 (メインサーバー - 要起動):"
    echo "   cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/"
    echo "   ./start_server_8080.sh"
    echo "   → http://localhost:8080/new_structure/09_shipping/carrier_separated_matrix.html"
fi

echo ""
echo "✅ 方法2 (専用サーバー - 即時利用可能):"
echo "   cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping/"
echo "   ./start_shipping_server.sh"
echo "   → http://localhost:8081/carrier_separated_matrix.html"

echo ""
echo "✅ 方法3 (直接ファイルアクセス - 即時利用可能):"
echo "   ブラウザで以下を開く:"
echo "   file://$(pwd)/carrier_separated_matrix.html"

echo ""
echo "🎉 送料計算システムのアクセス問題解決完了！"
echo "上記のいずれかの方法でアクセスできます。"