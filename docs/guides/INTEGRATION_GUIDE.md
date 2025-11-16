# 🚀 AI解析用CSVエクスポート - 既存システムへの統合手順

## 📋 準備完了ファイル

### 1. テスト用スタンドアロン版
```
ai-csv-export-test.html
```
- ブラウザで開くだけで動作
- サンプルデータ入り
- すぐにテスト可能

### 2. システム統合用JavaScript
```
public/js/ai-csv-export.js
```
- 既存システムに追加するコード
- 自動CSS追加機能付き
- 完全動作版

---

## 🎯 統合方法（2ステップ）

### ステップ1: JavaScriptファイルを読み込む

**既存のHTMLファイル（index.phpや編集画面）の`</body>`タグの前に追加**:

```html
<!-- AI解析用CSVエクスポート機能 -->
<script src="public/js/ai-csv-export.js"></script>
</body>
```

または、既存のJSファイル内にコピー:

```javascript
// 既存の editing.js や editor.js の末尾に
// ai-csv-export.js の内容を追加
```

---

### ステップ2: HTMLボタンを追加

**方法A: 既存ツールバーに追加（推奨）**

既存のボタンエリアを見つけて追加:

```html
<!-- 既存のCSVボタンなどの隣 -->
<button 
    id="ai-csv-export" 
    class="btn btn-purple"
    onclick="exportForAI()"
    style="margin-left: 8px;"
>
    🤖 AI解析用
</button>
```

**方法B: フローティングボタンとして追加**

画面右下に固定:

```html
<button 
    id="ai-csv-export" 
    class="btn btn-purple"
    onclick="exportForAI()"
    style="position: fixed; bottom: 20px; right: 20px; z-index: 1000;"
>
    🤖 AI解析用
</button>
```

---

## 📝 実装例

### 完全な統合例

```html
<!DOCTYPE html>
<html>
<head>
    <title>商品編集</title>
    <!-- 既存のCSS -->
    <link rel="stylesheet" href="editor.css">
</head>
<body>
    
    <!-- ツールバー -->
    <div class="toolbar">
        <button class="btn btn-primary">保存</button>
        <button class="btn btn-secondary">CSV</button>
        
        <!-- 👇 ここに追加 -->
        <button 
            id="ai-csv-export" 
            class="btn btn-purple"
            onclick="exportForAI()"
        >
            🤖 AI解析用
        </button>
    </div>
    
    <!-- 商品テーブル -->
    <table>
        <thead>
            <tr>
                <th><input type="checkbox"></th>
                <th>画像</th>
                <th>SKU</th>
                <!-- ... -->
            </tr>
        </thead>
        <tbody>
            <!-- 商品データ -->
        </tbody>
    </table>
    
    <!-- 既存のJavaScript -->
    <script src="editor.js"></script>
    
    <!-- 👇 ここに追加 -->
    <script src="public/js/ai-csv-export.js"></script>
</body>
</html>
```

---

## 🔧 カスタマイズ（必要な場合）

### テーブル構造が異なる場合

`getCheckedProductsForAI()` 関数内の列番号を調整:

```javascript
function getCheckedProductsForAI() {
    // ...
    
    // 実際の列番号に合わせて変更
    const product = {
        sku: cells[X]?.textContent?.trim() || '',      // X = SKU列の番号
        title: cells[Y]?.textContent?.trim() || '',     // Y = 商品名列の番号
        title_en: cells[Z]?.textContent?.trim() || '',  // Z = 英語タイトル列
        // ...
    };
    
    // ...
}
```

### 列番号の確認方法

ブラウザのコンソール（F12）で実行:

```javascript
// 最初の商品行のセルを確認
const firstRow = document.querySelector('tbody tr');
const cells = firstRow.querySelectorAll('td');
cells.forEach((cell, index) => {
    console.log(`列${index}: ${cell.textContent.trim()}`);
});
```

---

## ✅ 動作確認手順

### 1. ブラウザで開く

既存システムをブラウザで開く

### 2. コンソールを開く

```
F12 または Cmd + Option + I
→ Console タブ
```

### 3. 初期化メッセージを確認

コンソールに以下が表示されるはず:

```
✅ AI解析用CSVエクスポート機能を初期化しました
```

### 4. ボタンが表示されることを確認

「🤖 AI解析用」ボタンが紫色で表示される

### 5. 1件テスト

