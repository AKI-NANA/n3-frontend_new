import time
import random
import json
from datetime import datetime

# ==============================================================================
# 外部ツール: Google Search APIのシミュレーション (必須)
# 実際の環境ではこの関数がGoogleのAPIを呼び出します
# ==============================================================================

def google_search_ec_sites(product_name, is_image_search=False):
    """
    商品名と型番で主要ECサイトを検索し、価格候補を抽出するシミュレーション。
    画像解析による検索もこのツールで抽象化されます。
    """
    query = f"最安値 {product_name} Amazon 楽天 Yahoo!ショッピング"
    if is_image_search:
        query = f"類似商品 ネット通販 {product_name}"
    
    # Google Search Toolの呼び出し
    print(f"-> Google Search Tool呼び出し: '{query}'")
    
    # 実際にはここで google:search(queries=[query]) が実行され、結果が解析される
    
    # シミュレーション結果
    time.sleep(1) # API遅延をシミュレート
    
    # 検索結果から抽出されたと仮定される最安値候補
    candidate_price = random.randint(5000, 30000)
    supplier_url = f"https://www.{random.choice(['amazon', 'rakuten', 'yahoo'])}.co.jp/item/{product_name.replace(' ', '_')}"
    
    return candidate_price, supplier_url

# ==============================================================================
# I. スコア計算ロジック ($U_i = P + S$)
# ==============================================================================

class ScoreCalculator:
    """
    リサーチ結果とAI特定価格に基づき、最終的なUiスコアを計算する。
    """
    
    def __init__(self, avg_domestic_shipping=800, max_ui_score=100):
        self.avg_domestic_shipping = avg_domestic_shipping # 指示書 II. 推定国内送料
        self.MAX_SCORE = max_ui_score
    
    def calculate_profitability(self, candidate_price, sold_price_avg):
        """
        利益性 (P) スコアを計算する。P1(利益額), P2(利益率)を抽象化。
        
        Args:
            candidate_price (int): AIが特定した仮原価。
            sold_price_avg (int): eBayの平均SOLD価格（推定販売価格）。
        
        Returns:
            float: 利益性スコア (P)。
        """
        # 総仕入れコスト (Cost) = 仮原価 + 推定国内送料
        total_cost = candidate_price + self.avg_domestic_shipping
        
        # 推定利益額 (P1)
        # eBay手数料や国際送料はここでは固定値として無視し、シンプルな利益額を算出
        estimated_profit = sold_price_avg * 0.85 - total_cost 
        
        # 推定利益率 (P2)
        estimated_profit_rate = (estimated_profit / sold_price_avg) if sold_price_avg > 0 else 0
        
        # スコア化 (利益額が大きいほど、利益率が高いほどスコアが高くなる)
        # 利益額と利益率の重み付けでPスコアを決定
        if estimated_profit < 500:
            P_score = 0
        else:
            P_score = min(50, estimated_profit_rate * 100) + min(50, estimated_profit / 1000)
        
        return min(P_score, self.MAX_SCORE) / 2 # Pカテゴリは最大50点とする
        
    def calculate_scarcity(self, temp_ui_score, confidence_score):
        """
        希少性 (S) スコアを計算し、S9 (特定信頼度) をリスクペナルティに反映させる。
        
        Args:
            temp_ui_score (float): 仕入れ先未定時に算出された暫定Uiスコア。
            confidence_score (float): AIが特定した価格の信頼度 (0.0 - 1.0)。
            
        Returns:
            float: 希少性スコア (S)。
        """
        # 暫定スコアの希少性部分をベースとする（約50%がP、50%がSと仮定）
        base_S_score = temp_ui_score * 0.5 
        
        # S9: 特定信頼度スコアによるリスクペナルティ乗数 (M_Penalty)
        # 信頼度が低いほどペナルティが大きい
        penalty_multiplier = (confidence_score ** 2) # 信頼度0.8 -> 0.64 (36%減)
        
        S_score = base_S_score * penalty_multiplier
        
        return min(S_score, self.MAX_SCORE) / 2 # Sカテゴリは最大50点とする
        
    def calculate_final_ui(self, item):
        """
        最終Uiスコアを計算し、AI解析後のデータとして返却する。
        """
        if not item.get('aiCandidatePrice') or not item.get('confidenceScore'):
            return item['tempUiScore'] # AI解析前の暫定スコアを返す
        
        # SOLD価格の平均をシミュレーションデータから取得（ここでは固定値）
        # 実際にはeBay APIから取得した値がDBに格納されている
        sold_price_avg = item['soldCount'] * 1500 + 10000 
        
        P = self.calculate_profitability(item['aiCandidatePrice'], sold_price_avg)
        S = self.calculate_scarcity(item['tempUiScore'], item['confidenceScore'])
        
        final_score = P + S
        
        return round(min(final_score, self.MAX_SCORE), 1)

# ==============================================================================
# II. AI解析機能の改良 (仕入れ先特定モジュール)
# ==============================================================================

