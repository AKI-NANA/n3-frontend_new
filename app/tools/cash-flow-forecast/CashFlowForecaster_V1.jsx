import React, { useState, useMemo } from 'react';
import { CreditCard, DollarSign, AlertTriangle, Calendar, Target, Settings } from 'lucide-react';

// --- データの構造定義とモックデータ ---
// Phase 1 (受注V2.0) から取得される仕入れ確定データ
const mockSourcingData = [
    { orderId: 'ORD-1001', costPrice: 80000, sourcingDate: '2025-11-05', creditCardId: 'AMEX-1234', marketplace: 'eBay', pointRate: 0.015 },
    { orderId: 'ORD-1002', costPrice: 9000, sourcingDate: '2025-11-06', creditCardId: 'VISA-5678', marketplace: 'Shopee', pointRate: 0.010 },
    { orderId: 'ORD-1003', costPrice: 65000, sourcingDate: '2025-11-08', creditCardId: 'AMEX-1234', marketplace: 'Amazon', pointRate: 0.015 },
    { orderId: 'ORD-1004', costPrice: 20000, sourcingDate: '2025-11-10', creditCardId: 'AMEX-1234', marketplace: 'eBay', pointRate: 0.015 },
    { orderId: 'ORD-1005', costPrice: 15000, sourcingDate: '2025-11-12', creditCardId: 'VISA-5678', marketplace: 'Yahoo!', pointRate: 0.010 },
    { orderId: 'ORD-1006', costPrice: 180000, sourcingDate: '2025-11-12', creditCardId: 'JCB-9012', marketplace: 'Rakuten', pointRate: 0.030 },
];

// Phase 4 (財務設定) から取得されるクレカ情報
const creditCardSettings = {
    'AMEX-1234': { name: 'AMEX Business', limit: 1000000, closingDay: 10, paymentDay: 27, pointRate: 0.015 },
    'VISA-5678': { name: 'VISA Platinum', limit: 500000, closingDay: 25, paymentDay: 10, pointRate: 0.010 },
    'JCB-9012': { name: 'JCB Gold', limit: 800000, closingDay: 30, paymentDay: 26, pointRate: 0.030 },
};

// Money Forward (会計ツール) から取得される現在の現金残高
const currentCashBalance = 450000;
const safetyBuffer = 100000; // 常に確保すべき最低現金残高

// ユーティリティ関数
const formatCurrency = (amount) => `¥${amount.toLocaleString()}`;
const getNextPaymentDate = (dateString, closingDay, paymentDay) => {
    const today = new Date(dateString);
    let closingMonth = today.getMonth();
    let closingYear = today.getFullYear();

    // 締め日を過ぎていたら、次月が締め対象
    if (today.getDate() > closingDay) {
        closingMonth += 1;
        if (closingMonth > 11) {
            closingMonth = 0;
            closingYear += 1;
        }
    }

    // 支払い月は締め月の次月
    let paymentMonth = closingMonth + 1;
    let paymentYear = closingYear;
    if (paymentMonth > 11) {
        paymentMonth = 0;
        paymentYear += 1;
    }
    
    // 支払い日が支払い月の何日になるかを設定
    const paymentDate = new Date(paymentYear, paymentMonth, paymentDay);
    return paymentDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
};

