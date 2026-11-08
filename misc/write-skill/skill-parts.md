# Skill parts

Detail for the steps in `SKILL.md`. Read only the section a step names.

## Frontmatter

Follow the current Claude Code skill spec at code.claude.com/docs/en/skills. Do not check frontmatter with skill-creator's `quick_validate.py`. That script is for claude.ai upload, and it rejects valid Claude Code fields.
- Fields the spec accepts: `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context`, `agent`, `paths`, `hooks`, `metadata`, `license`, `compatibility`.
- `name`: lowercase words joined by hyphens, verb first.
- `description` plus `when_to_use`: the skill listing cuts them at 1,536 characters. A model-called description loads in every session, so keep it far shorter than that.
- `disable-model-invocation: true`: only the user can call the skill. `argument-hint` shows the user what to type after the slash command.
- `paths`: glob patterns. The skill loads when the agent works on a matching file, for example `paths: "**/SKILL.md"`.
- `model` and `effort`: set them only when the skill needs a specific tier.

Substitutions in the body:
- `$ARGUMENTS`: the full argument text.
- `$N`: one argument by position, counted from 0. `$0` is the first argument.
- `${CLAUDE_SKILL_DIR}`: the skill's own directory. Use it in every pointer to a reference file.

## Size and compaction

- The body has no fixed word budget. The budget that counts is the description of a model-called skill, because it loads in every session.
- The spec advises a `SKILL.md` under 500 lines. A body over about 2,500 words gets a disclosure pass: move behind a pointer what only some cases reach.
- Each pointer names a section of `${CLAUDE_SKILL_DIR}/<file>` and says when to read it.
- Keep each reference file one pointer away from `SKILL.md`. Name each file by its content: `lenses.md`, not `ref2.md`.
- A reference file over about 150 lines starts with a short contents list.
- After a compaction, each skill keeps only its first 5,000 tokens. All skills that come back after a compaction share 25,000 tokens. Put the stop points and the loop state near the top of `SKILL.md`.

## Plugin packaging

- Layout: `<plugin>/.claude-plugin/plugin.json`; `<plugin>/skills/<skill>/SKILL.md`, with its reference files beside it; `<plugin>/agents/<agent>.md`.
- `plugin.json` holds `name`, `version`, `description`, `author`, and `license`.
- The repo's `.claude-plugin/marketplace.json` has one entry per plugin: `name`, `source` (`./<plugin>`), and the same `description` as `plugin.json`.
- Raise `version` in `plugin.json` for every change that ships. A user gets an update only when the version changes.
- Check that both files parse: `python3 -I -m json.tool <file>`.
- Each skill keeps its reference files in its own directory. Skills share no files. One skill runs another only through the Skill tool, as `<plugin>:<skill>`.
- The commit and the push are the user's steps. Each push needs its own approval.

## Agent files

An agent file defines a subagent type that a skill dispatches by name: `<plugin>:<agent>`.
- `description`: what the agent does, and what it does not do. The dispatcher reads it to choose an agent.
- `tools`: the smallest set the task needs. A read-only agent gets no Edit and no Write.
- `model` and `effort`: set them only when the task needs a specific tier.
- `omitClaudeMd: true`: the agent starts without the user, project, and local instruction files. Set it when the prompt gives the agent all it needs. It needs Claude Code v2.1.271 or later.
- The body opens with the role and the task. It states every rule the agent needs, and it ends with the report contract.

## Prompts a skill dispatches

Write each dispatch step with these parts, in this order:
1. The role and the task, in one line.
2. The inputs: for example the repo root, the base commit, the file list, and the reference files to read.
3. Every rule the agent needs. A subagent receives no session context, so paste each rule into the prompt.
4. Fixed text, verbatim, in a fenced block. The step says "verbatim".
5. The output contract: a status set or a field list, plus a length bound. The final message is the report.
6. `model` or `effort`, only when the task needs a specific tier.

A status set names how the agent ended: `DONE`; `DONE_WITH_CONCERNS` (done, with doubts it lists); `NEEDS_CONTEXT` (it needs an answer before it can go on); `BLOCKED` (it cannot go on).

A subagent cannot ask the user. Its prompt tells it to return `NEEDS_CONTEXT` with the question; the skill then asks the user.

When the agents return, check the shape of each report. Give each agent one resume for a shape failure. After that, mark its report unusable and list it in the skill's report.

Dispatch independent agents in one message.

## Loops

A loop repeats a step until a condition holds: for example review, fix, and review again.
- Write the loop as prose that the agent runs.
- State four things: the exit condition, the round cap, the stop points, and the ledger file (the file that records each round).
- A finding that needs the user's decision ends the loop. A loop never approves its own next step.
- Each round runs its checks itself. It does not trust the claim of the prior round.
- Put the loop state near the top of `SKILL.md`, so it stays after a compaction.
- Never write a loop as a Workflow script or as a timer loop (`/loop` with an interval).
- Never write a loop that runs until an open-ended goal is met.

## Vocabulary

Use the word in the right column.

| Avoid | Use |
|---|---|
| utilize, employ, leverage | use |
| verify, ensure, ascertain | check |
| terminate, cease | stop, end |
| execute, perform | do, run |
| inspect, examine | look at, check |
| invoke | call, run |
| instantiate | create |
| initiate, commence | start |
| sufficient, adequate | enough |
| prior to | before |
| subsequent to | after |
| in order to | to |
| in the event of | if |
| provide | give |

## Lint checks

No lint script exists yet. Do these checks by hand on `SKILL.md` and each reference file:
- Frontmatter: only fields the spec accepts. The name is verb-first, lowercase, with hyphens.
- Description: count its characters. A model-called description starts with "Use when". It holds no workflow steps and no owner name.
- Body: count the words with `wc -w`. Over about 2,500 words, do a disclosure pass.
- Vocabulary: search for each word in the "Avoid" column. Replace each hit.
- Capitals for emphasis: none. Acronyms and status words such as `NEEDS_CONTEXT` are fine.
- Dates: none.
- Long sentences: a procedural sentence over 20 words, or a descriptive sentence over 25 words. Split each one.
- Glosses: each opaque ID and each new term has a gloss at its first use.
- Pointers: each `${CLAUDE_SKILL_DIR}` pointer names a file and a section that exist, and says when to read it.
- References: run this search, and look at each hit:
  ```bash
  grep -nE 'ruling [0-9]|write-skill|CLAUDE_PLUGIN_ROOT|~/\.claude|CLAUDE\.md' <files>
  ```
  Each hit is a defect, except `write-skill` inside the write-skill skill. Also flag each file path that does not start with `${CLAUDE_SKILL_DIR}`. A pointer to a rule outside the skill's directory is a defect. A path that the task works on is fine.
- Plugin files: `plugin.json` and `marketplace.json` parse.
