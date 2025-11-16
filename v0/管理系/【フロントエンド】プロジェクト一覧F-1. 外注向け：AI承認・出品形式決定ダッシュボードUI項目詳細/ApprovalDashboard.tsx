// /components/outsource/ApprovalDashboard.tsx (外注承認ダッシュボード)

import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard'; 
// 💡 B-2で実装したAPIルートを参照
// import { fetchSortedProducts } from '@/api/products'; 
import { Product } from '@/types/product';

export default function ApprovalDashboard() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // (１) 並べ替え表示：B-2で算出した priority_score の降順で商品リストを表示
        async function loadProducts() {
            setLoading(true);
            try {
                // 💡 APIから priority_score 降順のデータを取得
                // const data = await fetchSortedProducts();
                // setProducts(data);
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch sorted products:", error);
                setLoading(false);
            }
        }
        loadProducts();
    }, []);

    if (loading) return <div>優先度の高い商品をロード中...</div>;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">✨ AI承認・出品形式決定ダッシュボード</h1>
            <p className="mb-6 text-sm text-gray-500">
                **優先度スコア**に基づき降順で表示しています。スコアの高い順に承認してください。
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
}

// ProductCard コンポーネント (各商品の承認UIを内包)
const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
    const [selectedFormat, setSelectedFormat] = useState<'単品' | 'セット' | 'バリエーション'>(product.ai_analysis_data?.initial_ui_score ? '単品' : '単品'); // 初期値は仮
    
    // (２) Gemini判定結果表示
    const isVeroRisk = product.ai_analysis_data?.vero_risk_level === 'High';
    const recommendedFormat = product.ai_analysis_data?.data_type || '単品'; // Geminiの推奨形式を想定

    const handleApproval = async () => {
        // (４) 承認後の処理：DBの status を '承認済' に更新し、自動出品キューにデータを転送
        // 💡 API呼び出しロジックを実装
        // await approveProduct(product.id, selectedFormat); 
        alert(`商品 ${product.asin_sku} を ${selectedFormat} 形式で承認しました。`);
    };

    return (
        <div className={`border p-4 rounded-lg shadow-md ${isVeroRisk ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold">{product.asin_sku}</h3>
                <span className="text-xl font-mono text-blue-600">Score: {product.priority_score}</span>
            </div>

            {/* (２) リスク判定と推奨形式表示 */}
            <div className="flex items-center space-x-2 mb-3">
                {isVeroRisk ? 
                    <span className="text-red-600 font-bold">🚨 VERO高リスク</span> : 
                    <span className="text-green-600">✅ リスク低</span>
                }
                <span className="text-yellow-600 font-bold">推奨: {recommendedFormat} ✨</span>
            </div>
            
            {/* (４) バリエーション推奨時の指示文 */}
            {recommendedFormat === 'バリエーション' && (
                <p className="text-xs text-indigo-700 bg-indigo-100 p-2 rounded my-2">
                    **💡 この商品はバリエーション推奨です。** 対象サイトのグループ機能を参照し、シリーズに追加してください。
                </p>
            )}

            {/* (３) 出品形式選択と承認 */}
            <label className="block text-sm font-medium mt-4">出品形式選択:</label>
            <select 
                value={selectedFormat} 
                onChange={(e) => setSelectedFormat(e.target.value as any)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
                <option value="単品">単品</option>
                <option value="セット">セット</option>
                <option value="バリエーション">バリエーション</option>
            </select>

            <button 
                onClick={handleApproval}
                className="mt-4 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
                ✅ 承認 (出品キューへ転送)
            </button>
        </div>
    );
};