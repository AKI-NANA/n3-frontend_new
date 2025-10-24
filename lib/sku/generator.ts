/**
 * SKU生成システム
 *
 * SKU構造: N(店舗) + H(年コード) + [36進数ID] + [チェックサム]
 *
 * 例:
 * - ID=1234, 2025年 → NH9I4
 *   - N: 店舗コード（固定）
 *   - H: 2025年のコード (2020=A, 2021=B, ..., 2025=H)
 *   - 9I: 1234を36進数に変換 (uppercase)
 *   - 4: チェックサム (1234 % 10)
 */

/**
 * 年から年コードを生成
 * 2020年=A, 2021年=B, ..., 2025年=H, ...
 */
function getYearCode(year?: number): string {
  const currentYear = year || new Date().getFullYear();
  const baseYear = 2020;
  const yearOffset = currentYear - baseYear;

  if (yearOffset < 0) {
    throw new Error(`Year ${currentYear} is before base year ${baseYear}`);
  }

  // A=0, B=1, C=2, ..., Z=25
  // AA=26, AB=27, ... (必要に応じて拡張可能)
  if (yearOffset < 26) {
    return String.fromCharCode(65 + yearOffset); // A-Z
  } else {
    // 26年以降は2文字コード（AA, AB, ...）
    const firstChar = String.fromCharCode(65 + Math.floor(yearOffset / 26) - 1);
    const secondChar = String.fromCharCode(65 + (yearOffset % 26));
    return firstChar + secondChar;
  }
}

/**
 * 数値を36進数に変換（大文字）
 */
function toBase36(num: number): string {
  return num.toString(36).toUpperCase();
}

/**
 * チェックサムを計算
 */
function calculateChecksum(id: number): string {
  return String(id % 10);
}

/**
 * SKUを生成
 * @param dbId データベースID
 * @param storeCode 店舗コード（デフォルト: "N"）
 * @param year 年（デフォルト: 現在年）
 * @returns SKU文字列
 */
export function generateSKU(
  dbId: number,
  storeCode: string = 'N',
  year?: number
): string {
  if (!dbId || dbId <= 0) {
    throw new Error('Invalid database ID');
  }

  const yearCode = getYearCode(year);
  const id36 = toBase36(dbId);
  const checksum = calculateChecksum(dbId);

  return `${storeCode}${yearCode}${id36}${checksum}`;
}

/**
 * SKUをデコード（検証用）
 * @param sku SKU文字列
 * @returns デコード結果
 */
export function decodeSKU(sku: string): {
  storeCode: string;
  yearCode: string;
  id36: string;
  id10: number;
  checksum: string;
  isValid: boolean;
} {
  if (!sku || sku.length < 4) {
    return {
      storeCode: '',
      yearCode: '',
      id36: '',
      id10: 0,
      checksum: '',
      isValid: false
    };
  }

  const storeCode = sku[0];
  const yearCode = sku[1];
  const checksum = sku[sku.length - 1];
  const id36 = sku.slice(2, -1);

  // 36進数から10進数に変換
  const id10 = parseInt(id36, 36);

  // チェックサム検証
  const expectedChecksum = calculateChecksum(id10);
  const isValid = checksum === expectedChecksum;

  return {
    storeCode,
    yearCode,
    id36,
    id10,
    checksum,
    isValid
  };
}

/**
 * SKUの有効性を検証
 */
export function validateSKU(sku: string): boolean {
  const decoded = decodeSKU(sku);
  return decoded.isValid && decoded.id10 > 0;
}

/**
 * 複数のSKUを一括生成
 */
export function generateBulkSKUs(
  startId: number,
  count: number,
  storeCode: string = 'N',
  year?: number
): Array<{ id: number; sku: string }> {
  const results: Array<{ id: number; sku: string }> = [];

  for (let i = 0; i < count; i++) {
    const id = startId + i;
    const sku = generateSKU(id, storeCode, year);
    results.push({ id, sku });
  }

  return results;
}

/**
 * SKUフォーマット例を生成
 */
export function getSKUExamples(): Array<{
  id: number;
  year: number;
  sku: string;
  breakdown: string;
}> {
  const examples = [
    { id: 1, year: 2025 },
    { id: 100, year: 2025 },
    { id: 1234, year: 2025 },
    { id: 10000, year: 2025 },
    { id: 1234, year: 2026 },
    { id: 1234, year: 2030 },
  ];

  return examples.map(({ id, year }) => {
    const sku = generateSKU(id, 'N', year);
    const decoded = decodeSKU(sku);
    const breakdown = `${decoded.storeCode}(店舗) + ${decoded.yearCode}(${year}年) + ${decoded.id36}(ID=${id}) + ${decoded.checksum}(チェック)`;

    return { id, year, sku, breakdown };
  });
}

// デフォルトエクスポート
export default {
  generateSKU,
  decodeSKU,
  validateSKU,
  generateBulkSKUs,
  getSKUExamples
};
