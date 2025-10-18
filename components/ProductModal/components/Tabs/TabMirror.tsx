'use client';

import styles from '../../FullFeaturedModal.module.css';
import type { Product } from '@/types/product';

export interface TabMirrorProps {
  product: Product | null;
}

export function TabMirror({ product }: TabMirrorProps) {
  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        <i className="fas fa-search-dollar"></i> Mirror分析
      </h3>
      
      <p style={{ color: '#6c757d', marginBottom: '1.5rem' }}>
        SellerMirrorによる競合分析結果を表示します
      </p>
      
      <div className={styles.dataSection}>
        <h4 className={styles.sectionHeader}>分析結果</h4>
        <p style={{ textAlign: 'center', color: '#6c757d', padding: '2rem' }}>
          ツールタブからSellerMirror分析を実行してください
        </p>
      </div>
    </div>
  );
}
