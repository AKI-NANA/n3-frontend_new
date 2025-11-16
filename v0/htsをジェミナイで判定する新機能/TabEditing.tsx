// /components/ProductModal/components/Tabs/TabEditing.tsx

'use client';

import React, { useState, useEffect } from 'react';
import styles from '../../FullFeaturedModal.module.css'; // CSS Modulesをインポート
import { Product } from '@/types/product';
import { HtsCandidate } from '@/lib/tariffService'; // HtsCandidate 型をインポート

// HTS候補を取得するためのAPIルート
const HTS_LOOKUP_API_URL = '/api/products/hts-lookup';

interface TabEditingProps {
  product: Product;
  onUpdate: (updates: Partial<Product>) => void;
}

const TabEditing: React.FC<TabEditingProps> = ({ product, onUpdate }) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    hts_code: product.hts_code,
    origin_country: product.origin_country,
    material: product.material,
    // product の既存フィールドも必要に応じて初期化
    title: product.title,
    english_title: product.english_title,
    description: product.description,
    english_description: product.english_description,
    // ...
  });
  const [htsCandidates, setHtsCandidates] = useState<HtsCandidate[]>([]);
  const [isLoadingHts, setIsLoadingHts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // formData の変更を親コンポーネントに伝達
  useEffect(() => {
    // hts_code, origin_country, material だけでなく、編集可能な全フィールドを渡す
    onUpdate(formData);
  }, [formData, onUpdate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleHtsLookup = async () => {
    setIsLoadingHts(true);
    setError(null);
    setHtsCandidates([]);

    const titleToUse = formData.title || product.title;

    if (!titleToUse) {
        setError('商品タイトルがありません。');
        setIsLoadingHts(false);
        return;
    }

    try {
      const response = await fetch(HTS_LOOKUP_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productTitle: titleToUse,
          material: formData.material,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'HTS候補の取得に失敗しました。');
      }

      const data: HtsCandidate[] = await response.json();
      setHtsCandidates(data);
      
      // 候補が一つでもあれば、最初のものをデフォルトとして設定
      if (data.length > 0 && !formData.hts_code) {
        setFormData(prev => ({ ...prev, hts_code: data[0].hts_number }));
      }

    } catch (err: any) {
      setError(err.message || 'HTS推論中に予期せぬエラーが発生しました。');
    } finally {
      setIsLoadingHts(false);
    }
  };

  return (
    <div className={styles.dataSection}>
      <div className={styles.sectionHeader}>商品詳細・通関情報</div>
      {/* 基本的な編集フィールド（例としてタイトル） */}
      <div className={styles.formGrid} style={{ padding: '1rem' }}>
        <div>
          <label>タイトル (日本語)</label>
          <input
            type="text"
            name="title"
            className={styles.formInput}
            value={formData.title || ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>タイトル (英語)</label>
          <input
            type="text"
            name="english_title"
            className={styles.formInput}
            value={formData.english_title || ''}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className={styles.sectionHeader}>通関情報</div>
      <div className={styles.formGrid} style={{ padding: '1rem' }}>
        {/* 1. 素材 (Material) */}
        <div>
          <label>素材・構成 (Material)</label>
          <input
            type="text"
            name="material"
            className={styles.formInput}
            value={formData.material || ''}
            onChange={handleChange}
            placeholder="例: コットン100%, アルミニウム合金"
          />
        </div>

        {/* 2. 原産国 (Origin Country) */}
        <div>
          <label>原産国 (Origin Country)</label>
          <input
            type="text"
            name="origin_country"
            className={styles.formInput}
            value={formData.origin_country || ''}
            onChange={handleChange}
            placeholder="例: US, China, JP"
          />
        </div>

        {/* 3. HTSコード (Customs Code) */}
        <div style={{ gridColumn: '1 / span 2' }}>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            HTSコード (税関コード)
            <button
              onClick={handleHtsLookup}
              // styles.formButton が定義されていない可能性を考慮し、インラインスタイルを一部追加
              className={styles.formInput} 
              style={{ marginLeft: '10px', padding: '5px 10px', cursor: 'pointer', width: 'auto' }}
              disabled={isLoadingHts}
            >
              {isLoadingHts ? '推論中...' : 'HTS候補を推論'}
            </button>
          </label>
          {error && <p style={{ color: 'red', fontSize: '0.8rem', marginBottom: '0.5rem' }}>エラー: {error}</p>}
          <input
            type="text"
            name="hts_code"
            className={styles.formInput}
            value={formData.hts_code || ''}
            onChange={handleChange}
            placeholder="例: 9504.40.0000 (手動入力または以下から選択)"
          />
        </div>
      </div>

      {/* 4. HTS候補リスト */}
      {htsCandidates.length > 0 && (
        <div style={{ marginTop: '1rem', padding: '1rem' }}>
          <div className={styles.sectionHeader} style={{ marginBottom: '1rem' }}>HTS候補リスト (上位 {htsCandidates.length} 件)</div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
            {htsCandidates.map((candidate, index) => (
              <div
                key={index}
                style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', backgroundColor: candidate.hts_number === formData.hts_code ? '#e6f0ff' : '#ffffff' }}
                onClick={() => setFormData(prev => ({ ...prev, hts_code: candidate.hts_number }))}
              >
                <strong>{candidate.hts_number}</strong>
                <p style={{ margin: '0', fontSize: '0.85rem', color: '#555' }}>
                  4桁: {candidate.heading_description.substring(0, 80)}...<br/>
                  6桁: {candidate.subheading_description.substring(0, 80)}...<br/>
                  詳細: {candidate.detail_description.substring(0, 80)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TabEditing;