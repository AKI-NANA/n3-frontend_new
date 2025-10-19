                        <td class="price-cell">¥${price.toLocaleString()}</td>
                        <td>${days}日</td>
                        <td>${type}</td>
                        <td class="price-source">PHP モックデータ</td>
                    </tr>
                `;
            });
            
            // PHP処理情報を追加
            html += `
                <tr style="background: #fef3c7;">
                    <td colspan="5" style="text-align: center; font-size: 12px; color: #92400e; padding: 8px;">
                        ⚠️ モックデータ: PHP ${phpConfig.version} で生成 | 
                        サーバー時間: ${phpConfig.serverTime} | 
                        実際の料金は${currentSelection.company}にお問い合わせください
                    </td>
                </tr>
            `;
            
            matrixBody.innerHTML = html;
        }

        function getEMSFeatures() {
            return '追跡, 保険, 優先取扱, 30kg対応';
        }

        // PHP統合版ユーティリティ関数
        function logPHPInfo() {
            console.log('🔧 PHP統合情報:');
            console.log('- PHP Version:', phpConfig.version);
            console.log('- Database Status:', phpConfig.dbStatus);
            console.log('- Server Time:', phpConfig.serverTime);
            console.log('- API Endpoint:', API_BASE);
        }

        // 初期化時にPHP情報をログ出力
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
                logPHPInfo();
            }, 1000);
        });

        // エラーハンドリング強化
        window.addEventListener('error', function(e) {
            console.error('JavaScript Error in PHP Shipping System:', e.error);
        });

        // 開発用：デバッグ情報表示
        function showDebugInfo() {
            console.log('🐛 デバッグ情報:');
            console.log('Current Selection:', currentSelection);
            console.log('PHP Config:', phpConfig);
            console.log('Country Support:', countrySupport);
            console.log('Carrier Services:', carrierServices);
        }

        // グローバル関数として公開（開発用）
        window.debugShippingSystem = showDebugInfo;
    </script>
</body>
</html>
