'use client';

import { useState, useEffect } from 'react';
import styles from '../../FullFeaturedModal.module.css';
import type { Product } from '@/types/product';
import { supabase } from '@/lib/supabase';

export interface TabShippingProps {
  product: Product | null;
  marketplace: string;
  marketplaceName: string;
}

interface ShippingService {
  service_code: string;
  service_name: string;
  carrier_name: string;
  carrier_code: string;
}

interface ShippingPolicy {
  id: number;
  policy_name: string;
  rate_table_name: string | null;
  flat_shipping_cost: number;
  policy_type: string;
  handling_time_days: number;
}

export function TabShipping({ product, marketplace, marketplaceName }: TabShippingProps) {
  const listingData = (product as any)?.listing_data || {};
  
  const [shippingServices, setShippingServices] = useState<ShippingService[]>([]);
  const [shippingPolicies, setShippingPolicies] = useState<ShippingPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    shippingService: '',
    shippingServiceName: '',
    shippingPolicyId: '',
    shippingPolicyName: '',
    rateTableName: '',
    policyShippingCost: 0,
    handlingTime: 10,
    weight: '',
    shippingCost: '',
    stock: 1,
    location: 'Plus1',
  });

  // 🔥 配送サービスと配送ポリシーをDBから取得
  useEffect(() => {
    async function loadShippingData() {
      try {
        setLoading(true);
        
        // 日本郵便サービスを取得
        const { data: jpServices } = await supabase
          .from('shipping_services')
          .select(`
            service_code,
            service_name,
            shipping_carriers!inner(
              carrier_name,
              carrier_code
            )
          `)
          .eq('shipping_carriers.carrier_code', 'JPPOST');
        
        // CPass/DHL/FedEx/UPSサービスを取得
        const { data: cpassServices } = await supabase
          .from('cpass_services')
          .select('service_code, service_name_ja, service_name_en');
        
        // 配送ポリシーを取得
        const { data: policies } = await supabase
          .from('shipping_policies')
          .select('*')
          .order('policy_name', { ascending: true });
        
        const allServices: ShippingService[] = [];
        
        // 日本郵便
        jpServices?.forEach(service => {
          allServices.push({
            service_code: service.service_code,
            service_name: service.service_name,
            carrier_name: service.shipping_carriers?.carrier_name || '日本郵便',
            carrier_code: 'JPPOST'
          });
        });
        
        // CPass/DHL/FedEx/UPS
        cpassServices?.forEach(service => {
          let carrierName = 'CPass';
          let carrierCode = 'CPASS';
          
          if (service.service_code.includes('DHL')) {
            carrierName = 'DHL';
            carrierCode = 'DHL';
          } else if (service.service_code.includes('FEDEX')) {
            carrierName = 'FedEx';
            carrierCode = 'FEDEX';
          } else if (service.service_code.includes('UPS')) {
            carrierName = 'UPS';
            carrierCode = 'UPS';
          } else if (service.service_code.includes('SPEEDPAK')) {
            carrierName = 'SpeedPAK';
            carrierCode = 'SPEEDPAK';
          }
          
          allServices.push({
            service_code: service.service_code,
            service_name: service.service_name_ja || service.service_name_en,
            carrier_name: carrierName,
            carrier_code: carrierCode
          });
        });
        
        setShippingServices(allServices);
        setShippingPolicies(policies || []);
        
        console.log('[TabShipping] データ読み込み完了:');
        console.log('  配送サービス:', allServices.length, '件');
        console.log('  配送ポリシー:', policies?.length || 0, '件');
      } catch (error) {
        console.error('[TabShipping] データ取得エラー:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadShippingData();
  }, []);

  // 🔥 productが変わったらformDataを更新
  useEffect(() => {
    if (product && shippingServices.length > 0 && shippingPolicies.length > 0) {
      const shippingServiceCode = listingData.shipping_service || listingData.usa_shipping_policy_name || '';
      const selectedService = shippingServices.find(s => s.service_code === shippingServiceCode);
      const shippingServiceName = selectedService 
        ? `${selectedService.carrier_name} - ${selectedService.service_name}`
        : shippingServiceCode;
      
      // 配送ポリシーを検索 (listing_data.shipping_policy_id または usa_shipping_policy_name)
      const policyIdFromData = listingData.shipping_policy_id || listingData.ebay_shipping_policy_id;
      const policyNameFromData = listingData.usa_shipping_policy_name || listingData.shipping_policy_name;
      
      let selectedPolicy = null;
      if (policyIdFromData) {
        selectedPolicy = shippingPolicies.find(p => p.id === policyIdFromData);
      } else if (policyNameFromData) {
        selectedPolicy = shippingPolicies.find(p => p.policy_name === policyNameFromData);
      }
      
      const handlingTime = selectedPolicy?.handling_time_days || listingData.handling_time || listingData.dispatch_time_max || 10;

      console.log('[TabShipping] 🔄 Updating formData from product:', {
        shipping_service: listingData.shipping_service,
        usa_shipping_policy_name: listingData.usa_shipping_policy_name,
        shipping_policy_id: policyIdFromData,
        selected_policy: selectedPolicy?.policy_name,
        shipping_cost_usd: listingData.shipping_cost_usd,
        weight_g: listingData.weight_g,
      });

      setFormData({
        shippingService: shippingServiceCode,
        shippingServiceName: shippingServiceName,
        shippingPolicyId: selectedPolicy ? selectedPolicy.id.toString() : '',
        shippingPolicyName: selectedPolicy?.policy_name || '',
        rateTableName: selectedPolicy?.rate_table_name || '',
        policyShippingCost: selectedPolicy?.flat_shipping_cost || 0,
        handlingTime: handlingTime,
        weight: listingData.weight_g || '',
        shippingCost: listingData.shipping_cost_usd || '',
        stock: product?.stock?.available || 1,
        location: product?.stock?.location || 'Plus1',
      });
    }
  }, [product, listingData, shippingServices, shippingPolicies]);

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        <i className="fas fa-shipping-fast"></i> <span style={{ color: 'var(--ilm-primary)' }}>{marketplaceName}</span> 配送・在庫設定
      </h3>
      
      <div className={styles.dataSection}>
        <div className={styles.sectionHeader}>
          <i className="fas fa-truck"></i> 配送設定
        </div>
        <div style={{ padding: '1rem' }}>
          <div className={styles.formGrid}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                配送サービス
              </label>
              <select 
                className={styles.formSelect}
                value={formData.shippingService}
                onChange={(e) => {
                  const code = e.target.value;
                  const selectedService = shippingServices.find(s => s.service_code === code);
                  const name = selectedService ? `${selectedService.carrier_name} - ${selectedService.service_name}` : code;
                  setFormData(prev => ({ 
                    ...prev, 
                    shippingService: code, 
                    shippingServiceName: name 
                  }));
                }}
                disabled={loading}
              >
                {loading ? (
                  <option value="">読み込み中...</option>
                ) : (
                  <>
                    <option value="">選択してください</option>
                    
                    {/* 日本郵便 */}
                    {shippingServices.filter(s => s.carrier_code === 'JPPOST').length > 0 && (
                      <optgroup label="🇯🇵 日本郵便">
                        {shippingServices
                          .filter(s => s.carrier_code === 'JPPOST')
                          .map(service => (
                            <option key={service.service_code} value={service.service_code}>
                              {service.service_name}
                            </option>
                          ))
                        }
                      </optgroup>
                    )}
                    
                    {/* DHL */}
                    {shippingServices.filter(s => s.carrier_code === 'DHL').length > 0 && (
                      <optgroup label="📦 DHL">
                        {shippingServices
                          .filter(s => s.carrier_code === 'DHL')
                          .map(service => (
                            <option key={service.service_code} value={service.service_code}>
                              {service.service_name}
                            </option>
                          ))
                        }
                      </optgroup>
                    )}
                    
                    {/* FedEx */}
                    {shippingServices.filter(s => s.carrier_code === 'FEDEX').length > 0 && (
                      <optgroup label="📦 FedEx">
                        {shippingServices
                          .filter(s => s.carrier_code === 'FEDEX')
                          .map(service => (
                            <option key={service.service_code} value={service.service_code}>
                              {service.service_name}
                            </option>
                          ))
                        }
                      </optgroup>
                    )}
                    
                    {/* UPS */}
                    {shippingServices.filter(s => s.carrier_code === 'UPS').length > 0 && (
                      <optgroup label="📦 UPS">
                        {shippingServices
                          .filter(s => s.carrier_code === 'UPS')
                          .map(service => (
                            <option key={service.service_code} value={service.service_code}>
                              {service.service_name}
                            </option>
                          ))
                        }
                      </optgroup>
                    )}
                    
                    {/* SpeedPAK */}
                    {shippingServices.filter(s => s.carrier_code === 'SPEEDPAK').length > 0 && (
                      <optgroup label="🚀 SpeedPAK">
                        {shippingServices
                          .filter(s => s.carrier_code === 'SPEEDPAK')
                          .map(service => (
                            <option key={service.service_code} value={service.service_code}>
                              {service.service_name}
                            </option>
                          ))
                        }
                      </optgroup>
                    )}
                    
                    {/* CPass */}
                    {shippingServices.filter(s => s.carrier_code === 'CPASS').length > 0 && (
                      <optgroup label="🌐 CPass">
                        {shippingServices
                          .filter(s => s.carrier_code === 'CPASS')
                          .map(service => (
                            <option key={service.service_code} value={service.service_code}>
                              {service.service_name}
                            </option>
                          ))
                        }
                      </optgroup>
                    )}
                  </>
                )}
              </select>
              <div style={{ 
                fontSize: '0.85rem', 
                color: '#155724',
                marginTop: '0.5rem',
                padding: '0.5rem',
                background: '#d4edda',
                border: '2px solid #28a745',
                borderRadius: '6px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <i className="fas fa-check-circle" style={{ color: '#28a745' }}></i>
                選択中: {formData.shippingServiceName}
              </div>
            </div>
            
            {/* 🆕 配送ポリシー選択 */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                eBay配送ポリシー
              </label>
              <select 
                className={styles.formSelect}
                value={formData.shippingPolicyId}
                onChange={(e) => {
                  const policyId = e.target.value;
                  const selectedPolicy = shippingPolicies.find(p => p.id.toString() === policyId);
                  
                  if (selectedPolicy) {
                    setFormData(prev => ({ 
                      ...prev, 
                      shippingPolicyId: policyId,
                      shippingPolicyName: selectedPolicy.policy_name,
                      rateTableName: selectedPolicy.rate_table_name || '',
                      policyShippingCost: selectedPolicy.flat_shipping_cost,
                      handlingTime: selectedPolicy.handling_time_days
                    }));
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <option value="">読み込み中...</option>
                ) : (
                  <>
                    <option value="">選択してください</option>
                    {shippingPolicies.map(policy => (
                      <option key={policy.id} value={policy.id}>
                        {policy.policy_name} {policy.rate_table_name ? `[${policy.rate_table_name}]` : ''}
                      </option>
                    ))}
                  </>
                )}
              </select>
              
              {/* 選択中のポリシー情報表示 */}
              {formData.shippingPolicyId && (
                <div style={{ 
                  fontSize: '0.85rem', 
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  background: '#e7f3ff',
                  border: '2px solid #0064d2',
                  borderRadius: '6px',
                  fontWeight: 600
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <i className="fas fa-check-circle" style={{ color: '#0064d2' }}></i>
                    <span style={{ color: '#0064d2' }}>選択中: {formData.shippingPolicyName}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#495057', marginTop: '0.5rem', display: 'grid', gap: '0.25rem' }}>
                    {formData.rateTableName && (
                      <div>
                        📋 Rate Table: <span style={{ fontWeight: 'bold', color: '#0064d2' }}>{formData.rateTableName}</span>
                      </div>
                    )}
                    <div>
                      💵 送料: <span style={{ fontWeight: 'bold', color: '#28a745' }}>${formData.policyShippingCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                ハンドリング時間（営業日）
              </label>
              <input 
                className={styles.formInput} 
                type="number" 
                value={formData.handlingTime}
                onChange={(e) => handleChange('handlingTime', Number(e.target.value))}
                min="1"
                max="30"
              />
              <div style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '0.25rem' }}>
                注文から発送までの日数
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                重量（g）
              </label>
              <input 
                className={styles.formInput} 
                type="number" 
                value={formData.weight || ''}
                onChange={(e) => handleChange('weight', e.target.value ? Number(e.target.value) : '')}
                placeholder="例: 10"
                min="1"
              />
              <div style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '0.25rem' }}>
                梱包後の総重量
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                送料（USD）
              </label>
              <input 
                className={styles.formInput} 
                type="number" 
                step="0.01"
                value={formData.shippingCost || ''}
                onChange={(e) => handleChange('shippingCost', e.target.value ? Number(e.target.value) : '')}
                placeholder="例: 5.00"
                min="0"
              />
              <div style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '0.25rem' }}>
                顧客負担の配送料金
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className={styles.dataSection}>
        <div className={styles.sectionHeader}>
          <i className="fas fa-warehouse"></i> 在庫管理
        </div>
        <div style={{ padding: '1rem' }}>
          <div className={styles.formGrid}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                在庫数
              </label>
              <input 
                className={styles.formInput} 
                type="number" 
                value={formData.stock}
                onChange={(e) => handleChange('stock', Number(e.target.value))}
                min="0"
              />
              <div style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '0.25rem' }}>
                出品可能な在庫数
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                保管場所
              </label>
              <select
                className={styles.formSelect}
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
              >
                <option value="Plus1">Plus1（日本倉庫）</option>
                <option value="Osaka">大阪（自社倉庫）</option>
                <option value="Dropship">無在庫（仕入先直送）</option>
              </select>
              <div style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '0.25rem' }}>
                商品の物理的な保管場所
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 配送情報の概要表示 */}
      <div className={styles.dataSection} style={{ background: '#f8f9fa' }}>
        <div className={styles.sectionHeader}>
          <i className="fas fa-info-circle"></i> 配送情報サマリー
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ 
              padding: '0.75rem', 
              background: 'white', 
              borderRadius: '0.375rem',
              border: '1px solid #dee2e6'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>配送サービス</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{formData.shippingServiceName || '未設定'}</div>
            </div>
            
            {/* 🆕 配送ポリシー情報 */}
            {formData.shippingPolicyId && (
              <>
                <div style={{ 
                  padding: '0.75rem', 
                  background: 'white', 
                  borderRadius: '0.375rem',
                  border: '1px solid #dee2e6'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>eBayポリシー</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{formData.shippingPolicyName}</div>
                </div>
                
                {formData.rateTableName && (
                  <div style={{ 
                    padding: '0.75rem', 
                    background: 'white', 
                    borderRadius: '0.375rem',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>Rate Table</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{formData.rateTableName}</div>
                  </div>
                )}
                
                <div style={{ 
                  padding: '0.75rem', 
                  background: 'white', 
                  borderRadius: '0.375rem',
                  border: '1px solid #dee2e6'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>ポリシー送料</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#28a745' }}>
                    ${formData.policyShippingCost.toFixed(2)}
                  </div>
                </div>
              </>
            )}
            
            <div style={{ 
              padding: '0.75rem', 
              background: 'white', 
              borderRadius: '0.375rem',
              border: '1px solid #dee2e6'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>発送までの日数</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{formData.handlingTime}営業日</div>
            </div>
            <div style={{ 
              padding: '0.75rem', 
              background: 'white', 
              borderRadius: '0.375rem',
              border: '1px solid #dee2e6'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>送料</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                {formData.shippingCost ? `$${Number(formData.shippingCost).toFixed(2)}` : '未設定'}
              </div>
            </div>
            <div style={{ 
              padding: '0.75rem', 
              background: 'white', 
              borderRadius: '0.375rem',
              border: '1px solid #dee2e6'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>在庫状況</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                {formData.stock > 0 ? (
                  <span style={{ color: '#28a745' }}>✓ {formData.stock}個在庫あり</span>
                ) : (
                  <span style={{ color: '#dc3545' }}>✗ 在庫切れ</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button 
          className={styles.btnSecondary}
          onClick={() => {
            // リセット処理
            setFormData({
              shippingService: shippingServiceCode,
              shippingServiceName: shippingServiceName,
              handlingTime: handlingTime,
              weight: listingData.weight_g || '',
              shippingCost: listingData.shipping_cost_usd || '',
              stock: product?.stock?.available || 1,
              location: product?.stock?.location || 'Plus1',
            });
          }}
        >
          <i className="fas fa-undo"></i> リセット
        </button>
        <button 
          className={styles.btnPrimary}
          onClick={async () => {
            // TODO: 保存処理実装
            console.log('Saving shipping data:', formData);
            alert('配送・在庫情報を保存しました');
          }}
        >
          <i className="fas fa-save"></i> 保存
        </button>
      </div>
    </div>
  );
}
