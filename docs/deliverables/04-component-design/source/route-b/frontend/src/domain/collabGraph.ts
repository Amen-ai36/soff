// 合作关系图：最短合作路径与度中心性（创新候选）。依据：SPEC-M9-STATS-COLLAB-UI 第 2.2 节 G1～G6；ADR-M9-04。

import { compareCodePoints } from './compare'
import type { CollabEdge } from './types'

export interface CollabGraph {
  /** 学者 ID → 相邻学者 ID → 共同成果 ID 集合 */
  adjacency: Map<string, Map<string, Set<string>>>
}

export interface PathStep {
  from: string
  to: string
  workIds: string[]
  weight: number
}

export interface PathResult {
  nodes: string[]
  steps: PathStep[]
}

export interface CentralityRow {
  id: string
  degree: number
  centrality: number
}

function link(adj: Map<string, Map<string, Set<string>>>, a: string, b: string, workIds: string[]): void {
  let neighbors = adj.get(a)
  if (!neighbors) {
    neighbors = new Map()
    adj.set(a, neighbors)
  }
  let works = neighbors.get(b)
  if (!works) {
    works = new Set()
    neighbors.set(b, works)
  }
  for (const w of workIds) works.add(w)
}

/** G1、G2：无向；忽略自环；同一对学者的多条边合并，共同成果取并集。nodeIds 可补充没有边的学者。 */
export function buildGraph(edges: CollabEdge[], nodeIds: string[] = []): CollabGraph {
  const adjacency = new Map<string, Map<string, Set<string>>>()
  for (const id of nodeIds) if (!adjacency.has(id)) adjacency.set(id, new Map())
  for (const e of edges) {
    if (e.a === e.b) continue
    link(adjacency, e.a, e.b, e.workIds)
    link(adjacency, e.b, e.a, e.workIds)
  }
  return { adjacency }
}

function sortedNeighbors(graph: CollabGraph, id: string): string[] {
  return [...(graph.adjacency.get(id)?.keys() ?? [])].sort(compareCodePoints)
}

function sortedWorks(graph: CollabGraph, a: string, b: string): string[] {
  return [...(graph.adjacency.get(a)?.get(b) ?? [])].sort(compareCodePoints)
}

/** G3～G5：边数最少的路径；邻居按码点升序遍历，结果确定。无路径返回 null。 */
export function shortestPath(graph: CollabGraph, from: string, to: string): PathResult | null {
  if (!graph.adjacency.has(from) || !graph.adjacency.has(to)) return null
  if (from === to) return { nodes: [from], steps: [] }

  const parent = new Map<string, string>()
  const visited = new Set([from])
  const queue = [from]
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]!
    for (const next of sortedNeighbors(graph, current)) {
      if (visited.has(next)) continue
      visited.add(next)
      parent.set(next, current)
      if (next === to) return assemble(graph, parent, from, to)
      queue.push(next)
    }
  }
  return null
}

function assemble(graph: CollabGraph, parent: Map<string, string>, from: string, to: string): PathResult {
  const nodes = [to]
  while (nodes[0] !== from) nodes.unshift(parent.get(nodes[0]!)!)
  const steps: PathStep[] = []
  for (let i = 0; i + 1 < nodes.length; i++) {
    const workIds = sortedWorks(graph, nodes[i]!, nodes[i + 1]!)
    steps.push({ from: nodes[i]!, to: nodes[i + 1]!, workIds, weight: workIds.length })
  }
  return { nodes, steps }
}

/** G6：度数 ÷（节点数 − 1）；只有一个节点时为 0。按度数降序、ID 升序。 */
export function degreeCentrality(graph: CollabGraph): CentralityRow[] {
  const n = graph.adjacency.size
  const rows = [...graph.adjacency].map(([id, neighbors]) => ({
    id,
    degree: neighbors.size,
    centrality: n <= 1 ? 0 : neighbors.size / (n - 1),
  }))
  return rows.sort((x, y) => y.degree - x.degree || compareCodePoints(x.id, y.id))
}
