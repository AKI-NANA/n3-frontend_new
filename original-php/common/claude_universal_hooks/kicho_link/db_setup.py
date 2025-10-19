#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
db_setup.py - データベース接続と初期化
"""

import asyncio
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from utils.config import settings
from utils.logger import setup_logger

# ロガー設定
logger = setup_logger()

# SQLite URL変換（非同期対応）
if settings.DATABASE_URL.startswith('sqlite'):
    db_url = settings.DATABASE_URL.replace('sqlite', 'sqlite+aiosqlite', 1)
else:
    db_url = settings.DATABASE_URL

# 非同期エンジン作成
engine = create_async_engine(
    db_url,
    echo=settings.DEBUG,
    future=True
)

# 非同期セッションファクトリー作成
async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# デクラレーティブベースクラス（モデル定義用）
Base = declarative_base()

async def init_db() -> None:
    """データベースの初期化

    テーブルが存在しない場合は作成します
    """
    async with engine.begin() as conn:
        # テーブル作成
        await conn.run_sync(Base.metadata.create_all)
        logger.info("データベーステーブル作成完了")

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """非同期セッションを取得するジェネレータ

    この関数は依存性注入で使用され、リクエストごとに新しいセッションを提供します。
    
    Yields:
        AsyncSession: SQLAlchemy非同期セッションオブジェクト
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# メイン実行部分 (モジュールとして実行された場合のテスト用)
if __name__ == "__main__":
    # 非同期実行用のイベントループ
    loop = asyncio.get_event_loop()
    try:
        # データベース初期化
        logger.info("データベース初期化を実行します...")
        loop.run_until_complete(init_db())
        logger.info("データベース初期化が完了しました")
    except Exception as e:
        logger.error(f"データベース初期化エラー: {e}")
