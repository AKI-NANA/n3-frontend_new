#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
template_builder_rest.py - HTMLテンプレート生成ユーティリティ（統一APIレスポンス対応版）

✅ 修正内容:
- APIレスポンス形式を完全統一: {"status": "success/error", "message": "", "data": {}, "timestamp": ""}
- エラーハンドリングの統一
- ログ記録の標準化
- 例外処理の統一
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

from jinja2 import Environment, FileSystemLoader, select_autoescape

from utils.logger import setup_logger
from utils.config import settings
from core.exceptions import EmverzeException, ValidationException

# ロガー設定
logger = setup_logger()

def create_api_response(status: str, message: str = "", data: dict = None) -> dict:
    """統一APIレスポンス形式作成
    
    Args:
        status: "success" または "error"
        message: メッセージ
        data: データ（デフォルト: {}）
        
    Returns:
        統一形式のAPIレスポンス
    """
    return {
        "status": status,
        "message": message,
        "data": data if data is not None else {},
        "timestamp": datetime.utcnow().isoformat()
    }

class TemplateBuilder:
    """HTMLテンプレート生成クラス（統一APIレスポンス対応版）"""
    
    def __init__(self, template_dir: Optional[str] = None):
        """初期化
        
        Args:
            template_dir: テンプレートディレクトリパス（指定しない場合はデフォルト）
        """
        try:
            # テンプレートディレクトリの設定
            if template_dir:
                self.template_dir = Path(template_dir)
            else:
                self.template_dir = Path(__file__).parents[2] / "templates"
            
            # テンプレートディレクトリが存在しない場合は作成
            if not self.template_dir.exists():
                logger.info(f"テンプレートディレクトリを作成: {self.template_dir}")
                self.template_dir.mkdir(parents=True, exist_ok=True)
            
            # Jinja2環境設定
            self.env = Environment(
                loader=FileSystemLoader(str(self.template_dir)),
                autoescape=select_autoescape(['html', 'xml']),
                trim_blocks=True,
                lstrip_blocks=True
            )
            
            # アプリケーション設定
            self.app_name = getattr(settings, 'APP_NAME', 'Emverze SaaS')
            self.app_version = getattr(settings, 'APP_VERSION', '1.0.0')
            
            logger.info(f"TemplateBuilder初期化完了: {self.template_dir}")
            
        except Exception as e:
            logger.error(f"TemplateBuilder初期化エラー: {e}")
            raise EmverzeException(f"テンプレートビルダーの初期化に失敗しました: {e}")
    
    def create_base_template(self, output_path: Optional[str] = None) -> dict:
        """ベーステンプレートを作成
        
        Args:
            output_path: 出力ファイルパス（指定しない場合はデフォルト）
            
        Returns:
            統一APIレスポンス形式
        """
        try:
            template_content = """<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}{{ app_name }}{% endblock %}</title>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.0/font/bootstrap-icons.css">
    
    <!-- カスタムCSS -->
    {% block extra_css %}{% endblock %}
    
    <style>
        body {
            font-family: 'Hiragino Sans', 'ヒラギノ角ゴ ProN W3', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', '游ゴシック', Meiryo, 'メイリオ', Osaka, 'MS PGothic', arial, helvetica, sans-serif;
        }
        .sidebar {
            min-height: 100vh;
            background-color: #f8f9fa;
        }
        .main-content {
            padding: 2rem;
        }
        .navbar-brand {
            font-weight: bold;
        }
        .status-badge {
            font-size: 0.8rem;
            padding: 0.25rem 0.5rem;
        }
    </style>
</head>
<body>
    <!-- ナビゲーションバー -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container-fluid">
            <a class="navbar-brand" href="/">
                <i class="bi bi-calculator"></i>
                {{ app_name }}
            </a>
            
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto">
                    <li class="nav-item">
                        <a class="nav-link" href="/dashboard">
                            <i class="bi bi-house"></i> ダッシュボード
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/transactions">
                            <i class="bi bi-list-ul"></i> 取引データ
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/rules">
                            <i class="bi bi-gear"></i> ルール管理
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/status">
                            <i class="bi bi-info-circle"></i> システム状況
                        </a>
                    </li>
                </ul>
                
                <ul class="navbar-nav">
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                            <i class="bi bi-person-circle"></i> アカウント
                        </a>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="/settings">設定</a></li>
                            <li><a class="dropdown-item" href="/manual">マニュアル</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="/logout">ログアウト</a></li>
                        </ul>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- メインコンテンツ -->
    <div class="container-fluid">
        <div class="row">
            <main class="col-12 main-content">
                {% block content %}{% endblock %}
            </main>
        </div>
    </div>

    <!-- フッター -->
    <footer class="bg-light text-center py-3 mt-5">
        <div class="container">
            <p class="mb-0">
                &copy; {{ current_year }} {{ app_name }} v{{ app_version }}
            </p>
        </div>
    </footer>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- 統一APIクライアント -->
    <script>
        // 統一APIクライアント
        window.EmverzeAPI = {
            async request(url, options = {}) {
                try {
                    const response = await fetch(url, {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            ...options.headers
                        },
                        ...options
                    });
                    
                    const data = await response.json();
                    
                    // 統一レスポンス形式チェック
                    if (!data.status || !data.timestamp) {
                        throw new Error('不正なレスポンス形式です');
                    }
                    
                    return data;
                    
                } catch (error) {
                    console.error('API Error:', error);
                    return {
                        status: 'error',
                        message: error.message || 'APIエラーが発生しました',
                        data: {},
                        timestamp: new Date().toISOString()
                    };
                }
            },
            
            async get(url) {
                return this.request(url, { method: 'GET' });
            },
            
            async post(url, data) {
                return this.request(url, {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
            },
            
            async put(url, data) {
                return this.request(url, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
            },
            
            async delete(url) {
                return this.request(url, { method: 'DELETE' });
            }
        };
        
        // 統一通知システム
        window.EmverzeNotify = {
            show(message, type = 'info') {
                const alertDiv = document.createElement('div');
                alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
                alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
                alertDiv.innerHTML = `
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                `;
                
                document.body.appendChild(alertDiv);
                
                // 5秒後に自動削除
                setTimeout(() => {
                    if (alertDiv.parentElement) {
                        alertDiv.remove();
                    }
                }, 5000);
            },
            
            success(message) {
                this.show(message, 'success');
            },
            
            error(message) {
                this.show(message, 'danger');
            },
            
            warning(message) {
                this.show(message, 'warning');
            },
            
            info(message) {
                this.show(message, 'info');
            }
        };
    </script>
    
    {% block extra_js %}{% endblock %}
</body>
</html>"""
            
            # 出力パスの設定
            if not output_path:
                output_path = self.template_dir / "base.html"
            else:
                output_path = Path(output_path)
            
            # テンプレートファイルを作成
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(template_content)
            
            logger.info(f"ベーステンプレート作成完了: {output_path}")
            
            return create_api_response(
                "success",
                "ベーステンプレートを正常に作成しました",
                {"file_path": str(output_path), "template_type": "base"}
            )
            
        except Exception as e:
            logger.error(f"ベーステンプレート作成エラー: {e}")
            return create_api_response(
                "error",
                f"ベーステンプレートの作成に失敗しました: {e}",
                {"error_type": "template_creation_error"}
            )
    
    def create_dashboard_template(self, output_path: Optional[str] = None) -> dict:
        """ダッシュボードテンプレートを作成
        
        Args:
            output_path: 出力ファイルパス（指定しない場合はデフォルト）
            
        Returns:
            統一APIレスポンス形式
        """
        try:
            template_content = """{% extends "base.html" %}

{% block title %}ダッシュボード - {{ app_name }}{% endblock %}

{% block extra_css %}
<style>
    .stats-card {
        transition: all 0.3s ease;
        height: 100%;
    }
    .stats-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
    .quick-stat {
        text-align: center;
        padding: 1rem;
        border-radius: 0.5rem;
    }
    .quick-stat-value {
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
    }
    .quick-stat-label {
        font-size: 0.9rem;
        color: #6c757d;
    }
</style>
{% endblock %}

{% block content %}
<div class="d-flex justify-content-between align-items-center mb-4">
    <h1>ダッシュボード</h1>
    <div>
        <button class="btn btn-outline-primary me-2" onclick="refreshDashboard()">
            <i class="bi bi-arrow-repeat"></i> 更新
        </button>
        <button class="btn btn-primary" onclick="runSync()">
            <i class="bi bi-cloud-upload"></i> 同期実行
        </button>
    </div>
</div>

<!-- クイックステータス -->
<div class="row mb-4">
    <div class="col-md-3">
        <div class="quick-stat bg-light">
            <div class="quick-stat-value" id="total-transactions">-</div>
            <div class="quick-stat-label">取引データ総数</div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="quick-stat bg-light">
            <div class="quick-stat-value" id="pending-transactions">-</div>
            <div class="quick-stat-label">未処理データ</div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="quick-stat bg-light">
            <div class="quick-stat-value" id="active-rules">-</div>
            <div class="quick-stat-label">アクティブルール</div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="quick-stat bg-light">
            <div class="quick-stat-value" id="success-rate">-</div>
            <div class="quick-stat-label">処理成功率</div>
        </div>
    </div>
</div>

<!-- チャートエリア -->
<div class="row mb-4">
    <div class="col-md-8">
        <div class="card">
            <div class="card-header">
                <h5>処理状況推移</h5>
            </div>
            <div class="card-body">
                <canvas id="processingChart" height="300"></canvas>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card">
            <div class="card-header">
                <h5>システム状況</h5>
            </div>
            <div class="card-body">
                <div id="system-status">読み込み中...</div>
            </div>
        </div>
    </div>
</div>

<!-- 最近の活動 -->
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5>最近の活動</h5>
            </div>
            <div class="card-body">
                <div id="recent-activities">読み込み中...</div>
            </div>
        </div>
    </div>
</div>
{% endblock %}

{% block extra_js %}
<script>
// ダッシュボード統一機能
window.DashboardController = {
    async init() {
        await this.loadStats();
        await this.loadSystemStatus();
        await this.loadRecentActivities();
        this.initChart();
    },
    
    async loadStats() {
        try {
            const response = await EmverzeAPI.get('/api/dashboard/stats');
            
            if (response.status === 'success') {
                const stats = response.data;
                document.getElementById('total-transactions').textContent = stats.total_transactions || 0;
                document.getElementById('pending-transactions').textContent = stats.pending_transactions || 0;
                document.getElementById('active-rules').textContent = stats.active_rules || 0;
                document.getElementById('success-rate').textContent = (stats.success_rate || 0) + '%';
            } else {
                EmverzeNotify.error('統計データの読み込みに失敗しました');
            }
        } catch (error) {
            EmverzeNotify.error('統計データの読み込み中にエラーが発生しました');
        }
    },
    
    async loadSystemStatus() {
        try {
            const response = await EmverzeAPI.get('/api/system/status');
            
            if (response.status === 'success') {
                const status = response.data;
                const statusHtml = `
                    <div class="mb-2">
                        <span class="badge bg-${status.database === 'connected' ? 'success' : 'danger'}">
                            データベース: ${status.database}
                        </span>
                    </div>
                    <div class="mb-2">
                        <span class="badge bg-${status.ai_engine === 'running' ? 'success' : 'warning'}">
                            AI Engine: ${status.ai_engine}
                        </span>
                    </div>
                    <div class="mb-2">
                        <span class="badge bg-${status.mf_cloud === 'connected' ? 'success' : 'danger'}">
                            MF Cloud: ${status.mf_cloud}
                        </span>
                    </div>
                `;
                document.getElementById('system-status').innerHTML = statusHtml;
            }
        } catch (error) {
            document.getElementById('system-status').innerHTML = '<span class="text-danger">ステータス取得エラー</span>';
        }
    },
    
    async loadRecentActivities() {
        try {
            const response = await EmverzeAPI.get('/api/activities/recent');
            
            if (response.status === 'success') {
                const activities = response.data.activities || [];
                let activitiesHtml = '';
                
                if (activities.length === 0) {
                    activitiesHtml = '<p class="text-muted">最近の活動はありません</p>';
                } else {
                    activities.forEach(activity => {
                        activitiesHtml += `
                            <div class="mb-2 p-2 border-start border-primary border-3">
                                <small class="text-muted">${activity.timestamp}</small><br>
                                <strong>${activity.description}</strong>
                            </div>
                        `;
                    });
                }
                
                document.getElementById('recent-activities').innerHTML = activitiesHtml;
            }
        } catch (error) {
            document.getElementById('recent-activities').innerHTML = '<span class="text-danger">活動履歴取得エラー</span>';
        }
    },
    
    initChart() {
        // Chart.js実装予定
        console.log('Chart initialization placeholder');
    }
};

// 統一関数
async function refreshDashboard() {
    EmverzeNotify.info('ダッシュボードを更新中...');
    await DashboardController.init();
    EmverzeNotify.success('ダッシュボードを更新しました');
}

async function runSync() {
    try {
        EmverzeNotify.info('同期処理を開始中...');
        const response = await EmverzeAPI.post('/api/sync/run', {});
        
        if (response.status === 'success') {
            EmverzeNotify.success('同期処理が完了しました');
            await refreshDashboard();
        } else {
            EmverzeNotify.error(response.message || '同期処理に失敗しました');
        }
    } catch (error) {
        EmverzeNotify.error('同期処理中にエラーが発生しました');
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    DashboardController.init();
});
</script>
{% endblock %}
"""
            
            # 出力パスの設定
            if not output_path:
                output_path = self.template_dir / "dashboard.html"
            else:
                output_path = Path(output_path)
            
            # テンプレートファイルを作成
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(template_content)
            
            logger.info(f"ダッシュボードテンプレート作成完了: {output_path}")
            
            return create_api_response(
                "success",
                "ダッシュボードテンプレートを正常に作成しました",
                {"file_path": str(output_path), "template_type": "dashboard"}
            )
            
        except Exception as e:
            logger.error(f"ダッシュボードテンプレート作成エラー: {e}")
            return create_api_response(
                "error",
                f"ダッシュボードテンプレートの作成に失敗しました: {e}",
                {"error_type": "template_creation_error"}
            )
    
    def render_template(self, template_name: str, **context) -> dict:
        """テンプレートをレンダリング（統一APIレスポンス対応）
        
        Args:
            template_name: テンプレート名
            **context: テンプレートコンテキスト
            
        Returns:
            統一APIレスポンス形式
        """
        try:
            # 現在の年を追加（フッター用）
            context["current_year"] = datetime.now().year
            
            # アプリケーション設定を追加
            context["app_name"] = self.app_name
            context["app_version"] = self.app_version
            
            template = self.env.get_template(template_name)
            rendered_content = template.render(**context)
            
            logger.info(f"テンプレートレンダリング完了: {template_name}")
            
            return create_api_response(
                "success",
                "テンプレートを正常にレンダリングしました",
                {
                    "template_name": template_name,
                    "content": rendered_content,
                    "context_keys": list(context.keys())
                }
            )
            
        except Exception as e:
            logger.error(f"テンプレートレンダリングエラー [{template_name}]: {e}")
            return create_api_response(
                "error",
                f"テンプレート '{template_name}' のレンダリングに失敗しました: {e}",
                {
                    "template_name": template_name,
                    "error_type": "template_render_error"
                }
            )
    
    def create_all_templates(self, output_dir: Optional[str] = None) -> dict:
        """すべてのテンプレートを作成（統一APIレスポンス対応）
        
        Args:
            output_dir: 出力ディレクトリパス（指定しない場合はデフォルト）
            
        Returns:
            統一APIレスポンス形式
        """
        try:
            templates = {}
            errors = []
            
            # 出力ディレクトリの設定
            if output_dir:
                output_dir_path = Path(output_dir)
                if not output_dir_path.exists():
                    output_dir_path.mkdir(parents=True, exist_ok=True)
            else:
                output_dir_path = self.template_dir
            
            # 各テンプレートを作成
            template_methods = [
                ("base.html", self.create_base_template),
                ("dashboard.html", self.create_dashboard_template)
            ]
            
            for template_name, method in template_methods:
                try:
                    result = method(output_dir_path / template_name)
                    if result["status"] == "success":
                        templates[template_name] = result["data"]["file_path"]
                    else:
                        errors.append(f"{template_name}: {result['message']}")
                except Exception as e:
                    errors.append(f"{template_name}: {str(e)}")
            
            if errors:
                logger.warning(f"一部テンプレート作成でエラー: {errors}")
                return create_api_response(
                    "error",
                    f"一部テンプレートの作成に失敗しました",
                    {
                        "created_templates": templates,
                        "errors": errors,
                        "success_count": len(templates),
                        "error_count": len(errors)
                    }
                )
            else:
                logger.info(f"全テンプレート作成完了: {len(templates)}件")
                return create_api_response(
                    "success",
                    f"全テンプレートを正常に作成しました",
                    {
                        "created_templates": templates,
                        "template_count": len(templates),
                        "output_directory": str(output_dir_path)
                    }
                )
                
        except Exception as e:
            logger.error(f"全テンプレート作成エラー: {e}")
            return create_api_response(
                "error",
                f"テンプレート作成処理に失敗しました: {e}",
                {"error_type": "bulk_template_creation_error"}
            )


# 統一API関数（後方互換性）
def create_template_response(success: bool, message: str, data: dict = None) -> dict:
    """後方互換性のためのレスポンス作成関数
    
    Args:
        success: 成功フラグ
        message: メッセージ
        data: データ
        
    Returns:
        統一APIレスポンス形式
    """
    status = "success" if success else "error"
    return create_api_response(status, message, data)


if __name__ == "__main__":
    # テスト実行
    try:
        builder = TemplateBuilder()
        result = builder.create_all_templates()
        
        if result["status"] == "success":
            print("✅ テンプレート作成成功:")
            for template_name, file_path in result["data"]["created_templates"].items():
                print(f"  - {template_name}: {file_path}")
        else:
            print("❌ テンプレート作成失敗:")
            print(f"  エラー: {result['message']}")
            
    except Exception as e:
        print(f"❌ 実行エラー: {e}")
