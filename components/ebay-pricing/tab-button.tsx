import { LucideIcon } from 'lucide-react'

interface TabButtonProps {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
  badge?: string
}

export function TabButton({ icon: Icon, label, active, onClick, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm relative ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="font-medium">{label}</span>
      {badge && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
          {badge}
        </span>
      )}
    </button>
  )
}
