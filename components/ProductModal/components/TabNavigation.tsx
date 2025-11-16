'use client';

import styles from '../FullFeaturedModal.module.css';

const TABS = [
  { id: 'overview', label: '統合概要', icon: 'fas fa-chart-pie', mpSpecific: false },
  { id: 'data', label: 'データ確認', icon: 'fas fa-database', mpSpecific: false },
  { id: 'images', label: '画像選択', icon: 'fas fa-images', mpSpecific: false },
  { id: 'tools', label: 'ツール連携', icon: 'fas fa-tools', mpSpecific: false },
  { id: 'mirror', label: 'Mirror分析', icon: 'fas fa-search-dollar', mpSpecific: false },
  { id: 'competitors', label: '競合分析', icon: 'fas fa-chart-bar', mpSpecific: false },
  { id: 'pricing', label: '価格戦略', icon: 'fas fa-dollar-sign', mpSpecific: false },
  { id: 'listing', label: '出品情報', icon: 'fas fa-edit', mpSpecific: true },
  { id: 'shipping', label: '配送・在庫', icon: 'fas fa-shipping-fast', mpSpecific: true },
  { id: 'tax', label: '関税・法規制', icon: 'fas fa-balance-scale', mpSpecific: true },
  { id: 'html', label: 'HTML編集', icon: 'fas fa-code', mpSpecific: true },
  { id: 'final', label: '最終確認', icon: 'fas fa-check-circle', mpSpecific: false },
];

export interface TabNavigationProps {
  current: string;
  onChange: (tab: string) => void;
}

export function TabNavigation({ current, onChange }: TabNavigationProps) {
  return (
    <nav 
      style={{
        display: 'flex',
        background: 'hsl(var(--muted))',
        borderBottom: '1px solid hsl(var(--border))',
        overflowX: 'auto',
        flexShrink: 0,
      }}
    >
      {TABS.map(tab => {
        const isActive = current === tab.id;
        return (
          <div
            key={tab.id}
            className={`${styles.tabLink} ${isActive ? styles.active : ''} ${tab.mpSpecific ? styles.marketplaceSpecific : ''}`}
            onClick={() => onChange(tab.id)}
            style={{
              color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              borderBottomColor: isActive ? 'hsl(var(--primary))' : 'transparent',
              background: isActive ? 'hsl(var(--card))' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <i className={tab.icon}></i><br />
            {tab.label}
          </div>
        );
      })}
    </nav>
  );
}
