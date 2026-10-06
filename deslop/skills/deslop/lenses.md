# Deslop lenses

The shared definition of slop for the deslop reviewer (`deslop-review-agent`) and verifier
(`deslop-verify-agent`). The reviewer reads this file in full; the verifier reads the sections a
finding names.

Owned files are the files the dispatch gives: the reviewer's group, or the verifier's whole list.

## scope

Deslop the code this change edited and the code those edits affected. One test decides
every finding: **would this slop exist without the change?** No → in scope, whether or not the
line itself changed. Yes → out of scope.

In scope:
- Slop the change adds: an added line that matches a lens.
- Slop the change causes in lines it did not edit: a comment the change made redundant or
  stale, a sibling convention the change drifts from, existing code the change duplicates.
  The comments lens sets how far the search for stale comments reaches.
- Every line of a comment block the change edited in part. An opaque reference or a stale
  line in the block's unchanged lines is in scope.
- Slop visible only at the level a reviewer reads: the whole function, the whole file.

Out of scope: slop that predates the change and that the change neither touched nor affected.
Leave it, and leave it out of the report. Read wide, flag narrow: read as far as a verdict
needs, and flag only inside the blast radius. Flagging outside it is fishing.

With a base, read each owned file's diff:
`git -C <repo root> diff -M <base> -- <old path> <path>` for a renamed file,
`git -C <repo root> diff <base> -- <path>` otherwise. The diff runs against the working tree,
so uncommitted edits stay in scope. Read an untracked file as entirely added. When the sandbox
blocks a diff, compare `git -C <repo root> show <base>:<path>` (the old path for a renamed
file) with the file on disk. The diff marks what the change edited.

No base means a whole-repo run: read every owned file as entirely added, as you read an
untracked file. The other rules then apply unchanged: every line is in scope; no peer existed
at the base, so the drift lens compares the files with each other; every copy is new, so the
duplication lens applies the rule of three; `cause` never applies.

## conventions

Read the Context files the dispatch gives, when any. Always also
find the repo's own: for each owned file, look in the file's own directory and in each parent directory up to the repo root, and nowhere else, for `CLAUDE.md`, `AGENTS.md`, a coding-guidelines file (`CODING-GUIDELINES.md`, `CODING_GUIDELINES.md`, `coding-guidelines.md`, in any case), `CONTRIBUTING.md`, and `STYLE.md`. Read those, plus the documents they point to.
Also read the repo's linter config, so a finding never contradicts a rule the repo enforces.

A written repo guideline wins over sibling habit and over the comments, drift, and
duplication lenses' own defaults: code that follows it is no finding.

## comments

**comments** — that don't earn their place. A comment earns its place only when it makes the
code more readable to a reasonable reviewer. Code that reviewer already understands from its
own logic and names needs no comment. Judge a comment with the whole function in view, not
the hunk alone. Flag a comment to delete, shorten, or merge it. Judge an earning comment by
what it says. An earning comment is plain and says what the code cannot: a hidden
constraint, a non-obvious invariant, a workaround for an external bug, or a deliberate
shortcut with its known limit and the trigger to revisit it
(`// global lock; per-account locks if throughput matters`). Content decides, not length: an
invariant or constraint takes a line or two, and a comment made only of such lines earns its
place at any length. A comment that lists how the code upholds an invariant (every exit path,
every caller) walks through the code: narration. Match these shapes:
- **Narration** — restates what the code does, walks through it line by line, reads like a
  syntax tutorial, or pads with filler (`// Note that…`, `// basically`, `// simply`).
- **Essays** — multi-line rationale, history, alternatives considered, or design discussion.
  That material belongs in a plan, an architecture decision record, or a README. An
  explanation longer than the code it explains is an essay, unless it is made only of the
  parts the paragraph after Test doc comments keeps.
