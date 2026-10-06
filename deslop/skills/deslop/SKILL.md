---
name: deslop
description: "Find AI-authored slop in a change (the current branch by default, or a range of commits or the whole repo, named in plain words), check each finding against the code, and fix the ones you pick."
argument-hint: "[the change, in plain words; default: the current branch]"
disable-model-invocation: true
---

Deslop only what the change edited and what those edits affect. Finding runs in fresh
`deslop:deslop-review-agent` subagents; checking runs in one `deslop:deslop-verify-agent`.
Both edit nothing, and both read the lens file `${CLAUDE_SKILL_DIR}/lenses.md`. Fixing runs in fresh
`general-purpose` subagents, on the findings the user picks. Every dispatch sets
`model: sonnet`, except the verifier (`model: opus`) and the review of the fixes.

Parse $ARGUMENTS: every word names the change in plain words (default: the current branch).

## Steps

### Scope the diff

Find the repo root with `git rev-parse --show-toplevel`, and run every later git command as
`git -C <root>`.

The head is the checked-out commit. When the change named needs another head, say so plainly and stop; the user decides. Never check out a commit.

Resolve the base from the words: map them to a base yourself, and ask the user when they fit
more than one range. The default change is the current branch, from its merge base with the
default branch:
```bash
git -C <root> symbolic-ref --short refs/remotes/origin/HEAD
git -C <root> merge-base origin/<default branch> HEAD
```
When `symbolic-ref` fails, ask the user for the default branch. Strip `origin/` from the first
result to get `<default branch>`. When `origin/<default branch>`
does not resolve, use `<default branch>`. Use the merge base, not the default branch's tip: the
tip shows commits merged into it since the change forked as deletions. Use the literal base SHA
in every later command.

List the files:
```bash
git -C <root> diff --name-status -M --diff-filter=d <base>
git -C <root> ls-files --others --exclude-standard
```
The diff runs against the working tree, so uncommitted edits count. Keep each renamed file's
old path with its new one, and mark each file from the second command `untracked`. Drop
generated files, lockfiles, snapshot and data-fixture files, and binary files. Only files in
this list are in scope. If the list is empty, stop: "No changes to clean up."

A whole-repo run takes no diff. Its file list is `git -C <root> ls-files`, minus the same drops;
untracked files stay out. The agent reads every file as entirely added. Ask the user to confirm
the file count.

List the context files: the repo's guideline and convention documents already in this session's
context (a file the user named, one read earlier). Pass those; each agent also runs the
conventions search in the lens file's `## conventions` and reads the rest.

### Find

Group the files by logical unit. Judge the units from the file list,
`git -C <root> diff --stat <base>`, and the changed files' imports; a whole-repo run has no
base, so use the file list and the imports only. Criteria, in order:
1. A source file with its tests.
2. Changed files that import each other's changed symbols.
3. The files of one feature slice.
4. Directory, for the rest.

Keep each group to about 10 files; split a unit well past that along its subdirectories,
keeping each source file with its tests. Put each file in exactly one group. A small change
takes the same path with one group.

Before dispatch, ask the user to confirm the base, the head, the commit count, any commits
outside the PRs the user named (when they named any), and every untracked file included. A
whole-repo run asks nothing further here.

Dispatch one `deslop:deslop-review-agent` per group, all in one message. Each prompt gives: the repo
root, the base (none in a whole-repo run), the group's files (with the old path and the
`untracked` flag where they apply), the lens file path, and the context files. Each prompt ends
with this paragraph, verbatim:

```
Report every hunk that fits a lens when you think it is more likely slop than not; when unsure,
report it and state the doubt in an evidence line. A finding your own evidence rules out is no
finding. Before you write the report, go over each owned file a second time, lens by lens.
```

When the agents return, check each report's shape: a `FINDINGS:` list or `FINDINGS: none`, with
`file`, `lens`, `size`, `summary`, and at least one `evidence` line on every finding. Each
agent gets one resume for a shape failure; a failure after it makes the report unusable. Drop
every finding from an unusable report, and list its group's files in Report, for the user to rerun.

Merge the usable reports' findings. When a file's owner and another agent report the same
`file:line`, keep the owner's finding. Number the findings from 1, in group order. Each finding
keeps its number through Report; drops leave gaps.

### Check the findings

