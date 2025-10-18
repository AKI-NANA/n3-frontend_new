'use client';

import { useState, useEffect } from 'react';

interface FeeSettings {
  monthly_sales_usd: number;
  payoneer_fee_percent: number;
  use_international_fee: boolean;
}

export function FeeSettingsPanel() {
  const [settings, setSettings] = useState<FeeSettings>({
    monthly_sales_usd: 0,
    payoneer_fee_percent: 2.0,
    use_international_fee: true,
  });
  
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // LocalStorageから設定を読み込み
    const saved = localStorage.getItem('ebay_fee_settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('ebay_fee_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tier = settings.monthly_sales_usd >= 7500 ? 'プレミアム' : 'スタンダード';
  const feeRate = settings.monthly_sales_usd >= 7500 ? '12.35%' : '13.25%';

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '1.5rem',
      marginBottom: '1rem'
    }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        eBay手数料設定
      </h3>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* 月間売上 */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            月間売上（USD）
          </label>
          <input
            type="number"
            value={settings.monthly_sales_usd}
            onChange={(e) => setSettings({ ...settings, monthly_sales_usd: parseFloat(e.target.value) || 0 })}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
            placeholder="0"
          />
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
            $7,500以上でプレミアムティア（割引レート）が適用されます
          </div>
        </div>

        {/* Payoneer手数料 */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            Payoneer手数料（%）
          </label>
          <input
            type="number"
            step="0.1"
            value={settings.payoneer_fee_percent}
            onChange={(e) => setSettings({ ...settings, payoneer_fee_percent: parseFloat(e.target.value) || 2.0 })}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
          />
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
            通常は2%固定
          </div>
        </div>

        {/* International Fee */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={settings.use_international_fee}
              onChange={(e) => setSettings({ ...settings, use_international_fee: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontWeight: 600 }}>International Fee (1.65%) を含める</span>
          </label>
          <div style={{ fontSize: '0.75rem', color: '#666', marginLeft: '1.75rem' }}>
            海外バイヤー向けの手数料
          </div>
        </div>
      </div>

      {/* 現在の設定サマリー */}
      <div style={{
        background: '#f8f9fa',
        padding: '1rem',
        borderRadius: '6px',
        marginBottom: '1rem'
      }}>
        <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          現在の設定
        </div>
        <div style={{ fontSize: '0.85rem', color: '#333' }}>
          <div>売上ティア: <strong>{tier}</strong></div>
          <div>Final Value Fee: <strong>{feeRate}</strong></div>
          <div>Payoneer: <strong>{settings.payoneer_fee_percent}%</strong></div>
          <div>International Fee: <strong>{settings.use_international_fee ? '1.65%' : '0%'}</strong></div>
        </div>
      </div>

      <button
        onClick={handleSave}
        style={{
          background: saved ? '#28a745' : '#0064d2',
          color: 'white',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '6px',
          fontSize: '0.9rem',
          fontWeight: 600,
          cursor: 'pointer',
          width: '100%'
        }}
      >
        {saved ? '✓ 保存しました' : '設定を保存'}
      </button>
    </div>
  );
}