- **Opaque references** — any ticket, issue, or PR ID, any index from a plan or spec, and any
  task provenance: `// ABC-123: ...`, `// TODO(ABC-123)`, `// per D5`, `// step 3 of the plan`,
  `// added for the X flow`. The reader cannot decode them from the code; they belong in the
  commit message and PR description. TODOs get no exception. A `file:line` pointer is an
  opaque reference: report it, with the symbol the line points at today as the suggested
  replacement. A file or symbol reference is not one. The shape also covers a ticket, PR, or
  plan ID in a file, test, function, or class name the change adds: report it, with a
  suggested name.
- **Name patches** — a comment that says what a variable, parameter, or function holds or
  does. The name must carry that meaning. Only an extreme case earns such a comment, where no
  reasonable name can carry it. A name patch finding carries a suggested name in `summary`;
  the `### renames` block of `## size` sets its size.
- **Scattered explanation** — one block explained by comments strewn through its lines. The
  explanation belongs in one comment at the top of the block, plus at most a short note on
  the few lines a reviewer would still stumble on.
- **Stale** — an existing comment the change made false: it describes behavior, a name, or a
  parameter the change altered. Its summary names both readings: "comment outdated, or change
  is wrong". An **orphan** is a stale comment whose code the change deleted.
- **Redundant** — an existing comment that is still true, but that the change made
  unnecessary: a rename now carries its meaning, or simpler code now says it.

Comments include doc comments (a docstring, a JSDoc block, or the language's equivalent) and
a doc comment's argument and return entries. For stale and redundant, check the comments in
the function or class that encloses each changed hunk, plus any comment in owned files that
names a changed or removed symbol.

Neighbors set the lead for doc-comment form, not content: the format the repo uses (argument
and return sections, one-line summaries, or no doc comments) is its lead, and a new function
that follows it is no finding. Narration, essays, opaque references, and name patches stay
slop whatever the neighbors do. A module's opening doc comment (for example a Python module
docstring) earns its place when it says, in a line or a short paragraph, what the code cannot
show: the module's role, or a constraint that spans the module. History, design discussion,
and alternatives are an essay; a list of the module's functions or steps is narration;
provenance is an opaque reference.

Check every comment and doc comment the change adds or edits, one by one: module, class,
function, test, and test-fixture function doc comments in source and test files alike. A test
file gets no lighter bar. Three forms pass a quick read and are still slop. Each one is a case
of an existing shape: name that shape in `summary`.
- **Change-relative text** — a comment that compares the code with this change or with the
  code's own earlier versions: "this change must not regress", "so existing tests keep working
  without change", "now returns X", "no longer raises", "previously this used Y". The merged
  code has no change to refer to. Words such as "now" and "no longer" count only when they
  compare the code with its own past, never in a statement about runtime state ("expired
  tokens are no longer accepted") or about an external system's past that the code must still
  handle. A compatibility comment that names its shipped contract and removal plan
  (`## scaffolding`) is not change-relative. Shape: Essays, even at one line.
- **Mixed doc comments** — an earning line, such as an invariant, set among lines that walk
  through the branches or restate the test name. The earning line does not carry the rest:
  flag the comment to shorten, and quote the line to keep in `summary`. Shape: Narration (the
  lines to cut).
- **Test doc comments** — a test or test-class doc comment that restates the test name, walks
  through the test's steps, or tells how the test came to be (a bug report, a ticket, this
  change). A line that names the behavior or invariant the test guards, when the test name
  does not, earns its place, as any invariant does. Shape: Narration for a restated name or a
  step walk-through; Essays or Opaque references for how the test came to be.

These forms, and the Essays and Narration shapes, never cover the part of a comment that
states an invariant, a hidden constraint, or the failure a guard or test prevents, when
neither the code it documents nor that code's own name shows it. That part stays at any
length, in a test doc comment as anywhere else. Flag only the other text that matches a form
or shape, and quote the part to keep in `summary`. A comment made only of such parts is no
finding under these forms, Essays, or Narration. Three things stay slop inside such a part;
flag that clause alone, and keep the rest of the part: a comparison of the code with its own
past (Change-relative text), provenance or how the code came to be (Opaque references,
Essays), and a statement the change made false (Stale).

