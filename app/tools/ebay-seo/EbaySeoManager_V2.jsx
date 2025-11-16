import React, { useState, useMemo, useCallback } from 'react';
import { Target, TrendingDown, Clock, Search, RotateCw, Trash2, Edit, Zap, AlertTriangle, DollarSign, Repeat, List, ToggleRight } from 'lucide-react';

// --- 定数と設定 ---
const MAX_DAYS_FOR_DEAD_LISTING = 90;
const PROFIT_GUARANTEE_MARGIN = 500; // 最低目標利益 ¥500

// --- モックデータ ---
const mockListings = [
    { id: 'LST-A01', title: 'ポケカ 毎日オークション', category: 'トレーディングカード', daysActive: 5, views: 2000, sales: 5, score: 100, type: 'Auction_Anchor', cost: 5000, fee: 800 },
    { id: 'LST-D01', title: '大量出品アイテム X', category: '電子機器', daysActive: 150, views: 50, sales: 0, score: 20, type: 'Fixed_Price', cost: 1000, fee: 100 },
    { id: 'LST-C01', title: '注目だが売れない Z', category: 'ファッション', daysActive: 60, views: 1000, sales: 0, score: 55, type: 'Fixed_Price', cost: 8000, fee: 1000 },
];

const mockCategoryStatus = [
    { category: 'トレーディングカード', dailyAuctionStatus: '実行中', auctionEffect: 'A (高)', recentViewsLift: '+25%' },
    { category: 'ファッション', dailyAuctionStatus: '実行中', auctionEffect: 'B (中)', recentViewsLift: '+10%' },
    { category: 'ホビー', dailyAuctionStatus: '未設定', auctionEffect: 'C (低)', recentViewsLift: 'N/A' },
    { category: '電子機器', dailyAuctionStatus: 'エラー', auctionEffect: 'D (無)', recentViewsLift: '-5%' },
];

// --- ユーティリティ関数 ---
const formatCurrency = (amount) => `¥${amount.toLocaleString()}`;

// --- コアロジック: リスティング健全性スコア計算（Fixed Price用） ---
const calculateHealthScore = (listing) => {
    let score = 100;
    if (listing.type === 'Auction_Anchor') return 100;
    
    // 長期非売却ペナルティ
    if (listing.daysActive > MAX_DAYS_FOR_DEAD_LISTING && listing.sales === 0) {
        score -= 40; 
    }
    // ... (他のペナルティロジックはV1と同様)
    return Math.max(10, Math.min(100, Math.round(score)));
};

