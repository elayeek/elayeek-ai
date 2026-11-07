# PR title, body and review comment

When the repo has a PR template (`.github/pull_request_template.md`, or a file under `.github/PULL_REQUEST_TEMPLATE/`), use it instead of the body below. Keep the title rule and the review comment.

## Title

Follow the convention of the repo's recent PR titles. With none, use no repo tag and no task number:
- A task PR: `[<ticket>][<module>] <what it does>`. Leave out `[<module>]` when the PR changes several modules equally.
- The feature branch PR: `[<ticket>][feature] <the story>`.

## Body

The body is the commit message when the branch is squash-merged. Write it for a reader who meets this change in the history a year from now. It describes the change as it stands, not how it got there: no iteration or fix history, no test counts or gate results, no checklists, and no code overview a review bot already writes.

```markdown
## Summary

<What changed and why, in the domain's words. The behavior before and after, in one or two sentences.>

<Optional: one small sketch that makes the change clear: a diff of a call tree, a file layout, a state flow or a message.>

<One line of reasoning for each choice a future reader would question.>

## Merge Danger

**Door:** <one-way | two-way>

**Blast Radius:** <one or two words>

<Optional: what could break, and for whom.>
```

- **Sketch**: pick the smallest view that shows the key point. Use a `diff` block when the shape already exists and the point is what changes. Leave it out when the prose is enough.
- **Door**: two-way when the change rolls back cleanly. One-way when undoing it needs a migration, a data repair, or a change in other services or clients.
- **Blast radius**: who or what the change can affect, such as a screen, an endpoint, a job, or other services.
- **The feature branch PR**: the same template, at the level of the whole story.

## Review comment

Post one comment on each PR for what matters only while it is open. Leave out a part that has nothing in it.

```markdown
**Stack:** <base branch>; <PR below, or none>; <PR above, or none>

**To confirm:**
- <each "decided, please confirm" decision still open>

**Open questions:**
- <each held question, with its mark>

🤖 Written by Claude Code on behalf of elaye
```

For the feature branch PR, the comment lists the task PRs in merge order with their states, and the release order from the tech spec.