The comments lens skips directive comments: comments a tool reads as an instruction or a type, for example `// eslint-disable…`, `// @ts-expect-error`, `// prettier-ignore`, `# noqa`, and JSDoc types in `.js` files.

## defensive

**defensive** — abnormal defensive code: `try`/`catch`, null/undefined guards, or other
checks that are out of step with the surrounding module's own conventions, or that protect
against a state the surrounding types/contracts already rule out.

## casts

**casts** — type-laundering casts: `as any`, `as unknown as T`, widen-then-assert flows,
including a cast split across two statements; in Python, `typing.cast(Any, …)` and bare
`# type: ignore`.

## indirection

**indirection** — redundant indirection: intermediate variables or one-use helper functions
that add no domain meaning, reduce no duplication, and simplify no control flow.

## scaffolding

**scaffolding** — unexplained compatibility scaffolding: shims, aliases, retries, or fallback
branches with no named shipped contract and no stated removal plan.

## dead

**dead** — code that does nothing, added by the change or left unused by it (`cause` at the
edit that removed its last use). Removing it leaves the code shorter and clearer, and loses
nothing a reader needs. The kinds, and only these:
1. An unused import.
2. An unused parameter, a test fixture parameter included.
3. An unused local variable, or an assignment overwritten before any read.
4. Unreachable code: statements after `return`, `raise`, `break`, or `continue`, and a branch
   under a literal-constant condition (`if False:`). A guard against a state the types rule
   out is `defensive`, not dead.
5. A no-op statement: `pass` in a non-empty block, `x = x`, a closing `return None` in a
   function that never returns a value, a bare expression statement with no call (a docstring,
   a lone `...` body, and a directive string such as `'use strict'` excluded).
6. A function, class, or constant that nothing calls, imports, or reads, when the change added
   it or removed its last use. A repo-wide grep for the name, string and reflection uses
   included, must find nothing.

A block that runs but whose result nobody uses is out of this lens. An alias or shim kept for
compatibility is `scaffolding`, not dead.

The repo's linter goes first. Skip a kind only when all three hold: the repo's linter config
enables a rule for it; CI, a pre-commit hook, or a lint script runs that linter; and that run
covers the file (check its paths, `exclude`, and `per-file-ignores`). Look for the run in CI
workflow files, `.pre-commit-config.yaml`, and the scripts in `package.json`, `Makefile`, or
`pyproject.toml`. A config nothing runs does not count. For example, ruff's defaults run
unused imports (`F401`) and unused locals (`F841`), but not unused parameters (`ARG`).

Exempt: a parameter, local, or import whose name starts with `_`, and a bare `_`; a parameter
a signature forces (an override, a Protocol or abstract method, a framework callback; pytest
forces no test signature: it injects only the fixtures a test names); a fixture parameter
whose fixture has a side effect; a line that a linter or type-checker suppression covers, on
the line itself, the line above, or for the whole file (for example `# noqa`,
`# type: ignore`, `# pyright: ignore`, `# pylint: disable`, `// eslint-disable…`,
`// @ts-ignore`, `// @ts-expect-error`); a name listed in `__all__`.

## drift

**drift** — added code that departs from a convention its siblings agree on. Siblings are
the surrounding file, plus peer files in the same directory when the new code is their peer
(another handler, migration, or test file). Drift covers these dimensions of code, and only these, plus the wording of prompt and template text against its sibling prompts. Prompt findings are `review`. The dimensions: naming, control flow, imports, signature shape
(parameter order, options object versus positional, sync versus async, return style),
error-handling style (throw versus result, error types), and export and module structure. A
convention exists only where the siblings agree: mixed siblings mean no finding.

