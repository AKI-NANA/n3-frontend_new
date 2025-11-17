'use client';

import { TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { ResearchStatistics } from '@/lib/research-analytics/types';

interface StatisticsCardsProps {
  statistics: ResearchStatistics;
  isLoading?: boolean;
}

export function StatisticsCards({ statistics, isLoading }: StatisticsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'リサーチ総数',
      value: statistics.total.toLocaleString(),
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Promoted（昇格済み）',
      value: statistics.promoted.toLocaleString(),
      subtitle: `成功率: ${statistics.success_rate}%`,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Rejected（却下済み）',
      value: statistics.rejected.toLocaleString(),
      subtitle: `却下率: ${statistics.rejection_rate}%`,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Pending（未処理）',
      value: statistics.pending.toLocaleString(),
      icon: Clock,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold">{card.value}</p>
              {card.subtitle && (
                <p className={`text-sm font-medium ${card.color}`}>
                  {card.subtitle}
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
