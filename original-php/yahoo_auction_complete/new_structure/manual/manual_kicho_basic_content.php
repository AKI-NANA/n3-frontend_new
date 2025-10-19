<?php
/**
 * NAGANO-3 記帳ツール基本マニュアル
 * 
 * @package NAGANO-3
 * @subpackage Manual
 * @version 1.0.0
 */

// セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    die('直接アクセス禁止');
}

// アセットパス自動探索
function findAssetPath($filename) {
    $webRoot = $_SERVER['DOCUMENT_ROOT'];
    $possiblePaths = [
        '/common/css/' . $filename,
        '/common/js/' . $filename,
        '/modules/manual/' . $filename,
        '/assets/css/' . $filename,
        '/css/' . $filename,
        '/' . $filename
    ];
    
    foreach ($possiblePaths as $path) {
        if (file_exists($webRoot . $path)) {
            return $path;
        }
    }
    return null;
}

$manualCssPath = findAssetPath('manual.css');
$current_page = 'kicho_basic';
$page_title = '記帳ツール基本マニュアル';

// CSS読み込み
if ($manualCssPath) {
    echo '<link rel="stylesheet" href="' . htmlspecialchars($manualCssPath, ENT_QUOTES, 'UTF-8') . '">' . "\n";
}
?>

