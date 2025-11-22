// lib/services/hts/HSKeywordGeneratorService.ts
// HSコード分類キーワード自動生成サービス

import { GoogleGenAI, Type } from "@google/genai"
import { createClient } from '@/lib/supabase/server'

// =====================================================
// 型定義
// =====================================================

export interface HsInput {
  hs_code: string
  description_ja?: string
  description_en?: string
}

export interface KeywordOutput {
  hs_code: string
  keywords_ja: string[]
  keywords_en: string[]
}

export interface GenerationProgress {
  total: number
  completed: number
  succeeded: number
  failed: number
  currentHsCode?: string
  status: 'running' | 'completed' | 'error'
  errors?: Array<{ hs_code: string; error: string }>
}

// =====================================================
// 設定
// =====================================================

const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025"
const MAX_CONCURRENT_REQUESTS = 5
const RATE_LIMIT_DELAY_MS = 2000
const MAX_RETRIES = 3

// システム命令 (System Instruction)
const SYSTEM_INSTRUCTION = `You are an expert international trade and customs classification specialist. Your task is to generate a comprehensive list of search keywords for a given 6-digit Harmonized System (HS) code description. These keywords must be highly relevant for identifying goods in real-world shipping documents and commercial invoices.

Generate 10 to 20 keywords in Japanese.

Generate 10 to 20 keywords in English.

Keywords must include common synonyms, specific product types, components, and typical industry jargon related to the classification.

The output must be a single JSON object conforming to the provided schema.`

// 構造化出力スキーマ (JSON)
const outputSchema = {
  type: Type.OBJECT,
  properties: {
    hs_code: {
      type: Type.STRING,
      description: "The 6-digit HS code provided in the input."
    },
    keywords_ja: {
      type: Type.ARRAY,
      description: "10 to 20 relevant keywords in Japanese.",
      items: { type: Type.STRING }
    },
    keywords_en: {
      type: Type.ARRAY,
      description: "10 to 20 relevant keywords in English.",
      items: { type: Type.STRING }
    }
  },
  required: ["hs_code", "keywords_ja", "keywords_en"]
}

// =====================================================
// HSKeywordGeneratorService クラス
// =====================================================

