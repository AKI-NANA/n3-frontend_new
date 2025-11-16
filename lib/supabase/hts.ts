import { supabase } from '../supabase'

export interface HTSCode {
  hts_number: string
  description: string
  general_rate?: string
  special_rate?: string
  chapter_code?: string
  heading_code?: string
  subheading_code?: string
}

// Chapter日本語名マスター（HTS Chapterの日本語訳 - 全99章完全版）
const CHAPTER_JAPANESE_NAMES: Record<string, string> = {
  '01': '生きている動物',
  '02': '肉及び食用のくず肉',
  '03': '魚並びに甲殻類、軟体動物及びその他の水棲無脊椎動物',
  '04': '酪農品、鳥卵、天然はちみつ及び他の類に該当しない食用の動物性生産品',
  '05': '動物性生産品（他の類に該当しないもの）',
  '06': '生きている樹木その他の植物及びりん茎、根その他これらに類する物品並びに切花及び装飾用の葉',
  '07': '食用の野菜、根及び塊茎',
  '08': '食用の果実及びナット、かんきつ類の果皮並びにメロンの皮',
  '09': 'コーヒー、茶、マテ及び香辛料',
  '10': '穀物',
  '11': 'ばいせん工業の生産品、麦芽、でん粉、イヌリン及び小麦グルテン',
  '12': '採油用の種及び果実、各種の種及び果実、工業用又は医薬用の植物並びにわら及び飼料用植物',
  '13': 'ラック並びにガム、樹脂その他の植物性の液汁及びエキス',
  '14': '植物性の組物材料及び他の類に該当しない植物性生産品',
  '15': '動物性又は植物性の油脂及びその分解生産物、調製食用脂並びに動物性又は植物性のろう',
  '16': '肉、魚又は甲殻類、軟体動物若しくはその他の水棲無脊椎動物の調製品',
  '17': '砂糖及び砂糖菓子',
  '18': 'ココア及びその調製品',
  '19': '穀物、穀粉、でん粉又はミルクの調製品及びベーカリー製品',
  '20': '野菜、果実、ナットその他植物の部分の調製品',
  '21': '各種の調製食料品',
  '22': '飲料、アルコール及び食酢',
  '23': '食品工業において生ずる残留物及びくず並びに調製飼料',
  '24': 'たばこ及び製造たばこ代用品',
  '25': '塩、硫黄、土石類、プラスター、石灰及びセメント',
  '26': '鉱石、スラグ及び灰',
  '27': '鉱物性燃料及び鉱物油並びにこれらの蒸留物、歴青物質並びに鉱物性ろう',
  '28': '無機化学品及び貴金属、希土類金属、放射性元素又は同位元素の無機又は有機の化合物',
  '29': '有機化学品',
  '30': '医療用品',
  '31': '肥料',
  '32': 'なめしエキス、染色エキス、タンニン及びその誘導体、染料、顔料その他の着色料、ペイント、ワニス、パテその他のマスチック並びにインキ',
  '33': '精油、レジノイド、調製香料及び化粧品類',
  '34': 'せっけん、有機界面活性剤、洗剤、調製潤滑剤、人造ろう、調製ろう、磨き剤、ろうそくその他これに類する物品、モデリングペースト、歯科用ワックス及びプラスターをもととした歯科用の調製品',
  '35': 'たんぱく系物質、変性でん粉、膠着剤及び酵素',
  '36': '火薬類、火工品、マッチ、発火性合金及び調製燃料',
  '37': '写真用又は映画用の材料',
  '38': '各種の化学工業生産品',
  '39': 'プラスチック及びその製品',
  '40': 'ゴム及びその製品',
  '41': '原皮（毛皮を除く。）及び革',
  '42': '革製品及び動物用装着具並びに旅行用具、ハンドバッグその他これらに類する容器並びに腸の製品',
  '43': '毛皮及び人造毛皮並びにこれらの製品',
  '44': '木材及びその製品並びに木炭',
  '45': 'コルク及びその製品',
  '46': 'わら、エスパルトその他の組物材料の製品及びかご細工物並びに枝条細工物',
  '47': '木材パルプその他の繊維素繊維を原料とするパルプ、古紙',
  '48': '紙及び板紙並びに製紙用パルプ、紙又は板紙の製品',
  '49': '印刷した書籍、新聞、絵画その他の印刷物並びに手書き文書、タイプ文書、設計図及び図案',
  '50': '絹及び絹織物',
  '51': '羊毛、繊獣毛、粗獣毛及び馬毛の糸並びにこれらの織物',
  '52': '綿及び綿織物',
  '53': 'その他の植物性紡織用繊維及びその織物並びに紙糸及びその織物',
  '54': '人造繊維の長繊維並びに人造繊維の織物及びストリップその他これに類する人造繊維製品',
  '55': '人造繊維の短繊維及びその織物',
  '56': 'ウォッディング、フェルト、不織布及び特殊糸並びにひも、綱、ケーブル及びこれらの製品',
  '57': 'じゅうたんその他の紡織用繊維の床用敷物',
  '58': '特殊織物、タフテッド織物類、レース、つづれ織物、トリミング及びししゅう布',
  '59': '浸透、塗布、被覆又は積層した紡織用繊維の織物類及び工業用の紡織用繊維製品',
  '60': 'メリヤス編物及びクロセ編物',
  '61': '衣類及び衣類附属品（メリヤス編み又はクロセ編みのものに限る。）',
  '62': '衣類及び衣類附属品（メリヤス編み又はクロセ編みのものを除く。）',
  '63': '紡織用繊維のその他の製品、セット、中古の衣類、紡織用繊維の中古の物品及びぼろ',
  '64': '履物及びゲートルその他これに類する物品並びにこれらの部分品',
  '65': '帽子及びその部分品',
  '66': '傘、つえ、シートステッキ及びむち並びにこれらの部分品',
  '67': '羽毛及び綿毛を使用した物品並びに造花及び人髪製品',
  '68': '石、プラスター、セメント、石綿、雲母その他これらに類する材料の製品',
  '69': '陶磁製品',
  '70': 'ガラス及びその製品',
  '71': '天然又は養殖の真珠、貴石、半貴石、貴金属及び貴金属を張った金属並びにこれらの製品、身辺用模造細貨類並びに貨幣',
  '72': '鉄鋼',
  '73': '鉄鋼製品',
  '74': '銅及びその製品',
  '75': 'ニッケル及びその製品',
  '76': 'アルミニウム及びその製品',
  '78': '鉛及びその製品',
  '79': '亜鉛及びその製品',
  '80': 'すず及びその製品',
  '81': 'その他の卑金属、サーメット及びこれらの製品',
  '82': '卑金属製の工具、道具、刃物、スプーン及びフォーク並びにこれらの部分品',
  '83': '各種の卑金属製品',
  '84': '原子炉、ボイラー及び機械類並びにこれらの部分品',
  '85': '電気機器及びその部分品並びに録音機、音声再生機並びにテレビジョンの映像及び音声の記録用又は再生用の機器並びにこれらの部分品及び附属品',
  '86': '鉄道用又は軌道用の機関車及び車両並びにこれらの部分品、鉄道用又は軌道用の装備品及びその部分品並びに機械式交通信号用機器（電気機械式のものを含む。）',
  '87': '鉄道用及び軌道用以外の車両並びにその部分品及び附属品',
  '88': '航空機及び宇宙飛行体並びにこれらの部分品',
  '89': '船舶及び浮き構造物',
  '90': '光学機器、写真用機器、映画用機器、測定機器、検査機器、精密機器及び医療用機器並びにこれらの部分品及び附属品',
  '91': '時計及びその部分品',
  '92': '楽器並びにその部分品及び附属品',
  '93': '武器及び銃砲弾並びにこれらの部分品及び附属品',
  '94': '家具、寝具、マットレス、マットレスサポート、クッションその他これらに類する詰物をした物品並びにランプその他の照明器具（他の類に該当するものを除く。）及びイルミネーションサイン、発光ネームプレートその他これらに類する物品並びにプレハブ建築物',
  '95': 'がん具、遊戯用具及び運動用具並びにこれらの部分品及び附属品',
  '96': '雑品',
  '97': '美術品、収集品及びこっとう品',
  '98': '特殊分類物品',
  '99': '特殊輸入物品'
}

