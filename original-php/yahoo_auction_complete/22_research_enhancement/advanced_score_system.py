# desktop-crawler/advanced_score_calculator.py
"""
高精度スコア評価システム（10,000点満点 + ランク制）

特徴:
- 10,000点満点で細かい差を表現
- S/A/B/C/Dランク自動判定
- 同点を極力避ける多段階評価
- Shopping API データ対応（販売数・ウォッチ数）
"""

from typing import Dict, Tuple
import math


class AdvancedScoreCalculator:
    """高精度スコア計算クラス"""
    
    # ランク閾値
    RANK_THRESHOLDS = {
        'S': 8500,   # 85%以上
        'A': 7000,   # 70-85%
        'B': 5500,   # 55-70%
        'C': 4000,   # 40-55%
        'D': 0       # 40%未満
    }
    
    # カテゴリ別基準データ
    CATEGORY_DATA = {
        '293': {    # Cameras & Photo
            'avg_price': 250,
            'profit_rate': 22.0,
            'popularity': 85,
            'competition': 65
        },
        '550': {    # Video Games
            'avg_price': 180,
            'profit_rate': 25.0,
            'popularity': 90,
            'competition': 75
        },
        '15032': {  # Watches
            'avg_price': 350,
            'profit_rate': 28.0,
            'popularity': 80,
            'competition': 60
        },
        '625': {    # Computers
            'avg_price': 400,
            'profit_rate': 20.0,
            'popularity': 85,
            'competition': 80
        },
    }
    
    def calculate_score(self, product: Dict) -> Dict:
        """
        総合スコア計算（10,000点満点）
        
        Returns:
            {
                'total_score': 7850,        # 0-10,000点
                'rank': 'A',                # S/A/B/C/D
                'rank_position': 850,       # ランク内順位（0-1500）
                'percentile': 78.5,         # パーセンタイル
                'breakdown': {
                    'price_score': 1850,    # 各項目詳細
                    'seller_score': 1920,
                    'popularity_score': 1650,
                    'market_score': 1580,
                    'risk_penalty': -150
                },
                'recommendation': 'STRONG_BUY',
                'confidence': 95.2
            }
        """
        # 1. 価格スコア (0-2000点)
        price_score = self._calculate_price_score(product)
        
        # 2. セラースコア (0-2000点)
        seller_score = self._calculate_seller_score(product)
        
        # 3. 人気度スコア (0-2500点) - Shopping APIデータ使用
        popularity_score = self._calculate_popularity_score(product)
        
        # 4. 市場スコア (0-2000点)
        market_score = self._calculate_market_score(product)
        
        # 5. 品質スコア (0-1500点)
        quality_score = self._calculate_quality_score(product)
        
        # 6. リスクペナルティ (-1000～0点)
        risk_penalty = self._calculate_risk_penalty(product)
        
        # 総合スコア計算
        total_score = (
            price_score +
            seller_score +
            popularity_score +
            market_score +
            quality_score +
            risk_penalty
        )
        
        # 0-10000に正規化
        total_score = max(0, min(10000, total_score))
        
        # ランク判定
        rank = self._get_rank(total_score)
        rank_position = self._get_rank_position(total_score, rank)
        
        # パーセンタイル計算
        percentile = (total_score / 10000) * 100
        
        # 推奨度判定
        recommendation = self._get_recommendation(rank, total_score)
        
        # 信頼度計算
        confidence = self._calculate_confidence(product)
        
        return {
            'total_score': int(total_score),
            'rank': rank,
            'rank_position': rank_position,
            'percentile': round(percentile, 2),
            'breakdown': {
                'price_score': int(price_score),
                'seller_score': int(seller_score),
                'popularity_score': int(popularity_score),
                'market_score': int(market_score),
                'quality_score': int(quality_score),
                'risk_penalty': int(risk_penalty)
            },
            'recommendation': recommendation,
            'confidence': round(confidence, 2),
            'details': self._generate_details(product, total_score)
        }
    
    def _calculate_price_score(self, product: Dict) -> float:
        """
        価格スコア (0-2000点)
        
        評価基準:
        - 最適価格帯: $50-150 → 1800-2000点
        - 準最適: $30-50, $150-300 → 1400-1799点
        - 可: $20-30, $300-500 → 900-1399点
        - 低: $10-20, $500-1000 → 400-899点
        - 不可: <$10, >$1000 → 0-399点
        """
        price = product.get('current_price', 0)
        category_id = product.get('category_id', '')
        
        # カテゴリ別の最適価格帯を考慮
        category_data = self.CATEGORY_DATA.get(category_id, {})
        avg_price = category_data.get('avg_price', 200)
        
        # 価格帯による基礎点
        if 50 <= price <= 150:
            base_score = 1900
            # 価格帯内での微調整（50円単位で変化）
            position = (price - 50) / 100  # 0-1
            variance = math.sin(position * math.pi) * 100  # 0-100の変動
            score = base_score + variance
            
        elif 30 <= price < 50:
            # $30-50: 1400-1799点（線形）
            score = 1400 + ((price - 30) / 20) * 399
            
        elif 150 < price <= 300:
            # $150-300: 1400-1799点（逆線形）
            score = 1799 - ((price - 150) / 150) * 399
            
        elif 20 <= price < 30:
            score = 900 + ((price - 20) / 10) * 499
            
        elif 300 < price <= 500:
            score = 1399 - ((price - 300) / 200) * 499
            
        elif 10 <= price < 20:
            score = 400 + ((price - 10) / 10) * 499
            
        elif 500 < price <= 1000:
            score = 899 - ((price - 500) / 500) * 499
            
        elif price < 10:
            score = max(0, price * 40)  # $0-10: 0-400点
            
        else:  # > $1000
            score = max(0, 400 - ((price - 1000) / 100))
        
        # カテゴリ平均価格との乖離でボーナス/ペナルティ
        if avg_price > 0:
            deviation = abs(price - avg_price) / avg_price
            if deviation < 0.2:  # 平均の±20%以内
                score *= 1.05
            elif deviation > 0.5:  # 平均から50%以上離れている
                score *= 0.95
        
        return score
    
    def _calculate_seller_score(self, product: Dict) -> float:
        """
        セラースコア (0-2000点)
        
        評価要素:
        1. 評価パーセンテージ (0-1200点)
        2. フィードバック数 (0-800点)
        """
        positive_pct = product.get('seller_positive_percentage', 0)
        feedback = product.get('seller_feedback_score', 0)
        
        # 1. 評価パーセンテージスコア (0-1200点)
        # 99.9%以上を最高として細かく区分
        if positive_pct >= 99.9:
            pct_score = 1200
        elif positive_pct >= 99.5:
            # 99.5-99.9%: 1100-1199点（0.1%刻み）
            pct_score = 1100 + ((positive_pct - 99.5) / 0.4) * 99
        elif positive_pct >= 99.0:
            # 99.0-99.5%: 1000-1099点
            pct_score = 1000 + ((positive_pct - 99.0) / 0.5) * 99
        elif positive_pct >= 98.0:
            # 98.0-99.0%: 800-999点
            pct_score = 800 + ((positive_pct - 98.0) / 1.0) * 199
        elif positive_pct >= 95.0:
            # 95.0-98.0%: 500-799点
            pct_score = 500 + ((positive_pct - 95.0) / 3.0) * 299
        elif positive_pct >= 90.0:
            pct_score = 200 + ((positive_pct - 90.0) / 5.0) * 299
        else:
            pct_score = max(0, positive_pct * 2)
        
        # 2. フィードバック数スコア (0-800点)
        # 対数スケールで評価
        if feedback >= 50000:
            fb_score = 800
        elif feedback >= 10000:
            # 10,000-50,000: 700-799点
            fb_score = 700 + ((feedback - 10000) / 40000) * 99
        elif feedback >= 5000:
            fb_score = 650 + ((feedback - 5000) / 5000) * 49
        elif feedback >= 1000:
            fb_score = 550 + ((feedback - 1000) / 4000) * 99
        elif feedback >= 500:
            fb_score = 450 + ((feedback - 500) / 500) * 99
        elif feedback >= 100:
            fb_score = 300 + ((feedback - 100) / 400) * 149
        elif feedback >= 50:
            fb_score = 150 + ((feedback - 50) / 50) * 149
        else:
            fb_score = max(0, feedback * 3)
        
        return pct_score + fb_score
    
    def _calculate_popularity_score(self, product: Dict) -> float:
        """
        人気度スコア (0-2500点) - Shopping APIデータ使用
        
        評価要素:
        1. 販売済み数量 (0-1500点)
        2. ウォッチ数 (0-800点)
        3. 閲覧数 (0-200点)
        """
        sold = product.get('quantity_sold', 0)
        watches = product.get('watch_count', 0)
        views = product.get('hit_count', 0)
        
        # 1. 販売数スコア (0-1500点)
        # 対数スケール + 段階的評価
        if sold >= 1000:
            sold_score = 1500
        elif sold >= 500:
            sold_score = 1400 + ((sold - 500) / 500) * 100
        elif sold >= 200:
            sold_score = 1250 + ((sold - 200) / 300) * 150
        elif sold >= 100:
            sold_score = 1100 + ((sold - 100) / 100) * 150
        elif sold >= 50:
            sold_score = 900 + ((sold - 50) / 50) * 200
        elif sold >= 20:
            sold_score = 650 + ((sold - 20) / 30) * 250
        elif sold >= 10:
            sold_score = 400 + ((sold - 10) / 10) * 250
        elif sold >= 5:
            sold_score = 200 + ((sold - 5) / 5) * 200
        else:
            sold_score = max(0, sold * 40)
        
        # 2. ウォッチ数スコア (0-800点)
        if watches >= 1000:
            watch_score = 800
        elif watches >= 500:
            watch_score = 720 + ((watches - 500) / 500) * 80
        elif watches >= 200:
            watch_score = 600 + ((watches - 200) / 300) * 120
        elif watches >= 100:
            watch_score = 480 + ((watches - 100) / 100) * 120
        elif watches >= 50:
            watch_score = 350 + ((watches - 50) / 50) * 130
        elif watches >= 20:
            watch_score = 200 + ((watches - 20) / 30) * 150
        else:
            watch_score = max(0, watches * 10)
        
        # 3. 閲覧数スコア (0-200点)
        if views >= 10000:
            view_score = 200
        elif views >= 5000:
            view_score = 170 + ((views - 5000) / 5000) * 30
        elif views >= 1000:
            view_score = 120 + ((views - 1000) / 4000) * 50
        else:
            view_score = max(0, (views / 1000) * 120)
        
        return sold_score + watch_score + view_score
    
    def _calculate_market_score(self, product: Dict) -> float:
        """市場スコア (0-2000点)"""
        category_id = product.get('category_id', '')
        country = product.get('seller_country', '')
        condition = product.get('condition', '').lower()
        
        # カテゴリスコア (0-800点)
        category_data = self.CATEGORY_DATA.get(category_id)
        if category_data:
            popularity = category_data.get('popularity', 50)
            category_score = (popularity / 100) * 800
        else:
            category_score = 400
        
        # 地域スコア (0-700点)
        country_scores = {
            'US': 700, 'JP': 690, 'UK': 650, 'DE': 640,
            'CA': 620, 'AU': 610, 'FR': 580, 'IT': 570,
            'ES': 550, 'NL': 540
        }
        location_score = country_scores.get(country, 300)
        
        # 商品状態スコア (0-500点)
        condition_scores = {
            'new': 500,
            'certified refurbished': 460,
            'seller refurbished': 430,
            'like new': 400,
            'excellent': 370,
            'very good': 330,
            'good': 280,
            'acceptable': 220,
            'used': 250,
            'for parts': 100
        }
        
        condition_score = 250  # デフォルト
        for key, score in condition_scores.items():
            if key in condition:
                condition_score = score
                break
        
        return category_score + location_score + condition_score
    
    def _calculate_quality_score(self, product: Dict) -> float:
        """品質スコア (0-1500点)"""
        # 送料の妥当性 (0-500点)
        price = product.get('current_price', 0)
        shipping = product.get('shipping_cost', 0)
        
        if price > 0:
            shipping_ratio = shipping / price
            if shipping_ratio < 0.05:  # 送料5%未満
                shipping_score = 500
            elif shipping_ratio < 0.10:
                shipping_score = 450
            elif shipping_ratio < 0.15:
                shipping_score = 380
            elif shipping_ratio < 0.20:
                shipping_score = 300
            else:
                shipping_score = max(0, 300 - (shipping_ratio * 1000))
        else:
            shipping_score = 250
        
        # 画像品質（仮想的評価、0-500点）
        image_count = len(product.get('image_urls', []))
        image_score = min(500, image_count * 100)
        
        # タイトル品質 (0-500点)
        title = product.get('title', '')
        title_length = len(title)
        if 60 <= title_length <= 80:  # 最適長
            title_score = 500
        elif 40 <= title_length < 60:
            title_score = 400 + ((title_length - 40) / 20) * 100
        elif 80 < title_length <= 100:
            title_score = 500 - ((title_length - 80) / 20) * 100
        else:
            title_score = max(200, min(400, title_length * 5))
        
        return shipping_score + image_score + title_score
    
    def _calculate_risk_penalty(self, product: Dict) -> float:
        """リスクペナルティ (-1000～0点)"""
        penalty = 0
        
        price = product.get('current_price', 0)
        country = product.get('seller_country', '')
        positive_pct = product.get('seller_positive_percentage', 100)
        feedback = product.get('seller_feedback_score', 0)
        condition = product.get('condition', '').lower()
        
        # 高額リスク
        if price > 1000:
            penalty -= ((price - 1000) / 100) * 10  # $100ごとに-10点
        
        # 地域リスク
        risky_countries = ['CN', 'HK', 'TW', 'IN', 'PH']
        if country in risky_countries:
            penalty -= 300
        elif country not in ['US', 'JP', 'UK', 'DE', 'CA', 'AU']:
            penalty -= 150
        
        # セラーリスク
        if positive_pct < 95:
            penalty -= (95 - positive_pct) * 50
        elif positive_pct < 98:
            penalty -= (98 - positive_pct) * 30
        
        if feedback < 50:
            penalty -= (50 - feedback) * 2
        
        # 商品状態リスク
        if 'for parts' in condition:
            penalty -= 400
        elif 'acceptable' in condition:
            penalty -= 200
        elif 'used' in condition and 'like new' not in condition:
            penalty -= 100
        
        return max(-1000, penalty)
    
    def _get_rank(self, score: float) -> str:
        """ランク判定"""
        if score >= self.RANK_THRESHOLDS['S']:
            return 'S'
        elif score >= self.RANK_THRESHOLDS['A']:
            return 'A'
        elif score >= self.RANK_THRESHOLDS['B']:
            return 'B'
        elif score >= self.RANK_THRESHOLDS['C']:
            return 'C'
        else:
            return 'D'
    
    def _get_rank_position(self, score: float, rank: str) -> int:
        """ランク内順位（0-1500）"""
        thresholds = self.RANK_THRESHOLDS
        
        if rank == 'S':
            # 8500-10000 → 0-1500
            return int((score - 8500) / 1500 * 1500)
        elif rank == 'A':
            # 7000-8499 → 0-1499
            return int((score - 7000) / 1499 * 1499)
        elif rank == 'B':
            return int((score - 5500) / 1499 * 1499)
        elif rank == 'C':
            return int((score - 4000) / 1499 * 1499)
        else:  # D
            return int((score / 3999) * 1499)
    
    def _get_recommendation(self, rank: str, score: float) -> str:
        """推奨度判定"""
        if rank == 'S' and score >= 9000:
            return 'IMMEDIATE_BUY'
        elif rank == 'S':
            return 'STRONG_BUY'
        elif rank == 'A' and score >= 7500:
            return 'BUY'
        elif rank == 'A':
            return 'CONSIDER_BUY'
        elif rank == 'B':
            return 'MONITOR'
        else:
            return 'PASS'
    
    def _calculate_confidence(self, product: Dict) -> float:
        """信頼度計算 (0-100%)"""
        confidence = 50.0  # ベース
        
        # Shopping APIデータがあれば信頼度UP
        if product.get('quantity_sold') is not None:
            confidence += 30
        if product.get('watch_count') is not None:
            confidence += 15
        
        # セラーフィードバックが多いほど信頼度UP
        feedback = product.get('seller_feedback_score', 0)
        if feedback >= 1000:
            confidence += 5
        
        return min(100, confidence)
    
    def _generate_details(self, product: Dict, total_score: float) -> Dict:
        """詳細情報生成"""
        return {
            'strengths': self._identify_strengths(product),
            'weaknesses': self._identify_weaknesses(product),
            'opportunities': self._identify_opportunities(product),
            'threats': self._identify_threats(product)
        }
    
    def _identify_strengths(self, product: Dict) -> list:
        """強み識別"""
        strengths = []
        
        if product.get('quantity_sold', 0) > 100:
            strengths.append(f"高い販売実績（{product['quantity_sold']}個販売済み）")
        
        if product.get('seller_positive_percentage', 0) >= 99.5:
            strengths.append("セラー評価が非常に高い")
        
        price = product.get('current_price', 0)
        if 50 <= price <= 150:
            strengths.append("最適な価格帯")
        
        return strengths
    
    def _identify_weaknesses(self, product: Dict) -> list:
        """弱み識別"""
        weaknesses = []
        
        if product.get('quantity_sold', 0) < 5:
            weaknesses.append("販売実績が少ない")
        
        if product.get('seller_positive_percentage', 0) < 98:
            weaknesses.append("セラー評価に改善の余地あり")
        
        return weaknesses
    
    def _identify_opportunities(self, product: Dict) -> list:
        """機会識別"""
        return ["市場での需要が見込める", "競合が少ない可能性"]
    
    def _identify_threats(self, product: Dict) -> list:
        """脅威識別"""
        threats = []
        
        if product.get('current_price', 0) > 500:
            threats.append("高額商品のため在庫リスク")
        
        return threats


# 使用例
if __name__ == "__main__":
    calc = AdvancedScoreCalculator()
    
    # サンプル商品（Shopping APIデータ含む）
    sample = {
        'current_price': 299.99,
        'shipping_cost': 15.00,
        'seller_positive_percentage': 99.3,
        'seller_feedback_score': 2450,
        'seller_country': 'US',
        'category_id': '293',
        'condition': 'Used',
        'quantity_sold': 87,      # Shopping API
        'watch_count': 234,       # Shopping API
        'hit_count': 5670,        # Shopping API
        'title': 'Vintage Nikon F3 35mm SLR Film Camera Body',
        'image_urls': ['url1', 'url2', 'url3']
    }
    
    result = calc.calculate_score(sample)
    
    print("=" * 60)
    print(f"総合スコア: {result['total_score']:,}/10,000点")
    print(f"ランク: {result['rank']} (ランク内順位: {result['rank_position']})")
    print(f"パーセンタイル: {result['percentile']}%")
    print(f"推奨度: {result['recommendation']}")
    print(f"信頼度: {result['confidence']}%")
    print("\nスコア内訳:")
    for key, value in result['breakdown'].items():
        print(f"  {key}: {value:,}点")
