'use client';

import styles from '../FullFeaturedModal.module.css';

const MARKETPLACES = [
  { id: 'ebay', name: 'eBay', icon: 'fab fa-ebay', className: 'ebay', color: '#0064d2' },
  { id: 'shopee', name: 'Shopee', icon: 'fas fa-shopping-bag', className: 'shopee', color: '#ee4d2d' },
  { id: 'amazon-global', name: 'Amazon海外', icon: 'fab fa-amazon', className: 'amazonGlobal', color: '#ff9900' },
  { id: 'amazon-jp', name: 'Amazon日本', icon: 'fab fa-amazon', className: 'amazonJp', color: '#232f3e' },
  { id: 'coupang', name: 'Coupang', icon: 'fas fa-store', className: 'coupang', color: '#ff6600' },
  { id: 'shopify', name: 'Shopify', icon: 'fab fa-shopify', className: 'shopify', color: '#95bf47' },
];

export interface MarketplaceSelectorProps {
  current: string;
  onChange: (mp: string) => void;
}

export function MarketplaceSelector({ current, onChange }: MarketplaceSelectorProps) {
  return (
    <div 
      style={{
        background: 'hsl(var(--muted))',
        borderBottom: '1px solid hsl(var(--border))',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexShrink: 0,
        overflowX: 'auto',
      }}
    >
      <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'hsl(var(--foreground))' }}>
        対象マーケットプレイス:
      </label>
      {MARKETPLACES.map(mp => {
        const isActive = current === mp.id;
        return (
          <button
            key={mp.id}
            className={`${styles.marketplaceBtn} ${styles[mp.className]} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(mp.id)}
            style={{
              borderColor: mp.color,
              color: isActive ? 'white' : mp.color,
              background: isActive ? mp.color : 'hsl(var(--card))',
            }}
          >
            <i className={mp.icon}></i> {mp.name}
          </button>
        );
      })}
    </div>
  );
}
