/**
 * Shopeeカテゴリマッピングテーブル
 * eBayカテゴリ → Shopeeカテゴリへの変換
 */

import { ShopeeCountryCode } from './translator';

export interface ShopeeCategoryMapping {
  ebayCategory: string;
  ebayCategoryId?: string;
  shopeeCategories: Record<
    ShopeeCountryCode,
    {
      categoryId: number;
      categoryPath: string[];
      requiredAttributes?: string[];
      recommendedAttributes?: string[];
    }
  >;
}

/**
 * 主要カテゴリのマッピング
 * 注: Shopeeのカテゴリは国ごとに異なる場合があります
 */
export const CATEGORY_MAPPINGS: ShopeeCategoryMapping[] = [
  // 電子機器 - Electronics
  {
    ebayCategory: 'Consumer Electronics',
    ebayCategoryId: '293',
    shopeeCategories: {
      TW: {
        categoryId: 100001,
        categoryPath: ['電子產品', '手機與配件'],
        requiredAttributes: ['Brand', 'Model', 'Condition'],
        recommendedAttributes: ['Color', 'Storage Capacity'],
      },
      TH: {
        categoryId: 100001,
        categoryPath: ['อิเล็กทรอนิกส์', 'มือถือและอุปกรณ์เสริม'],
        requiredAttributes: ['Brand', 'Model', 'Condition'],
      },
      SG: {
        categoryId: 100001,
        categoryPath: ['Electronics', 'Mobile & Gadgets'],
        requiredAttributes: ['Brand', 'Model', 'Condition'],
      },
      MY: {
        categoryId: 100001,
        categoryPath: ['Electronics', 'Mobile & Gadgets'],
        requiredAttributes: ['Brand', 'Model', 'Condition'],
      },
      PH: {
        categoryId: 100001,
        categoryPath: ['Electronics', 'Mobile & Gadgets'],
        requiredAttributes: ['Brand', 'Model', 'Condition'],
      },
      VN: {
        categoryId: 100001,
        categoryPath: ['Điện tử', 'Điện thoại & Phụ kiện'],
        requiredAttributes: ['Brand', 'Model', 'Condition'],
      },
      ID: {
        categoryId: 100001,
        categoryPath: ['Elektronik', 'Handphone & Aksesoris'],
        requiredAttributes: ['Brand', 'Model', 'Condition'],
      },
      BR: {
        categoryId: 100001,
        categoryPath: ['Eletrônicos', 'Celulares e Acessórios'],
        requiredAttributes: ['Brand', 'Model', 'Condition'],
      },
      MX: {
        categoryId: 100001,
        categoryPath: ['Electrónica', 'Celulares y Accesorios'],
        requiredAttributes: ['Brand', 'Model', 'Condition'],
      },
    },
  },

  // ファッション - Fashion
  {
    ebayCategory: 'Clothing, Shoes & Accessories',
    ebayCategoryId: '11450',
    shopeeCategories: {
      TW: {
        categoryId: 100002,
        categoryPath: ['時尚', '女裝'],
        requiredAttributes: ['Size', 'Color', 'Material'],
        recommendedAttributes: ['Brand', 'Style'],
      },
      TH: {
        categoryId: 100002,
        categoryPath: ['แฟชั่น', 'เสื้อผ้าผู้หญิง'],
        requiredAttributes: ['Size', 'Color', 'Material'],
      },
      SG: {
        categoryId: 100002,
        categoryPath: ['Fashion', "Women's Clothes"],
        requiredAttributes: ['Size', 'Color', 'Material'],
      },
      MY: {
        categoryId: 100002,
        categoryPath: ['Fashion', "Women's Clothes"],
        requiredAttributes: ['Size', 'Color', 'Material'],
      },
      PH: {
        categoryId: 100002,
        categoryPath: ['Fashion', "Women's Clothes"],
        requiredAttributes: ['Size', 'Color', 'Material'],
      },
      VN: {
        categoryId: 100002,
        categoryPath: ['Thời trang', 'Quần áo nữ'],
        requiredAttributes: ['Size', 'Color', 'Material'],
      },
      ID: {
        categoryId: 100002,
        categoryPath: ['Fashion', 'Pakaian Wanita'],
        requiredAttributes: ['Size', 'Color', 'Material'],
      },
      BR: {
        categoryId: 100002,
        categoryPath: ['Moda', 'Roupas Femininas'],
        requiredAttributes: ['Size', 'Color', 'Material'],
      },
      MX: {
        categoryId: 100002,
        categoryPath: ['Moda', 'Ropa de Mujer'],
        requiredAttributes: ['Size', 'Color', 'Material'],
      },
    },
  },

  // 美容・健康 - Beauty & Health
  {
    ebayCategory: 'Health & Beauty',
    ebayCategoryId: '26395',
    shopeeCategories: {
      TW: {
        categoryId: 100003,
        categoryPath: ['美妝保養', '臉部保養'],
        requiredAttributes: ['Brand', 'Product Type'],
        recommendedAttributes: ['Skin Type', 'Ingredients'],
      },
      TH: {
        categoryId: 100003,
        categoryPath: ['ความงาม', 'ผลิตภัณฑ์ดูแลผิวหน้า'],
        requiredAttributes: ['Brand', 'Product Type'],
      },
      SG: {
        categoryId: 100003,
        categoryPath: ['Beauty & Personal Care', 'Skin Care'],
        requiredAttributes: ['Brand', 'Product Type'],
      },
      MY: {
        categoryId: 100003,
        categoryPath: ['Beauty & Personal Care', 'Skin Care'],
        requiredAttributes: ['Brand', 'Product Type'],
      },
      PH: {
        categoryId: 100003,
        categoryPath: ['Beauty & Personal Care', 'Skin Care'],
        requiredAttributes: ['Brand', 'Product Type'],
      },
      VN: {
        categoryId: 100003,
        categoryPath: ['Làm đẹp', 'Chăm sóc da'],
        requiredAttributes: ['Brand', 'Product Type'],
      },
      ID: {
        categoryId: 100003,
        categoryPath: ['Kecantikan', 'Perawatan Kulit'],
        requiredAttributes: ['Brand', 'Product Type'],
      },
      BR: {
        categoryId: 100003,
        categoryPath: ['Beleza', 'Cuidados com a Pele'],
        requiredAttributes: ['Brand', 'Product Type'],
      },
      MX: {
        categoryId: 100003,
        categoryPath: ['Belleza', 'Cuidado de la Piel'],
        requiredAttributes: ['Brand', 'Product Type'],
      },
    },
  },

  // ホーム&リビング - Home & Living
  {
    ebayCategory: 'Home & Garden',
    ebayCategoryId: '11700',
    shopeeCategories: {
      TW: {
        categoryId: 100004,
        categoryPath: ['居家生活', '家具'],
        requiredAttributes: ['Material', 'Dimensions'],
        recommendedAttributes: ['Color', 'Style'],
      },
      TH: {
        categoryId: 100004,
        categoryPath: ['บ้านและสวน', 'เฟอร์นิเจอร์'],
        requiredAttributes: ['Material', 'Dimensions'],
      },
      SG: {
        categoryId: 100004,
        categoryPath: ['Home & Living', 'Furniture'],
        requiredAttributes: ['Material', 'Dimensions'],
      },
      MY: {
        categoryId: 100004,
        categoryPath: ['Home & Living', 'Furniture'],
        requiredAttributes: ['Material', 'Dimensions'],
      },
      PH: {
        categoryId: 100004,
        categoryPath: ['Home & Living', 'Furniture'],
        requiredAttributes: ['Material', 'Dimensions'],
      },
      VN: {
        categoryId: 100004,
        categoryPath: ['Nhà cửa & Đời sống', 'Nội thất'],
        requiredAttributes: ['Material', 'Dimensions'],
      },
      ID: {
        categoryId: 100004,
        categoryPath: ['Rumah & Taman', 'Furnitur'],
        requiredAttributes: ['Material', 'Dimensions'],
      },
      BR: {
        categoryId: 100004,
        categoryPath: ['Casa e Jardim', 'Móveis'],
        requiredAttributes: ['Material', 'Dimensions'],
      },
      MX: {
        categoryId: 100004,
        categoryPath: ['Hogar y Jardín', 'Muebles'],
        requiredAttributes: ['Material', 'Dimensions'],
      },
    },
  },

  // スポーツ&アウトドア - Sports & Outdoors
  {
    ebayCategory: 'Sporting Goods',
    ebayCategoryId: '888',
    shopeeCategories: {
      TW: {
        categoryId: 100005,
        categoryPath: ['運動休閒', '運動服飾'],
        requiredAttributes: ['Size', 'Color', 'Sport Type'],
        recommendedAttributes: ['Brand', 'Material'],
      },
      TH: {
        categoryId: 100005,
        categoryPath: ['กีฬาและกิจกรรมกลางแจ้ง', 'เสื้อผ้ากีฬา'],
        requiredAttributes: ['Size', 'Color', 'Sport Type'],
      },
      SG: {
        categoryId: 100005,
        categoryPath: ['Sports & Outdoors', 'Sports Apparel'],
        requiredAttributes: ['Size', 'Color', 'Sport Type'],
      },
      MY: {
        categoryId: 100005,
        categoryPath: ['Sports & Outdoors', 'Sports Apparel'],
        requiredAttributes: ['Size', 'Color', 'Sport Type'],
      },
      PH: {
        categoryId: 100005,
        categoryPath: ['Sports & Outdoors', 'Sports Apparel'],
        requiredAttributes: ['Size', 'Color', 'Sport Type'],
      },
      VN: {
        categoryId: 100005,
        categoryPath: ['Thể thao & Du lịch', 'Trang phục thể thao'],
        requiredAttributes: ['Size', 'Color', 'Sport Type'],
      },
      ID: {
        categoryId: 100005,
        categoryPath: ['Olahraga & Outdoor', 'Pakaian Olahraga'],
        requiredAttributes: ['Size', 'Color', 'Sport Type'],
      },
      BR: {
        categoryId: 100005,
        categoryPath: ['Esportes', 'Roupas Esportivas'],
        requiredAttributes: ['Size', 'Color', 'Sport Type'],
      },
      MX: {
        categoryId: 100005,
        categoryPath: ['Deportes', 'Ropa Deportiva'],
        requiredAttributes: ['Size', 'Color', 'Sport Type'],
      },
    },
  },

  // おもちゃ&ホビー - Toys & Hobbies
  {
    ebayCategory: 'Toys & Hobbies',
    ebayCategoryId: '220',
    shopeeCategories: {
      TW: {
        categoryId: 100006,
        categoryPath: ['玩具', '模型玩具'],
        requiredAttributes: ['Age Range', 'Brand'],
        recommendedAttributes: ['Material', 'Safety Certification'],
      },
      TH: {
        categoryId: 100006,
        categoryPath: ['ของเล่น', 'โมเดลและฟิกเกอร์'],
        requiredAttributes: ['Age Range', 'Brand'],
      },
      SG: {
        categoryId: 100006,
        categoryPath: ['Toys & Games', 'Action Figures & Collectibles'],
        requiredAttributes: ['Age Range', 'Brand'],
      },
      MY: {
        categoryId: 100006,
        categoryPath: ['Toys & Games', 'Action Figures & Collectibles'],
        requiredAttributes: ['Age Range', 'Brand'],
      },
      PH: {
        categoryId: 100006,
        categoryPath: ['Toys & Games', 'Action Figures & Collectibles'],
        requiredAttributes: ['Age Range', 'Brand'],
      },
      VN: {
        categoryId: 100006,
        categoryPath: ['Đồ chơi', 'Mô hình & Figure'],
        requiredAttributes: ['Age Range', 'Brand'],
      },
      ID: {
        categoryId: 100006,
        categoryPath: ['Mainan & Hobi', 'Mainan Model'],
        requiredAttributes: ['Age Range', 'Brand'],
      },
      BR: {
        categoryId: 100006,
        categoryPath: ['Brinquedos', 'Modelos e Miniaturas'],
        requiredAttributes: ['Age Range', 'Brand'],
      },
      MX: {
        categoryId: 100006,
        categoryPath: ['Juguetes', 'Modelos y Miniaturas'],
        requiredAttributes: ['Age Range', 'Brand'],
      },
    },
  },
];