// --- メインコンポーネント ---
const CashFlowForecasterV1 = () => {
    const [sourcingData, setSourcingData] = useState(mockSourcingData);

    // 1. 支払い予測の計算とグループ化 (コアロジック)
    const { paymentForecasts, totalPoints, totalUtilized } = useMemo(() => {
        const forecasts = {};
        let totalPoints = 0;
        const utilized = {};

        Object.keys(creditCardSettings).forEach(id => utilized[id] = 0);

        sourcingData.forEach(item => {
            const cardSetting = creditCardSettings[item.creditCardId];
            if (!cardSetting) return;

            // 支払い予測日の計算
            const paymentDateKey = getNextPaymentDate(item.sourcingDate, cardSetting.closingDay, cardSetting.paymentDay);
            
            // 予測集計
            if (!forecasts[paymentDateKey]) {
                forecasts[paymentDateKey] = { totalAmount: 0, items: [] };
            }
            forecasts[paymentDateKey].totalAmount += item.costPrice;
            forecasts[paymentDateKey].items.push(item);
            
            // ポイント計算と合算
            const points = Math.round(item.costPrice * cardSetting.pointRate);
            totalPoints += points;
            
            // 利用額計算
            utilized[item.creditCardId] += item.costPrice;
        });

        // 日付順にソート
        const sortedForecasts = Object.keys(forecasts).sort((a, b) => new Date(a) - new Date(b));

        return { 
            paymentForecasts: sortedForecasts.map(key => ({ date: key, ...forecasts[key] })),
            totalPoints,
            totalUtilized: utilized
        };
    }, [sourcingData]);

    // 2. 支払い能力のチェック
    const nextPayment = paymentForecasts[0];
    const isPaymentSafe = nextPayment ? (currentCashBalance - safetyBuffer) >= nextPayment.totalAmount : true;
    const requiredCash = nextPayment ? nextPayment.totalAmount - (currentCashBalance - safetyBuffer) : 0;
    
    // --- UIコンポーネント ---

    // 支払い予測サマリーカード
    const ForecastSummary = () => (
        <div className="bg-white p-5 rounded-lg shadow-xl border border-gray-200">
            <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                次期 $\text{支払い予測サマリー}$
            </h3>
            
            {nextPayment ? (
                <>
                    <div className="text-sm font-medium text-gray-500">
                        次回の**最も近い**引き落とし日:
                    </div>
                    <p className="text-3xl font-extrabold text-indigo-600 mt-1 mb-4">
                        {nextPayment.date}
                    </p>

                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                        <div>
                            <p className="text-sm text-gray-500">予測支払い総額</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(nextPayment.totalAmount)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">現在の現金残高 (MF連携)</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(currentCashBalance)}</p>
                        </div>
                    </div>
                    
                    {/* 安全チェックアラート */}
                    <div className={`p-3 mt-4 rounded-md flex items-center ${isPaymentSafe ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 font-bold'}`}>
                        <AlertTriangle className="w-5 h-5 mr-3" />
                        {isPaymentSafe ? (
                            `✅ 資金繰り安全。支払い後も${formatCurrency(currentCashBalance - nextPayment.totalAmount - safetyBuffer)}がバッファとして残ります。`
                        ) : (
                            `🚨 支払不足リスク。あと${formatCurrency(requiredCash)}の現金が必要です。`
                        )}
                    </div>
                </>
            ) : (
                <p className="text-gray-500">現在の仕入れデータに基づき、次期の支払い予測はありません。</p>
            )}
        </div>
    );

    // クレカとポイント情報
    const CardAndPointsPanel = () => (
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
            <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-yellow-600" />
                リワードと利用状況
            </h3>
            
            <div className="p-3 bg-yellow-50 rounded-md mb-4 flex justify-between items-center">
                <p className="text-sm text-gray-700">総獲得予定ポイント (最新の仕入れ分)</p>
                <p className="text-2xl font-bold text-yellow-700">{totalPoints.toLocaleString()} P</p>
            </div>

            <div className="space-y-3">
                {Object.entries(creditCardSettings).map(([id, card]) => {
                    const utilized = totalUtilized[id] || 0;
                    const remaining = card.limit - utilized;
                    const utilizationRate = (utilized / card.limit) * 100;
                    const isOverutilized = utilizationRate > 80; // 利用率が高すぎる場合の警告

                    return (
                        <div key={id} className="border p-3 rounded-md">
                            <div className="flex justify-between items-center text-sm font-semibold">
                                <span><CreditCard className="w-4 h-4 inline mr-1 text-blue-600" /> {card.name} ({id})</span>
                                <span className={isOverutilized ? 'text-red-600' : 'text-gray-700'}>
                                    利用額: {formatCurrency(utilized)}
                                </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full mt-2">
                                <div 
                                    className={`h-2 rounded-full ${isOverutilized ? 'bg-red-500' : 'bg-green-500'}`} 
                                    style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 flex justify-between mt-1">
                                <span>上限: {formatCurrency(card.limit)}</span>
                                <span>残高: {formatCurrency(remaining)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <button className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded text-sm flex items-center justify-center">
                <Settings className="w-4 h-4 mr-2" /> クレカサイクル設定 ({Object.keys(creditCardSettings).length})
            </button>
        </div>
    );

    // 詳細予測テーブル
    const ForecastTable = () => (
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
            <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                詳細予測テーブル
            </h3>
            <div className="space-y-6">
                {paymentForecasts.map(forecast => (
                    <div key={forecast.date} className="border border-indigo-100 rounded-lg overflow-hidden">
                        <div className="bg-indigo-50 p-3 font-bold text-indigo-800 flex justify-between">
                            <span>支払い日: {forecast.date}</span>
                            <span>総額: {formatCurrency(forecast.totalAmount)}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-6 py-2 text-left text-xs font-medium text-gray-500">注文ID</th>
                                        <th className="px-6 py-2 text-left text-xs font-medium text-gray-500">仕入れ日</th>
                                        <th className="px-6 py-2 text-right text-xs font-medium text-gray-500">仕入れコスト</th>
                                        <th className="px-6 py-2 text-left text-xs font-medium text-gray-500">利用カード</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                    {forecast.items.map(item => (
                                        <tr key={item.orderId} className="hover:bg-gray-50">
                                            <td className="px-6 py-2 whitespace-nowrap">{item.orderId} ({item.marketplace})</td>
                                            <td className="px-6 py-2 whitespace-nowrap">{new Date(item.sourcingDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-2 whitespace-nowrap text-right text-gray-700">{formatCurrency(item.costPrice)}</td>
                                            <td className="px-6 py-2 whitespace-nowrap">{creditCardSettings[item.creditCardId].name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );


    // --- レイアウト ---
    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center">
                <DollarSign className="w-8 h-8 mr-3 text-red-700" />
                資金繰り予測ツール V1.0 <span className="text-xl ml-3 text-gray-500">（Phase 4: 財務リスク管理）</span>
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <ForecastSummary />
                    <CardAndPointsPanel />
                </div>
                <div className="lg:col-span-2">
                    <ForecastTable />
                </div>
            </div>
        </div>
    );
};

export default CashFlowForecasterV1;