// components/ebay-pricing/calculator-tab-complete.tsx の修正部分
// 
// 🔧 重量と商品価格で最適なポリシーを自動選択（修正版）

  // ❌ 削除: 古いロジック
  /*
  useEffect(() => {
    if (formData.actualWeight && shippingPolicies.length > 0) {
      const weight = formData.actualWeight
      const matchingPolicy = shippingPolicies.find((p: any) => 
        weight >= p.weight_min_kg && weight <= p.weight_max_kg
      )
      if (matchingPolicy && matchingPolicy.id !== selectedPolicyId) {
        setSelectedPolicyId(matchingPolicy.id)
      }
    }
  }, [formData.actualWeight, shippingPolicies])
  */

  // ✅ 追加: 新しいロジック（重量 + 商品価格）
  const [autoSelectedPolicy, setAutoSelectedPolicy] = useState<any>(null)
  const [policySelectionDebug, setPolicySelectionDebug] = useState<string>('')

  useEffect(() => {
    // 重量と商品価格が両方入力されている場合のみ
    if (!formData.actualWeight || !formData.costJPY || !formData.exchangeRate) {
      return
    }

    const weight = formData.actualWeight
    const estimatedPriceUSD = (formData.costJPY / formData.exchangeRate) * 1.5 // 仮の価格

    // APIで最適なポリシーを取得
    fetch('/api/ebay/select-shipping-policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weight: weight,
        itemPriceUSD: estimatedPriceUSD,
        quantity: 1
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setAutoSelectedPolicy(data.policy)
          setSelectedPolicyId(data.policy.id)
          
          // 送料を自動設定
          if (data.shipping.usa) {
            onInputChange('shippingFeeUSD', data.shipping.usa.total)
          }
          if (data.shipping.other) {
            onInputChange('otherShippingFeeUSD', data.shipping.other.total)
          }

          // デバッグ情報
          setPolicySelectionDebug(
            `✅ ${data.policy.pricing_basis} | ${weight}kg | $${estimatedPriceUSD.toFixed(0)} | ${data.policy.name}`
          )
        } else {
          setPolicySelectionDebug(`❌ ポリシー選択失敗: ${data.error}`)
        }
      })
      .catch(err => {
        console.error('ポリシー選択エラー:', err)
        setPolicySelectionDebug(`❌ エラー: ${err.message}`)
      })
  }, [formData.actualWeight, formData.costJPY, formData.exchangeRate])

