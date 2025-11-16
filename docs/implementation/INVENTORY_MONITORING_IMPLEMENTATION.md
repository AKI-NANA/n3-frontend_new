# 在庫監視システム 実装完了

## 実装日
2025-10-22

## 概要
ヤフオクスクレイピングで取得した出品済み商品の在庫・価格を定期的に監視し、変動を検知してeBayに自動反映するシステムを実装しました。

---

## 実装機能

### 1. データベース設計
**ファイル**: `supabase/migrations/20251022_inventory_monitoring.sql`

#### 新規テーブル
- `inventory_monitoring_logs` - 実行ログ
- `inventory_changes` - 変動履歴
- `monitoring_schedules` - スケジュール設定
- `monitoring_errors` - エラー詳細ログ

#### 既存テーブル拡張
- `products` - 在庫監視用フィールド追加
- `yahoo_scraped_products` - 監視用フィールド追加

#### 自動トリガー
- 承認時に自動的に監視対象に追加
- 否認時に監視を停止

---

### 2. バックエンド実装

#### コアライブラリ (`lib/inventory-monitoring/`)
- `types.ts` - 型定義
- `batch-job.ts` - バッチジョブ実行エンジン
- `change-detection.ts` - 変動検知ロジック
- `price-recalculation.ts` - 価格再計算ロジック
- `ebay-auto-update.ts` - eBay API自動更新
- `email-notification.ts` - メール通知

#### API エンドポイント (`app/api/inventory-monitoring/`)
- `POST /api/inventory-monitoring/execute` - バッチ実行
- `GET /api/inventory-monitoring/status/[logId]` - 実行ステータス取得
- `GET /api/inventory-monitoring/logs` - 実行履歴取得
- `GET /api/inventory-monitoring/changes` - 変動データ取得
- `POST /api/inventory-monitoring/changes/apply` - eBayに適用
- `GET /api/inventory-monitoring/export-csv` - CSV出力
- `GET /api/inventory-monitoring/schedule` - スケジュール取得
- `PUT /api/inventory-monitoring/schedule` - スケジュール更新

---

### 3. eBay API自動更新
**ファイル**: `lib/inventory-monitoring/ebay-auto-update.ts`

#### 機能
- 在庫数の自動更新 (`updateInventoryQuantity`)
- 価格の自動更新 (`updateOfferPrice`)
- バッチ一括更新
- ドライラン機能（テスト実行）
- エラーハンドリングと記録

#### 対応する変動タイプ
- **価格変動**: 再計算してeBay価格を更新
- **在庫変動**: eBay在庫数を更新
- **ページ削除**: 在庫を0に設定

---

### 4. フロントエンド UI
**ファイル**: `app/inventory-monitoring/page.tsx`

#### ページ構成
1. **ダッシュボード**
   - 変動総数、価格変動、在庫変動、エラーの統計表示
   - 今すぐ実行ボタン

2. **変動データタブ**
   - 未対応の変動一覧
   - チェックボックスで複数選択
   - CSV出力ボタン
   - eBayに反映ボタン
   - 元ページへのリンク

3. **実行履歴タブ**
   - 過去の監視実行履歴
   - 処理件数、変動件数、所要時間

4. **スケジュール設定タブ**
   - 自動監視ON/OFF
   - 実行頻度（1日1回/1時間ごと/カスタム）
   - 実行時間帯設定
   - バッチサイズ設定
   - 待機時間設定（ロボット検知回避）
   - メール通知設定

---

### 5. CSV出力
**ファイル**: `app/api/inventory-monitoring/export-csv/route.ts`

#### 対応フォーマット
- **eBayフォーマット**: eBay File Exchange形式
- **全データフォーマット**: 詳細情報を含む完全版

#### eBay CSV項目
- Action, CustomLabel, SKU, Quantity, Price
- Title, Description, Category, ConditionID
- Format, Duration, Location
- ShippingProfileID, PaymentProfileID, ReturnProfileID

---

### 6. メール通知
**ファイル**: `lib/inventory-monitoring/email-notification.ts`

#### 通知タイプ
- 実行完了通知（変動検知時）
- エラー通知

#### 通知内容
- 処理件数、成功件数、エラー件数
- 変動総数、価格変動、在庫変動、ページエラー
- 所要時間
- ダッシュボードへのリンク

**注**: 現在はコンソールログ出力。本番環境では Resend / SendGrid に置き換え可能。

---

## 主要な機能フロー

### 1. 承認 → 監視開始
```
承認ツール（/approval）で商品を承認
  ↓
DBトリガーが自動発火
  ↓
monitoring_enabled = true
monitoring_status = 'active'
  ↓
監視対象に追加
```

### 2. バッチ監視実行
```
スケジュールまたは手動実行
  ↓
監視対象商品を取得（最大50件）
  ↓
各商品を順次スクレイピング
  - 30〜120秒のランダム待機（ロボット検知回避）
  ↓
変動検知
  - 価格変動 → 自動再計算
  - 在庫変動 → 記録
  - ページ削除 → 記録
  ↓
DBに保存
  ↓
メール通知
```

