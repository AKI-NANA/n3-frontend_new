/**
 * CSRF エラー修復テスト
 * N3統合プロジェクト - 緊急修復版
 */

console.log("=== 🔧 CSRF エラー修復テスト実行 ===");

// CSRF トークン確認
function testCSRFToken() {
    console.log("\n【CSRF トークン状況確認】");
    
    console.log("1. NAGANO3_CONFIG.csrfToken:", window.NAGANO3_CONFIG?.csrfToken ? 'あり' : 'なし');
    console.log("2. CSRF_TOKEN:", window.CSRF_TOKEN ? 'あり' : 'なし');
    
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    console.log("3. meta[name=\"csrf-token\"]:", metaTag ? metaTag.getAttribute('content') : 'なし');
    
    if (window.N3) {
        console.log("4. N3Core取得トークン:", window.N3.config.csrfToken ? window.N3.config.csrfToken.substring(0, 10) + '...' : 'なし');
    }
}

// Ajax 通信テスト
async function testAjaxCommunication() {
    console.log("\n【Ajax通信テスト】");
    
    if (!window.N3) {
        console.error("N3Core が読み込まれていません");
        return;
    }
    
    try {
        console.log("1. ヘルスチェック実行中...");
        const healthResult = await window.N3.ajax('health_check');
        console.log("✅ ヘルスチェック成功:", healthResult);
        
        console.log("2. Ollama状態確認実行中...");
        const ollamaResult = await window.N3.ollamaRequest('ollama_status_check');
        console.log("✅ Ollama状態確認成功:", ollamaResult);
        
    } catch (error) {
        console.error("❌ Ajax通信失敗:", error.message);
        console.error("エラー詳細:", error);
    }
}

// セッション情報テスト
function testSessionInfo() {
    console.log("\n【セッション情報テスト】");
    
    // Document.cookie からセッション情報を確認
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
    }, {});
    
    console.log("Cookies:", Object.keys(cookies));
    
    if (cookies.PHPSESSID) {
        console.log("PHP Session ID:", cookies.PHPSESSID);
    } else {
        console.warn("PHP Session ID が見つかりません");
    }
}

// 修復状況確認
function checkRepairStatus() {
    console.log("\n【修復状況確認】");
    
    const checks = [
        {
            name: "N3Core読み込み",
            check: () => !!window.N3,
            status: null
        },
        {
            name: "CSRFトークン取得",
            check: () => window.N3?.config.csrfToken && window.N3.config.csrfToken.length > 10,
            status: null
        },
        {
            name: "Ajax基盤稼働",
            check: () => typeof window.N3?.ajax === 'function',
            status: null
        },
        {
            name: "Maru9Controller読み込み",
            check: () => !!window.Maru9Tool,
            status: null
        }
    ];
    
    checks.forEach(check => {
        try {
            check.status = check.check();
            console.log(`${check.status ? '✅' : '❌'} ${check.name}: ${check.status ? '正常' : '異常'}`);
        } catch (error) {
            check.status = false;
            console.log(`❌ ${check.name}: エラー - ${error.message}`);
        }
    });
    
    const successCount = checks.filter(c => c.status).length;
    console.log(`\n修復完了率: ${successCount}/${checks.length} (${Math.round(successCount/checks.length*100)}%)`);
    
    return successCount === checks.length;
}

// 全テスト実行
async function runAllTests() {
    console.log("🔧 CSRF修復テスト開始");
    
    testCSRFToken();
    testSessionInfo();
    
    const repairStatus = checkRepairStatus();
    
    if (repairStatus) {
        console.log("\n✅ 基本機能修復完了 - Ajax通信テスト実行");
        await testAjaxCommunication();
    } else {
        console.log("\n❌ 基本機能に問題があります - Ajax通信テストをスキップ");
    }
    
    console.log("\n=== 🔧 CSRF修復テスト完了 ===");
}

// 自動実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            console.log('[CSRF-TEST] Test functions loaded:', {
                testCSRFRepair: typeof window.testCSRFRepair,
                testCSRFToken: typeof window.testCSRFToken,
                testAjax: typeof window.testAjax
            });
            runAllTests();
        }, 2000);
    });
} else {
    setTimeout(() => {
        console.log('[CSRF-TEST] Test functions loaded:', {
            testCSRFRepair: typeof window.testCSRFRepair,
            testCSRFToken: typeof window.testCSRFToken,
            testAjax: typeof window.testAjax
        });
        runAllTests();
    }, 2000);
}

// グローバル関数として公開
window.testCSRFRepair = runAllTests;
window.testCSRFToken = testCSRFToken;
window.testAjax = testAjaxCommunication;