// --- メインコンポーネント ---
const EbaySeoManagerV2 = () => {
    const [listings, setListings] = useState(mockListings.map(l => ({ ...l, score: calculateHealthScore(l) })));
    
    const handleAction = useCallback((id, action) => {
        alert(`リスティング ID: ${id} に対し、アクション: 「${action}」を実行しました。`);
        if (action === '即時終了' || action === '定額へ変換') {
            setListings(prev => prev.filter(l => l.id !== id)); // 例としてリストから削除
        }
    }, []);

    const getProfitStartPrice = useCallback((listing) => {
        return listing.cost + listing.fee + PROFIT_GUARANTEE_MARGIN;
    }, []);

    // 1. オークション制御センター
    const AuctionControlCenter = () => {
        const [targetListingId, setTargetListingId] = useState('LST-C01');
        
        const convertToAuction = () => {
            alert(`リスティング ID: ${targetListingId} をオークションに変換し、開始価格 ${formatCurrency(10000)} で設定しました。`);
        };
        
        const createNewAuction = (category) => {
            alert(`【${category}】で新規オークションを作成し、利益保証スタート価格で出品を開始しました。`);
        };

        return (
            <div className="bg-white p-6 rounded-lg shadow-xl border border-indigo-500 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                    <List className="w-6 h-6 mr-2 text-indigo-600" />
                    オークション出品/変換ツール
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 新規オークション出品 */}
                    <div className="border p-4 rounded-lg bg-indigo-50">
                        <h3 className="text-lg font-semibold text-indigo-800 flex items-center mb-2">
                            <Repeat className="w-5 h-5 mr-2" /> 新規アンカーオークション作成
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">全カテゴリーで**利益保証スタート**のオークションを即時開始します。</p>
                        <select 
                            className="w-full p-2 border rounded mb-3"
                            defaultValue="トレーディングカード"
                        >
                            {mockCategoryStatus.map(s => <option key={s.category} value={s.category}>{s.category}</option>)}
                        </select>
                        <button 
                            className="w-full p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            onClick={() => createNewAuction('選択カテゴリー')}
                        >
                            新規オークション作成・実行
                        </button>
                    </div>

                    {/* 既存の定額出品をオークションに変換 */}
                    <div className="border p-4 rounded-lg bg-purple-50">
                        <h3 className="text-lg font-semibold text-purple-800 flex items-center mb-2">
                            <ToggleRight className="w-5 h-5 mr-2" /> 既存リスティングをオークションへ
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">特定の定額出品をオークションに一時的に変換し、集客をブーストします。</p>
                        <input 
                            type="text" 
                            placeholder="リスティングIDを入力 (例: LST-C01)" 
                            className="w-full p-2 border rounded mb-3"
                            value={targetListingId}
                            onChange={(e) => setTargetListingId(e.target.value)}
                        />
                        <button 
                            className="w-full p-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                            onClick={convertToAuction}
                        >
                            オークションへ変換・出品
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // 2. カテゴリー別オークションステータス
    const CategoryAuctionStatus = () => {
        return (
            <div className="bg-white p-6 rounded-lg shadow-xl border border-teal-500 mb-8">
                 <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                    <Clock className="w-6 h-6 mr-2 text-teal-600" />
                    カテゴリー別 毎日オークション実施状況と効果
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                    **全カテゴリー**で**毎日オークション**が実行されているかを監視し、その**SEO効果**を評価します。
                </p>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">カテゴリー</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">毎日オークション実行</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">自動切り替えステータス</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SEO効果 (Views Lift)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">評価</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {mockCategoryStatus.map((status) => (
                                <tr key={status.category} className={status.dailyAuctionStatus === 'エラー' ? 'bg-red-50' : 'hover:bg-gray-50'}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{status.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.dailyAuctionStatus === '実行中' ? 'bg-green-100 text-green-800' : status.dailyAuctionStatus === '未設定' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                            {status.dailyAuctionStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {status.dailyAuctionStatus === '実行中' ? '✅ 定額/再オークションに自動切り替え' : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                                        {status.recentViewsLift}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                                        <span className={status.auctionEffect.startsWith('A') ? 'text-green-600' : status.auctionEffect.startsWith('C') ? 'text-orange-600' : 'text-gray-600'}>
                                            {status.auctionEffect}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // 3. オークション終了後・定額への自動切り替え待ちリスト（シミュレーション）
    const AutoConversionWatchList = () => {
        // オークション終了後、定額に自動で切り替えるべきリスティングのリスト（モック）
        const finishedAuctions = [
            { id: 'LST-E01', title: 'オークション終了-未販売', category: 'ホビー', status: '入札なし', action: '定額へ自動変換中' },
            { id: 'LST-E02', title: '一点もの-在庫ロス', category: 'アート', status: '入札なし', action: '在庫ロスで自動終了済' },
        ];

        return (
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300 mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <RotateCw className="w-5 h-5 mr-2 text-blue-600" />
                    オークション自動切り替え/再出品監視リスト
                </h3>
                <div className="text-sm text-gray-600 space-y-2">
                    {finishedAuctions.map(item => (
                        <div key={item.id} className="flex justify-between items-center border-b pb-1">
                            <span className="font-medium text-gray-700">{item.title} ({item.category})</span>
                            <span className={`font-semibold ${item.action.includes('自動変換中') ? 'text-blue-600' : 'text-green-600'}`}>{item.action}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // --- レイアウト ---
    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center">
                <TrendingDown className="w-8 h-8 mr-3 text-orange-700" />
                Phase 7: eBay SEO/リスティング健全性マネージャー V2.0
            </h1>
            <p className="text-gray-600 mb-6 font-semibold">
                **売上最大化のコア機能**: オークションによる**集客ブースト**と、非効率なリスティングの**自動排除**を統合管理します。
            </p>

            <AuctionControlCenter />
            <CategoryAuctionStatus />
            <AutoConversionWatchList />
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-2 text-red-600" />
                死に筋・低スコア リスティング対応優先度リスト (C3)
            </h2>
            {/* V1のリスティング詳細テーブルを継続 */}
            <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
                {/* ... V1のテーブルロジックをここに統合 ... */}
                <p className="p-4 text-sm text-gray-500">（ここでは簡略化のためテーブル詳細は省略しますが、V1のスコアに基づく対応優先度リストがここに表示されます）</p>
                {listings.filter(l => l.score < 70 && l.type === 'Fixed_Price').map(l => (
                    <div key={l.id} className="p-2 border-t flex justify-between items-center bg-red-50">
                        <span className="text-sm font-medium text-red-800">{l.title} (スコア: {l.score})</span>
                        <button onClick={() => handleAction(l.id, '即時終了')} className="text-xs bg-red-500 text-white px-2 py-1 rounded">即時終了</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EbaySeoManagerV2;