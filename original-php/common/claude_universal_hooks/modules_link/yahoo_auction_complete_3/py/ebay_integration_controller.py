# ファイル作成: ebay_integration_controller.py
# 目的: 全システム統合・ワークフロー管理

import logging
from database_connector import DatabaseManager
from multi_site_scraper import MultiSiteScraper
from translation_service import TranslationManager
from ebay_category_price_optimizer import EbayCategoryPriceOptimizer
from ebay_listing_manager import EbayListingManager
from inventory_monitor_advanced import InventoryMonitorAdvanced

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class EbayIntegrationController:
    def __init__(self):
        self.db_manager = DatabaseManager()
        self.scraper = MultiSiteScraper()
        self.translator = TranslationManager()
        self.optimizer = EbayCategoryPriceOptimizer()
        self.listing_manager = EbayListingManager()
        self.monitor = InventoryMonitorAdvanced()

    def run_full_workflow(self, yahoo_url, account_id):
        """
        スクレイピング→翻訳→出品の完全自動化ワークフロー
        """
        try:
            # 1. スクレイピング
            logging.info(f"✅ Step 1: ヤフオクURLからデータをスクレイピング...")
            scraped_data = self.scraper.scrape_yahoo_auction(yahoo_url)
            if 'error' in scraped_data:
                raise Exception(scraped_data['error'])
            
            # 2. データベース保存
            self.db_manager.save_listing(scraped_data)
            logging.info("✅ Step 2: データベースに保存しました。")

            # 3. 翻訳
            logging.info("✅ Step 3: 日本語情報を翻訳...")
            title_en, desc_en = self.translator.translate_product_info(scraped_data['title_jp'], scraped_data['description_jp'])
            scraped_data['title_en'] = title_en
            scraped_data['description_en'] = desc_en
            
            # 4. カテゴリ・価格最適化
            logging.info("✅ Step 4: カテゴリと価格を最適化...")
            optimized_data = self.optimizer.get_optimized_data(scraped_data)
            scraped_data.update(optimized_data)
            
            # 5. HTML説明文生成
            # ここでebay_description_generatorを呼び出す
            
            # 6. eBayへ出品
            logging.info("✅ Step 5: eBayへ出品...")
            listing_result = self.listing_manager.create_fixed_price_item(scraped_data, account_id)
            
            if listing_result['success']:
                # データベースのステータスを更新
                sql = "UPDATE listings SET status = 'listed', ebay_listing_url = %s WHERE yahoo_auction_id = %s;"
                self.db_manager.execute_query(sql, (listing_result['ebay_listing_url'], scraped_data['yahoo_auction_id']))
                logging.info("🎉 全ワークフロー完了！商品が正常に出品されました。")
            else:
                raise Exception(listing_result['error'])
                
        except Exception as e:
            logging.error(f"❌ ワークフロー実行中にエラーが発生しました: {e}")
            # エラーログをデータベースに記録
            # sql = "UPDATE listings SET status = 'error', error_log = %s WHERE yahoo_auction_id = %s;"
            # self.db_manager.execute_query(sql, (json.dumps({'error': str(e)}), scraped_data.get('yahoo_auction_id')))


    def run_batch_listing(self):
        """データベースの'validated'ステータスの商品を一括出品"""
        # ... バッチ処理ロジックをここに実装 ...
        pass