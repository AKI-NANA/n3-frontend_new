'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DebugDataPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    
    try {
      // 0. テーブル構造を確認
      console.log('🔍 テーブル構造確認中...');
      const { data: columnsData } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'products')
        .order('ordinal_position');
      
      console.log('📋 productsテーブルのカラム:', columnsData);
      
      // 1. 商品データを取得
      console.log('📦 商品データ取得中...');
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .limit(5);
      
      if (productsError) {
        console.error('❌ 商品取得エラー:', productsError);
        throw productsError;
      }
      
      console.log('✅ 商品データ取得成功:', productsData?.length || 0, '件');
      console.log('📊 最初の商品:', JSON.stringify(productsData?.[0], null, 2));
      console.log('🔑 最初の商品のキー:', productsData?.[0] ? Object.keys(productsData[0]) : []);
      setProducts(productsData || []);

      // 2. テンプレートデータを取得
      console.log('📝 テンプレートデータ取得中...');
      const { data: templatesData, error: templatesError } = await supabase
        .from('html_templates')
        .select('*')
        .limit(5);
      
      if (templatesError) {
        console.error('⚠️ テンプレート取得エラー:', templatesError.message);
      } else {
        console.log('✅ テンプレートデータ取得成功:', templatesData?.length || 0, '件');
        setTemplates(templatesData || []);
      }

    } catch (err: any) {
      console.error('❌ エラー発生:', err);
      setError(err.message || '不明なエラー');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">🔍 データベースデバッグ</h1>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔍 データベースデバッグ</h1>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800 font-semibold">❌ エラー</p>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* 商品データ */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">📦 商品データ ({products.length}件)</h2>
        
        {products.length === 0 ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-yellow-800">⚠️ 商品データがありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product, idx) => (
              <div key={product.id} className="p-4 bg-gray-50 border rounded">
                <h3 className="font-bold mb-2">商品 #{idx + 1} (ID: {product.id})</h3>
                
                {/* データソース表示 */}
                <div className="mb-3 p-2 rounded" style={{
                  backgroundColor: product.data_source === 'sample' ? '#fff3cd' : 
                                 product.data_source === 'tool' ? '#d4edda' :
                                 product.data_source === 'scraped' ? '#d1ecf1' :
                                 '#f8f9fa'
                }}>
                  <p className="font-bold">
                    📌 データソース: 
                    <span className="ml-2 px-2 py-1 rounded text-xs" style={{
                      backgroundColor: product.data_source === 'sample' ? '#ffc107' : 
                                     product.data_source === 'tool' ? '#28a745' :
                                     product.data_source === 'scraped' ? '#17a2b8' : '#6c757d',
                      color: 'white'
                    }}>
                      {product.data_source || 'manual'}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>SKU:</strong> {product.sku || '❌ なし'}</p>
                    <p><strong>Title:</strong> {product.title || '❌ なし'}</p>
                    <p><strong>English Title:</strong> {product.english_title || '❌ なし'}</p>
                    <p><strong>Price JPY:</strong> {product.price_jpy || '❌ なし'}</p>
                    <p><strong>Price USD:</strong> {product.price_usd || '❌ なし'}</p>
                    <p><strong>DDP Price:</strong> {product.ddp_price_usd || '❌ なし'}</p>
                    <p><strong>DDU Price:</strong> {product.ddu_price_usd || '❌ なし'}</p>
                  </div>
                  
                  <div>
                    <p><strong>画像数:</strong> {product.image_count || 0}</p>
                    <p><strong>HTML適用済み:</strong> {product.html_applied ? '✅' : '❌'}</p>
                    <p><strong>出品準備完了:</strong> {product.ready_to_list ? '✅' : '❌'}</p>
                    <p><strong>Condition:</strong> {product.condition || '❌ なし'}</p>
                    <p><strong>Stock:</strong> {product.stock_quantity || '❌ なし'}</p>
                  </div>
                </div>

                {/* ツール処理状況 */}
                {product.tool_processed && (
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="font-semibold text-sm mb-1">🔧 ツール処理状況:</p>
                    <div className="flex gap-2 flex-wrap text-xs">
                      <span className={product.tool_processed.category ? 'text-green-600' : 'text-gray-400'}>
                        {product.tool_processed.category ? '✅' : '❌'} Category
                      </span>
                      <span className={product.tool_processed.shipping ? 'text-green-600' : 'text-gray-400'}>
                        {product.tool_processed.shipping ? '✅' : '❌'} Shipping
                      </span>
                      <span className={product.tool_processed.profit ? 'text-green-600' : 'text-gray-400'}>
                        {product.tool_processed.profit ? '✅' : '❌'} Profit
                      </span>
                      <span className={product.tool_processed.html ? 'text-green-600' : 'text-gray-400'}>
                        {product.tool_processed.html ? '✅' : '❌'} HTML
                      </span>
                      <span className={product.tool_processed.mirror ? 'text-green-600' : 'text-gray-400'}>
                        {product.tool_processed.mirror ? '✅' : '❌'} Mirror
                      </span>
                    </div>
                  </div>
                )}

                {/* scraped_data */}
                {product.scraped_data && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-semibold text-blue-600">
                      📊 scraped_data を表示
                    </summary>
                    <pre className="mt-2 p-2 bg-white border rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(product.scraped_data, null, 2)}
                    </pre>
                  </details>
                )}

                {/* listing_data */}
                {product.listing_data && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-semibold text-green-600">
                      📋 listing_data を表示
                    </summary>
                    <pre className="mt-2 p-2 bg-white border rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(product.listing_data, null, 2)}
                    </pre>
                  </details>
                )}

                {/* image_urls */}
                {product.image_urls && (
                  <div className="mt-2">
                    <p className="font-semibold">🖼️ 画像URL ({product.image_urls.length || 0}枚)</p>
                    <div className="flex gap-2 mt-2 overflow-auto">
                      {product.image_urls.map((url: string, i: number) => (
                        <img 
                          key={i} 
                          src={url} 
                          alt={`Image ${i+1}`}
                          className="w-24 h-24 object-cover border rounded"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* テンプレートデータ */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">📝 HTMLテンプレート ({templates.length}件)</h2>
        
        {templates.length === 0 ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-yellow-800">⚠️ テンプレートデータがありません</p>
            <p className="text-sm text-yellow-600 mt-2">
              `/supabase/fix_missing_data.sql` を実行してください
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="p-4 bg-gray-50 border rounded">
                <p><strong>Name:</strong> {template.name}</p>
                <p><strong>Template ID:</strong> {template.template_id}</p>
                <p><strong>Category:</strong> {template.category}</p>
                <p><strong>Default Preview:</strong> {template.is_default_preview ? '✅' : '❌'}</p>
                
                {template.languages && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-semibold text-purple-600">
                      🌐 Languages を表示
                    </summary>
                    <pre className="mt-2 p-2 bg-white border rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(template.languages, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* アクション */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-bold mb-2">🔧 データベースセットアップ</h3>
        
        <div className="space-y-2 mb-4">
          <button
            onClick={async () => {
              if (!confirm('完全なサンプルデータを投入しますか？（既存のサンプルは更新されます）')) return;
              
              const res = await fetch('/api/admin/setup-database', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'insert_samples' })
              });
              const result = await res.json();
              
              if (result.success) {
                alert('✅ ' + result.message);
                loadData();
              } else {
                alert('❌ ' + result.message);
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            ✨ 完全なサンプルデータを投入
          </button>
        </div>
        
        <ul className="text-sm space-y-1">
          <li>✅ 商品データが表示されている → データ構造を確認</li>
          <li>❌ 商品データがない → サンプルデータを投入する必要あり</li>
          <li>❌ テンプレートがない → `/supabase/fix_missing_data.sql` を実行</li>
          <li>✅ 全て揃っている → EditingTableでの表示ロジックを修正</li>
        </ul>
      </div>
    </div>
  );
}
