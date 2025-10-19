/**
 * デスクトップ版統合設定
 * ファイル: 03_approval/desktop_integration.js
 * 
 * Electron/Tauri等のデスクトップアプリケーションとの統合用設定
 */

class DesktopIntegration {
    constructor() {
        this.isDesktop = this.detectDesktopEnvironment();
        this.apiBaseUrl = this.isDesktop ? 'http://localhost:8000/api' : './approval.php';
        this.init();
    }
    
    /**
     * デスクトップ環境検出
     */
    detectDesktopEnvironment() {
        // Electron検出
        if (typeof window !== 'undefined' && window.process && window.process.type) {
            return 'electron';
        }
        
        // Tauri検出
        if (typeof window !== 'undefined' && window.__TAURI__) {
            return 'tauri';
        }
        
        // PWA検出
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
            return 'pwa';
        }
        
        return false;
    }
    
    /**
     * 初期化
     */
    init() {
        if (this.isDesktop) {
            this.setupDesktopFeatures();
        }
        
        // 統合API呼び出し関数をグローバルに設定
        window.approvalAPI = {
            loadData: (params) => this.loadApprovalData(params),
            approveProducts: (productIds) => this.approveProducts(productIds),
            rejectProducts: (productIds, reason) => this.rejectProducts(productIds, reason),
            exportData: (data) => this.exportData(data),
            openExternalLink: (url) => this.openExternalLink(url)
        };
    }
    
    /**
     * デスクトップ専用機能設定
     */
    setupDesktopFeatures() {
        // ネイティブメニュー
        this.setupNativeMenu();
        
        // ファイルドラッグ&ドロップ
        this.setupFileDragDrop();
        
        // 通知機能
        this.setupNotifications();
        
        // ショートカットキー
        this.setupShortcuts();
    }
    
    /**
     * API呼び出し（デスクトップ対応）
     */
    async loadApprovalData(params = {}) {
        const url = new URL(this.apiBaseUrl);
        url.searchParams.append('action', 'get_approval_queue');
        
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });
        
        try {
            const response = await fetch(url.toString());
            const data = await response.json();
            
            if (this.isDesktop) {
                this.updateDesktopBadge(data.data?.statistics?.pending || 0);
            }
            
            return data;
        } catch (error) {
            console.error('API呼び出しエラー:', error);
            throw error;
        }
    }
    
    /**
     * 商品承認（デスクトップ対応）
     */
    async approveProducts(productIds) {
        try {
            const response = await fetch(this.apiBaseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'approve_products',
                    product_ids: productIds,
                    approved_by: this.isDesktop ? 'desktop_user' : 'web_user'
                })
            });
            
            const data = await response.json();
            
            if (this.isDesktop && data.success) {
                this.showDesktopNotification(
                    '商品承認完了',
                    `${data.data.success_count}件の商品を承認しました`
                );
            }
            
            return data;
        } catch (error) {
            console.error('承認API呼び出しエラー:', error);
            throw error;
        }
    }
    
    /**
     * 商品否認（デスクトップ対応）
     */
    async rejectProducts(productIds, reason = '手動否認') {
        try {
            const response = await fetch(this.apiBaseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reject_products',
                    product_ids: productIds,
                    reason: reason,
                    rejected_by: this.isDesktop ? 'desktop_user' : 'web_user'
                })
            });
            
            const data = await response.json();
            
            if (this.isDesktop && data.success) {
                this.showDesktopNotification(
                    '商品否認完了',
                    `${data.data.success_count}件の商品を否認しました`
                );
            }
            
            return data;
        } catch (error) {
            console.error('否認API呼び出しエラー:', error);
            throw error;
        }
    }
    
    /**
     * データ出力（デスクトップ対応）
     */
    async exportData(data) {
        if (this.isDesktop === 'electron') {
            // Electronの場合はネイティブダイアログ使用
            const { dialog } = require('electron').remote;
            const fs = require('fs');
            
            const result = await dialog.showSaveDialog({
                title: '承認データをエクスポート',
                defaultPath: `approval_data_${new Date().toISOString().slice(0, 10)}.csv`,
                filters: [
                    { name: 'CSVファイル', extensions: ['csv'] }
                ]
            });
            
            if (!result.canceled) {
                fs.writeFileSync(result.filePath, data);
                this.showDesktopNotification('エクスポート完了', 'データを保存しました');
            }
        } else if (this.isDesktop === 'tauri') {
            // Tauriの場合
            const { save } = window.__TAURI__.dialog;
            const { writeTextFile } = window.__TAURI__.fs;
            
            const filePath = await save({
                filters: [{
                    name: 'CSV',
                    extensions: ['csv']
                }]
            });
            
            if (filePath) {
                await writeTextFile(filePath, data);
                this.showDesktopNotification('エクスポート完了', 'データを保存しました');
            }
        } else {
            // Web版の場合は従来通り
            this.downloadCSV(data, `approval_data_${new Date().toISOString().slice(0, 10)}.csv`);
        }
    }
    
    /**
     * 外部リンクを開く
     */
    openExternalLink(url) {
        if (this.isDesktop === 'electron') {
            const { shell } = require('electron');
            shell.openExternal(url);
        } else if (this.isDesktop === 'tauri') {
            window.__TAURI__.shell.open(url);
        } else {
            window.open(url, '_blank');
        }
    }
    
    /**
     * デスクトップ通知表示
     */
    showDesktopNotification(title, body) {
        if (this.isDesktop && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification(title, { body });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification(title, { body });
                    }
                });
            }
        }
    }
    
    /**
     * デスクトップバッジ更新
     */
    updateDesktopBadge(count) {
        if (this.isDesktop === 'electron') {
            const { app } = require('electron').remote;
            app.setBadgeCount(count);
        } else if (this.isDesktop === 'tauri') {
            // Tauriのバッジ機能があれば実装
        }
    }
    
    /**
     * ネイティブメニュー設定
     */
    setupNativeMenu() {
        if (this.isDesktop === 'electron') {
            // Electronメニュー設定
            const { Menu } = require('electron').remote;
            
            const template = [
                {
                    label: 'ファイル',
                    submenu: [
                        {
                            label: 'データを更新',
                            accelerator: 'CmdOrCtrl+R',
                            click: () => {
                                window.loadApprovalData();
                            }
                        },
                        {
                            label: 'CSVエクスポート',
                            accelerator: 'CmdOrCtrl+E',
                            click: () => {
                                window.exportData();
                            }
                        }
                    ]
                },
                {
                    label: '承認',
                    submenu: [
                        {
                            label: '選択商品を承認',
                            accelerator: 'CmdOrCtrl+A',
                            click: () => {
                                window.bulkApprove();
                            }
                        },
                        {
                            label: '選択商品を否認',
                            accelerator: 'CmdOrCtrl+D',
                            click: () => {
                                window.bulkReject();
                            }
                        }
                    ]
                }
            ];
            
            const menu = Menu.buildFromTemplate(template);
            Menu.setApplicationMenu(menu);
        }
    }
    
    /**
     * ファイルドラッグ&ドロップ設定
     */
    setupFileDragDrop() {
        if (!this.isDesktop) return;
        
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files);
            
            files.forEach(file => {
                if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                    this.importCSVFile(file);
                }
            });
        });
    }
    
    /**
     * CSVファイルインポート
     */
    async importCSVFile(file) {
        const text = await file.text();
        // CSV解析とインポート処理
        console.log('CSVファイルをインポート:', file.name, text.slice(0, 100));
        
        this.showDesktopNotification(
            'ファイルインポート',
            `${file.name} を処理中...`
        );
    }
    
    /**
     * ショートカットキー設定
     */
    setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+A: 全選択
            if (e.ctrlKey && e.key === 'a' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                window.selectAllVisible();
            }
            
            // Ctrl+D: 全解除
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                window.deselectAll();
            }
            
            // Ctrl+R: データ更新
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                window.loadApprovalData();
            }
            
            // Ctrl+E: エクスポート
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                window.exportData();
            }
            
            // Enter: 選択商品を承認
            if (e.key === 'Enter' && window.selectedProducts.size > 0) {
                window.bulkApprove();
            }
            
            // Delete: 選択商品を否認
            if (e.key === 'Delete' && window.selectedProducts.size > 0) {
                window.bulkReject();
            }
        });
    }
    
    /**
     * Web版のCSVダウンロード
     */
    downloadCSV(csvData, filename) {
        const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    window.desktopIntegration = new DesktopIntegration();
});

// デスクトップ版用のビルド設定例
const DESKTOP_CONFIG = {
    electron: {
        main: 'main.js',
        build: {
            appId: 'com.yahoo.auction.approval',
            productName: 'Yahoo Auction Approval System',
            directories: {
                output: 'dist'
            },
            files: [
                '**/*',
                '!node_modules',
                '!src'
            ]
        }
    },
    tauri: {
        tauri: {
            allowlist: {
                all: true,
                fs: {
                    all: true
                },
                dialog: {
                    all: true
                },
                shell: {
                    all: true
                }
            }
        }
    }
};

// Export設定
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DesktopIntegration, DESKTOP_CONFIG };
}