/**
 * eBayカテゴリ名またはIDからShopeeカテゴリを検索
 */
export function findShopeeCategoryMapping(
  ebayCategoryNameOrId: string
): ShopeeCategoryMapping | null {
  const mapping = CATEGORY_MAPPINGS.find(
    (m) =>
      m.ebayCategory.toLowerCase().includes(ebayCategoryNameOrId.toLowerCase()) ||
      m.ebayCategoryId === ebayCategoryNameOrId
  );

  return mapping || null;
}

/**
 * 特定国のShopeeカテゴリ情報を取得
 */
export function getShopeeCategoryForCountry(
  ebayCategoryNameOrId: string,
  country: ShopeeCountryCode
):
  | {
      categoryId: number;
      categoryPath: string[];
      requiredAttributes?: string[];
      recommendedAttributes?: string[];
    }
  | null {
  const mapping = findShopeeCategoryMapping(ebayCategoryNameOrId);

  if (!mapping) {
    return null;
  }

  return mapping.shopeeCategories[country] || null;
}

/**
 * デフォルトカテゴリ (マッピングが見つからない場合)
 */
export function getDefaultShopeeCategory(country: ShopeeCountryCode): {
  categoryId: number;
  categoryPath: string[];
  requiredAttributes: string[];
} {
  const defaults: Record<
    ShopeeCountryCode,
    { categoryId: number; categoryPath: string[]; requiredAttributes: string[] }
  > = {
    TW: {
      categoryId: 100099,
      categoryPath: ['其他類別'],
      requiredAttributes: ['Brand', 'Condition'],
    },
    TH: {
      categoryId: 100099,
      categoryPath: ['หมวดหมู่อื่นๆ'],
      requiredAttributes: ['Brand', 'Condition'],
    },
    SG: {
      categoryId: 100099,
      categoryPath: ['Others'],
      requiredAttributes: ['Brand', 'Condition'],
    },
    MY: {
      categoryId: 100099,
      categoryPath: ['Others'],
      requiredAttributes: ['Brand', 'Condition'],
    },
    PH: {
      categoryId: 100099,
      categoryPath: ['Others'],
      requiredAttributes: ['Brand', 'Condition'],
    },
    VN: {
      categoryId: 100099,
      categoryPath: ['Khác'],
      requiredAttributes: ['Brand', 'Condition'],
    },
    ID: {
      categoryId: 100099,
      categoryPath: ['Lainnya'],
      requiredAttributes: ['Brand', 'Condition'],
    },
    BR: {
      categoryId: 100099,
      categoryPath: ['Outros'],
      requiredAttributes: ['Brand', 'Condition'],
    },
    MX: {
      categoryId: 100099,
      categoryPath: ['Otros'],
      requiredAttributes: ['Brand', 'Condition'],
    },
  };

  return defaults[country];
}

/**
 * Shopee必須属性の汎用マッピング
 */
export const COMMON_ATTRIBUTE_MAPPINGS: Record<string, string[]> = {
  Brand: ['Brand', 'Marca', 'ยี่ห้อ', '品牌', 'Thương hiệu', 'Merek'],
  Color: ['Color', 'Colour', 'สี', '顏色', 'Màu sắc', 'Warna', 'Cor'],
  Size: ['Size', 'ขนาด', '尺寸', 'Kích thước', 'Ukuran', 'Tamanho', 'Talla'],
  Material: ['Material', 'วัสดุ', '材質', 'Chất liệu', 'Bahan', 'Material'],
  Condition: ['Condition', 'สภาพ', '狀態', 'Tình trạng', 'Kondisi', 'Condição', 'Condición'],
};
