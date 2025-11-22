// ファイル: /app/tools/autopilot/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Persona, SiteConfig, IdeaSource } from '@/types/ai'; // 定義した型をインポート
import { PlusCircle, Globe, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ※ 実際にはSupabaseとのAPI連携（lib/supabase.tsの利用）が必要です。
// ここではUIのMVPを提示します。

export default function ContentAutopilotPage() {
  const [activeTab, setActiveTab] = useState('persona');
  // 状態管理はZustandまたはTanStack Queryで行うことが推奨されますが、ここでは簡略化。

  // モックデータ (実際にはDBから取得)
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [ideas, setIdeas] = useState<IdeaSource[]>([]);

  // フォームの入力状態
  const [newPersona, setNewPersona] = useState({ name: '', style_prompt: '' });
  const [newSite, setNewSite] = useState({ name: '', domain: '', platform: 'wordpress', persona_id: '' });
  const [newIdeaUrl, setNewIdeaUrl] = useState('');


  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Content Autopilot Dashboard (CAD)</h1>
      <p className="text-gray-600">AI駆動の自動コンテンツ生成とサイト管理を一元化します。</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="persona"><Users className="h-4 w-4 mr-2" />ペルソナ管理</TabsTrigger>
          <TabsTrigger value="sites"><Globe className="h-4 w-4 mr-2" />サイト設定 (100+)</TabsTrigger>
          <TabsTrigger value="ideas"><PlusCircle className="h-4 w-4 mr-2" />アイデアソース</TabsTrigger>
        </TabsList>

        {/* 1. ペルソナ管理タブ */}
        <TabsContent value="persona">
          <Card>
            <CardHeader>
              <CardTitle>新しいペルソナの作成</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="ペルソナ名（例: ベテラン物販太郎）"
                value={newPersona.name}
                onChange={(e) => setNewPersona({ ...newPersona, name: e.target.value })}
              />
              <Textarea
                placeholder="スタイル指示プロンプト（例: 語尾は『〜だね』で、親近感のある口調で記述。専門用語を多用すること。）"
                value={newPersona.style_prompt}
                onChange={(e) => setNewPersona({ ...newPersona, style_prompt: e.target.value })}
                rows={4}
              />
              <Button onClick={() => alert('ペルソナを保存: ' + newPersona.name)}>
                ペルソナを保存
              </Button>
            </CardContent>
          </Card>
          {/* 既存のペルソナ一覧表示（今回は省略） */}
        </TabsContent>

        {/* 2. サイト設定タブ */}
        <TabsContent value="sites">
          <Card>
            <CardHeader>
              <CardTitle>新しいサイト/アカウントの登録</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="サイト名（例: 物販ブログA）" />
              <Input placeholder="ドメイン/アカウントID（例: myautopilotblog.com）" />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="wordpress">WordPress</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
              </select>
              <Input placeholder="紐づけるペルソナID（例: 1）" />
              <Input type="password" placeholder="APIキー/パスワード (暗号化されます)" />
              <Button onClick={() => alert('サイトを保存')}>
                サイトを登録
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. アイデアソースタブ */}
        <TabsContent value="ideas">
          <Card>
            <CardHeader>
              <CardTitle>参考URLの一括登録</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="参考にするURLを改行区切りで大量に入力してください。（例: https://competitorblog.com/new-post）"
                rows={8}
                value={newIdeaUrl}
                onChange={(e) => setNewIdeaUrl(e.target.value)}
              />
              <Button onClick={() => alert(`URLを${newIdeaUrl.split('\n').length}件登録`)}>
                URLをキューに登録
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
