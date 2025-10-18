'use client'

import { useState } from 'react'
import { Zap, Settings, BarChart3, Grid3x3, Calculator, FileSpreadsheet, Upload, Eye, Play, DollarSign, Database } from 'lucide-react'
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

export default function ShippingPolicyManagerPage() {
  const [activeTab, setActiveTab] = useState<'usa-cost' | 'rate-tables' | 'test' | 'preview' | 'uploader' | 'ddp-matrix' | 'distribution' | 'manual' | 'auto' | 'matrix' | 'full-matrix'>('usa-cost')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">配送ポリシー管理</h1>
          <p className="text-gray-600">eBay配送ポリシーの作成・管理・分析</p>
        </div>

        {/* タブ切り替え */}
        <Tabs 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as any)} 
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-11 max-w-full mb-6">
            <TabsTrigger value="usa-cost" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              USA料金表
            </TabsTrigger>
            <TabsTrigger value="rate-tables" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Rate Tables
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

          {/* USA DDP配送コスト表（NEW - 最初に表示） */}
          <TabsContent value="usa-cost" className="space-y-6">
            <UsaDdpCostTable />
          </TabsContent>

          {/* Rate Tables（NEW） */}
          <TabsContent value="rate-tables">
            <RateTableViewer />
          </TabsContent>

          {/* ポリシー一覧 */}
          <TabsContent value="test" className="space-y-6">
            <EbayPolicyList />
            <PolicyTestUploader />
          </TabsContent>

          {/* ポリシープレビュー */}
          <TabsContent value="preview">
            <PolicyPreview />
          </TabsContent>

          {/* eBayアップローダー */}
          <TabsContent value="uploader">
            <EbayPolicyUploader />
          </TabsContent>

          {/* USA DDPコストマトリックス（Excel風） */}
          <TabsContent value="ddp-matrix">
            <DDPCostMatrix />
          </TabsContent>

          {/* 配送ポリシー分布計画タブ */}
          <TabsContent value="distribution">
            <ShippingPolicyDistribution />
          </TabsContent>

          {/* 60重量帯マトリックス */}
          <TabsContent value="full-matrix">
            <RateTableMatrix60 />
          </TabsContent>

          {/* 手動作成タブ */}
          <TabsContent value="manual">
            <EbayStylePolicyCreator />
          </TabsContent>

          {/* 自動生成タブ */}
          <TabsContent value="auto">
            <AutoPolicyGenerator />
          </TabsContent>

          {/* 概要マトリックス表示タブ */}
          <TabsContent value="matrix">
            <PolicyMatrixViewer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