class AISupplierFinder:
    """
    仕入れ先候補の探索と価格特定を行うモジュール。
    """
    
    def __init__(self):
        # 探索ロジックの優先順位: 商品名・型番 -> 画像解析 -> DB照合 (ここではGoogle Searchに抽象化)
        pass
    
    def identify_supplier(self, product_id, product_name):
        """
        AIが仕入れ先候補を特定するコアロジック。
        
        Args:
            product_id (str): 商品ID (eBay IDなど)
            product_name (str): 検索に使用する商品名/型番
            
        Returns:
            dict: 必須取得データを含む辞書
        """
        print(f"\n--- AI解析開始: {product_id} ({product_name}) ---")
        
        # 1. 商品名・型番での検索 (Google Search API使用)
        candidate_price, supplier_url = google_search_ec_sites(product_name, is_image_search=False)
        
        # 2. 画像解析による検索 (ここでは信頼度を上げる要素としてシミュレート)
        # 実際には画像データをBase64でAPIに渡し、画像検索を行う
        
        # 3. 特定信頼度スコアの計算
        # 検索結果の質、画像一致度などを元に算出（ここではランダム生成）
        confidence_score = round(random.uniform(0.70, 0.99), 2)
        
        # 4. 推定国内送料 (固定値を使用)
        estimated_shipping = 800 # ScoreCalculatorクラスと合わせる
        
        # 5. 在庫確認日時
        inventory_check_time = datetime.now().isoformat()
        
        # 必須取得データとDBへの蓄積データ
        result = {
            'aiCandidatePrice': candidate_price,
            'estimatedDomesticShipping': estimated_shipping,
            'supplierUrl': supplier_url,
            'confidenceScore': confidence_score,
            'inventoryCheckTime': inventory_check_time,
            'aiCostStatus': True,
        }
        
        print(f"--- AI解析完了: 価格 ¥{candidate_price}, 信頼度 {confidence_score*100:.1f}% ---")
        return result

# ==============================================================================
# III. バッチ処理機能 (VPS上の自動リサーチジョブをシミュレート)
# ==============================================================================

class BatchProcessor:
    """
    リサーチ結果DBからAI解析対象を選別し、順次処理を行うバッチ処理クラス。
    データ重複防止と管理フラグのロジックを含む。
    """
    
    def __init__(self, db_simulator):
        self.db = db_simulator # Firestore DBのシミュレーションインスタンス
        self.ai_finder = AISupplierFinder()
        self.score_calc = ScoreCalculator()
        self.BATCH_SIZE = 5 # 一度に処理する件数 (指示書 I. 1. バッチ処理の設計)
    
    def _fetch_queued_items(self):
        """
        DBから research_status が 'AI_QUEUED' のデータを取得する。
        """
        print(f"\n[DB] 'AI_QUEUED' のデータを最大 {self.BATCH_SIZE} 件取得中...")
        queued_items = [
            item for item in self.db.get_all_data() 
            if item['researchStatus'] == 'AI_QUEUED'
        ][:self.BATCH_SIZE]
        
        print(f"[DB] {len(queued_items)} 件の処理対象が見つかりました。")
        return queued_items
    
    def run_ai_job(self):
        """
        AI仕入れ先特定モジュールを実行し、スコアリングまで行うメインのジョブ。
        """
        items_to_process = self._fetch_queued_items()
        
        if not items_to_process:
            print("[JOB] 処理すべきAIキューがありません。ジョブを終了します。")
            return
            
        print(f"[JOB] AI解析ジョブを開始します。処理件数: {len(items_to_process)}")
        
        for item in items_to_process:
            product_id = item['id']
            product_name = item['productName']
            
            # 1. AI仕入れ先特定モジュールの実行
            ai_results = self.ai_finder.identify_supplier(product_id, product_name)
            
            # 2. 最終スコアの計算
            # AIの結果を一時的に商品データにマージしてスコア計算に渡す
            item.update(ai_results) 
            final_ui_score = self.score_calc.calculate_final_ui(item)
            
            # 3. DBへの蓄積と管理フラグの更新
            update_data = {
                **ai_results, # 候補価格、URL、信頼度スコアなどが含まれる
                'finalUiScore': final_ui_score,
                'researchStatus': 'AI_COMPLETED', # 状態を完了に更新
                # last_research_date はAI_QUEUEDに送られた時に更新済みだが、再更新しても良い
            }
            
            self.db.update_item_status(product_id, update_data)
            print(f"[DB] {product_id} のAI解析が完了し、DBを更新しました。最終Ui: {final_ui_score:.1f}")
        
        print("\n[JOB] AI解析バッチジョブが完了しました。")


# ==============================================================================
# DBシミュレーター (Firestoreのデータ構造と管理フラグを再現)
# ==============================================================================
# フロントエンドの初期モックデータと同じ構造を再現

