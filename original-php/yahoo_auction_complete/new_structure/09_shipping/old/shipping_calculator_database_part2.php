            
            document.getElementById('matrixContent').innerHTML = tableHtml;
        }

        // 履歴表示
        async function showHistoryModal() {
            document.getElementById('historyModal').style.display = 'block';
            document.getElementById('historyContent').innerHTML = '履歴を読み込み中...';

            try {
                const response = await fetch('shipping_calculator_database.php', {
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
                    displayHistory(result.data.history);
                } else {
                    document.getElementById('historyContent').innerHTML = `エラー: ${result.message}`;
                }

            } catch (error) {
                console.error('履歴取得エラー:', error);
                document.getElementById('historyContent').innerHTML = '履歴取得中にエラーが発生しました。';
            }
        }

        // 履歴表示
        function displayHistory(history) {
            if (history.length === 0) {
                document.getElementById('historyContent').innerHTML = '履歴はありません。';
                return;
            }

            const historyHtml = `
                <table style="width: 100%; border-collapse: collapse;">
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
                        ${history.map(item => `
                            <tr>
                                <td style="border: 1px solid var(--border); padding: var(--space-sm);">${item.date}</td>
                                <td style="border: 1px solid var(--border); padding: var(--space-sm);">${item.destination}</td>
                                <td style="border: 1px solid var(--border); padding: var(--space-sm);">${item.weight}kg</td>
                                <td style="border: 1px solid var(--border); padding: var(--space-sm);">${item.service}</td>
                                <td style="border: 1px solid var(--border); padding: var(--space-sm);">¥${item.cost.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            document.getElementById('historyContent').innerHTML = historyHtml;
        }

        // 配送業者管理表示
        async function showCarriersModal() {
            document.getElementById('carriersModal').style.display = 'block';
            document.getElementById('carriersContent').innerHTML = '配送業者データを読み込み中...';

            try {
                const response = await fetch('shipping_calculator_database.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'get_carriers'
                    })
                });

                const result = await response.json();

                if (result.success) {
                    displayCarriers(result.data);
                } else {
                    document.getElementById('carriersContent').innerHTML = `エラー: ${result.message}`;
                }

            } catch (error) {
                console.error('配送業者取得エラー:', error);
                document.getElementById('carriersContent').innerHTML = '配送業者データ取得中にエラーが発生しました。';
            }
        }

        // 配送業者表示
        function displayCarriers(carriers) {
            const carriersHtml = `
                <div style="margin-bottom: var(--space-lg);">
                    <h4>現在の配送業者</h4>
                    <table style="width: 100%; border-collapse: collapse; margin-top: var(--space-md);">
                        <thead>
                            <tr>
                                <th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">業者名</th>
                                <th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">コード</th>
                                <th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">サービス数</th>
                                <th style="border: 1px solid var(--border); padding: var(--space-sm); background: var(--bg-tertiary);">状態</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${carriers.map(carrier => `
                                <tr>
                                    <td style="border: 1px solid var(--border); padding: var(--space-sm);">${carrier.name}</td>
                                    <td style="border: 1px solid var(--border); padding: var(--space-sm);">${carrier.code}</td>
                                    <td style="border: 1px solid var(--border); padding: var(--space-sm);">${carrier.service_count}</td>
                                    <td style="border: 1px solid var(--border); padding: var(--space-sm);">
                                        <span style="background: ${carrier.status === 'active' ? '#10b981' : '#ef4444'}; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem;">
                                            ${carrier.status === 'active' ? 'アクティブ' : '無効'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div>
                    <h4>新しい配送業者を追加</h4>
                    <div style="background: var(--bg-tertiary); padding: var(--space-lg); border-radius: var(--radius-md); margin-top: var(--space-md);">
                        <p style="color: var(--text-muted); margin-bottom: var(--space-md);">
                            <i class="fas fa-info-circle"></i> 
                            新しい配送業者データを追加します。詳細な料金設定は後で行えます。
                        </p>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); margin-bottom: var(--space-md);">
                            <div>
                                <label style="display: block; margin-bottom: var(--space-sm); font-weight: 600;">業者名</label>
                                <input type="text" id="newCarrierName" placeholder="例: ヤマト運輸" class="form-input">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: var(--space-sm); font-weight: 600;">業者コード</label>
                                <input type="text" id="newCarrierCode" placeholder="例: YAMATO" class="form-input">
                            </div>
                        </div>
                        
                        <button class="btn btn-success" onclick="addNewCarrier()">
                            <i class="fas fa-plus"></i> 配送業者を追加
                        </button>
                    </div>
                </div>
            `;
            
            document.getElementById('carriersContent').innerHTML = carriersHtml;
        }

        // 新しい配送業者追加
        async function addNewCarrier() {
            const name = document.getElementById('newCarrierName').value.trim();
            const code = document.getElementById('newCarrierCode').value.trim().toUpperCase();

            if (!name || !code) {
                showError('業者名とコードを入力してください。');
                return;
            }

            try {
                const response = await fetch('shipping_calculator_database.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'add_carrier_data',
                        carrier_name: name,
                        carrier_code: code,
                        services: [] // 基本サービスのみ追加
                    })
                });

                const result = await response.json();

                if (result.success) {
                    showSuccess('配送業者を追加しました！');
                    showCarriersModal(); // 再読み込み
                    document.getElementById('newCarrierName').value = '';
                    document.getElementById('newCarrierCode').value = '';
                } else {
                    showError('追加エラー: ' + result.message);
                }

            } catch (error) {
                console.error('業者追加エラー:', error);
                showError('配送業者追加中にエラーが発生しました。');
            }
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
            hideMessages();
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
            errorDiv.style.display = 'flex';
            
            // 成功メッセージを隠す
            document.getElementById('successMessage').style.display = 'none';
        }

        function showSuccess(message) {
            const successDiv = document.getElementById('successMessage');
            const successText = document.getElementById('successText');
            successText.textContent = message;
            successDiv.style.display = 'flex';
            
            // エラーメッセージを隠す
            document.getElementById('errorMessage').style.display = 'none';
        }

        function hideMessages() {
            document.getElementById('errorMessage').style.display = 'none';
            document.getElementById('successMessage').style.display = 'none';
        }

        // モーダル外クリックで閉じる
        window.onclick = function(event) {
            if (event.target.classList.contains('modal') || event.target.style.position === 'fixed') {
                event.target.style.display = 'none';
            }
        }

        console.log('送料計算システム データベース対応版 JavaScript初期化完了');
    </script>
</body>
</html>