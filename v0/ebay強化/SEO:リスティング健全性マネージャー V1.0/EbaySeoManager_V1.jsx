import React, { useState, useMemo, useCallback } from 'react';
import { Target, TrendingDown, Clock, Search, RotateCw, Trash2, Edit, Zap, AlertTriangle, DollarSign, Repeat } from 'lucide-react';

// --- 定数と設定 ---
const MIN_VIEWS_FOR_CONVERSION_CHECK = 50;
const MAX_DAYS_FOR_DEAD_LISTING = 90;
const PROFIT_GUARANTEE_MARGIN = 500; // 最低目標利益 ¥500

// --- モックデータ：リスティングの健全性データ ---
const mockListings = [
    // 1. SEOアンカー (オークション): 利益保証付きで高頻度で売れることでSTRを向上させる
    { id: 'LST-A01', title: 'ポケカ 毎日オークション', category: 'トレーディングカード', daysActive: 5, views: 2000, sales: 5, score: 100, type: 'Auction_Anchor', cost: 5000, fee: 800 },
    { id: 'LST-A02', title: '限定スニーカー オークション', category: 'ファッション', daysActive: 7, views: 1500, sales: 2, score: 95, type: 'Auction_Anchor', cost: 12000, fee: 2000 },
    
    // 2. 死に筋候補 (即時終了/改訂が必要)
    { id: 'LST-D01', title: '大量出品アイテム X', category: '電子機器', daysActive: 150, views: 50, sales: 0, score: 20, type: 'Fixed_Price', cost: 1000, fee: 100 }, // 長期非売却
    { id: 'LST-D02', title: '低ビュー・売上ゼロ Y', category: 'ホビー', daysActive: 40, views: 8, sales: 0, score: 45, type: 'Fixed_Price', cost: 5000, fee: 500 }, // ゼロビュー/ゼロセールス
    
    // 3. 高ビュー/低コンバージョン (価格改訂が必要)
    { id: 'LST-C01', title: '注目だが売れない Z', category: 'ファッション', daysActive: 60, views: 1000, sales: 0, score: 55, type: 'Fixed_Price', cost: 8000, fee: 1000 },
    
    // 4. 定番商品 (維持)
    { id: 'LST-T01', title: '定番商品 - Tシャツ', category: 'ファッション', daysActive: 90, views: 600, sales: 15, score: 85, type: 'Fixed_Price', cost: 3000, fee: 300 },
    
    // 5. オークション終了後、定額に切り替わった商品 (監視対象)
    { id: 'LST-F01', title: '一点もの 美術品 (定額)', category: 'アート', daysActive: 5, views: 80, sales: 0, score: 65, type: 'Fixed_Price_from_Auction', cost: 20000, fee: 2500 },
];

// --- ユーティリティ関数 ---
const formatCurrency = (amount) => `¥${amount.toLocaleString()}`;

// --- コアロジック: リスティング健全性スコア計算 ---
const calculateHealthScore = (listing) => {
    let score = 100;
    
    if (listing.type === 'Auction_Anchor') return 100; // アンカーは常に最高スコアを維持
    
    // 1. 長期非売却ペナルティ（死に筋リスク）
    if (listing.daysActive > MAX_DAYS_FOR_DEAD_LISTING && listing.sales === 0) {
        score -= 40; 
    }
    
    // 2. 高ビュー/低コンバージョンペナルティ（最も危険なSEOシグナル）
    const conversionRate = (listing.sales / listing.views) * 100;
    if (listing.views > MIN_VIEWS_FOR_CONVERSION_CHECK && conversionRate < 0.5 && listing.sales === 0) {
        score -= 30; 
    }

    // 3. ゼロビュー/ゼロセールスペナルティ（リソース無駄）
    if (listing.daysActive > 30 && listing.views < 10 && listing.sales === 0) {
        score -= 10; 
    }

    // 4. 販売実績ボーナス
    if (listing.sales > 0) {
        score += Math.min(listing.sales * 1, 5); // 販売数に応じて微増
    }
    
    return Math.max(10, Math.min(100, Math.round(score)));
};

