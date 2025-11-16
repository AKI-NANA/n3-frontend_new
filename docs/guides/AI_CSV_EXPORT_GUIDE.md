# 🎯 AI解析用CSVエクスポート機能 - 実装ガイド

## ✅ 理解した内容

あなたの要望:
1. ✅ チェックがついたデータのみ
2. ✅ AI解析に必要な項目のみ
3. ✅ CSVダウンロードボタン

---

## 🚀 実装方法（3ステップ）

### ステップ1: HTMLボタン追加

**場所**: 既存の「CSV」ドロップダウンの隣

```html
<button 
  id="ai-csv-export" 
  class="btn btn-purple"
  onclick="exportForAI()"
>
  🤖 AI解析用CSV
</button>
```

---

### ステップ2: CSS追加

**場所**: `<style>`タグ内または既存CSSファイル

```css
.btn-purple {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}

.btn-purple:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-purple.copied {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
}
```

---

### ステップ3: JavaScript追加

**場所**: `<script>`タグ内または既存JSファイル

```javascript
function exportForAI() {
  // チェックされた商品を取得
  const products = getCheckedProductsForAI();
  
  if (products.length === 0) {
    alert('商品を選択してください');
    return;
  }
  
  // CSV + プロンプト生成
  const csv = convertToAICSV(products);
  const prompt = generateClaudePrompt(csv, products.length);
  
  // クリップボードにコピー
  navigator.clipboard.writeText(prompt);
  
  // ボタンの表示変更
  const btn = document.getElementById('ai-csv-export');
  btn.classList.add('copied');
  btn.textContent = `✓ ${products.length}件コピー完了！`;
  
  setTimeout(() => {
    btn.classList.remove('copied');
    btn.textContent = '🤖 AI解析用CSV';
  }, 3000);
}

function getCheckedProductsForAI() {
  const products = [];
  const rows = document.querySelectorAll('tbody tr');
  
  rows.forEach(row => {
    const checkbox = row.querySelector('input[type="checkbox"]');
    if (!checkbox || !checkbox.checked) return;
    
    const cells = row.querySelectorAll('td');
    products.push({
      sku: cells[2]?.textContent?.trim() || '',
      title: cells[3]?.textContent?.trim() || '',
      title_en: cells[4]?.textContent?.trim() || '',
      price_jpy: cells[5]?.textContent?.trim() || '',
      length_cm: cells[6]?.textContent?.trim() || '',
      width_cm: cells[7]?.textContent?.trim() || '',
      height_cm: cells[8]?.textContent?.trim() || '',
      weight_g: cells[9]?.textContent?.trim() || ''
    });
  });
  
  return products;
}

function convertToAICSV(products) {
  const headers = ['SKU', '商品名', '英語タイトル', '価格(円)', '長さ(cm)', '幅(cm)', '高さ(cm)', '重さ(g)'];
  const rows = [headers.join(',')];
  
  products.forEach(p => {
    rows.push([
      p.sku,
      `"${p.title}"`,
      `"${p.title_en}"`,
      p.price_jpy,
      p.length_cm,
      p.width_cm,
      p.height_cm,
      p.weight_g
    ].join(','));
  });
  
  return rows.join('\n');
}

function generateClaudePrompt(csv, count) {
  return `以下の${count}件の商品を処理してください：

${csv}

各商品について：
1. hs_codesテーブルでHTSコード検索
2. 原産国判定
3. customs_dutiesテーブルで関税率取得
4. productsテーブルのlisting_dataを更新

完了後、処理サマリーを表示してください。`;
}
```

---

## 📋 エクスポートされるデータ

### 必須項目のみ（AI解析用）

```csv
SKU,商品名,英語タイトル,価格(円),長さ(cm),幅(cm),高さ(cm),重さ(g)
NF5CA8F114-AF7!,"Pokemon Card Gengar VMAX","Pokemon Card Gengar VMAX",3500,20,15,2,100
OP-LUFFY-G5-00,"ワンピース フィギュアルフィ","One Piece Figure Luffy",8500,30,20,25,500
```

### 不要な項目（除外）

- ❌ 画像URL（長すぎる）
- ❌ 詳細説明（不要）
- ❌ 出品先情報（後で追加）
- ❌ 配送情報（後で追加）

---

## 💡 使用フロー

```
┌─────────────────────────────────────┐
│ 1. 画面で商品をチェック              │
│    ☑ Pokemon Card                   │
│    ☑ ワンピース                     │
│    ☐ その他                         │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│ 2. 「🤖 AI解析用CSV」クリック       │
│    → 自動的にクリップボードにコピー  │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│ 3. Claude Desktopで Cmd + V         │
│    → プロンプト付きCSVが貼り付け     │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│ 4. Enter押すだけ                    │
│    → 自動処理開始                   │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│ 5. 5分後に完了                      │
│    → データベース自動更新            │
└─────────────────────────────────────┘
```

