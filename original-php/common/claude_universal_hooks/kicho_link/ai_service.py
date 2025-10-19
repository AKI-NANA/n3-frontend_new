#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
ai_service.py - AIモデル連携サービス

このモジュールは複数のAIプロバイダー（DeepSeek, Ollama）と連携し、
トランザクションの分析と適切な勘定科目の推測を行います。
"""

import json
import re
import asyncio
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple, Union
from pydantic import BaseModel, Field

import httpx
import ollama

from utils.config import settings
from utils.logger import setup_logger, log_to_jsonl

# ロガー設定
logger = setup_logger()

class AIAnalysisResult(BaseModel):
    """AI分析結果モデル"""
    debit_account: str = Field(..., description="推測された借方勘定科目")
    credit_account: str = Field(..., description="推測された貸方勘定科目")
    confidence: float = Field(..., description="信頼度 (0.0-1.0)")
    reasoning: Optional[str] = Field(None, description="推論理由")
    rule_suggestion: Optional[str] = Field(None, description="ルール提案")
    alternatives: Optional[List[Dict[str, Any]]] = Field(None, description="代替案")

class AIModelConnector(ABC):
    """AIモデル連携の基底クラス"""
    
    @abstractmethod
    async def analyze_transaction(
        self,
        description: str,
        amount: float,
        date: datetime,
        existing_rules: Optional[List[Dict[str, Any]]] = None
    ) -> AIAnalysisResult:
        """トランザクションを分析して勘定科目を推測
        
        Args:
            description: 取引の摘要
            amount: 金額
            date: 取引日
            existing_rules: 既存のルール（参考用）
            
        Returns:
            AI分析結果
        """
        pass

class DeepSeekConnector(AIModelConnector):
    """DeepSeek APIとの連携クラス"""
    
    def __init__(self):
        """初期化"""
        self.api_key = settings.DEEPSEEK_API_KEY
        self.api_url = settings.DEEPSEEK_API_URL
        self.model = "deepseek-chat"  # デフォルトモデル
    
    async def analyze_transaction(
        self,
        description: str,
        amount: float,
        date: datetime,
        existing_rules: Optional[List[Dict[str, Any]]] = None
    ) -> AIAnalysisResult:
        """トランザクションを分析して勘定科目を推測
        
        Args:
            description: 取引の摘要
            amount: 金額
            date: 取引日
            existing_rules: 既存のルール（参考用）
            
        Returns:
            AI分析結果
        """
        if not self.api_key:
            raise Exception("DeepSeek APIキーが設定されていません")
        
        # プロンプト作成
        rules_text = ""
        if existing_rules and len(existing_rules) > 0:
            rules_text = "以下は既存のルールです。参考にしてください：\n\n"
            for i, rule in enumerate(existing_rules[:10]):  # 最大10件まで
                rules_text += f"{i+1}. キーワード: {rule['keyword']}, 借方: {rule['debit']}, 貸方: {rule['credit']}\n"
        
        system_prompt = """
あなたは会計と仕訳の専門AIアシスタントです。与えられた取引の摘要と金額から、
最適な借方と貸方の勘定科目を日本の会計基準に基づいて推測してください。

基本的な勘定科目の例：
- 資産科目: 現金、普通預金、売掛金、前払費用、仮払金
- 負債科目: 買掛金、未払金、預り金、前受金、借入金
- 収益科目: 売上、雑収入、受取利息
- 費用科目: 仕入、給料手当、旅費交通費、通信費、水道光熱費、消耗品費、支払手数料

回答は必ず以下のJSON形式で返してください：
{
  "debit_account": "借方勘定科目",
  "credit_account": "貸方勘定科目",
  "confidence": 0.8,  // 0.0～1.0の範囲で信頼度を示す
  "reasoning": "この判断に至った理由の簡潔な説明",
  "rule_suggestion": "（任意）この取引に適用できる一般的なルールの提案",
  "alternatives": [  // （任意）代替となる勘定科目の組み合わせ
    {
      "debit_account": "代替借方勘定科目",
      "credit_account": "代替貸方勘定科目",
      "confidence": 0.6
    }
  ]
}
"""
        user_prompt = f"""
