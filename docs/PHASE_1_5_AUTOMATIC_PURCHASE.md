# 🤖 Phase 1.5: 自動購入機能 完全実装ガイド

## 📋 目次

1. [概要](#概要)
2. [実装機能](#実装機能)
3. [セットアップ](#セットアップ)
4. [使用方法](#使用方法)
5. [セキュリティとリスク管理](#セキュリティとリスク管理)
6. [トラブルシューティング](#トラブルシューティング)

---

## 概要

**Phase 1.5** は、Phase 1で構築したP-4/P-1スコアリングシステムに **完全自動購入機能** を追加し、システムを「推奨」から「実行」のレベルへ引き上げます。

### 🎯 目的

- P-4/P-1戦略で選定された高スコア商品を **完全自動で購入**
- 複数Amazonアカウントの **インテリジェントなローテーション**
- **リスク最小化** - アカウント停止リスクを回避
- **完全自動化** - スキャン→購入→FBA納品プランまで

---

## 実装機能

### 1. Puppeteer統合による自動購入エンジン ✅

**実装ファイル:** `lib/arbitrage/execute-payment.ts`

**機能：**
- ヘッドレスブラウザによるAmazon.com購入フロー完全自動化
- ヘッドレスブラウザ検出回避
- 人間らしいマウス操作とランダム待機時間
- 価格確認と在庫チェック
- 自動ログイン（2FA対応準備済み）
- 注文確認情報の自動抽出

**セキュリティ対策：**
```typescript
// ヘッドレス検出回避
Object.defineProperty(navigator, 'webdriver', { get: () => false })

// ランダム待機時間（1-3秒）
await this.randomDelay(1000, 3000)

// 人間らしいマウス移動
await this.page.mouse.move(x, y, { steps: 10 })
```

---

### 2. 複数アカウント管理システム ✅

**実装ファイル:** `lib/arbitrage/account-manager.ts`

**機能：**
- アカウントプール管理
- リスクスコア計算（0-100）
- クールダウン期間の自動管理
- プロキシローテーション
- 使用頻度追跡（日次・週次）
- アカウントヘルスチェック

**リスクスコアロジック：**
```typescript
リスクスコア計算:
- 購入成功: -2点
- 購入失敗: +10点
- 1日5回以上購入: +5点
- 1週20回以上購入: +10点

クールダウン期間:
- 0-19点: 1時間
- 20-39点: 2時間
- 40-59点: 4時間
- 60-79点: 8時間
- 80-100点: 24時間
```

---

### 3. 決済処理システム ✅

**実装ファイル:** `lib/arbitrage/payment-processor.ts`

**機能：**
- 暗号化されたカード情報管理
- カードプール管理
- 日次・月次限度額管理
- リトライロジック（最大3回）
- 不正検知システム
- トランザクション記録

**セキュリティ：**
- AES-256-GCM暗号化
- PCI-DSS準拠のベストプラクティス
- カード情報はメモリ上にのみ保持
- 環境変数で暗号化キー管理

---

### 4. メール解析サービス ✅

**実装ファイル:** `lib/arbitrage/email-parser.ts`

**機能：**
- Amazon注文確認メールの自動解析
- 発送通知メールの自動解析
- 注文番号・追跡番号・配送予定日の自動抽出
- arbitrage_purchasesテーブルの自動更新
- Gmail API統合準備完了

**抽出情報：**
- 注文番号（Order ID）
- 注文日
- 注文合計金額
- 商品情報（ASIN、タイトル、数量、価格）
- 配送先住所
- 追跡番号
- 配送業者
- 配送予定日

---

### 5. 統合自動化フロー ✅

**更新ファイル:** `lib/services/domestic-fba-arbitrage.ts`

**完全自動化フロー：**

```
1. スキャン
   ↓
2. P-4/P-1スコア計算
   ↓
3. 最適アカウント選択
   ↓
4. 自動購入実行（Puppeteer）
   ↓
5. 購入成功→DB更新
   ↓
6. アカウント使用記録更新
   ↓
7. メール監視（注文確認・発送通知）
   ↓
8. 追跡番号取得→FBA納品プラン更新
```

---

## セットアップ

### 1. 依存関係のインストール

```bash
npm install puppeteer
```

### 2. 環境変数設定

`.env.local` に以下を追加：

```bash
# 決済情報暗号化キー（32バイトのHEX文字列）
PAYMENT_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Gmail API（メール解析用・オプション）
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
```

### 3. データベースマイグレーション

```bash
psql -h your_db_host -U your_user -d your_db -f migrations/add_phase_1_5_tables.sql
```

**作成されるテーブル：**
- `amazon_accounts` - Amazonアカウント管理
- `payment_methods` - 決済方法管理
- `proxy_pool` - プロキシプール
- `amazon_account_usage_log` - アカウント使用履歴
- `payment_transactions` - 決済トランザクション
- `order_emails` - 注文メール情報

### 4. Amazonアカウント登録

```sql
INSERT INTO amazon_accounts (email, password, marketplace, is_active, risk_score)
VALUES ('your_amazon_email@example.com', 'encrypted_password', 'US', TRUE, 0);
```

**重要：** パスワードは暗号化して保存してください。

### 5. 決済方法登録

```sql
INSERT INTO payment_methods (
  account_id,
  card_type,
  card_last4,
  card_exp_month,
  card_exp_year,
  billing_address,
  daily_limit,
  monthly_limit
)
VALUES (
  'account_id_from_amazon_accounts',
  'visa',
  '1234',
  12,
  2025,
  '{"name": "John Doe", "addressLine1": "123 Main St", "city": "New York", "state": "NY", "postalCode": "10001", "country": "US"}',
  1000.00,
  10000.00
);
```

---

## 使用方法

### 自動購入有効化

```bash
curl -X POST http://localhost:3000/api/arbitrage/automate \
  -H "Content-Type: application/json" \
  -d '{
    "marketplace": "US",
    "minScore": 70,
    "maxItems": 5,
    "enableAutoPurchase": true,
    "shipFromAddress": {
      "name": "Your Name",
      "addressLine1": "123 Main St",
      "city": "New York",
      "stateOrProvinceCode": "NY",
      "postalCode": "10001",
      "countryCode": "US"
    }
  }'
```

**パラメータ：**
- `enableAutoPurchase: true` - **Phase 1.5新機能**（自動購入を有効化）
- `enableAutoPurchase: false` または省略 - 手動購入モード（Phase 1互換）

---

### レスポンス例（自動購入有効時）

```json
{
  "success": true,
  "message": "Successfully purchased 4 out of 5 items",
  "opportunities": [...],
  "purchases": [
    {
      "success": true,
      "purchaseId": "uuid-xxx",
      "orderId": "123-4567890-1234567"
    },
    ...
  ],
  "successfulPurchases": [
    {
      "orderId": "123-4567890-1234567",
      "asin": "B0XXXXXXXX",
      "amount": 29.99
    }
  ],
  "nextSteps": [
    "1. ✅ 自動購入完了 - 注文確認メールを確認",
    "2. 配送完了後、FBA納品プラン作成",
    "3. 商品をFBA倉庫へ発送"
  ]
}
```

---

## セキュリティとリスク管理

### 1. アカウント停止リスクの最小化

**実装された対策：**

✅ **クールダウン期間**
- リスクスコアに応じて1-24時間の自動クールダウン
- 連続購入を防止

✅ **使用頻度制限**
- 日次: 最大5回
- 週次: 最大20回
- 月次: 決済限度額による制御

✅ **プロキシローテーション**
- IPアドレスの自動切り替え
- residential/datacenter/mobileプロキシ対応

✅ **人間らしい操作**
- ランダム待機時間（1-3秒）
- マウス移動のアニメーション
- ヘッドレスブラウザ検出回避

---

### 2. 決済セキュリティ

**実装された対策：**

✅ **暗号化**
- AES-256-GCM暗号化
- 暗号化キーは環境変数で管理
- カード情報はメモリ上にのみ保持

✅ **限度額管理**
- 日次限度額
- 月次限度額
- 自動リセット

✅ **不正検知**
- 短時間内の複数取引検知
- 高額取引の自動フラグ
- 異常な時間帯の検知

---

### 3. モニタリングとアラート

**実装されたログ：**

✅ **アカウント使用履歴**
- 全ての使用記録を保存
- リスクスコア変動の追跡

✅ **決済トランザクション**
- 全ての決済を記録
- 成功/失敗の追跡

✅ **実行ログ**
- 自動化フローの全ステップを記録
- エラー詳細の保存

---

## トラブルシューティング

### 問題1: 購入が失敗する

**原因：**
- アカウントがクールダウン中
- 決済限度額超過
- 価格が変動した

**解決策：**
```bash
# アカウントヘルスチェック
SELECT * FROM amazon_accounts WHERE is_active = TRUE;

# リスクスコア確認
SELECT email, risk_score, cooldown_until FROM amazon_accounts;

# クールダウン期間をリセット（慎重に！）
UPDATE amazon_accounts SET cooldown_until = NULL WHERE id = 'account_id';
```

---

### 問題2: ヘッドレスブラウザが検出される

**原因：**
- Amazonの高度な検出システム

**解決策：**
- プロキシを使用
- User-Agentを最新のChromeに更新
- ヘッドレスモードを無効化（開発時）

```typescript
// execute-payment.ts で headless: false に変更
this.browser = await puppeteer.launch({
  headless: false, // 可視化モード
  ...
})
```

---

### 問題3: 2FA（二段階認証）で停止する

**現在の制限：**
- 2FAは自動対応していません

**回避策：**
1. 2FAを無効化（非推奨）
2. 信頼済みデバイスとして登録
3. SMS API統合（将来の実装）

---

## 🎯 Phase 1.5 完了チェックリスト

- ✅ Puppeteer統合
- ✅ 自動購入フロー実装
- ✅ アカウント管理システム
- ✅ 決済処理システム
- ✅ メール解析サービス
- ✅ プロキシローテーション
- ✅ リスクスコア計算
- ✅ クールダウン管理
- ✅ 暗号化とセキュリティ
- ✅ データベーススキーマ
- ✅ APIエンドポイント更新
- ✅ ドキュメント整備

---

## 📄 関連ドキュメント

- [Phase 1: 基盤構築](./GLOBAL_DROPSHIPPING_PLATFORM.md)
- [README](../README_ARBITRAGE_PLATFORM.md)
- [Puppeteer Documentation](https://pptr.dev/)

---

## 🚀 次のステップ：Phase 2

Phase 1.5の完了により、**自国完結型FBA刈り取り**が完全自動化されました！

次は **Phase 2: クロスボーダー戦略** へ：

1. フォワーダーAPI連携
2. 関税自動計算エンジン
3. 最適ルート決定ロジック（A国→B国）

---

**Phase 1.5 達成率: 100%** 🎉
