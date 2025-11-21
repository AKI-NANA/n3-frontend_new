// app/communication-hub/page.tsx
// 統合コミュニケーションハブ - メインページ

"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { MessageSquare, Bell } from 'lucide-react';
import CustomerSupportTab from '@/components/communication-hub/CustomerSupportTab';
import MallNotificationsTab from '@/components/communication-hub/MallNotificationsTab';

export default function CommunicationHubPage() {
  const [activeTab, setActiveTab] = useState<'customer' | 'notifications'>('customer');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
          🚀 統合コミュニケーションハブ
        </h1>
        <p className="text-gray-600">
          多販路の顧客メッセージとモール通知を一元管理 - AIによる自動分類・自動返信
        </p>
      </div>

      {/* タブシステム */}
      <Card className="shadow-2xl">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'customer' | 'notifications')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-blue-500 to-purple-600 p-1 rounded-t-xl">
            <TabsTrigger
              value="customer"
              className="data-[state=active]:bg-white data-[state=active]:text-blue-600 text-white font-semibold py-3 rounded-lg transition-all"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              顧客対応 (Chat/Message Hub)
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-white data-[state=active]:text-purple-600 text-white font-semibold py-3 rounded-lg transition-all"
            >
              <Bell className="w-5 h-5 mr-2" />
              モール通知 (System/Alert Hub)
            </TabsTrigger>
          </TabsList>

          {/* 顧客対応タブ */}
          <TabsContent value="customer" className="p-6">
            <CustomerSupportTab />
          </TabsContent>

          {/* モール通知タブ */}
          <TabsContent value="notifications" className="p-6">
            <MallNotificationsTab />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
