// components/communication-hub/MallNotificationsTab.tsx
// モール通知タブ - AI分類とアラート管理

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  AlertTriangle,
  Calendar,
  Archive,
  Filter,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { UnifiedMessage, Urgency, SourceMall } from '@/types/messaging';

export default function MallNotificationsTab() {
  const [notifications, setNotifications] = useState<UnifiedMessage[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<UnifiedMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterUrgency, setFilterUrgency] = useState<'all' | Urgency>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 通知を取得
  useEffect(() => {
    fetchNotifications();
  }, [filterUrgency]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        is_customer_message: 'false',
      });

      if (filterUrgency !== 'all') {
        params.append('urgency', filterUrgency);
      }

      const response = await fetch(`/api/messaging/inbox?${params}`);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.messages);
      }
    } catch (error) {
      console.error('通知取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // Googleカレンダーにタスクを登録
  const registerToCalendar = async (notification: UnifiedMessage) => {
    try {
      alert(`"${notification.subject}" をGoogleカレンダーに登録します`);
      // 💡 実際のGoogle Calendar API連携
      // await fetch('/api/calendar/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     title: `[${notification.source_mall}] ${notification.subject}`,
      //     description: notification.body,
      //   }),
      // });
    } catch (error) {
      console.error('カレンダー登録エラー:', error);
    }
  };

  // AI分類を修正
  const correctClassification = async (
    notification: UnifiedMessage,
    newUrgency: Urgency
  ) => {
    try {
      const response = await fetch('/api/messaging/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'correct',
          correction: {
            original_message_id: notification.message_id,
            original_message_title: notification.subject,
            original_message_body: notification.body,
            corrected_urgency: newUrgency,
            corrected_intent: notification.ai_intent,
            corrected_by: 'current-user', // 💡 実際のユーザーIDに置き換え
            corrected_at: new Date(),
          },
        }),
      });

      if (response.ok) {
        alert('AI分類の修正を学習データとして保存しました');
        fetchNotifications();
      }
    } catch (error) {
      console.error('分類修正エラー:', error);
    }
  };

  // アーカイブ
  const archiveNotification = async (notification: UnifiedMessage) => {
    try {
      const response = await fetch('/api/messaging/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: notification.message_id,
          staff_id: 'current-user',
          action: 'archive',
        }),
      });

      if (response.ok) {
        alert('通知をアーカイブしました');
        fetchNotifications();
      }
    } catch (error) {
      console.error('アーカイブエラー:', error);
    }
  };

  // フィルタリング
  const filteredNotifications = notifications.filter((notif) =>
    notif.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notif.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 緊急度別に並び替え
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    const urgencyOrder = { '緊急対応 (赤)': 0, '標準通知 (黄)': 1, '無視/アーカイブ (灰)': 2 };
    return urgencyOrder[a.ai_urgency] - urgencyOrder[b.ai_urgency];
  });

  // 緊急度カラー
  const getUrgencyStyles = (urgency: Urgency) => {
    if (urgency.includes('赤')) {
      return {
        bg: 'bg-red-50 border-red-300',
        badge: 'bg-red-600 text-white',
        icon: 'text-red-600',
      };
    }
    if (urgency.includes('黄')) {
      return {
        bg: 'bg-yellow-50 border-yellow-300',
        badge: 'bg-yellow-500 text-black',
        icon: 'text-yellow-600',
      };
    }
    return {
      bg: 'bg-gray-50 border-gray-300',
      badge: 'bg-gray-400 text-white',
      icon: 'text-gray-600',
    };
  };

  // 統計情報
  const stats = {
    urgent: notifications.filter((n) => n.ai_urgency.includes('赤')).length,
    standard: notifications.filter((n) => n.ai_urgency.includes('黄')).length,
    ignore: notifications.filter((n) => n.ai_urgency.includes('灰')).length,
  };

  return (
    <div className="space-y-4">
      {/* 統計情報カード */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">緊急対応</p>
                <p className="text-3xl font-bold text-red-700">{stats.urgent}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700 font-medium">標準通知</p>
                <p className="text-3xl font-bold text-yellow-800">{stats.standard}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-yellow-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-300 bg-gray-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">無視/低優先度</p>
                <p className="text-3xl font-bold text-gray-700">{stats.ignore}</p>
              </div>
              <XCircle className="w-12 h-12 text-gray-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルターと検索 */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="通知を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterUrgency} onValueChange={(value) => setFilterUrgency(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="緊急度でフィルター" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ての通知</SelectItem>
                <SelectItem value="緊急対応 (赤)">緊急対応 (赤)</SelectItem>
                <SelectItem value="標準通知 (黄)">標準通知 (黄)</SelectItem>
                <SelectItem value="無視/アーカイブ (灰)">無視/アーカイブ (灰)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 通知リスト */}
      <div className="space-y-3">
        {sortedNotifications.map((notification) => {
          const styles = getUrgencyStyles(notification.ai_urgency);

          return (
            <Card
              key={notification.message_id}
              className={`border-2 ${styles.bg} hover:shadow-lg transition-shadow cursor-pointer`}
              onClick={() => setSelectedNotification(notification)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* ヘッダー */}
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className={`w-5 h-5 ${styles.icon}`} />
                      <Badge variant="outline" className="text-xs">
                        {notification.source_mall}
                      </Badge>
                      <Badge className={`text-xs ${styles.badge}`}>
                        {notification.ai_urgency}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {notification.ai_intent}
                      </Badge>
                    </div>

                    {/* 件名と本文 */}
                    <h3 className="font-bold text-lg mb-2">{notification.subject}</h3>
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {notification.body}
                    </p>

                    {/* タイムスタンプ */}
                    <p className="text-xs text-gray-500">
                      受信日時: {new Date(notification.received_at).toLocaleString('ja-JP')}
                    </p>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex flex-col gap-2 ml-4">
                    {notification.ai_urgency.includes('赤') && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          registerToCalendar(notification);
                        }}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        カレンダー登録
                      </Button>
                    )}

                    <Select
                      onValueChange={(value) =>
                        correctClassification(notification, value as Urgency)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="分類を修正" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="緊急対応 (赤)">緊急 (赤)</SelectItem>
                        <SelectItem value="標準通知 (黄)">標準 (黄)</SelectItem>
                        <SelectItem value="無視/アーカイブ (灰)">無視 (灰)</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveNotification(notification);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      アーカイブ
                    </Button>
                  </div>
                </div>

                {/* AI信頼度 */}
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                      AI信頼度: {((notification.ai_confidence || 0) * 100).toFixed(0)}%
                    </span>
                    <span className="text-xs text-gray-500">
                      💡 分類を修正すると、AIの精度が向上します
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {sortedNotifications.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>表示する通知がありません</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
