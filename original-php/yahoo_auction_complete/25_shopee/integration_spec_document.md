# Shopee出品管理ツール - 外部システム連携開発指示書

## 1. プロジェクト概要

Shopee 7カ国対応出品管理ツールと他のシステムとの連携機能を開発し、EC運営業務の自動化と効率化を実現する。

## 2. 連携対象システム

### 2.1. 在庫管理システム（WMS）
**目的**: リアルタイム在庫同期
**連携方式**: REST API / WebSocket / FTP

### 2.2. 受注管理システム（OMS）
**目的**: 注文情報の自動取込み
**連携方式**: REST API / Webhook

### 2.3. 商品情報管理システム（PIM）
**目的**: 商品マスターデータの同期
**連携方式**: REST API / CSV Export/Import

### 2.4. 価格管理システム
**目的**: 動的価格調整
**連携方式**: REST API / スケジュール実行

### 2.5. 画像管理システム（DAM）
**目的**: 商品画像の自動最適化・配信
**連携方式**: REST API / CDN連携

### 2.6. 分析・BI システム
**目的**: 売上・在庫分析データの提供
**連携方式**: Data Pipeline / ETL

### 2.7. 通知システム
**目的**: アラート・レポート配信
**連携方式**: Email / Slack / Teams / SMS

## 3. 技術仕様

### 3.1. API Gateway 設計

```python
# API Gateway アーキテクチャ
class IntegrationGateway:
    """外部システム連携ゲートウェイ"""
    
    def __init__(self):
        self.connections = {}
        self.rate_limiters = {}
        self.retry_handlers = {}
        self.auth_managers = {}
    
    async def register_integration(self, system_id: str, config: dict):
        """外部システムの登録"""
        pass
    
    async def execute_sync(self, system_id: str, operation: str, data: dict):
        """同期実行"""
        pass
    
    async def schedule_sync(self, system_id: str, operation: str, schedule: str):
        """スケジュール同期"""
        pass
```

### 3.2. データ変換エンジン

```python
# データマッピング設定
DATA_MAPPINGS = {
    'wms_to_shopee': {
        'sku': 'item_sku',
        'stock_quantity': 'stock',
        'warehouse_location': 'warehouse_info.location'
    },
    'pim_to_shopee': {
        'product_id': 'sku',
        'title_ja': 'product_name_ja',
        'title_en': 'product_name_en',
        'category_code': 'category_id'
    }
}
```

## 4. 具体的な連携仕様

### 4.1. 在庫管理システム（WMS）連携

#### 4.1.1. リアルタイム在庫同期
**実装方式**: WebSocket接続

```python
class WMSConnector:
    async def listen_stock_updates(self):
        """在庫変更をリアルタイム監視"""
        async with websockets.connect(self.wms_websocket_url) as websocket:
            async for message in websocket:
                stock_data = json.loads(message)
                await self.update_shopee_stock(stock_data)
    
    async def update_shopee_stock(self, stock_data: dict):
        """Shopeeの在庫を更新"""
        for country in COUNTRY_CONFIGS.keys():
            try:
                client = ShopeeAPIClient(country, self.db)
                await client.update_stock(
                    item_id=stock_data['shopee_item_id'],
                    stock=stock_data['available_quantity']
                )
            except Exception as e:
                await self.handle_sync_error('stock_update', country, e)
```

#### 4.1.2. バッチ同期（定期実行）
**スケジュール**: 毎時0分に実行

```python
@celery_app.task
def sync_stock_batch():
    """在庫の一括同期"""
    wms_api = WMSAPIClient()
    stock_data = wms_api.get_all_stock()
    
    for item in stock_data:
        # Shopee各国の在庫を更新
        update_shopee_stock.delay(item)
```

### 4.2. 受注管理システム（OMS）連携

#### 4.2.1. Webhook による注文受信

```python
@app.post("/webhooks/shopee/order")
async def receive_shopee_order(order_data: ShopeeOrderWebhook):
    """Shopee注文のWebhook受信"""
    try:
        # OMSフォーマットに変換
        oms_order = transform_shopee_to_oms(order_data)
        
        # OMSに注文を送信
        oms_client = OMSAPIClient()
        result = await oms_client.create_order(oms_order)
        
        # 処理結果をログ
        log_integration_activity(
            system='OMS',
            operation='create_order',
            status='success',
            data={'shopee_order_id': order_data.order_id, 'oms_order_id': result.order_id}
        )
        
        return {"status": "success", "oms_order_id": result.order_id}
        
    except Exception as e:
        await handle_webhook_error('OMS', order_data, e)
        raise HTTPException(status_code=500, detail=str(e))
```

#### 4.2.2. 出荷情報の逆同期

