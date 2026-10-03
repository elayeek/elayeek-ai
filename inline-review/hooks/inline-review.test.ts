import { expect, test } from 'claude-code/testing'

test('show_file, comment through the pane, list_comments', async ($, on) => {
  // The test engine has no file system: answer the read beneath the plugin.
  const path = '/tmp/inline-review-test.ts'
  on('fs.read', (_$, e) =>
    e.path === path
      ? { value: 'const a = 1\nconst b = 2\nconst c = 3\n' }
      : { deny: 'ENOENT: no such file ' + e.path },
  )

  const toasts: string[] = []
  const titles: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.open', (_$, e) => {
    titles.push(e.title ?? '')
    return { value: { isPlaced: true } as never }
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const shown = await $.tool.call({ tool: 'mcp__inline-review__show_file', path })
    expect(shown.deny).toBeUndefined()
    expect(titles[titles.length - 1]).toBe('Review: inline-review-test.ts')

    const ui = await $.ui.mount({
      plugin: 'inline-review',
      surface,
      component: 'Pane',
      requestId: 'inline-review',
      props: {
        title: 'Review',
        isFocused: false,
        bodyColumns: 80,
        placement: 'dock',
        scroll: { offset: 0, bodyRows: 20 },
        view: {},
      },
    })

    const press = async (key: string, shift?: true) => ui.key({ key, in: 'file', ...(shift && { shift }) })
    const type = async (text: string) => {
      for (const ch of text) await press(ch === ' ' ? 'space' : ch)
    }
    const row = (text: RegExp) => ui.find({ type: 'Text', text, in: 'file' })
    const seen = async (re: RegExp) => ((await row(re)) ? 'seen ' : 'gone ') + String(re)
    const click = (y: number) => ui.pointer({ type: 'down', x: 3, y, button: 'left' })
    const list = async () => {
      const r = await $.tool.call({ tool: 'mcp__inline-review__list_comments' })
      return String(r.result)
    }

    // Rows 0-2 are lines 1-3: click row 1 (line 2) to open the draft row under it.
    await click(1)
    expect(await seen(/✎/)).toBe('seen /✎/')
    // An empty draft saves nothing, and up/down do not move an open row.
    await press('return')
    await press('down')
    await type('a b')
    expect(await seen(/✎ a b█/)).toBe('seen /✎ a b█/')
    await press('x')
    await press('backspace')
    await press('return')
    expect(await seen(/✎/)).toBe('gone /✎/')
    expect(await seen(/↳ 2: a b/)).toBe('seen /↳ 2: a b/')

    // Clicking the commented line prefills it and replaces the ↳ row; Enter replaces, not adds.
    await click(1)
    expect(await seen(/✎ a b█/)).toBe('seen /✎ a b█/')
    expect(await seen(/↳ 2/)).toBe('gone /↳ 2/')
    await press('backspace')
    await press('backspace')
    await type(' hi')
    await press('return')
    expect(await seen(/↳ 2: a hi/)).toBe('seen /↳ 2: a hi/')
    // A second click on the open line cancels and keeps the comment.
    await click(1)
    await press('z')
    await click(1)
    expect(await seen(/✎/)).toBe('gone /✎/')
    expect(await seen(/↳ 2: a hi/)).toBe('seen /↳ 2: a hi/')

    // Shift+Enter makes a two-line comment; rows 2 and 3 are its ↳ rows, so row 4 is line 3.
    await click(1)
    await press('return', true)
    await type('two')
    await press('return')
    // The shift+return above prefilled "a hi\n" + "two".
    expect(await seen(/↳ 2: a hi/)).toBe('seen /↳ 2: a hi/')
    expect(await seen(/two/)).toBe('seen /two/')
    await click(4)
    await type('q')
    await press('return')
    const listed = await list()
    expect(listed).toContain(`${path}:2: a hi\n    two\n    > const b = 2`)
    expect(listed).toContain(`${path}:3: q\n    > const c = 3`)
    expect(toasts.length).toBe(0)

    // list_comments cleared them. A draft on line 1 is two rows (text, hint): row 3 is line 2.
    await click(0)
    await type('w')
    await click(3)
    await type('m')
    await press('return')
    expect(await list()).toBe(`${path}:2: m\n    > const b = 2`)
    // The next section starts with no comments.
    // At 20 columns the text width is 16: the draft wraps to two rows, then the hint,
    // so row 4 is line 2 again and the cursor sits on the last piece.
    await ui.resize({ columns: 20, rows: 30, in: 'file' })
    await click(0)
    await type('aaaa bbbb cccc dddd eeee')
    expect(await seen(/aaaa bbbb cccc/)).toBe('seen /aaaa bbbb cccc/')
    expect(await seen(/^ {4}dddd eeee█/)).toBe('seen /^ {4}dddd eeee█/')
    await click(4)
    await type('k')
    await press('return')
    expect(await list()).toBe(`${path}:2: k\n    > const b = 2`)
    // The empty-delete check follows. An empty Enter on a commented line deletes its comment.
    expect(await list()).toBe('No comments yet.')
    await click(1)
    await type('zz')
    await press('return')
    expect(await seen(/↳ 2: zz/)).toBe('seen /↳ 2: zz/')
    await click(1)
    await press('backspace')
    await press('backspace')
    await press('return')
    expect(await seen(/↳ 2/)).toBe('gone /↳ 2/')
    expect(await list()).toBe('No comments yet.')
    // A click on a saved comment's wrapped second row opens that comment prefilled; Enter leaves one comment.
    await click(1)
    await type('aaaa bbbb cccc dddd eeee')
    await press('return')
    expect(await seen(/↳ 2: aaaa bbbb cccc/)).toBe('seen /↳ 2: aaaa bbbb cccc/')
    await click(3)
    expect(await seen(/✎ aaaa bbbb cccc dddd eeee█/)).toBe('seen /✎ aaaa bbbb cccc dddd eeee█/')
    expect(await seen(/↳ 2/)).toBe('gone /↳ 2/')
    await type('!')
    await press('return')
    expect(await list()).toBe(`${path}:2: aaaa bbbb cccc dddd eeee!\n    > const b = 2`)
    await ui.unmount()
    toasts.length = 0
  }

  const missing = await $.tool.call({ tool: 'mcp__inline-review__show_file', path: '/nope/missing.ts' })
  expect(missing.deny ?? missing.text).toContain('missing.ts')
})
