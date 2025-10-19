import React, { useState, useEffect } from 'react';
import {
  ChakraProvider,
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  Switch,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Grid,
  Alert,
  AlertIcon,
  Progress,
  Divider
} from '@chakra-ui/react';

// モックデータとAPI関数
const mockProducts = [
  {
    id: '1',
    amazonAsin: 'B07XJ8C8F5',
    productName: 'Echo Dot (4th Gen) Smart speaker with Alexa',
    productNameKr: '에코 닷 (4세대) 알렉사 스마트 스피커',
    brand: 'Amazon',
    category: 'Electronics',
    amazonPrice: 49.99,
    sellingPriceKrw: 89000,
    profitMargin: 25.5,
    amazonStockStatus: 'in_stock',
    coupangListingStatus: 'draft',
    images: ['https://via.placeholder.com/100x100?text=Echo+Dot'],
    isActive: true,
    autoSync: true
  },
  {
    id: '2',
    amazonAsin: 'B08N5WRWNW',
    productName: 'Fire TV Stick 4K Max streaming device',
    productNameKr: '파이어 TV 스틱 4K 맥스 스트리밍 디바이스',
    brand: 'Amazon',
    category: 'Electronics',
    amazonPrice: 54.99,
    sellingPriceKrw: 95000,
    profitMargin: 22.8,
    amazonStockStatus: 'in_stock',
    coupangListingStatus: 'listed',
    images: ['https://via.placeholder.com/100x100?text=Fire+TV'],
    isActive: true,
    autoSync: true
  }
];

const mockOrders = [
  {
    id: '1',
    coupangOrderId: 'CO2024010001',
    productName: 'Echo Dot (4th Gen)',
    quantity: 2,
    unitPriceKrw: 89000,
    totalAmountKrw: 178000,
    orderStatus: 'received',
    coupangOrderDate: '2024-01-15T10:30:00Z',
    customerInfo: {
      name: '김철수',
      address: '서울시 강남구 테헤란로 123',
      phone: '010-1234-5678'
    }
  }
];

// 配送料計算関数
const calculateShippingCost = (weight, dimensions, destination = 'KR') => {
  // DHL Express 料金計算（簡略化）
  const baseRate = 25; // USD
  const weightRate = weight * 8.5; // kg당 $8.5
  const volumeWeight = (dimensions.length * dimensions.width * dimensions.height) / 5000;
  const chargeableWeight = Math.max(weight, volumeWeight);
  
  return Math.ceil(baseRate + (chargeableWeight * weightRate));
};

// 이益計算関数
const calculateProfit = (amazonPrice, exchangeRate = 1340, shippingCostUSD = 30) => {
  const basePrice = amazonPrice * exchangeRate;
  const shippingCostKRW = shippingCostUSD * exchangeRate;
  const subtotal = basePrice + shippingCostKRW;
  
  // Coupang 手数料 (평균 12%)
  const coupangFeeRate = 0.12;
  const withProfit = subtotal * 1.25; // 25% 이익률
  const finalPrice = withProfit / (1 - coupangFeeRate);
  const finalPriceWithVAT = finalPrice * 1.1; // VAT 10%
  
  const roundedPrice = Math.ceil(finalPriceWithVAT / 1000) * 1000;
  const actualProfit = roundedPrice - subtotal - (roundedPrice * coupangFeeRate);
  const profitMargin = (actualProfit / roundedPrice) * 100;
  
  return {
    basePrice,
    shippingCostKRW,
    subtotal,
    finalPrice: roundedPrice,
    profit: actualProfit,
    profitMargin: profitMargin.toFixed(1)
  };
};

// 韓国語 번역 함수 (모킹)
const translateToKorean = async (text) => {
  // 실제로는 Google Translate API 또는 DeepL API 사용
  const translations = {
    'Echo Dot (4th Gen) Smart speaker with Alexa': '에코 닷 (4세대) 알렉사 스마트 스피커',
    'Fire TV Stick 4K Max streaming device': '파이어 TV 스틱 4K 맥스 스트리밍 디바이스'
  };
  return translations[text] || text + ' (번역됨)';
};