### 3. eBay自動更新
```
変動データを選択
  ↓
「eBayに反映」ボタンをクリック
  ↓
eBay Inventory API呼び出し
  - 在庫更新: updateInventoryQuantity
  - 価格更新: updateOfferPrice
  ↓
成功/失敗を記録
  ↓
変動ステータスを「applied」に更新
```

### 4. 手動CSV出力
```
変動データを選択
  ↓
「CSV出力」ボタンをクリック
  ↓
eBayフォーマットCSVを生成
  ↓
ダウンロード
  ↓
eBay File Exchangeにアップロード
  ↓
手動で更新
```

---

## ロボット検知回避戦略

### 実装済み対策
1. **時刻ランダム化**: 深夜1〜6時の間でランダムな時刻に実行
2. **間隔ランダム化**: 各商品間に30〜120秒のランダム待機
3. **バッチサイズ制限**: 1回の実行で最大50件まで
4. **連続エラー検知**: 5回連続エラーで自動停止

### 今後の拡張
- User-Agent多様化
- プロキシ対応
- 実行パターン分析

---

## 使用方法

### 1. 初回セットアップ
```bash
# DBマイグレーション実行
# Supabaseダッシュボードで supabase/migrations/20251022_inventory_monitoring.sql を実行

# または
psql -f supabase/migrations/20251022_inventory_monitoring.sql
```

### 2. スケジュール設定
1. `/inventory-monitoring` にアクセス
2. 「スケジュール設定」タブを開く
3. 自動監視をON
4. 実行頻度、時間帯を設定
5. メール通知設定（任意）

### 3. 手動実行
1. `/inventory-monitoring` にアクセス
2. 「今すぐ実行」ボタンをクリック
3. 完了を待つ（メール通知またはUIで確認）

### 4. 変動対応
1. 「変動データ」タブを確認
2. 対応する変動を選択
3. 以下のいずれかを実行：
   - **eBayに反映**: eBay APIで自動更新（推奨）
   - **CSV出力**: 手動でeBayに反映

---

## テスト方法

### 1. 基本動作テスト
```bash
# 手動実行
curl -X POST http://localhost:3000/api/inventory-monitoring/execute \
  -H "Content-Type: application/json" \
  -d '{"type":"manual"}'

# ステータス確認
curl http://localhost:3000/api/inventory-monitoring/logs?limit=1
```

### 2. eBay API連携テスト（ドライラン）
```bash
curl -X POST http://localhost:3000/api/inventory-monitoring/changes/apply \
  -H "Content-Type: application/json" \
  -d '{"changeIds":["変動ID"], "dryRun":true}'
```

### 3. CSV出力テスト
```
http://localhost:3000/api/inventory-monitoring/export-csv?changeIds=変動ID&format=ebay
```

---

## 今後の拡張

### Phase 1（現在完了）
- ✅ 基本的な在庫監視機能
- ✅ eBay API自動更新
- ✅ CSV出力
- ✅ メール通知（基礎実装）

### Phase 2（将来）
- [ ] 複数マーケットプレイス対応（Amazon, Mercari等）
- [ ] AI価格最適化提案
- [ ] 競合価格監視（SellerMirror連携）
- [ ] Slack/Discord通知対応
- [ ] 実際のメール送信（Resend/SendGrid統合）

### Phase 3（将来）
- [ ] スケジューラーの自動実行（Vercel Cron Jobs）
- [ ] プロキシ対応
- [ ] 高度な統計・分析ダッシュボード
- [ ] 自動価格調整（競合に応じて）

---

## トラブルシューティング

### バッチが実行されない
1. スケジュール設定が有効か確認
2. 監視対象商品があるか確認（`monitoring_enabled = true`）
3. source_url が設定されているか確認

### eBay更新が失敗する
1. eBayトークンが有効か確認
2. ebay_sku または ebay_offer_id が設定されているか確認
3. listed_marketplaces に 'ebay' が含まれているか確認

### スクレイピングがエラーになる
1. source_url が正しいか確認
2. Yahoo商品ページが削除されていないか確認
3. PHPバックエンドが起動しているか確認（localhost:8080）

---

## ファイル一覧

### マイグレーション
- `supabase/migrations/20251022_inventory_monitoring.sql`

### ライブラリ
- `lib/inventory-monitoring/types.ts`
- `lib/inventory-monitoring/batch-job.ts`
- `lib/inventory-monitoring/change-detection.ts`
- `lib/inventory-monitoring/price-recalculation.ts`
- `lib/inventory-monitoring/ebay-auto-update.ts`
- `lib/inventory-monitoring/email-notification.ts`

### API
- `app/api/inventory-monitoring/execute/route.ts`
- `app/api/inventory-monitoring/status/[logId]/route.ts`
- `app/api/inventory-monitoring/logs/route.ts`
- `app/api/inventory-monitoring/changes/route.ts`
- `app/api/inventory-monitoring/changes/apply/route.ts`
- `app/api/inventory-monitoring/export-csv/route.ts`
- `app/api/inventory-monitoring/schedule/route.ts`

### UI
- `app/inventory-monitoring/page.tsx`

---

## ライセンス
内部使用

## 作成者
Claude Code

## 更新日
2025-10-22
