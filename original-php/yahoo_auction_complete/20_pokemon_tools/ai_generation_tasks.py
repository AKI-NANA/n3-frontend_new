# apps/ai_generation/tasks.py
from celery import shared_task
from celery.utils.log import get_task_logger
from django.utils import timezone
from django.conf import settings
import openai
import time
import json
import re
from decimal import Decimal
from datetime import timedelta
from .models import AIGeneratedContent, ContentTemplate, QualityCheck
from .content_generator import ContentGenerator
from .quality_checker import QualityChecker
from apps.cards.models import PokemonCard
from apps.price_tracking.models import PriceAnalysis

logger = get_task_logger(__name__)
openai.api_key = settings.OPENAI_API_KEY

@shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 180})
def generate_content_task(self, template_id, card_ids=None, custom_prompt="", priority='normal'):
    """AI コンテンツ生成タスク"""
    try:
        template = ContentTemplate.objects.get(id=template_id)
        logger.info(f"Starting content generation with template: {template.name}")
        
        start_time = time.time()
        
        # カードデータを取得
        cards = []
        if card_ids:
            cards = PokemonCard.objects.filter(id__in=card_ids)
        else:
            # デフォルトで人気カードを選択
            cards = PokemonCard.objects.filter(is_popular=True).order_by('-view_count')[:5]
        
        # ソースデータを準備
        source_data = prepare_source_data(cards, template)
        
        # コンテンツ生成
        generator = ContentGenerator()
        content_data = generator.generate_content(
            template=template,
            source_data=source_data,
            custom_prompt=custom_prompt
        )
        
        # 生成時間を計算
        generation_time = time.time() - start_time
        
        # AI生成コンテンツを保存
        ai_content = AIGeneratedContent.objects.create(
            template=template,
            title=content_data['title'],
            content=content_data['content'],
            excerpt=content_data.get('excerpt', ''),
            language=template.content_type.split('_')[-1] if '_' in template.content_type else 'ja',
            content_type=template.content_type,
            seo_title=content_data.get('seo_title', ''),
            meta_description=content_data.get('meta_description', ''),
            focus_keyword=content_data.get('focus_keyword', ''),
            keywords=content_data.get('keywords', []),
            source_data=source_data,
            input_prompt=content_data.get('input_prompt', ''),
            generation_time=generation_time,
            token_usage=content_data.get('token_usage', 0),
            generation_cost=content_data.get('generation_cost'),
            status='generated',
            priority=priority
        )
        
        # カードとの関連付け
        if cards:
            ai_content.source_cards.set(cards)
        
        # 品質チェックを自動実行
        quality_check_task.delay(ai_content.id)
        
        # テンプレート統計を更新
        template.update_statistics(
            quality_score=0,  # 品質チェック完了後に更新
            generation_time=generation_time,
            success=True
        )
        
        logger.info(f"Content generated successfully: {ai_content.title}")
        return {
            'content_id': str(ai_content.id),
            'title': ai_content.title,
            'generation_time': generation_time,
            'status': 'success'
        }
        
    except ContentTemplate.DoesNotExist:
        error_msg = f"Template with id {template_id} not found"
        logger.error(error_msg)
        return {'status': 'error', 'message': error_msg}
        
    except Exception as e:
        error_msg = f"Error generating content: {str(e)}"
        logger.error(error_msg)
        
        # エラー情報を保存
        try:
            if 'ai_content' in locals():
                ai_content.status = 'error'
                ai_content.error_message = error_msg
                ai_content.save(update_fields=['status', 'error_message'])
        except:
            pass
            
        raise self.retry(countdown=60, max_retries=3)

@shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 2, 'countdown': 60})
def quality_check_task(self, content_id):
    """コンテンツ品質チェックタスク"""
    try:
        content = AIGeneratedContent.objects.get(id=content_id)
        logger.info(f"Starting quality check for content: {content.title}")
        
        checker = QualityChecker()
        quality_result = checker.check_quality(content)
        
        # 品質チェック結果を保存
        quality_check = QualityCheck.objects.create(
            content=content,
            overall_score=quality_result['overall_score'],
            readability_score=quality_result['readability_score'],
            uniqueness_score=quality_result['uniqueness_score'],
            seo_score=quality_result['seo_score'],
            factual_accuracy_score=quality_result['factual_accuracy_score'],
            plagiarism_check_result=quality_result.get('plagiarism_result', {}),
            suggestions=quality_result.get('suggestions', []),
            issues_found=quality_result.get('issues', []),
            check_details=quality_result
        )
        
        # コンテンツステータスを更新
        if quality_result['overall_score'] >= 80:
            content.status = 'approved'
        elif quality_result['overall_score'] >= 60:
            content.status = 'needs_review'
        else:
            content.status = 'rejected'
            
        content.quality_score = quality_result['overall_score']
        content.save(update_fields=['status', 'quality_score'])
        
        # テンプレート統計を更新
        content.template.update_statistics(
            quality_score=quality_result['overall_score'],
            generation_time=0,
            success=True
        )
        
        logger.info(f"Quality check completed: {content.title} - Score: {quality_result['overall_score']}")
        
        return {
            'content_id': str(content.id),
            'quality_score': quality_result['overall_score'],
            'status': content.status
        }
        
    except AIGeneratedContent.DoesNotExist:
        error_msg = f"Content with id {content_id} not found"
        logger.error(error_msg)
        return {'status': 'error', 'message': error_msg}
        
    except Exception as e:
        error_msg = f"Error in quality check: {str(e)}"
        logger.error(error_msg)
        raise self.retry(countdown=30, max_retries=2)

@shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 300})
def batch_content_generation_task(self, batch_config):
    """バッチコンテンツ生成タスク"""
    try:
        logger.info(f"Starting batch content generation: {batch_config['name']}")
        
        results = []
        template = ContentTemplate.objects.get(id=batch_config['template_id'])
        
        # 生成対象カードを取得
        if batch_config.get('card_filters'):
            cards = get_cards_by_filters(batch_config['card_filters'])
        else:
            cards = PokemonCard.objects.filter(is_popular=True)
        
        # バッチサイズでカードを分割
        batch_size = batch_config.get('batch_size', 5)
        total_batches = (len(cards) + batch_size - 1) // batch_size
        
        for i in range(0, len(cards), batch_size):
            batch_cards = cards[i:i + batch_size]
            card_ids = [card.id for card in batch_cards]
            
            # 各バッチでコンテンツ生成
            result = generate_content_task.delay(
                template_id=batch_config['template_id'],
                card_ids=card_ids,
                custom_prompt=batch_config.get('custom_prompt', ''),
                priority=batch_config.get('priority', 'normal')
            )
            
            results.append({
                'batch_index': i // batch_size + 1,
                'card_count': len(batch_cards),
                'task_id': result.id
            })
            
            # バッチ間の間隔
            if i + batch_size < len(cards):
                time.sleep(batch_config.get('delay_between_batches', 5))
        
        logger.info(f"Batch generation completed: {len(results)} batches created")
        
        return {
            'batch_name': batch_config['name'],
            'total_batches': total_batches,
            'total_cards': len(cards),
            'results': results,
            'status': 'completed'
        }
        
    except Exception as e:
        error_msg = f"Error in batch generation: {str(e)}"
        logger.error(error_msg)
        raise self.retry(countdown=60, max_retries=3)

@shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 2, 'countdown': 120})
def optimize_content_task(self, content_id, optimization_type='seo'):
    """コンテンツ最適化タスク"""
    try:
        content = AIGeneratedContent.objects.get(id=content_id)
        logger.info(f"Starting content optimization: {content.title} - Type: {optimization_type}")
        
        generator = ContentGenerator()
        
        if optimization_type == 'seo':
            # SEO最適化
            optimized_data = generator.optimize_for_seo(content)
            
            content.seo_title = optimized_data.get('seo_title', content.seo_title)
            content.meta_description = optimized_data.get('meta_description', content.meta_description)
            content.focus_keyword = optimized_data.get('focus_keyword', content.focus_keyword)
            content.keywords = optimized_data.get('keywords', content.keywords)
            
        elif optimization_type == 'readability':
            # 読みやすさ最適化
            optimized_content = generator.improve_readability(content.content)
            content.content = optimized_content
            
        elif optimization_type == 'engagement':
            # エンゲージメント最適化
            optimized_data = generator.optimize_for_engagement(content)
            content.title = optimized_data.get('title', content.title)
            content.excerpt = optimized_data.get('excerpt', content.excerpt)
            content.content = optimized_data.get('content', content.content)
        
        content.save()
        
        # 最適化後の品質チェック
        quality_check_task.delay(content.id)
        
        logger.info(f"Content optimization completed: {content.title}")
        
        return {
            'content_id': str(content.id),
            'optimization_type': optimization_type,
            'status': 'completed'
        }
        
    except AIGeneratedContent.DoesNotExist:
        error_msg = f"Content with id {content_id} not found"
        logger.error(error_msg)
        return {'status': 'error', 'message': error_msg}
        
    except Exception as e:
        error_msg = f"Error in content optimization: {str(e)}"
        logger.error(error_msg)
        raise self.retry(countdown=60, max_retries=2)

@shared_task
def cleanup_old_content_task():
    """古いコンテンツのクリーンアップタスク"""
    try:
        # 30日以上古い下書きコンテンツを削除
        old_drafts = AIGeneratedContent.objects.filter(
            status='draft',
            created_at__lt=timezone.now() - timedelta(days=30)
        )
        
        draft_count = old_drafts.count()
        old_drafts.delete()
        
        # 90日以上古いエラーコンテンツを削除
        old_errors = AIGeneratedContent.objects.filter(
            status='error',
            created_at__lt=timezone.now() - timedelta(days=90)
        )
        
        error_count = old_errors.count()
        old_errors.delete()
        
        logger.info(f"Cleanup completed: {draft_count} drafts, {error_count} errors removed")
        
        return {
            'drafts_removed': draft_count,
            'errors_removed': error_count,
            'status': 'completed'
        }
        
    except Exception as e:
        error_msg = f"Error in cleanup: {str(e)}"
        logger.error(error_msg)
        return {'status': 'error', 'message': error_msg}

def prepare_source_data(cards, template):
    """ソースデータを準備"""
    source_data = {
        'cards': [],
        'market_trends': {},
        'competitive_analysis': {},
        'template_context': template.context_data or {}
    }
    
    for card in cards:
        # 最新の価格データを取得
        latest_prices = card.get_latest_prices()
        
        # カード情報をまとめる
        card_data = {
            'name': card.name,
            'card_number': card.card_number,
            'series': card.series.name if card.series else '',
            'rarity': card.rarity,
            'pokemon_type': card.pokemon_type,
            'investment_grade': card.investment_grade,
            'current_market_price': latest_prices.get('average_price', 0),
            'price_trend': card.get_price_trend(),
            'popularity_score': card.popularity_score,
            'view_count': card.view_count,
            'description': card.description,
            'image_urls': card.get_image_urls()
        }
        
        source_data['cards'].append(card_data)
    
    return source_data

def get_cards_by_filters(filters):
    """フィルター条件に基づいてカードを取得"""
    queryset = PokemonCard.objects.all()
    
    if filters.get('series'):
        queryset = queryset.filter(series__name__in=filters['series'])
    
    if filters.get('rarity'):
        queryset = queryset.filter(rarity__in=filters['rarity'])
    
    if filters.get('investment_grade'):
        queryset = queryset.filter(investment_grade__in=filters['investment_grade'])
    
    if filters.get('popularity_threshold'):
        queryset = queryset.filter(popularity_score__gte=filters['popularity_threshold'])
    
    if filters.get('price_range'):
        min_price, max_price = filters['price_range']
        # 最新価格でフィルタリング（複雑なクエリになるため簡略化）
        queryset = queryset.filter(is_popular=True)
    
    return queryset.order_by('-popularity_score')[:filters.get('limit', 50)]
