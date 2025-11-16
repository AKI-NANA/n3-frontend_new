'use client'

import { useState, useEffect } from 'react'
import styles from '../../FullFeaturedModal.module.css'

interface TabTaxComplianceProps {
  product: any
  marketplace?: string
  marketplaceName?: string
}

export function TabTaxCompliance({ product, marketplace, marketplaceName }: TabTaxComplianceProps) {
  const [formData, setFormData] = useState({
    hts_code: product?.hts_code || '',
    origin_country: product?.origin_country || 'JP',
    customs_value: product?.customs_value_usd || '',
    tariff_rate: product?.tariff_rate || '',
    total_tariff_rate: product?.total_tariff_rate || '',
  })

  const [tariffBreakdown, setTariffBreakdown] = useState({
    base_rate: 0,
    section232_rate: 0,
    section301_rate: 0,
    final_rate: 0,
    estimated_duty_usd: 0
  })

  // productが更新されたらformDataも更新
  useEffect(() => {
    if (product) {
      setFormData({
        hts_code: product?.hts_code || '',
        origin_country: product?.origin_country || 'JP',
        customs_value: product?.customs_value_usd || product?.price_usd || '',
        tariff_rate: product?.tariff_rate || '',
        total_tariff_rate: product?.total_tariff_rate || '',
      })

      // 関税内訳を計算
      calculateTariffBreakdown(product)
    }
  }, [product])

  const calculateTariffBreakdown = (prod: any) => {
    console.log('[TabTaxCompliance] 📊 Calculating tariff breakdown:', {
      product: prod,
      tariff_rate: prod?.tariff_rate,
      total_tariff_rate: prod?.total_tariff_rate,
      section232_rate: prod?.section232_rate,
      section301_rate: prod?.section301_rate,
      origin_country_duty_rate: prod?.origin_country_duty_rate,
      material_duty_rate: prod?.material_duty_rate,
      customs_value_usd: prod?.customs_value_usd,
      price_usd: prod?.price_usd,
    });

    // 🔥 DBからデータを取得
    const baseRate = parseFloat(prod?.tariff_rate || '0');
    const section232 = parseFloat(prod?.section232_rate || '0');
    const section301 = parseFloat(prod?.section301_rate || '0');
    const originCountryRate = parseFloat(prod?.origin_country_duty_rate || '0');
    const materialRate = parseFloat(prod?.material_duty_rate || '0');
    
    // 関税評価額：商品価格 + 送料
    const productPrice = parseFloat(prod?.price_usd || prod?.listing_data?.ddu_price_usd || '0');
    const shippingCost = parseFloat(prod?.listing_data?.shipping_cost_usd || '0');
    const customsValue = parseFloat(prod?.customs_value_usd || (productPrice + shippingCost).toString() || '0');

    console.log('[TabTaxCompliance] 💰 Customs value calculation:', {
      productPrice,
      shippingCost,
      customsValue,
    });

    // 最終関税率：各種関税を合算
    const finalRate = baseRate + section232 + section301 + originCountryRate + materialRate;
    const estimatedDuty = customsValue * (finalRate / 100);

    console.log('[TabTaxCompliance] ✅ Final calculation:', {
      baseRate,
      section232,
      section301,
      originCountryRate,
      materialRate,
      finalRate,
      estimatedDuty,
    });

    setTariffBreakdown({
      base_rate: baseRate,
      section232_rate: section232,
      section301_rate: section301,
      final_rate: finalRate,
      estimated_duty_usd: estimatedDuty
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hts_code: formData.hts_code,
          origin_country: formData.origin_country,
          customs_value_usd: parseFloat(formData.customs_value),
        })
      })

      if (response.ok) {
        alert('関税情報を保存しました')
      } else {
        throw new Error('保存に失敗しました')
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('保存中にエラーが発生しました')
    }
  }

  const originCountries = [
    { code: 'JP', name: '日本', flag: '🇯🇵' },
    { code: 'CN', name: '中国', flag: '🇨🇳' },
    { code: 'US', name: 'アメリカ', flag: '🇺🇸' },
    { code: 'DE', name: 'ドイツ', flag: '🇩🇪' },
    { code: 'FR', name: 'フランス', flag: '🇫🇷' },
    { code: 'GB', name: 'イギリス', flag: '🇬🇧' },
    { code: 'KR', name: '韓国', flag: '🇰🇷' },
    { code: 'TW', name: '台湾', flag: '🇹🇼' },
    { code: 'VN', name: 'ベトナム', flag: '🇻🇳' },
    { code: 'TH', name: 'タイ', flag: '🇹🇭' },
    { code: 'ID', name: 'インドネシア', flag: '🇮🇩' },
    { code: 'MY', name: 'マレーシア', flag: '🇲🇾' },
  ]

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        税関・コンプライアンス情報
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* 左カラム: 基本情報 */}
        <div className={styles.dataSection}>
          <div className={styles.sectionHeader}>
            HSコード・関税設定
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 500 }}>
                HTSコード <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={formData.hts_code}
                  onChange={(e) => handleChange('hts_code', e.target.value)}
                  placeholder="例: 9503.00.00"
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <button
                  onClick={() => window.open(`/tools/hts-classification?query=${encodeURIComponent(product?.title || '')}`, '_blank')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  検索
                </button>
              </div>
              {formData.hts_code && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                  Chapter: {formData.hts_code.substring(0, 2)}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 500 }}>
                原産国 <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <select
                value={formData.origin_country}
                onChange={(e) => handleChange('origin_country', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                {originCountries.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name} ({country.code})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 500 }}>
                関税評価額（USD）
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.customs_value}
                onChange={(e) => handleChange('customs_value', e.target.value)}
                placeholder="例: 100.00"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <div style={{ 
                marginTop: '0.5rem', 
                padding: '0.5rem',
                background: '#e3f2fd',
                border: '1px solid #90caf9',
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: '#1565c0'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  <i className="fas fa-info-circle"></i> 関税評価額とは？
                </div>
                <div>
                  米国税関で関税を計算する際の基準となる金額です。通常は<strong>商品価格 + 送料</strong>の合計で計算されます。
                </div>
                <div style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
                  ※ 商品価格: ${product?.listing_data?.ddu_price_usd?.toFixed(2) || product?.price_usd?.toFixed(2) || 'N/A'} + 送料: ${product?.listing_data?.shipping_cost_usd?.toFixed(2) || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右カラム: 関税計算結果 */}
        <div className={styles.dataSection}>
          <div className={styles.sectionHeader}>
            関税計算結果
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span>基本関税率:</span>
                <span style={{ fontWeight: 600 }}>{tariffBreakdown.base_rate.toFixed(2)}%</span>
              </div>
              
              {tariffBreakdown.section232_rate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#fd7e14' }}>
                  <span>Section 232追加:</span>
                  <span style={{ fontWeight: 600 }}>+{tariffBreakdown.section232_rate.toFixed(2)}%</span>
                </div>
              )}
              
              {tariffBreakdown.section301_rate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#dc3545' }}>
                  <span>Section 301追加:</span>
                  <span style={{ fontWeight: 600 }}>+{tariffBreakdown.section301_rate.toFixed(2)}%</span>
                </div>
              )}

              <div style={{
                borderTop: '2px solid #dee2e6',
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1rem'
              }}>
                <span style={{ fontWeight: 700 }}>最終関税率:</span>
                <span style={{ fontWeight: 700, color: '#28a745' }}>{tariffBreakdown.final_rate.toFixed(2)}%</span>
              </div>
            </div>

            <div style={{
              background: '#e7f3ff',
              border: '1px solid #90caf9',
              borderRadius: '6px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
                推定関税額
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1976d2' }}>
                ${tariffBreakdown.estimated_duty_usd.toFixed(2)}
              </div>
            </div>

            {formData.origin_country === 'CN' && (
              <div style={{
                marginTop: '1rem',
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '6px',
                padding: '0.75rem',
                fontSize: '0.8rem'
              }}>
                <strong>⚠️ 中国製品への追加関税</strong>
                <div style={{ marginTop: '0.5rem' }}>
                  トランプ政権2025年の政策により、中国からの輸入品には大幅な追加関税が適用される可能性があります。
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* コンプライアンス情報セクション */}
      <div className={styles.dataSection} style={{ marginBottom: '1.5rem' }}>
        <div className={styles.sectionHeader}>
          コンプライアンス情報
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{
            background: '#e3f2fd',
            border: '1px solid #90caf9',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '1rem',
            fontSize: '0.85rem'
          }}>
            <strong>GPSR対応状況:</strong>
            <div style={{ marginTop: '0.5rem' }}>
              {product?.eu_responsible_company_name ? (
                <span style={{ color: '#4caf50', fontWeight: 600 }}>✓ EU責任者情報登録済み</span>
              ) : (
                <>
                  <span style={{ color: '#ff9800', fontWeight: 600 }}>⚠ EU責任者情報未登録</span>
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fff3cd', borderRadius: '4px', fontSize: '0.8rem' }}>
                    <strong>🔥 承認ルール:</strong> EU以外の市場(米国、日本等)への出品の場合はEU責任者情報が空欄でも<strong style={{ color: '#28a745' }}>承認OK</strong>です。
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '0.85rem'
          }}>
            <strong>注意事項:</strong>
            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.2rem' }}>
              <li>EU向け出品にはGPSR対応が<strong style={{ color: '#dc3545' }}>必須</strong>です</li>
              <li>🔥 <strong>EU以外の市場では空欄OK</strong>(米国、日本、アジア等)</li>
              <li>HTSコードは正確に入力してください</li>
              <li>関税率は仕向地により異なります</li>
              <li>関税評価額は商品価格+送料で計算されます</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <button
          className={`${styles.btn} ${styles.btnSuccess}`}
          onClick={handleSave}
        >
          関税情報を保存
        </button>
      </div>
    </div>
  )
}
