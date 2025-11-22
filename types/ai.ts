// ファイル: /types/ai.ts

/**
 * ペルソナマスターのレコード
 */
export interface Persona {
  id: number;
  name: string;
  style_prompt: string;
  created_at: string;
}

/**
 * アウトリーチログのレコード
 */
export interface OutreachLog {
  id: number;
  target_company: string;
  target_email: string | null;
  target_url: string | null;
  product_id: number | null;
  persona_id: number;
  email_subject: string;
  email_body: string;
  status: 'sent' | 'replied' | 'ignored' | 'failed';
  sent_at: string;
  reply_at: string | null;
}

/**
 * 企業情報抽出の結果
 */
export interface CompanyContact {
  company_name: string;
  contact_email: string | null;
  contact_url: string | null;
  found_via: 'scrape' | 'search';
}