After all finders return, dispatch one `deslop:deslop-verify-agent`, `model: opus`, for all findings
of the run. The prompt gives: the repo root, the base (none in a whole-repo run), the run's
file list from Scope the diff (with the old path and the `untracked` flag where they apply),
the lens file path, the context files, and every numbered finding, verbatim. The same shape
and resume rules apply to its `VERDICTS:` list: one verdict per finding given. A verdict with
no `checked` line is unusable, and its finding stays unchecked; the list says so.

Apply the verdicts: drop each `false` finding and keep its reason for the list; replace the
fields of each `partly` finding and mark it `partly`; mark each `weak` finding; a `holds`
finding stays plain. Record the finding count and the verifier's tokens and tool calls (from
its task notification) for Report.

### Pick

Show the checked findings, numbered and grouped by group, each as
`<n>. file:line — one-phrase description (lens, size)`, with `(caused by file:line)` when it
has a `cause`, `(duplicates …)` when it has `duplicates`, and `(partly: <reason>)`,
`(weak: <reason>)`, or `(unchecked)` when those apply. Under a separate head, list each
dropped finding in one line with its reason. List every unusable report with its group's files.

Ask which to fix. The user answers with finding numbers, groups, files, or a mix. No findings,
or "none": end the run here with the list as the report.

### Record the baseline

Find the repo's typecheck and lint commands; in a monorepo, the commands of each package that
holds a fix-set file. Run every command in check-only form: strip `--fix` and `--write`.
When that cannot be done, leave the command out and report `gate not run: lint command writes
files`. For TypeScript, use each changed package's own `tsconfig`, or `tsc -b`, never a
references root with `"files": []`. No command: the check does not apply.

Run the commands before any fixer. Record every error by file, code, and message, and count the
errors per key.

The fix set is every file a picked finding names: its `file`, its `cause`, and each
`duplicates` path. Copy each file of the fix set into a snapshot folder: one folder per run, in
the session's scratchpad, or from `mktemp -d` when there is none. Each copy keeps its
repo-relative path. Also record `git -C <root> status --porcelain --untracked-files=all` and a
`shasum` of each path it lists, beside the snapshot folder (for example
`<snapshot folder>.status`). The folder stays after the run.

### Fix

Give each group's picked findings to one `general-purpose` fixer. Merge groups that share a
file, transitively, into one fixer, so no two fixers edit one file. Dispatch all fixers in one
message, each with this prompt:

```
Fix each slop finding below in <root>, as its summary says. The user picked every one.
Base: <base>. Files you may edit: <each finding's `file` and `duplicates` paths>. You may also
create a new file when a finding needs a shared home.
Findings: <each picked finding, verbatim, with its number>
Rules:
- Change only what each finding names; a stale comment is brought in line with the code. A
  finding that needs an edit in any other file: report it not fixed, naming the file.
- A fix that deletes code also deletes each comment that documented only that code, and
  rewrites a comment that documented it in part. This is part of the fix, not beyond it.
- A rename changes every reference, keeps the old key at each shorthand use ({ d } becomes
  { d: newName }), and needs a grep for the old name as a string first: a template, string-key,
  or reflection use means report the finding unfixed.
- Run git only to read. Never commit, stash, check out, or restore; run no formatter or autofix.
- Run no typecheck, lint, test, or build; the caller checks. Change nothing a finding does not
  name, even a root cause you find.
Final message, raw data:
- <n>: fixed | not fixed — <reason>
  lines: <path>:<start>-<end>, …    # fixed only: line numbers in the final file; for a pure
                                     # deletion, the line after the gap
New files: <paths, or none>
```

When the fixers return, run `git -C <root> status --porcelain --untracked-files=all` and a
`shasum` of each path it lists again, and compare both against the Record the baseline snapshot.
A path existed before the fixers when the pre-fix status list holds it, or
`git -C <root> ls-files --error-unmatch <path>` finds it tracked. The allowed set is the
fixers' may-edit list (each picked finding's `file` and `duplicates` paths) plus the reported
new files that did not exist before. Anything else changed or new, `cause` files included, or a
reported new file that existed before: stop and ask the user.

Copy each file of the fix set whose content changed, and each new file, into a `fixed` folder
beside the snapshot folder, keeping repo-relative paths.

### Check the fixes (at least one file changed)

