                    document.getElementById('historyContent').innerHTML = 'エラー: ' + result.message;
                }
            } catch (error) {
                console.error('履歴取得エラー:', error);
                document.getElementById('historyContent').innerHTML = '履歴取得中にエラーが発生しました。';
            }
        }

        function displayHistory(history, source) {
            if (history.length === 0) {
                document.getElementById('historyContent').innerHTML = '履歴はありません。';
                return;
            }

            const sourceText = source === 'database' ? 'データベースから取得' : 'サンプルデータ';
            const historyHtml = `<p><strong>データソース:</strong> ${sourceText}</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">日時</th>
                            <th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">配送先</th>
                            <th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">重量</th>
                            <th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">サービス</th>
                            <th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">料金</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(function(item) {
                            const dateField = item.calculated_at || item.date;
                            const weightField = item.weight_kg || item.weight;
                            const serviceField = item.service_name || item.service;
                            const costField = item.cost_jpy || item.cost;
                            
                            return `<tr>
                                <td style="border: 1px solid var(--border); padding: var(--space-sm);">${dateField}</td>
                                <td style="border: 1px solid var(--border); padding: var(--space-sm);">${item.destination}</td>
                                <td style="border: 1px solid var(--border); padding: var(--space-sm);">${weightField}kg</td>
                                <td style="border: 1px solid var(--border); padding: var(--space-sm);">${serviceField}</td>
                                <td style="border: 1px solid var(--border); padding: var(--space-sm);">¥${costField.toLocaleString()}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>`;
            
            document.getElementById('historyContent').innerHTML = historyHtml;
        }

        // データベース直接アクセス表示
        async function showDatabaseModal() {
            if (!dbConnected) {
                showError('データベースに接続されていません。');
                return;
            }

            document.getElementById('databaseModal').style.display = 'block';
            document.getElementById('databaseContent').innerHTML = 'データベースデータを読み込み中...';

            try {
                const response = await fetch('enhanced_calculation_php_fixed.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'get_database_rates',
                        filters: {}
                    })
                });

                const result = await response.json();
                if (result.success) {
                    displayDatabaseData(result.data);
                } else {
                    document.getElementById('databaseContent').innerHTML = 'エラー: ' + result.message;
                }
            } catch (error) {
                console.error('データベースデータ取得エラー:', error);
                document.getElementById('databaseContent').innerHTML = 'データベースデータ取得中にエラーが発生しました。';
            }
        }

        function displayDatabaseData(data) {
            const rates = data.rates;
            
            if (rates.length === 0) {
                document.getElementById('databaseContent').innerHTML = 'データベースにデータがありません。';
                return;
            }

            // 会社別、国別にグループ化
            const groupedData = {};
            rates.forEach(function(rate) {
                const key = rate.company_code + '_' + rate.country_code;
                if (!groupedData[key]) {
                    groupedData[key] = {
                        company: rate.company_code,
                        country: rate.country_code,
                        service: rate.service_code,
                        rates: []
                    };
                }
                groupedData[key].rates.push(rate);
            });

            let html = '<h4>データベース料金データ（最大500件）</h4>';
            html += '<p><strong>総件数:</strong> ' + data.count + '件</p>';
            
            Object.keys(groupedData).forEach(function(key) {
                const group = groupedData[key];
                html += '<div style="margin: 20px 0; padding: 15px; border: 1px solid var(--border); border-radius: var(--radius-md);">';
                html += '<h5>' + group.company + ' - ' + group.country + ' (' + group.service + ')</h5>';
                html += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
                html += '<thead><tr>';
                html += '<th style="border: 1px solid var(--border); padding: 5px; background: var(--bg-tertiary);">重量範囲</th>';
                html += '<th style="border: 1px solid var(--border); padding: 5px; background: var(--bg-tertiary);">料金</th>';
                html += '<th style="border: 1px solid var(--border); padding: 5px; background: var(--bg-tertiary);">ゾーン</th>';
                html += '<th style="border: 1px solid var(--border); padding: 5px; background: var(--bg-tertiary);">データソース</th>';
                html += '</tr></thead><tbody>';
                
                group.rates.slice(0, 10).forEach(function(rate) {
                    html += '<tr>';
                    html += '<td style="border: 1px solid var(--border); padding: 5px;">' + rate.weight_from_g + 'g - ' + rate.weight_to_g + 'g</td>';
                    html += '<td style="border: 1px solid var(--border); padding: 5px;">¥' + rate.price_jpy.toLocaleString() + '</td>';
                    html += '<td style="border: 1px solid var(--border); padding: 5px;">' + (rate.zone_code || '-') + '</td>';
                    html += '<td style="border: 1px solid var(--border); padding: 5px;">' + (rate.data_source || 'database') + '</td>';
                    html += '</tr>';
                });
                
                if (group.rates.length > 10) {
                    html += '<tr><td colspan="4" style="border: 1px solid var(--border); padding: 5px; text-align: center; color: var(--text-muted);">...他' + (group.rates.length - 10) + '件</td></tr>';
                }
                
                html += '</tbody></table>';
                html += '</div>';
            });
            
            document.getElementById('databaseContent').innerHTML = html;
        }

        // モーダルを閉じる
        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }

        // フォームクリア
        function clearCalculationForm() {
            document.getElementById('shippingWeight').value = '';
            document.getElementById('shippingLength').value = '';
            document.getElementById('shippingWidth').value = '';
            document.getElementById('shippingHeight').value = '';
            document.getElementById('shippingCountry').value = '';
            document.getElementById('candidatesContainer').style.display = 'none';
            hideError();
        }

        // ユーティリティ関数
        function showLoading() {
            const btn = document.getElementById('calculateBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 計算中...';
        }

        function hideLoading() {
            const btn = document.getElementById('calculateBtn');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-calculator"></i> 送料計算実行';
        }

        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            const errorText = document.getElementById('errorText');
            errorText.textContent = message;
            errorDiv.classList.add('show');
        }

        function hideError() {
            document.getElementById('errorMessage').classList.remove('show');
        }

        // モーダル外クリックで閉じる
        window.onclick = function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        }

        console.log('送料計算システム 完全修正版 JavaScript初期化完了');
    </script>
</body>
</html>