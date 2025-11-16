# 承認→スケジュール連携の確認方法

## 📋 確認手順

### 1. データベースでの確認

Supabase SQL Editorで以下のクエリを実行してください:

```sql
-- ステップ1: 承認済み商品の確認
SELECT 
    id,
    sku,
    title,
    approval_status,
    status,
    approved_at,
    created_at
FROM products_master
WHERE approval_status = 'approved'
ORDER BY approved_at DESC
LIMIT 10;
```

**期待される結果**: 承認ページで承認した商品が表示される

---

```sql
-- ステップ2: listing_scheduleテーブルのレコード確認
SELECT 
    ls.id,
    ls.product_id,
    ls.marketplace,
    ls.account_id,
    ls.scheduled_at,
    ls.status,
    ls.priority,
    ls.created_at,
    pm.sku,
    pm.title
FROM listing_schedule ls
LEFT JOIN products_master pm ON ls.product_id = pm.id
ORDER BY ls.created_at DESC
LIMIT 10;
```

**期待される結果**: 承認時に作成されたスケジュールレコードが表示される

---

```sql
-- ステップ3: 承認済みだがスケジュールがない商品（エラーチェック）
SELECT 
    pm.id,
    pm.sku,
    pm.title,
    pm.approval_status,
    pm.approved_at
FROM products_master pm
LEFT JOIN listing_schedule ls ON pm.id = ls.product_id
WHERE pm.approval_status = 'approved'
  AND ls.id IS NULL
LIMIT 10;
```

**期待される結果**: 空（すべての承認済み商品にスケジュールが作成されている）

---

```sql
-- ステップ4: スケジュールのステータス別集計
SELECT 
    status,
    COUNT(*) as count,
    MIN(scheduled_at) as earliest,
    MAX(scheduled_at) as latest
FROM listing_schedule
GROUP BY status
ORDER BY count DESC;
```

**期待される結果**: ステータス別の件数が表示される

---

```sql
-- ステップ5: マーケットプレイス・アカウント別集計
SELECT 
    marketplace,
    account_id,
    status,
    COUNT(*) as count
FROM listing_schedule
GROUP BY marketplace, account_id, status
ORDER BY marketplace, account_id, count DESC;
```

**期待される結果**: 各マーケットプレイス・アカウントごとのスケジュール数が表示される

---

## 🔍 トラブルシューティング

### 問題1: 承認してもスケジュールが作成されない

**原因**: APIエラーまたはテーブル構造の問題

**解決方法**:
1. ブラウザの開発者ツール（F12）を開く
2. Networkタブを確認
3. `/api/approval/create-schedule` へのPOSTリクエストを確認
4. レスポンスにエラーがないか確認

---

### 問題2: スケジュールは作成されるが、listing-managementページに表示されない

**原因**: フィルター設定またはクエリの問題

**解決方法**:
1. フィルターをリセット（「リセット」ボタンをクリック）
2. ページをリロード
3. ブラウザのコンソールでエラーを確認

---

### 問題3: products_masterテーブルにデータがない

**原因**: テーブル名の不一致

**解決方法**:
1. 承認ページで使用しているテーブル名を確認
2. 実際のデータがどのテーブルに入っているか確認:

```sql
-- yahoo_scraped_productsテーブルを確認
SELECT COUNT(*) FROM yahoo_scraped_products;

-- products_masterテーブルを確認  
SELECT COUNT(*) FROM products_master;
```

---

## ✅ 正常動作の確認

以下の流れがすべて成功すれば、システムは正常に動作しています:

1. ✅ 承認ページで商品を選択
2. ✅ 「承認・出品予約」ボタンをクリック
3. ✅ 出品戦略コントロールモーダルが表示される
4. ✅ マーケットプレイス・アカウント・モードを選択
5. ✅ 「承認・出品予約」ボタンで確定
6. ✅ 成功メッセージが表示される
7. ✅ listing-managementページにスケジュールが表示される
8. ✅ カレンダーに予定が反映される
9. ✅ 「即時実行」ボタンで実行できる

---

## 📊 期待されるデータフロー

```
承認ページ
  ↓
商品選択（products_master）
  ↓
出品戦略コントロール
  ↓
API: /api/approval/create-schedule
  ↓
1. products_master.approval_status = 'approved' に更新
2. products_master.status = 'ready_to_list' に更新
3. listing_schedule レコード作成
  ↓
listing-managementページ
  ↓
listing_schedule テーブルから取得
  ↓
カレンダー・一覧に表示
```

---

## 🚀 次のステップ（実装済み機能）

- [x] 承認ページでの出品戦略設定
- [x] listing_scheduleテーブルへのデータ保存
- [x] listing-managementページでの表示
- [x] 即時実行機能
- [x] キャンセル機能
- [x] 削除機能
- [x] フィルター機能

## 📝 未実装機能（将来の拡張）

- [ ] スケジューラの自動実行（cron job）
- [ ] PublisherHubとの統合（実際の出品処理）
- [ ] エラー時の自動リトライ
- [ ] 出品完了後のステータス更新
- [ ] メール通知