<!-- 記帳基本マニュアル -->
<div class="manual__container">
    
    <!-- ページヘッダー -->
    <div class="manual__header">
        <div class="manual__header-content">
            <div class="manual__header-left">
                <h1 class="manual__title">
                    <i class="fas fa-calculator manual__title-icon"></i>
                    記帳ツール基本マニュアル
                </h1>
                <p class="manual__subtitle">
                    NAGANO-3の記帳機能を使って、お金の出入りを正確に記録する方法を学びましょう。
                </p>
            </div>
            <div class="manual__header-actions">
                <button class="btn btn--secondary manual__print-btn" onclick="window.print()">
                    <i class="fas fa-print"></i>
                    印刷
                </button>
                <a href="/?page=kicho" class="btn btn--primary">
                    <i class="fas fa-calculator"></i>
                    記帳ツールを開く
                </a>
            </div>
        </div>
    </div>

    <!-- パンくずリスト -->
    <nav class="manual__breadcrumb">
        <div class="manual__breadcrumb-list">
            <a href="/?page=manual/manual_main_page" class="manual__breadcrumb-link">
                <i class="fas fa-book"></i>
                マニュアル一覧
            </a>
            <i class="fas fa-chevron-right manual__breadcrumb-separator"></i>
            <a href="/?page=manual/manual_main_page#accounting" class="manual__breadcrumb-link">
                会計・記帳
            </a>
            <i class="fas fa-chevron-right manual__breadcrumb-separator"></i>
            <span class="manual__breadcrumb-current">基本的な使い方</span>
        </div>
    </nav>

    <!-- マニュアル内容 -->
    <div class="manual__article">
        
        <!-- 概要セクション -->
        <div class="manual__overview">
            <div class="manual__overview-meta">
                <div class="manual__meta-item">
                    <i class="fas fa-star manual__meta-icon"></i>
                    <span class="manual__meta-label">難易度</span>
                    <span class="manual__meta-value manual__difficulty--beginner">初級</span>
                </div>
                <div class="manual__meta-item">
                    <i class="fas fa-clock manual__meta-icon"></i>
                    <span class="manual__meta-label">所要時間</span>
                    <span class="manual__meta-value">15分</span>
                </div>
                <div class="manual__meta-item">
                    <i class="fas fa-calendar manual__meta-icon"></i>
                    <span class="manual__meta-label">最終更新</span>
                    <span class="manual__meta-value">2024年12月20日</span>
                </div>
            </div>
        </div>

        <!-- 記帳の基本概念 -->
        <section class="manual__section">
            <h2 class="manual__section-title">
                <i class="fas fa-lightbulb"></i>
                記帳って何？
            </h2>
            
            <div class="manual__info-box manual__info-box--primary">
                <div class="manual__info-header">
                    <i class="fas fa-info-circle"></i>
                    <h3>記帳の基本</h3>
                </div>
                <div class="manual__info-content">
                    <p><strong>記帳（きちょう）</strong>とは、お金の動きを記録することです。ビジネスにおいて非常に重要な作業で、以下の目的があります：</p>
                    <ul>
                        <li><strong>収入と支出の把握</strong> - どのくらい儲かっているかを知る</li>
                        <li><strong>税務申告の準備</strong> - 確定申告に必要な資料作成</li>
                        <li><strong>経営判断の材料</strong> - 事業の改善点を見つける</li>
                    </ul>
                </div>
            </div>

            <div class="manual__card-grid">
                <div class="manual__concept-card manual__concept-card--income">
                    <div class="manual__concept-icon">
                        <i class="fas fa-arrow-down"></i>
                    </div>
                    <h3 class="manual__concept-title">収入（しゅうにゅう）</h3>
                    <p class="manual__concept-description">お金が入ってくること</p>
                    <div class="manual__concept-examples">
                        <h4>例：</h4>
                        <ul>
                            <li>商品の売上</li>
                            <li>サービス料金</li>
                            <li>利息収入</li>
                        </ul>
                    </div>
                </div>
                
                <div class="manual__concept-card manual__concept-card--expense">
                    <div class="manual__concept-icon">
                        <i class="fas fa-arrow-up"></i>
                    </div>
                    <h3 class="manual__concept-title">支出（ししゅつ）</h3>
                    <p class="manual__concept-description">お金が出ていくこと</p>
                    <div class="manual__concept-examples">
                        <h4>例：</h4>
                        <ul>
                            <li>商品の仕入れ</li>
                            <li>事務用品の購入</li>
                            <li>交通費</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <!-- 記帳ツールの起動 -->
        <section class="manual__section">
            <h2 class="manual__section-title">
                <i class="fas fa-play"></i>
                記帳ツールを起動する
            </h2>
            
            <div class="manual__step-list">
                <div class="manual__step">
                    <div class="manual__step-number">1</div>
                    <div class="manual__step-content">
                        <h3 class="manual__step-title">サイドバーから記帳ツールを選択</h3>
                        <p class="manual__step-description">
                            左側のメニューから「会計・資産」→「記帳自動化」をクリックします。
                        </p>
                        <div class="manual__code-box">
                            <code>サイドバー → 会計・資産 → 記帳自動化</code>
                        </div>
                    </div>
                </div>

                <div class="manual__step">
                    <div class="manual__step-number">2</div>
                    <div class="manual__step-content">
                        <h3 class="manual__step-title">記帳画面の確認</h3>
                        <p class="manual__step-description">
                            記帳ツールの画面が表示されます。主要な要素を確認しましょう。
                        </p>
                        <div class="manual__feature-grid">
                            <div class="manual__feature-item">
                                <i class="fas fa-edit"></i>
                                <span>入力フォーム</span>
                            </div>
                            <div class="manual__feature-item">
                                <i class="fas fa-list"></i>
                                <span>取引履歴</span>
                            </div>
                            <div class="manual__feature-item">
                                <i class="fas fa-chart-pie"></i>
                                <span>収支サマリー</span>
                            </div>
                            <div class="manual__feature-item">
                                <i class="fas fa-filter"></i>
                                <span>絞り込み機能</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- 初回の記帳 -->
        <section class="manual__section">
            <h2 class="manual__section-title">
                <i class="fas fa-pencil-alt"></i>
                初めての記帳をしてみよう
            </h2>

            <div class="manual__warning-box">
                <div class="manual__warning-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>はじめる前に</h3>
                </div>
                <p>最初は簡単な取引から始めましょう。慣れてきたら複雑な取引にもチャレンジできます。</p>
            </div>

            <div class="manual__step-list">
                <div class="manual__step">
                    <div class="manual__step-number">1</div>
                    <div class="manual__step-content">
                        <h3 class="manual__step-title">取引タイプを選択</h3>
                        <p class="manual__step-description">
                            まず、記録したい取引が収入か支出かを選択します。
                        </p>
                        <div class="manual__choice-grid">
                            <div class="manual__choice-card manual__choice-card--income">
                                <div class="manual__choice-icon">
                                    <i class="fas fa-plus-circle"></i>
                                </div>
                                <h4>収入を記録</h4>
                                <p>お金が入ってきた場合</p>
                                <div class="manual__choice-examples">
                                    <span>例：商品売上、サービス料</span>
                                </div>
                            </div>
                            <div class="manual__choice-card manual__choice-card--expense">
                                <div class="manual__choice-icon">
                                    <i class="fas fa-minus-circle"></i>
                                </div>
                                <h4>支出を記録</h4>
                                <p>お金が出ていった場合</p>
                                <div class="manual__choice-examples">
                                    <span>例：仕入れ、経費、交通費</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="manual__step">
                    <div class="manual__step-number">2</div>
                    <div class="manual__step-content">
                        <h3 class="manual__step-title">金額を入力</h3>
                        <p class="manual__step-description">
                            取引した金額を正確に入力します。
                        </p>
                        <div class="manual__input-example">
                            <label class="manual__input-label">金額：</label>
                            <div class="manual__input-group">
                                <input type="text" value="5,000" readonly class="manual__input-field">
                                <span class="manual__input-unit">円</span>
                            </div>
                        </div>
                        <div class="manual__tip-box">
                            <i class="fas fa-lightbulb"></i>
                            <span>カンマ（,）は自動で挿入されます</span>
                        </div>
                    </div>
                </div>

                <div class="manual__step">
                    <div class="manual__step-number">3</div>
                    <div class="manual__step-content">
                        <h3 class="manual__step-title">取引内容を記入</h3>
                        <p class="manual__step-description">
                            後で見返したときに分かるよう、取引の内容を具体的に書きます。
                        </p>
                        <div class="manual__input-example">
                            <label class="manual__input-label">内容：</label>
                            <input type="text" value="Amazon販売 商品A" readonly class="manual__input-field">
                        </div>
                        <div class="manual__best-practices">
                            <h4 class="manual__best-practices-title">
                                <i class="fas fa-star"></i>
                                内容記入のコツ
                            </h4>
                            <ul class="manual__best-practices-list">
                                <li><strong>具体的に書く</strong> - 「商品A販売」より「Amazon 商品A販売」</li>
                                <li><strong>取引先を含める</strong> - どこから/どこに支払ったかを明記</li>
                                <li><strong>略語を統一</strong> - 「ｱﾏｿﾞﾝ」「Amazon」など表記を揃える</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="manual__step">
                    <div class="manual__step-number">4</div>
                    <div class="manual__step-content">
                        <h3 class="manual__step-title">カテゴリを選択</h3>
                        <p class="manual__step-description">
                            取引の種類に応じてカテゴリを選択します。
                        </p>
                        <div class="manual__category-grid">
                            <div class="manual__category-item">
                                <i class="fas fa-shopping-cart"></i>
                                <span>売上</span>
                            </div>
                            <div class="manual__category-item">
                                <i class="fas fa-truck"></i>
                                <span>仕入れ</span>
                            </div>
                            <div class="manual__category-item">
                                <i class="fas fa-car"></i>
                                <span>交通費</span>
                            </div>
                            <div class="manual__category-item">
                                <i class="fas fa-utensils"></i>
                                <span>接待費</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="manual__step">
                    <div class="manual__step-number">5</div>
                    <div class="manual__step-content">
                        <h3 class="manual__step-title">日付を確認・調整</h3>
                        <p class="manual__step-description">
                            取引が実際に行われた日付を設定します。
                        </p>
                        <div class="manual__input-example">
                            <label class="manual__input-label">取引日：</label>
                            <input type="date" value="2024-12-20" readonly class="manual__input-field">
                        </div>
                        <div class="manual__tip-box">
                            <i class="fas fa-info-circle"></i>
                            <span>デフォルトで今日の日付が設定されます</span>
                        </div>
                    </div>
                </div>

                <div class="manual__step">
                    <div class="manual__step-number">6</div>
                    <div class="manual__step-content">
                        <h3 class="manual__step-title">記帳内容を保存</h3>
                        <p class="manual__step-description">
                            入力内容を確認して、保存ボタンをクリックします。
                        </p>
                        <div class="manual__action-example">
                            <button class="btn btn--primary manual__demo-btn">
                                <i class="fas fa-save"></i>
                                記帳を保存
                            </button>
                        </div>
                        <div class="manual__success-message">
                            <i class="fas fa-check-circle"></i>
                            <span>記帳が正常に保存されました！</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- よくある質問 -->
        <section class="manual__section">
            <h2 class="manual__section-title">
                <i class="fas fa-question-circle"></i>
                よくある質問
            </h2>
            
            <div class="manual__faq-container">
                <div class="manual__faq-item">
                    <div class="manual__faq-question">
                        <i class="fas fa-question-circle manual__faq-icon"></i>
                        <h3>間違えて入力してしまった場合は？</h3>
                        <button class="manual__faq-toggle">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    <div class="manual__faq-answer">
                        <p>心配ありません！取引履歴から該当の取引を見つけて「編集」ボタンをクリックすれば修正できます。完全に削除したい場合は「削除」ボタンを使用してください。</p>
                    </div>
                </div>

                <div class="manual__faq-item">
                    <div class="manual__faq-question">
                        <i class="fas fa-question-circle manual__faq-icon"></i>
                        <h3>どのくらいの頻度で記帳すべき？</h3>
                        <button class="manual__faq-toggle">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    <div class="manual__faq-answer">
                        <p>理想は毎日の記帳ですが、最低でも週に2〜3回は記帳しましょう。まとめて記帳すると取引の詳細を忘れてしまい、正確性が落ちる可能性があります。</p>
                    </div>
                </div>

                <div class="manual__faq-item">
                    <div class="manual__faq-question">
                        <i class="fas fa-question-circle manual__faq-icon"></i>
                        <h3>クレジットカード決済はどう記録する？</h3>
                        <button class="manual__faq-toggle">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    <div class="manual__faq-answer">
                        <p>支払い方法として「クレジットカード」を選択できます。また、CSVインポート機能を使えば、クレジットカード会社の利用明細を一括で取り込むことも可能です。</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 次のステップ -->
        <section class="manual__section">
            <h2 class="manual__section-title">
                <i class="fas fa-arrow-right"></i>
                次のステップ
            </h2>
            
            <div class="manual__next-steps">
                <div class="manual__next-step-card">
                    <div class="manual__next-step-icon manual__next-step-icon--intermediate">
                        <i class="fas fa-file-import"></i>
                    </div>
                    <h3 class="manual__next-step-title">CSVデータ取り込み</h3>
                    <p class="manual__next-step-description">
                        銀行やクレジットカードの明細を一括で取り込む方法を学びましょう。
                    </p>
                    <a href="/?page=manual/kicho_csv_import" class="btn btn--primary manual__next-step-btn">
                        マニュアルを見る
                    </a>
                </div>
                
                <div class="manual__next-step-card">
                    <div class="manual__next-step-icon manual__next-step-icon--advanced">
                        <i class="fas fa-robot"></i>
                    </div>
                    <h3 class="manual__next-step-title">AI自動仕訳</h3>
                    <p class="manual__next-step-description">
                        AIを活用して仕訳作業を自動化し、効率を大幅に向上させましょう。
                    </p>
                    <a href="/?page=manual/kicho_ai_assist" class="btn btn--primary manual__next-step-btn">
                        マニュアルを見る
                    </a>
                </div>
                
                <div class="manual__next-step-card">
                    <div class="manual__next-step-icon manual__next-step-icon--report">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3 class="manual__next-step-title">収支レポート</h3>
                    <p class="manual__next-step-description">
                        記帳したデータから収支レポートを作成し、事業状況を分析しましょう。
                    </p>
                    <a href="/?page=manual/kicho_reports" class="btn btn--primary manual__next-step-btn">
                        マニュアルを見る
                    </a>
                </div>
            </div>
        </section>
    </div>

    <!-- マニュアルフッター -->
    <div class="manual__article-footer">
        <div class="manual__article-actions">
            <a href="/?page=manual/manual_main_page" class="btn btn--secondary">
                <i class="fas fa-arrow-left"></i>
                マニュアル一覧に戻る
            </a>
            <a href="/?page=kicho" class="btn btn--primary">
                <i class="fas fa-calculator"></i>
                記帳ツールを開く
            </a>
        </div>
        
        <div class="manual__feedback">
            <h3 class="manual__feedback-title">このマニュアルは役に立ちましたか？</h3>
            <div class="manual__feedback-buttons">
                <button class="manual__feedback-btn manual__feedback-btn--good">
                    <i class="fas fa-thumbs-up"></i>
                    分かりやすい
                </button>
                <button class="manual__feedback-btn manual__feedback-btn--bad">
                    <i class="fas fa-thumbs-down"></i>
                    分かりにくい
                </button>
            </div>
        </div>
    </div>
