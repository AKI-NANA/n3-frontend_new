/**
 * VeRO (Verified Rights Owner) 違反チェック ユーティリティ
 * eBay知的財産保護プログラム対応
 */

export interface VeROViolation {
  type: 'Replica' | 'Parallel Import' | 'Unauthorized' | 'Search Manipulation'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  detectedKeywords: string[]
  brandName?: string
  description: string
  recommendation: string
}

export interface VeROCheckResult {
  isSafe: boolean
  violations: VeROViolation[]
  riskScore: number // 0-100
  warnings: string[]
}

/**
 * VeRO違反の主要カテゴリー
 */
export const VERO_VIOLATION_TYPES = {
  REPLICA: 'Replica', // レプリカ・偽造品
  PARALLEL_IMPORT: 'Parallel Import', // 並行輸入品の無許可販売
  UNAUTHORIZED: 'Unauthorized', // 無許可使用（画像・テキスト）
  SEARCH_MANIPULATION: 'Search Manipulation', // 検索操作
} as const

/**
 * 禁止キーワード（タイトル・説明文で使用禁止）
 */
const PROHIBITED_KEYWORDS = {
  HIGH_RISK: [
    'replica', 'fake', 'counterfeit', 'imitation', 'copy',
    'レプリカ', 'フェイク', '偽物', '偽造品', 'コピー', '模造品',
  ],
  MEDIUM_RISK: [
    'novelty', 'junk', 'as-is', 'no guarantee',
    'ノベルティ', 'ジャンク', '保証なし', '現状渡し',
  ],
  AUTHENTICITY_RISK: [
    'authenticity unknown', 'cannot guarantee authentic',
    'not responsible', 'no liability',
    '真贋不明', '真正性を保証できない', '責任を負いません',
  ],
}

/**
 * VeRO高頻度指摘ブランド（実績データに基づく）
 */
export const VERO_HIGH_RISK_BRANDS = [
  // Top 5 (2020年10月～2021年1月実績)
  { name: 'Tamron', nameJa: 'タムロン', rank: 1, category: 'camera_lens' },
  { name: 'Adidas', nameJa: 'アディダス', rank: 2, category: 'sports_apparel' },
  { name: 'Nike', nameJa: 'ナイキ', rank: 3, category: 'sports_apparel' },
  { name: 'Okatsune', nameJa: '岡恒', rank: 4, category: 'garden_tools' },
  { name: 'Coach', nameJa: 'コーチ', rank: 5, category: 'luxury_brand' },
  
  // 高級ブランド（極めて厳格）
  { name: 'Louis Vuitton', nameJa: 'ルイ・ヴィトン', category: 'luxury_brand' },
  { name: 'Gucci', nameJa: 'グッチ', category: 'luxury_brand' },
  { name: 'Chanel', nameJa: 'シャネル', category: 'luxury_brand' },
  { name: 'Hermès', nameJa: 'エルメス', category: 'luxury_brand' },
  { name: 'Prada', nameJa: 'プラダ', category: 'luxury_brand' },
  
  // 高級時計（輸入規制あり）
  { name: 'Rolex', nameJa: 'ロレックス', category: 'luxury_watch', hasImportRestrictions: true },
  { name: 'Cartier', nameJa: 'カルティエ', category: 'luxury_watch' },
  
  // テクノロジー
  { name: 'Apple', nameJa: 'アップル', category: 'electronics' },
]

/**
 * 商品タイトルと説明文のVeROチェック
 */
