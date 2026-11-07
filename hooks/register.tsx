import type { Register } from 'claude-code'

// The engine always draws the permission mode's label before this row, and a
// mod can't replace it, so the bar leaves room for the longest one:
// "⏵⏵ bypass permissions on · ".
const MODE_LABEL_COLUMNS = 27
// Keeps the row from wrapping at the footer's edges.
const EDGE_COLUMNS = 6
// In the classic renderer, the engine's notices at the footer's right, such as
// "◐ medium · /effort" at startup, share this row and would drop to a second
// one. In fullscreen they float above the prompt, so the bar can use the room.
const NOTICE_COLUMNS = 20
const MIN_BAR_COLUMNS = 10
const FALLBACK_COLUMNS = 80
const SEPARATOR = ' · '
// If the row still comes up short (a badge at the footer's right, a wide
// character), this makes the bar and stats give way, so the engine's label
// doesn't wrap. Flex shrinking is shared in proportion to this number.
const YIELD_TO_LABEL = 1000
const REMINDERS = ['? for shortcuts', '← for agents']

// No model publishes where quality drops, so these are reference points:
// 150k is the Claude API's default compaction trigger, and the rest apply the
// "40% of the window" rule of thumb. See the README.
const bandsFor = (window: number) =>
  window > 200_000
    ? { warn: 150_000, critical: 400_000 }
    : { warn: 80_000, critical: 150_000 }

const colorFor = (tokens: number, window: number) => {
  const { warn, critical } = bandsFor(window)

  if (tokens >= critical) {
    return 'error'
  }

  return tokens >= warn ? 'warning' : 'success'
}

const formatTokens = (tokens: number) => {
  if (tokens >= 1_000_000) {
    const millions = Math.round(tokens / 100_000) / 10

    return `${millions}M`
  }

  return tokens >= 1_000 ? `${Math.round(tokens / 1_000)}k` : `${tokens}`
}

// Keeps what the engine's hint says, minus the shortcut reminders.
const noticesIn = (hint: string) =>
  hint
    .split(SEPARATOR)
    .map(part => part.replace(/\([^)]* to cycle\)/, '').trim())
    .filter(part => part !== '' && !REMINDERS.includes(part))
    .map(part => part.replace(/^(←\s*\d+) agents?$/, '$1'))

// Keeps the notices that fit, in the hint's order.
const fitting = (notices: string[], room: number) => {
  let left = room

  return notices.filter(notice => {
    const cost = SEPARATOR.length + notice.length

    if (cost > left) {
      return false
    }

    left -= cost

    return true
  })
}

export const register: Register = on => {
  on('ui.render', { component: 'PromptHint' }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const { context } = await $.session.usage()

    const tokens = context.tokens ?? 0
    const percent = Math.min(context.percent ?? 0, 100)
    const stats = ` ${percent}%${SEPARATOR}${formatTokens(tokens)}/${formatTokens(context.window)}`

    const columns = e.viewport?.columns ?? FALLBACK_COLUMNS
    const full = Math.max(columns - MODE_LABEL_COLUMNS - EDGE_COLUMNS, 0)
    // A brief second row beats a bar that's gone for good on a narrow row.
    const hasSpare = full - stats.length - MIN_BAR_COLUMNS >= NOTICE_COLUMNS
    const room = !e.viewport?.isFullscreen && hasSpare ? full - NOTICE_COLUMNS : full
    const notices = fitting(
      noticesIn(e.props.hint),
      room - stats.length - MIN_BAR_COLUMNS,
    )
    const suffix = [stats, ...notices].join(SEPARATOR)
    const width = Math.max(room - suffix.length, 0)
    const filled = Math.floor((percent * width) / 100)

    return (
      <Box height={1} overflow="hidden" flexShrink={YIELD_TO_LABEL}>
        <Text wrap="truncate" color={colorFor(tokens, context.window)}>
          {'━'.repeat(filled)}
        </Text>
        <Text wrap="truncate" dimColor>
          {'─'.repeat(width - filled)}
        </Text>
        <Text wrap="truncate" dimColor>
          {suffix}
        </Text>
      </Box>
    )
  })

  // The row only redraws by itself when the hint changes.
  // A failed redraw must never stop a tool call or a compaction.
  on('tool.call', ($, e, next) => {
    $.ui.invalidate('ui.render')

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', ($, e, next) => {
    $.ui.invalidate('ui.render')

    return next(e)
  })

  on('session.compact', async ($, e, next) => {
    const compacted = await next(e)
    $.ui.invalidate('ui.render')

    return compacted
  }).catch(($, e, next) => next(e))
}
