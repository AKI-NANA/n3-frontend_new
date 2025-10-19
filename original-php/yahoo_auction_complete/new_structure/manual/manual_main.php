<?php
// 簡単修正版 manual_main.php
$page = $_GET['page'] ?? 'index';
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📚 NAGANO-3 マニュアル</title>
    <style>
        /* インラインCSS - 確実に読み込まれる */
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            min-height: 100vh;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5rem;
        }
        .navigation {
            background: #f8f9fa;
            padding: 1rem;
        }
        .nav-list {
            list-style: none;
            display: flex;
            justify-content: center;
            gap: 1rem;
            margin: 0;
            padding: 0;
            flex-wrap: wrap;
        }
        .nav-list a {
            display: block;
            padding: 0.75rem 1.5rem;
            text-decoration: none;
            color: #495057;
            background: white;
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        .nav-list a:hover,
        .nav-list a.active {
            background: #007bff;
            color: white;
        }
        .main-content {
            padding: 2rem;
            min-height: 400px;
        }
        .manual-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
            margin: 2rem 0;
        }
        .manual-card {
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
            transition: all 0.3s ease;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .manual-card:hover {
            transform: translateY(-5px);
            border-color: #007bff;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        .btn {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        .btn:hover {
            background: #0056b3;
        }
        .error, .info {
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        .footer {
            background: #343a40;
            color: white;
            text-align: center;
            padding: 1.5rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>📚 NAGANO-3 マニュアル</h1>
            <p>中学生でもわかる！やさしい操作ガイド</p>
        </header>

        <nav class="navigation">
            <ul class="nav-list">
                <li><a href="?page=index" class="<?php echo $page === 'index' ? 'active' : ''; ?>">📋 マニュアル一覧</a></li>
                <li><a href="?page=kicho" class="<?php echo $page === 'kicho' ? 'active' : ''; ?>">💰 記帳ツール</a></li>
                <li><a href="?page=zaiko" class="<?php echo $page === 'zaiko' ? 'active' : ''; ?>">📦 在庫管理</a></li>
                <li><a href="?page=shohin" class="<?php echo $page === 'shohin' ? 'active' : ''; ?>">🛍️ 商品管理</a></li>
                <li><a href="?page=help" class="<?php echo $page === 'help' ? 'active' : ''; ?>">❓ よくある質問</a></li>
            </ul>
        </nav>

        <main class="main-content">
            <?php
            switch ($page) {
                case 'index':
                    ?>
                    <div class="welcome-section">
                        <h2>🎉 ようこそ！NAGANO-3マニュアルへ</h2>
                        <p>このマニュアルは、中学生でもわかるように作られています。困ったときは、ここを見れば解決できます！</p>
                    </div>

                    <section class="manual-section">
                        <h3>💰 記帳ツール</h3>
                        <div class="manual-grid">
                            <div class="manual-card">
                                <h4>🚀 はじめての記帳</h4>
                                <p>記帳ツールの基本的な使い方を覚えよう！</p>
                                <a href="?page=kicho_basic" class="btn">マニュアルを見る</a>
                            </div>
                            <div class="manual-card">
                                <h4>📤 CSVファイル取り込み</h4>
                                <p>銀行やクレジットカードのデータを取り込む方法</p>
                                <a href="?page=csv_import" class="btn">マニュアルを見る</a>
                            </div>
                        </div>
                    </section>
                    <?php
                    break;

                case 'kicho':
                    ?>
                    <h2>💰 記帳ツールマニュアル</h2>
                    <div class="manual-grid">
                        <div class="manual-card">
                            <h3>🚀 はじめての記帳</h3>
                            <p>記帳ツールの基本的な使い方</p>
                            <a href="?page=kicho_basic" class="btn">マニュアルを見る</a>
                        </div>
                        <div class="manual-card">
                            <h3>📤 CSVファイル取り込み</h3>
                            <p>銀行やクレジットカードのデータ取り込み</p>
                            <a href="?page=csv_import" class="btn">準備中</a>
                        </div>
                    </div>
                    <?php
                    break;

                case 'kicho_basic':
                    ?>
                    <article class="manual-article">
                        <header>
                            <h1>🚀 はじめての記帳</h1>
                            <p>記帳ツールの基本的な使い方を覚えましょう！</p>
                        </header>

                        <section>
                            <h2>🤔 記帳って何？</h2>
                            <div class="info">
                                <p><strong>記帳（きちょう）</strong>とは、お金の出入りを記録することです。</p>
                                <ul>
                                    <li>💰 <strong>収入</strong>：お金が入ってくること（売上、給料など）</li>
                                    <li>💸 <strong>支出</strong>：お金が出ていくこと（仕入れ、経費など）</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2>🖥️ 記帳ツールを開く</h2>
                            <p>ブラウザで記帳ツールのページを開きます。</p>
                            <div class="info">
                                <strong>アクセス先:</strong><br>
                                <code>http://localhost/modules/kicho/kicho_content.php</code>
                            </div>
                        </section>

                        <section>
                            <h2>✏️ 初めての記帳をしてみよう</h2>
                            <div class="manual-grid">
                                <div class="manual-card">
                                    <h4>💰 収入の記帳</h4>
                                    <p>商品を売った時など</p>
                                    <ol>
                                        <li>金額を入力</li>
                                        <li>取引内容を入力</li>
                                        <li>日付を確認</li>
                                        <li>保存ボタンを押す</li>
                                    </ol>
                                </div>
                                <div class="manual-card">
                                    <h4>💸 支出の記帳</h4>
                                    <p>商品を仕入れた時など</p>
                                    <ol>
                                        <li>金額を入力</li>
                                        <li>取引内容を入力</li>
                                        <li>日付を確認</li>
                                        <li>保存ボタンを押す</li>
                                    </ol>
                                </div>
                            </div>
                        </section>

                        <footer style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e9ecef;">
                            <a href="?page=kicho" class="btn">記帳ツールマニュアルに戻る</a>
                            <a href="?page=index" class="btn" style="background: #6c757d;">マニュアル一覧に戻る</a>
                        </footer>
                    </article>
                    <?php
                    break;

                case 'zaiko':
                    ?>
                    <h2>📦 在庫管理マニュアル</h2>
                    <div class="info">在庫管理のマニュアルを準備中です。</div>
                    <?php
                    break;

                case 'shohin':
                    ?>
                    <h2>🛍️ 商品管理マニュアル</h2>
                    <div class="info">商品管理のマニュアルを準備中です。</div>
                    <?php
                    break;

                case 'help':
                    ?>
                    <h2>❓ よくある質問</h2>
                    <div class="manual-card">
                        <h3>Q: マニュアルが表示されない場合は？</h3>
                        <p>A: ページを再読み込みしてください。</p>
                    </div>
                    <div class="manual-card">
                        <h3>Q: 記帳ツールはどこから使える？</h3>
                        <p>A: メインメニューの「記帳」から、または直接 kicho_content.php にアクセスしてください。</p>
                    </div>
                    <?php
                    break;

                default:
                    ?>
                    <div class="error">
                        <h3>ページが見つかりません</h3>
                        <p><a href="?page=index" style="color: #721c24;">マニュアル一覧に戻る</a></p>
                    </div>
                    <?php
                    break;
            }
            ?>
        </main>

        <footer class="footer">
            <p>&copy; 2025 NAGANO-3 システム | 簡単・わかりやすい操作マニュアル</p>
        </footer>
    </div>
</body>
</html>