```python
class OMSTrackingSync:
    async def sync_shipping_updates(self):
        """出荷情報をShopeeに同期"""
        oms_client = OMSAPIClient()
        shipments = await oms_client.get_shipped_orders()
        
        for shipment in shipments:
            for country in shipment.countries:
                shopee_client = ShopeeAPIClient(country, self.db)
                await shopee_client.update_tracking_info(
                    order_id=shipment.shopee_order_id,
                    tracking_number=shipment.tracking_number,
                    logistics_status="SHIPPED"
                )
```

### 4.3. 商品情報管理システム（PIM）連携

#### 4.3.1. 商品マスター同期

```python
class PIMConnector:
    async def sync_product_master(self, sync_type: str = 'incremental'):
        """商品マスターデータの同期"""
        pim_client = PIMAPIClient()
        
        if sync_type == 'full':
            # 全量同期
            products = await pim_client.get_all_products()
        else:
            # 差分同期
            last_sync = await self.get_last_sync_timestamp('PIM')
            products = await pim_client.get_updated_products(since=last_sync)
        
        for product in products:
            try:
                # PIM → Shopee データ変換
                shopee_product = self.transform_pim_to_shopee(product)
                
                # 各国に商品を同期
                await self.sync_product_to_countries(shopee_product)
                
            except Exception as e:
                await self.handle_product_sync_error(product, e)
    
    def transform_pim_to_shopee(self, pim_product: dict) -> dict:
        """PIMデータをShopee形式に変換"""
        return {
            'sku': pim_product['product_code'],
            'product_name_ja': pim_product['title_ja'],
            'product_name_en': pim_product['title_en'],
            'description': pim_product['description'],
            'category_id': self.map_category(pim_product['category_code']),
            'images': pim_product['image_urls'],
            'attributes': self.map_attributes(pim_product['attributes'])
        }
```

### 4.4. 価格管理システム連携

#### 4.4.1. 動的価格調整

```python
class PricingConnector:
    async def update_dynamic_pricing(self):
        """動的価格調整の実行"""
        pricing_client = PricingAPIClient()
        
        # 価格調整対象商品を取得
        pricing_rules = await pricing_client.get_active_pricing_rules()
        
        for rule in pricing_rules:
            try:
                # 新価格を計算
                new_prices = await pricing_client.calculate_prices(rule)
                
                # 各国のShopeeに価格を更新
                for country, price in new_prices.items():
                    await self.update_shopee_price(
                        sku=rule.sku,
                        country=country,
                        new_price=price,
                        reason=f"Dynamic pricing rule: {rule.rule_name}"
                    )
                    
            except Exception as e:
                await self.handle_pricing_error(rule, e)
    
    async def update_shopee_price(self, sku: str, country: str, new_price: float, reason: str):
        """Shopee商品価格の更新"""
        product = await self.get_product_by_sku_country(sku, country)
        if not product:
            return
            
        shopee_client = ShopeeAPIClient(country, self.db)
        await shopee_client.update_product_price(
            item_id=product.shopee_item_id,
            price=new_price
        )
        
        # 価格変更履歴を記録
        await self.log_price_change(sku, country, product.price, new_price, reason)
```

### 4.5. 画像管理システム（DAM）連携

#### 4.5.1. 画像自動最適化

```python
class DAMConnector:
    async def optimize_product_images(self, sku: str):
        """商品画像の最適化"""
        dam_client = DAMAPIClient()
        
        # 元画像を取得
        original_images = await dam_client.get_product_images(sku)
        
        optimized_images = []
        for image in original_images:
            try:
                # Shopee各国の要件に合わせて最適化
                for country in COUNTRY_CONFIGS.keys():
                    optimized_url = await dam_client.optimize_image(
                        image_url=image.url,
                        target_platform='shopee',
                        target_country=country,
                        quality=85,
                        format='webp'
                    )
                    optimized_images.append({
                        'country': country,
                        'url': optimized_url,
                        'alt_text': image.alt_text
                    })
                    
            except Exception as e:
                logger.error(f"画像最適化エラー: {sku}, {image.url}, {str(e)}")
        
        return optimized_images
```

### 4.6. 分析・BIシステム連携

#### 4.6.1. データパイプライン

