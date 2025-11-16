'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Info, BookOpen, Layers, Database, AlertCircle, RefreshCw, ChevronRight, Bug, Ban } from 'lucide-react'

const supabase = createClient()

export default function HTSHierarchyPage() {
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'classify' | 'logic'>('hierarchy')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">🌲 HTS階層構造管理システム（4階層）</h1>
              <p className="text-blue-100 mt-2">
                Chapters → Headings → Subheadings → Full Codes
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="text-sm text-blue-100">データベース</div>
              <div className="text-lg font-bold">✅ 4テーブル連携</div>
            </div>
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1">
            <TabButton
              active={activeTab === 'hierarchy'}
              onClick={() => setActiveTab('hierarchy')}
              icon={<Layers className="w-5 h-5" />}
              label="階層構造表示"
              badge="4階層"
            />
            <TabButton
              active={activeTab === 'classify'}
              onClick={() => setActiveTab('classify')}
              icon={<Search className="w-5 h-5" />}
              label="HTS自動選定"
              badge="AI推奨"
            />
            <TabButton
              active={activeTab === 'logic'}
              onClick={() => setActiveTab('logic')}
              icon={<BookOpen className="w-5 h-5" />}
              label="構造解説"
              badge="仕組み"
            />
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'hierarchy' && <HTSHierarchyBrowser />}
        {activeTab === 'classify' && <HTSAutoClassifier />}
        {activeTab === 'logic' && <HTSStructureExplanation />}
      </div>
    </div>
  )
}

