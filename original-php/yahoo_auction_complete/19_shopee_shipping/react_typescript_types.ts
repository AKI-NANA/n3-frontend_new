// React TypeScript型定義（Shopee 7ヶ国API連携用）
// FastAPI バックエンドとの完全な型安全性を保証

// ==================== 基本型定義 ====================

export enum CountryCode {
  SG = "SG", // シンガポール
  MY = "MY", // マレーシア  
  TH = "TH", // タイ
  PH = "PH", // フィリピン
  ID = "ID", // インドネシア
  VN = "VN", // ベトナム
  TW = "TW", // 台湾
}

export interface Country {
  code: CountryCode;
  name: string;
  currency: string;
  symbol: string;
  flag: string;
  exchangeRate: number;
  marketCode: string;
}

export interface ApiResponse<T> {
  status: "success" | "error";
  data?: T;
  message?: string;
  errors?: string[];
}

// ==================== 商品関連型 ====================

export interface ProductBase {
  sku: string;
  productNameJa: string;
  productNameEn: string;
  priceJpy: number;
  weightG: number;
  categoryId: number;
  description?: string;
  imageUrls: string[];
}

export interface Product extends ProductBase {
  id: string;
  countryCode: CountryCode;
  localPrice: number;
  localCurrency: string;
  optimizedTitle: string;
  stockQuantity: number;
  reservedStock: number;
  version: number;
  status: "draft" | "active" | "inactive" | "deleted";
  isPublished: boolean;
  publishedAt?: string;
  countrySpecificConfig?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCreate extends ProductBase {
  countryCode: CountryCode;
  stockQuantity: number;
}

export interface ProductUpdate {
  productNameJa?: string;
  productNameEn?: string;
  priceJpy?: number;
  stockQuantity?: number;
  imageUrls?: string[];
}

export interface ProductCreateBulk {
  products: ProductCreate[];
  autoCalculatePricing: boolean;
}

// ==================== 送料関連型 ====================

export interface ShippingZone {
  id: string;
  countryCode: CountryCode;
  zoneCode: string;
  zoneName: string;
  zoneDescription?: string;
  isDefault: boolean;
}

export interface ShippingRate {
  id: string;
  countryCode: CountryCode;
  zoneCode: string;
  weightFromG: number;
  weightToG: number;
  esfAmount: number;
  actualAmount: number;
  currencyCode: string;
  rateConfig?: Record<string, any>;
  isActive: boolean;
}

export interface ShippingCalculateRequest {
  weightG: number;
  countries: CountryCode[];
  zoneCode?: string;
}

export interface ShippingCost {
  countryCode: CountryCode;
  zoneCode: string;
  weightG: number;
  esfAmount: number;
  actualAmount: number;
  totalShipping: number;
  status?: "success" | "error" | "not_found";
  error?: string;
}

export interface ShippingCalculateResponse {
  weightG: number;
  zoneCode: string;
  shippingCosts: ShippingCost[];
}

// ==================== コンプライアンス関連型 ====================

export interface ProhibitedItem {
  id: string;
  countryCode: CountryCode;
  categoryName: string;
  itemKeywords: string[];
  prohibitionLevel: "BANNED" | "RESTRICTED" | "WARNING";
  restrictionDetails: string;
  regulationSource?: string;
  regulationUrl?: string;
  isActive: boolean;
}

export interface ComplianceCheckRequest {
  productName: string;
  categoryName: string;
  description?: string;
  countries: CountryCode[];
}

export interface ComplianceWarning {
  countryCode: CountryCode;
  restrictionLevel: "BANNED" | "RESTRICTED" | "WARNING";
  matchedKeyword: string;
  details: string;
}

export interface ComplianceResult {
  status: "compliant" | "warnings";
  warnings: ComplianceWarning[];
}

export interface ComplianceCheckResponse {
  productName: string;
  categoryName: string;
  complianceResults: Record<CountryCode, ComplianceResult>;
}

// ==================== 在庫管理関連型 ====================

export interface InventoryEvent {
  id: string;
  sku: string;
  countryCode: CountryCode;
  changeAmount: number;
  newStock: number;
  previousStock?: number;
  source: "api_update" | "shopee_sync" | "manual_adjust";
  reason?: string;
  referenceId?: string;
  timestamp: string;
  userId?: string;
  eventDetails?: Record<string, any>;
}

export interface InventorySyncRequest {
  sku: string;
  newTotalStock: number;
}

export interface InventorySyncResult {
  status: "success" | "error";
  newStock?: number;
  message?: string;
}

export interface InventorySyncResponse {
  sku: string;
  newTotalStock: number;
  syncResults: Record<CountryCode, InventorySyncResult>;
}

// ==================== API エンドポイント関数型 ====================

export interface ShopeeApiClient {
  // 国管理
  getCountries(): Promise<ApiResponse<Country[]>>;
  