以下の取引情報を分析して、最適な借方と貸方の勘定科目を推測してください：

摘要: {description}
金額: {amount:,.0f}円
日付: {date.strftime('%Y年%m月%d日')}

{rules_text}
"""
        
        # APIリクエスト
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3,  # 低い温度で決定的な回答を得る
            "max_tokens": 2000
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=30
                )
                
                response.raise_for_status()
                result = response.json()
                
                # レスポンスからJSONを抽出
                content = result["choices"][0]["message"]["content"]
                json_match = re.search(r'({[\s\S]*})', content)
                
                if json_match:
                    json_str = json_match.group(1)
                    try:
                        analysis = json.loads(json_str)
                        return AIAnalysisResult(**analysis)
                    except json.JSONDecodeError as e:
                        logger.error(f"JSON解析エラー: {e}")
                        raise Exception(f"DeepSeekの応答をJSONとして解析できませんでした: {e}")
                else:
                    logger.error(f"JSON形式の回答が見つかりませんでした: {content}")
                    raise Exception("DeepSeekからJSON形式の回答が得られませんでした")
                
        except httpx.RequestError as e:
            logger.error(f"DeepSeek API呼び出しエラー: {e}")
            raise Exception(f"DeepSeek APIとの通信エラー: {e}")
            
        except Exception as e:
            logger.error(f"DeepSeek分析エラー: {e}")
            raise

class OllamaConnector(AIModelConnector):
    """Ollama APIとの連携クラス"""
    
    def __init__(self):
        """初期化"""
        self.api_url = settings.OLLAMA_API_URL
        self.model = settings.OLLAMA_MODEL
    
    async def analyze_transaction(
        self,
        description: str,
        amount: float,
        date: datetime,
        existing_rules: Optional[List[Dict[str, Any]]] = None
    ) -> AIAnalysisResult:
        """トランザクションを分析して勘定科目を推測
        
        Args:
            description: 取引の摘要
            amount: 金額
            date: 取引日
            existing_rules: 既存のルール（参考用）
            
        Returns:
            AI分析結果
        """
        # プロンプト作成
        rules_text = ""
        if existing_rules and len(existing_rules) > 0:
            rules_text = "以下は既存のルールです。参考にしてください：\n\n"
            for i, rule in enumerate(existing_rules[:10]):  # 最大10件まで
                rules_text += f"{i+1}. キーワード: {rule['keyword']}, 借方: {rule['debit']}, 貸方: {rule['credit']}\n"
        
        system_prompt = """
あなたは会計と仕訳の専門AIアシスタントです。与えられた取引の摘要と金額から、
最適な借方と貸方の勘定科目を日本の会計基準に基づいて推測してください。

基本的な勘定科目の例：
- 資産科目: 現金、普通預金、売掛金、前払費用、仮払金
- 負債科目: 買掛金、未払金、預り金、前受金、借入金
- 収益科目: 売上、雑収入、受取利息
- 費用科目: 仕入、給料手当、旅費交通費、通信費、水道光熱費、消耗品費、支払手数料

回答は必ず以下のJSON形式で返してください：
{
  "debit_account": "借方勘定科目",
  "credit_account": "貸方勘定科目",
  "confidence": 0.8,  // 0.0～1.0の範囲で信頼度を示す
  "reasoning": "この判断に至った理由の簡潔な説明",
  "rule_suggestion": "（任意）この取引に適用できる一般的なルールの提案",
  "alternatives": [  // （任意）代替となる勘定科目の組み合わせ
    {
      "debit_account": "代替借方勘定科目",
      "credit_account": "代替貸方勘定科目",
      "confidence": 0.6
    }
  ]
}
"""
        user_prompt = f"""
以下の取引情報を分析して、最適な借方と貸方の勘定科目を推測してください：

摘要: {description}
金額: {amount:,.0f}円
日付: {date.strftime('%Y年%m月%d日')}

{rules_text}