// 메인 컴포넌트들
const Dashboard = ({ products, orders }) => {
  const totalProducts = products.length;
  const activeListings = products.filter(p => p.coupangListingStatus === 'listed').length;
  const monthlyOrders = orders.length;
  const monthlyRevenue = orders.reduce((sum, order) => sum + order.totalAmountKrw, 0);

  return (
    <Grid templateColumns="repeat(4, 1fr)" gap={6} mb={8}>
      <Stat>
        <StatLabel>총 상품 수</StatLabel>
        <StatNumber>{totalProducts}</StatNumber>
        <StatHelpText>등록된 상품</StatHelpText>
      </Stat>
      <Stat>
        <StatLabel>활성 출품</StatLabel>
        <StatNumber>{activeListings}</StatNumber>
        <StatHelpText>쿠팡 출품 중</StatHelpText>
      </Stat>
      <Stat>
        <StatLabel>이번 달 주문</StatLabel>
        <StatNumber>{monthlyOrders}</StatNumber>
        <StatHelpText>완료된 주문</StatHelpText>
      </Stat>
      <Stat>
        <StatLabel>이번 달 매출</StatLabel>
        <StatNumber>₩{monthlyRevenue.toLocaleString()}</StatNumber>
        <StatHelpText>총 매출액</StatHelpText>
      </Stat>
    </Grid>
  );
};

