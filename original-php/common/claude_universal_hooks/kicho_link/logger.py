#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
logger.py - ロギングユーティリティ
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, Optional

from loguru import logger

# 設定をインポート (循環参照回避のため部分的にインポート)
import os
from pathlib import Path
from dotenv import load_dotenv

# .env ファイルを読み込み
env_path = Path(__file__).parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

# 環境変数から設定を読み込み
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "t")
LOG_DIR = Path(__file__).parents[1] / "data" / "logs"
LOG_FILE = LOG_DIR / "kicho_tool.log" if not DEBUG else None

def setup_logger() -> logger:
    """アプリケーション用のロガーをセットアップ"""
    
    # ロガー設定をリセット
    logger.remove()
    
    # コンソール出力設定
    logger.add(
        sys.stderr,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level=LOG_LEVEL,
        colorize=True,
    )
    
    # ファイル出力設定 (指定されている場合)
    if LOG_FILE:
        # ログディレクトリを作成
        LOG_FILE.parent.mkdir(exist_ok=True, parents=True)
        
        # ファイルロギング設定
        logger.add(
            LOG_FILE,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            level=LOG_LEVEL,
            rotation="10 MB",  # ファイルサイズが10MBを超えたらローテーション
            retention="30 days",  # ログを30日間保持
            compression="zip",  # 古いログファイルを圧縮
        )
    
    return logger

def log_to_jsonl(data: Dict[str, Any], log_file: Path) -> None:
    """JSONLファイルにログを追記する
    
    Args:
        data: 記録するデータ辞書
        log_file: ログファイルパス
    """
    # タイムスタンプを追加
    if "timestamp" not in data:
        data["timestamp"] = datetime.now().isoformat()
    
    # ディレクトリが存在しない場合は作成
    log_file.parent.mkdir(exist_ok=True, parents=True)
    
    # JSONLファイルに追記
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False) + "\n")

def read_jsonl_logs(log_file: Path, limit: Optional[int] = None) -> list:
    """JSONLファイルからログを読み込む
    
    Args:
        log_file: ログファイルパス
        limit: 取得する最大行数（Noneの場合は全行取得）
    
    Returns:
        ログのリスト
    """
    if not log_file.exists():
        return []
    
    logs = []
    with open(log_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                logs.append(json.loads(line))
                if limit and len(logs) >= limit:
                    break
    
    return logs

# メイン実行部分 (モジュールとして実行された場合のテスト用)
if __name__ == "__main__":
    # ロガーをセットアップ
    setup_logger()
    
    # テストログ出力
    logger.debug("これはデバッグメッセージです")
    logger.info("これは情報メッセージです")
    logger.warning("これは警告メッセージです")
    logger.error("これはエラーメッセージです")
    
    # JSONLログのテスト
    test_log_file = Path(__file__).parent / "test_log.jsonl"
    log_to_jsonl({"event": "test", "message": "これはテストメッセージです"}, test_log_file)
    logs = read_jsonl_logs(test_log_file)
    print(f"JSONLログ読込テスト: {logs}")
