# elayeek-ai

This is where I back up random projects and tools I make for myself. It doubles as a Claude Code plugin marketplace to make it easier to sync back to my Claude.

| Plugin | Description |
|---|---|
| [`elayeek-ai`](./elayeek-ai) | A skill framework: workflow skills that load only when a task needs them |

## elayeek-ai skills

Skills marked "/ only" load only when you type them as a slash command.

**Plan**

| Skill | Use it to |
|---|---|
| `shape-tech-spec` | Turn a settled spec into design decisions, contracts and testing decisions for one repo |
| `shape-plan` | Break an approved tech spec into PR-sized tasks for one repo |

**Build**

| Skill | Use it to |
|---|---|
| `implement` | Build one task test-first on a branch, with a fresh review, to local commits |
| `implement-plan` | Run or resume a `plan.md`: one implementer agent per task, in parallel where the plan allows |
| `tdd` | Build a feature or fix a bug test-first, red-green-refactor |
| `diagnosing-bugs` | Find the cause of a hard bug or regression, then hand the fix to `implement` |
| `finish-branch` | Check the gates, then push and open PRs, keep the branches local, or merge locally |

**Review**

| Skill | Use it to |
|---|---|
| `review-code` | Send a fresh reviewer over a diff; get Critical, Important and Minor findings |
| `receiving-review` | Collect, judge, fix, and reply to review comments on a pull request |
| `deslop` (/ only) | Find AI-authored slop in a change, check each finding, and fix the ones you pick. Uses the `deslop-review-agent` and `deslop-verify-agent` agents |

**Think**

| Skill | Use it to |
|---|---|
| `co-thinking` | Stress-test a plan, decision, or idea through rounds of questions |
| `think-with-me` (/ only) | Start a relentless interview to sharpen a plan or design |
| `think-with-docs` (/ only) | Do the same interview, and write ADRs and glossary entries as you go |
| `codebase-design` | Design deep modules: interfaces, seams, testability |
| `domain-modeling` | Build a project's domain model: `GLOSSARY.md` and ADRs |

**Session and utility**

| Skill | Use it to |
|---|---|
| `ask-elaye` (/ only) | Ask which skill or flow fits your situation |
| `handoff` | Write a handoff file that a fresh session continues from |
| `wait-what` (/ only) | Make Claude re-pitch a message that did not land |
| `fan-out-research` | Answer one research question over a large corpus with several analyst agents |
| `writing-for-agents` | Write or edit skills, `AGENTS.md`, or `CLAUDE.md` |

## How the skills fit

Pick the path by the size of the work:

- One PR, no design decision: `implement`.
- Design decisions in one PR: `shape-tech-spec`, then `implement`.
- Several PRs: `shape-tech-spec`, then `shape-plan`, then `implement-plan`.

Each path ends with `finish-branch`. Not sure which path fits? Run `/ask-elaye`.

## Install

```
/plugin marketplace add elayeek/elayeek-ai
/plugin install elayeek-ai@elayeek-ai
```

Outside a session, use `claude plugin marketplace add …` and `claude plugin install …`.

## Update

Run `claude plugin update`. Auto-update is off by default for this marketplace.

## Release

1. Raise `version` in `elayeek-ai/.claude-plugin/plugin.json`.
2. Commit and push. The marketplace source is GitHub, so a change reaches a machine only after the push.
3. Run `claude plugin marketplace update elayeek-ai`.
4. Run `claude plugin update elayeek-ai@elayeek-ai`.
5. Restart Claude Code.

## Use in a team project

Add this to the project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "elayeek-ai": { "source": { "source": "github", "repo": "elayeek/elayeek-ai" } }
  },
  "enabledPlugins": { "elayeek-ai@elayeek-ai": true }
}
```

## Credits

Some skills are adapted from [mattpocock-skills](https://github.com/mattpocock/skills) and [superpowers](https://github.com/obra/superpowers), both MIT. See [`THIRD-PARTY-NOTICES.md`](./elayeek-ai/THIRD-PARTY-NOTICES.md).

## Other projects

Not in the marketplace.

- [`inline-review`](./misc/inline-review): a mod that shows a file or a git diff in a side pane and lets you leave inline comments the model can read. It needs Claude Code 2.1.287 or later.

  ![inline-review demo](docs/inline-review.svg)
