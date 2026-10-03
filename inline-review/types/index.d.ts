export type Side = 'old' | 'new'
// One row of a diff: m is the marker, o and n the old and new line numbers
// (0 where the row has none), header is the hunk header line on the first row of a hunk.
export type DiffItem = { m: ' ' | '+' | '-'; t: string; o: number; n: number; header?: string }
export type ReviewFile = {
  path: string
  base: string | null
  lines: string[]
  items: DiffItem[]
  note: string | null
  fromList: boolean
}
export type ReviewComment = { line: number; side: Side; body: string }
export type Change = { code: string; path: string; abs: string }

declare module 'claude-code' {
  interface PluginState {
    'inline-review': {
      file: ReviewFile | null
      comments: ReviewComment[]
      changes: Change[] | null
    }
  }
}
