import React, { useState, useMemo } from 'react';
import { Shield, Lock, Search, DollarSign, CheckCircle, AlertTriangle, UserCheck, Key } from 'lucide-react';

// --- データの構造定義とモックデータ ---
// SPOEで比較する仕入れ候補データ
const mockSourcingCandidates = [
    { source: 'Mall-A', price: 95000, shipping: 2000, points: 5000, estimatedDelivery: '2025-11-20', riskScore: 0.1 },
    { source: 'Mall-B (AI推奨)', price: 92000, shipping: 1500, points: 2000, estimatedDelivery: '2025-11-22', riskScore: 0.05 },
    { source: 'Mall-C', price: 90000, shipping: 4000, points: 0, estimatedDelivery: '2025-11-25', riskScore: 0.3 },
    { source: 'Mall-D', price: 85000, shipping: 3000, points: 1000, estimatedDelivery: '2025-11-28', riskScore: 0.15 },
];

// Phase 6: セキュリティ・信頼性システムのステータス
const securityStatus = {
    twoFactorAuth: true, // 二要素認証
    rbacEnabled: true,   // ロールベースアクセス制御
    dataEncryption: true, // 機密データ暗号化 (顧客情報, 仕入れ値)
    rpaIsolation: false, // RPA実行環境の隔離 (重要リスク)
    backupScheduled: true, // 定期バックアップ
    lastSecurityAudit: '2025-11-01',
};

// ユーティリティ関数
const formatCurrency = (amount) => `¥${amount.toLocaleString()}`;

// --- コアロジック: SPOE (仕入れ価格最適化エンジン) ---
const calculateSPOE = (candidates) => {
    return candidates.map(candidate => {
        // 最終コスト = 価格 + 送料 - ポイント
        const finalCost = candidate.price + candidate.shipping - candidate.points;
        return {
            ...candidate,
            finalCost,
        };
    }).sort((a, b) => a.finalCost - b.finalCost); // 最終コストが低い順にソート
};

