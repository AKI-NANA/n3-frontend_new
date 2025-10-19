# 認証設定と実行スクリプト

import click
import uvicorn
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# 認証設定管理クラス
class AuthManager:
    def __init__(self, db: Session):
        self.db = db
    
    def setup_auth(self, country: str, partner_id: str, partner_key: str, 
                   shop_id: str, access_token: str, refresh_token: str, 
                   expires_in: int):
        """認証情報の設定"""
        try:
            # 既存の認証情報を確認
            existing_auth = self.db.query(ShopeeAuth).filter(
                ShopeeAuth.country == country.upper()
            ).first()
            
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            
            if existing_auth:
                # 更新
                existing_auth.access_token = access_token
                existing_auth.refresh_token = refresh_token
                existing_auth.expires_at = expires_at
                existing_auth.shop_id = shop_id
                existing_auth.partner_id = partner_id
                existing_auth.partner_key = partner_key
                existing_auth.updated_at = datetime.utcnow()
                
                print(f"✅ {country} の認証情報を更新しました")
            else:
                # 新規作成
                new_auth = ShopeeAuth(
                    country=country.upper(),
                    access_token=access_token,
                    refresh_token=refresh_token,
                    expires_at=expires_at,
                    shop_id=shop_id,
                    partner_id=partner_id,
                    partner_key=partner_key
                )
                self.db.add(new_auth)
                
                print(f"✅ {country} の認証情報を作成しました")
            
            self.db.commit()
            return True
            
        except Exception as e:
            self.db.rollback()
            print(f"❌ 認証設定エラー: {str(e)}")
            return False
    
    def list_auth(self):
        """認証情報の一覧表示"""
        auth_list = self.db.query(ShopeeAuth).all()
        
        if not auth_list:
            print("認証情報が設定されていません")
            return
        
        print("\n=== 認証情報一覧 ===")
        for auth in auth_list:
            status = "有効" if auth.expires_at > datetime.utcnow() else "期限切れ"
            print(f"国: {auth.country}")
            print(f"Partner ID: {auth.partner_id}")
            print(f"Shop ID: {auth.shop_id}")
            print(f"有効期限: {auth.expires_at} ({status})")
            print(f"最終更新: {auth.updated_at}")
            print("-" * 40)
    
    def check_token_status(self):
        """トークン状態の確認"""
        auth_list = self.db.query(ShopeeAuth).all()
        
        print("\n=== トークン状態確認 ===")
        for auth in auth_list:
            now = datetime.utcnow()
            remaining = auth.expires_at - now
            
            if remaining.total_seconds() > 0:
                hours = remaining.total_seconds() // 3600
                print(f"{auth.country}: 有効 (残り {hours:.1f} 時間)")
            else:
                print(f"{auth.country}: 期限切れ ({abs(remaining.days)} 日前に期限切れ)")

# データベース初期化
def init_database():
    """データベーステーブルの初期化"""
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ データベーステーブルを初期化しました")
        return True
    except Exception as e:
        print(f"❌ データベース初期化エラー: {str(e)}")
        return False

# CSVサンプル生成
def generate_sample_csv():
    """サンプルCSVファイルの生成"""
    sample_data = [
        {
            'sku': 'TEST001',
            'country': 'SG',
            'product_name_ja': 'テスト商品1',
            'product_name_en': 'Test Product 1',
            'price': 29.99,
            'stock': 100,
            'category_id': 100001,
            'image_url1': 'https://example.com/image1.jpg',
            'image_url2': 'https://example.com/image2.jpg'
        },
        {
            'sku': 'TEST002',
            'country': 'MY',
            'product_name_ja': 'テスト商品2',
            'product_name_en': 'Test Product 2',
            'price': 19.99,
            'stock': 50,
            'category_id': 100002,
            'image_url1': 'https://example.com/image3.jpg'
        }
    ]
    
    df = pd.DataFrame(sample_data)
    filename = 'sample_products.csv'
    df.to_csv(filename, index=False, encoding='utf-8-sig')
    print(f"✅ サンプルCSVファイルを生成しました: {filename}")

# コマンドラインインターフェース
@click.group()
def cli():
    """Shopee 7カ国対応 出品管理ツール"""
    pass

@cli.command()
@click.option('--country', required=True, help='国コード (SG, MY, TH, PH, ID, VN, TW)')
@click.option('--partner-id', required=True, help='Partner ID')
@click.option('--partner-key', required=True, help='Partner Key')
@click.option('--shop-id', required=True, help='Shop ID')
@click.option('--access-token', required=True, help='Access Token')
@click.option('--refresh-token', required=True, help='Refresh Token')
@click.option('--expires-in', default=3600, help='トークン有効期限（秒）')
def setup_auth(country, partner_id, partner_key, shop_id, access_token, refresh_token, expires_in):
    """認証情報の設定"""
    if country.upper() not in COUNTRY_CONFIGS:
        click.echo(f"❌ 無効な国コード: {country}")
        click.echo(f"有効な国コード: {list(COUNTRY_CONFIGS.keys())}")
        return
    
    db = SessionLocal()
    try:
        auth_manager = AuthManager(db)
        success = auth_manager.setup_auth(
            country, partner_id, partner_key, shop_id, 
            access_token, refresh_token, expires_in
        )
        
        if success:
            click.echo(f"✅ {country.upper()} の認証設定が完了しました")
        else:
            click.echo("❌ 認証設定に失敗しました")
    finally:
        db.close()

