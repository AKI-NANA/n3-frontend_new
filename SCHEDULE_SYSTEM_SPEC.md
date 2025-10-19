# スケジュール生成システム - 詳細仕様

## 🎯 スケジュール生成の仕組み

### 1. **自動調整について**

**現在:** 手動生成
- 「スケジュール生成」ボタンをクリックすると、その時点の`ready_to_list`商品で一括生成
- 商品が増えても自動では調整されません

**動作フロー:**
```
1. ユーザーが「スケジュール生成」ボタンをクリック
2. status='ready_to_list'の商品を全て取得
3. AIスコア順にソート（高→低）
4. 設定に従ってランダム配分
5. データベースに保存
```

### 2. **複数セッション生成**

モール別設定に従います：

#### eBay (ランダム化ON)
```typescript
randomization: {
  enabled: true,
  sessionsPerDay: { min: 2, max: 6 },  // 1日2〜6回にランダム分割
  timeRandomization: { enabled: true, range: 30 },  // ±30分ランダム
  itemInterval: { min: 20, max: 120 }  // 20〜120秒ランダム待機
}
```

**例: 10件の商品がある日**
- セッション数: ランダムで4回（2〜6の範囲内）
- Session 1: 09:15（基準9:00から±30分） - 3件
- Session 2: 12:45（基準12:00から±30分） - 2件
- Session 3: 16:20（基準16:00から±30分） - 3件
- Session 4: 19:50（基準19:00から±30分） - 2件

#### Shopee (ランダム化OFF)
```typescript
randomization: {
  enabled: false,
  sessionsPerDay: { min: 1, max: 1 },  // 1日1回固定
  timeRandomization: { enabled: false, range: 0 },
  itemInterval: { min: 5, max: 10 }  // 5〜10秒固定
}
```

**例: 20件の商品がある日**
- セッション数: 1回固定
- Session 1: 09:00（固定時刻） - 20件

### 3. **時間帯のランダム化**

営業時間: 9:00〜21:00（12時間）

**ランダム化ONの場合:**
```
基準時刻 = 9 + (12 * セッション番号 / 総セッション数)

例: 1日4セッションの場合
- Session 1: 基準 9:00  → 実際 8:45〜9:45（±30分ランダム）
- Session 2: 基準 12:00 → 実際 11:30〜12:30
- Session 3: 基準 15:00 → 実際 14:30〜15:30
- Session 4: 基準 18:00 → 実際 17:30〜18:30
```

**ランダム化OFFの場合:**
```
固定時刻: 09:00（変動なし）
```

### 4. **日ごとの出品数**

上限設定に従ってランダム配分：

```typescript
limits: {
  dailyMin: 10,    // 1日最小10件
  dailyMax: 50,    // 1日最大50件
  weeklyMin: 70,
  weeklyMax: 200,
  monthlyMax: 500
}
```

**例: 100件の商品を7日間で配分**
- Day 1: 25件（10〜50の範囲でランダム）
- Day 2: 8件（最小10件を下回らないよう調整）
- Day 3: 42件
- Day 4: 15件
- Day 5: 5件（残り少ないので調整）
- Day 6: 3件
- Day 7: 2件

### 5. **優先順位**

商品は以下の順でソート：

```typescript
1. listing_priority (high > medium > low)
2. ai_confidence_score (高い順)
3. profit_amount_usd (高い順)
```

**例:**
```
商品A: priority=high, score=95 → 10/19 09:00
商品B: priority=high, score=88 → 10/19 09:30
商品C: priority=medium, score=90 → 10/19 12:00
商品D: priority=medium, score=78 → 10/19 12:20
商品E: priority=low, score=92 → 10/20 09:00（highが優先されるため翌日）
```

---

## 🔄 承認取り消しの連動

### トリガー動作

```sql
approval_status: approved → rejected/pending
↓
自動的に以下を実行:
1. listing_session_id = NULL
2. scheduled_listing_date = NULL
3. status = 'pending'
4. スケジュールのplanned_count - 1
```

### 動作確認

1. **承認画面で商品を選択**
   ```
   http://localhost:3000/approval
   ```

2. **「承認取消」ボタンをクリック**

3. **スケジューラーで確認**
   ```
   http://localhost:3000/listing-management
   ```
   → カレンダーから削除されている

---

## 📊 実際の生成例

### ケース1: 8件の商品、1週間

**設定:**
- eBay account1: ランダム化ON、2-6回/日
- eBay account2: ランダム化ON、2-5回/日
- Shopee: ランダム化OFF、1回/日

**結果:**
```
10/19 (今日)
  - 09:15 eBay account1 (2件) [Session 1/3]
  - 13:42 eBay account1 (1件) [Session 2/3]
  - 18:05 eBay account1 (1件) [Session 3/3]

10/20
  - 09:00 Shopee main (2件) [Session 1/1]

10/21
  - 10:23 eBay account2 (1件) [Session 1/2]
  - 16:18 eBay account2 (1件) [Session 2/2]
```

### ケース2: 100件の商品、1ヶ月

**上限:**
- 1日: 10-50件
- 1週間: 70-200件
- 1ヶ月: 500件

**結果:**
```
Week 1: 145件（ランダム配分）
  - Day 1: 38件（4セッション、ランダム時刻）
  - Day 2: 25件（3セッション）
  - Day 3: 42件（5セッション）
  - Day 4: 15件（2セッション）
  - Day 5: 25件（3セッション）

Week 2: 182件
  ...

合計: 100件 < 500件（上限内）
```

---

## ✅ まとめ

### 自動調整
- ❌ 現在は自動調整なし（手動生成のみ）
- ✅ 「スケジュール生成」で一括生成

### 複数セッション
- ✅ モール設定に従って2〜6回/日に分割
- ✅ ランダム化ON/OFFで制御可能

### 時間帯
- ✅ 日によって完全にバラバラ
- ✅ ±30分のランダム幅で自然な時刻

### 承認取り消し連動
- ✅ トリガーで自動削除
- ✅ スケジュールからも除外

### 件数増加
- ✅ 商品が増えたら再生成
- ✅ 上限に従って自動配分