export class HSKeywordGeneratorService {
  private ai: GoogleGenAI
  private supabase: ReturnType<typeof createClient>

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set')
    }

    this.ai = new GoogleGenAI({ apiKey })
    this.supabase = createClient()
  }

  /**
   * 単一のHSコードに対してキーワードを生成
   *
   * @param input HSコードと説明文
   * @param retryCount リトライ回数
   * @returns 生成されたキーワード
   */
  private async generateKeywordsForHs(
    input: HsInput,
    retryCount: number = 0
  ): Promise<KeywordOutput | null> {
    const userPrompt = `Generate keywords for the following HS code:
HS Code: ${input.hs_code}
${input.description_ja ? `Japanese Description: ${input.description_ja}` : ''}
${input.description_en ? `English Description: ${input.description_en}` : ''}`

    try {
      const response = await this.ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: outputSchema,
        },
      })

      // 構造化出力の解析
      const jsonText = response.text.trim()
      const output: KeywordOutput = JSON.parse(jsonText)

      // 生成されたキーワードを正規化
      output.keywords_en = output.keywords_en.map(k => k.toLowerCase().trim())
      output.keywords_ja = output.keywords_ja.map(k => k.trim())

      console.log(`✅ キーワード生成成功: HS ${input.hs_code} (日: ${output.keywords_ja.length}件, 英: ${output.keywords_en.length}件)`)
      return output

    } catch (error: any) {
      console.error(`❌ キーワード生成エラー HS ${input.hs_code}:`, error.message)

      // レート制限エラーの場合はリトライ
      if (
        retryCount < MAX_RETRIES &&
        (error.message.includes('429') || error.message.includes('rate limit'))
      ) {
        const delay = RATE_LIMIT_DELAY_MS * Math.pow(2, retryCount)
        console.log(`⚠️ レート制限エラー。${delay / 1000}秒後にリトライ... (試行 ${retryCount + 1}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.generateKeywordsForHs(input, retryCount + 1)
      }

      return null
    }
  }

  /**
   * 生成されたキーワードをデータベースに保存
   *
   * @param keywords 生成されたキーワード
   */
  private async saveKeywordsToDatabase(keywords: KeywordOutput): Promise<void> {
    const records = []

    // 日本語キーワード
    for (const keyword of keywords.keywords_ja) {
      records.push({
        hs_code: keywords.hs_code,
        keyword: keyword,
        language: 'ja',
        created_by: 'AI'
      })
    }

    // 英語キーワード
    for (const keyword of keywords.keywords_en) {
      records.push({
        hs_code: keywords.hs_code,
        keyword: keyword,
        language: 'en',
        created_by: 'AI'
      })
    }

    // バッチ挿入（UPSERT: 重複する場合は更新）
    const { error } = await this.supabase
      .from('hs_keywords')
      .upsert(records, {
        onConflict: 'hs_code,keyword,language',
        ignoreDuplicates: true
      })

    if (error) {
      throw new Error(`データベース保存エラー: ${error.message}`)
    }

    console.log(`💾 データベース保存成功: HS ${keywords.hs_code} (${records.length}件)`)
  }

  /**
   * 複数のHSコードに対してキーワードを一括生成
   *
   * @param inputData HSコードリスト
   * @param onProgress 進捗コールバック
   * @returns 生成結果
   */
  async processAllHsCodes(
    inputData: HsInput[],
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<GenerationProgress> {
    const total = inputData.length
    let completed = 0
    let succeeded = 0
    let failed = 0
    const errors: Array<{ hs_code: string; error: string }> = []

    console.log(`🚀 キーワード生成開始: ${total}件のHSコード`)

    // 進捗状態
    const progress: GenerationProgress = {
      total,
      completed: 0,
      succeeded: 0,
      failed: 0,
      status: 'running'
    }

    // 非同期処理キュー
    const queue: Promise<void>[] = []

    for (const input of inputData) {
      const task = async () => {
        try {
          progress.currentHsCode = input.hs_code

          // キーワード生成
          const result = await this.generateKeywordsForHs(input)

          if (result) {
            // データベースに保存
            await this.saveKeywordsToDatabase(result)
            succeeded++
          } else {
            failed++
            errors.push({
              hs_code: input.hs_code,
              error: '最大リトライ回数を超えました'
            })
          }
        } catch (error: any) {
          console.error(`❌ 処理エラー HS ${input.hs_code}:`, error.message)
          failed++
          errors.push({
            hs_code: input.hs_code,
            error: error.message
          })
        } finally {
          completed++
          progress.completed = completed
          progress.succeeded = succeeded
          progress.failed = failed
          progress.errors = errors

          // 進捗コールバック
          if (onProgress) {
            onProgress({ ...progress })
          }

          console.log(`[進捗] ${completed}/${total} 完了 (成功: ${succeeded}, 失敗: ${failed})`)
        }
      }

      // キューにタスクを追加
      const p = task().then(() => {
        queue.splice(queue.indexOf(p), 1)
      })
      queue.push(p)

      // 同時実行数制限
      if (queue.length >= MAX_CONCURRENT_REQUESTS) {
        await Promise.race(queue)
      }
    }

    // すべてのタスクの完了を待機
    await Promise.all(queue)

    progress.status = 'completed'
    progress.currentHsCode = undefined

    console.log(`🎉 キーワード生成完了! (成功: ${succeeded}, 失敗: ${failed})`)

    return progress
  }

  /**
   * データベースから既存のキーワードを取得
   *
   * @param hsCode HTSコード
   * @returns キーワードリスト
   */
  async getKeywordsByHsCode(hsCode: string): Promise<KeywordOutput | null> {
    const { data, error } = await this.supabase
      .from('hs_keywords')
      .select('keyword, language')
      .eq('hs_code', hsCode)

    if (error) {
      throw new Error(`データベース取得エラー: ${error.message}`)
    }

    if (!data || data.length === 0) {
      return null
    }

    const keywords_ja = data.filter(k => k.language === 'ja').map(k => k.keyword)
    const keywords_en = data.filter(k => k.language === 'en').map(k => k.keyword)

    return {
      hs_code: hsCode,
      keywords_ja,
      keywords_en
    }
  }
}
