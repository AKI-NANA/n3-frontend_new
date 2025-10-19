#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
rule_api.py - 仕訳ルール管理のAPIエンドポイント
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from database.db_setup import get_session
from database.repositories import get_rule_repository, get_activity_log_repository
from database.models import Rule
from utils.security import get_current_user, User
from utils.logger import setup_logger

# ロガー設定
logger = setup_logger()

# APIルーター
router = APIRouter()

# リクエスト/レスポンスモデル
class RuleBase(BaseModel):
    """ルール基本モデル"""
    keyword: str = Field(..., description="検索キーワード")
    debit: str = Field(..., description="借方勘定科目")
    credit: str = Field(..., description="貸方勘定科目")
    description: Optional[str] = Field(None, description="ルール説明")
    period_start: Optional[datetime] = Field(None, description="適用開始日")
    period_end: Optional[datetime] = Field(None, description="適用終了日")
    is_active: bool = Field(True, description="有効フラグ")
    priority: int = Field(0, description="優先度（大きいほど優先）")

class RuleCreate(RuleBase):
    """ルール作成モデル"""
    pass

class RuleUpdate(BaseModel):
    """ルール更新モデル"""
    keyword: Optional[str] = Field(None, description="検索キーワード")
    debit: Optional[str] = Field(None, description="借方勘定科目")
    credit: Optional[str] = Field(None, description="貸方勘定科目")
    description: Optional[str] = Field(None, description="ルール説明")
    period_start: Optional[datetime] = Field(None, description="適用開始日")
    period_end: Optional[datetime] = Field(None, description="適用終了日")
    is_active: Optional[bool] = Field(None, description="有効フラグ")
    priority: Optional[int] = Field(None, description="優先度（大きいほど優先）")

class RuleResponse(RuleBase):
    """ルールレスポンスモデル"""
    id: str = Field(..., description="ルールID")
    hits: int = Field(0, description="マッチ数")
    creator: Optional[str] = Field(None, description="作成者")
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime = Field(..., description="更新日時")
    
    class Config:
        orm_mode = True

