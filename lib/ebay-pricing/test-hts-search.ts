// HTS検索テスト
import { supabase } from '@/lib/supabase/client'

export async function testHTSSearch(hsCode: string) {
  console.log('🧪 HTS検索テスト開始:', hsCode)
  
  // テスト1: ドット付きで検索
  const { data: data1, error: error1 } = await supabase
    .from('hts_codes_details')
    .select('hts_number, general_rate, description')
    .eq('hts_number', hsCode)
    .maybeSingle()
  
  console.log('テスト1 (ドット付き):', { found: !!data1, data: data1, error: error1 })
  
  // テスト2: ドットなしで検索
  const normalized = hsCode.replace(/\./g, '')
  const { data: data2, error: error2 } = await supabase
    .from('hts_codes_details')
    .select('hts_number, general_rate, description')
    .eq('hts_number', normalized)
    .maybeSingle()
  
  console.log('テスト2 (ドットなし):', { found: !!data2, data: data2, error: error2 })
  
  // テスト3: LIKE検索
  const { data: data3, error: error3 } = await supabase
    .from('hts_codes_details')
    .select('hts_number, general_rate, description')
    .like('hts_number', `${hsCode}%`)
    .limit(1)
  
  console.log('テスト3 (LIKE):', { found: data3 && data3.length > 0, data: data3, error: error3 })
  
  return { data1, data2, data3 }
}
