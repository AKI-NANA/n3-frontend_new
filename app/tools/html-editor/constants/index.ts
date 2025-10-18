// HTMLテンプレートエディタの定数定義

import { Language, Category, Variable } from '../types'

// 対応言語（eBay主要マーケット）
export const LANGUAGES: Language[] = [
  { code: 'en_US', name: 'English (US)', flag: '🇺🇸', ebay: 'ebay.com' },
  { code: 'en_GB', name: 'English (UK)', flag: '🇬🇧', ebay: 'ebay.co.uk' },
  { code: 'en_AU', name: 'English (AU)', flag: '🇦🇺', ebay: 'ebay.com.au' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', ebay: 'ebay.de' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', ebay: 'ebay.fr' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', ebay: 'ebay.it' },
  { code: 'es', name: 'Español', flag: '🇪🇸', ebay: 'ebay.es' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', ebay: 'ebay.co.jp' }
]

// カテゴリ
export const CATEGORIES: Category[] = [
  { value: 'general', label: '汎用' },
  { value: 'electronics', label: 'エレクトロニクス' },
  { value: 'fashion', label: 'ファッション' },
  { value: 'collectibles', label: 'コレクタブル' }
]

// 変数グループ
export const VARIABLES: Record<string, Variable[]> = {
  basic: [
    { tag: '{{TITLE}}', label: 'タイトル' },
    { tag: '{{PRICE}}', label: '価格' },
    { tag: '{{BRAND}}', label: 'ブランド' },
    { tag: '{{CONDITION}}', label: 'コンディション' }
  ],
  description: [
    { tag: '{{DESCRIPTION}}', label: '説明' },
    { tag: '{{FEATURES}}', label: '特徴' },
    { tag: '{{SPECIFICATIONS}}', label: '仕様' }
  ],
  policy: [
    { tag: '{{SHIPPING_INFO}}', label: '配送情報' },
    { tag: '{{RETURN_POLICY}}', label: '返品ポリシー' },
    { tag: '{{WARRANTY}}', label: '保証' }
  ]
}

// クイックテンプレート
export const QUICK_TEMPLATES = {
  basic: `<div class="product-description">
    <h2>${'{{TITLE}}'}</h2>
    <div class="price">\${'{{PRICE}}'}</div>
    <div class="brand">Brand: ${'{{BRAND}}'}</div>
    <div class="condition">Condition: ${'{{CONDITION}}'}</div>
    <div class="description">${'{{DESCRIPTION}}'}</div>
    <div class="shipping">${'{{SHIPPING_INFO}}'}</div>
</div>`,
  premium: `<div class="premium-product" style="max-width: 800px; margin: 0 auto; padding: 20px;">
    <div class="header" style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px;">
        <h1>${'{{TITLE}}'}</h1>
        <div class="price" style="font-size: 1.5rem; font-weight: bold; margin-top: 10px;">\${'{{PRICE}}'}</div>
    </div>
    <div class="details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0;">
        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h3>Brand</h3>
            <p>${'{{BRAND}}'}</p>
        </div>
        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h3>Condition</h3>
            <p>${'{{CONDITION}}'}</p>
        </div>
    </div>
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Description</h3>
        <p>${'{{DESCRIPTION}}'}</p>
    </div>
</div>`
}
