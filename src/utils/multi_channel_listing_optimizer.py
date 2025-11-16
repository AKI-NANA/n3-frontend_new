import random
from typing import Dict, Any, List, Optional, Tuple

# --- データ構造の定義（シミュレーション用ダミーデータ） ---

# SKUマスターテーブルのデータ構造
SKU_MASTER: Dict[str, Any] = {
    "SKU1001": {
        "Item_ID": "ITM001",
        "Category": "Figure",  # カテゴリ
        "Condition": "New",  # 状態
        "HTS_Code": "9503.00.00",  # HTSコード（輸出入コード）
        "Stock": 5,  # 在庫数
        "Ui_Score": 15000,  # 基本U_iスコア
        # 出品済み情報（フェーズ1-Aのチェック用）: 'モール名_アカウントID_出品ID'
        "Listing_Info": None 
    },
    "SKU1002": {
        "Item_ID": "ITM002",
        "Category": "Apparel",
        "Condition": "Used",
        "HTS_Code": "6203.42.40",
        "Stock": 0,  # 在庫ゼロ
        "Ui_Score": 20000,
        "Listing_Info": None
    },
    "SKU1003": {
        "Item_ID": "ITM003",
        "Category": "TradingCard",
        "Condition": "New",
        "HTS_Code": "9504.40.00",
        "Stock": 10,
        "Ui_Score": -50000,  # スコアが非常に低い
        "Listing_Info": None
    },
    "SKU1004": {
        "Item_ID": "ITM004",
        "Category": "Watch",
        "Condition": "New",
        "HTS_Code": "9101.11.00",
        "Stock": 2,
        "Ui_Score": 60000,
        # すでに別アカウントで出品済みをシミュレーション
        "Listing_Info": "eBay_ACC-B_EID789" 
    },
}

# ユーザーの多販路戦略設定（UI/UX修正指示 IIIに基づく）
USER_STRATEGY_SETTINGS: Dict[str, Any] = {
    "System_Min_Ui_Score": -10000,  # C. 在庫/スコアフィルタ
    
    # D. カテゴリ・モール限定（ルールベースホワイトリスト）
    "Category_Whitelist": {
        "Figure": ["Amazon_ACC-A", "eBay_ACC-B", "MercadoLibre_ACC-L"],
        "TradingCard": ["TCGplayer_ACC-T", "CardMarket_ACC-C"],
    },
    
    # E. アカウント専門化
    "Account_Specialization": {
        "Amazon_ACC-C": ["Apparel"],  # Amazon C はアパレル専門
    },
    
    # F. スコア下限設定 (モール/アカウント別)
    "Mall_Min_Ui_Score": {
        "Chrono24_ACC-R": 50000,  # Chrono24は50000点以上のみ
        "eBay_ACC-B": 10000,
    },
    
    # フェーズ3: モール別スコアブースト M_Mall
    "Mall_Boost_Factor": {
        "Amazon_ACC-A": 1.2,  # 実績が良いので1.2倍
        "eBay_ACC-B": 1.0,
        "MercadoLibre_ACC-L": 1.1,
        "Chrono24_ACC-R": 1.5, # 時計専門モールなので高ブースト
        "TCGplayer_ACC-T": 1.0,
        "CardMarket_ACC-C": 1.0,
        "Amazon_ACC-C": 1.0,
    }
}

# モール規約フィルタ（B. モール規約フィルタのシミュレーション）
MALL_REGULATIONS: Dict[str, Any] = {
    "MercadoLibre": {"Category_Exclusion": ["Watch"]},  # 時計は出品不可
    "Chrono24": {"Category_Inclusion": ["Watch"]},  # 時計カテゴリのみ
    "Amazon": {"HTS_Exclusion": ["6203.42.40"]}, # 特定のHTSコードはAmazon全体で規制
}

