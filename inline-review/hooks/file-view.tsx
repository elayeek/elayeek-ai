import type { ClientModule } from 'claude-code'

type Side = 'old' | 'new'
type Item = { m: string; t: string; o: number; n: number; header?: string }
type Sel = { line: number; side: Side }
type Props = {
  path: string
  isDiff: boolean
  lines: string[]
  items: Item[]
  comments: { line: number; side: Side; body: string }[]
}
// draft is null while no comment row is open.
type State = { sel: Sel | null; draft: string | null }

const MAX_CODE = 10_000
const HUNK = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/

// Every key and click commits here at once and then asks for a redraw, so keys
// that arrive between two draws build on each other instead of on the last
// drawn state. The module is loaded once per instance and reloads on a save.
let live: State | null = null

// Breaks at the last space within `width`, else hard-breaks at `width`.
const wrapText = (text: string, width: number): string[] => {
  const out: string[] = []
  let rest = text
  while (rest.length > width) {
    const at = rest.lastIndexOf(' ', width)
    if (at > 0) {
      out.push(rest.slice(0, at))
      rest = rest.slice(at + 1)
    } else {
      out.push(rest.slice(0, width))
      rest = rest.slice(width)
    }
  }
  out.push(rest)
  return out
}

const keyOf = (it: Item): Sel => (it.m === '-' ? { line: it.o, side: 'old' } : { line: it.n, side: 'new' })
const same = (a: Sel | null, b: Sel) => a !== null && a.line === b.line && a.side === b.side

