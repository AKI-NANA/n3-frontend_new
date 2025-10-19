# スコア評価システム分析レポート

## 📊 現在の実装状況

### ✅ **実装済み: 基本スコア評価**

現在の `ebay_search.py` には**シンプルなスコア評価**が実装されています：

#### 1. 利益率スコア（自動計算）

```python
def _estimate_profit_rate(self, price: float) -> float:
    """簡易的な利益率推定"""
    if price < 20:
        return 15.0      # $20未満 → 15%
    elif price < 50:
        return 20.0      # $20-50 → 20%
    elif price < 100:
        return 25.0      # $50-100 → 25%
    elif price < 300:
        return 22.0      # $100-300 → 22%
    else:
        return 18.0      # $300以上 → 18%
```

**問題点**: 
- ❌ 価格だけで判断（精度低い）
- ❌ 実際の仕入れ価格を考慮していない
- ❌ カテゴリ別の違いを反映できていない

#### 2. リスクスコア（0-100点）

```python
def _calculate_risk(self, price: float, country: str, positive_percentage: float):
    """リスクレベルとスコア計算"""
    risk_score = 0
    
    # 価格リスク
    if price > 500:
        risk_score += 30
    elif price > 200:
        risk_score += 20
    elif price > 100:
        risk_score += 10
    
    # 国リスク
    if country not in ['US', 'UK', 'DE', 'JP']:
        risk_score += 20
    
    # セラーリスク
    if positive_percentage < 95:
        risk_score += 30
    elif positive_percentage < 98:
        risk_score += 15
    
    # レベル判定
    if risk_score < 25:
        return 'low', risk_score
    elif risk_score < 50:
        return 'medium', risk_score
    else:
        return 'high', risk_score
```

**評価項目（3つのみ）**:
- ✅ 価格リスク（高額商品ほどリスク高）
- ✅ 出品国リスク（主要国以外はリスク高）
- ✅ セラー評価リスク（評価低いとリスク高）

**不足している項目**:
- ❌ 販売数量（人気度）
- ❌ ウォッチ数（注目度）
- ❌ 競合数
- ❌ 市場トレンド
- ❌ 季節性
- ❌ 偽物リスク
- ❌ 在庫回転率

---

## 🎯 eBay Finding APIで取得できるデータ

### ✅ 取得可能なデータ

| データ項目 | 取得可否 | 備考 |
|-----------|---------|------|
| 商品タイトル | ✅ | 完全取得可能 |
| 価格 | ✅ | 完全取得可能 |
| 送料 | ✅ | 完全取得可能 |
| 画像URL | ✅ | 1枚のみ |
| カテゴリ | ✅ | ID + 名前 |
| 商品状態 | ✅ | New/Used等 |
| セラー名 | ✅ | ユーザー名 |
| セラー国 | ✅ | 国コード |
| セラー評価 | ✅ | スコア + % |
| 出品形式 | ✅ | Auction/FixedPrice |

### ❌ 取得**できない**データ（Finding API制限）

| データ項目 | 取得可否 | 理由 |
|-----------|---------|------|
| 販売済み数量 | ❌ | Finding APIに含まれない |
| ウォッチ数 | ❌ | Finding APIに含まれない |
| 詳細説明文 | ❌ | Finding APIに含まれない |
| 複数画像 | ❌ | Finding APIは1枚のみ |
| 出品者在庫数 | ❌ | 個別APIが必要 |
| 販売履歴 | ❌ | Shopping APIが必要 |

### 🔧 追加データ取得方法

**販売数量・ウォッチ数を取得するには**:

```python
# eBay Shopping API を使う（追加実装必要）
def get_item_details(item_id: str):
    """個別商品の詳細取得"""
    url = "https://open.api.ebay.com/shopping"
    params = {
        'callname': 'GetSingleItem',
        'ItemID': item_id,
        'IncludeSelector': 'Details,ItemSpecifics'
    }
    # 販売数量、ウォッチ数、詳細説明が取得可能
```

**注意**: Shopping APIは別途認証が必要 + レート制限あり

---

## 💡 推奨: 改良版スコア評価システム

### Phase 1: Finding APIデータのみで評価（実装可能）

eBay Finding APIで取得できるデータだけで、より精度の高いスコアを算出:

