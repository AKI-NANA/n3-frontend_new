// ============================================
// SEO AIオプティマイザー（Phase 7統合: AI連携）
// Gemini API + Vision API使用
// ============================================

interface ListingData {
  product_id: string;
  ebay_listing_id?: string;
  title: string;
  description: string;
  health_score: number;
  category: string;
  price_usd: number;
  images?: string[]; // 画像URL配列
}

interface TitleOptimizationResult {
  success: boolean;
  original_title: string;
  optimized_title: string;
  improvements: string[];
  seo_score: number; // 0-100
  error?: string;
}

interface DescriptionOptimizationResult {
  success: boolean;
  original_description: string;
  optimized_description: string;
  improvements: string[];
  seo_score: number;
  error?: string;
}

interface ImageAnalysisResult {
  success: boolean;
  is_compliant: boolean;
  issues: string[];
  suggestions: string[];
  quality_score: number; // 0-100
  error?: string;
}

/**
 * 死に筋リスティングのタイトル改善案をGemini APIで生成
 *
 * @param listingData リスティングデータ
 * @returns タイトル最適化結果
 */
export async function optimizeListingTitle(
  listingData: ListingData
): Promise<TitleOptimizationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      original_title: listingData.title,
      optimized_title: '',
      improvements: [],
      seo_score: 0,
      error: 'GEMINI_API_KEY not configured',
    };
  }

  try {
    const prompt = buildTitleOptimizationPrompt(listingData);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
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
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 512,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const optimizedTitle = data.candidates[0]?.content?.parts[0]?.text || '';

    // 改善点の抽出
    const improvements = extractImprovements(
      listingData.title,
      optimizedTitle.trim()
    );
    const seoScore = calculateTitleSEOScore(optimizedTitle.trim());

    return {
      success: true,
      original_title: listingData.title,
      optimized_title: optimizedTitle.trim(),
      improvements,
      seo_score: seoScore,
    };
  } catch (error: any) {
    return {
      success: false,
      original_title: listingData.title,
      optimized_title: '',
      improvements: [],
      seo_score: 0,
      error: error.message,
    };
  }
}

/**
 * 説明文の改善案を生成
 */
export async function optimizeListingDescription(
  listingData: ListingData
): Promise<DescriptionOptimizationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      original_description: listingData.description,
      optimized_description: '',
      improvements: [],
      seo_score: 0,
      error: 'GEMINI_API_KEY not configured',
    };
  }

  try {
    const prompt = buildDescriptionOptimizationPrompt(listingData);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
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
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const optimizedDescription =
      data.candidates[0]?.content?.parts[0]?.text || '';

    const improvements = [
      '検索キーワードの最適化',
      '構造化された説明文',
      '商品の魅力を強調',
    ];
    const seoScore = calculateDescriptionSEOScore(optimizedDescription.trim());

    return {
      success: true,
      original_description: listingData.description,
      optimized_description: optimizedDescription.trim(),
      improvements,
      seo_score: seoScore,
    };
  } catch (error: any) {
    return {
      success: false,
      original_description: listingData.description,
      optimized_description: '',
      improvements: [],
      seo_score: 0,
      error: error.message,
    };
  }
}

/**
 * Gemini Vision APIで商品画像を分析
 * ウォーターマーク、ボーダー、不鮮明さを検出
 */
