// M-AC-01：采集任务状态与可用操作（SPEC-M9-ADMIN-UI 第 3 节）。
import { describe, expect, it } from 'vitest'
import { TASK_STATUS_LABEL, canRetryTask, canStopTask } from './taskState'
import type { TaskStatus } from './types'

describe('采集任务状态（成员 7 候选状态机）', () => {
  it.each<[TaskStatus, boolean, boolean]>([
    ['PENDING', true, false],
    ['RUNNING', true, false],
    ['RETRY_WAIT', true, false],
    ['STOPPING', false, false],
    ['FAILED', false, true],
    ['SUCCEEDED', false, false],
    ['STOPPED', false, false],
  ])('%s：可停止 %s，可重试 %s', (status, stop, retry) => {
    expect(canStopTask(status)).toBe(stop)
    expect(canRetryTask(status)).toBe(retry)
    expect(TASK_STATUS_LABEL[status]).toBeTruthy()
  })
})