```python
class AnalyticsConnector:
    async def export_sales_data(self, start_date: datetime, end_date: datetime):
        """売上データのエクスポート"""
        bi_client = BISystemAPIClient()
        
        for country in COUNTRY_CONFIGS.keys():
            try:
                shopee_client = ShopeeAPIClient(country, self.db)
                
                # Shopeeから売上データを取得
                sales_data = await shopee_client.get_order_list(
                    time_from=int(start_date.timestamp()),
                    time_to=int(end_date.timestamp())
                )
                
                # BIシステム形式に変換
                bi_format_data = self.transform_sales_data(sales_data, country)
                
                # BIシステムに送信
                await bi_client.import_sales_data(bi_format_data)
                
            except Exception as e:
                await self.handle_analytics_error(country, e)
    
    def transform_sales_data(self, shopee_data: list, country: str) -> list:
        """売上データをBI形式に変換"""
        bi_data = []
        for order in shopee_data:
            for item in order.get('item_list', []):
                bi_data.append({
                    'date': order['order_time'],
                    'country': country,
                    'order_id': order['order_sn'],
                    'sku': item['item_sku'],
                    'quantity': item['quantity'],
                    'unit_price': item['price'],
                    'total_amount': item['price'] * item['quantity'],
                    'currency': COUNTRY_CONFIGS[country]['currency']
                })
        return bi_data
```

### 4.7. 通知システム連携

#### 4.7.1. マルチチャンネル通知

```python
class NotificationConnector:
    def __init__(self):
        self.email_client = EmailAPIClient()
        self.slack_client = SlackAPIClient()
        self.teams_client = TeamsAPIClient()
        self.sms_client = SMSAPIClient()
    
    async def send_alert(self, alert_type: str, message: str, severity: str, channels: list):
        """アラート通知の送信"""
        notification_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'alert_type': alert_type,
            'message': message,
            'severity': severity,
            'system': 'Shopee Manager'
        }
        
        for channel in channels:
            try:
                if channel == 'email':
                    await self.send_email_alert(notification_data)
                elif channel == 'slack':
                    await self.send_slack_alert(notification_data)
                elif channel == 'teams':
                    await self.send_teams_alert(notification_data)
                elif channel == 'sms':
                    await self.send_sms_alert(notification_data)
                    
            except Exception as e:
                logger.error(f"通知送信エラー: {channel}, {str(e)}")
    
    async def send_daily_report(self):
        """日次レポートの配信"""
        report_data = await self.generate_daily_report()
        
        # レポートを生成
        report_html = self.render_report_template(report_data)
        
        # 配信
        await self.email_client.send_html_email(
            to=settings.REPORT_RECIPIENTS,
            subject=f"Shopee Manager 日次レポート - {datetime.now().strftime('%Y-%m-%d')}",
            html_content=report_html
        )
```

## 5. 共通機能

### 5.1. 統合認証管理

```python
class IntegrationAuthManager:
    """外部システム認証管理"""
    
    async def authenticate_system(self, system_id: str) -> str:
        """システム認証の実行"""
        auth_config = await self.get_auth_config(system_id)
        
        if auth_config.auth_type == 'oauth2':
            return await self.oauth2_authenticate(auth_config)
        elif auth_config.auth_type == 'api_key':
            return auth_config.api_key
        elif auth_config.auth_type == 'jwt':
            return await self.jwt_authenticate(auth_config)
        else:
            raise ValueError(f"Unsupported auth type: {auth_config.auth_type}")
```

### 5.2. エラーハンドリング・リトライ機構

```python
class IntegrationErrorHandler:
    """統合エラーハンドリング"""
    
    async def handle_integration_error(self, system_id: str, operation: str, error: Exception):
        """連携エラーの処理"""
        error_config = await self.get_error_config(system_id)
        
        # エラー分類
        if isinstance(error, httpx.TimeoutError):
            await self.handle_timeout_error(system_id, operation, error_config)
        elif isinstance(error, httpx.HTTPStatusError):
            await self.handle_http_error(system_id, operation, error, error_config)
        else:
            await self.handle_generic_error(system_id, operation, error, error_config)
    
    async def retry_with_backoff(self, func, max_retries: int = 3, backoff_factor: float = 2.0):
        """指数バックオフによるリトライ"""
        for attempt in range(max_retries):
            try:
                return await func()
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                
                wait_time = backoff_factor ** attempt
                await asyncio.sleep(wait_time)
```

### 5.3. データ変換・マッピング

```python
class DataTransformer:
    """データ変換エンジン"""
    
    def __init__(self):
        self.mapping_rules = self.load_mapping_rules()
        self.transformation_functions = self.load_transformation_functions()
    
    def transform_data(self, data: dict, source_system: str, target_system: str) -> dict:
        """データ変換の実行"""
        mapping_key = f"{source_system}_to_{target_system}"
        mapping = self.mapping_rules.get(mapping_key, {})
        
        transformed_data = {}
        for source_field, target_field in mapping.items():
            if '.' in target_field:
                # ネストした構造の処理
                self._set_nested_value(transformed_data, target_field, data.get(source_field))
            else:
                transformed_data[target_field] = data.get(source_field)
        
        return transformed_data
```

### 5.4. 監視・ログ

