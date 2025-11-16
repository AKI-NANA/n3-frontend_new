'use client';

import { useState, useEffect } from 'react';
import styles from '../../FullFeaturedModal.module.css';
import type { Product } from '@/types/product';
import { supabase } from '@/lib/supabase';

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
  
  console.log('🔄 Replacing placeholders with product data:', productData);
  
  // 🔥 conditionの英語化
  const conditionMap: Record<string, string> = {
    '新品': 'New',
    '未使用': 'New',
    '中古': 'Used',
    '中古品': 'Used',
    '開封済み': 'Open Box',
    'ジャンク': 'For Parts or Not Working'
  };
  
  const conditionEn = conditionMap[productData?.condition || ''] || 
                      listingData.condition_en || 
                      'Used';
  
  // 🔥 descriptionは英語版を優先、無い場合は自動生成
  let descriptionEn = productData?.english_description || productData?.description || ''
  
  // 商品説明が「なし」または空の場合、自動生成
  if (!descriptionEn || descriptionEn === 'なし' || descriptionEn.length < 10) {
    const parts = [
      productData?.english_title || productData?.title || 'Quality product',
      productData?.scraped_data?.brand ? `Brand: ${productData.scraped_data.brand}` : '',
      `Condition: ${conditionEn}`,
      'Authentic product imported from Japan.',
      'Ships worldwide with tracking number.',
      'Please check the photos carefully before purchasing.'
    ].filter(Boolean)
    
    descriptionEn = parts.join(' | ')
    console.log('🤖 商品説明を自動生成:', descriptionEn)
  }
  
  const replaced = template
    .replace(/\{\{TITLE\}\}/g, productData?.english_title || productData?.title || 'N/A')
    .replace(/\{\{CONDITION\}\}/g, conditionEn)
    .replace(/\{\{LANGUAGE\}\}/g, 'Japanese')
    .replace(/\{\{RARITY\}\}/g, 'Rare')
    .replace(/\{\{DESCRIPTION\}\}/g, descriptionEn)
    .replace(/\{\{PRICE\}\}/g, productData?.price_usd || productData?.price || '0')
    .replace(/\{\{BRAND\}\}/g, productData?.brand || 'N/A')
    .replace(/\{\{SHIPPING_INFO\}\}/g, listingData.shipping_info || 'Standard Shipping')
    .replace(/\{\{FEATURES\}\}/g, 'See description')
    .replace(/\{\{SPECIFICATIONS\}\}/g, 'See description')
    .replace(/\{\{NOTES\}\}/g, '')
    .replace(/\{\{SERIAL_NUMBER\}\}/g, productData?.sku || 'N/A')
    .replace(/\{\{SKU\}\}/g, productData?.sku || 'N/A')
    .replace(/\{\{RETURN_POLICY\}\}/g, '30 days money-back guarantee');
  
  console.log('✅ Placeholder replacement complete');
  return replaced;
}

