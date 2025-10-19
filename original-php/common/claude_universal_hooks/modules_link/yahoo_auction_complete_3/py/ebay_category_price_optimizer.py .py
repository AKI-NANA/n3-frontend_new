# ファイル作成: ebay_description_generator.py
# 目的: 日本語商品情報からeBay用HTML説明文自動生成

import json

class EbayDescriptionGenerator:
    def __init__(self, template_file="ebay_description_template.html"):
        self.template = self._load_template(template_file)

    def _load_template(self, file_path):
        """HTMLテンプレートを読み込みます"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            return """
            <html>
            <body style="font-family: Arial, sans-serif;">
            <h1>{title_en}</h1>
            <p>{description_en}</p>
            <h3>Condition</h3>
            <p>{condition_en}</p>
            <h3>Accessories</h3>
            <p>{accessories_en}</p>
            </body>
            </html>
            """

    def generate_html(self, item_data):
        """
        日本語商品情報からeBay用HTML説明文を自動生成
        """
        # 翻訳・情報抽出
        title_en = item_data.get('title_en', 'No title provided')
        description_en = item_data.get('description_en', 'No description provided')
        image_urls = item_data.get('image_urls', [])
        condition_en = item_data.get('condition_en', 'Used')
        
        # SEO最適化、禁止キーワード除去などを実行
        description_en = self._optimize_for_seo(description_en)

        # 画像URLをHTMLに埋め込む
        image_html = "".join([f'<img src="{url}" style="max-width:100%; height:auto; display:block; margin:10px auto;">' for url in image_urls])

        # テンプレートにデータを埋め込む
        html_content = self.template.format(
            title_en=title_en,
            description_en=description_en,
            condition_en=condition_en,
            accessories_en=item_data.get('accessories_en', ''),
            image_gallery=image_html
        )
        return html_content

    def _optimize_for_seo(self, text):
        # SEOキーワードの追加、禁止キーワードの除去
        prohibited_keywords = ['fake', 'replica']
        for keyword in prohibited_keywords:
            text = text.replace(keyword, '')
        return text