```python
def calculate_comprehensive_score(product: Dict) -> Dict:
    """
    総合スコア計算（Finding APIデータのみ）
    戻り値: {
        'total_score': 75,  # 0-100点
        'profit_potential': 65,
        'risk_score': 25,
        'market_attractiveness': 80,
        'recommendation': 'BUY'
    }
    """
    scores = {}
    
    # 1. 価格スコア (0-25点)
    price = product['current_price']
    if 50 <= price <= 300:
        scores['price'] = 25  # スイートスポット
    elif 30 <= price < 50 or 300 < price <= 500:
        scores['price'] = 20
    elif price < 30:
        scores['price'] = 10  # 利益取りづらい
    else:
        scores['price'] = 5   # リスク高い
    
    # 2. セラースコア (0-25点)
    seller_score = product['seller_feedback_score']
    seller_positive = product['seller_positive_percentage']
    
    if seller_positive >= 99 and seller_score >= 1000:
        scores['seller'] = 25
    elif seller_positive >= 98 and seller_score >= 500:
        scores['seller'] = 20
    elif seller_positive >= 95:
        scores['seller'] = 15
    else:
        scores['seller'] = 5
    
    # 3. 国・地域スコア (0-20点)
    country = product['seller_country']
    if country in ['US', 'JP']:
        scores['location'] = 20
    elif country in ['UK', 'DE', 'CA', 'AU']:
        scores['location'] = 15
    else:
        scores['location'] = 5
    
    # 4. カテゴリスコア (0-15点)
    category_id = product['category_id']
    # 人気カテゴリ判定
    popular_categories = ['293', '550', '15032', '625']
    if category_id in popular_categories:
        scores['category'] = 15
    else:
        scores['category'] = 8
    
    # 5. 商品状態スコア (0-15点)
    condition = product['condition']
    if condition == 'New':
        scores['condition'] = 15
    elif condition == 'Refurbished':
        scores['condition'] = 12
    elif condition == 'Used':
        scores['condition'] = 8
    else:
        scores['condition'] = 5
    
    # 総合スコア計算
    total = sum(scores.values())
    
    # 判定
    if total >= 80:
        recommendation = 'STRONG_BUY'
    elif total >= 65:
        recommendation = 'BUY'
    elif total >= 50:
        recommendation = 'CONSIDER'
    else:
        recommendation = 'PASS'
    
    return {
        'total_score': total,
        'breakdown': scores,
        'recommendation': recommendation,
        'confidence': 'MEDIUM'  # Finding APIのみなので中程度
    }
```

### Phase 2: CSV + AI分析（推奨アプローチ）

**フロー**:
1. eBay Finding APIでデータ取得
2. Phase 1の基本スコア計算
3. **CSV形式でエクスポート**
4. **Web AIに貼り付けて高度な分析**
5. AI分析結果を手動でSupabaseに追加

**CSVエクスポート機能実装**:

```typescript
// フロントエンド: ResultsContainer.tsx に追加
function exportToCSV(products: ResearchProduct[]) {
  const csvData = products.map(p => ({
    'eBay Item ID': p.ebay_item_id,
    'Title': p.title,
    'Price': p.current_price,
    'Category': p.category_name,
    'Condition': p.condition,
    'Seller': p.seller_username,
    'Seller Rating': p.seller_positive_percentage,
    'Country': p.seller_country,
    'Basic Score': p.risk_score,
    'Profit Rate': p.profit_rate,
    'Risk Level': p.risk_level,
    'URL': p.item_url
  }));
  
  // CSV変換
  const csv = Papa.unparse(csvData);
  
  // ダウンロード
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ebay-research-${Date.now()}.csv`;
  a.click();
}
```

**AI分析用プロンプト（Claudeに貼り付け）**:

```
以下のeBay商品データを分析して、各商品に以下のスコアを付けてください：

1. 総合スコア (0-100点)
2. 利益ポテンシャル (0-100点)
3. 市場魅力度 (0-100点)
4. リスクスコア (0-100点)
5. 推奨度 (STRONG_BUY/BUY/CONSIDER/PASS)
6. 売れる理由 (箇条書き)
7. リスク要因 (箇条書き)

[CSVデータを貼り付け]

