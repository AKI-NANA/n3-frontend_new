'use client'

import { useEffect, useState } from 'react'

export default function MasterViewPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('🔍 Fetching data...')
    fetch('/api/debug/raw-master')
      .then(res => res.json())
      .then(data => {
        console.log('📦 Received data:', data)
        console.log('📊 Total products:', data.all_data?.length)
        
        // 画像があるものをログ
        const withImages = data.all_data?.filter((p: any) => p.primary_image_url)
        console.log('🖼️ Products with images:', withImages?.length)
        withImages?.forEach((p: any) => {
          console.log(`  - ${p.sku}: ${p.primary_image_url}`)
        })
        
        setProducts(data.all_data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('❌ Error:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-8">読み込み中...</div>
  if (error) return <div className="p-8 text-red-600">エラー: {error}</div>

  const withImages = products.filter(p => p.primary_image_url)
  const withoutImages = products.filter(p => !p.primary_image_url)

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Products Master 画像チェック</h1>
      
      <div className="mb-6 flex gap-4">
        <div className="bg-green-100 p-4 rounded">
          <div className="text-2xl font-bold">{withImages.length}</div>
          <div className="text-sm">画像あり</div>
        </div>
        <div className="bg-gray-100 p-4 rounded">
          <div className="text-2xl font-bold">{withoutImages.length}</div>
          <div className="text-sm">画像なし</div>
        </div>
        <div className="bg-blue-100 p-4 rounded">
          <div className="text-2xl font-bold">{products.length}</div>
          <div className="text-sm">合計</div>
        </div>
      </div>

      {/* 画像ありセクション */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">🖼️ 画像あり ({withImages.length}件)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {withImages.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow p-4">
              <div className="mb-2 h-48 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                {product.primary_image_url ? (
                  <>
                    <img 
                      src={product.primary_image_url} 
                      alt={product.title}
                      className="max-w-full max-h-full object-contain"
                      onLoad={() => console.log('✅ Image loaded:', product.sku)}
                      onError={(e) => {
                        console.error('❌ Image error:', product.sku, product.primary_image_url)
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        target.parentElement!.innerHTML = '<div class="text-red-500 text-xs p-2">画像エラー</div>'
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                      {product.primary_image_url}
                    </div>
                  </>
                ) : (
                  <div className="text-gray-400">URLあるが表示できない</div>
                )}
              </div>
              
              <div className="text-xs text-gray-500 mb-1">
                {product.sku}
              </div>
              <h3 className="font-bold text-sm line-clamp-2 mb-2">{product.title}</h3>
              <div className="text-xs break-all text-blue-600">
                {product.primary_image_url}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 画像なしセクション */}
      <div>
        <h2 className="text-2xl font-bold mb-4">📦 画像なし ({withoutImages.length}件)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {withoutImages.slice(0, 10).map(product => (
            <div key={product.id} className="bg-white rounded p-3 text-sm">
              <div className="text-xs text-gray-500">{product.sku}</div>
              <div className="font-bold line-clamp-1">{product.title}</div>
              <div className="text-xs text-gray-400">{product.source_system}</div>
            </div>
          ))}
        </div>
        {withoutImages.length > 10 && (
          <div className="mt-4 text-gray-500 text-sm">
            ...他 {withoutImages.length - 10} 件
          </div>
        )}
      </div>
    </div>
  )
}
