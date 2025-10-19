#!/usr/bin/env python3
"""
NAGANO-3 リアルタイムデータ同期サービス

機能: eBay・在庫・価格データのリアルタイム同期・WebSocket通信
アーキテクチャ: orchestrator層・Python非同期処理
技術: asyncio・WebSocket・Redis・MySQL連携
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import websockets
import redis
import mysql.connector
from mysql.connector import Error
import aiohttp
import yaml
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import os
import signal
import sys

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/nagano3/sync_service.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('N3_RealTimeSync')

class SyncEventType(Enum):
    """同期イベントタイプ"""
    ORDER_CREATED = "order_created"
    ORDER_UPDATED = "order_updated" 
    PAYMENT_RECEIVED = "payment_received"
    STOCK_CHANGED = "stock_changed"
    PRICE_UPDATED = "price_updated"
    SHIPMENT_CREATED = "shipment_created"
    TRACKING_UPDATED = "tracking_updated"

@dataclass
class SyncEvent:
    """同期イベントデータ"""
    event_type: SyncEventType
    entity_id: str
    entity_type: str
    data: Dict[str, Any]
    timestamp: float
    source: str
    priority: int = 1  # 1=高, 2=中, 3=低

class RealTimeSyncService:
    """リアルタイムデータ同期サービス"""
    
    def __init__(self, config_path: str = 'config/sync_service.yaml'):
        self.config = self._load_config(config_path)
        self.redis_client = None
        self.mysql_connection = None
        self.websocket_clients: Dict[str, websockets.WebSocketServerProtocol] = {}
        self.sync_tasks = []
        self.running = False
        
        # 同期統計
        self.sync_stats = {
            'events_processed': 0,
            'errors_occurred': 0,
            'last_sync_time': None,
            'active_connections': 0
        }
        
    def _load_config(self, config_path: str) -> Dict:
        """設定ファイル読み込み"""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            logger.warning(f"設定ファイルが見つかりません: {config_path}")
            return self._create_default_config()
    
    def _create_default_config(self) -> Dict:
        """デフォルト設定作成"""
        return {
            'redis': {
                'host': 'localhost',
                'port': 6379,
                'db': 0,
                'password': None
            },
            'mysql': {
                'host': 'localhost',
                'port': 3306,
                'database': 'nagano3_sync',
                'user': 'root',
                'password': ''
            },
            'websocket': {
                'host': '0.0.0.0',
                'port': 8765,
                'max_connections': 100
            },
            'sync_intervals': {
                'ebay_orders': 30,      # 30秒
                'stock_levels': 60,     # 1分
                'price_updates': 300,   # 5分
                'tracking_info': 180    # 3分
            },
            'apis': {
                'ebay_webhook_url': 'http://localhost/webhooks/ebay',
                'internal_api_base': 'http://localhost/api/v1'
            }
        }
    
    async def start(self):
        """サービス開始"""
        logger.info("🚀 NAGANO-3 リアルタイム同期サービス開始")
        
        try:
            # Redis接続
            await self._connect_redis()
            
            # MySQL接続
            await self._connect_mysql()
            
            # WebSocketサーバー開始
            await self._start_websocket_server()
            
            # 同期タスク開始
            await self._start_sync_tasks()
            
            self.running = True
            logger.info("✅ 同期サービス開始完了")
            
            # シグナルハンドラー設定
            self._setup_signal_handlers()
            
            # メインループ
            await self._main_loop()
            
        except Exception as e:
            logger.error(f"❌ サービス開始エラー: {e}")
            await self.stop()
            raise
    
    async def stop(self):
        """サービス停止"""
        logger.info("🛑 同期サービス停止開始")
        
        self.running = False
        
        # 同期タスク停止
        for task in self.sync_tasks:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        # WebSocket接続クローズ
        for client_id, websocket in self.websocket_clients.items():
            try:
                await websocket.close()
            except Exception as e:
                logger.warning(f"WebSocket切断エラー: {e}")
        
        # 接続クローズ
        if self.redis_client:
            self.redis_client.close()
        
        if self.mysql_connection:
            self.mysql_connection.close()
        
        logger.info("✅ 同期サービス停止完了")
    
    async def _connect_redis(self):
        """Redis接続"""
        try:
            self.redis_client = redis.Redis(
                host=self.config['redis']['host'],
                port=self.config['redis']['port'],
                db=self.config['redis']['db'],
                password=self.config['redis']['password'],
                decode_responses=True
            )
            
            # 接続テスト
            self.redis_client.ping()
            logger.info("✅ Redis接続成功")
            
        except Exception as e:
            logger.error(f"❌ Redis接続エラー: {e}")
            raise
    
    async def _connect_mysql(self):
        """MySQL接続"""
        try:
            self.mysql_connection = mysql.connector.connect(
                host=self.config['mysql']['host'],
                port=self.config['mysql']['port'],
                database=self.config['mysql']['database'],
                user=self.config['mysql']['user'],
                password=self.config['mysql']['password'],
                autocommit=True
            )
            
            logger.info("✅ MySQL接続成功")
            
        except Error as e:
            logger.error(f"❌ MySQL接続エラー: {e}")
            raise
    
    async def _start_websocket_server(self):
        """WebSocketサーバー開始"""
        async def handle_client(websocket, path):
            """WebSocketクライアント処理"""
            client_id = self._generate_client_id()
            self.websocket_clients[client_id] = websocket
            self.sync_stats['active_connections'] += 1
            
            logger.info(f"📡 新規WebSocket接続: {client_id}")
            
            try:
                # 初期データ送信
                await self._send_initial_data(websocket, client_id)
                
                # メッセージ受信ループ
                async for message in websocket:
                    await self._handle_websocket_message(client_id, message)
                    
            except websockets.exceptions.ConnectionClosed:
                logger.info(f"📡 WebSocket切断: {client_id}")
            except Exception as e:
                logger.error(f"❌ WebSocket処理エラー: {e}")
            finally:
                if client_id in self.websocket_clients:
                    del self.websocket_clients[client_id]
                self.sync_stats['active_connections'] -= 1
        
        # WebSocketサーバー起動
        start_server = websockets.serve(
            handle_client,
            self.config['websocket']['host'],
            self.config['websocket']['port']
        )
        
        await start_server
        logger.info(f"🌐 WebSocketサーバー開始: ws://{self.config['websocket']['host']}:{self.config['websocket']['port']}")
    
    async def _start_sync_tasks(self):
        """同期タスク開始"""
        # eBay受注同期
        self.sync_tasks.append(
            asyncio.create_task(self._ebay_order_sync_task())
        )
        
        # 在庫レベル同期
        self.sync_tasks.append(
            asyncio.create_task(self._stock_level_sync_task())
        )
        
        # 価格更新同期
        self.sync_tasks.append(
            asyncio.create_task(self._price_update_sync_task())
        )
        
        # 配送追跡同期
        self.sync_tasks.append(
            asyncio.create_task(self._tracking_sync_task())
        )
        
        # Redis同期イベント監視
        self.sync_tasks.append(
            asyncio.create_task(self._redis_event_monitor())
        )
        
        logger.info(f"⚙️ 同期タスク開始: {len(self.sync_tasks)}個")
    
    async def _main_loop(self):
        """メインループ"""
        while self.running:
            try:
                # ヘルスチェック
                await self._health_check()
                
                # 統計更新
                await self._update_stats()
                
                # 1秒待機
                await asyncio.sleep(1)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ メインループエラー: {e}")
                await asyncio.sleep(5)  # エラー時は少し長めに待機
    
    async def _ebay_order_sync_task(self):
        """eBay受注同期タスク"""
        logger.info("🔄 eBay受注同期タスク開始")
        
        while self.running:
            try:
                # eBay APIから新規・更新受注取得
                orders = await self._fetch_ebay_orders()
                
                for order in orders:
                    await self._process_order_event(order)
                
                # 次の同期まで待機
                await asyncio.sleep(self.config['sync_intervals']['ebay_orders'])
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ eBay受注同期エラー: {e}")
                self.sync_stats['errors_occurred'] += 1
                await asyncio.sleep(10)
    
    async def _stock_level_sync_task(self):
        """在庫レベル同期タスク"""
        logger.info("📦 在庫レベル同期タスク開始")
        
        while self.running:
            try:
                # 在庫変更チェック
                stock_changes = await self._check_stock_changes()
                
                for change in stock_changes:
                    await self._process_stock_event(change)
                
                await asyncio.sleep(self.config['sync_intervals']['stock_levels'])
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ 在庫同期エラー: {e}")
                self.sync_stats['errors_occurred'] += 1
                await asyncio.sleep(10)
    
    async def _price_update_sync_task(self):
        """価格更新同期タスク"""
        logger.info("💰 価格更新同期タスク開始")
        
        while self.running:
            try:
                # 価格変更チェック
                price_updates = await self._check_price_updates()
                
                for update in price_updates:
                    await self._process_price_event(update)
                
                await asyncio.sleep(self.config['sync_intervals']['price_updates'])
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ 価格同期エラー: {e}")
                self.sync_stats['errors_occurred'] += 1
                await asyncio.sleep(30)
    
    async def _tracking_sync_task(self):
        """配送追跡同期タスク"""
        logger.info("🚛 配送追跡同期タスク開始")
        
        while self.running:
            try:
                # 追跡情報更新チェック
                tracking_updates = await self._check_tracking_updates()
                
                for update in tracking_updates:
                    await self._process_tracking_event(update)
                
                await asyncio.sleep(self.config['sync_intervals']['tracking_info'])
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ 追跡同期エラー: {e}")
                self.sync_stats['errors_occurred'] += 1
                await asyncio.sleep(20)
    
    async def _redis_event_monitor(self):
        """Redis同期イベント監視"""
        logger.info("👁️ Redis同期イベント監視開始")
        
        pubsub = self.redis_client.pubsub()
        pubsub.subscribe('nagano3:sync:events')
        
        while self.running:
            try:
                message = pubsub.get_message(timeout=1)
                
                if message and message['type'] == 'message':
                    event_data = json.loads(message['data'])
                    sync_event = SyncEvent(**event_data)
                    
                    await self._handle_sync_event(sync_event)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Redis監視エラー: {e}")
                await asyncio.sleep(5)
        
        pubsub.close()
    
    async def _fetch_ebay_orders(self) -> List[Dict]:
        """eBay受注データ取得"""
        try:
            # eBay API統合システム呼び出し
            async with aiohttp.ClientSession() as session:
                url = f"{self.config['apis']['internal_api_base']}/ebay/orders/recent"
                
                async with session.get(url, timeout=30) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get('orders', [])
                    else:
                        logger.warning(f"eBay受注取得エラー: HTTP {response.status}")
                        return []
                        
        except Exception as e:
            logger.error(f"eBay受注取得例外: {e}")
            return []
    
    async def _check_stock_changes(self) -> List[Dict]:
        """在庫変更チェック"""
        try:
            cursor = self.mysql_connection.cursor(dictionary=True)
            
            # 最近変更された在庫を取得
            query = """
                SELECT sku, current_stock, reserved_stock, available_stock, 
                       last_updated, status
                FROM zaiko_items 
                WHERE last_updated >= DATE_SUB(NOW(), INTERVAL 2 MINUTE)
                AND active = 1
            """
            
            cursor.execute(query)
            results = cursor.fetchall()
            cursor.close()
            
            return results
            
        except Exception as e:
            logger.error(f"在庫変更チェック例外: {e}")
            return []
    
    async def _check_price_updates(self) -> List[Dict]:
        """価格更新チェック"""
        try:
            cursor = self.mysql_connection.cursor(dictionary=True)
            
            # 最近の価格更新を取得
            query = """
                SELECT sku, provider, price, availability, recorded_at
                FROM price_history 
                WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
                ORDER BY recorded_at DESC
            """
            
            cursor.execute(query)
            results = cursor.fetchall()
            cursor.close()
            
            return results
            
        except Exception as e:
            logger.error(f"価格更新チェック例外: {e}")
            return []
    
    async def _check_tracking_updates(self) -> List[Dict]:
        """配送追跡更新チェック"""
        try:
            cursor = self.mysql_connection.cursor(dictionary=True)
            
            # 追跡情報更新チェック
            query = """
                SELECT order_id, tracking_number, carrier, status, 
                       last_updated, delivery_date
                FROM shipping_tracking 
                WHERE last_updated >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
            """
            
            cursor.execute(query)
            results = cursor.fetchall()
            cursor.close()
            
            return results
            
        except Exception as e:
            logger.error(f"追跡更新チェック例外: {e}")
            return []
    
    async def _process_order_event(self, order: Dict):
        """受注イベント処理"""
        try:
            # イベント作成
            event = SyncEvent(
                event_type=SyncEventType.ORDER_UPDATED,
                entity_id=order['order_id'],
                entity_type='order',
                data=order,
                timestamp=time.time(),
                source='ebay_api',
                priority=1
            )
            
            # Redisに発行
            await self._publish_sync_event(event)
            
            # WebSocket送信
            await self._broadcast_to_websockets('order_update', order)
            
            self.sync_stats['events_processed'] += 1
            
        except Exception as e:
            logger.error(f"受注イベント処理エラー: {e}")
    
    async def _process_stock_event(self, stock_change: Dict):
        """在庫イベント処理"""
        try:
            event = SyncEvent(
                event_type=SyncEventType.STOCK_CHANGED,
                entity_id=stock_change['sku'],
                entity_type='stock',
                data=stock_change,
                timestamp=time.time(),
                source='stock_monitor',
                priority=2
            )
            
            await self._publish_sync_event(event)
            await self._broadcast_to_websockets('stock_update', stock_change)
            
            # 在庫アラート確認
            if stock_change['available_stock'] <= 1:
                await self._send_stock_alert(stock_change)
            
            self.sync_stats['events_processed'] += 1
            
        except Exception as e:
            logger.error(f"在庫イベント処理エラー: {e}")
    
    async def _process_price_event(self, price_update: Dict):
        """価格イベント処理"""
        try:
            event = SyncEvent(
                event_type=SyncEventType.PRICE_UPDATED,
                entity_id=price_update['sku'],
                entity_type='price',
                data=price_update,
                timestamp=time.time(),
                source='price_monitor',
                priority=3
            )
            
            await self._publish_sync_event(event)
            await self._broadcast_to_websockets('price_update', price_update)
            
            self.sync_stats['events_processed'] += 1
            
        except Exception as e:
            logger.error(f"価格イベント処理エラー: {e}")
    
    async def _process_tracking_event(self, tracking_update: Dict):
        """追跡イベント処理"""
        try:
            event = SyncEvent(
                event_type=SyncEventType.TRACKING_UPDATED,
                entity_id=tracking_update['order_id'],
                entity_type='tracking',
                data=tracking_update,
                timestamp=time.time(),
                source='tracking_monitor',
                priority=2
            )
            
            await self._publish_sync_event(event)
            await self._broadcast_to_websockets('tracking_update', tracking_update)
            
            self.sync_stats['events_processed'] += 1
            
        except Exception as e:
            logger.error(f"追跡イベント処理エラー: {e}")
    
    async def _handle_sync_event(self, event: SyncEvent):
        """同期イベント処理"""
        try:
            logger.debug(f"同期イベント処理: {event.event_type.value} - {event.entity_id}")
            
            # イベントタイプ別処理
            if event.event_type == SyncEventType.ORDER_CREATED:
                await self._handle_order_created(event)
            elif event.event_type == SyncEventType.PAYMENT_RECEIVED:
                await self._handle_payment_received(event)
            elif event.event_type == SyncEventType.STOCK_CHANGED:
                await self._handle_stock_changed(event)
            
            # 全てのイベントをWebSocketでブロードキャスト
            await self._broadcast_event_to_websockets(event)
            
        except Exception as e:
            logger.error(f"同期イベント処理エラー: {e}")
    
    async def _handle_order_created(self, event: SyncEvent):
        """新規受注処理"""
        order_data = event.data
        
        # 在庫予約処理
        try:
            await self._reserve_stock_for_order(order_data)
        except Exception as e:
            logger.error(f"在庫予約エラー: {e}")
        
        # 仕入れ必要性チェック
        await self._check_purchase_requirement(order_data)
    
    async def _handle_payment_received(self, event: SyncEvent):
        """支払い受信処理"""
        order_data = event.data
        
        # 出荷準備フラグ設定
        await self._mark_ready_for_shipment(order_data['order_id'])
        
        # 出荷管理システムに通知
        await self._notify_shipping_system(order_data)
    
    async def _handle_stock_changed(self, event: SyncEvent):
        """在庫変更処理"""
        stock_data = event.data
        
        # 関連受注の状況確認
        await self._check_affected_orders(stock_data['sku'])
    
    async def _publish_sync_event(self, event: SyncEvent):
        """同期イベント発行"""
        try:
            event_json = json.dumps(asdict(event))
            self.redis_client.publish('nagano3:sync:events', event_json)
            
        except Exception as e:
            logger.error(f"同期イベント発行エラー: {e}")
    
    async def _broadcast_to_websockets(self, event_type: str, data: Dict):
        """WebSocket全体ブロードキャスト"""
        if not self.websocket_clients:
            return
        
        message = {
            'type': event_type,
            'data': data,
            'timestamp': time.time()
        }
        
        message_json = json.dumps(message, default=str)
        
        # 全接続にブロードキャスト
        disconnected_clients = []
        
        for client_id, websocket in self.websocket_clients.items():
            try:
                await websocket.send(message_json)
            except websockets.exceptions.ConnectionClosed:
                disconnected_clients.append(client_id)
            except Exception as e:
                logger.warning(f"WebSocket送信エラー ({client_id}): {e}")
                disconnected_clients.append(client_id)
        
        # 切断されたクライアントを削除
        for client_id in disconnected_clients:
            if client_id in self.websocket_clients:
                del self.websocket_clients[client_id]
                self.sync_stats['active_connections'] -= 1
    
    async def _broadcast_event_to_websockets(self, event: SyncEvent):
        """イベントWebSocketブロードキャスト"""
        await self._broadcast_to_websockets(
            f'sync_{event.event_type.value}',
            asdict(event)
        )
    
    async def _send_initial_data(self, websocket, client_id: str):
        """初期データ送信"""
        try:
            initial_data = {
                'type': 'connection_established',
                'client_id': client_id,
                'timestamp': time.time(),
                'stats': self.sync_stats
            }
            
            await websocket.send(json.dumps(initial_data, default=str))
            
        except Exception as e:
            logger.error(f"初期データ送信エラー: {e}")
    
    async def _handle_websocket_message(self, client_id: str, message: str):
        """WebSocketメッセージ処理"""
        try:
            data = json.loads(message)
            message_type = data.get('type')
            
            if message_type == 'ping':
                # ハートビート応答
                response = {'type': 'pong', 'timestamp': time.time()}
                await self.websocket_clients[client_id].send(json.dumps(response))
            
            elif message_type == 'subscribe':
                # 購読管理（今後実装）
                channels = data.get('channels', [])
                logger.info(f"購読要求 ({client_id}): {channels}")
            
            elif message_type == 'request_data':
                # データ要求処理
                await self._handle_data_request(client_id, data)
            
        except Exception as e:
            logger.error(f"WebSocketメッセージ処理エラー: {e}")
    
    async def _handle_data_request(self, client_id: str, request: Dict):
        """データ要求処理"""
        try:
            request_type = request.get('request_type')
            
            if request_type == 'recent_orders':
                # 最新受注データ
                orders = await self._fetch_ebay_orders()
                response = {
                    'type': 'data_response',
                    'request_type': request_type,
                    'data': orders,
                    'timestamp': time.time()
                }
                
                await self.websocket_clients[client_id].send(json.dumps(response, default=str))
            
            elif request_type == 'stock_status':
                # 在庫状況データ
                stock_data = await self._get_stock_summary()
                response = {
                    'type': 'data_response',
                    'request_type': request_type,
                    'data': stock_data,
                    'timestamp': time.time()
                }
                
                await self.websocket_clients[client_id].send(json.dumps(response, default=str))
        
        except Exception as e:
            logger.error(f"データ要求処理エラー: {e}")
    
    async def _get_stock_summary(self) -> Dict:
        """在庫サマリー取得"""
        try:
            cursor = self.mysql_connection.cursor(dictionary=True)
            
            query = """
                SELECT 
                    status,
                    COUNT(*) as count,
                    SUM(current_stock) as total_stock,
                    SUM(available_stock) as total_available
                FROM zaiko_items 
                WHERE active = 1
                GROUP BY status
            """
            
            cursor.execute(query)
            results = cursor.fetchall()
            cursor.close()
            
            return {
                'summary': results,
                'timestamp': time.time()
            }
            
        except Exception as e:
            logger.error(f"在庫サマリー取得エラー: {e}")
            return {}
    
    async def _reserve_stock_for_order(self, order_data: Dict):
        """受注時在庫予約"""
        # 在庫管理システムAPI呼び出し
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.config['apis']['internal_api_base']}/stock/reserve"
                
                payload = {
                    'sku': order_data.get('custom_label'),
                    'quantity': order_data.get('quantity', 1),
                    'order_id': order_data['order_id']
                }
                
                async with session.post(url, json=payload, timeout=10) as response:
                    if response.status == 200:
                        logger.info(f"在庫予約成功: {order_data['order_id']}")
                    else:
                        logger.warning(f"在庫予約失敗: HTTP {response.status}")
                        
        except Exception as e:
            logger.error(f"在庫予約例外: {e}")
    
    async def _check_purchase_requirement(self, order_data: Dict):
        """仕入れ必要性チェック"""
        # 仕入れ管理システムに通知
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.config['apis']['internal_api_base']}/purchase/check-requirement"
                
                payload = {
                    'sku': order_data.get('custom_label'),
                    'order_id': order_data['order_id']
                }
                
                async with session.post(url, json=payload, timeout=10) as response:
                    if response.status == 200:
                        result = await response.json()
                        if result.get('purchase_required'):
                            logger.info(f"仕入れ必要: {order_data.get('custom_label')}")
                            
        except Exception as e:
            logger.error(f"仕入れチェック例外: {e}")
    
    async def _mark_ready_for_shipment(self, order_id: str):
        """出荷準備完了マーク"""
        try:
            cursor = self.mysql_connection.cursor()
            
            query = """
                UPDATE orders 
                SET shipping_status = 'ready_for_shipment', 
                    updated_at = NOW()
                WHERE order_id = %s
            """
            
            cursor.execute(query, (order_id,))
            self.mysql_connection.commit()
            cursor.close()
            
        except Exception as e:
            logger.error(f"出荷準備マークエラー: {e}")
    
    async def _notify_shipping_system(self, order_data: Dict):
        """出荷システム通知"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.config['apis']['internal_api_base']}/shipping/new-order"
                
                async with session.post(url, json=order_data, timeout=10) as response:
                    if response.status == 200:
                        logger.info(f"出荷システム通知成功: {order_data['order_id']}")
                        
        except Exception as e:
            logger.error(f"出荷システム通知例外: {e}")
    
    async def _check_affected_orders(self, sku: str):
        """在庫変更による影響受注確認"""
        try:
            cursor = self.mysql_connection.cursor(dictionary=True)
            
            query = """
                SELECT order_id, quantity, status
                FROM orders 
                WHERE sku = %s 
                AND status IN ('awaiting_payment', 'payment_received')
            """
            
            cursor.execute(query, (sku,))
            affected_orders = cursor.fetchall()
            cursor.close()
            
            for order in affected_orders:
                logger.info(f"影響受注確認: {order['order_id']}")
                
        except Exception as e:
            logger.error(f"影響受注確認エラー: {e}")
    
    async def _send_stock_alert(self, stock_data: Dict):
        """在庫アラート送信"""
        alert_data = {
            'type': 'stock_alert',
            'sku': stock_data['sku'],
            'current_stock': stock_data['current_stock'],
            'available_stock': stock_data['available_stock'],
            'status': stock_data['status'],
            'timestamp': time.time(),
            'urgency': 'high' if stock_data['available_stock'] <= 0 else 'medium'
        }
        
        await self._broadcast_to_websockets('alert', alert_data)
        
        # 外部通知システムにも送信
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.config['apis']['internal_api_base']}/notifications/stock-alert"
                
                async with session.post(url, json=alert_data, timeout=5) as response:
                    if response.status == 200:
                        logger.info(f"在庫アラート送信: {stock_data['sku']}")
                        
        except Exception as e:
            logger.error(f"在庫アラート送信例外: {e}")
    
    async def _health_check(self):
        """ヘルスチェック"""
        try:
            # Redis接続確認
            self.redis_client.ping()
            
            # MySQL接続確認
            self.mysql_connection.ping(reconnect=True)
            
        except Exception as e:
            logger.error(f"ヘルスチェック失敗: {e}")
            # 再接続試行
            await self._reconnect_services()
    
    async def _reconnect_services(self):
        """サービス再接続"""
        try:
            logger.info("🔄 サービス再接続開始")
            
            # Redis再接続
            await self._connect_redis()
            
            # MySQL再接続
            await self._connect_mysql()
            
            logger.info("✅ サービス再接続完了")
            
        except Exception as e:
            logger.error(f"❌ サービス再接続失敗: {e}")
    
    async def _update_stats(self):
        """統計情報更新"""
        self.sync_stats['last_sync_time'] = time.time()
        
        # Redis統計保存
        try:
            stats_json = json.dumps(self.sync_stats, default=str)
            self.redis_client.setex('nagano3:sync:stats', 300, stats_json)  # 5分間保持
        except Exception as e:
            logger.warning(f"統計保存エラー: {e}")
    
    def _generate_client_id(self) -> str:
        """クライアントID生成"""
        timestamp = str(time.time())
        return hashlib.md5(timestamp.encode()).hexdigest()[:8]
    
    def _setup_signal_handlers(self):
        """シグナルハンドラー設定"""
        def signal_handler(signum, frame):
            logger.info(f"シグナル受信: {signum}")
            asyncio.create_task(self.stop())
        
        signal.signal(signal.SIGTERM, signal_handler)
        signal.signal(signal.SIGINT, signal_handler)

# メイン実行
async def main():
    """メイン関数"""
    config_path = os.getenv('SYNC_CONFIG_PATH', 'config/sync_service.yaml')
    
    sync_service = RealTimeSyncService(config_path)
    
    try:
        await sync_service.start()
    except KeyboardInterrupt:
        logger.info("🛑 Ctrl+C検出 - サービス停止")
    except Exception as e:
        logger.error(f"❌ サービス実行エラー: {e}")
    finally:
        await sync_service.stop()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("🛑 強制終了")
    except Exception as e:
        logger.error(f"❌ 致命的エラー: {e}")
        sys.exit(1)