/**
 * Chapter一覧を取得（新しいhts_codes_chaptersテーブルから）
 */
export async function getHTSChapters() {
  const { data, error } = await supabase
    .from('hts_codes_chapters')
    .select('chapter_code, title_english, title_japanese, section_number, section_title')
    .order('sort_order')
  
  if (error) {
    console.error('Error fetching chapters:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    // フォールバック：古い方法でデータ取得
    return getHTSChaptersFallback()
  }
  
  // カウント取得（並列処理）
  const chaptersWithCount = await Promise.all(
    (data || []).map(async (chapter) => {
      const { count } = await supabase
        .from('hts_codes_details')
        .select('*', { count: 'exact', head: true })
        .eq('chapter_code', chapter.chapter_code)
      
      return {
        code: chapter.chapter_code,
        description: chapter.title_japanese || chapter.title_english,
        japaneseDescription: chapter.title_japanese || '',
        englishDescription: chapter.title_english || '',
        sectionNumber: chapter.section_number,
        sectionTitle: chapter.section_title,
        count: count || 0
      }
    })
  )
  
  return chaptersWithCount
}

/**
 * Chapter一覧を取得（フォールバック：古い方法）
 */
async function getHTSChaptersFallback() {
  const chapters = []
  
  for (let i = 1; i <= 99; i++) {
    const chapterCode = i.toString().padStart(2, '0')
    
    const { count } = await supabase
      .from('hts_codes_details')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_code', chapterCode)
    
    const japaneseDesc = CHAPTER_JAPANESE_NAMES[chapterCode] || ''
    
    if (japaneseDesc || count > 0) {
      chapters.push({
        code: chapterCode,
        description: japaneseDesc,
        japaneseDescription: japaneseDesc,
        englishDescription: '',
        count: count || 0
      })
    }
  }
  
  return chapters
}

/**
 * Chapter一覧を取得（日本語＋英語表示）
 */
export async function getHTSChaptersWithBothLanguages() {
  const chapters = []
  
  for (let i = 1; i <= 99; i++) {
    const chapterCode = i.toString().padStart(2, '0')
    
    const { data: chapterData, count } = await supabase
      .from('hts_codes_details')
      .select('description', { count: 'exact' })
      .eq('chapter_code', chapterCode)
      .limit(1)
    
    const englishDesc = chapterData && chapterData.length > 0 
      ? chapterData[0].description.split(';')[0].split(':')[0].trim()
      : ''
    const japaneseDesc = CHAPTER_JAPANESE_NAMES[chapterCode] || ''
    
    // 日本語または英語のいずれかがあれば追加
    if (japaneseDesc || englishDesc) {
      chapters.push({
        code: chapterCode,
        description: japaneseDesc && englishDesc 
          ? `${japaneseDesc} / ${englishDesc}`
          : japaneseDesc || englishDesc,
        japaneseDescription: japaneseDesc,
        englishDescription: englishDesc,
        count: count || 0
      })
    }
  }
  
  return chapters
}

/**
 * Chapter一覧を取得（日本語のみ）
 */
export async function getHTSChaptersJapaneseOnly() {
  const chapters = []
  
  for (let i = 1; i <= 99; i++) {
    const chapterCode = i.toString().padStart(2, '0')
    const japaneseDesc = CHAPTER_JAPANESE_NAMES[chapterCode]
    
    if (japaneseDesc) {
      const { count } = await supabase
        .from('hts_codes_details')
        .select('*', { count: 'exact', head: true })
        .eq('chapter_code', chapterCode)
      
      chapters.push({
        code: chapterCode,
        description: japaneseDesc,
        japaneseDescription: japaneseDesc,
        englishDescription: '',
        count: count || 0
      })
    }
  }
  
  return chapters
}

/**
 * Chapter情報を取得（日本語・E英語両方）
 */
export async function getChapterInfo(chapterCode: string) {
  const { data } = await supabase
    .from('hts_codes_details')
    .select('description')
    .eq('chapter_code', chapterCode)
    .limit(1)
    .single()
  
  const englishDesc = data?.description || ''
  const japaneseDesc = CHAPTER_JAPANESE_NAMES[chapterCode] || ''
  
  return {
    code: chapterCode,
    japaneseDescription: japaneseDesc,
    englishDescription: englishDesc,
    bothLanguages: japaneseDesc && englishDesc 
      ? `${japaneseDesc} / ${englishDesc}`
      : japaneseDesc || englishDesc
  }
}

/**
 * 指定ChapterのHeading一覧を取得
 */
export async function getHTSHeadingsByChapter(chapterCode: string) {
  const { data, error } = await supabase
    .from('hts_codes_headings')
    .select('heading_code, description, title')
    .like('heading_code', `${chapterCode}%`)
    .order('heading_code')
  
  if (error) throw error
  
  // Chapter情報を取得して階層パスを作成
  const { data: chapterData } = await supabase
    .from('hts_codes_details')
    .select('description')
    .eq('chapter_code', chapterCode)
    .limit(1)
    .single()
  
  const chapterDesc = chapterData?.description || ''
  const chapterJaDesc = CHAPTER_JAPANESE_NAMES[chapterCode]
  
  return data?.map(item => ({
    code: item.heading_code,
    description: item.description || item.title,
    fullPath: chapterJaDesc ? `${chapterJaDesc} > ${item.description || item.title}` : `${chapterDesc} > ${item.description || item.title}`,
    count: 0
  })) || []
}

/**
 * 指定HeadingのSubheading一覧を取得
 */
export async function getHTSSubheadingsByHeading(headingCode: string) {
  const { data, error } = await supabase
    .from('hts_codes_subheadings')
    .select('subheading_code, description, title')
    .like('subheading_code', `${headingCode}%`)
    .order('subheading_code')
  
  if (error) throw error
  
  // Heading情報を取得
  const { data: headingData } = await supabase
    .from('hts_codes_headings')
    .select('description')
    .eq('heading_code', headingCode)
    .limit(1)
    .single()
  
  const headingDesc = headingData?.description || ''
  const chapterCode = headingCode.substring(0, 2)
  const chapterJaDesc = CHAPTER_JAPANESE_NAMES[chapterCode]
  
  return data?.map(item => ({
    code: item.subheading_code,
    description: item.description || item.title,
    fullPath: chapterJaDesc 
      ? `${chapterJaDesc} > ${headingDesc} > ${item.description || item.title}`
      : `${headingDesc} > ${item.description || item.title}`,
    count: 0
  })) || []
}

/**
 * 指定SubheadingのHTS完全コード一覧を取得
 */
export async function getHTSCodesBySubheading(subheadingCode: string) {
  const { data, error } = await supabase
    .from('hts_codes_details')
    .select('*')
    .eq('subheading_code', subheadingCode)
    .order('hts_number')
  
  if (error) throw error
  return data
}

/**
 * HTSコード詳細を取得
 */
export async function getHTSCodeDetail(code: string) {
  const { data, error } = await supabase
    .from('hts_codes_details')
    .select('*')
    .eq('hts_number', code)
    .single()
  
  if (error) throw error
  return data
}

/**
 * 原産国別追加関税を取得
 */
export async function getCountryTariffs(htsCode: string) {
  const { data, error } = await supabase
    .from('country_additional_tariffs')
    .select('*')
    .eq('hts_code', htsCode)
  
  if (error) return []
  return data || []
}

/**
 * HTSコード検索（商品名またはコードで検索）
 */
export async function searchHTSCodes(query: string) {
  const { data, error } = await supabase
    .from('hts_codes_details')
    .select('hts_number, description, general_rate, chapter_code, heading_code, subheading_code')
    .or(`description.ilike.%${query}%,hts_number.ilike.%${query}%`)
    .limit(100)
    .order('hts_number')
  
  if (error) throw error
  return data || []
}

/**
 * HTSコード総数を取得
 */
export async function getTotalHTSCodesCount() {
  const { count, error } = await supabase
    .from('hts_codes_details')
    .select('*', { count: 'exact', head: true })
  
  if (error) throw error
  return count || 0
}
