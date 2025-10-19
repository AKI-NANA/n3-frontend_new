#!/usr/bin/env python3
"""
NAGANO-3 eBay受注管理システム - リアルタイム通知・同期サービス

@version 3.0.0
@date 2025-06-11
@description WebSocket対応リアルタイム通知・データ同期システム
"""

import asyncio
import websockets
import json
import redis
import mysql.connector
from mysql.connector import pooling
import aiohttp
import logging
from datetime import datetime, timedelta
import hashlib
import hmac
import os
from typing import Dict, List, Optional, Any
import threading
import time
from concurrent.futures import ThreadPoolExecutor
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/nagano3/sync_service.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class N3RealTimeSyncService:
    """
    NAGANO-3 リアルタイム同期サービス
    WebSocket通信によるリアルタイムデータ更新
    """
    
    def __init__(self):
        self.clients: Dict[str, websockets.WebSocketServerProtocol] = {}
        self.redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=0,
            decode_responses=True
        )
        
        # MySQL接続プール
        self.mysql_config = {
            'user': os.getenv('DB_USER'),
            'password': os.getenv('DB_PASS'),
            'host': os.getenv('DB_HOST'),
            'database': os.getenv('DB_NAME'),
            'pool_name': 'nagano3_pool',
            'pool_size': 10
        }
        self.mysql_pool = mysql.connector.pooling.MySQLConnectionPool(**self.mysql_config)
        
        # 通知マネージャー
        self.notification_manager = NotificationManager()
        
        # eBay API連携
        self.ebay_api = EbayAPIClient()
        
        # 在庫管理システム連携
        self.zaiko_system = ZaikoSystemClient()
        
        # 同期状態管理
        self.sync_status = {
            'ebay_orders': {'last_sync': None, 'status': 'ready'},
            'zaiko_data': {'last_sync': None, 'status': 'ready'},
            'price_data': {'last_sync': None, 'status': 'ready'},
            'shipping_tracking': {'last_sync': None, 'status': 'ready'}
        }
        
        logger.info("🚀 N3 リアルタイム同期サービス初期化完了")
    
    async def start_server(self, host='localhost', port=8765):
        """WebSocketサーバー起動"""
        logger.info(f"🌐 WebSocketサーバー起動: ws://{host}:{port}")
        
        # WebSocketサーバー起動
        server_task = websockets.serve(self.handle_client, host, port)
        
        # バックグラウンドタスク起動
        sync_task = asyncio.create_task(self.background_sync_loop())
        notification_task = asyncio.create_task(self.notification_loop())
        health_check_task = asyncio.create_task(self.health_check_loop())
        
        # 全タスクを並行実行
        await asyncio.gather(
            server_task,
            sync_task,
            notification_task,
            health_check_task
        )
    
    async def handle_client(self, websocket, path):
        """WebSocketクライアント接続処理"""
        client_id = self.generate_client_id()
        self.clients[client_id] = websocket
        
        logger.info(f"📱 クライアント接続: {client_id} (総接続数: {len(self.clients)})")
        
        try:
            # 接続確認メッセージ送信
            await self.send_to_client(client_id, {
                'type': 'connection_established',
                'client_id': client_id,
                'server_time': datetime.now().isoformat(),
                'sync_status': self.sync_status
            })
            
            # 初期データ送信
            await self.send_initial_data(client_id)
            
            # メッセージ受信ループ
            async for message in websocket:
                await self.process_client_message(client_id, message)
                
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"📱 クライアント切断: {client_id}")
        except Exception as e:
            logger.error(f"❌ クライアント処理エラー {client_id}: {e}")
        finally:
            # クライアント削除
            if client_id in self.clients:
                del self.clients[client_id]
    
    async def process_client_message(self, client_id: str, message: str):
        """クライアントメッセージ処理"""
        try:
            data = json.loads(message)
            message_type = data.get('type')
            
            if message_type == 'sync_request':
                await self.handle_sync_request(client_id, data)
            elif message_type == 'subscription':
                await self.handle_subscription(client_id, data)
            elif message_type == 'order_status_update':
                await self.handle_order_status_update(client_id, data)
            elif message_type == 'ping':
                await self.send_to_client(client_id, {'type': 'pong', 'timestamp': datetime.now().isoformat()})
            else:
                logger.warning(f"⚠️ 未知のメッセージタイプ: {message_type}")
                
        except json.JSONDecodeError:
            logger.error(f"❌ 無効なJSONメッセージ: {message}")
        except Exception as e:
            logger.error(f"❌ メッセージ処理エラー: {e}")
    
    async def send_initial_data(self, client_id: str):
        """初期データ送信"""
        try:
            # 最新受注データ
            recent_orders = await self.get_recent_orders()
            await self.send_to_client(client_id, {
                'type': 'initial_orders',
                'data': recent_orders
            })
            
            # 在庫アラート
            stock_alerts = await self.get_stock_alerts()
            if stock_alerts:
                await self.send_to_client(client_id, {
                    'type': 'stock_alerts',
                    'data': stock_alerts
                })
            
            # AI推奨データ
            ai_recommendations = await self.get_ai_recommendations()
            if ai_recommendations:
                await self.send_to_client(client_id, {
                    'type': 'ai_recommendations',
                    'data': ai_recommendations
                })
                
        except Exception as e:
            logger.error(f"❌ 初期データ送信エラー: {e}")
    
    async def background_sync_loop(self):
        """バックグラウンド同期ループ"""
        logger.info("🔄 バックグラウンド同期ループ開始")
        
        while True:
            try:
                # eBay受注データ同期（30秒間隔）
                if self.should_sync('ebay_orders', 30):
                    await self.sync_ebay_orders()
                
                # 在庫データ同期（60秒間隔）
                if self.should_sync('zaiko_data', 60):
                    await self.sync_zaiko_data()
                
                # 価格データ同期（300秒間隔）
                if self.should_sync('price_data', 300):
                    await self.sync_price_data()
                
                # 配送追跡同期（120秒間隔）
                if self.should_sync('shipping_tracking', 120):
                    await self.sync_shipping_tracking()
                
                await asyncio.sleep(10)  # 10秒間隔でチェック
                
            except Exception as e:
                logger.error(f"❌ バックグラウンド同期エラー: {e}")
                await asyncio.sleep(30)  # エラー時は30秒待機
    
    async def sync_ebay_orders(self):
        """eBay受注データ同期"""
        try:
            self.sync_status['ebay_orders']['status'] = 'syncing'
            
            # eBay APIから最新受注データ取得
            new_orders = await self.ebay_api.get_recent_orders()
            
            if new_orders:
                # データベース更新
                await self.update_orders_database(new_orders)
                
                # 全クライアントに通知
                await self.broadcast_to_clients({
                    'type': 'orders_updated',
                    'data': new_orders,
                    'count': len(new_orders),
                    'timestamp': datetime.now().isoformat()
                })
                
                # AI分析実行
                for order in new_orders:
                    await self.trigger_ai_analysis(order)
                
                logger.info(f"✅ eBay受注同期完了: {len(new_orders)}件")
            
            self.sync_status['ebay_orders']['last_sync'] = datetime.now().isoformat()
            self.sync_status['ebay_orders']['status'] = 'ready'
            
        except Exception as e:
            logger.error(f"❌ eBay受注同期エラー: {e}")
            self.sync_status['ebay_orders']['status'] = 'error'
            
            # エラー通知
            await self.notification_manager.send_error_notification(
                'eBay受注データ同期エラー',
                str(e)
            )
    
    async def sync_zaiko_data(self):
        """在庫データ同期"""
        try:
            self.sync_status['zaiko_data']['status'] = 'syncing'
            
            # 在庫管理システムからデータ取得
            zaiko_updates = await self.zaiko_system.get_stock_updates()
            
            if zaiko_updates:
                # 低在庫アラート確認
                low_stock_items = [item for item in zaiko_updates if item['quantity'] <= item['threshold']]
                
                if low_stock_items:
                    await self.broadcast_to_clients({
                        'type': 'low_stock_alert',
                        'data': low_stock_items,
                        'timestamp': datetime.now().isoformat()
                    })
                    
                    # 自動仕入れ判定
                    for item in low_stock_items:
                        await self.evaluate_auto_reorder(item)
                
                logger.info(f"✅ 在庫データ同期完了: {len(zaiko_updates)}件")
            
            self.sync_status['zaiko_data']['last_sync'] = datetime.now().isoformat()
            self.sync_status['zaiko_data']['status'] = 'ready'
            
        except Exception as e:
            logger.error(f"❌ 在庫データ同期エラー: {e}")
            self.sync_status['zaiko_data']['status'] = 'error'
    
    async def sync_price_data(self):
        """価格データ同期"""
        try:
            self.sync_status['price_data']['status'] = 'syncing'
            
            # 価格比較API連携
            price_updates = await self.get_price_updates()
            
            if price_updates:
                # 価格変動アラート
                significant_changes = [p for p in price_updates if abs(p['change_rate']) > 10]
                
                if significant_changes:
                    await self.broadcast_to_clients({
                        'type': 'price_alert',
                        'data': significant_changes,
                        'timestamp': datetime.now().isoformat()
                    })
                
                logger.info(f"✅ 価格データ同期完了: {len(price_updates)}件")
            
            self.sync_status['price_data']['last_sync'] = datetime.now().isoformat()
            self.sync_status['price_data']['status'] = 'ready'
            
        except Exception as e:
            logger.error(f"❌ 価格データ同期エラー: {e}")
            self.sync_status['price_data']['status'] = 'error'
    
    async def sync_shipping_tracking(self):
        """配送追跡同期"""
        try:
            self.sync_status['shipping_tracking']['status'] = 'syncing'
            
            # 配送会社API連携
            tracking_updates = await self.get_tracking_updates()
            
            if tracking_updates:
                # 配送状況更新
                await self.update_shipping_status(tracking_updates)
                
                # 配送完了通知
                delivered_orders = [t for t in tracking_updates if t['status'] == 'delivered']
                
                if delivered_orders:
                    await self.broadcast_to_clients({
                        'type': 'delivery_completed',
                        'data': delivered_orders,
                        'timestamp': datetime.now().isoformat()
                    })
                
                logger.info(f"✅ 配送追跡同期完了: {len(tracking_updates)}件")
            
            self.sync_status['shipping_tracking']['last_sync'] = datetime.now().isoformat()
            self.sync_status['shipping_tracking']['status'] = 'ready'
            
        except Exception as e:
            logger.error(f"❌ 配送追跡同期エラー: {e}")
            self.sync_status['shipping_tracking']['status'] = 'error'
    
    async def notification_loop(self):
        """通知処理ループ"""
        logger.info("📢 通知処理ループ開始")
        
        while True:
            try:
                # Redis Pub/Subから通知を受信
                pubsub = self.redis_client.pubsub()
                pubsub.subscribe('nagano3_notifications')
                
                for message in pubsub.listen():
                    if message['type'] == 'message':
                        notification_data = json.loads(message['data'])
                        await self.process_notification(notification_data)
                
            except Exception as e:
                logger.error(f"❌ 通知処理エラー: {e}")
                await asyncio.sleep(30)
    
    async def health_check_loop(self):
        """ヘルスチェックループ"""
        while True:
            try:
                # システム状態確認
                health_status = await self.check_system_health()
                
                # 問題検出時の対応
                if health_status['status'] != 'healthy':
                    await self.notification_manager.send_health_alert(health_status)
                
                # 接続中クライアントにヘルスステータス送信
                await self.broadcast_to_clients({
                    'type': 'health_status',
                    'data': health_status,
                    'timestamp': datetime.now().isoformat()
                })
                
                await asyncio.sleep(300)  # 5分間隔
                
            except Exception as e:
                logger.error(f"❌ ヘルスチェックエラー: {e}")
                await asyncio.sleep(60)
    
    # ========== ユーティリティメソッド ==========
    
    def generate_client_id(self) -> str:
        """クライアントID生成"""
        return hashlib.md5(f"{datetime.now().isoformat()}{len(self.clients)}".encode()).hexdigest()[:8]
    
    def should_sync(self, sync_type: str, interval_seconds: int) -> bool:
        """同期実行判定"""
        last_sync = self.sync_status[sync_type]['last_sync']
        if not last_sync:
            return True
        
        last_sync_time = datetime.fromisoformat(last_sync.replace('Z', '+00:00'))
        return (datetime.now() - last_sync_time).total_seconds() >= interval_seconds
    
    async def send_to_client(self, client_id: str, data: Dict[str, Any]):
        """特定クライアントにメッセージ送信"""
        if client_id in self.clients:
            try:
                await self.clients[client_id].send(json.dumps(data))
            except websockets.exceptions.ConnectionClosed:
                del self.clients[client_id]
            except Exception as e:
                logger.error(f"❌ クライアント送信エラー {client_id}: {e}")
    
    async def broadcast_to_clients(self, data: Dict[str, Any]):
        """全クライアントにブロードキャスト"""
        if self.clients:
            message = json.dumps(data)
            disconnected_clients = []
            
            for client_id, websocket in self.clients.items():
                try:
                    await websocket.send(message)
                except websockets.exceptions.ConnectionClosed:
                    disconnected_clients.append(client_id)
                except Exception as e:
                    logger.error(f"❌ ブロードキャストエラー {client_id}: {e}")
                    disconnected_clients.append(client_id)
            
            # 切断されたクライアントを削除
            for client_id in disconnected_clients:
                if client_id in self.clients:
                    del self.clients[client_id]
    
    # ========== データ取得・更新メソッド ==========
    
    async def get_recent_orders(self) -> List[Dict]:
        """最新受注データ取得"""
        try:
            connection = self.mysql_pool.get_connection()
            cursor = connection.cursor(dictionary=True)
            
            cursor.execute("""
                SELECT * FROM ebay_orders 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY created_at DESC
                LIMIT 50
            """)
            
            orders = cursor.fetchall()
            cursor.close()
            connection.close()
            
            return orders
            
        except Exception as e:
            logger.error(f"❌ 最新受注データ取得エラー: {e}")
            return []
    
    async def get_stock_alerts(self) -> List[Dict]:
        """在庫アラート取得"""
        # 在庫管理システム連携実装
        return await self.zaiko_system.get_low_stock_alerts()
    
    async def get_ai_recommendations(self) -> List[Dict]:
        """AI推奨データ取得"""
        try:
            # Redis キャッシュから AI推奨データ取得
            cached_recommendations = self.redis_client.get('ai_recommendations')
            if cached_recommendations:
                return json.loads(cached_recommendations)
            return []
        except Exception as e:
            logger.error(f"❌ AI推奨データ取得エラー: {e}")
            return []
    
    async def update_orders_database(self, orders: List[Dict]):
        """受注データベース更新"""
        try:
            connection = self.mysql_pool.get_connection()
            cursor = connection.cursor()
            
            for order in orders:
                cursor.execute("""
                    INSERT INTO ebay_orders (order_id, item_id, title, sale_price, buyer_id, created_at)
                    VALUES (%(order_id)s, %(item_id)s, %(title)s, %(sale_price)s, %(buyer_id)s, %(created_at)s)
                    ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    sale_price = VALUES(sale_price),
                    updated_at = NOW()
                """, order)
            
            connection.commit()
            cursor.close()
            connection.close()
            
        except Exception as e:
            logger.error(f"❌ 受注データベース更新エラー: {e}")
            raise
    
    async def trigger_ai_analysis(self, order: Dict):
        """AI分析トリガー"""
        try:
            # AI分析をバックグラウンドで実行
            analysis_data = {
                'order_id': order['order_id'],
                'trigger_time': datetime.now().isoformat(),
                'analysis_type': 'profit_optimization'
            }
            
            # Redis キューに追加
            self.redis_client.lpush('ai_analysis_queue', json.dumps(analysis_data))
            
        except Exception as e:
            logger.error(f"❌ AI分析トリガーエラー: {e}")
    
    async def check_system_health(self) -> Dict[str, Any]:
        """システムヘルスチェック"""
        health_data = {
            'status': 'healthy',
            'checks': {},
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            # Redis接続チェック
            health_data['checks']['redis'] = 'ok' if self.redis_client.ping() else 'error'
            
            # MySQL接続チェック
            try:
                connection = self.mysql_pool.get_connection()
                connection.close()
                health_data['checks']['mysql'] = 'ok'
            except:
                health_data['checks']['mysql'] = 'error'
            
            # WebSocket接続数
            health_data['checks']['websocket_connections'] = len(self.clients)
            
            # 同期ステータス
            health_data['checks']['sync_status'] = self.sync_status
            
            # 全体ステータス判定
            if 'error' in health_data['checks'].values():
                health_data['status'] = 'degraded'
            
        except Exception as e:
            health_data['status'] = 'unhealthy'
            health_data['error'] = str(e)
        
        return health_data


class NotificationManager:
    """通知管理クラス"""
    
    def __init__(self):
        self.smtp_config = {
            'host': os.getenv('SMTP_HOST'),
            'port': int(os.getenv('SMTP_PORT', 587)),
            'username': os.getenv('SMTP_USER'),
            'password': os.getenv('SMTP_PASS')
        }
        self.slack_webhook = os.getenv('SLACK_WEBHOOK_URL')
    
    async def send_error_notification(self, title: str, message: str):
        """エラー通知送信"""
        notification_data = {
            'type': 'error',
            'title': title,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'severity': 'high'
        }
        
        # Slack通知
        await self.send_slack_notification(notification_data)
        
        # メール通知
        await self.send_email_notification(notification_data)
    
    async def send_health_alert(self, health_status: Dict):
        """ヘルスアラート送信"""
        if health_status['status'] != 'healthy':
            notification_data = {
                'type': 'health_alert',
                'title': 'システムヘルス警告',
                'message': f"システム状態: {health_status['status']}",
                'details': health_status,
                'timestamp': datetime.now().isoformat()
            }
            
            await self.send_slack_notification(notification_data)
    
    async def send_slack_notification(self, data: Dict):
        """Slack通知送信"""
        if not self.slack_webhook:
            return
        
        try:
            payload = {
                'text': f"🚨 {data['title']}",
                'attachments': [{
                    'color': 'danger' if data.get('type') == 'error' else 'warning',
                    'fields': [
                        {'title': 'メッセージ', 'value': data['message'], 'short': False},
                        {'title': '時刻', 'value': data['timestamp'], 'short': True}
                    ]
                }]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(self.slack_webhook, json=payload) as response:
                    if response.status == 200:
                        logger.info("✅ Slack通知送信完了")
                    else:
                        logger.error(f"❌ Slack通知送信失敗: {response.status}")
                        
        except Exception as e:
            logger.error(f"❌ Slack通知エラー: {e}")
    
    async def send_email_notification(self, data: Dict):
        """メール通知送信"""
        try:
            msg = MimeMultipart()
            msg['From'] = self.smtp_config['username']
            msg['To'] = os.getenv('ADMIN_EMAIL')
            msg['Subject'] = f"NAGANO-3 Alert: {data['title']}"
            
            body = f"""
            {data['title']}
            
            メッセージ: {data['message']}
            時刻: {data['timestamp']}
            
            NAGANO-3 eBay受注管理システム
            """
            
            msg.attach(MimeText(body, 'plain'))
            
            # 非同期でメール送信（実装簡略化）
            def send_email():
                with smtplib.SMTP(self.smtp_config['host'], self.smtp_config['port']) as server:
                    server.starttls()
                    server.login(self.smtp_config['username'], self.smtp_config['password'])
                    server.send_message(msg)
            
            # 別スレッドで実行
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, send_email)
            
            logger.info("✅ メール通知送信完了")
            
        except Exception as e:
            logger.error(f"❌ メール通知エラー: {e}")


class EbayAPIClient:
    """eBay API クライアント"""
    
    def __init__(self):
        self.client_id = os.getenv('EBAY_CLIENT_ID')
        self.client_secret = os.getenv('EBAY_CLIENT_SECRET')
        self.access_token = None
    
    async def get_recent_orders(self) -> List[Dict]:
        """最新受注データ取得"""
        try:
            # eBay API 実装（簡略化）
            # 実際の実装では OAuth認証とREST API呼び出し
            return []
        except Exception as e:
            logger.error(f"❌ eBay API エラー: {e}")
            return []


class ZaikoSystemClient:
    """在庫管理システム クライアント"""
    
    async def get_stock_updates(self) -> List[Dict]:
        """在庫更新データ取得"""
        # 在庫管理システム連携実装
        return []
    
    async def get_low_stock_alerts(self) -> List[Dict]:
        """低在庫アラート取得"""
        # 低在庫アラート実装
        return []


# ========== メイン実行部 ==========

async def main():
    """メイン実行関数"""
    service = N3RealTimeSyncService()
    
    # サービス起動
    await service.start_server(
        host=os.getenv('WEBSOCKET_HOST', 'localhost'),
        port=int(os.getenv('WEBSOCKET_PORT', 8765))
    )


if __name__ == "__main__":
    try:
        # 環境変数確認
        required_env_vars = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME', 'REDIS_HOST']
        missing_vars = [var for var in required_env_vars if not os.getenv(var)]
        
        if missing_vars:
            logger.error(f"❌ 必要な環境変数が設定されていません: {missing_vars}")
            exit(1)
        
        # イベントループ実行
        asyncio.run(main())
        
    except KeyboardInterrupt:
        logger.info("🛑 サービス停止")
    except Exception as e:
        logger.error(f"❌ サービス起動エラー: {e}")
        exit(1)
