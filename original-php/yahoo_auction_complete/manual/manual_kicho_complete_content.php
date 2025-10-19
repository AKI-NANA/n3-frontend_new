<?php
/**
 * NAGANO-3 記帳ツール完全ガイド - マネーフォワード連携版
 * 実際の使い方を順番に詳細解説
 * 
 * @package NAGANO-3
 * @subpackage Manual
 * @version 1.0.0
 */

// セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    die('直接アクセス禁止');
}

$page_title = '記帳ツール完全ガイド - マネーフォワード連携版';
?>

<!-- 実用的記帳マニュアル専用CSS -->
<style>
/* ===== 実用的記帳マニュアル専用スタイル ===== */

.manual__practical-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--space-4, 1rem);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background: var(--bg-primary, #f9fafb);
    min-height: 100vh;
}

/* 実用ヘッダー */
.manual__practical-header {
    background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%);
    color: white;
    border-radius: var(--radius-xl, 1rem);
    padding: var(--space-6, 2rem);
    margin-bottom: var(--space-6, 2rem);
    text-align: center;
    box-shadow: 0 10px 30px rgba(30, 64, 175, 0.3);
}

.manual__practical-title {
    font-size: 2rem;
    margin-bottom: var(--space-3, 1rem);
    font-weight: 700;
}

.manual__practical-subtitle {
    font-size: var(--text-lg, 1.125rem);
    opacity: 0.9;
    margin: 0;
}

/* プロセスステップ */
.manual__process-overview {
    background: white;
    border-radius: var(--radius-xl, 1rem);
    padding: var(--space-6, 2rem);
    margin-bottom: var(--space-6, 2rem);
    box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
}

.manual__process-flow {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4, 1rem);
    margin: var(--space-6, 2rem) 0;
}

.manual__process-step {
    text-align: center;
    position: relative;
}

