'use client';

/**
 * 画像選択コンポーネント
 * クリックで選択/解除、ドラッグ&ドロップで並び替え
 */

import React, { useState } from 'react';
import { Check, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductImage } from '@/types/product';

interface ImageSelectorProps {
  images: ProductImage[];
  selectedImageIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onOrderChange?: (images: ProductImage[]) => void;
  maxSelection?: number;
  mode?: 'view' | 'edit';
}

export function ImageSelector({
  images,
  selectedImageIds,
  onSelectionChange,
  onOrderChange,
  maxSelection = 15,
  mode = 'edit',
}: ImageSelectorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  /**
   * 画像選択トグル
   */
  const handleImageClick = (imageId: string) => {
    if (mode === 'view') return;

    const isSelected = selectedImageIds.includes(imageId);

    if (isSelected) {
      // 選択解除
      onSelectionChange(selectedImageIds.filter((id) => id !== imageId));
    } else {
      // 選択
      if (selectedImageIds.length >= maxSelection) {
        alert(`最大${maxSelection}枚まで選択できます`);
        return;
      }
      onSelectionChange([...selectedImageIds, imageId]);
    }
  };

  /**
   * 全選択
   */
  const handleSelectAll = () => {
    if (mode === 'view') return;

    if (selectedImageIds.length === images.length) {
      // 全解除
      onSelectionChange([]);
    } else {
      // 全選択（最大枚数まで）
      const allIds = images.slice(0, maxSelection).map((img) => img.id);
      onSelectionChange(allIds);
    }
  };

  /**
   * ドラッグ開始
   */
  const handleDragStart = (index: number) => {
    if (mode === 'view') return;
    setDraggedIndex(index);
  };

  /**
   * ドラッグオーバー
   */
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (mode === 'view' || draggedIndex === null) return;

    if (draggedIndex !== index) {
      const newImages = [...images];
      const draggedImage = newImages[draggedIndex];
      newImages.splice(draggedIndex, 1);
      newImages.splice(index, 0, draggedImage);

      // 順序を更新
      const reorderedImages = newImages.map((img, i) => ({
        ...img,
        order: i,
      }));

      if (onOrderChange) {
        onOrderChange(reorderedImages);
      }
      setDraggedIndex(index);
    }
  };

  /**
   * ドラッグ終了
   */
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const selectedCount = selectedImageIds.length;
  const allSelected = selectedCount === images.length;

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">画像選択</h3>
          <span className="text-sm text-muted-foreground">
            {selectedCount} / {maxSelection} 選択中
          </span>
        </div>

        {mode === 'edit' && (
          <button
            onClick={handleSelectAll}
            className="text-sm text-primary hover:underline"
          >
            {allSelected ? '全解除' : '全選択'}
          </button>
        )}
      </div>

      {/* 画像グリッド */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((image, index) => {
          const isSelected = selectedImageIds.includes(image.id);
          const isDragging = draggedIndex === index;

          return (
            <div
              key={image.id}
              draggable={mode === 'edit'}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => handleImageClick(image.id)}
              className={cn(
                'relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all',
                isSelected
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50',
                isDragging && 'opacity-50 scale-95',
                mode === 'view' && 'cursor-default'
              )}
            >
              {/* ドラッグハンドル */}
              {mode === 'edit' && (
                <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-background/80 rounded p-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )}

              {/* 画像 */}
              <div className="aspect-square relative">
                <img
                  src={image.thumbnail || image.url}
                  alt={image.alt || `商品画像 ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* 選択オーバーレイ */}
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                    <div className="bg-primary text-primary-foreground rounded-full p-2">
                      <Check className="h-6 w-6" />
                    </div>
                  </div>
                )}

                {/* メインバッジ */}
                {image.isMain && (
                  <div className="absolute top-2 right-2 bg-destructive text-white text-xs px-2 py-1 rounded">
                    メイン
                  </div>
                )}

                {/* 選択番号 */}
                {isSelected && (
                  <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">
                    {selectedImageIds.indexOf(image.id) + 1}
                  </div>
                )}
              </div>

              {/* ホバー効果 */}
              {mode === 'edit' && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              )}
            </div>
          );
        })}
      </div>

      {/* 画像がない場合 */}
      {images.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>画像がありません</p>
        </div>
      )}

      {/* ヘルプテキスト */}
      {mode === 'edit' && images.length > 0 && (
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• 画像をクリックして選択/解除</p>
          <p>• ドラッグ&ドロップで順序変更</p>
          <p>• 最大{maxSelection}枚まで選択可能</p>
        </div>
      )}
    </div>
  );
}
