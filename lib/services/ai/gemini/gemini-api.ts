// /lib/gemini-api.ts

import { ResearchPromptType } from '@/types/product';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

// 実際のプロンプトテンプレートは、AIが理解しやすいよう具体的な指示とJSONフォーマットでの出力を求めるべきです。
const PROMPT_TEMPLATES = {
    IMAGE_ONLY: (productData: any, imageUrl: string) =>
        `[画像URL]: ${imageUrl}\n以下のタスクを実行し、結果をJSON形式で返してください。\nタスク:\n1. この画像の商品を特定し、正確な英語タイトル、商品説明を生成。\n2. 市場での最安値をリサーチし、価格を提案（販売価格として適用）。\n3. HTSコード、原産国、素材をもしあればリサーチ。\n\n現在のデータ: ${JSON.stringify({ sku: productData.sku, name: productData.name })}`,

    FILL_MISSING_DATA: (productData: any) =>
        `[現在データ]: ${JSON.stringify(productData)}\n以下のデータ項目で不足しているものをリサーチし、全て補完した新しいJSONオブジェクトを返してください。\n- 英語タイトル\n- 英語説明文\n- HTSコード\n- 原産国\n- 素材`,

    FULL_RESEARCH_STANDARD: (productData: any) =>
        `[現在データ]: ${JSON.stringify(productData)}\nHTSコード、原産国、素材を優先的にリサーチし、データが取得できる場合はJSONオブジェクトに追加してください。市場調査（最安値リサーチ）は不要です。`,

    LISTING_DATA_ONLY: (productData: any) =>
        `[現在データ]: ${JSON.stringify(productData)}\n出品に必要な最低限のデータ（英語タイトル、英語説明文、eBay出品条件）のみを取得・生成したJSONオブジェクトを返してください。`,

    HTS_CLAUDE_MCP: (productData: any) =>
        `この商品データに基づき、Supabaseのデータベースに接続して過去事例を検索し、最も正確なHTSコードを取得してください。リサーチ結果をJSON形式で返してください。\n商品情報: ${JSON.stringify({ title: productData.name, category: productData.category })}`
};

/**
 * 選択されたタイプに基づき、AI実行用のプロンプトを生成する
 * @param type 選択されたプロンプトタイプ
 * @param productData 処理対象の商品データ（タイトル、画像URL、listing_dataなど）
 * @returns AIに渡すプロンプト文字列と、必要な場合は画像URL
 */
export function generateResearchPrompt(type: ResearchPromptType, productData: any): { prompt: string; imageUrl?: string } {
    // 優先度の高い画像URLを取得 (プライマリ画像、またはギャラリー画像の1枚目)
    const primaryImage = productData.listing_data?.primary_image_url || productData.gallery_images?.[0]?.url;

    if (type === 'IMAGE_ONLY' && primaryImage) {
        // IMAGE_ONLYプロンプトは画像URLが必須
        return {
            prompt: PROMPT_TEMPLATES.IMAGE_ONLY(productData, primaryImage),
            imageUrl: primaryImage
        };
    }

    // 画像を使用しない、または画像がない場合の処理
    const prompt = PROMPT_TEMPLATES[type] ? PROMPT_TEMPLATES[type](productData) : '標準のリサーチプロンプト';

    return { prompt };
}

/**
 * Gemini API にテキストプロンプトを送信し、応答を取得
 * @param prompt テキストプロンプト
 * @param options オプション設定
 * @returns Gemini APIからの応答テキスト
 */
export async function callGeminiAPI(
  prompt: string,
  options: {
    temperature?: number
    maxTokens?: number
    model?: string
  } = {}
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY が設定されていません')
  }

  const {
    temperature = 0.7,
    maxTokens = 2048,
    model = 'gemini-1.5-flash',
  } = options

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API エラー: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Gemini API から応答がありませんでした')
    }

    const text = data.candidates[0].content.parts[0].text
    return text
  } catch (error) {
    console.error('[Gemini API] エラー:', error)
    throw error
  }
}

/**
 * Gemini Vision API に画像とテキストプロンプトを送信
 * @param prompt テキストプロンプト
 * @param imageUrl 画像URL
 * @param options オプション設定
 * @returns Gemini APIからの応答テキスト
 */
export async function callGeminiVisionAPI(
  prompt: string,
  imageUrl: string,
  options: {
    temperature?: number
    maxTokens?: number
    model?: string
  } = {}
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY が設定されていません')
  }

  const {
    temperature = 0.7,
    maxTokens = 2048,
    model = 'gemini-1.5-flash',
  } = options

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`

  try {
    // 画像をBase64エンコード（URLから取得）
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`画像の取得に失敗しました: ${imageUrl}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    // MIMEタイプを推測
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
              {
                inlineData: {
                  mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini Vision API エラー: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Gemini Vision API から応答がありませんでした')
    }

    const text = data.candidates[0].content.parts[0].text
    return text
  } catch (error) {
    console.error('[Gemini Vision API] エラー:', error)
    throw error
  }
}

/**
 * JSON形式での応答を期待するGemini API呼び出し
 * @param prompt テキストプロンプト（JSON形式での応答を指示）
 * @param options オプション設定
 * @returns パースされたJSONオブジェクト
 */
export async function callGeminiAPIForJSON<T = any>(
  prompt: string,
  options: {
    temperature?: number
    maxTokens?: number
    model?: string
  } = {}
): Promise<T> {
  const enhancedPrompt = `${prompt}\n\n必ずJSON形式で応答してください。他のテキストは含めないでください。`

  const response = await callGeminiAPI(enhancedPrompt, {
    ...options,
    temperature: options.temperature || 0.3, // JSON生成時は低めの温度
  })

  try {
    // レスポンスからJSON部分を抽出（マークダウンのコードブロックを除去）
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/)
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response

    return JSON.parse(jsonText.trim())
  } catch (error) {
    console.error('[Gemini JSON Parse] エラー:', error)
    console.error('[Gemini JSON Parse] 生のレスポンス:', response)
    throw new Error(`JSON のパースに失敗しました: ${error}`)
  }
}