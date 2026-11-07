# Slimbar

A Claude Code mod that merges the footer into one row: a thin context bar, the tokens in use, and the footer's notices.

```
⏵⏵ bypass permissions on · ━━━━━━━━━━━━──────────────────────────── 23% · 230k/1M · ← 2
```

It replaces the footer's hint line, so `(shift+tab to cycle)` and `? for shortcuts` go away, `← 2 agents` becomes `← 2`, and other notices such as `esc to interrupt` stay when they fit.

Not affiliated with Anthropic.

## Install

At the prompt of a terminal session:

```
/plugin install slimbar --marketplace renanpallin/claude-slimbar
```

From a shell:

```
claude plugin install slimbar --marketplace renanpallin/claude-slimbar
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `renanpallin/claude-slimbar`, then Add plugin.

If you use a status line, remove the `statusLine` key from `~/.claude/settings.json`. Otherwise it keeps its own row above this one.

Tested on Claude Code 2.1.319, in the terminal. The mod API is in early access and may change between releases.

## Colors

The color follows the tokens in context, not the percentage of the window, because a 1M window and a 200k window hold very different amounts at the same percentage.

| Window | Green | Yellow: consider a new session | Red: be careful | Auto-compaction, when on |
| --- | --- | --- | --- | --- |
| 1M | under 150k | 150k to 399k | 400k or more | about 967k |
| 200k | under 80k | 80k to 149k | 150k or more | about 200k |

**These are reference points, not measurements.** Anthropic [says response quality degrades as a conversation grows](https://platform.claude.com/docs/en/build-with-claude/compaction), but no model publishes where that starts.

- 150k is the Claude API's [default compaction trigger](https://platform.claude.com/docs/en/build-with-claude/compaction-threshold).
- 400k on a 1M window and 80k on a 200k window apply the [rule of thumb of being careful past 40% of the window](https://arxiv.org/pdf/2606.27045), which is not a proven threshold.
- The auto-compaction column comes from the [Claude Code docs](https://code.claude.com/docs/en/model-config#default-auto-compact-thresholds).

Starting a new session for each new task remains [Anthropic's own advice](https://claude.com/resources/articles/using-claude-code-session-management-and-1m-context), whatever the bar shows.

## Limits

- **The permission mode label stays.** Claude Code draws `⏵⏵ bypass permissions on` by itself, in every mode, and a mod can't replace it. The bar leaves room for the longest label, so it ends a little earlier in modes with a shorter one.
- **Notices stop being clickable.** A rewritten hint line is plain text.
- **Notices that don't fit are left out.** The row never wraps because of the mod: on a short row it keeps the figures and at least 10 cells of bar, and leaves out what doesn't fit. Below about 32 columns, Claude Code's own label takes more than the row and wraps by itself.
- **The hint's wording matters.** The mod removes reminders by matching their text, so a future Claude Code release that rewords them could bring them back.

## Similar projects

Other mods also put a context bar in the footer, and may suit you better. This comparison comes from their READMEs, as of November 2026.

| Project | What it offers |
| --- | --- |
| [hamzafer/claude-code-mods](https://github.com/hamzafer/claude-code-mods) | A collection of mods, with a `context-bar` split by what fills your context |
| [Amnesiac9/claude-mods](https://github.com/Amnesiac9/claude-mods) | A `context-bar` with configurable glyphs and width, colored by percentage |
| [koprjaa/claude-code-context-bar](https://github.com/koprjaa/claude-code-context-bar) | A bar at the right end of the footer, with a breakdown on hover |

Slimbar's focus is the smallest footer: one row, a bar that takes the space left, and colors set by tokens rather than by percentage.

## Develop

```
claude --plugin-dir .      # run a session with this folder loaded
claude plugin test .       # run the tests
claude plugin validate .   # check the manifest and hooks
```

## License

MIT
