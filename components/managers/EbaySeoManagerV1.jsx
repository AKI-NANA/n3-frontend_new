import React, { useState, useMemo, useEffect } from 'react';
import { Target, TrendingDown, Clock, Search, RotateCw, Trash2, Edit, Zap, AlertTriangle } from 'lucide-react';

// --- モックデータ：リスティングの健全性データ ---
// 1万件の親リスティングに対するSEO指標をシミュレート
const mockListings = [
    { id: 'LST-001', title: '人気商品 - ワイヤレスイヤホン', category: '電子機器', daysActive: 30, views: 1500, sales: 50, action: '維持' },
    { id: 'LST-002', title: '中堅商品 - 限定スニーカー', category: 'ファッション', daysActive: 60, views: 800, sales: 5, action: 'プロモーション推奨' },
    { id: 'LST-003', title: '**要注意** - アニメフィギュア A', category: 'ホビー', daysActive: 120, views: 100, sales: 0, action: '改訂/終了' }, // 死に筋候補
    { id: 'LST-004', title: '死に筋 - ポスター B', category: 'アート', daysActive: 200, views: 10, sales: 0, action: '即時終了' }, // 即時排除
    { id: 'LST-005', title: '潜在力あり - ドローン部品', category: '電子機器', daysActive: 45, views: 500, sales: 0, action: '価格改訂推奨' },
    { id: 'LST-006', title: '安定商品 - Tシャツ X', category: 'ファッション', daysActive: 90, views: 600, sales: 15, action: '維持' },
];

const MIN_VIEWS_FOR_CONVERSION_CHECK = 50;
const MAX_DAYS_FOR_DEAD_LISTING = 90;

// --- コアロジック: リスティング健全性スコア計算 ---
const calculateHealthScore = (listing) => {
    let score = 100;

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
    if (listing.daysActive > 30 && listing.views < 10) {
        score -= 10;
    }

    // 4. 販売実績ボーナス
    if (listing.sales > 0) {
        score += Math.min(listing.sales * 2, 10);
    }

    return Math.max(10, Math.min(100, score)); // スコアを10-100に正規化
};

