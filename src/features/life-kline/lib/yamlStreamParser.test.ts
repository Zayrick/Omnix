import { describe, expect, it } from 'vitest'
import { createYamlStreamParser } from './yamlStreamParser'

const sampleYaml = `summary: "测试"
summaryScore: 8
bazi:
  - "甲子"
chartPoints:
  - age: 1
    year: 2000
    daYun: "童限"
    ganZhi: "甲子"
    open: 10
    close: 20
    high: 30
    low: 5
    score: 15
    reason: "稳步"
`

describe('createYamlStreamParser', () => {
  it('parses partial results and chart points from a stream', () => {
    const points: Array<{ age: number; year: number }> = []
    const parser = createYamlStreamParser({
      onChartPoint: (point) => points.push({ age: point.age, year: point.year }),
    })

    parser.push(sampleYaml)
    const { result } = parser.finish()

    expect(result.summary).toBe('测试')
    expect(result.summaryScore).toBe(8)
    expect(result.bazi).toEqual(['甲子'])
    expect(points).toHaveLength(1)
    expect(points[0]).toEqual({ age: 1, year: 2000 })
  })
})
