/**
 * Wisdom Core - JavaScript機能
 * AI協調型コードベース理解システム
 */

class WisdomCore {
  constructor() {
    this.currentView = 'list';
    this.currentFile = null;
    this.treeData = null;
    this.filters = { category: '', keyword: '' };
    this.init();
  }

  async init() {
    await this.loadStats();
    await this.loadFileList();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // スキャンボタン
    document.getElementById('scanBtn')?.addEventListener('click', () => this.scanProject());

    // エクスポートボタン
    document.getElementById('exportBtn')?.addEventListener('click', () => this.exportJson());

    // リストビューボタン
    document.getElementById('listViewBtn')?.addEventListener('click', () => this.showListView());

    // ツリービューボタン
    document.getElementById('treeViewBtn')?.addEventListener('click', () => this.showTreeView());

    // 検索
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
          this.filters.keyword = e.target.value;
          this.loadFileList();
        }, 500);
      });
    }

    // カテゴリフィルター
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.filters.category = e.target.value;
        this.loadFileList();
      });
    }
  }

  async loadStats() {
    try {
      const response = await fetch('api/data.php?action=stats');
      const result = await response.json();

      if (result.success) {
        this.renderStats(result.data);
      }
    } catch (error) {
      console.error('Stats load error:', error);
    }
  }

  renderStats(stats) {
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) return;

    statsContainer.innerHTML = `
      <div class="stat-card">
        <h4>総ファイル数</h4>
        <div class="value">${stats.total}</div>
      </div>
      ${Object.entries(stats.by_category || {}).slice(0, 3).map(([category, count]) => `
        <div class="stat-card">
          <h4>${this.getCategoryName(category)}</h4>
          <div class="value">${count}</div>
        </div>
      `).join('')}
    `;
  }

  async loadFileList() {
    try {
      const params = new URLSearchParams({
        action: 'list',
        ...this.filters
      });

      const response = await fetch(`api/data.php?${params}`);
      const result = await response.json();

      if (result.success) {
        this.renderFileList(result.data.files);
      }
    } catch (error) {
      console.error('File list load error:', error);
      this.showError('ファイルリストの読み込みに失敗しました');
    }
  }

  renderFileList(files) {
    const container = document.getElementById('fileListContainer');
    if (!container) return;

    if (files.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-folder-open"></i>
          <p>ファイルが見つかりません</p>
        </div>
      `;
      return;
    }

    container.innerHTML = files.map(file => this.createFileCard(file)).join('');

    // クリックイベント設定
    container.querySelectorAll('.file-card').forEach(card => {
      card.addEventListener('click', () => {
        this.showFileDetail(card.dataset.id);
      });
    });
  }

  createFileCard(file) {
    const features = JSON.parse(file.main_features || '[]');

    return `
      <div class="file-card" data-id="${file.id}">
        <div class="file-card-header">
          <div>
            <div class="file-card-title">
              <i class="fas fa-file-code"></i>
              ${this.escapeHtml(file.file_name)}
            </div>
            <div class="file-card-path">${this.escapeHtml(file.path)}</div>
          </div>
        </div>
        <div class="file-card-description">
          ${this.escapeHtml(file.description_simple || '説明なし')}
        </div>
        <div class="file-card-meta">
          <span class="meta-badge category">${this.escapeHtml(file.category || 'unknown')}</span>
          <span class="meta-badge tech">${this.escapeHtml(file.tech_stack || 'N/A')}</span>
          ${features.length > 0 ? `<span class="meta-badge">${features.length}個の機能</span>` : ''}
        </div>
      </div>
    `;
  }

  async showFileDetail(id) {
    try {
      const response = await fetch(`api/data.php?action=detail&id=${id}`);
      const result = await response.json();

      if (result.success) {
        this.currentFile = result.data;
        this.renderFileDetail(result.data);
      }
    } catch (error) {
      console.error('File detail load error:', error);
      this.showError('ファイル詳細の読み込みに失敗しました');
    }
  }

  renderFileDetail(file) {
    const container = document.getElementById('fileListContainer');
    if (!container) return;

    const features = JSON.parse(file.main_features || '[]');
    const dependencies = JSON.parse(file.dependencies || '[]');

    container.innerHTML = `
      <div class="file-detail">
        <div class="file-detail-header">
          <div class="file-detail-info">
            <h2>${this.escapeHtml(file.file_name)}</h2>
            <div class="file-detail-path">${this.escapeHtml(file.path)}</div>
            <div class="file-card-meta">
              <span class="meta-badge category">${this.escapeHtml(file.category)}</span>
              <span class="meta-badge tech">${this.escapeHtml(file.tech_stack)}</span>
            </div>
          </div>
          <div class="file-detail-actions">
            <button class="copy-btn" onclick="wisdomCore.copyForAI()">
              <i class="fas fa-copy"></i> Gemini用コピー
            </button>
            <button class="btn" onclick="wisdomCore.showListView()">
              <i class="fas fa-arrow-left"></i> 戻る
            </button>
          </div>
        </div>

        <div class="detail-section">
          <h3><i class="fas fa-info-circle"></i> 概要</h3>
          <p>${this.escapeHtml(file.description_simple || '説明なし')}</p>
        </div>

        ${file.tool_type ? `
        <div class="detail-section">
          <h3><i class="fas fa-tag"></i> ツール種別</h3>
          <p>${this.escapeHtml(file.tool_type)}</p>
        </div>
        ` : ''}

        ${features.length > 0 ? `
        <div class="detail-section">
          <h3><i class="fas fa-list"></i> 主要機能</h3>
          <ul class="features-list">
            ${features.map(f => `<li>${this.escapeHtml(f)}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        ${dependencies.length > 0 ? `
        <div class="detail-section">
          <h3><i class="fas fa-project-diagram"></i> 依存関係</h3>
          <ul class="features-list">
            ${dependencies.map(d => `<li>${this.escapeHtml(d)}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div class="detail-section">
          <h3><i class="fas fa-code"></i> コードプレビュー</h3>
          <div class="code-preview">
            <div class="code-preview-header">
              <span>${this.escapeHtml(file.file_name)}</span>
              <button class="btn btn-sm" onclick="wisdomCore.copyCode()">
                <i class="fas fa-copy"></i> コードコピー
              </button>
            </div>
            <div class="code-preview-content">
              <pre><code>${this.escapeHtml(file.content || '')}</code></pre>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async showTreeView() {
    try {
      const response = await fetch('api/data.php?action=tree');
      const result = await response.json();

      if (result.success) {
        this.treeData = result.data;
        this.renderTreeView(result.data);
      }
    } catch (error) {
      console.error('Tree load error:', error);
      this.showError('ツリー構造の読み込みに失敗しました');
    }
  }

  renderTreeView(tree) {
    const container = document.getElementById('fileListContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="tree-view-container">
        <ul class="tree-view">
          ${this.renderTreeNode(tree)}
        </ul>
      </div>
    `;
  }

  renderTreeNode(nodes) {
    return Object.values(nodes).map(node => {
      if (node.type === 'folder') {
        return `
          <li class="tree-item">
            <div class="tree-node folder" onclick="this.nextElementSibling.classList.toggle('hidden')">
              <span class="tree-toggle">▶</span>
              <i class="fas fa-folder"></i>
              ${this.escapeHtml(node.name)}
            </div>
            <ul class="tree-children">
              ${this.renderTreeNode(node.children)}
            </ul>
          </li>
        `;
      } else {
        return `
          <li class="tree-item">
            <div class="tree-node file" onclick="wisdomCore.showFileDetail(${node.data.id})">
              <i class="fas fa-file-code"></i>
              ${this.escapeHtml(node.name)}
            </div>
          </li>
        `;
      }
    }).join('');
  }

  showListView() {
    this.currentView = 'list';
    this.loadFileList();
  }

  async scanProject() {
    const progressDiv = this.showProgress();

    try {
      const response = await fetch('api/scan.php');
      const result = await response.json();

      if (result.success) {
        this.updateProgress(progressDiv, result.data);
        setTimeout(() => {
          progressDiv.remove();
          this.showSuccess('スキャン完了！');
          this.loadStats();
          this.loadFileList();
        }, 1000);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Scan error:', error);
      progressDiv.remove();
      this.showError('スキャンに失敗しました: ' + error.message);
    }
  }

  showProgress() {
    const div = document.createElement('div');
    div.className = 'scan-progress';
    div.innerHTML = `
      <h3><i class="fas fa-sync fa-spin"></i> プロジェクトをスキャン中...</h3>
      <div class="progress-bar">
        <div class="progress-fill" style="width: 0%"></div>
      </div>
      <div class="scan-stats">
        <div class="scan-stat">
          <div class="label">スキャン済み</div>
          <div class="value" id="scannedCount">0</div>
        </div>
        <div class="scan-stat">
          <div class="label">新規</div>
          <div class="value" id="newCount">0</div>
        </div>
        <div class="scan-stat">
          <div class="label">更新</div>
          <div class="value" id="updatedCount">0</div>
        </div>
        <div class="scan-stat">
          <div class="label">スキップ</div>
          <div class="value" id="skippedCount">0</div>
        </div>
      </div>
    `;
    document.body.appendChild(div);
    return div;
  }

  updateProgress(progressDiv, stats) {
    const progress = ((stats.new + stats.updated + stats.skipped) / stats.scanned * 100);
    progressDiv.querySelector('.progress-fill').style.width = progress + '%';
    progressDiv.querySelector('#scannedCount').textContent = stats.scanned;
    progressDiv.querySelector('#newCount').textContent = stats.new;
    progressDiv.querySelector('#updatedCount').textContent = stats.updated;
    progressDiv.querySelector('#skippedCount').textContent = stats.skipped;
  }

  copyForAI() {
    if (!this.currentFile) return;

    const text = this.formatForAI(this.currentFile);
    navigator.clipboard.writeText(text).then(() => {
      this.showSuccess('Gemini用テキストをコピーしました！');
      
      // コピーボタンのビジュアルフィードバック
      const btn = event.target.closest('.copy-btn');
      btn.classList.add('success');
      btn.innerHTML = '<i class="fas fa-check"></i> コピー完了！';
      setTimeout(() => {
        btn.classList.remove('success');
        btn.innerHTML = '<i class="fas fa-copy"></i> Gemini用コピー';
      }, 2000);
    });
  }

  formatForAI(file) {
    const features = JSON.parse(file.main_features || '[]');
    const dependencies = JSON.parse(file.dependencies || '[]');

    return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 ファイル: ${file.path}
🏷️ 種類: ${file.tool_type || '不明'}
💡 機能: ${file.description_simple || '説明なし'}

【カテゴリ】
${file.category}

【技術スタック】
${file.tech_stack}

${features.length > 0 ? `【主要機能】
${features.map(f => `- ${f}`).join('\n')}
` : ''}
${dependencies.length > 0 ? `【依存関係】
${dependencies.map(d => `- ${d}`).join('\n')}
` : ''}
【コード全文】
\`\`\`${this.getFileExtension(file.file_name)}
${file.content}
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  copyCode() {
    if (!this.currentFile) return;

    navigator.clipboard.writeText(this.currentFile.content).then(() => {
      this.showSuccess('コードをコピーしました！');
    });
  }

  exportJson() {
    window.location.href = 'api/export.php';
    this.showSuccess('code_map.jsonをダウンロードしています...');
  }

  getFileExtension(filename) {
    const ext = filename.split('.').pop();
    return ext || '';
  }

  getCategoryName(category) {
    const names = {
      'dashboard': 'ダッシュボード',
      'scraping': 'データ収集',
      'editing': 'データ編集',
      'wisdom_core': 'ナレッジ事典',
      'api': 'API',
      'class': 'クラス',
      'config': '設定',
      'shared': '共有',
      'unknown': '未分類'
    };
    return names[category] || category;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type) {
    const div = document.createElement('div');
    div.className = `notification notification-${type}`;
    div.textContent = message;
    div.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }
}

// 初期化
let wisdomCore;
document.addEventListener('DOMContentLoaded', () => {
  wisdomCore = new WisdomCore();
});
