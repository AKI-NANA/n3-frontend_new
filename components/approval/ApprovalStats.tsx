interface ApprovalStatsProps {
  stats: {
    total: number
    pending: number
    approved: number
    rejected: number
    avgScore: number
    avgPrice: number
    totalProfit: number
  }
}

export function ApprovalStats({ stats }: ApprovalStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
      <StatCard
        label="総商品数"
        value={stats.total}
        icon="fa-box"
        color="blue"
      />
      <StatCard
        label="承認待ち"
        value={stats.pending}
        icon="fa-clock"
        color="yellow"
      />
      <StatCard
        label="承認済み"
        value={stats.approved}
        icon="fa-check"
        color="green"
      />
      <StatCard
        label="否認済み"
        value={stats.rejected}
        icon="fa-times"
        color="red"
      />
      <StatCard
        label="平均スコア"
        value={`${stats.avgScore.toFixed(1)}点`}
        icon="fa-star"
        color="purple"
      />
      <StatCard
        label="平均価格"
        value={`¥${(stats.avgPrice / 1000).toFixed(0)}K`}
        icon="fa-yen-sign"
        color="indigo"
      />
      <StatCard
        label="総利益見込"
        value={`¥${(stats.totalProfit / 1000000).toFixed(1)}M`}
        icon="fa-coins"
        color="emerald"
      />
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    yellow: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    red: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
    indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-10 h-10 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center`}>
          <i className={`fas ${icon} text-lg`}></i>
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {label}
      </div>
    </div>
  )
}
