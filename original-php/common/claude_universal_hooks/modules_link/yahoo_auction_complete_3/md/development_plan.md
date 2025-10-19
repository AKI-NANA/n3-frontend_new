# 🚀 マルチモールeBay出品管理システム - 包括的開発計画書

## 📋 プロジェクト概要
**目的**: Yahoo!オークション等からの商品データ取得→価格計算→フィルター→eBay出品までの完全自動化

---

## 🎯 Phase 1: UI基盤とデータ構造改修 (1-2週間)

### 1.1 テーブル表示の最適化
- ✅ **モーダルサイズ固定**: 全タブで統一サイズ (1200x800px)
- ✅ **行高さ圧縮**: 画像上下余白最小化で35px行高さ実現
- ✅ **外枠余白削除**: 三重枠を単一枠に変更
- ✅ **色分けアイコン**: モール別識別 (Yahoo=赤、メルカリ=青、楽天=緑)
- ✅ **日本語ステータス**: 英語ステータスを日本語化
- ✅ **URLボタン化**: リンクをクリック可能ボタンに変更
- ✅ **販売形式表示**: オークション/即決の明確化

### 1.2 必須データフィールド追加
**新規追加項目**:
```javascript
cost_price_jpy: '仕入価格(円)',
domestic_shipping_jpy: '国内送料(円)', 
exchange_rate: '為替レート',
profit_margin: '利益率(%)',
calculated_price_usd: '計算価格(USD)',
source_platform: '取得元モール',
source_listing_type: '販売形式',
mall_category: '元カテゴリ'
```

### 1.3 eBay出品フィールド完全実装
- **必須項目**: title_en, category_id, condition_id等 (15項目)
- **推奨項目**: description_en, gallery_plus等 (10項目) 
- **配送設定**: shipping_type, handling_time等 (7項目)
- **商品属性**: brand, model, color等 (9項目)

---

## 🎯 Phase 2: 自動価格計算システム (1週間)

### 2.1 価格計算エンジン
```javascript
// 自動価格計算式
final_price_usd = (
    (cost_price_jpy + domestic_shipping_jpy) * exchange_rate * 
    (1 + ebay_fee_rate + paypal_fee_rate + profit_margin_rate)
) / 100
```

### 2.2 為替レート自動取得
- **API**: 無料為替レートAPI (exchangerate-api.com)
- **更新頻度**: 1時間毎
- **キャッシュ**: Redis/ローカルファイル

### 2.3 手数料計算
- **eBay手数料**: カテゴリ別 (8-15%)
- **PayPal手数料**: 4.1% + 40円
- **国際送料**: 重量・サイズ別計算

---

## 🎯 Phase 3: フィルター管理システム (1週間)

### 3.1 禁止商品フィルター
**フィルター種類**:
```javascript
prohibited_filters: [
    'ブランド品コピー', 'アダルト商品', '医療機器',
    '食品・化粧品', '著作権侵害', '危険物質'
],
price_filters: {
    min_profit_margin: 20,      // 最低利益率20%
    max_cost_price: 50000,      // 最大仕入価格5万円
    min_expected_price: 10      // 最低販売価格10ドル
},
competition_filters: {
    max_similar_listings: 100,  // 類似出品数100件以下
    min_sold_history: 5         // 過去90日販売実績5件以上
}
```

### 3.2 eBay類似商品チェック
- **Finding API**: 類似商品検索
- **Sold Listings**: 販売実績確認
- **Competition Score**: 競合度算出

---

## 🎯 Phase 4: CSV管理システム (3日)

### 4.1 CSVアップロード機能
- **ドラッグ&ドロップ**: CSVファイル一括アップロード
- **データ検証**: フィールド整合性チェック
- **エラー表示**: 不正データ詳細レポート
- **プレビュー**: アップロード前データ確認

### 4.2 CSV出力機能
- **eBay出品用CSV**: Trading API準拠形式
- **在庫管理CSV**: 定期更新用簡易形式
- **売上レポートCSV**: 分析用詳細データ

---

## 🎯 Phase 5: 在庫管理自動化システム (2週間)

### 5.1 技術スタック選定

