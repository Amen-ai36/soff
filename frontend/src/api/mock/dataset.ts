// 模拟数据集。全部为合成数据，不是真实学术记录，也不来自真实采集。
// fixtureDataset()：成员 8 合成夹具原样（member08-fixture.json，测试保证与原文件一致），用于按 SPEC 预期结果测试。
// demoDataset()：夹具 + 成员 9 补充的合成记录，只用于演示页面效果（例如合作路径需要更多节点）。

import type { LinkStatus, Ref, WorkSource, WorkType } from '../../domain/types'
import { WORK_TYPES } from '../../domain/types'
import fixture from './member08-fixture.json'

export interface MockWork {
  id: string
  title: string
  type: WorkType
  year: number | null
  keywords: string[]
  abstract: string
  institutionIds: string[]
  fieldIds: string[]
  scholarIds: string[]
  public: boolean
  venue: string | null
  source: WorkSource
  updatedAt: string | null
}

export interface MockScholar {
  id: string
  name: string
  institutionIds: string[]
  fieldIds: string[]
}

export interface MockDataset {
  dataVersion: string
  updatedAt: string | null
  works: MockWork[]
  scholars: MockScholar[]
  institutions: Ref[]
  fields: Ref[]
}

// 夹具只有 ID；以下名称仅用于界面显示，同样是合成内容。
const INSTITUTIONS: Ref[] = [
  { id: 'I01', name: '示例机构一' },
  { id: 'I02', name: '示例机构二' },
  { id: 'I03', name: '示例机构三' },
]

const FIELDS: Ref[] = [
  { id: 'F01', name: '示例领域：图计算' },
  { id: 'F02', name: '示例领域：数据平台' },
  { id: 'F03', name: '示例领域：信息检索' },
]

const FIXTURE_SOURCE: WorkSource = { name: '成员 8 合成夹具（synthetic-v1）', url: null, linkStatus: 'unknown' }

function asWorkType(value: string): WorkType {
  if (!(WORK_TYPES as readonly string[]).includes(value)) throw new Error(`夹具中出现未知成果类型：${value}`)
  return value as WorkType
}

function idsIn(works: MockWork[], scholars: MockScholar[], key: 'institutionIds' | 'fieldIds'): Set<string> {
  return new Set([...works.flatMap((w) => w[key]), ...scholars.flatMap((s) => s[key])])
}

export function fixtureDataset(): MockDataset {
  const works: MockWork[] = fixture.works.map((w) => ({
    id: w.id,
    title: w.title,
    type: asWorkType(w.type),
    year: w.year,
    keywords: [...w.keywords],
    abstract: w.abstract,
    institutionIds: [...w.institution_ids],
    fieldIds: [...w.field_ids],
    scholarIds: [...w.scholar_ids],
    public: w.public,
    venue: null,
    source: { ...FIXTURE_SOURCE },
    updatedAt: null,
  }))
  const scholars: MockScholar[] = fixture.scholars.map((s) => ({
    id: s.id,
    name: s.name,
    institutionIds: [...s.institution_ids],
    fieldIds: [...s.field_ids],
  }))
  const inst = idsIn(works, scholars, 'institutionIds')
  const fields = idsIn(works, scholars, 'fieldIds')
  return {
    dataVersion: fixture.data_version,
    updatedAt: null,
    works,
    scholars,
    institutions: INSTITUTIONS.filter((r) => inst.has(r.id)),
    fields: FIELDS.filter((r) => fields.has(r.id)),
  }
}

function demoWork(
  id: string,
  type: WorkType,
  year: number | null,
  title: string,
  institutionIds: string[],
  fieldIds: string[],
  scholarIds: string[],
  extra: { keywords?: string[]; venue?: string; linkStatus?: LinkStatus; updatedAt?: string | null; public?: boolean } = {},
): MockWork {
  const linkStatus = extra.linkStatus ?? 'ok'
  return {
    id,
    title,
    type,
    year,
    keywords: extra.keywords ?? [],
    abstract: '合成摘要，仅用于演示检索与显示规则。',
    institutionIds,
    fieldIds,
    scholarIds,
    public: extra.public ?? true,
    venue: extra.venue ?? null,
    source: {
      name: '示例来源（合成）',
      // example.org 是保留的示例域名，不指向真实记录。
      url: linkStatus === 'unknown' ? null : `https://example.org/works/${id}`,
      linkStatus,
    },
    updatedAt: extra.updatedAt === undefined ? '2026-11-02T08:00:00Z' : extra.updatedAt,
  }
}

export function demoDataset(): MockDataset {
  const base = fixtureDataset()
  const scholars: MockScholar[] = [
    ...base.scholars,
    { id: 'A04', name: '示例学者丁', institutionIds: ['I01'], fieldIds: ['F01'] },
    { id: 'A05', name: '示例学者戊', institutionIds: ['I03'], fieldIds: ['F03'] },
    { id: 'A06', name: '示例学者己', institutionIds: ['I03'], fieldIds: ['F02'] },
    { id: 'A07', name: '示例学者庚', institutionIds: ['I02'], fieldIds: ['F03'] },
    { id: 'A08', name: '示例学者辛', institutionIds: ['I03'], fieldIds: ['F03'] },
  ]
  const works: MockWork[] = [
    ...base.works,
    demoWork('W06', 'paper', 2023, '示例论文：图数据的增量索引', ['I01'], ['F01'], ['A01', 'A04'], {
      keywords: ['图数据', '索引'],
      venue: '示例期刊甲',
    }),
    demoWork('W07', 'paper', 2024, '示例论文：信息检索中的排序可解释性', ['I03'], ['F03'], ['A04', 'A05'], {
      venue: '示例会议乙',
      updatedAt: '2026-11-05T08:00:00Z',
    }),
    demoWork('W08', 'project', 2025, '示例项目：开放元数据清洗', ['I03'], ['F02'], ['A05', 'A06'], {
      linkStatus: 'broken',
      updatedAt: '2026-08-01T00:00:00Z',
    }),
    demoWork('W09', 'patent', 2022, '示例专利：同名作者区分方法', ['I03'], ['F03'], ['A06', 'A03'], {
      linkStatus: 'unknown',
      updatedAt: '2026-10-20T00:00:00Z',
    }),
    demoWork('W10', 'award', 2025, '示例获奖：数据平台建设奖', ['I02'], ['F02'], ['A03']),
    demoWork('W11', 'paper', 2025, '示例论文：检索日志分析', ['I02'], ['F03'], ['A07', 'A08'], { venue: '示例期刊甲' }),
    demoWork('W12', 'paper', null, '示例论文：年份缺失的记录', ['I03'], ['F03'], ['A08'], { updatedAt: null }),
    demoWork('W13', 'paper', 2024, 'Graph partitioning example', ['I01'], ['F01'], ['A01'], { keywords: ['graph'] }),
    demoWork('W14', 'project', 2023, '示例项目：领域分类映射', ['I02', 'I03'], ['F02', 'F03'], ['A06', 'A07']),
    demoWork('W15', 'paper', 2025, '示例论文：非公开记录（不应出现在任何公开结果中）', ['I03'], ['F03'], ['A04', 'A08'], {
      public: false,
    }),
  ]
  return {
    dataVersion: `${base.dataVersion}+m9-demo`,
    updatedAt: '2026-11-05T08:00:00Z',
    works,
    scholars,
    institutions: [...INSTITUTIONS],
    fields: [...FIELDS],
  }
}
