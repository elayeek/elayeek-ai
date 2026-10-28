---
name: write-skill
description: "Use when you write a new Claude Code skill, revise a skill, or edit a reference file or agent file that a skill ships. Gives the steps to write a skill as a standalone procedure."
paths: "**/SKILL.md"
---

Write or revise one Claude Code skill: its frontmatter, steps, reference files, agent files, and dispatched prompts. A skill is a procedure, like a prompt: the steps an agent does for one task. Instruction files that load in every session are out of scope.

Read one section of `${CLAUDE_SKILL_DIR}/skill-parts.md` when a step names it.

## Stops

Stop and ask the user at each point below. Ask all questions of one stop in one message, then end the turn.
- The session does not settle the task's inputs, steps, or output.
- An outward step: a push, a post, a publish, an upload, a delete, a remote write. Do it only when the user's words ask for it.
- The test run shows a failure. The user decides each fix.

## Steps

### 1. Find the task
- New skill: start from a real session that did the task. Collect the inputs, the steps in order, the output, the context the user gave more than once, and the corrections.
- Write a skill only for a task that recurs. Write steps for many future runs, not the story of one run.
- Revision: read the transcript of the failed run. Use the agent's own explanation only as a hint. Fix the step for the whole class of input.
- Delete old content. Git keeps the history.

### 2. Copy before you revise
Before the first edit, copy each file you will change into a scratch folder outside the repo. Use the scratchpad or `mktemp -d`. The copy is the test baseline and the way back. Keep the skill's name.

### 3. Set the frontmatter and the scope
Read `skill-parts.md`, "Frontmatter".
- A model-called skill is one the agent can load on its own. Choose it only when an agent or another skill must reach the skill.
- Otherwise set `disable-model-invocation: true`, and give it a one-line description for the user.
- Name the skill with a verb-first imperative: `write-skill`, not `writing-skills`.
- Start a model-called description with "Use when ...". Give one trigger per case, and say what the skill is in one clause.
- Never put the workflow steps in the description. Why: an agent that reads a step summary follows it and skips the body.
- Write no synonyms for one case, no sentence that urges use, and no owner name.
- Put "when to use" text only in the description. Open the body with its scope: what it covers and what it does not.

### 4. Write the steps
Follow "Writing standard" below in every line.
- Key each step to a condition the agent can observe: "When X, do Y." End it with a criterion the agent can check.
- After a critical step, check, fix, and check again, at most 3 rounds. If the check still fails, stop and give the user the failing check.
- Lead with the positive target. Write a "Never" line only for a hard limit with no positive form, and pair it with the target.
- Add a "Why" line only where the agent must extend the step to cases you cannot list. Write no table of excuses.
- State a decision with several branches as a numbered list of conditions or a table. Use no flowcharts.
- Show each output shape with a real example. A final report puts the verdict first and uses short labels.
- Make one todo per step. Run a step that needs exhaustive work (find every X) in its own subagent, so later steps cannot rush it.
- Move deterministic work into a script. Say whether the agent runs or reads it, and give the exact command.
- Give each number the command that measured it, or mark it "estimate".
- Cut what a capable agent already knows. Point to the environment (`--help`, a config file); do not restate it. Delete a sentence that changes nothing.
- Keep inline what every case needs; move behind a pointer what only some cases reach. Read `skill-parts.md`, "Size and compaction".

### 5. Make the skill standalone
State every rule the skill needs in its own text, at the step where it applies. The skill must work on a bare Claude Code install.
- Point only to the skill's own reference files, as `${CLAUDE_SKILL_DIR}/<file>`. Why: a rule in another file can change or be absent.
- Never point to write-skill, a rulings list, a glossary, or a shared file under `${CLAUDE_PLUGIN_ROOT}`.
- Never point to the user's home config (`~/.claude`), `CLAUDE.md`, or any other file outside the skill's own directory.
- To run another skill now, write: "Call the Skill tool with `<plugin>:<skill>`." One skill per call. The call runs that skill; it lends no rules to this one.
- Copy each shared runtime term, word for word, into each skill that uses it: for example the severity scale Critical, Important, Minor. Once a glossary of shared terms exists, the lint checks each copy against it.
- Give no rule a number, and cite no rule by number.
- Put every rule a subagent needs into its prompt. A subagent receives no session context.

### 6. Mark outward steps, stops, and loops
- Mark each outward step: a push, a post, a publish, an upload, a delete, a remote write. It stops for approval unless the user's words asked for it.
- At each stop and outward step, close each known second path by name: "by another path", "in any form".
- Mark each step that overwrites work. It copies the file aside first.
- Put a commit and a push in separate steps.
- Name each stop for a user decision: a choice the inputs do not settle, a scope check before costly work, an outward step.
- When the skill repeats a step until a condition holds, read `skill-parts.md`, "Loops".

### 7. Keep the state on disk
- After a compaction, a skill keeps only its first 5,000 tokens. Put the stop points and the loop state near the top.
- Write to disk what the run must not lose: a loop ledger, a snapshot folder, each subagent report as it lands. Name each path.
- When the user says to wait before an action (a hold), put the hold in the task list.

### 8. Write the dispatch steps
For each dispatch step, read `skill-parts.md`, "Prompts a skill dispatches". For a new agent file, read "Agent files".

### 9. Check and ship
1. Do the checks in `skill-parts.md`, "Lint checks". Fix each hit.
2. Dispatch one fresh agent to run one real task with the skill, with the real tools on a real input. You may set its model.
3. Read the transcript of that run, not only its final message. A stated choice ("I would do B") is no evidence.
4. Stop at each failure: give the user the failure and its transcript line.
5. Add a targeted test only after the skill fails in real use. Give each variant at least 5 runs, plus a control run with no skill.
6. Raise the plugin version: read `skill-parts.md`, "Plugin packaging". Commit and push only when the user asks, each in its own step.

## Writing standard

Write in controlled language (simplified technical English).
- Procedural sentences: at most 20 words. Descriptive sentences: at most 25 words. One idea per sentence.
- Use the active voice and simple tenses only. Use the imperative for every instruction.
- Put no more than three nouns in a row. Use one term per concept, never a synonym.
- Use no gerund as a noun or an adjective: "procedure to clean", not "cleaning procedure". Use simple prepositions.
- Never drop "not", "never", "no", "only", or "except". Never invent an abbreviation.
- Gloss each opaque ID and each new term at its first use.
- Write no filler and no florid language. Use no capitals for emphasis and no `YOU MUST`.
- A well-known leading word is fine: a short concept that anchors a behavior, such as "fog of war". Gloss a new one.
- Use the words in `skill-parts.md`, "Vocabulary".

## Report

Line one is the verdict. Example:
```
New skill triage-alert is ready; the test run passed.
Files: SKILL.md (1,140 words), triage-rules.md (420 words)
Checks: lint checks pass
Test run: passed; transcript <scratchpad>/triage-test.jsonl
Failures: none
```
When you could not dispatch the test run, write "Test run: owed" with the reason. List each failure with its transcript line.
