"""
完全統合リサーチシステム
Finding API + Shopping API + AI分析を一括実行

desktop-crawler/complete_research_system.py
"""

import asyncio
from typing import List, Dict, Optional
from datetime import datetime
import os
from dotenv import load_dotenv

from ebay_finding_api import EbayFindingClient  # 既存
from ebay_shopping_api import EbayShoppingClient
from ai_classifier_with_filters import AIClassifierWithFilters
from supabase import create_client, Client


class CompleteResearchSystem:
    """完全統合リサーチシステム"""
    
    def __init__(
        self,
        ebay_app_id: str,
        anthropic_key: str,
        supabase_url: str,
        supabase_key: str
    ):
        self.finding_client = EbayFindingClient(ebay_app_id)
        self.shopping_client = EbayShoppingClient(ebay_app_id)
        self.ai_classifier = AIClassifierWithFilters(
            anthropic_key,
            supabase_url,
            supabase_key
        )
        self.supabase: Client = create_client(supabase_url, supabase_key)
    
    async def research(
        self,
        keywords: str,
        limit: int = 100,
        enable_ai_analysis: bool = True
    ) -> Dict:
        """
        完全リサーチ実行
        
        Args:
            keywords: 検索キーワード
            limit: 取得件数
            enable_ai_analysis: AI分析を実行するか
            
        Returns:
            {
                'total_products': 100,
                'ai_analyzed': 100,
                'summary': {...}
            }
        """
        
        print("\n" + "="*60)
        print(f"🚀 完全リサーチ開始: {keywords}")
        print("="*60)
        
        # Phase 1: Finding API で基本検索
        print("\n【Phase 1】Finding API - 商品検索")
        products = await self._finding_search(keywords, limit)
        
        if not products:
            print("❌ 商品が見つかりませんでした")
            return {'total_products': 0, 'ai_analyzed': 0}
        
        # Phase 2: Shopping API で詳細取得
        print("\n【Phase 2】Shopping API - 詳細情報取得")
        shopping_details = await self._shopping_details(products)
        
        # Phase 3: データ統合・DB保存
        print("\n【Phase 3】データ統合・DB保存")
        await self._save_products(products, shopping_details)
        
        # Phase 4: AI分析（オプション）
        if enable_ai_analysis:
            print("\n【Phase 4】AI分析実行")
            ai_results = await self._ai_analysis(products, shopping_details)
        else:
            ai_results = []
            print("\n【Phase 4】AI分析スキップ")
        
        # サマリー作成
        summary = self._create_summary(products, ai_results)
        
        print("\n" + "="*60)
        print("🎉 完全リサーチ完了！")
        print("="*60)
        print(f"✅ 取得商品数: {summary['total_products']}")
        print(f"✅ AI分析数: {summary['ai_analyzed']}")
        print(f"✅ 危険物: {summary['hazardous_count']}")
        print(f"✅ VEROリスク高: {summary['vero_high_count']}")
        print("="*60 + "\n")
        
        return summary
    
    async def _finding_search(self, keywords: str, limit: int) -> List[Dict]:
        """Finding API検索"""
        
        products = await self.finding_client.search(keywords, limit)
        print(f"✅ {len(products)}件取得")
        
        return products
    
    async def _shopping_details(self, products: List[Dict]) -> Dict[str, Dict]:
        """Shopping API詳細取得"""
        
        item_ids = [p['ebay_item_id'] for p in products]
        
        async with self.shopping_client:
            details_list = await self.shopping_client.get_items_in_batches(
                item_ids,
                batch_size=20
            )
        
        # 辞書化
        details_dict = {
            d['ebay_item_id']: d
            for d in details_list
        }
        
        print(f"✅ {len(details_dict)}/{len(item_ids)}件の詳細取得")
        
        return details_dict
    
    async def _save_products(
        self,
        products: List[Dict],
        shopping_details: Dict[str, Dict]
    ):
        """商品データをDBに保存"""
        
        # メインテーブル保存
        for product in products:
            ebay_item_id = product['ebay_item_id']
            
            # メインデータ
            main_data = {
                'ebay_item_id': ebay_item_id,
                'title': product['title'],
                'category_id': product.get('category_id'),
                'category_name': product.get('category_name'),
                'current_price': product['current_price'],
                'currency': product.get('currency', 'USD'),
                'shipping_cost': product.get('shipping_cost', 0),
                'listing_type': product.get('listing_type'),
                'condition': product.get('condition'),
                'item_url': product['item_url'],
                'primary_image_url': product.get('primary_image_url'),
                'seller_username': product['seller_username'],
                'seller_country': product.get('seller_country'),
                'seller_feedback_score': product.get('seller_feedback_score'),
                'seller_positive_percentage': product.get('seller_positive_percentage'),
                'search_query': product.get('search_query'),
            }
            
            try:
                self.supabase.table('research_products_master').upsert(
                    main_data,
                    on_conflict='ebay_item_id'
                ).execute()
            except Exception as e:
                print(f"❌ メイン保存エラー {ebay_item_id}: {e}")
            
            # Shopping詳細保存
            if ebay_item_id in shopping_details:
                shopping_data = {
                    'ebay_item_id': ebay_item_id,
                    **shopping_details[ebay_item_id]
                }
                
                # JSONBフィールド処理
                shopping_data['picture_urls'] = self._to_jsonb(shopping_data.get('picture_urls', []))
                shopping_data['item_specifics'] = self._to_jsonb(shopping_data.get('item_specifics', {}))
                shopping_data['return_policy'] = self._to_jsonb(shopping_data.get('return_policy', {}))
                shopping_data['shipping_info'] = self._to_jsonb(shopping_data.get('shipping_info', {}))
                
                try:
                    self.supabase.table('research_shopping_details').upsert(
                        shopping_data,
                        on_conflict='ebay_item_id'
                    ).execute()
                except Exception as e:
                    print(f"❌ Shopping保存エラー {ebay_item_id}: {e}")
        
        print(f"💾 DB保存完了: {len(products)}件")
    
    async def _ai_analysis(
        self,
        products: List[Dict],
        shopping_details: Dict[str, Dict]
    ) -> List[Dict]:
        """AI分析実行"""
        
        analysis_data = []
        
        for product in products:
            item_id = product['ebay_item_id']
            shopping = shopping_details.get(item_id, {})
            
            analysis_data.append({
                'ebay_item_id': item_id,
                'title': product['title'],
                'category_id': product.get('category_id'),
                'category_name': product.get('category_name'),
                'item_specifics': shopping.get('item_specifics', {}),
                'description': shopping.get('description', '')
            })
        
        # 5件ずつバッチ処理
        results = await self.ai_classifier.batch_classify(
            analysis_data,
            batch_size=5
        )
        
        return results
    
    def _create_summary(self, products: List[Dict], ai_results: List[Dict]) -> Dict:
        """サマリー作成"""
        
        summary = {
            'total_products': len(products),
            'ai_analyzed': len(ai_results),
            'hazardous_count': sum(1 for r in ai_results if r.get('is_hazardous')),
            'prohibited_count': sum(1 for r in ai_results if r.get('is_prohibited')),
            'vero_high_count': sum(1 for r in ai_results if r.get('vero_risk') == 'high'),
            'patent_high_count': sum(1 for r in ai_results if r.get('patent_troll_risk') == 'high'),
            'origin_cn_count': sum(1 for r in ai_results if r.get('origin_country') == 'CN'),
            'timestamp': datetime.now().isoformat()
        }
        
        return summary
    
    def _to_jsonb(self, data):
        """JSONB用にデータを変換"""
        import json
        if isinstance(data, (dict, list)):
            return json.dumps(data, ensure_ascii=False)
        return data


# メイン実行
async def main():
    load_dotenv()
    
    system = CompleteResearchSystem(
        ebay_app_id=os.getenv('EBAY_APP_ID'),
        anthropic_key=os.getenv('ANTHROPIC_API_KEY'),
        supabase_url=os.getenv('SUPABASE_URL'),
        supabase_key=os.getenv('SUPABASE_SERVICE_KEY')
    )
    
    # テスト実行
    result = await system.research(
        keywords="vintage camera",
        limit=20,
        enable_ai_analysis=True
    )
    
    print("\n📊 最終結果:")
    import json
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
