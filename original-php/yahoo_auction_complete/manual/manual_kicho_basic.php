<?php
// 記帳基本マニュアル (manuals/kicho_basic.php)
if (!defined('SECURE_ACCESS')) {
    die('Direct access not permitted');
}
?>

<div class="manual-content">
    <!-- パンくずリスト -->
    <nav class="breadcrumb">
        <a href="?page=index">📋 マニュアル一覧</a> > 
        <a href="?page=kicho">💰 記帳ツール</a> > 
        <span>はじめての記帳</span>
    </nav>

    <article class="manual-article">
        <header class="manual-header">
            <h1>🚀 はじめての記帳</h1>
            <p class="manual-description">記帳ツールの基本的な使い方を覚えましょう！中学生でもわかるように説明します。</p>
            <div class="manual-meta">
                <span class="difficulty">📊 難易度: ★☆☆</span>
                <span class="time">⏱️ 所要時間: 10分</span>
                <span class="updated">📅 更新日: 2025年6月8日</span>
            </div>
        </header>

        <div class="manual-body">
            <!-- 記帳って何？ -->
            <section class="manual-section">
                <h2>🤔 記帳って何？</h2>
                <div class="info-box info-basic">
                    <p><strong>記帳（きちょう）</strong>とは、お金の出入りを記録することです。</p>
                    <ul>
                        <li>💰 <strong>収入</strong>：お金が入ってくること（売上、給料など）</li>
                        <li>💸 <strong>支出</strong>：お金が出ていくこと（仕入れ、経費など）</li>
                    </ul>
                </div>
                
                <div class="example-box">
                    <h3>🌰 例</h3>
                    <p>商品を1,000円で売った場合：</p>
                    <div class="calculation">
                        <span class="income">収入: +1,000円</span>
                        <span class="description">（現金が1,000円増えた）</span>
                    </div>
                </div>
            </section>

            <!-- 記帳ツールを開く -->
            <section class="manual-section">
                <h2>🖥️ 記帳ツールを開く</h2>
                <div class="step-list">
                    <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h3>記帳ページに移動</h3>
                            <p>ブラウザで記帳ツールのページを開きます。</p>
                            <div class="code-box">
                                <code>http://localhost/modules/kicho/kicho_content.php</code>
                            </div>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h3>画面の確認</h3>
                            <p>記帳ツールの画面が表示されます。主要な部分を確認しましょう。</p>
                            <ul>
                                <li>📝 <strong>入力フォーム</strong>：新しい取引を入力する場所</li>
                                <li>📊 <strong>取引一覧</strong>：過去の取引履歴</li>
                                <li>💹 <strong>集計表</strong>：収入・支出の合計</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 初めての記帳 -->
            <section class="manual-section">
                <h2>✏️ 初めての記帳をしてみよう</h2>
                
                <div class="warning-box">
                    <h3>⚠️ 注意</h3>
                    <p>最初は簡単な取引から始めましょう。複雑な取引は慣れてからチャレンジ！</p>
                </div>

                <div class="step-list">
                    <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h3>取引の種類を選ぶ</h3>
                            <div class="choice-grid">
                                <div class="choice-item income">
                                    <h4>💰 収入</h4>
                                    <p>お金が入ってくる</p>
                                    <small>例：商品売上、サービス料金</small>
                                </div>
                                <div class="choice-item expense">
                                    <h4>💸 支出</h4>
                                    <p>お金が出ていく</p>
                                    <small>例：商品仕入れ、事務用品</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h3>金額を入力</h3>
                            <p>取引した金額を入力します。</p>
                            <div class="input-example">
                                <label>金額：</label>
                                <input type="text" value="1,000" readonly class="example-input">
                                <span class="unit">円</span>
                            </div>
                            <p class="note">💡 カンマ（,）は自動で入ります</p>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <h3>取引内容を入力</h3>
                            <p>何の取引かわかるように説明を書きます。</p>
                            <div class="input-example">
                                <label>内容：</label>
                                <input type="text" value="商品A 販売" readonly class="example-input">
                            </div>
                            <div class="tips-box">
                                <h4>📝 内容の書き方のコツ</h4>
                                <ul>
                                    <li>短くてもわかりやすく</li>
                                    <li>商品名や取引先名を入れる</li>
                                    <li>後で見てもわかるように</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-number">4</div>
                        <div class="step-content">
                            <h3>日付を確認</h3>
                            <p>取引した日付が正しいか確認します。</p>
                            <div class="input-example">
                                <label>日付：</label>
                                <input type="date" value="2025-06-08" readonly class="example-input">
                            </div>
                            <p class="note">💡 今日の日付が自動で入ります</p>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-number">5</div>
                        <div class="step-content">
                            <h3>保存ボタンを押す</h3>
                            <p>入力内容を確認して、保存ボタンを押します。</p>
                            <button class="btn btn-primary example-btn">💾 記帳を保存</button>
                            <p class="success-message">✅ 記帳が完了しました！</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- よくある質問 -->
            <section class="manual-section">
                <h2>❓ よくある質問</h2>
                
                <div class="faq-list">
                    <div class="faq-item">
                        <h3 class="faq-question">Q: 間違って入力してしまった場合は？</h3>
                        <div class="faq-answer">
                            <p>A: 大丈夫です！後で修正できます。取引一覧から該当の取引を見つけて「編集」ボタンを押してください。</p>
                        </div>
                    </div>

                    <div class="faq-item">
                        <h3 class="faq-question">Q: どのくらいの頻度で記帳すればいい？</h3>
                        <div class="faq-answer">
                            <p>A: 理想は毎日ですが、最低でも週に1回は記帳しましょう。まとめて記帳すると忘れてしまうことがあります。</p>
                        </div>
                    </div>

                    <div class="faq-item">
                        <h3 class="faq-question">Q: 現金以外の取引（クレジットカードなど）はどうする？</h3>
                        <div class="faq-answer">
                            <p>A: 支払い方法も記録できます。「CSVファイル取り込み」のマニュアルで詳しく説明しています。</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 次のステップ -->
            <section class="manual-section">
                <h2>🎯 次のステップ</h2>
                <div class="next-steps">
                    <div class="next-step-card">
                        <h3>📤 CSVファイル取り込み</h3>
                        <p>銀行やクレジットカードのデータを一括で取り込む方法を学びましょう。</p>
                        <a href="?page=view&manual=kicho_csv_import" class="btn btn-primary">マニュアルを見る</a>
                    </div>
                    
                    <div class="next-step-card">
                        <h3>🤖 AI自動仕訳</h3>
                        <p>AIに仕訳を手伝ってもらって、作業を効率化しましょう。</p>
                        <a href="?page=view&manual=kicho_ai_assist" class="btn btn-primary">マニュアルを見る</a>
                    </div>
                </div>
            </section>
        </div>

        <footer class="manual-footer">
            <div class="manual-actions">
                <a href="?page=kicho" class="btn btn-outline">記帳ツールに戻る</a>
                <a href="?page=index" class="btn btn-outline">マニュアル一覧に戻る</a>
            </div>
            <div class="manual-feedback">
                <p>このマニュアルは役に立ちましたか？</p>
                <div class="feedback-buttons">
                    <button class="btn-feedback good">👍 わかりやすい</button>
                    <button class="btn-feedback bad">👎 わかりにくい</button>
                </div>
            </div>
        </footer>
    </article>
