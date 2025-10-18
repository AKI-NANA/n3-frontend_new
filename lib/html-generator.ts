// HTML多言語生成関数

import { HTML_TRANSLATIONS, COUNTRIES, getLanguageCode } from './html-translations';

interface ProductData {
  title: string;
  condition: string;
  category?: string;
  rarity?: string;
  edition?: string;
}

export function generateHTMLForCountry(
  product: ProductData,
  countryCode: string
): string {
  const country = COUNTRIES.find(c => c.code === countryCode);
  if (!country) throw new Error(`Unknown country: ${countryCode}`);
  
  const lang = country.language;
  
  // タイトル翻訳（英語圏はそのまま、他は基本的な置換）
  const translatedTitle = translateTitle(product.title, lang);
  
  // キーワード翻訳
  const conditionLabel = HTML_TRANSLATIONS.condition[lang];
  const languageLabel = HTML_TRANSLATIONS.language[lang];
  const rarityLabel = HTML_TRANSLATIONS.rarity[lang];
  
  const conditionValue = translateCondition(product.condition, lang);
  const japaneseLabel = HTML_TRANSLATIONS.japanese[lang];
  const rareLabel = HTML_TRANSLATIONS.rare[lang];
  
  const productDetailsHeader = HTML_TRANSLATIONS.product_details[lang];
  const shippingInfoHeader = HTML_TRANSLATIONS.shipping_info[lang];
  const shippingText = HTML_TRANSLATIONS.shipping_text[lang];
  const contactText = HTML_TRANSLATIONS.contact[lang];
  
  return `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  <h2 style="color: #0064d2; border-bottom: 3px solid #0064d2; padding-bottom: 10px;">
    ${translatedTitle}
  </h2>
  
  <div style="background: #f8f9fa; padding: 20px; margin: 15px 0; border-left: 5px solid #0064d2;">
    <h3 style="margin-top: 0;">${productDetailsHeader}</h3>
    <ul style="margin: 0;">
      <li><strong>${conditionLabel}:</strong> ${conditionValue}</li>
      <li><strong>${languageLabel}:</strong> ${japaneseLabel}</li>
      <li><strong>${rarityLabel}:</strong> ${rareLabel}</li>
    </ul>
  </div>

  <div style="background: #e3f2fd; padding: 20px; margin: 15px 0; border-radius: 8px;">
    <h3 style="margin-top: 0;">${shippingInfoHeader}</h3>
    <p>${shippingText}</p>
  </div>

  <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f0f0; border-radius: 8px;">
    <p style="margin: 0; color: #666; font-size: 16px;">
      <strong>${contactText}</strong>
    </p>
  </div>
</div>`;
}

function translateTitle(title: string, lang: string): string {
  // 基本的な単語置換
  const replacements: { [key: string]: { [key: string]: string } } = {
    de: {
      'Pokemon Card': 'Pokemon-Karte',
      'Card': 'Karte',
    },
    fr: {
      'Pokemon Card': 'Carte Pokemon',
      'Card': 'Carte',
    },
    it: {
      'Pokemon Card': 'Carta Pokemon',
      'Card': 'Carta',
    },
    es: {
      'Pokemon Card': 'Carta Pokemon',
      'Card': 'Carta',
    },
  };
  
  let translated = title;
  if (replacements[lang]) {
    Object.entries(replacements[lang]).forEach(([from, to]) => {
      translated = translated.replace(new RegExp(from, 'gi'), to);
    });
  }
  
  return translated;
}

function translateCondition(condition: string, lang: string): string {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('used')) {
    return HTML_TRANSLATIONS.used[lang] || 'Used';
  }
  if (conditionLower.includes('new')) {
    return HTML_TRANSLATIONS.new[lang] || 'New';
  }
  
  return condition;
}

// 全8カ国のHTMLを一括生成
export function generateAllCountryHTMLs(product: ProductData): {
  default_country: string;
  generated_at: string;
  templates: {
    [country: string]: {
      html: string;
      language: string;
      country: string;
      marketplace: string;
      template_name: string;
      character_count: number;
      is_default: boolean;
      generated_at: string;
      updated_at: string;
    };
  };
} {
  const templates: any = {};
  const now = new Date().toISOString();
  
  COUNTRIES.forEach(country => {
    const html = generateHTMLForCountry(product, country.code);
    templates[country.code] = {
      html,
      language: country.language,
      country: country.code,
      marketplace: country.marketplace,
      template_name: `Standard ${country.code} Template`,
      character_count: html.length,
      is_default: country.code === 'US',
      generated_at: now,
      updated_at: now,
    };
  });
  
  return {
    default_country: 'US',
    generated_at: now,
    templates,
  };
}

// マーケットプレイスから国コードを取得
export function marketplaceToCountry(marketplace: string): string {
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

// 適切なHTMLを取得
export function getHTMLForMarketplace(
  product: any,
  targetMarketplace: string
): string {
  const htmlTemplates = product.html_templates || {};
  
  // マーケットプレイスから国コードを取得
  const countryCode = marketplaceToCountry(targetMarketplace);
  
  // 優先順位:
  // 1. 対象国のテンプレート
  // 2. デフォルト国のテンプレート
  // 3. listing_data.html_description
  
  return (
    htmlTemplates.templates?.[countryCode]?.html ||
    htmlTemplates.templates?.[htmlTemplates.default_country]?.html ||
    product.listing_data?.html_description ||
    ''
  );
}
