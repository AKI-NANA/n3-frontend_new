// app/zaiko/tanaoroshi/components/GroupingBoxSidebar.tsx
'use client'

import { useState, useEffect } from 'react'
import { InventoryProduct } from '@/types/inventory'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertTriangle, XCircle, Package, Layers } from 'lucide-react'

interface GroupingBoxSidebarProps {
  selectedProducts: InventoryProduct[]
  onClearSelection: () => void
  onCreateVariation: () => void
  onCreateBundle: () => void
}

interface CompatibilityCheck {
  isCompatible: boolean
  ddpCostCheck: {
    passed: boolean
    minCost: number
    maxCost: number
    difference: number
    differencePercent: number
  }
  weightCheck: {
    passed: boolean
    minWeight: number
    maxWeight: number
    ratio: number
  }
  categoryCheck: {
    passed: boolean
    categories: string[]
  }
  shippingPolicy: {
    id: string | null
    name: string | null
    score: number | null
  } | null
  warnings: string[]
}

interface ParentCandidate {
  parent_sku: string
  parent_id: string
  current_variation_count: number
  current_max_ddp_cost: number
  current_unified_price: number
  new_max_ddp_cost: number
  new_unified_price: number
  price_change: number
  price_change_percent: number
  compatibility_score: number
  compatibility_issues: string[]
  category_id: string | null
  variation_attributes: string[]
}

interface TemplateOption {
  sku: string
  title: string
  template_name: string
  weight_tier_kg: number
  price_tier_usd: number
  recommended_policy_id: number
  recommended_policy_name: string
}

