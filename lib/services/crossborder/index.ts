/**
 * lib/services/crossborder/index.ts
 *
 * クロスボーダー無在庫システム Phase 2
 * 統合エクスポートファイル
 */

// クロスボーダー利益計算エンジン
export {
  calculateCrossBorderProfit,
  findOptimalCrossBorderRoute,
  calculateAutoListingPrice,
  type ProductInput,
  type CrossBorderRoute,
  type ProfitCalculationResult,
  type OptimalRouteResult,
} from './crossBorderProfitCalculator';

// フォワーダーAPI統合サービス
export {
  getDdpShippingRate,
  createShippingInstruction,
  getTrackingInfo,
  getWarehouseAddress,
  type ShippingAddress,
  type ShippingInstructionRequest,
  type DdpRateRequest,
  type DdpRateResponse,
  type ShippingInstructionResponse,
  type TrackingInfo,
} from './forwarderApiService';

// DDP自動化サービス
export {
  executeDdpAutomation,
  updateTrackingNumber,
  monitorOrderDelivery,
  type OrderInfo,
  type SupplierInfo,
  type DdpAutomationRequest,
  type DdpAutomationResult,
} from './ddpAutomationService';