**Drift: which peers set the lead.** Read up to 3 peers, the ones most like the new file
(another handler, another test of the same source file). Stop as soon as two disagree. Peers
that existed at the base set the lead. Mixed peers mean no finding. When no peer existed at the
base, compare the change's new files with each other. Disagreement among them is a `review`
finding. This rule sets the drift lens's lead only. The other lenses still compare the change's
files with each other and with the repo.

Report naming drift with the spelling the repo's lead uses; the author decides. A name that
follows the repo's own lead (such as `user_id` mirroring a SQL column the code already spells
that way) is no finding. A change that moves part of the code to a new style gets one
**partial migration** finding that names the old style, the new style, and the places left
on the old style.

## duplication

**duplication** — added code that repeats logic that already has a home, or that repeats
itself. "Existing" means present at the base.
- **Reinvention** — new code does what an existing function, type, or constant in the repo
  already does. It applies only when the home existed before the change. Flag the first copy:
  the home exists, so the fix is to use it.
- **Reinvented platform** — new code does what the standard library, a native platform
  feature, or an installed dependency already does. Flag the first copy.
- **Copy-paste** — the same logic in several places. Follow the **rule of three**: a second
  copy is fine, a third is a finding. Copies the change adds follow it too: two are no
  finding, a third is. A change that adds a third copy of an existing pair is in scope. The
  trigger is a repeated shape, the same ordered work, not lines that happen to look alike. A
  helper function defined in a test file follows the rule of three: report a third copy with
  the suggestion to move it to a shared home, as `review`. Inline setup inside a
  test body stays exempt: tests repeat setup so each one reads alone.