const ProductTable = ({ products, onEditProduct, onListToCoupang, onSyncPrice }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'listed': return 'green';
      case 'draft': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Box overflowX="auto">
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>상품명</Th>
            <Th>ASIN</Th>
            <Th>아마존 가격</Th>
            <Th>쿠팡 가격</Th>
            <Th>이익률</Th>
            <Th>상태</Th>
            <Th>재고</Th>
            <Th>작업</Th>
          </Tr>
        </Thead>
        <Tbody>
          {products.map((product) => (
            <Tr key={product.id}>
              <Td maxW="200px" isTruncated>{product.productName}</Td>
              <Td>{product.amazonAsin}</Td>
              <Td>${product.amazonPrice}</Td>
              <Td>₩{product.sellingPriceKrw?.toLocaleString()}</Td>
              <Td>{product.profitMargin}%</Td>
              <Td>
                <Badge colorScheme={getStatusColor(product.coupangListingStatus)}>
                  {product.coupangListingStatus}
                </Badge>
              </Td>
              <Td>
                <Badge colorScheme={product.amazonStockStatus === 'in_stock' ? 'green' : 'red'}>
                  {product.amazonStockStatus}
                </Badge>
              </Td>
              <Td>
                <VStack spacing={2} align="stretch">
                  <HStack>
                    <Button size="sm" onClick={() => onEditProduct(product)}>
                      수정
                    </Button>
                    <Button size="sm" onClick={() => onSyncPrice(product.id)}>
                      가격 동기화
                    </Button>
                  </HStack>
                  <Button
                    size="sm"
                    colorScheme="green"
                    onClick={() => onListToCoupang(product.id)}
                    isDisabled={product.coupangListingStatus === 'listed'}
                  >
                    쿠팡 출품
                  </Button>
                </VStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

const ProductEditModal = ({ isOpen, onClose, product, onSave }) => {
  const [formData, setFormData] = useState(product || {});
  const [calculatedPricing, setCalculatedPricing] = useState(null);

  useEffect(() => {
    if (product) {
      setFormData(product);
      if (product.amazonPrice) {
        const pricing = calculateProfit(product.amazonPrice);
        setCalculatedPricing(pricing);
      }
    }
  }, [product]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'amazonPrice' && value) {
      const pricing = calculateProfit(parseFloat(value));
      setCalculatedPricing(pricing);
      setFormData(prev => ({ 
        ...prev, 
        sellingPriceKrw: pricing.finalPrice,
        profitMargin: parseFloat(pricing.profitMargin)
      }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>상품 정보 수정</ModalHeader>
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>상품명</FormLabel>
              <Input
                value={formData.productName || ''}
                onChange={(e) => handleInputChange('productName', e.target.value)}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>한국어 상품명</FormLabel>
              <Input
                value={formData.productNameKr || ''}
                onChange={(e) => handleInputChange('productNameKr', e.target.value)}
                placeholder="자동 번역 또는 수동 입력"
              />
            </FormControl>

            <FormControl>
              <FormLabel>ASIN</FormLabel>
              <Input
                value={formData.amazonAsin || ''}
                onChange={(e) => handleInputChange('amazonAsin', e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>아마존 가격 ($)</FormLabel>
              <NumberInput
                value={formData.amazonPrice || ''}
                onChange={(value) => handleInputChange('amazonPrice', value)}
                precision={2}
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>

            {calculatedPricing && (
              <Box w="100%" p={4} bg="gray.50" borderRadius="md">
                <Text fontWeight="bold" mb={2}>가격 계산 결과</Text>
                <VStack align="stretch" spacing={1} fontSize="sm">
                  <HStack justify="space-between">
                    <Text>기본 가격 (환율적용):</Text>
                    <Text>₩{calculatedPricing.basePrice.toLocaleString()}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>배송비:</Text>
                    <Text>₩{calculatedPricing.shippingCostKRW.toLocaleString()}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text>소계:</Text>
                    <Text>₩{calculatedPricing.subtotal.toLocaleString()}</Text>
                  </HStack>
                  <Divider />
                  <HStack justify="space-between" fontWeight="bold">
                    <Text>최종 판매가격:</Text>
                    <Text>₩{calculatedPricing.finalPrice.toLocaleString()}</Text>
                  </HStack>
                  <HStack justify="space-between" color="green.600">
                    <Text>예상 이익:</Text>
                    <Text>₩{calculatedPricing.profit.toLocaleString()}</Text>
                  </HStack>
                  <HStack justify="space-between" color="green.600">
                    <Text>이익률:</Text>
                    <Text>{calculatedPricing.profitMargin}%</Text>
                  </HStack>
                </VStack>
              </Box>
            )}

            <FormControl>
              <FormLabel>카테고리</FormLabel>
              <Select
                value={formData.category || ''}
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                <option value="Electronics">전자제품</option>
                <option value="Home">홈 & 가든</option>
                <option value="Fashion">패션</option>
                <option value="Sports">스포츠 & 아웃도어</option>
                <option value="Books">도서</option>
              </Select>
            </FormControl>

            <HStack w="100%">
              <FormControl>
                <FormLabel>자동 동기화</FormLabel>
                <Switch
                  isChecked={formData.autoSync || false}
                  onChange={(e) => handleInputChange('autoSync', e.target.checked)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>활성화</FormLabel>
                <Switch
                  isChecked={formData.isActive !== false}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                />
              </FormControl>
            </HStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button mr={3} onClick={onClose}>
            취소
          </Button>
          <Button colorScheme="blue" onClick={() => onSave(formData)}>
            저장
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const CoupangListingModal = ({ isOpen, onClose, product, onSubmit }) => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [isListing, setIsListing] = useState(false);
  const [listingData, setListingData] = useState({
    productNameKr: product?.productNameKr || '',
    categoryId: '',
    description: '',
    images: product?.images || [],
    sellingPrice: product?.sellingPriceKrw || 0
  });

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const translatedName = await translateToKorean(product.productName);
      setListingData(prev => ({ ...prev, productNameKr: translatedName }));
    } catch (error) {
      console.error('Translation failed:', error);
    }
    setIsTranslating(false);
  };

  const handleSubmitListing = async () => {
    setIsListing(true);
    try {
      // 쿠팡 API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 2000));
      onSubmit(product.id, listingData);
      onClose();
    } catch (error) {
      console.error('Listing failed:', error);
    }
    setIsListing(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>쿠팡 출품</ModalHeader>
        <ModalBody>
          <VStack spacing={4}>
            <Alert status="info">
              <AlertIcon />
              이 상품을 쿠팡에 출품합니다. 모든 정보를 확인해 주세요.
            </Alert>

            <FormControl>
              <FormLabel>원본 상품명</FormLabel>
              <Input value={product?.productName || ''} isReadOnly bg="gray.50" />
            </FormControl>

            <FormControl>
              <FormLabel>한국어 상품명</FormLabel>
              <HStack>
                <Input
                  value={listingData.productNameKr}
                  onChange={(e) => setListingData(prev => ({ ...prev, productNameKr: e.target.value }))}
                  placeholder="한국어 상품명을 입력하세요"
                />
                <Button
                  onClick={handleTranslate}
                  isLoading={isTranslating}
                  loadingText="번역 중"
                  size="sm"
                >
                  자동 번역
                </Button>
              </HStack>
            </FormControl>

            <FormControl>
              <FormLabel>쿠팡 카테고리</FormLabel>
              <Select
                value={listingData.categoryId}
                onChange={(e) => setListingData(prev => ({ ...prev, categoryId: e.target.value }))}
              >
                <option value="">카테고리를 선택하세요</option>
                <option value="1001">가전디지털 > 음향기기</option>
                <option value="1002">가전디지털 > TV/프로젝터</option>
                <option value="1003">가전디지털 > 컴퓨터 주변기기</option>
                <option value="1004">홈 > 인테리어</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>판매 가격 (₩)</FormLabel>
              <NumberInput
                value={listingData.sellingPrice}
                onChange={(value) => setListingData(prev => ({ ...prev, sellingPrice: parseInt(value) }))}
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>

            <FormControl>
              <FormLabel>상품 설명</FormLabel>
              <Input
                value={listingData.description}
                onChange={(e) => setListingData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="상품 설명을 입력하세요"
              />
            </FormControl>

            {isListing && (
              <Box w="100%">
                <Text mb={2}>쿠팡에 출품 중...</Text>
                <Progress isIndeterminate colorScheme="green" />
              </Box>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button mr={3} onClick={onClose} isDisabled={isListing}>
            취소
          </Button>
          <Button
            colorScheme="green"
            onClick={handleSubmitListing}
            isLoading={isListing}
            loadingText="출품 중"
            isDisabled={!listingData.productNameKr || !listingData.categoryId}
          >
            쿠팡 출품하기
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const OrdersTable = ({ orders, onFulfillOrder }) => {
  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'received': return 'blue';
      case 'amazon_ordered': return 'yellow';
      case 'shipped': return 'orange';
      case 'delivered': return 'purple';
      case 'completed': return 'green';
      default: return 'gray';
    }
  };

  const getOrderStatusText = (status) => {
    switch (status) {
      case 'received': return '주문 접수';
      case 'amazon_ordered': return '아마존 주문 완료';
      case 'shipped': return '배송 중';
      case 'delivered': return '배송 완료';
      case 'completed': return '거래 완료';
      default: return status;
    }
  };

  return (
    <Box overflowX="auto">
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>주문번호</Th>
            <Th>상품명</Th>
            <Th>수량</Th>
            <Th>단가</Th>
            <Th>총액</Th>
            <Th>고객정보</Th>
            <Th>상태</Th>
            <Th>주문일</Th>
            <Th>작업</Th>
          </Tr>
        </Thead>
        <Tbody>
          {orders.map((order) => (
            <Tr key={order.id}>
              <Td>{order.coupangOrderId}</Td>
              <Td maxW="200px" isTruncated>{order.productName}</Td>
              <Td>{order.quantity}</Td>
              <Td>₩{order.unitPriceKrw.toLocaleString()}</Td>
              <Td>₩{order.totalAmountKrw.toLocaleString()}</Td>
              <Td>
                <VStack align="start" spacing={1} fontSize="sm">
                  <Text>{order.customerInfo.name}</Text>
                  <Text color="gray.600" maxW="150px" isTruncated>
                    {order.customerInfo.address}
                  </Text>
                </VStack>
              </Td>
              <Td>
                <Badge colorScheme={getOrderStatusColor(order.orderStatus)}>
                  {getOrderStatusText(order.orderStatus)}
                </Badge>
              </Td>
              <Td fontSize="sm">
                {new Date(order.coupangOrderDate).toLocaleDateString('ko-KR')}
              </Td>
              <Td>
                {order.orderStatus === 'received' && (
                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={() => onFulfillOrder(order.id)}
                  >
                    처리하기
                  </Button>
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

// 메인 앱 컴포넌트
const App = () => {
  const [products, setProducts] = useState(mockProducts);
  const [orders, setOrders] = useState(mockOrders);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isListingOpen, onOpen: onListingOpen, onClose: onListingClose } = useDisclosure();
  
  const toast = useToast();

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    onEditOpen();
  };

  const handleSaveProduct = (updatedProduct) => {
    setProducts(prev => 
      prev.map(p => p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p)
    );
    onEditClose();
    toast({
      title: '상품 정보가 업데이트되었습니다',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleListToCoupang = (productId) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product);
    onListingOpen();
  };

  const handleSubmitListing = (productId, listingData) => {
    setProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? { ...p, coupangListingStatus: 'listed', productNameKr: listingData.productNameKr }
          : p
      )
    );
    toast({
      title: '쿠팡 출품이 완료되었습니다',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleSyncPrice = (productId) => {
    // 가격 동기화 시뮬레이션
    const product = products.find(p => p.id === productId);
    if (product) {
      const pricing = calculateProfit(product.amazonPrice);
      setProducts(prev =>
        prev.map(p =>
          p.id === productId
            ? { 
                ...p, 
                sellingPriceKrw: pricing.finalPrice,
                profitMargin: parseFloat(pricing.profitMargin)
              }
            : p
        )
      );
      toast({
        title: '가격이 동기화되었습니다',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleFulfillOrder = (orderId) => {
    // 주문 처리 시뮬레이션
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId
          ? { ...order, orderStatus: 'amazon_ordered' }
          : order
      )
    );
    toast({
      title: '아마존 주문이 완료되었습니다',
      description: '배송 정보가 업데이트되면 자동으로 쿠팡에 연동됩니다',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  };

  return (
    <ChakraProvider>
      <Box maxWidth="1400px" mx="auto" p={6}>
        <VStack spacing={6} align="stretch">
          <Box>
            <Text fontSize="3xl" fontWeight="bold" color="blue.600">
              Amazon-Coupang 무재고 판매 시스템
            </Text>
            <Text color="gray.600">
              아마존 상품을 쿠팡에서 자동 판매하고 수익을 관리하세요
            </Text>
          </Box>

          <Dashboard products={products} orders={orders} />

          <Tabs index={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab>상품 관리</Tab>
              <Tab>주문 관리</Tab>
              <Tab>통계 및 분석</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="xl" fontWeight="semibold">
                      상품 목록
                    </Text>
                    <HStack>
                      <Button colorScheme="blue" size="sm">
                        + 새 상품 추가
                      </Button>
                      <Button colorScheme="green" size="sm">
                        전체 가격 동기화
                      </Button>
                    </HStack>
                  </HStack>
                  
                  <ProductTable
                    products={products}
                    onEditProduct={handleEditProduct}
                    onListToCoupang={handleListToCoupang}
                    onSyncPrice={handleSyncPrice}
                  />
                </VStack>
              </TabPanel>

              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="xl" fontWeight="semibold">
                      주문 목록
                    </Text>
                    <Button colorScheme="blue" size="sm">
                      주문 새로고침
                    </Button>
                  </HStack>
                  
                  <OrdersTable
                    orders={orders}
                    onFulfillOrder={handleFulfillOrder}
                  />
                </VStack>
              </TabPanel>

              <TabPanel>
                <VStack spacing={6} align="stretch">
                  <Text fontSize="xl" fontWeight="semibold">
                    통계 및 분석
                  </Text>
                  
                  <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                    <Box p={4} borderWidth={1} borderRadius="lg">
                      <Text fontSize="lg" fontWeight="semibold" mb={4}>
                        배송 옵션 설정
                      </Text>
                      <VStack align="stretch" spacing={3}>
                        <Text fontSize="sm" color="gray.600">
                          현재 배송 파트너: DHL Express
                        </Text>
                        <Text fontSize="sm">
                          평균 배송비: $30 (무게 1kg 기준)
                        </Text>
                        <Text fontSize="sm">
                          배송 소요 시간: 3-5 영업일
                        </Text>
                        <Button size="sm" variant="outline">
                          배송 설정 변경
                        </Button>
                      </VStack>
                    </Box>

                    <Box p={4} borderWidth={1} borderRadius="lg">
                      <Text fontSize="lg" fontWeight="semibold" mb={4}>
                        수익성 분석
                      </Text>
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between">
                          <Text fontSize="sm">평균 이익률:</Text>
                          <Text fontSize="sm" fontWeight="bold" color="green.600">
                            24.2%
                          </Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontSize="sm">월 예상 수익:</Text>
                          <Text fontSize="sm" fontWeight="bold">
                            ₩1,250,000
                          </Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontSize="sm">쿠팡 수수료:</Text>
                          <Text fontSize="sm" color="red.600">
                            -₩180,000
                          </Text>
                        </HStack>
                      </VStack>
                    </Box>
                  </Grid>

                  <Alert status="warning">
                    <AlertIcon />
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="bold">법적 준수 사항</Text>
                      <Text fontSize="sm">
                        • 한국 사업자 등록이 필요할 수 있습니다 (월 매출 기준)
                      </Text>
                      <Text fontSize="sm">
                        • VAT 10% 처리가 자동으로 계산됩니다
                      </Text>
                      <Text fontSize="sm">
                        • 제품 품질 및 A/S 책임은 판매자에게 있습니다
                      </Text>
                    </VStack>
                  </Alert>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>

        {/* 모달들 */}
        <ProductEditModal
          isOpen={isEditOpen}
          onClose={onEditClose}
          product={selectedProduct}
          onSave={handleSaveProduct}
        />

        <CoupangListingModal
          isOpen={isListingOpen}
          onClose={onListingClose}
          product={selectedProduct}
          onSubmit={handleSubmitListing}
        />
      </Box>
    </ChakraProvider>
  );
};

export default App;