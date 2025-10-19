<?php
/**
 * NAGANO-3 記帳ツール 超分かりやすいマニュアル
 * 中学生でも理解できる簡単解説版
 * 
 * @package NAGANO-3
 * @subpackage Manual
 * @version 1.0.0
 */

// セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    die('直接アクセス禁止');
}

// 中学生向けサンプルデータ（身近な例）
$simple_examples = [
    'income' => [
        ['amount' => 1000, 'description' => 'お小遣い', 'simple' => 'お母さんからもらったお小遣い'],
        ['amount' => 3000, 'description' => 'バイト代', 'simple' => 'コンビニでバイトしてもらったお金'],
        ['amount' => 500, 'description' => 'お年玉', 'simple' => 'おじいちゃんからもらったお年玉']
    ],
    'expense' => [
        ['amount' => 300, 'description' => 'ジュース代', 'simple' => '自販機でジュースを買った'],
        ['amount' => 1200, 'description' => '参考書代', 'simple' => '本屋で数学の参考書を買った'],
        ['amount' => 800, 'description' => '交通費', 'simple' => '電車に乗って友達の家に行った']
    ]
];

$page_title = '記帳ツール超分かりやすいマニュアル';
?>

<!-- 中学生向け記帳マニュアル専用CSS -->
<style>
/* ===== 中学生向け記帳マニュアル専用スタイル ===== */

/* フレンドリーなコンテナ */
.manual__container--simple {
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    min-height: 100vh;
    padding: var(--space-4, 1rem);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* 親しみやすいヘッダー */
.manual__header--friendly {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: var(--radius-2xl, 1.5rem);
    padding: var(--space-8, 3rem);
    margin-bottom: var(--space-6, 2rem);
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    text-align: center;
}

.manual__title--big {
    font-size: 2.5rem;
    margin-bottom: var(--space-4, 1rem);
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3, 1rem);
}

.manual__title-emoji {
    font-size: 3rem;
    display: inline-block;
    animation: bounce 2s infinite ease-in-out;
}

@keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
    }
    40% {
        transform: translateY(-10px);
    }
    60% {
        transform: translateY(-5px);
    }
}

.manual__subtitle--simple {
    font-size: var(--text-xl, 1.25rem);
    line-height: 1.6;
    opacity: 0.95;
    margin: 0;
}

/* 分かりやすいメニュー */
.manual__menu--simple {
    background: white;
    border-radius: var(--radius-2xl, 1.5rem);
    padding: var(--space-6, 2rem);
    margin-bottom: var(--space-8, 3rem);
    box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.1));
}

.manual__menu-title {
    text-align: center;
    font-size: var(--text-2xl, 1.5rem);
    color: var(--text-primary, #1f2937);
    margin-bottom: var(--space-6, 2rem);
    display: flex;
    align-items: center;
    justify-content: center;
}

.manual__menu-emoji {
    font-size: 2rem;
    margin-right: var(--space-3, 1rem);
}

.manual__menu-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-4, 1rem);
}

.manual__menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-4, 1rem);
    padding: var(--space-5, 2rem);
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    border-radius: var(--radius-xl, 1rem);
    text-decoration: none;
    color: var(--text-primary, #1f2937);
    transition: all 0.3s ease;
    border: 2px solid transparent;
}

.manual__menu-item:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.15));
    border-color: #667eea;
}

.manual__menu-number {
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-xl, 1.25rem);
    font-weight: 700;
    flex-shrink: 0;
}

.manual__menu-content h3 {
    font-size: var(--text-lg, 1.125rem);
    font-weight: 600;
    margin: 0 0 var(--space-1, 0.25rem) 0;
}

