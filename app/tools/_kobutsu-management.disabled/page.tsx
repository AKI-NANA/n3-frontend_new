'use client'

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>古物買取・在庫進捗管理システム</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f7fafc;
        }
        .container {
            max-width: 1200px;
        }
        .card {
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1);
        }
        .status-tag {
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        /* ステータスごとの色 */
        .status-0 { background-color: #fef3c7; color: #b45309; } /* 査定完了 */
        .status-1 { background-color: #bfdbfe; color: #1e40af; } /* 検品中 */
        .status-2 { background-color: #fecaca; color: #b91c1c; } /* 修理/清掃中 */
        .status-3 { background-color: #d1fae5; color: #065f46; } /* 出品準備完了 */
        .status-4 { background-color: #c7d2fe; color: #4338ca; } /* 発送完了 */
    </style>
</head>
<body>
    <div class="container mx-auto p-4 md:p-8">
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">古物買取・在庫進捗管理システム</h1>
            <p class="text-gray-600">買取後の**修理・清掃・出品準備**の進捗を管理します。古物商許可は必須です。</p>
        </header>

        <!-- 査定入力エリア (前回の機能) -->
        <div id="assessment-card" class="card bg-white p-6 mb-8 border border-blue-200">
            <h2 class="text-xl font-semibold mb-4 text-blue-700">買取査定シミュレーション</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <!-- 顧客情報 -->
                <div>
                    <label for="customer-name" class="block text-sm font-medium text-gray-700 mb-1">顧客名 / 識別番号</label>
                    <input type="text" id="customer-name" placeholder="例: ジャンク品大量仕入 #240" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                </div>
                <!-- 品目選択 -->
                <div>
                    <label for="item-category" class="block text-sm font-medium text-gray-700 mb-1">品目カテゴリ</label>
                    <select id="item-category" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                        <option value="game">中古ゲーム機/ソフト</option>
                        <option value="camera">中古カメラ/レンズ</option>
                        <option value="brand">ブランド品/時計</option>
                        <option value="other">その他一般古物</option>
                    </select>
                </div>
                <!-- 状態選択 -->
                <div>
                    <label for="item-condition" class="block text-sm font-medium text-gray-700 mb-1">商品の状態 (仕入れ時)</label>
                    <select id="item-condition" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                        <option value="new">新品同様（Sランク）</option>
                        <option value="good">非常に良い（Aランク）</option>
                        <option value="average">並品（Bランク）</option>
                        <option value="junk">ジャンク/故障品（Jランク）</option>
                    </select>
                </div>
                <!-- 仕入れ原価 (必須) -->
                <div>
                    <label for="cost-price" class="block text-sm font-medium text-gray-700 mb-1">仕入れ原価 (¥)</label>
                    <input type="number" id="cost-price" placeholder="例: 10000" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" min="0">
                </div>
            </div>

            <!-- 査定結果とボタン -->
            <div class="flex items-center gap-4 border-t pt-4">
                <button onclick="logTransaction()" id="log-button" class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-150 transform hover:scale-105 shadow-md">
                    買取受付履歴に追加
                </button>
                <div id="status-message" class="text-sm font-medium text-green-700">
                    * 仕入れ原価を入力して追加してください。
                </div>
            </div>
        </div>

        <!-- 履歴エリア - 在庫管理テーブルとして表示 -->
        <div id="history-card" class="card bg-white p-6">
            <h2 class="text-xl font-semibold mb-4 text-gray-800">在庫進捗管理テーブル</h2>
            
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">識別名</th>
                            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">カテゴリ/状態</th>
                            <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">仕入原価</th>
                            <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">現在のステータス</th>
                            <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody id="transaction-list" class="bg-white divide-y divide-gray-200">
                        <!-- 履歴はここに表示されます -->
                    </tbody>
                </table>
            </div>

            <p id="no-history" class="text-gray-500 italic p-4 text-center hidden">現在、管理中の在庫はありません。</p>
        </div>

        <!-- メッセージボックス (Alert代替) -->
        <div id="message-box" class="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-lg shadow-xl hidden transition-opacity duration-300" role="alert"></div>

    </div>

    <script type="text/javascript">
        // 実際の運用ではFirestoreなどのデータベースをご利用ください。
        let transactions = JSON.parse(localStorage.getItem('inventory_transactions')) || [];

        // ステータスの定義
        const STATUSES = [
            { id: 0, name: "査定完了 (仕入時)", color: "status-0" },
            { id: 1, name: "検品中/動作確認", color: "status-1" },
            { id: 2, name: "修理/清掃中", color: "status-2" },
            { id: 3, name: "eBay出品準備完了", color: "status-3" },
            { id: 4, name: "発送完了", color: "status-4" }
        ];

        /**
         * 査定結果を履歴に記録します。
         */
        function logTransaction() {
            const customer = document.getElementById('customer-name').value.trim();
            const category = document.getElementById('item-category').value;
            const condition = document.getElementById('item-condition').value;
            const costPrice = parseInt(document.getElementById('cost-price').value);

            if (!customer || isNaN(costPrice) || costPrice < 0) {
                showMessage("顧客識別名と仕入れ原価を正しく入力してください。", "bg-red-500");
                return;
            }

            const newAssessment = {
                id: Date.now(),
                customer: customer,
                category: document.querySelector(`#item-category option[value="${category}"]`).textContent,
                condition: document.querySelector(`#item-condition option[value="${condition}"]`).textContent,
                cost: costPrice.toLocaleString('ja-JP'),
                statusId: 0, // 初期ステータスは「査定完了」
                date: new Date().toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
            };

            transactions.push(newAssessment);
            localStorage.setItem('inventory_transactions', JSON.stringify(transactions));
            renderTransactions();
            
            // 入力欄をクリア
            document.getElementById('customer-name').value = ''; 
            document.getElementById('cost-price').value = '';
            
            showMessage(`「${customer}」の在庫を管理に追加しました。`, "bg-blue-600");
        }

        /**
         * 特定の在庫アイテムのステータスを更新します。
         */
        function updateStatus(id, newStatusId) {
            const index = transactions.findIndex(t => t.id === id);
            if (index !== -1) {
                transactions[index].statusId = newStatusId;
                localStorage.setItem('inventory_transactions', JSON.stringify(transactions));
                renderTransactions();
                showMessage(`在庫 ID:${id} のステータスを「${STATUSES[newStatusId].name}」に更新しました。`, "bg-green-600");
            }
        }

        /**
         * 履歴リスト（在庫テーブル）をレンダリングします。
         */
        function renderTransactions() {
            const listElement = document.getElementById('transaction-list');
            listElement.innerHTML = ''; 

            if (transactions.length === 0) {
                document.getElementById('no-history').classList.remove('hidden');
                return;
            }
            document.getElementById('no-history').classList.add('hidden');

            transactions.sort((a, b) => a.id - b.id); // 古いものから並べる

            transactions.forEach(t => {
                const status = STATUSES.find(s => s.id === t.statusId) || STATUSES[0];
                
                // 次のステータス
                const nextStatus = STATUSES.find(s => s.id === t.statusId + 1);
                
                const item = document.createElement('tr');
                item.className = 'hover:bg-gray-50';
                item.innerHTML = `
                    <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${t.id.toString().slice(-4)}</td>
                    <td class="px-3 py-3 whitespace-nowrap font-medium text-gray-900">${t.customer}</td>
                    <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-700">${t.category} (${t.condition})</td>
                    <td class="px-3 py-3 whitespace-nowrap text-sm text-right font-semibold text-red-600">¥${t.cost}</td>
                    <td class="px-3 py-3 whitespace-nowrap text-center">
                        <span class="status-tag ${status.color}">${status.name}</span>
                    </td>
                    <td class="px-3 py-3 whitespace-nowrap text-center text-sm font-medium">
                        ${nextStatus ? 
                            `<button onclick="updateStatus(${t.id}, ${nextStatus.id})" class="text-blue-600 hover:text-blue-900 transition duration-150 transform hover:scale-110">
                                次へ (${nextStatus.name})
                            </button>` : 
                            '<span class="text-gray-400">完了</span>'
                        }
                    </td>
                `;
                listElement.appendChild(item);
            });
        }

        /**
         * カスタムメッセージボックスを表示します。
         */
        function showMessage(text, bgColor) {
            const box = document.getElementById('message-box');
            box.textContent = text;
            box.className = `fixed bottom-4 right-4 text-white p-3 rounded-lg shadow-xl transition-opacity duration-300 ${bgColor}`;
            box.style.display = 'block';

            setTimeout(() => {
                box.style.display = 'none';
            }, 3000);
        }

        // 初期ロード時に履歴をレンダリング
        window.onload = renderTransactions;
    </script>
</body>
</html>