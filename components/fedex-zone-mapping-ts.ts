// ================================================================================
// FedEx International Priority ゾーンマッピング
// 生成日: 2025-09-30
// 総国数: 195国
// 用途: 国コード → FedExゾーンコードの変換
// ================================================================================

export interface FedexZoneMapping {
  countryCode: string;
  countryNameJa: string;
  countryNameEn: string;
  zoneCode: string;
  zoneName: string;
}

/**
 * 国コード → FedExゾーンコードの簡易マップ
 * 高速検索用
 */
export const FEDEX_ZONE_MAP: Record<string, string> = {
  // Zone A: マカオ
  'MO': 'FEDEX_ZONE_A',
  
  // Zone D: アジア太平洋諸島（20国）
  'AS': 'FEDEX_ZONE_D', // 米領サモア
  'BN': 'FEDEX_ZONE_D', // ブルネイ
  'KH': 'FEDEX_ZONE_D', // カンボジア
  'CK': 'FEDEX_ZONE_D', // クック諸島
  'FJ': 'FEDEX_ZONE_D', // フィジー
  'PF': 'FEDEX_ZONE_D', // 仏領ポリネシア
  'GU': 'FEDEX_ZONE_D', // グアム
  'KI': 'FEDEX_ZONE_D', // キリバス
  'LA': 'FEDEX_ZONE_D', // ラオス
  'MH': 'FEDEX_ZONE_D', // マーシャル諸島
  'FM': 'FEDEX_ZONE_D', // ミクロネシア連邦
  'NR': 'FEDEX_ZONE_D', // ナウル
  'NC': 'FEDEX_ZONE_D', // ニューカレドニア
  'MP': 'FEDEX_ZONE_D', // 北マリアナ諸島
  'PW': 'FEDEX_ZONE_D', // パラオ
  'PG': 'FEDEX_ZONE_D', // パプアニューギニア
  'WS': 'FEDEX_ZONE_D', // サモア
  'SB': 'FEDEX_ZONE_D', // ソロモン諸島
  'TO': 'FEDEX_ZONE_D', // トンガ
  'VU': 'FEDEX_ZONE_D', // バヌアツ
  
  // Zone E: 米国西部（郵便番号で判定）
  // 注: アプリ側でgetFedexZone()関数を使用
  
  // Zone F: 米国東部/カナダ/メキシコ他（5国）
  'CA': 'FEDEX_ZONE_F', // カナダ
  'MX': 'FEDEX_ZONE_F', // メキシコ
  'PR': 'FEDEX_ZONE_F', // プエルトリコ
  'VI': 'FEDEX_ZONE_F', // 米領バージン諸島
  'US': 'FEDEX_ZONE_F', // アメリカ合衆国（デフォルト、郵便番号で上書き可能）
  
  // Zone G: 中南米（40国）
  'AI': 'FEDEX_ZONE_G', // アンギラ
  'AG': 'FEDEX_ZONE_G', // アンティグア
  'AR': 'FEDEX_ZONE_G', // アルゼンチン
  'AW': 'FEDEX_ZONE_G', // アルバ
  'BS': 'FEDEX_ZONE_G', // バハマ諸島
  'BB': 'FEDEX_ZONE_G', // バルバドス
  'BZ': 'FEDEX_ZONE_G', // ベリーズ
  'BM': 'FEDEX_ZONE_G', // バミューダ
  'BO': 'FEDEX_ZONE_G', // ボリビア
  'BR': 'FEDEX_ZONE_G', // ブラジル
  'KY': 'FEDEX_ZONE_G', // ケイマン諸島
  'CL': 'FEDEX_ZONE_G', // チリ
  'CO': 'FEDEX_ZONE_G', // コロンビア
  'CR': 'FEDEX_ZONE_G', // コスタリカ
  'CW': 'FEDEX_ZONE_G', // キュラソー
  'DM': 'FEDEX_ZONE_G', // ドミニカ
  'DO': 'FEDEX_ZONE_G', // ドミニカ共和国
  'EC': 'FEDEX_ZONE_G', // エクアドル
  'SV': 'FEDEX_ZONE_G', // エルサルバドル
  'FK': 'FEDEX_ZONE_G', // フォークランド諸島
  'GF': 'FEDEX_ZONE_G', // 仏領ギアナ
  'GD': 'FEDEX_ZONE_G', // グレナダ
  'GP': 'FEDEX_ZONE_G', // グアドループ
  'GT': 'FEDEX_ZONE_G', // グアテマラ
  'GY': 'FEDEX_ZONE_G', // ガイアナ
  'HT': 'FEDEX_ZONE_G', // ハイチ
  'HN': 'FEDEX_ZONE_G', // ホンジュラス
  'JM': 'FEDEX_ZONE_G', // ジャマイカ
  'MQ': 'FEDEX_ZONE_G', // マルティニーク
  'MS': 'FEDEX_ZONE_G', // モントセラト
  'NI': 'FEDEX_ZONE_G', // ニカラグア
  'PA': 'FEDEX_ZONE_G', // パナマ
  'PY': 'FEDEX_ZONE_G', // パラグアイ
  'PE': 'FEDEX_ZONE_G', // ペルー
  'KN': 'FEDEX_ZONE_G', // セントクリストファー・ネイビス
  'LC': 'FEDEX_ZONE_G', // セントルシア
  'VC': 'FEDEX_ZONE_G', // セントビンセント及びグレナディーン諸島
  'SR': 'FEDEX_ZONE_G', // スリナム
  'TT': 'FEDEX_ZONE_G', // トリニダード・トバゴ
  'UY': 'FEDEX_ZONE_G', // ウルグアイ
  'VE': 'FEDEX_ZONE_G', // ベネズエラ
  
  // Zone H: ヨーロッパ1（18国）
  'AT': 'FEDEX_ZONE_H', // オーストリア
  'CZ': 'FEDEX_ZONE_H', // チェコ
  'DK': 'FEDEX_ZONE_H', // デンマーク
  'FI': 'FEDEX_ZONE_H', // フィンランド
  'GR': 'FEDEX_ZONE_H', // ギリシャ
  'HU': 'FEDEX_ZONE_H', // ハンガリー
  'IS': 'FEDEX_ZONE_H', // アイスランド
  'IE': 'FEDEX_ZONE_H', // アイルランド
  'LU': 'FEDEX_ZONE_H', // ルクセンブルク
  'NO': 'FEDEX_ZONE_H', // ノルウェー
  'PL': 'FEDEX_ZONE_H', // ポーランド
  'PT': 'FEDEX_ZONE_H', // ポルトガル
  'RO': 'FEDEX_ZONE_H', // ルーマニア
  'SK': 'FEDEX_ZONE_H', // スロバキア
  'SI': 'FEDEX_ZONE_H', // スロベニア
  'ES': 'FEDEX_ZONE_H', // スペイン
  'SE': 'FEDEX_ZONE_H', // スウェーデン
  'CH': 'FEDEX_ZONE_H', // スイス
  
  // Zone I: ヨーロッパ2/中東（33国）
  'AL': 'FEDEX_ZONE_I', // アルバニア
  'AD': 'FEDEX_ZONE_I', // アンドラ
  'AM': 'FEDEX_ZONE_I', // アルメニア
  'AZ': 'FEDEX_ZONE_I', // アゼルバイジャン
  'BH': 'FEDEX_ZONE_I', // バーレーン
  'BY': 'FEDEX_ZONE_I', // ベラルーシ
  'BA': 'FEDEX_ZONE_I', // ボスニア・ヘルツェゴビナ
  'BG': 'FEDEX_ZONE_I', // ブルガリア
  'HR': 'FEDEX_ZONE_I', // クロアチア
  'CY': 'FEDEX_ZONE_I', // キプロス
  'EE': 'FEDEX_ZONE_I', // エストニア
  'FO': 'FEDEX_ZONE_I', // フェロー諸島
  'GE': 'FEDEX_ZONE_I', // ジョージア
  'GI': 'FEDEX_ZONE_I', // ジブラルタル
  'GL': 'FEDEX_ZONE_I', // グリーンランド
  'IQ': 'FEDEX_ZONE_I', // イラク
  'IL': 'FEDEX_ZONE_I', // イスラエル
  'JO': 'FEDEX_ZONE_I', // ヨルダン
  'KZ': 'FEDEX_ZONE_I', // カザフスタン
  'KW': 'FEDEX_ZONE_I', // クウェート
  'KG': 'FEDEX_ZONE_I', // キルギス
  'LV': 'FEDEX_ZONE_I', // ラトビア
  'LB': 'FEDEX_ZONE_I', // レバノン
  'LI': 'FEDEX_ZONE_I', // リヒテンシュタイン
  'LT': 'FEDEX_ZONE_I', // リトアニア
  'MK': 'FEDEX_ZONE_I', // 北マケドニア
  'MT': 'FEDEX_ZONE_I', // マルタ
  'MD': 'FEDEX_ZONE_I', // モルドバ
  'ME': 'FEDEX_ZONE_I', // モンテネグロ
  'OM': 'FEDEX_ZONE_I', // オマーン
  'QA': 'FEDEX_ZONE_I', // カタール
  'RS': 'FEDEX_ZONE_I', // セルビア
  'TJ': 'FEDEX_ZONE_I', // タジキスタン
  'TR': 'FEDEX_ZONE_I', // トルコ
  'TM': 'FEDEX_ZONE_I', // トルクメニスタン
  'UA': 'FEDEX_ZONE_I', // ウクライナ
  'AE': 'FEDEX_ZONE_I', // アラブ首長国連邦
  'UZ': 'FEDEX_ZONE_I', // ウズベキスタン
  
  // Zone J: 中東/アフリカ（55国）
  'AF': 'FEDEX_ZONE_J', // アフガニスタン
  'DZ': 'FEDEX_ZONE_J', // アルジェリア
  'AO': 'FEDEX_ZONE_J', // アンゴラ
  'BD': 'FEDEX_ZONE_J', // バングラデシュ
  'BJ': 'FEDEX_ZONE_J', // ベナン
  'BW': 'FEDEX_ZONE_J', // ボツワナ
  'BF': 'FEDEX_ZONE_J', // ブルキナファソ
  'BI': 'FEDEX_ZONE_J', // ブルンジ
  'CM': 'FEDEX_ZONE_J', // カメルーン
  'CV': 'FEDEX_ZONE_J', // カーボベルデ
  'CF': 'FEDEX_ZONE_J', // 中央アフリカ共和国
  'TD': 'FEDEX_ZONE_J', // チャド
  'KM': 'FEDEX_ZONE_J', // コモロ
  'CG': 'FEDEX_ZONE_J', // コンゴ共和国
  'CD': 'FEDEX_ZONE_J', // コンゴ民主共和国
  'CI': 'FEDEX_ZONE_J', // コートジボワール
  'DJ': 'FEDEX_ZONE_J', // ジブチ
  'EG': 'FEDEX_ZONE_J', // エジプト
  'GQ': 'FEDEX_ZONE_J', // 赤道ギニア
  'ER': 'FEDEX_ZONE_J', // エリトリア
  'ET': 'FEDEX_ZONE_J', // エチオピア
  'GA': 'FEDEX_ZONE_J', // ガボン
  'GM': 'FEDEX_ZONE_J', // ガンビア
  'GH': 'FEDEX_ZONE_J', // ガーナ
  'GN': 'FEDEX_ZONE_J', // ギニア
  'GW': 'FEDEX_ZONE_J', // ギニアビサウ
  'IR': 'FEDEX_ZONE_J', // イラン
  'KE': 'FEDEX_ZONE_J', // ケニア
  'LS': 'FEDEX_ZONE_J', // レソト
  'LR': 'FEDEX_ZONE_J', // リベリア
  'LY': 'FEDEX_ZONE_J', // リビア
  'MG': 'FEDEX_ZONE_J', // マダガスカル
  'MW': 'FEDEX_ZONE_J', // マラウイ
  'ML': 'FEDEX_ZONE_J', // マリ
  'MR': 'FEDEX_ZONE_J', // モーリタニア
  'MU': 'FEDEX_ZONE_J', // モーリシャス
  'YT': 'FEDEX_ZONE_J', // マヨット
  'MA': 'FEDEX_ZONE_J', // モロッコ
  'MZ': 'FEDEX_ZONE_J', // モザンビーク
  'NA': 'FEDEX_ZONE_J', // ナミビア
  'NE': 'FEDEX_ZONE_J', // ニジェール
  'NG': 'FEDEX_ZONE_J', // ナイジェリア
  'RE': 'FEDEX_ZONE_J', // レユニオン
  'RW': 'FEDEX_ZONE_J', // ルワンダ
  'ST': 'FEDEX_ZONE_J', // サントメ・プリンシペ
  'SN': 'FEDEX_ZONE_J', // セネガル
  'SC': 'FEDEX_ZONE_J', // セーシェル
  'SL': 'FEDEX_ZONE_J', // シエラレオネ
  'SO': 'FEDEX_ZONE_J', // ソマリア
  'ZA': 'FEDEX_ZONE_J', // 南アフリカ
  'SS': 'FEDEX_ZONE_J', // 南スーダン
  'SD': 'FEDEX_ZONE_J', // スーダン
  'SZ': 'FEDEX_ZONE_J', // エスワティニ
  'TZ': 'FEDEX_ZONE_J', // タンザニア
  'TG': 'FEDEX_ZONE_J', // トーゴ
  'TN': 'FEDEX_ZONE_J', // チュニジア
  'UG': 'FEDEX_ZONE_J', // ウガンダ
  'ZM': 'FEDEX_ZONE_J', // ザンビア
  'ZW': 'FEDEX_ZONE_J', // ジンバブエ
  
  // Zone K: 中国南部（郵便番号で判定）
  // 注: アプリ側でgetFedexZone()関数を使用
  
  // Zone M: 欧州主要国（8国）
  'BE': 'FEDEX_ZONE_M', // ベルギー
  'FR': 'FEDEX_ZONE_M', // フランス
  'DE': 'FEDEX_ZONE_M', // ドイツ
  'IT': 'FEDEX_ZONE_M', // イタリア
  'NL': 'FEDEX_ZONE_M', // オランダ
  'SM': 'FEDEX_ZONE_M', // サンマリノ
  'GB': 'FEDEX_ZONE_M', // イギリス
  'VA': 'FEDEX_ZONE_M', // バチカン市国
  
  // Zone N: ベトナム
  'VN': 'FEDEX_ZONE_N',
  
  // Zone O: インド
  'IN': 'FEDEX_ZONE_O',
  
  // Zone Q: マレーシア
  'MY': 'FEDEX_ZONE_Q',
  
  // Zone R: タイ
  'TH': 'FEDEX_ZONE_R',
  
  // Zone S: フィリピン
  'PH': 'FEDEX_ZONE_S',
  
  // Zone T: インドネシア
  'ID': 'FEDEX_ZONE_T',
  
  // Zone U: オーストラリア/ニュージーランド（2国）
  'AU': 'FEDEX_ZONE_U',
  'NZ': 'FEDEX_ZONE_U',
  
  // Zone V: 香港
  'HK': 'FEDEX_ZONE_V',
  
  // Zone W: 中国（南部除く）
  'CN': 'FEDEX_ZONE_W', // デフォルト、郵便番号で上書き可能
  
  // Zone X: 台湾
  'TW': 'FEDEX_ZONE_X',
  
  // Zone Y: シンガポール
  'SG': 'FEDEX_ZONE_Y',
  
  // Zone Z: 韓国
  'KR': 'FEDEX_ZONE_Z',
};

