/**
 * 画像規格調整機能
 * 各モールの画像要件に合わせて画像を調整・バリデーション
 */

import type { Platform, ImageRequirements } from './types';
import { getPlatformConfig } from './platformConfigs';

/**
 * 画像メタデータ
 */
export interface ImageMetadata {
  url: string;
  width?: number;
  height?: number;
  fileSizeMB?: number;
  format?: string;
}

/**
 * 画像処理結果
 */
export interface ImageProcessingResult {
  originalImages: ImageMetadata[];
  processedImages: ImageMetadata[];
  warnings: string[];
  errors: string[];
  requiresResize: boolean;
  requiresFormatConversion: boolean;
}

/**
 * プラットフォームの画像要件を満たしているかチェック
 */
export function validateImages(
  images: ImageMetadata[],
  platform: Platform
): ImageProcessingResult {
  const config = getPlatformConfig(platform);
  const requirements = config.imageRequirements;
  const maxImages = config.maxImages;

  const warnings: string[] = [];
  const errors: string[] = [];
  let requiresResize = false;
  let requiresFormatConversion = false;

  // 画像枚数チェック
  if (images.length > maxImages) {
    warnings.push(
      `画像枚数が ${platform} の最大枚数（${maxImages}枚）を超えています。最初の${maxImages}枚のみが使用されます。`
    );
  }

  if (images.length === 0) {
    errors.push('画像が1枚も登録されていません。');
  }

  const processedImages: ImageMetadata[] = [];

  // 各画像をチェック
  for (let i = 0; i < Math.min(images.length, maxImages); i++) {
    const image = images[i];
    const imageWarnings = validateSingleImage(image, requirements, i + 1);

    warnings.push(...imageWarnings);

    // リサイズが必要かチェック
    if (image.width && image.height) {
      if (
        image.width < requirements.minWidth ||
        image.height < requirements.minHeight
      ) {
        requiresResize = true;
      }
      if (
        requirements.maxWidth &&
        requirements.maxHeight &&
        (image.width > requirements.maxWidth || image.height > requirements.maxHeight)
      ) {
        requiresResize = true;
      }
    }

    // フォーマット変換が必要かチェック
    if (image.format) {
      const normalizedFormat = image.format.toLowerCase().replace('.', '');
      if (!requirements.supportedFormats.includes(normalizedFormat)) {
        requiresFormatConversion = true;
      }
    }

    processedImages.push(image);
  }

  return {
    originalImages: images,
    processedImages,
    warnings,
    errors,
    requiresResize,
    requiresFormatConversion,
  };
}

/**
 * 単一画像のバリデーション
 */
function validateSingleImage(
  image: ImageMetadata,
  requirements: ImageRequirements,
  imageNumber: number
): string[] {
  const warnings: string[] = [];

  // サイズチェック
  if (image.width && image.height) {
    if (image.width < requirements.minWidth || image.height < requirements.minHeight) {
      warnings.push(
        `画像${imageNumber}: サイズが小さすぎます（${image.width}x${image.height}）。最小サイズ: ${requirements.minWidth}x${requirements.minHeight}`
      );
    }

    if (
      requirements.maxWidth &&
      requirements.maxHeight &&
      (image.width > requirements.maxWidth || image.height > requirements.maxHeight)
    ) {
      warnings.push(
        `画像${imageNumber}: サイズが大きすぎます（${image.width}x${image.height}）。最大サイズ: ${requirements.maxWidth}x${requirements.maxHeight}`
      );
    }

    // アスペクト比チェック
    if (requirements.aspectRatio) {
      const [targetWidth, targetHeight] = requirements.aspectRatio
        .split(':')
        .map(Number);
      const targetRatio = targetWidth / targetHeight;
      const actualRatio = image.width / image.height;

      if (Math.abs(actualRatio - targetRatio) > 0.1) {
        warnings.push(
          `画像${imageNumber}: アスペクト比が推奨値（${requirements.aspectRatio}）と異なります`
        );
      }
    }
  }

  // ファイルサイズチェック
  if (image.fileSizeMB && image.fileSizeMB > requirements.maxFileSizeMB) {
    warnings.push(
      `画像${imageNumber}: ファイルサイズが大きすぎます（${image.fileSizeMB}MB）。最大: ${requirements.maxFileSizeMB}MB`
    );
  }

  // フォーマットチェック
  if (image.format) {
    const normalizedFormat = image.format.toLowerCase().replace('.', '');
    if (!requirements.supportedFormats.includes(normalizedFormat)) {
      warnings.push(
        `画像${imageNumber}: フォーマット（${image.format}）がサポートされていません。サポートされているフォーマット: ${requirements.supportedFormats.join(', ')}`
      );
    }
  }

  return warnings;
}

/**
 * 画像URLリストをプラットフォームに合わせて調整
 */
