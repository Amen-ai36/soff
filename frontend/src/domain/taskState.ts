// 采集任务状态的显示与可用操作。依据：成员 7 collection-transitions.json v0.1（候选，未冻结）；SPEC-M9-ADMIN-UI 第 3 节。

import type { TaskStatus } from './types'

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: '待执行',
  RUNNING: '运行中',
  RETRY_WAIT: '重试等待',
  STOPPING: '安全停止中',
  FAILED: '失败',
  SUCCEEDED: '成功',
  STOPPED: '已停止',
}

/** 对应成员 7 转换 T02、T07、T11。 */
export function canStopTask(status: TaskStatus): boolean {
  return status === 'PENDING' || status === 'RUNNING' || status === 'RETRY_WAIT'
}

/** 对应成员 7 转换 T12：只有失败的任务可以人工重试。 */
export function canRetryTask(status: TaskStatus): boolean {
  return status === 'FAILED'
}
