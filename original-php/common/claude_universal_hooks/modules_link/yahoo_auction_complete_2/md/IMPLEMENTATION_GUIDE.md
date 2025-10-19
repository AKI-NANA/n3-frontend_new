# 🚀 Yahoo Auction Tool フィルタータブ修正 - 実行手順

## 📌 **概要**
フィルタータブを「禁止キーワード管理システム」に完全置き換えします。

---

## 🗄️ **Step 1: データベースセットアップ**

### 1. PostgreSQL接続・テーブル作成
```bash
# 1. プロジェクトディレクトリに移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete

# 2. データベーステーブル作成
psql -U postgres -d nagano3_db -f setup_prohibited_keywords_table.sql

# 3. 作成確認
psql -U postgres -d nagano3_db -c "SELECT COUNT(*) FROM prohibited_keywords;"
```

### 期待結果
```
 count 
-------
    20
(1 row)
```

---

## 🔧 **Step 2: PHPファイル修正**

### 1. 禁止キーワードAPIエンドポイント追加

`yahoo_auction_tool_content.php` の switch文に以下を追加：

```php
// 既存のbreak;の後に追加
case 'get_prohibited_keywords':
    try {
        $filters = [
            'category' => $_GET['category'] ?? '',
            'priority' => $_GET['priority'] ?? '',
            'search' => $_GET['search'] ?? '',
            'filter' => $_GET['filter'] ?? ''
        ];
        
        $keywords = getProhibitedKeywords($filters);
        $response = generateApiResponse('get_prohibited_keywords', $keywords, true, 'Keywords retrieved successfully');
        
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    } catch (Exception $e) {
        $response = generateApiResponse('get_prohibited_keywords', null, false, 'Error: ' . $e->getMessage());
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    }
    break;

case 'get_prohibited_stats':
    try {
        $stats = getProhibitedKeywordStats();
        $response = generateApiResponse('get_prohibited_stats', $stats, true, 'Stats retrieved successfully');
        
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    } catch (Exception $e) {
        $response = generateApiResponse('get_prohibited_stats', null, false, 'Error: ' . $e->getMessage());
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    }
    break;

case 'check_title':
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $title = $input['title'] ?? '';
        
        $detectedKeywords = checkTitleForProhibitedKeywords($title);
        
        $response = generateApiResponse('check_title', null, true, 'Title checked successfully');
        $response['detected'] = $detectedKeywords;
        $response['is_safe'] = empty($detectedKeywords);
        
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    } catch (Exception $e) {
        $response = generateApiResponse('check_title', null, false, 'Error: ' . $e->getMessage());
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    }
    break;

case 'add_prohibited_keyword':
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $keywordData = [
            'keyword' => $input['keyword'] ?? '',
            'category' => $input['category'] ?? 'general',
            'priority' => $input['priority'] ?? 'medium',
            'created_by' => 'manual',
            'notes' => $input['notes'] ?? ''
        ];
        
        if (addProhibitedKeyword($keywordData)) {
            $response = generateApiResponse('add_prohibited_keyword', ['keyword' => $keywordData['keyword']], true, 'Keyword added successfully');
        } else {
            $response = generateApiResponse('add_prohibited_keyword', null, false, 'Failed to add keyword');
        }
        
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    } catch (Exception $e) {
        $response = generateApiResponse('add_prohibited_keyword', null, false, 'Error: ' . $e->getMessage());
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    }
    break;

case 'import_prohibited_csv':
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $csvContent = $input['csv_content'] ?? '';
        
        $result = importProhibitedKeywordsFromCSV($csvContent);
        
        if ($result['success']) {
            $response = generateApiResponse('import_prohibited_csv', $result, true, $result['message']);
        } else {
            $response = generateApiResponse('import_prohibited_csv', null, false, $result['message']);
        }
        
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    } catch (Exception $e) {
        $response = generateApiResponse('import_prohibited_csv', null, false, 'Error: ' . $e->getMessage());
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    }
    break;
```

### 2. フィルタータブHTML置き換え

`yahoo_auction_tool_content.php` 内の `<div id="filters" class="tab-content fade-in">` セクション全体を `filters_tab_new_content.html` の内容に置き換えます。

---

## 📱 **Step 3: 動作確認**

### 1. システム起動
```bash
# アプリケーション起動
http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php
```

### 2. フィルタータブテスト
1. **フィルタータブクリック** → 禁止キーワード管理画面表示確認
2. **統計表示確認** → 登録キーワード数、高リスク数、検出数
3. **リアルタイムチェック** → 「偽物」と入力 → 警告表示確認
4. **新規キーワード追加** → 「テストキーワード」「brand」「high」で追加テスト
5. **CSVアップロード** → ドラッグ&ドロップでCSVファイルアップロード

### 3. APIエンドポイントテスト
```bash
# 1. キーワード一覧取得
curl "http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php?action=get_prohibited_keywords"

# 2. タイトルチェック
curl -X POST "http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php?action=check_title" \
  -H "Content-Type: application/json" \
  -d '{"title":"偽物の商品です"}'

# 3. 統計取得
curl "http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php?action=get_prohibited_stats"
```

---

## ✅ **期待される結果**

### 1. **フィルタータブ**
- ✅ 禁止キーワード管理画面が表示される
- ✅ 統計ダッシュボードが動作する
- ✅ サンプルキーワード（20件）が表示される
- ✅ フィルター・検索機能が動作する

### 2. **リアルタイムチェック**
- ✅ 「偽物」入力 → 警告表示
- ✅ 「正規品」入力 → 安全表示

### 3. **データベース連携**
- ✅ キーワード一覧が表示される
- ✅ 新規キーワード追加が動作する
- ✅ 検出回数が更新される

---

## 🛠️ **トラブルシューティング**

### データベース接続エラー
```bash
# PostgreSQL接続確認
psql -U postgres -d nagano3_db -c "SELECT version();"

# テーブル存在確認
psql -U postgres -d nagano3_db -c "\dt prohibited_keywords"
```

### APIエラー
```bash
# PHPエラーログ確認
tail -f /var/log/apache2/error.log
# または
tail -f /var/log/nginx/error.log
```

### JavaScriptエラー
1. ブラウザのデベロッパーツール → Console確認
2. Network タブでAPIリクエスト確認

---

## 🎉 **完成後の機能**

### ✅ **実装完了機能**
1. **禁止キーワード管理** - CRUD操作完全対応
2. **リアルタイムタイトルチェック** - 商品タイトル即座判定
3. **CSVインポート/エクスポート** - 大量データ処理対応
4. **統計ダッシュボード** - 検出状況の可視化
5. **フィルター・検索** - カテゴリ別・優先度別絞り込み
6. **一括操作** - 複数キーワードの一括編集・削除

### 🔄 **今後の拡張予定**
1. **AI自動分類** - 新規キーワードの自動カテゴリ分類
2. **アラート機能** - 高リスクキーワード検出時の通知
3. **レポート機能** - 月次・週次の検出レポート自動生成

---

## 📝 **注意事項**

1. **既存システム保護** - 既存の商品データには一切影響しません
2. **段階的導入** - フィルタータブのみの置き換えで他機能は維持
3. **ロールバック可能** - 問題時は元のフィルタータブに戻せます
4. **パフォーマンス** - 大量キーワード（10,000件以上）での動作確認推奨

この手順に従って実装することで、強力な禁止キーワード管理システムが完成します。
