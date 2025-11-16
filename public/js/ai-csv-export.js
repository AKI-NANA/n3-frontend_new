// ==========================================
// 🤖 AI解析用CSVエクスポート
// 既存システムに統合するための完全版コード
// ==========================================

// ==========================================
// 📋 HTMLに追加するボタン（ワンクリック版）
// ==========================================

/*
既存のツールバーまたはボタンエリアに追加：

<button 
    id="ai-csv-export" 
    class="btn btn-purple"
    onclick="exportForAI()"
>
    🤖 AI解析用
</button>

※ CSVボタンの隣、または目立つ場所に配置
*/

// ==========================================
// 🎨 CSSスタイル
// ==========================================

const aiExportStyles = `
/* AI解析用ボタン - 紫色グラデーション */
.btn-purple {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white !important;
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
}

.btn-purple:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-purple:active {
    transform: translateY(0);
}

.btn-purple.copied {
    background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
}

.btn-purple.copied::before {
    content: '✓ ';
}
`;

// ==========================================
// 🚀 メイン関数: AI解析用CSVエクスポート
// ==========================================

function exportForAI() {
    console.log('🚀 AI解析用CSVエクスポート開始');
    
    // チェックされた商品を取得
    const products = getCheckedProductsForAI();
    
    if (products.length === 0) {
        alert('❌ 商品を選択してください');
        return;
    }
    
    console.log(`✅ ${products.length}件の商品を取得しました`);
    
    // CSV + プロンプト生成
    const csvContent = convertToAICSV(products);
    const fullPrompt = generateClaudePrompt(csvContent, products);
    
    // クリップボードにコピー
    copyToClipboard(fullPrompt);
    
    // 成功通知
    showSuccessNotification(products.length);
}

// ==========================================
// 📊 商品データ取得
// ==========================================

function getCheckedProductsForAI() {
    const products = [];
    
    // テーブル内の全行を取得
    const rows = document.querySelectorAll('tbody tr');
    
    rows.forEach((row, index) => {
        // チェックボックスの確認
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (!checkbox || !checkbox.checked) return;
        
        console.log(`📦 商品 ${index + 1} を処理中...`);
        
        // セル取得
        const cells = row.querySelectorAll('td');
        
        // 画像URL取得
        const imageCell = cells[0] || cells[1]; // 最初または2番目の列
        const imgElement = imageCell?.querySelector('img');
        const imageUrl = imgElement?.src || '';
        
        // カテゴリ情報取得（複数の方法を試す）
        let categoryName = '';
        let categoryId = '';
        
        // 方法1: data属性から
        categoryName = row.dataset.categoryName || '';
        categoryId = row.dataset.categoryId || '';
        
        // 方法2: セルから探す
        if (!categoryName || !categoryId) {
            cells.forEach(cell => {
                const text = cell.textContent?.trim();
                
                // カテゴリ名を探す
                if (text && (
                    text.includes('CCG') || 
                    text.includes('Individual') || 
                    text.includes('Trading') ||
                    text.includes('Figure') ||
                    text.includes('Card')
                )) {
                    categoryName = text;
                }
                
                // カテゴリIDを探す（5-6桁の数字）
                if (/^\d{5,6}$/.test(text)) {
                    categoryId = text;
                }
            });
        }
        
        // 基本情報取得（実際の列番号に応じて調整が必要）
        // ※ 以下は画像から推測した列順序
        const product = {
            sku: cells[1]?.textContent?.trim() || cells[2]?.textContent?.trim() || '',
            title: cells[2]?.textContent?.trim() || cells[3]?.textContent?.trim() || '',
            title_en: cells[3]?.textContent?.trim() || cells[4]?.textContent?.trim() || '',
            price_jpy: cells[4]?.textContent?.trim() || cells[5]?.textContent?.trim() || '',
            length_cm: cells[5]?.textContent?.trim() || cells[6]?.textContent?.trim() || '',
            width_cm: cells[6]?.textContent?.trim() || cells[7]?.textContent?.trim() || '',
            height_cm: cells[7]?.textContent?.trim() || cells[8]?.textContent?.trim() || '',
            weight_g: cells[8]?.textContent?.trim() || cells[9]?.textContent?.trim() || '',
            condition: cells[9]?.textContent?.trim() || cells[10]?.textContent?.trim() || '',
            category_name: categoryName,
            category_id: categoryId,
            image_url: imageUrl
        };
        
        console.log('✓ 商品データ:', {
            sku: product.sku,
            title: product.title,
            category: product.category_name,
            categoryId: product.category_id,
            hasImage: !!product.image_url
        });
        
        products.push(product);
    });
    
    return products;
}

// ==========================================
// 📄 CSV変換
// ==========================================

function convertToAICSV(products) {
    const headers = [
        'SKU',
        '商品名',
        '英語タイトル',
        '価格(円)',
        'カテゴリ名',
        'カテゴリID',
        '長さ(cm)',
        '幅(cm)',
        '高さ(cm)',
        '重さ(g)',
        '状態',
        '画像URL'
    ];
    
    const rows = [headers.join(',')];
    
    products.forEach(p => {
        const row = [
            p.sku,
            `"${escapeCSV(p.title)}"`,
            `"${escapeCSV(p.title_en)}"`,
            p.price_jpy,
            `"${escapeCSV(p.category_name)}"`,
            p.category_id,
            p.length_cm,
            p.width_cm,
            p.height_cm,
            p.weight_g,
            `"${escapeCSV(p.condition)}"`,
            `"${p.image_url}"`
        ];
        rows.push(row.join(','));
    });
    
    return rows.join('\n');
}

