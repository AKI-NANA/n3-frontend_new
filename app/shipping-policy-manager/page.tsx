'use client'

import { useState } from 'react'
import { Zap, Settings, BarChart3, Grid3x3, Calculator, FileSpreadsheet, Upload, Eye, Play, DollarSign, Database, Globe } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EbayStylePolicyCreator } from '@/components/shipping-policy/EbayStylePolicyCreator'
import { AutoPolicyGenerator } from '@/components/shipping-policy/AutoPolicyGenerator'
import { PolicyMatrixViewer } from '@/components/shipping-policy/PolicyMatrixViewer'
import { RateTableMatrix60 } from '@/components/shipping-policy/RateTableMatrix60'
import { ShippingPolicyDistribution } from '@/components/shipping-policy/ShippingPolicyDistribution'
import { DDPCostMatrix } from '@/components/shipping-policy/DDPCostMatrix'
import { EbayPolicyUploader } from '@/components/shipping-policy/EbayPolicyUploader'
import { PolicyPreview } from '@/components/shipping-policy/PolicyPreview'
import { PolicyTestUploader } from '@/components/shipping-policy/PolicyTestUploader'
import { EbayPolicyList } from '@/components/shipping-policy/EbayPolicyList'
import { UsaDdpCostTable } from '@/components/shipping-policy/UsaDdpCostTable'
import { RateTableViewer } from '@/components/shipping-policy/RateTableViewer'
import { UsaDdpPolicyCreator } from '@/components/shipping-policy/UsaDdpPolicyCreator'
import { ExcludedCountriesManager } from '@/components/shipping-policy/ExcludedCountriesManager'
import { ShippingPolicyTable } from '@/components/shipping-policy/ShippingPolicyTable'
import { BulkPolicyUploader } from '@/components/shipping-policy/BulkPolicyUploader'
import { PartialBulkUploader } from '@/components/shipping-policy/PartialBulkUploader'

export default function ShippingPolicyManagerPage() {
  const [activeTab, setActiveTab] = useState<'usa-cost' | 'usa-ddp-creator' | 'rate-tables' | 'excluded-countries' | 'test' | 'preview' | 'uploader' | 'ddp-matrix' | 'distribution' | 'manual' | 'auto' | 'matrix' | 'full-matrix'>('usa-cost')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">配送ポリシー管理</h1>
          <p className="text-gray-600">eBay配送ポリシーの作成・管理・分析</p>
        </div>

        <Tabs 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as any)} 
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-13 max-w-full mb-6">
            <TabsTrigger value="usa-cost" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              USA料金表
            </TabsTrigger>
            <TabsTrigger value="usa-ddp-creator" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              DDP作成
            </TabsTrigger>
            <TabsTrigger value="rate-tables" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Rate Tables
            </TabsTrigger>
            <TabsTrigger value="excluded-countries" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              除外国
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              ポリシー一覧
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              プレビュー
            </TabsTrigger>
            <TabsTrigger value="uploader" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              アップロード
            </TabsTrigger>
            <TabsTrigger value="ddp-matrix" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              DDPマトリックス
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              分布計画
            </TabsTrigger>
            <TabsTrigger value="full-matrix" className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4" />
              60重量帯
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              手動作成
            </TabsTrigger>
            <TabsTrigger value="auto" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              自動生成
            </TabsTrigger>
            <TabsTrigger value="matrix" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              概要
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usa-cost" className="space-y-6">
            <UsaDdpCostTable />
          </TabsContent>

          <TabsContent value="usa-ddp-creator">
            <UsaDdpPolicyCreator />
          </TabsContent>

          <TabsContent value="rate-tables">
            <RateTableViewer />
          </TabsContent>

          <TabsContent value="excluded-countries">
            <ExcludedCountriesManager />
          </TabsContent>

          <TabsContent value="test" className="space-y-6">
            <ShippingPolicyTable />
            <EbayPolicyList />
            <PolicyTestUploader />
          </TabsContent>

          <TabsContent value="preview">
            <PolicyPreview />
          </TabsContent>

          <TabsContent value="uploader">
            <PartialBulkUploader />
            <div className="mt-6">
              <BulkPolicyUploader />
            </div>
            <div className="mt-6">
              <EbayPolicyUploader />
            </div>
          </TabsContent>

          <TabsContent value="ddp-matrix">
            <DDPCostMatrix />
          </TabsContent>

          <TabsContent value="distribution">
            <ShippingPolicyDistribution />
          </TabsContent>

          <TabsContent value="full-matrix">
            <RateTableMatrix60 />
          </TabsContent>

          <TabsContent value="manual">
            <EbayStylePolicyCreator />
          </TabsContent>

          <TabsContent value="auto">
            <AutoPolicyGenerator />
          </TabsContent>

          <TabsContent value="matrix">
            <PolicyMatrixViewer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