Undo a fix only by copying files from the snapshot folder. Never run `git checkout`,
`git restore`, or any other command that rewrites a file holding uncommitted work, in the
working tree, a snapshot folder, or a worktree. Before you copy a snapshot copy over a file,
check that the file on disk equals its copy in the `fixed` folder; before you copy a `fixed`
copy back over a file, check that the file on disk equals its copy in the snapshot folder. On a
mismatch, stop and ask the user. To undo a new file, delete it, only when it did not exist
before. To undo a finding, undo every file in its `lines` and every new file it created; repeat
for each other finding those files hold, until the set is closed. List each as reverted.

1. Re-run the baseline commands. An error counts as new when its per-key count exceeds the
   baseline's.
2. Attribute each new error by evidence only: its line lies inside or right next to one
   finding's changed lines, or it names a symbol exactly one fix changed. The file alone never
   settles it.
3. **Incomplete fix** (a mechanical follow-on: an unused import, formatting of the changed
   lines): complete it by hand, changing only the lines behind the error, and copy the file into
   the `fixed` folder again. Update that finding's `lines`. Do it inline, send it back to the
   fixer, or dispatch a fixer. Run no linter autofix.
4. **Wrong fix** (an attributed error that is not an incomplete fix): undo its finding, and
   report it; never repair it.
5. **Unattributed error**: put it into the user question, with three answers: undo all fixes;
   search (undo findings one at a time (closure), in any order, re-running the check, then copy
   the rest back from the `fixed` folder); or keep them for the user to fix.
6. Re-run the check after any undo. No new errors: passed.

### Review the fixes (at least one fix kept)

Dispatch one built-in `Explore` agent with `model: opus` and this prompt:

```
Review each fix a slop cleanup made. Per finding, test: does the fix do what the finding says,
and nothing beyond it? For a finding sized safe, also test: can the fix change what the code
does, in what order, or how it fails? For a fix that deletes code, also test: does a comment
next to the deletion now document nothing, or describe the deleted code?
Repo root: <root>
Check result: <passed | new errors | gate not run: <reason> | no check command>; commands that did not run: <list>
Fixes: <each kept finding: number, size, file, summary, changed lines>
Diffs: <each kept file: `diff -u <snapshot copy> <file>`, or `diff -u /dev/null <file>` for a
new file>
Read each fixed file in full. Return one line per finding:
<n>: ok | beyond the finding — <what> | changes behavior — <how> | orphaned comment — <path:line> | unsure — <reason>
```

- `changes behavior`: a wrong fix. Undo its finding (Check the fixes).
- `orphaned comment`: an incomplete fix. Delete or rewrite the comment as the fixer rule says,
  then complete it as step 3 of Check the fixes says.
- `beyond the finding` or `unsure`: put it into the user question, with the reviewer's reason.

### Report

First ask the user question, when anything needs it: one question per run, batching
`beyond the finding` and `unsure` fixes (keep or undo) and unattributed errors (undo all,
search, keep). Apply the answers (Check the fixes).

List each picked finding as `file:line — one-phrase description (lens)`, grouped: fixed,
not fixed with the fixer's reason, and reverted with the reason. List every unusable report
with its group's files. Add one line with the finding count and the verifier's tokens and tool
calls.

Always end with **1–3 sentences**, plus one when a fix was kept: what changed, the check result (including
`gate not run: <reason>` or `no check command`), the review result, and the snapshot folder's
path. Leave fixes in the working tree for the author's normal commit flow — never commit.
When at least one fix was kept, the extra sentence suggests a second `/deslop` on the same
change, with these fixes in the working tree, since one finder run misses about a third of the
slop that two runs find together. Suggest it only; never start it.
Example:

```
Fixed:
- `src/foo.ts:12` — narration comment restates the loop (comments)
- `src/bar.tsx:30` — one-use alias `d` for `delayMs` (indirection)

Not fixed:
- `src/baz.ts:41` — `try/catch` around a call that can't throw (defensive): the fixer found
  a caller that relies on the swallowed error

Reverted:
- `src/qux.ts:88` — retry loop with no named contract (scaffolding): removing it fails TS2322

Removed a narration comment and an alias in `src/foo.ts` and `src/bar.tsx`; typecheck and lint
show no new errors after the revert; the review found both kept fixes ok. Snapshots:
`<scratchpad>/deslop-<run id>/`. With these fixes in the working tree, a second `/deslop` on the
same change is worth a run: one run misses about a third of the slop that two runs find.
```
