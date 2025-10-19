#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
ollama_client.py - Ollamaローカル推論クライアント

このモジュールはOllamaを使用したローカルAI推論機能を提供します：
1. HTTP API経由でllama3.1:8b接続
2. 日本語簿記専用プロンプト
3. JSON応答解析・エラーハンドリング
4. 微調整・学習データ投入機能
"""

import asyncio
import json
import logging
import httpx
from datetime import datetime, date
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass

from utils.logger import setup_logger, log_to_jsonl
from utils.config import settings

# ロガー設定
logger = setup_logger()

@dataclass
class OllamaConfig:
    """Ollama設定"""
    base_url: str = "http://localhost:11434"
    model_name: str = "llama3.1:8b"
    timeout: int = 30
    max_retries: int = 3
    temperature: float = 0.1  # 低温度で安定した推論
    max_tokens: int = 512

class OllamaClient:
    """Ollamaクライアント"""
    
    def __init__(self, config: Optional[OllamaConfig] = None):
        """初期化
        
        Args:
            config: Ollama設定（省略時はデフォルト）
        """
        self.config = config or OllamaConfig(
            base_url=settings.OLLAMA_API_URL,
            model_name=settings.OLLAMA_MODEL
        )
        
        # 会計専用プロンプトテンプレート
        self.accounting_system_prompt = """
あなたは日本の企業会計に精通した経理専門AIです。
取引の内容から適切な仕訳（借方・貸方の勘定科目）を判定してください。

## 判定ルール:
1. 日本の企業会計基準に準拠
2. 一般的な中小企業の勘定科目を使用
3. 消費税の取り扱いを考慮
4. 信頼度（0-100%）を必ず含める

## 勘定科目例:
借方: 現金, 普通預金, 売掛金, 商品, 建物, 車両運搬具, 旅費交通費, 消耗品費, 通信費, 水道光熱費, 賃借料, 給料手当, 法定福利費, 雑費
貸方: 現金, 普通預金, 買掛金, 借入金, 資本金, 売上高, 雑収入

