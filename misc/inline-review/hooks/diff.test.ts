import { expect, test } from 'claude-code/testing'

const DIFF = [
  'diff --git a/a.ts b/a.ts',
  'index 111..222 100644',
  '--- a/a.ts',
  '+++ b/a.ts',
  '@@ -1,3 +1,3 @@',
  ' one',
  '-two',
  '+TWO',
  ' three',
  '',
].join('\n')

const FIXTURE = "diff --git a/sample.txt b/sample.txt\nindex 118cbe4..b802e95 100644\n--- a/sample.txt\n+++ b/sample.txt\n@@ -7,7 +7,7 @@ line 6 of the fixture file\n line 7 of the fixture file\n line 8 of the fixture file\n line 9 of the fixture file\n-line 10 of the fixture file\n+line 10 CHANGED\n line 11 of the fixture file\n line 12 of the fixture file\n line 13 of the fixture file\n@@ -57,7 +57,6 @@ line 56 of the fixture file\n line 57 of the fixture file\n line 58 of the fixture file\n line 59 of the fixture file\n-line 60 of the fixture file\n line 61 of the fixture file\n line 62 of the fixture file\n line 63 of the fixture file\n@@ -108,6 +107,7 @@ line 107 of the fixture file\n line 108 of the fixture file\n line 109 of the fixture file\n line 110 of the fixture file\n+line 110b ADDED\n line 111 of the fixture file\n line 112 of the fixture file\n line 113 of the fixture file\n@@ -167,7 +167,7 @@ line 166 of the fixture file\n line 167 of the fixture file\n line 168 of the fixture file\n line 169 of the fixture file\n-line 170 of the fixture file\n+line 170 CHANGED\n line 171 of the fixture file\n line 172 of the fixture file\n line 173 of the fixture file\n"

const PROPS = {
  title: 'Review',
  isFocused: false,
  bodyColumns: 80,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 20 },
  view: {},
} as const

const run = (stdout: string, exitCode = 0) => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