/**
 * 国コードからFedExゾーンコードを取得
 * @param countryCode ISO国コード（例: 'US', 'JP', 'GB'）
 * @param postalCode 郵便番号（米国・中国の場合に使用）
 * @returns FedExゾーンコード（例: 'FEDEX_ZONE_A'）またはnull
 */
export function getFedexZone(countryCode: string, postalCode?: string): string | null {
  // 米国の場合、郵便番号で判定
  if (countryCode === 'US' && postalCode) {
    const zip = parseInt(postalCode.replace(/\D/g, '').substring(0, 5));
    
    if (!isNaN(zip)) {
      // Zone E: 米国西部
      if ((zip >= 80000 && zip <= 81699) ||  // コロラド州（一部）
          (zip >= 83200 && zip <= 83999) ||  // アイダホ州（一部）
          (zip >= 84000 && zip <= 84799) ||  // ユタ州
          (zip >= 89000 && zip <= 89899) ||  // ネバダ州
          (zip >= 90000 && zip <= 96699) ||  // カリフォルニア州
          (zip >= 97000 && zip <= 97999) ||  // オレゴン州
          (zip >= 98000 && zip <= 99499)) {  // ワシントン州
        return 'FEDEX_ZONE_E';
      }
    }
    
    // その他の米国はZone F
    return 'FEDEX_ZONE_F';
  }
  
  // 中国の場合、省コードで判定
  if (countryCode === 'CN' && postalCode) {
    const provinceCode = postalCode.replace(/\D/g, '').substring(0, 2);
    
    // Zone K: 中国南部（福建省・広東省）
    // 福建省: 350000-369999
    // 広東省: 510000-529999
    if (provinceCode === '35' || provinceCode === '36' ||  // 福建省
        provinceCode === '51' || provinceCode === '52') {  // 広東省
      return 'FEDEX_ZONE_K';
    }
    
    // その他の中国はZone W
    return 'FEDEX_ZONE_W';
  }
  
  // 通常の国コード検索
  return FEDEX_ZONE_MAP[countryCode] || null;
}

