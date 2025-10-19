# desktop-crawler/score_calculator.py
"""
改良版スコア評価システム
eBay Finding APIで取得できるデータのみで高精度なスコアを算出
"""

from typing import Dict, Tuple
from datetime import datetime


class ScoreCalculator:
    """商品スコア計算クラス"""
    
    # カテゴリ別の平均利益率データ（実績ベース）
    CATEGORY_PROFIT_RATES = {
        '293': 22.0,    # Cameras & Photo
        '550': 25.0,    # Video Games & Consoles
        '15032': 28.0,  # Watches
        '625': 20.0,    # Computers
        '11450': 30.0,  # Clothing
        '267': 18.0,    # Books/Movies
    }
    
    # 人気カテゴリ（売れ筋）
    POPULAR_CATEGORIES = ['293', '550', '15032', '625', '11450']
    
    # 信頼できる国
    TRUSTED_COUNTRIES = ['US', 'JP', 'UK', 'DE', 'CA', 'AU', 'FR', 'IT']
    
    def calculate_comprehensive_score(self, product: Dict) -> Dict:
        """
        総合スコア計算
        
        Args:
            product: 商品データ（eBay Finding APIから取得）
            
        Returns:
            {
                'total_score': 75,           # 総合スコア 0-100
                'profit_potential': 65,      # 利益ポテンシャル 0-100
                'market_attractiveness': 80, # 市場魅力度 0-100
                'risk_score': 25,            # リスクスコア 0-100 (低いほど良い)
                'recommendation': 'BUY',     # STRONG_BUY/BUY/CONSIDER/PASS
                'confidence': 'MEDIUM',      # HIGH/MEDIUM/LOW
                'breakdown': {...},          # スコア詳細
                'reasons': [...],            # 推奨理由
                'warnings': [...]            # 注意点
            }
        """
        # 各スコア計算
        price_score = self._calculate_price_score(product)
        seller_score = self._calculate_seller_score(product)
        location_score = self._calculate_location_score(product)
        category_score = self._calculate_category_score(product)
        condition_score = self._calculate_condition_score(product)
        
        # 利益ポテンシャル計算
        profit_potential = self._calculate_profit_potential(product)
        
        # 市場魅力度計算
        market_attractiveness = (
            category_score * 0.4 +
            price_score * 0.3 +
            condition_score * 0.3
        )
        
        # リスクスコア計算（低いほど良い）
        risk_score = self._calculate_comprehensive_risk(product)
        
        # 総合スコア計算（重み付け平均）
        total_score = (
            profit_potential * 0.35 +
            market_attractiveness * 0.30 +
            seller_score * 0.20 +
            location_score * 0.15
        ) * (1 - risk_score / 200)  # リスクで減点
        
        total_score = max(0, min(100, total_score))  # 0-100に正規化
        
        # 推奨度判定
        recommendation = self._get_recommendation(total_score, risk_score)
        
        # 信頼度判定（Finding APIのみなのでMEDIUM）
        confidence = 'MEDIUM'
        
        # 推奨理由と注意点
        reasons = self._generate_reasons(product, {
            'price': price_score,
            'seller': seller_score,
            'location': location_score,
            'category': category_score,
            'condition': condition_score
        })
        
        warnings = self._generate_warnings(product, risk_score)
        
        return {
            'total_score': round(total_score, 1),
            'profit_potential': round(profit_potential, 1),
            'market_attractiveness': round(market_attractiveness, 1),
            'risk_score': round(risk_score, 1),
            'recommendation': recommendation,
            'confidence': confidence,
            'breakdown': {
                'price_score': round(price_score, 1),
                'seller_score': round(seller_score, 1),
                'location_score': round(location_score, 1),
                'category_score': round(category_score, 1),
                'condition_score': round(condition_score, 1)
            },
            'reasons': reasons,
            'warnings': warnings
        }
    
    def _calculate_price_score(self, product: Dict) -> float:
        """価格スコア計算 (0-100)"""
        price = product.get('current_price', 0)
        
        # 最適価格帯: $50-300
        if 50 <= price <= 150:
            return 100  # スイートスポット
        elif 150 < price <= 300:
            return 90
        elif 30 <= price < 50:
            return 75
        elif 300 < price <= 500:
            return 70
        elif 20 <= price < 30:
            return 50  # 利益取りづらい
        elif 500 < price <= 1000:
            return 50  # リスク増加
        elif price < 20:
            return 30  # 低利益
        else:
            return 20  # 高リスク
    
    def _calculate_seller_score(self, product: Dict) -> float:
        """セラースコア計算 (0-100)"""
        feedback_score = product.get('seller_feedback_score', 0)
        positive_pct = product.get('seller_positive_percentage', 0)
        
        score = 0
        
        # 評価パーセンテージスコア (0-60点)
        if positive_pct >= 99.5:
            score += 60
        elif positive_pct >= 99:
            score += 55
        elif positive_pct >= 98:
            score += 45
        elif positive_pct >= 95:
            score += 30
        elif positive_pct >= 90:
            score += 15
        else:
            score += 5
        
        # フィードバック数スコア (0-40点)
        if feedback_score >= 10000:
            score += 40
        elif feedback_score >= 5000:
            score += 35
        elif feedback_score >= 1000:
            score += 30
        elif feedback_score >= 500:
            score += 25
        elif feedback_score >= 100:
            score += 20
        elif feedback_score >= 50:
            score += 10
        else:
            score += 5
        
        return score
    
    def _calculate_location_score(self, product: Dict) -> float:
        """国・地域スコア計算 (0-100)"""
        country = product.get('seller_country', '')
        
        if country in ['US', 'JP']:
            return 100  # 最優先
        elif country in ['UK', 'DE', 'CA', 'AU']:
            return 85
        elif country in ['FR', 'IT', 'ES', 'NL']:
            return 70
        elif country in self.TRUSTED_COUNTRIES:
            return 60
        else:
            return 30  # その他の国
    
    def _calculate_category_score(self, product: Dict) -> float:
        """カテゴリスコア計算 (0-100)"""
        category_id = product.get('category_id', '')
        
        if category_id in self.POPULAR_CATEGORIES:
            return 90
        elif category_id in self.CATEGORY_PROFIT_RATES:
            return 70
        else:
            return 50  # 不明カテゴリ
    
    def _calculate_condition_score(self, product: Dict) -> float:
        """商品状態スコア計算 (0-100)"""
        condition = product.get('condition', '').lower()
        
        if 'new' in condition:
            return 100
        elif 'refurbished' in condition or 'certified' in condition:
            return 85
        elif 'like new' in condition or 'excellent' in condition:
            return 75
        elif 'very good' in condition or 'good' in condition:
            return 60
        elif 'used' in condition:
            return 50
        else:
            return 40
    
    def _calculate_profit_potential(self, product: Dict) -> float:
        """利益ポテンシャル計算 (0-100)"""
        price = product.get('current_price', 0)
        category_id = product.get('category_id', '')
        shipping = product.get('shipping_cost', 0)
        
        # カテゴリ別の基準利益率
        base_profit_rate = self.CATEGORY_PROFIT_RATES.get(
            category_id, 
            20.0  # デフォルト
        )
        
        # 価格帯補正
        if 50 <= price <= 200:
            profit_rate = base_profit_rate * 1.1  # +10%
        elif 200 < price <= 500:
            profit_rate = base_profit_rate * 1.0
        elif price < 50:
            profit_rate = base_profit_rate * 0.8  # -20%
        else:
            profit_rate = base_profit_rate * 0.9  # -10%
        
        # 送料補正（送料高いと利益減）
        if shipping > 30:
            profit_rate *= 0.9
        elif shipping > 50:
            profit_rate *= 0.8
        
        # 利益率をスコアに変換 (0-100)
        # 15% → 50点, 25% → 75点, 35% → 100点
        score = (profit_rate - 10) * 3.33
        
        return max(0, min(100, score))
    
    def _calculate_comprehensive_risk(self, product: Dict) -> float:
        """総合リスクスコア計算 (0-100, 低いほど良い)"""
        risk = 0
        
        price = product.get('current_price', 0)
        country = product.get('seller_country', '')
        positive_pct = product.get('seller_positive_percentage', 0)
        feedback = product.get('seller_feedback_score', 0)
        condition = product.get('condition', '').lower()
        
        # 価格リスク (0-30点)
        if price > 1000:
            risk += 30
        elif price > 500:
            risk += 20
        elif price > 300:
            risk += 10
        elif price < 20:
            risk += 15  # 低価格もリスク
        
        # 地域リスク (0-25点)
        if country not in self.TRUSTED_COUNTRIES:
            risk += 25
        elif country not in ['US', 'JP', 'UK', 'DE']:
            risk += 10
        
        # セラーリスク (0-30点)
        if positive_pct < 95:
            risk += 30
        elif positive_pct < 98:
            risk += 20
        elif positive_pct < 99:
            risk += 10
        
        if feedback < 50:
            risk += 15
        elif feedback < 100:
            risk += 10
        elif feedback < 500:
            risk += 5
        
        # 商品状態リスク (0-15点)
        if 'used' in condition and 'like new' not in condition:
            risk += 15
        elif 'refurbished' in condition:
            risk += 5
        
        return min(100, risk)
    
    def _get_recommendation(self, total_score: float, risk_score: float) -> str:
        """推奨度判定"""
        if total_score >= 80 and risk_score < 30:
            return 'STRONG_BUY'
        elif total_score >= 65 and risk_score < 50:
            return 'BUY'
        elif total_score >= 50:
            return 'CONSIDER'
        else:
            return 'PASS'
    
    def _generate_reasons(self, product: Dict, scores: Dict) -> list:
        """推奨理由生成"""
        reasons = []
        
        if scores['price'] >= 90:
            reasons.append('最適な価格帯')
        
        if scores['seller'] >= 80:
            reasons.append('信頼できるセラー')
        
        if scores['category'] >= 80:
            reasons.append('人気カテゴリ')
        
        if scores['condition'] >= 90:
            reasons.append('商品状態が良好')
        
        if scores['location'] >= 90:
            reasons.append('信頼できる発送元')
        
        if product.get('current_price', 0) >= 100:
            reasons.append('十分な利益が見込める')
        
        return reasons if reasons else ['データ分析に基づく評価']
    
    def _generate_warnings(self, product: Dict, risk_score: float) -> list:
        """注意点生成"""
        warnings = []
        
        if risk_score >= 50:
            warnings.append('リスクスコアが高い')
        
        if product.get('current_price', 0) > 500:
            warnings.append('高額商品のため在庫リスクあり')
        
        if product.get('seller_positive_percentage', 100) < 98:
            warnings.append('セラー評価に注意')
        
        country = product.get('seller_country', '')
        if country not in self.TRUSTED_COUNTRIES:
            warnings.append('発送元の国に注意が必要')
        
        condition = product.get('condition', '').lower()
        if 'used' in condition:
            warnings.append('中古品のため状態確認必須')
        
        return warnings


# 使用例
if __name__ == "__main__":
    calculator = ScoreCalculator()
    
    sample_product = {
        'current_price': 299.99,
        'seller_feedback_score': 1250,
        'seller_positive_percentage': 99.2,
        'seller_country': 'US',
        'category_id': '293',
        'condition': 'Used',
        'shipping_cost': 15.00
    }
    
    result = calculator.calculate_comprehensive_score(sample_product)
    
    print("=" * 50)
    print("スコア評価結果")
    print("=" * 50)
    print(f"総合スコア: {result['total_score']}/100")
    print(f"利益ポテンシャル: {result['profit_potential']}/100")
    print(f"市場魅力度: {result['market_attractiveness']}/100")
    print(f"リスクスコア: {result['risk_score']}/100")
    print(f"推奨度: {result['recommendation']}")
    print(f"信頼度: {result['confidence']}")
    print("\n推奨理由:")
    for reason in result['reasons']:
        print(f"  ✓ {reason}")
    print("\n注意点:")
    for warning in result['warnings']:
        print(f"  ⚠ {warning}")