test('commands, diff comments on both sides, changes list, no-changes note', async ($, on) => {
  const titles: string[] = []
  const toasts: string[] = []
  let diffOut = DIFF
  const calls: string[] = []
  on('session.cwd', () => ({ value: '/repo' }))
  on('fs.read', (_$, e) =>
    e.path === '/repo/sub/f.ts' || e.path === '/repo/a.ts'
      ? { value: 'x = 1\ny = 2\n' }
      : { deny: 'ENOENT: no such file ' + e.path },
  )
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.open', (_$, e) => {
    titles.push(e.title ?? '')
    return { value: { isPlaced: true } as never }
  })
  on('process.run', (_$, e) => {
    const cmd = e.argv.slice(1).join(' ')
    calls.push(cmd)
    if (cmd.startsWith('rev-parse')) return run('/repo\n')
    if (cmd.startsWith('status')) return run(' M a.ts\n?? b.ts\n')
    if (cmd.startsWith('diff --no-color HEAD') || cmd.startsWith('diff --no-color main')) return run(diffOut)
    if (cmd.startsWith('diff --no-color --no-index')) return run('', 1)
    if (cmd.startsWith('ls-files')) return run('')
    return run('', 128)
  })

  const command = (name: string, args: string) =>
    $.command.run({
      command: name,
      args,
      origin: { kind: 'plugin', name: 'test' },
      presentation: { isFullscreen: true, columns: 80 },
    })
  const list = async () => String((await $.tool.call({ tool: 'mcp__inline-review__list_comments' })).result)

  for (const surface of ['terminal', 'desktop'] as const) {
    const mount = () =>
      $.ui.mount({ plugin: 'inline-review', surface, component: 'Pane', requestId: 'inline-review', props: PROPS })

    // /inline-review with a relative path opens the file.
    const reviewed = await command('inline-review', 'sub/f.ts')
    expect(reviewed.text).toBe('Reviewing /repo/sub/f.ts')
    expect(titles[titles.length - 1]).toBe('Review: f.ts')
    const missing = await command('inline-review', 'nope.ts')
    expect(toasts[toasts.length - 1]).toContain('nope.ts')
    expect(missing.text).toContain('nope.ts')

    // /inline-diff with a path draws the diff; rows: separator, one, -two, +TWO, three.
    diffOut = DIFF
    const diffed = await command('inline-diff', 'a.ts')
    expect(diffed.text).toBe('Diff of /repo/a.ts against HEAD')
    expect(titles[titles.length - 1]).toBe('Diff: a.ts vs HEAD')
    expect(calls.some(c => c === 'diff --no-color HEAD -- /repo/a.ts')).toBe(true)
    let ui = await mount()
    expect(await ui.find({ type: 'Text', text: /^ ⋯ 1,3 → 1,3 $/, in: 'file' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^ +2 │$/, in: 'file' })).toBeDefined() // +TWO: new number only
    expect(await ui.find({ type: 'Text', text: /^2 +│$/, in: 'file' })).toBeDefined() // -two: old number only
    expect(await ui.find({ type: 'Text', text: /^1 1 │$/, in: 'file' })).toBeDefined() // context: both
    expect(await ui.find({ type: 'Text', text: /^\+$/, in: 'file' })).toBeDefined()
    // Row 0 is the file header, so a diff row's index is shifted by one.
    const click = (y: number) => ui.pointer({ type: 'down', x: 3, y: y + 1, button: 'left' })
    const press = (key: string) => ui.key({ key, in: 'file' })
    const type = async (text: string) => {
      for (const ch of text) await press(ch)
    }
    await click(3)
    await type('add')
    await press('return')
    await click(2)
    await type('rem')
    await press('return')
    expect(await list()).toBe(
      '/repo/a.ts:2 (old): rem\n    > -two\n/repo/a.ts:2 (new): add\n    > +TWO',
    )
    expect(await list()).toBe('No comments yet.')
    // Comments are cleared; rows: sep, one, -two, +TWO, three.
    await click(2)
    await type('r')
    await press('return')
    // Now a ↳ row sits under -two: sep, one, -two, ↳, +TWO, three.
    await click(5)
    await type('c')
    await press('return')
    expect(await list()).toBe('/repo/a.ts:2 (old): r\n    > -two\n/repo/a.ts:3 (new): c\n    >  three')
    // A click on a saved comment's wrapped second row opens that comment prefilled; Enter leaves one comment.
    await ui.resize({ columns: 30, rows: 30, in: 'file' })
    await click(2)
    await type('aaaa bbbb cccc dddd eeee')
    await press('return')
    await click(4)
    expect(await ui.find({ type: 'Text', text: /✎ aaaa bbbb cccc dddd eeee█/, in: 'file' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /↳ old 2/, in: 'file' })).toBeUndefined()
    await type('!')
    await press('return')
    expect(await list()).toBe('/repo/a.ts:2 (old): aaaa bbbb cccc dddd eeee!\n    > -two')
    await ui.unmount()

    // The changed-files list: a click opens that file's diff against HEAD.
    const changed = await command('inline-diff', '')
    expect(titles[titles.length - 1]).toBe('Changes')
    expect(changed.text).toBe('2 changed files')
    ui = await mount()
    expect((await ui.find({ key: 'f-0' }))?.text).toContain('M   a.ts')
    expect((await ui.find({ key: 'f-1' }))?.text).toContain('??  b.ts')
    await ui.press({ key: 'f-0' })
    expect(titles[titles.length - 1]).toBe('Diff: a.ts vs HEAD')
    expect(await ui.find({ key: 'back' })).toBeDefined()
    await ui.press({ key: 'back' })
    expect(titles[titles.length - 1]).toBe('Changes')
    await ui.unmount()

    // An empty diff shows the whole file with a note.
    diffOut = ''
    await command('inline-diff', 'a.ts')
    ui = await mount()
    expect(await ui.find({ type: 'Text', text: /No changes against HEAD/ })).toBeDefined()
    await ui.unmount()
  }
})

