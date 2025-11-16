import time
import random
from datetime import datetime, timedelta
# Firestore/Firebase Admin SDKの代わりに、動作シミュレーション用のモジュールをインポートします。
# 実際の環境では、firebase_adminライブラリやFirestore SDKを使用します。

# ==============================================================================
# グローバル設定とFirestore接続のシミュレーション
# ==============================================================================

# Canvas環境から提供されるグローバル変数を使用
APP_ID = 'default-app-id' # typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'
# FIREBASE_CONFIG = {} # typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {}

# Firestoreのコレクションパス定義 (指示書に基づきパブリックデータとして定義)
RESEARCH_REPO_PATH = f'artifacts/{APP_ID}/public/data/research_repository'

class FirestoreSimulator:
    """
    FirestoreへのCRUD操作とクエリをシミュレートするクラス。
    実際にはFirebase Admin SDKを使用して接続します。
    """
    def __init__(self):
        # データベースのインメモリ表現
        self.repository = {}
        print(f"[{datetime.now().strftime('%H:%M:%S')}] FirestoreSimulator初期化完了 (コレクション: {RESEARCH_REPO_PATH})")
        
    def add_document(self, doc_id, data):
        """ドキュメントを追加 (DBシード用)"""
        self.repository[doc_id] = data
        
    def query_documents(self, filters):
        """
        高性能なクエリとフィルタリング処理をシミュレートする (Supabase RPC相当)。
        フィルタリングされた生データセットを返します。
        """
        start_time = time.time()
        
        # 全データ取得 (実際はFirestoreクエリでフィルタリングしながら取得)
        results = list(self.repository.values())
        
        # 1. 期間フィルタリング
        if filters.get('period') and filters['period'] != 'all':
            days = int(filters['period'].replace('d', ''))
            date_limit = datetime.now() - timedelta(days=days)
            results = [
                doc for doc in results 
                if datetime.strptime(doc['researchDate'], '%Y-%m-%d') >= date_limit
            ]

        # 2. その他のフィルタリング
        if filters.get('dataSource'):
            results = [doc for doc in results if doc['dataSource'] == filters['dataSource']]
        if filters.get('veroRisk'):
            results = [doc for doc in results if doc['veroRisk'] == filters['veroRisk']]
        if filters.get('status'):
            results = [doc for doc in results if doc['status'] == filters['status']]

        end_time = time.time()
        query_time = (end_time - start_time) * 1000 # ミリ秒単位
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] RPCシミュレーション完了: {len(results)}件取得 (処理時間: {query_time:.2f}ms)")
        
        return results

# ==============================================================================
# II. データのシードとモック生成
# ==============================================================================

def generate_and_seed_data(db_simulator, count=500):
    """
    Research Repositoryにモックデータを生成し、DBシミュレーターに登録する関数。
    """
    statuses = ['Promoted', 'Rejected', 'Pending']
    veroRisks = ['リスク高', 'リスク中', 'リスク低']
    sources = ['eBay API', 'Amazon API', 'singlestar.jp', 'Mercari Scraper']
    htsCodes = ['8471.50', '9504.50', '8517.62', '8471.49', '9006.53', '9506.99', '8521.90', '9017.20', '8473.30', '9503.00']
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {count}件のリサーチリポジトリデータを生成中...")

    for i in range(1, count + 1):
        status = random.choice(statuses)
        veroRisk = random.choice(veroRisks)
        marketVolume = random.randint(50, 550)
        htsCode = random.choice(htsCodes)
        
        # 過去90日間の任意の日付を生成
        researchDate = (datetime.now() - timedelta(days=random.randint(0, 90))).strftime('%Y-%m-%d')

        doc_id = f"R{i:04d}"
        data = {
            'id': doc_id,
            'rawTitle': f"[Status:{status}] Item {i} for {random.choice(sources)}",
            'researchDate': researchDate,
            'dataSource': random.choice(sources),
            'veroRisk': veroRisk,
            'status': status,
            'marketVolume': marketVolume,
            'htsCode': htsCode,
            'geminiSupplier': f"Supplier {random.choice(['A', 'B', 'C'])} (Price: ¥{random.randint(1000, 5000)})",
            'claudeHTSLog': f"HTS code {htsCode} was derived based on the 'parts' classification logic.",
            'veroSafeTitle': f"Collectible Goods - Non-branded Item {i}",
        }
        db_simulator.add_document(doc_id, data)
        
    print(f"[{datetime.now().strftime('%H:%M:%S')}] データ生成とシード完了。")


# ==============================================================================
# RPCシミュレーションの実行関数 (メインAPIエンドポイント相当)
# ==============================================================================

def get_filtered_repository_data(db_simulator, filters):
    """
    フロントエンドからのリクエストを受け付け、DBへのクエリを実行し、結果を返す関数。
    
    Args:
        db_simulator (FirestoreSimulator): データベース接続インスタンス
        filters (dict): フロントエンドから渡されるフィルタ条件
        
    Returns:
        list: フィルタリングされたドキュメントのリスト
    """
    print(f"[{datetime.now().strftime('%H:%M:%S')}] RPC呼び出し: フィルタ条件 {filters}")
    
    # 実際には、ここで認証チェックや入力検証が行われます。
    
    filtered_data = db_simulator.query_documents(filters)
    
    return filtered_data

# ==============================================================================
# 実行例 (VPS上のPythonスクリプト実行シミュレーション)
# ==============================================================================

if __name__ == '__main__':
    
    # 1. データベースの初期化とデータ投入
    db_instance = FirestoreSimulator()
    generate_and_seed_data(db_instance, count=1000) # 1000件のデータをリポジトリに投入
    
    print("\n--- フロントエンドからのRPC呼び出しシミュレーション ---")

    # シナリオ1: 期間フィルタとステータスフィルタの組み合わせ
    scenario_1_filters = {
        'period': '30d',      # 直近30日間
        'status': 'Promoted', # Promotedのみ
        'dataSource': '',
        'veroRisk': '',
    }
    print("\n[シナリオ1] 直近30日間かつPromotedデータのみを要求...")
    data_s1 = get_filtered_repository_data(db_instance, scenario_1_filters)
    print(f"  -> シナリオ1結果件数: {len(data_s1)} 件")
    
    # シナリオ2: VEROリスク高と特定のモールに絞り込み
    scenario_2_filters = {
        'period': 'all',
        'status': '',
        'dataSource': 'eBay API',
        'veroRisk': 'リスク高',
    }
    print("\n[シナリオ2] 全期間かつeBay APIかつリスク高データを要求...")
    data_s2 = get_filtered_repository_data(db_instance, scenario_2_filters)
    print(f"  -> シナリオ2結果件数: {len(data_s2)} 件")
    
    # シナリオ3: 全期間、全データ
    scenario_3_filters = {
        'period': 'all',
        'status': '',
        'dataSource': '',
        'veroRisk': '',
    }
    print("\n[シナリオ3] 全期間の全リサーチデータを要求...")
    data_s3 = get_filtered_repository_data(db_instance, scenario_3_filters)
    print(f"  -> シナリオ3結果件数 (全件): {len(data_s3)} 件")
    
    print("\n--- RPCシミュレーション終了 ---")
