'use client'

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>健康生活サポートシステム - 統合ダッシュボード</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f3f4f6; }
        .dashboard-grid {
            display: grid;
            gap: 1.5rem;
            grid-template-columns: 1fr 2fr 1fr; /* 左: 在庫, 中央: カレンダー, 右: 栄養 */
            max-width: 1400px;
            margin: 0 auto;
            padding: 1.5rem;
        }
        @media (max-width: 1024px) {
            .dashboard-grid {
                grid-template-columns: 1fr; /* モバイルでは単一カラム */
            }
        }
        .card {
            background-color: white;
            border-radius: 1rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .scrollable { max-height: 400px; overflow-y: auto; }
        .btn-primary {
            @apply bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-150 shadow-md;
        }
    </style>
</head>
<body>

<!-- Firebase & Firestore Initialization (MANDATORY) -->
<script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
    import { getFirestore, doc, onSnapshot, collection, query, addDoc, updateDoc, deleteDoc, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

    // Firestore Logging - Debug
    setLogLevel('debug');

    // Global variables (MUST BE USED)
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    if (Object.keys(firebaseConfig).length === 0) {
        console.error("Firebase Configが定義されていません。");
        return;
    }

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    
    let currentUserId = 'anonymous'; // デフォルト

    // Firebase認証とFirestoreへの接続
    async function initFirebase() {
        try {
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth);
            }
            
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    currentUserId = user.uid;
                    document.getElementById('userIdDisplay').textContent = `User ID: ${currentUserId}`;
                    console.log("認証完了。ユーザーID:", currentUserId);
                    // 認証完了後にデータ監視を開始
                    setupRealtimeListeners(db, currentUserId);
                } else {
                    console.log("匿名ユーザーとしてサインイン中。");
                    currentUserId = crypto.randomUUID(); // 未認証時はランダムIDを使用
                    document.getElementById('userIdDisplay').textContent = `Anon ID: ${currentUserId.substring(0, 8)}...`;
                }
            });
        } catch (error) {
            console.error("Firebase初期化または認証エラー:", error);
        }
    }

    // Firestoreのリアルタイム監視
    function setupRealtimeListeners(db, userId) {
        // 在庫監視
        const inventoryRef = collection(db, 'artifacts', appId, 'users', userId, 'inventory');
        onSnapshot(inventoryRef, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderInventory(items);
        }, (error) => {
            console.error("在庫データの取得エラー:", error);
        });
        
        // レシピ監視（辞典）
        const recipesRef = collection(db, 'artifacts', appId, 'users', userId, 'recipes');
        onSnapshot(recipesRef, (snapshot) => {
            const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderRecipes(recipes);
        }, (error) => {
            console.error("レシピデータの取得エラー:", error);
        });
    }

    // --- 在庫管理機能の実装 ---

    window.addItemToInventory = async function() {
        const name = document.getElementById('inventoryName').value;
        const expiry = document.getElementById('inventoryExpiry').value;
        if (!name || !expiry) {
            showMessage("食品名と期限を入力してください", 'red');
            return;
        }

        const inventoryRef = collection(db, 'artifacts', appId, 'users', currentUserId, 'inventory');
        try {
            await addDoc(inventoryRef, {
                name: name,
                quantity: 1, 
                unit: '個', 
                expiry_date: new Date(expiry).getTime(),
                created_at: Date.now()
            });
            document.getElementById('inventoryName').value = '';
            document.getElementById('inventoryExpiry').value = '';
            showMessage("在庫に追加しました", 'green');
        } catch (e) {
            console.error("在庫追加エラー: ", e);
            showMessage("在庫追加に失敗しました", 'red');
        }
    }
    
    window.deleteInventoryItem = async function(id) {
        const itemRef = doc(db, 'artifacts', appId, 'users', currentUserId, 'inventory', id);
        try {
            await deleteDoc(itemRef);
            showMessage("在庫を削除しました", 'green');
        } catch (e) {
            console.error("在庫削除エラー: ", e);
            showMessage("在庫削除に失敗しました", 'red');
        }
    }

    function renderInventory(items) {
        const container = document.getElementById('inventoryList');
        container.innerHTML = '';
        if (items.length === 0) {
            container.innerHTML = '<p class="text-gray-500 p-4 text-center">在庫がありません。</p>';
            return;
        }
        
        // 期限が近い順にソート
        items.sort((a, b) => a.expiry_date - b.expiry_date);

        items.forEach(item => {
            const expiryDate = new Date(item.expiry_date);
            const today = new Date();
            const diffTime = expiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let dateClass = 'text-gray-600';
            let dateLabel = expiryDate.toLocaleDateString('ja-JP');

            if (diffDays <= 3) {
                dateClass = 'text-red-500 font-bold';
                dateLabel += ` (残り${diffDays}日)`;
            } else if (diffDays <= 7) {
                dateClass = 'text-yellow-600 font-semibold';
                dateLabel += ` (残り${diffDays}日)`;
            }

            const itemHtml = `
                <div class="flex justify-between items-center p-3 border-b border-gray-100 hover:bg-gray-50 transition">
                    <div class="flex-grow">
                        <p class="font-medium text-gray-800">${item.name}</p>
                        <p class="${dateClass} text-sm">期限: ${dateLabel}</p>
                    </div>
                    <button onclick="deleteInventoryItem('${item.id}')" class="text-red-500 hover:text-red-700 ml-4 p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            `;
            container.innerHTML += itemHtml;
        });
    }

    // --- レシピ辞典/URL登録機能の実装（モック） ---

    window.addRecipeFromUrl = async function() {
        const url = document.getElementById('recipeUrl').value;
        if (!url) {
            showMessage("レシピURLを入力してください", 'red');
            return;
        }

        // ここでレシピサイトからデータ解析（M-101）と栄養推定（N-202）のモック処理を行う
        const mockedTitle = `[モック] ${url.substring(0, 30)}...から取得したレシピ`;
        const mockedNutrients = { cal: Math.floor(Math.random() * 500) + 200, protein: Math.floor(Math.random() * 40) };

        const recipeRef = collection(db, 'artifacts', appId, 'users', currentUserId, 'recipes');
        try {
            await addDoc(recipeRef, {
                title: mockedTitle,
                source_url: url,
                estimated_nutrients: mockedNutrients,
                created_at: Date.now()
            });
            document.getElementById('recipeUrl').value = '';
            showMessage("レシピを辞典に追加しました (解析はモックです)", 'green');
        } catch (e) {
            console.error("レシピ追加エラー: ", e);
            showMessage("レシピ追加に失敗しました", 'red');
        }
    }

    function renderRecipes(recipes) {
        const container = document.getElementById('recipeList');
        container.innerHTML = '';
        if (recipes.length === 0) {
            container.innerHTML = '<p class="text-gray-500 p-4 text-center">レシピ辞典にデータがありません。</p>';
            return;
        }
        
        recipes.forEach(recipe => {
            const itemHtml = `
                <div class="p-3 border-b border-gray-100">
                    <p class="font-medium text-blue-600">${recipe.title}</p>
                    <p class="text-xs text-gray-500 truncate">${recipe.source_url}</p>
                    <p class="text-sm text-gray-700">推定栄養: Kcal ${recipe.estimated_nutrients.cal}, タンパク質 ${recipe.estimated_nutrients.protein}g</p>
                </div>
            `;
            container.innerHTML += itemHtml;
        });
    }

    // --- レシート画像アップロード機能の実装（モック） ---
    window.uploadReceipt = function(event) {
        const file = event.target.files[0];
        if (!file) return;

        // ここで画像解析 (T-402) のモック処理を行う
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                const results = `[モック] レシートから以下の商品が検出されました:\n- 鶏むね肉 300g\n- たまご 1パック\n- 牛乳 1L`;
                document.getElementById('ocrResult').textContent = results;
                showMessage("レシートをアップロードし、OCR処理を完了しました (結果はモックです)", 'green');
                // 検出されたアイテムをInventoryに追加するロジック（実際には実装が必要）
            };
        };
        reader.readAsDataURL(file);
    }

    // --- メッセージ表示関数 ---
    function showMessage(message, color) {
        const msgBox = document.getElementById('messageBox');
        msgBox.textContent = message;
        msgBox.className = `p-3 rounded-lg text-white mb-4 transition-opacity ${color === 'green' ? 'bg-green-500' : 'bg-red-500'}`;
        msgBox.style.opacity = '1';
        setTimeout(() => {
            msgBox.style.opacity = '0';
        }, 3000);
    }

    // 初期化実行
    initFirebase();