.manual__process-step::after {
    content: '→';
    position: absolute;
    right: -20px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 2rem;
    color: var(--accent-blue, #3b82f6);
    font-weight: bold;
}

.manual__process-step:last-child::after {
    display: none;
}

.manual__process-icon {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    margin: 0 auto var(--space-3, 1rem);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.manual__process-title {
    font-size: var(--text-lg, 1.125rem);
    font-weight: 600;
    margin-bottom: var(--space-2, 0.5rem);
    color: var(--text-primary, #1f2937);
}

.manual__process-desc {
    font-size: var(--text-sm, 0.875rem);
    color: var(--text-secondary, #6b7280);
    margin: 0;
}

/* セクション */
.manual__section {
    background: white;
    border-radius: var(--radius-xl, 1rem);
    padding: var(--space-6, 2rem);
    margin-bottom: var(--space-6, 2rem);
    box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
}

.manual__section-header {
    display: flex;
    align-items: center;
    gap: var(--space-3, 1rem);
    margin-bottom: var(--space-6, 2rem);
    padding-bottom: var(--space-4, 1rem);
    border-bottom: 2px solid var(--bg-primary, #f9fafb);
}

.manual__section-number {
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-xl, 1.25rem);
    font-weight: 700;
    flex-shrink: 0;
}

.manual__section-title {
    font-size: var(--text-2xl, 1.5rem);
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    margin: 0;
}

/* ステップ詳細 */
.manual__steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-6, 2rem);
}

.manual__step {
    border-left: 4px solid var(--accent-blue, #3b82f6);
    padding-left: var(--space-4, 1rem);
    background: var(--bg-secondary, #f8fafc);
    border-radius: 0 var(--radius-lg, 0.75rem) var(--radius-lg, 0.75rem) 0;
    padding: var(--space-4, 1rem);
}

.manual__step-title {
    font-size: var(--text-lg, 1.125rem);
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    margin-bottom: var(--space-3, 1rem);
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
}

.manual__step-icon {
    color: var(--accent-blue, #3b82f6);
}

.manual__step-content {
    line-height: 1.6;
    color: var(--text-secondary, #6b7280);
}

/* 画面デモ */
.manual__screen-demo {
    background: #1e293b;
    border-radius: var(--radius-lg, 0.75rem);
    padding: var(--space-4, 1rem);
    margin: var(--space-4, 1rem) 0;
    color: white;
    font-family: 'Courier New', monospace;
    overflow-x: auto;
}

.manual__screen-header {
    background: #374151;
    margin: calc(-1rem) calc(-1rem) 1rem calc(-1rem);
    padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
    border-radius: var(--radius-lg, 0.75rem) var(--radius-lg, 0.75rem) 0 0;
    font-weight: 600;
}

.manual__data-table {
    width: 100%;
    border-collapse: collapse;
    margin: var(--space-4, 1rem) 0;
    background: white;
    border-radius: var(--radius-md, 0.5rem);
    overflow: hidden;
    box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.1));
}

.manual__data-table th {
    background: var(--accent-blue, #3b82f6);
    color: white;
    padding: var(--space-3, 1rem);
    text-align: left;
    font-weight: 600;
}

.manual__data-table td {
    padding: var(--space-3, 1rem);
    border-bottom: 1px solid var(--bg-primary, #f9fafb);
    color: var(--text-primary, #1f2937);
}

.manual__data-table tr:hover {
    background: var(--bg-hover, #f3f4f6);
}

/* 重要な注意点 */
.manual__important {
    background: linear-gradient(135deg, #fef3c7, #fed7aa);
    border: 2px solid #f59e0b;
    border-radius: var(--radius-lg, 0.75rem);
    padding: var(--space-4, 1rem);
    margin: var(--space-4, 1rem) 0;
}

.manual__important-title {
    font-size: var(--text-lg, 1.125rem);
    font-weight: 600;
    color: #92400e;
    margin-bottom: var(--space-2, 0.5rem);
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
}

.manual__important-content {
    color: #78350f;
    line-height: 1.6;
    margin: 0;
}

/* 警告ボックス */
.manual__warning {
    background: linear-gradient(135deg, #fecaca, #fca5a5);
    border: 2px solid #ef4444;
    border-radius: var(--radius-lg, 0.75rem);
    padding: var(--space-4, 1rem);
    margin: var(--space-4, 1rem) 0;
}

.manual__warning-title {
    font-size: var(--text-lg, 1.125rem);
    font-weight: 600;
    color: #991b1b;
    margin-bottom: var(--space-2, 0.5rem);
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
}

.manual__warning-content {
    color: #7f1d1d;
    line-height: 1.6;
    margin: 0;
}

/* 成功ボックス */
.manual__success {
    background: linear-gradient(135deg, #bbf7d0, #86efac);
    border: 2px solid #10b981;
    border-radius: var(--radius-lg, 0.75rem);
    padding: var(--space-4, 1rem);
    margin: var(--space-4, 1rem) 0;
}

.manual__success-title {
    font-size: var(--text-lg, 1.125rem);
    font-weight: 600;
    color: #065f46;
    margin-bottom: var(--space-2, 0.5rem);
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
}

.manual__success-content {
    color: #064e3b;
    line-height: 1.6;
    margin: 0;
}

/* 設定画面デモ */
.manual__config-demo {
    background: var(--bg-secondary, #f8fafc);
    border: 1px solid var(--shadow-dark, rgba(0, 0, 0, 0.1));
    border-radius: var(--radius-lg, 0.75rem);
    padding: var(--space-4, 1rem);
    margin: var(--space-4, 1rem) 0;
}

.manual__config-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2, 0.5rem) 0;
    border-bottom: 1px solid var(--shadow-dark, rgba(0, 0, 0, 0.1));
}

.manual__config-item:last-child {
    border-bottom: none;
}

.manual__config-label {
    font-weight: 500;
    color: var(--text-primary, #1f2937);
}

.manual__config-value {
    font-size: var(--text-sm, 0.875rem);
    color: var(--text-secondary, #6b7280);
    background: white;
    padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
    border: 1px solid var(--shadow-dark, rgba(0, 0, 0, 0.1));
    border-radius: var(--radius-sm, 0.375rem);
}

/* レスポンシブ対応 */
@media (max-width: 1024px) {
    .manual__process-flow {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .manual__process-step::after {
        display: none;
    }
}

@media (max-width: 768px) {
    .manual__practical-container {
        padding: var(--space-3, 0.75rem);
    }
    
    .manual__practical-header {
        padding: var(--space-4, 1rem);
    }
    
    .manual__practical-title {
        font-size: 1.5rem;
    }
    
    .manual__process-flow {
        grid-template-columns: 1fr;
    }
    
    .manual__section {
        padding: var(--space-4, 1rem);
    }
    
    .manual__section-header {
        flex-direction: column;
        text-align: center;
    }
    
    .manual__data-table {
        font-size: var(--text-sm, 0.875rem);
    }
    
    .manual__data-table th,
    .manual__data-table td {
        padding: var(--space-2, 0.5rem);
    }
}
</style>

<!-- 実用的記帳マニュアル -->
<div class="manual__practical-container">
    
    <!-- ヘッダー -->
    <div class="manual__practical-header">
        <h1 class="manual__practical-title">
            💼 記帳ツール完全ガイド
        </h1>
        <p class="manual__practical-subtitle">
            マネーフォワードクラウド連携から自動仕訳まで、実際の使い方を順番に詳細解説
        </p>
    </div>

    <!-- プロセス全体概要 -->
    <div class="manual__process-overview">
        <h2 style="text-align: center; margin-bottom: 2rem; color: var(--text-primary, #1f2937);">
            🔄 記帳自動化の流れ
        </h2>
        
        <div class="manual__process-flow">
            <div class="manual__process-step">
                <div class="manual__process-icon">🏦</div>
                <h3 class="manual__process-title">1. データ取得</h3>
                <p class="manual__process-desc">マネーフォワードクラウドから取引データを自動取得</p>
            </div>
            
            <div class="manual__process-step">
                <div class="manual__process-icon">🤖</div>
                <h3 class="manual__process-title">2. AI自動仕訳</h3>
                <p class="manual__process-desc">AIが取引内容を分析して勘定科目を自動推定</p>
            </div>
            
            <div class="manual__process-step">
                <div class="manual__process-icon">👁️</div>
                <h3 class="manual__process-title">3. 人間確認</h3>
                <p class="manual__process-desc">推定結果を確認し、必要に応じて修正</p>
            </div>
            
            <div class="manual__process-step">
                <div class="manual__process-icon">📝</div>
                <h3 class="manual__process-title">4. 自動記帳</h3>
                <p class="manual__process-desc">確認済みデータをマネーフォワードに自動送信</p>
            </div>
        </div>
    </div>

    <!-- 1. 初期設定 -->
    <div class="manual__section">
        <div class="manual__section-header">
            <div class="manual__section-number">1</div>
            <h2 class="manual__section-title">初期設定：マネーフォワードクラウドとの連携</h2>
        </div>
        
        <div class="manual__steps">
            <div class="manual__step">
                <h3 class="manual__step-title">
                    <i class="manual__step-icon fas fa-key"></i>
                    API認証設定
                </h3>
                <div class="manual__step-content">
                    <p><strong>まず最初に、マネーフォワードクラウドのAPIキーを設定する必要があります。</strong></p>
                    
                    <ol style="margin: 1rem 0;">
                        <li>マネーフォワードクラウドにログイン</li>
                        <li>「設定」→「API連携」→「新しいアプリケーション」を選択</li>
                        <li>アプリケーション名：「NAGANO-3記帳システム」</li>
                        <li>リダイレクトURL：「http://localhost:8000/api/mf/callback」</li>
                        <li>取得したClient IDとClient Secretをシステムに設定</li>
                    </ol>
                    
                    <div class="manual__config-demo">
                        <div class="manual__config-item">
                            <span class="manual__config-label">Client ID</span>
                            <input type="text" class="manual__config-value" placeholder="abcd1234efgh5678..." readonly>
                        </div>
                        <div class="manual__config-item">
                            <span class="manual__config-label">Client Secret</span>
                            <input type="password" class="manual__config-value" placeholder="********" readonly>
                        </div>
                        <div class="manual__config-item">
                            <span class="manual__config-label">接続状況</span>
                            <span class="manual__config-value" style="background: #dcfce7; color: #065f46;">✅ 接続済み</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="manual__step">
                <h3 class="manual__step-title">
                    <i class="manual__step-icon fas fa-university"></i>
                    会計年度・勘定科目設定
                </h3>
                <div class="manual__step-content">
                    <p>マネーフォワードクラウドから勘定科目一覧を取得し、AIに学習させます。</p>
                    
                    <div class="manual__screen-demo">
                        <div class="manual__screen-header">💼 設定 > 勘定科目同期</div>
                        <div>
                        [同期開始] ボタンをクリック<br>
                        > マネーフォワードから勘定科目を取得中...<br>
                        > 100件の勘定科目を取得しました<br>
                        > AIシステムに学習データとして登録完了<br>
                        <span style="color: #10b981;">✅ 同期完了</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="manual__important">
            <div class="manual__important-title">
                <i class="fas fa-exclamation-triangle"></i>
                重要な注意点
            </div>
            <div class="manual__important-content">
                初期設定は一度だけ行えばOKです。APIキーは安全に保管し、他人に教えないでください。
            </div>
        </div>
    </div>

    <!-- 2. データ取得 -->
    <div class="manual__section">
        <div class="manual__section-header">
            <div class="manual__section-number">2</div>
            <h2 class="manual__section-title">取引データの自動取得</h2>
        </div>
        
        <div class="manual__steps">
            <div class="manual__step">
                <h3 class="manual__step-title">
                    <i class="manual__step-icon fas fa-download"></i>
                    自動データ取得の仕組み
                </h3>
                <div class="manual__step-content">
                    <p><strong>システムは1時間ごとに自動でマネーフォワードクラウドから新しい取引データを取得します。</strong></p>
                    
                    <div class="manual__data-table">
                        <table style="width: 100%;">
                            <thead>
                                <tr>
                                    <th>取得内容</th>
                                    <th>頻度</th>
                                    <th>対象期間</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>未記帳の取引</td>
                                    <td>1時間ごと</td>
                                    <td>過去7日間</td>
                                </tr>
                                <tr>
                                    <td>仕訳済み取引（確認用）</td>
                                    <td>1日1回</td>
                                    <td>当月分</td>
                                </tr>
                                <tr>
                                    <td>勘定科目マスタ</td>
                                    <td>1週間1回</td>
                                    <td>全て</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="manual__step">
                <h3 class="manual__step-title">
                    <i class="manual__step-icon fas fa-sync-alt"></i>
                    手動でデータ取得する方法
                </h3>
                <div class="manual__step-content">
                    <p>急ぎで最新データが必要な場合は、手動でデータ取得できます。</p>
                    
                    <ol style="margin: 1rem 0;">
                        <li>記帳ツールのダッシュボードを開く</li>
                        <li>右上の「手動同期実行」ボタンをクリック</li>
                        <li>「最新データを取得しますか？」で「はい」をクリック</li>
                        <li>取得完了まで1-2分程度お待ちください</li>
                    </ol>
                    
                    <div class="manual__screen-demo">
                        <div class="manual__screen-header">🔄 手動同期実行</div>
                        <div>
                        > マネーフォワードクラウドに接続中...<br>
                        > 新しい取引 15件を発見<br>
                        > データベースに保存中...<br>
                        > AI分析を開始しています...<br>
                        <span style="color: #10b981;">✅ 同期完了: 15件の新規取引を処理しました</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 3. AI自動仕訳 -->
    <div class="manual__section">
        <div class="manual__section-header">
            <div class="manual__section-number">3</div>
            <h2 class="manual__section-title">AI自動仕訳：勘定科目の自動推定</h2>
        </div>
        
        <div class="manual__steps">
            <div class="manual__step">
                <h3 class="manual__step-title">
                    <i class="manual__step-icon fas fa-brain"></i>
                    AIがどのように判断するか
                </h3>
                <div class="manual__step-content">
                    <p><strong>AIは取引の詳細情報から適切な勘定科目を推定します。</strong></p>
                    
                    <div class="manual__data-table">
                        <table style="width: 100%;">
                            <thead>
                                <tr>
                                    <th>取引例</th>
                                    <th>AI判断</th>
                                    <th>信頼度</th>
                                    <th>理由</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Amazon決済 50,000円入金</td>
                                    <td>売上高</td>
                                    <td><span style="color: #10b981;">95%</span></td>
                                    <td>「Amazon」「入金」から売上と判定</td>
                                </tr>
                                <tr>
                                    <td>コンビニ 1,200円支出</td>
                                    <td>仕入高</td>
                                    <td><span style="color: #f59e0b;">78%</span></td>
                                    <td>「コンビニ」から商品仕入れと推定</td>
                                </tr>
                                <tr>
                                    <td>JR東日本 840円支出</td>
                                    <td>旅費交通費</td>
                                    <td><span style="color: #10b981;">98%</span></td>
                                    <td>「JR」から交通費と確実判定</td>
                                </tr>
                                <tr>
                                    <td>○○事務所 25,000円支出</td>
                                    <td>支払手数料</td>
                                    <td><span style="color: #ef4444;">45%</span></td>
                                    <td>詳細不明のため推定困難</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="manual__step">
                <h3 class="manual__step-title">
                    <i class="manual__step-icon fas fa-cogs"></i>
                    信頼度による自動処理
                </h3>
                <div class="manual__step-content">
                    <p>AIの判断信頼度に応じて、自動処理レベルが変わります。</p>
                    
                    <div class="manual__success">
                        <div class="manual__success-title">
                            <i class="fas fa-check-circle"></i>
                            高信頼度（90%以上）
                        </div>
                        <div class="manual__success-content">
                            <strong>完全自動処理：</strong>人間の確認なしで自動的にマネーフォワードに送信されます。<br>
                            例：Amazon売上、JR交通費、電気代など
                        </div>
                    </div>
                    
                    <div class="manual__important">
                        <div class="manual__important-title">
                            <i class="fas fa-eye"></i>
                            中信頼度（70-89%）
                        </div>
                        <div class="manual__important-content">
                            <strong>確認待ち：</strong>「確認待ち取引」リストに表示され、人間の確認を待ちます。<br>
                            例：コンビニ支出、新しい取引先など
                        </div>
                    </div>
                    
                    <div class="manual__warning">
                        <div class="manual__warning-title">
                            <i class="fas fa-exclamation-triangle"></i>
                            低信頼度（70%未満）
                        </div>
                        <div class="manual__warning-content">
                            <strong>要確認：</strong>必ず人間が内容を確認し、正しい勘定科目を選択する必要があります。<br>
                            例：不明な支出、複雑な取引など
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 4. 確認と修正 -->
    <div class="manual__section">
        <div class="manual__section-header">
            <div class="manual__section-number">4</div>
            <h2 class="manual__section-title">確認待ち取引の確認と修正</h2>
        </div>
        
        <div class="manual__steps">
            <div class="manual__step">
                <h3 class="manual__step-title">
                    <i class="manual__step-icon fas fa-list-check"></i>
                    確認待ちリストの見方
                </h3>
                <div class="manual__step-content">
                    <p><strong>ダッシュボードの「確認待ち取引」セクションで、AI判断結果を確認できます。</strong></p>
                    
                    <div class="manual__screen-demo">
                        <div class="manual__screen-header">💼 確認待ち取引（2件）</div>
                        <div style="background: #374151; margin: 0.5rem 0; padding: 0.5rem; border-radius: 4px;">
                        📅 2024-12-08  💰 ¥45,000<br>
                        📝 事務用品購入 - Amazon Business<br>
                        🤖 AI推定: <span style="color: #60a5fa;">消耗品費</span> ／ <span style="color: #34d399;">普通預金</span> <span style="color: #fbbf24;">信頼度: 82%</span><br>
                        <span style="color: #10b981;">[✓ 承認]</span> <span style="color: #6b7280;">[✏️ 編集]</span>
                        </div>
                        <div style="background: #374151; margin: 0.5rem 0; padding: 0.5rem; border-radius: 4px;">
                        📅 2024-12-07  💰 ¥230,000<br>
                        📝 ○○商事 支払い<br>
                        🤖 AI推定: <span style="color: #60a5fa;">支払手数料</span> ／ <span style="color: #34d399;">普通預金</span> <span style="color: #ef4444;">信頼度: 45%</span><br>
                        <span style="color: #10b981;">[✓ 承認]</span> <span style="color: #6b7280;">[✏️ 編集]</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="manual__step">
                <h3 class="manual__step-title">
                    <i class="manual__step-icon fas fa-check"></i>
                    正しい場合：承認する
                </h3>
                <div class="manual__step-content">
                    <p>AIの判断が正しい場合は、「承認」ボタンをクリックするだけです。</p>
                    
                    <ol style="margin: 1rem 0;">
                        <li>取引内容とAI推定結果を確認</li>
                        <li>「✓ 承認」ボタンをクリック</li>
                        <li>「この仕訳で記帳しますか？」で「はい」をクリック</li>
                        <li>自動的にマネーフォワードクラウドに送信されます</li>
                    </ol>
                    
                    <div class="manual__success">
                        <div class="manual__success-title">
                            <i class="fas fa-thumbs-up"></i>
                            一括承認機能
                        </div>
                        <div class="manual__success-content">
                            信頼度70%以上の取引は「一括承認」ボタンでまとめて承認できます。時間短縮に便利です。
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="manual__step">
                <h3 class="manual__step-title">
                    <i class="manual__step-icon fas fa-edit"></i>
                    間違っている場合：修正する
                </h3>
                <div class="manual__step-content">
                    <p>AIの判断が間違っている場合は、正しい勘定科目に修正します。</p>
                    
                    <ol style="margin: 1rem 0;">
                        <li>「✏️ 編集」ボタンをクリック</li>
                        <li>修正モーダルが開きます</li>
                        <li>正しい借方・貸方勘定科目を選択</li>
                        <li>金額に間違いがないか確認</li>
                        <li>「修正して記帳」ボタンをクリック</li>
                    </ol>
                    
                    <div class="manual__config-demo">
                        <h4 style="margin: 0 0 1rem 0; color: var(--text-primary);">📝 仕訳修正画面</h4>
                        <div class="manual__config-item">
                            <span class="manual__config-label">借方勘定科目</span>
                            <select class="manual__config-value">
                                <option>仕入高</option>
                                <option selected>商品</option>
                                <option>消耗品費</option>
                            </select>
                        </div>
                        <div class="manual__config-item">
                            <span class="manual__config-label">貸方勘定科目</span>
                            <select class="manual__config-value">
                                <option selected>普通預金</option>
                                <option>買掛金</option>
                                <option>現金</option>
                            </select>
                        </div>
                        <div class="manual__config-item">
                            <span class="manual__config-label">金額</span>
                            <input type="text" class="manual__config-value" value="230,000" readonly>
                        </div>
                    </div>
                    
                    <div class="manual__important">
                        <div class="manual__important-title">
                            <i class="fas fa-graduation-cap"></i>
                            AIが学習します
                        </div>
                        <div class="manual__important-content">
                            あなたが修正した内容は、AIの学習データとして蓄積されます。同じような取引が今後出てきた時に、より正確に判断できるようになります。
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 5. 自動記帳 -->
    <div class="manual__section">
        <div class="manual__section-header">
            <div class="manual__section-number">5</div>
            <h2 class="manual__section-title">マネーフォワードクラウドへの自動記帳</h2>
        </div>
        
        <div class="manual__steps">
            <div class="manual__step">
                <h3 class="manual__step-title">
                    <i class="manual__step-icon fas fa-paper-plane"></i>
                    自動送信の仕組み
                </h3>
                <div class="manual__step-content">
                    <p><strong>承認された仕訳は、自動的にマネーフォワードクラウドに送信されます。</strong></p>
                    
                    <div class="manual__screen-demo">
                        <div class="manual__screen-header">📤 マネーフォワードクラウド送信ログ</div>
                        <div>
                        [14:32] 仕訳データ送信開始<br>
                        [14:32] > 取引ID: tx_001 (事務用品購入)<br>
                        [14:32] > 借方: 消耗品費 45,000円<br>
                        [14:32] > 貸方: 普通預金 45,000円<br>
                        [14:33] <span style="color: #10b981;">✅ 送信成功: 仕訳ID MF_240001234</span><br>
                        [14:33] マネーフォワードクラウドで確認可能になりました
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="manual__step">
                <h3 class="manual__step-title">
                    <i class="manual__step-icon fas fa-check-double"></i>
                    記帳結果の確認
                </h3>
                <div class="manual__step-content">
                    <p>送信された仕訳は、マネーフォワードクラウドで確認できます。</p>
                    
                    <ol style="margin: 1rem 0;">
                        <li>マネーフォワードクラウドにログイン</li>
                        <li>「会計」→「仕訳帳」を開く</li>
                        <li>送信された仕訳が表示されていることを確認</li>
                        <li>摘要欄に「[NAGANO-3自動]」と表示されます</li>
                    </ol>
                    
                    <div class="manual__warning">
                        <div class="manual__warning-title">
                            <i class="fas fa-exclamation-triangle"></i>
                            送信エラーが発生した場合
                        </div>
                        <div class="manual__warning-content">
                            ネットワークエラーやAPI制限により送信に失敗した場合は、システムが自動的に再送信を試みます。それでも失敗する場合は、管理者にお問い合わせください。
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 6. 運用のコツ -->
    <div class="manual__section">
        <div class="manual__section-header">
            <div class="manual__section-number">6</div>
            <h2 class="manual__section-title">効率的な運用のコツ</h2>
        </div>
        
        <div class="manual__steps">
            <div class="manual__step">
                <h3 class="manual__step-title">
                    <i class="manual__step-icon fas fa-calendar-check"></i>
                    日次・週次のルーチン
                </h3>
                <div class="manual__step-content">
                    <p><strong>記帳業務を効率化するための推奨ルーチンです。</strong></p>
                    
                    <div class="manual__data-table">
                        <table style="width: 100%;">
                            <thead>
                                <tr>
                                    <th>頻度</th>
                                    <th>作業内容</th>
                                    <th>所要時間</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>毎日</strong></td>
                                    <td>確認待ち取引の承認・修正</td>
                                    <td>5-10分</td>
                                </tr>
                                <tr>
                                    <td><strong>週1回</strong></td>
                                    <td>記帳結果の確認（マネーフォワード）</td>
                                    <td>10-15分</td>
                                </tr>
                                <tr>
                                    <td><strong>月1回</strong></td>
                                    <td>AI学習データの精度確認</td>
                                    <td>20-30分</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="manual__step">
                <h3 class="manual__step-title">
                    <i class="manual__step-icon fas fa-lightbulb"></i>
                    AI精度向上のポイント
                </h3>
                <div class="manual__step-content">
                    <ul style="margin: 1rem 0;">
                        <li><strong>間違いを必ず修正</strong>：AIの判断が間違っていても放置せず、正しく修正する</li>
                        <li><strong>摘要を統一</strong>：同じ取引先は毎回同じ表記にする（例：「Amazon」「amazon」「アマゾン」を統一）</li>
                        <li><strong>新しいパターンを教える</strong>：初回は必ず確認し、正しい勘定科目を選択する</li>
                        <li><strong>定期的な見直し</strong>：月1回程度、自動処理された取引に間違いがないか確認する</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="manual__success">
            <div class="manual__success-title">
                <i class="fas fa-trophy"></i>
                効果的な運用の成果
            </div>
            <div class="manual__success-content">
                <strong>適切に運用すると：</strong><br>
                • 記帳作業時間が80%以上削減<br>
                • 入力ミスが大幅減少<br>
                • リアルタイムでの経営状況把握が可能<br>
                • 税理士との連携もスムーズに
            </div>
        </div>
    </div>

    <!-- トラブルシューティング -->
    <div class="manual__section">
        <div class="manual__section-header">
            <div class="manual__section-number">?</div>
            <h2 class="manual__section-title">よくある質問・トラブルシューティング</h2>
        </div>
        
        <div class="manual__steps">
            <div class="manual__step">
                <h3 class="manual__step-title">
                    <i class="manual__step-icon fas fa-question-circle"></i>
                    Q: データが取得されない
                </h3>
                <div class="manual__step-content">
                    <p><strong>A: 以下を確認してください</strong></p>
                    <ol>
                        <li>マネーフォワードクラウドのAPIキーが正しく設定されているか</li>
                        <li>インターネット接続に問題がないか</li>
                        <li>マネーフォワード側でAPI利用制限がかかっていないか</li>
                        <li>手動同期を試してエラーメッセージを確認</li>
                    </ol>
                </div>
            </div>
            
            <div class="manual__step">
                <h3 class="manual__step-title">
                    <i class="manual__step-icon fas fa-question-circle"></i>
                    Q: AIの判断精度が悪い
                </h3>
                <div class="manual__step-content">
                    <p><strong>A: 学習データを増やしてください</strong></p>
                    <ol>
                        <li>間違った判断は必ず修正する（学習データになります）</li>
                        <li>新しい取引パターンは最初の数回は手動で正しく設定</li>
                        <li>取引の摘要を統一する（「Amazon」「amazon」など表記揺れを避ける）</li>
                        <li>1-2週間継続すると精度が大幅に向上します</li>
                    </ol>
                </div>
            </div>
            
            <div class="manual__step">
                <h3 class="manual__step-title">
                    <i class="manual__step-icon fas fa-question-circle"></i>
                    Q: 記帳データが重複している
                </h3>
                <div class="manual__step-content">
                    <p><strong>A: 重複チェック機能を確認</strong></p>
                    <ol>
                        <li>システムは通常、同一取引の重複を自動で防ぎます</li>
                        <li>マネーフォワード側で手動記帳した分と重複する可能性があります</li>
                        <li>「重複チェック」機能で確認・削除できます</li>
                        <li>今後は手動記帳を避け、すべて自動化することを推奨</li>
                    </ol>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- JavaScript（スムーズスクロール） -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    // セクション番号のクリックでスムーズスクロール
    const sectionNumbers = document.querySelectorAll('.manual__section-number');
    sectionNumbers.forEach((number, index) => {
        number.addEventListener('click', function() {
            const targetSection = document.querySelectorAll('.manual__section')[index];
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    console.log('📖 記帳ツール完全ガイド読み込み完了');
});
</script>