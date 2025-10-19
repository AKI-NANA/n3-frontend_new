/**
 * 棚卸しシステム Stage 1: 最小限基本機能のみ
 * エラー特定用 - 複雑な機能は一切含まない
 */

(function() {
    'use strict';
    
    console.log('🔧 Stage 1: 棚卸しシステム最小限初期化開始');
    
    /**
     * 最小限の棚卸しシステムクラス
     */
    class BasicTanaoroshiSystem {
        constructor() {
            this.name = 'BasicTanaoroshiSystem';
            this.version = '1.0.0';
            console.log('BasicTanaoroshiSystem コンストラクタ実行');
        }
        
        /**
         * 基本初期化（最小限）
         */
        init() {
            console.log('BasicTanaoroshiSystem 初期化開始');
            
            try {
                // 基本要素の存在確認のみ
                this.checkBasicElements();
                
                // 基本イベントリスナー（1つだけ）
                this.setupBasicEvents();
                
                console.log('✅ Stage 1: 基本初期化完了');
                return true;
                
            } catch (error) {
                console.error('❌ Stage 1: 初期化エラー:', error);
                return false;
            }
        }
        
        /**
         * 基本要素の存在確認
         */
        checkBasicElements() {
            const requiredElements = [
                'card-view',
                'list-view',
                'card-view-btn',
                'list-view-btn'
            ];
            
            console.log('基本要素存在確認開始...');
            
            requiredElements.forEach(elementId => {
                const element = document.getElementById(elementId);
                if (element) {
                    console.log(`✅ 要素発見: ${elementId}`);
                } else {
                    console.warn(`⚠️ 要素未発見: ${elementId}`);
                }
            });
        }
        
        /**
         * 基本イベントリスナー（1つだけテスト）
         */
        setupBasicEvents() {
            console.log('基本イベントリスナー設定開始...');
            
            // カードビューボタンのみ
            const cardViewBtn = document.getElementById('card-view-btn');
            if (cardViewBtn) {
                cardViewBtn.addEventListener('click', () => {
                    console.log('🎯 カードビューボタンクリック検出');
                    this.testBasicViewSwitch();
                });
                console.log('✅ カードビューボタンイベント設定完了');
            }
        }
        
        /**
         * 基本ビュー切り替えテスト
         */
        testBasicViewSwitch() {
            console.log('🔄 基本ビュー切り替えテスト実行');
            
            const cardView = document.getElementById('card-view');
            const listView = document.getElementById('list-view');
            
            if (cardView && listView) {
                // 単純な表示切り替え
                cardView.style.display = 'grid';
                listView.style.display = 'none';
                console.log('✅ ビュー切り替え成功');
            } else {
                console.error('❌ ビュー要素が見つかりません');
            }
        }
    }
    
    /**
     * DOMContentLoaded時の初期化
     */
    let basicSystem = null;
    
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 Stage 1: DOMContentLoaded - 基本システム開始');
        
        try {
            basicSystem = new BasicTanaoroshiSystem();
            const initSuccess = basicSystem.init();
            
            if (initSuccess) {
                console.log('🎉 Stage 1: 基本システム初期化成功');
                
                // グローバル露出（最小限）
                window.BasicTanaoroshiSystem = basicSystem;
                
                // 成功メッセージ表示
                setTimeout(() => {
                    console.log('✅ Stage 1 完了: エラーなし - Stage 2準備完了');
                }, 1000);
                
            } else {
                console.error('❌ Stage 1: 基本システム初期化失敗');
            }
            
        } catch (error) {
            console.error('🚨 Stage 1: 致命的エラー:', error);
        }
    });
    
})();

console.log('📜 Stage 1: 棚卸しシステム基本スクリプト読み込み完了');