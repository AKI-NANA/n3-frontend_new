import { useState, useMemo, useEffect } from 'react'
import { RefreshCw, Sparkles, Copy, CheckCircle, Info, Search, ChevronLeft, ChevronRight, Filter, Globe } from 'lucide-react'

interface HsCodeTabProps {
  hsCodes: any[]
}

interface Chapter {
  chapter_code: string
  name_ja: string
  name_en: string
  primary_keywords: string[]
  related_keywords: string[]
  generic_keywords: string[]
}

interface Country {
  country_code: string
  name_ja: string
  name_en: string
  region: string
}

interface CountryRate {
  hts_code: string
  country_code: string
  duty_rate: number
  is_free: boolean
  notes: string
}

export function HsCodeTab({ hsCodes }: HsCodeTabProps) {
  const [csvData, setCsvData] = useState('')
  const [copied, setCopied] = useState(false)
  
  // フィルター・検索・ページネーション
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChapter, setSelectedChapter] = useState<string>('all')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Chapter マスタデータ
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chaptersLoading, setChaptersLoading] = useState(true)

  // 原産国マスタデータ
  const [countries, setCountries] = useState<Country[]>([])
  const [countriesLoading, setCountriesLoading] = useState(true)

  // 原産国別関税率データ
  const [countryRates, setCountryRates] = useState<Record<string, CountryRate>>({})

  // Supabaseからchaptersを取得
  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const response = await fetch('/api/hts-chapters')
        if (response.ok) {
          const data = await response.json()
          setChapters(data)
        }
      } catch (error) {
        console.error('Failed to fetch chapters:', error)
      } finally {
        setChaptersLoading(false)
      }
    }
    fetchChapters()
  }, [])

  // Supabaseから原産国を取得
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('/api/hts-countries')
        if (response.ok) {
          const data = await response.json()
          setCountries(data)
        }
      } catch (error) {
        console.error('Failed to fetch countries:', error)
      } finally {
        setCountriesLoading(false)
      }
    }
    fetchCountries()
  }, [])

  // 原産国別関税率を取得
  useEffect(() => {
    const fetchCountryRates = async () => {
      try {
        const response = await fetch('/api/hts-country-rates')
        if (response.ok) {
          const data = await response.json()
          // hts_code + country_code で引けるようにマップ化
          const ratesMap: Record<string, CountryRate> = {}
          data.forEach((rate: CountryRate) => {
            const key = `${rate.hts_code}_${rate.country_code}`
            ratesMap[key] = rate
          })
          setCountryRates(ratesMap)
        }
      } catch (error) {
        console.error('Failed to fetch country rates:', error)
      }
    }
    fetchCountryRates()
  }, [])

  // フィルタリング & 検索
  const filteredCodes = useMemo(() => {
    return hsCodes.filter(hs => {
      // Chapter フィルター
      if (selectedChapter !== 'all') {
        const chapter = hs.code.substring(0, 2)
        if (chapter !== selectedChapter) return false
      }

      // 検索クエリ
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          hs.code.toLowerCase().includes(query) ||
          hs.description?.toLowerCase().includes(query) ||
          hs.category?.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [hsCodes, selectedChapter, searchQuery])

  // ページネーション
  const totalPages = Math.ceil(filteredCodes.length / itemsPerPage)
  const paginatedCodes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredCodes.slice(start, start + itemsPerPage)
  }, [filteredCodes, currentPage])

  // ページ変更時は先頭に戻る
  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  // 選択中のChapter情報取得
  const selectedChapterInfo = useMemo(() => {
    return chapters.find(c => c.chapter_code === selectedChapter)
  }, [chapters, selectedChapter])

  // 選択中の原産国情報取得
  const selectedCountryInfo = useMemo(() => {
    return countries.find(c => c.country_code === selectedCountry)
  }, [countries, selectedCountry])

  // HTSコードの原産国別関税率を取得
  const getCountryRate = (htsCode: string, countryCode: string) => {
    const key = `${htsCode}_${countryCode}`
    return countryRates[key]
  }

  // CSV → 整形された質問文に変換
  const generateClaudePrompt = () => {
    if (!csvData.trim()) return ''

    const lines = csvData.trim().split('\n')
    const hasHeader = lines[0].includes('商品') || lines[0].includes('タイトル') || lines[0].includes('title')
    const dataLines = hasHeader ? lines.slice(1) : lines

    if (dataLines.length === 0) return ''

    let prompt = `以下の商品のHTSコードを判定してください:\n\n`

    dataLines.forEach((line, index) => {
      const columns = line.split(',')
      prompt += `${index + 1}. 商品: ${columns[0] || '（不明）'}\n`
      if (columns[1]) prompt += `   説明: ${columns[1]}\n`
      if (columns[2]) prompt += `   価格: ${columns[2]}\n`
      prompt += '\n'
    })

    prompt += `各商品について以下を返してください:\n`
    prompt += `- HTSコード\n`
    prompt += `- 信頼度（%）\n`
    prompt += `- 関税率\n`
    prompt += `- 判定理由`

    return prompt
  }

  // クリップボードにコピー
  const copyToClipboard = () => {
    const prompt = generateClaudePrompt()
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">HSコード管理</h2>

      {/* Claude AI判定セクション */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-bold text-purple-900">
            Claude AI 自動判定（完全無料）
          </h3>
        </div>

        <div className="bg-white/80 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-2">使い方（3ステップ）:</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li>リサーチツールからエクスポートしたCSVデータを下に貼り付け</li>
                <li>「Claudeに質問をコピー」ボタン → <strong>整形された質問文</strong>がコピーされます</li>
                <li>Claude Desktopチャット（このチャット）に貼り付けて送信</li>
                <li>Claudeが自動でHTS判定（Supabase MCP経由・無料）</li>
              </ol>
              <p className="mt-2 text-purple-700 font-medium">
                💡 API課金なし・99章すべて日本語名・英語名・キーワード対応済み
              </p>
            </div>
          </div>
        </div>

        {/* CSVデータ入力 */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            CSVデータを貼り付け（そのまま貼り付けOK）
          </label>
          <textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="例:&#10;商品タイトル,商品説明,価格,原産国&#10;ポケモンカード 松葉のゲンガー,トレーディングカード NM,5000,JP&#10;Apple AirPods Pro,Bluetooth wireless earphones,28000,CN"
            className="w-full h-40 px-4 py-3 border-2 border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <div className="text-xs text-gray-500">
            ※ CSV形式のまま貼り付けてください。原産国も含めると関税率も自動計算されます
          </div>
        </div>

        {/* プレビュー */}
        {csvData.trim() && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Claudeに送信される質問（整形済み）:
            </div>
            <pre className="text-xs font-mono bg-white p-3 rounded border border-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {generateClaudePrompt()}
            </pre>
          </div>
        )}

        {/* コピーボタン */}
        <button
          onClick={copyToClipboard}
          disabled={!csvData.trim()}
          className="mt-4 w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
        >
          {copied ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>コピーしました！Claude Desktopに貼り付けてください</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              <span>整形された質問をClaudeにコピー</span>
            </>
          )}
        </button>

        <p className="mt-3 text-sm text-center text-gray-600">
          コピー後、<strong>Claude Desktop</strong>のチャットに貼り付けて送信してください
        </p>
      </div>

      {/* Supabase連携情報 */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Supabase連携済み
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <strong>HTSコード:</strong> {hsCodes.length.toLocaleString()}件
          </div>
          <div>
            <strong>Chapter:</strong> {chapters.length}章
          </div>
          <div>
            <strong>原産国:</strong> {countries.length}ヶ国
          </div>
          <div>
            <strong>関税率DB:</strong> {Object.keys(countryRates).length}件
          </div>
        </div>
      </div>

      {/* 検索・フィルターセクション */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          HTSコード検索・フィルター
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* 検索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              キーワード検索
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="コード、説明で検索..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  handleFilterChange()
                }}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Chapterフィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chapter（大分類）
            </label>
            <select
              value={selectedChapter}
              onChange={(e) => {
                setSelectedChapter(e.target.value)
                handleFilterChange()
              }}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">すべて表示（全{chapters.length}章）</option>
              {chaptersLoading ? (
                <option disabled>読み込み中...</option>
              ) : (
                chapters
                  .sort((a, b) => a.chapter_code.localeCompare(b.chapter_code))
                  .map((chapter) => (
                    <option key={chapter.chapter_code} value={chapter.chapter_code}>
                      Ch.{chapter.chapter_code} - {chapter.name_ja}
                    </option>
                  ))
              )}
            </select>
          </div>

          {/* 原産国フィルター（NEW!） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              原産国で絞り込み
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            >
              <option value="all">すべて表示</option>
              {countriesLoading ? (
                <option disabled>読み込み中...</option>
              ) : (
                <>
                  <optgroup label="アジア">
                    {countries.filter(c => c.region === 'Asia').map(country => (
                      <option key={country.country_code} value={country.country_code}>
                        {country.name_ja} ({country.country_code})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="北米">
                    {countries.filter(c => c.region === 'North America').map(country => (
                      <option key={country.country_code} value={country.country_code}>
                        {country.name_ja} ({country.country_code})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="ヨーロッパ">
                    {countries.filter(c => c.region === 'Europe').map(country => (
                      <option key={country.country_code} value={country.country_code}>
                        {country.name_ja} ({country.country_code})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="その他">
                    {countries.filter(c => !['Asia', 'North America', 'Europe'].includes(c.region)).map(country => (
                      <option key={country.country_code} value={country.country_code}>
                        {country.name_ja} ({country.country_code})
                      </option>
                    ))}
                  </optgroup>
                </>
              )}
            </select>
          </div>
        </div>

        {/* 選択中のChapter詳細 */}
        {selectedChapterInfo && (
          <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="font-bold text-indigo-900 mb-1">
                  📦 Chapter {selectedChapterInfo.chapter_code}: {selectedChapterInfo.name_ja}
                </div>
                <div className="text-sm text-indigo-700 mb-2">
                  {selectedChapterInfo.name_en}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-white rounded border border-indigo-300">
                    主要KW: {selectedChapterInfo.primary_keywords?.length || 0}個
                  </span>
                  <span className="px-2 py-1 bg-white rounded border border-indigo-300">
                    関連KW: {selectedChapterInfo.related_keywords?.length || 0}個
                  </span>
                  <span className="px-2 py-1 bg-white rounded border border-indigo-300">
                    汎用KW: {selectedChapterInfo.generic_keywords?.length || 0}個
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 選択中の原産国詳細 */}
        {selectedCountryInfo && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <div className="font-bold text-green-900">
                  🌏 {selectedCountryInfo.name_ja} ({selectedCountryInfo.country_code})
                </div>
                <div className="text-sm text-green-700">
                  {selectedCountryInfo.name_en} - {selectedCountryInfo.region}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 結果カウント */}
        <div className="text-sm text-gray-600">
          {filteredCodes.length.toLocaleString()}件 / 全{hsCodes.length.toLocaleString()}件
          {selectedChapter !== 'all' && ` （Chapter ${selectedChapter}で絞り込み中）`}
          {selectedCountry !== 'all' && ` （${selectedCountryInfo?.name_ja}の関税率を表示）`}
        </div>
      </div>

      {/* 登録済みHSコード一覧 */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          登録済みHTSコード一覧
        </h3>

        <div className="space-y-3">
          {paginatedCodes.map((hs) => {
            const countryRate = selectedCountry !== 'all' ? getCountryRate(hs.code, selectedCountry) : null
            
            return (
              <div
                key={hs.code}
                className="border-2 rounded-lg p-4 hover:border-indigo-300 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="font-mono font-bold text-lg">{hs.code}</div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-medium">
                      Chapter {hs.code.substring(0, 2)}
                    </span>
                  </div>
                  {hs.section301 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-semibold">
                      Section 301
                    </span>
                  )}
                </div>
                
                <div className="text-sm text-gray-700 mb-2">{hs.description}</div>
                
                {/* 関税率表示 */}
                <div className="text-xs space-y-1">
                  {/* 基本関税 */}
                  <div>
                    基本関税（一般）: <strong>{(hs.base_duty * 100).toFixed(2)}%</strong>
                    {hs.section301 && (
                      <span className="ml-3 text-red-600">
                        + Section 301: {(hs.section301_rate * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  
                  {/* 原産国別関税（選択時） */}
                  {countryRate && (
                    <div className="mt-2 pt-2 border-t border-green-200 bg-green-50 -mx-4 px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-900">
                          {selectedCountryInfo?.name_ja}からの輸入:
                        </span>
                        {countryRate.is_free ? (
                          <span className="px-2 py-0.5 bg-green-600 text-white rounded font-bold">
                            無税（0%）
                          </span>
                        ) : (
                          <span className="font-bold text-green-900">
                            {(countryRate.duty_rate * 100).toFixed(2)}%
                          </span>
                        )}
                      </div>
                      {countryRate.notes && (
                        <div className="text-xs text-green-700 mt-1">
                          {countryRate.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {hs.category && (
                  <div className="text-xs text-gray-500 mt-2">
                    カテゴリ: {hs.category}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t-2">
            <div className="text-sm text-gray-600">
              ページ {currentPage} / {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                前へ
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                次へ
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {filteredCodes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchQuery || selectedChapter !== 'all' 
              ? '条件に一致するHTSコードが見つかりませんでした'
              : 'HTSコードが登録されていません。Supabaseにデータを追加してください。'
            }
          </div>
        )}
      </div>
    </div>
  )
}
