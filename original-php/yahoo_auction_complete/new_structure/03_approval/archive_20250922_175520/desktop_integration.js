/**
 * デスクトップ統合機能
 * modules/yahoo_auction_complete/new_structure/03_approval/desktop_integration.js
 * 
 * Electron・Tauri対応、ネイティブ機能統合
 */

class DesktopIntegration {
    constructor() {
        this.isElectron = this.checkElectron();
        this.isTauri = this.checkTauri();
        this.isDesktop = this.isElectron || this.isTauri;
        
        if (this.isDesktop) {
            this.initializeDesktopFeatures();
        }
    }
    
    // Electron環境検知
    checkElectron() {
        return typeof window !== 'undefined' && 
               window.process && 
               window.process.type === 'renderer';
    }
    
    // Tauri環境検知
    checkTauri() {
        return typeof window !== 'undefined' && 
               window.__TAURI__ !== undefined;
    }
    
    // デスクトップ機能初期化
    async initializeDesktopFeatures() {
        try {
            await this.setupMenus();
            await this.setupShortcuts();
            await this.setupNotifications();
            await this.setupFileHandling();
            
            console.log('Desktop integration initialized successfully');
        } catch (error) {
            console.error('Desktop integration initialization failed:', error);
        }
    }
    
    // メニュー設定
    async setupMenus() {
        if (this.isElectron) {
            const { ipcRenderer } = require('electron');
            
            const menuTemplate = [
                {
                    label: 'ファイル',
                    submenu: [
                        {
                            label: 'CSV エクスポート',
                            accelerator: 'CmdOrCtrl+E',
                            click: () => this.exportCSV()
                        },
                        {
                            label: 'データ再読み込み',
                            accelerator: 'F5',
                            click: () => window.location.reload()
                        },
                        { type: 'separator' },
                        {
                            label: '終了',
                            accelerator: 'CmdOrCtrl+Q',
                            role: 'quit'
                        }
                    ]
                },
                {
                    label: '承認',
                    submenu: [
                        {
                            label: '選択商品を承認',
                            accelerator: 'Enter',
                            click: () => this.triggerApproval()
                        },
                        {
                            label: '選択商品を否認',
                            accelerator: 'CmdOrCtrl+R',
                            click: () => this.triggerRejection()
                        },
                        {
                            label: '全選択',
                            accelerator: 'CmdOrCtrl+A',
                            click: () => this.selectAll()
                        }
                    ]
                },
                {
                    label: '表示',
                    submenu: [
                        {
                            label: 'フィルターリセット',
                            accelerator: 'CmdOrCtrl+Shift+R',
                            click: () => this.resetFilters()
                        },
                        {
                            label: '開発者ツール',
                            accelerator: 'F12',
                            click: () => ipcRenderer.send('toggle-dev-tools')
                        },
                        { type: 'separator' },
                        {
                            label: '全画面表示',
                            accelerator: 'F11',
                            role: 'togglefullscreen'
                        }
                    ]
                }
            ];
            
            ipcRenderer.send('set-application-menu', menuTemplate);
        }
    }
    
    // ショートカットキー設定
    async setupShortcuts() {
        const shortcuts = {
            // 承認操作
            'Enter': () => this.triggerApproval(),
            'KeyR': () => this.triggerRejection(),
            
            // 選択操作
            'KeyA': (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.selectAll();
                }
            },
            
            // フィルター操作
            'KeyF': (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    document.getElementById('search-filter').focus();
                }
            },
            
