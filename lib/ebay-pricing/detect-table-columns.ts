/**
 * USA DDP送料テーブルの列名を自動検出
 */

import { createClient } from '@/lib/supabase/client'

export async function detectTableColumns(): Promise<string[]> {
  try {
    const supabase = createClient()

    // 1行だけ取得してカラム名を確認
    const { data, error } = await supabase
      .from('usa_ddp_rates')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ テーブル取得エラー:', error)
      return []
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ usa_ddp_ratesテーブルにデータがありません')
      return []
    }

    // カラム名を取得
    const columns = Object.keys(data[0])
    console.log('✅ 検出されたカラム:', columns)
    
    return columns
  } catch (error) {
    console.error('❌ カラム検出エラー:', error)
    return []
  }
}

/**
 * 重量を表すカラム名を推測
 */
export function guessWeightColumn(columns: string[]): string | null {
  const candidates = ['weight', 'weight_kg', 'weight_g', 'kg', 'wt', 'w']
  
  for (const candidate of candidates) {
    if (columns.includes(candidate)) {
      return candidate
    }
  }
  
  // 部分一致で探す
  for (const col of columns) {
    if (col.toLowerCase().includes('weight') || col.toLowerCase().includes('wt')) {
      return col
    }
  }
  
  return null
}

// ブラウザのコンソールから実行できるようにする
if (typeof window !== 'undefined') {
  (window as any).detectTableColumns = detectTableColumns
  (window as any).guessWeightColumn = guessWeightColumn
}
