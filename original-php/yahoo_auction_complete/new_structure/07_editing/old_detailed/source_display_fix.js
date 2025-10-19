// ソース表示修正用JavaScript
// 文字が見えない問題を解決

// ソースバッジの色設定を修正
function getSourceBadgeClass(platform) {
    if (!platform || platform === 'Unknown' || platform === 'N/A') {
        return 'source-badge source-unknown';
    }
    
    const platformLower = platform.toLowerCase();
    
    if (platformLower.includes('ヤフオク') || platformLower.includes('yahoo')) {
        return 'source-badge source-yahoo';
    } else if (platformLower.includes('ebay')) {
        return 'source-badge source-ebay';
    } else if (platformLower.includes('inventory') || platformLower.includes('在庫')) {
        return 'source-badge source-inventory';
    } else if (platformLower.includes('mystical') || platformLower.includes('神秘')) {
        return 'source-badge source-mystical';
    } else {
        return 'source-badge source-unknown';
    }
}

// ソースバッジのHTMLを生成（修正版）
function createSourceBadge(platform) {
    const badgeClass = getSourceBadgeClass(platform);
    const displayText = platform || 'Unknown';
    
    return `<span class="${badgeClass}">${displayText}</span>`;
}

// 既存の関数を上書き
window.getSourceBadgeClass = getSourceBadgeClass;
window.createSourceBadge = createSourceBadge;

console.log('✅ ソース表示修正JavaScript読み込み完了');
