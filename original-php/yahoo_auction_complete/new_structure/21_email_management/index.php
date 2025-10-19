<?php
header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>21. メール管理システム</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #6c5ce7, #a29bfe); min-height: 100vh; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .header { text-align: center; color: white; margin-bottom: 2rem; }
        .header h1 { font-size: 2.5rem; margin-bottom: 1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .content { background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 8px 16px rgba(0,0,0,0.1); }
        .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
        .feature-card { background: #f8fafc; border-radius: 12px; padding: 1.5rem; border: 2px solid #e2e8f0; transition: all 0.3s ease; }
        .feature-card:hover { border-color: #6c5ce7; transform: translateY(-4px); }
        .feature-icon { width: 3rem; height: 3rem; background: linear-gradient(135deg, #6c5ce7, #a29bfe); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; margin-bottom: 1rem; }
        .status-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: #fef9c3; color: #92400e; }
        .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 1rem 2rem; background: linear-gradient(135deg, #6c5ce7, #a29bfe); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.3s ease; border: none; cursor: pointer; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
        .navigation { display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; flex-wrap: wrap; }
        .email-demo { background: #f0f4ff; border: 2px solid #6c5ce7; border-radius: 12px; padding: 1.5rem; margin: 2rem 0; }
        .template-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin: 1rem 0; }
        .template-item { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; cursor: pointer; transition: all 0.3s ease; }
        .template-item:hover { border-color: #6c5ce7; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-envelope"></i> メール管理システム</h1>
            <p>顧客メール自動化・テンプレート管理・応答システム</p>
        </div>

        <div class="content">
            <div class="status-badge">
                <i class="fas fa-star"></i> NEW - コミュニケーション自動化
            </div>

            <h2 style="margin: 1.5rem 0;">📧 メール自動化システム</h2>
            <p style="line-height: 1.6; margin-bottom: 2rem;">
                eBay、Amazon、Shopeeなど複数プラットフォームの顧客とのメールコミュニケーションを自動化します。
                テンプレート管理、自動応答、顧客満足度向上を実現するシステムです。
            </p>

            <div class="email-demo">
                <h3 style="margin-bottom: 1rem;">📋 メールテンプレート</h3>
                <div class="template-list">
                    <div class="template-item" onclick="selectTemplate('welcome')">
                        <h4>🎉 ウェルカムメール</h4>
                        <p>新規顧客向けの歓迎メッセージ</p>
                    </div>
                    <div class="template-item" onclick="selectTemplate('shipping')">
                        <h4>📦 発送通知</h4>
                        <p>商品発送時の自動通知メール</p>
                    </div>
                    <div class="template-item" onclick="selectTemplate('feedback')">
                        <h4>⭐ フィードバック依頼</h4>
                        <p>取引完了後の評価依頼メール</p>
                    </div>
                    <div class="template-item" onclick="selectTemplate('followup')">
                        <h4>🔄 フォローアップ</h4>
                        <p>アフターサービスメール</p>
                    </div>
                </div>
                <div id="templatePreview" style="margin-top: 1rem; padding: 1rem; background: #f9fafb; border-radius: 6px; display: none;">
                    <h4>プレビュー</h4>
                    <div id="templateContent"></div>
                </div>
            </div>

            <div class="feature-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <h3>自動応答</h3>
                    <p>AI駆動の自動メール応答システムで24時間顧客対応</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-template"></i>
                    </div>
                    <h3>テンプレート管理</h3>
                    <p>カスタマイズ可能なメールテンプレートライブラリ</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <h3>顧客セグメント</h3>
                    <p>顧客属性に応じたパーソナライズメール配信</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <h3>効果測定</h3>
                    <p>開封率、クリック率、コンバージョン率の詳細分析</p>
                </div>
            </div>

            <div class="navigation">
                <a href="../../yahoo_auction_complete_24tools.html" class="btn">
                    <i class="fas fa-home"></i> メインシステム
                </a>
            </div>
        </div>
    </div>

    <script>
        const templates = {
            welcome: {
                title: "ウェルカムメール",
                content: `件名: ご購入ありがとうございます！

Dear {customer_name}様

この度は弊店でのお買い物ありがとうございました。
ご注文商品: {product_name}

発送準備が整い次第、追跡番号をお送りいたします。
何かご不明な点がございましたら、お気軽にお問い合わせください。

今後ともよろしくお願いいたします。`
            },
            shipping: {
                title: "発送通知メール",
                content: `件名: 【発送完了】ご注文商品を発送いたしました

Dear {customer_name}様

ご注文いただいた商品を発送いたしました。

追跡番号: {tracking_number}
配送業者: {carrier}
予定到着日: {estimated_delivery}

配送状況は上記追跡番号でご確認いただけます。`
            },
            feedback: {
                title: "フィードバック依頼メール", 
                content: `件名: お取引の評価をお願いします

Dear {customer_name}様

商品はお手元に届きましたでしょうか？
お時間のある時に、お取引の評価をお願いいたします。

⭐⭐⭐⭐⭐ 5つ星評価をいただけると嬉しいです！

今後ともよろしくお願いいたします。`
            },
            followup: {
                title: "フォローアップメール",
                content: `件名: 商品はいかがでしたか？

Dear {customer_name}様

先日ご購入いただいた{product_name}はいかがでしたでしょうか？

ご不明な点やお困りのことがございましたら、
いつでもお気軽にお問い合わせください。

また機会がございましたら、ぜひご利用ください。`
            }
        };

        function selectTemplate(templateId) {
            const template = templates[templateId];
            if (template) {
                document.getElementById('templateContent').innerHTML = `
                    <strong>${template.title}</strong><br><br>
                    <pre style="white-space: pre-wrap; font-family: inherit;">${template.content}</pre>
                `;
                document.getElementById('templatePreview').style.display = 'block';
            }
        }
    </script>
</body>
</html>