```python
class IntegrationMonitor:
    """連携監視"""
    
    async def log_integration_activity(self, system_id: str, operation: str, status: str, data: dict = None):
        """連携活動のログ記録"""
        log_entry = IntegrationLog(
            system_id=system_id,
            operation=operation,
            status=status,
            data=json.dumps(data) if data else None,
            timestamp=datetime.utcnow()
        )
        
        self.db.add(log_entry)
        await self.db.commit()
    
    async def check_system_health(self, system_id: str) -> dict:
        """システム健全性チェック"""
        try:
            client = self.get_system_client(system_id)
            response = await client.health_check()
            return {"status": "healthy", "response_time": response.elapsed.total_seconds()}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
```

## 6. 設定管理

### 6.1. 連携設定ファイル

```yaml
# integrations.yaml
integrations:
  wms:
    name: "在庫管理システム"
    type: "warehouse_management"
    auth:
      type: "api_key"
      api_key: "${WMS_API_KEY}"
    endpoints:
      base_url: "${WMS_BASE_URL}"
      stock_update: "/api/v1/stock"
      websocket: "wss://wms.example.com/ws/stock"
    sync_schedule:
      full_sync: "0 2 * * *"  # 毎日2時
      incremental_sync: "0 * * * *"  # 毎時
    retry_config:
      max_retries: 3
      backoff_factor: 2.0
      timeout: 30

  oms:
    name: "受注管理システム"
    type: "order_management"
    auth:
      type: "oauth2"
      client_id: "${OMS_CLIENT_ID}"
      client_secret: "${OMS_CLIENT_SECRET}"
    endpoints:
      base_url: "${OMS_BASE_URL}"
      create_order: "/api/v1/orders"
      update_status: "/api/v1/orders/{order_id}/status"
    webhooks:
      order_created: "/webhooks/oms/order"
      shipment_updated: "/webhooks/oms/shipment"
```

### 6.2. データマッピング設定

```json
{
  "data_mappings": {
    "wms_to_shopee": {
      "product_code": "sku",
      "available_quantity": "stock",
      "reserved_quantity": "reserved_stock",
      "warehouse_location": "location"
    },
    "shopee_to_oms": {
      "order_sn": "external_order_id",
      "buyer_username": "customer_name",
      "recipient_address": "shipping_address",
      "item_list": "order_items"
    },
    "pim_to_shopee": {
      "product_id": "sku",
      "name_ja": "product_name_ja",
      "name_en": "product_name_en",
      "category_code": "category_id",
      "price_jpy": "price"
    }
  }
}
```

## 7. セキュリティ要件

### 7.1. 認証・認可

- OAuth 2.0 / API Key による外部システム認証
- JWT トークンによる内部API認証
- IP制限・レート制限の実装
- 認証情報の暗号化保存

### 7.2. 通信セキュリティ

- HTTPS/WSS 通信の強制
- 証明書検証の実装
- API リクエスト署名の検証

### 7.3. データ保護

- 個人情報の仮名化・暗号化
- ログの個人情報マスキング
- データ保管期間の設定・自動削除

## 8. パフォーマンス要件

### 8.1. 処理性能

- API応答時間: 平均500ms以下
- バッチ処理: 10,000件/時間以上
- 同時接続数: 100接続以上

### 8.2. 可用性

- システム稼働率: 99.9%以上
- 故障時の自動復旧機能
- ヘルスチェック・監視機能

## 9. 運用・保守

### 9.1. 監視・アラート

- システム稼働状況の監視
- エラー率・応答時間の監視
- 外部システム接続状況の監視

### 9.2. ログ管理

- 構造化ログの出力
- ログローテーション機能
- エラーログの集約・分析

### 9.3. バックアップ・復旧

- 設定データのバックアップ
- 障害時の復旧手順
- データ整合性チェック機能

## 10. テスト要件

### 10.1. 単体テスト

- 各連携コンポーネントの単体テスト
- データ変換ロジックのテスト
- エラーハンドリングのテスト

### 10.2. 結合テスト

- 外部システムとの通信テスト
- エンドツーエンドの処理フローテスト
- 負荷テスト・性能テスト

### 10.3. モックテスト

- 外部API のモック作成
- オフライン環境でのテスト実行
- 異常系のテストシナリオ

## 11. 開発スケジュール

### フェーズ1 (4週間)
- 基盤アーキテクチャの構築
- 認証・エラーハンドリング機能
- WMS連携機能の実装

### フェーズ2 (3週間)  
- OMS・PIM連携機能の実装
- 価格管理システム連携
- 基本的な監視機能

### フェーズ3 (3週間)
- 画像管理・分析システム連携
- 通知機能の実装
- 包括的テストの実行

### フェーズ4 (2週間)
- 本番環境構築
- 運用ドキュメント整備
- リリース準備・移行作業

**総開発期間: 12週間（3ヶ月）**