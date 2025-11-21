/**
 * 発送指示管理画面
 * /arbitrage/shipments
 *
 * 倉庫スタッフ向けの発送指示書を管理するUI
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ShipmentInstruction {
  id: number
  order_id: string
  marketplace: string
  sku: string
  product_name: string
  quantity: number
  shipping_address: any
  packaging_instructions: any
  tracking_number?: string
  shipping_carrier?: string
  status: string
  created_at: string
  shipped_at?: string
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<ShipmentInstruction[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchShipments()
  }, [statusFilter])

  const fetchShipments = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      let query = supabase
        .from('shipment_instructions')
        .select('*')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error

      setShipments(data || [])
    } catch (error) {
      console.error('発送指示取得エラー:', error)
      alert('発送指示の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsShipped = async (orderId: string, trackingNumber: string, carrier: string) => {
    if (!trackingNumber || !carrier) {
      alert('追跡番号と配送業者を入力してください')
      return
    }

    try {
      const response = await fetch('/api/fulfillment/notify-marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          trackingNumber,
          shippingCarrier: carrier,
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert('✅ 発送通知を送信しました')
        fetchShipments()
      } else {
        alert(`❌ 発送通知失敗: ${result.message}`)
      }
    } catch (error) {
      console.error('発送通知エラー:', error)
      alert('発送通知に失敗しました')
    }
  }

  const getMarketplaceBadgeColor = (marketplace: string) => {
    switch (marketplace) {
      case 'amazon_jp': return 'bg-orange-100 text-orange-800'
      case 'yahoo_jp': return 'bg-red-100 text-red-800'
      case 'mercari_c2c': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'shipped': return 'bg-green-100 text-green-800'
      case 'delivered': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

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
        <h1 className="text-3xl font-bold mb-2">発送指示管理</h1>
        <p className="text-gray-600">
          倉庫スタッフ向けの発送指示書を管理します
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        {['all', 'pending', 'processing', 'shipped'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? '全て' : status}
          </button>
        ))}
      </div>

      {shipments.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center">
          <p className="text-gray-500">発送指示書がありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shipments.map((shipment) => (
            <div key={shipment.id} className="bg-white border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getMarketplaceBadgeColor(shipment.marketplace)}`}>
                      {shipment.marketplace}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeColor(shipment.status)}`}>
                      {shipment.status}
                    </span>
                    {shipment.packaging_instructions?.priorityShipping && (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">
                        優先発送
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold">{shipment.product_name}</h3>
                  <p className="text-sm text-gray-600">SKU: {shipment.sku}</p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <div>注文ID: {shipment.order_id}</div>
                  <div>{new Date(shipment.created_at).toLocaleString('ja-JP')}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <h4 className="font-semibold mb-2">配送先</h4>
                  <div className="text-sm text-gray-600">
                    <div>{shipment.shipping_address.name}</div>
                    <div>〒{shipment.shipping_address.postalCode}</div>
                    <div>{shipment.shipping_address.address}</div>
                    {shipment.shipping_address.phone && (
                      <div>Tel: {shipment.shipping_address.phone}</div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 text-red-600">⚠️ 梱包指示</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={shipment.packaging_instructions.useBlankPackaging ? 'text-green-600' : 'text-red-600'}>
                        {shipment.packaging_instructions.useBlankPackaging ? '✓' : '✗'}
                      </span>
                      無地梱包を使用
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={shipment.packaging_instructions.includeOwnInvoice ? 'text-green-600' : 'text-red-600'}>
                        {shipment.packaging_instructions.includeOwnInvoice ? '✓' : '✗'}
                      </span>
                      自社名義納品書を同梱
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={shipment.packaging_instructions.avoidSupplierBranding ? 'text-green-600' : 'text-red-600'}>
                        {shipment.packaging_instructions.avoidSupplierBranding ? '✓' : '✗'}
                      </span>
                      仕入れ先ブランドを除去
                    </div>
                  </div>
                </div>
              </div>

              {shipment.status === 'processing' && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex gap-4">
                    <input
                      type="text"
                      placeholder="追跡番号"
                      id={`tracking-${shipment.order_id}`}
                      className="flex-1 border rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="配送業者（例: ヤマト運輸）"
                      id={`carrier-${shipment.order_id}`}
                      className="flex-1 border rounded px-3 py-2"
                    />
                    <button
                      onClick={() => {
                        const tracking = (document.getElementById(`tracking-${shipment.order_id}`) as HTMLInputElement).value
                        const carrier = (document.getElementById(`carrier-${shipment.order_id}`) as HTMLInputElement).value
                        handleMarkAsShipped(shipment.order_id, tracking, carrier)
                      }}
                      className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      発送完了
                    </button>
                  </div>
                </div>
              )}

              {shipment.tracking_number && (
                <div className="mt-4 pt-4 border-t text-sm">
                  <div className="flex gap-4">
                    <div>
                      <span className="text-gray-600">追跡番号:</span> {shipment.tracking_number}
                    </div>
                    <div>
                      <span className="text-gray-600">配送業者:</span> {shipment.shipping_carrier}
                    </div>
                    {shipment.shipped_at && (
                      <div>
                        <span className="text-gray-600">発送日時:</span> {new Date(shipment.shipped_at).toLocaleString('ja-JP')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
