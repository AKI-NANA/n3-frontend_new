import { useState, useEffect } from 'react';
import {
  Container,
  Group,
  Button,
  TextInput,
  Select,
  Card,
  Image,
  Text,
  Badge,
  Table,
  Checkbox,
  ActionIcon,
  Menu,
  NumberInput,
  Paper,
  Grid,
  Tabs,
  Switch,
  Stack,
  Flex,
  Box,
} from '@mantine/core';
import {
  IconSearch,
  IconEye,
  IconEdit,
  IconTrash,
  IconPlus,
  IconDownload,
  IconUpload,
  IconRefresh,
  IconFilter,
  IconTable,
  IconLayoutGrid,
  IconDots,
} from '@tabler/icons-react';

// サンプルデータ
const sampleProducts = [
  {
    id: 1,
    name: 'MEGA Pokemon Kanto Local Team 130 Pieces Building Set Ages 6+ HFG05',
    sku: 'c19xearu7w',
    type: 'stock',
    price: 40.95,
    currency: 'USD',
    stock: 1,
    condition: 'New',
    category: 'Toys & Hobbies',
    image: 'https://images.unsplash.com/photo-1558618666-fdcd5c8c4d4e?w=400&h=300&fit=crop',
    source: 'ebay1',
    status: 'Active'
  },
  {
    id: 2,
    name: 'LEGO Frozen Anna and Elsa Magic Carousel 43218 Ice Palace Toy Block Gift',
    sku: 'c1ctsgl8go',
    type: 'stock',
    price: 124.88,
    currency: 'USD',
    stock: 1,
    condition: 'New',
    category: 'Toys & Hobbies',
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=300&fit=crop',
    source: 'ebay2',
    status: 'Active'
  },
  {
    id: 3,
    name: 'TAYLOR MADE Qi35 MAX 9 Dia BL TM50 S Golf Driver Mens Right Handed',
    sku: 'c1er96ircu',
    type: 'stock',
    price: 768.00,
    currency: 'USD',
    stock: 1,
    condition: 'New',
    category: 'Sports & Outdoors',
    image: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&h=300&fit=crop',
    source: 'ebay1',
    status: 'Active'
  },
  {
    id: 4,
    name: 'TAYLOR MADE MG4 HB 60.12 NS950neo S Milled Grind Wedge Mens Golf Club',
    sku: 'c1de34qhdz',
    type: 'set',
    price: 314.80,
    currency: 'USD',
    stock: 2,
    condition: 'New',
    category: 'Sports & Outdoors',
    image: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=400&h=300&fit=crop',
    source: 'ebay2',
    status: 'Active'
  },
];

const typeLabels = {
  stock: '有在庫',
  dropship: '無在庫',
  set: 'セット品',
  hybrid: 'ハイブリッド'
};

const typeBadgeColors = {
  stock: 'blue',
  dropship: 'orange',
  set: 'green',
  hybrid: 'purple'
};

interface Product {
  id: number;
  name: string;
  sku: string;
  type: string;
  price: number;
  currency: string;
  stock: number;
  condition: string;
  category: string;
  image?: string;
  source: string;
  status: string;
}

