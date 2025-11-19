// lib/utils/translate-helpers.ts

/**
 * 単一テキスト翻訳のヘルパー関数
 */
export async function translateText(text: string): Promise<string> {
  if (!text || text.trim() === '') return text

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'single',
        text,
        sourceLang: 'ja',
        targetLang: 'en'
      })
    })

    const result = await response.json()
    
    if (result.success && result.translated) {
      return result.translated
    }
    
    return text
  } catch (error) {
    console.error('Translation error:', error)
    return text
  }
}

/**
 * バッチ翻訳のヘルパー関数
 */
export async function translateBatch(texts: string[]): Promise<string[]> {
  if (!texts || texts.length === 0) return texts

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'batch',
        texts,
        sourceLang: 'ja',
        targetLang: 'en'
      })
    })

    const result = await response.json()
    
    if (result.success && result.results) {
      return result.results
    }
    
    return texts
  } catch (error) {
    console.error('Batch translation error:', error)
    return texts
  }
}