class DBSimulator:
    """
    Firestore DBの CRUD 操作と管理フラグをシミュレートするインメモリクラス。
    """
    
    def __init__(self):
        self._db = {}
        self.seed_mock_data()
        
    def seed_mock_data(self):
        """フロントエンドで使用した初期データと管理フラグを投入"""
        initial_mock_data = [
            {'id': 'EB1001', 'productName': 'アンティーク腕時計 XYZ-1950', 'soldCount': 15, 'currentCompetitors': 3, 'tempUiScore': 88.5, 'researchStatus': 'NEW', 'aiCostStatus': False, 'lastResearchDate': '2025-11-01'},
            {'id': 'EB1002', 'productName': '限定版フィギュア ZZZ-007', 'soldCount': 5, 'currentCompetitors': 10, 'tempUiScore': 45.2, 'researchStatus': 'SCORED', 'aiCostStatus': False, 'lastResearchDate': '2025-11-02'},
            {'id': 'EB1003', 'productName': '高性能ドローン MAV-PRO', 'soldCount': 22, 'currentCompetitors': 2, 'tempUiScore': 92.1, 'researchStatus': 'AI_COMPLETED', 'aiCostStatus': True, 'lastResearchDate': '2025-11-03', 'aiCandidatePrice': 15000, 'supplierUrl': 'https://supplier.co.jp/drone', 'confidenceScore': 0.95, 'finalUiScore': 95.8},
            {'id': 'EB1004', 'productName': 'ヴィンテージカメラ Canon QL', 'soldCount': 8, 'currentCompetitors': 5, 'tempUiScore': 78.9, 'researchStatus': 'AI_QUEUED', 'aiCostStatus': False, 'lastResearchDate': '2025-11-04'}, # <- AI解析キューに入っている
            {'id': 'EB1005', 'productName': '最新ゲーム機アクセサリー', 'soldCount': 40, 'currentCompetitors': 20, 'tempUiScore': 55.0, 'researchStatus': 'SCORED', 'aiCostStatus': False, 'lastResearchDate': '2025-11-05'},
            {'id': 'EB1006', 'productName': '希少コミック全巻セット', 'soldCount': 1, 'currentCompetitors': 1, 'tempUiScore': 96.0, 'researchStatus': 'AI_QUEUED', 'aiCostStatus': False, 'lastResearchDate': '2025-11-05'}, # <- AI解析キューに入っている
        ]
        
        for item in initial_mock_data:
            self._db[item['id']] = item
        print(f"[DB] 初期モックデータを {len(self._db)} 件投入しました。")

    def get_all_data(self):
        """全てのデータをリストとして取得"""
        return list(self._db.values())

    def update_item_status(self, item_id, data_to_update):
        """特定のアイテムのステータスを更新"""
        if item_id in self._db:
            self._db[item_id].update(data_to_update)
            return True
        return False
        
    def print_db_status(self):
        """現在のDBの状態を出力"""
        print("\n=============================================")
        print("          DB (Firestore) 現在のステータス          ")
        print("=============================================")
        for item in self.get_all_data():
            final_ui = item.get('finalUiScore', 'N/A')
            ai_price = f"¥{item.get('aiCandidatePrice', 0):,}" if item.get('aiCostStatus') else '未定'
            print(f"ID: {item['id']} | Status: {item['researchStatus']:<15} | AI Cost: {ai_price:<10} | Final Ui: {final_ui}")
        print("=============================================\n")

# ==============================================================================
# メイン実行 (ジョブの実行シミュレーション)
# ==============================================================================

if __name__ == "__main__":
    
    # データベースの初期化と状態確認
    db = DBSimulator()
    db.print_db_status()
    
    # バッチプロセッサーの初期化
    processor = BatchProcessor(db)
    
    # --- 1. AI解析バッチジョブの実行 ---
    print(">>> AI解析バッチジョブを実行します (VPS上のCronジョブをシミュレート)")
    processor.run_ai_job()
    
    # --- 2. 処理後の状態確認 ---
    print("\n>>> AI解析後のDBステータスを確認 (EB1004, EB1006が更新されているはず)")
    db.print_db_status()
    
    # --- 3. 2回目のジョブ実行 (キューが空であることを確認) ---
    print("\n>>> 2回目のAI解析バッチジョブを実行します (キューが空であることを確認)")
    processor.run_ai_job()

    # --- 4. 特定アイテムのデータ構造の例 ---
    # AI_COMPLETEDになったアイテムの構造を確認
    completed_item = db._db.get('EB1006')
    if completed_item:
        print("\n--- EB1006 (AI_COMPLETED) のデータ構造詳細 ---")
        print(json.dumps(completed_item, indent=4, ensure_ascii=False))
        
        # 最終Uiスコア計算ロジックへの反映確認
        if completed_item.get('finalUiScore') and completed_item.get('confidenceScore'):
            print(f"\n[検証] 最終Uiスコアは {completed_item['finalUiScore']:.1f} です。")
            print(f"[検証] 特定信頼度 {completed_item['confidenceScore']:.2f} が反映されています。")
