                        destination: destination
                    })
                });

                const result = await response.json();

                if (result.success) {
                    currentCalculationData = result.data;
                    displayCalculationResults(result.data);
                } else {
                    showError(result.message);
                }

            } catch (error) {
                console.error('計算エラー:', error);
                showError('計算処理中にエラーが発生しました。');
            } finally {
                hideLoading();
            }
        }

        // 計算結果表示
        function displayCalculationResults(data) {
            // サマリー表示
            const summaryHtml = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-md);">' +
                    '<div>' +
                        '<strong>実重量:</strong><br>' +
                        data.original_weight + ' kg' +
                    '</div>' +
                    '<div>' +
                        '<strong>梱包後重量:</strong><br>' +
                        data.packed_weight.toFixed(2) + ' kg' +
                    '</div>' +
                    '<div>' +
                        '<strong>容積重量:</strong><br>' +
                        data.volumetric_weight.toFixed(2) + ' kg' +
                    '</div>' +
                    '<div>' +
                        '<strong>課金重量:</strong><br>' +
                        data.chargeable_weight.toFixed(2) + ' kg' +
                    '</div>' +
                    '<div>' +
                        '<strong>配送先:</strong><br>' +
                        data.destination +
                    '</div>' +
                    '<div>' +
                        '<strong>データソース:</strong><br>' +
                        (data.database_used ? 'データベース + モック' : 'モックのみ') +
                    '</div>' +
                '</div>';
            document.getElementById('calculationSummary').innerHTML = summaryHtml;

            // 配送オプション表示
            const optionsHtml = data.shipping_options.map(function(option) {
                const sourceClass = (option.data_source === 'mock') ? 'mock-source' : 'database-source';
                const badgeClass = (option.data_source === 'mock') ? 'badge-mock' : 'badge-database';
                const badgeText = (option.data_source === 'mock') ? 'モック' : 'DB';
                
                return '<div class="shipping-option ' + sourceClass + '">' +
                    '<div class="data-source-badge ' + badgeClass + '">' + badgeText + '</div>' +
                    '<div class="option-header">' +
                        '<div class="option-name">' + option.service_name + '</div>' +
                        '<div class="option-cost">¥' + option.cost_jpy.toLocaleString() + '</div>' +
                    '</div>' +
                    '<div class="option-details">' +
                        '<div class="option-detail">' +
                            '<i class="fas fa-clock"></i>' +
                            option.delivery_days + '日' +
                        '</div>' +
                        '<div class="option-detail">' +
                            '<i class="fas fa-dollar-sign"></i>' +
                            '

        // マトリックス表示
        async function showMatrixModal() {
            const destination = document.getElementById('shippingCountry').value;
            if (!destination) {
                showError('配送先国を選択してからマトリックスを表示してください。');
                return;
            }

            document.getElementById('matrixModal').style.display = 'block';
            document.getElementById('matrixContent').innerHTML = 'マトリックスを生成中...';

            try {
                const response = await fetch('enhanced_calculation_php_fixed.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'get_shipping_matrix',
                        destination: destination,
                        max_weight: 30.0
                    })
                });

                const result = await response.json();

                if (result.success) {
                    displayMatrix(result.data);
                } else {
                    document.getElementById('matrixContent').innerHTML = 'エラー: ' + result.message;
                }

            } catch (error) {
                console.error('マトリックス生成エラー:', error);
                document.getElementById('matrixContent').innerHTML = 'マトリックス生成中にエラーが発生しました。';
            }
        }

        // マトリックス表示
        function displayMatrix(data) {
            const headers = ['重量', 'サービス', '料金（円）', '配送日数', 'データソース'];
            
            let tableHtml = '<table style="width: 100%; border-collapse: collapse;">' +
                    '<thead>' +
                        '<tr>' +
                            headers.map(function(h) {
                                return '<th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">' + h + '</th>';
                            }).join('') +
                        '</tr>' +
                    '</thead>' +
                    '<tbody>';

            // 各重量でのサービス別料金を表示
            data.weight_steps.forEach(function(weight) {
                const options = data.matrix[weight] || [];
                
                if (options.length === 0) {
                    tableHtml += '<tr>' +
                        '<td style="border: 1px solid var(--border); padding: var(--space-sm); font-weight: 600;">' + weight + 'kg</td>' +
                        '<td colspan="4" style="border: 1px solid var(--border); padding: var(--space-sm); text-align: center; color: #64748b;">データなし</td>' +
                    '</tr>';
                } else {
                    options.forEach(function(option, index) {
                        tableHtml += '<tr>';
                        if (index === 0) {
                            tableHtml += '<td rowspan="' + options.length + '" style="border: 1px solid var(--border); padding: var(--space-sm); font-weight: 600; vertical-align: top;">' + weight + 'kg</td>';
                        }
                        tableHtml += '<td style="border: 1px solid var(--border); padding: var(--space-sm);">' + option.service_name + '</td>';
                        tableHtml += '<td style="border: 1px solid var(--border); padding: var(--space-sm); text-align: center;">¥' + option.cost_jpy.toLocaleString() + '</td>';
                        tableHtml += '<td style="border: 1px solid var(--border); padding: var(--space-sm); text-align: center;">' + option.delivery_days + '日</td>';
                        const sourceStyle = option.data_source === 'mock' ? 'color: #f59e0b;' : 'color: #10b981;';
                        tableHtml += '<td style="border: 1px solid var(--border); padding: var(--space-sm); text-align: center; ' + sourceStyle + '">' + (option.data_source === 'mock' ? 'モック' : 'DB') + '</td>';
                        tableHtml += '</tr>';
                    });
                }
            });

            tableHtml += '</tbody></table>';
            
            document.getElementById('matrixContent').innerHTML = 
                '<h4>配送先: ' + data.destination + ' ' + (data.database_used ? '(データベース + モック)' : '(モックのみ)') + '</h4>' +
                tableHtml;
        }

        // 履歴表示
        async function showHistoryModal() {
            document.getElementById('historyModal').style.display = 'block';
            document.getElementById('historyContent').innerHTML = '履歴を読み込み中...';

            try {
                const response = await fetch('enhanced_calculation_php_fixed.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'get_calculation_history'
                    })
                });

                const result = await response.json();

                if (result.success) {
                    displayHistory(result.data.history, result.data.source);
                } else {
                    document.getElementById('historyContent').innerHTML = 'エラー: ' + result.message;
                }

            } catch (error) {
                console.error('履歴取得エラー:', error);
                document.getElementById('historyContent').innerHTML = '履歴取得中にエラーが発生しました。';
            }
        }

        // 履歴表示
        function displayHistory(history, source) {
            if (history.length === 0) {
                document.getElementById('historyContent').innerHTML = '履歴はありません。';
                return;
            }

            const sourceText = source === 'database' ? 'データベースから取得' : 'サンプルデータ';

            const historyHtml = '<p><strong>データソース:</strong> ' + sourceText + '</p>' +
                    '<table style="width: 100%; border-collapse: collapse; margin-top: 15px;">' +
                    '<thead>' +
                        '<tr>' +
                            '<th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">日時</th>' +
                            '<th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">配送先</th>' +
                            '<th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">重量</th>' +
                            '<th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">サービス</th>' +
                            '<th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">料金</th>' +
                        '</tr>' +
                    '</thead>' +
                    '<tbody>' +
                        history.map(function(item) {
                            const dateField = item.calculated_at || item.date;
                            const weightField = item.weight_kg || item.weight;
                            const serviceField = item.service_name || item.service;
                            const costField = item.cost_jpy || item.cost;
                            
                            return '<tr>' +
                                '<td style="border: 1px solid var(--border); padding: var(--space-sm);">' + dateField + '</td>' +
                                '<td style="border: 1px solid var(--border); padding: var(--space-sm);">' + item.destination + '</td>' +
                                '<td style="border: 1px solid var(--border); padding: var(--space-sm);">' + weightField + 'kg</td>' +
                                '<td style="border: 1px solid var(--border); padding: var(--space-sm);">' + serviceField + '</td>' +
                                '<td style="border: 1px solid var(--border); padding: var(--space-sm);">¥' + costField.toLocaleString() + '</td>' +
                            '</tr>';
                        }).join('') +
                    '</tbody>' +
                '</table>';
            
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
                    headers: {
                        'Content-Type': 'application/json',
                    },
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

        // データベースデータ表示
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

            let html = '<h4>データベース料金データ（最大5００件）</h4>';
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
                
                group.rates.slice(0, 10).forEach(function(rate) { // 最大10件表示
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
</html> + option.cost_usd.toFixed(2) +
                        '</div>' +
                        '<div class="option-detail">' +
                            '<i class="fas fa-search"></i>' +
                            (option.tracking ? '追跡可能' : '追跡なし') +
                        '</div>' +
                        '<div class="option-detail">' +
                            '<i class="fas fa-shield-alt"></i>' +
                            (option.insurance ? '保険付き' : '保険なし') +
                        '</div>' +
                        '<div class="option-detail">' +
                            '<i class="fas fa-tag"></i>' +
                            option.type +
                        '</div>' +
                        (option.weight_range ? 
                            '<div class="option-detail">' +
                                '<i class="fas fa-weight"></i>' +
                                option.weight_range +
                            '</div>' : ''
                        ) +
                    '</div>' +
                '</div>';
            }).join('');
            document.getElementById('candidatesList').innerHTML = optionsHtml;

            // 推奨事項表示
            const recommendationsHtml = '<div class="recommendations">' +
                data.recommendations.map(function(rec) {
                    return '<div class="recommendation">' +
                        '<div class="recommendation-title">' + rec.title + '</div>' +
                        '<div class="recommendation-message">' + rec.message + '</div>' +
                    '</div>';
                }).join('') +
            '</div>';
            document.getElementById('recommendationsContainer').innerHTML = recommendationsHtml;

            // 結果エリア表示
            document.getElementById('candidatesContainer').style.display = 'block';
            document.getElementById('candidatesContainer').scrollIntoView({ behavior: 'smooth' });
        }

        // マトリックス表示
        async function showMatrixModal() {
            const destination = document.getElementById('shippingCountry').value;
            if (!destination) {
                showError('配送先国を選択してからマトリックスを表示してください。');
                return;
            }

            document.getElementById('matrixModal').style.display = 'block';
            document.getElementById('matrixContent').innerHTML = 'マトリックスを生成中...';

            try {
                const response = await fetch('enhanced_calculation_php_fixed.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'get_shipping_matrix',
                        destination: destination,
                        max_weight: 30.0
                    })
                });

                const result = await response.json();

                if (result.success) {
                    displayMatrix(result.data);
                } else {
                    document.getElementById('matrixContent').innerHTML = 'エラー: ' + result.message;
                }

            } catch (error) {
                console.error('マトリックス生成エラー:', error);
                document.getElementById('matrixContent').innerHTML = 'マトリックス生成中にエラーが発生しました。';
            }
        }

        // マトリックス表示
        function displayMatrix(data) {
            const headers = ['重量', 'サービス', '料金（円）', '配送日数', 'データソース'];
            
            let tableHtml = `<table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            ${headers.map(function(h) {
                                return `<th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">${h}</th>`;
                            }).join('')}
                        </tr>
                    </thead>
                    <tbody>`;

            // 各重量でのサービス別料金を表示
            data.weight_steps.forEach(function(weight) {
                const options = data.matrix[weight] || [];
                
                if (options.length === 0) {
                    tableHtml += `<tr>
                        <td style="border: 1px solid var(--border); padding: var(--space-sm); font-weight: 600;">${weight}kg</td>
                        <td colspan="4" style="border: 1px solid var(--border); padding: var(--space-sm); text-align: center; color: #64748b;">データなし</td>
                    </tr>`;
                } else {
                    options.forEach(function(option, index) {
                        tableHtml += '<tr>';
                        if (index === 0) {
                            tableHtml += `<td rowspan="${options.length}" style="border: 1px solid var(--border); padding: var(--space-sm); font-weight: 600; vertical-align: top;">${weight}kg</td>`;
                        }
                        tableHtml += `<td style="border: 1px solid var(--border); padding: var(--space-sm);">${option.service_name}</td>`;
                        tableHtml += `<td style="border: 1px solid var(--border); padding: var(--space-sm); text-align: center;">¥${option.cost_jpy.toLocaleString()}</td>`;
                        tableHtml += `<td style="border: 1px solid var(--border); padding: var(--space-sm); text-align: center;">${option.delivery_days}日</td>`;
                        const sourceStyle = option.data_source === 'mock' ? 'color: #f59e0b;' : 'color: #10b981;';
                        tableHtml += `<td style="border: 1px solid var(--border); padding: var(--space-sm); text-align: center; ${sourceStyle}">${option.data_source === 'mock' ? 'モック' : 'DB'}</td>`;
                        tableHtml += '</tr>';
                    });
                }
            });

            tableHtml += '</tbody></table>';
            
            document.getElementById('matrixContent').innerHTML = 
                `<h4>配送先: ${data.destination} ${data.database_used ? '(データベース + モック)' : '(モックのみ)'}</h4>` +
                tableHtml;
        }

        // 履歴表示
        async function showHistoryModal() {
            document.getElementById('historyModal').style.display = 'block';
            document.getElementById('historyContent').innerHTML = '履歴を読み込み中...';

            try {
                const response = await fetch('enhanced_calculation_php_fixed.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'get_calculation_history'
                    })
                });

                const result = await response.json();

                if (result.success) {
                    displayHistory(result.data.history, result.data.source);
                } else {
                    document.getElementById('historyContent').innerHTML = 'エラー: ' + result.message;
                }

            } catch (error) {
                console.error('履歴取得エラー:', error);
                document.getElementById('historyContent').innerHTML = '履歴取得中にエラーが発生しました。';
            }
        }

        // 履歴表示
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
                    headers: {
                        'Content-Type': 'application/json',
                    },
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

        // データベースデータ表示
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

            let html = '<h4>データベース料金データ（最大5００件）</h4>';
            html += `<p><strong>総件数:</strong> ${data.count}件</p>`;
            
            Object.keys(groupedData).forEach(function(key) {
                const group = groupedData[key];
                html += `<div style="margin: 20px 0; padding: 15px; border: 1px solid var(--border); border-radius: var(--radius-md);">`;
                html += `<h5>${group.company} - ${group.country} (${group.service})</h5>`;
                html += `<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">`;
                html += `<thead><tr>`;
                html += `<th style="border: 1px solid var(--border); padding: 5px; background: var(--bg-tertiary);">重量範囲</th>`;
                html += `<th style="border: 1px solid var(--border); padding: 5px; background: var(--bg-tertiary);">料金</th>`;
                html += `<th style="border: 1px solid var(--border); padding: 5px; background: var(--bg-tertiary);">ゾーン</th>`;
                html += `<th style="border: 1px solid var(--border); padding: 5px; background: var(--bg-tertiary);">データソース</th>`;
                html += `</tr></thead><tbody>`;
                
                group.rates.slice(0, 10).forEach(function(rate) { // 最大10件表示
                    html += `<tr>`;
                    html += `<td style="border: 1px solid var(--border); padding: 5px;">${rate.weight_from_g}g - ${rate.weight_to_g}g</td>`;
                    html += `<td style="border: 1px solid var(--border); padding: 5px;">¥${rate.price_jpy.toLocaleString()}</td>`;
                    html += `<td style="border: 1px solid var(--border); padding: 5px;">${rate.zone_code || '-'}</td>`;
                    html += `<td style="border: 1px solid var(--border); padding: 5px;">${rate.data_source || 'database'}</td>`;
                    html += `</tr>`;
                });
                
                if (group.rates.length > 10) {
                    html += `<tr><td colspan="4" style="border: 1px solid var(--border); padding: 5px; text-align: center; color: var(--text-muted);">...他${group.rates.length - 10}件</td></tr>`;
                }
                
                html += `</tbody></table>`;
                html += `</div>`;
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