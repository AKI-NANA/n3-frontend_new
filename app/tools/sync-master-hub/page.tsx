'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Shield,
  HardDrive,
  RefreshCw,
  History,
  Server,
  Sparkles
} from 'lucide-react'
import TripleAtomicBackup from './components/TripleAtomicBackup'
import TripleAtomicSync from './components/TripleAtomicSync'
import ConflictResolver from './components/ConflictResolver'

export default function SyncMasterHub() {
  const [activeTab, setActiveTab] = useState('backup')

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SyncMaster Hub</h1>
          <p className="text-muted-foreground mt-1">
            統合バックアップ＆トリプル・アトミック同期管理システム
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Server className="w-4 h-4 mr-2" />
          SDIM クライアント
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">バックアップ</span>
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">同期</span>
          </TabsTrigger>
          <TabsTrigger value="conflict" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AI競合解消</span>
          </TabsTrigger>
          <TabsTrigger value="capacity" className="flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            <span className="hidden sm:inline">容量</span>
          </TabsTrigger>
          <TabsTrigger value="snapshot" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">履歴</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backup" className="mt-6">
          <TripleAtomicBackup />
        </TabsContent>

        <TabsContent value="sync" className="mt-6">
          <TripleAtomicSync />
        </TabsContent>

        <TabsContent value="conflict" className="mt-6">
          <ConflictResolver />
        </TabsContent>

        <TabsContent value="capacity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Mac/ローカル容量監視</CardTitle>
              <CardDescription>
                ストレージ使用状況とGitリポジトリ容量を監視
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-8 text-muted-foreground">
                <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>容量監視機能は次のフェーズで実装予定です</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snapshot" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>VPSリカバリ・ステータス</CardTitle>
              <CardDescription>
                バックアップ履歴の確認とポイントインタイムリカバリ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>スナップショット管理機能は次のフェーズで実装予定です</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