---

## 🎯 実装ファイル

### 必要なファイル修正

```
index.php（またはメインのPHPファイル）
├─ HTMLボタン追加（1箇所）
├─ CSS追加（1箇所）
└─ JavaScript追加（1箇所）
```

### 参考コード

完全なコードは以下のファイルにあります：
- `ai-csv-export.js` - JavaScript関数
- `ai-csv-export-implementation.php` - 完全な実装例

---

## ✅ テスト手順

### ステップ1: ボタン表示確認

```
1. ページをリロード
2. 「🤖 AI解析用CSV」ボタンが表示されることを確認
3. ボタンにマウスオーバーでアニメーション確認
```

### ステップ2: 機能テスト

```
1. 商品を1つチェック
2. 「🤖 AI解析用CSV」をクリック
3. ボタンが「✓ 1件コピー完了！」に変わることを確認
4. 3秒後に元に戻ることを確認
```

### ステップ3: データ確認

```
1. テキストエディタを開く
2. Cmd + V で貼り付け
3. CSVデータ + プロンプトが表示されることを確認
```

### ステップ4: Claude Desktopテスト

```
1. Claude Desktopを開く
2. Cmd + V で貼り付け
3. Enter押して処理実行
4. 結果を確認
```

---

## 🚨 トラブルシューティング

### 問題1: ボタンが表示されない

**原因**: HTMLの追加場所が間違っている

**解決策**:
```html
<!-- この位置を確認 -->
<div class="toolbar">
  <button class="btn">CSV</button>
  
  <!-- ここに追加 👇 -->
  <button id="ai-csv-export" class="btn btn-purple" onclick="exportForAI()">
    🤖 AI解析用CSV
  </button>
</div>
```

---

### 問題2: クリックしても反応しない

**原因**: JavaScriptのエラー

**解決策**:
```javascript
// ブラウザのコンソール（F12）でエラーを確認
// エラーメッセージをコピーして対処
```

---

### 問題3: データが正しくない

**原因**: テーブルの列番号が違う

**解決策**:
```javascript
// getCheckedProductsForAI()関数で
// cells[X]の番号を実際のテーブルに合わせて調整

// 例: SKUが3列目なら
sku: cells[2]?.textContent?.trim() || '' // 0から始まるので2
```

---

### 問題4: コピーできない

**原因**: HTTPSではない、または古いブラウザ

**解決策**:
```
1. HTTPSでアクセスしているか確認
2. または手動コピー機能を追加
```

---

## 📝 カスタマイズ

### エクスポート項目を増やす

```javascript
// convertToAICSV()関数で項目追加
const headers = [
  'SKU', '商品名', '価格', 
  'カテゴリ', // 追加
  '状態'      // 追加
];

products.forEach(p => {
  rows.push([
    p.sku,
    p.title,
    p.price_jpy,
    p.category,   // 追加
    p.condition   // 追加
  ].join(','));
});
```

---

## 🎉 完成イメージ

### ボタン表示

```
┌──────────┬────────────────────┐
│   CSV ▼  │ 🤖 AI解析用CSV     │
└──────────┴────────────────────┘
```

### クリック後

```
┌──────────┬─────────────────────┐
│   CSV ▼  │ ✓ 5件コピー完了！   │
└──────────┴─────────────────────┘
```

### コピーされる内容

```
以下の5件の商品を処理してください：

SKU,商品名,英語タイトル,価格(円),長さ(cm),幅(cm),高さ(cm),重さ(g)
NF5CA8F114-AF7!,"Pokemon Card","Pokemon Card",3500,20,15,2,100
...

各商品について：
1. HTSコード判定
2. 関税率取得
3. データベース更新

完了後、サマリーを表示してください。
```

---

## 💰 工数見積もり

| タスク | 時間 |
|--------|------|
| HTMLボタン追加 | 2分 |
| CSS追加 | 2分 |
| JavaScript追加 | 5分 |
| テスト | 3分 |
| **合計** | **12分** |

---

## ✅ チェックリスト

実装前:
- [ ] 既存のCSVボタンの位置を確認
- [ ] テーブルの列構造を確認
- [ ] JavaScriptファイルの場所を確認

実装:
- [ ] HTMLボタンを追加
- [ ] CSSを追加
- [ ] JavaScriptを追加

テスト:
- [ ] ボタンが表示される
- [ ] クリックで反応する
- [ ] データが正しくコピーされる
- [ ] Claude Desktopで動作する

---

**現在の状態**: 実装コード準備完了  
**次のステップ**: 既存のPHPファイルに上記コードを追加  
**所要時間**: 12分
