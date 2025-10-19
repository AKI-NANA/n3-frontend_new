# eBay手数料データベース格納 - 実行方法ガイド

## 🚀 即実行手順（ターミナルコマンド）

### **1. CSVファイルの配置**
```bash
# CSVファイルを11_categoryディレクトリに配置
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/11_category

# CSVファイルをコピー（パスを実際のファイル場所に変更）
cp "パス/to/2024_利益計算表 最新  Category.csv" ./

# または、ファイルが別の場所にある場合は見つける
find /Users/aritahiroaki -name "*Category.csv" 2>/dev/null
```

### **2. 実行権限付与**
```bash
chmod +x store_fee_data.sh
```

### **3. データベース格納実行**
```bash
./store_fee_data.sh
```

---

## 📋 実行結果例

```
🏷️ eBay手数料データベース格納開始
==================================
📁 実行ディレクトリ: /Users/aritahiroaki/.../11_category
✅ CSVファイル発見: 2024_利益計算表 最新  Category.csv
📊 CSVファイル情報:
   20758 2024_利益計算表 最新  Category.csv

🔌 データベース接続テスト
✅ データベース接続OK

🚀 手数料マッチング処理実行
✅ 処理完了!
📊 総カテゴリー数: 20757
🎯 マッチ数: 18543
📈 成功率: 89.3%
💾 データベース格納済み: 18543件

🔍 格納データ確認
    項目     |    値    
------------|----------
総件数      | 18543
平均信頼度  | 72.4%
高信頼度    | 12456
中信頼度    | 6087

📋 サンプルデータ表示
                カテゴリー                | 手数料率 | 信頼度
------------------------------------------|----------|--------
Books & Magazines > Fiction Books         |    15.30 |     95
Clothing, Shoes & Accessories > Women     |    13.60 |     92
Jewelry & Watches > Fine Jewelry          |    15.00 |     90
Music > CDs                                |    15.30 |     88
Movies & TV > DVDs                         |    15.30 |     87

🎉 データベース格納完了!
==================================
```

---

## 🛠️ 手動実行方法（CSVがない場合）

### **CSVファイル確認**
```bash
# 現在のディレクトリでCSVファイルを探す
ls -la *.csv

# システム全体でCSVファイルを探す  
find ~ -name "*Category*.csv" 2>/dev/null
```

### **PHPダイレクト実行**
```bash
# CSVなしでサンプル実行
php -f fee_matcher.php
```

### **データベース直接確認**
```bash
# 格納済みデータ確認
psql -h localhost -U aritahiroaki -d nagano3_db -c "
SELECT COUNT(*) as total_records FROM fee_matches;
SELECT * FROM fee_matches LIMIT 5;
"
```

---

## 📊 データベーステーブル構造

```sql
-- 作成されるテーブル
CREATE TABLE fee_matches (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(50),      -- CSVのCategoryID
    category_path TEXT,           -- CSVのCategory Path  
    fee_percent DECIMAL(5,2),     -- マッチした手数料率
    confidence INTEGER            -- マッチング信頼度(0-100)
);

-- インデックス（自動作成）
CREATE INDEX idx_fee_matches_confidence ON fee_matches(confidence);
CREATE INDEX idx_fee_matches_category ON fee_matches(category_id);
```

---

## 🔧 トラブルシューティング

### **CSVファイルが見つからない場合**
```bash
echo "CSVファイルを探しています..."
find /Users/aritahiroaki -name "*利益計算表*" -name "*.csv" 2>/dev/null
find /Users/aritahiroaki -name "*Category*" -name "*.csv" 2>/dev/null
```

### **データベース接続エラー**  
```bash
# PostgreSQL起動確認
brew services list | grep postgres

# 接続テスト
psql -h localhost -U aritahiroaki -d nagano3_db -c "SELECT 1;"
```

### **権限エラー**
```bash
# 実行権限付与
chmod +x store_fee_data.sh

# ファイル権限確認
ls -la store_fee_data.sh
```

---

## 🎯 実行後の確認方法

### **Web UIで確認**
```bash
# WebサーバーでUI確認
open fee_matching_tool.html
```

### **SQLで直接確認**  
```sql
-- 手数料率別集計
SELECT fee_percent, COUNT(*) as count 
FROM fee_matches 
GROUP BY fee_percent 
ORDER BY fee_percent;

-- 信頼度別集計
SELECT 
    CASE 
        WHEN confidence >= 80 THEN '高信頼度'
        WHEN confidence >= 60 THEN '中信頼度'  
        ELSE '低信頼度'
    END as 信頼度レベル,
    COUNT(*) as 件数
FROM fee_matches 
GROUP BY 1;
```

---

## 📈 期待される結果

- **総処理件数**: 20,757カテゴリー
- **マッチ成功率**: 85-90%
- **処理時間**: 5分以下
- **データ精度**: 信頼度70%以上

**このスクリプトにより、ワンコマンドでeBay手数料データの完全自動格納が可能です！**