@cli.command()
def list_auth():
    """認証情報の一覧表示"""
    db = SessionLocal()
    try:
        auth_manager = AuthManager(db)
        auth_manager.list_auth()
    finally:
        db.close()

@cli.command()
def check_tokens():
    """トークン状態の確認"""
    db = SessionLocal()
    try:
        auth_manager = AuthManager(db)
        auth_manager.check_token_status()
    finally:
        db.close()

@cli.command()
def init_db():
    """データベースの初期化"""
    if init_database():
        click.echo("✅ データベースの初期化が完了しました")
    else:
        click.echo("❌ データベースの初期化に失敗しました")

@cli.command()
def generate_sample():
    """サンプルCSVの生成"""
    generate_sample_csv()

@cli.command()
@click.option('--host', default='127.0.0.1', help='ホストアドレス')
@click.option('--port', default=8000, help='ポート番号')
@click.option('--reload', is_flag=True, help='自動リロード（開発用）')
def run_server(host, port, reload):
    """APIサーバーの起動"""
    click.echo("🚀 Shopee 出品管理ツール API サーバーを起動中...")
    click.echo(f"📍 URL: http://{host}:{port}")
    click.echo(f"📖 API ドキュメント: http://{host}:{port}/docs")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )

@cli.command()
def run_worker():
    """Celeryワーカーの起動"""
    click.echo("🔄 Celery ワーカーを起動中...")
    os.system("celery -A main.celery_app worker --loglevel=info")

@cli.command()
@click.argument('csv_file')
@click.option('--country', help='特定の国のみ処理')
@click.option('--dry-run', is_flag=True, help='テスト実行（実際の登録は行わない）')
def process_csv(csv_file, country, dry_run):
    """CSVファイルの処理"""
    if not os.path.exists(csv_file):
        click.echo(f"❌ ファイルが見つかりません: {csv_file}")
        return
    
    db = SessionLocal()
    try:
        # CSVファイルを読み込み
        with open(csv_file, 'r', encoding='utf-8-sig') as f:
            content = f.read()
        
        processor = CSVProcessor(db)
        result = asyncio.run(processor.process_csv_file(content))
        
        if not result['success']:
            click.echo("❌ CSV処理エラー:")
            for error in result['errors']:
                click.echo(f"  - {error}")
            return
        
        # 結果表示
        summary = result['summary']
        click.echo("\n📊 処理結果:")
        click.echo(f"  総レコード数: {summary['total_records']}")
        click.echo(f"  新規商品: {summary['new_products']}")
        click.echo(f"  更新商品: {summary['updated_products']}")
        click.echo(f"  変更なし: {summary['unchanged_products']}")
        
        if dry_run:
            click.echo("\n🧪 ドライラン モード - 実際の処理は行われませんでした")
            return
        
        # 実際の処理を実行
        if summary['new_products'] > 0:
            click.echo(f"\n📤 {summary['new_products']} 件の商品を登録中...")
            # バックグラウンドタスクを同期実行
            task_result = process_product_batch(result['changes']['new'], 'add')
            click.echo(f"✅ 登録完了: {task_result['processed']} / {task_result['total']}")
            
            if task_result['errors']:
                click.echo("❌ エラー:")
                for error in task_result['errors']:
                    click.echo(f"  - {error}")
        
        if summary['updated_products'] > 0:
            click.echo(f"\n🔄 {summary['updated_products']} 件の商品を更新中...")
            task_result = process_product_batch(result['changes']['updated'], 'update')
            click.echo(f"✅ 更新完了: {task_result['processed']} / {task_result['total']}")
            
            if task_result['errors']:
                click.echo("❌ エラー:")
                for error in task_result['errors']:
                    click.echo(f"  - {error}")
        
    except Exception as e:
        click.echo(f"❌ 処理エラー: {str(e)}")
    finally:
        db.close()

# システム状態確認
@cli.command()
def status():
    """システム状態の確認"""
    click.echo("🔍 システム状態を確認中...")
    
    # データベース接続確認
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        click.echo("✅ データベース: 正常")
    except Exception as e:
        click.echo(f"❌ データベース: エラー ({str(e)})")
    
    # Redis接続確認
    try:
        redis_client.ping()
        click.echo("✅ Redis: 正常")
    except Exception as e:
        click.echo(f"❌ Redis: エラー ({str(e)})")
    
    # 認証状態確認
    db = SessionLocal()
    try:
        auth_count = db.query(ShopeeAuth).count()
        click.echo(f"📊 設定済み認証: {auth_count} カ国")
        
        # 有効なトークン数
        valid_tokens = db.query(ShopeeAuth).filter(
            ShopeeAuth.expires_at > datetime.utcnow()
        ).count()
        click.echo(f"🔑 有効なトークン: {valid_tokens} / {auth_count}")
        
    finally:
        db.close()

if __name__ == '__main__':
    cli()