  // 商品管理
  createProduct(countryCode: CountryCode, product: ProductCreate): Promise<ApiResponse<Product>>;
  bulkCreateProducts(bulkRequest: ProductCreateBulk): Promise<ApiResponse<{ 
    createdCount: number; 
    products: Product[] 
  }>>;
  getProducts(countryCode: CountryCode, skip?: number, limit?: number): Promise<ApiResponse<{
    countryCode: CountryCode;
    total: number;
    products: Product[];
  }>>;
  updateProduct(countryCode: CountryCode, productId: string, update: ProductUpdate): Promise<ApiResponse<Product>>;
  deleteProduct(countryCode: CountryCode, productId: string): Promise<ApiResponse<{ message: string }>>;
  
  // 送料計算
  calculateShipping(request: ShippingCalculateRequest): Promise<ApiResponse<ShippingCalculateResponse>>;
  getShippingRates(countryCode: CountryCode): Promise<ApiResponse<ShippingRate[]>>;
  
  // コンプライアンス
  checkCompliance(request: ComplianceCheckRequest): Promise<ApiResponse<ComplianceCheckResponse>>;
  
  // 在庫同期
  syncInventoryAllCountries(sku: string, newTotalStock: number): Promise<ApiResponse<InventorySyncResponse>>;
}

// ==================== React Hook型 ====================

export interface UseProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
  selectedCountry: CountryCode;
}

export interface UseProductsActions {
  setSelectedCountry: (country: CountryCode) => void;
  loadProducts: (country: CountryCode) => Promise<void>;
  createProduct: (product: ProductCreate) => Promise<Product | null>;
  updateProduct: (productId: string, update: ProductUpdate) => Promise<Product | null>;
  deleteProduct: (productId: string) => Promise<boolean>;
  refreshProducts: () => Promise<void>;
}

export interface UseShippingState {
  shippingCosts: ShippingCost[];
  loading: boolean;
  error: string | null;
}

export interface UseShippingActions {
  calculateShipping: (request: ShippingCalculateRequest) => Promise<void>;
  clearShippingCosts: () => void;
}

export interface UseComplianceState {
  complianceResults: Record<CountryCode, ComplianceResult>;
  loading: boolean;
  error: string | null;
}

export interface UseComplianceActions {
  checkCompliance: (request: ComplianceCheckRequest) => Promise<void>;
  clearResults: () => void;
}

// ==================== React Component Props型 ====================

export interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onDuplicate: (product: Product) => void;
  showCountryBadge?: boolean;
}

export interface ProductFormProps {
  initialProduct?: Partial<ProductCreate>;
  countries: Country[];
  onSubmit: (product: ProductCreate) => Promise<void>;
  onCancel: () => void;
  mode: "create" | "edit";
  loading?: boolean;
}

export interface CountrySelectProps {
  selectedCountries: CountryCode[];
  availableCountries: Country[];
  onChange: (countries: CountryCode[]) => void;
  multiple?: boolean;
  disabled?: boolean;
}

export interface ShippingCalculatorProps {
  onCalculate: (costs: ShippingCost[]) => void;
  loading?: boolean;
}

export interface ComplianceCheckerProps {
  productName: string;
  categoryName: string;
  selectedCountries: CountryCode[];
  onCheck: (results: Record<CountryCode, ComplianceResult>) => void;
  loading?: boolean;
}

export interface InventoryManagerProps {
  products: Product[];
  onStockUpdate: (sku: string, newStock: number) => Promise<void>;
  onBulkSync: (sku: string, totalStock: number) => Promise<void>;
}

export interface BulkUploadProps {
  onUpload: (products: ProductCreate[]) => Promise<void>;
  onProgress: (progress: number) => void;
  supportedCountries: Country[];
}

// ==================== Dashboard & Analytics型 ====================

export interface CountrySummary {
  countryCode: CountryCode;
  countryName: string;
  totalProducts: number;
  totalStock: number;
  totalReserved: number;
  avgStockPerProduct: number;
  activeListings: number;
  revenue?: number;
}

export interface ProfitabilityAnalysis {
  countryCode: CountryCode;
  averageMargin: number;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  profitMarginPercent: number;
  topPerformingProducts: Product[];
}

