'use client'

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>解説系YouTubeチャンネル制作チェックリスト</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Inter Font (Google Font) -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet">
    <style>
        /* カスタムスタイルとTailwind設定 */
        :root {
            --primary-color: #ef4444; /* Red 500 */
            --primary-light: #fca5a5; /* Red 300 */
        }
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f3f4f6; /* Gray 100 */
        }
        .accordion-header {
            cursor: pointer;
            user-select: none;
        }
    </style>
</head>
<body class="p-4 sm:p-8">
    <div id="app" class="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
        <!-- ヘッダーエリア -->
        <header class="bg-red-600 p-6 sm:p-8 text-white">
            <h1 class="text-3xl sm:text-4xl font-extrabold mb-2">解説チャンネル制作マニュアル（UI版）</h1>
            <p class="text-red-200 text-lg">著作権リスクを最小化し、効率的に動画制作を進めるためのチェックリストです。</p>
        </header>

        <!-- メインコンテンツ -->
        <main class="p-4 sm:p-6 space-y-8">

            <!-- 著作権遵守：引用の四原則チェックリスト -->
            <section class="border border-red-200 rounded-xl bg-red-50">
                <div class="p-4 sm:p-5">
                    <h2 class="text-2xl font-bold text-red-700 mb-2 flex items-center">
                        <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 111.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.192-2.063-.512-3.04z"></path></svg>
                        引用の四原則（必須チェック）
                    </h2>
                    <p class="text-red-600 text-sm mb-4">他者の著作物を使用する際に、すべてチェックする必要があります。</p>

                    <div id="principles-accordion" class="space-y-3">
                        <!-- 原則A: 主従関係 -->
                        <div class="bg-white rounded-lg shadow-md overflow-hidden">
                            <div class="accordion-header p-4 flex justify-between items-center bg-red-100 transition duration-150 hover:bg-red-200" data-target="A">
                                <h3 class="font-semibold text-lg text-gray-800">A. 主従関係：自分の創作物が「主」か？</h3>
                                <svg class="w-5 h-5 transform transition-transform" data-icon="A" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                            <div class="accordion-content p-4 border-t border-red-100" id="content-A" style="display: none;">
                                <ul class="space-y-2 text-gray-700">
                                    <li>
                                        <label class="flex items-center space-x-3">
                                            <input type="checkbox" class="h-5 w-5 text-red-600 rounded focus:ring-red-500" data-principle="A" data-item="1">
                                            <span class="text-base">【時間】引用画像は、全体の**20%未満**か？（目安）</span>
                                        </label>
                                    </li>
                                    <li>
                                        <label class="flex items-center space-x-3">
                                            <input type="checkbox" class="h-5 w-5 text-red-600 rounded focus:ring-red-500" data-principle="A" data-item="2">
                                            <span class="text-base">【情報量】ナレーションの情報量が、画像が持つ情報量よりも圧倒的に多いか？</span>
                                        </label>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <!-- 原則B: 必然性 -->
                        <div class="bg-white rounded-lg shadow-md overflow-hidden">
                            <div class="accordion-header p-4 flex justify-between items-center bg-red-100 transition duration-150 hover:bg-red-200" data-target="B">
                                <h3 class="font-semibold text-lg text-gray-800">B. 必然性：その画像を使う必要不可欠な理由があるか？</h3>
                                <svg class="w-5 h-5 transform transition-transform" data-icon="B" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                            <div class="accordion-content p-4 border-t border-red-100" id="content-B" style="display: none;">
                                <ul class="space-y-2 text-gray-700">
                                    <li>
                                        <label class="flex items-center space-x-3">
                                            <input type="checkbox" class="h-5 w-5 text-red-600 rounded focus:ring-red-500" data-principle="B" data-item="3">
                                            <span class="text-base">その画像なしに、解説内容が成立しないか？</span>
                                        </label>
                                    </li>
                                    <li>
                                        <label class="flex items-center space-x-3">
                                            <input type="checkbox" class="h-5 w-5 text-red-600 rounded focus:ring-red-500" data-principle="B" data-item="4">
                                            <span class="text-base">感情的な煽り目的ではなく、論理的な根拠として使っているか？</span>
                                        </label>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <!-- 原則C: 明瞭区分性 -->
                        <div class="bg-white rounded-lg shadow-md overflow-hidden">
                            <div class="accordion-header p-4 flex justify-between items-center bg-red-100 transition duration-150 hover:bg-red-200" data-target="C">
                                <h3 class="font-semibold text-lg text-gray-800">C. 明瞭区分性：自分の創作と引用が明確に区別されているか？</h3>
                                <svg class="w-5 h-5 transform transition-transform" data-icon="C" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                            <div class="accordion-content p-4 border-t border-red-100" id="content-C" style="display: none;">
                                <ul class="space-y-2 text-gray-700">
                                    <li>
                                        <label class="flex items-center space-x-3">
                                            <input type="checkbox" class="h-5 w-5 text-red-600 rounded focus:ring-red-500" data-principle="C" data-item="5">
                                            <span class="text-base">引用画像に、**チャンネルロゴの透かしやフレーム、モザイク**などの加工を施しているか？（変形性の確保）</span>
                                        </label>
                                    </li>
                                    <li>
                                        <label class="flex items-center space-x-3">
                                            <input type="checkbox" class="h-5 w-5 text-red-600 rounded focus:ring-red-500" data-principle="C" data-item="6">
                                            <span class="text-base">ナレーションが途切れたり、BGMのみで画像が表示され続ける時間がないか？</span>
                                        </label>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <!-- 原則D: 出所の明示 -->
                        <div class="bg-white rounded-lg shadow-md overflow-hidden">
                            <div class="accordion-header p-4 flex justify-between items-center bg-red-100 transition duration-150 hover:bg-red-200" data-target="D">
                                <h3 class="font-semibold text-lg text-gray-800">D. 出所の明示：引用元を視聴者に伝えているか？</h3>
                                <svg class="w-5 h-5 transform transition-transform" data-icon="D" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                            <div class="accordion-content p-4 border-t border-red-100" id="content-D" style="display: none;">
                                <ul class="space-y-2 text-gray-700">
                                    <li>
                                        <label class="flex items-center space-x-3">
                                            <input type="checkbox" class="h-5 w-5 text-red-600 rounded focus:ring-red-500" data-principle="D" data-item="7">
                                            <span class="text-base">引用元の記事タイトル、メディア名、URLなどを**画面上**または**概要欄**に記載しているか？</span>
                                        </label>
                                    </li>
                                </ul>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            <!-- 素材利用ガイドライン -->
            <section class="border border-gray-300 rounded-xl p-4 sm:p-6 bg-white shadow-lg">
                <div class="accordion-header" data-target="S2">
                    <h2 class="text-xl font-bold text-gray-800 mb-2 flex justify-between items-center">
                        2. 安全な画像・素材の利用ガイドライン
                        <svg class="w-5 h-5 transform transition-transform" data-icon="S2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </h2>
                </div>
                <div class="accordion-content pt-4" id="content-S2" style="display: none;">
                    <h3 class="font-semibold text-lg text-green-600 mb-2">【優先度 高】最も安全な素材</h3>
                    <ul class="list-disc list-inside space-y-1 ml-4 text-gray-700">
                        <li>自分で撮影・作成した画像（著作権リスクゼロ）</li>
                        <li>**商用利用可、クレジット表記不要**のストック素材（Unsplash, Pexelsなど）</li>
                        <li>有料の商用ストックサービスと契約し、使用許諾を得た素材</li>
                    </ul>
                    <h3 class="font-semibold text-lg text-yellow-600 mt-4 mb-2">【優先度 低】リスクのある素材（要「引用」対応）</h3>
                    <ul class="list-disc list-inside space-y-1 ml-4 text-gray-700">
                        <li>ニュースサイトの記事画像</li>
                        <li>アニメ、映画、ゲームなどのスクリーンショットやポスター</li>
                        <li>他者が制作したSNS上の投稿画像</li>
                    </ul>
                    <p class="mt-3 p-2 text-sm bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 rounded">💡 **POINT:** リスクのある素材は、画面占有率を下げ、背景にぼかしを入れるなど、**必ず加工（変形）**を行ってください。</p>
                </div>
            </section>

            <!-- 動画制作自動化ワークフローチェックリスト -->
            <section class="border border-gray-300 rounded-xl p-4 sm:p-6 bg-white shadow-lg">
                <div class="accordion-header" data-target="S3">
                    <h2 class="text-xl font-bold text-gray-800 mb-2 flex justify-between items-center">
                        3. 動画制作自動化ワークフローチェックリスト
                        <svg class="w-5 h-5 transform transition-transform" data-icon="S3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </h2>
                </div>
                <div class="accordion-content pt-4" id="content-S3" style="display: none;">
                    <div class="space-y-4">
                        <h3 class="font-semibold text-lg text-blue-600 border-b pb-1">1. スクリプト生成</h3>
                        <ul class="space-y-2 text-gray-700">
                            <li>AIスクリプトは**批判や深い分析**を含んでいるか？</li>
                            <li>画像が必要な箇所に、**特定の画像検索用キーワードマーカー**が挿入されているか？</li>
                        </ul>

                        <h3 class="font-semibold text-lg text-blue-600 border-b pb-1">3. 素材取得＆編集/同期</h3>
                        <ul class="space-y-2 text-gray-700">
                            <li>著作権フリーのストックライブラリから適切な画像が取得されたか？</li>
                            <li>音声のタイムスタンプと画像の切り替えタイミングは同期されているか？</li>
                            <li>画像切り替えの**最短表示時間**（例：0.5秒）を下回る箇所がないか？</li>
                        </ul>

                        <h3 class="font-semibold text-lg text-blue-600 border-b pb-1">5. 最終加工</h3>
                        <ul class="space-y-2 text-gray-700">
                            <li>引用画像へのロゴ透かし、フレーム追加、表示位置の調整が行われているか？</li>
                            <li>引用画像が**画面全体を占有する時間**が極端に長くないか？</li>
                        </ul>

                        <h3 class="font-semibold text-lg text-blue-600 border-b pb-1">6. 公開前設定</h3>
                        <ul class="space-y-2 text-gray-700">
                            <li>概要欄に**引用元（情報源）のリンク**と、**チャンネルの論評目的**が記載されているか？</li>
                        </ul>
                    </div>
                </div>
            </section>
        </main>
    </div>

    <script>
        // DOMContentLoaded後に初期化を実行
        document.addEventListener('DOMContentLoaded', () => {
            const accordionHeaders = document.querySelectorAll('.accordion-header');
            const checklistItems = document.querySelectorAll('input[type="checkbox"]');

            // --- アコーディオン機能 ---
            accordionHeaders.forEach(header => {
                header.addEventListener('click', () => {
                    const targetId = header.dataset.target;
                    const content = document.getElementById(`content-${targetId}`);
                    const icon = document.querySelector(`[data-icon="${targetId}"]`);

                    // 現在閉じている場合は開く
                    if (content.style.display === 'none' || content.style.display === '') {
                        content.style.display = 'block';
                        icon.classList.add('rotate-180');
                    } else {
                        // 現在開いている場合は閉じる
                        content.style.display = 'none';
                        icon.classList.remove('rotate-180');
                    }
                });
            });

            // 初期状態ではアコーディオンコンテンツを閉じる
            document.querySelectorAll('.accordion-content').forEach(content => {
                content.style.display = 'none';
            });
            // 著作権四原則（A）のみ開いておく
            document.getElementById('content-A').style.display = 'block';
            document.querySelector('[data-icon="A"]').classList.add('rotate-180');


            // --- チェックリスト機能 (状態保存のダミー) ---
            const CHECKLIST_STORAGE_KEY = 'youtube_manual_checklist_state';
            
            // 実際のWebアプリではFirestoreを使いますが、今回はlocalStorageをモックとして利用します
            // 注: Canvas環境ではlocalStorageが制限される場合があるため、動作保証はできませんが、UI機能として組み込みます。
            
            function loadChecklistState() {
                const savedState = JSON.parse(localStorage.getItem(CHECKLIST_STORAGE_KEY) || '{}');
                checklistItems.forEach(checkbox => {
                    const key = `${checkbox.dataset.principle}-${checkbox.dataset.item}`;
                    checkbox.checked = !!savedState[key];
                });
            }

            function saveChecklistState() {
                const newState = {};
                checklistItems.forEach(checkbox => {
                    const key = `${checkbox.dataset.principle}-${checkbox.dataset.item}`;
                    newState[key] = checkbox.checked;
                });
                localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(newState));
            }

            checklistItems.forEach(checkbox => {
                checkbox.addEventListener('change', saveChecklistState);
            });

            // 状態をロード
            loadChecklistState();

            // 注釈: 実際の共同作業アプリでは、この部分はFirestoreを使用してユーザー間で状態を共有する必要があります。
            // const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            // const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
            // ... Firebase/Firestore 初期化とリアルタイムリスナー設定のロジックをここに記述 ...
        });
    </script>
</body>
</html>
