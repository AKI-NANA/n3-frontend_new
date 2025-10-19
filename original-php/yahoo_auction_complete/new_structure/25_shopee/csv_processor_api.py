# CSV処理機能とAPIエンドポイント

import os
import hashlib
from typing import List, Dict, Any
from fastapi import UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import pandas as pd
import json

# CSV処理クラス
class CSVProcessor:
    def __init__(self, db: Session):
        self.db = db
        self.required_columns = [
            'sku', 'country', 'product_name_ja', 'product_name_en',
            'price', 'stock', 'category_id'
        ]
    
    def validate_csv_format(self, df: pd.DataFrame) -> List[str]:
        """CSVフォーマットの検証"""
        errors = []
        
        # 必須カラムの確認
        missing_columns = [col for col in self.required_columns if col not in df.columns]
        if missing_columns:
            errors.append(f"必須カラムが不足しています: {missing_columns}")
        
        # 国コードの確認
        if 'country' in df.columns:
            invalid_countries = df[~df['country'].isin(COUNTRY_CONFIGS.keys())]['country'].unique()
            if len(invalid_countries) > 0:
                errors.append(f"無効な国コード: {invalid_countries.tolist()}")
        
        # 数値フィールドの確認
        numeric_fields = ['price', 'stock', 'category_id']
        for field in numeric_fields:
            if field in df.columns:
                non_numeric = df[pd.to_numeric(df[field], errors='coerce').isna() & df[field].notna()]
                if not non_numeric.empty:
                    errors.append(f"{field}に数値以外の値があります: 行 {non_numeric.index.tolist()}")
        
        return errors
    
    def parse_image_urls(self, row: pd.Series) -> List[str]:
        """画像URLを解析"""
        image_urls = []
        for i in range(1, 10):  # image_url1 から image_url9 まで対応
            col_name = f'image_url{i}'
            if col_name in row and pd.notna(row[col_name]) and row[col_name].strip():
                image_urls.append(row[col_name].strip())
        return image_urls
    
    def detect_changes(self, new_data: List[Dict], existing_products: Dict[str, Product]) -> Dict[str, List[Dict]]:
        """変更の検出"""
        changes = {
            'new': [],
            'updated': [],
            'unchanged': []
        }
        
        for item in new_data:
            key = f"{item['sku']}_{item['country']}"
            existing = existing_products.get(key)
            
            if not existing:
                changes['new'].append(item)
            else:
                # 変更の確認
                fields_to_check = ['price', 'stock', 'product_name_ja', 'product_name_en']
                has_changes = False
                
                for field in fields_to_check:
                    if getattr(existing, field) != item[field]:
                        has_changes = True
                        break
                
                # 画像URLの比較
                existing_images = json.loads(existing.images) if existing.images else []
                if existing_images != item['image_urls']:
                    has_changes = True
                
                if has_changes:
                    item['existing_id'] = existing.id
                    item['shopee_item_id'] = existing.shopee_item_id
                    changes['updated'].append(item)
                else:
                    changes['unchanged'].append(item)
        
        return changes
    
    async def process_csv_file(self, file_content: str) -> Dict[str, Any]:
        """CSVファイルの処理"""
        try:
            # CSVを読み込み
            df = pd.read_csv(pd.StringIO(file_content))
            df.columns = df.columns.str.strip()  # カラム名の空白を削除
            
            # フォーマット検証
            validation_errors = self.validate_csv_format(df)
            if validation_errors:
                return {"success": False, "errors": validation_errors}
            
            # データの変換
            processed_data = []
            for _, row in df.iterrows():
                try:
                    item_data = {
                        'sku': str(row['sku']).strip(),
                        'country': str(row['country']).upper().strip(),
                        'product_name_ja': str(row['product_name_ja']).strip(),
                        'product_name_en': str(row['product_name_en']).strip(),
                        'price': float(row['price']),
                        'stock': int(row['stock']),
                        'category_id': int(row['category_id']),
                        'image_urls': self.parse_image_urls(row)
                    }
                    processed_data.append(item_data)
                except Exception as e:
                    return {
                        "success": False, 
                        "errors": [f"行 {_+2} の処理エラー: {str(e)}"]
                    }
            
            # 既存商品との比較
            existing_products = {}
            for product in self.db.query(Product).all():
                key = f"{product.sku}_{product.country}"
                existing_products[key] = product
            
            changes = self.detect_changes(processed_data, existing_products)
            
            return {
                "success": True,
                "summary": {
                    "total_records": len(processed_data),
                    "new_products": len(changes['new']),
                    "updated_products": len(changes['updated']),
                    "unchanged_products": len(changes['unchanged'])
                },
                "changes": changes
            }
            
        except Exception as e:
            logger.error(f"CSV処理エラー: {str(e)}")
            return {"success": False, "errors": [f"CSV処理エラー: {str(e)}"]}

