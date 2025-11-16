/**
 * HTS分類の日本語訳マスターデータ
 * "Other"などの汎用的な分類名を日本語化
 */

/**
 * 汎用的な英語表現の日本語訳
 */
export const COMMON_TRANSLATIONS: Record<string, string> = {
  'Other': 'その他',
  'Other than': '〜以外のもの',
  'Not elsewhere specified': '他に分類されないもの',
  'Not elsewhere included': '他に含まれないもの',
  'Nesoi': '他に分類されないもの', // Not elsewhere specified or included
  'Parts': '部分品',
  'Parts and accessories': '部分品及び附属品',
  'Other parts': 'その他の部分品',
  'Other accessories': 'その他の附属品',
}

/**
 * Chapter 17（砂糖）の詳細分類日本語訳
 */
export const CHAPTER_17_TRANSLATIONS: Record<string, string> = {
  'Beet sugar': 'ビート糖',
  'Cane sugar': 'さとうきび糖',
  'Other cane sugar': 'その他のさとうきび糖',
  'Containing peanuts or peanut products': 'ピーナッツ又はピーナッツ製品を含むもの',
  'Other': 'その他',
  'Chocolate milk drink': 'チョコレートミルク飲料',
  'Extracts, essences and concentrates': '抽出物、エッセンス及び濃縮物',
}

/**
 * Chapter 95（おもちゃ）の詳細分類日本語訳
 */
export const CHAPTER_95_TRANSLATIONS: Record<string, string> = {
  'Trading cards': 'トレーディングカード',
  'Playing cards': 'トランプ',
  'Video game consoles': 'ビデオゲーム機',
  'Other games': 'その他のゲーム',
  'Toys': 'がん具',
  'Other toys': 'その他のがん具',
  'Sports equipment': '運動用具',
  'Other': 'その他',
}

/**
 * 英語の説明文を日本語に翻訳
 */
export function translateHTSDescription(
  englishDesc: string,
  chapterCode?: string
): string {
  // 完全一致チェック
  if (COMMON_TRANSLATIONS[englishDesc]) {
    return COMMON_TRANSLATIONS[englishDesc]
  }

  // Chapter固有の翻訳
  if (chapterCode === '17' && CHAPTER_17_TRANSLATIONS[englishDesc]) {
    return CHAPTER_17_TRANSLATIONS[englishDesc]
  }

  if (chapterCode === '95' && CHAPTER_95_TRANSLATIONS[englishDesc]) {
    return CHAPTER_95_TRANSLATIONS[englishDesc]
  }

  // 部分一致チェック
  for (const [eng, jpn] of Object.entries(COMMON_TRANSLATIONS)) {
    if (englishDesc.includes(eng)) {
      return englishDesc.replace(eng, jpn)
    }
  }

  // 翻訳がない場合は元の英語を返す
  return englishDesc
}

/**
 * 説明文を「日本語 / 英語」形式で返す
 */
export function formatBilingualDescription(
  englishDesc: string,
  chapterCode?: string
): string {
  const japanese = translateHTSDescription(englishDesc, chapterCode)
  
  // 翻訳が見つかった場合のみバイリンガル表示
  if (japanese !== englishDesc) {
    return `${japanese} / ${englishDesc}`
  }
  
  // 翻訳がない場合は英語のみ
  return englishDesc
}
