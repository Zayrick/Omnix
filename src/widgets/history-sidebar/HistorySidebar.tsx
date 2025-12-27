import type { HistoryItem } from '@/app/types'

type HistorySidebarProps = {
  items: HistoryItem[]
  version?: string
}

export function HistorySidebar({ items, version = 'v1.0.0' }: HistorySidebarProps) {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {items.map((item) => (
          <button key={item.id} className="sidebar-item" type="button">
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="sidebar-version">{version}</span>
      </div>
    </aside>
  )
}
