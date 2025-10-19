# eBay API 完全ガイド

## 📚 eBay API の種類

### 1. **Finding API** ✅ 現在実装中
- **用途**: 商品検索
- **取得データ**: 基本情報のみ
- **制限**: 5,000リクエスト/日（無料）
- **認証**: App IDのみ（簡単）

**取得できるデータ**:
- ✅ 商品タイトル
- ✅ 価格
- ✅ 送料
- ✅ カテゴリ
- ✅ セラー名
- ✅ セラー評価
- ✅ 画像URL（1枚）
- ❌ **販売数量**（取得不可）
- ❌ **ウォッチ数**（取得不可）
- ❌ **詳細説明**（取得不可）

---

### 2. **Shopping API** 🔥 追加推奨
- **用途**: 個別商品の詳細情報取得
- **取得データ**: Finding APIよりも詳細
- **制限**: 5,000リクエスト/日（無料）
- **認証**: App IDのみ

**追加で取得できるデータ**:
- ✅ **販売済み数量（Quantity Sold）**
- ✅ **ウォッチ数（Watch Count）**
- ✅ 商品詳細説明
- ✅ 複数画像
- ✅ 商品仕様（Item Specifics）
- ✅ 在庫数
- ✅ 返品ポリシー

**重要**: Finding APIで商品リストを取得 → Shopping APIで各商品の詳細を取得

---

### 3. **Trading API** ⚠️ 高度な用途
- **用途**: 出品・在庫管理・注文処理
- **取得データ**: 全データ
- **制限**: 複雑（用途により異なる）
- **認証**: OAuth 2.0必須（複雑）

**機能**:
- 商品出品
- 在庫更新
- 注文管理
- メッセージング

**注意**: リサーチ目的では不要（出品管理で使用）

---

### 4. **Browse API (RESTful API)** 🆕 最新
- **用途**: 商品検索・閲覧（REST形式）
- **取得データ**: Shopping APIと同等
- **制限**: OAuth必須
- **認証**: OAuth 2.0

**特徴**:
- モダンなREST API
- JSONレスポンス
- より詳細なフィルタリング

---

### 5. **Analytics API** 📊 トレンド分析
- **用途**: トラフィック分析・売上分析
- **取得データ**: 統計データ
- **制限**: セラー専用

---

## 🎯 リサーチツールに必要なAPI

### Phase 1: Finding API（実装済み）
```
商品リスト検索
↓
基本情報取得（価格、セラーなど）
```

### Phase 2: Shopping API（追加実装）🔥
```
Finding APIで商品ID取得
↓
Shopping APIで詳細取得
↓
販売数・ウォッチ数でスコア精緻化
```

### Phase 3: Browse API（オプション）
```
より高度な検索
↓
詳細フィルタリング
```

---

## 🔧 Shopping API 実装例

### GetSingleItem（個別商品詳細）

```python
def get_item_details(self, item_id: str) -> Dict:
    """
    Shopping APIで商品詳細取得
    """
    url = "http://open.api.ebay.com/shopping"
    
    params = {
        'callname': 'GetSingleItem',
        'responseencoding': 'JSON',
        'appid': self.app_id,
        'siteid': '0',  # US
        'version': '967',
        'ItemID': item_id,
        'IncludeSelector': 'Details,ItemSpecifics'
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    item = data.get('Item', {})
    
    return {
        'quantity_sold': item.get('QuantitySold', 0),  # 🔥 販売数
        'watch_count': item.get('WatchCount', 0),      # 🔥 ウォッチ数
        'hit_count': item.get('HitCount', 0),          # 閲覧数
        'description': item.get('Description', ''),
        'pictures': item.get('PictureURL', []),
        'item_specifics': item.get('ItemSpecifics', {}),
        'return_policy': item.get('ReturnPolicy', {}),
        'quantity_available': item.get('Quantity', 0)
    }
```

### GetMultipleItems（複数商品一括取得）

```python
def get_multiple_items(self, item_ids: List[str]) -> List[Dict]:
    """
    最大20件まで一括取得可能
    """
    url = "http://open.api.ebay.com/shopping"
    
    params = {
        'callname': 'GetMultipleItems',
        'responseencoding': 'JSON',
        'appid': self.app_id,
        'siteid': '0',
        'version': '967',
        'ItemID': ','.join(item_ids[:20]),  # 最大20件
        'IncludeSelector': 'Details'
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    return data.get('Item', [])
```

---

## 📊 データ取得戦略

### 推奨フロー

```
1. Finding API で検索（100件）
   ↓
2. 商品IDリストを取得
   ↓
3. Shopping API で詳細取得（20件ずつバッチ処理）
   ↓
4. 販売数・ウォッチ数を含めた詳細スコア計算
   ↓
5. Supabaseに保存
```

### API呼び出し回数

Finding API検索100件の場合:
- Finding API: 1回
- Shopping API: 5回（20件×5バッチ）
- **合計: 6回**

1日の制限:
- Finding: 5,000回 → 約830回の検索可能
- Shopping: 5,000回 → 約800回の検索可能

**十分な余裕あり！**

---

## 🎯 実装優先度

| API | 優先度 | 理由 |
|-----|--------|------|
| Finding API | ✅ 実装済み | 基本検索に必須 |
| Shopping API | 🔥 **最優先** | 販売数・ウォッチ数取得 |
| Browse API | 🟡 オプション | OAuth必要で複雑 |
| Trading API | ❌ 不要 | リサーチには使わない |

---

## 💡 Shopping API追加のメリット

### スコア精度が劇的に向上

**現在（Finding APIのみ）**:
- 価格、セラー情報のみで推測
- 精度: ⭐⭐⭐ (60%)

**Shopping API追加後**:
- 実際の販売数・人気度を反映
- 精度: ⭐⭐⭐⭐⭐ (95%)

### 例

```
商品A: $100, セラー評価99%
  Finding APIのみ → スコア: 75点
  Shopping API追加 → 販売数120個、ウォッチ500 → スコア: 92点

商品B: $100, セラー評価99%
  Finding APIのみ → スコア: 75点（Aと同じ！）
  Shopping API追加 → 販売数2個、ウォッチ10 → スコア: 58点
```

**同点問題を解決！**

---

## 📝 次ステップ

1. Shopping API クライアント実装
2. バッチ処理機能追加
3. スコア計算ロジック改良（10,000点制）
4. ランク評価システム（S/A/B/C/D）