/**
 * FedExゾーンコードからゾーン名を取得
 * @param zoneCode FedExゾーンコード
 * @returns ゾーン名（日本語）
 */
export function getFedexZoneName(zoneCode: string): string {
  const zoneNames: Record<string, string> = {
    'FEDEX_ZONE_A': 'マカオ',
    'FEDEX_ZONE_D': 'アジア太平洋諸島',
    'FEDEX_ZONE_E': '米国西部',
    'FEDEX_ZONE_F': '米国東部/カナダ他',
    'FEDEX_ZONE_G': '中南米',
    'FEDEX_ZONE_H': 'ヨーロッパ1',
    'FEDEX_ZONE_I': 'ヨーロッパ2/中東',
    'FEDEX_ZONE_J': '中東/アフリカ',
    'FEDEX_ZONE_K': '中国南部',
    'FEDEX_ZONE_M': '欧州主要国',
    'FEDEX_ZONE_N': 'ベトナム',
    'FEDEX_ZONE_O': 'インド',
    'FEDEX_ZONE_Q': 'マレーシア',
    'FEDEX_ZONE_R': 'タイ',
    'FEDEX_ZONE_S': 'フィリピン',
    'FEDEX_ZONE_T': 'インドネシア',
    'FEDEX_ZONE_U': '豪州/NZ',
    'FEDEX_ZONE_V': '香港',
    'FEDEX_ZONE_W': '中国（南部除く）',
    'FEDEX_ZONE_X': '台湾',
    'FEDEX_ZONE_Y': 'シンガポール',
    'FEDEX_ZONE_Z': '韓国',
  };
  
  return zoneNames[zoneCode] || '不明';
}

