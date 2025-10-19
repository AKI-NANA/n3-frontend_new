#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
security.py - セキュリティとユーザー認証
"""

import os
from datetime import datetime, timedelta
from typing import Dict, Optional, Union

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from utils.config import settings
from utils.logger import setup_logger

# ロガー設定
logger = setup_logger()

# パスワードハッシュ化コンテキスト
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2パスワードフロー設定
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# ユーザーモデル
class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None
    is_admin: bool = False

# トークンモデル
class Token(BaseModel):
    access_token: str
    token_type: str

# トークンデータモデル
class TokenData(BaseModel):
    username: Optional[str] = None

# テストユーザーデータ (開発用 - 本番ではDBを使用)
# 本番環境では、このようなハードコーディングされた認証情報は使用しないでください
USERS_DB = {
    "admin": {
        "username": "admin",
        "full_name": "管理者",
        "email": "admin@example.com",
        "hashed_password": pwd_context.hash("admin"),
        "disabled": False,
        "is_admin": True
    },
    "user": {
        "username": "user",
        "full_name": "一般ユーザー",
        "email": "user@example.com",
        "hashed_password": pwd_context.hash("user"),
        "disabled": False,
        "is_admin": False
    }
}

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """パスワードの検証
    
    Args:
        plain_password: 平文パスワード
        hashed_password: ハッシュ化されたパスワード
        
    Returns:
        検証結果
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """パスワードのハッシュ化
    
    Args:
        password: 平文パスワード
        
    Returns:
        ハッシュ化されたパスワード
    """
    return pwd_context.hash(password)

def get_user(username: str) -> Optional[User]:
    """ユーザー情報を取得
    
    Args:
        username: ユーザー名
        
    Returns:
        ユーザー情報
    """
    if username in USERS_DB:
        user_dict = USERS_DB[username]
        return User(**user_dict)
    return None

def authenticate_user(username: str, password: str) -> Optional[User]:
    """ユーザー認証
    
    Args:
        username: ユーザー名
        password: パスワード
        
    Returns:
        認証されたユーザー情報
    """
    user = get_user(username)
    if not user:
        return None
    if user.disabled:
        return None
    if not verify_password(password, USERS_DB[username]["hashed_password"]):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """アクセストークンを作成
    
    Args:
        data: トークンに含めるデータ
        expires_delta: 有効期限
        
    Returns:
        アクセストークン
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

async def get_current_user(request: Request) -> User:
    """現在のユーザーを取得（セッションベース）
    
    Args:
        request: リクエスト
        
    Returns:
        現在のユーザー
        
    Raises:
        HTTPException: 認証エラー
    """
    # セッションからユーザー情報を取得
    user_data = request.session.get("user")
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証されていません",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = User(**user_data)
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """現在のアクティブユーザーを取得
    
    Args:
        current_user: 現在のユーザー
        
    Returns:
        現在のアクティブユーザー
        
    Raises:
        HTTPException: 無効なユーザー
    """
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="無効なユーザーです")
    return current_user

async def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """現在の管理者ユーザーを取得
    
    Args:
        current_user: 現在のユーザー
        
    Returns:
        現在の管理者ユーザー
        
    Raises:
        HTTPException: 管理者権限がない
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    return current_user

def is_authenticated(request: Request) -> bool:
    """認証されているかチェック
    
    Args:
        request: リクエスト
        
    Returns:
        認証結果
    """
    return "user" in request.session
