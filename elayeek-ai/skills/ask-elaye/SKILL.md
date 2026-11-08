---
name: ask-elaye
description: Ask which elayeek-ai skill or flow fits your situation. A router over the skills in this plugin.
disable-model-invocation: true
---

# Ask Elaye

Name the situation, get the skill. Answer in chat.

Before you describe a skill beyond its line here, read that skill's SKILL.md. The lines here are for orientation and go stale.

## Main flow: idea → ship

1. **`shape-spec`** turns an idea into a spec. Not built yet: settle the idea with `co-thinking`; `shape-tech-spec` takes that conversation, a ticket or a spec document as its spec.
2. **`shape-tech-spec`** turns a settled spec into design decisions, contracts and testing decisions for one repo.
3. **`shape-plan`** breaks an approved tech spec into PR-sized tasks.
4. **`implement-plan`** runs every task of a plan through `implement`, one implementer agent per task, then reviews them together.
5. **`finish-branch`** takes the built branches to pull requests, a local merge, or keeps them local. Each step waits for your word.

**`implement`** builds one task test-first with a fresh review, to local commits. The task is a plan task, a tech spec, or an ask agreed in the conversation with no documents. `implement-plan` calls it per task; call it yourself for a single task.

## On-ramps

- **A bug** → `diagnosing-bugs`: a diagnosis loop for hard bugs and performance regressions.
- **An unclear idea, or a design to settle** → `co-thinking`, the interview that stress-tests a plan. You start it by name with `think-with-me`, or with `think-with-docs`, which also writes ADRs and a glossary as it goes.

## Standalone and reference

- `handoff`: write a file a fresh session continues from.
- `fan-out-research`: scan a corpus too large for one agent with several analyst agents.
- `review-code`: a fresh agent reviews a diff against its intent and reports findings by severity; it fixes nothing.
- `receiving-review`: handle PR review comments, chat objections or reviewer findings.
- `deslop`: find AI-authored slop in a change, grade each finding, then fix the ones you pick.
- `wait-what`: the last message did not land; the agent re-pitches it.
- `tdd`: build test-first, one red-green slice at a time.
- `codebase-design`: deep-module vocabulary for a module's shape.
- `domain-modeling`: sharpen the project's domain language, glossary and ADRs.
- `writing-for-agents`: reference for writing documents agents read.

## Phase boundaries

At the end of a chunk of work you choose: continue, `/clear`, `handoff`, a subagent, or `/compact`. Read [PHASE-BOUNDARIES.md](PHASE-BOUNDARIES.md) for the ordered questions.