export function InventoryDashboard() {
  const [products, setProducts] = useState<Product[]>(sampleProducts);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(sampleProducts);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState('all');

  // フィルタリング処理
  useEffect(() => {
    let filtered = products;

    // タブフィルター
    if (activeTab !== 'all') {
      filtered = filtered.filter(p => p.source === activeTab);
    }

    // 検索フィルター
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // タイプフィルター
    if (typeFilter) {
      filtered = filtered.filter(p => p.type === typeFilter);
    }

    // カテゴリフィルター
    if (categoryFilter) {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, typeFilter, categoryFilter, activeTab]);

  // 統計計算
  const stats = {
    total: filteredProducts.length,
    stock: filteredProducts.filter(p => p.type === 'stock').length,
    dropship: filteredProducts.filter(p => p.type === 'dropship').length,
    sets: filteredProducts.filter(p => p.type === 'set').length,
    totalValue: filteredProducts.reduce((sum, p) => sum + (p.price * p.stock), 0)
  };

  // 在庫数更新
  const updateStock = (productId: number, newStock: number) => {
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, stock: newStock } : p
    ));
  };

  // 選択処理
  const toggleSelection = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleAllSelection = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  // カードビューコンポーネント
  const ProductCard = ({ product }: { product: Product }) => (
    <Card 
      shadow="sm" 
      padding="sm" 
      radius="md"
      style={{ cursor: 'pointer', border: selectedProducts.includes(product.id) ? '2px solid #339af0' : undefined }}
      onClick={() => toggleSelection(product.id)}
    >
      <Card.Section>
        <Image
          src={product.image}
          height={120}
          alt={product.name}
          fallbackSrc="https://placehold.co/300x120?text=No+Image"
        />
      </Card.Section>

      <Stack gap="xs" mt="sm">
        <Group justify="space-between" align="flex-start">
          <Checkbox 
            checked={selectedProducts.includes(product.id)}
            onChange={() => toggleSelection(product.id)}
            onClick={(e) => e.stopPropagation()}
          />
          <Badge 
            color={typeBadgeColors[product.type as keyof typeof typeBadgeColors]} 
            variant="light" 
            size="xs"
          >
            {typeLabels[product.type as keyof typeof typeLabels]}
          </Badge>
        </Group>

        <Text size="sm" fw={500} lineClamp={2}>
          {product.name}
        </Text>

        <Group justify="space-between">
          <Text size="lg" fw={700} c="blue">
            ${product.price.toFixed(2)}
          </Text>
          <Text size="xs" c="dimmed">
            {product.condition}
          </Text>
        </Group>

        <Grid>
          <Grid.Col span={6}>
            <Text size="xs" c="dimmed">在庫</Text>
            <NumberInput
              value={product.stock}
              onChange={(value) => updateStock(product.id, Number(value) || 0)}
              size="xs"
              min={0}
              onClick={(e) => e.stopPropagation()}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Text size="xs" c="dimmed">SKU</Text>
            <Text size="xs" ff="monospace">{product.sku}</Text>
          </Grid.Col>
        </Grid>

        <Group justify="space-between" align="center">
          <Text size="xs" c="dimmed">{product.category}</Text>
          <Menu shadow="md" width={120}>
            <Menu.Target>
              <ActionIcon 
                variant="subtle" 
                size="sm"
                onClick={(e) => e.stopPropagation()}
              >
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconEye size={14} />}>
                詳細
              </Menu.Item>
              <Menu.Item leftSection={<IconEdit size={14} />}>
                編集
              </Menu.Item>
              <Menu.Item leftSection={<IconTrash size={14} />} color="red">
                削除
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Stack>
    </Card>
  );

  return (
    <Container size="xl" p="md">
      {/* ヘッダー統計 */}
      <Paper p="md" mb="md" radius="md">
        <Grid>
          <Grid.Col span={12}>
            <Group justify="space-between">
              <Text size="xl" fw={700}>棚卸し管理システム</Text>
              <Group gap="lg">
                <Box ta="center">
                  <Text size="lg" fw={700}>{stats.total}</Text>
                  <Text size="xs" c="dimmed">総商品</Text>
                </Box>
                <Box ta="center">
                  <Text size="lg" fw={700}>{stats.stock}</Text>
                  <Text size="xs" c="dimmed">有在庫</Text>
                </Box>
                <Box ta="center">
                  <Text size="lg" fw={700}>{stats.sets}</Text>
                  <Text size="xs" c="dimmed">セット品</Text>
                </Box>
                <Box ta="center">
                  <Text size="lg" fw={700}>${(stats.totalValue / 1000).toFixed(1)}K</Text>
                  <Text size="xs" c="dimmed">総価値</Text>
                </Box>
              </Group>
            </Group>
          </Grid.Col>
        </Grid>
      </Paper>

      {/* タブ */}
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'all')} mb="md">
        <Tabs.List>
          <Tabs.Tab value="all">全商品</Tabs.Tab>
          <Tabs.Tab value="ebay1">eBay Account 1</Tabs.Tab>
          <Tabs.Tab value="ebay2">eBay Account 2</Tabs.Tab>
          <Tabs.Tab value="mercari">メルカリ</Tabs.Tab>
          <Tabs.Tab value="inventory">実在庫のみ</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {/* フィルター & アクション */}
      <Paper p="md" mb="md" radius="md">
        <Stack gap="md">
          <Grid>
            <Grid.Col span={4}>
              <TextInput
                placeholder="商品名・SKUで検索..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={2}>
              <Select
                placeholder="商品タイプ"
                data={[
                  { value: '', label: '全て' },
                  { value: 'stock', label: '有在庫' },
                  { value: 'dropship', label: '無在庫' },
                  { value: 'set', label: 'セット品' },
                  { value: 'hybrid', label: 'ハイブリッド' }
                ]}
                value={typeFilter}
                onChange={(value) => setTypeFilter(value || '')}
              />
            </Grid.Col>
            <Grid.Col span={2}>
              <Select
                placeholder="カテゴリ"
                data={[
                  { value: '', label: '全て' },
                  { value: 'Toys & Hobbies', label: 'Toys & Hobbies' },
                  { value: 'Sports & Outdoors', label: 'Sports & Outdoors' },
                  { value: 'Electronics', label: 'Electronics' }
                ]}
                value={categoryFilter}
                onChange={(value) => setCategoryFilter(value || '')}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <Group justify="flex-end">
                <Button.Group>
                  <Button 
                    variant={viewMode === 'card' ? 'filled' : 'outline'}
                    onClick={() => setViewMode('card')}
                    leftSection={<IconLayoutGrid size={16} />}
                    size="sm"
                  >
                    カード
                  </Button>
                  <Button 
                    variant={viewMode === 'table' ? 'filled' : 'outline'}
                    onClick={() => setViewMode('table')}
                    leftSection={<IconTable size={16} />}
                    size="sm"
                  >
                    テーブル
                  </Button>
                </Button.Group>
              </Group>
            </Grid.Col>
          </Grid>

          <Group justify="space-between">
            <Group>
              <Button leftSection={<IconPlus size={16} />} size="sm">
                新規追加
              </Button>
              <Button leftSection={<IconUpload size={16} />} variant="light" size="sm">
                CSV取り込み
              </Button>
              <Button leftSection={<IconRefresh size={16} />} variant="light" size="sm">
                更新
              </Button>
            </Group>
            
            {selectedProducts.length > 0 && (
              <Group>
                <Badge>{selectedProducts.length}件選択中</Badge>
                <Button size="xs" variant="light">一括編集</Button>
                <Button size="xs" variant="light" color="red">削除</Button>
              </Group>
            )}
          </Group>
        </Stack>
      </Paper>

      {/* メインコンテンツ */}
      {viewMode === 'card' ? (
        <Grid>
          {filteredProducts.map((product) => (
            <Grid.Col key={product.id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
              <ProductCard product={product} />
            </Grid.Col>
          ))}
        </Grid>
      ) : (
        <Paper radius="md">
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={40}>
                  <Checkbox
                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                    indeterminate={selectedProducts.length > 0 && selectedProducts.length < filteredProducts.length}
                    onChange={toggleAllSelection}
                  />
                </Table.Th>
                <Table.Th w={60}>画像</Table.Th>
                <Table.Th>商品名</Table.Th>
                <Table.Th w={120}>SKU</Table.Th>
                <Table.Th w={80}>タイプ</Table.Th>
                <Table.Th w={100}>価格</Table.Th>
                <Table.Th w={80}>在庫</Table.Th>
                <Table.Th w={100}>状態</Table.Th>
                <Table.Th w={80}>操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredProducts.map((product) => (
                <Table.Tr key={product.id}>
                  <Table.Td>
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleSelection(product.id)}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Image
                      src={product.image}
                      w={40}
                      h={40}
                      radius="sm"
                      fallbackSrc="https://placehold.co/40x40?text=No"
                    />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2}>
                      {product.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" ff="monospace">
                      {product.sku}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge 
                      color={typeBadgeColors[product.type as keyof typeof typeBadgeColors]} 
                      variant="light" 
                      size="xs"
                    >
                      {typeLabels[product.type as keyof typeof typeLabels]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      ${product.price.toFixed(2)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      value={product.stock}
                      onChange={(value) => updateStock(product.id, Number(value) || 0)}
                      size="xs"
                      min={0}
                      w={60}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{product.condition}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon variant="subtle" size="sm">
                        <IconEye size={14} />
                      </ActionIcon>
                      <ActionIcon variant="subtle" size="sm">
                        <IconEdit size={14} />
                      </ActionIcon>
                      <ActionIcon variant="subtle" size="sm" color="red">
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      {filteredProducts.length === 0 && (
        <Paper p="xl" ta="center">
          <Text c="dimmed">表示する商品がありません</Text>
        </Paper>
      )}
    </Container>
  );
}