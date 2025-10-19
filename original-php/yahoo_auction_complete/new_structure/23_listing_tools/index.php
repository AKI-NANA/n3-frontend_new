<?php
header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>23. 出品ツール拡張システム</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #fd79a8, #fdcb6e); min-height: 100vh; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .header { text-align: center; color: white; margin-bottom: 2rem; }
        .header h1 { font-size: 2.5rem; margin-bottom: 1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .content { background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 8px 16px rgba(0,0,0,0.1); }
        .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
        .feature-card { background: #f8fafc; border-radius: 12px; padding: 1.5rem; border: 2px solid #e2e8f0; transition: all 0.3s ease; }
        .feature-card:hover { border-color: #fd79a8; transform: translateY(-4px); }
        .feature-icon { width: 3rem; height: 3rem; background: linear-gradient(135deg, #fd79a8, #fdcb6e); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; margin-bottom: 1rem; }
        .status-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: #fef9c3; color: #92400e; }
        .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 1rem 2rem; background: linear-gradient(135deg, #fd79a8, #fdcb6e); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: all 0.3s ease; border: none; cursor: pointer; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
        .navigation { display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; flex-wrap: wrap; }
        .tool-demo { background: #fef7e7; border: 2px solid #fd79a8; border-radius: 12px; padding: 1.5rem; margin: 2rem 0; }
        .template-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
        .template-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; text-align: center; cursor: pointer; transition: all 0.3s ease; }
        .template-card:hover { border-color: #fd79a8; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .progress-bar { background: #e2e8f0; border-radius: 10px; height: 20px; margin: 1rem 0; overflow: hidden; }
        .progress-fill { background: linear-gradient(135deg, #fd79a8, #fdcb6e); height: 100%; transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-list-alt"></i> 出品ツール拡張システム</h1>
            <p>高度出品管理・テンプレート・自動最適化</p>
        </div>

        <div class="content">
            <div class="status-badge">
                <i class="fas fa-star"></i> NEW - 出品効率化
            </div>

            <h2 style="margin: 1.5rem 0;">🚀 高度出品管理システム</h2>
            <p style="line-height: 1.6; margin-bottom: 2rem;">
                複数プラットフォーム対応の統合出品システムです。
                テンプレート管理、自動最適化、バッチ処理により出品作業を劇的に効率化します。
            </p>

            <div class="tool-demo">
                <h3 style="margin-bottom: 1rem;">📝 出品テンプレート</h3>
                <div class="template-grid">
                    <div class="template-card" onclick="selectTemplate('standard')">
                        <i class="fas fa-file-alt" style="font-size: 2rem; color: #fd79a8; margin-bottom: 0.5rem;"></i>
                        <h4>スタンダード</h4>
                        <p>基本的な商品出品テンプレート</p>
                    </div>
                    <div class="template-card" onclick="selectTemplate('premium')">
                        <i class="fas fa-crown" style="font-size: 2rem; color: #fdcb6e; margin-bottom: 0.5rem;"></i>
                        <h4>プレミアム</h4>
                        <p>高品質商品向けテンプレート</p>
                    </div>
                    <div class="template-card" onclick="selectTemplate('auction')">
                        <i class="fas fa-gavel" style="font-size: 2rem; color: #fd79a8; margin-bottom: 0.5rem;"></i>
                        <h4>オークション</h4>
                        <p>オークション形式専用テンプレート</p>
                    </div>
                    <div class="template-card" onclick="selectTemplate('bulk')">
                        <i class="fas fa-layer-group" style="font-size: 2rem; color: #fdcb6e; margin-bottom: 0.5rem;"></i>
                        <h4>一括出品</h4>
                        <p>大量商品一括処理テンプレート</p>
                    </div>
                </div>
                
                <div id="templateDemo" style="display: none; margin-top: 1rem; padding: 1rem; background: white; border-radius: 8px;">
                    <h4>テンプレートプレビュー</h4>
                    <div id="templateContent"></div>
                    <button class="btn" onclick="startListingProcess()" style="margin-top: 1rem;">
                        <i class="fas fa-rocket"></i> このテンプレートで出品開始
                    </button>
                </div>

                <div id="listingProgress" style="display: none; margin-top: 1rem;">
                    <h4>📊 出品処理進行状況</h4>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill" style="width: 0%;"></div>
                    </div>
                    <div id="progressText">準備中...</div>
                </div>
            </div>

            <div class="feature-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-magic"></i>
                    </div>
                    <h3>自動最適化</h3>
                    <p>AI駆動による価格設定、キーワード最適化、出品タイミング調整</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-templates"></i>
                    </div>
                    <h3>テンプレートシステム</h3>
                    <p>カテゴリー別カスタマイズ可能なテンプレートライブラリ</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-bolt"></i>
                    </div>
                    <h3>高速バッチ処理</h3>
                    <p>数千点の商品を一括処理する高速出品システム</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-shield-check"></i>
                    </div>
                    <h3>品質管理</h3>
                    <p>出品前自動チェック、エラー検出、品質保証システム</p>
                </div>
            </div>

            <div class="navigation">
                <a href="../08_listing/" class="btn">
                    <i class="fas fa-arrow-left"></i> 基本出品システム
                </a>
                <a href="../../yahoo_auction_complete_24tools.html" class="btn">
                    <i class="fas fa-home"></i> メインシステム
                </a>
            </div>
        </div>
    </div>

    <script>
        const templates = {
            standard: {
                name: "スタンダードテンプレート",
                description: "基本的な商品出品に最適",
                features: ["基本情報入力", "標準画像レイアウト", "シンプルな説明文"],
                processing_time: "2-3分/商品"
            },
            premium: {
                name: "プレミアムテンプレート", 
                description: "高品質商品向けの詳細テンプレート",
                features: ["詳細スペック表示", "高解像度画像対応", "リッチテキスト説明", "SEO最適化"],
                processing_time: "3-5分/商品"
            },
            auction: {
                name: "オークションテンプレート",
                description: "オークション形式に特化",
                features: ["開始価格設定", "即決価格オプション", "オークション期間設定", "入札履歴表示"],
                processing_time: "1-2分/商品"
            },
            bulk: {
                name: "一括出品テンプレート",
                description: "大量商品の効率的な一括処理",
                features: ["CSV一括アップロード", "バッチ処理", "エラー自動修正", "進行状況監視"],
                processing_time: "数秒/商品"
            }
        };

        function selectTemplate(templateId) {
            const template = templates[templateId];
            if (template) {
                document.getElementById('templateContent').innerHTML = `
                    <h5>${template.name}</h5>
                    <p style="margin: 0.5rem 0; color: #6b7280;">${template.description}</p>
                    <div style="margin: 1rem 0;">
                        <strong>機能:</strong>
                        <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                            ${template.features.map(feature => `<li>${feature}</li>`).join('')}
                        </ul>
                    </div>
                    <div style="color: #059669; font-weight: 600;">
                        <i class="fas fa-clock"></i> 処理時間: ${template.processing_time}
                    </div>
                `;
                document.getElementById('templateDemo').style.display = 'block';
                
                // 他のテンプレートカードの選択状態をリセット
                document.querySelectorAll('.template-card').forEach(card => {
                    card.style.borderColor = '#e2e8f0';
                    card.style.transform = 'none';
                });
                
                // 選択されたカードをハイライト
                event.target.closest('.template-card').style.borderColor = '#fd79a8';
                event.target.closest('.template-card').style.transform = 'scale(1.05)';
            }
        }

        function startListingProcess() {
            document.getElementById('listingProgress').style.display = 'block';
            
            let progress = 0;
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            
            const steps = [
                "テンプレート検証中...",
                "商品データ処理中...",
                "画像最適化中...",
                "価格設定チェック中...",
                "SEO最適化実行中...",
                "出品データ生成中...",
                "出品完了！"
            ];
            
            let currentStep = 0;
            
            const updateProgress = () => {
                if (currentStep < steps.length) {
                    progress = Math.min(100, (currentStep + 1) * (100 / steps.length));
                    progressFill.style.width = progress + '%';
                    progressText.textContent = steps[currentStep];
                    currentStep++;
                    
                    if (currentStep < steps.length) {
                        setTimeout(updateProgress, 800);
                    } else {
                        progressText.innerHTML = `
                            <div style="color: #059669; font-weight: 600;">
                                <i class="fas fa-check-circle"></i> 出品処理が完了しました！
                            </div>
                            <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #6b7280;">
                                処理された商品数: ${Math.floor(Math.random() * 50 + 10)}点
                            </div>
                        `;
                    }
                }
            };
            
            setTimeout(updateProgress, 500);
        }
    </script>
</body>
</html>