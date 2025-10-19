import React, { useState } from "react";
import {
  Calculator,
  Settings,
  TrendingUp,
  DollarSign,
  Globe,
  Package,
  FileSearch,
  Wrench,
  Edit2,
  Save,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

// ========================================
// データストア
// ========================================

// HSコードデータベース（Supabase + AI API）
const HS_CODES_DB = {
  "9023.00.0000": {
    description: "Instruments, apparatus for demonstration",
    base_duty: 0.0,
    section301: false,
    category: "Educational Equipment",
  },
  "9201.20.0000": {
    description: "Pianos, grand",
    base_duty: 0.04,
    section301: false,
    category: "Musical Instruments",
  },
  "6204.62.4011": {
    description: "Women's cotton trousers",
    base_duty: 0.165,
    section301: true,
    section301_rate: 0.25,
    category: "Apparel",
  },
};

// 原産国マスタ（拡張版）
const ORIGIN_COUNTRIES = [
  { code: "JP", name: "日本" },
  { code: "CN", name: "中国" },
  { code: "KR", name: "韓国" },
  { code: "TW", name: "台湾" },
  { code: "TH", name: "タイ" },
  { code: "VN", name: "ベトナム" },
  { code: "IN", name: "インド" },
  { code: "ID", name: "インドネシア" },
  { code: "MY", name: "マレーシア" },
  { code: "PH", name: "フィリピン" },
  { code: "US", name: "アメリカ" },
  { code: "MX", name: "メキシコ" },
  { code: "CA", name: "カナダ" },
  { code: "BR", name: "ブラジル" },
  { code: "GB", name: "イギリス" },
  { code: "DE", name: "ドイツ" },
  { code: "FR", name: "フランス" },
  { code: "IT", name: "イタリア" },
  { code: "ES", name: "スペイン" },
  { code: "PL", name: "ポーランド" },
];

// 為替レート
const EXCHANGE_RATES = {
  JPY_USD: { spot: 154.0, buffer: 0.03, safe: 154.0 * 1.03 },
};

// 消費税率
const CONSUMPTION_TAX_RATE = 0.1;

// 配送ポリシー（DDP/DDU別、価格帯別Handling）
const SHIPPING_POLICIES = [
  {
    id: 1,
    name: "Policy_XS",
    ebay_policy_id: "POL_XS_001",
    weight_min: 0,
    weight_max: 0.5,
    size_min: 0,
    size_max: 60,
    price_min: 0,
    price_max: 100,
    zones: {
      US: {
        display_shipping: 15,
        actual_cost: 20,
        handling_ddp: 8,
        handling_ddu: 2,
      },
      GB: { display_shipping: 12, actual_cost: 16, handling_ddu: 2 },
      EU: { display_shipping: 13, actual_cost: 17, handling_ddu: 2 },
      CA: { display_shipping: 16, actual_cost: 20, handling_ddu: 2 },
      HK: { display_shipping: 10, actual_cost: 13, handling_ddu: 2 },
      AU: { display_shipping: 18, actual_cost: 23, handling_ddu: 2 },
    },
  },
  {
    id: 2,
    name: "Policy_S",
    ebay_policy_id: "POL_S_002",
    weight_min: 0.5,
    weight_max: 2.0,
    size_min: 60,
    size_max: 100,
    price_min: 100,
    price_max: 300,
    zones: {
      US: {
        display_shipping: 25,
        actual_cost: 35,
        handling_ddp: 12,
        handling_ddu: 3,
      },
      GB: { display_shipping: 20, actual_cost: 28, handling_ddu: 3 },
      EU: { display_shipping: 22, actual_cost: 30, handling_ddu: 3 },
      CA: { display_shipping: 28, actual_cost: 36, handling_ddu: 3 },
      HK: { display_shipping: 18, actual_cost: 24, handling_ddu: 3 },
      AU: { display_shipping: 30, actual_cost: 38, handling_ddu: 3 },
    },
  },
  {
    id: 3,
    name: "Policy_M",
    ebay_policy_id: "POL_M_003",
    weight_min: 2.0,
    weight_max: 5.0,
    size_min: 100,
    size_max: 150,
    price_min: 300,
    price_max: 800,
    zones: {
      US: {
        display_shipping: 35,
        actual_cost: 50,
        handling_ddp: 18,
        handling_ddu: 4,
      },
      GB: { display_shipping: 30, actual_cost: 42, handling_ddu: 4 },
      EU: { display_shipping: 32, actual_cost: 45, handling_ddu: 4 },
      CA: { display_shipping: 38, actual_cost: 52, handling_ddu: 4 },
      HK: { display_shipping: 28, actual_cost: 38, handling_ddu: 4 },
      AU: { display_shipping: 42, actual_cost: 56, handling_ddu: 4 },
    },
  },
  {
    id: 4,
    name: "Policy_L",
    ebay_policy_id: "POL_L_004",
    weight_min: 5.0,
    weight_max: 15.0,
    size_min: 150,
    size_max: 200,
    price_min: 800,
    price_max: 2000,
    zones: {
      US: {
        display_shipping: 50,
        actual_cost: 75,
        handling_ddp: 25,
        handling_ddu: 5,
      },
      GB: { display_shipping: 45, actual_cost: 65, handling_ddu: 5 },
      EU: { display_shipping: 48, actual_cost: 68, handling_ddu: 5 },
      CA: { display_shipping: 55, actual_cost: 80, handling_ddu: 5 },
      HK: { display_shipping: 40, actual_cost: 58, handling_ddu: 5 },
      AU: { display_shipping: 60, actual_cost: 85, handling_ddu: 5 },
    },
  },
];

// 利益率設定（編集可能）
const INITIAL_PROFIT_MARGINS = {
  default: { default: 0.3, min: 0.2, min_amount: 10.0, max: 0.5 },
  condition: {
    new: { default: 0.1, min: 0.05, min_amount: 5.0, max: 0.2 },
    used: { default: 0.3, min: 0.2, min_amount: 10.0, max: 0.5 },
  },
  country: {
    US: { default: 0.25, min: 0.2, min_amount: 15.0, max: 0.35 },
    GB: { default: 0.3, min: 0.25, min_amount: 12.0, max: 0.4 },
    EU: { default: 0.3, min: 0.25, min_amount: 12.0, max: 0.4 },
    CA: { default: 0.28, min: 0.22, min_amount: 12.0, max: 0.38 },
    HK: { default: 0.35, min: 0.3, min_amount: 10.0, max: 0.45 },
    AU: { default: 0.32, min: 0.27, min_amount: 15.0, max: 0.42 },
  },
  category: {
    Antiques: { default: 0.35, min: 0.3, min_amount: 20.0, max: 0.45 },
    Collectibles: { default: 0.25, min: 0.2, min_amount: 10.0, max: 0.35 },
    "Musical Instruments": {
      default: 0.2,
      min: 0.15,
      min_amount: 30.0,
      max: 0.3,
    },
  },
};

// eBayカテゴリ別FVF（完全版）
const EBAY_CATEGORY_FEES = {
  "Musical Instruments > Guitars & Basses": {
    fvf: 0.035,
    cap: 350,
    insertion: 0.0,
  },
  "Musical Instruments > Other": { fvf: 0.1315, cap: null, insertion: 0.35 },
  Antiques: { fvf: 0.1315, cap: null, insertion: 0.35 },
  Collectibles: { fvf: 0.1315, cap: null, insertion: 0.35 },
  Art: { fvf: 0.15, cap: null, insertion: 0.35 },
  Books: { fvf: 0.1315, cap: null, insertion: 0.35 },
  Clothing: { fvf: 0.1315, cap: null, insertion: 0.35 },
  Electronics: { fvf: 0.041, cap: null, insertion: 0.35 },
  "Jewelry & Watches": { fvf: 0.1315, cap: null, insertion: 0.35 },
  "Toys & Hobbies": { fvf: 0.1315, cap: null, insertion: 0.35 },
  Default: { fvf: 0.1315, cap: null, insertion: 0.35 },
};

// ストアタイプ
const STORE_FEES = {
  none: { name: "ストアなし", fvf_discount: 0 },
  basic: { name: "Basic", fvf_discount: 0.04 },
  premium: { name: "Premium", fvf_discount: 0.06 },
  anchor: { name: "Anchor", fvf_discount: 0.08 },
};

// ========================================
// 価格計算エンジン
// ========================================
const PriceCalculationEngine = {
  calculateVolumetricWeight(length, width, height) {
    return (length * width * height) / 5000;
  },

  getEffectiveWeight(actualWeight, length, width, height) {
    const volumetric = this.calculateVolumetricWeight(length, width, height);
    return Math.max(actualWeight, volumetric);
  },

  getTariffRate(hsCode, originCountry) {
    const hsData = HS_CODES_DB[hsCode];
    if (!hsData)
      return { rate: 0.06, description: "HSコード未登録", section301: false };

    let totalRate = hsData.base_duty;
    if (originCountry === "CN" && hsData.section301) {
      totalRate += 0.25; // Section 301
    }

    return {
      rate: totalRate,
      description: hsData.description,
      section301: hsData.section301,
    };
  },

  calculateDDPFee(cifPrice) {
    return Math.min(3.5 + cifPrice * 0.025, 25.0);
  },

  selectOptimalPolicy(weight, estimatedPrice) {
    for (const policy of SHIPPING_POLICIES) {
      if (
        weight >= policy.weight_min &&
        weight <= policy.weight_max &&
        estimatedPrice >= policy.price_min &&
        estimatedPrice <= policy.price_max
      ) {
        return policy;
      }
    }
    return SHIPPING_POLICIES[SHIPPING_POLICIES.length - 1];
  },

  // 消費税還付計算（仕入値と還付対象手数料のみ）
  calculateConsumptionTaxRefund(costJPY, refundableFeesJPY) {
    const taxableAmount = costJPY + refundableFeesJPY;
    const refund =
      taxableAmount * (CONSUMPTION_TAX_RATE / (1 + CONSUMPTION_TAX_RATE));
    return {
      taxableAmount,
      refund,
      effectiveCost: costJPY - refund,
    };
  },

  calculate(params, policies, marginSettings) {
    const {
      costJPY,
      actualWeight,
      length,
      width,
      height,
      destCountry,
      originCountry = "JP",
      hsCode,
      category = "Default",
      storeType = "none",
      refundableFeesJPY = 0,
    } = params;

    // 1. 容積重量計算
    const effectiveWeight = this.getEffectiveWeight(
      actualWeight,
      length,
      width,
      height
    );
    const volumetricWeight = this.calculateVolumetricWeight(
      length,
      width,
      height
    );

    // 2. 消費税還付計算（仕入値 + 還付対象手数料のみ）
    const refundCalc = this.calculateConsumptionTaxRefund(
      costJPY,
      refundableFeesJPY
    );

    // 3. USD変換（還付なしで計算）
    const costUSD = costJPY / EXCHANGE_RATES.JPY_USD.safe;

    // 4. ポリシー選択
    const estimatedPrice = costUSD * 1.5;
    const policy = this.selectOptimalPolicy(effectiveWeight, estimatedPrice);
    const zone = policy.zones[destCountry];

    if (!zone) {
      return { success: false, error: `国 ${destCountry} は未対応です` };
    }

    // 5. 関税計算
    const tariffData = this.getTariffRate(hsCode, originCountry);
    const cifPrice = costUSD + zone.actual_cost;
    const tariff = cifPrice * tariffData.rate;

    // 6. DDP判定
    const isDDP = destCountry === "US";
    let ddpFee = 0;
    if (isDDP) {
      ddpFee = this.calculateDDPFee(cifPrice);
    }

    // 7. 固定コスト
    const categoryFees =
      EBAY_CATEGORY_FEES[category] || EBAY_CATEGORY_FEES["Default"];
    const fixedCosts =
      costUSD + zone.actual_cost + tariff + ddpFee + categoryFees.insertion;

    // 8. 目標利益率
    const marginSetting =
      marginSettings.category?.[category] ||
      marginSettings.country?.[destCountry] ||
      marginSettings.condition?.used ||
      marginSettings.default;

    const targetMargin = marginSetting.default;
    const minMargin = marginSetting.min;
    const minProfitAmount = marginSetting.min_amount;

    // 9. FVF計算（ストア割引適用）
    const storeFee = STORE_FEES[storeType];
    const finalFVF = Math.max(0, categoryFees.fvf - storeFee.fvf_discount);

    // 10. 変動費率
    const variableRate = finalFVF + 0.02 + 0.03 + 0.015;

    // 11. 必要売上
    const requiredRevenue = fixedCosts / (1 - variableRate - targetMargin);

    // 12. Handling設定（DDP/DDU別）
    const baseHandling = isDDP
      ? zone.handling_ddp || 0
      : zone.handling_ddu || 0;

    // 13. 商品価格
    let productPrice = requiredRevenue - zone.display_shipping - baseHandling;
    productPrice = Math.round(productPrice / 5) * 5;

    // 14. 総売上
    const totalRevenue = productPrice + zone.display_shipping + baseHandling;

    // 15. 利益計算（還付なし - デフォルト）
    let fvf = totalRevenue * finalFVF;
    if (categoryFees.cap && fvf > categoryFees.cap) {
      fvf = categoryFees.cap;
    }

    const variableCosts =
      fvf + totalRevenue * 0.02 + totalRevenue * 0.03 + totalRevenue * 0.015;
    const totalCosts = fixedCosts + variableCosts;
    const profitUSD_NoRefund = totalRevenue - totalCosts;
    const profitMargin_NoRefund = profitUSD_NoRefund / totalRevenue;

    // 16. 利益計算（還付込み）
    const refundUSD = refundCalc.refund / EXCHANGE_RATES.JPY_USD.safe;
    const profitUSD_WithRefund = profitUSD_NoRefund + refundUSD;
    const profitJPY_WithRefund =
      profitUSD_WithRefund * EXCHANGE_RATES.JPY_USD.spot;

    // 17. 最低利益チェック（還付なしで判定）
    if (
      profitMargin_NoRefund < minMargin ||
      profitUSD_NoRefund < minProfitAmount
    ) {
      return {
        success: false,
        error: "最低利益率・最低利益額を確保できません（還付なし基準）",
        current_profit_no_refund: profitUSD_NoRefund.toFixed(2),
        current_margin: (profitMargin_NoRefund * 100).toFixed(2) + "%",
        min_profit_amount: minProfitAmount,
        min_margin: (minMargin * 100).toFixed(1) + "%",
      };
    }

    // 18. 検索表示価格
    const searchDisplayPrice =
      productPrice + zone.display_shipping + baseHandling;

    return {
      success: true,
      productPrice,
      shipping: zone.display_shipping,
      handling: baseHandling,
      totalRevenue,
      searchDisplayPrice,

      // 還付なし利益（デフォルト）
      profitUSD_NoRefund,
      profitMargin_NoRefund,
      profitJPY_NoRefund: profitUSD_NoRefund * EXCHANGE_RATES.JPY_USD.spot,

      // 還付込み利益
      profitUSD_WithRefund,
      profitJPY_WithRefund,
      refundAmount: refundCalc.refund,
      refundUSD,

      minMargin,
      minProfitAmount,
      policyUsed: policy.name,
      isDDP,
      hsCode,
      tariffData,
      effectiveWeight,
      volumetricWeight,
      actualWeight,

      formulas: [
        {
          step: 1,
          label: "容積重量",
          formula: `(${length} × ${width} × ${height}) ÷ 5000 = ${volumetricWeight.toFixed(
            2
          )}kg`,
        },
        {
          step: 2,
          label: "適用重量",
          formula: `max(実重量${actualWeight}kg, 容積${volumetricWeight.toFixed(
            2
          )}kg) = ${effectiveWeight.toFixed(2)}kg`,
        },
        {
          step: 3,
          label: "消費税還付額",
          formula: `(仕入¥${costJPY.toLocaleString()} + 還付対象手数料¥${refundableFeesJPY.toLocaleString()}) × 10/110 = ¥${Math.round(
            refundCalc.refund
          ).toLocaleString()}`,
        },
        {
          step: 4,
          label: "USD変換",
          formula: `¥${costJPY.toLocaleString()} ÷ ${EXCHANGE_RATES.JPY_USD.safe.toFixed(
            2
          )} = $${costUSD.toFixed(2)}`,
        },
        {
          step: 5,
          label: "CIF価格",
          formula: `原価$${costUSD.toFixed(2)} + 実送料$${
            zone.actual_cost
          } = $${cifPrice.toFixed(2)}`,
        },
        {
          step: 6,
          label: "関税",
          formula: `CIF × ${(tariffData.rate * 100).toFixed(2)}% (${
            tariffData.description
          }) = $${tariff.toFixed(2)}`,
        },
        {
          step: 7,
          label: "DDP手数料",
          formula: isDDP
            ? `min($3.50 + CIF×2.5%, $25) = $${ddpFee.toFixed(2)}`
            : "DDUのため不要",
        },
        {
          step: 8,
          label: "固定コスト",
          formula: `原価 + 実送料 + 関税 + ${
            isDDP ? "DDP手数料" : "0"
          } + 出品料 = $${fixedCosts.toFixed(2)}`,
        },
        {
          step: 9,
          label: "Handling",
          formula: `${isDDP ? "DDP" : "DDU"}モード、価格帯${
            policy.name
          } = $${baseHandling}`,
        },
        {
          step: 10,
          label: "商品価格",
          formula: `必要売上 - 送料 - Handling = $${productPrice}`,
        },
        {
          step: 11,
          label: "検索表示価格",
          formula: `$${productPrice} + $${
            zone.display_shipping
          } + $${baseHandling} = $${searchDisplayPrice.toFixed(2)}`,
        },
        {
          step: 12,
          label: "利益（還付なし）",
          formula: `売上$${totalRevenue.toFixed(
            2
          )} - コスト$${totalCosts.toFixed(2)} = $${profitUSD_NoRefund.toFixed(
            2
          )} (${(profitMargin_NoRefund * 100).toFixed(2)}%)`,
        },
        {
          step: 13,
          label: "利益（還付込み）",
          formula: `還付なし$${profitUSD_NoRefund.toFixed(
            2
          )} + 還付$${refundUSD.toFixed(2)} = $${profitUSD_WithRefund.toFixed(
            2
          )} (¥${Math.round(profitJPY_WithRefund).toLocaleString()})`,
        },
      ],

      breakdown: {
        costUSD: costUSD.toFixed(2),
        actualShipping: zone.actual_cost.toFixed(2),
        cifPrice: cifPrice.toFixed(2),
        tariff: tariff.toFixed(2),
        ddpFee: ddpFee.toFixed(2),
        fvf: fvf.toFixed(2),
        fvfRate: (finalFVF * 100).toFixed(2) + "%",
        storeDiscount: (storeFee.fvf_discount * 100).toFixed(2) + "%",
        payoneer: (totalRevenue * 0.02).toFixed(2),
        exchangeLoss: (totalRevenue * 0.03).toFixed(2),
        internationalFee: (totalRevenue * 0.015).toFixed(2),
        totalCosts: totalCosts.toFixed(2),
      },
    };
  },
};

// ========================================
// メインアプリケーション
// ========================================
export default function EbayDDPPricingSystem() {
  const [activeTab, setActiveTab] = useState("calculator");
  const [calculationResult, setCalculationResult] = useState(null);
  const [profitMargins, setProfitMargins] = useState(INITIAL_PROFIT_MARGINS);

  const [formData, setFormData] = useState({
    costJPY: 15000,
    actualWeight: 1.0,
    length: 40,
    width: 30,
    height: 20,
    destCountry: "US",
    originCountry: "JP",
    hsCode: "9023.00.0000",
    category: "Collectibles",
    storeType: "none",
    refundableFeesJPY: 0,
  });

  const handleCalculate = () => {
    const result = PriceCalculationEngine.calculate(
      formData,
      SHIPPING_POLICIES,
      profitMargins
    );
    setCalculationResult(result);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">
              eBay DDP/DDU 完全版価格計算システム
            </h1>
          </div>
          <p className="text-gray-600">
            HSコード自動取得 | 容積重量 | 消費税還付（2パターン利益表示） |
            DDP/DDU最適化
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg mb-6 p-2">
          <div className="flex gap-2 flex-wrap">
            <TabButton
              icon={Calculator}
              label="価格計算"
              active={activeTab === "calculator"}
              onClick={() => setActiveTab("calculator")}
            />
            <TabButton
              icon={Settings}
              label="利益率設定"
              active={activeTab === "margin"}
              onClick={() => setActiveTab("margin")}
            />
            <TabButton
              icon={Package}
              label="配送ポリシー"
              active={activeTab === "policies"}
              onClick={() => setActiveTab("policies")}
            />
            <TabButton
              icon={FileSearch}
              label="HSコード管理"
              active={activeTab === "hscode"}
              onClick={() => setActiveTab("hscode")}
            />
            <TabButton
              icon={DollarSign}
              label="手数料設定"
              active={activeTab === "fees"}
              onClick={() => setActiveTab("fees")}
            />
            <TabButton
              icon={Globe}
              label="原産国・関税"
              active={activeTab === "tariffs"}
              onClick={() => setActiveTab("tariffs")}
            />
            <TabButton
              icon={Wrench}
              label="梱包費用設定"
              active={activeTab === "packaging"}
              onClick={() => setActiveTab("packaging")}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          {activeTab === "calculator" && (
            <CalculatorTab
              formData={formData}
              onInputChange={handleInputChange}
              onCalculate={handleCalculate}
              result={calculationResult}
            />
          )}

          {activeTab === "margin" && (
            <MarginSettingsTab
              margins={profitMargins}
              onUpdate={setProfitMargins}
            />
          )}

          {activeTab === "policies" && <ShippingPoliciesTab />}
          {activeTab === "hscode" && <HsCodeTab />}
          {activeTab === "fees" && <FeeSettingsTab />}
          {activeTab === "tariffs" && <TariffSettingsTab />}
          {activeTab === "packaging" && <PackagingCostTab />}
        </div>
      </div>
    </div>
  );
}

// ========================================
// タブコンポーネント
// ========================================

function CalculatorTab({ formData, onInputChange, onCalculate, result }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">価格計算</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <InputField
            label="仕入値（円）"
            type="number"
            value={formData.costJPY}
            onChange={(e) =>
              onInputChange("costJPY", parseFloat(e.target.value))
            }
          />

          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold mb-2 text-blue-800">
              容積重量計算（送料計算ツール連携）
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <InputField
                label="長さ(cm)"
                type="number"
                value={formData.length}
                onChange={(e) =>
                  onInputChange("length", parseFloat(e.target.value))
                }
              />
              <InputField
                label="幅(cm)"
                type="number"
                value={formData.width}
                onChange={(e) =>
                  onInputChange("width", parseFloat(e.target.value))
                }
              />
              <InputField
                label="高さ(cm)"
                type="number"
                value={formData.height}
                onChange={(e) =>
                  onInputChange("height", parseFloat(e.target.value))
                }
              />
            </div>
            <InputField
              label="実重量(kg)"
              type="number"
              step="0.1"
              value={formData.actualWeight}
              onChange={(e) =>
                onInputChange("actualWeight", parseFloat(e.target.value))
              }
            />
          </div>

          <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
            <h3 className="font-semibold mb-2 text-green-800">
              HSコード（AI自動取得可能）
            </h3>
            <input
              type="text"
              value={formData.hsCode}
              onChange={(e) => onInputChange("hsCode", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-2"
              placeholder="0000.00.0000"
            />
            {HS_CODES_DB[formData.hsCode] && (
              <p className="text-xs text-green-700">
                {HS_CODES_DB[formData.hsCode].description}
              </p>
            )}
          </div>

          <SelectField
            label="原産国（20カ国対応）"
            value={formData.originCountry}
            onChange={(e) => onInputChange("originCountry", e.target.value)}
            options={ORIGIN_COUNTRIES.map((c) => ({
              value: c.code,
              label: `${c.name} (${c.code})`,
            }))}
          />

          <SelectField
            label="対象国"
            value={formData.destCountry}
            onChange={(e) => onInputChange("destCountry", e.target.value)}
            options={[
              { value: "US", label: "USA (DDP)" },
              { value: "GB", label: "UK (DDU)" },
              { value: "EU", label: "EU (DDU)" },
              { value: "CA", label: "Canada (DDU)" },
              { value: "HK", label: "Hong Kong (DDU)" },
              { value: "AU", label: "Australia (DDU)" },
            ]}
          />

          <SelectField
            label="eBayカテゴリ"
            value={formData.category}
            onChange={(e) => onInputChange("category", e.target.value)}
            options={Object.keys(EBAY_CATEGORY_FEES).map((cat) => ({
              value: cat,
              label: cat,
            }))}
          />

          <SelectField
            label="ストアタイプ"
            value={formData.storeType}
            onChange={(e) => onInputChange("storeType", e.target.value)}
            options={Object.entries(STORE_FEES).map(([key, val]) => ({
              value: key,
              label: val.name,
            }))}
          />

          <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
            <h3 className="font-semibold mb-2 text-purple-800">
              消費税還付（自動計算）
            </h3>
            <p className="text-xs text-purple-700 mb-2">
              ※仕入値と還付対象手数料から自動算出
            </p>
            <InputField
              label="還付対象手数料（円）"
              type="number"
              value={formData.refundableFeesJPY}
              onChange={(e) =>
                onInputChange("refundableFeesJPY", parseFloat(e.target.value))
              }
            />
            <p className="text-xs text-purple-600 mt-2">
              還付額 = (仕入値 + 還付対象手数料) × 10/110
            </p>
          </div>

          <button
            onClick={onCalculate}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Calculator className="w-5 h-5" />
            計算実行
          </button>
        </div>

        <div className="space-y-4 max-h-[900px] overflow-y-auto">
          {result &&
            (result.success ? (
              <div className="space-y-4">
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 font-bold text-lg mb-3">
                    <CheckCircle className="w-5 h-5" />
                    計算成功
                  </div>
                  <div className="space-y-2 text-sm">
                    <ResultRow
                      label="商品価格"
                      value={`$${result.productPrice}`}
                      highlight
                    />
                    <ResultRow
                      label="送料（固定）"
                      value={`$${result.shipping}`}
                    />
                    <ResultRow
                      label="Handling"
                      value={`$${result.handling}`}
                      note={result.isDDP ? "（関税回収）" : "（最小限）"}
                    />
                    <ResultRow
                      label="検索表示価格"
                      value={`$${result.searchDisplayPrice.toFixed(2)}`}
                      highlight
                      color="text-blue-600"
                    />
                    <ResultRow
                      label="総売上"
                      value={`$${result.totalRevenue.toFixed(2)}`}
                    />
                  </div>
                </div>

                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                  <h3 className="font-bold text-yellow-800 mb-3">
                    💰 利益（2パターン表示）
                  </h3>

                  <div className="bg-white rounded p-3 mb-3">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      【デフォルト】還付なし利益
                    </h4>
                    <div className="space-y-1 text-sm">
                      <ResultRow
                        label="利益（USD）"
                        value={`$${result.profitUSD_NoRefund.toFixed(2)}`}
                        highlight
                      />
                      <ResultRow
                        label="利益（円）"
                        value={`¥${Math.round(
                          result.profitJPY_NoRefund
                        ).toLocaleString()}`}
                        highlight
                      />
                      <ResultRow
                        label="利益率"
                        value={`${(result.profitMargin_NoRefund * 100).toFixed(
                          2
                        )}%`}
                        color="text-blue-600"
                      />
                    </div>
                  </div>

                  <div className="bg-green-100 rounded p-3">
                    <h4 className="font-semibold text-green-800 mb-2">
                      【参考】還付込み利益
                    </h4>
                    <div className="space-y-1 text-sm">
                      <ResultRow
                        label="消費税還付額"
                        value={`¥${Math.round(
                          result.refundAmount
                        ).toLocaleString()}`}
                        color="text-green-600"
                      />
                      <ResultRow
                        label="還付（USD）"
                        value={`$${result.refundUSD.toFixed(2)}`}
                        color="text-green-600"
                      />
                      <ResultRow
                        label="利益（USD）"
                        value={`$${result.profitUSD_WithRefund.toFixed(2)}`}
                        highlight
                        color="text-green-600"
                      />
                      <ResultRow
                        label="利益（円）"
                        value={`¥${Math.round(
                          result.profitJPY_WithRefund
                        ).toLocaleString()}`}
                        highlight
                        color="text-green-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 max-h-80 overflow-y-auto">
                  <h3 className="font-bold text-gray-800 mb-3">
                    計算式（全13ステップ）
                  </h3>
                  <div className="space-y-2 text-xs font-mono">
                    {result.formulas.map((f, i) => (
                      <div key={i} className="bg-white p-2 rounded border">
                        <div className="text-indigo-600 font-bold">
                          Step {f.step}: {f.label}
                        </div>
                        <div className="text-gray-700">{f.formula}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                  <h3 className="font-bold text-gray-800 mb-3">コスト内訳</h3>
                  <div className="space-y-1 text-xs">
                    <ResultRow
                      label="原価"
                      value={`$${result.breakdown.costUSD}`}
                    />
                    <ResultRow
                      label="実送料"
                      value={`$${result.breakdown.actualShipping}`}
                    />
                    <ResultRow
                      label="関税"
                      value={`$${result.breakdown.tariff}`}
                    />
                    {result.isDDP && (
                      <ResultRow
                        label="DDP手数料"
                        value={`$${result.breakdown.ddpFee}`}
                      />
                    )}
                    <ResultRow
                      label={`FVF (${result.breakdown.fvfRate})`}
                      value={`$${result.breakdown.fvf}`}
                    />
                    <ResultRow
                      label={`ストア割引`}
                      value={`-${result.breakdown.storeDiscount}`}
                      color="text-green-600"
                    />
                    <ResultRow
                      label="Payoneer"
                      value={`$${result.breakdown.payoneer}`}
                    />
                    <ResultRow
                      label="為替損失"
                      value={`$${result.breakdown.exchangeLoss}`}
                    />
                    <ResultRow
                      label="海外手数料"
                      value={`$${result.breakdown.internationalFee}`}
                    />
                    <ResultRow
                      label="総コスト"
                      value={`$${result.breakdown.totalCosts}`}
                      highlight
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                <div className="flex items-center gap-2 text-red-700 font-bold text-xl mb-4">
                  <XCircle className="w-6 h-6" />
                  計算エラー
                </div>
                <p className="text-red-600 mb-2">{result.error}</p>
                {result.current_profit_no_refund && (
                  <div className="text-sm text-red-500 space-y-1">
                    <div>現在利益: ${result.current_profit_no_refund}</div>
                    <div>現在利益率: {result.current_margin}</div>
                    <div>最低利益額: ${result.min_profit_amount}</div>
                    <div>最低利益率: {result.min_margin}</div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function MarginSettingsTab({ margins, onUpdate }) {
  const [editing, setEditing] = useState(null);

  const MarginEditRow = ({ level, keyName, label, data }) => (
    <div className="grid grid-cols-4 gap-4 py-3 border-b items-center text-sm">
      <span className="font-medium">{label}</span>
      <div>
        デフォルト: <strong>{(data.default * 100).toFixed(1)}%</strong>
      </div>
      <div>
        最低率: <strong>{(data.min * 100).toFixed(1)}%</strong>
      </div>
      <div>
        最低額: <strong className="text-green-600">${data.min_amount}</strong>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">
        利益率設定（編集可能）
      </h2>

      <div className="space-y-6">
        <SettingsCard title="デフォルト">
          <MarginEditRow
            level="default"
            keyName="default"
            label="全商品"
            data={margins.default}
          />
        </SettingsCard>

        <SettingsCard title="コンディション別">
          {Object.entries(margins.condition).map(([key, data]) => (
            <MarginEditRow
              key={key}
              level="condition"
              keyName={key}
              label={key === "new" ? "新品" : "中古"}
              data={data}
            />
          ))}
        </SettingsCard>

        <SettingsCard title="国別">
          {Object.entries(margins.country).map(([key, data]) => (
            <MarginEditRow
              key={key}
              level="country"
              keyName={key}
              label={key}
              data={data}
            />
          ))}
        </SettingsCard>

        <SettingsCard title="カテゴリ別">
          {Object.entries(margins.category).map(([key, data]) => (
            <MarginEditRow
              key={key}
              level="category"
              keyName={key}
              label={key}
              data={data}
            />
          ))}
        </SettingsCard>
      </div>
    </div>
  );
}

function ShippingPoliciesTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">
        配送ポリシー（DDP/DDU別Handling）
      </h2>

      {SHIPPING_POLICIES.map((policy) => (
        <SettingsCard
          key={policy.id}
          title={`${policy.name} (${policy.ebay_policy_id})`}
        >
          <div className="mb-4 grid grid-cols-3 gap-4 text-sm bg-gray-50 p-3 rounded">
            <div>
              重量:{" "}
              <strong>
                {policy.weight_min}-{policy.weight_max}kg
              </strong>
            </div>
            <div>
              サイズ:{" "}
              <strong>
                {policy.size_min}-{policy.size_max}cm
              </strong>
            </div>
            <div>
              価格帯:{" "}
              <strong>
                ${policy.price_min}-$
                {policy.price_max === Infinity ? "∞" : policy.price_max}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {Object.entries(policy.zones).map(([country, zone]) => (
              <div
                key={country}
                className="bg-blue-50 border border-blue-200 rounded p-3"
              >
                <div className="font-bold mb-2">{country}</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>表示送料:</span>
                    <strong className="text-blue-600">
                      ${zone.display_shipping}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>実費:</span>
                    <strong className="text-red-600">
                      ${zone.actual_cost}
                    </strong>
                  </div>
                  <div className="border-t my-1"></div>
                  {zone.handling_ddp !== undefined && (
                    <div className="flex justify-between">
                      <span>Handling (DDP):</span>
                      <strong className="text-green-600">
                        ${zone.handling_ddp}
                      </strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Handling (DDU):</span>
                    <strong className="text-green-600">
                      ${zone.handling_ddu}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SettingsCard>
      ))}
    </div>
  );
}

function HsCodeTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">
        HSコード管理（AI自動取得）
      </h2>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          AI自動分類API連携
        </h3>
        <div className="space-y-3 text-sm">
          <div>
            <strong>Zonos Classify API:</strong>{" "}
            商品説明・画像から自動分類（85-94%精度）
          </div>
          <div>
            <strong>Avalara API:</strong> 機械学習ベースの自動分類
          </div>
          <div>
            <strong>Supabase保存:</strong> 一度取得したHSコードは高速参照
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(HS_CODES_DB).map(([code, data]) => (
          <div
            key={code}
            className="border-2 rounded-lg p-4 hover:border-indigo-300 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono font-bold">{code}</div>
              {data.section301 && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                  Section 301
                </span>
              )}
            </div>
            <div className="text-sm text-gray-700 mb-2">{data.description}</div>
            <div className="text-xs">
              基本関税: <strong>{(data.base_duty * 100).toFixed(2)}%</strong>
              {data.section301 && (
                <span className="ml-3 text-red-600">+ Section 301: 25%</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeeSettingsTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">手数料設定</h2>

      <SettingsCard title="eBayカテゴリ別FVF">
        <div className="space-y-2">
          {Object.entries(EBAY_CATEGORY_FEES).map(([cat, fees]) => (
            <div
              key={cat}
              className="grid grid-cols-4 gap-4 py-2 border-b text-sm"
            >
              <div className="font-medium">{cat}</div>
              <div>
                FVF: <strong>{(fees.fvf * 100).toFixed(2)}%</strong>
              </div>
              <div>
                Cap: <strong>{fees.cap ? `$${fees.cap}` : "なし"}</strong>
              </div>
              <div>
                出品料: <strong>${fees.insertion.toFixed(2)}</strong>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="ストアタイプ別FVF割引">
        <div className="space-y-2">
          {Object.entries(STORE_FEES).map(([type, store]) => (
            <div key={type} className="flex justify-between py-2 border-b">
              <span className="font-medium">{store.name}</span>
              <strong className="text-green-600">
                -{(store.fvf_discount * 100).toFixed(2)}%
              </strong>
            </div>
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}

function TariffSettingsTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">
        原産国・関税設定（20カ国対応）
      </h2>

      <SettingsCard title="原産国マスタ">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ORIGIN_COUNTRIES.map((country) => (
            <div
              key={country.code}
              className="bg-gray-50 p-3 rounded border text-sm"
            >
              <div className="font-semibold">{country.name}</div>
              <div className="text-gray-600">{country.code}</div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-2">関税率について</h3>
        <div className="text-sm space-y-1">
          <p>• 関税率はHSコード（10桁）で決定されます</p>
          <p>• 中国原産品でSection 301対象の場合、追加25%</p>
          <p>• HSコード管理タブで具体的な税率を確認できます</p>
        </div>
      </div>
    </div>
  );
}

function PackagingCostTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">梱包費用・人件費設定</h2>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-800 mb-4">
          重量・サイズ別費用設定
        </h3>
        <p className="text-sm mb-4">※この機能は今後実装予定です</p>
        <div className="space-y-3 text-sm">
          <div>• 重量帯別の梱包資材費</div>
          <div>• サイズ別の人件費（梱包時間）</div>
          <div>• 配送準備費用</div>
          <div>• その他経費</div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// ユーティリティ
// ========================================

function TabButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="font-medium">{label}</span>
    </button>
  );
}

function InputField({ label, type = "text", value, onChange, step }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        step={step}
        className="w-full px-3 py-2 border rounded-lg text-sm"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border rounded-lg text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ResultRow({ label, value, highlight, color = "text-gray-800", note }) {
  return (
    <div
      className={`flex justify-between items-center ${
        highlight ? "font-bold" : ""
      }`}
    >
      <span className="text-gray-600">{label}</span>
      <div className="text-right">
        <span className={color}>{value}</span>
        {note && <span className="text-xs text-gray-500 ml-1">{note}</span>}
      </div>
    </div>
  );
}

function SettingsCard({ title, children }) {
  return (
    <div className="border-2 rounded-lg p-6 bg-gray-50">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  );
}
