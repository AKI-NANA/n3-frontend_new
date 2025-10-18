import { NextRequest, NextResponse } from 'next/server'

// 多言語対応サンプルデータ
const MULTILANG_SAMPLE_DATA: Record<string, Record<string, Record<string, string>>> = {
  default: {
    en_US: {
      '{{TITLE}}': 'Premium Quality Product',
      '{{PRICE}}': '$99.99',
      '{{BRAND}}': 'Top Brand',
      '{{CONDITION}}': 'Brand New',
      '{{DESCRIPTION}}': 'High-quality product with detailed specifications.',
      '{{FEATURES}}': '• Premium materials\n• Professional craftsmanship\n• Fast shipping',
      '{{SPECIFICATIONS}}': 'Size: 10 x 5 x 3 inches\nWeight: 1.5 lbs',
      '{{SHIPPING_INFO}}': 'Fast shipping with tracking from USA',
      '{{RETURN_POLICY}}': '30-day money-back guarantee',
      '{{WARRANTY}}': '1-year manufacturer warranty'
    },
    en_GB: {
      '{{TITLE}}': 'Premium Quality Product',
      '{{PRICE}}': '£79.99',
      '{{BRAND}}': 'Top Brand',
      '{{CONDITION}}': 'Brand New',
      '{{DESCRIPTION}}': 'High-quality product with detailed specifications.',
      '{{FEATURES}}': '• Premium materials\n• Professional craftsmanship\n• Fast UK delivery',
      '{{SPECIFICATIONS}}': 'Size: 25 x 13 x 8 cm\nWeight: 680g',
      '{{SHIPPING_INFO}}': 'Fast Royal Mail delivery with tracking',
      '{{RETURN_POLICY}}': '30-day money-back guarantee',
      '{{WARRANTY}}': '1-year manufacturer warranty'
    },
    en_AU: {
      '{{TITLE}}': 'Premium Quality Product',
      '{{PRICE}}': 'AU$149.99',
      '{{BRAND}}': 'Top Brand',
      '{{CONDITION}}': 'Brand New',
      '{{DESCRIPTION}}': 'High-quality product with detailed specifications.',
      '{{FEATURES}}': '• Premium materials\n• Professional craftsmanship\n• Fast delivery',
      '{{SPECIFICATIONS}}': 'Size: 25 x 13 x 8 cm\nWeight: 680g',
      '{{SHIPPING_INFO}}': 'Fast Australia Post delivery with tracking',
      '{{RETURN_POLICY}}': '30-day money-back guarantee',
      '{{WARRANTY}}': '1-year manufacturer warranty'
    },
    de: {
      '{{TITLE}}': 'Premium Qualitätsprodukt',
      '{{PRICE}}': '€89,99',
      '{{BRAND}}': 'Top Marke',
      '{{CONDITION}}': 'Brandneu',
      '{{DESCRIPTION}}': 'Hochwertiges Produkt mit detaillierten Spezifikationen.',
      '{{FEATURES}}': '• Premium-Materialien\n• Professionelle Handwerkskunst\n• Schneller Versand',
      '{{SPECIFICATIONS}}': 'Größe: 25 x 13 x 8 cm\nGewicht: 680g',
      '{{SHIPPING_INFO}}': 'Schneller DHL-Versand mit Tracking',
      '{{RETURN_POLICY}}': '30 Tage Geld-zurück-Garantie',
      '{{WARRANTY}}': '1 Jahr Herstellergarantie'
    },
    fr: {
      '{{TITLE}}': 'Produit de Qualité Premium',
      '{{PRICE}}': '€89,99',
      '{{BRAND}}': 'Marque Premium',
      '{{CONDITION}}': 'Neuf',
      '{{DESCRIPTION}}': 'Produit de haute qualité avec spécifications détaillées.',
      '{{FEATURES}}': '• Matériaux premium\n• Qualité professionnelle\n• Livraison rapide',
      '{{SPECIFICATIONS}}': 'Taille: 25 x 13 x 8 cm\nPoids: 680g',
      '{{SHIPPING_INFO}}': 'Livraison rapide avec suivi',
      '{{RETURN_POLICY}}': 'Garantie satisfait ou remboursé 30 jours',
      '{{WARRANTY}}': 'Garantie fabricant 1 an'
    },
    it: {
      '{{TITLE}}': 'Prodotto di Qualità Premium',
      '{{PRICE}}': '€89,99',
      '{{BRAND}}': 'Top Brand',
      '{{CONDITION}}': 'Nuovo',
      '{{DESCRIPTION}}': 'Prodotto di alta qualità con specifiche dettagliate.',
      '{{FEATURES}}': '• Materiali premium\n• Qualità professionale\n• Spedizione veloce',
      '{{SPECIFICATIONS}}': 'Dimensioni: 25 x 13 x 8 cm\nPeso: 680g',
      '{{SHIPPING_INFO}}': 'Spedizione veloce con tracking',
      '{{RETURN_POLICY}}': 'Garanzia soddisfatti o rimborsati 30 giorni',
      '{{WARRANTY}}': 'Garanzia del produttore 1 anno'
    },
    es: {
      '{{TITLE}}': 'Producto de Calidad Premium',
      '{{PRICE}}': '€89,99',
      '{{BRAND}}': 'Marca Premium',
      '{{CONDITION}}': 'Nuevo',
      '{{DESCRIPTION}}': 'Producto de alta calidad con especificaciones detalladas.',
      '{{FEATURES}}': '• Materiales premium\n• Calidad profesional\n• Envío rápido',
      '{{SPECIFICATIONS}}': 'Tamaño: 25 x 13 x 8 cm\nPeso: 680g',
      '{{SHIPPING_INFO}}': 'Envío rápido con seguimiento',
      '{{RETURN_POLICY}}': 'Garantía de devolución de dinero de 30 días',
      '{{WARRANTY}}': 'Garantía del fabricante de 1 año'
    },
    ja: {
      '{{TITLE}}': 'プレミアム高品質商品',
      '{{PRICE}}': '¥12,999',
      '{{BRAND}}': 'トップブランド',
      '{{CONDITION}}': '新品',
      '{{DESCRIPTION}}': '詳細な仕様の高品質商品です。',
      '{{FEATURES}}': '• プレミアム素材\n• プロ仕上げ\n• 高速配送',
      '{{SPECIFICATIONS}}': 'サイズ: 25 x 13 x 8 cm\n重量: 680g',
      '{{SHIPPING_INFO}}': '追跡番号付き高速配送',
      '{{RETURN_POLICY}}': '30日間返金保証',
      '{{WARRANTY}}': 'メーカー1年保証'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { html_content, language = 'en_US', sample_data = 'default' } = body

    if (!html_content) {
      return NextResponse.json({
        success: false,
        message: 'HTML内容が指定されていません'
      })
    }

    // 言語別サンプルデータ取得
    const sampleDataSet = MULTILANG_SAMPLE_DATA[sample_data] || MULTILANG_SAMPLE_DATA.default
    const sampleData = sampleDataSet[language] || sampleDataSet['en_US']

    // プレースホルダー置換
    let previewHtml = html_content
    Object.entries(sampleData).forEach(([key, value]) => {
      // 改行を<br>タグに変換
      const htmlValue = value.replace(/\n/g, '<br>')
      previewHtml = previewHtml.replaceAll(key, htmlValue)
    })

    // 基本的なサニタイゼーション
    previewHtml = previewHtml.replace(/javascript:/gi, '')
    previewHtml = previewHtml.replace(/on\w+\s*=/gi, '')

    return NextResponse.json({
      success: true,
      data: {
        html: previewHtml,
        language: language,
        sample_type: sample_data,
        placeholders_replaced: Object.keys(sampleData).length
      },
      message: '✅ プレビュー生成完了'
    })
  } catch (error) {
    console.error('Preview generation error:', error)
    return NextResponse.json({
      success: false,
      message: 'プレビュー生成エラー: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}