export function adjustImageList(
  imageUrls: string[],
  platform: Platform
): { adjustedUrls: string[]; warnings: string[] } {
  const config = getPlatformConfig(platform);
  const maxImages = config.maxImages;
  const warnings: string[] = [];

  // 画像枚数を制限
  const adjustedUrls = imageUrls.slice(0, maxImages);

  if (imageUrls.length > maxImages) {
    warnings.push(
      `画像枚数を ${platform} の最大枚数（${maxImages}枚）に調整しました。`
    );
  }

  if (adjustedUrls.length === 0) {
    warnings.push('画像が1枚も登録されていません。');
  }

  return { adjustedUrls, warnings };
}

/**
 * 画像URLから簡易的なメタデータを取得
 * TODO: 実際の画像をダウンロードしてメタデータを取得する実装に置き換え
 */
export async function getImageMetadata(url: string): Promise<ImageMetadata> {
  // プレースホルダー実装
  // 実際にはfetchして画像を解析する必要がある
  return {
    url,
    // width: undefined,
    // height: undefined,
    // fileSizeMB: undefined,
    // format: undefined,
  };
}

/**
 * 複数の画像URLからメタデータを一括取得
 */
export async function getBatchImageMetadata(
  urls: string[]
): Promise<ImageMetadata[]> {
  const promises = urls.map((url) => getImageMetadata(url));
  return Promise.all(promises);
}

/**
 * 画像のリサイズ推奨サイズを計算
 */
export function calculateRecommendedSize(
  currentWidth: number,
  currentHeight: number,
  requirements: ImageRequirements
): { width: number; height: number } {
  const { minWidth, minHeight, maxWidth, maxHeight, aspectRatio } = requirements;

  let targetWidth = currentWidth;
  let targetHeight = currentHeight;

  // 最小サイズより小さい場合、アップスケール
  if (currentWidth < minWidth || currentHeight < minHeight) {
    const scaleW = minWidth / currentWidth;
    const scaleH = minHeight / currentHeight;
    const scale = Math.max(scaleW, scaleH);
    targetWidth = Math.round(currentWidth * scale);
    targetHeight = Math.round(currentHeight * scale);
  }

  // 最大サイズより大きい場合、ダウンスケール
  if (
    maxWidth &&
    maxHeight &&
    (targetWidth > maxWidth || targetHeight > maxHeight)
  ) {
    const scaleW = maxWidth / targetWidth;
    const scaleH = maxHeight / targetHeight;
    const scale = Math.min(scaleW, scaleH);
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  // アスペクト比の調整
  if (aspectRatio) {
    const [ratioW, ratioH] = aspectRatio.split(':').map(Number);
    const targetRatio = ratioW / ratioH;
    const currentRatio = targetWidth / targetHeight;

    if (Math.abs(currentRatio - targetRatio) > 0.1) {
      // アスペクト比を維持しながらクロップ
      if (currentRatio > targetRatio) {
        // 横長すぎる場合、幅を調整
        targetWidth = Math.round(targetHeight * targetRatio);
      } else {
        // 縦長すぎる場合、高さを調整
        targetHeight = Math.round(targetWidth / targetRatio);
      }
    }
  }

  return { width: targetWidth, height: targetHeight };
}

/**
 * プラットフォームごとの推奨画像設定を取得
 */
export function getImageRecommendations(platform: Platform): {
  recommendations: string[];
  tips: string[];
} {
  const config = getPlatformConfig(platform);
  const req = config.imageRequirements;

  const recommendations = [
    `推奨サイズ: ${req.minWidth}x${req.minHeight}px 以上`,
    `最大枚数: ${config.maxImages}枚`,
    `最大ファイルサイズ: ${req.maxFileSizeMB}MB`,
    `対応フォーマット: ${req.supportedFormats.join(', ').toUpperCase()}`,
  ];

  if (req.aspectRatio) {
    recommendations.push(`推奨アスペクト比: ${req.aspectRatio}`);
  }

  const tips: string[] = [];

  // プラットフォーム別のTips
  switch (platform) {
    case 'ebay':
      tips.push('メイン画像は白背景が推奨されます');
      tips.push('商品が画像の80%以上を占めるようにしてください');
      break;
    case 'amazon_us':
    case 'amazon_au':
    case 'amazon_jp':
      tips.push('メイン画像は純白背景（RGB 255,255,255）が必須です');
      tips.push('商品が画像の85%以上を占める必要があります');
      tips.push('テキストやロゴの追加は禁止されています');
      break;
    case 'coupang':
      tips.push('商品の全体像が見える画像を含めてください');
      tips.push('韓国語の説明画像があると効果的です');
      break;
    case 'shopee':
      tips.push('正方形（1:1）の画像が推奨されます');
      tips.push('明るく鮮明な画像が好まれます');
      break;
  }

  return { recommendations, tips };
}
