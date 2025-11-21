/**
 * Amazon Selling Partner API (SP-API) Type Definitions
 */

// ============================================================
// FBA Inbound Shipment
// ============================================================

export interface InboundShipmentPlanRequest {
  ShipFromAddress: Address
  LabelPrepPreference: 'SELLER_LABEL' | 'AMAZON_LABEL_ONLY' | 'AMAZON_LABEL_PREFERRED'
  ShipToCountryCode: string
  InboundShipmentPlanRequestItems: InboundShipmentPlanRequestItem[]
}

export interface InboundShipmentPlanRequestItem {
  SellerSKU: string
  ASIN: string
  Condition: 'NewItem' | 'NewWithWarranty' | 'NewOEM' | 'NewOpenBox' | 'UsedLikeNew' | 'UsedVeryGood' | 'UsedGood' | 'UsedAcceptable' | 'UsedPoor' | 'CollectibleLikeNew' | 'CollectibleVeryGood' | 'CollectibleGood' | 'CollectibleAcceptable' | 'CollectiblePoor' | 'RefurbishedWithWarranty' | 'Refurbished' | 'Club'
  Quantity: number
  QuantityInCase?: number
  PrepDetailsList?: PrepDetails[]
}

export interface PrepDetails {
  PrepInstruction: string
  PrepOwner: 'AMAZON' | 'SELLER'
}

export interface Address {
  Name: string
  AddressLine1: string
  AddressLine2?: string
  City: string
  DistrictOrCounty?: string
  StateOrProvinceCode: string
  PostalCode: string
  CountryCode: string
}

export interface InboundShipmentPlan {
  ShipmentId: string
  DestinationFulfillmentCenterId: string
  ShipToAddress: Address
  LabelPrepType: string
  Items: InboundShipmentPlanItem[]
  EstimatedBoxContentsFee?: BoxContentsFeeDetails
}

export interface InboundShipmentPlanItem {
  SellerSKU: string
  FulfillmentNetworkSKU: string
  Quantity: number
  PrepDetailsList?: PrepDetails[]
}

export interface BoxContentsFeeDetails {
  TotalUnits: number
  FeePerUnit: Money
  TotalFee: Money
}

export interface Money {
  CurrencyCode: string
  Value: string
}

export interface InboundShipment {
  ShipmentId: string
  ShipmentName: string
  ShipFromAddress: Address
  DestinationFulfillmentCenterId: string
  ShipmentStatus: 'WORKING' | 'SHIPPED' | 'RECEIVING' | 'CANCELLED' | 'DELETED' | 'CLOSED' | 'ERROR' | 'IN_TRANSIT' | 'DELIVERED' | 'CHECKED_IN'
  LabelPrepType: string
  AreCasesRequired: boolean
  ConfirmedNeedByDate?: string
  BoxContentsSource?: string
  EstimatedBoxContentsFee?: BoxContentsFeeDetails
}

export interface InboundShipmentItem {
  ShipmentId: string
  SellerSKU: string
  FulfillmentNetworkSKU: string
  QuantityShipped: number
  QuantityReceived?: number
  QuantityInCase?: number
  ReleaseDate?: string
  PrepDetailsList?: PrepDetails[]
}

// ============================================================
// Catalog Items
// ============================================================

export interface CatalogItem {
  asin: string
  attributes?: Record<string, any>
  identifiers?: ItemIdentifiers[]
  images?: ItemImage[]
  productTypes?: ProductType[]
  salesRanks?: SalesRank[]
  summaries?: ItemSummary[]
}

export interface ItemIdentifiers {
  identifierType: string
  identifier: string
  marketplaceId: string
}

export interface ItemImage {
  variant: string
  link: string
  height: number
  width: number
}

export interface ProductType {
  productType: string
  marketplaceId: string
}

export interface SalesRank {
  title: string
  link?: string
  rank: number
}

export interface ItemSummary {
  marketplaceId: string
  brandName?: string
  browseNode?: string
  colorName?: string
  itemName?: string
  manufacturer?: string
  modelNumber?: string
  sizeName?: string
  styleName?: string
}