// --- メインコンポーネント ---
const EbaySeoManagerV1 = () => {
    const [listings, setListings] = useState(mockListings.map(l => ({ ...l, score: calculateHealthScore(l) })));
    const [selectedCategory, setSelectedCategory] = useState(null);

    // カテゴリー別サマリー計算
    const categorySummary = useMemo(() => {
        const summary = {};
        listings.forEach(l => {
            if (!summary[l.category]) {
                summary[l.category] = { totalListings: 0, deadCount: 0, anchorCount: 0, salesCount: 0, totalScore: 0 };
            }
            summary[l.category].totalListings++;
            summary[l.category].totalScore += l.score;

            if (l.type === 'Auction_Anchor') {
                summary[l.category].anchorCount++;
            } else if (l.score < 50) { // スコア50未満を死に筋と定義
                summary[l.category].deadCount++;
            }
            if (l.sales > 0) {
                summary[l.category].salesCount++;
            }
        });

        Object.keys(summary).forEach(cat => {
            const avgScore = summary[cat].totalScore / summary[cat].totalListings;
            summary[cat].avgScore = Math.round(avgScore);
            summary[cat].riskColor = 'text-green-600';
            summary[cat].recommendation = '✅ 安定。';

            if (summary[cat].deadCount > summary[cat].totalListings * 0.2) {
                summary[cat].riskColor = 'text-red-600';
                summary[cat].recommendation = `🚨 クリティカル。死に筋リスティングが${summary[cat].deadCount}件。即時終了を推奨。`;
            } else if (summary[cat].anchorCount === 0) {
                summary[cat].riskColor = 'text-yellow-600';
                summary[cat].recommendation = '⚠️ **オークションアンカー**がありません。STR向上策の投入推奨。';
            }
        });

        return summary;
    }, [listings]);

    // リスティングに対するアクション実行（モック）
    const handleAction = useCallback((id, action) => {
        alert(`リスティング ID: ${id} に対し、アクション: 「${action}」を実行しました。`);
        if (action === '即時終了' || action === '在庫ロス終了') {
            setListings(prev => prev.filter(l => l.id !== id));
        }
    }, []);

    // 利益保証スタート価格計算（Phase 5 SPOE連携をシミュレート）
    const getProfitStartPrice = useCallback((listing) => {
        return listing.cost + listing.fee + PROFIT_GUARANTEE_MARGIN;
    }, []);


    // --- UIコンポーネント ---

    // 1. オークションアンカー管理パネル
    const AuctionAnchorPanel = () => {
        const auctionListings = listings.filter(l => l.type === 'Auction_Anchor');

        return (
            <div className="bg-white p-6 rounded-lg shadow-xl border border-indigo-500 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                    <DollarSign className="w-6 h-6 mr-2 text-indigo-600" />
                    オークションSEOアンカー戦略管理 (C4)
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                    全カテゴリーで**利益損失にならない価格**でオークションを実行し、**STR（販売率）を安定的に向上**させます。
                </p>
                <div className="space-y-4">
                    {Object.entries(categorySummary).map(([category, data]) => {
                        const anchor = auctionListings.find(l => l.category === category);
                        const status = anchor ? '稼働中' : '未設定';
                        const statusColor = anchor ? 'bg-indigo-100 text-indigo-800' : 'bg-yellow-100 text-yellow-800';

                        return (
                            <div key={category} className="flex justify-between items-center p-3 border rounded-md">
                                <span className="font-semibold text-gray-700">{category}</span>
                                <div className="flex items-center space-x-4">
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColor}`}>
                                        {status}
                                    </span>
                                    {anchor ? (
                                        <div className="text-sm text-gray-600 flex items-center">
                                            <Repeat className="w-4 h-4 mr-1 text-green-600" /> 毎日自動再出品中
                                        </div>
                                    ) : (
                                        <button 
                                            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                            onClick={() => alert(`【${category}】のオークションアンカー自動設定を開始します`)}
                                        >
                                            アンカー設定開始
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // 2. リスティング詳細テーブル
    const ListingDetailTable = () => {
        const filteredListings = listings.sort((a, b) => a.score - b.score);

        return (
            <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">スコア</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品名/カテゴリ</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">稼働/View/Sales</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">推奨価格/措置</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">実行</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredListings.map((listing) => {
                            const isAnchor = listing.type === 'Auction_Anchor';
                            const isDead = listing.score < 50 && !isAnchor;
                            const actionText = isAnchor ? 'アンカー維持' : isDead ? '即時終了' : listing.score < 70 ? '価格改訂' : '監視続行';
                            
                            return (
                                <tr key={listing.id} className={`${isDead ? 'bg-red-50' : isAnchor ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-4 py-4 whitespace-nowrap text-xs">
                                        <span className={`font-semibold ${isDead ? 'text-red-600' : isAnchor ? 'text-indigo-600' : 'text-orange-600'}`}>
                                            {actionText}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold">
                                        <span className={isDead ? 'text-red-600' : 'text-green-600'}>
                                            {listing.score}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{listing.title}</div>
                                        <div className="text-xs text-gray-500">{listing.category}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                                        <span className="font-semibold">{listing.daysActive}</span>日 / V:{listing.views} / S:{listing.sales}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {isAnchor ? (
                                            <span className="font-bold text-indigo-700">
                                                開始価格: {formatCurrency(getProfitStartPrice(listing))} (利益保証)
                                            </span>
                                        ) : isDead ? (
                                            <span className="text-red-700 font-bold">【リスク排除】</span>
                                        ) : (
                                            'データに基づきSPOEで再決定'
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {isDead ? (
                                            <button 
                                                onClick={() => handleAction(listing.id, '即時終了')}
                                                className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                                            >
                                                <Trash2 className="w-4 h-4 mr-1" /> 終了
                                            </button>
                                        ) : isAnchor ? (
                                            <button 
                                                onClick={() => handleAction(listing.id, 'アンカー強制リセット')}
                                                className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                                            >
                                                <Repeat className="w-4 h-4 mr-1" /> リセット
                                            </button>
                                        ) : null}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    // --- レイアウト ---
    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center">
                <TrendingDown className="w-8 h-8 mr-3 text-orange-700" />
                Phase 7: eBay SEO/リスティング健全性マネージャー V1.0
            </h1>
            <p className="text-gray-600 mb-6 font-semibold">
                **SEO目標**: 大量出品のメリットを維持しつつ、**死に筋**を排除し、**オークションアンカー**でSTRを安定させます。
            </p>

            <AuctionAnchorPanel />

            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <Search className="w-6 h-6 mr-2 text-blue-600" />
                カテゴリー別 販売効率と死に筋サマリー
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {Object.entries(categorySummary).map(([category, data]) => (
                    <div 
                        key={category} 
                        className={`bg-white p-4 rounded-lg shadow-md border ${data.anchorCount === 0 ? 'border-yellow-500' : 'border-gray-200'} cursor-pointer hover:shadow-lg transition-shadow`}
                        onClick={() => setSelectedCategory(category)}
                    >
                        <h4 className="text-lg font-bold text-gray-800">{category}</h4>
                        <div className="text-xs text-gray-500 mb-2">総親リスティング数: {data.totalListings}件</div>
                        <div className="flex items-center justify-between mt-2">
                            <div>
                                <p className="text-sm text-gray-500">平均スコア</p>
                                <p className={`text-2xl font-bold ${data.riskColor}`}>{data.avgScore}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">死に筋 / アンカー</p>
                                <p className="text-xl font-bold text-red-500">{data.deadCount} 件 / {data.anchorCount} 件</p>
                            </div>
                        </div>
                        <div className={`mt-3 pt-3 border-t text-sm font-medium ${data.riskColor}`}>{data.recommendation}</div>
                    </div>
                ))}
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-2 text-red-600" />
                対応優先度リスト（低スコア順）
            </h2>
            <ListingDetailTable />
        </div>
    );
};

export default EbaySeoManagerV1;