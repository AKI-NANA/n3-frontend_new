/**
 * 汎用商品検索キーワード最適化ライブラリ
 */

const IDENTIFIER_PATTERNS = {
  tcg_set_number: /\b\d{1,3}\/\d{1,3}\b/g,
  isbn13: /\b97[89][-\s]?\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?\d\b/g,
  isbn10: /\b\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?\d\b/g,
  model_number: /\b[A-Z]{2,}[-\s]?[A-Z0-9]{3,}\b/g,
  asin: /\bB0[A-Z0-9]{8}\b/g,
  upc_ean: /\b\d{12,13}\b/g,
  sku: /\b[A-Z0-9]{2,}\/[A-Z0-9]{1,}\b/g,
  year: /\b(?:19|20)\d{2}\b|'\d{2}\b/g,
  size: /\b(?:XXS|XS|S|M|L|XL|XXL|XXXL|\d+(?:\.\d+)?)\b/g,
  color_code: /#[0-9A-Fa-f]{6}\b|rgb\(\d{1,3},\s?\d{1,3},\s?\d{1,3}\)/g,
}

const NOISE_WORDS = new Set([
  'new', 'used', 'refurbished', 'like', 'mint', 'excellent', 'good', 'fair', 'poor',
  'free', 'shipping', 'fast', 'expedited', 'standard',
  'ebay', 'amazon', 'buy', 'sale', 'deal', 'offer',
  'rare', 'limited', 'special', 'edition', 'authentic', 'genuine', 'original',
  'and', 'or', 'with', 'for', 'the', 'a', 'an',
])

const HIGH_PRIORITY_PATTERNS = {
  brands: /\b(?:Apple|Samsung|Sony|Nike|Adidas|Canon|Nikon|Nintendo|PlayStation|Xbox)\b/gi,
  categories: /\b(?:iPhone|iPad|MacBook|Watch|AirPods|Galaxy|PS5|Xbox|Switch|Camera|Lens)\b/gi,
}

export interface SearchKeywordResult {
  essential: string[]
  important: string[]
  optional: string[]
  excluded: string[]
  identifiers: Array<{
    type: string
    value: string
    pattern: string
  }>
}

