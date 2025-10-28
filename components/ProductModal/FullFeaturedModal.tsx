'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useState, useEffect } from 'react';
import styles from './FullFeaturedModal.module.css';
import type { Product } from '@/types/product';

// コンポーネントインポート
import { ModalHeader } from './components/ModalHeader';
import { MarketplaceSelector } from './components/MarketplaceSelector';
import { TabNavigation } from './components/TabNavigation';
import { ModalFooter } from './components/ModalFooter';

// タブコンポーネントインポート
import { TabOverview } from './components/Tabs/TabOverview';
import { TabData } from './components/Tabs/TabData';
import { TabImages } from './components/Tabs/TabImages';
import { TabTools } from './components/Tabs/TabTools';
import { TabMirror } from './components/Tabs/TabMirror';
import { TabListing } from './components/Tabs/TabListing';
import { TabShipping } from './components/Tabs/TabShipping';
import { TabHTML } from './components/Tabs/TabHTML';
import { TabFinal } from './components/Tabs/TabFinal';

export interface FullFeaturedModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (updates: any) => void;
}

// マーケットプレイス設定
const MARKETPLACE_CONFIG = {
  ebay: {
    name: 'eBay',
    maxImages: 12,
    color: '#0064d2',
  },
  shopee: {
    name: 'Shopee',
    maxImages: 10,
    color: '#ee4d2d',
  },
  'amazon-global': {
    name: 'Amazon海外',
    maxImages: 9,
    color: '#ff9900',
  },
  'amazon-jp': {
    name: 'Amazon日本',
    maxImages: 9,
    color: '#232f3e',
  },
  coupang: {
    name: 'Coupang',
    maxImages: 20,
    color: '#ff6600',
  },
  shopify: {
    name: 'Shopify',
    maxImages: 25,
    color: '#95bf47',
  },
};

export function FullFeaturedModal({ 
  product, 
  open, 
  onOpenChange,
  onSave
}: FullFeaturedModalProps) {
  const [currentTab, setCurrentTab] = useState('overview');
  const [currentMarketplace, setCurrentMarketplace] = useState('ebay');
  
  // マーケットプレイス切り替え時の処理
  const handleMarketplaceChange = (mp: string) => {
    console.log('[FullFeaturedModal] Marketplace changed:', mp);
    setCurrentMarketplace(mp);
    
    // 画像選択タブにいる場合は、最大枚数の変更を反映
    if (currentTab === 'images') {
      const maxImages = MARKETPLACE_CONFIG[mp as keyof typeof MARKETPLACE_CONFIG]?.maxImages || 12;
      console.log(`Max images for ${mp}:`, maxImages);
    }
  };
  
  // 現在のMP設定を取得
  const currentMPConfig = MARKETPLACE_CONFIG[currentMarketplace as keyof typeof MARKETPLACE_CONFIG];
  
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 9998,
          }}
        />
        <DialogPrimitive.Content
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
            width: '98vw',
            height: '98vh',
            maxWidth: '1900px',
            outline: 'none',
          }}
        >
          {/* アクセシビリティ用の非表示タイトル */}
          <VisuallyHidden>
            <DialogPrimitive.Title>
              {product?.title || '商品編集モーダル'}
            </DialogPrimitive.Title>
          </VisuallyHidden>
          
          <div 
            className={styles.modal}
            style={{
              background: 'white',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              width: '100%',
              height: '100%',
            }}
          >
            {/* ヘッダー */}
            <ModalHeader 
              product={product} 
              onClose={() => onOpenChange(false)} 
            />
            
            {/* ボディ */}
            <div className={styles.body}>
              {/* マーケットプレイス選択 */}
              <MarketplaceSelector 
                current={currentMarketplace}
                onChange={handleMarketplaceChange}
              />
              
              {/* タブナビゲーション */}
              <TabNavigation 
                current={currentTab}
                onChange={setCurrentTab}
              />
              
              {/* タブコンテンツ */}
              <div className={styles.tabContent}>
                <div className={`${styles.tabPane} ${currentTab === 'overview' ? styles.active : ''}`}>
                  <TabOverview product={product} marketplace={currentMarketplace} />
                </div>
                <div className={`${styles.tabPane} ${currentTab === 'data' ? styles.active : ''}`}>
                  <TabData product={product} />
                </div>
                <div className={`${styles.tabPane} ${currentTab === 'images' ? styles.active : ''}`}>
                  <TabImages 
                    product={product} 
                    maxImages={currentMPConfig?.maxImages || 12}
                    marketplace={currentMarketplace}
                    onSave={onSave}
                  />
                </div>
                <div className={`${styles.tabPane} ${currentTab === 'tools' ? styles.active : ''}`}>
                  <TabTools product={product} onSave={onSave} />
                </div>
                <div className={`${styles.tabPane} ${currentTab === 'mirror' ? styles.active : ''}`}>
                  <TabMirror product={product} />
                </div>
                <div className={`${styles.tabPane} ${currentTab === 'listing' ? styles.active : ''}`}>
                  <TabListing 
                    product={product} 
                    marketplace={currentMarketplace}
                    marketplaceName={currentMPConfig?.name || 'Unknown'}
                  />
                </div>
                <div className={`${styles.tabPane} ${currentTab === 'shipping' ? styles.active : ''}`}>
                  <TabShipping 
                    product={product} 
                    marketplace={currentMarketplace}
                    marketplaceName={currentMPConfig?.name || 'Unknown'}
                  />
                </div>
                <div className={`${styles.tabPane} ${currentTab === 'html' ? styles.active : ''}`}>
                  <TabHTML 
                    product={product} 
                    marketplace={currentMarketplace}
                    marketplaceName={currentMPConfig?.name || 'Unknown'}
                  />
                </div>
                <div className={`${styles.tabPane} ${currentTab === 'final' ? styles.active : ''}`}>
                  <TabFinal 
                    product={product} 
                    marketplace={currentMarketplace}
                    marketplaceName={currentMPConfig?.name || 'Unknown'}
                  />
                </div>
              </div>
            </div>
            
            {/* フッター */}
            <ModalFooter 
              currentTab={currentTab}
              onTabChange={setCurrentTab}
              onSave={() => {
                // 現在の変更をすべて保存
                if (onSave) {
                  console.log('[FullFeaturedModal] Saving all changes');
                  // ここで必要に応じて他のタブの変更も保存
                }
              }}
              onClose={() => onOpenChange(false)}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