// Draws the source one screen row per source line (wrap truncate-end), so a
// click's row maps to a line through `rowLine`. Comment, draft and hunk-header
// rows map to null. Typing goes through onKey because a click gives this Client
// the keys and an Input drawn inside it never receives them.
const View: ClientModule<Props, State> = (props, s) => {
  const { Box, Text, Code } = s.elements
  const { path, isDiff, comments } = props
  const all: Item[] = isDiff ? props.items : props.lines.map((t, i) => ({ m: '', t, o: 0, n: i + 1 }))
  if (live === null || s.state === undefined) live = s.state ?? { sel: null, draft: null }
  const commit = (next: State) => {
    live = next
    s.setState(next)
  }
  const { sel, draft } = live
  // 0 before the first layout.
  const columns = s.columns > 0 ? s.columns : 60

  // Diff gutter: selection bar, old and new number columns, then a rule. Comment rows indent past it.
  const digits = isDiff ? String(Math.max(1, ...all.map(i => Math.max(i.o, i.n)))).length : 0
  const lead = isDiff ? ' '.repeat(2 * digits + 4) + '┃' : ''
  const num = (v: number) => (v > 0 ? String(v) : '').padStart(digits)
  const rows: JSX.Element[] = []
  const rowLine: (Sel | null)[] = []
  // One Text per screen row keeps `rowLine` exact; the continuation indent is the prefix width.
  const pushWrapped = (key: string, color: string, first: string, text: string, at: Sel | null = null) => {
    const indent = ' '.repeat(first.length)
    wrapText(text, Math.max(8, columns - lead.length - first.length)).forEach((piece, k) => {
      rows.push(<Text key={`${key}-${k}`} color={color} wrap="truncate-end">{`${lead}${k === 0 ? first : indent}${piece}`}</Text>)
      rowLine.push(at)
    })
  }
  const bodyOf = (k: Sel) => comments.find(c => c.line === k.line && c.side === k.side)?.body

  let chunk: Item[] = []
  let size = 0
  // Whole-file view only: a diff row is its own one-row Text, drawn as the raw diff line.
  const flush = () => {
    if (chunk.length === 0) return
    const first = chunk[0] as Item
    const id = `${first.m}-${first.o}-${first.n}`
    const code = <Code key={`code-${first.n}`} path={path} startLine={first.n} wrap="truncate-end" source={chunk.map(i => i.t).join('\n')} />
    rows.push(chunk.length === 1 && same(sel, keyOf(first)) ? <Box key={`sel-${id}`} backgroundColor="blue">{code}</Box> : code)
    chunk.forEach(i => rowLine.push(keyOf(i)))
    chunk = []
  }

  // A diff run is contiguous rows of one tint: one tinted Box holding a gutter column beside one Code.
  let run: Item[] = []
  const flushRun = () => {
    if (run.length === 0) return
    const first = run[0] as Item
    // A run is one row when selected, so `isSel` styles the whole run.
    const isSel = same(sel, keyOf(first))
    const base = first.m === '+' ? '#1f3d2b' : first.m === '-' ? '#4a2227' : undefined
    const lit = first.m === '+' ? '#2a5a3c' : first.m === '-' ? '#6a3038' : '#2a3340'
    const tint = isSel ? lit : base
    const markColor = first.m === '+' ? 'greenBright' : first.m === '-' ? 'redBright' : undefined
    rows.push(
      <Box key={`run-${first.m}-${first.o}-${first.n}`} flexDirection="row" backgroundColor={tint}>
        {/* Fixed-width, non-shrinking columns of one single-row Text each, so a gutter row can never wrap. */}
        <Box flexDirection="column" width={1} flexShrink={0}>
          {run.map((i, r) => (
            <Text key={`b${r}`} color="cyan" wrap="truncate-end">{same(sel, keyOf(i)) ? '▌' : ' '}</Text>
          ))}
        </Box>
        <Box flexDirection="column" width={2 * digits + 3} flexShrink={0}>
          {run.map((i, r) => (
            <Text key={`g${r}`} dimColor={first.m === ' ' && !isSel} bold={isSel} wrap="truncate-end">{`${num(i.m === '+' ? 0 : i.o)} ${num(i.m === '-' ? 0 : i.n)} │`}</Text>
          ))}
        </Box>
        <Box flexDirection="column" width={1} flexShrink={0}>
          {run.map((i, r) => (
            <Text key={`m${r}`} color={markColor} bold={isSel} wrap="truncate-end">{i.m}</Text>
          ))}
        </Box>
        <Box flexGrow={1} flexShrink={1}>
          <Code path={path} wrap="truncate-end" source={run.map(i => i.t).join('\n')} />
        </Box>
      </Box>,
    )
    run.forEach(i => rowLine.push(keyOf(i)))
    run = []
  }

  if (isDiff) {
    const adds = all.filter(i => i.m === '+').length
    const dels = all.filter(i => i.m === '-').length
    rows.push(
      <Box key="file-head" flexDirection="row">
        <Box flexGrow={1}>
          <Text bold wrap="truncate-end">{` ${path.split('/').pop() || path}`}</Text>
        </Box>
        <Text color="greenBright">{`+${adds}`}</Text>
        <Text color="redBright">{` −${dels}`}</Text>
      </Box>,
    )
    rowLine.push(null)
  }

  all.forEach(it => {
    const k = keyOf(it)
    if (isDiff) {
      if (it.header !== undefined) {
        flushRun()
        const hunk = HUNK.exec(it.header)
        const label = hunk ? `⋯ ${hunk[1]},${hunk[2] ?? 1} → ${hunk[3]},${hunk[4] ?? 1} ` : '⋯ '
        rows.push(
          <Box key={`sep-${it.o}-${it.n}`} flexDirection="row">
            <Box flexShrink={0}>
              <Text>{` ${label}`}</Text>
            </Box>
            <Box flexGrow={1}>
              <Text dimColor wrap="truncate-end">{'─'.repeat(columns)}</Text>
            </Box>
          </Box>,
        )
        rowLine.push(null)
      }
      if (run.length > 0 && (run[0]?.m !== it.m || same(sel, k) || run.reduce((n, i) => n + i.t.length + 1, 0) + it.t.length > MAX_CODE)) flushRun()
      run.push(it)
    } else {
      if (chunk.length > 0 && (size + it.t.length + 4 > MAX_CODE || same(sel, k))) flush()
      chunk.push(it)
      size += it.t.length + 4
    }
    const saved = bodyOf(k)
    const isEditing = same(sel, k) && draft !== null
    if (saved !== undefined || same(sel, k)) (isDiff ? flushRun : flush)()
    if (saved !== undefined && !isEditing) {
      const label = `  ↳ ${k.side === 'old' ? 'old ' : ''}${k.line}: `
      saved.split('\n').forEach((part, j) => pushWrapped(`c-${k.side}${k.line}-${j}`, 'yellow', j === 0 ? label : ' '.repeat(label.length), part, k))
    }
    if (isEditing) {
      const parts = draft.split('\n')
      const hint = 'Enter to save'
      parts.forEach((part, j) =>
        pushWrapped(`draft-${j}`, 'green', j === 0 ? '  ✎ ' : '    ', j === parts.length - 1 ? `${part}█` : part),
      )
      rows.push(
        <Text key="hint" dimColor wrap="truncate-end">
          {`    ${hint}`}
        </Text>,
      )
      rowLine.push(null)
    }
  })
  flush()
  flushRun()

  s.onPointer(e => {
    if (e.type !== 'down' || e.button !== 'left') return
    const k = rowLine[e.y]
    if (k == null) return
    const cur = live as State
    // A second click on the open line cancels the draft and keeps the saved comment.
    commit(same(cur.sel, k) && cur.draft !== null ? { sel: k, draft: null } : { sel: k, draft: bodyOf(k) ?? '' })
  })
  s.onKey(e => {
    const { sel: at, draft: text } = live as State
    if (text !== null && at !== null) {
      if (e.ctrl || e.meta) return
      if (e.key === 'return') {
        if (e.shift) return commit({ sel: at, draft: text + '\n' })
        const body = text.trim()
        if (body === '' && bodyOf(at) === undefined) return
        s.post({ line: at.line, side: at.side, body })
        commit({ sel: at, draft: null })
      } else if (e.key === 'backspace' || e.key === 'delete') {
        commit({ sel: at, draft: text.slice(0, -1) })
      } else if (e.key === 'space') {
        commit({ sel: at, draft: text + ' ' })
      } else if (e.key.length === 1) {
        commit({ sel: at, draft: text + e.key })
      }
      return
    }
    if (e.key !== 'up' && e.key !== 'down') return
    const idx = at === null ? -1 : all.findIndex(i => same(at, keyOf(i)))
    const step = e.key === 'down' ? 1 : -1
    const next = Math.min(Math.max((idx === -1 ? (step === 1 ? -1 : all.length) : idx) + step, 0), all.length - 1)
    const target = all[next]
    if (target) commit({ sel: keyOf(target), draft: null })
  })

  return <Box flexDirection="column">{rows}</Box>
}

export default View
