# 📊 スコア評価システム完全実装ガイド

## ✅ 実装完了した機能

### 1. 改良版スコア計算システム
- ✅ `desktop-crawler/score_calculator.py` 作成完了
- ✅ 5つの評価軸で総合スコア算出
- ✅ リスクスコア詳細分析
- ✅ 推奨度自動判定

### 2. CSVエクスポート + AI分析機能
- ✅ `app/research/components/CSVExportButton.tsx` 作成完了
- ✅ ワンクリックCSVダウンロード
- ✅ AI分析用プロンプト自動生成
- ✅ Claude.ai連携ガイド内蔵

---

## 🎯 スコア評価の詳細

### 評価軸（5つ）

| 評価項目 | 配点 | 評価基準 |
|---------|------|---------|
| **価格スコア** | 0-100 | 最適価格帯は$50-150で100点 |
| **セラースコア** | 0-100 | 評価99.5%以上 + フィードバック10,000以上で100点 |
| **地域スコア** | 0-100 | US/JPから発送で100点 |
| **カテゴリスコア** | 0-100 | 人気カテゴリで90点 |
| **商品状態スコア** | 0-100 | 新品で100点、中古で50点 |

### 総合スコア計算式

```
総合スコア = (
  利益ポテンシャル × 0.35 +
  市場魅力度 × 0.30 +
  セラースコア × 0.20 +
  地域スコア × 0.15
) × (1 - リスクスコア / 200)
```

### 推奨度判定

| スコア範囲 | リスク | 推奨度 | 意味 |
|-----------|--------|--------|------|
| 80以上 | <30 | **STRONG_BUY** | 強く推奨 |
| 65以上 | <50 | **BUY** | 推奨 |
| 50以上 | - | **CONSIDER** | 要検討 |
| 50未満 | - | **PASS** | 見送り |

---

## 🚀 実装手順

### Step 1: score_calculator.py を統合（15分）

#### 1-1. ファイル配置

```bash
cd desktop-crawler
# score_calculator.py を作成（上記コード）
```

#### 1-2. ebay_search.py を更新

```python
# ebay_search.py の先頭に追加
from score_calculator import ScoreCalculator

class EbaySearchClient:
    def __init__(self):
        # 既存のコード...
        self.score_calculator = ScoreCalculator()  # 追加
    
    def _parse_item(self, item: Dict, search_query: str):
        # 既存のパース処理...
        
        # 旧スコア計算を削除して、新スコア計算を追加
        # profit_rate = self._estimate_profit_rate(current_price)  # 削除
        # risk_level, risk_score = self._calculate_risk(...)  # 削除
        
        # 新スコア計算
        score_result = self.score_calculator.calculate_comprehensive_score({
            'current_price': current_price,
            'seller_feedback_score': int(feedback_score) if feedback_score else 0,
            'seller_positive_percentage': float(positive_percentage) if positive_percentage else 0,
            'seller_country': seller_country,
            'category_id': category_id,
            'condition': condition,
            'shipping_cost': shipping_cost
        })
        
        product = {
            # 既存のフィールド...
            'profit_rate': score_result['profit_potential'],  # 更新
            'estimated_japan_cost': current_price * (100 - score_result['profit_potential']) / 100,
            'risk_level': self._convert_risk_to_level(score_result['risk_score']),
            'risk_score': score_result['risk_score'],
            'ai_analysis': {  # 新規追加
                'total_score': score_result['total_score'],
                'market_attractiveness': score_result['market_attractiveness'],
                'recommendation': score_result['recommendation'],
                'confidence': score_result['confidence'],
                'reasons': score_result['reasons'],
                'warnings': score_result['warnings'],
                'breakdown': score_result['breakdown']
            },
            # ...
        }
        
        return product
    
    def _convert_risk_to_level(self, risk_score: float) -> str:
        """リスクスコアをレベルに変換"""
        if risk_score < 25:
            return 'low'
        elif risk_score < 50:
            return 'medium'
        else:
            return 'high'
```

#### 1-3. 動作確認

```bash
python ebay_search.py
```

出力例:
```
Parsed 20 products from eBay API
Saved 20 products to Supabase

商品スコア:
  総合: 85.3/100
  利益ポテンシャル: 78.5/100
  市場魅力度: 88.2/100
  リスク: 18.5/100
  推奨: STRONG_BUY
```

---

### Step 2: CSVエクスポート機能追加（10分）

#### 2-1. コンポーネント作成

`app/research/components/CSVExportButton.tsx` を作成（上記コード）

#### 2-2. ResultsContainer に統合

```typescript
// app/research/components/ResultsContainer.tsx
import { CSVExportButton } from './CSVExportButton';

export function ResultsContainer({ results, onClose }: ResultsContainerProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-[var(--research-background-light)] p-6 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2>...</h2>
          
          <div className="flex items-center gap-4">
            {/* 既存のボタン... */}
            
            {/* CSVエクスポート追加 */}
            <CSVExportButton products={results} />
          </div>
        </div>
      </div>
      {/* ... */}
    </div>
  );
}
```

#### 2-3. Textarea コンポーネント確認

shadcn/ui の Textarea が必要:

```bash
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add dialog
```

---

### Step 3: スコア表示の改善（15分）

#### 3-1. ProductCard を更新