#### 🔧 **推奨技術**: Node.js + Puppeteer + Cron
**理由**:
- MacBook Pro M1/M2で最適なパフォーマンス
- メモリ使用量: 100MB以下/1000商品
- CPU使用率: 平均5%以下
- 同時処理: 10スレッド並行

#### 📊 **処理能力**:
- **最大管理商品数**: 10,000商品
- **全商品チェック時間**: 2-4時間
- **差分チェック**: 30分毎
- **価格変動検知**: リアルタイム更新

### 5.2 在庫チェック実装

**軽量スクレイピング設計**:
```javascript
// 価格・在庫のみ高速チェック
const quickCheck = async (productUrls) => {
  return await Promise.all(
    productUrls.map(async (url) => ({
      url,
      price: await getPrice(url),      // 価格のみ取得
      inStock: await checkStock(url),  // 在庫状況のみ
      lastCheck: new Date()
    }))
  );
};
```

### 5.3 スケジューリング戦略

**段階的チェック**:
- **Tier 1** (高利益商品): 15分毎
- **Tier 2** (中利益商品): 1時間毎  
- **Tier 3** (低利益商品): 4時間毎
- **全体チェック**: 深夜2-6時

**負荷分散**:
- **時差実行**: 商品をランダム順で処理
- **Request限制**: 1サイト当たり毎分10リクエスト
- **エラーハンドリング**: 3回リトライ→24時間待機

---

## 🎯 Phase 6: eBay出品自動化 (1週間)

### 6.1 Trading API統合
- **AddFixedPriceItem**: 即決価格出品
- **AddItem**: オークション出品  
- **ReviseFixedPriceItem**: 価格・在庫更新
- **EndFixedPriceItem**: 出品終了

### 6.2 出品データ検証
```javascript
const listingValidation = {
  required_fields: ['title', 'category', 'price', 'quantity'],
  image_requirements: { min: 1, max: 12, size: '1600x1600px' },
  title_optimization: { length: '60-80文字', keywords: true },
  description_template: 'HTML自動生成'
};
```

---

## 🎯 Phase 7: システム統合とテスト (1週間)

### 7.1 ワークフロー自動化
```
1. スクレイピング実行 → 
2. 価格自動計算 → 
3. フィルター適用 → 
4. eBay項目生成 → 
5. 出品データ準備完了
```

### 7.2 監視とログ
- **処理状況ダッシュボード**: リアルタイム進捗表示
- **エラーアラート**: Slack/Discord通知
- **売上分析**: 日次/週次/月次レポート

---

## 💻 開発分担提案

### 👨‍💻 **あなた**: UI/UX、フロントエンド
- テーブル表示最適化
- モーダル・タブ機能
- CSV アップロード画面
- ダッシュボード作成

### 🤖 **Gemini**: バックエンド、自動化
- 価格計算エンジン
- フィルターシステム  
- 在庫管理スクレイピング
- eBay API統合

### 🔧 **Claude**: システム設計、統合
- データベース設計
- API設計・統合
- エラーハンドリング
- テスト・デバッグ

---

## 📈 予想される技術的課題と解決策

### 🚨 **課題1**: 大量データ処理によるMac負荷
**解決策**: 
- Node.js Worker Threads活用
- メモリ使用量制限 (最大2GB)
- 処理優先度調整

### 🚨 **課題2**: eBay API制限 (5,000 calls/day)
**解決策**:
- バッチ処理での効率化
- キャッシュ戦略
- 複数開発者アカウント

### 🚨 **課題3**: Yahoo!アンチスクレイピング対策
**解決策**:
- Residential Proxy使用
- User-Agent rotation
- 自然な操作間隔

---

## ⏱️ 開発スケジュール (合計6-8週間)

| Week | Phase | 担当 | 成果物 |
|------|-------|------|--------|
| 1-2 | UI基盤改修 | あなた + Claude | 最適化テーブル |
| 3 | 価格計算システム | Gemini + Claude | 自動価格算出 |
| 4 | フィルター管理 | Gemini | 禁止商品除外 |
| 4 | CSV管理 | あなた | アップロード機能 |
| 5-6 | 在庫管理自動化 | Gemini + Claude | スクレイピング |
| 7 | eBay出品統合 | Gemini + Claude | Trading API |
| 8 | 統合テスト | 全員 | 完成システム |

この計画で進めますか？まず **Phase 1** のUI改修から始めましょうか？
