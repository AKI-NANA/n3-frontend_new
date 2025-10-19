"""
app/websockets/asin_progress.py - ASIN処理進捗WebSocket配信
用途: HTMLの進捗バー（updateProgress関数）にリアルタイムデータ送信
修正対象: 新しい進捗イベント追加時、接続管理方式変更時
"""

import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect, Depends
from starlette.websockets import WebSocketState

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.dependencies import get_current_user

settings = get_settings()
logger = get_logger(__name__)

class ASINProgressManager:
    """
    ASIN処理進捗管理クラス
    
    説明: WebSocket接続管理とリアルタイム進捗配信
    主要機能: セッション管理、進捗ブロードキャスト、接続状態監視
    修正対象: 新しい進捗イベント追加時
    """
    
    def __init__(self):
        # アクティブWebSocket接続管理
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # セッション進捗データ
        self.progress_data: Dict[str, Dict[str, Any]] = {}
        # 接続メタデータ
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        
        logger.info("ASIN進捗管理システム初期化完了")
    
    async def connect(
        self, 
        websocket: WebSocket, 
        session_id: str, 
        user_id: Optional[str] = None
    ) -> bool:
        """
        WebSocket接続確立
        
        パラメータ:
            websocket: WebSocket接続
            session_id: ASINアップロードセッションID
            user_id: ユーザーID（認証済みの場合）
        戻り値: 接続成功の場合 True
        """
        try:
            await websocket.accept()
            
            # セッション別接続管理
            if session_id not in self.active_connections:
                self.active_connections[session_id] = set()
            
            self.active_connections[session_id].add(websocket)
            
            # 接続メタデータ保存
            self.connection_metadata[websocket] = {
                'session_id': session_id,
                'user_id': user_id,
                'connected_at': datetime.utcnow(),
                'last_ping': datetime.utcnow()
            }
            
            # 既存の進捗データがあれば送信
            if session_id in self.progress_data:
                await self._send_to_websocket(websocket, {
                    'type': 'progress_update',
                    'session_id': session_id,
                    **self.progress_data[session_id]
                })
            
            logger.info(f"WebSocket接続確立: セッション={session_id}, ユーザー={user_id}")
            return True
            
        except Exception as e:
            logger.error(f"WebSocket接続エラー: {str(e)}")
            return False
    
    async def disconnect(self, websocket: WebSocket) -> None:
        """
        WebSocket接続切断
        
        パラメータ:
            websocket: 切断するWebSocket接続
        """
        try:
            metadata = self.connection_metadata.get(websocket, {})
            session_id = metadata.get('session_id')
            user_id = metadata.get('user_id')
            
            # アクティブ接続から削除
            if session_id and session_id in self.active_connections:
                self.active_connections[session_id].discard(websocket)
                
                # セッションに接続がなくなった場合は削除
                if not self.active_connections[session_id]:
                    del self.active_connections[session_id]
            
            # メタデータ削除
            if websocket in self.connection_metadata:
                del self.connection_metadata[websocket]
            
            logger.info(f"WebSocket接続切断: セッション={session_id}, ユーザー={user_id}")
            
        except Exception as e:
            logger.error(f"WebSocket切断処理エラー: {str(e)}")
    
    async def update_progress(
        self, 
        session_id: str, 
        percentage: float, 
        message: str = "",
        status: str = "processing",
        additional_data: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        進捗更新とブロードキャスト
        
        パラメータ:
            session_id: セッションID
            percentage: 進捗率（0-100）
            message: 進捗メッセージ
            status: 処理状態（processing/completed/error）
            additional_data: 追加データ
        """
        try:
            # 進捗データ更新
            progress_info = {
                'percentage': min(100, max(0, percentage)),
                'message': message,
                'status': status,
                'timestamp': datetime.utcnow().isoformat(),
                **(additional_data or {})
            }
            
            self.progress_data[session_id] = progress_info
            
            # WebSocketでブロードキャスト
            await self.broadcast_to_session(session_id, {
                'type': 'progress_update',
                'session_id': session_id,
                **progress_info
            })
            
            logger.debug(f"進捗更新: セッション={session_id}, {percentage}%, {message}")
            
        except Exception as e:
            logger.error(f"進捗更新エラー: {str(e)}")
    
    async def update_processing_item(
        self,
        session_id: str,
        item_index: int,
        total_items: int,
        item_data: Dict[str, Any]
    ) -> None:
        """
        個別アイテム処理更新
        
        パラメータ:
            session_id: セッションID
            item_index: 処理中アイテムのインデックス
            total_items: 総アイテム数
            item_data: アイテム処理データ
        """
        try:
            percentage = (item_index / total_items) * 100 if total_items > 0 else 0
            
            await self.broadcast_to_session(session_id, {
                'type': 'item_progress',
                'session_id': session_id,
                'item_index': item_index,
                'total_items': total_items,
                'percentage': percentage,
                'item_data': item_data,
                'timestamp': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            logger.error(f"個別アイテム進捗更新エラー: {str(e)}")
    
    async def update_completion(
        self,
        session_id: str,
        success_count: int,
        error_count: int,
        results_summary: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        処理完了通知
        
        パラメータ:
            session_id: セッションID
            success_count: 成功件数
            error_count: エラー件数
            results_summary: 結果サマリー
        """
        try:
            await self.broadcast_to_session(session_id, {
                'type': 'processing_completed',
                'session_id': session_id,
                'status': 'completed',
                'percentage': 100,
                'message': f'処理完了: 成功 {success_count}件, エラー {error_count}件',
                'success_count': success_count,
                'error_count': error_count,
                'results_summary': results_summary or {},
                'timestamp': datetime.utcnow().isoformat()
            })
            
            logger.info(f"処理完了通知: セッション={session_id}, 成功={success_count}, エラー={error_count}")
            
        except Exception as e:
            logger.error(f"完了通知エラー: {str(e)}")
    
    async def update_error(
        self,
        session_id: str,
        error_message: str,
        error_code: Optional[str] = None,
        error_details: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        エラー通知
        
        パラメータ:
            session_id: セッションID
            error_message: エラーメッセージ
            error_code: エラーコード
            error_details: エラー詳細
        """
        try:
            await self.broadcast_to_session(session_id, {
                'type': 'processing_error',
                'session_id': session_id,
                'status': 'error',
                'message': f'エラー: {error_message}',
                'error_message': error_message,
                'error_code': error_code,
                'error_details': error_details or {},
                'timestamp': datetime.utcnow().isoformat()
            })
            
            logger.warning(f"エラー通知: セッション={session_id}, {error_message}")
            
        except Exception as e:
            logger.error(f"エラー通知送信失敗: {str(e)}")
    
    async def broadcast_to_session(
        self, 
        session_id: str, 
        message: Dict[str, Any]
    ) -> int:
        """
        セッション内全接続にブロードキャスト
        
        パラメータ:
            session_id: セッションID
            message: 送信メッセージ
        戻り値: 送信成功接続数
        """
        if session_id not in self.active_connections:
            return 0
        
        connections = self.active_connections[session_id].copy()
        success_count = 0
        failed_connections = []
        
        for websocket in connections:
            try:
                if websocket.client_state == WebSocketState.CONNECTED:
                    await self._send_to_websocket(websocket, message)
                    success_count += 1
                else:
                    failed_connections.append(websocket)
            except Exception as e:
                logger.warning(f"WebSocket送信失敗: {str(e)}")
                failed_connections.append(websocket)
        
        # 失敗した接続を削除
        for failed_ws in failed_connections:
            await self.disconnect(failed_ws)
        
        return success_count
    
    async def _send_to_websocket(
        self, 
        websocket: WebSocket, 
        message: Dict[str, Any]
    ) -> None:
        """
        個別WebSocketに送信（内部メソッド）
        
        パラメータ:
            websocket: WebSocket接続
            message: 送信メッセージ
        """
        try:
            await websocket.send_text(json.dumps(message, ensure_ascii=False))
        except Exception as e:
            logger.error(f"WebSocket個別送信エラー: {str(e)}")
            raise
    
    async def handle_ping(self, websocket: WebSocket) -> None:
        """
        Pingハンドリング（接続維持）
        
        パラメータ:
            websocket: WebSocket接続
        """
        try:
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]['last_ping'] = datetime.utcnow()
            
            await self._send_to_websocket(websocket, {
                'type': 'pong',
                'timestamp': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Ping処理エラー: {str(e)}")
    
    def get_session_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        セッション状態取得
        
        パラメータ:
            session_id: セッションID
        戻り値: セッション状態情報
        """
        return {
            'session_id': session_id,
            'active_connections': len(self.active_connections.get(session_id, [])),
            'progress_data': self.progress_data.get(session_id),
            'last_updated': self.progress_data.get(session_id, {}).get('timestamp')
        }
    
    def cleanup_session(self, session_id: str) -> None:
        """
        セッションクリーンアップ
        
        パラメータ:
            session_id: セッションID
        """
        try:
            # 進捗データ削除
            if session_id in self.progress_data:
                del self.progress_data[session_id]
            
            # アクティブ接続削除
            if session_id in self.active_connections:
                connections = self.active_connections[session_id].copy()
                for ws in connections:
                    asyncio.create_task(self.disconnect(ws))
                del self.active_connections[session_id]
            
            logger.info(f"セッションクリーンアップ完了: {session_id}")
            
        except Exception as e:
            logger.error(f"セッションクリーンアップエラー: {str(e)}")

# グローバル進捗管理インスタンス
progress_manager = ASINProgressManager()

# === WebSocketエンドポイント ===

async def websocket_asin_progress(
    websocket: WebSocket,
    session_id: str,
    token: Optional[str] = None
):
    """
    ASIN処理進捗WebSocketエンドポイント
    
    URL: /ws/asin-progress/{session_id}
    パラメータ: 
        session_id: ASINアップロードセッションID
        token: 認証トークン（オプション）
    """
    user_id = None
    
    try:
        # 認証処理（トークンがある場合）
        if token:
            try:
                # トークン検証ロジック（実装必要）
                # user = await verify_websocket_token(token)
                # user_id = str(user.id)
                pass
            except Exception as e:
                logger.warning(f"WebSocket認証失敗: {str(e)}")
                await websocket.close(code=4001, reason="Authentication failed")
                return
        
        # 接続確立
        connected = await progress_manager.connect(websocket, session_id, user_id)
        if not connected:
            await websocket.close(code=4000, reason="Connection failed")
            return
        
        logger.info(f"WebSocket接続開始: セッション={session_id}")
        
        # メッセージループ
        while True:
            try:
                # メッセージ受信（pingなど）
                message_text = await websocket.receive_text()
                message = json.loads(message_text)
                
                # メッセージタイプ別処理
                message_type = message.get('type')
                
                if message_type == 'ping':
                    await progress_manager.handle_ping(websocket)
                elif message_type == 'get_status':
                    status = progress_manager.get_session_status(session_id)
                    await progress_manager._send_to_websocket(websocket, {
                        'type': 'status_response',
                        **status
                    })
                else:
                    logger.warning(f"未知のメッセージタイプ: {message_type}")
                
            except WebSocketDisconnect:
                logger.info(f"WebSocket切断: セッション={session_id}")
                break
            except json.JSONDecodeError:
                logger.warning("無効なJSONメッセージを受信")
                continue
            except Exception as e:
                logger.error(f"WebSocketメッセージ処理エラー: {str(e)}")
                break
    
    except Exception as e:
        logger.error(f"WebSocketエラー: {str(e)}")
    
    finally:
        # 切断処理
        await progress_manager.disconnect(websocket)

# === 便利関数 ===

async def notify_progress(
    session_id: str,
    percentage: float,
    message: str = "",
    **kwargs
) -> None:
    """
    進捗通知便利関数
    
    使用方法:
        await notify_progress("session123", 50, "処理中...")
    """
    await progress_manager.update_progress(
        session_id, percentage, message, **kwargs
    )

async def notify_completion(
    session_id: str,
    success_count: int,
    error_count: int,
    **kwargs
) -> None:
    """
    完了通知便利関数
    
    使用方法:
        await notify_completion("session123", 10, 2)
    """
    await progress_manager.update_completion(
        session_id, success_count, error_count, **kwargs
    )

async def notify_error(
    session_id: str,
    error_message: str,
    **kwargs
) -> None:
    """
    エラー通知便利関数
    
    使用方法:
        await notify_error("session123", "処理に失敗しました")
    """
    await progress_manager.update_error(
        session_id, error_message, **kwargs
    )

# === 使用例 ===

"""
# ASINアップロード処理内での使用例:

async def process_asin_upload(session_id: str, asin_list: List[str]):
    try:
        total_items = len(asin_list)
        
        # 開始通知
        await notify_progress(session_id, 0, "処理開始", status="processing")
        
        success_count = 0
        error_count = 0
        
        for i, asin in enumerate(asin_list):
            try:
                # ASIN処理
                result = await process_single_asin(asin)
                success_count += 1
                
                # 個別アイテム進捗
                await progress_manager.update_processing_item(
                    session_id, i + 1, total_items, {
                        'asin': asin,
                        'status': 'success',
                        'product_name': result.get('name')
                    }
                )
                
            except Exception as e:
                error_count += 1
                await progress_manager.update_processing_item(
                    session_id, i + 1, total_items, {
                        'asin': asin,
                        'status': 'error',
                        'error_message': str(e)
                    }
                )
            
            # 全体進捗更新
            percentage = ((i + 1) / total_items) * 100
            await notify_progress(
                session_id, percentage, 
                f"処理中 {i + 1}/{total_items}"
            )
        
        # 完了通知
        await notify_completion(session_id, success_count, error_count)
        
    except Exception as e:
        await notify_error(session_id, f"処理エラー: {str(e)}")
"""