# バックグラウンドタスク
@celery_app.task
def process_product_batch(product_list: List[Dict], operation: str):
    """商品の一括処理（バックグラウンドタスク）"""
    db = SessionLocal()
    try:
        processed = 0
        errors = []
        
        for product_data in product_list:
            try:
                country = product_data['country']
                client = ShopeeAPIClient(country, db)
                
                if operation == 'add':
                    # 商品追加
                    response = asyncio.run(client.add_product(ProductData(**product_data)))
                    
                    if response.get('error') == '':
                        # データベースに保存
                        new_product = Product(
                            sku=product_data['sku'],
                            country=country,
                            product_name_ja=product_data['product_name_ja'],
                            product_name_en=product_data['product_name_en'],
                            price=product_data['price'],
                            stock=product_data['stock'],
                            category_id=product_data['category_id'],
                            shopee_item_id=str(response['response']['item_id']),
                            images=json.dumps(product_data['image_urls']),
                            status='uploaded'
                        )
                        db.add(new_product)
                        processed += 1
                    else:
                        errors.append(f"SKU {product_data['sku']}: {response.get('message', 'エラー')}")
                
                elif operation == 'update':
                    # 商品更新
                    update_data = ProductUpdate(
                        price=product_data.get('price'),
                        stock=product_data.get('stock'),
                        product_name_ja=product_data.get('product_name_ja'),
                        product_name_en=product_data.get('product_name_en')
                    )
                    
                    response = asyncio.run(client.update_product(
                        product_data['shopee_item_id'], 
                        update_data
                    ))
                    
                    if response.get('error') == '':
                        # データベースを更新
                        existing_product = db.query(Product).filter(
                            Product.id == product_data['existing_id']
                        ).first()
                        
                        if existing_product:
                            existing_product.price = product_data.get('price', existing_product.price)
                            existing_product.stock = product_data.get('stock', existing_product.stock)
                            existing_product.product_name_ja = product_data.get('product_name_ja', existing_product.product_name_ja)
                            existing_product.product_name_en = product_data.get('product_name_en', existing_product.product_name_en)
                            existing_product.images = json.dumps(product_data['image_urls'])
                            existing_product.status = 'uploaded'
                            existing_product.updated_at = datetime.utcnow()
                            
                        processed += 1
                    else:
                        errors.append(f"SKU {product_data['sku']}: {response.get('message', 'エラー')}")
                
                # レート制限対応（1秒間に10リクエストまで）
                await asyncio.sleep(0.1)
                
            except Exception as e:
                errors.append(f"SKU {product_data['sku']}: {str(e)}")
                logger.error(f"商品処理エラー: {str(e)}")
        
        db.commit()
        
        return {
            'processed': processed,
            'errors': errors,
            'total': len(product_list)
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"バッチ処理エラー: {str(e)}")
        return {'processed': 0, 'errors': [str(e)], 'total': len(product_list)}
    finally:
        db.close()

# APIエンドポイント
@app.post("/api/products/upload-csv")
async def upload_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    auto_process: bool = False,
    db: Session = Depends(get_db)
):
    """CSVファイルのアップロードと処理"""
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="CSVファイルのみ対応しています")
    
    try:
        # ファイル内容を読み取り
        content = await file.read()
        file_content = content.decode('utf-8-sig')  # BOM対応
        
        # CSV処理
        processor = CSVProcessor(db)
        result = await processor.process_csv_file(file_content)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['errors'])
        
        # 自動処理が有効な場合、バックグラウンドで実行
        if auto_process:
            if result['changes']['new']:
                background_tasks.add_task(
                    process_product_batch, 
                    result['changes']['new'], 
                    'add'
                )
            
            if result['changes']['updated']:
                background_tasks.add_task(
                    process_product_batch, 
                    result['changes']['updated'], 
                    'update'
                )
        
        return {
            "message": "CSVファイルの処理が完了しました",
            "summary": result['summary'],
            "auto_processing": auto_process
        }
        
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="ファイルエンコーディングエラー。UTF-8またはShift_JISで保存してください")
    except Exception as e:
        logger.error(f"CSV アップロードエラー: {str(e)}")
        raise HTTPException(status_code=500, detail=f"処理エラー: {str(e)}")

