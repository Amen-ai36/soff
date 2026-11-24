// 异步加载状态与分页结果判定。依据：分析阶段 FS9-L-*、FS9-LR-03；SPEC-M9-SEARCH-UI 第 5 节。

import type { Failure } from './errors'
import { differsOnlyByPage } from './searchQuery'
import type { Page, ScholarQuery, WorkQuery } from './types'

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  status: AsyncStatus
  data: T | null
  failure: Failure | null
}

export type AsyncEvent<T> =
  | { type: 'start' }
  | { type: 'resolve'; data: T }
  | { type: 'reject'; failure: Failure }
  | { type: 'reset' }

export function initialAsyncState<T>(): AsyncState<T> {
  return { status: 'idle', data: null, failure: null }
}

export function reduceAsync<T>(state: AsyncState<T>, event: AsyncEvent<T>): AsyncState<T> {
  switch (event.type) {
    case 'start':
      // 加载时保留上一份数据，页面框架不跳动；失败信息清空。
      return { status: 'loading', data: state.data, failure: null }
    case 'resolve':
      return { status: 'success', data: event.data, failure: null }
    case 'reject':
      // 失败时丢弃旧数据，避免把过期结果当作本次结果显示。
      return { status: 'error', data: null, failure: event.failure }
    case 'reset':
      return initialAsyncState()
  }
}

export type PageOutcome = 'results' | 'empty' | 'out_of_range'

/** total=0 才是"无匹配"；total>0 而本页为空是页码越界（成员 8 提案：越界页为空列表，总数不变）。 */
export function classifyPage(page: Pick<Page<unknown>, 'items' | 'total'>): PageOutcome {
  if (page.total === 0) return 'empty'
  if (page.items.length === 0) return 'out_of_range'
  return 'results'
}

export interface SeenPage {
  query: WorkQuery | ScholarQuery
  dataVersion: string
}

/** 只翻页、而数据版本变了：翻页结果可能重复或遗漏（SPEC-M8-SEARCH 第 8 条）。 */
export function versionChangedWhilePaging(prev: SeenPage | null, next: SeenPage): boolean {
  if (prev === null) return false
  return differsOnlyByPage(prev.query, next.query) && prev.dataVersion !== next.dataVersion
}
