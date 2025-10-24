'use client';

import { useState, useEffect } from 'react';
import styles from '../../FullFeaturedModal.module.css';
import type { Product } from '@/types/product';

export interface TabImagesProps {
  product: Product | null;
  maxImages: number;
  marketplace: string;
  onChange?: (field: string, value: any) => void;
}

export function TabImages({ product, maxImages, marketplace, onChange }: TabImagesProps) {
  // 画像URLリストを取得（scraped_dataまたはlisting_dataから）
  const initialImages =
    product?.scraped_data?.image_urls ||
    product?.listing_data?.image_urls ||
    [];

  const [imageUrls, setImageUrls] = useState<string[]>(
    Array.isArray(initialImages) ? initialImages : []
  );

  // 親コンポーネントに変更を通知
  useEffect(() => {
    if (onChange && imageUrls.length > 0) {
      onChange('images', imageUrls);
    }
  }, [imageUrls, onChange]);

  // 画像を削除
  const handleDelete = (index: number) => {
    const confirm = window.confirm('この画像を削除しますか？');
    if (!confirm) return;

    const newImages = imageUrls.filter((_, i) => i !== index);
    setImageUrls(newImages);
  };

  // 画像を上に移動
  const moveUp = (index: number) => {
    if (index === 0) return; // 既に一番上

    const newImages = [...imageUrls];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    setImageUrls(newImages);
  };

  // 画像を下に移動
  const moveDown = (index: number) => {
    if (index === imageUrls.length - 1) return; // 既に一番下

    const newImages = [...imageUrls];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    setImageUrls(newImages);
  };

  // 画像を追加
  const handleAddImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    alert(`${files.length}枚の画像を選択しました（アップロード機能は実装中）`);
    // TODO: 画像アップロード機能の実装
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        <i className="fas fa-images"></i> 画像管理・順序設定
      </h3>
      <div style={{
        marginBottom: '1rem',
        padding: '0.75rem',
        background: '#e3f2fd',
        borderRadius: '6px',
        fontSize: '0.85rem',
        color: '#1976d2',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <i className="fas fa-info-circle"></i>
        <div>
          <strong>{marketplace.toUpperCase()}</strong> は最大 <strong>{maxImages}枚</strong> まで画像を選択できます。
          現在: <strong>{imageUrls.length}枚</strong>
          {imageUrls.length > maxImages && (
            <span style={{ color: '#d32f2f', marginLeft: '0.5rem' }}>
              （{imageUrls.length - maxImages}枚超過）
            </span>
          )}
        </div>
      </div>

      {/* 画像一覧 */}
      {imageUrls.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: '#f8f9fa',
          borderRadius: '8px',
          color: '#6c757d'
        }}>
          <i className="fas fa-image" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block', opacity: 0.3 }}></i>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>画像がありません</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          {imageUrls.map((url, index) => (
            <div
              key={`${url}-${index}`}
              style={{
                position: 'relative',
                border: index === 0 ? '3px solid var(--ilm-primary)' : '2px solid #dee2e6',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              {/* 画像 */}
              <div style={{
                width: '100%',
                height: '200px',
                overflow: 'hidden',
                background: '#f8f9fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src={url}
                  alt={`商品画像 ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/no-image.png';
                  }}
                />
              </div>

              {/* バッジ：順序番号 */}
              <div style={{
                position: 'absolute',
                top: '0.5rem',
                left: '0.5rem',
                background: index === 0 ? 'var(--ilm-primary)' : 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '0.3rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}>
                #{index + 1}
              </div>

              {/* バッジ：メイン画像 */}
              {index === 0 && (
                <div style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: 'var(--ilm-success)',
                  color: 'white',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}>
                  <i className="fas fa-star"></i> メイン
                </div>
              )}

              {/* 警告：最大枚数超過 */}
              {index >= maxImages && (
                <div style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: '#d32f2f',
                  color: 'white',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}>
                  <i className="fas fa-exclamation-triangle"></i> 超過
                </div>
              )}

              {/* コントロールボタン */}
              <div style={{
                padding: '0.75rem',
                background: '#f8f9fa',
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'space-between'
              }}>
                {/* 移動ボタン */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className={styles.btn}
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.4rem 0.6rem',
                      background: index === 0 ? '#e0e0e0' : 'var(--ilm-primary)',
                      color: index === 0 ? '#999' : 'white',
                      cursor: index === 0 ? 'not-allowed' : 'pointer',
                      border: 'none',
                    }}
                    title="上に移動"
                  >
                    <i className="fas fa-arrow-up"></i>
                  </button>
                  <button
                    className={styles.btn}
                    onClick={() => moveDown(index)}
                    disabled={index === imageUrls.length - 1}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.4rem 0.6rem',
                      background: index === imageUrls.length - 1 ? '#e0e0e0' : 'var(--ilm-primary)',
                      color: index === imageUrls.length - 1 ? '#999' : 'white',
                      cursor: index === imageUrls.length - 1 ? 'not-allowed' : 'pointer',
                      border: 'none',
                    }}
                    title="下に移動"
                  >
                    <i className="fas fa-arrow-down"></i>
                  </button>
                </div>

                {/* 削除ボタン */}
                <button
                  className={styles.btn}
                  onClick={() => handleDelete(index)}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.4rem 0.8rem',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                  }}
                  title="削除"
                >
                  <i className="fas fa-trash"></i> 削除
                </button>
              </div>

              {/* URL表示（省略形） */}
              <div style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.7rem',
                color: '#6c757d',
                borderTop: '1px solid #dee2e6',
                background: 'white',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {url}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 画像アップロード */}
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        border: '2px dashed #dee2e6',
        borderRadius: '8px',
        textAlign: 'center',
        background: '#f8f9fa'
      }}>
        <i className="fas fa-cloud-upload-alt" style={{
          fontSize: '2.5rem',
          color: '#6c757d',
          marginBottom: '0.75rem',
          display: 'block'
        }}></i>
        <p style={{ margin: '0.5rem 0 1rem 0', fontSize: '0.9rem', color: '#495057' }}>
          追加画像をアップロード
        </p>
        <input
          type="file"
          id="additional-images"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleAddImages}
        />
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => document.getElementById('additional-images')?.click()}
          style={{ fontSize: '0.85rem' }}
        >
          <i className="fas fa-plus"></i> ファイルを選択
        </button>
        <div style={{
          marginTop: '0.75rem',
          fontSize: '0.75rem',
          color: '#6c757d'
        }}>
          ※ アップロード機能は実装中です
        </div>
      </div>

      {/* 使用状況サマリー */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: imageUrls.length > maxImages ? '#ffebee' : '#e8f5e9',
        borderRadius: '8px',
        border: imageUrls.length > maxImages ? '1px solid #ef5350' : '1px solid #66bb6a'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.9rem',
          color: imageUrls.length > maxImages ? '#c62828' : '#2e7d32',
          fontWeight: 600
        }}>
          <i className={`fas ${imageUrls.length > maxImages ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>
          <div>
            {imageUrls.length === 0 && '画像がありません'}
            {imageUrls.length > 0 && imageUrls.length <= maxImages && (
              `画像数: ${imageUrls.length}/${maxImages}枚 ${imageUrls.length < maxImages ? `（あと${maxImages - imageUrls.length}枚追加可能）` : '（最大数）'}`
            )}
            {imageUrls.length > maxImages && (
              `画像数: ${imageUrls.length}/${maxImages}枚 ⚠ ${imageUrls.length - maxImages}枚超過しています`
            )}
          </div>
        </div>
        {imageUrls.length > maxImages && (
          <div style={{
            marginTop: '0.5rem',
            fontSize: '0.8rem',
            color: '#d32f2f',
            paddingLeft: '2rem'
          }}>
            {maxImages}枚を超える画像は{marketplace.toUpperCase()}に出品できません。削除してください。
          </div>
        )}
      </div>

      {/* ヒント */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: '#fff3e0',
        borderRadius: '8px',
        fontSize: '0.85rem',
        color: '#e65100'
      }}>
        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
          <i className="fas fa-lightbulb"></i> 画像編集のヒント
        </div>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>1枚目の画像が商品のメイン画像として表示されます</li>
          <li>矢印ボタンで画像の順序を変更できます</li>
          <li>不要な画像は削除ボタンで削除できます</li>
          <li>変更は「保存して閉じる」ボタンで保存されます</li>
        </ul>
      </div>
    </div>
  );
}
