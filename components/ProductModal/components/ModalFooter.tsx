'use client';

import styles from '../FullFeaturedModal.module.css';

export interface ModalFooterProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onSave?: () => void;
  onClose?: () => void;
}

export function ModalFooter({ currentTab, onTabChange, onSave, onClose }: ModalFooterProps) {
  const handlePrevious = () => {
    const tabs = ['overview', 'data', 'images', 'tools', 'mirror', 'listing', 'shipping', 'html', 'final'];
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex > 0) {
      onTabChange(tabs[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    const tabs = ['overview', 'data', 'images', 'tools', 'mirror', 'listing', 'shipping', 'html', 'final'];
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex < tabs.length - 1) {
      onTabChange(tabs[currentIndex + 1]);
    }
  };

  const handleSaveAndClose = () => {
    if (onSave) {
      onSave();
    }
    if (onClose) {
      onClose();
    }
  };

  const isFinalTab = currentTab === 'final';
  const isFirstTab = currentTab === 'overview';

  return (
    <footer className={styles.footer}>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {!isFirstTab && (
          <button 
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handlePrevious}
          >
            <i className="fas fa-arrow-left"></i> 前へ
          </button>
        )}
        {!isFinalTab && (
          <button 
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleNext}
          >
            次へ <i className="fas fa-arrow-right"></i>
          </button>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--ilm-text-secondary)' }}>
          <i className="fas fa-clock"></i> 
          <span style={{ marginLeft: '0.5rem' }}>処理時間: --秒</span>
        </div>
        <button 
          className={`${styles.btn} ${styles.btnSuccess}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={handleSaveAndClose}
        >
          <i className="fas fa-save"></i> 保存して閉じる
        </button>
      </div>
    </footer>
  );
}
