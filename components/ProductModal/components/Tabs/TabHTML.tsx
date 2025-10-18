'use client';

import { useState, useEffect } from 'react';
import styles from '../../FullFeaturedModal.module.css';
import type { Product } from '@/types/product';

export interface TabHTMLProps {
  product: Product | null;
  marketplace: string;
  marketplaceName: string;
}

// マーケットプレイスから国コードを取得
function marketplaceToCountry(marketplace: string): string {
  const mapping: { [key: string]: string } = {
    'ebay.com': 'US',
    'ebay.co.uk': 'UK',
    'ebay.de': 'DE',
    'ebay.fr': 'FR',
    'ebay.it': 'IT',
    'ebay.es': 'ES',
    'ebay.com.au': 'AU',
    'ebay.ca': 'CA',
  };
  return mapping[marketplace] || 'US';
}

// プレースホルダーを商品データで置換
function replacePlaceholders(template: string, productData: any): string {
  const listingData = productData?.listing_data || {};
  
  return template
    .replace(/\{\{TITLE\}\}/g, productData?.english_title || productData?.title || '')
    .replace(/\{\{CONDITION\}\}/g, listingData.condition || 'Used')
    .replace(/\{\{LANGUAGE\}\}/g, 'Japanese')
    .replace(/\{\{RARITY\}\}/g, 'Rare')
    .replace(/\{\{DESCRIPTION\}\}/g, productData?.description || productData?.english_title || '');
}

export function TabHTML({ product, marketplace, marketplaceName }: TabHTMLProps) {
  const htmlTemplates = (product as any)?.html_templates || {};
  const defaultCountry = htmlTemplates.default_country || 'US';
  const countryCode = marketplaceToCountry(marketplace);
  
  // デフォルト国のテンプレートを取得
  const defaultTemplate = htmlTemplates.templates?.[defaultCountry]?.html || '';
  
  // 現在のマーケットプレイス用のテンプレートを取得
  const currentTemplate = htmlTemplates.templates?.[countryCode]?.html || defaultTemplate;
  
  // プレースホルダーを置換
  const [htmlContent, setHtmlContent] = useState('');
  
  useEffect(() => {
    if (currentTemplate) {
      const replaced = replacePlaceholders(currentTemplate, product);
      setHtmlContent(replaced);
    }
  }, [currentTemplate, product]);
  
  const validateHtml = () => {
    const forbiddenTags = ['<script', '<iframe', '<form', '<object', '<embed'];
    const forbiddenAttrs = ['onclick', 'onload', 'onerror', 'onmouseover'];
    
    const errors: string[] = [];
    
    forbiddenTags.forEach(tag => {
      if (htmlContent.toLowerCase().includes(tag)) {
        errors.push(`禁止タグが含まれています: ${tag}`);
      }
    });
    
    forbiddenAttrs.forEach(attr => {
      if (htmlContent.toLowerCase().includes(attr)) {
        errors.push(`禁止属性が含まれています: ${attr}`);
      }
    });
    
    if (errors.length === 0) {
      alert('✓ バリデーション成功\n\nHTMLに問題はありません。');
    } else {
      alert('✗ バリデーションエラー\n\n' + errors.join('\n'));
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(htmlContent).then(() => {
      alert('✓ クリップボードにコピーしました');
    });
  };
  
  const formatHtml = () => {
    let formatted = htmlContent;
    formatted = formatted.replace(/></g, '>\n<');
    setHtmlContent(formatted);
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        <i className="fas fa-code"></i> <span style={{ color: 'var(--ilm-primary)' }}>{marketplaceName}</span> 商品説明HTML
      </h3>
      
      {/* 情報バー */}
      <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '6px' }}>
        <div style={{ fontSize: '0.85rem', color: '#1565c0' }}>
          <strong>📍 表示中:</strong> {countryCode}用テンプレート（{htmlTemplates.templates?.[countryCode] ? 'カスタム' : 'デフォルト'}）
          {defaultCountry !== countryCode && (
            <span style={{ marginLeft: '1rem' }}>
              <strong>デフォルト国:</strong> {defaultCountry}
            </span>
          )}
        </div>
      </div>
      
      {/* ツールバー */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button 
          className={styles.btn}
          style={{ background: '#ffc107', color: '#000' }}
          onClick={validateHtml}
        >
          <i className="fas fa-check"></i> バリデート
        </button>
        <button 
          className={`${styles.btn} ${styles.btnSuccess}`}
          onClick={copyToClipboard}
        >
          <i className="fas fa-copy"></i> コピー
        </button>
        <button 
          className={styles.btn}
          onClick={formatHtml}
        >
          <i className="fas fa-align-left"></i> フォーマット
        </button>
      </div>
      
      {/* エディタとプレビュー */}
      <div className={styles.htmlEditorContainer}>
        {/* エディタペイン */}
        <div className={styles.editorPane}>
          <div className={styles.editorHeader}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              <i className="fas fa-code"></i> HTMLソース
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <textarea
              className={styles.codeEditor}
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="HTMLコードをここに入力..."
              readOnly
            />
          </div>
        </div>
        
        {/* プレビューペイン */}
        <div className={styles.editorPane}>
          <div className={styles.editorHeader}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              <i className="fas fa-eye"></i> プレビュー
            </span>
          </div>
          <div 
            className={styles.previewPane}
            dangerouslySetInnerHTML={{ __html: htmlContent || '<p style="color: #6c757d; text-align: center;">HTMLテンプレートが設定されていません</p>' }}
          />
        </div>
      </div>
      
      {/* ヒント */}
      <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '6px' }}>
        <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>
          <i className="fas fa-lightbulb"></i> HTMLテンプレートについて
        </h5>
        <ul style={{ fontSize: '0.85rem', color: '#6c757d', margin: 0, paddingLeft: '1.5rem', lineHeight: 1.6 }}>
          <li>HTMLテンプレートは「HTMLエディタ」ツールで編集できます</li>
          <li>各国ごとにテンプレートが用意されており、自動的に適切なものが選択されます</li>
          <li>商品データ（タイトル、状態など）は自動的に差し込まれます</li>
          <li>デフォルト国のテンプレートは全ての国で使用されます</li>
        </ul>
      </div>
      
      {/* テンプレート編集リンク */}
      <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'white', border: '1px solid #dee2e6', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
            <i className="fas fa-info-circle"></i> テンプレートを編集するには「HTMLエディタ」ツールを使用してください
          </div>
          <a 
            href="/tools/html-editor"
            target="_blank"
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <i className="fas fa-external-link-alt"></i> HTMLエディタを開く
          </a>
        </div>
      </div>
    </div>
  );
}