.manual__menu-content p {
    color: var(--text-secondary, #6b7280);
    margin: 0;
    font-size: var(--text-sm, 0.875rem);
}

/* セクションタイトル（絵文字付き） */
.manual__section--simple {
    background: white;
    border-radius: var(--radius-2xl, 1.5rem);
    padding: var(--space-6, 2rem);
    margin-bottom: var(--space-6, 2rem);
    box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
}

.manual__section-title--simple {
    font-size: var(--text-2xl, 1.5rem);
    margin-bottom: var(--space-6, 2rem);
    text-align: center;
    color: var(--text-primary, #1f2937);
    display: flex;
    align-items: center;
    justify-content: center;
}

.manual__section-emoji {
    font-size: 2rem;
    margin-right: var(--space-3, 1rem);
}

/* 分かりやすい説明カード */
.manual__simple-explanation {
    margin-bottom: var(--space-6, 2rem);
}

.manual__explanation-card {
    background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
    border-radius: var(--radius-xl, 1rem);
    padding: var(--space-5, 2rem);
    margin-bottom: var(--space-4, 1rem);
    border: 2px solid #f59e0b;
}

.manual__explanation-title {
    font-size: var(--text-xl, 1.25rem);
    margin-bottom: var(--space-3, 1rem);
    color: #92400e;
    display: flex;
    align-items: center;
}

.manual__explanation-emoji {
    font-size: 1.5rem;
    margin-right: var(--space-2, 0.5rem);
}

.manual__explanation-text {
    font-size: var(--text-base, 1rem);
    line-height: 1.6;
    color: #78350f;
    margin: 0;
}

/* ビフォー・アフター比較 */
.manual__comparison-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-4, 1rem);
}

.manual__comparison-item {
    padding: var(--space-5, 2rem);
    border-radius: var(--radius-xl, 1rem);
}

.manual__comparison-item--before {
    background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
    border: 2px solid #ef4444;
}

.manual__comparison-item--after {
    background: linear-gradient(135deg, #bbf7d0 0%, #86efac 100%);
    border: 2px solid #10b981;
}

.manual__comparison-item h4 {
    margin-bottom: var(--space-3, 1rem);
    display: flex;
    align-items: center;
}

.manual__comparison-emoji {
    font-size: 1.5rem;
    margin-right: var(--space-2, 0.5rem);
}

.manual__comparison-item ul {
    list-style: none;
    margin: 0;
    padding: 0;
}

.manual__comparison-item li {
    margin-bottom: var(--space-2, 0.5rem);
    padding-left: var(--space-4, 1rem);
    position: relative;
}

.manual__comparison-item--before li::before {
    content: "❌";
    position: absolute;
    left: 0;
}

.manual__comparison-item--after li::before {
    content: "✅";
    position: absolute;
    left: 0;
}

/* ストーリー例 */
.manual__example-box {
    background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
    border-radius: var(--radius-xl, 1rem);
    padding: var(--space-5, 2rem);
    border: 2px solid #6366f1;
    margin-top: var(--space-4, 1rem);
}

.manual__example-title {
    font-size: var(--text-lg, 1.125rem);
    margin-bottom: var(--space-4, 1rem);
    color: #312e81;
    display: flex;
    align-items: center;
}

.manual__example-emoji {
    font-size: 1.5rem;
    margin-right: var(--space-2, 0.5rem);
}

.manual__story-text {
    margin-bottom: var(--space-4, 1rem);
    font-size: var(--text-base, 1rem);
    line-height: 1.6;
    color: #1e1b4b;
}

.manual__story-steps {
    margin-bottom: var(--space-4, 1rem);
}

.manual__story-step {
    display: flex;
    align-items: center;
    gap: var(--space-3, 1rem);
    margin-bottom: var(--space-3, 1rem);
    padding: var(--space-3, 1rem);
    background: rgba(255, 255, 255, 0.7);
    border-radius: var(--radius-lg, 0.75rem);
}

.manual__story-number {
    width: 30px;
    height: 30px;
    background: #6366f1;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    flex-shrink: 0;
}

.manual__story-content h4 {
    margin: 0 0 var(--space-1, 0.25rem) 0;
    color: #312e81;
}

.manual__money-out {
    color: #dc2626;
    font-weight: 600;
}

.manual__money-in {
    color: #10b981;
    font-weight: 600;
}

.manual__money-profit {
    color: #7c3aed;
    font-weight: 700;
    font-size: var(--text-lg, 1.125rem);
}

.manual__story-conclusion {
    background: rgba(255, 255, 255, 0.8);
    padding: var(--space-4, 1rem);
    border-radius: var(--radius-lg, 0.75rem);
    border: 2px solid #8b5cf6;
    text-align: center;
}

.manual__story-conclusion p {
    margin: 0;
    font-weight: 600;
    color: #5b21b6;
}

/* 開始ステップ */
.manual__start-steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-6, 2rem);
}