## 回答形式（JSON必須）:
{
  "debit_account": "借方勘定科目",
  "credit_account": "貸方勘定科目", 
  "confidence": 85.5,
  "reasoning": "判定根拠を簡潔に",
  "suggested_description": "推奨摘要（オプション）",
  "tax_classification": "対象外/課税/非課税/免税（オプション）",
  "tags": ["タグ1", "タグ2"]
}
"""
    
    async def is_available(self) -> bool:
        """Ollama接続確認
        
        Returns:
            接続可能フラグ
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.config.base_url}/api/tags")
                
                if response.status_code == 200:
                    models = response.json()
                    model_names = [model.get('name', '') for model in models.get('models', [])]
                    
                    # 指定モデルの存在確認
                    if self.config.model_name in model_names:
                        logger.info(f"Ollama接続成功: {self.config.model_name}")
                        return True
                    else:
                        logger.warning(f"指定モデル未確認: {self.config.model_name}")
                        logger.info(f"利用可能モデル: {model_names}")
                        return False
                else:
                    logger.error(f"Ollama接続エラー: HTTP {response.status_code}")
                    return False
                    
        except Exception as e:
            logger.error(f"Ollama接続確認エラー: {e}")
            return False
    
    async def infer_journal_entry(self, description: str, amount: float, 
                                date: Union[date, datetime],
                                context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """仕訳推論実行
        
        Args:
            description: 取引摘要
            amount: 金額
            date: 取引日
            context: 追加コンテキスト
            
        Returns:
            推論結果辞書
        """
        try:
            # プロンプト生成
            user_prompt = self._generate_user_prompt(description, amount, date, context)
            
            # Ollama API呼び出し
            response = await self._call_ollama_api(user_prompt)
            
            if response and 'response' in response:
                # JSON応答解析
                parsed_result = self._parse_response(response['response'])
                
                # 結果検証・補正
                validated_result = self._validate_and_correct_result(
                    parsed_result, description, amount
                )
                
                logger.info(f"Ollama推論成功: {validated_result['debit_account']} / {validated_result['credit_account']}")
                return validated_result
            else:
                raise Exception("Ollama応答が不正です")
                
        except Exception as e:
            logger.error(f"Ollama推論エラー: {e}")
            
            # エラーログ記録
            log_to_jsonl(
                {
                    "type": "ollama_inference_error",
                    "error": str(e),
                    "description": description,
                    "amount": amount,
                    "timestamp": datetime.utcnow().isoformat()
                },
                settings.ERROR_LOG_FILE
            )
            
            # フォールバック結果
            return self._generate_fallback_result(description, amount)
    
    async def _call_ollama_api(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Ollama API呼び出し"""
        for attempt in range(self.config.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.config.timeout) as client:
                    payload = {
                        "model": self.config.model_name,
                        "prompt": prompt,
                        "system": self.accounting_system_prompt,
                        "stream": False,
                        "options": {
                            "temperature": self.config.temperature,
                            "num_predict": self.config.max_tokens,
                            "top_p": 0.9,
                            "repeat_penalty": 1.1
                        }
                    }
                    
                    response = await client.post(
                        f"{self.config.base_url}/api/generate",
                        json=payload
                    )
                    
                    if response.status_code == 200:
                        return response.json()
                    else:
                        raise Exception(f"API呼び出し失敗: HTTP {response.status_code}")
                        
            except Exception as e:
                logger.warning(f"Ollama API呼び出し失敗 (試行 {attempt + 1}/{self.config.max_retries}): {e}")
                
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # 指数バックオフ
                else:
                    raise
        
        return None
    
    def _generate_user_prompt(self, description: str, amount: float, 
                            date: Union[date, datetime],
                            context: Optional[Dict[str, Any]] = None) -> str:
        """ユーザープロンプト生成"""
        
        # 基本情報
        prompt_parts = [
            f"## 取引情報",
            f"摘要: {description}",
            f"金額: {amount:,.0f}円",
            f"取引日: {date}",
        ]
        
        # コンテキスト情報追加
        if context:
            if 'recent_rules' in context and context['recent_rules']:
                prompt_parts.append("\n## 参考ルール（最近の類似取引）:")
                for rule in context['recent_rules'][:5]:  # 上位5件
                    prompt_parts.append(f"- {rule.get('keyword', '')}: {rule.get('debit', '')} / {rule.get('credit', '')}")
            
            if 'transaction_source' in context:
                prompt_parts.append(f"\n取引元: {context['transaction_source']}")
            
            if 'quarter' in context:
                prompt_parts.append(f"会計期: {context['quarter']}Q")
        
        # 特別指示
        prompt_parts.extend([
            "\n## 判定指示:",
            "1. 摘要から取引の性質を分析してください",
            "2. 金額の規模を考慮してください", 
            "3. 信頼度を85%以上にするため、確実な判定をしてください",
            "4. 回答は必ずJSON形式で出力してください",
            "\n回答:"
        ])
        
        return "\n".join(prompt_parts)
    
    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        """応答解析"""
        try:
            # JSON部分の抽出（コードブロック内の場合もある）
            response_text = response_text.strip()
            
            # ```json ``` の除去
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            # JSON解析
            parsed = json.loads(response_text.strip())
            
            return parsed
            
        except json.JSONDecodeError as e:
            logger.warning(f"JSON解析失敗: {e}")
            
            # テキスト解析フォールバック
            return self._parse_text_response(response_text)
    
    def _parse_text_response(self, response_text: str) -> Dict[str, Any]:
        """テキスト応答の解析（JSONフォールバック）"""
        try:
            result = {
                'debit_account': '未分類',
                'credit_account': '未分類',
                'confidence': 50.0,
                'reasoning': 'テキスト解析結果',
                'suggested_description': None,
                'tax_classification': None,
                'tags': []
            }
            
            # 簡易的なキーワード検索
            lines = response_text.lower().split('\n')
            
            for line in lines:
                if '借方' in line or 'debit' in line:
                    # 勘定科目キーワード検索
                    accounts = ['現金', '普通預金', '売掛金', '旅費交通費', '消耗品費', '通信費', '雑費']
                    for account in accounts:
                        if account in line:
                            result['debit_account'] = account
                            break
                
                if '貸方' in line or 'credit' in line:
                    accounts = ['現金', '普通預金', '買掛金', '売上高', '雑収入']
                    for account in accounts:
                        if account in line:
                            result['credit_account'] = account
                            break
                
                if '信頼度' in line or 'confidence' in line:
                    # 数値抽出
                    import re
                    numbers = re.findall(r'\d+\.?\d*', line)
                    if numbers:
                        result['confidence'] = min(float(numbers[0]), 100.0)
            
            return result
            
        except Exception as e:
            logger.error(f"テキスト解析エラー: {e}")
            return {
                'debit_account': '未分類',
                'credit_account': '未分類',
                'confidence': 30.0,
                'reasoning': f'解析失敗: {str(e)}',
                'suggested_description': None,
                'tax_classification': None,
                'tags': []
            }
    
    def _validate_and_correct_result(self, result: Dict[str, Any], 
                                   description: str, amount: float) -> Dict[str, Any]:
        """結果検証・補正"""
        
        # 必須フィールドのデフォルト値設定
        validated = {
            'debit_account': result.get('debit_account', '未分類'),
            'credit_account': result.get('credit_account', '未分類'),
            'confidence': float(result.get('confidence', 50.0)),
            'reasoning': result.get('reasoning', 'Ollama推論結果'),
            'suggested_description': result.get('suggested_description'),
            'tax_classification': result.get('tax_classification'),
            'tags': result.get('tags', [])
        }
        
        # 信頼度範囲チェック
        validated['confidence'] = max(0.0, min(100.0, validated['confidence']))
        
        # 勘定科目の妥当性チェック
        valid_accounts = {
            '現金', '普通預金', '当座預金', '売掛金', '買掛金', '商品', '建物', '車両運搬具',
            '旅費交通費', '消耗品費', '通信費', '水道光熱費', '賃借料', '給料手当', '法定福利費',
            '雑費', '売上高', '雑収入', '借入金', '資本金', '未分類'
        }
        
        if validated['debit_account'] not in valid_accounts:
            logger.warning(f"無効な借方勘定科目: {validated['debit_account']}")
            validated['debit_account'] = '雑費'  # デフォルト
            validated['confidence'] *= 0.8  # 信頼度低下
        
        if validated['credit_account'] not in valid_accounts:
            logger.warning(f"無効な貸方勘定科目: {validated['credit_account']}")
            validated['credit_account'] = '普通預金'  # デフォルト
            validated['confidence'] *= 0.8  # 信頼度低下
        
        # 矛盾チェック（借方・貸方が同じ）
        if validated['debit_account'] == validated['credit_account']:
            logger.warning("借方・貸方が同一")
            if validated['debit_account'] in ['現金', '普通預金']:
                validated['credit_account'] = '雑収入'
            else:
                validated['credit_account'] = '普通預金'
            validated['confidence'] *= 0.7
        
        # 金額による信頼度調整
        if amount > 1000000:  # 100万円以上は慎重に
            validated['confidence'] *= 0.9
        elif amount < 1000:   # 1000円未満は雑費の可能性
            if validated['debit_account'] not in ['消耗品費', '雑費']:
                validated['confidence'] *= 0.9
        
        return validated
    
    def _generate_fallback_result(self, description: str, amount: float) -> Dict[str, Any]:
        """フォールバック結果生成"""
        
        # 簡易的なキーワードベース判定
        description_lower = description.lower()
        
        if any(keyword in description_lower for keyword in ['交通', 'タクシー', '電車', 'バス']):
            debit_account = '旅費交通費'
        elif any(keyword in description_lower for keyword in ['通信', '電話', 'インターネット']):
            debit_account = '通信費'
        elif any(keyword in description_lower for keyword in ['消耗', '事務用品', '文具']):
            debit_account = '消耗品費'
        elif any(keyword in description_lower for keyword in ['水道', '電気', 'ガス']):
            debit_account = '水道光熱費'
        elif any(keyword in description_lower for keyword in ['給料', '給与', '賃金']):
            debit_account = '給料手当'
        elif any(keyword in description_lower for keyword in ['家賃', '賃料', '地代']):
            debit_account = '賃借料'
        else:
            debit_account = '雑費'
        
        return {
            'debit_account': debit_account,
            'credit_account': '普通預金',
            'confidence': 40.0,  # 低信頼度
            'reasoning': 'Ollamaエラー時のキーワードベース判定',
            'suggested_description': None,
            'tax_classification': '対象外',
            'tags': ['フォールバック']
        }
    
    async def update_training_data(self, learning_data: List[Dict[str, Any]]) -> bool:
        """学習データ更新（ローカルファイン調整）
        
        Args:
            learning_data: 承認された学習データリスト
            
        Returns:
            更新成功フラグ
        """
        try:
            # 学習データをファイン調整形式に変換
            training_file = settings.DATA_DIR / "ollama_training_data.jsonl"
            
            with open(training_file, "a", encoding="utf-8") as f:
                for data in learning_data:
                    approved = data['approved_result']
                    
                    # ファイン調整用データ形式
                    training_sample = {
                        "prompt": f"摘要: {approved.get('description', '')}",
                        "completion": json.dumps({
                            "debit_account": approved.get('debit_account', ''),
                            "credit_account": approved.get('credit_account', ''),
                            "confidence": 95.0  # 承認済みなので高信頼度
                        }, ensure_ascii=False)
                    }
                    
                    f.write(json.dumps(training_sample, ensure_ascii=False) + "\n")
            
            logger.info(f"Ollama学習データ更新: {len(learning_data)}件")
            
            # 注意: 実際のOllamaファイン調整は手動で行う必要があります
            # ollama create custom-accounting-model -f ./Modelfile
            
            return True
            
        except Exception as e:
            logger.error(f"Ollama学習データ更新エラー: {e}")
            return False
    
    async def get_model_info(self) -> Dict[str, Any]:
        """モデル情報取得"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.config.base_url}/api/show",
                    json={"name": self.config.model_name}
                )
                
                if response.status_code == 200:
                    info = response.json()
                    return {
                        'model_name': self.config.model_name,
                        'size': info.get('size', 'unknown'),
                        'modified_at': info.get('modified_at'),
                        'parameters': info.get('details', {}).get('parameters', 'unknown'),
                        'status': 'available'
                    }
                else:
                    return {
                        'model_name': self.config.model_name,
                        'status': 'error',
                        'error': f'HTTP {response.status_code}'
                    }
                    
        except Exception as e:
            logger.error(f"Ollamaモデル情報取得エラー: {e}")
            return {
                'model_name': self.config.model_name,
                'status': 'unavailable',
                'error': str(e)
            }
    
    async def test_inference(self) -> Dict[str, Any]:
        """推論テスト実行"""
        try:
            test_description = "東京駅から新宿駅までのタクシー代"
            test_amount = 3500.0
            test_date = datetime.now().date()
            
            result = await self.infer_journal_entry(
                description=test_description,
                amount=test_amount,
                date=test_date
            )
            
            return {
                'status': 'success',
                'test_input': {
                    'description': test_description,
                    'amount': test_amount,
                    'date': str(test_date)
                },
                'test_output': result,
                'response_time_ms': 0  # 実際の測定は呼び出し元で行う
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'test_input': {
                    'description': "東京駅から新宿駅までのタクシー代",
                    'amount': 3500.0
                }
            }