@app.post("/api/products/add")
@rate_limit(max_requests=10, time_window=1)
async def add_product(
    product_data: ProductData,
    db: Session = Depends(get_db)
):
    """単一商品の追加"""
    try:
        client = ShopeeAPIClient(product_data.country, db)
        response = await client.add_product(product_data)
        
        if response.get('error') == '':
            # データベースに保存
            new_product = Product(
                sku=product_data.sku,
                country=product_data.country,
                product_name_ja=product_data.product_name_ja,
                product_name_en=product_data.product_name_en,
                price=product_data.price,
                stock=product_data.stock,
                category_id=product_data.category_id,
                shopee_item_id=str(response['response']['item_id']),
                images=json.dumps(product_data.image_urls),
                status='uploaded'
            )
            db.add(new_product)
            db.commit()
            
            return {"success": True, "item_id": response['response']['item_id']}
        else:
            raise HTTPException(status_code=400, detail=response.get('message', 'API エラー'))
            
    except Exception as e:
        logger.error(f"商品追加エラー: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/products/{product_id}")
@rate_limit(max_requests=10, time_window=1)
async def update_product(
    product_id: int,
    update_data: ProductUpdate,
    db: Session = Depends(get_db)
):
    """商品の更新"""
    try:
        # 既存商品を取得
        existing_product = db.query(Product).filter(Product.id == product_id).first()
        if not existing_product:
            raise HTTPException(status_code=404, detail="商品が見つかりません")
        
        if not existing_product.shopee_item_id:
            raise HTTPException(status_code=400, detail="Shopee商品IDが設定されていません")
        
        client = ShopeeAPIClient(existing_product.country, db)
        response = await client.update_product(existing_product.shopee_item_id, update_data)
        
        if response.get('error') == '':
            # データベースを更新
            if update_data.price is not None:
                existing_product.price = update_data.price
            if update_data.stock is not None:
                existing_product.stock = update_data.stock
            if update_data.product_name_ja is not None:
                existing_product.product_name_ja = update_data.product_name_ja
            if update_data.product_name_en is not None:
                existing_product.product_name_en = update_data.product_name_en
                
            existing_product.status = 'uploaded'
            existing_product.updated_at = datetime.utcnow()
            db.commit()
            
            return {"success": True, "message": "商品が更新されました"}
        else:
            raise HTTPException(status_code=400, detail=response.get('message', 'API エラー'))
            
    except Exception as e:
        logger.error(f"商品更新エラー: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products")
async def get_products(
    country: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """商品一覧の取得"""
    query = db.query(Product)
    
    if country:
        query = query.filter(Product.country == country.upper())
    if status:
        query = query.filter(Product.status == status)
    
    products = query.offset(skip).limit(limit).all()
    total = query.count()
    
    return {
        "products": [
            {
                "id": p.id,
                "sku": p.sku,
                "country": p.country,
                "product_name_ja": p.product_name_ja,
                "product_name_en": p.product_name_en,
                "price": p.price,
                "stock": p.stock,
                "status": p.status,
                "shopee_item_id": p.shopee_item_id,
                "created_at": p.created_at,
                "updated_at": p.updated_at
            } for p in products
        ],
        "total": total,
        "page": skip // limit + 1,
        "pages": (total + limit - 1) // limit
    }

@app.get("/api/logs")
async def get_api_logs(
    country: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """APIログの取得"""
    query = db.query(ApiLog).order_by(ApiLog.created_at.desc())
    
    if country:
        query = query.filter(ApiLog.country == country.upper())
    
    logs = query.offset(skip).limit(limit).all()
    
    return {
        "logs": [
            {
                "id": log.id,
                "country": log.country,
                "endpoint": log.endpoint,
                "method": log.method,
                "status_code": log.status_code,
                "execution_time": log.execution_time,
                "error_message": log.error_message,
                "created_at": log.created_at
            } for log in logs
        ]
    }

# ヘルスチェック
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}