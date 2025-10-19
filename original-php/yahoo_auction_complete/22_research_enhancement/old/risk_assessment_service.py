# services/risk-assessment/src/services/risk_assessor.py
import asyncio
import aiohttp
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import asyncpg
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler
import json
import re

@dataclass
class RiskAssessment:
    """リスク評価結果"""
    overall_risk_score: float
    market_volatility_score: float
    competition_risk: float
    supply_chain_risk: float
    seasonal_risk: float
    counterfeit_risk: float
    policy_risk: float
    liquidity_risk: float
    risk_factors: List[Dict]
    confidence_level: float
    recommendations: List[str]

@dataclass
class MarketAnalysis:
    """市場分析結果"""
    trend_direction: str  # 'up', 'down', 'stable'
    trend_strength: float
    market_size_estimate: float
    growth_rate: float
    seasonality_index: float
    competition_intensity: float
    price_volatility: float
    demand_forecast: List[Dict]
    data_quality_score: float

class RiskAssessorService:
    def __init__(self):
        self.db_pool = None
        self.session = None
        self.ml_models = {}
        self.risk_weights = {
            'market_volatility': 0.25,
            'competition': 0.20,
            'supply_chain': 0.15,
            'seasonal': 0.15,
            'counterfeit': 0.10,
            'policy': 0.10,
            'liquidity': 0.05
        }

    async def initialize(self):
        """サービス初期化"""
        self.db_pool = await asyncpg.create_pool(settings.DATABASE_URL)
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        )
        
        # 機械学習モデルの初期化
        await self.initialize_ml_models()

    async def initialize_ml_models(self):
        """機械学習モデルの初期化と訓練"""
        try:
            # 過去のデータを取得
            historical_data = await self.fetch_historical_data()
            
            if len(historical_data) > 100:  # 十分なデータがある場合
                # 価格変動予測モデル
                self.ml_models['price_volatility'] = await self.train_volatility_model(historical_data)
                
                # 異常値検出モデル
                self.ml_models['anomaly_detector'] = await self.train_anomaly_model(historical_data)
                
                # 需要予測モデル  
                self.ml_models['demand_forecast'] = await self.train_demand_model(historical_data)
                
                print("Machine learning models initialized successfully")
            else:
                print("Insufficient data for ML models, using rule-based approach")
                
        except Exception as e:
            print(f"ML model initialization error: {e}")
            # フォールバック: ルールベースの評価を使用

    async def assess_investment_risk(
        self, 
        product_data: Dict, 
        supplier_data: Dict, 
        market_data: Optional[Dict] = None
    ) -> RiskAssessment:
        """総合投資リスク評価"""
        
        try:
            # 各リスク要素を個別に評価
            market_volatility = await self.assess_market_volatility_risk(product_data, market_data)
            competition_risk = await self.assess_competition_risk(product_data)
            supply_chain_risk = await self.assess_supply_chain_risk(supplier_data)
            seasonal_risk = await self.assess_seasonal_risk(product_data)
            counterfeit_risk = await self.assess_counterfeit_risk(product_data)
            policy_risk = await self.assess_policy_risk(product_data)
            liquidity_risk = await self.assess_liquidity_risk(product_data)

            # 総合リスクスコア計算
            overall_risk = (
                market_volatility * self.risk_weights['market_volatility'] +
                competition_risk * self.risk_weights['competition'] +
                supply_chain_risk * self.risk_weights['supply_chain'] +
                seasonal_risk * self.risk_weights['seasonal'] +
                counterfeit_risk * self.risk_weights['counterfeit'] +
                policy_risk * self.risk_weights['policy'] +
                liquidity_risk * self.risk_weights['liquidity']
            )

            # リスク要因の詳細化
            risk_factors = [
                {
                    'factor': 'Market Volatility',
                    'score': market_volatility,
                    'impact': 'high' if market_volatility > 0.7 else 'medium' if market_volatility > 0.4 else 'low',
                    'description': self.get_risk_description('market_volatility', market_volatility)
                },
                {
                    'factor': 'Competition Level',
                    'score': competition_risk,
                    'impact': 'high' if competition_risk > 0.7 else 'medium' if competition_risk > 0.4 else 'low',
                    'description': self.get_risk_description('competition', competition_risk)
                },
                {
                    'factor': 'Supply Chain',
                    'score': supply_chain_risk,
                    'impact': 'high' if supply_chain_risk > 0.7 else 'medium' if supply_chain_risk > 0.4 else 'low',
                    'description': self.get_risk_description('supply_chain', supply_chain_risk)
                }
            ]

            # 推奨事項生成
            recommendations = self.generate_risk_recommendations(
                overall_risk, market_volatility, competition_risk, supply_chain_risk
            )

            # 信頼度計算
            confidence_level = self.calculate_risk_confidence(product_data, market_data)

            return RiskAssessment(
                overall_risk_score=overall_risk,
                market_volatility_score=market_volatility,
                competition_risk=competition_risk,
                supply_chain_risk=supply_chain_risk,
                seasonal_risk=seasonal_risk,
                counterfeit_risk=counterfeit_risk,
                policy_risk=policy_risk,
                liquidity_risk=liquidity_risk,
                risk_factors=risk_factors,
                confidence_level=confidence_level,
                recommendations=recommendations
            )

        except Exception as e:
            print(f"Risk assessment error: {e}")
            # エラー時はデフォルトリスク評価を返す
            return self.get_default_risk_assessment()

    async def assess_market_volatility_risk(self, product_data: Dict, market_data: Optional[Dict]) -> float:
        """市場ボラティリティリスク評価"""
        
        try:
            category_id = product_data.get('category_id')
            price = product_data.get('ebay_selling_price', 0)
            
            # 過去の価格データを取得
            price_history = await self.fetch_price_history(category_id, days=90)
            
            if len(price_history) < 10:
                # データ不足時はカテゴリ平均を使用
                return await self.get_category_volatility(category_id)
            
            # 価格変動率を計算
            prices = [p['price'] for p in price_history]
            price_changes = np.diff(prices) / prices[:-1]
            volatility = np.std(price_changes)
            
            # 正規化 (0-1スケール)
            normalized_volatility = min(1.0, volatility * 10)  # 10%変動で1.0
            
            # 機械学習モデルがある場合は予測も考慮
            if 'price_volatility' in self.ml_models:
                predicted_volatility = await self.predict_price_volatility(product_data)
                normalized_volatility = (normalized_volatility + predicted_volatility) / 2
            
            return normalized_volatility

        except Exception as e:
            print(f"Market volatility assessment error: {e}")
            return 0.5  # デフォルト値

    async def assess_competition_risk(self, product_data: Dict) -> float:
        """競合リスク評価"""
        
        try:
            title = product_data.get('title', '')
            category_id = product_data.get('category_id')
            price = product_data.get('ebay_selling_price', 0)
            
            # 類似商品の出品数を調査
            similar_products = await self.fetch_similar_products(title, category_id)
            
            # 競合分析指標
            competition_count = len(similar_products)
            price_competition = self.analyze_price_competition(price, similar_products)
            seller_competition = self.analyze_seller_competition(similar_products)
            
            # 競合密度計算
            base_risk = min(1.0, competition_count / 100)  # 100件で最大リスク
            
            # 価格競合考慮
            if price_competition > 0.8:  # 80%以上が同価格帯
                base_risk += 0.3
            elif price_competition > 0.6:
                base_risk += 0.2
            
            # 大手セラー参入リスク
            if seller_competition > 0.7:  # 大手セラー70%以上
                base_risk += 0.25
            
            return min(1.0, base_risk)

        except Exception as e:
            print(f"Competition risk assessment error: {e}")
            return 0.5

    async def assess_supply_chain_risk(self, supplier_data: Dict) -> float:
        """サプライチェーンリスク評価"""
        
        try:
            supplier_type = supplier_data.get('supplier_type', '')
            reliability_score = supplier_data.get('reliability_score', 0.5)
            availability = supplier_data.get('availability_status', 'unknown')
            
            # ベースリスク（サプライヤータイプ別）
            base_risks = {
                'amazon': 0.1,     # 最も安定
                'rakuten': 0.2,
                'yahoo_auctions': 0.4,
                'mercari': 0.6,    # 個人販売のためリスク高
                'other': 0.5
            }
            
            base_risk = base_risks.get(supplier_type, 0.5)
            
            # 信頼性スコアでリスク調整
            reliability_risk = 1.0 - reliability_score
            
            # 在庫状況でリスク調整
            availability_risk = {
                'in_stock': 0.0,
                'limited': 0.3,
                'out_of_stock': 0.8,
                'unknown': 0.5
            }.get(availability, 0.5)
            
            # 総合サプライチェーンリスク
            total_risk = (base_risk + reliability_risk + availability_risk) / 3
            
            return min(1.0, total_risk)

        except Exception as e:
            print(f"Supply chain risk assessment error: {e}")
            return 0.5

    async def assess_seasonal_risk(self, product_data: Dict) -> float:
        """季節性リスク評価"""
        
        try:
            title = product_data.get('title', '').lower()
            category_id = product_data.get('category_id')
            current_month = datetime.now().month
            
            # 季節性キーワード検出
            seasonal_keywords = {
                'winter': [12, 1, 2],
                'spring': [3, 4, 5], 
                'summer': [6, 7, 8],
                'autumn': [9, 10, 11],
                'christmas': [11, 12],
                'valentine': [1, 2],
                'halloween': [10],
                'graduation': [3, 4]
            }
            
            seasonal_risk = 0.0
            
            for season, months in seasonal_keywords.items():
                if season in title:
                    if current_month not in months:
                        # 季節外れ商品は高リスク
                        months_until_season = min(
                            [(m - current_month) % 12 for m in months]
                        )
                        seasonal_risk = max(seasonal_risk, 
                                          min(1.0, months_until_season / 6))
            
            # カテゴリ別季節性も考慮
            category_seasonality = await self.get_category_seasonality(category_id, current_month)
            seasonal_risk = max(seasonal_risk, category_seasonality)
            
            return seasonal_risk

        except Exception as e:
            print(f"Seasonal risk assessment error: {e}")
            return 0.1  # 低リスクをデフォルト

    async def assess_counterfeit_risk(self, product_data: Dict) -> float:
        """偽物・模倣品リスク評価"""
        
        try:
            title = product_data.get('title', '').lower()
            brand = product_data.get('brand', '').lower()
            category_id = product_data.get('category_id')
            price = product_data.get('ebay_selling_price', 0)
            
            # 高リスクブランド
            high_risk_brands = ['nike', 'adidas', 'gucci', 'louis vuitton', 'rolex', 
                               'apple', 'samsung', 'sony', 'nintendo']
            
            # 高リスクカテゴリ
            high_risk_categories = ['fashion', 'luxury', 'electronics', 'watches']
            
            counterfeit_risk = 0.0
            
            # ブランドリスク
            if any(brand_name in title for brand_name in high_risk_brands):
                counterfeit_risk += 0.4
                
                # 市場価格との比較
                market_price = await self.get_market_price_range(brand, category_id)
                if market_price and price < market_price * 0.6:  # 40%以上安い
                    counterfeit_risk += 0.4
            
            # カテゴリリスク
            category_name = await self.get_category_name(category_id)
            if any(cat in category_name.lower() for cat in high_risk_categories):
                counterfeit_risk += 0.2
            
            # 疑わしいキーワード検出
            suspicious_keywords = ['replica', 'aaa', 'mirror', 'inspired', 'style']
            if any(keyword in title for keyword in suspicious_keywords):
                counterfeit_risk += 0.5
            
            return min(1.0, counterfeit_risk)

        except Exception as e:
            print(f"Counterfeit risk assessment error: {e}")
            return 0.2  # 中低リスクをデフォルト

    async def assess_policy_risk(self, product_data: Dict) -> float:
        """政策・規制リスク評価"""
        
        try:
            category_id = product_data.get('category_id')
            title = product_data.get('title', '').lower()
            
            # 高規制カテゴリ
            high_regulation_categories = {
                'medical': 0.8,
                'pharmaceutical': 0.9,
                'weapons': 0.95,
                'alcohol': 0.7,
                'tobacco': 0.8,
                'automotive_parts': 0.4,
                'food_supplements': 0.6
            }
            
            category_name = await self.get_category_name(category_id)
            
            policy_risk = 0.1  # ベースリスク
            
            # カテゴリ規制リスク
            for reg_category, risk_score in high_regulation_categories.items():
                if reg_category in category_name.lower():
                    policy_risk = max(policy_risk, risk_score)
            
            # 規制関連キーワード検出
            regulatory_keywords = ['medical', 'prescription', 'fda', 'restricted', 
                                 'professional', 'license', 'certified']
            
            if any(keyword in title for keyword in regulatory_keywords):
                policy_risk += 0.3
            
            # 国際規制リスク（日本⇔アメリカ）
            international_risk = await self.assess_international_regulation_risk(
                product_data
            )
            policy_risk += international_risk
            
            return min(1.0, policy_risk)

        except Exception as e:
            print(f"Policy risk assessment error: {e}")
            return 0.1

    async def assess_liquidity_risk(self, product_data: Dict) -> float:
        """流動性リスク評価（売りやすさ）"""
        
        try:
            sold_quantity = product_data.get('ebay_sold_quantity', 0)
            watch_count = product_data.get('watch_count', 0)
            category_id = product_data.get('category_id')
            
            # 販売履歴による流動性評価
            if sold_quantity > 100:
                liquidity_risk = 0.1  # 高流動性
            elif sold_quantity > 50:
                liquidity_risk = 0.2
            elif sold_quantity > 10:
                liquidity_risk = 0.4
            else:
                liquidity_risk = 0.7  # 低流動性
            
            # ウォッチ数による調整
            if watch_count > 50:
                liquidity_risk -= 0.2
            elif watch_count > 20:
                liquidity_risk -= 0.1
            
            # カテゴリ流動性
            category_liquidity = await self.get_category_liquidity(category_id)
            liquidity_risk = (liquidity_risk + category_liquidity) / 2
            
            return max(0.0, min(1.0, liquidity_risk))

        except Exception as e:
            print(f"Liquidity risk assessment error: {e}")
            return 0.3

    def get_risk_description(self, risk_type: str, score: float) -> str:
        """リスク要因の説明文生成"""
        
        descriptions = {
            'market_volatility': {
                'low': '市場価格が安定しており、価格変動リスクは限定的です。',
                'medium': '市場にある程度の価格変動が見られ、注意が必要です。',
                'high': '市場価格の変動が激しく、投資リスクが高い状況です。'
            },
            'competition': {
                'low': '競合出品者が少なく、市場シェア獲得が期待できます。',
                'medium': '適度な競合がありますが、差別化により利益確保は可能です。', 
                'high': '激しい価格競争により、利益確保が困難な可能性があります。'
            },
            'supply_chain': {
                'low': '信頼性の高いサプライヤーから安定調達が可能です。',
                'medium': 'サプライチェーンに若干の不安定要素があります。',
                'high': '調達の安定性に重大な懸念があり、在庫切れリスクが高いです。'
            }
        }
        
        risk_level = 'high' if score > 0.7 else 'medium' if score > 0.4 else 'low'
        return descriptions.get(risk_type, {}).get(risk_level, 'リスク評価を確認してください。')

    def generate_risk_recommendations(
        self, 
        overall_risk: float, 
        market_volatility: float, 
        competition_risk: float, 
        supply_chain_risk: float
    ) -> List[str]:
        """リスクに基づく推奨事項生成"""
        
        recommendations = []
        
        if overall_risk > 0.7:
            recommendations.append("⚠️ 総合リスクが高いため、投資は慎重に検討してください")
        
        if market_volatility > 0.6:
            recommendations.append("📊 価格変動が大きいため、頻繁な価格調整が必要です")
            
        if competition_risk > 0.7:
            recommendations.append("🎯 競合が多いため、差別化戦略や独自性の確保が重要です")
            
        if supply_chain_risk > 0.6:
            recommendations.append("🏪 代替サプライヤーの確保を検討してください")
            
        if overall_risk < 0.3:
            recommendations.append("✅ 低リスクの投資機会です。積極的な検討をお勧めします")
        elif overall_risk < 0.5:
            recommendations.append("⚖️ 適度なリスクレベル。利益とリスクのバランスを考慮してください")
        
        # 具体的な対策提案
        if market_volatility > 0.5:
            recommendations.append("💡 価格追跡ツールの設定と自動価格調整の導入を検討")
            
        if supply_chain_risk > 0.5:
            recommendations.append("💡 複数の仕入先を確保し、在庫管理の最適化を実施")
        
        return recommendations

    async def calculate_risk_confidence(self, product_data: Dict, market_data: Optional[Dict]) -> float:
        """リスク評価の信頼度計算"""
        
        try:
            confidence_factors = []
            
            # データ品質による信頼度
            if product_data.get('ebay_sold_quantity', 0) > 50:
                confidence_factors.append(0.9)  # 十分な販売履歴
            elif product_data.get('ebay_sold_quantity', 0) > 10:
                confidence_factors.append(0.7)
            else:
                confidence_factors.append(0.4)  # 販売履歴不足
            
            # 市場データの質
            if market_data and len(market_data.get('price_history', [])) > 30:
                confidence_factors.append(0.9)  # 十分な価格履歴
            elif market_data and len(market_data.get('price_history', [])) > 10:
                confidence_factors.append(0.7)
            else:
                confidence_factors.append(0.5)
            
            # 機械学習モデルの利用可能性
            if self.ml_models:
                confidence_factors.append(0.8)
            else:
                confidence_factors.append(0.6)  # ルールベースのみ
            
            return sum(confidence_factors) / len(confidence_factors)

        except Exception as e:
            print(f"Risk confidence calculation error: {e}")
            return 0.5

    def get_default_risk_assessment(self) -> RiskAssessment:
        """デフォルトリスク評価"""
        return RiskAssessment(
            overall_risk_score=0.5,
            market_volatility_score=0.5,
            competition_risk=0.5,
            supply_chain_risk=0.5,
            seasonal_risk=0.3,
            counterfeit_risk=0.3,
            policy_risk=0.2,
            liquidity_risk=0.4,
            risk_factors=[],
            confidence_level=0.3,
            recommendations=["データ不足により詳細な評価ができません。追加情報の収集をお勧めします。"]
        )

    # ヘルパーメソッド群

    async def fetch_historical_data(self) -> List[Dict]:
        """過去データ取得"""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT p.id, p.title, p.category_id, p.ebay_selling_price,
                       pc.profit_margin, pc.net_profit, pc.calculated_at,
                       ds.price as domestic_price, ds.supplier_type
                FROM products p
                JOIN profit_calculations pc ON p.id = pc.product_id
                JOIN domestic_suppliers ds ON p.id = ds.product_id
                WHERE pc.calculated_at > NOW() - INTERVAL '6 months'
                ORDER BY pc.calculated_at DESC
            """)
            
            return [dict(row) for row in rows]

    async def train_volatility_model(self, data: List[Dict]) -> RandomForestRegressor:
        """価格変動予測モデルの訓練"""
        try:
            df = pd.DataFrame(data)
            
            # 特徴量エンジニアリング
            features = []
            targets = []
            
            for _, row in df.iterrows():
                # 価格変動率を計算
                price_changes = self.calculate_price_volatility_from_history(row)
                if price_changes is not None:
                    feature_vector = [
                        row['ebay_selling_price'],
                        row.get('domestic_price', 0),
                        row.get('profit_margin', 0),
                        hash(str(row.get('category_id', 0))) % 1000,  # カテゴリエンコーディング
                        len(str(row.get('title', ''))),  # タイトル長
                    ]
                    features.append(feature_vector)
                    targets.append(price_changes)
            
            if len(features) > 10:
                # モデル訓練
                model = RandomForestRegressor(n_estimators=100, random_state=42)
                model.fit(features, targets)
                return model
            
        except Exception as e:
            print(f"Volatility model training error: {e}")
        
        return None

    async def train_anomaly_model(self, data: List[Dict]) -> IsolationForest:
        """異常値検出モデルの訓練"""
        try:
            df = pd.DataFrame(data)
            
            # 正常な利益率の範囲を学習
            profit_margins = df['profit_margin'].fillna(0).values.reshape(-1, 1)
            
            if len(profit_margins) > 20:
                model = IsolationForest(contamination=0.1, random_state=42)
                model.fit(profit_margins)
                return model
            
        except Exception as e:
            print(f"Anomaly model training error: {e}")
        
        return None

    async def train_demand_model(self, data: List[Dict]) -> RandomForestRegressor:
        """需要予測モデルの訓練"""
        try:
            # 需要予測のための特徴量とターゲット作成
            df = pd.DataFrame(data)
            
            # 月別売上データを作成
            df['month'] = pd.to_datetime(df['calculated_at']).dt.month
            df['dayofweek'] = pd.to_datetime(df['calculated_at']).dt.dayofweek
            
            features = []
            targets = []
            
            for _, row in df.iterrows():
                feature_vector = [
                    row['ebay_selling_price'],
                    row['month'],
                    row['dayofweek'],
                    row.get('profit_margin', 0),
                    hash(str(row.get('category_id', 0))) % 1000,
                ]
                features.append(feature_vector)
                # 売上量をターゲットとする（利益から逆算）
                estimated_volume = max(1, row.get('net_profit', 0) / max(1, row.get('profit_margin', 1)))
                targets.append(estimated_volume)
            
            if len(features) > 20:
                model = RandomForestRegressor(n_estimators=50, random_state=42)
                model.fit(features, targets)
                return model
            
        except Exception as e:
            print(f"Demand model training error: {e}")
        
        return None

    async def predict_price_volatility(self, product_data: Dict) -> float:
        """機械学習による価格変動予測"""
        try:
            model = self.ml_models.get('price_volatility')
            if not model:
                return 0.5
            
            feature_vector = [[
                product_data.get('ebay_selling_price', 0),
                0,  # domestic_price (後で取得)
                0,  # profit_margin (後で計算)
                hash(str(product_data.get('category_id', 0))) % 1000,
                len(str(product_data.get('title', ''))),
            ]]
            
            prediction = model.predict(feature_vector)[0]
            return max(0.0, min(1.0, prediction))
            
        except Exception as e:
            print(f"Price volatility prediction error: {e}")
            return 0.5

    def calculate_price_volatility_from_history(self, row: Dict) -> Optional[float]:
        """履歴データから価格変動率を計算"""
        # 実装では過去の価格履歴を使って標準偏差を計算
        # ここでは簡略化
        profit_margin = row.get('profit_margin', 0)
        if profit_margin > 50:
            return 0.2  # 高利益率は低変動
        elif profit_margin > 20:
            return 0.5
        else:
            return 0.8  # 低利益率は高変動

    async def fetch_price_history(self, category_id: str, days: int = 90) -> List[Dict]:
        """価格履歴データ取得"""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT ebay_selling_price as price, created_at
                FROM products
                WHERE category_id = $1 
                AND created_at > NOW() - INTERVAL '%s days'
                ORDER BY created_at DESC
            """, category_id, days)
            
            return [{'price': row['price'], 'date': row['created_at']} for row in rows]

    async def get_category_volatility(self, category_id: str) -> float:
        """カテゴリ平均変動率取得"""
        # カテゴリ別のデフォルト変動率
        volatility_map = {
            '293': 0.4,    # Consumer Electronics
            '58058': 0.6,  # Cell Phones & Accessories  
            '11450': 0.3,  # Clothing, Shoes & Accessories
            '550': 0.5,    # Art
        }
        return volatility_map.get(str(category_id), 0.5)

    async def fetch_similar_products(self, title: str, category_id: str) -> List[Dict]:
        """類似商品検索"""
        # タイトルから主要キーワード抽出
        keywords = self.extract_search_keywords(title)
        
        async with self.db_pool.acquire() as conn:
            query = """
                SELECT title, ebay_selling_price, ebay_sold_quantity
                FROM products
                WHERE category_id = $1
                AND (title ILIKE ANY($2))
                AND created_at > NOW() - INTERVAL '30 days'
                LIMIT 100
            """
            
            like_patterns = [f'%{keyword}%' for keyword in keywords[:3]]
            rows = await conn.fetch(query, category_id, like_patterns)
            
            return [dict(row) for row in rows]

    def extract_search_keywords(self, title: str) -> List[str]:
        """タイトルから検索キーワード抽出"""
        # 基本的な前処理
        title = re.sub(r'[^\w\s]', ' ', title.lower())
        words = title.split()
        
        # ストップワード除去
        stop_words = {'new', 'used', 'for', 'with', 'the', 'and', 'or', 'in', 'on', 'at'}
        keywords = [word for word in words if word not in stop_words and len(word) > 2]
        
        return keywords[:5]

    def analyze_price_competition(self, price: float, similar_products: List[Dict]) -> float:
        """価格競合分析"""
        if not similar_products:
            return 0.0
            
        competitor_prices = [p.get('ebay_selling_price', 0) for p in similar_products]
        competitor_prices = [p for p in competitor_prices if p > 0]
        
        if not competitor_prices:
            return 0.0
        
        # 価格帯の近さを評価
        price_range = (price * 0.8, price * 1.2)
        competitors_in_range = sum(1 for p in competitor_prices if price_range[0] <= p <= price_range[1])
        
        return competitors_in_range / len(competitor_prices)

    def analyze_seller_competition(self, similar_products: List[Dict]) -> float:
        """セラー競合分析"""
        if not similar_products:
            return 0.0
        
        # 販売実績による大手セラー判定
        high_volume_sellers = sum(1 for p in similar_products if p.get('ebay_sold_quantity', 0) > 100)
        
        return high_volume_sellers / len(similar_products)

    async def get_category_seasonality(self, category_id: str, current_month: int) -> float:
        """カテゴリ別季節性リスク"""
        seasonal_categories = {
            '888': {  # Sporting Goods
                'peak_months': [4, 5, 6, 7, 8],  # Spring/Summer
                'low_months': [11, 12, 1, 2]
            },
            '11700': {  # Home & Garden
                'peak_months': [3, 4, 5, 6],  # Spring
                'low_months': [11, 12, 1]
            }
        }
        
        category_data = seasonal_categories.get(str(category_id))
        if not category_data:
            return 0.1  # 低季節性
        
        if current_month in category_data['low_months']:
            return 0.7
        elif current_month in category_data['peak_months']:
            return 0.1
        else:
            return 0.4

    async def get_market_price_range(self, brand: str, category_id: str) -> Optional[float]:
        """市場価格帯取得"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT AVG(ebay_selling_price) as avg_price
                FROM products
                WHERE LOWER(title) LIKE $1
                AND category_id = $2
                AND created_at > NOW() - INTERVAL '30 days'
            """, f'%{brand.lower()}%', category_id)
            
            return row['avg_price'] if row else None

    async def get_category_name(self, category_id: str) -> str:
        """カテゴリ名取得"""
        category_names = {
            '293': 'Consumer Electronics',
            '58058': 'Cell Phones & Accessories',
            '11450': 'Clothing, Shoes & Accessories',
            '550': 'Art',
            '888': 'Sporting Goods',
            '11700': 'Home & Garden'
        }
        return category_names.get(str(category_id), 'Other')

    async def assess_international_regulation_risk(self, product_data: Dict) -> float:
        """国際規制リスク評価"""
        title = product_data.get('title', '').lower()
        
        # 輸出入規制品目キーワード
        restricted_keywords = ['battery', 'lithium', 'medical', 'pharmaceutical', 
                              'electronic', 'radio', 'wireless', 'bluetooth']
        
        risk_score = 0.0
        for keyword in restricted_keywords:
            if keyword in title:
                risk_score += 0.1
        
        return min(0.5, risk_score)  # 最大50%

    async def get_category_liquidity(self, category_id: str) -> float:
        """カテゴリ流動性評価"""
        # カテゴリ別流動性マップ
        liquidity_map = {
            '293': 0.2,    # Consumer Electronics - 高流動性
            '58058': 0.1,  # Cell Phones - 最高流動性
            '11450': 0.3,  # Clothing - 中流動性
            '550': 0.6,    # Art - 低流動性
        }
        return liquidity_map.get(str(category_id), 0.4)

    async def close(self):
        """リソースクリーンアップ"""
        if self.session:
            await self.session.close()
        if self.db_pool:
            await self.db_pool.close()