# エンドポイント: 全ルール取得
@router.get("/", response_model=List[RuleResponse])
async def get_rules(
    keyword: Optional[str] = Query(None, description="キーワードでフィルタリング"),
    active_only: bool = Query(True, description="有効なルールのみ"),
    skip: int = Query(0, description="スキップ件数", ge=0),
    limit: int = Query(100, description="取得件数", ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """ルール一覧を取得
    
    Args:
        keyword: フィルター用キーワード
        active_only: 有効なルールのみ取得するフラグ
        skip: スキップ件数
        limit: 取得件数
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        ルール一覧
    """
    rule_repo = get_rule_repository(session)
    
    # キーワードでフィルタリング
    if keyword:
        rules = await rule_repo.find_by_keyword(keyword, active_only)
    else:
        # 全件取得（アクティブフラグでフィルタリング可能）
        all_rules = await rule_repo.get_all()
        rules = [rule for rule in all_rules if not active_only or rule.is_active]
    
    # ログ記録
    activity_repo = get_activity_log_repository(session)
    await activity_repo.log_activity(
        activity_type="rule_list",
        description=f"ルール一覧を取得（{len(rules)}件）",
        user=current_user.username,
        data={"keyword": keyword, "active_only": active_only}
    )
    
    # ページネーション適用
    return rules[skip:skip+limit]

# エンドポイント: 単一ルール取得
@router.get("/{rule_id}", response_model=RuleResponse)
async def get_rule(
    rule_id: str = Path(..., description="ルールID"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """IDによるルール取得
    
    Args:
        rule_id: ルールID
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        ルール情報
        
    Raises:
        HTTPException: ルールが見つからない場合
    """
    rule_repo = get_rule_repository(session)
    rule = await rule_repo.get_by_id(rule_id)
    
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID: {rule_id} のルールが見つかりません"
        )
    
    # ログ記録
    activity_repo = get_activity_log_repository(session)
    await activity_repo.log_activity(
        activity_type="rule_get",
        description=f"ルール取得: {rule.keyword}",
        user=current_user.username,
        data={"rule_id": rule_id}
    )
    
    return rule

# エンドポイント: ルール作成
@router.post("/", response_model=RuleResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(
    rule: RuleCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """新規ルール作成
    
    Args:
        rule: 作成するルール情報
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        作成されたルール情報
    """
    rule_repo = get_rule_repository(session)
    
    # 新規ルールデータの作成
    rule_data = rule.dict()
    rule_data.update({
        "id": str(uuid.uuid4()),
        "creator": current_user.username,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    # ルール作成
    new_rule = await rule_repo.create(rule_data)
    
    # ログ記録
    activity_repo = get_activity_log_repository(session)
    await activity_repo.log_activity(
        activity_type="rule_create",
        description=f"ルール作成: {new_rule.keyword}",
        user=current_user.username,
        data={"rule_id": new_rule.id, "rule_data": rule_data}
    )
    
    return new_rule

# エンドポイント: ルール更新
@router.put("/{rule_id}", response_model=RuleResponse)
async def update_rule(
    rule_id: str = Path(..., description="ルールID"),
    rule: RuleUpdate = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """ルール更新
    
    Args:
        rule_id: ルールID
        rule: 更新するルール情報
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        更新されたルール情報
        
    Raises:
        HTTPException: ルールが見つからない場合
    """
    rule_repo = get_rule_repository(session)
    
    # ルールが存在するか確認
    existing_rule = await rule_repo.get_by_id(rule_id)
    if not existing_rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID: {rule_id} のルールが見つかりません"
        )
    
    # 更新データの準備
    update_data = rule.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # ルール更新
    updated_rule = await rule_repo.update(rule_id, update_data)
    
    # ログ記録
    activity_repo = get_activity_log_repository(session)
    await activity_repo.log_activity(
        activity_type="rule_update",
        description=f"ルール更新: {updated_rule.keyword}",
        user=current_user.username,
        data={"rule_id": rule_id, "updates": update_data}
    )
    
    return updated_rule

# エンドポイント: ルール削除
@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: str = Path(..., description="ルールID"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """ルール削除
    
    Args:
        rule_id: ルールID
        session: データベースセッション
        current_user: 現在のユーザー
        
    Raises:
        HTTPException: ルールが見つからない場合
    """
    rule_repo = get_rule_repository(session)
    
    # ルールが存在するか確認
    existing_rule = await rule_repo.get_by_id(rule_id)
    if not existing_rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID: {rule_id} のルールが見つかりません"
        )
    
    # 削除前の情報を保存
    rule_info = {
        "keyword": existing_rule.keyword,
        "debit": existing_rule.debit,
        "credit": existing_rule.credit
    }
    
    # ルール削除
    success = await rule_repo.delete(rule_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ルールの削除に失敗しました"
        )
    
    # ログ記録
    activity_repo = get_activity_log_repository(session)
    await activity_repo.log_activity(
        activity_type="rule_delete",
        description=f"ルール削除: {rule_info['keyword']}",
        user=current_user.username,
        data={"rule_id": rule_id, "rule_info": rule_info}
    )
    
    return None

# エンドポイント: ルール有効/無効切り替え
@router.patch("/{rule_id}/toggle", response_model=RuleResponse)
async def toggle_rule_status(
    rule_id: str = Path(..., description="ルールID"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """ルールの有効/無効を切り替え
    
    Args:
        rule_id: ルールID
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        更新されたルール情報
        
    Raises:
        HTTPException: ルールが見つからない場合
    """
    rule_repo = get_rule_repository(session)
    
    # ルールが存在するか確認
    existing_rule = await rule_repo.get_by_id(rule_id)
    if not existing_rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID: {rule_id} のルールが見つかりません"
        )
    
    # 状態を反転
    new_status = not existing_rule.is_active
    
    # ルール更新
    updated_rule = await rule_repo.update(
        rule_id, 
        {"is_active": new_status, "updated_at": datetime.utcnow()}
    )
    
    # ログ記録
    activity_repo = get_activity_log_repository(session)
    await activity_repo.log_activity(
        activity_type="rule_toggle",
        description=f"ルール状態変更: {updated_rule.keyword} -> {'有効' if new_status else '無効'}",
        user=current_user.username,
        data={"rule_id": rule_id, "new_status": new_status}
    )
    
    return updated_rule

# エンドポイント: 複数ルール一括更新
@router.patch("/batch", response_model=Dict[str, Any])
async def batch_update_rules(
    updates: Dict[str, RuleUpdate],
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """複数ルールの一括更新
    
    Args:
        updates: {rule_id: update_data}形式の更新データ辞書
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        更新結果
    """
    rule_repo = get_rule_repository(session)
    
    results = {
        "success": [],
        "failed": []
    }
    
    for rule_id, update_data in updates.items():
        try:
            # ルールが存在するか確認
            existing_rule = await rule_repo.get_by_id(rule_id)
            if not existing_rule:
                results["failed"].append({"id": rule_id, "error": "ルールが見つかりません"})
                continue
            
            # 更新データの準備
            update_dict = update_data.dict(exclude_unset=True)
            update_dict["updated_at"] = datetime.utcnow()
            
            # ルール更新
            await rule_repo.update(rule_id, update_dict)
            results["success"].append(rule_id)
            
        except Exception as e:
            logger.error(f"ルール一括更新エラー: {e}")
            results["failed"].append({"id": rule_id, "error": str(e)})
    
    # ログ記録
    activity_repo = get_activity_log_repository(session)
    await activity_repo.log_activity(
        activity_type="rule_batch_update",
        description=f"ルール一括更新: 成功{len(results['success'])}件, 失敗{len(results['failed'])}件",
        user=current_user.username,
        data={
            "success_count": len(results["success"]),
            "failed_count": len(results["failed"]),
            "updates": {k: v.dict(exclude_unset=True) for k, v in updates.items()}
        }
    )
    
    return results

# エンドポイント: ルール検索
@router.post("/search", response_model=List[RuleResponse])
async def search_rules(
    description: str,
    transaction_date: datetime = None,
    active_only: bool = True,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """取引摘要とトランザクション日付に基づいて適用可能なルールを検索
    
    Args:
        description: 取引摘要
        transaction_date: 取引日付（Noneの場合は現在日時）
        active_only: 有効なルールのみ取得するフラグ
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        適用可能なルールのリスト
    """
    rule_repo = get_rule_repository(session)
    
    # 日付が指定されていない場合は現在日時を使用
    if transaction_date is None:
        transaction_date = datetime.utcnow()
    
    # 適用可能なルールを検索
    applicable_rules = await rule_repo.find_applicable_rules(
        description=description,
        date=transaction_date,
        active_only=active_only
    )
    
    # ログ記録
    activity_repo = get_activity_log_repository(session)
    await activity_repo.log_activity(
        activity_type="rule_search",
        description=f"ルール検索: \"{description}\" ({len(applicable_rules)}件ヒット)",
        user=current_user.username,
        data={
            "description": description,
            "transaction_date": transaction_date.isoformat(),
            "active_only": active_only,
            "hit_count": len(applicable_rules)
        }
    )
    
    return applicable_rules

# エンドポイント: ルール統計情報
@router.get("/stats", response_model=Dict[str, Any])
async def get_rule_stats(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """ルール統計情報を取得
    
    Args:
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        ルール統計情報
    """
    rule_repo = get_rule_repository(session)
    
    # 全ルール取得
    all_rules = await rule_repo.get_all()
    
    # 統計情報の計算
    total_rules = len(all_rules)
    active_rules = sum(1 for rule in all_rules if rule.is_active)
    inactive_rules = total_rules - active_rules
    
    # 最もヒット数の多いルールTop 5
    top_rules = sorted(all_rules, key=lambda x: x.hits, reverse=True)[:5]
    
    # 統計情報
    stats = {
        "total_rules": total_rules,
        "active_rules": active_rules,
        "inactive_rules": inactive_rules,
        "top_rules": [
            {
                "id": rule.id,
                "keyword": rule.keyword,
                "hits": rule.hits,
                "debit": rule.debit,
                "credit": rule.credit
            }
            for rule in top_rules
        ]
    }
    
    # ログ記録
    activity_repo = get_activity_log_repository(session)
    await activity_repo.log_activity(
        activity_type="rule_stats",
        description="ルール統計情報取得",
        user=current_user.username,
        data={"total_rules": total_rules}
    )
    
    return stats