</div>

<style>
/* マニュアル専用CSS */
.manual-content {
    max-width: 800px;
    margin: 0 auto;
}

.breadcrumb {
    padding: 1rem 0;
    color: #6c757d;
    border-bottom: 1px solid #e9ecef;
    margin-bottom: 2rem;
}

.breadcrumb a {
    color: #007bff;
    text-decoration: none;
}

.breadcrumb a:hover {
    text-decoration: underline;
}

.manual-header {
    text-align: center;
    margin-bottom: 3rem;
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 15px;
}

.manual-header h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
}

.manual-description {
    font-size: 1.2rem;
    margin-bottom: 1.5rem;
    opacity: 0.9;
}

.manual-meta {
    display: flex;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
}

.manual-meta span {
    background: rgba(255,255,255,0.2);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
}

.manual-section {
    margin-bottom: 3rem;
}

.manual-section h2 {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
    color: #495057;
    border-left: 4px solid #007bff;
    padding-left: 1rem;
}

.info-box {
    background: #f8f9fa;
    border-left: 4px solid #007bff;
    padding: 1.5rem;
    margin: 1.5rem 0;
    border-radius: 0 8px 8px 0;
}

.info-basic {
    background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
}

.example-box {
    background: #fff3cd;
    border: 2px solid #ffc107;
    padding: 1.5rem;
    margin: 1.5rem 0;
    border-radius: 8px;
}