Search limits. Only a definition at the top level of a file triggers a search: in source files,
functions, classes, and constants; in test files, helper functions. The functions the test
runner collects as tests never trigger a search (for example pytest's `test_…` functions).
Search with one grep for the name, one grep per distinctive call it makes, and one look in
the repo's shared homes (for example `utils`, `lib`, `helpers`, `common`; for tests, the test
runner's shared-fixture file, such as `conftest.py`). Stop at the first match that does the
same job; no match, no finding. Count copies from those grep results only: two older copies
found means the new one is the third.

## tests

**tests** — hollow tests. A test earns its place only when you can name a bug in our code
that it catches and that no other test or static check catches. That is the lens's purpose,
not a check to run on every test. A test is **hollow** when it matches one of these shapes.
Flag a test only when it matches a shape and you hold that shape's evidence; a test that
matches no shape passes.
- **Testing the library** — it checks framework or library behavior, not ours. Evidence:
  the library behavior it really checks.
- **One rule, many cases** — every case takes the same path through our code, so no input
  could make one pass and another fail. Evidence: the one case that covers the rest.
  Boundary cases and cases that reach different branches are fine.
- **Covered elsewhere** — another test in the same file, or another test of the same source
  file, already catches the same bug. Evidence: the covering test.
- **Standing in for a static check** — it restates a type annotation, or checks what a
  one-line guard such as `@enum.unique` would enforce. Evidence: the guard. Note in the
  summary when the repo runs no type checker.
- **Testing its own setup** — it asserts that the fixture or registry it built exists.
  Evidence: the setup it checks.
- **Mock tautology** — it configures a mock to return a value, then asserts that value, with
  none of our logic in between. Evidence: the mock setup line and the echoing assertion.

An odd or unrealistic input is not a shape: judge a test by what it catches, not by how its
input looks. In scope: tests the change adds, plus an older test a new test now covers
(`cause` at the new test). Put the shape's evidence in `evidence`; a covering test also goes
in `duplicates` as `<path>::<test>`.
Report one finding per file or test class, anchored at the first hollow test, naming each
hollow test and its shape. Test docstrings fall under the comments lens.

## size

Mark every finding with how much attention its fix needs: `safe` or `review`. `safe` can be
applied without reading it; `review` needs the user's judgment. Size says nothing about worth;
whether a finding earns a fix is its lens's bar. The user picks findings knowing their size,
and a fixer then fixes every finding picked.

### safe

A fix is **safe** only when it passes all three tests:

1. **Behavior-neutral** — it cannot change what the code does, in what order, or how it fails:
   evaluation order, error surfacing, logging, and timing stay the same, and it removes no code
   whose necessity your reading cannot confirm.
2. **Mechanical** — it has one obvious correct result: no choice among options, and no
   information lost. When the siblings agree on a style, that style is the one result.
3. **Contained** — every edit it needs lies in owned files.

Safe examples: deleting a narration comment or a redundant comment; cutting an opaque
reference out of a comment; deleting an orphan that describes only the deleted code; fixing a
parameter's name in the function's documentation of its arguments, whatever form the language
uses, when the change renamed exactly one parameter and the mapping is certain (the entry's
description is judged as normal text, and a removed parameter's entry is an orphan); removing
a pure-alias variable used exactly once with no statement between its assignment and its use;
dropping a `catch` block that only rethrows the same error; tightening an `as any` to the type
already unambiguous from context; deleting an unused import, an unused local, a statement after
`return`, `raise`, `break`, or `continue`, or a no-op statement that the change added or left
unused; dropping an unused fixture parameter whose fixture has no side effect (`monkeypatch`,
`capsys`). Deleting a comment, or lines of one, that holds only history, provenance, or
narration, when the comment is not stale: history belongs in the commit message, not the code.

### traps

These fail a test, so they are `review`:
- A `catch` that logs before rethrowing: removing it removes a log line (behavior).
- Reordering imports: in JavaScript and Python, import order is side-effect order (behavior).
- `forEach` → `for…of`: it changes how `await` and `return` behave (behavior).
- Replacing code with an existing helper that differs at the edges: null handling, error type,
  or ordering (behavior).
- Editing prompt or template text: an LLM or a template renderer consumes it (behavior).
- Deleting a test: it removes a check, and whether that check is needed is a judgment
  (mechanical).
- A comment fix that rewrites, merges, or moves comment text (a scattered explanation into one
  comment), or that removes content a document may need (design rationale, alternatives
  considered): the wording is a choice (mechanical).
- A stale comment, including a stale description in a doc comment's argument and return
  entries, and an orphan that still partly describes live code: either the comment is outdated
  or the change is wrong, and only the author knows which (mechanical).
- An unused import that is the file's only import of a module whose top level does more than
  define names (it registers, patches, or configures), or a name re-exported from
  `__init__.py` (behavior).
- An unused local whose right-hand side has a side effect: the call must still run (behavior).
- Dropping an unused parameter of a function that code calls: the signature and every caller
  change (contained).
- Deleting an unused function, class, or constant: dynamic use can escape the grep (behavior).

If any of the three tests needs a guess, the finding is `review`.

### renames

Picking a name is a choice, so a rename fails the mechanical test. Every finding that needs a
rename carries a suggested name in `summary`. Apply these rules in order:

1. A name patch whose name already carries its meaning: the fix deletes the comment. Safe.
2. A case-only rename (naming drift), with the spelling the repo's lead uses: `review`.
3. A name patch that needs a new name: the fix renames every reference and deletes the
   comment. Safe only when all of these hold:
   - The symbol is a local variable, including a lambda or arrow-function parameter.
   - It is declared on an added line, and every reference lies in owned files.
   - The suggested name carries the whole comment and follows the case the siblings agree on.
   - A grep for the old name as a string finds no template, string-key, or reflection use.
   - `grep -w <suggested name> <file>` finds nothing.
4. Every other rename: `review`.

Traps for renames:
- Renaming a symbol that a template, string key, or reflection can reach (`getattr`,
  `locals()`, a Vue or Svelte template): the typecheck cannot see the break (behavior).
- A change to a signature, an export, or an exported name: callers outside owned files must
  change too (contained).
