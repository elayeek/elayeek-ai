---
name: fan-out-research
description: Use when one research question covers a corpus too large for one agent to read (sessions, logs, docs), so several analyst agents each read one batch. Use also to compare two groups of a corpus with the same question.
---

# Fan-out research

This skill covers one research question over a corpus that several analyst agents read in batches. An analyst is a subagent that reads one batch and answers the rubric for it. A unit is the item that one answer line covers: one session, one log file, or one doc. The skill sets the preprocess script, the rubric, the batches, the answer files, and the count script. It does not cover how to choose the question.

## 1. Preprocess the corpus with a script

Write a script that reduces the raw data to one small extract per unit. Analysts read extracts only, never the raw dumps.

Done when: each unit has one extract file, and a second run of the script gives the same files.

## 2. Write the rubric file

Write the rubric to a file before you start any analyst. Use this outline. The example question is "how often does the agent retry a command that the user denied?"

```
# Rubric: <the question, in one sentence>

## Unit
What one answer line covers (one session, one log file, one doc).

## Definitions
Each thing to count, with one example that counts and one that does not.
  retry: the agent runs a command again after the user denied it.
    Counts: the user says "no", and the agent runs the same command again, reworded.
    Does not count: the user says "no", and the agent asks a question instead.

## Answer format
One JSON line per unit, with these fields only:
  {"unit": "<id>", "denials": <int>, "retries": <int>, "evidence": "<line reference, or empty>"}
```

- Give each definition one example that counts and one that does not. Two analysts must not read the same term two ways.
- Make the `evidence` field a pointer to the source line, so a reader can check a count. The script does not count it. Make every other field a number or a word from a fixed list. A script cannot count prose.
- In every analyst prompt, write: "Read the rubric at <path> and follow it exactly. Return only the answer lines."
- Choose the analyst model by the rubric. Use `model: haiku` and `effort: low` when every definition is a surface check: the thing is present or absent, or fits a fixed label. Use `model: sonnet` and `effort: medium` when any definition needs judgment: rewording, intent, or cause.
- Use the same rubric file for every group that you compare. A changed rubric makes the comparison invalid.

## 3. Batch by input size

Size each batch by the bytes it holds, not by the number of agents. Give a large extract (about 400 KB) its own batch. Put several small extracts together in one batch.

## 4. Save each report as it lands

Make one answers folder in the scratchpad: the session scratchpad directory if your system prompt names one, else a temporary folder outside the repo. When an analyst returns, write its answer lines to `<answers folder>/batch-<n>.jsonl`, one file per batch. Do this before you read the next report.

Why: in a long session, context summarization loses results that exist only in the conversation.

## 5. Count with a script

No analyst sees the whole corpus. The corpus-level answer to the question comes only from a script that reads every answer file. Write that script during the run, and use it for every total and every rate.

The script must report these problems, and must not skip them:

- a line that is not valid JSON, or that does not match the answer format;
- a unit that has more than one line;
- a unit that has an extract but no answer line.

Each problem means that the batch did not follow the rubric. Run that batch again with the same rubric, save its new file over the old one, and run the script again. Run one batch again two times at most. After that, report the batch as failed, and report its units as missing in the result.

Save the script and its output to the scratchpad, so the numbers survive context summarization.

Done when: the script reports no problems, or each problem it reports is in the result as a failed batch.

## Report the result

- Give each number with its base, for example "retries: 52 in total, in 37 of 200 units".
- Call a number measured only when the script produced it, and name the command. Label every other number an estimate.
- Give the path of the rubric, the answers folder, and the script output.