# 市場分析サービス
class MarketAnalyzerService:
    def __init__(self):
        self.db_pool = None
        self.session = None

    async def initialize(self):
        """サービス初期化"""
        self.db_pool = await asyncpg.create_pool(settings.DATABASE_URL)
        self.session = aiohttp.ClientSession()

    async def analyze_market_conditions(self, product_data: Dict) -> MarketAnalysis:
        """市場状況分析"""
        try:
            category_id = product_data.get('category_id')
            title = product_data.get('title', '')
            
            # トレンド方向分析
            trend_direction, trend_strength = await self.analyze_price_trend(category_id)
            
            # 市場規模推定
            market_size = await self.estimate_market_size(category_id)
            
            # 成長率分析
            growth_rate = await self.calculate_growth_rate(category_id)
            
            # 季節性指数
            seasonality_index = await self.calculate_seasonality_index(category_id)
            
            # 競合激度
            competition_intensity = await self.analyze_competition_intensity(category_id)
            
            # 価格変動性
            price_volatility = await self.calculate_price_volatility(category_id)
            
            # 需要予測
            demand_forecast = await self.generate_demand_forecast(product_data)
            
            # データ品質評価
            data_quality = await self.evaluate_data_quality(category_id)

            return MarketAnalysis(
                trend_direction=trend_direction,
                trend_strength=trend_strength,
                market_size_estimate=market_size,
                growth_rate=growth_rate,
                seasonality_index=seasonality_index,
                competition_intensity=competition_intensity,
                price_volatility=price_volatility,
                demand_forecast=demand_forecast,
                data_quality_score=data_quality
            )

        except Exception as e:
            print(f"Market analysis error: {e}")
            return self.get_default_market_analysis()

    async def analyze_price_trend(self, category_id: str) -> Tuple[str, float]:
        """価格トレンド分析"""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT ebay_selling_price, created_at
                FROM products
                WHERE category_id = $1
                AND created_at > NOW() - INTERVAL '90 days'
                ORDER BY created_at ASC
            """, category_id)
            
            if len(rows) < 10:
                return 'stable', 0.5
            
            prices = [row['ebay_selling_price'] for row in rows]
            
            # 線形回帰でトレンド計算
            x = np.arange(len(prices))
            slope = np.polyfit(x, prices, 1)[0]
            
            # トレンド方向と強さを決定
            if abs(slope) < 0.1:
                return 'stable', abs(slope) * 10
            elif slope > 0:
                return 'up', min(1.0, slope / 2)
            else:
                return 'down', min(1.0, abs(slope) / 2)

    async def estimate_market_size(self, category_id: str) -> float:
        """市場規模推定"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT COUNT(*) as product_count,
                       AVG(ebay_selling_price) as avg_price,
                       SUM(ebay_sold_quantity) as total_sold
                FROM products
                WHERE category_id = $1
                AND created_at > NOW() - INTERVAL '30 days'
            """, category_id)
            
            if row:
                # 簡易市場規模 = 平均価格 × 総販売数
                market_size = (row['avg_price'] or 0) * (row['total_sold'] or 0)
                return float(market_size)
            
            return 0.0

    async def calculate_growth_rate(self, category_id: str) -> float:
        """成長率計算"""
        async with self.db_pool.acquire() as conn:
            # 前月と今月の売上比較
            current_month = await conn.fetchrow("""
                SELECT COUNT(*) as count, AVG(ebay_selling_price) as avg_price
                FROM products
                WHERE category_id = $1
                AND created_at > DATE_TRUNC('month', CURRENT_DATE)
            """, category_id)
            
            previous_month = await conn.fetchrow("""
                SELECT COUNT(*) as count, AVG(ebay_selling_price) as avg_price
                FROM products
                WHERE category_id = $1
                AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                AND created_at < DATE_TRUNC('month', CURRENT_DATE)
            """, category_id)
            
            current_value = (current_month['count'] or 0) * (current_month['avg_price'] or 0)
            previous_value = (previous_month['count'] or 0) * (previous_month['avg_price'] or 0)
            
            if previous_value > 0:
                growth_rate = (current_value - previous_value) / previous_value
                return growth_rate
            
            return 0.0

    async def calculate_seasonality_index(self, category_id: str) -> float:
        """季節性指数計算"""
        current_month = datetime.now().month
        
        # カテゴリ別季節性パターン
        seasonal_patterns = {
            '11450': {  # Clothing
                'peak_months': [9, 10, 11, 3, 4],
                'index': 0.8
            },
            '888': {  # Sporting Goods
                'peak_months': [4, 5, 6, 7, 8],
                'index': 0.7
            }
        }
        
        pattern = seasonal_patterns.get(str(category_id))
        if pattern and current_month in pattern['peak_months']:
            return pattern['index']
        elif pattern:
            return 0.3
        
        return 0.5  # 中立

    async def analyze_competition_intensity(self, category_id: str) -> float:
        """競合激度分析"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT COUNT(DISTINCT title) as unique_products,
                       COUNT(*) as total_listings,
                       AVG(ebay_sold_quantity) as avg_sold
                FROM products
                WHERE category_id = $1
                AND created_at > NOW() - INTERVAL '30 days'
            """, category_id)
            
            if row and row['total_listings'] > 0:
                # 競合激度 = 総出品数 / ユニーク商品数
                intensity = row['total_listings'] / max(1, row['unique_products'])
                return min(1.0, intensity / 5)  # 正規化
            
            return 0.5

    async def calculate_price_volatility(self, category_id: str) -> float:
        """価格変動性計算"""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT ebay_selling_price
                FROM products
                WHERE category_id = $1
                AND created_at > NOW() - INTERVAL '30 days'
                AND ebay_selling_price > 0
            """, category_id)
            
            if len(rows) < 5:
                return 0.5
            
            prices = [row['ebay_selling_price'] for row in rows]
            volatility = np.std(prices) / np.mean(prices)  # 変動係数
            
            return min(1.0, volatility * 2)  # 正規化

    async def generate_demand_forecast(self, product_data: Dict) -> List[Dict]:
        """需要予測生成"""
        # 簡略化された需要予測
        forecast = []
        current_date = datetime.now()
        
        for i in range(12):  # 12ヶ月先まで予測
            future_date = current_date + timedelta(days=30 * i)
            
            # 季節性を考慮した需要予測
            base_demand = 100
            seasonal_factor = 1 + 0.2 * np.sin(2 * np.pi * future_date.month / 12)
            predicted_demand = base_demand * seasonal_factor
            
            forecast.append({
                'month': future_date.strftime('%Y-%m'),
                'predicted_demand': round(predicted_demand),
                'confidence': 0.7
            })
        
        return forecast

    async def evaluate_data_quality(self, category_id: str) -> float:
        """データ品質評価"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT COUNT(*) as total_count,
                       COUNT(CASE WHEN ebay_selling_price > 0 THEN 1 END) as price_count,
                       COUNT(CASE WHEN ebay_sold_quantity > 0 THEN 1 END) as sold_count
                FROM products
                WHERE category_id = $1
                AND created_at > NOW() - INTERVAL '30 days'
            """, category_id)
            
            if row and row['total_count'] > 0:
                price_quality = row['price_count'] / row['total_count']
                sold_quality = row['sold_count'] / row['total_count']
                return (price_quality + sold_quality) / 2
            
            return 0.3

    def get_default_market_analysis(self) -> MarketAnalysis:
        """デフォルト市場分析"""
        return MarketAnalysis(
            trend_direction='stable',
            trend_strength=0.5,
            market_size_estimate=0.0,
            growth_rate=0.0,
            seasonality_index=0.5,
            competition_intensity=0.5,
            price_volatility=0.5,
            demand_forecast=[],
            data_quality_score=0.3
        )

    async def close(self):
        """リソースクリーンアップ"""
        if self.session:
            await self.session.close()
        if self.db_pool:
            await self.db_pool.close()