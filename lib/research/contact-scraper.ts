// ファイル: /lib/research/contact-scraper.ts
import { CompanyContact } from '@/types/ai';

/**
 * 商品名に基づいてGoogle検索を行い、企業サイトのURLを取得する
 * @param productName N3の高利益商品名
 * @returns 企業サイトURLのリスト
 */
export async function searchWholesalerUrls(productName: string): Promise<string[]> {
    // TODO: Google Custom Search API または Puppeteer を使用した自動検索ロジックを実装
    console.log(`Searching wholesalers for: ${productName}`);

    // 現在はモックデータ
    return [
        `https://example-wholesaler-${Math.random().toString(36).substring(7)}.co.jp`,
        `https://example-manufacturer-${Math.random().toString(36).substring(7)}.com`,
    ];
}

/**
 * 企業サイトから会社名と連絡先メールアドレスを抽出する
 * @param url 企業サイトURL
 * @returns 連絡先情報
 */
export async function scrapeContactInfo(url: string): Promise<CompanyContact> {
    // TODO: Puppeteer を使用して「会社概要」「お問い合わせ」ページを自動巡回し、
    // 'mailto:' や 正規表現でメールアドレスを抽出するロジックを実装
    console.log(`Scraping contact info from: ${url}`);

    // 現在はモックデータ
    const companyName = url.includes('wholesaler') ? '〇〇問屋株式会社' : '△△製造メーカー';

    return {
        company_name: companyName,
        contact_email: `info@${url.replace('https://', '').split('/')[0]}`,
        contact_url: url,
        found_via: 'scrape',
    };
}
