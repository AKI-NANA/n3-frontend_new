// HTML多言語翻訳マッピング

export const HTML_TRANSLATIONS = {
  // 共通キーワード
  condition: {
    en: 'Condition',
    de: 'Zustand',
    fr: 'État',
    it: 'Condizione',
    es: 'Estado',
  },
  language: {
    en: 'Language',
    de: 'Sprache',
    fr: 'Langue',
    it: 'Lingua',
    es: 'Idioma',
  },
  rarity: {
    en: 'Rarity',
    de: 'Seltenheit',
    fr: 'Rareté',
    it: 'Rarità',
    es: 'Rareza',
  },
  // 状態
  used: {
    en: 'Used',
    de: 'Gebraucht',
    fr: 'Occasion',
    it: 'Usato',
    es: 'Usado',
  },
  new: {
    en: 'New',
    de: 'Neu',
    fr: 'Neuf',
    it: 'Nuovo',
    es: 'Nuevo',
  },
  // 言語名
  japanese: {
    en: 'Japanese',
    de: 'Japanisch',
    fr: 'Japonais',
    it: 'Giapponese',
    es: 'Japonés',
  },
  // レアリティ
  rare: {
    en: 'Rare',
    de: 'Selten',
    fr: 'Rare',
    it: 'Rara',
    es: 'Rara',
  },
  // エディション
  '1st_edition': {
    en: '1st Edition',
    de: '1. Auflage',
    fr: '1ère Édition',
    it: '1a Edizione',
    es: '1ª Edición',
  },
  // セクションヘッダー
  product_details: {
    en: 'Product Details',
    de: 'Produktdetails',
    fr: 'Détails du Produit',
    it: 'Dettagli del Prodotto',
    es: 'Detalles del Producto',
  },
  shipping_info: {
    en: 'Shipping Information',
    de: 'Versandinformationen',
    fr: 'Informations d\'Expédition',
    it: 'Informazioni sulla Spedizione',
    es: 'Información de Envío',
  },
  contact: {
    en: 'Questions? Feel free to contact us!',
    de: 'Fragen? Kontaktieren Sie uns gerne!',
    fr: 'Des questions? N\'hésitez pas à nous contacter!',
    it: 'Domande? Non esitare a contattarci!',
    es: '¿Preguntas? ¡No dude en contactarnos!',
  },
  shipping_text: {
    en: 'Items are carefully protected with sleeves and top loaders, shipped with tracking. Standard delivery: 7-14 business days',
    de: 'Artikel werden sorgfältig mit Hüllen und Top-Loadern geschützt, mit Tracking versendet. Standardlieferung: 7-14 Werktage',
    fr: 'Les articles sont soigneusement protégés avec des pochettes et des top loaders, expédiés avec suivi. Livraison standard : 7-14 jours ouvrables',
    it: 'Gli articoli sono protetti con cura con bustine e top loader, spediti con tracking. Consegna standard: 7-14 giorni lavorativi',
    es: 'Los artículos están cuidadosamente protegidos con fundas y top loaders, enviados con seguimiento. Entrega estándar: 7-14 días hábiles',
  },
};

export const COUNTRIES = [
  { code: 'US', language: 'en', marketplace: 'ebay.com', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', language: 'en', marketplace: 'ebay.co.uk', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', language: 'de', marketplace: 'ebay.de', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', language: 'fr', marketplace: 'ebay.fr', name: 'France', flag: '🇫🇷' },
  { code: 'IT', language: 'it', marketplace: 'ebay.it', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', language: 'es', marketplace: 'ebay.es', name: 'Spain', flag: '🇪🇸' },
  { code: 'AU', language: 'en', marketplace: 'ebay.com.au', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', language: 'en', marketplace: 'ebay.ca', name: 'Canada', flag: '🇨🇦' },
];

export function getLanguageCode(countryCode: string): string {
  const country = COUNTRIES.find(c => c.code === countryCode);
  return country?.language || 'en';
}

export function getMarketplace(countryCode: string): string {
  const country = COUNTRIES.find(c => c.code === countryCode);
  return country?.marketplace || 'ebay.com';
}