export async function analyzeProductImage(
  imageUrl: string
): Promise<ImageAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      is_compliant: false,
      issues: [],
      suggestions: [],
      quality_score: 0,
      error: 'GEMINI_API_KEY not configured',
    };
  }

  try {
    // 画像をBase64に変換
    const imageBase64 = await fetchImageAsBase64(imageUrl);

    const prompt = `この商品画像がeBayの出品ポリシーに適合しているか評価してください。

【チェック項目】
1. ウォーターマーク（透かし）が含まれているか
2. 不要なボーダーやフレームが含まれているか
3. 画像が不鮮明、ぼやけているか
4. 商品以外の不要な背景が含まれているか
5. 画像の品質（解像度、明るさ、色合い）

【出力形式】
以下のJSON形式で出力してください：
{
  "is_compliant": true/false,
  "issues": ["問題点1", "問題点2", ...],
  "suggestions": ["改善案1", "改善案2", ...],
  "quality_score": 0-100
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
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
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.candidates[0]?.content?.parts[0]?.text || '{}';

    // JSONパース
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
      success: true,
      is_compliant: analysis.is_compliant || false,
      issues: analysis.issues || [],
      suggestions: analysis.suggestions || [],
      quality_score: analysis.quality_score || 50,
    };
  } catch (error: any) {
    return {
      success: false,
      is_compliant: false,
      issues: [],
      suggestions: [],
      quality_score: 0,
      error: error.message,
    };
  }
}

// ============================================
// ヘルパー関数
// ============================================

function buildTitleOptimizationPrompt(listingData: ListingData): string {
  return `あなたは、eBayのSEO専門家です。以下の商品タイトルを最適化してください。

【現在のタイトル】
${listingData.title}

【商品情報】
- カテゴリー: ${listingData.category}
- 価格: $${listingData.price_usd}
- 健全性スコア: ${listingData.health_score}/100

【最適化の要件】
1. eBayの80文字制限内に収める
2. 検索されやすいキーワードを前半に配置
3. ブランド名、モデル名、サイズ、色、状態などの重要情報を含める
4. 「RARE」「LIMITED」などの希少性キーワードを適切に使用
5. 不要な記号や繰り返しを削除

【出力】
最適化されたタイトルのみを出力してください（説明は不要）。`;
}

function buildDescriptionOptimizationPrompt(listingData: ListingData): string {
  return `あなたは、eBayのSEO専門家です。以下の商品説明文を最適化してください。

【現在の説明文】
${listingData.description}

【商品情報】
- タイトル: ${listingData.title}
- カテゴリー: ${listingData.category}
- 価格: $${listingData.price_usd}

【最適化の要件】
1. 構造化された読みやすい説明文（箇条書き、セクション分け）
2. 検索キーワードを自然に組み込む
3. 商品の特徴、状態、付属品、配送情報を明確に記載
4. 購買意欲を高める表現（限定性、品質保証など）
5. eBayポリシーに準拠（外部リンク禁止、誇大広告禁止）

【出力】
最適化された説明文を出力してください（HTMLタグは不要、プレーンテキストのみ）。`;
}

function extractImprovements(
  original: string,
  optimized: string
): string[] {
  const improvements: string[] = [];

  if (optimized.length < original.length) {
    improvements.push('タイトルを簡潔化');
  }

  if (/\b(NEW|RARE|LIMITED)\b/i.test(optimized) && !/\b(NEW|RARE|LIMITED)\b/i.test(original)) {
    improvements.push('希少性キーワードを追加');
  }

  if (optimized.split(' ').length > original.split(' ').length) {
    improvements.push('検索キーワードを増加');
  }

  return improvements.length > 0
    ? improvements
    : ['タイトル構造を改善'];
}

function calculateTitleSEOScore(title: string): number {
  let score = 50;

  // 文字数チェック（60-80文字が理想）
  if (title.length >= 60 && title.length <= 80) score += 20;
  else if (title.length >= 40 && title.length < 60) score += 10;

  // キーワード密度
  const words = title.split(' ');
  if (words.length >= 8 && words.length <= 15) score += 15;

  // 希少性キーワード
  if (/\b(NEW|RARE|LIMITED|AUTHENTIC)\b/i.test(title)) score += 10;

  // ブランド名の存在
  if (/\b([A-Z][a-z]+)\b/.test(title)) score += 5;

  return Math.min(score, 100);
}

function calculateDescriptionSEOScore(description: string): number {
  let score = 50;

  // 文字数チェック（500-2000文字が理想）
  if (description.length >= 500 && description.length <= 2000) score += 20;
  else if (description.length >= 300) score += 10;

  // 構造化（箇条書き、セクション）
  if (description.includes('\n\n') || description.includes('•')) score += 15;

  // キーワード密度
  const keywords = description.match(/\b\w{4,}\b/g);
  if (keywords && keywords.length >= 50) score += 10;

  // 商品情報の充実度
  if (description.includes('Condition') || description.includes('状態')) score += 5;

  return Math.min(score, 100);
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return base64;
}
