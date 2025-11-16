import React, { useState, useCallback } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Package, DollarSign } from 'lucide-react';

// --- モックデータ連携 (Phase 1, 5, 8 からの統合データ) ---
const mockMasterListing = {
    title: "PSA 10 GEM MINT Charizard Pokemon Card (Japan Orig.)",
    description: "Highly sought-after Japanese original printing, fully graded by PSA. Includes detailed photos of certification number. Material: Graded Card Stock.",
    master_price_jpy: 850000,
    hs_code_final: '9504.40', // 人間承認済み
    country_of_origin: 'Japan', // AIまたは人間承認済み
    is_vintage: true, // 20年以上前と仮定
    shipping_policy: 'Global DDP (Zone-Optimized)',
};

const MARKETPLACES = [
    { id: 'catawiki', name: 'Catawiki (オークション)', type: 'Auction', color: 'bg-orange-600' },
    { id: 'etsy', name: 'Etsy (ヴィンテージ)', type: 'Fixed', color: 'bg-red-500' },
    { id: 'bonanza', name: 'Bonanza (定額)', type: 'Fixed', color: 'bg-green-600' },
    { id: 'facebook', name: 'Facebook MP (グローバル)', type: 'Fixed', color: 'bg-blue-600' },
];

// --- メインコンポーネント ---
const OptimizedListingEngine = () => {
    const [status, setStatus] = useState({});

    // 4. ステップ：出品データ最適化と送信
    const publishToMarketplace = useCallback(async (market) => {
        setStatus(prev => ({ ...prev, [market.id]: 'Processing' }));

        console.log(`--- ${market.name} への出品開始 ---`);
        
        // 4-1. データマッピングと調整 (コアロジック)
        const optimizedData = {
            ...mockMasterListing,
            // 4-2. CataWiki特有の調整
            listing_type: market.type === 'Auction' ? 'Weekly Auction' : 'Fixed Price',
            reserve_price: market.id === 'catawiki' ? mockMasterListing.master_price_jpy * 0.7 : null, // 利益保証最低価格
            // 4-3. Etsy特有の調整
            is_handmade_vintage: market.id === 'etsy' ? mockMasterListing.is_vintage : false,
            title: market.id === 'etsy' ? `Vintage ${mockMasterListing.country_of_origin} ${mockMasterListing.title}` : mockMasterListing.title,
            // 4-4. DDP/HSコードの組み込み
            tax_code: mockMasterListing.hs_code_final, // 確定HSコードをそのまま使用
            price_setter: 'Phase 8 DDP Engine', // DDP計算後の価格を使用
        };

        // 4-5. API送信シミュレーション (関税・HSコード検証を最後に確認)
        console.log(`  -> 最終HSコード: ${optimizedData.tax_code} (確定)`);
        console.log(`  -> 予想最終価格 (USD換算): $6,500.00 (DDPコスト込み)`);

        // 4-6. 出品APIコール（成功・失敗のシミュレーション）
        await new Promise(resolve => setTimeout(resolve, 800)); 
        
        setStatus(prev => ({ ...prev, [market.id]: 'Success' }));
        console.log(`--- ${market.name} 出品完了 ---`);
        
    }, []);

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center">
                <UploadCloud className="w-8 h-8 mr-3 text-indigo-700" />
                Phase 8: 多モール出品最適化エンジン
            </h1>

            {/* マスターデータのサマリー */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8 border-l-4 border-indigo-600">
                <h2 className="text-xl font-bold text-gray-800">マスターリスティング: {mockMasterListing.title}</h2>
                <div className="mt-2 text-sm space-y-1">
                    <p className="flex items-center text-gray-700"><Package className="w-4 h-4 mr-2 text-indigo-500" /> **確定HSコード**: {mockMasterListing.hs_code_final} (承認済)</p>
                    <p className="flex items-center text-gray-700"><DollarSign className="w-4 h-4 mr-2 text-indigo-500" /> **配送ポリシー**: {mockMasterListing.shipping_policy} (DDP計算済)</p>
                </div>
            </div>

            {/* 出品実行パネル */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {MARKETPLACES.map((market) => {
                    const currentStatus = status[market.id];
                    const icon = currentStatus === 'Success' ? CheckCircle : currentStatus === 'Processing' ? AlertTriangle : UploadCloud;
                    const iconColor = currentStatus === 'Success' ? 'text-green-500' : currentStatus === 'Processing' ? 'animate-spin text-yellow-500' : 'text-white';
                    
                    return (
                        <div key={market.id} className={`${market.color} p-5 rounded-lg shadow-xl text-white flex flex-col items-center`}>
                            <h3 className="text-2xl font-bold mb-2">{market.name}</h3>
                            <p className="text-sm opacity-90 mb-4">{market.type}形式 / DDP適用</p>
                            
                            <button
                                onClick={() => publishToMarketplace(market)}
                                disabled={currentStatus === 'Processing'}
                                className={`w-full py-2 mt-auto font-semibold rounded-md transition-all flex justify-center items-center ${currentStatus === 'Success' ? 'bg-green-500 hover:bg-green-600' : currentStatus === 'Processing' ? 'bg-gray-400' : 'bg-indigo-700 hover:bg-indigo-800'}`}
                            >
                                {React.createElement(icon, { className: `w-5 h-5 mr-2 ${iconColor}` })}
                                {currentStatus === 'Success' ? '出品完了' : currentStatus === 'Processing' ? '処理中...' : '最適化して出品'}
                            </button>
                        </div>
                    );
                })}
            </div>
            
        </div>
    );
};

export default OptimizedListingEngine;