結果はJSONで返してください。
```

**AI分析結果の例**:

```json
{
  "products": [
    {
      "ebay_item_id": "123456789",
      "ai_scores": {
        "total_score": 85,
        "profit_potential": 78,
        "market_attractiveness": 90,
        "risk_score": 15
      },
      "recommendation": "STRONG_BUY",
      "selling_reasons": [
        "人気ブランドのビンテージカメラ",
        "市場需要が高い価格帯",
        "セラーの評価が非常に高い",
        "競合が少ない"
      ],
      "risk_factors": [
        "中古品のため検品が必要",
        "送料が若干高め"
      ],
      "confidence": "HIGH"
    }
  ]
}
```

### Phase 3: Shopping API連携（高度な分析）

**販売数・ウォッチ数を含めた完全スコア**:

```python
def calculate_advanced_score(product: Dict, item_details: Dict) -> Dict:
    """
    Shopping APIデータも含めた高度スコア
    """
    # 基本スコア
    basic = calculate_comprehensive_score(product)
    
    # 追加データでスコア補正
    sold_quantity = item_details.get('quantity_sold', 0)
    watch_count = item_details.get('watch_count', 0)
    
    # 人気度ボーナス
    popularity_bonus = 0
    if sold_quantity > 100:
        popularity_bonus += 15
    elif sold_quantity > 50:
        popularity_bonus += 10
    elif sold_quantity > 20:
        popularity_bonus += 5
    
    if watch_count > 500:
        popularity_bonus += 10
    elif watch_count > 100:
        popularity_bonus += 5
    
    # 総合スコアに反映
    total = basic['total_score'] + popularity_bonus
    total = min(total, 100)  # 最大100点
    
    return {
        'total_score': total,
        'basic_score': basic['total_score'],
        'popularity_bonus': popularity_bonus,
        'sold_quantity': sold_quantity,
        'watch_count': watch_count,
        'recommendation': get_recommendation(total),
        'confidence': 'HIGH'
    }
```

---

## 🎯 推奨実装順序

### ステップ1: 基本スコア改善（1日）
✅ **すぐ実装可能**

`ebay_search.py` の `_calculate_risk()` と `_estimate_profit_rate()` を改良版に置き換え

### ステップ2: CSVエクスポート機能（半日）
✅ **AI分析の準備**

- ResultsContainer にエクスポートボタン追加
- CSV形式でダウンロード
- AI分析用プロンプトを用意

### ステップ3: AI分析結果の手動インポート（半日）
✅ **精度向上**

- AI分析結果をJSON形式でコピー
- Supabaseに手動アップデート
- または専用インポート画面作成

### ステップ4: Shopping API連携（3-5日）
🟡 **より高度な分析が必要な場合**

- eBay Shopping API認証設定
- 販売数・ウォッチ数取得
- スコア再計算

---

## 📊 スコア評価の完成イメージ

### 商品カード表示

```
┌─────────────────────────────────┐
│ 📷 Vintage Nikon F3 Camera      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 💰 $299.99  🚚 $15.00           │
│                                  │
│ ⭐ 総合スコア: 85/100 🔥         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 📈 利益ポテンシャル: 78/100     │
│ 🎯 市場魅力度: 90/100            │
│ ⚠️ リスク: 15/100 (低)          │
│                                  │
│ ✅ 推奨: STRONG BUY              │
│                                  │
│ 💡 売れる理由:                   │
│ • 人気ブランドビンテージ         │
│ • 需要が高い価格帯               │
│ • セラー評価◎                   │
│                                  │
│ [eBay] [利益計算] [メモ]        │
└─────────────────────────────────┘
```

---

## ✅ 結論

### 現状のスコア評価

| 項目 | 状態 | 精度 |
|------|------|------|
| リスクスコア | ✅ 実装済み | ⭐⭐⭐ (3/5) |
| 利益率推定 | ✅ 実装済み | ⭐⭐ (2/5) |
| 総合スコア | ❌ 未実装 | - |
| AI分析 | ❌ 未実装 | - |

### 推奨アプローチ

✅ **Phase 1**: 基本スコア改善（Finding APIのみ）→ **即実装可能**  
✅ **Phase 2**: CSV + AI分析（無課金でも可能）→ **推奨**  
🟡 **Phase 3**: Shopping API（より精密な分析）→ **必要に応じて**

**Phase 1 + 2 の組み合わせが最もコスパが良い！**