export function checkVeROCompliance(
  title: string,
  description: string,
  shippingRegions: string[] = []
): VeROCheckResult {
  const violations: VeROViolation[] = []
  const warnings: string[] = []
  let riskScore = 0

  const combinedText = `${title} ${description}`.toLowerCase()

  // 1. レプリカ・偽造品キーワードチェック
  const replicaKeywords = PROHIBITED_KEYWORDS.HIGH_RISK.filter(keyword =>
    combinedText.includes(keyword.toLowerCase())
  )
  
  if (replicaKeywords.length > 0) {
    violations.push({
      type: 'Replica',
      severity: 'CRITICAL',
      detectedKeywords: replicaKeywords,
      description: 'レプリカ・偽造品を示すキーワードが検出されました',
      recommendation: 'これらのキーワードを完全に削除してください。使用すると即座にVeRO違反となります。',
    })
    riskScore += 50
  }

  // 2. 責任逃れフレーズチェック
  const authenticityRiskKeywords = PROHIBITED_KEYWORDS.AUTHENTICITY_RISK.filter(keyword =>
    combinedText.includes(keyword.toLowerCase())
  )
  
  if (authenticityRiskKeywords.length > 0) {
    violations.push({
      type: 'Unauthorized',
      severity: 'HIGH',
      detectedKeywords: authenticityRiskKeywords,
      description: '信憑性や商品責任を回避する表現が検出されました',
      recommendation: 'これらの表現を削除し、代わりに真贋証明書や領収書を添付してください。',
    })
    riskScore += 30
  }

  // 3. 中リスクキーワードチェック
  const mediumRiskKeywords = PROHIBITED_KEYWORDS.MEDIUM_RISK.filter(keyword =>
    combinedText.includes(keyword.toLowerCase())
  )
  
  if (mediumRiskKeywords.length > 0) {
    violations.push({
      type: 'Unauthorized',
      severity: 'MEDIUM',
      detectedKeywords: mediumRiskKeywords,
      description: 'VeRO違反の可能性がある表現が検出されました',
      recommendation: 'これらの表現の使用は避けることを推奨します。',
    })
    riskScore += 15
  }

  // 4. 高リスクブランドチェック
  const detectedBrands = VERO_HIGH_RISK_BRANDS.filter(brand => {
    const brandNames = [brand.name.toLowerCase(), brand.nameJa]
    return brandNames.some(name => combinedText.includes(name))
  })

  if (detectedBrands.length > 0) {
    detectedBrands.forEach(brand => {
      warnings.push(
        `${brand.name}（${brand.nameJa}）はVeRO指摘の多いブランドです。` +
        (brand.rank ? ` [指摘頻度: 第${brand.rank}位]` : '') +
        ' 以下の対策を徹底してください：\n' +
        '  • 自分で撮影した写真のみを使用\n' +
        '  • 製造番号、ロゴ、タグが明確にわかる写真を掲載\n' +
        '  • 正規販売店からの領収書を添付\n' +
        (brand.hasImportRestrictions
          ? '  • 【重要】各国の輸入規制を確認し、配送先を適切に設定'
          : '  • 配送先の地域制限を確認')
      )
      riskScore += 10
    })
  }

  // 5. 並行輸入品の配送先チェック
  if (
    combinedText.includes('parallel import') ||
    combinedText.includes('並行輸入') ||
    combinedText.includes('import')
  ) {
    if (shippingRegions.includes('worldwide') || shippingRegions.length === 0) {
      violations.push({
        type: 'Parallel Import',
        severity: 'HIGH',
        detectedKeywords: ['並行輸入品', 'worldwide shipping'],
        description: '並行輸入品を全世界に配送可能に設定しています',
        recommendation:
          '権利所有者が許諾していない地域への販売は違反となります。' +
          '配送先を確認し、制限地域を除外してください。',
      })
      riskScore += 25
    } else {
      warnings.push(
        '並行輸入品を扱う場合は、ブランド所有者のVeROプロファイルで' +
        '販売許可地域を必ず確認してください。'
      )
    }
  }

  // 最終判定
  const isSafe = violations.filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH').length === 0

  return {
    isSafe,
    violations,
    riskScore: Math.min(riskScore, 100),
    warnings,
  }
}

/**
 * VeRO対策チェックリスト生成
 */
export function generateVeROChecklist(brandName?: string): string[] {
  const baseChecklist = [
    '✅ タイトルと説明文に "replica", "fake", "novelty", "junk" などの禁止ワードが含まれていないか',
    '✅ 自分で撮影した商品写真のみを使用しているか（メーカー公式画像は使用禁止）',
    '✅ 製造番号、ロゴ、タグ、スティッチが明確にわかる写真を掲載しているか',
    '✅ "信憑性に責任を負わない" などの責任逃れ表現を使用していないか',
    '✅ 正規販売店からの領収書や真贋証明書を添付しているか',
    '✅ 配送先の地域制限が適切に設定されているか',
  ]

  if (brandName) {
    const brand = VERO_HIGH_RISK_BRANDS.find(
      b => b.name.toLowerCase() === brandName.toLowerCase() || b.nameJa === brandName
    )
    
    if (brand) {
      baseChecklist.push(
        `⚠️  ${brand.name}はVeRO指摘の多いブランドです。上記の対策を厳格に実施してください。`
      )
      
      if (brand.hasImportRestrictions) {
        baseChecklist.push(
          '🚨 このブランドには各国の輸入規制があります。配送先の国別規制を必ず確認してください。'
        )
      }
    }
  }

  return baseChecklist
}

/**
 * VeRO違反時の対応手順
 */
export const VERO_VIOLATION_RESPONSE_STEPS = {
  商品が強制削除されていない場合: [
    '1. メールに記載の関連ポリシーを確認',
    '2. 必ず48時間以内に出品内容を修正',
    '3. 同様の違反商品があれば修正または取り下げ',
    '⚠️ 重要: 修正せずに取り下げると違反情報が残ります。必ず先に修正してから取り下げてください。',
  ],
  すでに商品が強制削除された場合: [
    '1. メールに記載の関連ポリシーを確認',
    '2. 同様の違反商品を今後出品しない',
    '3. 違反の原因を分析し改善策を実施',
    '4. 理由が不明な場合は権利所有者に直接連絡',
  ],
  違反を繰り返した場合のペナルティ: [
    '第1回: 警告',
    '第2回: 3日間の販売制限',
    '第3回: 7日間の販売制限',
    '第4回: 30日間の販売制限',
    '第5回以降: アカウント永久凍結の可能性',
  ],
}

/**
 * VeROリスクスコアの評価
 */
export function evaluateVeRORisk(score: number): {
  level: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  color: string
  message: string
} {
  if (score === 0) {
    return {
      level: 'SAFE',
      color: 'green',
      message: 'VeRO違反のリスクは検出されませんでした。安全に出品できます。',
    }
  } else if (score < 20) {
    return {
      level: 'LOW',
      color: 'blue',
      message: '軽微な注意点がありますが、修正すれば問題ありません。',
    }
  } else if (score < 40) {
    return {
      level: 'MEDIUM',
      color: 'yellow',
      message: 'いくつかのリスク要因があります。修正を推奨します。',
    }
  } else if (score < 70) {
    return {
      level: 'HIGH',
      color: 'orange',
      message: '高リスクです。出品前に必ず修正してください。',
    }
  } else {
    return {
      level: 'CRITICAL',
      color: 'red',
      message: '重大なVeRO違反リスクがあります。このまま出品すると即座に削除される可能性があります。',
    }
  }
}
