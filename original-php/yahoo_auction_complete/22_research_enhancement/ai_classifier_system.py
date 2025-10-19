"""
AI分類システム - 既存フィルターDB活用版
desktop-crawler/ai_classifier_with_filters.py
"""

from anthropic import Anthropic
from supabase import create_client, Client
import json
import os
from typing import Dict, List, Optional
from datetime import datetime


class AIClassifierWithFilters:
    """既存フィルターDB活用AI分類システム"""
    
    def __init__(self, anthropic_key: str, supabase_url: str, supabase_key: str):
        self.ai = Anthropic(api_key=anthropic_key)
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        # ブランド→原産国マッピング
        self.brand_origin_map = {
            'Nikon': 'JP', 'Canon': 'JP', 'Sony': 'JP', 'Panasonic': 'JP',
            'Nintendo': 'JP', 'Toyota': 'JP', 'Honda': 'JP', 'Yamaha': 'JP',
            'Apple': 'US', 'Nike': 'US', 'Microsoft': 'US', 'Intel': 'US',
            'Adidas': 'DE', 'BMW': 'DE', 'Mercedes': 'DE', 'Bosch': 'DE',
            'Samsung': 'KR', 'LG': 'KR', 'Hyundai': 'KR',
            'Xiaomi': 'CN', 'Huawei': 'CN', 'DJI': 'CN', 'Lenovo': 'CN',
        }
    
    async def classify_product(
        self,
        ebay_item_id: str,
        title: str,
        category_id: str,
        category_name: str,
        item_specifics: Optional[Dict] = None,
        description: Optional[str] = None
    ) -> Dict:
        """
        商品を完全分類
        
        Returns:
            {
                'hs_code': '9006.40',
                'origin_country': 'CN',
                'is_hazardous': False,
                'vero_risk': 'low',
                ...
            }
        """
        
        print(f"🤖 AI分類開始: {title[:50]}...")
        
        # Step 1: AI基本分類
        ai_result = await self._ai_classify(
            title, category_id, category_name, item_specifics, description
        )
        
        # Step 2: 既存フィルターDB検索・判定
        filter_results = await self._check_filters(
            title=title,
            hs_code=ai_result['hs_code'],
            brand=self._extract_brand(item_specifics),
            category=category_name
        )
        
        # Step 3: 結果統合
        complete_result = {
            'ebay_item_id': ebay_item_id,
            **ai_result,
            **filter_results
        }
        
        # Step 4: DB保存
        await self._save_to_db(complete_result)
        
        print(f"✅ AI分類完了: HS={ai_result['hs_code']}, 原産国={ai_result['origin_country']}")
        
        return complete_result
    
    async def _ai_classify(
        self,
        title: str,
        category_id: str,
        category_name: str,
        item_specifics: Optional[Dict],
        description: Optional[str]
    ) -> Dict:
        """AI基本分類（HSコード・原産国必須）"""
        
        # Item Specificsから情報抽出
        specifics_text = ""
        if item_specifics:
            specifics_text = "\n".join([
                f"- {k}: {', '.join(v) if isinstance(v, list) else v}"
                for k, v in item_specifics.items()
            ])
        
        # ブランド推測
        brand = self._extract_brand(item_specifics)
        suggested_origin = self.brand_origin_map.get(brand, 'CN')
        
        prompt = f"""商品を分類してください。

【商品情報】
タイトル: {title}
カテゴリ: {category_name} (ID: {category_id})

【商品仕様】
{specifics_text if specifics_text else '情報なし'}

【商品説明】
{description[:500] if description else '情報なし'}

---

🔥 重要な注意事項:

1. **HSコードは必須**（6桁以上）
   - 商品の主要用途で判定
   - カメラなら9006、衣類なら6100番台

2. **原産国も必須**
   - Item SpecificsのMade in、Country of Manufactureを最優先
   - ブランド名から推測（検出ブランド: {brand}, 推測原産国: {suggested_origin}）
   - 商品説明から推測
   - **不明な場合は必ず「CN」（中国）を返す**
   - 絶対に空白やnullにしない

3. **原産国がCNの場合、関税率が最も高くなるので安全**

---

以下の形式でJSON回答してください：

{{
  "hs_code": "9006.40",
  "hs_description": "インスタントカメラ",
  "hs_confidence": 0.95,
  
  "origin_country": "CN",
  "origin_source": "default_cn",
  "origin_reasoning": "原産国情報なし、安全のためCNに設定",
  "origin_confidence": 0.5,
  
  "estimated_dimensions": {{
    "length": 15,
    "width": 10,
    "height": 8
  }},
  "estimated_weight_kg": 0.5,
  "size_confidence": 0.6,
  "size_source": "ai_estimate"
}}

origin_sourceの値:
- "item_specifics": Item Specificsに記載あり
- "brand_mapping": ブランド名から推測
- "ai_detected": 商品名・説明から推測
- "default_cn": 不明のためCN設定（最も安全）
"""
        
        try:
            response = self.ai.messages.create(
                model="claude-sonnet-4-5-20250929",
                max_tokens=1500,
                temperature=0,
                messages=[{"role": "user", "content": prompt}]
            )
            
            result = json.loads(response.content[0].text)
            
            # 🔥 原産国の検証・強制設定
            if not result.get('origin_country') or result.get('origin_country').strip() == '':
                result['origin_country'] = 'CN'
                result['origin_source'] = 'default_cn'
                result['origin_reasoning'] = '原産国不明のため安全策としてCN設定'
                result['origin_confidence'] = 0.3
            
            return result
            
        except Exception as e:
            print(f"❌ AI分類エラー: {e}")
            # エラー時のデフォルト値
            return {
                'hs_code': '9999.99',
                'hs_description': 'AI分類失敗',
                'hs_confidence': 0.0,
                'origin_country': 'CN',
                'origin_source': 'default_cn',
                'origin_reasoning': 'AI分類エラーのためデフォルトCN',
                'origin_confidence': 0.0,
                'estimated_dimensions': {'length': 20, 'width': 15, 'height': 10},
                'estimated_weight_kg': 1.0,
                'size_confidence': 0.3,
                'size_source': 'default_estimate'
            }
    
    async def _check_filters(
        self,
        title: str,
        hs_code: str,
        brand: str,
        category: str
    ) -> Dict:
        """既存フィルターDB検索・判定結果を返す"""
        
        title_lower = title.lower()
        
        # 🔥 危険物チェック
        is_hazardous = False
        hazard_matched = []
        hazard_type = None
        
        # 危険物キーワードチェック（簡易版 - 実際はDBから取得）
        hazard_keywords = {
            'lithium_battery': ['battery', 'rechargeable', 'lithium', 'li-ion', 'power bank'],
            'flammable': ['perfume', 'cologne', 'nail polish', 'lighter', 'alcohol'],
            'liquid': ['liquid', 'lotion', 'cream', 'oil', 'serum'],
            'powder': ['powder', 'supplement', 'protein']
        }
        
        for h_type, keywords in hazard_keywords.items():
            for keyword in keywords:
                if keyword in title_lower:
                    is_hazardous = True
                    hazard_matched.append(keyword)
                    hazard_type = h_type
                    break
        
        # 🔥 禁制品チェック
        is_prohibited = False
        prohibited_matched = []
        
        prohibited_keywords = ['gun', 'weapon', 'knife', 'drug', 'prescription', 'replica']
        for keyword in prohibited_keywords:
            if keyword in title_lower:
                is_prohibited = True
                prohibited_matched.append(keyword)
        
        # 🔥 VEROチェック
        vero_brands = [
            'Disney', 'Marvel', 'Nintendo', 'Nike', 'Apple',
            'Louis Vuitton', 'Gucci', 'Chanel', 'Rolex', 'LEGO'
        ]
        vero_risk = 'low'
        vero_matched = None
        
        for vero_brand in vero_brands:
            if vero_brand.lower() in title_lower or vero_brand == brand:
                vero_risk = 'high'
                vero_matched = vero_brand
                break
        
        # 🔥 航空便制限チェック
        air_shippable = not is_hazardous  # 危険物は航空便NG
        air_matched = hazard_matched if not air_shippable else []
        
        # 🔥 特許リスクチェック
        patent_categories = ['Electronics', 'Computers', 'Cell Phones', 'Video Games']
        patent_risk = 'high' if any(cat in category for cat in patent_categories) else 'low'
        patent_matched = category if patent_risk == 'high' else None
        
        # 判定結果を返す（蓄積用）
        return {
            'is_hazardous': is_hazardous,
            'hazard_type': hazard_type,
            'hazard_keywords_matched': hazard_matched,
            'hazard_checked_at': datetime.now().isoformat(),
            
            'is_prohibited': is_prohibited,
            'prohibited_reason': ', '.join(prohibited_matched) if prohibited_matched else None,
            'prohibited_keywords_matched': prohibited_matched,
            'prohibited_checked_at': datetime.now().isoformat(),
            
            'vero_risk': vero_risk,
            'vero_brand_matched': vero_matched,
            'vero_checked_at': datetime.now().isoformat(),
            
            'air_shippable': air_shippable,
            'air_restriction_reason': ', '.join(air_matched) if air_matched else None,
            'air_restriction_keywords_matched': air_matched,
            'air_checked_at': datetime.now().isoformat(),
            
            'patent_troll_risk': patent_risk,
            'patent_category_matched': patent_matched,
            'patent_checked_at': datetime.now().isoformat(),
        }
    
    def _extract_brand(self, item_specifics: Optional[Dict]) -> str:
        """Item SpecificsからBrand抽出"""
        if not item_specifics:
            return ''
        
        brand = item_specifics.get('Brand', [''])
        if isinstance(brand, list):
            return brand[0] if brand else ''
        return str(brand)
    
    async def _save_to_db(self, result: Dict):
        """AI分析結果をDBに保存"""
        
        data = {
            'ebay_item_id': result['ebay_item_id'],
            
            # HSコード
            'hs_code': result['hs_code'],
            'hs_description': result.get('hs_description'),
            'hs_confidence': result.get('hs_confidence'),
            
            # 原産国
            'origin_country': result['origin_country'],
            'origin_reasoning': result.get('origin_reasoning'),
            'origin_confidence': result.get('origin_confidence'),
            'origin_source': result.get('origin_source'),
            
            # サイズ推測
            'estimated_length_cm': result.get('estimated_dimensions', {}).get('length'),
            'estimated_width_cm': result.get('estimated_dimensions', {}).get('width'),
            'estimated_height_cm': result.get('estimated_dimensions', {}).get('height'),
            'estimated_weight_kg': result.get('estimated_weight_kg'),
            'size_confidence': result.get('size_confidence'),
            'size_source': result.get('size_source'),
            
            # フィルター判定結果
            'is_hazardous': result['is_hazardous'],
            'hazard_type': result.get('hazard_type'),
            'hazard_keywords_matched': json.dumps(result['hazard_keywords_matched']),
            
            'is_prohibited': result['is_prohibited'],
            'prohibited_reason': result.get('prohibited_reason'),
            'prohibited_keywords_matched': json.dumps(result['prohibited_keywords_matched']),
            
            'air_shippable': result['air_shippable'],
            'air_restriction_reason': result.get('air_restriction_reason'),
            'air_restriction_keywords_matched': json.dumps(result['air_restriction_keywords_matched']),
            
            'vero_risk': result['vero_risk'],
            'vero_brand_matched': result.get('vero_brand_matched'),
            
            'patent_troll_risk': result['patent_troll_risk'],
            'patent_category_matched': result.get('patent_category_matched'),
            
            'total_checks_performed': 1,
        }
        
        try:
            self.supabase.table('research_ai_analysis').upsert(
                data,
                on_conflict='ebay_item_id'
            ).execute()
            
            print(f"💾 DB保存成功: {result['ebay_item_id']}")
        except Exception as e:
            print(f"❌ DB保存エラー: {e}")
    
    async def batch_classify(self, products: List[Dict], batch_size: int = 5) -> List[Dict]:
        """
        複数商品を一括分類（5件ずつ）
        """
        
        results = []
        total = len(products)
        
        for i in range(0, total, batch_size):
            batch = products[i:i+batch_size]
            print(f"\n📦 バッチ {i//batch_size + 1}/{(total + batch_size - 1)//batch_size} 処理中...")
            
            for product in batch:
                try:
                    result = await self.classify_product(
                        ebay_item_id=product['ebay_item_id'],
                        title=product['title'],
                        category_id=product.get('category_id', ''),
                        category_name=product.get('category_name', ''),
                        item_specifics=product.get('item_specifics'),
                        description=product.get('description')
                    )
                    results.append(result)
                except Exception as e:
                    print(f"❌ 分類エラー: {product['ebay_item_id']} - {e}")
        
        print(f"\n🎉 一括分類完了: {len(results)}/{total}件")
        return results


# 使用例
if __name__ == "__main__":
    import asyncio
    from dotenv import load_dotenv
    
    load_dotenv()
    
    classifier = AIClassifierWithFilters(
        anthropic_key=os.getenv('ANTHROPIC_API_KEY'),
        supabase_url=os.getenv('SUPABASE_URL'),
        supabase_key=os.getenv('SUPABASE_SERVICE_KEY')
    )
    
    # テスト商品
    test_products = [
        {
            'ebay_item_id': 'TEST123456',
            'title': 'Nikon F3 35mm Film Camera Body Only Vintage',
            'category_id': '625',
            'category_name': 'Film Cameras',
            'item_specifics': {
                'Brand': ['Nikon'],
                'Model': ['F3'],
                'Type': ['Film Camera'],
                'Format': ['35mm']
            },
            'description': 'Vintage Nikon F3 camera body in excellent condition...'
        }
    ]
    
    async def test():
        results = await classifier.batch_classify(test_products)
        print("\n=== 分類結果 ===")
        print(json.dumps(results[0], indent=2, ensure_ascii=False))
    
    asyncio.run(test())