</script>

<!-- Header & User Info -->
<header class="bg-white shadow-md">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900">健康生活サポートシステム</h1>
        <div class="text-sm text-gray-500" id="userIdDisplay">User ID: ...</div>
    </div>
    <div id="messageBox" class="opacity-0 transition-opacity duration-500 text-center"></div>
</header>

<!-- Dashboard Grid (幅広UIのコア) -->
<main class="dashboard-grid">

    <!-- 1. 冷蔵庫在庫・摂取履歴管理 (左カラム) -->
    <div class="col-span-1">
        <div class="card p-6 h-full">
            <h2 class="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">冷蔵庫在庫 & 期限管理</h2>
            
            <!-- 在庫追加フォーム -->
            <div class="mb-6 space-y-3 p-4 bg-gray-50 rounded-lg">
                <input type="text" id="inventoryName" placeholder="食品名 (例: 牛乳)" class="w-full p-2 border border-gray-300 rounded-lg">
                <input type="date" id="inventoryExpiry" class="w-full p-2 border border-gray-300 rounded-lg">
                <button onclick="addItemToInventory()" class="btn-primary w-full">在庫に追加</button>
            </div>
            
            <!-- 期限間近リスト -->
            <div class="scrollable">
                <h3 class="font-bold text-lg mb-2 text-gray-700">期限間近リスト (Firestore連動)</h3>
                <div id="inventoryList">
                    <!-- 在庫アイテムがJSで挿入されます -->
                    <p class="text-gray-500 p-4 text-center">データをロード中...</p>
                </div>
            </div>

            <hr class="my-6">

            <!-- レシートOCR機能モック -->
            <h2 class="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">レシート摂取履歴トラッキング</h2>
            <div class="p-4 bg-gray-50 rounded-lg">
                <label for="receiptFile" class="btn-primary w-full text-center cursor-pointer block">
                    レシートを撮影・アップロード
                </label>
                <input type="file" id="receiptFile" accept="image/*" onchange="uploadReceipt(event)" class="hidden">
                <pre id="ocrResult" class="mt-4 p-3 bg-gray-100 border border-gray-200 rounded-lg text-sm whitespace-pre-wrap">ここにOCRによる解析結果が表示されます</pre>
            </div>

        </div>
    </div>

    <!-- 2. 献立カレンダーと提案 (中央カラム) -->
    <div class="col-span-2">
        <div class="card p-6 h-full">
            <h2 class="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">献立カレンダー & レシピ提案 (Google Calendar連携モック)</h2>
            
            <!-- Google Calendar モック表示エリア -->
            <div class="h-96 w-full bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                <p class="text-gray-500 text-lg p-8 text-center">
                    **Googleカレンダー連携エリア** <br>
                    （献立スケジュールを日/週単位で表示）<br>
                    ボタンでカレンダーに献立を登録するAPI連携を想定しています。
                </p>
            </div>

            <!-- 献立提案モック -->
            <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 class="font-bold text-lg text-green-700 mb-2">✨ AI献立提案 (不足栄養素: タンパク質)</h3>
                <p class="text-green-800">
                    昨日の摂取実績に基づき、タンパク質が不足しています。在庫の「鶏むね肉」を優先的に使用したレシピを提案します。
                </p>
                <button class="text-sm mt-3 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">提案レシピを見る</button>
            </div>
        </div>
    </div>

    <!-- 3. 栄養サマリーと辞典 (右カラム) -->
    <div class="col-span-1">
        <div class="card p-6 h-full">
            <h2 class="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">栄養サマリー & レシピ辞典</h2>

            <!-- 栄養サマリーモック -->
            <div class="mb-6 space-y-4">
                <h3 class="font-bold text-lg text-gray-700">日次栄養サマリー (実績/目標)</h3>
                <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <p class="text-sm font-medium text-yellow-700">Kcal: 850 / 2000 (42%)</p>
                    <p class="text-sm font-medium text-yellow-700">タンパク質: 25g / 70g (35%) - **不足**</p>
                </div>
            </div>

            <!-- レシピ辞典 -->
            <div class="mb-6 space-y-3 p-4 bg-gray-50 rounded-lg">
                <h3 class="font-bold text-lg text-gray-700">レシピ辞典へ登録</h3>
                <input type="url" id="recipeUrl" placeholder="レシピURL (例: https://example.com/recipe/1)" class="w-full p-2 border border-gray-300 rounded-lg">
                <button onclick="addRecipeFromUrl()" class="btn-primary w-full bg-indigo-600 hover:bg-indigo-700">URLから辞典に登録</button>
            </div>

            <!-- 辞典リスト -->
            <div class="scrollable">
                <h3 class="font-bold text-lg mb-2 text-gray-700">登録済みレシピ（辞典データ）</h3>
                <div id="recipeList">
                     <!-- レシピアイテムがJSで挿入されます -->
                    <p class="text-gray-500 p-4 text-center">データをロード中...</p>
                </div>
            </div>

        </div>
    </div>

</main>

</body>
</html>