# すべての出品可能チャンネル
ALL_CHANNELS = [
    "Amazon_ACC-A", "Amazon_ACC-C", "eBay_ACC-A", "eBay_ACC-B", 
    "MercadoLibre_ACC-L", "Chrono24_ACC-R", "TCGplayer_ACC-T", "CardMarket_ACC-C"
]

class ListingOptimizer:
    """
    開発指示書 II. コアロジック：出品先決定の3フェーズ処理 を実行するクラス
    """
    
    def __init__(self, sku_data: Dict[str, Any], settings: Dict[str, Any]):
        self.sku_data = sku_data
        self.settings = settings
        self.listing_candidates: List[str] = ALL_CHANNELS.copy()
        self.exclusion_log: Dict[str, str] = {}
    
    def _log_exclusion(self, channel: str, reason: str):
        """チャンネルを出品候補から除外し、その理由を記録する"""
        if channel in self.listing_candidates:
            self.listing_candidates.remove(channel)
            self.exclusion_log[channel] = reason

    def phase_1_system_constraints(self) -> None:
        """
        フェーズ 1: システム制約と出品可否の判断（自動排除）
        """
        print("\n--- [フェーズ 1: システム制約 (自動排除)] ---")
        item_id = self.sku_data["Item_ID"]
        category = self.sku_data["Category"]
        hts_code = self.sku_data["HTS_Code"]
        stock = self.sku_data["Stock"]
        ui_score = self.sku_data["Ui_Score"]
        
        # C. 在庫/スコアフィルタ（全モール対象の自動排除）
        if stock == 0:
            reason = "在庫数がゼロのため、全モールから除外"
            print(f"❌ 全モール除外: {reason}")
            self.listing_candidates = []
            return
        
        if ui_score < self.settings["System_Min_Ui_Score"]:
            reason = f"U_iスコア ({ui_score}) がシステム最低ライン ({self.settings['System_Min_Ui_Score']}) を下回るため、全モールから除外"
            print(f"❌ 全モール除外: {reason}")
            self.listing_candidates = []
            return

        # A. アカウント重複禁止（最優先）
        listing_info = self.sku_data.get("Listing_Info")
        if listing_info:
            listed_mall, listed_acc, _ = listing_info.split("_")
            print(f"⚠️ Item_ID ({item_id}) は既に {listed_mall} の {listed_acc} で出品済みです。")
            
            channels_to_exclude = []
            for channel in self.listing_candidates:
                mall, acc = channel.split("_")
                if mall == listed_mall and acc != listed_acc:
                    # 同じモール内の他のアカウントは全て除外
                    channels_to_exclude.append(channel)
            
            for channel in channels_to_exclude:
                self._log_exclusion(channel, f"アカウント重複禁止: {listed_mall} の {listed_acc} で既に排他的出品済み")

        # B. モール規約フィルタ
        channels_to_exclude = []
        for channel in self.listing_candidates:
            mall, _ = channel.split("_")
            regulation = MALL_REGULATIONS.get(mall, {})
            
            # カテゴリ規制
            if category in regulation.get("Category_Exclusion", []):
                self._log_exclusion(channel, f"モール規約違反: カテゴリ '{category}' は {mall} で出品規制")
            if regulation.get("Category_Inclusion") and category not in regulation["Category_Inclusion"]:
                self._log_exclusion(channel, f"モール規約違反: {mall} はカテゴリ '{category}' 以外の出品を許可しない")
            
            # HTSコード規制
            if hts_code in regulation.get("HTS_Exclusion", []):
                self._log_exclusion(channel, f"モール規約違反: HTSコード '{hts_code}' は {mall} で出品規制")
    
    def phase_2_user_strategy(self) -> None:
        """
        フェーズ 2: ユーザー戦略の適用（戦略的フィルタリング）
        """
        print("\n--- [フェーズ 2: ユーザー戦略 (戦略的フィルタリング)] ---")
        category = self.sku_data["Category"]
        
        channels_to_exclude = []
        for channel in self.listing_candidates:
            mall, account = channel.split("_")
            
            # D. カテゴリ・モール限定（ルールベースホワイトリスト）
            whitelist = self.settings["Category_Whitelist"].get(category)
            if whitelist is not None and channel not in whitelist:
                self._log_exclusion(channel, f"戦略フィルタ: カテゴリ '{category}' の出品先ホワイトリスト ({','.join(whitelist)}) に含まれない")
                continue
            
            # E. アカウント専門化
            specialized_categories = self.settings["Account_Specialization"].get(channel)
            if specialized_categories is not None and category not in specialized_categories:
                self._log_exclusion(channel, f"戦略フィルタ: アカウント専門化ルールにより、{account} は '{category}' 以外の出品をしない")
                continue

            # F. スコア下限設定（モール/アカウント別）
            min_score = self.settings["Mall_Min_Ui_Score"].get(channel, self.settings["System_Min_Ui_Score"])
            if self.sku_data["Ui_Score"] < min_score:
                self._log_exclusion(channel, f"戦略フィルタ: U_iスコア ({self.sku_data['Ui_Score']}) がモール別最低ライン ({min_score}) を下回る")
                continue

    def phase_3_optimization_and_execution(self) -> Tuple[Optional[str], List[Dict[str, Any]]]:
        """
        フェーズ 3: 最適化と排他的出品実行（U_i,Mallによる決定）
        """
        print("\n--- [フェーズ 3: 最適化と排他的出品実行] ---")
        
        if not self.listing_candidates:
            print("🛑 出品可能なチャンネルが残っていません。出品は中止されます。")
            return None, self._generate_final_list()
        
        # モール別スコアの計算: U_i,Mall = U_i * M_Mall
        ui_base = self.sku_data["Ui_Score"]
        score_details = []
        
        for channel in self.listing_candidates:
            boost = self.settings["Mall_Boost_Factor"].get(channel, 1.0)
            ui_mall_score = ui_base * boost
            
            score_details.append({
                "Channel": channel,
                "Ui_Mall_Score": ui_mall_score,
                "Boost_Factor": boost
            })
        
        # 出品先決定: U_i,Mall スコアが最も高いチャンネルを第一出品先とする
        best_channel = max(score_details, key=lambda x: x["Ui_Mall_Score"])
        
        print(f"✅ 最適出品先決定: {best_channel['Channel']}")
        print(f"   ∟ 最終スコア (U_i,Mall): {best_channel['Ui_Mall_Score']:.2f} (ベース {ui_base} x ブースト {best_channel['Boost_Factor']})")
        
        # 実行シミュレーション（排他的ロックの徹底）
        self.simulate_exclusive_lock(best_channel['Channel'], self.sku_data["Item_ID"])
        
        # 第一出品先以外は排他的ロックにより除外として記録
        for detail in score_details:
            if detail["Channel"] != best_channel["Channel"]:
                self._log_exclusion(detail["Channel"], f"排他的出品実行: {best_channel['Channel']} が最適出品先として選ばれたため")
        
        return best_channel["Channel"], self._generate_final_list(best_channel["Channel"])

    def simulate_exclusive_lock(self, channel: str, item_id: str):
        """
        IV. 既存ツールの修正指示 1. 排他的ロックの徹底
        出品成功時、DBのSKU_MasterテーブルのItem_IDフィールドに書き込みをシミュレート
        """
        mall, account = channel.split("_")
        listing_id = f"LID{random.randint(1000, 9999)}"
        new_listing_info = f"{mall}_{account}_{listing_id}"
        
        # DB書き込みシミュレーション
        self.sku_data["Listing_Info"] = new_listing_info
        
        print(f"   ∟ 排他的ロック発動: SKU_MasterのItem_ID='{item_id}'に'{new_listing_info}'を書き込みました。")

    def _generate_final_list(self, final_winner: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        IV. 既存ツールの修正指示 2. 出品可能先の表示 のための最終リストを生成
        """
        final_list = []
        
        # 出品候補に残ったチャンネル（出品可能と判断された）
        for channel in ALL_CHANNELS:
            status = "❌ 出品不可"
            reason = self.exclusion_log.get(channel)
            
            if final_winner and channel == final_winner:
                status = "🟢 出品決定"
                reason = "最終最適化スコアに基づき決定"
            elif channel in self.listing_candidates:
                # フェーズ2まで通過したが、フェーズ3で排他的ロックにより除外されたケースは既にログに記録済み
                pass
            
            if status == "❌ 出品不可":
                final_list.append({"Channel": channel, "Status": status, "Reason": reason})
            elif status == "🟢 出品決定":
                final_list.append({"Channel": channel, "Status": status, "Reason": reason})
            else:
                # フィルタリングを通過したが、最終決定/ロックのステップに至らなかった場合（理論上はありえないが安全のため）
                 final_list.append({"Channel": channel, "Status": "⚠️ 候補に残ったが未出品", "Reason": "排他的ロックの競合に敗れた可能性があります"})
                 
        return final_list

    def process_sku(self) -> Tuple[Optional[str], List[Dict[str, Any]]]:
        """SKUの出品先決定プロセス全体を実行する"""
        print(f"==========================================")
        print(f"SKU処理開始: {self.sku_data['Item_ID']} ({self.sku_data['Category']})")
        print(f"U_iスコア: {self.sku_data['Ui_Score']}")
        print(f"==========================================")
        
        # 1. フェーズ1実行
        self.phase_1_system_constraints()
        print(f"\n[中間結果 1] フェーズ1通過チャンネル: {len(self.listing_candidates)} / {len(ALL_CHANNELS)} チャンネル")
        
        # 2. フェーズ2実行
        if self.listing_candidates:
            self.phase_2_user_strategy()
        print(f"\n[中間結果 2] フェーズ2通過チャンネル: {len(self.listing_candidates)} チャンネル")
        
        # 3. フェーズ3実行
        winner, final_list = self.phase_3_optimization_and_execution()
        
        return winner, final_list

# --- シミュレーション実行 ---

def run_simulation(sku_id: str):
    """個別のSKUでシミュレーションを実行し、結果を出力する"""
    sku_data = SKU_MASTER[sku_id]
    
    optimizer = ListingOptimizer(sku_data.copy(), USER_STRATEGY_SETTINGS) # コピーを渡して元のデータは変更しない
    
    winner, final_list = optimizer.process_sku()
    
    print("\n\n--- 最終結果サマリー (データ編集画面の表示シミュレーション) ---")
    print(f"SKU: {sku_id}, Item_ID: {sku_data['Item_ID']}")
    print(f"最終決定チャンネル: {winner if winner else 'なし'}")
    print("-" * 50)
    
    # IV. 既存ツールの修正指示 2. 出品可能先の表示
    for entry in final_list:
        if entry["Status"] == "🟢 出品決定":
             print(f"{entry['Status']:<10} {entry['Channel']:<20} 理由: {entry['Reason']}")
        elif entry["Status"] == "❌ 出品不可":
             print(f"{entry['Status']:<10} {entry['Channel']:<20} 理由: {entry['Reason']}")
        else:
             print(f"{entry['Status']:<10} {entry['Channel']:<20} 理由: {entry['Reason']}")


# SKU1001: フィギュア（ホワイトリスト適用）
run_simulation("SKU1001") 

print("\n" + "=" * 80 + "\n")

# SKU1003: スコア低、全モール排除（-50000点）
run_simulation("SKU1003")

print("\n" + "=" * 80 + "\n")

# SKU1004: 時計、既にeBayで出品済み
run_simulation("SKU1004")

# SKU1002: アパレル（在庫ゼロで全モール除外）
# run_simulation("SKU1002")