// ============================================================
// Listings
// ============================================================

export interface ListingsItem {
  sku: string
  summaries?: ListingsItemSummary[]
  attributes?: Record<string, any>
  issues?: Issue[]
  offers?: ListingsItemOffer[]
  fulfillmentAvailability?: FulfillmentAvailability[]
  procurement?: ListingsItemProcurement[]
}

export interface ListingsItemSummary {
  marketplaceId: string
  asin: string
  productType: string
  conditionType?: string
  status: string[]
  fnSku?: string
  itemName: string
  createdDate: string
  lastUpdatedDate: string
  mainImage?: Image
}

export interface Image {
  link: string
  height: number
  width: number
}

export interface Issue {
  code: string
  message: string
  severity: 'ERROR' | 'WARNING' | 'INFO'
  attributeName?: string
}

export interface ListingsItemOffer {
  marketplaceId: string
  offerType: 'B2C' | 'B2B'
  price: Money
  points?: Points
}

export interface Points {
  pointsNumber: number
  monetaryValue?: Money
}

export interface FulfillmentAvailability {
  fulfillmentChannelCode: string
  quantity?: number
}

export interface ListingsItemProcurement {
  costPrice: Money
}

// ============================================================
// FBA Inventory
// ============================================================

export interface FBAInventorySummary {
  asin?: string
  fnSku?: string
  sellerSku?: string
  condition?: string
  inventoryDetails?: InventoryDetails
  lastUpdatedTime?: string
  productName?: string
  totalQuantity?: number
}

export interface InventoryDetails {
  fulfillableQuantity?: number
  inboundWorkingQuantity?: number
  inboundShippedQuantity?: number
  inboundReceivingQuantity?: number
  reservedQuantity?: ReservedQuantity
  unfulfillableQuantity?: UnfulfillableQuantity
  researchingQuantity?: ResearchingQuantity
}

export interface ReservedQuantity {
  totalReservedQuantity?: number
  pendingCustomerOrderQuantity?: number
  pendingTransshipmentQuantity?: number
  fcProcessingQuantity?: number
}

export interface UnfulfillableQuantity {
  totalUnfulfillableQuantity?: number
  customerDamagedQuantity?: number
  warehouseDamagedQuantity?: number
  distributorDamagedQuantity?: number
  carrierDamagedQuantity?: number
  defectiveQuantity?: number
  expiredQuantity?: number
}

export interface ResearchingQuantity {
  totalResearchingQuantity?: number
  researchingQuantityBreakdown?: ResearchingQuantityEntry[]
}

export interface ResearchingQuantityEntry {
  name: string
  quantity: number
}

// ============================================================
// Orders
// ============================================================

export interface Order {
  AmazonOrderId: string
  SellerOrderId?: string
  PurchaseDate: string
  LastUpdateDate: string
  OrderStatus: 'Pending' | 'Unshipped' | 'PartiallyShipped' | 'Shipped' | 'Canceled' | 'Unfulfillable' | 'InvoiceUnconfirmed' | 'PendingAvailability'
  FulfillmentChannel: 'MFN' | 'AFN'
  SalesChannel?: string
  OrderChannel?: string
  ShipServiceLevel?: string
  OrderTotal?: Money
  NumberOfItemsShipped?: number
  NumberOfItemsUnshipped?: number
  PaymentMethod?: string
  PaymentMethodDetails?: string[]
  MarketplaceId?: string
  ShipmentServiceLevelCategory?: string
  OrderType?: 'StandardOrder' | 'LongLeadTimeOrder' | 'Preorder' | 'BackOrder' | 'SourcingOnDemandOrder'
  EarliestShipDate?: string
  LatestShipDate?: string
  EarliestDeliveryDate?: string
  LatestDeliveryDate?: string
  IsBusinessOrder?: boolean
  IsPrime?: boolean
  IsPremiumOrder?: boolean
  IsGlobalExpressEnabled?: boolean
  DefaultShipFromLocationAddress?: Address
  BuyerInfo?: BuyerInfo
  AutomatedShippingSettings?: AutomatedShippingSettings
  HasRegulatedItems?: boolean
  ElectronicInvoiceStatus?: string
}

