import { Portal } from '@ark-ui/react/portal'
import { Select, createListCollection } from '@ark-ui/react/select'
import { ChevronDownIcon, CircleChevronRight } from 'lucide-react'
import { HistorySidebar } from '@/widgets/history-sidebar'
import { featureComponentMap, featureSelectItems } from './config/features'
import { useAppStore } from './store/appStore'
import type { FeatureId } from './types'
import './App.css'

function App() {
  const menuOpen = useAppStore((state) => state.menuOpen)
  const toggleMenu = useAppStore((state) => state.toggleMenu)
  const setMenuOpen = useAppStore((state) => state.setMenuOpen)
  const selectedFeature = useAppStore((state) => state.selectedFeature)
  const setSelectedFeature = useAppStore((state) => state.setSelectedFeature)
  const historyItems = useAppStore((state) => state.historyItems)

  const collection = createListCollection({ items: featureSelectItems })
  const ActiveFeature = featureComponentMap[selectedFeature]

  return (
    <div className={`app-layout ${menuOpen ? 'menu-open' : ''}`}>
      <HistorySidebar items={historyItems} />

      <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />

      <div className="page-container">
        <header className="header">
          <button className="menu-toggle" onClick={toggleMenu}>
            <CircleChevronRight size={22} className={menuOpen ? 'menu-icon-rotated' : ''} />
          </button>

          <Select.Root
            collection={collection}
            value={[selectedFeature]}
            onValueChange={(details) => {
              const next = details.value[0] as FeatureId | undefined
              if (next) {
                setSelectedFeature(next)
              }
            }}
          >
            <Select.Control className="select-control">
              <Select.Trigger className="select-trigger">
                <Select.ValueText placeholder="请选择" />
                <Select.Indicator className="select-indicator">
                  <ChevronDownIcon size={18} />
                </Select.Indicator>
              </Select.Trigger>
            </Select.Control>
            <Portal>
              <Select.Positioner>
                <Select.Content className="select-content">
                  {collection.items.map((item) => (
                    <Select.Item key={item.value} item={item} className="select-item">
                      <Select.ItemText>{item.label}</Select.ItemText>
                      <Select.ItemIndicator className="select-item-indicator">✓</Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Portal>
            <Select.HiddenSelect />
          </Select.Root>
        </header>

        <main className="main-content">
          {ActiveFeature ? (
            <ActiveFeature />
          ) : (
            <div className="developing-placeholder">
              <span>正在开发中...</span>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
