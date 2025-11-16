/**
 * Gemini Web UI出力パーサー
 * 
 * Geminiから生成される構造化データをパースして、
 * アプリケーションで使用可能な形式に変換します。
 * 
 * 期待される入力フォーマット:
 * ```
 * HTS_KEYWORDS: trading cards, collectible, pokemon
 * MATERIAL_RECOMMENDATION: Paper
 * ORIGIN_COUNTRY_CANDIDATE: JP,CN
 * REWRITTEN_TITLE: Pokemon Card - Gengar VMAX
 * MARKET_SUMMARY: High demand collectible item...
 * MARKET_SCORE: 85
 * ```
 */

export interface GeminiOutput {
  hts_keywords: string;
  material_recommendation: string;
  origin_country_candidate: string;
  rewritten_title: string;
  market_summary: string;
  market_score: number;
}

export interface ParseError {
  field: string;
  message: string;
}

export interface ParseResult {
  success: boolean;
  data?: GeminiOutput;
  errors?: ParseError[];
}

/**
 * Gemini出力をパースする
 * 
 * @param text - Geminiから出力されたテキスト
 * @returns パース結果（成功 or エラー）
 */
export function parseGeminiOutput(text: string): ParseResult {
  const errors: ParseError[] = [];
  
  try {
    if (!text || text.trim() === '') {
      return {
        success: false,
        errors: [{ field: 'input', message: '入力が空です' }]
      };
    }
    
    const lines = text.trim().split('\n');
    const data: Record<string, string> = {};
    
    // 各行をパース
    lines.forEach((line, index) => {
      // 空行やコメント行をスキップ
      if (!line.trim() || line.trim().startsWith('#')) {
        return;
      }
      
      // "KEY: value" 形式をパース
      const match = line.match(/^([A-Z_]+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        data[key.toLowerCase()] = value.trim();
      } else {
        console.warn(`⚠️ パース警告 (行${index + 1}): フォーマットが不正 - "${line}"`);
      }
    });
    
    // 必須フィールドのバリデーション
    if (!data.hts_keywords || data.hts_keywords.trim() === '') {
      errors.push({
        field: 'hts_keywords',
        message: 'HTS_KEYWORDSは必須です'
      });
    }
    
    // 市場スコアの数値バリデーション
    const marketScore = parseInt(data.market_score);
    if (data.market_score && (isNaN(marketScore) || marketScore < 0 || marketScore > 100)) {
      errors.push({
        field: 'market_score',
        message: 'MARKET_SCOREは0-100の数値である必要があります'
      });
    }
    
    // エラーがある場合は失敗を返す
    if (errors.length > 0) {
      return {
        success: false,
        errors
      };
    }
    
    // 成功
    return {
      success: true,
      data: {
        hts_keywords: data.hts_keywords || '',
        material_recommendation: data.material_recommendation || '',
        origin_country_candidate: data.origin_country_candidate || '',
        rewritten_title: data.rewritten_title || '',
        market_summary: data.market_summary || '',
        market_score: marketScore || 0,
      }
    };
    
  } catch (error) {
    console.error('❌ Gemini出力パースエラー:', error);
    return {
      success: false,
      errors: [{
        field: 'system',
        message: error instanceof Error ? error.message : 'パースに失敗しました'
      }]
    };
  }
}

/**
 * パースエラーを人間が読める形式に変換
 * 
 * @param errors - パースエラー配列
 * @returns エラーメッセージ文字列
 */
export function formatParseErrors(errors: ParseError[]): string {
  return errors.map(e => `${e.field}: ${e.message}`).join('\n');
}

/**
 * Geminiプロンプトテンプレートを生成
 * 
 * @param title - 商品タイトル
 * @param category - カテゴリー名
 * @param brand - ブランド名
 * @returns Gemini用プロンプト
 */
export function generateGeminiPrompt(
  title: string,
  category?: string,
  brand?: string
): string {
  return `【入力情報】
タイトル: ${title}
カテゴリー: ${category || '未設定'}
ブランド: ${brand || '未設定'}

【処理指示】
上記の情報に基づき、以下の全ての情報を推論・生成し、指定された出力形式で回答してください。Web検索の利用は自由とします。

【生成必須項目】
1. HTS_キーワード: HTS分類に最適な2-3語のフレーズを5つ、カンマ区切りで生成。
2. 推奨素材: 商品の一般的な構成素材を1-2つ推論。
3. 推奨原産国: ブランドの主要製造国候補を2文字コード（例: JP, CN）で推論。
4. リライトタイトル: 越境EC向けに魅力的でVEROに配慮した英語タイトルをリライト。
5. 市場調査サマリー: 市場規模、競合優位性、法規制リスクに関するサマリーを簡潔に記述。
6. 市場適合スコア: 市場調査サマリーに基づき、[0-100]点のスコアを算出。

【出力形式】
**出力形式は以下のマークダウン形式を厳守してください。**

HTS_KEYWORDS: [生成されたカンマ区切りのキーワード]
MATERIAL_RECOMMENDATION: [推論された素材名]
ORIGIN_COUNTRY_CANDIDATE: [2文字コードのカンマ区切り]
REWRITTEN_TITLE: [リライトされた英語タイトル]
MARKET_SUMMARY: [生成されたサマリーテキスト]
MARKET_SCORE: [スコアの数値]`;
}

/**
 * サンプル出力（テスト用）
 */
export const SAMPLE_GEMINI_OUTPUT = `HTS_KEYWORDS: trading cards, collectible, pokemon, game cards, tcg
MATERIAL_RECOMMENDATION: Paper, Cardboard
ORIGIN_COUNTRY_CANDIDATE: JP,CN,US
REWRITTEN_TITLE: Pokemon Trading Card Game - Gengar VMAX Holo Rare
MARKET_SUMMARY: Pokemon trading cards represent a high-demand collectible market with strong international appeal. The product faces minimal VERO restrictions and benefits from established collector communities. Market size is substantial with consistent demand patterns.
MARKET_SCORE: 85`;