const EbaySeoManagerV1 = () => {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // データ取得
    useEffect(() => {
        fetchListings();
    }, []);

    const fetchListings = async () => {
        setLoading(true);
        setError(null);
        try {
            // APIエンドポイントからデータを取得（モックデータをフォールバックとして使用）
            const response = await fetch('/api/seo-manager/get-listings');

            if (!response.ok) {
                throw new Error('API接続エラー。モックデータを使用します。');
            }

            const data = await response.json();
            const processedListings = data.listings.map(l => ({
                ...l,
                score: calculateHealthScore(l),
                action: determineAction(l)
            }));
            setListings(processedListings);
        } catch (err) {
            console.warn('APIからのデータ取得に失敗しました。モックデータを使用します:', err);
            // モックデータを使用
            const processedListings = mockListings.map(l => ({
                ...l,
                score: calculateHealthScore(l),
                action: l.action
            }));
            setListings(processedListings);
        } finally {
            setLoading(false);
        }
    };

    // リスティングの推奨アクションを決定
    const determineAction = (listing) => {
        const score = calculateHealthScore(listing);
        if (score < 50) return '即時終了';
        if (score < 70) return '価格改訂推奨';
        if (listing.sales === 0 && listing.views > 100) return 'プロモーション推奨';
        return '維持';
    };

    // カテゴリー別サマリー計算
    const categorySummary = useMemo(() => {
        const summary = {};
        listings.forEach(l => {
            if (!summary[l.category]) {
                summary[l.category] = { totalListings: 0, deadCount: 0, salesCount: 0, totalScore: 0 };
            }
            summary[l.category].totalListings++;
            summary[l.category].totalScore += l.score;

            if (l.score < 50) { // スコア50未満を死に筋と定義
                summary[l.category].deadCount++;
            }
            if (l.sales > 0) {
                summary[l.category].salesCount++;
            }
        });

        // カテゴリーごとのSEO推奨アクションを決定
        Object.keys(summary).forEach(cat => {
            const avgScore = summary[cat].totalScore / summary[cat].totalListings;
            summary[cat].avgScore = Math.round(avgScore);

            // 30%以上が死に筋の場合、カテゴリー戦略全体を見直し
            if (summary[cat].deadCount > summary[cat].totalListings * 0.3) {
                summary[cat].recommendation = '🚨 カテゴリーの**大量リスト終了/改訂**が必須です。';
                summary[cat].color = 'text-red-600';
            } else if (summary[cat].salesCount === 0 && summary[cat].totalListings > 5) {
                summary[cat].recommendation = '⚠️ 売上ゼロ。**SEOアンカー商品**の投入が必要です。';
                summary[cat].color = 'text-yellow-600';
            } else {
                summary[cat].recommendation = '✅ 安定。';
                summary[cat].color = 'text-green-600';
            }
        });

        return summary;
    }, [listings]);

    // リスティングに対するアクション実行
    const handleAction = async (id, action) => {
        try {
            const response = await fetch('/api/seo-manager/execute-action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ listingId: id, action }),
            });

            if (!response.ok) {
                throw new Error('アクション実行に失敗しました');
            }

            const result = await response.json();
            alert(`✅ リスティング ID: ${id} に対し、アクション: 「${action}」を実行しました。\n\n${result.message || ''}`);

            // リストから削除（即時終了の場合）
            if (action === '即時終了') {
                setListings(prev => prev.filter(l => l.id !== id));
            } else {
                // データを再取得
                fetchListings();
            }
        } catch (err) {
            console.error('アクション実行エラー:', err);
            alert(`⚠️ アクション実行中にエラーが発生しました: ${err.message}\n\nモック環境では実際の操作は行われません。`);

            // モック環境でのデモンストレーション
            if (action === '即時終了') {
                setListings(prev => prev.filter(l => l.id !== id));
            }
        }
    };

    if (loading) {
        return (
            <div className="p-8 bg-gray-100 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <RotateCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-lg text-gray-700">リスティングデータを読み込んでいます...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
                    <TrendingDown className="w-8 h-8 mr-3 text-orange-700" />
                    eBay SEO/リスティング健全性マネージャー V1.0
                </h1>
                <button
                    onClick={fetchListings}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-150"
                >
                    <RotateCw className="w-4 h-4 mr-2" />
                    更新
                </button>
            </div>
            <p className="text-gray-600 mb-6">「売れない親リスティング（死に筋）」を排除・改善し、アカウント全体の販売効率（STR）を最大化します。</p>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        {error}
                    </p>
                </div>
            )}

            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <Clock className="w-6 h-6 mr-2 text-blue-600" />
                カテゴリー別 販売効率サマリー
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {Object.entries(categorySummary).map(([category, data]) => (
                    <div key={category} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <h4 className="text-lg font-bold text-gray-800">{category}</h4>
                        <div className="text-xs text-gray-500 mb-2">総親リスティング数: {data.totalListings}件</div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">平均健全性スコア</p>
                                <p className={`text-2xl font-bold ${data.avgScore > 75 ? 'text-green-600' : data.avgScore > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {data.avgScore}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">死に筋 (スコア50未満)</p>
                                <p className="text-xl font-bold text-red-500">{data.deadCount} 件</p>
                            </div>
                        </div>
                        <div className={`mt-3 pt-3 border-t text-sm font-medium ${data.color}`}>{data.recommendation}</div>
                    </div>
                ))}
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-2 text-red-600" />
                対応必須 リスティング詳細
            </h2>
            <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">スコア</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品名/カテゴリ</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">稼働日数/View/Sales</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">推奨アクション</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">実行</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {listings.sort((a, b) => a.score - b.score).map((listing, index) => (
                            <tr key={listing.id} className={`${listing.score < 50 ? 'bg-red-50' : listing.score < 70 ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                                    <span className={listing.score < 50 ? 'text-red-600' : listing.score < 70 ? 'text-yellow-600' : 'text-green-600'}>
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
                                    <span className={listing.score < 50 ? 'text-red-700 font-bold' : 'text-orange-700'}>
                                        {listing.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {listing.score < 50 && (
                                        <button
                                            onClick={() => handleAction(listing.id, '即時終了')}
                                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" /> 終了
                                        </button>
                                    )}
                                    {listing.score >= 50 && listing.score < 70 && (
                                        <button
                                            onClick={() => handleAction(listing.id, '価格改訂')}
                                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none"
                                        >
                                            <Edit className="w-4 h-4 mr-1" /> 改訂
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EbaySeoManagerV1;
