'use client';

/**
 * HTMLテンプレート生成ユーティリティ
 */

import type { MarketplaceType } from '@/types/marketplace';

export interface TemplateData {
  title: string;
  condition: string;
  category: string;
  price?: number;
}

/**
 * eBay用HTMLテンプレート
 */
export function generateEbayTemplate(data: TemplateData): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
    <h2 style="color: #0064d2; border-bottom: 3px solid #0064d2; padding-bottom: 10px;">
        ${data.title}
    </h2>
    
    <div style="background: #f8f9fa; padding: 20px; margin: 15px 0; border-left: 5px solid #0064d2;">
        <h3 style="margin-top: 0;">Product Details</h3>
        <ul style="margin: 0;">
            <li><strong>Condition:</strong> ${data.condition}</li>
            <li><strong>Category:</strong> ${data.category}</li>
            <li><strong>Origin:</strong> Japan</li>
            <li><strong>Language:</strong> Japanese</li>
        </ul>
    </div>

    <div style="background: #e3f2fd; padding: 20px; margin: 15px 0; border-radius: 8px;">
        <h3 style="margin-top: 0;">Shipping Information</h3>
        <p>Items are carefully protected with sleeves and top loaders, shipped with tracking.</p>
        <p>Standard delivery: 7-14 business days</p>
    </div>

    <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f0f0; border-radius: 8px;">
        <p style="margin: 0; color: #666; font-size: 16px;">
            <strong>Questions? Feel free to contact us!</strong>
        </p>
    </div>
</div>`;
}

/**
 * Shopee用HTMLテンプレート
 */
export function generateShopeeTemplate(data: TemplateData): string {
  return `<div style="font-family: 'Segoe UI', sans-serif;">
    <h2 style="color: #ee4d2d;">🔥 ${data.title} 🔥</h2>
    
    <div style="background: linear-gradient(135deg, #ff6b6b, #ee4d2d); color: white; padding: 15px; border-radius: 10px; margin: 10px 0;">
        <h3>⭐ Product Highlights ⭐</h3>
        <p>✅ Authentic Japanese Product</p>
        <p>✅ Carefully Packaged</p>
        <p>✅ Fast Shipping</p>
    </div>
    
    <p style="font-size: 18px; color: #ee4d2d; font-weight: bold;">
        💰 Special Price: Only Today! 💰
    </p>
</div>`;
}

/**
 * Amazon用HTMLテンプレート
 */
export function generateAmazonTemplate(data: TemplateData): string {
  return `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h3>${data.title}</h3>
    
    <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0;">
        <h4>Product Features:</h4>
        <ul>
            <li>High quality ${data.category}</li>
            <li>Condition: ${data.condition}</li>
            <li>Authentic Japanese product</li>
            <li>Perfect for collectors</li>
        </ul>
    </div>
    
    <p><strong>Shipping:</strong> Fast and secure packaging with tracking.</p>
</div>`;
}

/**
 * Coupang用HTMLテンプレート
 */
export function generateCoupangTemplate(data: TemplateData): string {
  return `<div style="font-family: 'Noto Sans KR', sans-serif;">
    <h2 style="color: #ff6600;">${data.title}</h2>
    
    <div style="background: #fff3e0; padding: 15px; margin: 10px 0; border-radius: 8px;">
        <h3>📦 상품 정보</h3>
        <ul>
            <li>상태: ${data.condition}</li>
            <li>카테고리: ${data.category}</li>
            <li>원산지: 일본</li>
        </ul>
    </div>
    
    <p style="color: #ff6600; font-weight: bold;">🚚 빠른 배송 보장</p>
</div>`;
}

/**
 * Shopify用HTMLテンプレート
 */
export function generateShopifyTemplate(data: TemplateData): string {
  return `<div style="font-family: 'Helvetica Neue', Arial, sans-serif;">
    <h2 style="color: #95bf47;">${data.title}</h2>
    
    <div style="background: #f8fdf4; padding: 20px; margin: 15px 0; border-radius: 8px;">
        <h3 style="color: #95bf47;">🌟 Why Choose This Product?</h3>
        <p>Premium quality ${data.category} from Japan</p>
        <p>Condition: ${data.condition}</p>
        <p>Carefully packaged and shipped worldwide</p>
    </div>
</div>`;
}

/**
 * マーケットプレイス別テンプレート生成
 */
export function generateTemplate(
  marketplace: MarketplaceType,
  data: TemplateData
): string {
  const generators: Partial<Record<MarketplaceType, (data: TemplateData) => string>> = {
    ebay: generateEbayTemplate,
    shopee: generateShopeeTemplate,
    'amazon-global': generateAmazonTemplate,
    'amazon-jp': generateAmazonTemplate,
    coupang: generateCoupangTemplate,
    shopify: generateShopifyTemplate,
  };

  const generator = generators[marketplace] || generateEbayTemplate;
  return generator(data);
}

/**
 * 共通要素HTML
 */
export const COMMON_ELEMENTS = `
<div style="background: #fffbf0; border: 1px solid #ffd700; padding: 15px; margin: 10px 0; border-radius: 5px;">
    <h4 style="color: #ff8c00; margin-top: 0;">🎯 Why Choose Us?</h4>
    <ul style="margin: 0;">
        <li>📦 Professional packaging</li>
        <li>🚚 Fast worldwide shipping</li>
        <li>⭐ 100% authentic products</li>
        <li>💬 Excellent customer service</li>
    </ul>
</div>`;

/**
 * テーブルHTML生成
 */
export function generateTableHtml(data: TemplateData): string {
  return `
<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
    <tr>
        <th style="border: 1px solid #ddd; padding: 8px; background: #f2f2f2;">項目</th>
        <th style="border: 1px solid #ddd; padding: 8px; background: #f2f2f2;">詳細</th>
    </tr>
    <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">状態</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${data.condition}</td>
    </tr>
    <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">カテゴリ</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${data.category}</td>
    </tr>
</table>`;
}

/**
 * 画像タグHTML生成
 */
export function generateImageTag(imageUrl: string): string {
  return `<img src="${imageUrl}" alt="商品画像" style="max-width: 800px; width: 100%; height: auto; margin: 10px 0;">`;
}
