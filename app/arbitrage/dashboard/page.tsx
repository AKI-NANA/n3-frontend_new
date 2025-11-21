/**
 * ハイブリッド無在庫戦略ダッシュボード
 * /arbitrage/dashboard
 *
 * 刈り取りビジネスの全体像を把握するダッシュボード
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DashboardStats {
  totalProducts: number
  trackedProducts: number
  listedProducts: number
  totalInventoryValue: number
  pendingInspection: number
  pendingShipments: number
  todayOrders: number
  reorderNeeded: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    trackedProducts: 0,
    listedProducts: 0,
    totalInventoryValue: 0,
    pendingInspection: 0,
    pendingShipments: 0,
    todayOrders: 0,
    reorderNeeded: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // 並列で複数のクエリを実行
      const [
        totalProductsResult,
        trackedProductsResult,
        listedProductsResult,
        inventoryValueResult,
        pendingInspectionResult,
        pendingShipmentsResult,
        todayOrdersResult,
        reorderNeededResult,
      ] = await Promise.all([
        // 総商品数
        supabase.from('products_master').select('id', { count: 'exact', head: true }),

        // 追跡中商品数
        supabase.from('products_master').select('id', { count: 'exact', head: true }).eq('arbitrage_status', 'tracked'),

        // 出品済み商品数
        supabase.from('products_master').select('id', { count: 'exact', head: true }).eq('arbitrage_status', 'listed_on_multi'),

        // 在庫総額
        supabase.from('products_master').select('physical_inventory_count, cost').not('physical_inventory_count', 'is', null),

        // 検品待ち
        supabase.from('products_master').select('id', { count: 'exact', head: true }).in('arbitrage_status', ['initial_purchased', 'repeat_order_placed']),

        // 発送待ち
        supabase.from('shipment_instructions').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing']),

        // 本日の受注数
        supabase.from('marketplace_orders').select('id', { count: 'exact', head: true }).gte('ordered_at', new Date().toISOString().split('T')[0]),

        // リピート発注が必要な商品数
        supabase.from('products_master').select('id', { count: 'exact', head: true }).lte('physical_inventory_count', 3).eq('arbitrage_status', 'listed_on_multi'),
      ])

      // 在庫総額を計算
      const inventoryData = inventoryValueResult.data || []
      const totalInventoryValue = inventoryData.reduce((sum: number, product: any) => {
        return sum + ((product.physical_inventory_count || 0) * (product.cost || 0))
      }, 0)

      setStats({
        totalProducts: totalProductsResult.count || 0,
        trackedProducts: trackedProductsResult.count || 0,
        listedProducts: listedProductsResult.count || 0,
        totalInventoryValue,
        pendingInspection: pendingInspectionResult.count || 0,
        pendingShipments: pendingShipmentsResult.count || 0,
        todayOrders: todayOrdersResult.count || 0,
        reorderNeeded: reorderNeededResult.count || 0,
      })
    } catch (error) {
      console.error('ダッシュボード統計取得エラー:', error)
      alert('統計データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, subtitle, color, link }: any) => (
    <div className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow">
      {link ? (
        <a href={link} className="block">
          <div className="text-sm text-gray-600 mb-1">{title}</div>
          <div className={`text-3xl font-bold mb-2 ${color}`}>{value}</div>
          {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
        </a>
      ) : (
        <>
          <div className="text-sm text-gray-600 mb-1">{title}</div>
          <div className={`text-3xl font-bold mb-2 ${color}`}>{value}</div>
          {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
        </>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ハイブリッド無在庫戦略ダッシュボード</h1>
        <p className="text-gray-600">
          刈り取りビジネスの全体像を確認できます
        </p>
      </div>

      {/* メインKPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="総商品数"
          value={stats.totalProducts}
          color="text-blue-600"
        />
        <StatCard
          title="追跡中"
          value={stats.trackedProducts}
          color="text-yellow-600"
        />
        <StatCard
          title="出品済み"
          value={stats.listedProducts}
          color="text-green-600"
        />
        <StatCard
          title="在庫総額"
          value={`¥${stats.totalInventoryValue.toLocaleString()}`}
          color="text-purple-600"
        />
      </div>

      {/* アクション必要 */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">🚨 アクションが必要</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="検品待ち"
            value={stats.pendingInspection}
            subtitle="検品・承認画面へ"
            color="text-orange-600"
            link="/arbitrage/inspection"
          />
          <StatCard
            title="発送待ち"
            value={stats.pendingShipments}
            subtitle="発送指示管理画面へ"
            color="text-red-600"
            link="/arbitrage/shipments"
          />
          <StatCard
            title="リピート発注必要"
            value={stats.reorderNeeded}
            subtitle="在庫が3個以下"
            color="text-pink-600"
          />
          <StatCard
            title="本日の受注"
            value={stats.todayOrders}
            color="text-cyan-600"
          />
        </div>
      </div>

      {/* クイックアクション */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">クイックアクション</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/arbitrage/inspection"
            className="bg-green-600 text-white rounded-lg p-6 hover:bg-green-700 transition-colors"
          >
            <div className="text-lg font-semibold mb-2">検品・承認</div>
            <div className="text-sm opacity-90">
              初期ロット・リピート発注商品を承認
            </div>
          </a>
          <a
            href="/arbitrage/shipments"
            className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700 transition-colors"
          >
            <div className="text-lg font-semibold mb-2">発送指示管理</div>
            <div className="text-sm opacity-90">
              倉庫スタッフ向けの発送指示を確認
            </div>
          </a>
          <button
            onClick={async () => {
              const confirmed = window.confirm(
                'リピート発注を手動で実行しますか？\n在庫が3個以下の商品を自動発注します。'
              )
              if (!confirmed) return

              try {
                const response = await fetch('/api/arbitrage/repeat-order', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ dryRun: false }),
                })
                const result = await response.json()
                alert(result.message)
                fetchDashboardStats()
              } catch (error) {
                console.error(error)
                alert('リピート発注に失敗しました')
              }
            }}
            className="bg-purple-600 text-white rounded-lg p-6 hover:bg-purple-700 transition-colors text-left"
          >
            <div className="text-lg font-semibold mb-2">リピート発注実行</div>
            <div className="text-sm opacity-90">
              在庫不足商品を一括リピート発注
            </div>
          </button>
        </div>
      </div>

      {/* システム情報 */}
      <div className="bg-gray-50 border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">システム情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600 mb-1">日次刈り取りスケジューラー</div>
            <div className="font-semibold">毎日 午前2時に自動実行</div>
          </div>
          <div>
            <div className="text-gray-600 mb-1">自動発注閾値</div>
            <div className="font-semibold">在庫が3個以下でリピート発注</div>
          </div>
          <div>
            <div className="text-gray-600 mb-1">初期ロットサイズ</div>
            <div className="font-semibold">5個</div>
          </div>
          <div>
            <div className="text-gray-600 mb-1">P-4スコア閾値</div>
            <div className="font-semibold">70以上で自動選定</div>
          </div>
        </div>
      </div>
    </div>
  )
}