.manual__start-step {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4, 1rem);
    padding: var(--space-5, 2rem);
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border-radius: var(--radius-xl, 1rem);
    border: 2px solid #0ea5e9;
}

.manual__start-number {
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-xl, 1.25rem);
    font-weight: 700;
    flex-shrink: 0;
}

.manual__start-content h3 {
    margin: 0 0 var(--space-2, 0.5rem) 0;
    color: #0c4a6e;
}

.manual__start-description {
    margin-bottom: var(--space-4, 1rem);
    color: #075985;
    line-height: 1.6;
}

/* デモ画面 */
.manual__demo-box {
    background: #1e293b;
    border-radius: var(--radius-lg, 0.75rem);
    padding: var(--space-4, 1rem);
    color: white;
    font-family: monospace;
}

.manual__demo-sidebar {
    width: 100%;
}

.manual__demo-menu-item {
    padding: var(--space-2, 0.5rem) var(--space-3, 1rem);
    margin-bottom: var(--space-1, 0.25rem);
    border-radius: var(--radius-md, 0.5rem);
}

.manual__demo-menu-item--highlight {
    background: #374151;
    border-left: 3px solid #10b981;
}

.manual__demo-submenu {
    margin-left: var(--space-4, 1rem);
    margin-top: var(--space-2, 0.5rem);
}

.manual__demo-submenu-item--target {
    background: #059669;
    padding: var(--space-2, 0.5rem) var(--space-3, 1rem);
    border-radius: var(--radius-md, 0.5rem);
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.7;
    }
}

/* 画面セクション */
.manual__screen-demo {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-3, 1rem);
    margin-top: var(--space-4, 1rem);
}

.manual__screen-section {
    padding: var(--space-4, 1rem);
    border-radius: var(--radius-lg, 0.75rem);
    text-align: center;
    border: 2px solid;
}