test('diff clicks map to the right line and side across four hunks', async ($, on) => {
  on('session.cwd', () => ({ value: '/repo' }))
  on('ui.open', () => ({ value: { isPlaced: true } as never }))
  on('process.run', (_$, e) => {
    const cmd = e.argv.slice(1).join(' ')
    if (cmd.startsWith('rev-parse')) return run('/repo\n')
    if (cmd.startsWith('diff --no-color HEAD')) return run(FIXTURE)
    return run('', 128)
  })
  const command = (args: string) =>
    $.command.run({
      command: 'inline-diff',
      args,
      origin: { kind: 'plugin', name: 'test' },
      presentation: { isFullscreen: true, columns: 80 },
    })
  const list = async () => String((await $.tool.call({ tool: 'mcp__inline-review__list_comments' })).result)

  for (const surface of ['terminal', 'desktop'] as const) {
    // Rows with no comments: sep 0; 7,8,9 = 1-3; -10 = 4; +10 = 5; 11-13 = 6-8; sep 9;
    // 57-59 = 10-12; -60 = 13; 61-63 = 14-16; sep 17; 108-110 = 18-20; +110b = 21; 111-113 = 22-24;
    // sep 25; 167-169 = 26-28; -170 = 29; +170 = 30; 171-173 = 31-33.
    await command('sample.txt')
    let ui = await $.ui.mount({ plugin: 'inline-review', surface, component: 'Pane', requestId: 'inline-review', props: PROPS })
    // Row 0 is the file header, so a diff row's index is shifted by one.
    const click = (y: number) => ui.pointer({ type: 'down', x: 3, y: y + 1, button: 'left' })
    const press = (key: string) => ui.key({ key, in: 'file' })
    // The kit gives the drawn tree, not a layout grid, so wrapping is not testable here; each
    // gutter row is one Text holding a whole row's numbers, three for the first context run.
    for (const g of ['  7   7 │', '  8   8 │', '  9   9 │'])
      expect(await ui.find({ type: 'Text', text: g, in: 'file' })).toBeDefined()
    const say = async (y: number, body: string) => {
      await click(y)
      for (const ch of body) await press(ch)
      await press('return')
    }
    // Bottom-up, so a comment row never shifts a row still to be clicked. A separator
    // click opens nothing, so the typed letter is ignored.
    for (const sep of [25, 17, 9, 0, -1]) {
      await click(sep)
      await press('z')
      await press('return')
    }
    await say(30, 'n170')
    await say(29, 'o170')
    await say(21, 'n110')
    await say(13, 'o60')
    await say(5, 'n10')
    await say(4, 'o10')
    const out = await list()
    expect(out.split('\n').filter(l => !l.startsWith('    > '))).toEqual([
      '/repo/sample.txt:10 (old): o10',
      '/repo/sample.txt:10 (new): n10',
      '/repo/sample.txt:60 (old): o60',
      '/repo/sample.txt:110 (new): n110',
      '/repo/sample.txt:170 (old): o170',
      '/repo/sample.txt:170 (new): n170',
    ])
    expect(out).toContain('    > -line 10 of the fixture file')
    expect(out).toContain('    > +line 110b ADDED')
    expect(out).toContain('    > +line 170 CHANGED')
    await ui.unmount()

    // After a comment opens in hunk 1 (a ↳ row under +10), every row below shifts by one.
    await command('sample.txt')
    ui = await $.ui.mount({ plugin: 'inline-review', surface, component: 'Pane', requestId: 'inline-review', props: PROPS })
    await say(5, 'a')
    for (const sep of [10, 18, 26]) {
      await click(sep)
      await press('z')
      await press('return')
    }
    await say(14, 'o60') // a second ↳ row shifts the rows below it by one more
    await say(32, 'n170')
    expect((await list()).split('\n').filter(l => !l.startsWith('    > '))).toEqual([
      '/repo/sample.txt:10 (new): a',
      '/repo/sample.txt:60 (old): o60',
      '/repo/sample.txt:170 (new): n170',
    ])
    await ui.unmount()
  }
})