必ずJSON形式で回答してください。
"""
        
        try:
            # Ollamaへのリクエスト
            client = ollama.Client(host=self.api_url)
            response = client.chat(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                options={"temperature": 0.3}
            )
            
            # レスポンスからJSONを抽出
            content = response["message"]["content"]
            json_match = re.search(r'({[\s\S]*})', content)
            
            if json_match:
                json_str = json_match.group(1)
                try:
                    analysis = json.loads(json_str)
                    return AIAnalysisResult(**analysis)
                except json.JSONDecodeError as e:
                    logger.error(f"JSON解析エラー: {e}")
                    raise Exception(f"Ollamaの応答をJSONとして解析できませんでした: {e}")
            else:
                logger.error(f"JSON形式の回答が見つかりませんでした: {content}")
                raise Exception("OllamaからJSON形式の回答が得られませんでした")
            
        except Exception as e:
            logger.error(f"Ollama分析エラー: {e}")
            raise

class AIService:
    """AI連携サービス"""
    
    def __init__(self):
        """初期化"""
        self.models = {}
        
        # 利用可能なAIモデルの初期化
        if settings.is_deepseek_configured():
            self.models["deepseek"] = DeepSeekConnector()
            logger.info("DeepSeek APIを初期化しました")
        
        # Ollamaは常に利用可能（ローカル実行のため）
        self.models["ollama"] = OllamaConnector()
        logger.info(f"Ollama APIを初期化しました (モデル: {settings.OLLAMA_MODEL})")
        
        # デフォルトモデルの設定
        self.default_model = "deepseek" if "deepseek" in self.models else "ollama"
    
    def is_available(self) -> bool:
        """AIサービスが利用可能かどうか確認
        
        Returns:
            利用可能フラグ
        """
        return len(self.models) > 0
    
    def list_available_models(self) -> List[str]:
        """利用可能なAIモデルの一覧を取得
        
        Returns:
            モデル名のリスト
        """
        return list(self.models.keys())
    
    async def analyze_transaction(
        self,
        description: str,
        amount: float,
        date: datetime,
        existing_rules: Optional[List[Dict[str, Any]]] = None,
        model_name: Optional[str] = None
    ) -> AIAnalysisResult:
        """トランザクションを分析して勘定科目を推測
        
        Args:
            description: 取引の摘要
            amount: 金額
            date: 取引日
            existing_rules: 既存のルール（参考用）
            model_name: 使用するAIモデル名
            
        Returns:
            AI分析結果
            
        Raises:
            Exception: 分析エラー
        """
        # モデル選択
        model_name = model_name or self.default_model
        
        if model_name not in self.models:
            available_models = ", ".join(self.models.keys())
            raise Exception(f"指定されたモデル '{model_name}' は利用できません。利用可能なモデル: {available_models}")
        
        model = self.models[model_name]
        
        # 分析実行
        try:
            start_time = datetime.utcnow()
            
            result = await model.analyze_transaction(
                description=description,
                amount=amount,
                date=date,
                existing_rules=existing_rules
            )
            
            end_time = datetime.utcnow()
            processing_time = (end_time - start_time).total_seconds()
            
            # ログ記録
            logger.info(f"AI分析完了: {model_name}, 処理時間: {processing_time:.2f}秒")
            logger.info(f"分析結果: 借方={result.debit_account}, 貸方={result.credit_account}, 信頼度={result.confidence:.2f}")
            
            return result
            
        except Exception as e:
            logger.error(f"AI分析エラー ({model_name}): {e}")
            
            # エラーログ記録
            log_to_jsonl(
                {
                    "type": "ai_analysis_error",
                    "model": model_name,
                    "error": str(e),
                    "transaction": {
                        "description": description,
                        "amount": amount,
                        "date": date.isoformat()
                    },
                    "timestamp": datetime.utcnow().isoformat()
                },
                settings.ERROR_LOG_FILE
            )
            
            raise
    
    async def suggest_rule(
        self,
        transactions: List[Dict[str, Any]],
        model_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """類似トランザクションからルールを提案
        
        Args:
            transactions: トランザクションのリスト
                [
                    {
                        "description": str,
                        "amount": float,
                        "date": datetime
                    },
                    ...
                ]
            model_name: 使用するAIモデル名
            
        Returns:
            ルール提案
                {
                    "keyword": str,
                    "debit_account": str,
                    "credit_account": str,
                    "confidence": float,
                    "description": str
                }
        """
        # モデル選択
        model_name = model_name or self.default_model
        
        if model_name not in self.models:
            available_models = ", ".join(self.models.keys())
            raise Exception(f"指定されたモデル '{model_name}' は利用できません。利用可能なモデル: {available_models}")
        
        if not transactions:
            raise Exception("トランザクションが指定されていません")
        
        # 代表的なトランザクションを選択（最新のもの）
        sample_tx = transactions[0]
        
        # システムプロンプト
        system_prompt = """