.manual__screen-section--input {
    background: linear-gradient(135deg, #fef3c7, #fed7aa);
    border-color: #f59e0b;
}

.manual__screen-section--history {
    background: linear-gradient(135deg, #dbeafe, #bfdbfe);
    border-color: #3b82f6;
}

.manual__screen-section--summary {
    background: linear-gradient(135deg, #dcfce7, #bbf7d0);
    border-color: #10b981;
}

.manual__screen-section h4 {
    margin: 0 0 var(--space-2, 0.5rem) 0;
    font-size: var(--text-base, 1rem);
}

.manual__screen-section p {
    margin: 0;
    font-size: var(--text-sm, 0.875rem);
    color: var(--text-secondary, #6b7280);
}

/* FAQ（簡単版） */
.manual__faq-simple {
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 1rem);
}

.manual__faq-item-simple {
    background: white;
    border-radius: var(--radius-xl, 1rem);
    padding: var(--space-5, 2rem);
    box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
    border: 2px solid #e5e7eb;
}

.manual__faq-question-simple {
    margin-bottom: var(--space-3, 1rem);
    display: flex;
    align-items: center;
}

.manual__faq-emoji {
    font-size: 1.5rem;
    margin-right: var(--space-2, 0.5rem);
}

.manual__faq-question-simple h4 {
    margin: 0;
    color: var(--text-primary, #1f2937);
    font-size: var(--text-lg, 1.125rem);
}

.manual__faq-answer-simple p {
    margin: 0;
    color: var(--text-secondary, #6b7280);
    line-height: 1.6;
}

/* まとめセクション */
.manual__conclusion {
    text-align: center;
    background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
    border-radius: var(--radius-2xl, 1.5rem);
    padding: var(--space-8, 3rem);
    border: 2px solid #a855f7;
}

.manual__conclusion-content h3 {
    margin-bottom: var(--space-4, 1rem);
    color: #581c87;
    display: flex;
    align-items: center;
    justify-content: center;
}

.manual__conclusion-emoji {
    font-size: 2rem;
    margin-right: var(--space-3, 1rem);
}

.manual__conclusion-text {
    margin-bottom: var(--space-6, 2rem);
    color: #6b21a8;
    font-size: var(--text-lg, 1.125rem);
    line-height: 1.6;
}

.manual__next-actions {
    display: flex;
    gap: var(--space-4, 1rem);
    justify-content: center;
    flex-wrap: wrap;
}

.btn--large {
    padding: var(--space-4, 1rem) var(--space-6, 2rem);
    font-size: var(--text-lg, 1.125rem);
    border-radius: var(--radius-lg, 0.75rem);
}

.btn__emoji {
    margin-right: var(--space-2, 0.5rem);
    font-size: 1.2em;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
    .manual__container--simple {
        padding: var(--space-3, 0.75rem);
    }
    
    .manual__header--friendly {
        padding: var(--space-5, 2rem);
    }
    
    .manual__title--big {
        font-size: 2rem;
        flex-direction: column;
        text-align: center;
        gap: var(--space-2, 0.5rem);
    }
    
    .manual__menu-grid {
        grid-template-columns: 1fr;
    }
    
    .manual__comparison-grid {
        grid-template-columns: 1fr;
    }
    
    .manual__next-actions {
        flex-direction: column;
        align-items: center;
    }
}
</style>

<!-- 超分かりやすい記帳マニュアル -->
<div class="manual__container manual__container--simple">
    
    <!-- 分かりやすいヘッダー -->
    <div class="manual__header manual__header--friendly">
        <div class="manual__header-content">
            <div class="manual__header-left">
                <h1 class="manual__title manual__title--big">
                    <span class="manual__title-emoji">💰</span>
                    お金の記録をつけよう！
                </h1>
                <p class="manual__subtitle manual__subtitle--simple">
                    お小遣い帳みたいに、お金の出入りを記録する方法を教えるよ！
                </p>
            </div>
            <div class="manual__header-actions">
                <a href="/?page=kicho" class="btn btn--primary btn--large">
                    <i class="fas fa-calculator"></i>
                    お金の記録を始める
                </a>
            </div>
        </div>
    </div>

    <!-- 目次（分かりやすく） -->
    <div class="manual__menu manual__menu--simple">
        <h2 class="manual__menu-title">
            <span class="manual__menu-emoji">📚</span>
            この説明書で学べること
        </h2>
        <div class="manual__menu-grid">
            <a href="#what-is-kicho" class="manual__menu-item">
                <span class="manual__menu-number">1</span>
                <div class="manual__menu-content">
                    <h3>記帳って何？</h3>
                    <p>お小遣い帳の大人版</p>
                </div>
            </a>
            <a href="#how-to-start" class="manual__menu-item">
                <span class="manual__menu-number">2</span>
                <div class="manual__menu-content">
                    <h3>始め方</h3>
                    <p>最初にやること</p>
                </div>
            </a>
            <a href="#daily-recording" class="manual__menu-item">
                <span class="manual__menu-number">3</span>
                <div class="manual__menu-content">
                    <h3>毎日の記録</h3>
                    <p>お金の出入りを書く</p>
                </div>
            </a>
            <a href="#csv-import" class="manual__menu-item">
                <span class="manual__menu-number">4</span>
                <div class="manual__menu-content">
                    <h3>まとめて記録</h3>
                    <p>銀行のデータを使う</p>
                </div>
            </a>
            <a href="#ai-help" class="manual__menu-item">
                <span class="manual__menu-number">5</span>
                <div class="manual__menu-content">
                    <h3>AIにお任せ</h3>
                    <p>コンピューターが手伝う</p>
                </div>
            </a>
            <a href="#check-money" class="manual__menu-item">
                <span class="manual__menu-number">6</span>
                <div class="manual__menu-content">
                    <h3>お金をチェック</h3>
                    <p>どのくらい儲かった？</p>
                </div>
            </a>
        </div>
    </div>

    <!-- 1. 記帳って何？ -->
    <section id="what-is-kicho" class="manual__section manual__section--simple">
        <h2 class="manual__section-title manual__section-title--simple">
            <span class="manual__section-emoji">🤔</span>
            記帳って何？
        </h2>
        
        <div class="manual__simple-explanation">
            <div class="manual__explanation-card">
                <h3 class="manual__explanation-title">
                    <span class="manual__explanation-emoji">📔</span>
                    お小遣い帳の大人版だよ！
                </h3>
                <p class="manual__explanation-text">
                    中学生のときにお小遣い帳をつけたことある？記帳は、それの大人版だよ。<br>
                    お店をやっている人が、「今日はどのくらい儲かったかな？」を知るために使うんだ。
                </p>
            </div>
            
            <div class="manual__comparison-grid">
                <div class="manual__comparison-item manual__comparison-item--before">
                    <h4>
                        <span class="manual__comparison-emoji">😵</span>
                        記帳をしないと...
                    </h4>
                    <ul>
                        <li>お金がどこに消えたか分からない</li>
                        <li>儲かってるのか損してるのか分からない</li>
                        <li>税金の計算ができない</li>
                        <li>お金の管理がめちゃくちゃ</li>
                    </ul>
                </div>
                
                <div class="manual__comparison-item manual__comparison-item--after">
                    <h4>
                        <span class="manual__comparison-emoji">😊</span>
                        記帳をすると...
                    </h4>
                    <ul>
                        <li>お金の流れが全部分かる</li>
                        <li>どのくらい儲かったか分かる</li>
                        <li>税金の計算が楽になる</li>
                        <li>お金の管理がバッチリ</li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="manual__example-box">
            <h3 class="manual__example-title">
                <span class="manual__example-emoji">🌰</span>
                具体例で理解しよう
            </h3>
            <div class="manual__example-story">
                <p class="manual__story-text">
                    <strong>太郎くんの場合：</strong><br>
                    太郎くんは中学3年生。お母さんに頼まれて、近所の人にお菓子を売ることになりました。
                </p>
                
                <div class="manual__story-steps">
                    <div class="manual__story-step">
                        <span class="manual__story-number">1</span>
                        <div class="manual__story-content">
                            <h4>お菓子を買ってきた</h4>
                            <p class="manual__money-out">1,000円使った（支出）</p>
                        </div>
                    </div>
                    
                    <div class="manual__story-step">
                        <span class="manual__story-number">2</span>
                        <div class="manual__story-content">
                            <h4>お菓子を売った</h4>
                            <p class="manual__money-in">1,500円もらった（収入）</p>
                        </div>
                    </div>
                    
                    <div class="manual__story-step">
                        <span class="manual__story-number">3</span>
                        <div class="manual__story-content">
                            <h4>計算してみると...</h4>
                            <p class="manual__money-profit">500円の儲けができた！</p>
                        </div>
                    </div>
                </div>
                
                <div class="manual__story-conclusion">
                    <p>この「1,000円使った」「1,500円もらった」を記録するのが記帳だよ！</p>
                </div>
            </div>
        </div>
    </section>

    <!-- 2. 始め方 -->
    <section id="how-to-start" class="manual__section manual__section--simple">
        <h2 class="manual__section-title manual__section-title--simple">
            <span class="manual__section-emoji">🚀</span>
            記帳を始めよう
        </h2>
        
        <div class="manual__start-steps">
            <div class="manual__start-step">
                <div class="manual__start-number">1</div>
                <div class="manual__start-content">
                    <h3>記帳ツールを開く</h3>
                    <p class="manual__start-description">
                        左のメニューから「会計・資産」→「記帳自動化」をクリックしよう
                    </p>
                    <div class="manual__demo-box">
                        <div class="manual__demo-sidebar">
                            <div class="manual__demo-menu-item manual__demo-menu-item--highlight">
                                <i class="fas fa-calculator"></i>
                                会計・資産
                            </div>
                            <div class="manual__demo-submenu">
                                <div class="manual__demo-submenu-item manual__demo-submenu-item--target">
                                    📝 記帳自動化 ← ここをクリック！
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="manual__start-step">
                <div class="manual__start-number">2</div>
                <div class="manual__start-content">
                    <h3>画面を確認する</h3>
                    <p class="manual__start-description">
                        記帳ツールの画面が開いたら、3つの大事な部分を確認しよう
                    </p>
                    <div class="manual__screen-demo">
                        <div class="manual__screen-section manual__screen-section--input">
                            <h4>📝 入力エリア</h4>
                            <p>新しいお金の記録を書く場所</p>
                        </div>
                        <div class="manual__screen-section manual__screen-section--history">
                            <h4>📋 履歴エリア</h4>
                            <p>今までの記録を見る場所</p>
                        </div>
                        <div class="manual__screen-section manual__screen-section--summary">
                            <h4>📊 集計エリア</h4>
                            <p>合計金額を見る場所</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 3. 毎日の記録（詳細説明は省略、簡単版のみ） -->
    <section id="daily-recording" class="manual__section manual__section--simple">
        <h2 class="manual__section-title manual__section-title--simple">
            <span class="manual__section-emoji">✏️</span>
            毎日の記録をつけよう
        </h2>
        
        <div class="manual__explanation-card">
            <h3 class="manual__explanation-title">
                <span class="manual__explanation-emoji">💡</span>
                記録のつけ方は超簡単！
            </h3>
            <p class="manual__explanation-text">
                5つのステップで完了するよ。慣れれば30秒でできるようになるよ！
            </p>
        </div>

        <div class="manual__start-steps">
            <div class="manual__start-step">
                <div class="manual__start-number">1</div>
                <div class="manual__start-content">
                    <h3>お金が入った？出た？</h3>
                    <p class="manual__start-description">
                        まず、お金が入ってきたのか、出ていったのかを選ぼう<br>
                        💰「お金が入った」例：商品が売れた、バイト代をもらった<br>
                        💸「お金が出た」例：商品を買った、電車代を払った
                    </p>
                </div>
            </div>

            <div class="manual__start-step">
                <div class="manual__start-number">2</div>
                <div class="manual__start-content">
                    <h3>いくら？</h3>
                    <p class="manual__start-description">
                        金額を入力しよう。「5000」と入力すると「5,000円」になるよ！
                    </p>
                </div>
            </div>

            <div class="manual__start-step">
                <div class="manual__start-number">3</div>
                <div class="manual__start-content">
                    <h3>何に使った？（何で儲けた？）</h3>
                    <p class="manual__start-description">
                        後で見返したときに分かるように、具体的に書こう<br>
                        良い例：「Amazon 商品A 販売」「コンビニ 商品仕入れ」<br>
                        悪い例：「売上」「買い物」（何のことか分からない）
                    </p>
                </div>
            </div>

            <div class="manual__start-step">
                <div class="manual__start-number">4</div>
                <div class="manual__start-content">
                    <h3>種類を選ぶ</h3>
                    <p class="manual__start-description">
                        売上、仕入れ、交通費、事務用品など、何の種類のお金かを選ぼう
                    </p>
                </div>
            </div>

            <div class="manual__start-step">
                <div class="manual__start-number">5</div>
                <div class="manual__start-content">
                    <h3>保存する</h3>
                    <p class="manual__start-description">
                        入力内容を確認して、「記録を保存する」ボタンを押そう！
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- 4. CSV取り込み（簡単版） -->
    <section id="csv-import" class="manual__section manual__section--simple">
        <h2 class="manual__section-title manual__section-title--simple">
            <span class="manual__section-emoji">📥</span>
            まとめて記録する方法
        </h2>
        
        <div class="manual__explanation-card">
            <h3 class="manual__explanation-title">
                <span class="manual__explanation-emoji">🏦</span>
                銀行のデータを使おう
            </h3>
            <p class="manual__explanation-text">
                銀行やクレジットカードのデータをコンピューターに読み込ませると、<br>
                一気に何十件も記録できるよ！手で入力する必要がなくなるんだ。
            </p>
        </div>

        <div class="manual__start-steps">
            <div class="manual__start-step">
                <div class="manual__start-number">1</div>
                <div class="manual__start-content">
                    <h3>銀行からデータをダウンロード</h3>
                    <p class="manual__start-description">
                        銀行のホームページにログインして、「取引履歴をダウンロード」を選ぶ<br>
                        例：三井住友銀行 → ログイン → 取引履歴 → CSV形式でダウンロード
                    </p>
                </div>
            </div>

            <div class="manual__start-step">
                <div class="manual__start-number">2</div>
                <div class="manual__start-content">
                    <h3>記帳ツールにアップロード</h3>
                    <p class="manual__start-description">
                        ダウンロードしたファイルを記帳ツールに読み込ませる
                    </p>
                </div>
            </div>

            <div class="manual__start-step">
                <div class="manual__start-number">3</div>
                <div class="manual__start-content">
                    <h3>内容を確認して保存</h3>
                    <p class="manual__start-description">
                        コンピューターが自動で分類してくれるから、確認して保存するだけ！
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- 5. AI機能 -->
    <section id="ai-help" class="manual__section manual__section--simple">
        <h2 class="manual__section-title manual__section-title--simple">
            <span class="manual__section-emoji">🤖</span>
            AIに手伝ってもらおう
        </h2>
        
        <div class="manual__explanation-card">
            <h3 class="manual__explanation-title">
                <span class="manual__explanation-emoji">🧠</span>
                コンピューターが頭を使って手伝ってくれる
            </h3>
            <p class="manual__explanation-text">
                AI（人工知能）は、人間みたいに考えることができるコンピューターのこと。<br>
                記帳ツールのAIは、君の代わりに「これは何の支出かな？」を考えてくれるよ！
            </p>
        </div>

        <div class="manual__example-box">
            <h3 class="manual__example-title">
                <span class="manual__example-emoji">🔮</span>
                AIがこんなことをしてくれる
            </h3>
            <div class="manual__story-steps">
                <div class="manual__story-step">
                    <span class="manual__story-number">1</span>
                    <div class="manual__story-content">
                        <h4>普通に入力</h4>
                        <p>いつも通り、金額と内容を入力する</p>
                    </div>
                </div>
                
                <div class="manual__story-step">
                    <span class="manual__story-number">2</span>
                    <div class="manual__story-content">
                        <h4>AIが考える</h4>
                        <p>コンピューターが「これは何だろう？」と考える</p>
                    </div>
                </div>
                
                <div class="manual__story-step">
                    <span class="manual__story-number">3</span>
                    <div class="manual__story-content">
                        <h4>提案してくれる</h4>
                        <p>「たぶん○○だと思うよ！」と教えてくれる</p>
                    </div>
                </div>
                
                <div class="manual__story-step">
                    <span class="manual__story-number">4</span>
                    <div class="manual__story-content">
                        <h4>確認して保存</h4>
                        <p>合ってたらOK、違ったら修正する</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 6. お金をチェック -->
    <section id="check-money" class="manual__section manual__section--simple">
        <h2 class="manual__section-title manual__section-title--simple">
            <span class="manual__section-emoji">📊</span>
            どのくらい儲かったかチェック
        </h2>
        
        <div class="manual__explanation-card">
            <h3 class="manual__explanation-title">
                <span class="manual__explanation-emoji">🎯</span>
                一番大事！儲けを確認しよう
            </h3>
            <p class="manual__explanation-text">
                記帳をするのは、最終的に「どのくらい儲かったか」を知るため。<br>
                毎月、どのくらいお金が増えたか（減ったか）をチェックしよう！
            </p>
        </div>

        <div class="manual__example-box">
            <h3 class="manual__example-title">
                <span class="manual__example-emoji">📈</span>
                こんなレポートが見られる
            </h3>
            <div class="manual__story-text">
                <strong>2024年12月の収支レポート</strong><br><br>
                
                💰 収入（入ってきたお金）：185,000円<br>
                💸 支出（出ていったお金）：120,000円<br>
                🎉 利益（儲け）：65,000円<br><br>
                
                詳細：<br>
                • 売上：185,000円<br>
                • 仕入費：80,000円<br>
                • 送料：25,000円<br>
                • 交通費：15,000円
            </div>
        </div>
    </section>

    <!-- よくある質問（中学生向け） -->
    <section class="manual__section manual__section--simple">
        <h2 class="manual__section-title manual__section-title--simple">
            <span class="manual__section-emoji">❓</span>
            よくある質問
        </h2>
        
        <div class="manual__faq-simple">
            <div class="manual__faq-item-simple">
                <div class="manual__faq-question-simple">
                    <span class="manual__faq-emoji">😅</span>
                    <h4>間違えて入力しちゃった！どうしよう？</h4>
                </div>
                <div class="manual__faq-answer-simple">
                    <p>大丈夫！取り消しできるよ。履歴のところから、間違えた記録を見つけて「編集」ボタンを押せば修正できる。完全に消したいときは「削除」ボタンを押してね。</p>
                </div>
            </div>
            
            <div class="manual__faq-item-simple">
                <div class="manual__faq-question-simple">
                    <span class="manual__faq-emoji">🤔</span>
                    <h4>毎日記録しないとダメ？</h4>
                </div>
                <div class="manual__faq-answer-simple">
                    <p>毎日が理想だけど、週に2〜3回でもOK！大事なのは「忘れる前に記録する」こと。1週間たつと「あれ、何に使ったっけ？」となっちゃうからね。</p>
                </div>
            </div>
            
            <div class="manual__faq-item-simple">
                <div class="manual__faq-question-simple">
                    <span class="manual__faq-emoji">💳</span>
                    <h4>クレジットカードで払ったときはどうする？</h4>
                </div>
                <div class="manual__faq-answer-simple">
                    <p>クレジットカードでも普通に記録してOK！「支払い方法」のところで「クレジットカード」を選べばいいよ。現金でもカードでも、記録の仕方は同じだから安心して。</p>
                </div>
            </div>
            
            <div class="manual__faq-item-simple">
                <div class="manual__faq-question-simple">
                    <span class="manual__faq-emoji">🔐</span>
                    <h4>データが消えちゃったら困る...</h4>
                </div>
                <div class="manual__faq-answer-simple">
                    <p>心配しなくて大丈夫！このシステムは自動でバックアップ（コピー）を取ってくれる。もし心配なら、月に1回「エクスポート」機能を使って、自分のパソコンにもコピーを保存しておこう。</p>
                </div>
            </div>
        </div>
    </section>

    <!-- まとめ -->
    <section class="manual__section manual__section--simple">
        <div class="manual__conclusion">
            <div class="manual__conclusion-content">
                <h3>
                    <span class="manual__conclusion-emoji">🏆</span>
                    君も記帳マスターになれる！
                </h3>
                <p class="manual__conclusion-text">
                    最初は難しそうに感じるかもしれないけど、慣れれば超簡単！<br>
                    毎日コツコツ続けて、お金の流れをしっかり把握しよう。<br>
                    きっと「あ、こんなにお金の管理って大切なんだ」って実感できるはず！
                </p>
                
                <div class="manual__next-actions">
                    <a href="/?page=kicho" class="btn btn--primary btn--large">
                        <span class="btn__emoji">🚀</span>
                        今すぐ記帳を始める
                    </a>
                    <a href="/?page=manual/manual_main_page" class="btn btn--secondary btn--large">
                        <span class="btn__emoji">📚</span>
                        他のマニュアルも見る
                    </a>
                </div>
            </div>
        </div>
    </section>
</div>

<!-- JavaScript（簡単版） -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    console.log('📚 中学生向け記帳マニュアル初期化完了');
    
    // スムーズスクロール
    const menuLinks = document.querySelectorAll('.manual__menu-item');
    menuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // バウンスアニメーション（クリック時）
    const emoji = document.querySelector('.manual__title-emoji');
    if (emoji) {
        emoji.addEventListener('click', function() {
            this.style.animation = 'none';
            setTimeout(() => {
                this.style.animation = 'bounce 1s ease-in-out';
            }, 10);
        });
    }
});
</script>