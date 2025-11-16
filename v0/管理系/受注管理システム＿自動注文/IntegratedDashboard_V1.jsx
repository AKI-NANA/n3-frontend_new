import React, { useState, useMemo } from 'react';
import { LayoutDashboard, AlertTriangle, DollarSign, Truck, Target, TrendingUp, RefreshCw } from 'lucide-react';

// --- データの構造定義とモックデータ ---
// Phase 1 (受注V2.0), Phase 2 (出荷), Phase 4 (財務) から連携されるデータをシミュレート
const mockKPIs = {
    dailySales: 550000,
    dailyProfit: 125000,
    monthlyTargetAchieved: 0.85, // 85%達成
    weeklyOrderCount: 150,
};

const mockAlerts = [
    { type: 'Financial', message: '⚠️ クレカ支払不足の可能性（12/10引き落とし）。あと¥250,000の現金が必要です。', severity: 'High' }, // Phase 4連携
    { type: 'Shipping', message: '🚨 3件の注文が出荷期限まで48時間以内。週末リスクを考慮し、本日中の出荷が必要です。', severity: 'High' }, // Phase 2連携
    { type: 'Sourcing', message: '🔍 仕入れ価格最適化エンジンがAmazonで登録価格より10%安い仕入れ元を発見しました。', severity: 'Medium' }, // Phase 5連携
    { type: 'Account', message: 'eBayアカウントの追跡番号アップロード率が95%を下回っています。', severity: 'Medium' }, // Phase 3連携
];

const mockMarketplaceData = [
    { name: 'eBay', sales: 1500000, profit: 350000, margin: 0.23, orders: 45 },
    { name: 'Amazon', sales: 2200000, profit: 400000, margin: 0.18, orders: 55 },
    { name: 'Shopee', sales: 800000, profit: 200000, margin: 0.25, orders: 30 },
];

// ユーティリティ関数
const formatCurrency = (amount) => `¥${amount.toLocaleString()}`;
const getSeverityColor = (severity) => {
    switch (severity) {
        case 'High': return 'bg-red-500 text-white';
        case 'Medium': return 'bg-yellow-500 text-gray-800';
        default: return 'bg-blue-500 text-white';
    }
};

