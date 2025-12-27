import type { ComponentType } from 'react'
import type { FeatureId } from '../types'
import { LifeKLinePage } from '@/features/life-kline'

type FeatureEntry = {
  value: FeatureId
  label: string
  component: ComponentType | null
}

export const featureEntries: FeatureEntry[] = [
  { value: 'life-kline', label: '我的人生K线', component: LifeKLinePage },
  { value: 'option2', label: '选项二', component: null },
  { value: 'option3', label: '选项三', component: null },
]

export const featureSelectItems = featureEntries.map(({ value, label }) => ({
  value,
  label,
}))

export const featureComponentMap = featureEntries.reduce(
  (acc, entry) => {
    acc[entry.value] = entry.component
    return acc
  },
  {} as Record<FeatureId, ComponentType | null>
)