function escapeCSV(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '""');
}

// ==========================================
// 💬 Claude用プロンプト生成
// ==========================================

function generateClaudePrompt(csvContent, products) {
    const productCount = products.length;
    
    return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  重要：HTSコード判定 - 間違えると赤字
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

以下の${productCount}件の商品を【慎重に】処理してください：

${csvContent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
処理手順（精度最優先）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

各商品について以下を実行：

【ステップ1】カテゴリ情報を活用
────────────────────────────────────────
カテゴリ名: {category_name}
カテゴリID: {category_id}

まずカテゴリから大分類を判定


【ステップ2】画像を確認（可能な場合）
────────────────────────────────────────
画像URL: {image_url}

画像が利用可能な場合は必ず確認


【ステップ3】HTSコード検索（複数方法）
────────────────────────────────────────
hs_codesテーブルで検索:

SELECT * FROM hs_codes 
WHERE description ILIKE '%{キーワード}%'
LIMIT 10;


【ステップ4】HTSコードの確認
────────────────────────────────────────
選択したコードについて:
1. description（説明）を読む
2. 商品と100%一致しているか確認
3. 確信度を記録（0-100%）


【ステップ5】原産国判定
────────────────────────────────────────
判定基準:
- Pokemon, Nintendo, Sony → JP（日本）
- 中国製造が多い電子機器 → CN（中国）


【ステップ6】関税率取得
────────────────────────────────────────
SELECT duty_rate 
FROM customs_duties
WHERE hts_code = '{判定したコード}'
  AND origin_country = '{判定した国}';


【ステップ7】データベース更新
────────────────────────────────────────
UPDATE products
SET listing_data = COALESCE(listing_data, '{}'::jsonb) || 
  jsonb_build_object(
    'hts_code', '{コード}',
    'hts_description', '{説明}',
    'origin_country', '{国}',
    'duty_rate', {税率},
    'confidence_score', {確信度},
    'processed_at', NOW(),
    'category_used', '{使用したカテゴリ}'
  )
WHERE sku = '{SKU}';


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
完了後の報告（詳細版）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【処理サマリー】
処理件数: ${productCount}件
成功: XX件
失敗: XX件
平均確信度: XX%

【確信度分布】
90-100%（高確信）: XX件 ✅
80-89%（中確信）: XX件 ⚠️
80%未満（要確認）: XX件 ❌

【HTSコード分布】
各コードごとの件数と確信度

【原産国分布】
各国ごとの件数と平均関税率

【関税率統計】
最小・最大・平均

【要確認商品（確信度<80%）】
SKU、商品名、HTSコード、確信度、理由

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

それでは慎重に処理を開始してください！`;
}

// ==========================================
// 📋 クリップボードコピー
// ==========================================

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
            () => {
                console.log('✅ クリップボードにコピー成功');
            },
            (err) => {
                console.error('❌ コピー失敗:', err);
                fallbackCopy(text);
            }
        );
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    try {
        document.execCommand('copy');
        console.log('✅ フォールバック方式でコピー成功');
    } catch (err) {
        console.error('❌ コピー失敗:', err);
    }
    
    document.body.removeChild(textarea);
}

// ==========================================
// 🎉 成功通知
// ==========================================

function showSuccessNotification(count) {
    // ボタンのビジュアルフィードバック
    const btn = document.getElementById('ai-csv-export');
    if (btn) {
        btn.classList.add('copied');
        const originalText = btn.innerHTML;
        btn.innerHTML = `✓ ${count}件コピー完了！`;
        
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = originalText;
        }, 3000);
    }
    
    // 既存の通知システムを使用（あれば）
    if (typeof showNotification === 'function') {
        showNotification(
            `✅ ${count}件の商品データをコピーしました！\n\nClaude Desktopに貼り付けてください。`,
            'success'
        );
    } else {
        alert(`✅ ${count}件の商品データをコピーしました！\n\nClaude Desktopに貼り付けてください。`);
    }
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ コピー完了！

対象商品: ${count}件

次のステップ:
1. Claude Desktopを開く
2. Cmd + V で貼り付け
3. Enter押す
4. 処理完了を待つ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

// ==========================================
// 🎨 CSS自動追加
// ==========================================

// ページ読み込み時に自動でCSSを追加
(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAIExport);
    } else {
        initAIExport();
    }
})();

function initAIExport() {
    // CSSが既に追加されているかチェック
    if (!document.getElementById('ai-export-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'ai-export-styles';
        styleElement.textContent = aiExportStyles;
        document.head.appendChild(styleElement);
        console.log('✅ AI解析用CSVエクスポート機能を初期化しました');
    }
}

// ==========================================
// 📖 使用方法
// ==========================================

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
使い方（3ステップ）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  商品をチェック
   ☑☑☑ 処理したい商品を選択

2️⃣  ボタンをクリック
   「🤖 AI解析用」をワンクリック

3️⃣  Claude Desktopで実行
   Cmd + V → Enter

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