あなたは会計ルール作成の専門AIアシスタントです。
以下のような類似する複数の取引から、共通のパターンを抽出して、
汎用的な会計ルールを作成してください。

ルールには以下の要素が必要です：
1. キーワード: 取引摘要に含まれる特徴的な単語やフレーズ
2. 借方勘定科目: すべての類似取引に適用できる借方科目
3. 貸方勘定科目: すべての類似取引に適用できる貸方科目
4. 説明: このルールがどのような取引に適用されるかの説明

回答は必ず以下のJSON形式で返してください：
{
  "keyword": "特徴的なキーワード",
  "debit_account": "借方勘定科目",
  "credit_account": "貸方勘定科目",
  "confidence": 0.8,  // 0.0～1.0の範囲で信頼度を示す
  "description": "このルールの説明"
}
"""
        
        # ユーザープロンプト
        transactions_text = "\n\n".join([
            f"取引 {i+1}:\n摘要: {tx['description']}\n金額: {tx['amount']:,.0f}円\n日付: {tx['date'].strftime('%Y年%m月%d日')}"
            for i, tx in enumerate(transactions[:10])  # 最大10件まで
        ])
        
        user_prompt = f"""
以下の類似する取引から、共通のパターンを抽出して、汎用的な会計ルールを作成してください：

{transactions_text}

これらの取引に対して適用できる共通のルールをJSON形式で回答してください。
キーワードは摘要から抽出した特徴的な文字列で、これがあれば同様の会計処理ができるものを選んでください。
"""
        
        try:
            # DeepSeekはレスポンスの質が良いため優先利用
            if "deepseek" in self.models:
                model = self.models["deepseek"]
            else:
                model = self.models[model_name]
            
            # APIリクエスト
            if isinstance(model, DeepSeekConnector):
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {model.api_key}"
                }
                
                payload = {
                    "model": model.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.3
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        model.api_url,
                        headers=headers,
                        json=payload,
                        timeout=30
                    )
                    
                    response.raise_for_status()
                    result = response.json()
                    content = result["choices"][0]["message"]["content"]
            else:
                # Ollamaの場合
                client = ollama.Client(host=model.api_url)
                response = client.chat(
                    model=model.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    options={"temperature": 0.3}
                )
                content = response["message"]["content"]
            
            # JSONを抽出
            json_match = re.search(r'({[\s\S]*})', content)
            
            if json_match:
                json_str = json_match.group(1)
                rule_suggestion = json.loads(json_str)
                
                logger.info(f"ルール提案: キーワード={rule_suggestion['keyword']}, 借方={rule_suggestion['debit_account']}, 貸方={rule_suggestion['credit_account']}")
                
                return rule_suggestion
            else:
                logger.error(f"JSON形式の回答が見つかりませんでした: {content}")
                raise Exception("JSON形式のルール提案が得られませんでした")
                
        except Exception as e:
            logger.error(f"ルール提案エラー: {e}")
            
            # エラーログ記録
            log_to_jsonl(
                {
                    "type": "rule_suggestion_error",
                    "model": model_name,
                    "error": str(e),
                    "transactions_count": len(transactions),
                    "timestamp": datetime.utcnow().isoformat()
                },
                settings.ERROR_LOG_FILE
            )
            
            raise