export function extractSearchKeywords(title: string): SearchKeywordResult {
  const result: SearchKeywordResult = {
    essential: [],
    important: [],
    optional: [],
    excluded: [],
    identifiers: []
  }

  for (const [patternName, pattern] of Object.entries(IDENTIFIER_PATTERNS)) {
    const matches = title.match(pattern)
    if (matches) {
      matches.forEach(match => {
        result.essential.push(match)
        result.identifiers.push({
          type: patternName,
          value: match,
          pattern: pattern.source
        })
      })
    }
  }

  for (const [category, pattern] of Object.entries(HIGH_PRIORITY_PATTERNS)) {
    const matches = title.match(pattern)
    if (matches) {
      matches.forEach(match => {
        if (!result.important.includes(match)) {
          result.important.push(match)
        }
      })
    }
  }

  const words = title
    .replace(/[^\w\s\/\-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0)

  for (const word of words) {
    const lowerWord = word.toLowerCase()
    
    if (result.essential.includes(word) || result.important.includes(word)) {
      continue
    }
    
    if (NOISE_WORDS.has(lowerWord) || word.length <= 2) {
      result.excluded.push(word)
      continue
    }
    
    result.optional.push(word)
  }

  result.essential = [...new Set(result.essential)]
  result.important = [...new Set(result.important)]
  result.optional = [...new Set(result.optional)]

  return result
}

export interface SearchQueryStrategy {
  level: number
  query: string
  keywords: string[]
  description: string
  expectedPrecision: 'very_high' | 'high' | 'medium' | 'low'
}

export function generateSearchQueries(title: string): SearchQueryStrategy[] {
  const keywords = extractSearchKeywords(title)
  const strategies: SearchQueryStrategy[] = []

  if (keywords.essential.length > 0 || keywords.important.length > 0) {
    const level1Keywords = [
      ...keywords.essential,
      ...keywords.important,
      ...keywords.optional.slice(0, 3)
    ]
    
    strategies.push({
      level: 1,
      query: level1Keywords.join(' '),
      keywords: level1Keywords,
      description: 'Essential + Important + Top Optional',
      expectedPrecision: 'very_high'
    })
  }

  if (keywords.essential.length > 0 && keywords.important.length > 0) {
    const level2Keywords = [...keywords.essential, ...keywords.important]
    
    strategies.push({
      level: 2,
      query: level2Keywords.join(' '),
      keywords: level2Keywords,
      description: 'Essential + Important',
      expectedPrecision: 'high'
    })
  }

  if (keywords.essential.length > 0) {
    const hasSetNumber = keywords.identifiers.some(id => 
      id.type === 'tcg_set_number' || id.type === 'sku'
    )
    
    const level3Query = hasSetNumber
      ? keywords.essential.map(k => `"${k}"`).join(' ')
      : keywords.essential.join(' ')
    
    strategies.push({
      level: 3,
      query: level3Query,
      keywords: keywords.essential,
      description: 'Essential Only',
      expectedPrecision: 'high'
    })
  }

  if (keywords.important.length > 0) {
    strategies.push({
      level: 4,
      query: keywords.important.join(' '),
      keywords: keywords.important,
      description: 'Important Only',
      expectedPrecision: 'medium'
    })
  }

  strategies.push({
    level: 5,
    query: title,
    keywords: [title],
    description: 'Full Title',
    expectedPrecision: 'low'
  })

  return strategies
}

export function filterByIdentifiers(
  items: any[],
  targetIdentifiers: Array<{ type: string; value: string }>
): any[] {
  if (targetIdentifiers.length === 0) {
    return items
  }

  return items.filter(item => {
    const itemTitle = item.title || ''
    
    return targetIdentifiers.every(identifier => {
      const pattern = IDENTIFIER_PATTERNS[identifier.type as keyof typeof IDENTIFIER_PATTERNS]
      if (!pattern) return false
      
      const matches = itemTitle.match(pattern)
      return matches && matches.some(match => match === identifier.value)
    })
  })
}

export function calculateTitleSimilarity(title1: string, title2: string): number {
  const keywords1 = extractSearchKeywords(title1)
  const keywords2 = extractSearchKeywords(title2)

  const essentialMatch = keywords1.essential.filter(k => 
    keywords2.essential.some(k2 => k.toLowerCase() === k2.toLowerCase())
  ).length / Math.max(keywords1.essential.length, 1)

  const importantMatch = keywords1.important.filter(k =>
    keywords2.important.some(k2 => k.toLowerCase() === k2.toLowerCase())
  ).length / Math.max(keywords1.important.length, 1)

  const optionalMatch = keywords1.optional.filter(k =>
    keywords2.optional.some(k2 => k.toLowerCase() === k2.toLowerCase())
  ).length / Math.max(keywords1.optional.length, 1)

  return essentialMatch * 0.6 + importantMatch * 0.3 + optionalMatch * 0.1
}

export function filterBySimilarity(
  items: any[],
  targetTitle: string,
  minSimilarity: number = 0.5
): any[] {
  return items.filter(item => {
    const similarity = calculateTitleSimilarity(targetTitle, item.title || '')
    return similarity >= minSimilarity
  })
}

export interface ItemSpecifics {
  'Card Name'?: string
  'Card Number'?: string
  'Set'?: string
  'Game'?: string
  'Language'?: string
  'Rarity'?: string
  'Card Type'?: string
  'Manufacturer'?: string
  [key: string]: string | undefined
}

export function generateSellerMirrorOptimizedQueries(
  originalTitle: string,
  itemSpecifics?: ItemSpecifics
): SearchQueryStrategy[] {
  const strategies: SearchQueryStrategy[] = []
  
  if (!itemSpecifics) {
    return generateSearchQueries(originalTitle)
  }

  const cardName = itemSpecifics['Card Name']
  const cardNumber = itemSpecifics['Card Number']
  const set = itemSpecifics['Set']
  const game = itemSpecifics['Game']

  if (cardName && cardNumber) {
    strategies.push({
      level: 1,
      query: `${cardName} "${cardNumber}"`,
      keywords: [cardName, cardNumber],
      description: 'SellerMirror: Card Name + Number (Exact)',
      expectedPrecision: 'very_high'
    })
  }

  if (cardName && cardNumber) {
    strategies.push({
      level: 2,
      query: `${cardName} ${cardNumber}`,
      keywords: [cardName, cardNumber],
      description: 'SellerMirror: Card Name + Number',
      expectedPrecision: 'very_high'
    })
  }

  if (cardName && set) {
    strategies.push({
      level: 3,
      query: `${cardName} ${set}`,
      keywords: [cardName, set],
      description: 'SellerMirror: Card Name + Set',
      expectedPrecision: 'high'
    })
  }

  if (cardName && game) {
    strategies.push({
      level: 4,
      query: `${cardName} ${game}`,
      keywords: [cardName, game],
      description: 'SellerMirror: Card Name + Game',
      expectedPrecision: 'high'
    })
  }

  if (cardName) {
    strategies.push({
      level: 5,
      query: cardName,
      keywords: [cardName],
      description: 'SellerMirror: Card Name Only',
      expectedPrecision: 'medium'
    })
  }

  const genericStrategies = generateSearchQueries(originalTitle)
  const remainingStrategies = genericStrategies.map((s, index) => ({
    ...s,
    level: 6 + index,
    description: `Generic: ${s.description}`
  }))

  strategies.push(...remainingStrategies)

  return strategies
}

export function filterByItemSpecifics(
  items: any[],
  itemSpecifics?: ItemSpecifics
): any[] {
  if (!itemSpecifics) {
    return items
  }

  return items.filter(item => {
    const itemTitle = (item.title || '').toLowerCase()
    let matchCount = 0
    let totalChecks = 0

    if (itemSpecifics['Card Number']) {
      totalChecks++
      const cardNumber = itemSpecifics['Card Number']
      if (itemTitle.includes(cardNumber.toLowerCase())) {
        matchCount += 3
      } else {
        return false
      }
    }

    if (itemSpecifics['Card Name']) {
      totalChecks++
      const cardName = itemSpecifics['Card Name'].toLowerCase()
      if (itemTitle.includes(cardName)) {
        matchCount += 2
      }
    }

    if (itemSpecifics['Language']) {
      totalChecks++
      const language = itemSpecifics['Language'].toLowerCase()
      if (itemTitle.includes(language)) {
        matchCount += 1
      }
    }

    if (itemSpecifics['Set']) {
      totalChecks++
      const set = itemSpecifics['Set'].toLowerCase()
      if (itemTitle.includes(set)) {
        matchCount += 1
      }
    }

    return totalChecks === 0 || (matchCount / totalChecks) >= 0.5
  })
}

export interface SearchResult {
  items: any[]
  strategy: SearchQueryStrategy
  filtered: {
    byIdentifier: number
    bySimilarity: number
    final: number
  }
}

export async function executeSearchStrategy(
  title: string,
  searchFunction: (query: string) => Promise<any[]>,
  options: {
    minItems?: number
    minSimilarity?: number
    strictIdentifierMatch?: boolean
  } = {}
): Promise<SearchResult> {
  const {
    minItems = 5,
    minSimilarity = 0.5,
    strictIdentifierMatch = true
  } = options

  const strategies = generateSearchQueries(title)
  const keywords = extractSearchKeywords(title)

  for (const strategy of strategies) {
    const items = await searchFunction(strategy.query)

    let filteredItems = items
    if (strictIdentifierMatch && keywords.identifiers.length > 0) {
      filteredItems = filterByIdentifiers(items, keywords.identifiers)
    }

    const similarItems = filterBySimilarity(filteredItems, title, minSimilarity)

    if (similarItems.length >= minItems) {
      return {
        items: similarItems,
        strategy,
        filtered: {
          byIdentifier: filteredItems.length,
          bySimilarity: similarItems.length,
          final: similarItems.length
        }
      }
    }
  }

  const fallbackStrategy = strategies[strategies.length - 1]
  const fallbackItems = await searchFunction(fallbackStrategy.query)
  
  return {
    items: fallbackItems,
    strategy: fallbackStrategy,
    filtered: {
      byIdentifier: fallbackItems.length,
      bySimilarity: fallbackItems.length,
      final: fallbackItems.length
    }
  }
}
