// ファイル: /types/ai.ts

/**
 * SNSトレンド分析結果
 */
export interface SNSTrend {
  id: number;
  platform: 'youtube' | 'tiktok' | 'note' | 'x';
  trend_keyword: string;
  monetization_method: string | null;
  success_example_url: string | null;
  analysis_score: number | null;
  extracted_data: any;
  created_at: string;
}

/**
 * Note投稿データ
 */
export interface NotePostData {
    title: string;
    body: string; // Markdown形式
    slug?: string;
    status: 'draft' | 'public';
}
