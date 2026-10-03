# elayeek-ai

A Claude Code plugin marketplace.

| Plugin | Description |
|---|---|
| [`inline-review`](./inline-review) | Show a file or a git diff in a side pane and leave inline comments the model can read |

## inline-review in action

The model shows you a diff with `show_file` (or you run `/inline-diff src/auth.ts`):

```
┌ Diff: auth.ts vs HEAD ─────────────────────────────┐
│ auth.ts                                   +1 −1    │
│ ⋯ 10,4 → 10,4 ──────────────────────────────────── │
│  10 10 │ export function isExpired(t: Token) {     │
│  11 11 │   const now = Date.now()                  │
│  12    │-  return t.exp < now                      │
│     12 │+  return t.exp <= now                     │
│  13 13 │ }                                         │
└────────────────────────────────────────────────────┘
```

Click a line (or move with ↑ ↓) and type a comment:

```
│ ▌   12 │+  return t.exp <= now                     │
│         ┃  ✎ Add a 30s window for clock skew?█     │
│     Enter to save                                  │
```

Press Enter. The comment stays on the line:

```
│     12 │+  return t.exp <= now                     │
│         ┃  ↳ 12: Add a 30s window for clock skew?  │
```

The model calls `list_comments` and reads each comment with the line it is on:

```
/repo/src/auth.ts:12 (new): Add a 30s window for clock skew?
    > +  return t.exp <= now
```

## Install

```
/plugin marketplace add elayeek/elayeek-ai
/plugin install inline-review@elayeek-ai
```

Outside a session, use `claude plugin marketplace add …` and `claude plugin install …`.

`inline-review` is a mod and needs Claude Code 2.1.287 or later.

## Update

Run `claude plugin update`. Auto-update is off by default for this marketplace.

To release, raise `version` in the plugin's `.claude-plugin/plugin.json`.

## Use in a team project

Add this to the project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "elayeek-ai": { "source": { "source": "github", "repo": "elayeek/elayeek-ai" } }
  },
  "enabledPlugins": { "inline-review@elayeek-ai": true }
}
```
