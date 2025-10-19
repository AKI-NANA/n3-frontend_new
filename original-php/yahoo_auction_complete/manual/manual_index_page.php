<?php
// マニュアル一覧ページ (manual_index.php)
if (!defined('SECURE_ACCESS')) {
    die('Direct access not permitted');
}
?>

<div class="manual-index">
    <div class="welcome-section">
        <h2>🎉 ようこそ！NAGANO-3マニュアルへ</h2>
        <p class="welcome-text">
            このマニュアルは、中学生でもわかるように作られています。<br>
            困ったときは、ここを見れば解決できます！
        </p>
    </div>

    <!-- 記帳ツールマニュアル -->
    <section class="manual-section">
        <h3>💰 記帳ツール</h3>
        <div class="manual-grid">
            <div class="manual-card">
                <div class="card-icon">🚀</div>
                <h4>はじめての記帳</h4>
                <p>記帳ツールの基本的な使い方を覚えよう！</p>
                <a href="?page=view&manual=kicho_basic" class="btn btn-primary">マニュアルを見る</a>
            </div>
            
            <div class="manual-card">
                <div class="card-icon">📤</div>
                <h4>CSVファイル取り込み</h4>
                <p>銀行やクレジットカードのデータを取り込む方法</p>
                <a href="?page=view&manual=kicho_csv_import" class="btn btn-primary">マニュアルを見る</a>
            </div>
            
            <div class="manual-card">
                <div class="card-icon">🤖</div>
                <h4>AI自動仕訳</h4>
                <p>AIに仕訳を手伝ってもらう方法</p>
                <a href="?page=view&manual=kicho_ai_assist" class="btn btn-primary">マニュアルを見る</a>
            </div>
            
            <div class="manual-card">
                <div class="card-icon">📊</div>
                <h4>レポート作成</h4>
                <p>売上や支出のレポートを作る方法</p>
                <a href="?page=view&manual=kicho_reports" class="btn btn-primary">マニュアルを見る</a>
            </div>
        </div>
    </section>

    <!-- 在庫管理マニュアル -->
    <section class="manual-section">
        <h3>📦 在庫管理</h3>
        <div class="manual-grid">
            <div class="manual-card">
                <div class="card-icon">📋</div>
                <h4>在庫の基本</h4>
                <p>在庫管理の基本的な考え方</p>
                <a href="?page=view&manual=zaiko_basic" class="btn btn-secondary">マニュアルを見る</a>
            </div>
            
            <div class="manual-card">
                <div class="card-icon">📈</div>
                <h4>在庫の増減管理</h4>
                <p>商品の入荷・出荷の管理方法</p>
                <a href="?page=view&manual=zaiko_movement" class="btn btn-secondary">マニュアルを見る</a>
            </div>
        </div>
    </section>

    <!-- 商品管理マニュアル -->
    <section class="manual-section">
        <h3>🛍️ 商品管理</h3>
        <div class="manual-grid">
            <div class="manual-card">
                <div class="card-icon">➕</div>
                <h4>商品の登録</h4>
                <p>新しい商品を登録する方法</p>
                <a href="?page=view&manual=shohin_register" class="btn btn-success">マニュアルを見る</a>
            </div>
            
            <div class="manual-card">
                <div class="card-icon">✏️</div>
                <h4>商品情報の編集</h4>
                <p>登録済み商品の情報を変更する方法</p>
                <a href="?page=view&manual=shohin_edit" class="btn btn-success">マニュアルを見る</a>
            </div>
        </div>
    </section>

    <!-- よく読まれるマニュアル -->
    <section class="manual-section">
        <h3>🔥 よく読まれるマニュアル</h3>
        <div class="popular-list">
            <div class="popular-item">
                <span class="rank">1</span>
                <a href="?page=view&manual=kicho_basic">はじめての記帳</a>
                <span class="views">👁️ 1,234回</span>
            </div>
            <div class="popular-item">
                <span class="rank">2</span>
                <a href="?page=view&manual=kicho_csv_import">CSVファイル取り込み</a>
                <span class="views">👁️ 987回</span>
            </div>
            <div class="popular-item">
                <span class="rank">3</span>
                <a href="?page=view&manual=kicho_ai_assist">AI自動仕訳</a>
                <span class="views">👁️ 765回</span>
            </div>
        </div>
    </section>

    <!-- 困ったときは -->
    <section class="manual-section">
        <h3>😱 困ったときは</h3>
        <div class="help-section">
            <div class="help-item">
                <h4>❓ よくある質問</h4>
                <p>みんながよく聞く質問と答え</p>
                <a href="?page=help" class="btn btn-outline">質問を見る</a>
            </div>
            <div class="help-item">
                <h4>📧 サポートに連絡</h4>
                <p>それでも解決しないときは</p>
                <a href="mailto:support@example.com" class="btn btn-outline">メールで連絡</a>
            </div>
        </div>
    </section>
</div>