</div>

<!-- 追加CSS（NAGANO-3デザイン拡張） -->
<style>
/* ===== 記帳マニュアル専用スタイル（既存デザイン拡張） ===== */

/* パンくずリスト */
.manual__breadcrumb {
    background: var(--bg-primary, #f9fafb);
    padding: var(--space-4, 1rem);
    border-radius: var(--radius-lg, 0.75rem);
    margin-bottom: var(--space-6, 2rem);
    border: 1px solid var(--shadow-dark, rgba(0, 0, 0, 0.1));
}

.manual__breadcrumb-list {
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
    font-size: var(--text-sm, 0.875rem);
}

.manual__breadcrumb-link {
    color: var(--manual-primary, #8b5cf6);
    text-decoration: none;
    transition: var(--transition, all 0.3s ease);
    display: flex;
    align-items: center;
    gap: var(--space-1, 0.25rem);
}

.manual__breadcrumb-link:hover {
    color: var(--manual-secondary, #a855f7);
}

.manual__breadcrumb-separator {
    color: var(--text-tertiary, #9ca3af);
    font-size: 12px;
}

.manual__breadcrumb-current {
    color: var(--text-secondary, #6b7280);
    font-weight: 500;
}

/* 概要メタ情報 */
.manual__overview {
    background: var(--bg-secondary, #ffffff);
    border-radius: var(--radius-xl, 1rem);
    padding: var(--space-5, 2rem);
    margin-bottom: var(--space-6, 2rem);
    box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
    border: 1px solid var(--shadow-dark, rgba(0, 0, 0, 0.1));
}

.manual__overview-meta {
    display: flex;
    justify-content: center;
    gap: var(--space-6, 2rem);
    flex-wrap: wrap;
}

.manual__meta-item {
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
    padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
    background: var(--bg-primary, #f9fafb);
    border-radius: var(--radius-full, 50px);
    border: 1px solid var(--shadow-dark, rgba(0, 0, 0, 0.1));
}

.manual__meta-icon {
    color: var(--manual-primary, #8b5cf6);
    font-size: var(--text-sm, 0.875rem);
}

.manual__meta-label {
    font-size: var(--text-xs, 0.75rem);
    color: var(--text-tertiary, #9ca3af);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
}

.manual__meta-value {
    font-size: var(--text-sm, 0.875rem);
    font-weight: 600;
    color: var(--text-primary, #1f2937);
}

.manual__difficulty--beginner {
    color: var(--manual-beginner, #10b981) !important;
}

/* 情報ボックス */
.manual__info-box {
    background: var(--bg-secondary, #ffffff);
    border-radius: var(--radius-lg, 0.75rem);
    padding: var(--space-5, 2rem);
    margin: var(--space-4, 1rem) 0;
    border-left: 4px solid var(--manual-primary, #8b5cf6);
    box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.1));
}

.manual__info-box--primary {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(139, 92, 246, 0.02));
    border-left-color: var(--manual-primary, #8b5cf6);
}

.manual__info-header {
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
    margin-bottom: var(--space-3, 1rem);
}

.manual__info-header i {
    color: var(--manual-primary, #8b5cf6);
    font-size: var(--text-lg, 1.125rem);
}

.manual__info-header h3 {
    margin: 0;
    font-size: var(--text-lg, 1.125rem);
    font-weight: 600;
    color: var(--text-primary, #1f2937);
}

/* コンセプトカード */
.manual__card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-4, 1rem);
    margin: var(--space-6, 2rem) 0;
}

.manual__concept-card {
    background: var(--bg-secondary, #ffffff);
    border-radius: var(--radius-xl, 1rem);
    padding: var(--space-5, 2rem);
    text-align: center;
    box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
    border: 2px solid transparent;
    transition: var(--transition, all 0.3s ease);
}

.manual__concept-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.15));
}

.manual__concept-card--income {
    border-color: var(--manual-success, #10b981);
}

.manual__concept-card--expense {
    border-color: var(--manual-danger, #ef4444);
}

.manual__concept-icon {
    width: 60px;
    height: 60px;
    border-radius: var(--radius-full, 50%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-2xl, 1.5rem);
    color: white;
    margin: 0 auto var(--space-4, 1rem);
}

.manual__concept-card--income .manual__concept-icon {
    background: linear-gradient(135deg, var(--manual-success, #10b981), #059669);
}

.manual__concept-card--expense .manual__concept-icon {
    background: linear-gradient(135deg, var(--manual-danger, #ef4444), #dc2626);
}

.manual__concept-title {
    font-size: var(--text-xl, 1.25rem);
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    margin: 0 0 var(--space-2, 0.5rem) 0;
}

.manual__concept-description {
    color: var(--text-secondary, #6b7280);
    margin-bottom: var(--space-4, 1rem);
}

.manual__concept-examples h4 {
    font-size: var(--text-sm, 0.875rem);
    color: var(--text-secondary, #6b7280);
    margin: 0 0 var(--space-2, 0.5rem) 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.manual__concept-examples ul {
    list-style: none;
    margin: 0;
    padding: 0;
}

.manual__concept-examples li {
    font-size: var(--text-sm, 0.875rem);
    color: var(--text-secondary, #6b7280);
    margin-bottom: var(--space-1, 0.25rem);
    position: relative;
    padding-left: var(--space-4, 1rem);
}

.manual__concept-examples li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: var(--manual-primary, #8b5cf6);
    font-weight: bold;
}

/* ステップリスト */
.manual__step-list {
    margin: var(--space-6, 2rem) 0;
}

.manual__step {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4, 1rem);
    margin-bottom: var(--space-6, 2rem);
    padding: var(--space-5, 2rem);
    background: var(--bg-secondary, #ffffff);
    border-radius: var(--radius-xl, 1rem);
    box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
    border: 1px solid var(--shadow-dark, rgba(0, 0, 0, 0.1));
    transition: var(--transition, all 0.3s ease);
}

.manual__step:hover {
    border-color: var(--manual-primary, #8b5cf6);
    transform: translateY(-2px);
}

.manual__step-number {
    width: 50px;
    height: 50px;
    background: var(--manual-gradient, linear-gradient(135deg, #8b5cf6, #a855f7));
    color: white;
    border-radius: var(--radius-full, 50%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-xl, 1.25rem);
    font-weight: 700;
    flex-shrink: 0;
    box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.1));
}

.manual__step-content {
    flex: 1;
}

.manual__step-title {
    font-size: var(--text-lg, 1.125rem);
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    margin: 0 0 var(--space-2, 0.5rem) 0;
}

.manual__step-description {
    color: var(--text-secondary, #6b7280);
    line-height: 1.6;
    margin-bottom: var(--space-4, 1rem);
}

/* コードボックス */
.manual__code-box {
    background: var(--bg-primary, #f9fafb);
    border: 1px solid var(--shadow-dark, rgba(0, 0, 0, 0.1));
    border-radius: var(--radius-md, 0.5rem);
    padding: var(--space-3, 1rem);
    margin: var(--space-3, 1rem) 0;
}

.manual__code-box code {
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: var(--text-sm, 0.875rem);
    color: var(--manual-primary, #8b5cf6);
    font-weight: 500;
}

/* 機能グリッド */
.manual__feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--space-3, 1rem);
    margin: var(--space-4, 1rem) 0;
}

.manual__feature-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2, 0.5rem);
    padding: var(--space-3, 1rem);
    background: var(--bg-primary, #f9fafb);
    border-radius: var(--radius-lg, 0.75rem);
    text-align: center;
    font-size: var(--text-sm, 0.875rem);
    color: var(--text-secondary, #6b7280);
    border: 1px solid var(--shadow-dark, rgba(0, 0, 0, 0.1));
}

.manual__feature-item i {
    color: var(--manual-primary, #8b5cf6);
    font-size: var(--text-lg, 1.125rem);
}

/* 警告ボックス */
.manual__warning-box {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05));
    border: 2px solid var(--manual-warning, #f59e0b);
    border-radius: var(--radius-lg, 0.75rem);
    padding: var(--space-5, 2rem);
    margin: var(--space-4, 1rem) 0;
}

.manual__warning-header {
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
    margin-bottom: var(--space-3, 1rem);
}

.manual__warning-header i {
    color: var(--manual-warning, #f59e0b);
    font-size: var(--text-lg, 1.125rem);
}

.manual__warning-header h3 {
    margin: 0;
    font-size: var(--text-lg, 1.125rem);
    font-weight: 600;
    color: var(--text-primary, #1f2937);
}

/* 選択カード */
.manual__choice-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-4, 1rem);
    margin: var(--space-4, 1rem) 0;
}

.manual__choice-card {
    background: var(--bg-secondary, #ffffff);
    border-radius: var(--radius-xl, 1rem);
    padding: var(--space-5, 2rem);
    text-align: center;
    border: 2px solid transparent;
    transition: var(--transition, all 0.3s ease);
    cursor: pointer;
}

.manual__choice-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.15));
}

.manual__choice-card--income {
    border-color: var(--manual-success, #10b981);
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.02));
}

.manual__choice-card--expense {
    border-color: var(--manual-danger, #ef4444);
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.02));
}

.manual__choice-icon {
    width: 50px;
    height: 50px;
    border-radius: var(--radius-full, 50%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-xl, 1.25rem);
    color: white;
    margin: 0 auto var(--space-3, 1rem);
}

.manual__choice-card--income .manual__choice-icon {
    background: linear-gradient(135deg, var(--manual-success, #10b981), #059669);
}

.manual__choice-card--expense .manual__choice-icon {
    background: linear-gradient(135deg, var(--manual-danger, #ef4444), #dc2626);
}

.manual__choice-card h4 {
    font-size: var(--text-lg, 1.125rem);
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    margin: 0 0 var(--space-2, 0.5rem) 0;
}

.manual__choice-card p {
    color: var(--text-secondary, #6b7280);
    margin-bottom: var(--space-3, 1rem);
}

.manual__choice-examples {
    font-size: var(--text-sm, 0.875rem);
    color: var(--text-tertiary, #9ca3af);
    font-style: italic;
}

/* 入力例 */
.manual__input-example {
    display: flex;
    align-items: center;
    gap: var(--space-3, 1rem);
    margin: var(--space-3, 1rem) 0;
    padding: var(--space-4, 1rem);
    background: var(--bg-primary, #f9fafb);
    border-radius: var(--radius-lg, 0.75rem);
    border: 1px solid var(--shadow-dark, rgba(0, 0, 0, 0.1));
}

.manual__input-label {
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    min-width: 80px;
}

.manual__input-group {
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
}

.manual__input-field {
    padding: var(--space-2, 0.5rem) var(--space-3, 1rem);
    border: 1px solid var(--shadow-dark, rgba(0, 0, 0, 0.1));
    border-radius: var(--radius-md, 0.5rem);
    background: white;
    font-size: var(--text-base, 1rem);
    color: var(--text-primary, #1f2937);
    min-width: 200px;
}

.manual__input-unit {
    color: var(--text-secondary, #6b7280);
    font-weight: 500;
}

/* ヒントボックス */
.manual__tip-box {
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
    padding: var(--space-2, 0.5rem) var(--space-3, 1rem);
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05));
    border-radius: var(--radius-md, 0.5rem);
    border: 1px solid rgba(139, 92, 246, 0.2);
    margin: var(--space-2, 0.5rem) 0;
    font-size: var(--text-sm, 0.875rem);
    color: var(--text-secondary, #6b7280);
}

.manual__tip-box i {
    color: var(--manual-primary, #8b5cf6);
}

/* ベストプラクティス */
.manual__best-practices {
    background: var(--bg-secondary, #ffffff);
    border: 1px solid var(--shadow-dark, rgba(0, 0, 0, 0.1));
    border-radius: var(--radius-lg, 0.75rem);
    padding: var(--space-4, 1rem);
    margin: var(--space-4, 1rem) 0;
}

.manual__best-practices-title {
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
    font-size: var(--text-base, 1rem);
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    margin: 0 0 var(--space-3, 1rem) 0;
}

.manual__best-practices-title i {
    color: var(--manual-warning, #f59e0b);
}

.manual__best-practices-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.manual__best-practices-list li {
    margin-bottom: var(--space-2, 0.5rem);
    padding-left: var(--space-4, 1rem);
    position: relative;
    font-size: var(--text-sm, 0.875rem);
    color: var(--text-secondary, #6b7280);
    line-height: 1.5;
}

.manual__best-practices-list li::before {
    content: "→";
    position: absolute;
    left: 0;
    color: var(--manual-primary, #8b5cf6);
    font-weight: bold;
}

/* カテゴリグリッド */
.manual__category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--space-3, 1rem);
    margin: var(--space-4, 1rem) 0;
}

.manual__category-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2, 0.5rem);
    padding: var(--space-3, 1rem);
    background: var(--bg-primary, #f9fafb);
    border-radius: var(--radius-lg, 0.75rem);
    border: 1px solid var(--shadow-dark, rgba(0, 0, 0, 0.1));
    text-align: center;
    transition: var(--transition, all 0.3s ease);
    cursor: pointer;
}

.manual__category-item:hover {
    border-color: var(--manual-primary, #8b5cf6);
    background: var(--bg-secondary, #ffffff);
}

.manual__category-item i {
    color: var(--manual-primary, #8b5cf6);
    font-size: var(--text-lg, 1.125rem);
}

.manual__category-item span {
    font-size: var(--text-sm, 0.875rem);
    font-weight: 500;
    color: var(--text-secondary, #6b7280);
}

/* アクション例 */
.manual__action-example {
    margin: var(--space-4, 1rem) 0;
}

.manual__demo-btn {
    pointer-events: none;
    opacity: 0.8;
}

/* 成功メッセージ */
.manual__success-message {
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
    padding: var(--space-3, 1rem);
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
    border: 1px solid var(--manual-success, #10b981);
    border-radius: var(--radius-md, 0.5rem);
    color: var(--manual-success, #10b981);
    font-weight: 600;
    margin: var(--space-3, 1rem) 0;
}

.manual__success-message i {
    font-size: var(--text-lg, 1.125rem);
}

/* 次のステップ */
.manual__next-steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-5, 2rem);
    margin: var(--space-6, 2rem) 0;
}

.manual__next-step-card {
    background: var(--bg-secondary, #ffffff);
    border-radius: var(--radius-xl, 1rem);
    padding: var(--space-5, 2rem);
    text-align: center;
    box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
    border: 1px solid var(--shadow-dark, rgba(0, 0, 0, 0.1));
    transition: var(--transition, all 0.3s ease);
}

.manual__next-step-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.15));
}

.manual__next-step-icon {
    width: 60px;
    height: 60px;
    border-radius: var(--radius-full, 50%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-2xl, 1.5rem);
    color: white;
    margin: 0 auto var(--space-4, 1rem);
}

.manual__next-step-icon--intermediate {
    background: linear-gradient(135deg, var(--manual-warning, #f59e0b), #ea580c);
}

.manual__next-step-icon--advanced {
    background: linear-gradient(135deg, var(--manual-danger, #ef4444), #dc2626);
}

.manual__next-step-icon--report {
    background: linear-gradient(135deg, var(--manual-primary, #8b5cf6), #7c3aed);
}

.manual__next-step-title {
    font-size: var(--text-lg, 1.125rem);
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    margin: 0 0 var(--space-3, 1rem) 0;
}

.manual__next-step-description {
    color: var(--text-secondary, #6b7280);
    line-height: 1.6;
    margin-bottom: var(--space-4, 1rem);
}

.manual__next-step-btn {
    width: 100%;
}

/* 記事フッター */
.manual__article-footer {
    background: var(--bg-secondary, #ffffff);
    border-radius: var(--radius-xl, 1rem);
    padding: var(--space-6, 2rem);
    margin-top: var(--space-8, 3rem);
    box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
    border: 1px solid var(--shadow-dark, rgba(0, 0, 0, 0.1));
    text-align: center;
}

.manual__article-actions {
    display: flex;
    justify-content: center;
    gap: var(--space-4, 1rem);
    margin-bottom: var(--space-6, 2rem);
}

.manual__feedback {
    border-top: 1px solid var(--shadow-dark, rgba(0, 0, 0, 0.1));
    padding-top: var(--space-6, 2rem);
}

.manual__feedback-title {
    font-size: var(--text-lg, 1.125rem);
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    margin: 0 0 var(--space-4, 1rem) 0;
}

.manual__feedback-buttons {
    display: flex;
    justify-content: center;
    gap: var(--space-3, 1rem);
}

.manual__feedback-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
    padding: var(--space-3, 1rem) var(--space-4, 1rem);
    border: 2px solid transparent;
    border-radius: var(--radius-lg, 0.75rem);
    background: var(--bg-primary, #f9fafb);
    color: var(--text-secondary, #6b7280);
    cursor: pointer;
    transition: var(--transition, all 0.3s ease);
    font-weight: 500;
}

.manual__feedback-btn:hover {
    transform: translateY(-2px);
}

.manual__feedback-btn--good:hover {
    border-color: var(--manual-success, #10b981);
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
    color: var(--manual-success, #10b981);
}

.manual__feedback-btn--bad:hover {
    border-color: var(--manual-danger, #ef4444);
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
    color: var(--manual-danger, #ef4444);
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
    .manual__overview-meta {
        flex-direction: column;
        gap: var(--space-3, 1rem);
    }
    
    .manual__card-grid {
        grid-template-columns: 1fr;
    }
    
    .manual__step {
        flex-direction: column;
        text-align: center;
    }
    
    .manual__step-number {
        margin-bottom: var(--space-3, 1rem);
    }
    
    .manual__input-example {
        flex-direction: column;
        align-items: stretch;
        gap: var(--space-2, 0.5rem);
    }
    
    .manual__input-label {
        min-width: auto;
    }
    
    .manual__category-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .manual__article-actions {
        flex-direction: column;
    }
    
    .manual__feedback-buttons {
        flex-direction: column;
    }
}

@media (max-width: 480px) {
    .manual__category-grid {
        grid-template-columns: 1fr;
    }
}
</style>

<!-- JavaScript（FAQ機能） -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    // FAQ アコーディオン機能
    const faqToggles = document.querySelectorAll('.manual__faq-toggle');
    faqToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const faqItem = this.closest('.manual__faq-item');
            const answer = faqItem.querySelector('.manual__faq-answer');
            const icon = this.querySelector('i');
            
            if (faqItem.classList.contains('manual__faq-item--open')) {
                faqItem.classList.remove('manual__faq-item--open');
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            } else {
                // 他のFAQを閉じる
                document.querySelectorAll('.manual__faq-item--open').forEach(openItem => {
                    if (openItem !== faqItem) {
                        openItem.classList.remove('manual__faq-item--open');
                        const openIcon = openItem.querySelector('.manual__faq-toggle i');
                        if (openIcon) {
                            openIcon.classList.remove('fa-chevron-up');
                            openIcon.classList.add('fa-chevron-down');
                        }
                    }
                });
                
                faqItem.classList.add('manual__faq-item--open');
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            }
        });
    });
    
    // フィードバックボタン
    const feedbackButtons = document.querySelectorAll('.manual__feedback-btn');
    feedbackButtons.forEach(button => {
        button.addEventListener('click', function() {
            const isGood = this.classList.contains('manual__feedback-btn--good');
            const message = isGood ? 'フィードバックありがとうございます！' : 'ご意見をお聞かせいただき、ありがとうございます。改善に努めます。';
            
            alert(message);
            
            // 選択状態を表示
            feedbackButtons.forEach(btn => btn.style.opacity = '0.5');
            this.style.opacity = '1';
            this.style.transform = 'scale(1.05)';
        });
    });
    
    console.log('記帳マニュアル初期化完了');
});
</script>