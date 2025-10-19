# スマート出品スケジューラー - 完全実装ガイド

## 🎯 完成した機能

### Phase 1: データベース & モール選択
✅ データベース拡張完了
✅ 承認画面にモール選択UI追加
✅ 複数モール同時出品対応
✅ 優先度設定機能

### Phase 2: スマートスケジューラー
✅ 完全ランダム化アルゴリズム
✅ AIスコア順ソート
✅ Googleカレンダー風UI
✅ 詳細設定画面

### Phase 3: API出品エンジン
✅ 出品実行API
✅ モール別API（ダミー実装）
✅ 出品履歴記録
✅ ランダム待機機能

---

## 📋 セットアップ手順

### 1. データベースマイグレーション

Supabase SQL Editorで以下を実行：

```bash
sql/phase1_database_expansion.sql
```

これにより以下が追加されます：
- `target_marketplaces` カラム（JSONB）
- `scheduled_listing_date` カラム
- `listing_session_id` カラム
- `listing_priority` カラム
- `listing_schedules` テーブル
- `listing_history` テーブル
- `schedule_settings` テーブル

### 2. サンプルデータ追加（既に実行済みの場合はスキップ）

```bash
sql/insert_sample_products_simple.sql
```

---

## 🚀 使い方

### Step 1: 商品承認（/approval）

1. 商品を選択
2. 「承認」ボタンをクリック
3. **モーダルで出品先を選択**
   - eBay (Main)
   - eBay (Sub1)
   - Yahoo (Main)
   - Mercari (Main)
   - 複数選択可能
4. **優先度を選択**
   - 高/中/低
5. 「承認して出品待ちリストへ」をクリック

→ `status = 'ready_to_list'` に変更され、出品待ちリストに追加

### Step 2: スケジュール生成（/listing-management）

#### 2-1. 設定を調整（スケジュール設定タブ）

**上限設定:**
- 1日の最小/最大出品数
- 1週間の最小/最大出品数
- 1ヶ月の上限

**ランダム化設定:**
- 1日のセッション回数: 2-6回（ランダム）
- 時刻ランダム幅: ±30分
- 商品間隔: 20-120秒（ランダム）

**モール配分:**
- eBay Main: 50%
- eBay Sub1: 20%
- Yahoo Main: 20%
- Mercari Main: 10%

#### 2-2. スケジュール生成

1. 「スケジュール生成」ボタンをクリック
2. 確認ダイアログで「OK」
3. **自動的に以下が実行されます:**
   - 出品待ち商品をAIスコア順にソート
   - ランダム配分アルゴリズムで日付に割り当て
   - 各日をランダムに2-6回のセッションに分割
   - 各セッションにランダムな時刻を設定
   - モール・アカウントを重み付けで配分
   - データベースに保存

#### 2-3. カレンダーで確認

- 月別グリッド表示
- 各日の出品数・スコア・セッション情報
- ステータス表示（予定/実行中/完了）

### Step 3: 自動出品（バッチ実行）

#### 手動実行（テスト用）

```typescript
// 特定のスケジュールを実行
const response = await fetch('/api/listing/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scheduleId: 123 })
})
```

#### 自動実行（本番用）

**Vercel Cronまたは外部スケジューラーを使用:**

```yaml
# vercel.json
{
  "crons": [{
    "path": "/api/listing/cron",
    "schedule": "*/5 * * * *"
  }]
}
```

**処理フロー:**
1. 現在時刻の前後30分のスケジュールを取得
2. 各スケジュールを順次実行
3. 商品をAIスコア順に出品
4. ランダム待機（20-120秒）
5. モール別APIを呼び出し
6. 履歴記録
7. ステータス更新

---

## 🎨 ランダム化の仕組み

### 完全ランダム化で実現すること

1. **毎日の出品数がランダム**
   - 最小10件〜最大50件の範囲でランダム
   - 曜日ごとに異なる数

2. **1日の回数がランダム**
   - 2回〜6回のセッションにランダム分割
   - 月曜は3回、火曜は5回、など毎日変化

3. **出品時刻がランダム**
   - 基準時刻から±30分のランダム
   - 10:00予定 → 実際は9:45や10:23など

4. **商品間隔がランダム**
   - 20秒〜120秒の間でランダム待機
   - 商品1→商品2: 45秒、商品2→商品3: 78秒など

5. **モール・アカウントがランダム**
   - 重み付けランダム選択
   - eBay 50%、Yahoo 20%など

### ロボット検知回避の効果

- ✅ パターンが毎回異なる
- ✅ 一定間隔での出品がない
- ✅ 同じ時刻での出品がない
- ✅ 一括出品ではなく分散出品
- ✅ 人間の行動に近いランダム性

---

## 📊 データフロー

```
1. 商品スクレイピング
   ↓
2. フィルター処理
   ↓
3. AI判定
   ↓
4. 承認システム (/approval)
   ├─ モール選択
   ├─ 優先度設定
   └─ status = 'ready_to_list'
   ↓
5. スマートスケジューラー (/listing-management)
   ├─ AIスコア順ソート
   ├─ ランダム配分
   ├─ セッション分割
   ├─ 時刻決定
   └─ DB保存 (listing_schedules)
   ↓
6. 自動出品エンジン (/api/listing/execute)
   ├─ スケジュール取得
   ├─ 商品取得
   ├─ ランダム待機
   ├─ モール別API呼び出し
   ├─ 履歴記録 (listing_history)
   └─ status = 'listed'
```

---

## 🔧 次のステップ（実装待ち）

### モール別API実装

現在はダミー実装です。実際のAPI実装が必要です：

1. **eBay API**
   - `app/api/listing/execute/route.ts` の `listToEbay()` を実装
   - eBay Trading API使用

2. **Yahoo! API**
   - `listToYahoo()` を実装
   - Yahoo!ショッピングAPI使用

3. **メルカリ API**
   - `listToMercari()` を実装
   - メルカリAPI使用

### Cron Job設定

自動実行のためのCron設定：

```javascript
// app/api/listing/cron/route.ts
export async function GET() {
  // 現在時刻のスケジュールを取得
  // 各スケジュールを /api/listing/execute で実行
}
```

---

## ✅ 完成チェックリスト

### Phase 1
- [x] データベース拡張
- [x] target_marketplaces カラム追加
- [x] listing_schedules テーブル作成
- [x] listing_history テーブル作成
- [x] 承認画面にモール選択UI追加
- [x] 優先度設定機能

### Phase 2
- [x] SmartScheduleGenerator クラス実装
- [x] ランダム配分アルゴリズム
- [x] AIスコア順ソート
- [x] セッション分割ロジック
- [x] 時刻ランダム化
- [x] Googleカレンダー風UI
- [x] スケジュール設定画面

### Phase 3
- [x] 出品実行API
- [x] ランダム待機機能
- [x] モール別API（ダミー）
- [x] 履歴記録機能
- [ ] eBay API実装（TODO）
- [ ] Yahoo API実装（TODO）
- [ ] Mercari API実装（TODO）
- [ ] Cron Job設定（TODO）

---

## 🎉 まとめ

完全なスマート出品スケジューラーが完成しました！

**主な特徴:**
- ✅ AIスコア順の自動出品
- ✅ 完全ランダム化（ロボット検知回避）
- ✅ 複数モール対応
- ✅ Googleカレンダー風UI
- ✅ 詳細設定可能
- ✅ 出品履歴記録

**残タスク:**
- 各モールの実際のAPI実装
- Cron Job設定
- エラーハンドリング強化
- 通知機能追加

これで、大量の商品を自然な形で自動出品できるシステムが完成しました！