            // エクスポート
            'KeyE': (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.exportCSV();
                }
            }
        };
        
        document.addEventListener('keydown', (event) => {
            const key = event.code;
            if (shortcuts[key]) {
                shortcuts[key](event);
            }
        });
    }
    
    // 通知システム設定
    async setupNotifications() {
        // デスクトップ通知権限要求
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }
    
    // ファイル処理設定
    async setupFileHandling() {
        // ドラッグ&ドロップ対応
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const files = Array.from(e.dataTransfer.files);
            this.handleDroppedFiles(files);
        });
        
        // Electron IPC通信
        if (this.isElectron) {
            const { ipcRenderer } = require('electron');
            
            ipcRenderer.on('file-opened', (event, filePath) => {
                this.importFile(filePath);
            });
        }
    }
    
    // ドロップファイル処理
    async handleDroppedFiles(files) {
        for (const file of files) {
            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                await this.importCSV(file);
            } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
                await this.importJSON(file);
            } else {
                this.showNotification('警告', `未サポートのファイル形式: ${file.name}`, 'warning');
            }
        }
    }
    
    // CSV インポート
    async importCSV(file) {
        try {
            const text = await file.text();
            const lines = text.split('\n');
            
            this.showNotification('成功', `CSV ファイル「${file.name}」を読み込みました (${lines.length}行)`, 'success');
            
            // CSV データの処理ロジックをここに実装
            console.log('CSV データ:', lines);
            
        } catch (error) {
            this.showNotification('エラー', `CSV読み込み失敗: ${error.message}`, 'error');
        }
    }
    
    // JSON インポート
    async importJSON(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            this.showNotification('成功', `JSON ファイル「${file.name}」を読み込みました`, 'success');
            
            // JSON データの処理ロジックをここに実装
            console.log('JSON データ:', data);
            
        } catch (error) {
            this.showNotification('エラー', `JSON読み込み失敗: ${error.message}`, 'error');
        }
    }
    
    // 承認アクション実行
    triggerApproval() {
        if (window.approveSelected && typeof window.approveSelected === 'function') {
            window.approveSelected();
        }
    }
    
    // 否認アクション実行
    triggerRejection() {
        if (window.rejectSelected && typeof window.rejectSelected === 'function') {
            window.rejectSelected();
        }
    }
    
    // 全選択実行
    selectAll() {
        if (window.selectAll && typeof window.selectAll === 'function') {
            window.selectAll();
        }
    }
    
    // フィルターリセット
    resetFilters() {
        const filters = ['status-filter', 'ai-filter', 'min-price-filter', 'max-price-filter', 'search-filter'];
        filters.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });
        
        if (window.applyFilters && typeof window.applyFilters === 'function') {
            window.applyFilters();
        }
    }
    
    // CSV エクスポート
    exportCSV() {
        if (window.exportCSV && typeof window.exportCSV === 'function') {
            window.exportCSV();
        }
    }
    
    // デスクトップ通知表示
    showNotification(title, message, type = 'info') {
        if (this.isElectron) {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('show-notification', { title, message, type });
        } else if (this.isTauri) {
            // Tauri通知API
            window.__TAURI__.notification.sendNotification({
                title,
                body: message,
                icon: this.getIconForType(type)
            });
        } else if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: this.getIconForType(type)
            });
        }
    }
    
    // タイプ別アイコン取得
    getIconForType(type) {
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        return icons[type] || icons.info;
    }
    
    // ファイル保存ダイアログ
    async saveFile(data, filename, type = 'text/csv') {
        if (this.isElectron) {
            const { ipcRenderer } = require('electron');
            return ipcRenderer.invoke('save-file-dialog', { data, filename, type });
        } else if (this.isTauri) {
            // Tauri ファイル保存API
            const { save } = window.__TAURI__.dialog;
            const { writeTextFile } = window.__TAURI__.fs;
            
            try {
                const filePath = await save({
                    defaultPath: filename
                });
                
                if (filePath) {
                    await writeTextFile(filePath, data);
                    return filePath;
                }
            } catch (error) {
                console.error('File save error:', error);
                throw error;
            }
        } else {
            // ブラウザでのファイルダウンロード
            const blob = new Blob([data], { type });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
        }
    }
    
    // システム情報取得
    async getSystemInfo() {
        if (this.isElectron) {
            const { ipcRenderer } = require('electron');
            return ipcRenderer.invoke('get-system-info');
        } else if (this.isTauri) {
            const { platform, arch } = window.__TAURI__.os;
            return {
                platform: await platform(),
                arch: await arch(),
                isDesktop: true
            };
        } else {
            return {
                platform: navigator.platform,
                userAgent: navigator.userAgent,
                isDesktop: false
            };
        }
    }
    
    // ウィンドウ制御
    async controlWindow(action) {
        if (this.isElectron) {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('window-control', action);
        } else if (this.isTauri) {
            const { appWindow } = window.__TAURI__.window;
            
            switch (action) {
                case 'minimize':
                    await appWindow.minimize();
                    break;
                case 'maximize':
                    await appWindow.toggleMaximize();
                    break;
                case 'close':
                    await appWindow.close();
                    break;
            }
        }
    }
}

// グローバル初期化
let desktopIntegration;

document.addEventListener('DOMContentLoaded', () => {
    desktopIntegration = new DesktopIntegration();
    
    // デスクトップ環境の場合、追加UI要素を表示
    if (desktopIntegration.isDesktop) {
        document.body.classList.add('desktop-mode');
        
        // デスクトップ専用のスタイルを追加
        const desktopStyles = `
            .desktop-mode .container {
                padding-top: 0;
            }
            .desktop-mode .header {
                border-radius: 0;
                margin-bottom: var(--space-lg);
            }
            .desktop-mode .control-bar {
                position: sticky;
                top: 0;
            }
        `;
        
        const styleElement = document.createElement('style');
        styleElement.textContent = desktopStyles;
        document.head.appendChild(styleElement);
    }
});

// エクスポート（Node.js環境対応）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DesktopIntegration;
}