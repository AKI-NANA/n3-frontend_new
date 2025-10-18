// eBay 8カ国向けHTMLテンプレート（見出しのみ翻訳、内容は英語）

export const DEFAULT_TEMPLATES = {
  US: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  <h2 style="color: #0064d2; border-bottom: 3px solid #0064d2; padding-bottom: 10px;">
    {{TITLE}}
  </h2>
  
  <div style="background: #f8f9fa; padding: 20px; margin: 15px 0; border-left: 5px solid #0064d2;">
    <h3 style="margin-top: 0;">Product Details</h3>
    <ul style="margin: 0;">
      <li><strong>Condition:</strong> {{CONDITION}}</li>
      <li><strong>Language:</strong> {{LANGUAGE}}</li>
      <li><strong>Rarity:</strong> {{RARITY}}</li>
    </ul>
  </div>

  <div style="background: #fff; padding: 20px; margin: 15px 0;">
    <h3>Description</h3>
    <p>{{DESCRIPTION}}</p>
  </div>

  <div style="background: #e3f2fd; padding: 20px; margin: 15px 0; border-radius: 8px;">
    <h3 style="margin-top: 0;">Shipping Information</h3>
    <p>Items are carefully protected with sleeves and top loaders, shipped with tracking.</p>
    <p>Standard delivery: 7-14 business days</p>
  </div>

  <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f0f0; border-radius: 8px;">
    <p style="margin: 0; color: #666; font-size: 16px;">
      <strong>Questions? Feel free to contact us!</strong>
    </p>
  </div>
</div>`,

  UK: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  <h2 style="color: #0064d2; border-bottom: 3px solid #0064d2; padding-bottom: 10px;">
    {{TITLE}}
  </h2>
  
  <div style="background: #f8f9fa; padding: 20px; margin: 15px 0; border-left: 5px solid #0064d2;">
    <h3 style="margin-top: 0;">Product Details</h3>
    <ul style="margin: 0;">
      <li><strong>Condition:</strong> {{CONDITION}}</li>
      <li><strong>Language:</strong> {{LANGUAGE}}</li>
      <li><strong>Rarity:</strong> {{RARITY}}</li>
    </ul>
  </div>

  <div style="background: #fff; padding: 20px; margin: 15px 0;">
    <h3>Description</h3>
    <p>{{DESCRIPTION}}</p>
  </div>

  <div style="background: #e3f2fd; padding: 20px; margin: 15px 0; border-radius: 8px;">
    <h3 style="margin-top: 0;">Shipping Information</h3>
    <p>Items are carefully protected with sleeves and top loaders, shipped with tracking.</p>
    <p>Standard delivery: 7-14 business days</p>
  </div>

  <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f0f0; border-radius: 8px;">
    <p style="margin: 0; color: #666; font-size: 16px;">
      <strong>Questions? Feel free to contact us!</strong>
    </p>
  </div>
</div>`,

  DE: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  <h2 style="color: #0064d2; border-bottom: 3px solid #0064d2; padding-bottom: 10px;">
    {{TITLE}}
  </h2>
  
  <div style="background: #f8f9fa; padding: 20px; margin: 15px 0; border-left: 5px solid #0064d2;">
    <h3 style="margin-top: 0;">Produktdetails</h3>
    <ul style="margin: 0;">
      <li><strong>Zustand:</strong> {{CONDITION}}</li>
      <li><strong>Sprache:</strong> {{LANGUAGE}}</li>
      <li><strong>Seltenheit:</strong> {{RARITY}}</li>
    </ul>
  </div>

  <div style="background: #fff; padding: 20px; margin: 15px 0;">
    <h3>Beschreibung</h3>
    <p>{{DESCRIPTION}}</p>
  </div>

  <div style="background: #e3f2fd; padding: 20px; margin: 15px 0; border-radius: 8px;">
    <h3 style="margin-top: 0;">Versandinformationen</h3>
    <p>Artikel werden sorgfältig mit Hüllen und Top-Loadern geschützt, mit Tracking versendet.</p>
    <p>Standardlieferung: 7-14 Werktage</p>
  </div>

  <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f0f0; border-radius: 8px;">
    <p style="margin: 0; color: #666; font-size: 16px;">
      <strong>Fragen? Kontaktieren Sie uns gerne!</strong>
    </p>
  </div>
</div>`,

  FR: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  <h2 style="color: #0064d2; border-bottom: 3px solid #0064d2; padding-bottom: 10px;">
    {{TITLE}}
  </h2>
  
  <div style="background: #f8f9fa; padding: 20px; margin: 15px 0; border-left: 5px solid #0064d2;">
    <h3 style="margin-top: 0;">Détails du Produit</h3>
    <ul style="margin: 0;">
      <li><strong>État:</strong> {{CONDITION}}</li>
      <li><strong>Langue:</strong> {{LANGUAGE}}</li>
      <li><strong>Rareté:</strong> {{RARITY}}</li>
    </ul>
  </div>

  <div style="background: #fff; padding: 20px; margin: 15px 0;">
    <h3>Description</h3>
    <p>{{DESCRIPTION}}</p>
  </div>

  <div style="background: #e3f2fd; padding: 20px; margin: 15px 0; border-radius: 8px;">
    <h3 style="margin-top: 0;">Informations d'Expédition</h3>
    <p>Les articles sont soigneusement protégés avec des pochettes et des top loaders, expédiés avec suivi.</p>
    <p>Livraison standard : 7-14 jours ouvrables</p>
  </div>

  <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f0f0; border-radius: 8px;">
    <p style="margin: 0; color: #666; font-size: 16px;">
      <strong>Des questions? N'hésitez pas à nous contacter!</strong>
    </p>
  </div>
</div>`,

  IT: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  <h2 style="color: #0064d2; border-bottom: 3px solid #0064d2; padding-bottom: 10px;">
    {{TITLE}}
  </h2>
  
  <div style="background: #f8f9fa; padding: 20px; margin: 15px 0; border-left: 5px solid #0064d2;">
    <h3 style="margin-top: 0;">Dettagli del Prodotto</h3>
    <ul style="margin: 0;">
      <li><strong>Condizione:</strong> {{CONDITION}}</li>
      <li><strong>Lingua:</strong> {{LANGUAGE}}</li>
      <li><strong>Rarità:</strong> {{RARITY}}</li>
    </ul>
  </div>

  <div style="background: #fff; padding: 20px; margin: 15px 0;">
    <h3>Descrizione</h3>
    <p>{{DESCRIPTION}}</p>
  </div>

  <div style="background: #e3f2fd; padding: 20px; margin: 15px 0; border-radius: 8px;">
    <h3 style="margin-top: 0;">Informazioni sulla Spedizione</h3>
    <p>Gli articoli sono protetti con cura con bustine e top loader, spediti con tracking.</p>
    <p>Consegna standard: 7-14 giorni lavorativi</p>
  </div>

  <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f0f0; border-radius: 8px;">
    <p style="margin: 0; color: #666; font-size: 16px;">
      <strong>Domande? Non esitare a contattarci!</strong>
    </p>
  </div>
</div>`,

  ES: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  <h2 style="color: #0064d2; border-bottom: 3px solid #0064d2; padding-bottom: 10px;">
    {{TITLE}}
  </h2>
  
  <div style="background: #f8f9fa; padding: 20px; margin: 15px 0; border-left: 5px solid #0064d2;">
    <h3 style="margin-top: 0;">Detalles del Producto</h3>
    <ul style="margin: 0;">
      <li><strong>Estado:</strong> {{CONDITION}}</li>
      <li><strong>Idioma:</strong> {{LANGUAGE}}</li>
      <li><strong>Rareza:</strong> {{RARITY}}</li>
    </ul>
  </div>

  <div style="background: #fff; padding: 20px; margin: 15px 0;">
    <h3>Descripción</h3>
    <p>{{DESCRIPTION}}</p>
  </div>

  <div style="background: #e3f2fd; padding: 20px; margin: 15px 0; border-radius: 8px;">
    <h3 style="margin-top: 0;">Información de Envío</h3>
    <p>Los artículos están cuidadosamente protegidos con fundas y top loaders, enviados con seguimiento.</p>
    <p>Entrega estándar: 7-14 días hábiles</p>
  </div>

  <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f0f0; border-radius: 8px;">
    <p style="margin: 0; color: #666; font-size: 16px;">
      <strong>¿Preguntas? ¡No dude en contactarnos!</strong>
    </p>
  </div>
</div>`,

  AU: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  <h2 style="color: #0064d2; border-bottom: 3px solid #0064d2; padding-bottom: 10px;">
    {{TITLE}}
  </h2>
  
  <div style="background: #f8f9fa; padding: 20px; margin: 15px 0; border-left: 5px solid #0064d2;">
    <h3 style="margin-top: 0;">Product Details</h3>
    <ul style="margin: 0;">
      <li><strong>Condition:</strong> {{CONDITION}}</li>
      <li><strong>Language:</strong> {{LANGUAGE}}</li>
      <li><strong>Rarity:</strong> {{RARITY}}</li>
    </ul>
  </div>

  <div style="background: #fff; padding: 20px; margin: 15px 0;">
    <h3>Description</h3>
    <p>{{DESCRIPTION}}</p>
  </div>

  <div style="background: #e3f2fd; padding: 20px; margin: 15px 0; border-radius: 8px;">
    <h3 style="margin-top: 0;">Shipping Information</h3>
    <p>Items are carefully protected with sleeves and top loaders, shipped with tracking.</p>
    <p>Standard delivery: 7-14 business days</p>
  </div>

  <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f0f0; border-radius: 8px;">
    <p style="margin: 0; color: #666; font-size: 16px;">
      <strong>Questions? Feel free to contact us!</strong>
    </p>
  </div>
</div>`,

  CA: `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  <h2 style="color: #0064d2; border-bottom: 3px solid #0064d2; padding-bottom: 10px;">
    {{TITLE}}
  </h2>
  
  <div style="background: #f8f9fa; padding: 20px; margin: 15px 0; border-left: 5px solid #0064d2;">
    <h3 style="margin-top: 0;">Product Details</h3>
    <ul style="margin: 0;">
      <li><strong>Condition:</strong> {{CONDITION}}</li>
      <li><strong>Language:</strong> {{LANGUAGE}}</li>
      <li><strong>Rarity:</strong> {{RARITY}}</li>
    </ul>
  </div>

  <div style="background: #fff; padding: 20px; margin: 15px 0;">
    <h3>Description</h3>
    <p>{{DESCRIPTION}}</p>
  </div>

  <div style="background: #e3f2fd; padding: 20px; margin: 15px 0; border-radius: 8px;">
    <h3 style="margin-top: 0;">Shipping Information</h3>
    <p>Items are carefully protected with sleeves and top loaders, shipped with tracking.</p>
    <p>Standard delivery: 7-14 business days</p>
  </div>

  <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f0f0; border-radius: 8px;">
    <p style="margin: 0; color: #666; font-size: 16px;">
      <strong>Questions? Feel free to contact us!</strong>
    </p>
  </div>
</div>`,
};

// テンプレートを一括生成してDBに保存
export function generateDefaultTemplates() {
  return {
    default_country: 'US',
    generated_at: new Date().toISOString(),
    templates: {
      US: {
        html: DEFAULT_TEMPLATES.US,
        language: 'en',
        country: 'US',
        marketplace: 'ebay.com',
        is_default: true,
        template_name: 'Standard US Template',
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      UK: {
        html: DEFAULT_TEMPLATES.UK,
        language: 'en',
        country: 'UK',
        marketplace: 'ebay.co.uk',
        is_default: false,
        template_name: 'Standard UK Template',
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      DE: {
        html: DEFAULT_TEMPLATES.DE,
        language: 'de',
        country: 'DE',
        marketplace: 'ebay.de',
        is_default: false,
        template_name: 'Standard DE Template',
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      FR: {
        html: DEFAULT_TEMPLATES.FR,
        language: 'fr',
        country: 'FR',
        marketplace: 'ebay.fr',
        is_default: false,
        template_name: 'Standard FR Template',
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      IT: {
        html: DEFAULT_TEMPLATES.IT,
        language: 'it',
        country: 'IT',
        marketplace: 'ebay.it',
        is_default: false,
        template_name: 'Standard IT Template',
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      ES: {
        html: DEFAULT_TEMPLATES.ES,
        language: 'es',
        country: 'ES',
        marketplace: 'ebay.es',
        is_default: false,
        template_name: 'Standard ES Template',
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      AU: {
        html: DEFAULT_TEMPLATES.AU,
        language: 'en',
        country: 'AU',
        marketplace: 'ebay.com.au',
        is_default: false,
        template_name: 'Standard AU Template',
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      CA: {
        html: DEFAULT_TEMPLATES.CA,
        language: 'en',
        country: 'CA',
        marketplace: 'ebay.ca',
        is_default: false,
        template_name: 'Standard CA Template',
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
  };
}

// プレースホルダーを商品データで置換
export function replacePlaceholders(template: string, productData: any): string {
  return template
    .replace(/\{\{TITLE\}\}/g, productData.english_title || productData.title || '')
    .replace(/\{\{CONDITION\}\}/g, productData.listing_data?.condition || 'Used')
    .replace(/\{\{LANGUAGE\}\}/g, 'Japanese')
    .replace(/\{\{RARITY\}\}/g, 'Rare')
    .replace(/\{\{DESCRIPTION\}\}/g, productData.description || productData.english_title || '');
}