export function TabHTML({ product, marketplace, marketplaceName }: TabHTMLProps) {
  const [htmlContent, setHtmlContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [generatedHtml, setGeneratedHtml] = useState<any>(null);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const countryCode = marketplaceToCountry(marketplace);

  // ステップ1: テンプレートを取得 & ステップ2: 個別HTMLを生成・保存
  useEffect(() => {
    const generateAndSaveHTML = async () => {
      if (!product?.id || !product?.sku) {
        console.log('⚠️ Product ID or SKU is missing');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError('');
        setSaveStatus('テンプレートを読み込み中...');

        console.log(`📝 Generating HTML for Product ID: ${product.id}, SKU: ${product.sku}, Marketplace: ${marketplace}`);

        // ✅ ステップ1: 既に生成済みのHTMLがあるか確認（products_master_idを使用）
        let existingHtml = null;
        try {
          const { data, error } = await supabase
            .from('product_html_generated')
            .select('*')
            .eq('products_master_id', product.id)
            .eq('marketplace', marketplace)
            .maybeSingle();
          
          if (data && !error) {
            existingHtml = data;
            console.log('✅ 既存の生成済みHTMLを取得 (products_master_id):', existingHtml);
          }
        } catch (err) {
          console.log('⚠️ 既存HTML取得時のエラー（初回時は正常）:', err);
        }

        if (existingHtml) {
          console.log('✅ 既存の生成済みHTMLを使用:', existingHtml);
          console.log('📄 HTML Content:', existingHtml.generated_html);
          setTemplate(existingHtml);
          setGeneratedHtml(existingHtml);
          setHtmlContent(existingHtml.generated_html || '');
          setSaveStatus('✓ 既存データを読み込みました');
          setIsLoading(false);
          return;
        }

        // ステップ2: テンプレートを取得してHTMLを生成
        setSaveStatus('テンプレートを検索中...');

        let template_data = null;
        
        // 方法1: デフォルトテンプレートを取得
        try {
          const { data, error } = await supabase
            .from('html_templates')
            .select('*')
            .eq('is_default_preview', true)
            .maybeSingle();
          
          if (data && !error) {
            template_data = data;
            console.log('✅ デフォルトテンプレートを取得:', template_data);
          }
        } catch (err) {
          console.log('⚠️ デフォルトテンプレート取得エラー:', err);
        }

        // 🔥 テンプレートが見つからない場合は基本HTMLを使用
        if (!template_data) {
          console.log('ℹ️ デフォルトテンプレートが存在しないため、基本HTMLを使用します');
          template_data = {
            id: 'default',
            name: 'Basic Template',
            html_content: `
              <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
                <h1 style="color: #333;">{{TITLE}}</h1>
                <div style="margin: 20px 0;">
                  <h2>Product Details</h2>
                  <p><strong>Condition:</strong> {{CONDITION}}</p>
                  <p><strong>SKU:</strong> {{SKU}}</p>
                </div>
                <div style="margin: 20px 0;">
                  <h2>Description</h2>
                  <p>{{DESCRIPTION}}</p>
                </div>
                <div style="margin: 20px 0;">
                  <h2>Shipping Information</h2>
                  <p>{{SHIPPING_INFO}}</p>
                </div>
              </div>
            `
          };
        }

        setTemplate(template_data);

        // ステップ3: プレースホルダーを置換して個別HTMLを生成
        setSaveStatus('HTMLを生成中...');
        const htmlToUse = template_data.html_content || template_data.languages?.en_US?.html_content || '<p>No content</p>';
        
        // 🔥 デバッグ: productオブジェクトの内容を確認
        console.log('🔍 productオブジェクトの中身:', {
          id: product.id,
          title: product.title,
          english_title: product.english_title,
          description: product.description,
          english_description: product.english_description,
          condition: product.condition,
          english_condition: product.english_condition
        });
        
        const generatedContent = replacePlaceholders(htmlToUse, product);
        
        // ✅ ステップ4: 生成したHTMLをDBに保存（products_master_idを使用）
        setSaveStatus('HTMLをデータベースに保存中...');
        
        const htmlRecord = {
          products_master_id: product.id,
          sku: product.sku,
          marketplace: marketplace,
          template_id: template_data.id || template_data.name,
          template_name: template_data.name,
          generated_html: generatedContent,
        };
        
        console.log('💾 Saving HTML record:', htmlRecord);
        
        const { data: savedHtml, error: saveError } = await supabase
          .from('product_html_generated')
          .insert(htmlRecord)
          .select()
          .maybeSingle();

        if (saveError) {
          console.warn('⚠️ 初回保存エラー（既存の可能性）:', saveError.message);
          
          // 既に存在する場合は更新
          const { data: updatedHtml, error: updateError } = await supabase
            .from('product_html_generated')
            .update({
              generated_html: generatedContent,
              template_id: template_data.id,
              template_name: template_data.name,
              updated_at: new Date().toISOString(),
            })
            .eq('products_master_id', product.id)
            .eq('marketplace', marketplace)
            .select()
            .maybeSingle();

          if (updateError) {
            throw updateError;
          }

          setGeneratedHtml(updatedHtml);
        } else {
          setGeneratedHtml(savedHtml);
        }

        setHtmlContent(generatedContent);
        setSaveStatus('✓ HTMLを生成・保存しました');
        console.log('✅ HTML生成完了:', generatedContent.substring(0, 100) + '...');

      } catch (err: unknown) {
        console.error('❌ HTML生成エラー:', err);
        
        if (err instanceof Error) {
          console.error('Error message:', err.message);
          console.error('Error stack:', err.stack);
          setError('HTML生成に失敗しました: ' + err.message);
        } else if (typeof err === 'object' && err !== null) {
          console.error('Error object:', JSON.stringify(err, null, 2));
          setError('HTML生成に失敗しました: ' + JSON.stringify(err));
        } else {
          console.error('Unknown error type:', typeof err);
          setError('HTML生成に失敗しました');
        }
        
        setSaveStatus('');
        
        setHtmlContent('<div style="padding: 20px; text-align: center; color: #d32f2f;">' +
          '<h3>⚠️ HTML生成エラー</h3>' +
          '<p>テンプレートの読み込みに失敗しました。</p>' +
          '<p style="font-size: 0.9em; color: #666;">商品データは正常に読み込まれています。</p>' +
          '</div>');
      } finally {
        setIsLoading(false);
      }
    };

    generateAndSaveHTML();
  }, [product, marketplace]);

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

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  const saveEditedHTML = async () => {
    if (!product?.id || !generatedHtml?.id) {
      alert('HTMLを保存できません');
      return;
    }

    try {
      setSaveStatus('編集内容を保存中...');

      const { error } = await supabase
        .from('product_html_generated')
        .update({
          generated_html: htmlContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', generatedHtml.id);

      if (error) throw error;

      alert('✓ 編集内容を保存しました');
      setSaveStatus('✓ 保存完了');
      setEditMode(false);
      
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error('❌ 保存エラー:', err);
      alert('保存に失敗しました');
      setSaveStatus('');
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        <i className="fas fa-code"></i> <span style={{ color: 'var(--ilm-primary)' }}>{marketplaceName}</span> 商品説明HTML
      </h3>
      
      {isLoading && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.85rem', color: '#856404' }}>
            <i className="fas fa-spinner fa-spin"></i> {saveStatus || 'HTML生成中...'}
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.85rem', color: '#721c24' }}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        </div>
      )}

      {saveStatus && !isLoading && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.85rem', color: '#155724' }}>
            {saveStatus}
          </div>
        </div>
      )}

      {!isLoading && template && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#e7f3ff', border: '1px solid #b3d9ff', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.85rem', color: '#004085' }}>
            <strong>📋 テンプレート:</strong> {template.name}
            {editMode && <span style={{ marginLeft: '1rem', fontWeight: 600, color: '#ff6600' }}>【編集モード】</span>}
            <br/>
            <strong>🎯 SKU:</strong> {product?.sku} | <strong>Master ID:</strong> {product?.id}
          </div>
        </div>
      )}
      
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button 
          className={styles.btn}
          style={{ background: '#ffc107', color: '#000' }}
          onClick={validateHtml}
          disabled={isLoading}
        >
          <i className="fas fa-check"></i> バリデート
        </button>
        <button 
          className={`${styles.btn} ${styles.btnSuccess}`}
          onClick={copyToClipboard}
          disabled={isLoading}
        >
          <i className="fas fa-copy"></i> コピー
        </button>
        <button 
          className={styles.btn}
          onClick={formatHtml}
          disabled={isLoading}
        >
          <i className="fas fa-align-left"></i> フォーマット
        </button>
        <button 
          className={`${styles.btn} ${editMode ? styles.btnDanger : styles.btnWarning}`}
          onClick={toggleEditMode}
          disabled={isLoading}
        >
          <i className={`fas fa-${editMode ? 'eye' : 'edit'}`}></i> 
          {editMode ? '表示に戻す' : '編集'}
        </button>
        {editMode && (
          <button 
            className={`${styles.btn} ${styles.btnSuccess}`}
            onClick={saveEditedHTML}
            disabled={isLoading}
          >
            <i className="fas fa-save"></i> 保存
          </button>
        )}
      </div>
      
      <div className={styles.htmlEditorContainer}>
        <div className={styles.editorPane}>
          <div className={styles.editorHeader}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              <i className="fas fa-code"></i> {editMode ? 'HTML編集' : 'HTMLソース'}
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <textarea
              className={styles.codeEditor}
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="HTMLコードをここに入力..."
              readOnly={!editMode}
              style={{
                background: editMode ? '#ffffff' : '#f8f9fa',
                color: editMode ? '#000' : '#6c757d',
              }}
            />
          </div>
        </div>
        
        <div className={styles.editorPane}>
          <div className={styles.editorHeader}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              <i className="fas fa-eye"></i> プレビュー
            </span>
          </div>
          <div 
            className={styles.previewPane}
            dangerouslySetInnerHTML={{ 
              __html: htmlContent || '<p style="color: #6c757d; text-align: center;">HTMLが生成されていません</p>' 
            }}
          />
        </div>
      </div>
      
      <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '6px' }}>
        <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>
          <i className="fas fa-lightbulb"></i> 仕組み
        </h5>
        <ul style={{ fontSize: '0.85rem', color: '#6c757d', margin: 0, paddingLeft: '1.5rem', lineHeight: 1.6 }}>
          <li>products_master_idでマッピング</li>
          <li>テンプレートをDBから検索</li>
          <li>{`{{TITLE}}`}などを商品データに置換</li>
          <li>生成したHTMLをproduct_html_generatedに保存</li>
          <li>編集で修正 → 保存でDB更新</li>
        </ul>
      </div>
    </div>
  );
}