export interface MarketComparison {
  countries: CountryCode[];
  metrics: {
    averageShippingCost: Record<CountryCode, number>;
    averageLocalPrice: Record<CountryCode, number>;
    competitiveIndex: Record<CountryCode, number>;
    marketPotential: Record<CountryCode, "HIGH" | "MEDIUM" | "LOW">;
  };
}

export interface DashboardData {
  overview: {
    totalProducts: number;
    totalCountries: number;
    totalRevenue: number;
    lowStockAlerts: number;
  };
  countrySummaries: CountrySummary[];
  profitabilityAnalysis: ProfitabilityAnalysis[];
  marketComparison: MarketComparison;
  recentEvents: InventoryEvent[];
}

// ==================== WebSocket型 ====================

export interface WebSocketMessage {
  type: "product_update" | "inventory_change" | "compliance_alert";
  countryCode: CountryCode;
  data: any;
  timestamp: string;
}

export interface ProductUpdateMessage extends WebSocketMessage {
  type: "product_update";
  data: {
    productId: string;
    sku: string;
    changes: Partial<Product>;
    updatedBy: string;
  };
}

export interface InventoryChangeMessage extends WebSocketMessage {
  type: "inventory_change";
  data: {
    sku: string;
    oldStock: number;
    newStock: number;
    changeAmount: number;
    source: string;
  };
}

export interface ComplianceAlertMessage extends WebSocketMessage {
  type: "compliance_alert";
  data: {
    productId: string;
    sku: string;
    warningLevel: "BANNED" | "RESTRICTED" | "WARNING";
    details: string;
  };
}

// ==================== Form & Validation型 ====================

export interface ProductFormData {
  sku: string;
  productNameJa: string;
  productNameEn: string;
  priceJpy: string; // Form input as string
  weightG: string;  // Form input as string
  categoryId: string; // Form input as string
  stockQuantity: string; // Form input as string
  description: string;
  imageUrls: string[];
  countryCode: CountryCode;
}

export interface ProductFormErrors {
  sku?: string;
  productNameJa?: string;
  productNameEn?: string;
  priceJpy?: string;
  weightG?: string;
  categoryId?: string;
  stockQuantity?: string;
  countryCode?: string;
  general?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ProductFormErrors;
}

// ==================== CSV処理型 ====================

export interface CsvRow {
  sku: string;
  country: string;
  product_name_ja: string;
  product_name_en: string;
  price: string;
  stock: string;
  category_id: string;
  image_url1?: string;
  image_url2?: string;
  image_url3?: string;
  image_url4?: string;
  image_url5?: string;
  image_url6?: string;
  image_url7?: string;
  image_url8?: string;
  image_url9?: string;
  description?: string;
  weight_g?: string;
}

export interface CsvParseResult {
  success: boolean;
  products: ProductCreate[];
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    message: string;
  }>;
}

export interface CsvUploadProgress {
  stage: "parsing" | "validating" | "uploading" | "completed" | "error";
  progress: number; // 0-100
  processedRows: number;
  totalRows: number;
  errors: string[];
  currentAction: string;
}

// ==================== Utility型 ====================

export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

export interface SortParams {
  field: keyof Product;
  direction: "asc" | "desc";
}

export interface FilterParams {
  countries: CountryCode[];
  status: Product["status"][];
  category: number[];
  priceRange: [number, number];
  stockRange: [number, number];
  searchQuery: string;
}

export interface ExportOptions {
  format: "csv" | "xlsx" | "json";
  countries: CountryCode[];
  includeInactive: boolean;
  fields: (keyof Product)[];
}

// ==================== API Client実装 ====================

