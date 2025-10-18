'use client'

import { useState } from 'react'
import { Zap, Settings, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EbayPolicyCreatorComplete } from '@/components/shipping-policy/EbayPolicyCreatorComplete'
import { AutoPolicyGenerator } from '@/components/shipping-policy/AutoPolicyGenerator'

export default function ShippingPolicyManagerOriginalPage() {
  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 戻るリンク */}
        <Link 
          href="/shipping-policy-manager"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          新しいバージョンに戻る
        </Link>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h2 className="font-bold text-yellow-800 mb-2">⚠️ 元のUI（バックアップ版）</h2>
          <p className="text-sm text-yellow-700">
            このページは修正前の元のUIです。新しいバージョンは <Link href="/shipping-policy-manager" className="underline">こちら</Link>
          </p>
        </div>

        {/* タブ切り替え */}
        <Tabs 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as 'manual' | 'auto')} 
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              手動作成（元のUI）
            </TabsTrigger>
            <TabsTrigger value="auto" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              自動生成
            </TabsTrigger>
          </TabsList>

          {/* 手動作成タブ（元のeBayスタイルUI） */}
          <TabsContent value="manual">
            <EbayPolicyCreatorComplete />
          </TabsContent>

          {/* 自動生成タブ */}
          <TabsContent value="auto">
            <AutoPolicyGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
