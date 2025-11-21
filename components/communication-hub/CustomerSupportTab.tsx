// components/communication-hub/CustomerSupportTab.tsx
// 顧客対応タブ - 4列レイアウト

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Send,
  Bot,
  Clock,
  CheckCircle,
  AlertCircle,
  Languages,
  History,
  FileText,
} from 'lucide-react';
import type { UnifiedMessage, SourceMall } from '@/types/messaging';

export default function CustomerSupportTab() {
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<UnifiedMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMall, setSelectedMall] = useState<SourceMall | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // メッセージ一覧を取得
  useEffect(() => {
    fetchMessages();
  }, [selectedMall]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        is_customer_message: 'true',
      });

      if (selectedMall !== 'all') {
        params.append('source_malls', selectedMall);
      }

      const response = await fetch(`/api/messaging/inbox?${params}`);
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('メッセージ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // AI自動返信を生成
  const generateAutoReply = async () => {
    if (!selectedMessage) return;

    try {
      setLoading(true);
      const response = await fetch('/api/messaging/reply-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: selectedMessage }),
      });

      const data = await response.json();

      if (data.success) {
        setReplyText(data.suggested_reply);
      }
    } catch (error) {
      console.error('自動返信生成エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 返信を送信して完了
  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    try {
      setLoading(true);

      // ステータスを完了に更新
      const response = await fetch('/api/messaging/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: selectedMessage.message_id,
          staff_id: 'current-user', // 💡 実際のユーザーIDに置き換え
          action: 'complete',
        }),
      });

      if (response.ok) {
        alert('返信を送信し、メッセージを完了としてマークしました');
        setReplyText('');
        setSelectedMessage(null);
        fetchMessages(); // リストを更新
      }
    } catch (error) {
      console.error('返信送信エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // メッセージをフィルタリング
  const filteredMessages = messages.filter((msg) =>
    msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 緊急度に応じたバッジカラー
  const getUrgencyColor = (urgency: string) => {
    if (urgency.includes('赤')) return 'bg-red-600 text-white';
    if (urgency.includes('黄')) return 'bg-yellow-500 text-black';
    return 'bg-gray-400 text-white';
  };

  // ステータスアイコン
  const getStatusIcon = (status: string) => {
    if (status === 'Completed') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'Pending') return <Clock className="w-4 h-4 text-yellow-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-300px)]">
      {/* 1列目: フォルダ/フィルター */}
      <div className="col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">モール選択</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedMall} onValueChange={(value) => setSelectedMall(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="モールを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全モール</SelectItem>
                <SelectItem value="eBay_US">eBay US</SelectItem>
                <SelectItem value="Amazon_JP">Amazon JP</SelectItem>
                <SelectItem value="Shopee_TW">Shopee TW</SelectItem>
                <SelectItem value="Qoo10_JP">Qoo10 JP</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">ステータス</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>未対応</span>
              <Badge variant="destructive">{messages.filter(m => m.reply_status === 'Unanswered').length}</Badge>
            </div>
            <div className="flex justify-between">
              <span>対応中</span>
              <Badge variant="secondary">{messages.filter(m => m.reply_status === 'Pending').length}</Badge>
            </div>
            <div className="flex justify-between">
              <span>完了</span>
              <Badge variant="outline">{messages.filter(m => m.reply_status === 'Completed').length}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2列目: メッセージリスト */}
      <div className="col-span-3 overflow-y-auto border-r bg-white rounded-lg">
        <div className="sticky top-0 bg-white p-4 border-b z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="メッセージを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="divide-y">
          {filteredMessages.map((message) => (
            <div
              key={message.message_id}
              onClick={() => setSelectedMessage(message)}
              className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${
                selectedMessage?.message_id === message.message_id ? 'bg-blue-100' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(message.reply_status)}
                  <Badge variant="outline" className="text-xs">
                    {message.source_mall}
                  </Badge>
                </div>
                <Badge className={`text-xs ${getUrgencyColor(message.ai_urgency)}`}>
                  {message.ai_urgency}
                </Badge>
              </div>

              <h4 className="font-semibold text-sm mb-1 truncate">{message.subject}</h4>
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">{message.body}</p>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{message.sender_name || message.sender_id}</span>
                <span>{new Date(message.received_at).toLocaleDateString('ja-JP')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3列目: チャットパネル */}
      <div className="col-span-4 flex flex-col bg-white rounded-lg">
        {selectedMessage ? (
          <>
            {/* メッセージヘッダー */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">{selectedMessage.subject}</h3>
                <Badge className={getUrgencyColor(selectedMessage.ai_urgency)}>
                  {selectedMessage.ai_urgency}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>From: {selectedMessage.sender_name || selectedMessage.sender_id}</span>
                <span>|</span>
                <span>{selectedMessage.source_mall}</span>
                <span>|</span>
                <span>{new Date(selectedMessage.received_at).toLocaleString('ja-JP')}</span>
              </div>
            </div>

            {/* メッセージ本文 */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <Card>
                <CardContent className="pt-4">
                  <p className="whitespace-pre-wrap">{selectedMessage.body}</p>
                </CardContent>
              </Card>

              {/* AI分類情報 */}
              <Card className="mt-4 border-blue-200 bg-blue-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    AI分類情報
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-semibold">意図:</span> {selectedMessage.ai_intent}
                    </div>
                    <div>
                      <span className="font-semibold">信頼度:</span>{' '}
                      {((selectedMessage.ai_confidence || 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 返信エリア */}
            <div className="p-4 border-t space-y-3">
              <div className="flex gap-2">
                <Button
                  onClick={generateAutoReply}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  AI自動返信
                </Button>
                <Button variant="outline" size="sm">
                  <Languages className="w-4 h-4 mr-2" />
                  翻訳
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  テンプレート
                </Button>
              </div>

              <Textarea
                placeholder="返信を入力してください..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={6}
                className="resize-none"
              />

              <Button
                onClick={sendReply}
                disabled={loading || !replyText.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Send className="w-4 h-4 mr-2" />
                返信を送信して完了
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>左側からメッセージを選択してください</p>
            </div>
          </div>
        )}
      </div>

      {/* 4列目: 履歴・テンプレート */}
      <div className="col-span-3 space-y-4 overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4" />
              顧客履歴
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedMessage ? (
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">顧客ID: {selectedMessage.customer_id || 'N/A'}</p>
                <p className="text-gray-600">注文ID: {selectedMessage.order_id || 'N/A'}</p>
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">過去の購入履歴</h4>
                  <p className="text-xs text-gray-500">💡 実装予定: 全モール統合の購入履歴を表示</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">メッセージを選択すると履歴が表示されます</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              推奨テンプレート
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedMessage ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 mb-2">
                  意図: {selectedMessage.ai_intent}
                </p>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  📦 配送状況確認テンプレート
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  💰 返金対応テンプレート
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  📝 商品質問テンプレート
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">メッセージを選択するとテンプレートが表示されます</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