export class ShopeeApiClientImpl implements ShopeeApiClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          status: "error",
          message: errorData.message || `HTTP ${response.status}`,
          errors: errorData.errors || [],
        };
      }

      const data = await response.json();
      return {
        status: "success",
        data,
      };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  // 国管理
  async getCountries(): Promise<ApiResponse<Country[]>> {
    return this.request<Country[]>('/api/v1/countries');
  }

  // 商品管理
  async createProduct(countryCode: CountryCode, product: ProductCreate): Promise<ApiResponse<Product>> {
    return this.request<Product>(`/api/v1/products/${countryCode}`, {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  async bulkCreateProducts(bulkRequest: ProductCreateBulk): Promise<ApiResponse<{ 
    createdCount: number; 
    products: Product[] 
  }>> {
    return this.request('/api/v1/bulk/products', {
      method: 'POST',
      body: JSON.stringify(bulkRequest),
    });
  }

  async getProducts(
    countryCode: CountryCode, 
    skip: number = 0, 
    limit: number = 100
  ): Promise<ApiResponse<{
    countryCode: CountryCode;
    total: number;
    products: Product[];
  }>> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    
    return this.request(`/api/v1/products/${countryCode}?${params}`);
  }

  async updateProduct(
    countryCode: CountryCode, 
    productId: string, 
    update: ProductUpdate
  ): Promise<ApiResponse<Product>> {
    return this.request<Product>(`/api/v1/products/${countryCode}/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  async deleteProduct(
    countryCode: CountryCode, 
    productId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/v1/products/${countryCode}/${productId}`, {
      method: 'DELETE',
    });
  }

  // 送料計算
  async calculateShipping(request: ShippingCalculateRequest): Promise<ApiResponse<ShippingCalculateResponse>> {
    return this.request<ShippingCalculateResponse>('/api/v1/shipping/calculate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getShippingRates(countryCode: CountryCode): Promise<ApiResponse<ShippingRate[]>> {
    return this.request<ShippingRate[]>(`/api/v1/shipping/rates/${countryCode}`);
  }

  // コンプライアンス
  async checkCompliance(request: ComplianceCheckRequest): Promise<ApiResponse<ComplianceCheckResponse>> {
    return this.request<ComplianceCheckResponse>('/api/v1/compliance/check', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // 在庫同期
  async syncInventoryAllCountries(
    sku: string, 
    newTotalStock: number
  ): Promise<ApiResponse<InventorySyncResponse>> {
    return this.request<InventorySyncResponse>(`/api/v1/inventory/sync/${sku}`, {
      method: 'PUT',
      body: JSON.stringify({ newTotalStock }),
    });
  }
}

// ==================== React Hook用ヘルパー型 ====================

export type AsyncActionResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: () => Promise<void>;
  reset: () => void;
};

export type MutationResult<TInput, TOutput> = {
  mutate: (input: TInput) => Promise<TOutput | null>;
  loading: boolean;
  error: string | null;
  reset: () => void;
};

// ==================== 設定・環境型 ====================

export interface AppConfig {
  apiBaseUrl: string;
  apiKey?: string;
  defaultCountry: CountryCode;
  supportedCountries: CountryCode[];
  features: {
    bulkUpload: boolean;
    realTimeSync: boolean;
    complianceChecks: boolean;
    analytics: boolean;
  };
  ui: {
    defaultPageSize: number;
    maxImageUploads: number;
    enableDarkMode: boolean;
  };
}

export interface UserPreferences {
  defaultCountry: CountryCode;
  preferredLanguage: "ja" | "en";
  timezone: string;
  notifications: {
    lowStock: boolean;
    complianceAlerts: boolean;
    priceChanges: boolean;
  };
  ui: {
    compactView: boolean;
    showAdvancedFeatures: boolean;
  };
}

// ==================== エクスポート用デフォルト設定 ====================

export const DEFAULT_CONFIG: AppConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  defaultCountry: CountryCode.SG,
  supportedCountries: [
    CountryCode.SG,
    CountryCode.MY,
    CountryCode.TH,
    CountryCode.PH,
    CountryCode.ID,
    CountryCode.VN,
    CountryCode.TW,
  ],
  features: {
    bulkUpload: true,
    realTimeSync: true,
    complianceChecks: true,
    analytics: true,
  },
  ui: {
    defaultPageSize: 50,
    maxImageUploads: 9,
    enableDarkMode: true,
  },
};

export const COUNTRY_NAMES: Record<CountryCode, string> = {
  [CountryCode.SG]: "シンガポール",
  [CountryCode.MY]: "マレーシア",
  [CountryCode.TH]: "タイ",
  [CountryCode.PH]: "フィリピン",
  [CountryCode.ID]: "インドネシア",
  [CountryCode.VN]: "ベトナム",
  [CountryCode.TW]: "台湾",
};

export const CURRENCY_SYMBOLS: Record<CountryCode, string> = {
  [CountryCode.SG]: "S$",
  [CountryCode.MY]: "RM",
  [CountryCode.TH]: "฿",
  [CountryCode.PH]: "₱",
  [CountryCode.ID]: "Rp",
  [CountryCode.VN]: "₫",
  [CountryCode.TW]: "NT$",
};

// ==================== バリデーション関数型 ====================

export type Validator<T> = (value: T) => string | null;

export interface ProductValidators {
  sku: Validator<string>;
  productNameJa: Validator<string>;
  productNameEn: Validator<string>;
  priceJpy: Validator<number>;
  weightG: Validator<number>;
  categoryId: Validator<number>;
  stockQuantity: Validator<number>;
}

// ==================== 完了 ====================

// すべての型定義とユーティリティが完成
// React + TypeScript + FastAPI バックエンドの完全な型安全性を保証