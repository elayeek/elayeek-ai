import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Change, DiffItem, ReviewFile, Side } from '../types'

const PANE = 'inline-review'
const SHOW = 'mcp__inline-review__show_file'
const LIST = 'mcp__inline-review__list_comments'
const MAX_FILE = 80_000
const MAX_CODE = 10_000

const file = atom({ plugin: 'inline-review', key: 'file' } as const, null)
const comments = atom({ plugin: 'inline-review', key: 'comments' } as const, [])
const changes = atom({ plugin: 'inline-review', key: 'changes' } as const, null)

const basename = (path: string) => path.split('/').pop() || path
const dirname = (path: string) => path.slice(0, path.lastIndexOf('/')) || '/'
const message = (error: unknown) => (error instanceof Error ? error.message : String(error))
// Code rejects control characters other than tab and newline.
const clean = (line: string) => line.replace(/[\u0000-\u0008\u000a-\u001f\u007f]/g, ' ').slice(0, MAX_CODE)
const splitLines = (source: string) => {
  const lines = source.split('\n')
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/

// Rows of a unified diff, with the old and new line number of each; file headers
// and "\ No newline" notes are dropped.
const parseDiff = (text: string): DiffItem[] => {
  const items: DiffItem[] = []
  let inHunk = false
  let o = 0
  let n = 0
  let isFirst = false
  let header = ''
  for (const raw of text.split('\n')) {
    const head = HUNK.exec(raw)
    if (head) {
      inHunk = true
      header = clean(raw)
      isFirst = true
      o = Number(head[1])
      n = Number(head[2])
      continue
    }
    if (raw.startsWith('diff ')) inHunk = false
    if (!inHunk || raw === '' || raw.startsWith('\\')) continue
    const m = raw[0]
    if (m !== ' ' && m !== '+' && m !== '-') continue
    const item: DiffItem = { m, t: clean(raw.slice(1)), o: m === '+' ? 0 : o, n: m === '-' ? 0 : n }
    if (isFirst) item.header = header
    isFirst = false
    items.push(item)
    if (m !== '+') o += 1
    if (m !== '-') n += 1
  }

  return items
}

type Opened = { error: string } | { text: string; title: string }
type Engine = EngineInterface

const resolvePath = async ($: Engine, path: string) =>
  path.startsWith('/') ? path : `${await $.session.cwd()}/${path.replace(/^\.\//, '')}`

const repoRoot = async ($: Engine, dir: string): Promise<string | null> => {
  const r = await $.process.run(['git', 'rev-parse', '--show-toplevel'], { cwd: dir })

  return r.exitCode === 0 ? r.stdout.trim() : null
}

// Shows a file whole, or its diff against `base`, and clears the comments.
const openFile = async ($: Engine, input: { path: string; base?: string; fromList?: boolean }): Promise<Opened> => {
  const path = await resolvePath($, input.path)
  const base = input.base === undefined || input.base === '' ? null : input.base
  if (base !== null && base.startsWith('-')) return { error: `Bad base ${base}.` }
  let items: DiffItem[] = []
  let source = ''
  let note: string | null = null

  if (base !== null) {
    const root = await repoRoot($, dirname(path))
    if (root === null) return { error: `${path} is not in a git repository.` }
    let diff = await $.process.run(['git', 'diff', '--no-color', base, '--', path], { cwd: root })
    if (diff.exitCode !== 0) return { error: `git diff failed: ${diff.stderr.trim() || `exit ${diff.exitCode}`}` }
    if (diff.stdout.trim() === '') {
      const other = await $.process.run(['git', 'ls-files', '--others', '--exclude-standard', '--', path], { cwd: root })
      if (other.stdout.trim() !== '') {
        // An untracked file is all added; exit code 1 means "differences" here.
        diff = await $.process.run(['git', 'diff', '--no-color', '--no-index', '--', '/dev/null', path], { cwd: root })
        if (diff.exitCode > 1) return { error: `git diff failed: ${diff.stderr.trim() || `exit ${diff.exitCode}`}` }
      }
    }
    if (diff.stdout.length > MAX_FILE) return { error: `The diff of ${path} is too large for this prototype.` }
    items = parseDiff(diff.stdout)
    if (items.length === 0) note = `No changes against ${base}`
  }

  if (base === null || items.length === 0) {
    try {
      source = await $.fs.read(path)
    } catch (error) {
      return { error: `Cannot read ${path}: ${message(error)}` }
    }
    if (source.length > MAX_FILE) {
      return { error: `${path} is too large for this prototype (${source.length} characters, limit ${MAX_FILE}).` }
    }
  }

  const shown: ReviewFile = {
    path,
    base,
    lines: splitLines(source).map(clean),
    items,
    note,
    fromList: input.fromList === true,
  }
  await update($, file, () => shown)
  await update($, comments, () => [])
  const isDiff = items.length > 0

  return {
    title: isDiff ? `Diff: ${basename(path)} vs ${base}` : `Review: ${basename(path)}`,
    text: isDiff ? `Diff of ${path} against ${base}` : `Reviewing ${path}`,
  }
}

const openChanges = async ($: Engine): Promise<Opened> => {
  const root = await repoRoot($, await $.session.cwd())
  if (root === null) return { error: 'The working directory is not in a git repository.' }
  const status = await $.process.run(['git', 'status', '--porcelain'], { cwd: root })
  if (status.exitCode !== 0) return { error: `git status failed: ${status.stderr.trim() || `exit ${status.exitCode}`}` }
  const list: Change[] = status.stdout
    .split('\n')
    .filter(l => l.length > 3)
    .map(l => {
      const path = l.slice(3).split(' -> ').pop() as string

      return { code: l.slice(0, 2).trim(), path, abs: `${root}/${path}` }
    })
  await update($, file, () => null)
  await update($, comments, () => [])
  await update($, changes, () => list)

  return { title: 'Changes', text: list.length === 0 ? 'No changes.' : `${list.length} changed files` }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'show_file',
      description:
        'Show a file in the Review pane so the user can leave inline comments on it. With base (a git ref such as HEAD), show the diff of the file against that ref instead.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path of the file' },
          base: { type: 'string', description: 'Optional git ref to diff against; omit for the whole file' },
        },
        required: ['path'],
      },
    })
    await $.tool.register({
      name: 'list_comments',
      description: "List the user's inline comments on the file shown in the Review pane, then clear them.",
      inputSchema: { type: 'object', properties: {} },
    })
    await $.command.register({
      name: 'inline-review',
      description: 'Open the inline review pane, or review a file',
      argumentHint: '[path]',
    })
    await $.command.register({
      name: 'inline-diff',
      description: 'Review the diff of a file, or list the changed files',
      argumentHint: '[path] [base]',
    })

    return next(e)
  })

  on('command.run', { command: 'inline-review' }, async ($, e) => {
    const [path] = e.args.trim().split(/\s+/).filter(Boolean)
    if (path === undefined) {
      await $.ui.open({ id: PANE, title: 'Review' })

      return { text: 'Review pane opened.' }
    }
    const opened = await openFile($, { path })
    if ('error' in opened) {
      $.ui.toast(opened.error)

      return { text: opened.error }
    }
    await $.ui.open({ id: PANE, title: opened.title })

    return { text: opened.text }
  })

  on('command.run', { command: 'inline-diff' }, async ($, e) => {
    const [path, base] = e.args.trim().split(/\s+/).filter(Boolean)
    const opened = path === undefined ? await openChanges($) : await openFile($, { path, base: base ?? 'HEAD' })
    if ('error' in opened) {
      $.ui.toast(opened.error)

      return { text: opened.error }
    }
    await $.ui.open({ id: PANE, title: opened.title })

    return { text: opened.text }
  })

  on('tool.call', { tool: SHOW }, async ($, e) => {
    const path = e.path
    if (typeof path !== 'string' || path === '') return { deny: 'show_file needs an absolute file path.' }
    const base = typeof e.base === 'string' && e.base !== '' ? e.base : undefined
    const opened = await openFile($, { path, base })
    if ('error' in opened) return { deny: opened.error }
    await $.ui.open({ id: PANE, title: opened.title })

    return {
      result: `${base === undefined ? `Showing ${path}` : `Showing the diff of ${path} against ${base}`} in the Review pane. Call ${LIST} to read the user's comments.`,
    }
  })

  on('tool.call', { tool: LIST }, async $ => {
    const shown = await read($, file)
    const list = [...(await read($, comments))].sort((a, b) => a.line - b.line || (a.side === b.side ? 0 : a.side === 'old' ? -1 : 1))
    if (shown === null || list.length === 0) return { result: 'No comments yet.' }
    await update($, comments, () => [])

    const isDiff = shown.items.length > 0
    const quote = (line: number, side: Side) => {
      if (!isDiff) return shown.lines[line - 1] ?? ''
      const it = shown.items.find(i => (side === 'old' ? i.m === '-' && i.o === line : i.m !== '-' && i.n === line))

      return it ? `${it.m}${it.t}` : ''
    }

    return {
      result: list
        .map(c => {
          const head = isDiff ? `${shown.path}:${c.line} (${c.side})` : `${shown.path}:${c.line}`

          return `${head}: ${c.body.replace(/\n/g, '\n    ')}\n    > ${quote(c.line, c.side)}`
        })
        .join('\n'),
    }
  })

  on('ui.message', { component: 'Pane', requestId: PANE, element: 'file' }, async ($, e) => {
    const d = e.data as { line?: unknown; side?: unknown; body?: unknown } | null
    if (d && typeof d.line === 'number' && (d.side === 'old' || d.side === 'new') && typeof d.body === 'string') {
      const { line, body } = d
      const side: Side = d.side
      // One comment per line and side: a body replaces it, an empty body deletes it.
      await update($, comments, c => {
        const rest = c.filter(x => !(x.line === line && x.side === side))
        return body === '' ? rest : [...rest, { line, side, body }]
      })
    }

    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    // Only the terminal and desktop tables have both Client and Input.
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const { Box, Text, Client, Button } = $.ui.resolve(e)
    const shown = await read($, file)
    const changed = await read($, changes)

    const open = async (path: string, base: string, fromList: boolean) => {
      const opened = await openFile($, { path, base, fromList })
      if ('error' in opened) $.ui.toast(opened.error)
      else await $.ui.open({ id: PANE, title: opened.title })
    }

    if (shown === null && changed !== null) {
      if (changed.length === 0) return <Text dimColor>No changes.</Text>

      return (
        <Box flexDirection="column">
          {changed.map((c, i) => (
            <Button key={`f-${i}`} plain label={`${c.code.padEnd(3)} ${c.path}`} onPress={() => open(c.abs, 'HEAD', true)} />
          ))}
        </Box>
      )
    }
    if (shown === null) {
      return <Text dimColor>No file shown. The model calls show_file to open one.</Text>
    }
    const list = await read($, comments)

    return (
      <Box flexDirection="column">
        {shown.fromList && (
          <Button
            key="back"
            plain
            label="← Changes"
            onPress={async () => {
              const opened = await openChanges($)
              if ('error' in opened) $.ui.toast(opened.error)
              else await $.ui.open({ id: PANE, title: opened.title })
            }}
          />
        )}
        {shown.note !== null && <Text dimColor>{shown.note}</Text>}
        <Client
          key="file"
          module="./file-view.tsx"
          props={{ path: shown.path, isDiff: shown.items.length > 0, lines: shown.lines, items: shown.items, comments: list }}
        />
      </Box>
    )
  })
}
