import { useState } from 'react'
import { Portal } from '@ark-ui/react/portal'
import { Select, createListCollection } from '@ark-ui/react/select'
import { ChevronDownIcon, CircleChevronRight, Home, Settings, User, FileText, Star, Bell } from 'lucide-react'
import './App.css'
import LifeKLine from './pages/LifeKLine'

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState<string[]>(['life-kline'])

  const collection = createListCollection({
    items: [
      { value: 'life-kline', label: '我的人生K线' },
      { value: 'option2', label: '选项二' },
      { value: 'option3', label: '选项三' },
    ],
  })

  const menuItems = [
    { icon: Home, label: '首页', id: 'home' },
    { icon: FileText, label: '文档', id: 'docs' },
    { icon: Star, label: '收藏', id: 'favorites' },
    { icon: Bell, label: '通知', id: 'notifications' },
    { icon: User, label: '个人中心', id: 'profile' },
    { icon: Settings, label: '设置', id: 'settings' },
  ]

  return (
    <div className={`app-layout ${menuOpen ? 'menu-open' : ''}`}>
      {/* 侧边菜单 - 在页面边距之外 */}
      <aside className="sidebar">
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button key={item.id} className="sidebar-item">
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-version">v1.0.0</span>
        </div>
      </aside>

      {/* 移动端遮罩层 */}
      <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />

      <div className="page-container">
        {/* 顶部区域 */}
        <header className="header">
          {/* 菜单按钮 */}
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            <CircleChevronRight size={22} className={menuOpen ? 'menu-icon-rotated' : ''} />
          </button>

          <Select.Root 
            collection={collection} 
            defaultValue={['life-kline']}
            onValueChange={(details) => setSelectedValue(details.value)}
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

        {/* 内容区域 */}
        <main className="main-content">
          {selectedValue[0] === 'life-kline' ? (
            <LifeKLine />
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
