import { useEffect, useState } from 'react';
import {
  Stack,
  Group,
  Button,
  LoadingOverlay,
  Alert,
  Container,
  Divider,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconRefresh, IconPlus, IconUpload, IconPackages } from '@tabler/icons-react';

import { inventoryService } from '../services/inventoryService';
import { useInventoryStore } from '../stores/inventoryStore';
import { InventoryStats } from './inventory/InventoryStats';
import { InventoryFilters } from './inventory/InventoryFilters';
import { InventoryGrid } from './inventory/InventoryGrid';
import { InventoryTable } from './inventory/InventoryTable';
import { ViewToggle } from './common/ViewToggle';
import { BulkActions } from './inventory/BulkActions';
import { ProductModal } from './modals/ProductModal';
import { SetProductModal } from './modals/SetProductModal';
import { CSVImportModal } from './modals/CSVImportModal';
import { ModalState } from '../types';

export function InventoryDashboard() {
  const [modalState, setModalState] = useState<ModalState>({ type: null });
  
  const {
    products,
    setProducts,
    viewMode,
    selectedProducts,
    clearSelection,
    setLoading,
    setError,
    getFilteredProducts,
  } = useInventoryStore();

  // データ取得
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['inventory'],
    queryFn: inventoryService.getProducts,
    refetchInterval: 30000, // 30秒ごとに自動更新
  });

  // データ更新
  useEffect(() => {
    if (data) {
      setProducts(data);
    }
  }, [data, setProducts]);

  // ローディング状態同期
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  // エラー状態同期
  useEffect(() => {
    if (error) {
      setError(error.message);
      notifications.show({
        title: 'データ取得エラー',
        message: error.message,
        color: 'red',
      });
    }
  }, [error, setError]);

  // フィルター済み商品取得
  const filteredProducts = getFilteredProducts();

  // リフレッシュ
  const handleRefresh = () => {
    refetch();
    notifications.show({
      title: '更新完了',
      message: 'データを最新の状態に更新しました',
      color: 'green',
    });
  };

  // モーダル操作
  const openModal = (type: ModalState['type'], data?: any) => {
    setModalState({ type, data });
  };

  const closeModal = () => {
    setModalState({ type: null });
    refetch(); // データ再取得
  };

  // CSVインポート成功時
  const handleImportSuccess = () => {
    refetch();
    closeModal();
    notifications.show({
      title: 'インポート完了',
      message: 'CSVデータの取り込みが完了しました',
      color: 'green',
    });
  };

  return (
    <Container size="xl" px="md">
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
      
      <Stack gap="lg">
        {/* エラー表示 */}
        {error && (
          <Alert color="red" title="エラーが発生しました">
            {error}
          </Alert>
        )}

        {/* 統計情報 */}
        <InventoryStats />

        <Divider />

        {/* 操作ボタン群 */}
        <Group justify="space-between">
          <Group>
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="light"
              onClick={handleRefresh}
            >
              更新
            </Button>
            
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => openModal('create')}
            >
              商品追加
            </Button>
            
            <Button
              leftSection={<IconPackages size={16} />}
              variant="light"
              color="green"
              onClick={() => openModal('set')}
            >
              セット品作成
            </Button>
            
            <Button
              leftSection={<IconUpload size={16} />}
              variant="light"
              color="orange"
              onClick={() => openModal('import')}
            >
              CSV取り込み
            </Button>
          </Group>

          {/* ビュー切り替え */}
          <ViewToggle />
        </Group>

        {/* フィルター */}
        <InventoryFilters />

        {/* バルクアクション */}
        {selectedProducts.length > 0 && (
          <BulkActions onComplete={() => {
            refetch();
            clearSelection();
          }} />
        )}

        {/* 商品一覧 */}
        {viewMode === 'card' ? (
          <InventoryGrid 
            products={filteredProducts}
            onEdit={(product) => openModal('edit', product)}
          />
        ) : (
          <InventoryTable 
            products={filteredProducts}
            onEdit={(product) => openModal('edit', product)}
          />
        )}

        {/* データが空の場合 */}
        {filteredProducts.length === 0 && !isLoading && (
          <Alert color="blue" title="商品が見つかりません">
            {products.length === 0 
              ? '商品を追加するか、CSVファイルをインポートしてください。'
              : 'フィルター条件に一致する商品がありません。条件を変更してください。'
            }
          </Alert>
        )}
      </Stack>

      {/* モーダル群 */}
      <ProductModal
        opened={modalState.type === 'create' || modalState.type === 'edit'}
        onClose={closeModal}
        product={modalState.type === 'edit' ? modalState.data : undefined}
        isEdit={modalState.type === 'edit'}
      />

      <SetProductModal
        opened={modalState.type === 'set'}
        onClose={closeModal}
        existingProducts={products.filter(p => p.product_type !== 'set')}
      />

      <CSVImportModal
        opened={modalState.type === 'import'}
        onClose={closeModal}
        onSuccess={handleImportSuccess}
      />
    </Container>
  );
}