.calculation {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
}

.income {
    color: #28a745;
    font-weight: bold;
    font-size: 1.2rem;
}

.step-list {
    margin: 2rem 0;
}

.step {
    display: flex;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: white;
    border: 2px solid #e9ecef;
    border-radius: 12px;
    transition: all 0.3s ease;
}

.step:hover {
    border-color: #007bff;
    box-shadow: 0 4px 15px rgba(0,123,255,0.1);
}

.step-number {
    width: 40px;
    height: 40px;
    background: #007bff;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 1.2rem;
    margin-right: 1.5rem;
    flex-shrink: 0;
}

.step-content {
    flex: 1;
}

.step-content h3 {
    margin-bottom: 0.8rem;
    color: #495057;
}

.choice-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin: 1rem 0;
}

.choice-item {
    padding: 1.5rem;
    border-radius: 8px;
    text-align: center;
    border: 2px solid transparent;
}

.choice-item.income {
    background: #d4edda;
    border-color: #28a745;
}

.choice-item.expense {
    background: #f8d7da;
    border-color: #dc3545;
}

.input-example {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 1rem 0;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
}

.example-input {
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    background: white;
}

.note {
    color: #6c757d;
    font-size: 0.9rem;
    margin-top: 0.5rem;
}

.tips-box {
    background: #e7f3ff;
    border: 2px solid #007bff;
    padding: 1rem;
    border-radius: 8px;
    margin: 1rem 0;
}

.warning-box {
    background: #fff3cd;
    border: 2px solid #ffc107;
    padding: 1.5rem;
    border-radius: 8px;
    margin: 1.5rem 0;
}

.success-message {
    color: #28a745;
    font-weight: bold;
    margin-top: 1rem;
}

.example-btn {
    pointer-events: none;
    opacity: 0.8;
}

.faq-list {
    margin: 1.5rem 0;
}

.faq-item {
    margin-bottom: 1.5rem;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    overflow: hidden;
}

.faq-question {
    background: #f8f9fa;
    padding: 1rem 1.5rem;
    margin: 0;
    cursor: pointer;
    color: #495057;
}

.faq-answer {
    padding: 1.5rem;
    background: white;
}

.next-steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
}

.next-step-card {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 12px;
    text-align: center;
    border: 2px solid #e9ecef;
    transition: all 0.3s ease;
}

.next-step-card:hover {
    border-color: #007bff;
    transform: translateY(-2px);
}

.manual-footer {
    border-top: 2px solid #e9ecef;
    padding-top: 2rem;
    margin-top: 3rem;
    text-align: center;
}

.manual-actions {
    margin-bottom: 2rem;
}

.manual-actions .btn {
    margin: 0 0.5rem;
}

.feedback-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 1rem;
}

.btn-feedback {
    padding: 0.5rem 1rem;
    border: 2px solid #e9ecef;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-feedback:hover {
    border-color: #007bff;
    color: #007bff;
}

@media (max-width: 768px) {
    .choice-grid {
        grid-template-columns: 1fr;
    }
    
    .step {
        flex-direction: column;
        text-align: center;
    }
    
    .step-number {
        margin-right: 0;
        margin-bottom: 1rem;
    }
    
    .manual-meta {
        flex-direction: column;
        gap: 0.5rem;
    }
}
</style>