// --- メインコンポーネント ---
const IntegratedDashboardV1 = () => {
    const [kpis, setKpis] = useState(mockKPIs);
    const [alerts, setAlerts] = useState(mockAlerts);
    const [marketplaceData, setMarketplaceData] = useState(mockMarketplaceData);

    const totalSales = useMemo(() => marketplaceData.reduce((sum, item) => sum + item.sales, 0), [marketplaceData]);
    const totalProfit = useMemo(() => marketplaceData.reduce((sum, item) => sum + item.profit, 0), [marketplaceData]);

    // --- UIコンポーネント ---

    // 1. 緊急アラートパネル (Phase 4, 2からの複合リスクアラート)
    const AlertPanel = () => (
        <div className="bg-white p-5 rounded-lg shadow-xl border border-red-300">
            <h3 className="font-bold text-xl text-red-600 mb-4 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-2 fill-red-600 text-white" />
                緊急アラート (要対応: {alerts.filter(a => a.severity === 'High').length}件)
            </h3>
            <div className="space-y-3">
                {alerts.map((alert, index) => (
                    <div key={index} className={`p-3 rounded-md flex items-start border-l-4 ${alert.severity === 'High' ? 'bg-red-50 border-red-500' : 'bg-yellow-50 border-yellow-500'}`}>
                        <AlertTriangle className={`w-5 h-5 mt-0.5 mr-3 ${alert.severity === 'High' ? 'text-red-500' : 'text-yellow-500'}`} />
                        <p className="text-sm font-medium text-gray-800">{alert.message}</p>
                    </div>
                ))}
            </div>
            <button className="mt-4 text-sm text-blue-600 hover:underline">全アラート履歴を見る</button>
        </div>
    );

    // 2. 主要KPIカード
    const KPICard = ({ title, value, icon, color }) => (
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
            <div className={`flex items-center justify-between`}>
                <div className={`p-2 rounded-full ${color.bg}`}>
                    {React.cloneElement(icon, { className: `w-6 h-6 ${color.text}` })}
                </div>
                <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 mt-3">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
    );

    // 3. モール別パフォーマンステーブル
    const MarketplaceTable = () => (
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
            <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-indigo-600" />
                モール別実績 (月間)
            </h3>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">モール</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">売上</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">確定利益</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">利益率</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">注文数</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {marketplaceData.map((data, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">{formatCurrency(data.sales)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">{formatCurrency(data.profit)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                <span className={`font-bold ${data.margin < 0.2 ? 'text-red-500' : 'text-green-600'}`}>
                                    {(data.margin * 100).toFixed(1)}%
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">{data.orders}</td>
                        </tr>
                    ))}
                    <tr className="bg-gray-100 font-bold">
                        <td className="px-6 py-4 text-left text-sm text-gray-900">合計</td>
                        <td className="px-6 py-4 text-right text-sm text-blue-600">{formatCurrency(totalSales)}</td>
                        <td className="px-6 py-4 text-right text-sm text-green-600">{formatCurrency(totalProfit)}</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">-</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">{marketplaceData.reduce((sum, item) => sum + item.orders, 0)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
    
    // 4. AI戦略レポート (Phase 3のコア機能)
    const AIStrategyReport = () => (
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
            <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-red-600" />
                AI総合戦略レポート (今週の最優先タスク)
            </h3>
            <div className="p-4 bg-red-50 rounded-md border border-red-200 mb-4">
                <p className="font-semibold text-red-700">【最重要警告】</p>
                <p className="text-sm text-red-700">資金繰りアラートが発動しています。自動仕入れの承認を一時的に停止し、Phase 4の**資金繰り予測ツール**で詳細を確認してください。</p>
            </div>
            <h4 className="font-semibold text-gray-700 mb-2">推奨アクション</h4>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                <li>**仕入れ**: Shopeeの注文は利益率が高いため、仕入れ優先度を上げてください。SPOE (Phase 5) の推奨仕入れ先を確認すること。</li>
                <li>**出荷**: 出荷期限が迫っている注文（3件）は、本日午後2時までに**出荷管理ツール**で処理を完了してください。</li>
                <li>**財務**: クレカ決済日の予測（Phase 4）を確認し、資金調達計画を策定。</li>
            </ul>
        </div>
    );

    // --- レイアウト ---
    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center">
                <LayoutDashboard className="w-8 h-8 mr-3 text-teal-700" />
                総合ダッシュボード V1.0 <span className="text-xl ml-3 text-gray-500">（経営判断ハブ）</span>
            </h1>

            {/* 緊急アラートセクション */}
            <div className="mb-6">
                <AlertPanel />
            </div>

            {/* 主要KPIセクション */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KPICard 
                    title="日次確定利益" 
                    value={formatCurrency(kpis.dailyProfit)} 
                    icon={<DollarSign />} 
                    color={{ bg: 'bg-green-100', text: 'text-green-600' }}
                />
                <KPICard 
                    title="日次売上" 
                    value={formatCurrency(kpis.dailySales)} 
                    icon={<DollarSign />} 
                    color={{ bg: 'bg-blue-100', text: 'text-blue-600' }}
                />
                 <KPICard 
                    title="月間目標達成率" 
                    value={`${(kpis.monthlyTargetAchieved * 100).toFixed(1)}%`}
                    icon={<Target />} 
                    color={{ bg: 'bg-indigo-100', text: 'text-indigo-600' }}
                />
                <KPICard 
                    title="今週の注文数" 
                    value={`${kpis.weeklyOrderCount} 件`}
                    icon={<Truck />} 
                    color={{ bg: 'bg-purple-100', text: 'text-purple-600' }}
                />
            </div>

            {/* 統合パネル (テーブルとAI戦略) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MarketplaceTable />
                <AIStrategyReport />
            </div>
            
            <div className="mt-8 text-center">
                 <button 
                    onClick={() => { /* データ更新ロジックをここに実装 */ alert('全データソースを連携し、最新情報を取得します。'); }}
                    className="flex items-center justify-center mx-auto text-blue-600 hover:text-blue-800 transition duration-150 font-semibold"
                >
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin-slow" /> 全データソースを更新
                </button>
            </div>
        </div>
    );
};

export default IntegratedDashboardV1;