export function GroupingBoxSidebar({
  selectedProducts,
  onClearSelection,
  onCreateVariation,
  onCreateBundle
}: GroupingBoxSidebarProps) {
  const [compatibility, setCompatibility] = useState<CompatibilityCheck | null>(null)
  const [loading, setLoading] = useState(false)
  const [parentCandidates, setParentCandidates] = useState<ParentCandidate[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [showCandidates, setShowCandidates] = useState(false)
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null)

  // 親SKUメタデータ（eBay出品用）
  const [parentTitle, setParentTitle] = useState('')
  const [parentDescription, setParentDescription] = useState('')
  const [parentImages, setParentImages] = useState<string[]>([])
  const [variationAttributes, setVariationAttributes] = useState<{ [sku: string]: { [key: string]: string } }>({})
  const [creatingVariation, setCreatingVariation] = useState(false)

  // 最大DDPコストベースの価格シミュレーション
  const maxDdpCost = selectedProducts.length > 0
    ? Math.max(...selectedProducts.map(p => p.cost_price || 0))
    : 0

  const totalExcessProfit = selectedProducts.reduce((sum, p) => {
    const actualCost = p.cost_price || 0
    return sum + (maxDdpCost - actualCost)
  }, 0)

  // 適合性チェックを実行（debounce付き - 4-E最適化）
  useEffect(() => {
    if (selectedProducts.length < 2) {
      setCompatibility(null)
      return
    }

    // 500ms待機してから実行（連続選択時は最後の1回のみ実行）
    const timeoutId = setTimeout(() => {
      checkCompatibility()
    }, 500)

    // クリーンアップ関数で前回のタイマーをキャンセル
    return () => clearTimeout(timeoutId)
  }, [selectedProducts])

  // 既存親SKU候補を検索
  const searchParentCandidates = async () => {
    setLoadingCandidates(true)
    setShowCandidates(true)
    try {
      const selectedItems = selectedProducts.map(p => ({
        id: p.id,
        sku: p.sku || `AUTO-${p.unique_id}`,
        ddp_cost_usd: p.cost_price || 0,
        weight_g: p.source_data?.weight_g || 0,
        category_id: p.source_data?.category_id || p.category
      }))

      const response = await fetch('/api/products/find-parent-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedItems })
      })

      const data = await response.json()

      if (data.success) {
        setParentCandidates(data.candidates || [])
      } else {
        console.error('候補検索エラー:', data.error)
        setParentCandidates([])
      }
    } catch (error) {
      console.error('候補検索エラー:', error)
      setParentCandidates([])
    } finally {
      setLoadingCandidates(false)
    }
  }

  // 既存親に追加
  const addToParent = async (parentSku: string) => {
    if (!confirm(`親SKU「${parentSku}」に追加しますか？`)) return

    try {
      const newItems = selectedProducts.map(p => ({
        id: p.id,
        sku: p.sku || `AUTO-${p.unique_id}`,
        title: p.product_name,
        image: p.images && p.images.length > 0 ? p.images[0] : '',
        ddp_cost_usd: p.cost_price || 0,
        stock_quantity: p.physical_quantity || 0,
        weight_g: p.source_data?.weight_g || 0,
        category_id: p.source_data?.category_id || p.category
      }))

      // 簡単な属性設定（ユーザーが後で編集可能）
      const attributes = selectedProducts.map((_, i) => [
        { name: 'Variant', value: `Option ${i + 1}` }
      ])

      const response = await fetch('/api/products/add-to-variation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentSku,
          newItems,
          attributes
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ 追加成功！\n\n親SKU: ${parentSku}\n追加した子SKU: ${newItems.length}個\n新統一価格: $${data.summary.newMaxDdp.toFixed(2)}`)
        onClearSelection()
        setShowCandidates(false)
      } else {
        alert(`❌ 追加失敗: ${data.error}`)
      }
    } catch (error: any) {
      console.error('追加エラー:', error)
      alert(`❌ 追加エラー: ${error.message}`)
    }
  }

  // テンプレート一覧を取得
  const loadTemplates = async () => {
    setShowTemplates(true)
    try {
      const response = await fetch('/api/shipping-policies/generate-templates')
      const data = await response.json()

      if (data.success) {
        const templateOptions = data.templates.map((t: any) => ({
          sku: t.sku,
          title: t.title,
          template_name: t.listing_data?.template_name || '',
          weight_tier_kg: t.listing_data?.weight_tier_kg || 0,
          price_tier_usd: t.listing_data?.price_tier_usd || 0,
          recommended_policy_id: t.listing_data?.recommended_policy_id || null,
          recommended_policy_name: t.listing_data?.recommended_policy_name || ''
        }))
        setTemplates(templateOptions)
      } else {
        console.error('テンプレート取得エラー:', data.error)
        setTemplates([])
      }
    } catch (error) {
      console.error('テンプレート取得エラー:', error)
      setTemplates([])
    }
  }

  // テンプレートを使用してバリエーション作成
  const createFromTemplate = (template: TemplateOption) => {
    setSelectedTemplate(template)
    alert(
      `✅ テンプレート選択: ${template.template_name}\n\n` +
      `推奨重量帯: ${template.weight_tier_kg}kg\n` +
      `推奨価格帯: $${template.price_tier_usd}\n` +
      `配送ポリシー: ${template.recommended_policy_name}\n\n` +
      'このテンプレートを使用してバリエーション作成を開始します。'
    )

    // バリエーション作成モーダルを開く（親コンポーネントに通知）
    onCreateVariation()
  }

  const checkCompatibility = async () => {
    setLoading(true)
    try {
      // ===== 精密DDP計算の実行 =====
      // source_dataから重量・HSコード・原産国を取得し、正確なDDP costを計算

      console.log('🔬 精密DDP計算を開始（リアルタイム適合性判定）...')

      const precisionCalcItems = selectedProducts.map(p => ({
        sku: p.sku,
        cost_jpy: p.source_data?.cost_jpy || p.cost_price * 150, // フォールバック: USD→JPY概算
        weight_g: p.source_data?.weight_g || p.source_data?.ddp_weight_g || 0,
        hs_code: p.source_data?.hs_code || null,
        origin_country: p.source_data?.origin_country || null
      }))

      let preciseCosts: number[] = []

      try {
        const calcResponse = await fetch('/api/products/calculate-precise-ddp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: precisionCalcItems })
        })

        if (calcResponse.ok) {
          const calcResult = await calcResponse.json()

          if (calcResult.success) {
            preciseCosts = calcResult.results.map((r: any) => r.precise_ddp_cost_usd)
            console.log('✅ 精密DDP計算完了:', {
              total: calcResult.summary.total_items,
              complete_data: calcResult.summary.complete_data_count,
              max: `$${calcResult.summary.max_ddp_cost_usd.toFixed(2)}`,
              min: `$${calcResult.summary.min_ddp_cost_usd.toFixed(2)}`
            })
          } else {
            throw new Error(calcResult.error || '精密計算失敗')
          }
        } else {
          throw new Error(`API Error: ${calcResponse.status}`)
        }
      } catch (error: any) {
        console.error('❌ 精密DDP計算失敗:', error.message)

        // ⚠️ 4-D修正: フォールバックは使用せず、処理を中断
        setCompatibility({
          isCompatible: false,
          ddpCostCheck: { passed: false, minCost: 0, maxCost: 0, difference: 0, differencePercent: 0 },
          weightCheck: { passed: false, minWeight: 0, maxWeight: 0, ratio: 0 },
          categoryCheck: { passed: false, categories: [] },
          shippingPolicy: null,
          warnings: [
            '❌ 精密DDP計算に失敗しました',
            'データベース接続またはマスターデータ（HSコード、原産国、送料レート）に問題がある可能性があります',
            '正確な価格計算ができないため、バリエーション作成は実行できません'
          ]
        })

        setLoading(false)

        // ユーザーに警告ダイアログを表示
        alert(
          '⚠️ 精密DDP計算に失敗しました\n\n' +
          '正確な価格計算ができないため、バリエーション作成を中止しました。\n\n' +
          '原因：\n' +
          '- データベース接続エラー\n' +
          '- HSコード/原産国マスターデータの不備\n' +
          '- 送料レートテーブルの不備\n\n' +
          'システム管理者に連絡してください。\n\n' +
          `技術的詳細: ${error.message}`
        )

        return  // 処理を完全に中断
      }

      const weights = selectedProducts
        .map(p => p.source_data?.weight_g || p.source_data?.ddp_weight_g || 0)
        .filter(w => w > 0)

      const minCost = Math.min(...preciseCosts)
      const maxCost = Math.max(...preciseCosts)
      const costDiff = maxCost - minCost
      const costDiffPercent = minCost > 0 ? (costDiff / minCost) * 100 : 0

      const minWeight = weights.length > 0 ? Math.min(...weights) : 0
      const maxWeight = weights.length > 0 ? Math.max(...weights) : 0
      const weightRatio = minWeight > 0 ? maxWeight / minWeight : 0

      // カテゴリーチェック
      const categories = [
        ...new Set(
          selectedProducts
            .map(p => p.category)
            .filter(Boolean)
        )
      ]

      const ddpCheckPassed = costDiff <= 20 || costDiffPercent <= 10
      const weightCheckPassed = weights.length === 0 || weightRatio <= 1.5
      const categoryCheckPassed = categories.length <= 1

      const warnings: string[] = []
      if (!ddpCheckPassed) {
        warnings.push(`DDPコスト差が大きすぎます（$${costDiff.toFixed(2)}, ${costDiffPercent.toFixed(1)}%）`)
      }
      if (!weightCheckPassed) {
        warnings.push(`重量差が大きすぎます（最大/最小: ${(weightRatio * 100).toFixed(0)}%）`)
      }
      if (!categoryCheckPassed) {
        warnings.push(`複数のカテゴリーが混在しています（${categories.length}件）`)
      }

      // 配送ポリシー推薦を取得
      let shippingPolicy = null
      if (maxWeight > 0) {
        try {
          const response = await fetch('/api/shipping-policies/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              maxWeightKg: maxWeight / 1000,
              maxDdpCostUsd: maxCost,
              minWeightKg: minWeight / 1000,
              minDdpCostUsd: minCost,
              limit: 1
            })
          })

          const data = await response.json()
          if (data.success && data.summary?.bestMatch) {
            shippingPolicy = {
              id: data.summary.bestMatch.id,
              name: data.summary.bestMatch.name,
              score: parseFloat(data.summary.bestMatch.score)
            }
          }
        } catch (error) {
          console.error('配送ポリシー取得エラー:', error)
        }
      }

      setCompatibility({
        isCompatible: ddpCheckPassed && weightCheckPassed && categoryCheckPassed,
        ddpCostCheck: {
          passed: ddpCheckPassed,
          minCost,
          maxCost,
          difference: costDiff,
          differencePercent: costDiffPercent
        },
        weightCheck: {
          passed: weightCheckPassed,
          minWeight,
          maxWeight,
          ratio: weightRatio
        },
        categoryCheck: {
          passed: categoryCheckPassed,
          categories: categories as string[]
        },
        shippingPolicy,
        warnings
      })
    } catch (error) {
      console.error('適合性チェックエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // バリエーション作成実行
  const executeVariationCreation = async () => {
    // フォーム検証
    if (!parentTitle.trim()) {
      alert('⚠️ 親SKUタイトルを入力してください')
      return
    }

    if (parentImages.length === 0) {
      alert('⚠️ 親SKU画像を最低1枚アップロードしてください')
      return
    }

    if (!compatibility?.isCompatible) {
      alert('⚠️ 適合性チェックに合格していません')
      return
    }

    // 子SKU属性の検証
    const missingAttributes = selectedProducts.filter(p => {
      const attrs = variationAttributes[p.sku || '']
      return !attrs || Object.keys(attrs).length === 0
    })

    if (missingAttributes.length > 0) {
      alert(`⚠️ 以下の商品のバリエーション属性が未設定です:\n${missingAttributes.map(p => p.sku).join(', ')}`)
      return
    }

    setCreatingVariation(true)

    try {
      // API呼び出し
      const response = await fetch('/api/products/create-variation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_items: selectedProducts.map(p => ({
            id: p.id,
            sku: p.sku,
            product_name: p.product_name,
            cost_jpy: p.source_data?.cost_jpy || p.cost_price * 150, // フォールバック: USD→JPY概算
            cost_price: p.cost_price || 0,
            images: p.images || [],
            source_data: p.source_data,
            attributes: variationAttributes[p.sku || ''] || {}
          })),
          parent_metadata: {
            title: parentTitle,
            description: parentDescription,
            images: parentImages
          }
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(
          `✅ バリエーション作成成功！\n\n` +
          `親SKU: ${result.parent_sku}\n` +
          `統一価格: $${result.unified_price_usd}\n` +
          `バリエーション数: ${result.variations_count}個\n\n` +
          `次のステップ: eBay出品画面で最終確認して公開してください`
        )
        onClearSelection()
        setParentTitle('')
        setParentDescription('')
        setParentImages([])
        setVariationAttributes({})
      } else {
        throw new Error(result.error || 'バリエーション作成失敗')
      }
    } catch (error: any) {
      console.error('❌ バリエーション作成エラー:', error)
      alert(`❌ バリエーション作成失敗:\n\n${error.message}`)
    } finally {
      setCreatingVariation(false)
    }
  }

  // 画像アップロードハンドラー
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    // 簡易実装: FileReader でData URLに変換（本番ではS3等にアップロード）
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setParentImages(prev => [...prev, event.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  // バリエーション属性の更新
  const updateVariationAttribute = (sku: string, attributeName: string, attributeValue: string) => {
    setVariationAttributes(prev => ({
      ...prev,
      [sku]: {
        ...prev[sku],
        [attributeName]: attributeValue
      }
    }))
  }

  if (selectedProducts.length === 0) {
    return (
      <div className="w-96 bg-slate-100 p-4 border-l border-slate-200 flex flex-col items-center justify-center text-center">
        <Package className="w-16 h-16 text-slate-300 mb-4" />
        <p className="text-slate-500 font-medium mb-2">商品が選択されていません</p>
        <p className="text-sm text-slate-400">
          商品カードのチェックボックスをクリックして選択してください
        </p>
      </div>
    )
  }

  return (
    <div className="w-96 bg-white border-l border-slate-200 flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* ヘッダー */}
      <div className="p-4 border-b border-slate-200 bg-purple-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-purple-900">
            <Layers className="inline w-5 h-5 mr-2" />
            Grouping Box
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-slate-600 hover:text-slate-900"
          >
            クリア
          </Button>
        </div>
        <p className="text-sm text-purple-700">
          {selectedProducts.length}個の商品を選択中
        </p>
      </div>

      {/* 適合性チェック結果 */}
      {selectedProducts.length >= 2 && compatibility && (
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            {compatibility.isCompatible ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-700">バリエーション作成可能</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-700">バリエーション作成不可</span>
              </>
            )}
          </div>

          {/* DDPコストチェック */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              {compatibility.ddpCostCheck.passed ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm font-medium">DDPコスト近接</span>
            </div>
            <div className="text-xs text-slate-600 ml-6">
              範囲: ${compatibility.ddpCostCheck.minCost.toFixed(2)} - ${compatibility.ddpCostCheck.maxCost.toFixed(2)}
              <br />
              差額: ${compatibility.ddpCostCheck.difference.toFixed(2)} ({compatibility.ddpCostCheck.differencePercent.toFixed(1)}%)
            </div>
          </div>

          {/* 重量チェック */}
          {compatibility.weightCheck.maxWeight > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                {compatibility.weightCheck.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-sm font-medium">重量許容範囲</span>
              </div>
              <div className="text-xs text-slate-600 ml-6">
                範囲: {compatibility.weightCheck.minWeight}g - {compatibility.weightCheck.maxWeight}g
                <br />
                比率: {(compatibility.weightCheck.ratio * 100).toFixed(0)}%
              </div>
            </div>
          )}

          {/* カテゴリーチェック */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              {compatibility.categoryCheck.passed ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm font-medium">カテゴリー一致</span>
            </div>
            <div className="text-xs text-slate-600 ml-6">
              {compatibility.categoryCheck.categories.length > 0
                ? compatibility.categoryCheck.categories.join(', ')
                : '未設定'}
            </div>
          </div>

          {/* 警告 */}
          {compatibility.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-3">
              {compatibility.warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-yellow-800 mb-1 last:mb-0">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* 配送ポリシー推薦 */}
          {compatibility.shippingPolicy && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-3">
              <div className="text-xs font-semibold text-blue-900 mb-1">
                推薦配送ポリシー
              </div>
              <div className="text-xs text-blue-700">
                {compatibility.shippingPolicy.name}
                <br />
                スコア: {compatibility.shippingPolicy.score?.toFixed(1)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* テンプレート選択（優先度4-B） */}
      {selectedProducts.length >= 2 && (
        <div className="p-4 border-b border-slate-200 bg-blue-50">
          <Button
            onClick={loadTemplates}
            variant="outline"
            className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 mb-3"
          >
            📋 テンプレートから選択
          </Button>

          {showTemplates && templates.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <p className="text-xs text-blue-700 mb-2">
                推奨される配送ポリシーテンプレート:
              </p>
              {templates.map((template) => (
                <div
                  key={template.sku}
                  className="bg-white rounded-lg p-3 border border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => createFromTemplate(template)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900">
                        {template.template_name}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        重量: {template.weight_tier_kg}kg | 価格: ${template.price_tier_usd}
                      </p>
                      <p className="text-xs text-blue-500 mt-1 truncate">
                        {template.recommended_policy_name}
                      </p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {showTemplates && templates.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-blue-600 mb-2">
                テンプレートが見つかりません
              </p>
              <p className="text-xs text-blue-500">
                /api/shipping-policies/generate-templates
                <br />
                を実行してテンプレートを生成してください
              </p>
            </div>
          )}
        </div>
      )}

      {/* 価格シミュレーション（最大DDPコストベース） */}
      {selectedProducts.length >= 2 && (
        <div className="p-4 border-b border-slate-200 bg-green-50">
          <h4 className="font-semibold text-green-900 mb-3">💰 価格シミュレーション</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-800">統一 Item Price:</span>
              <span className="text-lg font-bold text-green-600">
                ${maxDdpCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-800">追加利益合計:</span>
              <span className="text-md font-semibold text-green-600">
                +${totalExcessProfit.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-green-700 mt-2">
              ※ 最大DDPコスト戦略により、構造的に赤字リスクはゼロです
            </p>
          </div>
        </div>
      )}

      {/* 親SKUメタデータ設定（eBay出品用） */}
      {selectedProducts.length >= 2 && compatibility?.isCompatible && (
        <div className="p-4 border-b border-slate-200 bg-amber-50">
          <h4 className="font-semibold text-amber-900 mb-3 flex items-center">
            <i className="fas fa-edit mr-2"></i>
            親SKUメタデータ（必須）
          </h4>

          {/* 統一タイトル */}
          <div className="mb-3">
            <label className="text-xs font-semibold text-amber-900 mb-1 block">
              統一タイトル <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={parentTitle}
              onChange={(e) => setParentTitle(e.target.value)}
              placeholder="例: Golf Club Set - Multiple Weights Available"
              className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              maxLength={80}
            />
            <p className="text-xs text-amber-600 mt-1">
              {parentTitle.length}/80文字（eBay推奨: 60-80文字）
            </p>
          </div>

          {/* 統一説明文 */}
          <div className="mb-3">
            <label className="text-xs font-semibold text-amber-900 mb-1 block">
              統一説明文（任意）
            </label>
            <textarea
              value={parentDescription}
              onChange={(e) => setParentDescription(e.target.value)}
              placeholder="商品の共通説明を入力してください..."
              className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-amber-600 mt-1">
              {parentDescription.length}/500文字
            </p>
          </div>

          {/* 親SKU画像アップロード */}
          <div className="mb-3">
            <label className="text-xs font-semibold text-amber-900 mb-1 block">
              親SKU画像 <span className="text-red-600">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              id="parent-image-upload"
            />
            <label
              htmlFor="parent-image-upload"
              className="block w-full px-3 py-2 text-sm text-center border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
            >
              <i className="fas fa-cloud-upload-alt mr-2"></i>
              画像をアップロード（複数可）
            </label>

            {/* アップロード済み画像プレビュー */}
            {parentImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {parentImages.map((img, index) => (
                  <div key={index} className="relative">
                    <img
                      src={img}
                      alt={`Parent ${index + 1}`}
                      className="w-full h-20 object-cover rounded border border-amber-300"
                    />
                    <button
                      onClick={() => setParentImages(prev => prev.filter((_, i) => i !== index))}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-amber-600 mt-1">
              {parentImages.length}枚アップロード済み（最低1枚必須）
            </p>
          </div>
        </div>
      )}

      {/* 選択商品リスト */}
      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="font-semibold text-slate-900 mb-3">選択中の商品</h4>
        <div className="space-y-2">
          {selectedProducts.map(product => {
            const cost = product.cost_price || 0
            const excessProfit = maxDdpCost - cost

            return (
              <div
                key={product.id}
                className="bg-slate-50 rounded-lg p-3 border border-slate-200"
              >
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-slate-200 rounded overflow-hidden flex-shrink-0">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.product_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://placehold.co/100x100/e2e8f0/64748b?text=No+Image'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {product.product_name}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      {product.sku || 'SKU未設定'}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        ${cost.toFixed(2)}
                      </Badge>
                      {selectedProducts.length >= 2 && excessProfit > 0 && (
                        <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                          +${excessProfit.toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 子SKU属性確認・編集（バリエーション属性設定） */}
      {selectedProducts.length >= 2 && compatibility?.isCompatible && (
        <div className="p-4 border-b border-slate-200 bg-indigo-50">
          <h4 className="font-semibold text-indigo-900 mb-3 flex items-center">
            <i className="fas fa-tags mr-2"></i>
            バリエーション属性設定
          </h4>
          <p className="text-xs text-indigo-700 mb-3">
            各商品のバリエーション属性を設定してください（例: Color, Size, Weight）
          </p>

          <div className="space-y-3">
            {selectedProducts.map((product, index) => {
              const attrs = variationAttributes[product.sku || ''] || {}

              return (
                <div key={product.id} className="bg-white rounded-lg p-3 border border-indigo-200">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-8 h-8 bg-slate-200 rounded overflow-hidden flex-shrink-0">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-indigo-900 truncate">
                        {product.product_name}
                      </p>
                      <p className="text-xs text-indigo-600 font-mono">
                        {product.sku}
                      </p>
                    </div>
                  </div>

                  {/* 属性入力フィールド */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-indigo-800 mb-1 block">
                          属性名1 <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="例: Color"
                          value={Object.keys(attrs)[0] || ''}
                          onChange={(e) => {
                            const oldKey = Object.keys(attrs)[0]
                            const newKey = e.target.value
                            if (oldKey) {
                              const newAttrs = { ...attrs }
                              newAttrs[newKey] = newAttrs[oldKey]
                              delete newAttrs[oldKey]
                              setVariationAttributes(prev => ({
                                ...prev,
                                [product.sku || '']: newAttrs
                              }))
                            } else if (newKey) {
                              updateVariationAttribute(product.sku || '', newKey, '')
                            }
                          }}
                          className="w-full px-2 py-1 text-xs border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-indigo-800 mb-1 block">
                          値1 <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="例: Blue"
                          value={Object.values(attrs)[0] || ''}
                          onChange={(e) => {
                            const key = Object.keys(attrs)[0]
                            if (key) {
                              updateVariationAttribute(product.sku || '', key, e.target.value)
                            }
                          }}
                          className="w-full px-2 py-1 text-xs border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* 追加属性（オプション） */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-indigo-800 mb-1 block">
                          属性名2（任意）
                        </label>
                        <input
                          type="text"
                          placeholder="例: Size"
                          value={Object.keys(attrs)[1] || ''}
                          onChange={(e) => {
                            const oldKey = Object.keys(attrs)[1]
                            const newKey = e.target.value
                            if (oldKey && newKey) {
                              const newAttrs = { ...attrs }
                              newAttrs[newKey] = newAttrs[oldKey]
                              delete newAttrs[oldKey]
                              setVariationAttributes(prev => ({
                                ...prev,
                                [product.sku || '']: newAttrs
                              }))
                            } else if (newKey) {
                              updateVariationAttribute(product.sku || '', newKey, '')
                            }
                          }}
                          className="w-full px-2 py-1 text-xs border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-indigo-800 mb-1 block">
                          値2
                        </label>
                        <input
                          type="text"
                          placeholder="例: Large"
                          value={Object.values(attrs)[1] || ''}
                          onChange={(e) => {
                            const key = Object.keys(attrs)[1]
                            if (key) {
                              updateVariationAttribute(product.sku || '', key, e.target.value)
                            }
                          }}
                          className="w-full px-2 py-1 text-xs border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 属性プレビュー */}
                  {Object.keys(attrs).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-indigo-200">
                      <p className="text-xs text-indigo-700 font-semibold mb-1">
                        設定済み属性:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(attrs).map(([key, value]) => (
                          <Badge key={key} className="text-xs bg-indigo-100 text-indigo-800 border-indigo-300">
                            {key}: {value || '未設定'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-xs text-indigo-600 mt-3 bg-indigo-100 rounded p-2">
            💡 ヒント: 全ての商品に最低1つの属性を設定してください。eBayでは「Color」や「Size」がよく使われます。
          </p>
        </div>
      )}

      {/* 既存親SKU候補リスト */}
      {selectedProducts.length >= 1 && (
        <div className="border-t border-slate-200">
          <div className="p-4">
            <Button
              onClick={searchParentCandidates}
              disabled={loadingCandidates}
              variant="outline"
              className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            >
              {loadingCandidates ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  検索中...
                </>
              ) : (
                <>
                  <i className="fas fa-search mr-2"></i>
                  既存親SKUを検索
                </>
              )}
            </Button>
          </div>

          {showCandidates && (
            <div className="px-4 pb-4">
              {parentCandidates.length === 0 ? (
                <div className="text-center py-4 text-sm text-slate-500">
                  互換性のある既存親SKUが見つかりませんでした
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    {parentCandidates.length}件の候補が見つかりました
                  </p>
                  {parentCandidates.map((candidate, index) => (
                    <div
                      key={index}
                      className="bg-indigo-50 border border-indigo-200 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-indigo-900 text-sm">
                            {candidate.parent_sku}
                          </p>
                          <p className="text-xs text-indigo-600">
                            現在 {candidate.current_variation_count} バリエーション
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            candidate.compatibility_score >= 80
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : candidate.compatibility_score >= 60
                              ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                              : 'bg-orange-100 text-orange-700 border-orange-300'
                          }`}
                        >
                          {candidate.compatibility_score.toFixed(0)}点
                        </Badge>
                      </div>

                      <div className="text-xs text-indigo-700 space-y-1 mb-2">
                        <div className="flex justify-between">
                          <span>現在の統一価格:</span>
                          <span className="font-semibold">
                            ${candidate.current_unified_price.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>追加後の統一価格:</span>
                          <span className="font-semibold">
                            ${candidate.new_unified_price.toFixed(2)}
                          </span>
                        </div>
                        {candidate.price_change !== 0 && (
                          <div className="flex justify-between text-orange-700">
                            <span>価格変更:</span>
                            <span className="font-semibold">
                              {candidate.price_change > 0 ? '+' : ''}
                              ${candidate.price_change.toFixed(2)} (
                              {candidate.price_change_percent > 0 ? '+' : ''}
                              {candidate.price_change_percent.toFixed(1)}%)
                            </span>
                          </div>
                        )}
                      </div>

                      {candidate.compatibility_issues.length > 0 && (
                        <div className="text-xs text-orange-600 mb-2">
                          {candidate.compatibility_issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        onClick={() => addToParent(candidate.parent_sku)}
                        size="sm"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-xs"
                      >
                        この親SKUに追加
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* アクションボタン */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
        <Button
          onClick={executeVariationCreation}
          disabled={
            !compatibility?.isCompatible ||
            selectedProducts.length < 2 ||
            !parentTitle.trim() ||
            parentImages.length === 0 ||
            creatingVariation
          }
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300"
        >
          {creatingVariation ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              作成中...
            </>
          ) : (
            <>
              <Layers className="w-4 h-4 mr-2" />
              バリエーション作成実行（eBay）
            </>
          )}
        </Button>
        <Button
          onClick={onCreateBundle}
          disabled={selectedProducts.length < 1}
          variant="outline"
          className="w-full border-green-300 text-green-700 hover:bg-green-50"
        >
          <Package className="w-4 h-4 mr-2" />
          セット品作成（全モール）
        </Button>
        <p className="text-xs text-slate-500 text-center mt-2">
          {selectedProducts.length < 2
            ? '2個以上の商品を選択してください'
            : !compatibility?.isCompatible
            ? '適合性チェックに合格していません'
            : !parentTitle.trim()
            ? '親SKUタイトルを入力してください'
            : parentImages.length === 0
            ? '親SKU画像を1枚以上アップロードしてください'
            : 'バリエーション作成の準備完了'}
        </p>
      </div>
    </div>
  )
}
