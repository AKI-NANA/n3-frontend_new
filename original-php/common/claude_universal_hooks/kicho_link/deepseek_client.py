#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
deepseek_client.py - DeepSeek推論クライアント（高精度）

このモジュールはDeepSeek APIを使用したクラウドAI推論機能を提供します：
1. REST API経由接続
2. APIキー未設定時のフォールバック
3. Ollama結果とのコンセンサス判定
4. レート制限・エラー処理
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
class DeepSeekConfig:
    """DeepSeek設定"""
    api_url: str = "https://api.deepseek.com/v1/chat/completions"
    api_key: Optional[str] = None
    model_name: str = "deepseek-chat"
    timeout: int = 45
    max_retries: int = 2
    temperature: float = 0.2  # 安定した推論のため低温度
    max_tokens: int = 1024

class DeepSeekClient:
    """DeepSeekクライアント"""
    
    def __init__(self, config: Optional[DeepSeekConfig] = None):
        """初期化
        
        Args:
            config: DeepSeek設定（省略時はデフォルト）
        """
        self.config = config or DeepSeekConfig(
            api_url=settings.DEEPSEEK_API_URL,
            api_key=settings.DEEPSEEK_API_KEY
        )
        
        # API制限管理
        self.request_count = 0
        self.last_request_time = None
        self.rate_limit_remaining = 100  # 初期値
        
        # 会計専用システムプロンプト
        self.accounting_system_prompt = """
あなたは日本の公認会計士・税理士として、企業の経理処理に精通している専門家です。
取引内容から最適な仕訳（借方・貸方の勘定科目）を高精度で判定してください。

## 専門知識：
1. 日本の企業会計基準・税法に完全準拠
2. 業種別の会計処理の特殊性を理解
3. 消費税・法人税の取り扱いを正確に判定
4. 経営分析の観点からも最適な科目選択
5. 監査・税務調査での指摘リスクを最小化

## 勘定科目体系（中小企業向け）：
### 資産科目：
流動資産: 現金, 普通預金, 当座預金, 定期預金, 売掛金, 受取手形, 商品, 前払費用, 短期貸付金
固定資産: 建物, 構築物, 機械装置, 車両運搬具, 工具器具備品, 土地, 無形固定資産, 投資有価証券, 敷金保証金

### 負債科目：
流動負債: 買掛金, 支払手形, 短期借入金, 未払金, 未払費用, 前受金, 預り金, 仮受金
固定負債: 長期借入金, 社債, 退職給付引当金, 長期未払金

### 純資産科目：
資本金, 資本剰余金, 利益剰余金, その他の包括利益累計額

### 収益科目：
売上高, 受取利息, 受取配当金, 雑収入, 固定資産売却益, 投資有価証券売却益

### 費用科目：
売上原価, 給料手当, 賞与, 法定福利費, 福利厚生費, 退職給付費用, 
旅費交通費, 通信費, 水道光熱費, 消耗品費, 修繕費, 保険料, 賃借料,
減価償却費, 支払利息, 租税公課, 雑費, 固定資産売却損

## 判定基準：
1. 取引の経済的実質を重視
2. 継続性の原則に配慮
3. 重要性の原則を適用
4. 保守主義の原則で安全性を確保
5. 税務上の取り扱いとの整合性

## 回答形式（必須JSON）：
{
  "debit_account": "借方勘定科目名",
  "credit_account": "貸方勘定科目名",
  "confidence": 92.5,
  "reasoning": "詳細な判定根拠（会計基準・税法根拠を含む）",
  "suggested_description": "標準化された推奨摘要",
  "tax_classification": "課税/非課税/免税/対象外",
  "risk_assessment": "監査・税務リスクの評価",
  "alternative_treatment": "代替的な会計処理（あれば）",
  "tags": ["業種", "取引類型", "税区分"]
}
"""
    
    async def is_available(self) -> bool:
        """DeepSeek API接続確認
        
        Returns:
            接続可能フラグ
        """
        if not self.config.api_key:
            logger.info("DeepSeek APIキー未設定")
            return False
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-Type": "application/json"
                }
                
                # 簡単なテストリクエスト
                test_payload = {
                    "model": self.config.model_name,
                    "messages": [
                        {"role": "user", "content": "Hello, test connection."}
                    ],
                    "max_tokens": 10
                }
                
                response = await client.post(
                    self.config.api_url,
                    headers=headers,
                    json=test_payload
                )
                
                if response.status_code == 200:
                    logger.info("DeepSeek API接続成功")
                    return True
                elif response.status_code == 401:
                    logger.error("DeepSeek APIキーが無効です")
                    return False
                elif response.status_code == 429:
                    logger.warning("DeepSeek APIレート制限中")
                    return False
                else:
                    logger.error(f"DeepSeek API接続エラー: HTTP {response.status_code}")
                    return False
                    
        except Exception as e:
            logger.error(f"DeepSeek接続確認エラー: {e}")
            return False
    
    async def infer_journal_entry(self, description: str, amount: float,
                                date: Union[date, datetime],
                                context: Optional[Dict[str, Any]] = None,
                                detailed_analysis: bool = True) -> Optional[Dict[str, Any]]:
        """仕訳推論実行（高精度）
        
        Args:
            description: 取引摘要
            amount: 金額
            date: 取引日
            context: 追加コンテキスト
            detailed_analysis: 詳細分析フラグ
            
        Returns:
            推論結果辞書（失敗時はNone）
        """
        # API利用可能性確認
        if not self.config.api_key:
            logger.info("DeepSeek APIキー未設定のためスキップ")
            return None
        
        # レート制限チェック
        if not await self._check_rate_limit():
            logger.warning("DeepSeek APIレート制限によりスキップ")
            return None
        
        try:
            # プロンプト生成
            user_prompt = self._generate_detailed_prompt(
                description, amount, date, context, detailed_analysis
            )
            
            # DeepSeek API呼び出し
            response = await self._call_deepseek_api(user_prompt)
            
            if response and 'choices' in response and response['choices']:
                # レスポンス解析
                content = response['choices'][0]['message']['content']
                parsed_result = self._parse_response(content)
                
                # 結果検証・高度補正
                validated_result = self._validate_and_enhance_result(
                    parsed_result, description, amount, detailed_analysis
                )
                
                # レート制限情報更新
                self._update_rate_limit_info(response)
                
                logger.info(f"DeepSeek推論成功: {validated_result['debit_account']} / {validated_result['credit_account']}")
                return validated_result
            else:
                raise Exception("DeepSeek応答が不正です")
                
        except Exception as e:
            logger.error(f"DeepSeek推論エラー: {e}")
            
            # エラーログ記録
            log_to_jsonl(
                {
                    "type": "deepseek_inference_error",
                    "error": str(e),
                    "description": description,
                    "amount": amount,
                    "api_key_configured": bool(self.config.api_key),
                    "timestamp": datetime.utcnow().isoformat()
                },
                settings.ERROR_LOG_FILE
            )
            
            return None
    
    async def _call_deepseek_api(self, prompt: str) -> Optional[Dict[str, Any]]:
        """DeepSeek API呼び出し"""
        for attempt in range(self.config.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.config.timeout) as client:
                    headers = {
                        "Authorization": f"Bearer {self.config.api_key}",
                        "Content-Type": "application/json",
                        "User-Agent": "Kicho-Tool/1.0"
                    }
                    
                    payload = {
                        "model": self.config.model_name,
                        "messages": [
                            {"role": "system", "content": self.accounting_system_prompt},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": self.config.temperature,
                        "max_tokens": self.config.max_tokens,
                        "top_p": 0.95,
                        "frequency_penalty": 0.1,
                        "presence_penalty": 0.1,
                        "stream": False
                    }
                    
                    response = await client.post(
                        self.config.api_url,
                        headers=headers,
                        json=payload
                    )
                    
                    if response.status_code == 200:
                        self.request_count += 1
                        self.last_request_time = datetime.utcnow()
                        return response.json()
                    elif response.status_code == 429:
                        # レート制限
                        retry_after = int(response.headers.get('retry-after', 60))
                        logger.warning(f"DeepSeek レート制限: {retry_after}秒後に再試行")
                        await asyncio.sleep(min(retry_after, 300))  # 最大5分
                        continue
                    elif response.status_code == 401:
                        raise Exception("APIキーが無効です")
                    else:
                        raise Exception(f"API呼び出し失敗: HTTP {response.status_code}")
                        
            except httpx.TimeoutException:
                logger.warning(f"DeepSeek API タイムアウト (試行 {attempt + 1}/{self.config.max_retries})")
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(5 * (attempt + 1))
                else:
                    raise Exception("APIタイムアウト")
            except Exception as e:
                logger.warning(f"DeepSeek API呼び出し失敗 (試行 {attempt + 1}/{self.config.max_retries}): {e}")
                
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(3 * (attempt + 1))
                else:
                    raise
        
        return None
    
    def _generate_detailed_prompt(self, description: str, amount: float,
                                date: Union[date, datetime],
                                context: Optional[Dict[str, Any]] = None,
                                detailed_analysis: bool = True) -> str:
        """詳細プロンプト生成"""
        
        prompt_parts = [
            "## 会計処理判定依頼",
            f"**取引摘要**: {description}",
            f"**取引金額**: {amount:,.0f}円",
            f"**取引日**: {date}",
        ]
        
        # コンテキスト情報の詳細追加
        if context:
            if 'recent_rules' in context and context['recent_rules']:
                prompt_parts.append("\n### 参考情報（類似取引の過去処理）:")
                for rule in context['recent_rules'][:3]:
                    prompt_parts.append(f"- 「{rule.get('keyword', '')}」→ {rule.get('debit', '')} / {rule.get('credit', '')} (使用回数: {rule.get('hits', 0)})")
            
            if 'transaction_source' in context:
                source_descriptions = {
                    'mf_cloud': 'マネーフォワードクラウド',
                    'csv_import': 'CSVインポート',
                    'manual_entry': '手動入力',
                    'api_integration': 'API連携'
                }
                source_desc = source_descriptions.get(context['transaction_source'], context['transaction_source'])
                prompt_parts.append(f"**データ来源**: {source_desc}")
            
            if 'quarter' in context:
                prompt_parts.append(f"**会計期**: {context['quarter']}四半期")
            
            if 'fiscal_year' in context:
                prompt_parts.append(f"**会計年度**: {context['fiscal_year']}年度")
        
        # 詳細分析要求
        if detailed_analysis:
            prompt_parts.extend([
                "\n### 詳細分析要求:",
                "1. **業種・業界特性の考慮**: 取引の性質から推定される業種特性を分析",
                "2. **税務上の取り扱い**: 消費税・法人税への影響を評価",
                "3. **監査リスク評価**: 会計監査・税務調査での指摘可能性",
                "4. **代替処理の検討**: 他の妥当な会計処理があれば提示",
                "5. **経営分析への影響**: 財務比率・KPIへの影響",
            ])
        
        # 特別な判定指示
        prompt_parts.extend([
            "\n### 判定指示:",
            "- 取引の経済的実質を最優先で判定してください",
            "- 継続性の原則に従い、過去の類似処理との整合性を保ってください", 
            "- 保守主義の原則により、リスクを適切に評価してください",
            "- 信頼度は90%以上を目標としてください",
            "- 判定根拠には具体的な会計基準・税法条文を含めてください",
            "\n**回答（JSON形式必須）**:"
        ])
        
        return "\n".join(prompt_parts)
    
    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        """DeepSeek応答解析"""
        try:
            # JSON部分の抽出
            response_text = response_text.strip()
            
            # マークダウンコードブロックの除去
            if '```json' in response_text:
                json_start = response_text.find('```json') + 7
                json_end = response_text.find('```', json_start)
                if json_end != -1:
                    response_text = response_text[json_start:json_end]
            elif '```' in response_text:
                json_start = response_text.find('```') + 3
                json_end = response_text.find('```', json_start)
                if json_end != -1:
                    response_text = response_text[json_start:json_end]
            
            # JSON解析
            parsed = json.loads(response_text.strip())
            return parsed
            
        except json.JSONDecodeError as e:
            logger.warning(f"DeepSeek JSON解析失敗: {e}")
            
            # 高度なテキスト解析フォールバック
            return self._advanced_text_parsing(response_text)
    
    def _advanced_text_parsing(self, response_text: str) -> Dict[str, Any]:
        """高度なテキスト解析（DeepSeek専用）"""
        try:
            result = {
                'debit_account': '未分類',
                'credit_account': '未分類',
                'confidence': 70.0,  # DeepSeekなので基本信頼度高め
                'reasoning': 'DeepSeek応答のテキスト解析',
                'suggested_description': None,
                'tax_classification': None,
                'risk_assessment': None,
                'alternative_treatment': None,
                'tags': []
            }
            
            lines = response_text.split('\n')
            
            for line in lines:
                line_lower = line.lower()
                
                # 借方勘定科目検索
                if any(keyword in line_lower for keyword in ['借方', 'debit', '借り方']):
                    # より詳細な勘定科目辞書
                    account_mapping = {
                        # 資産
                        '現金': '現金', 'cash': '現金',
                        '普通預金': '普通預金', '預金': '普通預金',
                        '売掛金': '売掛金', '売掛': '売掛金',
                        '商品': '商品', '在庫': '商品',
                        '建物': '建物', '車両': '車両運搬具',
                        # 費用
                        '旅費': '旅費交通費', '交通費': '旅費交通費', '交通': '旅費交通費',
                        '消耗品': '消耗品費', '事務用品': '消耗品費',
                        '通信': '通信費', '電話': '通信費', 'インターネット': '通信費',
                        '水道': '水道光熱費', '電気': '水道光熱費', 'ガス': '水道光熱費',
                        '給料': '給料手当', '給与': '給料手当', '賃金': '給料手当',
                        '家賃': '賃借料', '賃料': '賃借料', '地代': '賃借料',
                        '保険': '保険料', '雑費': '雑費', '修繕': '修繕費'
                    }
                    
                    for keyword, account in account_mapping.items():
                        if keyword in line:
                            result['debit_account'] = account
                            break
                
                # 貸方勘定科目検索
                if any(keyword in line_lower for keyword in ['貸方', 'credit', '貸し方']):
                    account_mapping = {
                        '現金': '現金', '普通預金': '普通預金', '預金': '普通預金',
                        '買掛金': '買掛金', '買掛': '買掛金',
                        '借入金': '借入金', '借入': '短期借入金',
                        '売上': '売上高', '売上高': '売上高',
                        '雑収入': '雑収入', '収入': '雑収入'
                    }
                    
                    for keyword, account in account_mapping.items():
                        if keyword in line:
                            result['credit_account'] = account
                            break
                
                # 信頼度抽出
                if any(keyword in line_lower for keyword in ['信頼', 'confidence', '確信']):
                    import re
                    numbers = re.findall(r'\d+\.?\d*', line)
                    if numbers:
                        confidence = float(numbers[0])
                        # パーセント値でない場合の調整
                        if confidence <= 1.0:
                            confidence *= 100
                        result['confidence'] = min(confidence, 100.0)
                
                # 税区分抽出
                if any(keyword in line_lower for keyword in ['税', 'tax', '課税', '非課税']):
                    if '非課税' in line:
                        result['tax_classification'] = '非課税'
                    elif '免税' in line:
                        result['tax_classification'] = '免税'
                    elif '対象外' in line:
                        result['tax_classification'] = '対象外'
                    elif '課税' in line:
                        result['tax_classification'] = '課税'
                
                # 根拠抽出
                if any(keyword in line_lower for keyword in ['根拠', 'reasoning', '理由']):
                    if len(line) > 10:  # 十分な長さがある場合
                        result['reasoning'] = line.strip()
            
            return result
            
        except Exception as e:
            logger.error(f"DeepSeek高度テキスト解析エラー: {e}")
            return {
                'debit_account': '未分類',
                'credit_account': '未分類',
                'confidence': 50.0,
                'reasoning': f'DeepSeek解析失敗: {str(e)}',
                'suggested_description': None,
                'tax_classification': None,
                'risk_assessment': None,
                'alternative_treatment': None,
                'tags': []
            }
    
    def _validate_and_enhance_result(self, result: Dict[str, Any],
                                   description: str, amount: float,
                                   detailed_analysis: bool) -> Dict[str, Any]:
        """結果検証・高度補正（DeepSeek専用）"""
        
        # 基本検証
        validated = {
            'debit_account': result.get('debit_account', '未分類'),
            'credit_account': result.get('credit_account', '未分類'),
            'confidence': float(result.get('confidence', 70.0)),
            'reasoning': result.get('reasoning', 'DeepSeek高精度推論'),
            'suggested_description': result.get('suggested_description'),
            'tax_classification': result.get('tax_classification', '対象外'),
            'risk_assessment': result.get('risk_assessment'),
            'alternative_treatment': result.get('alternative_treatment'),
            'tags': result.get('tags', [])
        }
        
        # 信頼度範囲チェック
        validated['confidence'] = max(0.0, min(100.0, validated['confidence']))
        
        # 詳細な勘定科目検証
        valid_debit_accounts = {
            # 資産
            '現金', '普通預金', '当座預金', '定期預金', '売掛金', '受取手形', '商品', '前払費用',
            '建物', '構築物', '機械装置', '車両運搬具', '工具器具備品', '土地', '敷金保証金',
            # 費用
            '旅費交通費', '消耗品費', '通信費', '水道光熱費', '賃借料', '給料手当', '法定福利費',
            '修繕費', '保険料', '減価償却費', '支払利息', '租税公課', '雑費', '未分類'
        }
        
        valid_credit_accounts = {
            # 負債
            '買掛金', '支払手形', '短期借入金', '長期借入金', '未払金', '未払費用', '前受金', '預り金',
            # 純資産
            '資本金', '利益剰余金',
            # 収益
            '売上高', '受取利息', '受取配当金', '雑収入',
            # 資産（振替用）
            '現金', '普通預金', '当座預金', '未分類'
        }
        
        # 借方勘定科目検証
        if validated['debit_account'] not in valid_debit_accounts:
            logger.warning(f"DeepSeek: 無効な借方勘定科目 {validated['debit_account']}")
            # より適切な科目に補正
            validated['debit_account'] = self._suggest_debit_account(description, amount)
            validated['confidence'] *= 0.85
        
        # 貸方勘定科目検証
        if validated['credit_account'] not in valid_credit_accounts:
            logger.warning(f"DeepSeek: 無効な貸方勘定科目 {validated['credit_account']}")
            validated['credit_account'] = '普通預金'  # 一般的なデフォルト
            validated['confidence'] *= 0.85
        
        # 矛盾チェック（借方・貸方が同じ）
        if validated['debit_account'] == validated['credit_account']:
            logger.warning("DeepSeek: 借方・貸方が同一")
            if validated['debit_account'] in ['現金', '普通預金']:
                validated['credit_account'] = '雑収入'
            else:
                validated['credit_account'] = '普通預金'
            validated['confidence'] *= 0.8
        
        # 業界特性による信頼度調整
        if detailed_analysis:
            validated['confidence'] = self._adjust_confidence_by_context(
                validated, description, amount
            )
        
        # DeepSeekの高度分析結果の活用
        if 'risk_assessment' in result and result['risk_assessment']:
            # リスク評価に基づく信頼度調整
            if 'リスク' in result['risk_assessment'].lower():
                validated['confidence'] *= 0.95
            elif '安全' in result['risk_assessment'].lower():
                validated['confidence'] = min(95.0, validated['confidence'] * 1.05)
        
        return validated
    
    def _suggest_debit_account(self, description: str, amount: float) -> str:
        """適切な借方勘定科目提案"""
        description_lower = description.lower()
        
        # 高度なキーワードマッチング
        patterns = {
            '旅費交通費': ['交通', 'タクシー', '電車', 'バス', '新幹線', '飛行機', '宿泊', 'ホテル', '出張'],
            '通信費': ['通信', '電話', 'インターネット', '携帯', 'スマホ', 'wifi', 'プロバイダ'],
            '消耗品費': ['消耗', '事務用品', '文具', '用紙', 'ペン', 'ファイル', '封筒'],
            '水道光熱費': ['水道', '電気', 'ガス', '電力', '光熱'],
            '給料手当': ['給料', '給与', '賃金', '手当', '賞与', 'ボーナス'],
            '賃借料': ['家賃', '賃料', '地代', '倉庫', '駐車場'],
            '修繕費': ['修理', '修繕', 'メンテナンス', '保守'],
            '保険料': ['保険', '保険料', '共済'],
            '会議費': ['会議', '打ち合わせ', '懇親会', '接待'],
            '広告宣伝費': ['広告', '宣伝', 'チラシ', 'ホームページ']
        }
        
        for account, keywords in patterns.items():
            if any(keyword in description_lower for keyword in keywords):
                return account
        
        # 金額による推定
        if amount >= 1000000:  # 100万円以上
            return '建物'  # 大型資産の可能性
        elif amount >= 100000:  # 10万円以上
            return '工具器具備品'  # 設備投資の可能性
        else:
            return '雑費'  # デフォルト
    
    def _adjust_confidence_by_context(self, result: Dict[str, Any],
                                    description: str, amount: float) -> float:
        """コンテキストによる信頼度調整"""
        confidence = result['confidence']
        
        # 金額による調整
        if amount > 10000000:  # 1000万円超 - 慎重判定
            confidence *= 0.9
        elif amount < 1000:    # 1000円未満 - 一般的な小口経費
            confidence *= 1.05
        
        # 摘要の具体性による調整
        if len(description) >= 20:  # 詳細な摘要
            confidence *= 1.03
        elif len(description) < 5:   # 簡潔すぎる摘要
            confidence *= 0.95
        
        # 勘定科目の一般性による調整
        if result['debit_account'] in ['雑費', '未分類']:
            confidence *= 0.85  # 曖昧な科目は信頼度低下
        elif result['debit_account'] in ['旅費交通費', '通信費', '消耗品費']:
            confidence *= 1.02  # 一般的な科目は信頼度向上
        
        return min(98.0, confidence)  # DeepSeekでも100%は避ける
    
    async def _check_rate_limit(self) -> bool:
        """レート制限チェック"""
        if not self.last_request_time:
            return True
        
        # 1分間に10リクエストまでの制限
        now = datetime.utcnow()
        time_diff = (now - self.last_request_time).total_seconds()
        
        if time_diff < 6:  # 6秒間隔制限
            logger.info("DeepSeek レート制限: 待機中")
            return False
        
        # 1時間あたりの制限チェック
        if self.request_count >= 100:  # 1時間100リクエスト
            hour_diff = time_diff / 3600
            if hour_diff < 1:
                logger.warning("DeepSeek 時間あたりレート制限に到達")
                return False
            else:
                self.request_count = 0  # リセット
        
        return True
    
    def _update_rate_limit_info(self, response: Dict[str, Any]) -> None:
        """レート制限情報更新"""
        # DeepSeek APIからのヘッダー情報があれば使用
        # 現在は基本的なカウント管理のみ
        pass
    
    async def get_api_status(self) -> Dict[str, Any]:
        """API状態取得"""
        try:
            status_info = {
                'api_configured': bool(self.config.api_key),
                'api_available': await self.is_available(),
                'request_count': self.request_count,
                'rate_limit_remaining': self.rate_limit_remaining,
                'last_request_time': self.last_request_time.isoformat() if self.last_request_time else None,
                'model_name': self.config.model_name
            }
            
            if not self.config.api_key:
                status_info['message'] = 'APIキーが設定されていません'
            elif not status_info['api_available']:
                status_info['message'] = 'API接続に失敗しました'
            else:
                status_info['message'] = 'API利用可能'
            
            return status_info
            
        except Exception as e:
            return {
                'api_configured': bool(self.config.api_key),
                'api_available': False,
                'error': str(e),
                'message': 'ステータス取得エラー'
            }
    
    async def test_inference(self) -> Dict[str, Any]:
        """推論テスト実行"""
        try:
            test_description = "東京駅から新宿駅までのタクシー代 - 取引先との打ち合わせ"
            test_amount = 3500.0
            test_date = datetime.now().date()
            
            start_time = datetime.utcnow()
            
            result = await self.infer_journal_entry(
                description=test_description,
                amount=test_amount,
                date=test_date,
                detailed_analysis=True
            )
            
            response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            if result:
                return {
                    'status': 'success',
                    'test_input': {
                        'description': test_description,
                        'amount': test_amount,
                        'date': str(test_date)
                    },
                    'test_output': result,
                    'response_time_ms': response_time
                }
            else:
                return {
                    'status': 'failed',
                    'message': 'DeepSeek推論に失敗しました',
                    'test_input': {
                        'description': test_description,
                        'amount': test_amount
                    },
                    'response_time_ms': response_time
                }
                
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'test_input': {
                    'description': "東京駅から新宿駅までのタクシー代 - 取引先との打ち合わせ",
                    'amount': 3500.0
                }
            }
                        "