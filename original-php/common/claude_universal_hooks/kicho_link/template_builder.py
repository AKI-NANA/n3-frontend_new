#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
template_builder.py - HTMLテンプレート生成ユーティリティ

このモジュールは、記帳自動化ツールのUIテンプレートを生成するユーティリティを提供します。
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

from jinja2 import Environment, FileSystemLoader, select_autoescape

from utils.logger import setup_logger
from utils.config import settings

# ロガー設定
logger = setup_logger()

class TemplateBuilder:
    """HTMLテンプレート生成クラス"""
    
    def __init__(self, template_dir: Optional[str] = None):
        """初期化
        
        Args:
            template_dir: テンプレートディレクトリパス（指定しない場合はデフォルト）
        """
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
        self.app_name = settings.APP_NAME
        self.app_version = settings.APP_VERSION
    
    def create_base_template(self, output_path: Optional[str] = None) -> str:
        """ベーステンプレートを作成
        
        Args:
            output_path: 出力ファイルパス（指定しない場合はデフォルト）
            
        Returns:
            作成したファイルパス
        """
        template_content = """<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}{{ app_name }}{% endblock %}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="{{ url_for('static', path='/css/styles.css') }}">
    {% block extra_css %}{% endblock %}
</head>
<body>
    <header class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container">
            <a class="navbar-brand" href="/">{{ app_name }}</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav">
                    <li class="nav-item">
                        <a class="nav-link {% if request.url.path == '/dashboard' %}active{% endif %}" href="/dashboard">ダッシュボード</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link {% if request.url.path == '/rules' %}active{% endif %}" href="/rules">ルール管理</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link {% if request.url.path == '/status' %}active{% endif %}" href="/status">ステータス</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link {% if request.url.path == '/manual' %}active{% endif %}" href="/manual">マニュアル</a>
                    </li>
                </ul>
                <ul class="navbar-nav ms-auto">
                    {% if user %}
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown">
                            {{ user.username }}
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="/logout">ログアウト</a></li>
                        </ul>
                    </li>
                    {% else %}
                    <li class="nav-item">
                        <a class="nav-link" href="/login">ログイン</a>
                    </li>
                    {% endif %}
                </ul>
            </div>
        </div>
    </header>

    <main class="container my-4">
        {% if messages %}
            {% for message in messages %}
                <div class="alert alert-{{ message.type }} alert-dismissible fade show">
                    {{ message.text }}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            {% endfor %}
        {% endif %}
        
        {% block content %}{% endblock %}
    </main>

    <footer class="footer mt-auto py-3 bg-light">
        <div class="container text-center">
            <span class="text-muted">{{ app_name }} - バージョン {{ app_version }} | &copy; {{ current_year }}</span>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="{{ url_for('static', path='/js/main.js') }}"></script>
    {% block extra_js %}{% endblock %}
</body>
</html>
"""
        
        # 出力パスの設定
        if not output_path:
            output_path = self.template_dir / "base.html"
        else:
            output_path = Path(output_path)
        
        # テンプレートファイルを作成
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(template_content)
        
        logger.info(f"ベーステンプレートを作成しました: {output_path}")
        
        return str(output_path)
    
    def create_login_template(self, output_path: Optional[str] = None) -> str:
        """ログインテンプレートを作成
        
        Args:
            output_path: 出力ファイルパス（指定しない場合はデフォルト）
            
        Returns:
            作成したファイルパス
        """
        template_content = """{% extends "base.html" %}

{% block title %}ログイン - {{ app_name }}{% endblock %}

{% block content %}
<div class="row justify-content-center">
    <div class="col-md-6">
        <div class="card">
            <div class="card-header bg-primary text-white">
                <h4 class="mb-0">ログイン</h4>
            </div>
            <div class="card-body">
                {% if error %}
                <div class="alert alert-danger">
                    {{ error }}
                </div>
                {% endif %}
                
                <form method="post" action="/login">
                    <div class="mb-3">
                        <label for="username" class="