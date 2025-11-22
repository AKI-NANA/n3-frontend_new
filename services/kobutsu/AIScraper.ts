// services/kobutsu/AIScraper.ts
// AI情報抽出サービス
// 仕入先URLから商品情報、出品者情報、画像を自動抽出

import Anthropic from '@anthropic-ai/sdk';

/**
 * 抽出結果の型定義
 */
export interface AiExtractionResult {
  success: boolean;
  supplierName?: string;
  supplierType?: 'B2C_COMPANY' | 'INDIVIDUAL_SELLER' | 'AUCTION' | 'OTHER';
  itemFeatures?: string;
  imageUrl?: string;
  error?: string;
  extractedData?: {
    productCondition?: string;
    modelNumber?: string;
    color?: string;
    brand?: string;
    additionalInfo?: string;
  };
}

/**
 * AI Scraper クラス
 * Claude APIを使用して仕入先ページから情報を抽出
 */
export class AIScraper {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY が設定されていません');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * 仕入先URLから情報を抽出
   */
  async extractSupplierInfo(url: string): Promise<AiExtractionResult> {
    try {
      // URLからHTMLコンテンツを取得
      const htmlContent = await this.fetchPageContent(url);

      if (!htmlContent) {
        return {
          success: false,
          error: 'ページの取得に失敗しました',
        };
      }

      // Claude APIで情報抽出
      const extractedInfo = await this.analyzeWithClaude(url, htmlContent);

      return {
        success: true,
        ...extractedInfo,
      };
    } catch (error: any) {
      console.error('AI抽出エラー:', error);
      return {
        success: false,
        error: error.message || 'AI抽出に失敗しました',
      };
    }
  }

  /**
   * ページコンテンツを取得
   */
  private async fetchPageContent(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error: any) {
      console.error('ページ取得エラー:', error);
      return null;
    }
  }

  /**
   * Claude APIで情報を分析・抽出
   */
  private async analyzeWithClaude(
    url: string,
    htmlContent: string
  ): Promise<Partial<AiExtractionResult>> {
    // HTMLを簡略化（Claude APIの入力サイズ制限対策）
    const simplifiedHtml = this.simplifyHtml(htmlContent);

    const prompt = `
あなたは古物営業法に基づく台帳記録のための情報抽出AIです。
以下のURL先の商品ページから、必要な情報を抽出してください。

URL: ${url}

HTML（簡略版）:
${simplifiedHtml.substring(0, 10000)}

以下の情報を抽出し、JSON形式で返してください：

1. **supplierName**: 出品者名またはショップ名（Yahoo!オークションならYahoo! ID、Amazonなら販売者名）
2. **supplierType**: 仕入先の種別
   - "B2C_COMPANY": 企業（Amazon、楽天など）
   - "INDIVIDUAL_SELLER": 個人出品者（Yahoo!オークション個人など）
   - "AUCTION": オークション形式
   - "OTHER": その他
3. **itemFeatures**: 商品の特徴（状態、型番、色、サイズなど）を簡潔に記述
4. **imageUrl**: メイン商品画像のURL（最も大きい画像を選択）
5. **extractedData**: 詳細情報
   - productCondition: 商品状態（新品、中古、美品、ジャンクなど）
   - modelNumber: 型番
   - color: 色
   - brand: ブランド
   - additionalInfo: その他の重要情報

抽出できない項目は null を返してください。

回答形式:
\`\`\`json
{
  "supplierName": "...",
  "supplierType": "...",
  "itemFeatures": "...",
  "imageUrl": "...",
  "extractedData": {
    "productCondition": "...",
    "modelNumber": "...",
    "color": "...",
    "brand": "...",
    "additionalInfo": "..."
  }
}
\`\`\`
`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // レスポンスからJSONを抽出
      const responseText =
        message.content[0].type === 'text' ? message.content[0].text : '';
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);

      if (jsonMatch) {
        const extractedData = JSON.parse(jsonMatch[1]);
        return extractedData;
      } else {
        // JSONブロックがない場合、レスポンス全体をJSONとしてパース
        return JSON.parse(responseText);
      }
    } catch (error: any) {
      console.error('Claude API エラー:', error);
      throw new Error(`AI分析に失敗しました: ${error.message}`);
    }
  }

  /**
   * HTMLを簡略化（重要な情報のみ抽出）
   */
  private simplifyHtml(html: string): string {
    // スクリプトとスタイルを削除
    let simplified = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // 連続する空白を削除
    simplified = simplified.replace(/\s+/g, ' ');

    return simplified;
  }

  /**
   * 画像をダウンロードして保存
   */
  async downloadImage(imageUrl: string, destinationPath: string): Promise<boolean> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`画像ダウンロード失敗: HTTP ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const fs = require('fs').promises;
      await fs.writeFile(destinationPath, Buffer.from(buffer));

      return true;
    } catch (error: any) {
      console.error('画像ダウンロードエラー:', error);
      return false;
    }
  }
}

/**
 * シングルトンインスタンス
 */
let aiScraperInstance: AIScraper | null = null;

export function getAIScraper(): AIScraper {
  if (!aiScraperInstance) {
    aiScraperInstance = new AIScraper();
  }
  return aiScraperInstance;
}
