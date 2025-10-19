/**
 * 棚卸しシステム JavaScript - Stage 1: 最小限版
 * N3フレームワーク準拠版
 */

(function() {
    'use strict';
    
    console.log('📜 棚卸しシステム Stage 1: 最小限版 読み込み開始');
    
    // グローバル変数の最小限初期化
    window.TanaoroshiSystem = window.TanaoroshiSystem || {};
    window.TanaoroshiSystem.isInitialized = false;
    
    // DOM初期化（一回限り実行保証）
    document.addEventListener('DOMContentLoaded', function() {
        if (window.TanaoroshiSystem.isInitialized) {
            console.log('⚠️ 重複初期化を防止');
            return;
        }
        window.TanaoroshiSystem.isInitialized = true;
        
        console.log('🚀 棚卸しシステム Stage 1 初期化開始');
        console.log('✅ 棚卸しシステム Stage 1 初期化完了');
    });
    
    console.log('📜 棚卸しシステム Stage 1: 最小限版 読み込み完了');
    
})();
