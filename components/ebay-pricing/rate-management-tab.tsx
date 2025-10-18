'use client'

import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, AlertTriangle, CheckCircle2, Info, Database, Zap } from 'lucide-react'
import { ddpDduApi } from '@/lib/ddp-ddu-api'

interface RateManagementTabProps {
  exchangeRate?: any
  onRefreshExchangeRate?: () => Promise<void>
}

export function RateManagementTab({ exchangeRate, onRefreshExchangeRate }: RateManagementTabProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState('overview')
  const [apiStatus, setApiStatus] = useState<any>(null)
  const [liveExchangeRate, setLiveExchangeRate] = useState<any>(null)
  const [fuelSurcharges, setFuelSurcharges] = useState<any>(null)
  const [dbStatus, setDbStatus] = useState<any>(null)

  // APIステータス確認
  useEffect(() => {
    checkApiStatus()
    loadLiveData()
  }, [])

  const checkApiStatus = async () => {
    try {
      const health = await ddpDduApi.healthCheck()
      setApiStatus(health)
    } catch (error) {
      setApiStatus({ status: 'offline', error: '接続エラー' })
    }
  }

  const loadLiveData = async () => {
    try {
      // 為替レート取得
      try {
        const rate = await ddpDduApi.getExchangeRate()
        setLiveExchangeRate(rate)
      } catch (err) {
        console.error('為替レート取得エラー:', err)
        setLiveExchangeRate({ success: false, error: 'API接続失敗' })
      }

      // 燃油サーチャージ取得
      try {
        const fuel = await ddpDduApi.getFuelSurcharge()
        setFuelSurcharges(fuel)
      } catch (err) {
        console.error('燃油サーチャージ取得エラー:', err)
        setFuelSurcharges({ success: false, error: 'API接続失敗' })
      }

      // DB状態取得
      try {
        const db = await ddpDduApi.getDatabaseStatus()
        setDbStatus(db)
      } catch (err) {
        console.error('DB状態取得エラー:', err)
        setDbStatus({ success: false, error: 'API接続失敗' })
      }
    } catch (error) {
      console.error('データ取得エラー:', error)
    }
  }

  const handleRefreshAll = async () => {
    setIsRefreshing(true)
    try {
      const result = await ddpDduApi.updateAllRates()
      
      if (result.success) {
        alert('✅ 全ての変動要素を更新しました')
        await loadLiveData()
      } else {
        alert('⚠️ 一部の更新に失敗しました')
      }
    } catch (error) {
      alert('❌ 更新に失敗しました: ' + (error as Error).message)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRefreshExchangeRate = async () => {
    setIsRefreshing(true)
    try {
      const result = await ddpDduApi.getExchangeRate()
      if (result.success) {
        setLiveExchangeRate(result)
        alert('✅ 為替レートを更新しました')
      }
    } catch (error) {
      alert('❌ 更新に失敗しました: ' + (error as Error).message)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* API接続ステータス */}
      <div className={`border-l-4 p-4 rounded-r-lg flex items-start gap-3 ${
        apiStatus?.status === 'healthy' 
          ? 'bg-green-50 border-green-500' 
          : 'bg-red-50 border-red-500'
      }`}>
        <Database className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
          apiStatus?.status === 'healthy' ? 'text-green-600' : 'text-red-600'
        }`} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold ${
              apiStatus?.status === 'healthy' ? 'text-green-900' : 'text-red-900'
            }`}>
              DDP/DDU API: {apiStatus?.status === 'healthy' ? '稼働中' : 'オフライン'}
            </h3>
            <button
              onClick={checkApiStatus}
              className="text-sm px-3 py-1 bg-white border rounded hover:bg-gray-50"
            >
              再確認
            </button>
          </div>
          <p className={`text-sm mt-1 ${
            apiStatus?.status === 'healthy' ? 'text-green-700' : 'text-red-700'
          }`}>
            {apiStatus?.status === 'healthy' 
              ? `データベース接続: ${apiStatus.database} | URL: http://localhost:5001/docs`
              : 'APIサーバーに接続できません。start_complete_system.shで起動してください'}
          </p>
        </div>
      </div>

      {/* サブタブ */}
      <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
            activeSubTab === 'overview'
              ? 'bg-indigo-100 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          📊 概要
        </button>
        <button
          onClick={() => setActiveSubTab('exchange')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
            activeSubTab === 'exchange'
              ? 'bg-indigo-100 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          💱 為替レート
        </button>
        <button
          onClick={() => setActiveSubTab('fuel')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
            activeSubTab === 'fuel'
              ? 'bg-indigo-100 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          🛢️ 燃油サーチャージ
        </button>
        <button
          onClick={() => setActiveSubTab('database')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
            activeSubTab === 'database'
              ? 'bg-indigo-100 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          💾 データベース
        </button>
      </div>

      {/* 概要タブ */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">リアルタイム変動要素管理</h3>
              <p className="text-sm text-blue-700 mt-1">
                DDP/DDU APIと連携して、為替レート・燃油サーチャージ・関税率を自動取得・更新します。
              </p>
            </div>
          </div>

          {/* ライブデータカード */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 為替レートカード */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">💱 為替レート (Live)</h3>
                {liveExchangeRate?.success ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    最新
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                    未取得
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                ¥{liveExchangeRate?.calculated_rate?.toFixed(2) || '---'}
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>基本レート: ¥{liveExchangeRate?.base_rate?.toFixed(2) || '---'}</span>
                {liveExchangeRate?.change_percentage !== undefined && (
                  <div className={`flex items-center gap-1 font-medium ${
                    liveExchangeRate.change_percentage > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {liveExchangeRate.change_percentage > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{liveExchangeRate.change_percentage > 0 ? '+' : ''}
                      {liveExchangeRate.change_percentage.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                最終更新: {liveExchangeRate?.rate_date || '---'} | 安全マージン: 3%
              </div>
            </div>

            {/* 燃油サーチャージカード */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">🛢️ 燃油サーチャージ</h3>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                  開発中
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-2">
                {fuelSurcharges?.results ? (
                  Object.entries(fuelSurcharges.results).map(([carrier, data]: [string, any]) => (
                    <div key={carrier} className="flex justify-between items-center">
                      <span>{carrier}</span>
                      <span className={data.success ? 'text-green-600' : 'text-orange-600'}>
                        {data.success ? data.rate + '%' : 'スクレイピング実装待ち'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">データを読み込み中...</p>
                )}
              </div>
            </div>
          </div>

          {/* 一括更新ボタン */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">全ての変動要素を一括更新</h3>
                <p className="text-sm opacity-90">
                  DDP/DDU APIから最新データを取得して更新します
                </p>
              </div>
              <button
                onClick={handleRefreshAll}
                disabled={isRefreshing || apiStatus?.status !== 'healthy'}
                className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>更新中...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>一括更新</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 為替レートタブ */}
      {activeSubTab === 'exchange' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">為替レート (JPY/USD) - Live API</h3>
              <button
                onClick={handleRefreshExchangeRate}
                disabled={isRefreshing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>APIから取得</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">基本レート</div>
                <div className="text-2xl font-bold text-gray-900">
                  ¥{liveExchangeRate?.base_rate?.toFixed(2) || '---'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">安全マージン</div>
                <div className="text-2xl font-bold text-gray-900">3%</div>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4">
                <div className="text-sm text-indigo-600 mb-1">計算用レート</div>
                <div className="text-2xl font-bold text-indigo-900">
                  ¥{liveExchangeRate?.calculated_rate?.toFixed(2) || '---'}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>API URL:</strong> http://localhost:5001/api/exchange-rate
              </p>
              <p className="text-sm text-blue-600 mt-2">
                最終更新: {liveExchangeRate?.rate_date || '---'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 燃油サーチャージタブ */}
      {activeSubTab === 'fuel' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">燃油サーチャージ - DDP/DDU API</h3>

            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg mb-4">
              <p className="text-sm text-orange-700">
                現在スクレイピング実装中。APIは準備済みです（http://localhost:5001/api/fuel-surcharge）
              </p>
            </div>

            <div className="space-y-3">
              {fuelSurcharges?.results && Object.entries(fuelSurcharges.results).map(([carrier, data]: [string, any]) => (
                <div
                  key={carrier}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">{carrier}</div>
                    <div className="text-sm text-gray-500">
                      {data.success ? '取得成功' : data.error}
                    </div>
                  </div>
                  <div className="text-right">
                    {data.success ? (
                      <div className="text-xl font-bold text-gray-900">{data.rate}%</div>
                    ) : (
                      <div className="text-sm text-orange-600">実装待ち</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* データベースタブ */}
      {activeSubTab === 'database' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">データベース状態</h3>

            {dbStatus?.success && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(dbStatus.table_counts || {}).map(([table, count]: [string, any]) => (
                  <div key={table} className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">{table}</div>
                    <div className="text-2xl font-bold text-gray-900">{count} 件</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                データベース: ddp_ddu_adjuster @ localhost:5432
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
