/**
 * 承認画面用：画像表示修正スクリプト
 * このスクリプトを承認画面で読み込んでください
 */

// 既存のloadApprovalData関数を上書き
if (typeof window !== 'undefined') {
  console.log('🔧 画像表示修正スクリプト読み込み');
  
  // 新しいAPIエンドポイントを使用
  window.loadApprovalDataFixed = async function() {
    try {
      const response = await fetch('/api/approval');
      const result = await response.json();
      
      if (result.success && result.data) {
        // データを表示
        const products = result.data;
        console.log(`✅ ${products.length}件のデータを取得`);
        console.log('画像付きデータ:', products.filter(p => p.primary_image_url));
        
        // 既存の表示関数を呼び出し
        if (typeof displayApprovalProducts === 'function') {
          displayApprovalProducts(products);
        }
        
        return products;
      }
    } catch (error) {
      console.error('❌ データ取得エラー:', error);
    }
  };
  
  // ページ読み込み時に自動実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => window.loadApprovalDataFixed(), 1000);
    });
  } else {
    setTimeout(() => window.loadApprovalDataFixed(), 1000);
  }
}
