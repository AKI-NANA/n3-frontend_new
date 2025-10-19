# apps/ai_generation/tasks.py
from celery import shared_task, current_task
from django.conf import settings
from django.utils import timezone
import openai
import requests
import time
import hashlib
import re
from datetime import timedelta
from .models import ContentTemplate, GeneratedContent, ContentGenerationTask, QualityCheck
from apps.cards.models import PokemonCard
from apps.price_tracking.models import PriceAnalysis
from apps.content_collection.models import CollectedContent

# OpenAI設定
openai.api_key = settings.OPENAI_API_KEY

def rate_limit_decorator(api_name, max_requests=60, time_window=3600):
    """APIレート制限デコレータ"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            cache_key = f"rate_limit_{api_name}_{int(time.time() // time_window)}"
            
            # Redis等のキャッシュで制限チェック（簡易版）
            current_count = getattr(wrapper, 'count', 0)
            if current_count >= max_requests:
                time.sleep(time_window / max_requests)
            
            setattr(wrapper, 'count', current_count + 1)
            return func(*args, **kwargs)
        return wrapper
    return decorator

@shared_task(bind=True, max_retries=3)
@rate_limit_decorator('openai_generation', max_requests=50, time_window=3600)
def generate_content_task(self, task_id, card_id=None, template_id=None, language='jp', extra_params=None, parent_task_id=None):
    """AIコンテンツ生成メインタスク"""
    try:
        # タスク開始
        self.update_state(state='PROGRESS', meta={'status': 'タスク開始', 'progress': 10})
        
        # パラメータ準備
        if extra_params is None:
            extra_params = {}
        
        # カード情報取得
        card = None
        if card_id:
            try:
                card = PokemonCard.objects.get(id=card_id)
            except PokemonCard.DoesNotExist:
                raise ValueError(f"カードID {card_id} が見つかりません")
        
        # テンプレート取得
        if template_id:
            try:
                template = ContentTemplate.objects.get(id=template_id, is_active=True)
            except ContentTemplate.DoesNotExist:
                raise ValueError(f"テンプレートID {template_id} が見つかりません")
        else:
            # デフォルトテンプレート取得
            content_type = extra_params.get('content_type', 'blog_jp')
            template = ContentTemplate.objects.filter(
                content_type=content_type,
                is_active=True
            ).first()
            
            if not template:
                raise ValueError(f"コンテンツタイプ {content_type} のテンプレートが見つかりません")
        
        self.update_state(state='PROGRESS', meta={'status': 'データ準備完了', 'progress': 20})
        
        # 価格分析データ取得
        price_analysis = None
        if card:
            price_analysis = card.price_analysis.order_by('-analysis_date').first()
        
        # 関連コンテンツ取得
        related_contents = []
        if card:
            related_contents = CollectedContent.objects.filter(
                keywords__icontains=card.name_jp,
                quality_score__gte=0.6
            ).order_by('-relevance_score')[:5]
        
        self.update_state(state='PROGRESS', meta={'status': 'プロンプト生成中', 'progress': 30})
        
        # プロンプトデータ準備
        prompt_data = prepare_prompt_data(card, price_analysis, related_contents, extra_params)
        
        # プロンプト生成
        user_prompt = template.user_prompt_template.format(**prompt_data)
        
        self.update_state(state='PROGRESS', meta={'status': 'AI生成開始', 'progress': 40})
        
        # OpenAI API呼び出し
        start_time = time.time()
        
        try:
            response = openai.ChatCompletion.create(
                model=template.ai_model,
                messages=[
                    {"role": "system", "content": template.system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=template.max_tokens,
                temperature=template.temperature,
                top_p=template.top_p,
                frequency_penalty=template.frequency_penalty,
                presence_penalty=template.presence_penalty
            )
            
            generated_text = response.choices[0].message.content
            token_usage = response.usage._asdict()
            generation_cost = calculate_generation_cost(response.usage, template.ai_model)
            
        except openai.error.RateLimitError:
            # レート制限エラーの場合は再試行
            if self.request.retries < self.max_retries:
                raise self.retry(countdown=60 * (2 ** self.request.retries))
            raise
        except openai.error.APIError as e:
            raise ValueError(f"OpenAI APIエラー: {str(e)}")
        
        generation_time = time.time() - start_time
        
        self.update_state(state='PROGRESS', meta={'status': '品質チェック中', 'progress': 70})
        
        # タイトル抽出
        title = extract_title_from_content(generated_text, template.content_type)
        
        # コンテンツ保存
        content = GeneratedContent.objects.create(
            card=card,
            template=template,
            title=title,
            content=generated_text,
            status='generated',
            generation_config=extra_params,
            source_data=prompt_data,
            generation_prompt=user_prompt,
            target_keywords=template.target_keywords,
            generation_time=generation_time,
            token_usage=token_usage,
            generation_cost=generation_cost
        )
        
        # 関連コンテンツを設定
        if related_contents:
            content.source_contents.set(related_contents)
        
        self.update_state(state='PROGRESS', meta={'status': '品質チェック実行中', 'progress': 80})
        
        # 品質チェック実行
        quality_result = perform_quality_checks(content)
        
        # 品質スコア更新
        content.quality_score = quality_result['overall_score']
        content.quality_details = quality_result
        
        # ステータス決定
        if content.quality_score >= template.quality_threshold:
            content.status = 'review'
        else:
            content.status = 'draft'
        
        content.save()
        
        # テンプレート統計更新
        template.usage_count += 1
        template.save()
        
        # 親タスク更新
        if parent_task_id:
            try:
                parent_task = ContentGenerationTask.objects.get(task_id=parent_task_id)
                parent_task.completed_items += 1
                parent_task.update_progress()
                parent_task.save()
            except ContentGenerationTask.DoesNotExist:
                pass
        
        self.update_state(state='SUCCESS', meta={'status': '生成完了', 'progress': 100})
        
        return {
            'content_id': content.id,
            'title': content.title,
            'quality_score': content.quality_score,
            'status': content.status,
            'word_count': len(generated_text),
            'generation_time': generation_time,
            'generation_cost': float(generation_cost),
            'estimated_reading_time': len(generated_text) // 400
        }
        
    except Exception as exc:
        # エラーログ
        error_details = {
            'error': str(exc),
            'task_id': task_id,
            'card_id': card_id,
            'template_id': template_id,
            'retry_count': self.request.retries
        }
        
        # 親タスクのエラーカウント更新
        if parent_task_id:
            try:
                parent_task = ContentGenerationTask.objects.get(task_id=parent_task_id)
                parent_task.failed_items += 1
                parent_task.error_log.append(error_details)
                parent_task.save()
            except ContentGenerationTask.DoesNotExist:
                pass
        
        # リトライ処理
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (2 ** self.request.retries), exc=exc)
        
        # 最終的にエラー
        self.update_state(
            state='FAILURE',
            meta={'error': str(exc), 'details': error_details}
        )
        raise exc

def prepare_prompt_data(card, price_analysis, related_contents, extra_params):
    """プロンプト用データ準備"""
    data = {
        'current_date': timezone.now().strftime('%Y年%m月%d日'),
        'card_name': card.name_jp if card else '一般的なポケモンカード',
        'card_name_en': card.name_en if card else '',
        'card_number': card.card_number if card else '',
        'series': card.series.name if card else '',
        'rarity': card.get_rarity_display() if card else '',
        'investment_grade': card.get_investment_grade_display() if card else '',
        'current_price': price_analysis.current_price if price_analysis else 0,
        'median_price': price_analysis.median_price if price_analysis else 0,
        'change_24h': price_analysis.change_24h if price_analysis else 0,
        'change_7d': price_analysis.change_7d if price_analysis else 0,
        'change_30d': price_analysis.change_30d if price_analysis else 0,
        'volume': price_analysis.volume if price_analysis else 0,
        'market_factors': price_analysis.market_factors if price_analysis else [],
        'related_news': [content.title for content in related_contents[:3]],
        'trend_analysis': generate_trend_analysis(price_analysis) if price_analysis else ''
    }
    
    # 追加パラメータをマージ
    data.update(extra_params)
    
    return data

def generate_trend_analysis(price_analysis):
    """トレンド分析テキスト生成"""
    if not price_analysis:
        return ""
    
    analysis_parts = []
    
    # 価格変動分析
    if price_analysis.change_24h > 5:
        analysis_parts.append("24時間で大幅な価格上昇を記録")
    elif price_analysis.change_24h < -5:
        analysis_parts.append("24時間で価格が下落傾向")
    
    if price_analysis.change_7d > 10:
        analysis_parts.append("週間では強い上昇トレンド")
    elif price_analysis.change_7d < -10:
        analysis_parts.append("週間では下降トレンドが継続")
    
    # 取引量分析
    if price_analysis.volume > 100:
        analysis_parts.append("活発な取引が確認されており")
    elif price_analysis.volume < 10:
        analysis_parts.append("取引量は限定的で")
    
    # 市場要因
    if price_analysis.market_factors:
        factors_text = "、".join(price_analysis.market_factors[:3])
        analysis_parts.append(f"市場要因として{factors_text}が影響")
    
    return "、".join(analysis_parts) + "しています。"

def calculate_generation_cost(usage, model):
    """生成コスト計算"""
    # OpenAI料金表（2024年基準）
    costs = {
        'gpt-4': {'input': 0.03, 'output': 0.06},  # per 1K tokens
        'gpt-4-turbo': {'input': 0.01, 'output': 0.03},
        'gpt-3.5-turbo': {'input': 0.0015, 'output': 0.002}
    }
    
    if model not in costs:
        return 0
    
    input_cost = (usage.prompt_tokens / 1000) * costs[model]['input']
    output_cost = (usage.completion_tokens / 1000) * costs[model]['output']
    
    return input_cost + output_cost

def extract_title_from_content(content, content_type):
    """コンテンツからタイトル抽出"""
    lines = content.split('\n')
    
    # マークダウンヘッダーを探す
    for line in lines:
        line = line.strip()
        if line.startswith('#'):
            title = re.sub(r'^#+\s*', '', line).strip()
            if title and len(title) <= 100:
                return title
    
    # 最初の非空行をタイトルとして使用
    for line in lines:
        line = line.strip()
        if line and not line.startswith('```') and len(line) <= 100:
            return line
    
    return f"AI生成コンテンツ - {content_type}"

def perform_quality_checks(content):
    """品質チェック実行"""
    checks = {}
    
    # 文字数チェック
    checks['length_check'] = check_content_length(content.content)
    
    # 可読性チェック
    checks['readability_check'] = check_readability(content.content)
    
    # キーワード密度チェック
    checks['keyword_density_check'] = check_keyword_density(
        content.content, content.target_keywords
    )
    
    # 重複チェック
    checks['duplicate_check'] = check_duplicate_content(content.content)
    
    # スパムチェック
    checks['spam_check'] = check_spam_indicators(content.content)
    
    # AI検出リスクチェック
    checks['ai_detection_check'] = check_ai_detection_risk(content.content)
    
    # 総合スコア計算
    weights = {
        'length_check': 0.15,
        'readability_check': 0.20,
        'keyword_density_check': 0.15,
        'duplicate_check': 0.25,
        'spam_check': 0.15,
        'ai_detection_check': 0.10
    }
    
    overall_score = sum(
        checks[check] * weights.get(check, 0.1) 
        for check in checks
    )
    
    # 個別品質チェックレコード作成
    for check_type, score in checks.items():
        QualityCheck.objects.create(
            content=content,
            check_type=check_type.replace('_check', ''),
            score=score,
            passed=score >= 0.7,
            details={'raw_score': score},
            suggestions=generate_improvement_suggestions({check_type: score})
        )
    
    return {
        'overall_score': overall_score,
        'details': checks,
        'passed': overall_score >= 0.7,
        'suggestions': generate_improvement_suggestions(checks)
    }

def check_content_length(content):
    """文字数チェック"""
    length = len(content)
    if 2000 <= length <= 5000:
        return 1.0
    elif 1500 <= length < 2000 or 5000 < length <= 6000:
        return 0.8
    elif 1000 <= length < 1500 or 6000 < length <= 8000:
        return 0.6
    else:
        return 0.3

def check_readability(content):
    """可読性チェック"""
    sentences = [s.strip() for s in content.split('。') if s.strip()]
    if not sentences:
        return 0.0
    
    avg_sentence_length = sum(len(s) for s in sentences) / len(sentences)
    
    # 理想的な文長は20-40文字
    if 20 <= avg_sentence_length <= 40:
        return 1.0
    elif 15 <= avg_sentence_length < 20 or 40 < avg_sentence_length <= 60:
        return 0.8
    elif 10 <= avg_sentence_length < 15 or 60 < avg_sentence_length <= 80:
        return 0.6
    else:
        return 0.3

def check_keyword_density(content, target_keywords):
    """キーワード密度チェック"""
    if not target_keywords:
        return 0.8  # キーワード指定なしの場合は中程度
    
    total_chars = len(content)
    if total_chars == 0:
        return 0.0
    
    keyword_count = 0
    for keyword in target_keywords:
        keyword_count += content.count(keyword)
    
    density = (keyword_count / total_chars) * 100
    
    # 適切な密度は1-3%
    if 1.0 <= density <= 3.0:
        return 1.0
    elif 0.5 <= density < 1.0 or 3.0 < density <= 5.0:
        return 0.8
    elif 0.2 <= density < 0.5 or 5.0 < density <= 7.0:
        return 0.5
    else:
        return 0.2

def check_duplicate_content(content):
    """重複コンテンツチェック"""
    # 既存コンテンツとの類似度チェック
    content_hash = hashlib.md5(content.encode('utf-8')).hexdigest()
    
    # 最近の100件のコンテンツと比較
    recent_contents = GeneratedContent.objects.exclude(
        content=content
    ).values_list('content', flat=True)[:100]
    
    max_similarity = 0
    for existing_content in recent_contents:
        similarity = calculate_text_similarity(content, existing_content)
        max_similarity = max(max_similarity, similarity)
    
    # 類似度に基づくスコア
    if max_similarity < 0.3:
        return 1.0
    elif max_similarity < 0.5:
        return 0.8
    elif max_similarity < 0.7:
        return 0.5
    else:
        return 0.1

def check_spam_indicators(content):
    """スパム指標チェック"""
    spam_indicators = [
        '今すぐ', '限定', '激安', '必見', '緊急', '特別価格',
        '!!', '？？', '★★★', '【緊急】', '【限定】'
    ]
    
    spam_count = sum(content.count(indicator) for indicator in spam_indicators)
    total_chars = len(content)
    
    if total_chars == 0:
        return 0.0
    
    spam_ratio = (spam_count / total_chars) * 100
    
    if spam_ratio < 0.1:
        return 1.0
    elif spam_ratio < 0.3:
        return 0.8
    elif spam_ratio < 0.5:
        return 0.6
    else:
        return 0.2

def check_ai_detection_risk(content):
    """AI検出リスクチェック"""
    # AI特有の表現パターンをチェック
    ai_patterns = [
        r'以下の.*について.*します',
        r'.*することで.*できます',
        r'.*において.*重要です',
        r'.*に関して.*言えます',
        r'.*の観点から.*考えられます'
    ]
    
    pattern_count = 0
    for pattern in ai_patterns:
        if re.search(pattern, content):
            pattern_count += 1
    
    # 繰り返し表現チェック
    sentences = content.split('。')
    unique_sentences = set(sentences)
    repetition_ratio = len(sentences) / len(unique_sentences) if unique_sentences else 1
    
    # スコア計算
    if pattern_count <= 2 and repetition_ratio <= 1.2:
        return 1.0
    elif pattern_count <= 4 and repetition_ratio <= 1.5:
        return 0.8
    elif pattern_count <= 6 and repetition_ratio <= 2.0:
        return 0.6
    else:
        return 0.3

def calculate_text_similarity(text1, text2):
    """簡易的なテキスト類似度計算"""
    # 単語レベルでの類似度
    words1 = set(text1.split())
    words2 = set(text2.split())
    
    if not words1 or not words2:
        return 0.0
    
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    
    return len(intersection) / len(union)

def generate_improvement_suggestions(checks):
    """改善提案生成"""
    suggestions = []
    
    if checks.get('length_check', 1.0) < 0.8:
        suggestions.append("適切な文字数（2000-5000文字）に調整してください")
    
    if checks.get('readability_check', 1.0) < 0.8:
        suggestions.append("文章をより読みやすく、1文あたり20-40文字程度に調整してください")
    
    if checks.get('keyword_density_check', 1.0) < 0.8:
        suggestions.append("関連キーワードの使用頻度を調整してください（1-3%が適切）")
    
    if checks.get('duplicate_check', 1.0) < 0.8:
        suggestions.append("既存コンテンツとの重複を避け、よりオリジナルな内容にしてください")
    
    if checks.get('spam_check', 1.0) < 0.8:
        suggestions.append("過度な宣伝文句や感嘆符の使用を控えてください")
    
    if checks.get('ai_detection_check', 1.0) < 0.8:
        suggestions.append("AI特有の表現パターンを避け、より自然な文章にしてください")
    
    return suggestions

# apps/content_collection/tasks.py
@shared_task(bind=True, max_retries=3)
def collect_content_task(self, source_id):
    """コンテンツ収集タスク"""
    from .models import ContentSource, CollectedContent
    import requests
    from bs4 import BeautifulSoup
    from urllib.parse import urljoin, urlparse
    import feedparser
    
    try:
        source = ContentSource.objects.get(id=source_id)
        
        self.update_state(state='PROGRESS', meta={'status': f'{source.name}から収集開始', 'progress': 10})
        
        collected_count = 0
        
        if source.source_type == 'youtube':
            collected_count = collect_youtube_content(source)
        elif source.source_type == 'blog':
            collected_count = collect_blog_content(source)
        elif source.source_type == 'news':
            collected_count = collect_news_content(source)
        
        # 収集元の統計更新
        source.last_collected_at = timezone.now()
        source.total_collected += collected_count
        source.save()
        
        self.update_state(state='SUCCESS', meta={
            'status': f'収集完了: {collected_count}件',
            'progress': 100,
            'collected_count': collected_count
        })
        
        return {
            'source_name': source.name,
            'collected_count': collected_count,
            'status': 'success'
        }
        
    except Exception as exc:
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60, exc=exc)
        
        # エラー記録
        try:
            source = ContentSource.objects.get(id=source_id)
            source.status = 'error'
            source.last_error = str(exc)
            source.save()
        except:
            pass
        
        raise exc

def collect_youtube_content(source):
    """YouTube コンテンツ収集"""
    from googleapiclient.discovery import build
    
    api_key = source.api_key or settings.YOUTUBE_API_KEY
    if not api_key:
        raise ValueError("YouTube API キーが設定されていません")
    
    youtube = build('youtube', 'v3', developerKey=api_key)
    
    # チャンネルIDから動画を取得
    channel_id = source.collection_config.get('channel_id')
    if not channel_id:
        raise ValueError("チャンネルIDが設定されていません")
    
    # 最新動画を取得
    search_response = youtube.search().list(
        channelId=channel_id,
        part='id,snippet',
        maxResults=source.max_items_per_collection,
        order='date',
        type='video'
    ).execute()
    
    collected_count = 0
    
    for item in search_response['items']:
        video_id = item['id']['videoId']
        snippet = item['snippet']
        
        # キーワードフィルタリング
        if source.keywords:
            title_keywords = any(kw in snippet['title'] for kw in source.keywords)
            desc_keywords = any(kw in snippet['description'] for kw in source.keywords)
            if not (title_keywords or desc_keywords):
                continue
        
        # 除外キーワードチェック
        if source.exclude_keywords:
            if any(kw in snippet['title'] or kw in snippet['description'] 
                   for kw in source.exclude_keywords):
                continue
        
        # コンテンツハッシュ生成
        content_hash = hashlib.md5(
            f"{video_id}_{snippet['title']}".encode('utf-8')
        ).hexdigest()
        
        # 重複チェック
        if CollectedContent.objects.filter(content_hash=content_hash).exists():
            continue
        
        # 動画詳細取得
        video_detail = youtube.videos().list(
            part='contentDetails,statistics',
            id=video_id
        ).execute()
        
        if video_detail['items']:
            stats = video_detail['items'][0]['statistics']
            
            # コンテンツ作成
            CollectedContent.objects.create(
                source=source,
                title=snippet['title'],
                content=snippet['description'],
                url=f"https://www.youtube.com/watch?v={video_id}",
                original_id=video_id,
                content_type='video',
                author=snippet['channelTitle'],
                published_at=timezone.datetime.fromisoformat(
                    snippet['publishedAt'].replace('Z', '+00:00')
                ),
                view_count=int(stats.get('viewCount', 0)),
                like_count=int(stats.get('likeCount', 0)),
                comment_count=int(stats.get('commentCount', 0)),
                content_hash=content_hash,
                keywords=source.keywords,
                extracted_data={
                    'duration': video_detail['items'][0]['contentDetails']['duration'],
                    'category_id': snippet.get('categoryId'),
                    'tags': snippet.get('tags', [])
                }
            )
            collected_count += 1
    
    return collected_count

def collect_blog_content(source):
    """ブログコンテンツ収集"""
    collected_count = 0
    
    try:
        # RSSフィードから取得を試行
        if '/feed' in source.url or '/rss' in source.url or source.url.endswith('.xml'):
            feed = feedparser.parse(source.url)
            
            for entry in feed.entries[:source.max_items_per_collection]:
                # キーワードフィルタリング
                if source.keywords:
                    if not any(kw in entry.title or kw in entry.summary 
                             for kw in source.keywords):
                        continue
                
                content_hash = hashlib.md5(
                    f"{entry.link}_{entry.title}".encode('utf-8')
                ).hexdigest()
                
                if CollectedContent.objects.filter(content_hash=content_hash).exists():
                    continue
                
                CollectedContent.objects.create(
                    source=source,
                    title=entry.title,
                    content=entry.summary,
                    url=entry.link,
                    content_type='article',
                    author=entry.get('author', ''),
                    published_at=timezone.datetime(*entry.published_parsed[:6]) if hasattr(entry, 'published_parsed') else timezone.now(),
                    content_hash=content_hash,
                    keywords=source.keywords
                )
                collected_count += 1
        
        else:
            # Webスクレイピング
            collected_count = scrape_website_content(source)
    
    except Exception as e:
        raise ValueError(f"ブログコンテンツ収集エラー: {str(e)}")
    
    return collected_count

def scrape_website_content(source):
    """Webサイトスクレイピング"""
    import cloudscraper
    
    scraper = cloudscraper.create_scraper()
    
    try:
        response = scraper.get(source.url, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # 記事リンクを探す
        article_links = []
        
        # 一般的な記事リンクのセレクタ
        selectors = [
            'article a[href]',
            '.post a[href]',
            '.entry a[href]',
            'h2 a[href]',
            'h3 a[href]',
            '.title a[href]'
        ]
        
        for selector in selectors:
            links = soup.select(selector)
            for link in links:
                href = link.get('href')
                if href:
                    full_url = urljoin(source.url, href)
                    if full_url not in article_links:
                        article_links.append(full_url)
        
        collected_count = 0
        
        # 各記事を収集
        for url in article_links[:source.max_items_per_collection]:
            try:
                article_response = scraper.get(url, timeout=20)
                article_soup = BeautifulSoup(article_response.content, 'html.parser')
                
                # タイトル取得
                title = ""
                title_selectors = ['h1', 'title', '.title', '.entry-title']
                for sel in title_selectors:
                    title_elem = article_soup.select_one(sel)
                    if title_elem:
                        title = title_elem.get_text().strip()
                        break
                
                # 本文取得
                content = ""
                content_selectors = [
                    'article', '.content', '.post-content', 
                    '.entry-content', '.article-body'
                ]
                for sel in content_selectors:
                    content_elem = article_soup.select_one(sel)
                    if content_elem:
                        content = content_elem.get_text().strip()
                        break
                
                if title and content and len(content) > 100:
                    # キーワードチェック
                    if source.keywords:
                        if not any(kw in title or kw in content for kw in source.keywords):
                            continue
                    
                    content_hash = hashlib.md5(
                        f"{url}_{title}".encode('utf-8')
                    ).hexdigest()
                    
                    if CollectedContent.objects.filter(content_hash=content_hash).exists():
                        continue
                    
                    CollectedContent.objects.create(
                        source=source,
                        title=title,
                        content=content[:5000],  # 長すぎる場合は切り詰め
                        url=url,
                        content_type='article',
                        published_at=timezone.now(),
                        content_hash=content_hash,
                        keywords=source.keywords
                    )
                    collected_count += 1
                
            except Exception as e:
                continue  # 個別記事のエラーは無視
            
            time.sleep(1)  # レート制限対策
    
    except Exception as e:
        raise ValueError(f"Webスクレイピングエラー: {str(e)}")
    
    return collected_count

@shared_task
def analyze_content_task(content_id):
    """収集コンテンツ分析タスク"""
    try:
        content = CollectedContent.objects.get(id=content_id)
        
        # キーワード抽出
        keywords = extract_keywords(content.content)
        
        # 感情分析
        sentiment_score = analyze_sentiment(content.content)
        
        # 関連度スコア計算
        relevance_score = calculate_relevance_score(content)
        
        # 品質スコア計算
        quality_score = calculate_content_quality_score(content)
        
        # 更新
        content.keywords = keywords
        content.sentiment_score = sentiment_score
        content.relevance_score = relevance_score
        content.quality_score = quality_score
        content.is_processed = True
        content.status = 'processed'
        content.save()
        
        return {
            'content_id': content_id,
            'keywords': keywords,
            'sentiment_score': sentiment_score,
            'relevance_score': relevance_score,
            'quality_score': quality_score
        }
        
    except Exception as exc:
        raise exc

def extract_keywords(text):
    """キーワード抽出"""
    # 簡易版キーワード抽出
    pokemon_keywords = [
        'ポケモンカード', 'ポケカ', 'レア', 'プロモ', 'SR', 'SSR', 'UR', 'HR',
        'ピカチュウ', 'リザードン', 'フシギダネ', 'カメックス', 'イーブイ',
        '相場', '価格', '投資', 'PSA', 'BGS', 'グレード'
    ]
    
    found_keywords = []
    text_lower = text.lower()
    
    for keyword in pokemon_keywords:
        if keyword in text or keyword.lower() in text_lower:
            found_keywords.append(keyword)
    
    return found_keywords[:10]  # 最大10個

def analyze_sentiment(text):
    """感情分析（簡易版）"""
    positive_words = ['良い', '素晴らしい', '最高', '上昇', '人気', '注目', '期待']
    negative_words = ['悪い', '下落', '暴落', '危険', '注意', '避ける']
    
    positive_count = sum(text.count(word) for word in positive_words)
    negative_count = sum(text.count(word) for word in negative_words)
    
    total_words = len(text.split())
    if total_words == 0:
        return 0.0
    
    sentiment = (positive_count - negative_count) / total_words
    return max(-1.0, min(1.0, sentiment))  # -1 to 1 の範囲

def calculate_relevance_score(content):
    """関連度スコア計算"""
    # ポケモンカード関連のキーワード密度で計算
    relevant_keywords = [
        'ポケモン', 'ポケカ', 'カード', '相場', '価格', 'レア',
        'PSA', 'BGS', 'グレード', '投資', 'コレクション'
    ]
    
    text_lower = content.content.lower()
    relevance_count = sum(text_lower.count(kw.lower()) for kw in relevant_keywords)
    
    total_chars = len(content.content)
    if total_chars == 0:
        return 0.0
    
    relevance_density = (relevance_count / total_chars) * 100
    return min(1.0, relevance_density / 2.0)  # 2%で最大スコア

def calculate_content_quality_score(content):
    """コンテンツ品質スコア"""
    score = 0.0
    
    # 文字数による評価
    content_length = len(content.content)
    if 500 <= content_length <= 3000:
        score += 0.3
    elif 200 <= content_length < 500:
        score += 0.2
    
    # タイトルの適切性
    title_length = len(content.title)
    if 10 <= title_length <= 60:
        score += 0.2
    
    # 情報の新しさ
    days_old = (timezone.now().date() - content.published_at.date()).days
    if days_old <= 7:
        score += 0.3
    elif days_old <= 30:
        score += 0.2
    elif days_old <= 90:
        score += 0.1
    
    # ソーシャル指標
    social_score = (content.view_count + content.like_count * 2 + content.share_count * 3) / 100
    score += min(0.2, social_score / 10)
    
    return min(1.0, score)

# apps/publishing/tasks.py
@shared_task(bind=True, max_retries=3)
def publish_to_wordpress_task(self, content_id, platform_id):
    """WordPress自動投稿タスク"""
    from .models import PublishedPost, PublishingPlatform
    
    try:
        content = GeneratedContent.objects.get(id=content_id)
        platform = PublishingPlatform.objects.get(id=platform_id)
        
        self.update_state(state='PROGRESS', meta={'status': 'WordPress投稿開始', 'progress': 20})
        
        # WordPress REST API設定
        wp_url = platform.base_url
        username = platform.username
        password = platform.password  # アプリケーションパスワード
        
        if not all([wp_url, username, password]):
            raise ValueError("WordPress認証情報が不完整です")
        
        # 認証ヘッダー
        import base64
        credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
        headers = {
            'Authorization': f'Basic {credentials}',
            'Content-Type': 'application/json'
        }
        
        self.update_state(state='PROGRESS', meta={'status': 'コンテンツ準備中', 'progress': 40})
        
        # カテゴリ取得・作成
        categories = get_or_create_wordpress_categories(wp_url, headers, ['ポケモンカード', '相場分析'])
        
        # タグ準備
        tags = content.target_keywords[:10] if content.target_keywords else []
        tag_ids = get_or_create_wordpress_tags(wp_url, headers, tags)
        
        # アイキャッチ画像処理
        featured_media_id = None
        if content.card and content.card.official_image:
            featured_media_id = upload_featured_image(
                wp_url, headers, content.card.official_image.url
            )
        
        self.update_state(state='PROGRESS', meta={'status': 'WordPress投稿実行中', 'progress': 70})
        
        # 投稿データ準備
        post_data = {
            'title': content.title,
            'content': content.content,
            'status': 'draft',  # 最初は下書き
            'categories': categories,
            'tags': tag_ids,
            'excerpt': content.summary[:150] if content.summary else content.content[:150],
            'meta': {
                'generated_by_ai': True,
                'card_id': content.card.id if content.card else None,
                'quality_score': float(content.quality_score)
            }
        }
        
        if featured_media_id:
            post_data['featured_media'] = featured_media_id
        
        # WordPress投稿実行
        response = requests.post(
            f"{wp_url}/wp-json/wp/v2/posts",
            json=post_data,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 201:
            wp_post_data = response.json()
            
            # 投稿記録作成
            published_post = PublishedPost.objects.create(
                content=content,
                platform=platform,
                platform_post_id=str(wp_post_data['id']),
                post_url=wp_post_data['link'],
                title=wp_post_data['title']['rendered'],
                content_text=content.content,
                categories=categories,
                tags=tags,
                status='published',
                published_at=timezone.now(),
                response_data=wp_post_data
            )
            
            # コンテンツステータス更新
            content.status = 'published'
            content.published_at = timezone.now()
            content.published_urls = content.published_urls + [wp_post_data['link']]
            content.save()
            
            # プラットフォーム統計更新
            platform.total_posts += 1
            platform.last_post_at = timezone.now()
            platform.save()
            
            self.update_state(state='SUCCESS', meta={'status': '投稿完了', 'progress': 100})
            
            return {
                'success': True,
                'post_id': published_post.id,
                'wordpress_post_id': wp_post_data['id'],
                'wordpress_url': wp_post_data['link'],
                'platform': platform.name
            }
        else:
            raise Exception(f"WordPress投稿失敗: {response.status_code} - {response.text}")
            
    except Exception as exc:
        # エラー記録
        try:
            if 'content' in locals() and 'platform' in locals():
                PublishedPost.objects.create(
                    content=content,
                    platform=platform,
                    platform_post_id='',
                    post_url='',
                    title=content.title,
                    content_text=content.content,
                    status='failed',
                    error_message=str(exc),
                    retry_count=self.request.retries
                )
        except:
            pass
        
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (2 ** self.request.retries), exc=exc)
        
        return {
            'success': False,
            'error': str(exc),
            'retry_count': self.request.retries
        }

def get_or_create_wordpress_categories(wp_url, headers, category_names):
    """WordPressカテゴリ取得・作成"""
    category_ids = []
    
    for name in category_names:
        # 既存カテゴリ検索
        search_response = requests.get(
            f"{wp_url}/wp-json/wp/v2/categories",
            params={'search': name},
            headers=headers
        )
        
        if search_response.status_code == 200:
            categories = search_response.json()
            if categories:
                category_ids.append(categories[0]['id'])
                continue
        
        # カテゴリ作成
        create_response = requests.post(
            f"{wp_url}/wp-json/wp/v2/categories",
            json={'name': name},
            headers=headers
        )
        
        if create_response.status_code == 201:
            category_ids.append(create_response.json()['id'])
    
    return category_ids

def get_or_create_wordpress_tags(wp_url, headers, tag_names):
    """WordPressタグ取得・作成"""
    tag_ids = []
    
    for name in tag_names:
        # 既存タグ検索
        search_response = requests.get(
            f"{wp_url}/wp-json/wp/v2/tags",
            params={'search': name},
            headers=headers
        )
        
        if search_response.status_code == 200:
            tags = search_response.json()
            if tags:
                tag_ids.append(tags[0]['id'])
                continue
        
        # タグ作成
        create_response = requests.post(
            f"{wp_url}/wp-json/wp/v2/tags",
            json={'name': name},
            headers=headers
        )
        
        if create_response.status_code == 201:
            tag_ids.append(create_response.json()['id'])
    
    return tag_ids

def upload_featured_image(wp_url, headers, image_url):
    """アイキャッチ画像アップロード"""
    try:
        # 画像ダウンロード
        image_response = requests.get(image_url, timeout=30)
        image_response.raise_for_status()
        
        # WordPressにアップロード
        files = {
            'file': ('featured_image.jpg', image_response.content, 'image/jpeg')
        }
        
        upload_headers = {
            'Authorization': headers['Authorization']
        }
        
        upload_response = requests.post(
            f"{wp_url}/wp-json/wp/v2/media",
            files=files,
            headers=upload_headers
        )
        
        if upload_response.status_code == 201:
            return upload_response.json()['id']
    
    except Exception:
        pass  # 画像アップロードエラーは無視
    
    return None
            