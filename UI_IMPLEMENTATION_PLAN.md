# HTS学習システム Phase 3: UI実装計画（詳細版）

**作成日**: 2025-01-14  
**前提**: Phase 2-B（DBスキーマ更新）完了

---

## 🎯 Geminiデータ入力フロー

### ユーザー操作の流れ

```
1. ユーザー: 商品を選択
2. ユーザー: 「AI強化」ボタンをクリック
3. システム: モーダル表示
4. ユーザー: Gemini Web UIでデータ生成
5. ユーザー: 生成結果をコピー
6. ユーザー: モーダルのテキストエリアに貼り付け
7. ユーザー: 「自動パース」ボタンをクリック
8. システム: パースしてフィールドに展開
9. ユーザー: 「HTS検索実行」ボタンをクリック
10. システム: /api/products/hts-lookup を呼び出し
11. システム: HTS候補リストを表示
12. ユーザー: 候補から選択 or 手動入力
13. ユーザー: 「保存」ボタンをクリック
14. システム: DBに保存 + record_hts_learning() 実行
```

---

## 📋 実装タスク

### タスク1: Gemini出力パーサー作成

**ファイル**: `/lib/utils/geminiParser.ts`（新規）

```typescript
/**
 * Gemini Web UI出力をパースする
 */
export interface GeminiOutput {
  hts_keywords: string;
  material_recommendation: string;
  origin_country_candidate: string;
  rewritten_title: string;
  market_summary: string;
  market_score: number;
}

export function parseGeminiOutput(text: string): GeminiOutput | null {
  try {
    const lines = text.trim().split('\n');
    const data: any = {};
    
    lines.forEach(line => {
      const match = line.match(/^([A-Z_]+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        data[key.toLowerCase()] = value.trim();
      }
    });
    
    // バリデーション
    if (!data.hts_keywords) {
      throw new Error('HTS_KEYWORDSが見つかりません');
    }
    
    return {
      hts_keywords: data.hts_keywords,
      material_recommendation: data.material_recommendation || '',
      origin_country_candidate: data.origin_country_candidate || '',
      rewritten_title: data.rewritten_title || '',
      market_summary: data.market_summary || '',
      market_score: parseInt(data.market_score) || 0,
    };
  } catch (error) {
    console.error('Gemini出力パースエラー:', error);
    return null;
  }
}
```

---

### タスク2: HTS分類モーダルコンポーネント作成

**ファイル**: `/components/HTSClassificationModal.tsx`（新規）

