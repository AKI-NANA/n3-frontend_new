'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Globe, RefreshCw, Loader2, CheckCircle, AlertCircle, Database } from 'lucide-react'

interface ExcludedCountry {
  id: number
  country_code: string
  country_name: string
  region: string
  is_default_excluded: boolean
  reason: string | null
  created_at: string
}

export function ExcludedCountriesManager() {
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [excludedCountries, setExcludedCountries] = useState<ExcludedCountry[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadExcludedCountries()
  }, [])

  async function loadExcludedCountries() {
    setLoading(true)
    try {
      const response = await fetch('/api/shipping/excluded-countries')
      const data = await response.json()
      
      if (data.success) {
        setExcludedCountries(data.excluded_countries || [])
      }
    } catch (error) {
      console.error('Failed to load excluded countries:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegisterExcludedCountries() {
    if (!confirm('除外国マスターデータを登録します。\n既存のデータは削除されます。よろしいですか？')) {
      return
    }

    setRegistering(true)
    setMessage(null)

    try {
      const response = await fetch('/api/shipping/excluded-countries', {
        method: 'POST',
      })
      const data = await response.json()

      if (data.success) {
        setMessage({
          type: 'success',
          text: `✅ ${data.count}カ国の除外国を登録しました`,
        })
        await loadExcludedCountries()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `❌ エラー: ${error.message}`,
      })
    } finally {
      setRegistering(false)
    }
  }

  const groupedByRegion = excludedCountries.reduce((acc, country) => {
    if (!acc[country.region]) {
      acc[country.region] = []
    }
    acc[country.region].push(country)
    return acc
  }, {} as Record<string, ExcludedCountry[]>)

  const regions = Object.keys(groupedByRegion).sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Globe className="w-8 h-8" />
          除外国マスター管理
        </h1>
        <p className="text-sm opacity-90">
          eBay配送ポリシーから除外する国のリスト
        </p>
      </div>

      {message && (
        <Alert className={message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                除外国ステータス
              </CardTitle>
              <CardDescription>
                現在登録されている除外国の数
              </CardDescription>
            </div>
            <Button
              onClick={loadExcludedCountries}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded">
              <div className="text-3xl font-bold text-orange-600">
                {excludedCountries.length}
              </div>
              <div className="text-sm text-gray-600 mt-1">除外国総数</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-3xl font-bold text-blue-600">
                {regions.length}
              </div>
              <div className="text-sm text-gray-600 mt-1">対象地域</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-3xl font-bold text-green-600">
                {excludedCountries.length > 0 ? '✓' : '×'}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {excludedCountries.length > 0 ? '登録済み' : '未登録'}
              </div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-xl font-bold text-purple-600">
                {excludedCountries.length > 0 
                  ? `~${Math.round((excludedCountries.length / 195) * 100)}%`
                  : '0%'
                }
              </div>
              <div className="text-sm text-gray-600 mt-1">除外率</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>マスターデータ登録</CardTitle>
          <CardDescription>
            除外国マスターデータをデータベースに登録します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>登録される除外国:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>アジア: 高リスク国（19カ国）</li>
                  <li>東南アジア: 一部国（3カ国）</li>
                  <li>中東: 一部国（2カ国）</li>
                  <li>北米: 特殊地域（3カ国）</li>
                  <li>アフリカ: 全域（56カ国）</li>
                  <li>ヨーロッパ: 一部高リスク国（11カ国）</li>
                  <li>南米: 全域（14カ国）</li>
                  <li>中米・カリブ: 大部分（24カ国）</li>
                  <li>オセアニア: 小島嶼国（22カ国）</li>
                  <li>その他: PO Box、国内特殊地域（4項目）</li>
                </ul>
                <div className="mt-2 font-bold">合計: 約158カ国・地域</div>
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleRegisterExcludedCountries}
              disabled={registering}
              className="w-full"
              size="lg"
            >
              {registering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  登録中...
                </>
              ) : excludedCountries.length > 0 ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  再登録
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  除外国を登録
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {excludedCountries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>除外国リスト（地域別）</CardTitle>
            <CardDescription>
              {excludedCountries.length}カ国が登録されています
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regions.map((region) => {
                const countries = groupedByRegion[region]
                return (
                  <div key={region} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-lg">{region}</h3>
                      <span className="text-sm text-gray-500">
                        {countries.length}カ国
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {countries.map((country) => (
                        <div
                          key={country.id}
                          className="flex items-center gap-2 text-sm border rounded px-3 py-2 bg-gray-50"
                        >
                          <span className="font-mono text-xs font-bold text-gray-600">
                            {country.country_code}
                          </span>
                          <span className="text-gray-800">{country.country_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
