import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

type Engine = Parameters<TestBody>[0]
type On = Parameters<TestBody>[1]
type Surface = 'terminal' | 'desktop'
type Usage = { tokens?: number; window: number; percent?: number }

const HINT = '(shift+tab to cycle) · ← 2 agents'
const LONG_HINT = '(shift+tab to cycle) · esc to interrupt · ← 2 agents · ctrl+c to copy'

const answerUsage = (on: On, current: () => Usage) =>
  on('session.usage', () => ({
    value: { startedAt: 0, context: current(), rateLimits: [] },
  }))

const draw = async (
  $: Engine,
  surface: Surface,
  columns: number,
  hint = HINT,
  isFullscreen = true,
) => {
  const mounted = await $.ui.mount({
    plugin: 'slimbar',
    surface,
    component: 'PromptHint',
    props: { isDraft: false, isWorking: false, hint },
    viewport: { columns, rows: 40, isFullscreen },
  })
  const fill = await mounted.find({ type: 'Text', text: /^━+$/ })
  const track = await mounted.find({ type: 'Text', text: /^─+$/ })
  const suffix = await mounted.find({ type: 'Text', text: /%/ })
  const row = await mounted.find({ type: 'Box' })
  await mounted.unmount()

  return {
    row: row?.props,
    fillColor: fill?.props.color,
    fill: fill?.text ?? '',
    track: track?.text ?? '',
    suffix: suffix?.text ?? '',
  }
}

