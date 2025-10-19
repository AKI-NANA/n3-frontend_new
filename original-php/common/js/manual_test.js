/**
 * 手動実行用 CSRF テスト関数
 * コンソールから直接実行可能
 */

// 簡易テスト関数
function simpleCSRFTest() {
    console.log("=== 🔧 簡易CSRF修復テスト ===");
    
    // 1. 基本状態確認
    console.log("\n【基本状態確認】");
    console.log("N3Core:", typeof window.N3);
    console.log("CSRF Token:", window.N3?.config?.csrfToken ? "あり" : "なし");
    console.log("Debug Mode:", window.N3?.config?.debug);
    
    // 2. 簡易Ajax テスト
    if (window.N3) {
        console.log("\n【Ajax通信テスト開始】");
        window.N3.ajax('health_check')
            .then(result => {
                console.log("✅ Ajax通信成功:", result);
            })
            .catch(error => {
                console.log("❌ Ajax通信失敗:", error.message);
            });
    } else {
        console.log("❌ N3Core が利用できません");
    }
}

// Ollama テスト関数
function simpleOllamaTest() {
    console.log("=== 🤖 簡易Ollamaテスト ===");
    
    if (window.N3) {
        console.log("Ollama状態確認中...");
        window.N3.checkOllamaStatus()
            .then(status => {
                console.log("✅ Ollama状態取得成功:", status);
            })
            .catch(error => {
                console.log("❌ Ollama状態取得失敗:", error.message);
            });
    } else {
        console.log("❌ N3Core が利用できません");
    }
}

// エラー状況確認
function checkErrorStatus() {
    console.log("=== 🚨 エラー状況確認 ===");
    
    console.log("JavaScript エラー:", {
        hasN3Core: !!window.N3,
        hasCSRFToken: !!(window.CSRF_TOKEN || window.NAGANO3_CONFIG?.csrfToken),
        hasTestFunctions: !!window.testCSRFRepair,
        currentPage: window.NAGANO3_CONFIG?.currentPage || 'unknown'
    });
    
    if (window.N3) {
        console.log("N3Core 設定:", {
            baseUrl: window.N3.config.baseUrl,
            currentPage: window.N3.config.currentPage,
            debug: window.N3.config.debug,
            csrfTokenLength: window.N3.config.csrfToken?.length || 0
        });
    }
}

// すべてのテストを実行
function runQuickTests() {
    console.log("🚀 クイックテスト実行開始");
    
    checkErrorStatus();
    simpleCSRFTest();
    
    setTimeout(() => {
        simpleOllamaTest();
    }, 2000);
    
    console.log("\n✅ クイックテスト完了");
}

// グローバル関数として公開
window.simpleCSRFTest = simpleCSRFTest;
window.simpleOllamaTest = simpleOllamaTest;
window.checkErrorStatus = checkErrorStatus;
window.runQuickTests = runQuickTests;

console.log("🔧 手動テスト関数を読み込みました:");
console.log("- simpleCSRFTest()");
console.log("- simpleOllamaTest()");
console.log("- checkErrorStatus()");
console.log("- runQuickTests()");
