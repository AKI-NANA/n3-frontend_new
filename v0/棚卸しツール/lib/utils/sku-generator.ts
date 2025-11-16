import { v4 as uuidv4 } from "uuid"

/**
 * SKU生成関数
 * フォーマット: [PREFIX]-[DATE]-[RANDOM]
 * 例: INV-20251110-A1B2C3
 */
export function generateSKU(): string {
  const prefix = "INV"
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const random = uuidv4().slice(0, 6).toUpperCase()

  return `${prefix}-${date}-${random}`
}

/**
 * 親SKUと子SKUの関連付け
 */
export function generateVariationSKU(parentSKU: string, index: number): string {
  return `${parentSKU}-V${String(index).padStart(2, "0")}`
}