const colorsAt = async (
  $: Engine,
  surface: Surface,
  set: (usage: Usage) => void,
  window: number,
  tokenCounts: number[],
) => {
  const colors: Array<[number, unknown]> = []

  for (const tokens of tokenCounts) {
    set({ tokens, window, percent: Math.round((tokens * 100) / window) })
    colors.push([tokens, (await draw($, surface, 148)).fillColor])
  }

  return colors
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: drops the shortcut reminder and shortens the agents notice`, async ($, on) => {
    answerUsage(on, () => ({ tokens: 230_000, window: 1_000_000, percent: 23 }))

    const { suffix } = await draw($, surface, 100)

    expect(suffix).toBe(' 23% · 230k/1M · ← 2')
  })

  test(`${surface}: drops the agents reminder while no agent runs`, async ($, on) => {
    answerUsage(on, () => ({ tokens: 230_000, window: 1_000_000, percent: 23 }))

    const { suffix } = await draw($, surface, 100, '(shift+tab to cycle) · ← for agents')

    expect(suffix).toBe(' 23% · 230k/1M')
  })

  test(`${surface}: leaves room for the engine's notices in the classic renderer`, async ($, on) => {
    answerUsage(on, () => ({ tokens: 230_000, window: 1_000_000, percent: 23 }))

    const { fill, track, suffix } = await draw($, surface, 120, HINT, false)

    expect(fill.length + track.length + suffix.length).toBe(120 - 27 - 6 - 20)
  })

  test(`${surface}: keeps the bar on a narrow row in the classic renderer`, async ($, on) => {
    answerUsage(on, () => ({ tokens: 230_000, window: 1_000_000, percent: 23 }))

    const { fill, track, suffix } = await draw($, surface, 60, HINT, false)

    expect(suffix).toBe(' 23% · 230k/1M')
    expect(fill.length + track.length).toBe(60 - 27 - 6 - suffix.length)
    expect(fill.length + track.length).toBeGreaterThanOrEqual(10)
  })

  test(`${surface}: fills the bar in proportion, inside the row`, async ($, on) => {
    answerUsage(on, () => ({ tokens: 500_000, window: 1_000_000, percent: 50 }))

    const { fill, track, suffix } = await draw($, surface, 148)
    const width = fill.length + track.length

    expect(width + suffix.length + 27 + 6).toBe(148)
    expect(fill.length).toBe(Math.floor(width / 2))
  })

  test(`${surface}: colors a 1M window by tokens in context`, async ($, on) => {
    let usage: Usage = { window: 1_000_000 }
    answerUsage(on, () => usage)

    const colors = await colorsAt(
      $,
      surface,
      next => {
        usage = next
      },
      1_000_000,
      [149_999, 150_000, 399_999, 400_000, 967_000],
    )

    expect(colors).toEqual([
      [149_999, 'success'],
      [150_000, 'warning'],
      [399_999, 'warning'],
      [400_000, 'error'],
      [967_000, 'error'],
    ])
  })

  test(`${surface}: colors a 200k window by tokens in context`, async ($, on) => {
    let usage: Usage = { window: 200_000 }
    answerUsage(on, () => usage)

    const colors = await colorsAt(
      $,
      surface,
      next => {
        usage = next
      },
      200_000,
      [79_999, 80_000, 149_999, 150_000],
    )

    expect(colors).toEqual([
      [79_999, 'success'],
      [80_000, 'warning'],
      [149_999, 'warning'],
      [150_000, 'error'],
    ])
  })

  test(`${surface}: shows an empty bar before the first response`, async ($, on) => {
    answerUsage(on, () => ({ window: 1_000_000 }))

    const { fill, track, suffix } = await draw($, surface, 100, '? for shortcuts')

    expect(fill).toBe('')
    expect(track.length).toBeGreaterThan(0)
    expect(suffix).toBe(' 0% · 0/1M')
  })

  test(`${surface}: keeps other notices when they fit`, async ($, on) => {
    answerUsage(on, () => ({ tokens: 1_500_000, window: 2_000_000, percent: 75 }))

    const { suffix } = await draw($, surface, 120, '(shift+tab to cycle) · esc to interrupt')

    expect(suffix).toBe(' 75% · 1.5M/2M · esc to interrupt')
  })

  test(`${surface}: drops the notices that don't fit, as when text is selected`, async ($, on) => {
    answerUsage(on, () => ({ tokens: 44_000, window: 1_000_000, percent: 4 }))

    const { fill, track, suffix } = await draw($, surface, 70, LONG_HINT)

    expect(suffix).toBe(' 4% · 44k/1M · ← 2')
    expect(fill.length + track.length + suffix.length).toBe(70 - 27 - 6)
  })

  test(`${surface}: stays inside the row at every width`, async ($, on) => {
    answerUsage(on, () => ({ tokens: 372_000, window: 1_000_000, percent: 37 }))

    for (const columns of [200, 148, 120, 103, 100, 80, 70, 60, 50]) {
      const { fill, track, suffix } = await draw($, surface, columns, LONG_HINT)

      expect(fill.length + track.length + suffix.length).toBe(columns - 27 - 6)
    }
  })

  test(`${surface}: gives up the bar, and clips, when even the figures don't fit`, async ($, on) => {
    answerUsage(on, () => ({ tokens: 372_000, window: 1_000_000, percent: 37 }))

    const { fill, track, suffix, row } = await draw($, surface, 40, LONG_HINT)

    expect(fill + track).toBe('')
    expect(suffix).toBe(' 37% · 372k/1M')
    expect(row).toMatchObject({ height: 1, overflow: 'hidden', flexShrink: 1000 })
  })
}

test('redraws after a tool call and a compaction', async ($, on) => {
  let redraws = 0

  on('ui.invalidate', () => {
    redraws += 1

    return { value: undefined }
  })
  on('tool.call', () => ({ result: {} }))
  on('session.compact', () => ({ skip: 'nothing to compact' }))

  await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(redraws).toBe(1)

  await $.session.compact({
    trigger: 'manual',
    messages: [{ role: 'user', text: 'hi', toolUses: [] }],
  })
  expect(redraws).toBe(2)
})

test('a failed redraw does not stop the tool call', async ($, on) => {
  let ran = false

  on('ui.invalidate', () => {
    throw new Error('no surface')
  })
  on('tool.call', () => {
    ran = true

    return { result: {} }
  })

  await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(ran).toBe(true)
})