/**
 * 全ゾーンのリストを取得
 * @returns ゾーンコードとゾーン名の配列
 */
export function getAllFedexZones(): Array<{ code: string; name: string }> {
  return [
    { code: 'FEDEX_ZONE_A', name: 'マカオ' },
    { code: 'FEDEX_ZONE_D', name: 'アジア太平洋諸島' },
    { code: 'FEDEX_ZONE_E', name: '米国西部' },
    { code: 'FEDEX_ZONE_F', name: '米国東部/カナダ他' },
    { code: 'FEDEX_ZONE_G', name: '中南米' },
    { code: 'FEDEX_ZONE_H', name: 'ヨーロッパ1' },
    { code: 'FEDEX_ZONE_I', name: 'ヨーロッパ2/中東' },
    { code: 'FEDEX_ZONE_J', name: '中東/アフリカ' },
    { code: 'FEDEX_ZONE_K', name: '中国南部' },
    { code: 'FEDEX_ZONE_M', name: '欧州主要国' },
    { code: 'FEDEX_ZONE_N', name: 'ベトナム' },
    { code: 'FEDEX_ZONE_O', name: 'インド' },
    { code: 'FEDEX_ZONE_Q', name: 'マレーシア' },
    { code: 'FEDEX_ZONE_R', name: 'タイ' },
    { code: 'FEDEX_ZONE_S', name: 'フィリピン' },
    { code: 'FEDEX_ZONE_T', name: 'インドネシア' },
    { code: 'FEDEX_ZONE_U', name: '豪州/NZ' },
    { code: 'FEDEX_ZONE_V', name: '香港' },
    { code: 'FEDEX_ZONE_W', name: '中国（南部除く）' },
    { code: 'FEDEX_ZONE_X', name: '台湾' },
    { code: 'FEDEX_ZONE_Y', name: 'シンガポール' },
    { code: 'FEDEX_ZONE_Z', name: '韓国' },
  ];
}