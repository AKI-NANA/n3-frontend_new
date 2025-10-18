import React from 'react'
import { ShoppingCart, Globe, Package, Trophy, Gamepad2, Zap } from 'lucide-react'

// プラットフォームデータの型定義
interface PlatformItem {
  id: string
  name: string
  status: 'active' | 'beta' | 'development'
  url: string
  count: number
}

interface PlatformCategory {
  name: string
  icon: React.ReactElement
  items: PlatformItem[]
}

// プラットフォームデータ
export const platformsData: Record<string, PlatformCategory> = {
  auction: {
    name: 'オークション・フリマ',
    icon: <ShoppingCart className="h-4 w-4" />,
    items: [
      { id: 'yahoo', name: 'Yahoo!オークション', status: 'active', url: '/02_scraping/platforms/yahoo', count: 8456 },
      { id: 'mercari', name: 'メルカリ', status: 'active', url: '/02_scraping/platforms/mercari_main', count: 6341 },
      { id: 'mercari-shops', name: 'メルカリShops', status: 'active', url: '/02_scraping/platforms/mercari_shops', count: 2134 },
      { id: 'yahoo-flea', name: 'ヤフーフリマ', status: 'active', url: '/02_scraping/platforms/yahoo_fleamarket', count: 3234 }
    ]
  },
  ec: {
    name: 'ECサイト',
    icon: <Globe className="h-4 w-4" />,
    items: [
      { id: 'rakuten', name: '楽天市場', status: 'active', url: '/02_scraping/platforms/rakuten_main', count: 12567 },
      { id: 'amazon', name: 'Amazon (ASIN)', status: 'active', url: '/02_scraping/asin_upload', count: 15678 },
      { id: 'yodobashi', name: 'ヨドバシカメラ', status: 'active', url: '/02_scraping/platforms/yodobashi', count: 3876 },
      { id: 'monotaro', name: 'モノタロウ', status: 'beta', url: '/02_scraping/platforms/monotaro', count: 1234 }
    ]
  },
  tcg: {
    name: 'トレーディングカード',
    icon: <Package className="h-4 w-4" />,
    items: [
      { id: 'singlestar', name: 'シングルスター', status: 'active', url: '/02_scraping/platforms/tcg', count: 2987 },
      { id: 'hareruya-mtg', name: '晴れる屋MTG', status: 'active', url: '/02_scraping/platforms/tcg', count: 3234 },
      { id: 'hareruya2', name: '晴れる屋2', status: 'active', url: '/02_scraping/platforms/tcg', count: 2156 },
      { id: 'fullahead', name: 'フルアヘッド', status: 'active', url: '/02_scraping/platforms/tcg', count: 1456 },
      { id: 'cardrush', name: 'カードラッシュ', status: 'active', url: '/02_scraping/platforms/tcg', count: 1678 },
      { id: 'yuyu-tei', name: '遊々亭', status: 'active', url: '/02_scraping/platforms/tcg', count: 2345 },
      { id: 'dorasuta', name: 'ドラゴンスター', status: 'active', url: '/02_scraping/platforms/tcg', count: 1234 },
      { id: 'furu1', name: '駿河屋TCG', status: 'active', url: '/02_scraping/platforms/tcg', count: 3456 },
      { id: 'pokemon-center', name: 'ポケモンセンター', status: 'development', url: '/02_scraping/platforms/tcg', count: 0 }
    ]
  },
  golf: {
    name: 'ゴルフ用品',
    icon: <Trophy className="h-4 w-4" />,
    items: [
      { id: 'golf-partner', name: 'ゴルフパートナー', status: 'active', url: '/02_scraping/platforms/golf', count: 4543 },
      { id: 'golf5', name: 'ゴルフ5', status: 'active', url: '/02_scraping/platforms/golf', count: 3221 },
      { id: 'alpen', name: 'アルペン', status: 'active', url: '/02_scraping/platforms/golf', count: 2876 },
      { id: 'golf-kids', name: 'ゴルフキッズ', status: 'active', url: '/02_scraping/platforms/golf', count: 1543 },
      { id: 'victoria-golf', name: 'ヴィクトリアゴルフ', status: 'active', url: '/02_scraping/platforms/golf', count: 2134 },
      { id: 'gdo', name: 'GDO', status: 'beta', url: '/02_scraping/platforms/golf', count: 876 },
      { id: 'golf-do', name: 'ゴルフドゥ', status: 'active', url: '/02_scraping/platforms/golf', count: 1234 },
      { id: 'honma-golf', name: '本間ゴルフ', status: 'development', url: '/02_scraping/platforms/golf', count: 0 }
    ]
  },
  hobby: {
    name: 'ホビー・玩具',
    icon: <Gamepad2 className="h-4 w-4" />,
    items: [
      { id: 'amiami', name: 'あみあみ', status: 'active', url: '/02_scraping/platforms/hobby', count: 5432 },
      { id: 'hobby-station', name: 'ホビーステーション', status: 'active', url: '/02_scraping/platforms/hobby', count: 3211 },
      { id: 'mandarake', name: 'まんだらけ', status: 'active', url: '/02_scraping/platforms/hobby', count: 4567 },
      { id: 'hobby-search', name: 'ホビーサーチ', status: 'active', url: '/02_scraping/platforms/hobby', count: 2345 },
      { id: 'volks', name: 'ボークス', status: 'active', url: '/02_scraping/platforms/hobby', count: 1876 },
      { id: 'kotobukiya', name: 'コトブキヤ', status: 'active', url: '/02_scraping/platforms/hobby', count: 1543 },
      { id: 'goodsmile', name: 'グッドスマイル', status: 'active', url: '/02_scraping/platforms/hobby', count: 2134 },
      { id: 'bandai', name: 'バンダイ', status: 'active', url: '/02_scraping/platforms/hobby', count: 3456 },
      { id: 'takara-tomy', name: 'タカラトミー', status: 'active', url: '/02_scraping/platforms/hobby', count: 2987 },
      { id: 'pokemon-center-hobby', name: 'ポケモンセンター', status: 'active', url: '/02_scraping/platforms/hobby', count: 4321 },
      { id: 'toysrus', name: 'トイザらス', status: 'active', url: '/02_scraping/platforms/hobby', count: 3876 },
      { id: 'yodobashi-toy', name: 'ヨドバシ玩具', status: 'active', url: '/02_scraping/platforms/hobby', count: 2765 },
      { id: 'animate', name: 'アニメイト', status: 'active', url: '/02_scraping/platforms/hobby', count: 3234 },
      { id: 'gamers', name: 'ゲーマーズ', status: 'active', url: '/02_scraping/platforms/hobby', count: 1987 },
      { id: 'toranoana', name: 'とらのあな', status: 'active', url: '/02_scraping/platforms/hobby', count: 2456 },
      { id: 'melonbooks', name: 'メロンブックス', status: 'active', url: '/02_scraping/platforms/hobby', count: 1654 },
      { id: 'hobby-japan', name: 'ホビージャパン', status: 'beta', url: '/02_scraping/platforms/hobby', count: 876 },
      { id: 'alter', name: 'アルター', status: 'active', url: '/02_scraping/platforms/hobby', count: 987 },
      { id: 'megahouse', name: 'メガハウス', status: 'active', url: '/02_scraping/platforms/hobby', count: 1234 },
      { id: 'max-factory', name: 'マックスファクトリー', status: 'active', url: '/02_scraping/platforms/hobby', count: 1567 },
      { id: 'medicos', name: 'メディコス', status: 'active', url: '/02_scraping/platforms/hobby', count: 876 },
      { id: 'square-enix', name: 'スクエニストア', status: 'active', url: '/02_scraping/platforms/hobby', count: 2134 },
      { id: 'prime1', name: 'プライム1スタジオ', status: 'active', url: '/02_scraping/platforms/hobby', count: 543 },
      { id: 'f-nex', name: 'F:NEX', status: 'active', url: '/02_scraping/platforms/hobby', count: 765 },
      { id: 'union-creative', name: 'ユニオンクリエイティブ', status: 'active', url: '/02_scraping/platforms/hobby', count: 432 }
    ]
  },
  others: {
    name: 'その他・中古販売',
    icon: <Zap className="h-4 w-4" />,
    items: [
      { id: 'surugaya', name: '駿河屋', status: 'active', url: '/02_scraping/platforms/surugaya', count: 8765 },
      { id: 'second-street', name: 'セカンドストリート', status: 'active', url: '/02_scraping/platforms/second_street', count: 5432 },
      { id: 'hard-off', name: 'ハードオフ', status: 'active', url: '/02_scraping/platforms/off_mall', count: 3456 },
      { id: 'book-off', name: 'ブックオフ', status: 'active', url: '/02_scraping/platforms/off_mall', count: 4321 },
      { id: 'off-house', name: 'オフハウス', status: 'active', url: '/02_scraping/platforms/off_mall', count: 2134 },
      { id: 'treasure-factory', name: 'トレジャーファクトリー', status: 'beta', url: '/02_scraping/platforms/off_mall', count: 987 },
      { id: 'komehyo', name: 'コメ兵', status: 'development', url: '/02_scraping/platforms/off_mall', count: 0 }
    ]
  }
}