```typescript
'use client'

import { useState } from 'react'
import { parseGeminiOutput, type GeminiOutput } from '@/lib/utils/geminiParser'
import type { Product } from '@/types/product'

interface HTSClassificationModalProps {
  product: Product
  onClose: () => void
  onSave: (updates: any) => Promise<void>
}

export function HTSClassificationModal({
  product,
  onClose,
  onSave
}: HTSClassificationModalProps) {
  const [geminiText, setGeminiText] = useState('')
  const [parsedData, setParsedData] = useState<GeminiOutput | null>(null)
  const [htsCandidates, setHtsCandidates] = useState<any[]>([])
  const [selectedHTS, setSelectedHTS] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  // 自動パース
  const handleParse = () => {
    const parsed = parseGeminiOutput(geminiText)
    if (parsed) {
      setParsedData(parsed)
    } else {
      alert('パースに失敗しました。フォーマットを確認してください。')
    }
  }
  
  // HTS検索実行
  const handleHTSLookup = async () => {
    if (!parsedData) {
      alert('まず「自動パース」を実行してください')
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch('/api/products/hts-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_ja: product.title,
          category: product.category_name,
          brand: product.brand_name,
          hts_keywords: parsedData.hts_keywords,
          material_recommendation: parsedData.material_recommendation,
          origin_country_candidate: parsedData.origin_country_candidate,
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setHtsCandidates(data.data.candidates || [])
      } else {
        alert('HTS検索に失敗しました: ' + data.error)
      }
    } catch (error) {
      console.error('HTS検索エラー:', error)
      alert('HTS検索中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }
  
  // 保存
  const handleSave = async () => {
    if (!selectedHTS || !parsedData) {
      alert('HTSコードを選択してください')
      return
    }
    
    setLoading(true)
    try {
      await onSave({
        // Gemini出力
        hts_keywords: parsedData.hts_keywords,
        material: parsedData.material_recommendation,
        origin_country: parsedData.origin_country_candidate.split(',')[0],
        english_title: parsedData.rewritten_title,
        market_research_summary: parsedData.market_summary,
        market_score: parsedData.market_score,
        
        // HTS検索結果
        hts_code: selectedHTS.hts_code,
        hts_description: selectedHTS.description,
        hts_duty_rate: parseFloat(selectedHTS.general_rate || '0'),
        hts_score: selectedHTS.score,
        hts_confidence: selectedHTS.confidence,
        hts_source: selectedHTS.source,
        origin_country_hint: selectedHTS.origin_country_hint,
      })
      
      alert('保存しました')
      onClose()
    } catch (error) {
      console.error('保存エラー:', error)
      alert('保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">HTS分類</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        
        <div className="space-y-6">
          {/* ステップ1: Gemini出力を貼り付け */}
          <div>
            <h3 className="font-semibold mb-2">📋 ステップ1: Gemini出力を貼り付け</h3>
            <textarea
              className="w-full border rounded p-2 font-mono text-sm"
              rows={8}
              placeholder="HTS_KEYWORDS: trading cards, collectible, pokemon
MATERIAL_RECOMMENDATION: Paper
ORIGIN_COUNTRY_CANDIDATE: JP,CN
REWRITTEN_TITLE: Pokemon Card - Gengar VMAX
MARKET_SUMMARY: High demand collectible...
MARKET_SCORE: 85"
              value={geminiText}
              onChange={(e) => setGeminiText(e.target.value)}
            />
            <button 
              onClick={handleParse}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              自動パース
            </button>
          </div>
          
          {/* ステップ2: パース結果 */}
          {parsedData && (
            <div>
              <h3 className="font-semibold mb-2">✅ ステップ2: パース結果</h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                <div>
                  <label className="text-sm font-medium">HTSキーワード</label>
                  <input
                    type="text"
                    className="w-full border rounded p-2 mt-1"
                    value={parsedData.hts_keywords}
                    onChange={(e) => setParsedData({...parsedData, hts_keywords: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">推奨素材</label>
                  <input
                    type="text"
                    className="w-full border rounded p-2 mt-1"
                    value={parsedData.material_recommendation}
                    onChange={(e) => setParsedData({...parsedData, material_recommendation: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">原産国候補</label>
                  <input
                    type="text"
                    className="w-full border rounded p-2 mt-1"
                    value={parsedData.origin_country_candidate}
                    onChange={(e) => setParsedData({...parsedData, origin_country_candidate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">市場スコア</label>
                  <input
                    type="number"
                    className="w-full border rounded p-2 mt-1"
                    value={parsedData.market_score}
                    onChange={(e) => setParsedData({...parsedData, market_score: parseInt(e.target.value)})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">英語タイトル</label>
                  <input
                    type="text"
                    className="w-full border rounded p-2 mt-1"
                    value={parsedData.rewritten_title}
                    onChange={(e) => setParsedData({...parsedData, rewritten_title: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">市場調査サマリー</label>
                  <textarea
                    className="w-full border rounded p-2 mt-1"
                    rows={3}
                    value={parsedData.market_summary}
                    onChange={(e) => setParsedData({...parsedData, market_summary: e.target.value})}
                  />
                </div>
              </div>
              
              <button 
                onClick={handleHTSLookup}
                disabled={loading}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? '検索中...' : 'HTS検索実行'}
              </button>
            </div>
          )}
          
          {/* ステップ3: HTS候補リスト */}
          {htsCandidates.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">🎯 ステップ3: HTS候補を選択</h3>
              <div className="space-y-2">
                {htsCandidates.map((candidate, index) => (
                  <div
                    key={index}
                    className={`border rounded p-3 cursor-pointer hover:bg-gray-50 ${
                      selectedHTS?.hts_code === candidate.hts_code ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedHTS(candidate)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold">{candidate.hts_code}</span>
                        <span className="ml-2 text-sm text-gray-600">
                          スコア: {candidate.score} / 信頼度: {candidate.confidence}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        関税率: {candidate.general_rate || '0%'}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{candidate.description}</p>
                    {candidate.origin_country_hint && (
                      <p className="text-xs text-gray-500 mt-1">
                        原産国候補: {candidate.origin_country_hint}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              
              <button 
                onClick={handleSave}
                disabled={loading || !selectedHTS}
                className="mt-4 px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
              >
                {loading ? '保存中...' : '保存して学習'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### タスク3: ToolPanelにボタン追加

**ファイル**: `/app/tools/editing/components/ToolPanel.tsx`（修正）

```typescript
// 既存のボタンに追加
<button
  onClick={onHTSClassification}
  disabled={processing}
  className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
  title="Gemini出力からHTS分類"
>
  🎓 HTS分類
</button>
```

---

### タスク4: API修正（HTS検索）

**ファイル**: `/app/api/products/hts-lookup/route.ts`（修正）

```typescript
// リクエストボディにGeminiフィールドを追加
const {
  title_ja,
  category,
  brand,
  hts_keywords,           // 追加
  material_recommendation, // 追加
  origin_country_candidate // 追加
} = await req.json()

// RPC呼び出し時にGeminiデータを優先使用
const { data, error } = await supabase.rpc('search_hts_with_learning', {
  p_keywords: hts_keywords || keywords, // Geminiキーワード優先
  p_category_ja: category,
  p_brand_ja: brand,
  p_material_ja: material_recommendation,
  p_title_ja: title_ja
})
```

---

## 🎯 実装優先順位

1. ✅ **タスク1**: Gemini出力パーサー（最優先）
2. ✅ **タスク2**: HTS分類モーダル
3. ✅ **タスク3**: ToolPanelにボタン追加
4. ✅ **タスク4**: API修正

---

## 🧪 テストシナリオ

### シナリオ1: 正常フロー

1. 商品「ポケモンカード」を選択
2. 「HTS分類」ボタンをクリック
3. Gemini出力を貼り付け
4. 「自動パース」クリック → フィールドに展開
5. 「HTS検索実行」クリック → 候補3件表示
6. 候補1を選択
7. 「保存して学習」クリック → DB保存成功
8. テーブルでHTSスコア850が表示される

---

次のチャットでの作業開始コマンド:
```
「UI_IMPLEMENTATION_PLAN.mdを読んで、
タスク1（Geminiパーサー）から実装してください」
```
