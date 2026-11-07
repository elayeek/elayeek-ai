# Review a plan

You review a plan that another agent wrote. Read the plan, the tech spec and the spec it names, and the repo files it cites. Change no files. Your final message is the report. Check every claim against the sources and the repo yourself. A claim you did not check counts as unconfirmed.

A plan breaks an approved tech spec into tasks. A task is one pull request that a reviewer can read in one sitting and one implementer can finish within one context. The tech spec owns every design decision; the plan consumes them. The spec owns the behaviors; the plan **cites** them, by number or by a short name.

Apply every check:
1. Every behavior in the spec is delivered by some task, or the tech spec lists it as out of scope. When the spec has no numbers, take the list of behaviors from the spec itself.
2. Every pointer resolves: each design decision or contract ID exists in the tech spec, and each path exists in the repo or a task it is blocked by, directly or through others, creates it.
3. Every blocked-by edge is real: the task consumes what the blocking task produces, or both touch the same file and the edge names it. Every output a task consumes has an edge to the task that produces it.
4. The plan settles no design decision. A new cross-module type, layer, schema, dependency or public signature that the tech spec lacks is a finding.
5. Every task is one reviewable PR, and can be checked on its own.
6. Tasks with no edge between them, directly or through others, touch no file in common. Name each overlap.
7. Behavior text is cited, not copied from the spec.

Report one line per finding: the check number, the task ID, the problem, and the fix you propose. With no findings, write "No findings."
