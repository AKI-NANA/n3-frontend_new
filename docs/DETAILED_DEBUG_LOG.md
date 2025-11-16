# 詳細デバッグログ追加完了

## ✅ **追加したログ**

### **1. 商品データ読み込み時（useProductData.ts）**
```typescript
console.log('📂 商品データ読み込み中...')
console.log('✅ 商品データ取得完了:', {
  合計: count,
  取得件数: data.length,
  最初の3件: data.slice(0, 3).map(p => ({
    id: p.id,
    idType: typeof p.id,
    title: p.title?.substring(0, 30)
  }))
})
```

### **2. SM分析クリック時（page.tsx）**
```typescript
console.log('3. 選択された商品:', selectedProducts.map(p => ({
  id: p.id,
  idType: typeof p.id,
  title: p.title?.substring(0, 30)
})))
```

### **3. Supabase検索時（sellermirror-analyze/route.ts, research/route.ts）**
```typescript
console.log('  Supabase検索開始...')
console.log('  検索条件: id IN', validIds)
console.log('  Supabase検索結果:', { data, error, 取得件数 })
```

---

## 🧪 **テスト手順**

### **1. サーバーを完全に再起動**
```bash
# Ctrl+C で停止
# .nextフォルダをクリア（キャッシュクリア）
rm -rf .next
npm run dev
```

### **2. ブラウザのキャッシュをクリア**
- **Chrome/Edge**: `Shift + F5` または `Ctrl + Shift + R`
- **Firefox**: `Ctrl + Shift + R`
- **Safari**: `Cmd + Option + R`

### **3. Editingページを開く**
```
http://localhost:3000/tools/editing
```

### **4. コンソールを開く**
- **Chrome**: `F12` → Console タブ
- **Firefox**: `F12` → Console タブ
- **Safari**: `Cmd + Option + C`

### **5. ページロード時のログを確認**
```
期待されるログ:
📂 商品データ読み込み中...
✅ 商品データ取得完了: {
  合計: 5,
  取得件数: 5,
  最初の3件: [
    { id: 6, idType: 'number', title: 'DJI Mini 4 Pro Fly More コンボ' },
    { id: 7, idType: 'number', title: 'PlayStation 5 デジタルエディション ...' },
    { id: 8, idType: 'number', title: 'Nikon Z 24-70mm f/2.8 S 美品...' }
  ]
}
```

**確認事項**:
- ✅ `idType: 'number'` → 整数IDが正しく取得されている
- ❌ `idType: 'string'` で値がUUID → 問題あり

### **6. 商品を1つ選択**
- 商品ID 6（DJI Mini 4 Pro）を選択

### **7. 「SM分析」ボタンをクリック**

### **8. コンソールログ全体をコピー**

**期待されるログ:**
```
=== SM分析開始 ===
1. selectedIds: [ '6' ]
2. selectedIds JSON: ["6"]
3. 選択された商品: [
  { id: 6, idType: 'number', title: 'DJI Mini 4 Pro Fly More コンボ' }
]
🔍 SellerMirror分析開始: 1件
  productIds: [ '6' ]
  validIds: [ '6' ]
  Supabase検索開始...
  検索条件: id IN [ '6' ]
  Supabase検索結果:
    data: [ { id: 6, title: '...', ... } ]
    error: null
    取得件数: 1
✅ 商品データ取得成功: 1件
```

---

## 🔍 **確認すべきポイント**

### **ケース1: IDが最初から整数（正常）**
```
📂 商品データ読み込み中...
✅ 最初の3件: [
  { id: 6, idType: 'number', ... }
]
```
→ ✅ 正常

### **ケース2: IDがUUIDで取得される（異常）**
```
📂 商品データ読み込み中...
✅ 最初の3件: [
  { id: '5ca8f114-af75-4e80-9683-004a20d0df3a', idType: 'string', ... }
]
```
→ ❌ fetchProducts()関数が間違ったデータを返している

### **ケース3: 選択時にIDが変わる（異常）**
```
3. 選択された商品: [
  { id: '5ca8f114-af75-4e80-9683-004a20d0df3a', idType: 'string', ... }
]
```
→ ❌ フロントエンドで何かがIDを変更している

---

## 📋 **共有してほしい情報**

### **1. コンソールログ全体**
特に以下の部分:
- `📂 商品データ読み込み中...` の後のログ
- `=== SM分析開始 ===` の後のログ全て
- `Supabase検索結果` のログ

### **2. ブラウザのDevToolsでの確認**
1. `F12` でDevToolsを開く
2. `Console` タブを選択
3. `Application` または `Storage` タブを選択
4. `Local Storage` → あなたのサイトのURL
5. 保存されているデータを確認

---

## 🎯 **問題の特定方法**

### **問題A: データベースから取得時点でUUID**
```
✅ 最初の3件: [ { id: 'UUID文字列', ... } ]
```
→ `fetchProducts()`関数またはSupabaseクエリの問題

### **問題B: 選択時にUUIDに変わる**
```
✅ 最初の3件: [ { id: 6, idType: 'number', ... } ]
3. 選択された商品: [ { id: 'UUID', ... } ]
```
→ EditingTable内でIDが変更されている

### **問題C: Supabase検索時の型変換エラー**
```
  検索条件: id IN [ '6' ]
  data: null
  error: { message: "..." }
```
→ Supabaseの設定またはRLSの問題

---

## 🚀 **次のアクション**

1. **サーバー完全再起動** + **ブラウザキャッシュクリア**
2. **Editingページを開く**
3. **コンソールログ全体をコピーして共有**

これで問題が特定できます！