```
1. 商品を1つチェック
2. 「🤖 AI解析用」をクリック
3. コンソールに以下が表示:
   🚀 AI解析用CSVエクスポート開始
   📦 商品 1 を処理中...
   ✓ 商品データ: {...}
   ✅ 1件の商品を取得しました
   ✅ クリップボードにコピー成功
```

### 6. データ確認

テキストエディタで Cmd + V して、CSVデータが表示されることを確認

---

## 🐛 トラブルシューティング

### 問題: ボタンが表示されない

**確認1**: JavaScriptが読み込まれているか

```javascript
// コンソールで確認
console.log(typeof exportForAI);
// "function" と表示されるべき
```

**確認2**: HTMLの追加場所

ボタンのHTMLが正しい場所に追加されているか確認

**解決策**: ブラウザのキャッシュをクリア（Cmd + Shift + R）

---

### 問題: クリックしても反応しない

**確認**: コンソールにエラーがないか

```
赤いエラーメッセージを確認
```

**解決策**: 

```javascript
// exportForAI関数が定義されているか確認
if (typeof exportForAI === 'function') {
    console.log('✅ 関数は定義されています');
} else {
    console.log('❌ 関数が見つかりません');
}
```

---

### 問題: データが正しくない

**確認**: 列番号が正しいか

```javascript
// 実際のテーブル構造を確認
const row = document.querySelector('tbody tr');
const cells = row.querySelectorAll('td');
console.log('セル数:', cells.length);
cells.forEach((cell, i) => {
    console.log(`列${i}:`, cell.textContent.trim().substring(0, 20));
});
```

**解決策**: `getCheckedProductsForAI()` 内の列番号を調整

---

### 問題: カテゴリ情報が取得できない

**確認1**: data属性があるか

```javascript
const row = document.querySelector('tbody tr');
console.log('categoryName:', row.dataset.categoryName);
console.log('categoryId:', row.dataset.categoryId);
```

**確認2**: セル内にあるか

```javascript
const cells = row.querySelectorAll('td');
cells.forEach(cell => {
    const text = cell.textContent.trim();
    if (text.includes('CCG') || /^\d{5,6}$/.test(text)) {
        console.log('カテゴリ候補:', text);
    }
});
```

**解決策**: データ取得ロジックを調整（コードにフォールバック機能あり）

---

## 📊 完成イメージ

### 画面レイアウト

```
┌─────────────────────────────────────────┐
│ 商品編集                                 │
├─────────────────────────────────────────┤
│                                          │
│ [保存] [CSV] [🤖 AI解析用]  ← ここ！    │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ ☐ | 画像 | SKU | 商品名 | ...     │  │
│ │ ☑ | 📷  | ABC | ポケモン | ...    │  │
│ │ ☑ | 📷  | DEF | リザードン | ...  │  │
│ └────────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### ボタンの見た目

```
┌──────────────────┐
│  🤖 AI解析用     │ ← 紫色グラデーション
└──────────────────┘

クリック後（3秒間）：
┌──────────────────┐
│ ✓ 2件コピー完了！ │ ← 緑色
└──────────────────┘
```

---

## 🎯 次のステップ

### すぐにテスト（5分）

1. `ai-csv-export-test.html` をブラウザで開く
2. 商品をチェック
3. 「🤖 AI解析用」をクリック
4. Claude Desktopで Cmd + V

### 既存システムに統合（10分）

1. `public/js/ai-csv-export.js` を読み込む
2. HTMLボタンを追加
3. ブラウザで確認
4. 1件テスト

### 本番運用（随時）

1. 複数商品で実行
2. Claude Desktopで処理
3. Next.jsで結果確認
4. 精度を評価

---

## 📞 サポート

### デバッグモード

コンソールに詳細ログが表示されます:

```
🚀 AI解析用CSVエクスポート開始
📦 商品 1 を処理中...
✓ 商品データ: {sku: "...", title: "...", ...}
✅ 1件の商品を取得しました
✅ クリップボードにコピー成功
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ コピー完了！
対象商品: 1件
...
```

### カスタマイズが必要な場合

`ai-csv-export.js` 内の以下の関数を調整:

- `getCheckedProductsForAI()` - データ取得ロジック
- `convertToAICSV()` - CSV形式
- `generateClaudePrompt()` - プロンプト内容

---

**準備完了！実装を開始してください。**