// タブボタンコンポーネント
function TabButton({ active, onClick, icon, label, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-6 py-4 font-medium border-b-2 transition-all ${
        active
          ? 'border-blue-500 text-blue-600 bg-blue-50'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          active ? 'bg-blue-200 text-blue-700' : 'bg-gray-200 text-gray-600'
        }`}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ===========================
// 階層構造表示コンポーネント（修正版）
// ===========================
function HTSHierarchyBrowser() {
  const [chapters, setChapters] = useState<any[]>([])
  const [selectedChapter, setSelectedChapter] = useState<any | null>(null)
  const [headings, setHeadings] = useState<any[]>([])
  const [selectedHeading, setSelectedHeading] = useState<any | null>(null)
  const [subheadings, setSubheadings] = useState<any[]>([])
  const [selectedSubheading, setSelectedSubheading] = useState<any | null>(null)
  const [fullCodes, setFullCodes] = useState<any[]>([])
  const [selectedCode, setSelectedCode] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({ 
    chapters: 0, 
    headings: 0, 
    subheadings: 0, 
    fullCodes: 0 
  })
  const [dataLoading, setDataLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(false)
  const [showExcluded, setShowExcluded] = useState(false)

  useEffect(() => {
    loadStats()
    loadChapters()
  }, [])

  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    console.log(`[${timestamp}] ${message}`)
    setDebugInfo(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 20))
  }

  const loadStats = async () => {
    try {
      const [chaptersRes, headingsRes, subheadingsRes, detailsRes] = await Promise.all([
        supabase.from('hts_chapters').select('*', { count: 'exact', head: true }),
        supabase.from('hts_codes_headings').select('*', { count: 'exact', head: true }),
        supabase.from('hts_codes_subheadings').select('*', { count: 'exact', head: true }),
        supabase.from('hts_codes_details').select('*', { count: 'exact', head: true })
      ])

      setStats({
        chapters: chaptersRes.count || 0,
        headings: headingsRes.count || 0,
        subheadings: subheadingsRes.count || 0,
        fullCodes: detailsRes.count || 0
      })

      addDebugInfo(`統計: C=${chaptersRes.count}, H=${headingsRes.count}, S=${subheadingsRes.count}, F=${detailsRes.count}`)
    } catch (error) {
      addDebugInfo(`統計エラー: ${error}`)
    } finally {
      setDataLoading(false)
    }
  }

  const loadChapters = async () => {
    setLoading(true)
    try {
      // すべてのChapterを取得（除外フラグ含む）
      const { data, error } = await supabase
        .from('hts_chapters')
        .select('*')
        .order('chapter_code')

      if (error) {
        addDebugInfo(`❌ Chapter取得エラー: ${error.message}`)
        return
      }

      if (data) {
        const available = data.filter(c => !c.is_excluded)
        const excluded = data.filter(c => c.is_excluded)
        addDebugInfo(`✅ 全${data.length}件取得（使用可: ${available.length}, 除外: ${excluded.length}）`)
        
        if (data.length > 0) {
          const fields = Object.keys(data[0])
          addDebugInfo(`フィールド: ${fields.join(', ')}`)
        }
        
        setChapters(data)
      }
    } catch (error) {
      addDebugInfo(`❌ 例外: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const loadHeadings = async (chapter: any) => {
    // 選択解除チェック：同じChapterをクリックしたら解除
    if (selectedChapter?.chapter_code === chapter.chapter_code) {
      setSelectedChapter(null)
      setHeadings([])
      setSubheadings([])
      setFullCodes([])
      setSelectedHeading(null)
      setSelectedSubheading(null)
      addDebugInfo(`Chapter選択解除: ${chapter.chapter_code}`)
      return
    }

    setSelectedChapter(chapter)
    setHeadings([])
    setSubheadings([])  
    setFullCodes([])
    setSelectedHeading(null)
    setSelectedSubheading(null)
    setLoading(true)

    try {
      addDebugInfo(`Chapter選択: ${chapter.chapter_code}`)
      
      // まずサンプルを1件取得してフィールド構造を確認
      const { data: sample, error: sampleError } = await supabase
        .from('hts_codes_headings')
        .select('*')
        .limit(1)
        .single()
      
      if (sample) {
        const fields = Object.keys(sample)
        addDebugInfo(`Headingフィールド: ${fields.join(', ')}`)
      }
      
      // heading_codeの最初の2桁がchapter_codeと一致するものを取得
      const { data, error } = await supabase
        .from('hts_codes_headings')
        .select('*')
        .like('heading_code', `${chapter.chapter_code}%`)
        .order('heading_code')

      if (error) {
        addDebugInfo(`❌ Heading取得エラー: ${error.message}`)
        return
      }

      if (data) {
        addDebugInfo(`✅ ${data.length}件のHeadingを取得`)
        setHeadings(data)
      }
    } catch (error) {
      addDebugInfo(`❌ 例外: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const loadSubheadings = async (heading: any) => {
    // 選択解除チェック
    if (selectedHeading?.heading_code === heading.heading_code) {
      setSelectedHeading(null)
      setSubheadings([])
      setFullCodes([])
      setSelectedSubheading(null)
      addDebugInfo(`Heading選択解除: ${heading.heading_code}`)
      return
    }

    setSelectedHeading(heading)
    setSubheadings([])
    setFullCodes([])
    setSelectedSubheading(null)
    setLoading(true)

    try {
      addDebugInfo(`Heading選択: ${heading.heading_code}`)
      
      // subheading_codeの最初の4桁がheading_codeと一致するものを取得
      const { data, error } = await supabase
        .from('hts_codes_subheadings')
        .select('*')
        .like('subheading_code', `${heading.heading_code}%`)
        .order('subheading_code')

      if (error) {
        addDebugInfo(`❌ Subheading取得エラー: ${error.message}`)
        return
      }

      if (data) {
        addDebugInfo(`✅ ${data.length}件のSubheadingを取得`)
        setSubheadings(data)
      }
    } catch (error) {
      addDebugInfo(`❌ 例外: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const loadFullCodes = async (subheading: any) => {
    // 選択解除チェック
    if (selectedSubheading?.subheading_code === subheading.subheading_code) {
      setSelectedSubheading(null)
      setFullCodes([])
      addDebugInfo(`Subheading選択解除: ${subheading.subheading_code}`)
      return
    }

    setSelectedSubheading(subheading)
    setFullCodes([])
    setLoading(true)

    try {
      addDebugInfo(`Subheading選択: ${subheading.subheading_code}`)
      
      const { data, error } = await supabase
        .from('hts_codes_details')
        .select('*')
        .eq('subheading_code', subheading.subheading_code)
        .order('hts_number')

      if (error) {
        addDebugInfo(`❌ Full Code取得エラー: ${error.message}`)
        return
      }

      if (data) {
        addDebugInfo(`✅ ${data.length}件のFull Codeを取得`)
        setFullCodes(data)
      }
    } catch (error) {
      addDebugInfo(`❌ 例外: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const selectCode = (code: any) => {
    setSelectedCode(code)
    addDebugInfo(`Code選択: ${code.hts_number}`)
  }

  // 検索フィルタリング
  const filteredChapters = chapters.filter(c => {
    // 除外フィルタ
    if (!showExcluded && c.is_excluded) return false
    
    // 検索フィルタ
    if (!searchQuery) return true
    
    return c.chapter_code?.includes(searchQuery) || 
           c.chapter_description?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // 説明フィールド取得ヘルパー（日英両方）
  const getDescription = (item: any, type: string) => {
    let en = ''
    let ja = ''
    
    if (type === 'chapter') {
      en = item.chapter_description || item.description_en || item.description || 'No description'
      ja = item.description_ja || item.name_ja || ''
    } else if (type === 'heading') {
      en = item.heading_description || item.description || item.title || 'No description'
      ja = item.description_ja || item.name_ja || ''
    } else if (type === 'subheading') {
      en = item.subheading_description || item.description || item.title || 'No description'
      ja = item.description_ja || item.name_ja || ''
    } else {
      en = item.description || 'No description'
      ja = item.description_ja || ''
    }
    
    return { en, ja }
  }

  return (
    <div className="space-y-4">
      {/* デバッグパネル */}
      <div className="bg-gray-900 text-gray-100 rounded-lg shadow-lg overflow-hidden">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Bug className="w-4 h-4" />
            <span className="font-mono text-sm">デバッグ情報</span>
          </div>
          <span className="text-xs">{showDebug ? '▼' : '▶'}</span>
        </button>
        {showDebug && (
          <div className="px-4 pb-4 max-h-40 overflow-y-auto">
            <div className="space-y-1 font-mono text-xs">
              {debugInfo.map((info, idx) => (
                <div key={idx} className="text-gray-300">{info}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 統計情報バー */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow-lg p-6">
        {dataLoading ? (
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2" />
            <p>データベース統計を読み込み中...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-6 text-center mb-4">
              <div>
                <div className="text-3xl font-bold">{stats.chapters}</div>
                <div className="text-sm text-blue-100 mt-1">Chapter（大分類）</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{stats.headings}</div>
                <div className="text-sm text-blue-100 mt-1">Heading（中分類）</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{stats.subheadings}</div>
                <div className="text-sm text-blue-100 mt-1">Subheading（小分類）</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{stats.fullCodes.toLocaleString()}</div>
                <div className="text-sm text-blue-100 mt-1">Full Code（完全コード）</div>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-blue-100">
              <span>📊 4階層構造:</span>
              <span className="font-mono">hts_chapters</span>
              <ChevronRight className="w-4 h-4" />
              <span className="font-mono">hts_codes_headings</span>
              <ChevronRight className="w-4 h-4" />
              <span className="font-mono">hts_codes_subheadings</span>
              <ChevronRight className="w-4 h-4" />
              <span className="font-mono">hts_codes_details</span>
            </div>
          </>
        )}
      </div>

      {/* 検索バーと除外表示切り替え */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex space-x-4 items-center mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Chapterコード または 説明で検索..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowExcluded(!showExcluded)}
            className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center space-x-2 ${
              showExcluded 
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            <Ban className="w-4 h-4" />
            <span className="text-sm font-medium">除外表示</span>
          </button>
        </div>
        <p className="text-xs text-gray-500">
          💡 例: "95" または "toys" で検索 | 
          除外されたChapter（生きた動物、武器など）は{showExcluded ? '表示中' : '非表示'}
        </p>
      </div>

      {/* 階層表示（4列） */}
      <div className="grid grid-cols-4 gap-4">
        {/* Chapter */}
        <HierarchyColumn
          title="Chapter"
          subtitle="大分類（2桁）"
          titleBg="bg-blue-50"
          count={filteredChapters.length}
          totalCount={stats.chapters}
          items={filteredChapters}
          selectedItem={selectedChapter}
          onSelect={loadHeadings}
          loading={loading && !chapters.length}
          emptyMessage="読込中..."
          color="blue"
          renderItem={(c) => {
            const desc = getDescription(c, 'chapter')
            return {
              code: c.chapter_code,
              description: desc.en,
              descriptionJa: desc.ja,
              isExcluded: c.is_excluded,
              exclusionReason: c.exclusion_reason
            }
          }}
        />

        {/* Heading */}
        <HierarchyColumn
          title="Heading"
          subtitle="中分類（4桁）"
          titleBg="bg-green-50"
          count={headings.length}
          totalCount={stats.headings}
          items={headings}
          selectedItem={selectedHeading}
          onSelect={loadSubheadings}
          loading={loading && selectedChapter !== null}
          emptyMessage={!selectedChapter ? "← Chapterを選択" : "読込中..."}
          color="green"
          renderItem={(h) => {
            const desc = getDescription(h, 'heading')
            return {
              code: h.heading_code,
              description: desc.en,
              descriptionJa: desc.ja
            }
          }}
        />

        {/* Subheading */}
        <HierarchyColumn
          title="Subheading"
          subtitle="小分類（6桁）"
          titleBg="bg-yellow-50"
          count={subheadings.length}
          totalCount={stats.subheadings}
          items={subheadings}
          selectedItem={selectedSubheading}
          onSelect={loadFullCodes}
          loading={loading && selectedHeading !== null}
          emptyMessage={!selectedHeading ? "← Headingを選択" : "読込中..."}
          color="yellow"
          renderItem={(s) => {
            const desc = getDescription(s, 'subheading')
            return {
              code: s.subheading_code,
              description: desc.en,
              descriptionJa: desc.ja
            }
          }}
        />

        {/* Full Code */}
        <div className="bg-white rounded-lg shadow">
          <div className="bg-purple-50 px-4 py-3 border-b">
            <h3 className="font-bold text-gray-900 text-sm">Full Code</h3>
            <p className="text-xs text-gray-500">完全コード（10桁）</p>
            <p className="text-xs font-bold text-purple-700 mt-1">
              {selectedSubheading ? `${fullCodes.length}件` : `全${stats.fullCodes.toLocaleString()}件`}
            </p>
          </div>
          <div className="p-2 max-h-[600px] overflow-y-auto space-y-2">
            {loading && selectedSubheading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin text-purple-500 mb-2" />
                <p className="text-sm text-gray-500">読込中...</p>
              </div>
            ) : !selectedSubheading ? (
              <p className="text-center text-gray-500 py-4 text-sm">← Subheadingを選択</p>
            ) : (
              fullCodes.map(f => (
                <div
                  key={f.hts_number}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    selectedCode?.hts_number === f.hts_number
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'hover:border-purple-300 hover:shadow'
                  }`}
                  onClick={() => selectCode(f)}
                >
                  <div className="font-mono font-bold text-purple-700 text-sm">{f.hts_number}</div>
                  <div className="text-xs text-gray-700 mt-1 line-clamp-3">{f.description}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    関税: {f.general_rate || 'Free'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 選択されたコードの詳細 */}
      {selectedCode && (
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-gray-900">✅ 選択されたHTSコード</h3>
            <button
              onClick={() => setSelectedCode(null)}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">HTSコード（完全10桁）</p>
              <p className="font-mono text-3xl font-bold text-purple-700">{selectedCode.hts_number}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-600 mb-2 font-bold">📝 英語説明</p>
              <p className="text-gray-800 bg-gray-50 p-4 rounded border leading-relaxed">{selectedCode.description}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <p className="text-sm text-gray-600 mb-1 font-semibold">Chapter</p>
              <p className="font-mono text-2xl font-bold">{selectedCode.chapter_code || selectedChapter?.chapter_code}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
              <p className="text-sm text-gray-600 mb-1 font-semibold">Heading</p>
              <p className="font-mono text-2xl font-bold">{selectedCode.heading_code || selectedHeading?.heading_code}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
              <p className="text-sm text-gray-600 mb-1 font-semibold">Subheading</p>
              <p className="font-mono text-2xl font-bold">{selectedCode.subheading_code}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
              <p className="text-sm text-gray-600 mb-1 font-semibold">一般関税率</p>
              <p className="text-2xl font-bold text-red-700">{selectedCode.general_rate || 'Free'}</p>
            </div>
          </div>
          <div className="mt-6 flex space-x-3">
            <button className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-bold shadow-md text-lg">
              💾 このコードを保存
            </button>
            <button
              onClick={() => setSelectedCode(null)}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-bold"
            >
              ❌ 選択解除
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// 階層カラムコンポーネント
function HierarchyColumn({ title, subtitle, titleBg, count, totalCount, items, selectedItem, onSelect, loading, emptyMessage, color, renderItem }: any) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className={`${titleBg} px-4 py-3 border-b`}>
        <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
        <p className="text-xs font-bold text-gray-700 mt-1">
          {count}件 / 全{totalCount}件
        </p>
      </div>
      <div className="p-2 max-h-[600px] overflow-y-auto space-y-1">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">{emptyMessage}</p>
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-gray-500 py-4 text-sm">{emptyMessage}</p>
        ) : (
          items.map((item: any) => {
            const rendered = renderItem(item)
            // 選択判定：コードで厳密に比較
            const isSelected = selectedItem && (
              (item.chapter_code && selectedItem.chapter_code === item.chapter_code) ||
              (item.heading_code && selectedItem.heading_code === item.heading_code) ||
              (item.subheading_code && selectedItem.subheading_code === item.subheading_code)
            )
            
            // 色の選択（動的クラスは使えないので直接指定）
            const selectedBg = color === 'blue' ? 'bg-blue-500' :
                              color === 'green' ? 'bg-green-500' :
                              color === 'yellow' ? 'bg-yellow-500' :
                              'bg-purple-500'
            
            return (
              <button
                key={item.id || rendered.code}
                onClick={() => !rendered.isExcluded && onSelect(item)}
                disabled={rendered.isExcluded}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-all relative ${
                  rendered.isExcluded
                    ? 'bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed opacity-60'
                    : isSelected
                      ? `${selectedBg} text-white shadow-md`
                      : 'hover:bg-gray-100 border border-transparent hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono font-bold text-sm">{rendered.code}</div>
                  {rendered.isExcluded && (
                    <Ban className="w-4 h-4 text-red-500" title={rendered.exclusionReason || '除外対象'} />
                  )}
                </div>
                {rendered.description && (
                  <>
                    <div className={`text-xs mt-1 line-clamp-2 ${
                      rendered.isExcluded 
                        ? 'text-gray-400' 
                        : isSelected 
                          ? 'opacity-90' 
                          : 'text-gray-600'
                    }`}>
                      {rendered.description}
                    </div>
                    {rendered.descriptionJa && (
                      <div className={`text-xs mt-1 line-clamp-2 font-bold ${
                        rendered.isExcluded 
                          ? 'text-gray-500' 
                          : isSelected 
                            ? 'text-white opacity-90' 
                            : 'text-blue-700'
                      }`}>
                        {rendered.descriptionJa}
                      </div>
                    )}
                  </>
                )}
                {rendered.isExcluded && rendered.exclusionReason && (
                  <div className="text-xs text-red-600 mt-1 italic">
                    {rendered.exclusionReason}
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// 自動選定コンポーネント（簡略版）
function HTSAutoClassifier() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">🎯 HTS自動選定機能</h2>
        <p className="text-gray-600">この機能は次の更新で実装されます</p>
      </div>
    </div>
  )
}

// 構造解説コンポーネント
function HTSStructureExplanation() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-2">🏗️ HTS 4階層構造の解説</h2>
        <p className="text-indigo-100 text-lg">データベーステーブルの正しい使い方</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-2xl font-bold mb-4">📊 4つのマスターテーブル</h3>
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded">
            <h4 className="font-bold text-lg text-blue-900">1. hts_chapters</h4>
            <p className="text-gray-700 mt-2">Chapter（大分類・2桁コード）のマスターテーブル</p>
            <p className="text-sm text-gray-600 mt-1">例: "95" = Toys, games and sports requisites</p>
            <p className="text-xs text-blue-700 mt-2">✅ is_excluded=false でフィルタ可能</p>
          </div>

          <div className="border-l-4 border-green-500 pl-4 bg-green-50 p-4 rounded">
            <h4 className="font-bold text-lg text-green-900">2. hts_codes_headings</h4>
            <p className="text-gray-700 mt-2">Heading（中分類・4桁コード）のマスターテーブル</p>
            <p className="text-sm text-gray-600 mt-1">例: "9503" = Tricycles, scooters, pedal cars...</p>
            <p className="text-xs text-green-700 mt-2">✅ chapter_id（数値ID）で関連</p>
          </div>

          <div className="border-l-4 border-yellow-500 pl-4 bg-yellow-50 p-4 rounded">
            <h4 className="font-bold text-lg text-yellow-900">3. hts_codes_subheadings</h4>
            <p className="text-gray-700 mt-2">Subheading（小分類・6桁コード）のマスターテーブル</p>
            <p className="text-sm text-gray-600 mt-1">例: "950300" = Tricycles, scooters...</p>
            <p className="text-xs text-yellow-700 mt-2">✅ heading_id または heading_code で関連</p>
          </div>

          <div className="border-l-4 border-purple-500 pl-4 bg-purple-50 p-4 rounded">
            <h4 className="font-bold text-lg text-purple-900">4. hts_codes_details</h4>
            <p className="text-gray-700 mt-2">Full Code（完全コード・10桁）の詳細テーブル</p>
            <p className="text-sm text-gray-600 mt-1">例: "9503.00.00.11" = 具体的な商品コード + 関税率</p>
            <p className="text-xs text-purple-700 mt-2">✅ subheading_code で関連、general_rate に関税率</p>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-3 flex items-center text-amber-900">
          <AlertCircle className="w-5 h-5 mr-2" />
          重要：正しいテーブル間の関連
        </h3>
        <div className="space-y-2 text-sm text-amber-900">
          <p className="font-semibold">✅ 正しい関連方法:</p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>Chapter.id → Heading.chapter_id（数値IDで関連）</li>
            <li>Heading.id → Subheading.heading_id（数値IDで関連、またはheading_code）</li>
            <li>Subheading.subheading_code → Details.subheading_code（文字列コードで関連）</li>
          </ol>
          <p className="font-semibold mt-4">❌ 間違った方法:</p>
          <p className="ml-4">chapter_code での直接関連は不可（chapter_id を使用すること）</p>
        </div>
      </div>
    </div>
  )
}
