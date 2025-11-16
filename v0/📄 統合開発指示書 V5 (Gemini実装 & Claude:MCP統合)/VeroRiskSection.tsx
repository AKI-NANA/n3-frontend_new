// /components/outsource/VeroRiskSection.tsx (UIのコア部分)

// ... (既存のコンポーネント定義の続き) ...

const VeroRiskSection: React.FC<VeroRiskProps> = ({ originalTitle, suggestedTitle, hasUsedCondition, euRiskFlag, euRiskReason }) => {
    
    const isVeroOrEuRisk = euRiskFlag || /* 既存のVeroリスク判定 */;

    if (!isVeroOrEuRisk) return null; // リスクがない場合は表示しない
    
    return (
        <div className="p-4 mt-4 border-2 border-red-500 rounded-lg bg-red-50">
            <h4 className="text-lg font-bold text-red-700 mb-3">🚨 VERO/EUコンプライアンスリスク対策エリア (MUST)</h4>
            
            {/* EUリスク表示ロジック */}
            {euRiskFlag && (
                <div className="mb-3 p-2 bg-red-200 text-red-800 rounded">
                    ⚠️ **EUブロック警告:** {euRiskReason}
                    <p className='text-xs font-bold'>AR情報が不足している場合、承認はブロックされます。</p>
                </div>
            )}

            {/* (２) 自動タイトル変更案 */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-red-700">💡 Geminiによる変更案 (EU/VEROリスク回避用):</label>
                <div className="flex items-center space-x-2">
                    <input 
                        type="text" 
                        readOnly 
                        value={suggestedTitle} 
                        // ...
                    />
                    <button /* ...コピーボタンロジック... */ >コピー</button>
                </div>
            </div>
            
            {/* (３) 出品指示・コンディション選択など ... */}

        </div>
    );
}