```typescript
// app/research/components/ProductCard.tsx
export function ProductCard({ product }: ProductCardProps) {
  const aiAnalysis = product.ai_analysis;
  
  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg...">
      {/* 既存のコード... */}
      
      {/* スコア表示セクション追加 */}
      {aiAnalysis && (
        <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">総合スコア</span>
            <span className="text-2xl font-bold text-purple-600">
              {aiAnalysis.total_score}/100
            </span>
          </div>
          
          {/* スコアバー */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
              style={{ width: `${aiAnalysis.total_score}%` }}
            ></div>
          </div>
          
          {/* 推奨度バッジ */}
          <div className="mt-2">
            {aiAnalysis.recommendation === 'STRONG_BUY' && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">
                ⭐ 強く推奨
              </span>
            )}
            {aiAnalysis.recommendation === 'BUY' && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">
                👍 推奨
              </span>
            )}
            {aiAnalysis.recommendation === 'CONSIDER' && (
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">
                🤔 要検討
              </span>
            )}
            {aiAnalysis.recommendation === 'PASS' && (
              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">
                ❌ 見送り
              </span>
            )}
          </div>
          
          {/* 理由表示 */}
          {aiAnalysis.reasons && aiAnalysis.reasons.length > 0 && (
            <div className="mt-2 text-xs text-gray-600">
              <div className="font-semibold mb-1">推奨理由:</div>
              <ul className="list-disc list-inside space-y-1">
                {aiAnalysis.reasons.slice(0, 3).map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 💡 AI分析の使い方（無料）

### 方法1: Claude.ai（推奨）

1. **CSVエクスポート**
   - 検索結果画面で「AI分析用データ生成」をクリック
   - 「プロンプトをコピー」ボタンをクリック

2. **Claude.aiで分析**
   - https://claude.ai にアクセス（無料アカウントでOK）
   - 新しいチャットを開始
   - コピーしたプロンプトを貼り付けて送信

3. **結果活用**
   - Claude が JSON形式で詳細分析を返却
   - 総合スコア、理由、リスクなどが含まれる
   - 結果をコピーして保存

### 方法2: ChatGPT / Gemini

同じプロンプトで分析可能（無料版でも使える）

### 分析結果の例

```json
{
  "products": [
    {
      "ebay_item_id": "123456789",
      "ai_enhanced_scores": {
        "total_score": 88,
        "profit_potential": 82,
        "market_attractiveness": 92,
        "risk_score": 12
      },
      "recommendation": "STRONG_BUY",
      "selling_reasons": [
        "ビンテージカメラ市場は安定した需要がある",
        "Nikon F3は特に人気が高いモデル",
        "価格帯が適切で利益確保しやすい",
        "セラーの評価が極めて高い"
      ],
      "risk_factors": [
        "中古品のため動作確認が必要",
        "レンズ等のアクセサリーの有無を確認"
      ],
      "recommended_actions": [
        "即座に仕入れ候補に追加",
        "セラーに商品状態を詳細確認",
        "類似商品の価格動向をモニタリング"
      ]
    }
  ]
}
```

---

## 📊 データフロー

```
[eBay Finding API]
     ↓ 商品データ取得
[ScoreCalculator]
     ↓ 基本スコア計算
[Supabase保存]
     ↓
[フロントエンド表示]
     ↓
[CSVエクスポート] → [Claude.ai分析] → [高度な洞察]
                                         ↓
                                    [手動でSupabase更新]
```

---

## ✅ 完成後のスコア表示

```
┌─────────────────────────────────────┐
│ 📷 Vintage Nikon F3 Camera          │
│ $299.99 + $15.00 送料               │
├─────────────────────────────────────┤
│ ⭐ 総合スコア: 88/100 🔥            │
│ ████████████████████░ 88%           │
│                                      │
│ 📊 詳細スコア:                       │
│ • 利益ポテンシャル: 82/100          │
│ • 市場魅力度: 92/100                 │
│ • リスク: 12/100 (低)               │
│                                      │
│ ✅ 推奨: STRONG_BUY                 │
│                                      │
│ 💡 推奨理由:                         │
│ ✓ 最適な価格帯                       │
│ ✓ 信頼できるセラー                   │
│ ✓ 人気カテゴリ                       │
│                                      │
│ [eBay] [利益計算] [AI分析]          │
└─────────────────────────────────────┘
```

---

## 🎯 まとめ

### ✅ 実装済み機能

| 機能 | 状態 | コスト |
|------|------|--------|
| 基本スコア計算 | ✅ 完成 | 無料 |
| 5軸評価システム | ✅ 完成 | 無料 |
| リスクスコア詳細 | ✅ 完成 | 無料 |
| CSVエクスポート | ✅ 完成 | 無料 |
| AI分析プロンプト | ✅ 完成 | 無料 |
| Claude.ai連携 | ✅ 対応 | 無料* |

*Claude.ai無料プランで十分使える

### 💰 コスト比較

| 方法 | 月額コスト | 精度 | 手間 |
|------|-----------|------|------|
| 基本スコア（Finding APIのみ） | $0 | ⭐⭐⭐ | 少 |
| CSV + Claude.ai分析 | $0 | ⭐⭐⭐⭐ | 中 |
| Shopping API追加 | $0 | ⭐⭐⭐⭐ | 中 |
| Claude API自動化 | $20+ | ⭐⭐⭐⭐⭐ | 少 |

**推奨**: 基本スコア + 必要に応じてClaude.ai分析

---

🎉 **これで完全なスコア評価システムが完成しました！**

すぐに使い始められます！