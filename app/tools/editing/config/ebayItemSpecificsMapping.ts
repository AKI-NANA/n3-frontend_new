// config/ebayItemSpecificsMapping.ts

/**
 * eBayカテゴリ別の必須項目マッピング
 * 主要カテゴリのItem Specificsを定義
 */

export interface ItemSpecificField {
  name: string
  label: string
  type: 'text' | 'select' | 'number'
  required: boolean
  options?: string[]
  placeholder?: string
  description?: string
}

export interface CategoryMapping {
  categoryId: string
  categoryName: string
  requiredFields: ItemSpecificField[]
  recommendedFields: ItemSpecificField[]
}

export const EBAY_CATEGORY_MAPPINGS: Record<string, CategoryMapping> = {
  // Trading Card Games (TCG)
  '183454': {
    categoryId: '183454',
    categoryName: 'CCG Individual Cards',
    requiredFields: [
      { name: 'Card Name', label: 'カード名', type: 'text', required: true, placeholder: 'Pikachu VMAX' },
      { name: 'Game', label: 'ゲーム', type: 'select', required: true, options: ['Pokémon', 'Magic: The Gathering', 'Yu-Gi-Oh!', 'Other'] },
      { name: 'Set', label: 'セット', type: 'text', required: true, placeholder: 'Fusion Strike' },
      { name: 'Card Type', label: 'カードタイプ', type: 'select', required: true, options: ['Pokémon', 'Trainer', 'Energy', 'Other'] },
      { name: 'Rarity', label: 'レアリティ', type: 'select', required: true, options: ['Common', 'Uncommon', 'Rare', 'Ultra Rare', 'Secret Rare', 'Promo'] }
    ],
    recommendedFields: [
      { name: 'Graded', label: 'グレーディング済み', type: 'select', required: false, options: ['Yes', 'No'] },
      { name: 'Professional Grader', label: 'グレーディング会社', type: 'select', required: false, options: ['PSA', 'BGS', 'CGC', 'Other', 'Ungraded'] },
      { name: 'Grade', label: 'グレード', type: 'text', required: false, placeholder: '10' },
      { name: 'Card Number', label: 'カード番号', type: 'text', required: false, placeholder: '123/264' },
      { name: 'Language', label: '言語', type: 'select', required: false, options: ['English', 'Japanese', 'Korean', 'Chinese', 'Other'] },
      { name: 'Finish', label: '仕上げ', type: 'select', required: false, options: ['Holo', 'Reverse Holo', 'Non-Holo', 'Full Art', 'Other'] }
    ]
  },

  // Video Games & Consoles
  '139973': {
    categoryId: '139973',
    categoryName: 'Video Games',
    requiredFields: [
      { name: 'Platform', label: 'プラットフォーム', type: 'select', required: true, options: ['Nintendo Switch', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X', 'PC', 'Other'] },
      { name: 'Game Name', label: 'ゲーム名', type: 'text', required: true, placeholder: 'The Legend of Zelda' },
      { name: 'Genre', label: 'ジャンル', type: 'select', required: true, options: ['Action', 'RPG', 'Adventure', 'Sports', 'Racing', 'Simulation', 'Other'] }
    ],
    recommendedFields: [
      { name: 'Region Code', label: 'リージョン', type: 'select', required: false, options: ['NTSC-U/C (US, Canada)', 'NTSC-J (Japan)', 'PAL', 'Region Free'] },
      { name: 'Publisher', label: 'パブリッシャー', type: 'text', required: false },
      { name: 'Release Year', label: '発売年', type: 'number', required: false },
      { name: 'Rating', label: 'レーティング', type: 'select', required: false, options: ['E (Everyone)', 'E10+', 'T (Teen)', 'M (Mature)', 'A (Adults Only)'] }
    ]
  },

  // Toys & Hobbies - Action Figures
  '246': {
    categoryId: '246',
    categoryName: 'Action Figures',
    requiredFields: [
      { name: 'Brand', label: 'ブランド', type: 'text', required: true, placeholder: 'Bandai' },
      { name: 'Character Family', label: 'キャラクターファミリー', type: 'text', required: true, placeholder: 'Dragon Ball' },
      { name: 'Type', label: 'タイプ', type: 'select', required: true, options: ['Action Figure', 'Model Kit', 'Statue', 'Other'] }
    ],
    recommendedFields: [
      { name: 'Character', label: 'キャラクター', type: 'text', required: false },
      { name: 'Scale', label: 'スケール', type: 'select', required: false, options: ['1:12', '1:10', '1:6', '1:4', 'Non-Scale'] },
      { name: 'Material', label: '素材', type: 'select', required: false, options: ['Plastic', 'PVC', 'ABS', 'Resin', 'Die-Cast', 'Other'] },
      { name: 'Year Manufactured', label: '製造年', type: 'number', required: false },
      { name: 'Packaging', label: 'パッケージ', type: 'select', required: false, options: ['Original (Unopened)', 'Original (Opened)', 'No Packaging'] }
    ]
  },

  // Clothing, Shoes & Accessories
  '11450': {
    categoryId: '11450',
    categoryName: 'Clothing, Shoes & Accessories',
    requiredFields: [
      { name: 'Brand', label: 'ブランド', type: 'text', required: true, placeholder: 'Nike' },
      { name: 'Type', label: 'タイプ', type: 'select', required: true, options: ['Shirt', 'Pants', 'Shoes', 'Accessories', 'Other'] },
      { name: 'Size', label: 'サイズ', type: 'text', required: true, placeholder: 'M' }
    ],
    recommendedFields: [
      { name: 'Size Type', label: 'サイズタイプ', type: 'select', required: false, options: ['Regular', 'Petite', 'Plus', 'Big & Tall'] },
      { name: 'Color', label: 'カラー', type: 'text', required: false },
      { name: 'Material', label: '素材', type: 'text', required: false },
      { name: 'Style', label: 'スタイル', type: 'text', required: false },
      { name: 'Vintage', label: 'ヴィンテージ', type: 'select', required: false, options: ['Yes', 'No'] }
    ]
  },

  // Electronics - Cell Phones & Smartphones
  '9355': {
    categoryId: '9355',
    categoryName: 'Cell Phones & Smartphones',
    requiredFields: [
      { name: 'Brand', label: 'ブランド', type: 'select', required: true, options: ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Other'] },
      { name: 'Model', label: 'モデル', type: 'text', required: true, placeholder: 'iPhone 14 Pro' },
      { name: 'Storage Capacity', label: 'ストレージ', type: 'select', required: true, options: ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB'] }
    ],
    recommendedFields: [
      { name: 'Processor', label: 'プロセッサー', type: 'text', required: false },
      { name: 'Camera Resolution', label: 'カメラ解像度', type: 'text', required: false },
      { name: 'Screen Size', label: '画面サイズ', type: 'text', required: false },
      { name: 'Color', label: 'カラー', type: 'text', required: false },
      { name: 'Lock Status', label: 'ロック状態', type: 'select', required: false, options: ['Unlocked', 'AT&T', 'Verizon', 'T-Mobile', 'Other'] }
    ]
  },

  // Books
  '267': {
    categoryId: '267',
    categoryName: 'Books',
    requiredFields: [
      { name: 'Book Title', label: '書籍タイトル', type: 'text', required: true },
      { name: 'Author', label: '著者', type: 'text', required: true },
      { name: 'Format', label: 'フォーマット', type: 'select', required: true, options: ['Hardcover', 'Paperback', 'Mass Market', 'Library Binding'] }
    ],
    recommendedFields: [
      { name: 'Language', label: '言語', type: 'select', required: false, options: ['English', 'Japanese', 'Spanish', 'French', 'German', 'Other'] },
      { name: 'Publication Year', label: '出版年', type: 'number', required: false },
      { name: 'Publisher', label: '出版社', type: 'text', required: false },
      { name: 'ISBN', label: 'ISBN', type: 'text', required: false },
      { name: 'Number of Pages', label: 'ページ数', type: 'number', required: false }
    ]
  },

  // デフォルト（カテゴリが不明な場合）
  'default': {
    categoryId: 'default',
    categoryName: 'General',
    requiredFields: [
      { name: 'Brand', label: 'ブランド', type: 'text', required: true, placeholder: 'ブランド名を入力' },
      { name: 'Type', label: 'タイプ', type: 'text', required: true, placeholder: '商品タイプを入力' },
      { name: 'Model', label: 'モデル', type: 'text', required: false, placeholder: 'モデル名・型番' }
    ],
    recommendedFields: [
      { name: 'Color', label: 'カラー', type: 'text', required: false },
      { name: 'Size', label: 'サイズ', type: 'text', required: false },
      { name: 'Material', label: '素材', type: 'text', required: false }
    ]
  }
}

/**
 * カテゴリIDから対応するマッピングを取得
 */
export function getCategoryMapping(categoryId: string | null | undefined): CategoryMapping {
  if (!categoryId) {
    return EBAY_CATEGORY_MAPPINGS['default']
  }

  return EBAY_CATEGORY_MAPPINGS[categoryId] || EBAY_CATEGORY_MAPPINGS['default']
}

/**
 * Item SpecificsをフォームデータにマージHere's the continuation of the implementation:

```typescript
 * Item Specificsをフォームデータにマージ
 */
export function mergeItemSpecificsToFormData(
  itemSpecifics: Record<string, string> | undefined,
  categoryMapping: CategoryMapping
): Record<string, string> {
  const formData: Record<string, string> = {}

  if (!itemSpecifics) {
    return formData
  }

  // 必須項目を優先的にマージ
  categoryMapping.requiredFields.forEach(field => {
    if (itemSpecifics[field.name]) {
      formData[field.name] = itemSpecifics[field.name]
    }
  })

  // 推奨項目をマージ
  categoryMapping.recommendedFields.forEach(field => {
    if (itemSpecifics[field.name]) {
      formData[field.name] = itemSpecifics[field.name]
    }
  })

  // その他の項目もマージ
  Object.entries(itemSpecifics).forEach(([key, value]) => {
    if (!formData[key] && value) {
      formData[key] = value
    }
  })

  return formData
}
