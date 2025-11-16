// /components/listing/ListingEditModal.tsx

import React, { useState, useEffect } from 'react';
import { ListingItem, ListingMode, ItemSpecifics } from '@/types/listing';

interface Props {
    item: ListingItem;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedItem: Partial<ListingItem>) => void;
}

const ListingEditModal: React.FC<Props> = ({ item, isOpen, onClose, onSave }) => {
    // 💡 編集対象は第3層データのみ
    const [title, setTitle] = useState(item.title);
    const [description, setDescription] = useState(item.description);
    const [mode, setMode] = useState<ListingMode>(item.listing_mode);
    const [itemSpecifics, setItemSpecifics] = useState<ItemSpecifics>({ brand_name: '', mpn: '', condition: 'New' });
    const [variations, setVariations] = useState(item.stock_details); // モックとして在庫詳細を流用

    useEffect(() => {
        // モーダルが開かれたら初期データをセット
        setTitle(item.title);
        setDescription(item.description);
        setMode(item.listing_mode);
    }, [item]);

    const handleSave = () => {
        // 1. 出品データ編集モーダル: ロジック分離
        // 💡 在庫や価格ロジックは触らず、Listing Data (第3層) のみ更新APIを呼び出す
        const updatedData = {
            title,
            description,
            listing_mode: mode,
            // ... variations, itemSpecificsなどのデータ
        };
        onSave(updatedData);
        onClose();
    };

    const handleModeSwitch = (newMode: ListingMode) => {
        setMode(newMode);
        // 💡 出品モード切替ロジック: タイトル・価格ロジックの自動切り替えAPIをキック
        console.log(`[Mode Switch] Changed to ${newMode}. Triggering Title/Price Recalculation API.`);
    };
    
    // ... (モーダルUIのレンダリング、省略) ...

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h3>出品データ編集: {item.sku}</h3>
                
                {/* 編集項目 */}
                <label>タイトル:</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} />
                
                <label>出品モード切替:</label>
                <button onClick={() => handleModeSwitch('中古優先')}>中古優先</button>
                <button onClick={() => handleModeSwitch('新品優先')}>新品優先</button>
                
                {/* 1. 出品データ編集モーダル: VERO対策 Item Specifics */}
                <h4 className="mt-4">Item Specifics</h4>
                <input placeholder="ブランド名 (VERO対策ロジックに従い自動補完)" />
                
                {/* 1. 出品データ編集モーダル: バリエーション設定 */}
                <h4 className="mt-4">バリエーション設定 (最大24枚の画像紐付け, 子SKU管理)</h4>
                <ul>
                    {variations.map((v, index) => (
                        <li key={index}>
                            {v.source}: {v.count}個 
                            {/* 💡 画像紐づけUIロジックを実装 */}
                        </li>
                    ))}
                </ul>

                <button onClick={handleSave}>保存</button>
                <button onClick={onClose}>キャンセル</button>
            </div>
        </div>
    );
};

export default ListingEditModal;