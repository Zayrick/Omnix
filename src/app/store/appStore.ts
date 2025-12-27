import { create } from 'zustand'
import { Bell, FileText, Home, Settings, Star, User } from 'lucide-react'
import type { FeatureId, HistoryItem } from '../types'

type AppState = {
  menuOpen: boolean
  selectedFeature: FeatureId
  historyItems: HistoryItem[]
  setMenuOpen: (open: boolean) => void
  toggleMenu: () => void
  setSelectedFeature: (feature: FeatureId) => void
  setHistoryItems: (items: HistoryItem[]) => void
}

const defaultHistoryItems: HistoryItem[] = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'docs', label: '文档', icon: FileText },
  { id: 'favorites', label: '收藏', icon: Star },
  { id: 'notifications', label: '通知', icon: Bell },
  { id: 'profile', label: '个人中心', icon: User },
  { id: 'settings', label: '设置', icon: Settings },
]

export const useAppStore = create<AppState>((set) => ({
  menuOpen: false,
  selectedFeature: 'life-kline',
  historyItems: defaultHistoryItems,
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen })),
  setSelectedFeature: (selectedFeature) => set({ selectedFeature }),
  setHistoryItems: (historyItems) => set({ historyItems }),
}))
