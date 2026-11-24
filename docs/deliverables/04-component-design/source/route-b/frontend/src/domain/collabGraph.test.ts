// T-AC-03：合作图算法 G1～G6。
import { describe, expect, it } from 'vitest'
import { buildGraph, degreeCentrality, shortestPath } from './collabGraph'
import type { CollabEdge } from './types'

const e = (a: string, b: string, workIds: string[]): CollabEdge => ({ a, b, weight: workIds.length, workIds })

describe('buildGraph', () => {
  it('G1、G2：无向、忽略自环、合并重复边并对成果去重', () => {
    const g = buildGraph([e('A', 'B', ['W1']), e('B', 'A', ['W1', 'W2']), e('C', 'C', ['W3'])])
    expect([...g.adjacency.get('A')!.get('B')!].sort()).toEqual(['W1', 'W2'])
    expect([...g.adjacency.get('B')!.get('A')!].sort()).toEqual(['W1', 'W2'])
    expect(g.adjacency.has('C')).toBe(false)
  })

  it('nodeIds 补充孤立节点', () => {
    const g = buildGraph([], ['X'])
    expect(g.adjacency.get('X')!.size).toBe(0)
  })
})

describe('shortestPath', () => {
  const graph = buildGraph([e('A', 'B', ['W1']), e('B', 'D', ['W2']), e('A', 'C', ['W3']), e('C', 'D', ['W4']), e('D', 'E', ['W5', 'W6'])], ['Z'])

  it('G3：边数最少，并列出每一步的共同成果', () => {
    const path = shortestPath(graph, 'A', 'E')!
    expect(path.nodes).toEqual(['A', 'B', 'D', 'E'])
    expect(path.steps).toEqual([
      { from: 'A', to: 'B', workIds: ['W1'], weight: 1 },
      { from: 'B', to: 'D', workIds: ['W2'], weight: 1 },
      { from: 'D', to: 'E', workIds: ['W5', 'W6'], weight: 2 },
    ])
  })

  it('G4：等长路径中按码点顺序选择，结果确定', () => {
    // A→B→D 与 A→C→D 等长，B 码点小于 C。
    expect(shortestPath(graph, 'A', 'D')!.nodes).toEqual(['A', 'B', 'D'])
    const reversed = buildGraph([e('C', 'D', ['W4']), e('A', 'C', ['W3']), e('B', 'D', ['W2']), e('A', 'B', ['W1'])])
    expect(shortestPath(reversed, 'A', 'D')!.nodes).toEqual(['A', 'B', 'D'])
  })

  it('权重不参与路径计算', () => {
    const g = buildGraph([e('A', 'B', ['1']), e('B', 'C', ['2']), e('A', 'C', ['3'])])
    expect(shortestPath(g, 'A', 'C')!.nodes).toEqual(['A', 'C'])
  })

  it('G5：起点等于终点、节点不存在、不连通', () => {
    expect(shortestPath(graph, 'A', 'A')).toEqual({ nodes: ['A'], steps: [] })
    expect(shortestPath(graph, 'A', 'Q')).toBeNull()
    expect(shortestPath(graph, 'Q', 'A')).toBeNull()
    expect(shortestPath(graph, 'A', 'Z')).toBeNull()
  })
})

describe('degreeCentrality', () => {
  it('G6：度数 ÷（n − 1），按度数降序、ID 升序', () => {
    const g = buildGraph([e('A', 'B', ['1']), e('A', 'C', ['2']), e('B', 'C', ['3']), e('C', 'D', ['4'])])
    expect(degreeCentrality(g)).toEqual([
      { id: 'C', degree: 3, centrality: 1 },
      { id: 'A', degree: 2, centrality: 2 / 3 },
      { id: 'B', degree: 2, centrality: 2 / 3 },
      { id: 'D', degree: 1, centrality: 1 / 3 },
    ])
  })

  it('单个节点为 0，空图为空', () => {
    expect(degreeCentrality(buildGraph([], ['X']))).toEqual([{ id: 'X', degree: 0, centrality: 0 }])
    expect(degreeCentrality(buildGraph([]))).toEqual([])
  })
})
