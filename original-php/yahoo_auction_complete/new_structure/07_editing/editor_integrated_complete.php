    // モーダル外クリックで閉じる
    document.getElementById('productModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeProductModal();
        }
    });

    // 初期化完了
    document.addEventListener('DOMContentLoaded', function() {
        addLogEntry('🚀 統合編集システム初期化完了 - 15_integrated_modal統合版', 'success');
        addLogEntry('📋 利用可能機能: タブ型UI、15枚画像対応、統合データ概要、全モジュール統合', 'info');
        console.log('🚀 Yahoo Auction統合編集システム - 15_integrated_modal統合版初期化完了');
    });
    </script>
</body>
</html>