// --- メインコンポーネント ---
const SPOE_Security_V1 = () => {
    const [candidates, setCandidates] = useState(mockSourcingCandidates);
    const analyzedCandidates = useMemo(() => calculateSPOE(candidates), [candidates]);

    // --- UIコンポーネント ---

    // 1. SPOE パネル
    const SPOE_Panel = () => {
        const bestCandidate = analyzedCandidates[0];
        const hasHighRiskCandidate = analyzedCandidates.some(c => c.riskScore > 0.2);

        return (
            <div className="bg-white p-6 rounded-lg shadow-xl border border-blue-500">
                <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center">
                    <Search className="w-5 h-5 mr-2 text-blue-600" />
                    仕入れ価格最適化エンジン (SPOE)
                </h3>
                
                {/* 最安値サマリー */}
                <div className={`p-4 rounded-lg mb-4 ${bestCandidate.source.includes('AI推奨') ? 'bg-indigo-50 border-indigo-500' : 'bg-green-50 border-green-500'} border-l-4`}>
                    <p className="text-sm text-gray-700">最安値仕入れ候補 (システム推奨)</p>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-2xl font-extrabold text-green-700">{formatCurrency(bestCandidate.finalCost)}</p>
                        <span className="text-lg font-bold text-gray-800">{bestCandidate.source}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        （価格: {formatCurrency(bestCandidate.price)} + 送料: {formatCurrency(bestCandidate.shipping)} - ポイント: {formatCurrency(bestCandidate.points)}）
                    </p>
                </div>

                {/* 候補リスト */}
                <h4 className="font-semibold text-gray-700 mb-2 mt-4">全仕入れ候補リスト</h4>
                <div className="space-y-2">
                    {analyzedCandidates.map((c, index) => (
                        <div key={index} className="flex justify-between items-center text-sm border-b pb-1 last:border-b-0">
                            <span className="flex items-center">
                                {index === 0 ? <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> : <DollarSign className="w-4 h-4 mr-2 text-gray-400" />}
                                {c.source}
                            </span>
                            <span className={`font-bold ${index === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                {formatCurrency(c.finalCost)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* RPA連携アクション */}
                <button 
                    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition duration-150 flex items-center justify-center shadow-md"
                    onClick={() => alert(`RPAへ最安値URL (${bestCandidate.sourcingURL || 'N/A'}) を送信し、カート投入を自動実行します。`)}
                >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    RPAへ自動実行指示
                </button>
            </div>
        );
    };

    // 2. セキュリティ・信頼性パネル
    const SecurityPanel = () => {
        const overallRisk = !securityStatus.rpaIsolation || !securityStatus.dataEncryption;

        return (
            <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200">
                <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-teal-600" />
                    セキュリティ・信頼性システム (Phase 6)
                </h3>
                
                {/* 全体リスクサマリー */}
                <div className={`p-3 rounded-md mb-4 flex items-start ${overallRisk ? 'bg-red-100 border-red-500' : 'bg-green-100 border-green-500'} border-l-4`}>
                    <AlertTriangle className={`w-5 h-5 mt-0.5 mr-3 ${overallRisk ? 'text-red-500' : 'text-green-500'}`} />
                    <p className="text-sm font-bold">
                        {overallRisk ? '🚨 クリティカルリスクあり。RPA隔離を最優先で実施してください。' : '✅ セキュリティベースライン達成'}
                    </p>
                </div>

                {/* チェックリスト */}
                <div className="space-y-3">
                    <SecurityCheck 
                        label="二要素認証 (2FA)" 
                        isSafe={securityStatus.twoFactorAuth} 
                        Icon={UserCheck} 
                    />
                    <SecurityCheck 
                        label="ロールベースアクセス制御 (RBAC)" 
                        isSafe={securityStatus.rbacEnabled} 
                        Icon={Lock} 
                    />
                    <SecurityCheck 
                        label="機密データ暗号化 (仕入れ値/顧客情報)" 
                        isSafe={securityStatus.dataEncryption} 
                        Icon={Key} 
                        alert={!securityStatus.dataEncryption ? 'DBレベルでの暗号化が不足' : null}
                    />
                    <SecurityCheck 
                        label="RPA実行環境の隔離 (クレカ情報ゼロ戦略)" 
                        isSafe={securityStatus.rpaIsolation} 
                        Icon={Lock} 
                        alert={!securityStatus.rpaIsolation ? 'RPA環境が本番DBと隔離されていません' : null}
                    />
                    <SecurityCheck 
                        label="定期バックアップ" 
                        isSafe={securityStatus.backupScheduled} 
                        Icon={CheckCircle} 
                    />
                </div>
                
                <p className="text-xs text-gray-500 mt-4">最終セキュリティ監査日: {securityStatus.lastSecurityAudit}</p>
            </div>
        );
    };
    
    // UIヘルパー: セキュリティチェックリストの行
    const SecurityCheck = ({ label, isSafe, Icon, alert }) => (
        <div className="flex justify-between items-center text-sm border-b pb-2 last:border-b-0">
            <span className={`flex items-center font-medium ${isSafe ? 'text-gray-700' : 'text-red-600'}`}>
                {React.createElement(Icon, { className: `w-4 h-4 mr-2 ${isSafe ? 'text-teal-600' : 'text-red-600'}` })}
                {label}
            </span>
            <span className={`font-semibold ${isSafe ? 'text-green-600' : 'text-red-600'}`}>
                {isSafe ? '有効' : '無効'}
                {alert && <span className="text-xs text-red-500 ml-2">({alert})</span>}
            </span>
        </div>
    );


    // --- レイアウト ---
    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center">
                <Shield className="w-8 h-8 mr-3 text-teal-700" />
                SPOE & システムセキュリティ V1.0 <span className="text-xl ml-3 text-gray-500">（最終リスクゼロ化層）</span>
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SPOE_Panel />
                <SecurityPanel />
            </div>
        </div>
    );
};

export default SPOE_Security_V1;