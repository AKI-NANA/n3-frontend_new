'use client';

/**
 * 出品データ編集モーダル
 *
 * - VERO対策連携
 * - バリエーションUI（画像24枚、子SKU管理）
 * - 出品モード切替トグル
 */

import { useState, useEffect } from 'react';
import type {
  ListingItem,
  ItemSpecific,
  VariationChild,
  ListingMode,
  EditListingRequest,
  ModeSwitchRequest,
} from '@/types/listing';
import type { Platform } from '@/lib/multichannel/types';

interface ListingEditModalProps {
  item: ListingItem | null;
  platform: Platform;
  accountId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function ListingEditModal({
  item,
  platform,
  accountId,
  isOpen,
  onClose,
  onSave,
}: ListingEditModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [itemSpecifics, setItemSpecifics] = useState<ItemSpecific[]>([]);
  const [variations, setVariations] = useState<VariationChild[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [listingMode, setListingMode] = useState<ListingMode>('new_priority');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // VERO対策: ブランド名自動補完
  const [veroProtectedBrand, setVeroProtectedBrand] = useState<string>('');

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      // 既存データを取得してセット（TODO: APIから取得）
      // setDescription(...);
      // setItemSpecifics(...);
      // setVariations(...);
      // setImageUrls(...);
      // setListingMode(...);
    }
  }, [item]);

  // VERO対策: ブランド名を取得
  useEffect(() => {
    if (item) {
      fetchVeroProtectedBrandName(item.sku);
    }
  }, [item]);

  const fetchVeroProtectedBrandName = async (sku: string) => {
    try {
      // TODO: 実際のVERO対策APIを呼び出し
      // const response = await fetch(`/api/vero/brand-name?sku=${sku}`);
      // const data = await response.json();
      // setVeroProtectedBrand(data.officialBrandName);

      // 仮実装
      setVeroProtectedBrand('Official Brand Name');
    } catch (err) {
      console.error('VEROブランド名取得エラー:', err);
    }
  };

  const handleSave = async () => {
    if (!item) return;

    setIsSaving(true);
    setError(null);

    try {
      const request: EditListingRequest = {
        sku: item.sku,
        platform,
        accountId,
        updates: {
          title,
          description,
          itemSpecifics,
          variations,
          imageUrls,
        },
      };

      const response = await fetch('/api/listing/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました');
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('保存エラー:', err);
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleModeSw

itch = async (newMode: ListingMode) => {
    if (!item) return;

    try {
      const request: ModeSwitchRequest = {
        sku: item.sku,
        platform,
        accountId,
        newMode,
      };

      const response = await fetch('/api/listing/mode-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'モード切替に失敗しました');
      }

      setListingMode(newMode);
      alert('モード切替が完了しました。価格再計算を開始しています。');
    } catch (err) {
      console.error('モード切替エラー:', err);
      alert(
        err instanceof Error ? err.message : 'モード切替に失敗しました'
      );
    }
  };

  const addItemSpecific = () => {
    setItemSpecifics([...itemSpecifics, { key: '', value: '' }]);
  };

  const updateItemSpecific = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...itemSpecifics];
    updated[index][field] = value;
    setItemSpecifics(updated);
  };

  const removeItemSpecific = (index: number) => {
    setItemSpecifics(itemSpecifics.filter((_, i) => i !== index));
  };

  const addVariation = () => {
    setVariations([
      ...variations,
      {
        childSku: '',
        variationName: '',
        stockQuantity: 0,
        priceJpy: 0,
        imageUrls: [],
      },
    ]);
  };

  const removeVariation = (index: number) => {
    setVariations(variations.filter((_, i) => i !== index));
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">出品データ編集</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-6">
          {/* 基本情報 */}
          <div>
            <div className="text-sm text-gray-600 mb-2">
              SKU: <span className="font-mono font-semibold">{item.sku}</span> |
              プラットフォーム: <span className="font-semibold">{platform}</span>
            </div>
          </div>

          {/* モード切替トグル */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">出品モード</h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={listingMode === 'new_priority'}
                  onChange={() => handleModeSwitch('new_priority')}
                  className="w-4 h-4"
                />
                <span>新品優先</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={listingMode === 'used_priority'}
                  onChange={() => handleModeSwitch('used_priority')}
                  className="w-4 h-4"
                />
                <span>中古優先</span>
              </label>
            </div>
          </div>

          {/* タイトル */}
          <div className="border-t pt-4">
            <label className="block text-sm font-semibold mb-2">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              maxLength={80}
            />
            <div className="text-xs text-gray-500 mt-1">
              {title.length} / 80 文字
            </div>
          </div>

          {/* 説明文 */}
          <div>
            <label className="block text-sm font-semibold mb-2">説明文</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={6}
            />
          </div>

          {/* Item Specifics（VERO対策連携） */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Item Specifics</h3>
            {veroProtectedBrand && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="text-sm font-semibold text-yellow-800">
                  VERO対策: 正式ブランド名を使用してください
                </div>
                <div className="text-sm mt-1">
                  推奨: <span className="font-mono">{veroProtectedBrand}</span>
                </div>
              </div>
            )}
            {itemSpecifics.map((spec, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="キー (例: Brand)"
                  value={spec.key}
                  onChange={(e) => updateItemSpecific(index, 'key', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  placeholder="値 (例: Nintendo)"
                  value={spec.value}
                  onChange={(e) => updateItemSpecific(index, 'value', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                />
                <button
                  onClick={() => removeItemSpecific(index)}
                  className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  削除
                </button>
              </div>
            ))}
            <button
              onClick={addItemSpecific}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              + Item Specific を追加
            </button>
          </div>

          {/* バリエーション */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">バリエーション</h3>
            {variations.map((variation, index) => (
              <div key={index} className="mb-4 p-4 border rounded bg-gray-50">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">バリエーション {index + 1}</span>
                  <button
                    onClick={() => removeVariation(index)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    削除
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="子SKU"
                    value={variation.childSku}
                    className="px-3 py-2 border rounded"
                    readOnly
                  />
                  <input
                    type="text"
                    placeholder="バリエーション名 (例: Red - Large)"
                    value={variation.variationName}
                    className="px-3 py-2 border rounded"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={addVariation}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              + バリエーションを追加
            </button>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 bg-gray-100 border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border rounded hover:bg-gray-200"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
