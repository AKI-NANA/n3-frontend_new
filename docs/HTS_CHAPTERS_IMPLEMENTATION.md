# HTS階層構造の完全な実装手順

## 🎯 目的
現在のDBには10桁HTSコードしかなく、Chapterレベルの正式な説明がありません。
新しい`hts_codes_chapters`テーブルを作成し、全99章の正式な英語・日本語説明を格納します。

## 📊 作成するテーブル構造

```sql
hts_codes_chapters
├── chapter_code (TEXT) - '01', '02', ..., '99'
├── title_english (TEXT) - 英語の正式なChapter名
├── title_japanese (TEXT) - 日本語のChapter名
├── section_number (INTEGER) - Section番号 (1-21)
├── section_title (TEXT) - Section名
└── sort_order (INTEGER) - 表示順序
```

## 🚀 実装手順

### Step 1: Supabase SQLエディタでテーブルを作成

1. Supabaseダッシュボードにログイン: https://supabase.com/dashboard
2. プロジェクトを選択
3. 左メニューから「SQL Editor」を選択
4. 「New Query」をクリック
5. 以下のSQLを実行：

```sql
-- 以下のファイルの内容をコピー&ペースト
/supabase/migrations/create_hts_chapters_table.sql
```

### Step 2: データを投入

同じSQL Editorで以下を実行：

```sql
-- 以下のファイルの内容をコピー&ペースト
/supabase/migrations/insert_all_hts_chapters.sql
```

### Step 3: データの確認

```sql
-- 全データ確認
SELECT 
  chapter_code, 
  title_japanese, 
  title_english,
  section_number,
  section_title
FROM hts_codes_chapters 
ORDER BY sort_order 
LIMIT 10;

-- 総件数確認
SELECT COUNT(*) FROM hts_codes_chapters;
-- 結果: 99章
```

### Step 4: アプリケーションコードのデプロイ

コードは既に更新済みです：
- ✅ `lib/supabase/hts.ts` - 新しいテーブルから取得
- ✅ フォールバック機能 - テーブルがない場合は古い方法で動作

## ✅ 完了後の確認

ブラウザで以下にアクセス：
```
http://localhost:3000/tools/hts-classification/chapters
```

**期待される結果**:
- ✅ 全99章が表示される
- ✅ 日本語の説明が正しく表示される
- ✅ 英語の説明が正しく表示される（現在は非表示）
- ✅ "Other"などの誤った説明が消える

## 📝 データ例

Chapter 01:
```
日本語: 生きている動物
英語: Live animals
Section: SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS
```

Chapter 17:
```
日本語: 砂糖及び砂糖菓子
英語: Sugars and sugar confectionery
Section: SECTION IV - PREPARED FOODSTUFFS
```

## 🔧 トラブルシューティング

### エラー: Table 'hts_codes_chapters' does not exist
→ Step 1のテーブル作成SQLを実行してください

### エラー: Duplicate key value violates unique constraint
→ データが既に存在します。以下で削除してから再実行：
```sql
DELETE FROM hts_codes_chapters;
```

### 古い方法で動作している
→ ブラウザのキャッシュをクリア（Cmd+Shift+R）

## 🎉 完了後の機能

1. **階層構造の完全な表示**
   - Section → Chapter → Heading → Subheading → HTS Code

2. **バイリンガル対応**
   - 日本語と英語の両方を表示可能
   - UI上で切り替え可能

3. **検索機能の強化**
   - Chapterレベルでの検索
   - Section単位での絞り込み

## 📊 Section（大分類）一覧

HTS分類は21のSectionに分かれています：

1. SECTION I - 動物・動物性生産品 (Ch 01-05)
2. SECTION II - 植物性生産品 (Ch 06-14)
3. SECTION III - 動植物性油脂 (Ch 15)
4. SECTION IV - 調製食料品 (Ch 16-24)
5. SECTION V - 鉱物性生産品 (Ch 25-27)
6. SECTION VI - 化学工業製品 (Ch 28-38)
7. SECTION VII - プラスチック・ゴム (Ch 39-40)
8. SECTION VIII - 革製品 (Ch 41-43)
9. SECTION IX - 木材製品 (Ch 44-46)
10. SECTION X - パルプ・紙 (Ch 47-49)
11. SECTION XI - 紡織用繊維製品 (Ch 50-63)
12. SECTION XII - 履物・帽子 (Ch 64-67)
13. SECTION XIII - 石・陶磁器 (Ch 68-70)
14. SECTION XIV - 貴金属・宝石 (Ch 71)
15. SECTION XV - 卑金属 (Ch 72-83)
16. SECTION XVI - 機械類 (Ch 84-85)
17. SECTION XVII - 車両・航空機 (Ch 86-89)
18. SECTION XVIII - 精密機器 (Ch 90-92)
19. SECTION XIX - 武器 (Ch 93)
20. SECTION XX - 雑品 (Ch 94-96)
21. SECTION XXI - 美術品 (Ch 97)

---

**作成日**: 2025-11-07
**ステータス**: 実装準備完了
**次のアクション**: Step 1のSQL実行
