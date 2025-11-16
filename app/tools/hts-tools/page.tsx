'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function HTSToolsPage() {
  const [activeTab, setActiveTab] = useState<'browse' | 'classify'>('browse')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">HTS管理ツール</h1>
          <p className="text-sm text-gray-600 mt-1">階層表示と自動選定</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex space-x-4 border-b">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === 'browse' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600'
            }`}
          >
            📂 階層構造表示
          </button>
          <button
            onClick={() => setActiveTab('classify')}
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === 'classify' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600'
            }`}
          >
            🎯 HTS自動選定
          </button>
        </div>

        <div className="mt-6">
          {activeTab === 'browse' ? <HTSBrowser /> : <HTSClassify />}
        </div>
      </div>
    </div>
  )
}

function HTSBrowser() {
  const [chapters, setChapters] = useState<any[]>([])
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null)
  const [headings, setHeadings] = useState<any[]>([])
  const [selectedHeading, setSelectedHeading] = useState<string | null>(null)
  const [subheadings, setSubheadings] = useState<any[]>([])
  const [selectedSubheading, setSelectedSubheading] = useState<string | null>(null)
  const [fullCodes, setFullCodes] = useState<any[]>([])

  useEffect(() => {
    loadChapters()
  }, [])

  const loadChapters = async () => {
    const { data } = await supabase
      .from('hts_codes_details')
      .select('chapter_code')
      .not('chapter_code', 'is', null)
      .order('chapter_code')

    const unique = Array.from(new Set(data?.map(d => d.chapter_code) || []))
    setChapters(unique.map(code => ({ code, count: data?.filter(d => d.chapter_code === code).length })))
  }

  const loadHeadings = async (ch: string) => {
    setSelectedChapter(ch)
    setHeadings([])
    setSubheadings([])
    setFullCodes([])

    const { data } = await supabase
      .from('hts_codes_details')
      .select('heading_code, description')
      .eq('chapter_code', ch)
      .not('heading_code', 'is', null)
      .order('heading_code')

    setHeadings(Array.from(new Map(data?.map(d => [d.heading_code, d]) || []).values()))
  }

  const loadSubheadings = async (h: string) => {
    setSelectedHeading(h)
    setSubheadings([])
    setFullCodes([])

    const { data } = await supabase
      .from('hts_codes_details')
      .select('subheading_code, description')
      .eq('heading_code', h)
      .not('subheading_code', 'is', null)
      .order('subheading_code')

    setSubheadings(Array.from(new Map(data?.map(d => [d.subheading_code, d]) || []).values()))
  }

  const loadFullCodes = async (s: string) => {
    setSelectedSubheading(s)

    const { data } = await supabase
      .from('hts_codes_details')
      .select('hts_number, description, general_rate')
      .eq('subheading_code', s)
      .order('hts_number')

    setFullCodes(data || [])
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-white rounded shadow p-4">
        <h3 className="font-bold mb-2">Chapter</h3>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {chapters.map(c => (
            <button
              key={c.code}
              onClick={() => loadHeadings(c.code)}
              className={`w-full text-left px-2 py-1 rounded text-sm ${
                selectedChapter === c.code ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
            >
              {c.code} ({c.count})
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h3 className="font-bold mb-2">Heading</h3>
        {selectedChapter ? (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {headings.map(h => (
              <button
                key={h.heading_code}
                onClick={() => loadSubheadings(h.heading_code)}
                className={`w-full text-left px-2 py-1 rounded text-sm ${
                  selectedHeading === h.heading_code ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-mono">{h.heading_code}</div>
                <div className="text-xs text-gray-600 truncate">{h.description}</div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">← Chapterを選択</p>
        )}
      </div>

      <div className="bg-white rounded shadow p-4">
        <h3 className="font-bold mb-2">Subheading</h3>
        {selectedHeading ? (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {subheadings.map(s => (
              <button
                key={s.subheading_code}
                onClick={() => loadFullCodes(s.subheading_code)}
                className={`w-full text-left px-2 py-1 rounded text-sm ${
                  selectedSubheading === s.subheading_code ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-mono">{s.subheading_code}</div>
                <div className="text-xs text-gray-600 truncate">{s.description}</div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">← Headingを選択</p>
        )}
      </div>

      <div className="bg-white rounded shadow p-4">
        <h3 className="font-bold mb-2">Full Code</h3>
        {selectedSubheading ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {fullCodes.map(f => (
              <div key={f.hts_number} className="border rounded p-2 text-sm">
                <div className="font-mono font-bold">{f.hts_number}</div>
                <div className="text-xs mt-1">{f.description}</div>
                <div className="text-xs text-gray-500">{f.general_rate || 'Free'}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">← Subheadingを選択</p>
        )}
      </div>
    </div>
  )
}

function HTSClassify() {
  const [title, setTitle] = useState('')
  const [result, setResult] = useState<any>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const classify = async () => {
    if (!title) return alert('タイトルを入力してください')
    setLoading(true)
    setResult(null)
    setCandidates([])

    try {
      const keywords = title.toLowerCase().split(/\s+/).filter(w => w.length > 1)
      const chapter = '90'

      const results: any[] = []
      const seen = new Set()
      for (const kw of keywords.slice(0, 5)) {
        const { data } = await supabase
          .from('hts_codes_details')
          .select('*')
          .eq('chapter_code', chapter)
          .ilike('description', `%${kw}%`)
          .limit(20)

        if (data) {
          for (const item of data) {
            if (!seen.has(item.hts_number)) {
              results.push(item)
              seen.add(item.hts_number)
            }
          }
        }
      }

      const scored = results.map(r => ({
        ...r,
        score: Math.min(100, keywords.filter(k => (r.description || '').toLowerCase().includes(k)).length * 15)
      })).sort((a, b) => b.score - a.score)

      setCandidates(scored.slice(0, 10))
      if (scored.length > 0) {
        setResult(scored[0])
      }
    } catch (error) {
      alert('エラー: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded shadow p-6">
        <label className="block font-medium mb-2">商品タイトル（英語）</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="例: Nikon Z 24-70mm f/2.8 S Lens"
          className="w-full px-3 py-2 border rounded"
        />
        <button
          onClick={classify}
          disabled={loading}
          className="w-full mt-4 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? '選定中...' : 'HTS選定'}
        </button>

        {result && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <h4 className="font-bold mb-2">✅ 選定結果</h4>
            <div className="font-mono text-lg">{result.hts_number}</div>
            <div className="text-sm mt-1">{result.description}</div>
            <div className="text-sm text-gray-600">信頼度: {result.score}点</div>
          </div>
        )}

        {candidates.length > 0 && (
          <div className="mt-4">
            <h4 className="font-bold mb-2">候補一覧</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {candidates.map((c, i) => (
                <div key={c.hts_number} className="border rounded p-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-mono">{c.hts_number}</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{c.score}点</span>
                  </div>
                  <div className="text-xs text-gray-600">{c.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
