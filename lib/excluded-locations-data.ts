// 配送除外推奨国リスト（デフォルトで選択される国）
// 実務ベース：法的制裁国 + 詐欺多発国 + 通関厳しい国 + 配送インフラ脆弱国
// Version: 2025-01-03-v3

export const EXCLUDED_LOCATIONS_DATA = {
  domestic: {
    title: 'Domestic',
    items: [
      { code: 'AK_HI', name: 'Alaska/Hawaii', nameJa: 'アラスカ・ハワイ', reason: '配送コストが高い', selected: true },
      { code: 'APO_FPO', name: 'APO/FPO', nameJa: '軍事郵便', reason: '配送遅延が多い', selected: true },
      { code: 'US_PROTECTORATES', name: 'US Protectorates', nameJa: '米国保護領', reason: '配送遅延が多い', selected: true },
    ]
  },
  international: [
    {
      region: 'Africa',
      regionJa: 'アフリカ',
      countries: [
        { code: 'DZ', name: 'Algeria', nameJa: 'アルジェリア', reason: '通関が非常に厳しい', selected: true },
        { code: 'AO', name: 'Angola', nameJa: 'アンゴラ', reason: '配送インフラ脆弱', selected: true },
        { code: 'BJ', name: 'Benin', nameJa: 'ベナン', reason: '配送インフラ脆弱', selected: true },
        { code: 'BW', name: 'Botswana', nameJa: 'ボツワナ', reason: '配送困難', selected: true },
        { code: 'BF', name: 'Burkina Faso', nameJa: 'ブルキナファソ', reason: '治安リスク', selected: true },
        { code: 'BI', name: 'Burundi', nameJa: 'ブルンジ', reason: '治安リスク', selected: true },
        { code: 'CM', name: 'Cameroon', nameJa: 'カメルーン', reason: '配送困難', selected: true },
        { code: 'CV', name: 'Cape Verde Islands', nameJa: 'カーボベルデ', reason: '配送困難', selected: true },
        { code: 'CF', name: 'Central African Republic', nameJa: '中央アフリカ', reason: '治安リスク・配送不可', selected: true },
        { code: 'TD', name: 'Chad', nameJa: 'チャド', reason: '治安リスク', selected: true },
        { code: 'KM', name: 'Comoros', nameJa: 'コモロ', reason: '配送困難', selected: true },
        { code: 'CD', name: 'Congo, Democratic Republic of the', nameJa: 'コンゴ民主共和国', reason: '治安リスク・配送不可', selected: true },
        { code: 'CG', name: 'Congo, Republic of the', nameJa: 'コンゴ共和国', reason: '配送インフラ不安定', selected: true },
        { code: 'CI', name: 'Cote d Ivoire (Ivory Coast)', nameJa: 'コートジボワール', reason: '配送困難', selected: true },
        { code: 'DJ', name: 'Djibouti', nameJa: 'ジブチ', reason: '配送困難', selected: true },
        { code: 'EG', name: 'Egypt', nameJa: 'エジプト', reason: '購買層少ない・通関厳しい', selected: true },
        { code: 'GQ', name: 'Equatorial Guinea', nameJa: '赤道ギニア', reason: '配送困難', selected: true },
        { code: 'ER', name: 'Eritrea', nameJa: 'エリトリア', reason: '治安リスク・配送不可', selected: true },
        { code: 'ET', name: 'Ethiopia', nameJa: 'エチオピア', reason: '配送遅延・通関厳しい', selected: true },
        { code: 'GA', name: 'Gabon Republic', nameJa: 'ガボン', reason: '配送困難', selected: true },
        { code: 'GM', name: 'Gambia', nameJa: 'ガンビア', reason: '配送困難', selected: true },
        { code: 'GH', name: 'Ghana', nameJa: 'ガーナ', reason: '配送困難', selected: true },
        { code: 'GN', name: 'Guinea', nameJa: 'ギニア', reason: '配送インフラ脆弱', selected: true },
        { code: 'GW', name: 'Guinea-Bissau', nameJa: 'ギニアビサウ', reason: '配送インフラ脆弱', selected: true },
        { code: 'KE', name: 'Kenya', nameJa: 'ケニア', reason: '通関トラブル多発', selected: true },
        { code: 'LS', name: 'Lesotho', nameJa: 'レソト', reason: '配送困難', selected: true },
        { code: 'LR', name: 'Liberia', nameJa: 'リベリア', reason: '配送インフラ脆弱', selected: true },
        { code: 'LY', name: 'Libya', nameJa: 'リビア', reason: '治安リスク・配送不可', selected: true },
        { code: 'MG', name: 'Madagascar', nameJa: 'マダガスカル', reason: '配送困難', selected: true },
        { code: 'MW', name: 'Malawi', nameJa: 'マラウイ', reason: '配送困難', selected: true },
        { code: 'ML', name: 'Mali', nameJa: 'マリ', reason: '治安リスク', selected: true },
        { code: 'MR', name: 'Mauritania', nameJa: 'モーリタニア', reason: '配送困難', selected: true },
        { code: 'MU', name: 'Mauritius', nameJa: 'モーリシャス', reason: '配送困難', selected: true },
        { code: 'YT', name: 'Mayotte', nameJa: 'マヨット', reason: '配送困難', selected: true },
        { code: 'MA', name: 'Morocco', nameJa: 'モロッコ', reason: '配送困難', selected: true },
        { code: 'MZ', name: 'Mozambique', nameJa: 'モザンビーク', reason: '配送困難', selected: true },
        { code: 'NA', name: 'Namibia', nameJa: 'ナミビア', reason: '配送困難', selected: true },
        { code: 'NE', name: 'Niger', nameJa: 'ニジェール', reason: '治安リスク', selected: true },
        { code: 'NG', name: 'Nigeria', nameJa: 'ナイジェリア', reason: '詐欺被害多発・最高リスク', selected: true },
        { code: 'RE', name: 'Reunion', nameJa: 'レユニオン', reason: '配送困難', selected: true },
        { code: 'RW', name: 'Rwanda', nameJa: 'ルワンダ', reason: '配送困難', selected: true },
        { code: 'SH', name: 'Saint Helena', nameJa: 'セントヘレナ', reason: '配送困難', selected: true },
        { code: 'SN', name: 'Senegal', nameJa: 'セネガル', reason: '配送困難', selected: true },
        { code: 'SC', name: 'Seychelles', nameJa: 'セーシェル', reason: '配送困難', selected: true },
        { code: 'SL', name: 'Sierra Leone', nameJa: 'シエラレオネ', reason: '配送インフラ脆弱', selected: true },
        { code: 'SO', name: 'Somalia', nameJa: 'ソマリア', reason: '治安リスク・配送不可', selected: true },
        { code: 'ZA', name: 'South Africa', nameJa: '南アフリカ', reason: '配送遅延が多い', selected: true },
        { code: 'SS', name: 'South Sudan', nameJa: '南スーダン', reason: '治安リスク・配送不可', selected: true },
        { code: 'SZ', name: 'Swaziland', nameJa: 'スワジランド', reason: '配送困難', selected: true },
        { code: 'TZ', name: 'Tanzania', nameJa: 'タンザニア', reason: '配送困難', selected: true },
        { code: 'TG', name: 'Togo', nameJa: 'トーゴ', reason: '配送困難', selected: true },
        { code: 'TN', name: 'Tunisia', nameJa: 'チュニジア', reason: '配送困難', selected: true },
        { code: 'UG', name: 'Uganda', nameJa: 'ウガンダ', reason: '配送困難', selected: true },
        { code: 'EH', name: 'Western Sahara', nameJa: '西サハラ', reason: '配送不可', selected: true },
        { code: 'ZM', name: 'Zambia', nameJa: 'ザンビア', reason: '配送困難', selected: true },
        { code: 'ZW', name: 'Zimbabwe', nameJa: 'ジンバブエ', reason: '配送困難', selected: true },
      ]
    },
    {
      region: 'Asia',
      regionJa: 'アジア',
      countries: [
        { code: 'AF', name: 'Afghanistan', nameJa: 'アフガニスタン', reason: '治安リスク・配送不可', selected: true },
        { code: 'AM', name: 'Armenia', nameJa: 'アルメニア', reason: '配送遅延が多い', selected: true },
        { code: 'AZ', name: 'Azerbaijan Republic', nameJa: 'アゼルバイジャン', reason: '配送遅延が多い', selected: true },
        { code: 'BD', name: 'Bangladesh', nameJa: 'バングラデシュ', reason: '通関トラブル・配送遅延', selected: true },
        { code: 'BT', name: 'Bhutan', nameJa: 'ブータン', reason: '配送困難', selected: true },
        { code: 'BN', name: 'Brunei Darussalam', nameJa: 'ブルネイ', reason: '配送遅延が多い', selected: true },
        { code: 'KH', name: 'Cambodia', nameJa: 'カンボジア', reason: '配送インフラ不安定', selected: true },
        { code: 'CN', name: 'China', nameJa: '中国', reason: '巨大市場・FedEx/DHL可', selected: false },
        { code: 'GE', name: 'Georgia', nameJa: 'ジョージア', reason: '配送遅延が多い', selected: true },
        { code: 'IN', name: 'India', nameJa: 'インド', reason: '巨大市場・人口14億', selected: false },
        { code: 'ID', name: 'Indonesia', nameJa: 'インドネシア', reason: '東南アジア最大市場', selected: false },
        { code: 'IQ', name: 'Iraq', nameJa: 'イラク', reason: '治安リスク・配送不可', selected: true },
        { code: 'IL', name: 'Israel', nameJa: 'イスラエル', reason: '購買力高い', selected: false },
        { code: 'JP', name: 'Japan', nameJa: '日本', reason: '配送OK', selected: false },
        { code: 'KZ', name: 'Kazakhstan', nameJa: 'カザフスタン', reason: '通関厳しい', selected: true },
        { code: 'KG', name: 'Kyrgyzstan', nameJa: 'キルギス', reason: '配送困難', selected: true },
        { code: 'LA', name: 'Laos', nameJa: 'ラオス', reason: '配送インフラ不安定', selected: true },
        { code: 'MV', name: 'Maldives', nameJa: 'モルディブ', reason: '配送困難', selected: true },
        { code: 'MN', name: 'Mongolia', nameJa: 'モンゴル', reason: '配送遅延が多い', selected: true },
        { code: 'MM', name: 'Myanmar', nameJa: 'ミャンマー', reason: '軍事政権・配送不可', selected: true },
        { code: 'NP', name: 'Nepal', nameJa: 'ネパール', reason: '配送インフラ不安定', selected: true },
        { code: 'KP', name: 'North Korea', nameJa: '北朝鮮', reason: '米国制裁対象・配送不可', selected: true },
        { code: 'PK', name: 'Pakistan', nameJa: 'パキスタン', reason: '詐欺多発・高リスク', selected: true },
        { code: 'KR', name: 'South Korea', nameJa: '韓国', reason: '配送OK', selected: false },
        { code: 'LK', name: 'Sri Lanka', nameJa: 'スリランカ', reason: '配送遅延が多い', selected: true },
        { code: 'SY', name: 'Syria', nameJa: 'シリア', reason: '戦争・米国制裁・配送不可', selected: true },
        { code: 'TJ', name: 'Tajikistan', nameJa: 'タジキスタン', reason: '配送困難', selected: true },
        { code: 'TM', name: 'Turkmenistan', nameJa: 'トルクメニスタン', reason: '配送困難', selected: true },
        { code: 'UZ', name: 'Uzbekistan', nameJa: 'ウズベキスタン', reason: '通関厳しい・配送遅延', selected: true },
      ]
    },
    {
      region: 'Central America and Caribbean',
      regionJa: '中米・カリブ',
      countries: [
        { code: 'AI', name: 'Anguilla', nameJa: 'アンギラ', reason: '配送困難', selected: true },
        { code: 'AG', name: 'Antigua and Barbuda', nameJa: 'アンティグア・バーブーダ', reason: '配送困難', selected: true },
        { code: 'AW', name: 'Aruba', nameJa: 'アルバ', reason: '配送困難', selected: true },
        { code: 'BS', name: 'Bahamas', nameJa: 'バハマ', reason: '配送困難', selected: true },
        { code: 'BB', name: 'Barbados', nameJa: 'バルバドス', reason: '配送困難', selected: true },
        { code: 'BZ', name: 'Belize', nameJa: 'ベリーズ', reason: '配送困難', selected: true },
        { code: 'VG', name: 'British Virgin Islands', nameJa: '英領バージン諸島', reason: '配送困難', selected: true },
        { code: 'KY', name: 'Cayman Islands', nameJa: 'ケイマン諸島', reason: '配送困難', selected: true },
        { code: 'CR', name: 'Costa Rica', nameJa: 'コスタリカ', reason: '配送遅延が多い', selected: true },
        { code: 'CU', name: 'Cuba', nameJa: 'キューバ', reason: '米国制裁対象・配送不可', selected: true },
        { code: 'DM', name: 'Dominica', nameJa: 'ドミニカ国', reason: '配送困難', selected: true },
        { code: 'DO', name: 'Dominican Republic', nameJa: 'ドミニカ共和国', reason: '配送遅延が多い', selected: true },
        { code: 'SV', name: 'El Salvador', nameJa: 'エルサルバドル', reason: '配送遅延が多い', selected: true },
        { code: 'GD', name: 'Grenada', nameJa: 'グレナダ', reason: '配送困難', selected: true },
        { code: 'GP', name: 'Guadeloupe', nameJa: 'グアドループ', reason: '配送困難', selected: true },
        { code: 'GT', name: 'Guatemala', nameJa: 'グアテマラ', reason: '配送遅延が多い', selected: true },
        { code: 'HT', name: 'Haiti', nameJa: 'ハイチ', reason: '治安リスク・配送不可', selected: true },
        { code: 'HN', name: 'Honduras', nameJa: 'ホンジュラス', reason: '配送遅延が多い', selected: true },
        { code: 'JM', name: 'Jamaica', nameJa: 'ジャマイカ', reason: '配送遅延が多い', selected: true },
        { code: 'MQ', name: 'Martinique', nameJa: 'マルティニーク', reason: '配送困難', selected: true },
        { code: 'MS', name: 'Montserrat', nameJa: 'モントセラト', reason: '配送困難', selected: true },
        { code: 'AN', name: 'Netherlands Antilles', nameJa: 'オランダ領アンティル', reason: '配送困難', selected: true },
        { code: 'NI', name: 'Nicaragua', nameJa: 'ニカラグア', reason: '配送遅延が多い', selected: true },
        { code: 'PA', name: 'Panama', nameJa: 'パナマ', reason: '配送遅延が多い', selected: true },
        { code: 'PR', name: 'Puerto Rico', nameJa: 'プエルトリコ', reason: '配送遅延が多い', selected: true },
        { code: 'KN', name: 'Saint Kitts-Nevis', nameJa: 'セントキッツ・ネイビス', reason: '配送困難', selected: true },
        { code: 'LC', name: 'Saint Lucia', nameJa: 'セントルシア', reason: '配送困難', selected: true },
        { code: 'VC', name: 'Saint Vincent and the Grenadines', nameJa: 'セントビンセント・グレナディーン', reason: '配送困難', selected: true },
        { code: 'TT', name: 'Trinidad and Tobago', nameJa: 'トリニダード・トバゴ', reason: '配送遅延が多い', selected: true },
        { code: 'TC', name: 'Turks and Caicos Islands', nameJa: 'タークス・カイコス諸島', reason: '配送困難', selected: true },
        { code: 'VI', name: 'Virgin Islands (U.S.)', nameJa: '米領バージン諸島', reason: '配送困難', selected: true },
      ]
    },
    {
      region: 'Europe',
      regionJa: 'ヨーロッパ',
      countries: [
        { code: 'AL', name: 'Albania', nameJa: 'アルバニア', reason: '治安やや不安定', selected: true },
        { code: 'AD', name: 'Andorra', nameJa: 'アンドラ', reason: '配送可能', selected: false },
        { code: 'AT', name: 'Austria', nameJa: 'オーストリア', reason: '配送OK', selected: false },
        { code: 'BY', name: 'Belarus', nameJa: 'ベラルーシ', reason: '制裁対象国・配送不可', selected: true },
        { code: 'BE', name: 'Belgium', nameJa: 'ベルギー', reason: '通関トラブル', selected: false },
        { code: 'BA', name: 'Bosnia and Herzegovina', nameJa: 'ボスニア・ヘルツェゴビナ', reason: 'インフラ不安定', selected: true },
        { code: 'BG', name: 'Bulgaria', nameJa: 'ブルガリア', reason: '配送可能', selected: false },
        { code: 'HR', name: 'Croatia, Republic of', nameJa: 'クロアチア', reason: '配送可能', selected: false },
        { code: 'CY', name: 'Cyprus', nameJa: 'キプロス', reason: '配送可能', selected: false },
        { code: 'CZ', name: 'Czech Republic', nameJa: 'チェコ', reason: '配送可能', selected: false },
        { code: 'DK', name: 'Denmark', nameJa: 'デンマーク', reason: '配送OK', selected: false },
        { code: 'EE', name: 'Estonia', nameJa: 'エストニア', reason: '配送可能', selected: false },
        { code: 'FI', name: 'Finland', nameJa: 'フィンランド', reason: '配送遅延が多い', selected: false },
        { code: 'FR', name: 'France', nameJa: 'フランス', reason: '通関トラブル', selected: false },
        { code: 'DE', name: 'Germany', nameJa: 'ドイツ', reason: '通関トラブル', selected: false },
        { code: 'GI', name: 'Gibraltar', nameJa: 'ジブラルタル', reason: '配送可能', selected: false },
        { code: 'GR', name: 'Greece', nameJa: 'ギリシャ', reason: '配送可能', selected: false },
        { code: 'GG', name: 'Guernsey', nameJa: 'ガーンジー', reason: '配送可能', selected: false },
        { code: 'HU', name: 'Hungary', nameJa: 'ハンガリー', reason: '配送可能', selected: false },
        { code: 'IS', name: 'Iceland', nameJa: 'アイスランド', reason: '配送遅延が多い', selected: false },
        { code: 'IE', name: 'Ireland', nameJa: 'アイルランド', reason: '配送OK', selected: false },
        { code: 'IT', name: 'Italy', nameJa: 'イタリア', reason: '通関トラブル', selected: false },
        { code: 'JE', name: 'Jersey', nameJa: 'ジャージー', reason: '配送可能', selected: false },
        { code: 'LV', name: 'Latvia', nameJa: 'ラトビア', reason: '配送可能', selected: false },
        { code: 'LI', name: 'Liechtenstein', nameJa: 'リヒテンシュタイン', reason: '配送可能', selected: false },
        { code: 'LT', name: 'Lithuania', nameJa: 'リトアニア', reason: '配送可能', selected: false },
        { code: 'LU', name: 'Luxembourg', nameJa: 'ルクセンブルク', reason: '配送可能', selected: false },
        { code: 'MK', name: 'Macedonia', nameJa: '北マケドニア', reason: '配送可能', selected: false },
        { code: 'MT', name: 'Malta', nameJa: 'マルタ', reason: '配送可能', selected: false },
        { code: 'MD', name: 'Moldova', nameJa: 'モルドバ', reason: '経済的に不安定', selected: true },
        { code: 'MC', name: 'Monaco', nameJa: 'モナコ', reason: '配送可能', selected: false },
        { code: 'ME', name: 'Montenegro', nameJa: 'モンテネグロ', reason: '配送可能', selected: false },
        { code: 'NL', name: 'Netherlands', nameJa: 'オランダ', reason: '通関トラブル', selected: false },
        { code: 'NO', name: 'Norway', nameJa: 'ノルウェー', reason: '配送OK', selected: false },
        { code: 'PL', name: 'Poland', nameJa: 'ポーランド', reason: '配送可能', selected: false },
        { code: 'PT', name: 'Portugal', nameJa: 'ポルトガル', reason: '配送OK', selected: false },
        { code: 'RO', name: 'Romania', nameJa: 'ルーマニア', reason: '配送可能', selected: false },
        { code: 'RU', name: 'Russian Federation', nameJa: 'ロシア', reason: '戦争・制裁対象・配送不可', selected: true },
        { code: 'SM', name: 'San Marino', nameJa: 'サンマリノ', reason: '配送可能', selected: false },
        { code: 'RS', name: 'Serbia', nameJa: 'セルビア', reason: '地政学的リスク', selected: true },
        { code: 'SK', name: 'Slovakia', nameJa: 'スロバキア', reason: '配送可能', selected: false },
        { code: 'SI', name: 'Slovenia', nameJa: 'スロベニア', reason: '配送可能', selected: false },
        { code: 'ES', name: 'Spain', nameJa: 'スペイン', reason: '通関トラブル', selected: false },
        { code: 'SE', name: 'Sweden', nameJa: 'スウェーデン', reason: '配送遅延が多い', selected: false },
        { code: 'CH', name: 'Switzerland', nameJa: 'スイス', reason: '通関トラブル', selected: false },
        { code: 'SJ', name: 'Svalbard and Jan Mayen', nameJa: 'スヴァールバル・ヤンマイエン', reason: '配送可能', selected: false },
        { code: 'UA', name: 'Ukraine', nameJa: 'ウクライナ', reason: '戦争リスク・配送不可', selected: true },
        { code: 'GB', name: 'United Kingdom', nameJa: '英国', reason: '配送OK', selected: false },
        { code: 'VA', name: 'Vatican City State', nameJa: 'バチカン市国', reason: '配送可能', selected: false },
      ]
    },
    {
      region: 'Middle East',
      regionJa: '中東',
      countries: [
        { code: 'BH', name: 'Bahrain', nameJa: 'バーレーン', reason: '配送遅延が多い', selected: true },
        { code: 'IR', name: 'Iran', nameJa: 'イラン', reason: '米国制裁対象・配送不可', selected: true },
        { code: 'IQ', name: 'Iraq', nameJa: 'イラク', reason: '治安リスク・配送不可', selected: true },
        { code: 'IL', name: 'Israel', nameJa: 'イスラエル', reason: '配送遅延が多い', selected: true },
        { code: 'JO', name: 'Jordan', nameJa: 'ヨルダン', reason: '配送遅延が多い', selected: true },
        { code: 'KW', name: 'Kuwait', nameJa: 'クウェート', reason: '配送遅延が多い', selected: true },
        { code: 'LB', name: 'Lebanon', nameJa: 'レバノン', reason: '治安リスク', selected: true },
        { code: 'OM', name: 'Oman', nameJa: 'オマーン', reason: '配送遅延が多い', selected: true },
        { code: 'QA', name: 'Qatar', nameJa: 'カタール', reason: '配送遅延が多い', selected: false },
        { code: 'SA', name: 'Saudi Arabia', nameJa: 'サウジアラビア', reason: 'アラブ富裕層マーケット', selected: false },
        { code: 'TR', name: 'Turkey', nameJa: 'トルコ', reason: '通関トラブル多発', selected: true },
        { code: 'AE', name: 'United Arab Emirates', nameJa: 'アラブ首長国連邦（UAE/ドバイ）', reason: 'アラブ富裕層マーケット', selected: false },
        { code: 'YE', name: 'Yemen', nameJa: 'イエメン', reason: '戦争リスク・配送不可', selected: true },
      ]
    },
    {
      region: 'North America',
      regionJa: '北米',
      countries: [
        { code: 'BM', name: 'Bermuda', nameJa: 'バミューダ', reason: '配送困難', selected: true },
        { code: 'CA', name: 'Canada', nameJa: 'カナダ', reason: '配送OK', selected: false },
        { code: 'GL', name: 'Greenland', nameJa: 'グリーンランド', reason: '配送困難', selected: true },
        { code: 'MX', name: 'Mexico', nameJa: 'メキシコ', reason: '配送OK', selected: false },
        { code: 'PM', name: 'Saint Pierre and Miquelon', nameJa: 'サンピエール・ミクロン', reason: '配送困難', selected: true },
      ]
    },
    {
      region: 'Oceania',
      regionJa: 'オセアニア',
      countries: [
        { code: 'AS', name: 'American Samoa', nameJa: '米領サモア', reason: '配送困難', selected: true },
        { code: 'AU', name: 'Australia', nameJa: 'オーストラリア', reason: '配送OK', selected: false },
        { code: 'CK', name: 'Cook Islands', nameJa: 'クック諸島', reason: '配送困難', selected: true },
        { code: 'FJ', name: 'Fiji', nameJa: 'フィジー', reason: '配送困難', selected: true },
        { code: 'PF', name: 'French Polynesia', nameJa: '仏領ポリネシア', reason: '配送困難', selected: true },
        { code: 'GU', name: 'Guam', nameJa: 'グアム', reason: '配送困難', selected: true },
        { code: 'KI', name: 'Kiribati', nameJa: 'キリバス', reason: '配送困難', selected: true },
        { code: 'MH', name: 'Marshall Islands', nameJa: 'マーシャル諸島', reason: '配送困難', selected: true },
        { code: 'FM', name: 'Micronesia', nameJa: 'ミクロネシア', reason: '配送困難', selected: true },
        { code: 'NR', name: 'Nauru', nameJa: 'ナウル', reason: '配送困難', selected: true },
        { code: 'NC', name: 'New Caledonia', nameJa: 'ニューカレドニア', reason: '配送困難', selected: true },
        { code: 'NZ', name: 'New Zealand', nameJa: 'ニュージーランド', reason: '配送OK', selected: false },
        { code: 'NU', name: 'Niue', nameJa: 'ニウエ', reason: '配送困難', selected: true },
        { code: 'PW', name: 'Palau', nameJa: 'パラオ', reason: '配送困難', selected: true },
        { code: 'PG', name: 'Papua New Guinea', nameJa: 'パプアニューギニア', reason: '配送困難', selected: true },
        { code: 'SB', name: 'Solomon Islands', nameJa: 'ソロモン諸島', reason: '配送困難', selected: true },
        { code: 'TO', name: 'Tonga', nameJa: 'トンガ', reason: '配送困難', selected: true },
        { code: 'TV', name: 'Tuvalu', nameJa: 'ツバル', reason: '配送困難', selected: true },
        { code: 'VU', name: 'Vanuatu', nameJa: 'バヌアツ', reason: '配送困難', selected: true },
        { code: 'WF', name: 'Wallis and Futuna', nameJa: 'ウォリス・フツナ', reason: '配送困難', selected: true },
        { code: 'WS', name: 'Western Samoa', nameJa: 'サモア', reason: '配送困難', selected: true },
      ]
    },
    {
      region: 'Southeast Asia',
      regionJa: '東南アジア',
      countries: [
        { code: 'BN', name: 'Brunei Darussalam', nameJa: 'ブルネイ', reason: '配送遅延が多い', selected: false },
        { code: 'KH', name: 'Cambodia', nameJa: 'カンボジア', reason: '配送遅延が多い', selected: false },
        { code: 'HK', name: 'Hong Kong', nameJa: '香港', reason: '配送OK', selected: false },
        { code: 'ID', name: 'Indonesia', nameJa: 'インドネシア', reason: '通関トラブル多発', selected: true },
        { code: 'LA', name: 'Laos', nameJa: 'ラオス', reason: '配送困難', selected: false },
        { code: 'MO', name: 'Macau', nameJa: 'マカオ', reason: '配送遅延が多い', selected: false },
        { code: 'MY', name: 'Malaysia', nameJa: 'マレーシア', reason: '配送遅延が多い', selected: false },
        { code: 'PH', name: 'Philippines', nameJa: 'フィリピン', reason: '配送遅延が多い', selected: true },
        { code: 'SG', name: 'Singapore', nameJa: 'シンガポール', reason: '配送OK', selected: false },
        { code: 'TW', name: 'Taiwan', nameJa: '台湾', reason: '配送OK', selected: false },
        { code: 'TH', name: 'Thailand', nameJa: 'タイ', reason: '配送OK', selected: false },
        { code: 'VN', name: 'Vietnam', nameJa: 'ベトナム', reason: '配送OK', selected: false },
      ]
    },
    {
      region: 'South America',
      regionJa: '南米',
      countries: [
        { code: 'AR', name: 'Argentina', nameJa: 'アルゼンチン', reason: '通関非常に厳しい・高額関税', selected: true },
        { code: 'BO', name: 'Bolivia', nameJa: 'ボリビア', reason: '配送困難', selected: true },
        { code: 'BR', name: 'Brazil', nameJa: 'ブラジル', reason: '通関非常に厳しい・高額関税', selected: true },
        { code: 'CL', name: 'Chile', nameJa: 'チリ', reason: '配送遅延が多い', selected: true },
        { code: 'CO', name: 'Colombia', nameJa: 'コロンビア', reason: '配送遅延が多い', selected: true },
        { code: 'EC', name: 'Ecuador', nameJa: 'エクアドル', reason: '配送困難', selected: true },
        { code: 'FK', name: 'Falkland Islands (Islas Malvinas)', nameJa: 'フォークランド諸島', reason: '配送困難', selected: true },
        { code: 'GF', name: 'French Guiana', nameJa: '仏領ギアナ', reason: '配送困難', selected: true },
        { code: 'GY', name: 'Guyana', nameJa: 'ガイアナ', reason: '配送困難', selected: true },
        { code: 'PY', name: 'Paraguay', nameJa: 'パラグアイ', reason: '配送困難', selected: true },
        { code: 'PE', name: 'Peru', nameJa: 'ペルー', reason: '配送遅延が多い', selected: true },
        { code: 'SR', name: 'Suriname', nameJa: 'スリナム', reason: '配送困難', selected: true },
        { code: 'UY', name: 'Uruguay', nameJa: 'ウルグアイ', reason: '配送困難', selected: true },
        { code: 'VE', name: 'Venezuela', nameJa: 'ベネズエラ', reason: '政情不安・配送不可', selected: true },
      ]
    },
  ],
  other: {
    title: 'Other',
    items: [
      { code: 'PO_BOX', name: 'PO Box', nameJa: '私書箱', reason: '私書箱への配送は不可', selected: true },
    ]
  }
}

// 除外国のデフォルト選択（selected: trueの国のみ）
export function getDefaultExcludedLocations() {
  const excluded: string[] = []
  
  // Domestic
  EXCLUDED_LOCATIONS_DATA.domestic.items.forEach(item => {
    if (item.selected) excluded.push(item.code)
  })
  
  // International
  EXCLUDED_LOCATIONS_DATA.international.forEach(region => {
    region.countries.forEach(country => {
      if (country.selected) excluded.push(country.code)
    })
  })
  
  // Other
  EXCLUDED_LOCATIONS_DATA.other.items.forEach(item => {
    if (item.selected) excluded.push(item.code)
  })
  
  return excluded
}

// 選択された国の数をカウント
export function getExcludedCount() {
  return getDefaultExcludedLocations().length
}
