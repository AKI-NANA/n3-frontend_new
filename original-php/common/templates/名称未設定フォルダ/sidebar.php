<nav style="padding: 20px; background: #f8fafc; min-height: 100vh; border-right: 1px solid #e2e8f0;">
    <div style="margin-bottom: 1.5rem;">
        <h3 style="color: #475569; font-size: 0.875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem;">
            メインシステム
        </h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 0.5rem;">
                <a href="?page=dashboard" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; text-decoration: none; color: #475569; border-radius: 6px; transition: all 0.2s; <?= $page === 'dashboard' ? 'background: #3b82f6; color: white;' : '' ?>">
                    <i class="fas fa-tachometer-alt"></i> ダッシュボード
                </a>
            </li>
            <li style="margin-bottom: 0.5rem;">
                <a href="?page=ebay_database_manager" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; text-decoration: none; color: #dc2626; font-weight: 600; border-radius: 6px; transition: all 0.2s; <?= $page === 'ebay_database_manager' ? 'background: #dc2626; color: white;' : '' ?>">
                    <i class="fas fa-database"></i> eBayデータベース管理 (Phase1完了版)
                </a>
            </li>
        </ul>
    </div>
    
    <div style="margin-bottom: 1.5rem;">
        <h3 style="color: #475569; font-size: 0.875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem;">
            在庫・棚卸システム
        </h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 0.5rem;">
                <a href="?page=tanaoroshi_postgresql_ebay" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; text-decoration: none; color: #059669; font-weight: 500; border-radius: 6px; transition: all 0.2s; <?= $page === 'tanaoroshi_postgresql_ebay' ? 'background: #059669; color: white;' : '' ?>">
                    <i class="fas fa-warehouse"></i> PostgreSQL統合棚卸
                </a>
            </li>
            <li style="margin-bottom: 0.5rem;">
                <a href="?page=ebay_inventory" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; text-decoration: none; color: #f59e0b; font-weight: 500; border-radius: 6px; transition: all 0.2s; <?= $page === 'ebay_inventory' ? 'background: #f59e0b; color: white;' : '' ?>">
                    <i class="fas fa-shopping-cart"></i> eBay在庫管理
                </a>
            </li>
            <li style="margin-bottom: 0.5rem;">
                <a href="?page=tanaoroshi_inline_complete" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; text-decoration: none; color: #8b5cf6; font-weight: 500; border-radius: 6px; transition: all 0.2s; <?= $page === 'tanaoroshi_inline_complete' ? 'background: #8b5cf6; color: white;' : '' ?>">
                    <i class="fas fa-warehouse"></i> 棚卸システム完全版
                </a>
            </li>
        </ul>
    </div>
    
    <div style="margin-bottom: 1.5rem;">
        <h3 style="color: #475569; font-size: 0.875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem;">
            開発ツール
        </h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 0.5rem;">
                <a href="?page=maru9_tool" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; text-decoration: none; color: #475569; border-radius: 6px; transition: all 0.2s; <?= $page === 'maru9_tool' ? 'background: #475569; color: white;' : '' ?>">
                    <i class="fas fa-cogs"></i> maru9ツール
                </a>
            </li>
            <li style="margin-bottom: 0.5rem;">
                <a href="?page=auto_sort_system_tool" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; text-decoration: none; color: #475569; border-radius: 6px; transition: all 0.2s; <?= $page === 'auto_sort_system_tool' ? 'background: #475569; color: white;' : '' ?>">
                    <i class="fas fa-sort"></i> 自動振り分け
                </a>
            </li>
        </ul>
    </div>
    
    <div style="margin-top: 2rem; padding: 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px;">
        <div style="font-size: 0.75rem; color: #166534; font-weight: 600; margin-bottom: 0.5rem;">
            <i class="fas fa-trophy"></i> Phase 1 最終完了
        </div>
        <div style="font-size: 0.7rem; color: #15803d;">
            画像ハッシュベースのユニーク商品識別システム稼働中
        </div>
    </div>
</nav>

<style>
nav a:hover {
    background: #e2e8f0 !important;
    color: #1e293b !important;
}
</style>