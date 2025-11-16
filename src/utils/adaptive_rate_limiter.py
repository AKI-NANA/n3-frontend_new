import time
from typing import Callable, Any

# IV. 🛠️ 既存ツールへの修正指示 2. APIレートリミット制御の最適化

class AdaptiveRateLimiter:
    """
    Amazon APIなどの外部API呼び出しにおいて、レートリミットエラー(429)が発生した場合に
    自動で遅延時間(Sleep)を延長し、処理の継続性を確保するためのロジック。
    
    ロジック:
    - 連続エラー発生時、遅延時間（sleep）を初期値から指数関数的または倍率で延長する。
    - 成功した場合、遅延時間を初期値に戻す（または徐々に戻す）。
    """
    
    def __init__(self, initial_delay: float = 5.0, max_delay: float = 60.0, backoff_factor: float = 2.0):
        """
        初期化
        :param initial_delay: API呼び出し間の初期遅延時間（秒）。
        :param max_delay: 遅延時間の最大値（秒）。
        :param backoff_factor: エラー発生時に遅延時間を増やす係数。
        """
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.backoff_factor = backoff_factor
        
        # 現在適用されている遅延時間
        self.current_delay = initial_delay
        # 連続エラー回数
        self.error_count = 0
        # 連続エラーと判断するためのエラーコード（Amazon APIのレートリミットは通常429）
        self.rate_limit_error_code = 429

    def _wait(self):
        """現在の遅延時間だけ処理を停止する"""
        print(f"--- [遅延処理] {self.current_delay:.2f}秒待機します...")
        time.sleep(self.current_delay)

    def _increase_delay(self):
        """遅延時間を増加させる（指数的バックオフ）"""
        self.error_count += 1
        # 遅延時間を増加させる: current_delay * backoff_factor
        new_delay = self.current_delay * self.backoff_factor
        
        # 最大遅延時間でクリッピング
        self.current_delay = min(new_delay, self.max_delay)
        print(f"--- [遅延増加] 連続エラー {self.error_count} 回。遅延を {self.current_delay:.2f} 秒に延長しました。")

    def _reset_delay(self):
        """遅延時間とエラーカウントをリセットする"""
        if self.error_count > 0:
            print(f"--- [リセット] 処理成功。遅延を初期値 {self.initial_delay:.2f} 秒にリセットします。")
            
        self.current_delay = self.initial_delay
        self.error_count = 0

    def execute_with_retry(self, api_call_func: Callable[[], Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        API呼び出しを実行し、レートリミットエラーの場合にアダプティブ遅延を適用する。
        
        :param api_call_func: 実行したいAPI呼び出し関数（戻り値はレスポンス辞書を想定）。
        :return: 成功した場合はレスポンスデータ、失敗した場合は None。
        """
        max_retries = 5  # 最大リトライ回数
        retries = 0
        
        # 初期遅延（前回の処理が成功していれば初期値、失敗していれば延長値）
        self._wait() 

        while retries < max_retries:
            try:
                # 1. API呼び出し実行
                response = api_call_func()
                
                # 2. 正常系処理
                if response.get("status_code") == 200:
                    print(f"--- [成功] API呼び出しに成功しました (試行回数: {retries + 1})。")
                    self._reset_delay()
                    return response
                
                # 3. レートリミットエラー検出
                elif response.get("status_code") == self.rate_limit_error_code:
                    print(f"--- [エラー] レートリミットエラー (429) を検出しました。")
                    self._increase_delay() # 遅延時間を増加
                    retries += 1
                    
                    if retries < max_retries:
                        self._wait() # 増加した遅延時間で再度待機
                    else:
                        print("--- [失敗] 最大リトライ回数に到達。このASINの処理をスキップします。")
                        return None
                        
                # 4. その他のエラー（致命的なエラーとみなし、リトライせずに終了）
                else:
                    print(f"--- [致命的エラー] ステータスコード {response.get('status_code')} を検出。処理を中止します。")
                    self._reset_delay()
                    return None
                    
            except Exception as e:
                print(f"--- [例外エラー] API呼び出し中に予期せぬエラーが発生しました: {e}")
                # 予期せぬエラーの場合もバックオフを適用し、継続性を確保する
                self._increase_delay()
                retries += 1
                if retries < max_retries:
                     self._wait()
                else:
                    print("--- [失敗] 最大リトライ回数に到達。処理をスキップします。")
                    return None

        return None


# --- 使用例のシミュレーション ---

def simulate_amazon_api_call(call_number: int) -> Dict[str, Any]:
    """
    Amazon API呼び出しをシミュレートするダミー関数。
    - 1, 2, 3回目: レートリミットエラー (429)
    - 4回目: 成功 (200)
    - 5回目以降: 成功 (200)
    """
    global API_CALL_COUNT
    API_CALL_COUNT += 1
    
    print(f"\n[API 呼び出し #{API_CALL_COUNT}] 処理開始...")

    if API_CALL_COUNT in [1, 2, 3]:
        # レートリミット超過をシミュレーション
        return {"status_code": 429, "data": None}
    elif API_CALL_COUNT == 10:
        # 別の致命的なエラーをシミュレーション
        return {"status_code": 500, "data": None}
    else:
        # 成功をシミュレーション
        return {"status_code": 200, "data": f"ASINデータ更新成功 (Call {API_CALL_COUNT})"}

# グローバルカウンター（API呼び出しの回数を追跡）
API_CALL_COUNT = 0

if __name__ == "__main__":
    # レートリミッターインスタンスを作成: 初期遅延5秒、最大60秒、バックオフ係数2.0
    limiter = AdaptiveRateLimiter(initial_delay=5.0, max_delay=60.0, backoff_factor=2.0)
    
    print("--- Amazon Updater Batch 処理開始 ---")
    
    # シミュレーション 1: 連続エラーと復帰
    # 1, 2, 3回目でエラーが発生し、遅延時間が 5s -> 10s -> 20s と延長し、4回目で成功する
    print("\n[シナリオ 1] 連続エラーによる遅延延長と成功")
    result_1 = limiter.execute_with_retry(lambda: simulate_amazon_api_call(1))
    result_2 = limiter.execute_with_retry(lambda: simulate_amazon_api_call(2))
    result_3 = limiter.execute_with_retry(lambda: simulate_amazon_api_call(3))
    result_4 = limiter.execute_with_retry(lambda: simulate_amazon_api_call(4)) 

    # シミュレーション 2: 成功後の初期化
    # 成功したため、遅延時間が5秒にリセットされていることを確認
    print("\n[シナリオ 2] 成功後の処理（遅延リセット確認）")
    result_5 = limiter.execute_with_retry(lambda: simulate_amazon_api_call(5)) 
    
    # シミュレーション 3: 致命的エラー
    print("\n[シナリオ 3] 致命的エラー (500) による即時中止")
    result_10 = limiter.execute_with_retry(lambda: simulate_amazon_api_call(10)) 
    
    print("\n--- シミュレーション終了 ---")
