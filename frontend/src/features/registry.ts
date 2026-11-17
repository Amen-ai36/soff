// 创新功能注册表（ADR-M9-04）。路由与导航只登记已启用的功能；关闭后核心页面不受影响。
// 候选功能的页面在 views/，算法在 domain/（例如 domain/collabGraph.ts），本文件只负责登记与开关。

import { inject, type InjectionKey } from 'vue'

export interface FeatureDef {
  id: string
  title: string
  /** candidate：候选，未经团队与老师确认为创新；confirmed：已确认。 */
  status: 'candidate' | 'confirmed'
  path: string
  routeName: string
  navLabel: string
}

export const FEATURES: readonly FeatureDef[] = [
  {
    id: 'collab-path',
    title: '合作路径探索',
    status: 'candidate',
    path: '/explore/collab',
    routeName: 'collab',
    navLabel: '合作路径',
  },
]

/** 未设置时启用全部登记功能；空字符串表示全部关闭；否则为逗号分隔的功能 ID。 */
export function parseFeatureFlags(raw: string | undefined, all: readonly FeatureDef[] = FEATURES): FeatureDef[] {
  if (raw === undefined) return [...all]
  const ids = new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== ''),
  )
  return all.filter((f) => ids.has(f.id))
}

export function enabledFeatures(): FeatureDef[] {
  return parseFeatureFlags(import.meta.env.VITE_FEATURES)
}

export const FEATURES_KEY: InjectionKey<FeatureDef[]> = Symbol('Features')

export function useFeatures(): FeatureDef[] {
  return inject(FEATURES_KEY, () => enabledFeatures(), true)
}

export function isFeatureEnabled(features: FeatureDef[], id: string): boolean {
  return features.some((f) => f.id === id)
}
