// store/mirrorSelectionStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SelectedItem {
  productId: string
  itemId: string
  title: string
  price: number
  image: string
  seller: string
  condition: string
  hasDetails: boolean
}

interface MirrorSelectionStore {
  selectedItems: Record<string, SelectedItem>
  toggleItem: (productId: string, item: SelectedItem) => void
  getSelectedByProduct: (productId: string) => string[]
  getAllSelected: () => SelectedItem[]
  getSelectedCount: () => number
  clearAll: () => void
  removeByProductId: (productId: string) => void
}

export const useMirrorSelectionStore = create<MirrorSelectionStore>()(
  persist(
    (set, get) => ({
      selectedItems: {},

      // アイテムの選択/解除（単一選択）
      toggleItem: async (productId: string, item: SelectedItem) => {
        // 🔥 単一選択に変更：その商品の他の選択を全て解除
        set((state) => {
          const newItems = { ...state.selectedItems }
          
          // 🔥 同じ商品の他の選択を削除
          Object.keys(newItems).forEach(key => {
            if (key.startsWith(`${productId}_`)) {
              delete newItems[key]
            }
          })
          
          // 🔥 新しい選択を追加
          const key = `${productId}_${item.itemId}`
          newItems[key] = item
          
          return { selectedItems: newItems }
        })

        // 🔥 選択された商品をDBに保存
        try {
          const response = await fetch(`/api/products/${productId}/sm-selected-item`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: item.itemId,
              title: item.title,
              price: item.price,
              image: item.image,
              seller: item.seller,
              condition: item.condition
            })
          })

          if (response.ok) {
            console.log('✅ SM選択商品をDBに保存しました:', item.title)
          } else {
            console.error('❌ SM選択商品の保存に失敗')
          }
        } catch (error) {
          console.error('❌ API呼び出しエラー:', error)
        }
      },

      // 特定商品の選択されたアイテムIDを取得
      getSelectedByProduct: (productId: string) => {
        const items = get().selectedItems
        return Object.entries(items)
          .filter(([key]) => key.startsWith(`${productId}_`))
          .map(([_, item]) => item.itemId)
      },

      // 全ての選択されたアイテムを取得
      getAllSelected: () => {
        return Object.values(get().selectedItems)
      },

      // 選択数を取得
      getSelectedCount: () => {
        return Object.keys(get().selectedItems).length
      },

      // 全てクリア
      clearAll: () => {
        set({ selectedItems: {} })
      },

      // 特定商品の選択をクリア
      removeByProductId: (productId: string) => {
        set((state) => {
          const newItems = { ...state.selectedItems }
          Object.keys(newItems).forEach((key) => {
            if (key.startsWith(`${productId}_`)) {
              delete newItems[key]
            }
          })
          return { selectedItems: newItems }
        })
      }
    }),
    {
      name: 'mirror-selection-storage'
    }
  )
)
