// components/ebay-pricing/calculator-tab-complete.tsx
// 
// 🔧 修正: 行67-118の配送ポリシー関連のuseEffect を以下に置き換え

  // 🆕 配送ポリシー関連
  const [shippingPolicies, setShippingPolicies] = useState<any[]>([])
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null)
  const [policyZoneRates, setPolicyZoneRates] = useState<any[]>([])
  const [loadingPolicies, setLoadingPolicies] = useState(false)
  const [autoSelectedPolicy, setAutoSelectedPolicy] = useState<any>(null)
  const [policyDebugInfo, setPolicyDebugInfo] = useState<string>('')

  // FVF率をAPIから取得
  useEffect(() => {
    fetch('/api/ebay/get-unique-fvf-rates')
      .then(r => r.json())
      .then(data => {
        if (data.rates && data.rates.length > 0) {
          setFvfRates(data.rates)
        }
      })
      .catch(err => console.error('FVF率取得エラー:', err))
  }, [])

  // 🆕 配送ポリシー取得（初回のみ、参照用）
  useEffect(() => {
    setLoadingPolicies(true)
    fetch('/api/ebay/get-shipping-policies')
      .then(r => r.json())
      .then(data => {
        if (data.policies) {
          setShippingPolicies(data.policies)
        }
      })
      .catch(err => console.error('配送ポリシー取得エラー:', err))
      .finally(() => setLoadingPolicies(false))
  }, [])

  // ✅ 新ロジック: 重量 + 商品価格で最適なポリシーを自動選択
  useEffect(() => {
    // 重量と原価が入力されている場合のみ実行
    if (!formData.actualWeight || !formData.costJPY || !formData.exchangeRate) {
      setPolicyDebugInfo('')
      return
    }

    const weight = formData.actualWeight
    // 仮の販売価格を計算（原価×1.5を想定）
    const estimatedPriceUSD = (formData.costJPY / formData.exchangeRate) * 1.5

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
          // ポリシーを自動選択
          setAutoSelectedPolicy(data.policy)
          setSelectedPolicyId(data.policy.id)
          
          // 送料を自動設定
          if (data.shipping?.usa?.total) {
            onInputChange('shippingFeeUSD', data.shipping.usa.total)
          }
          if (data.shipping?.other?.total) {
            onInputChange('otherShippingFeeUSD', data.shipping.other.total)
          }

          // デバッグ情報を表示
          const debugMsg = `✅ ${data.policy.pricing_basis} | ${weight}kg | $${estimatedPriceUSD.toFixed(0)} | ${data.policy.name}`
          setPolicyDebugInfo(debugMsg)
          console.log('配送ポリシー自動選択:', data)
        } else {
          setPolicyDebugInfo(`❌ ポリシー選択失敗: ${data.error}`)
          console.error('ポリシー選択エラー:', data)
        }
      })
      .catch(err => {
        setPolicyDebugInfo(`❌ API エラー: ${err.message}`)
        console.error('ポリシー選択APIエラー:', err)
      })
  }, [formData.actualWeight, formData.costJPY, formData.exchangeRate])

  // 🆕 選択されたポリシーのZONE別送料を取得（手動選択時のみ）
  useEffect(() => {
    if (selectedPolicyId && !autoSelectedPolicy) {
      fetch(`/api/ebay/get-policy-zone-rates?policyId=${selectedPolicyId}`)
        .then(r => r.json())
        .then(data => {
          if (data.rates) {
            setPolicyZoneRates(data.rates)
            // USA送料とOTHER送料を自動設定
            const usaRate = data.rates.find((r: any) => r.zone_code === 'US')
            const otherRate = data.rates.find((r: any) => r.zone_type === 'OTHER' || r.zone_code === 'FA')
            
            if (usaRate) {
              onInputChange('shippingFeeUSD', usaRate.first_item_shipping_usd || usaRate.display_shipping_usd)
            }
            if (otherRate) {
              onInputChange('otherShippingFeeUSD', otherRate.first_item_shipping_usd || otherRate.display_shipping_usd)
            }
          }
        })
        .catch(err => console.error('ZONE別送料取得エラー:', err))
    }
  }, [selectedPolicyId])