export interface BuyerInfo {
  BuyerEmail?: string
  BuyerName?: string
  BuyerCounty?: string
  BuyerTaxInfo?: BuyerTaxInfo
  PurchaseOrderNumber?: string
}

export interface BuyerTaxInfo {
  CompanyLegalName?: string
  TaxingRegion?: string
  TaxClassifications?: TaxClassification[]
}

export interface TaxClassification {
  Name?: string
  Value?: string
}

export interface AutomatedShippingSettings {
  HasAutomatedShippingSettings?: boolean
  AutomatedCarrier?: string
  AutomatedShipMethod?: string
}

export interface OrderItem {
  ASIN: string
  SellerSKU?: string
  OrderItemId: string
  Title?: string
  QuantityOrdered: number
  QuantityShipped?: number
  ProductInfo?: ProductInfoDetail
  PointsGranted?: PointsGrantedDetail
  ItemPrice?: Money
  ShippingPrice?: Money
  ItemTax?: Money
  ShippingTax?: Money
  ShippingDiscount?: Money
  ShippingDiscountTax?: Money
  PromotionDiscount?: Money
  PromotionDiscountTax?: Money
  PromotionIds?: string[]
  CODFee?: Money
  CODFeeDiscount?: Money
  IsGift?: boolean
  ConditionNote?: string
  ConditionId?: string
  ConditionSubtypeId?: string
  ScheduledDeliveryStartDate?: string
  ScheduledDeliveryEndDate?: string
  PriceDesignation?: string
  TaxCollection?: TaxCollection
  SerialNumberRequired?: boolean
  IsTransparency?: boolean
  IossNumber?: string
  StoreChainStoreId?: string
  DeemedResellerCategory?: string
  BuyerInfo?: ItemBuyerInfo
  BuyerRequestedCancel?: BuyerRequestedCancel
}

export interface ProductInfoDetail {
  NumberOfItems?: number
}

export interface PointsGrantedDetail {
  PointsNumber?: number
  PointsMonetaryValue?: Money
}

export interface TaxCollection {
  Model?: string
  ResponsibleParty?: string
}

export interface ItemBuyerInfo {
  BuyerCustomizedInfo?: BuyerCustomizedInfoDetail
  GiftWrapPrice?: Money
  GiftWrapTax?: Money
  GiftMessageText?: string
  GiftWrapLevel?: string
}

export interface BuyerCustomizedInfoDetail {
  CustomizedURL?: string
}

export interface BuyerRequestedCancel {
  IsBuyerRequestedCancel?: boolean
  BuyerCancelReason?: string
}

// ============================================================
// Marketplace IDs
// ============================================================

export const MARKETPLACE_IDS = {
  // North America
  US: 'ATVPDKIKX0DER',
  CA: 'A2EUQ1WTGCTBG2',
  MX: 'A1AM78C64UM0Y8',
  BR: 'A2Q3Y263D00KWC',

  // Europe
  UK: 'A1F83G8C2ARO7P',
  DE: 'A1PA6795UKMFR9',
  FR: 'A13V1IB3VIYZZH',
  IT: 'APJ6JRA9NG5V4',
  ES: 'A1RKKUPIHCS9HS',
  NL: 'A1805IZSGTT6HS',
  SE: 'A2NODRKZP88ZB9',
  PL: 'A1C3SOZRARQ6R3',
  BE: 'AMEN7PMS3EDWL',

  // Far East
  JP: 'A1VC38T7YXB528',
  AU: 'A39IBJ37TRP1C6',
  SG: 'A19VAU5U5O7RUS',

  // Middle East
  AE: 'A2VIGQ35RCS4UG',
  IN: 'A21TJRUUN4KGV'
} as const

export type MarketplaceCode = keyof typeof MARKETPLACE_IDS
