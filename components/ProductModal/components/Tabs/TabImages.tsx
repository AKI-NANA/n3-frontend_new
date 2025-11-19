'use client';

import { useState, useEffect, useRef } from 'react';
import styles from '../../FullFeaturedModal.css';
import type { Product } from '@/types/product';

export interface TabImagesProps {
  product: Product | null;
  maxImages: number;
  marketplace: string;
  onSave?: (updates: any) => void;
}

export function TabImages({ product, maxImages, marketplace, onSave }: TabImagesProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>(product?.selectedImages || []);
  const [imageSettings, setImageSettings] = useState({
    resize: true,
    optimize: true,
    watermark: false,
  });
  
  const availableImages = product?.images || [];
  const isFirstRender = useRef(true); // 初回レンダリングを追跡
  
  // 🔍 デバッグ: 画像データを確認
  useEffect(() => {
    console.log('🖼️ TabImages: 画像データ確認', {
      productId: product?.id,
      availableImagesCount: availableImages.length,
      availableImages: availableImages,
      rawProductImages: product?.images,
      selectedImagesCount: selectedImages.length
    });
  }, [product, availableImages, selectedImages]);
  
  // 画像の選択が変更されたらDBに保存（初回はスキップ）
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (onSave) {
      const selectedUrls = availableImages
        .filter(img => selectedImages.includes(img.id))
        .map(img => img.url);
      
      console.log('🖼️ 画像選択が変更されました:', { count: selectedUrls.length });
      
      onSave({
        listing_data: {
          ...product?.listing_data,
          image_urls: selectedUrls,
          image_count: selectedUrls.length
        }
      });
    }
  }, [selectedImages]); // selectedImagesのみを監視
  
  const toggleImage = (imageId: string) => {
    setSelectedImages(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        if (prev.length >= maxImages) {
          alert(`${marketplace.toUpperCase()}では最大${maxImages}枚まで選択可能です`);
          return prev;
        }
        return [...prev, imageId];
      }
    });
  };

  const selectAllImages = () => {
    const allIds = availableImages.slice(0, maxImages).map(img => img.id);
    setSelectedImages(allIds);
  };

  const clearSelected = () => {
    setSelectedImages([]);
  };

  const handleAdditionalImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      console.log('Additional images:', files);
      alert(`${files.length}枚の画像を選択しました（アップロード機能は実装中）`);
    }
  };

  const handleSave = () => {
    console.log('Saving images:', selectedImages);
    alert(`✓ ${marketplace.toUpperCase()}用に画像選択を保存しました（${selectedImages.length}枚）`);
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        <i className="fas fa-images"></i> 画像管理・順序設定
      </h3>
      <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#e3f2fd', borderRadius: '6px', fontSize: '0.85rem', color: '#1976d2' }}>
        <strong>{marketplace.toUpperCase()}</strong> は最大 <strong>{maxImages}枚</strong> まで画像を選択できます
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* 取得済み画像 */}
        <div>
          <h4 style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>取得済み画像 (<span>{availableImages.length}</span>枚)</span>
            <button 
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={selectAllImages}
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
            >
              <i className="fas fa-check-double"></i> 全選択
            </button>
          </h4>
          <div className={styles.imagesGrid}>
            {availableImages.map((image, idx) => (
              <div
                key={image.id}
                className={`${styles.imageItem} ${selectedImages.includes(image.id) ? styles.selected : ''}`}
                onClick={() => toggleImage(image.id)}
              >
                <img src={image.url} alt={image.alt || `画像${idx + 1}`} />
                <div style={{ 
                  position: 'absolute', 
                  top: '0.25rem', 
                  left: '0.25rem', 
                  background: 'rgba(0,0,0,0.7)', 
                  color: 'white', 
                  padding: '0.2rem 0.4rem', 
                  borderRadius: '4px', 
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}>
                  #{idx + 1}
                </div>
                {selectedImages.includes(image.id) && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)', 
                    fontSize: '2rem', 
                    color: 'var(--ilm-success)',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}>
                    <i className="fas fa-check-circle"></i>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* 出品用画像順序 */}
        <div>
          <h4 style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>出品用画像順序 (<span>{selectedImages.length}</span>/<span>{maxImages}</span>枚)</span>
            <button 
              className={styles.btn}
              onClick={clearSelected}
              style={{ background: '#dc3545', color: 'white', fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
            >
              <i className="fas fa-times"></i> クリア
            </button>
          </h4>
          <div className={styles.imagesGrid}>
            {selectedImages.map((imageId, idx) => {
              const image = availableImages.find(img => img.id === imageId);
              if (!image) return null;
              return (
                <div
                  key={imageId}
                  className={styles.imageItem}
                  style={{ border: '2px solid var(--ilm-success)' }}
                >
                  <img src={image.url} alt={`選択${idx + 1}`} />
                  <div style={{ 
                    position: 'absolute', 
                    top: '0.25rem', 
                    left: '0.25rem', 
                    background: 'var(--ilm-success)', 
                    color: 'white', 
                    padding: '0.2rem 0.4rem', 
                    borderRadius: '4px', 
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}>
                    {idx + 1}
                  </div>
                  {idx === 0 && (
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '0.25rem', 
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--ilm-primary)', 
                      color: 'white', 
                      padding: '0.2rem 0.4rem', 
                      borderRadius: '4px', 
                      fontSize: '0.65rem',
                      fontWeight: 600,
                    }}>
                      メイン
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* 画像処理設定 */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>
              <i className="fas fa-cog"></i> 画像処理設定
            </h5>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={imageSettings.resize}
                onChange={(e) => setImageSettings(prev => ({ ...prev, resize: e.target.checked }))}
                style={{ marginRight: '0.5rem' }}
              />
              <span style={{ fontSize: '0.85rem' }}>推奨サイズにリサイズ（1600x1600px）</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={imageSettings.optimize}
                onChange={(e) => setImageSettings(prev => ({ ...prev, optimize: e.target.checked }))}
                style={{ marginRight: '0.5rem' }}
              />
              <span style={{ fontSize: '0.85rem' }}>品質最適化（ファイルサイズ削減）</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={imageSettings.watermark}
                onChange={(e) => setImageSettings(prev => ({ ...prev, watermark: e.target.checked }))}
                style={{ marginRight: '0.5rem' }}
              />
              <span style={{ fontSize: '0.85rem' }}>ウォーターマーク追加</span>
            </label>
            
            {/* 🔥 Watermarkプレビュー */}
            {imageSettings.watermark && selectedImages.length > 0 && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                <h6 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#495057' }}>
                  <i className="fas fa-eye"></i> ウォーターマークプレビュー
                </h6>
                <div style={{ position: 'relative', maxWidth: '200px', margin: '0 auto' }}>
                  <img 
                    src={availableImages.find(img => img.id === selectedImages[0])?.url || ''} 
                    alt="プレビュー" 
                    style={{ width: '100%', height: 'auto', borderRadius: '6px' }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#495057',
                    border: '1px solid rgba(0,0,0,0.1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    © N3 Store
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6c757d', textAlign: 'center' }}>
                  ウォーターマークは右下に自動追加されます
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#e3f2fd', borderRadius: '6px', fontSize: '0.8rem', color: '#1976d2' }}>
              <i className="fas fa-info-circle"></i> 
              <strong> 注意:</strong> 画像処理は出品時に自動実行されます。元画像は保持されます。
            </div>
          </div>

          {/* 画像アップロード */}
          <div style={{ marginTop: '1rem', padding: '1rem', border: '2px dashed #dee2e6', borderRadius: '8px', textAlign: 'center' }}>
            <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2rem', color: '#6c757d', marginBottom: '0.5rem', display: 'block' }}></i>
            <p style={{ margin: '0.5rem 0', fontSize: '0.85rem', color: '#6c757d' }}>追加画像をアップロード</p>
            <input 
              type="file" 
              id="additional-images" 
              multiple 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleAdditionalImages}
            />
            <button 
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => document.getElementById('additional-images')?.click()}
              style={{ fontSize: '0.85rem' }}
            >
              <i className="fas fa-plus"></i> ファイルを選択
            </button>
          </div>
          
          {/* 保存ボタン */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #dee2e6', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className={`${styles.btn} ${styles.btnSuccess}`}
              onClick={handleSave}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <i className="fas fa-save"></i> 画像選択を保存
            </button>
          </div>
        </div>
      </div>

      {/* 選択数のフィードバック */}
      <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem', color: '#6c757d' }}>
        {selectedImages.length === 0 && '画像を選択してください'}
        {selectedImages.length > 0 && selectedImages.length < maxImages && `あと${maxImages - selectedImages.length}枚選択できます`}
        {selectedImages.length === maxImages && `✓ ${marketplace.toUpperCase()}の最大枚数を選択しました`}
      </div>
    </div>
  );
}
