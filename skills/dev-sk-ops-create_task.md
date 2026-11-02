---
description: "Create an Ops task in the right place (a named place, the route decision, or ops route first), then check the printed address and place"
orb:
  - "@v1/nuucognition/session/63260df7-271a-450f-b775-0cdfdedebc26#flint/nuu-flint"
orbh-fleet: ops-command-1021
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start ops` if you haven't already.

# Skill: Create Task

Create one task (or one subtask) in the right place, and check that Ops put it there.

# Input

- The task title. Do not end it with a space and one digit: `tasks.create` reads that digit as a rarity and removes it.
- (Optional) A place that the request names: a section, a project, a deliverable, a deployment, or a parent task
- (Optional) A body, a priority, an owner, a tag (for an inbox task), a recurrence
- (Optional) The org and the data mode

# Actions

1. **Ground.** Run `ops mode` and `ops whoami --json`. Read the `build mode` and the `data mode` lines of `ops mode` before the first write: the `ops` on PATH can be the prod build, and a prod build writes to PROD data whatever `OPS_DATA_MODE` says. For DEV data, use the dev launcher (`OPS_DATA_MODE=dev node <monorepo>/apps/cli-ops/bin/ops.js …`; see the init § Prerequisite). `ops --help` must list `headers`, `route`, `search`, and `section`; when it does not, the build is of before the revamp: stop and report it. Pass `--org <org>` on each command when the task belongs to an org that is not active.
2. **Pick the place.** Use the first rule that applies:
   1. **The request names a place.** Use its flag:

      | Place | Flag |
      |-------|------|
      | A section | `--section <ref>` |
      | The backlog of a project | `--project <ref>` |
      | A deliverable (its first open section) | `--deliverable <ref>` |
      | The inbox of a live deployment | `--deployment <ref>`, with `--tag feedback\|hotfix\|ongoing\|recurring` |
      | Under a task (a subtask, in the home of its root) | `--parent <task>` |
      | The master backlog of the org | `--master` (also the default when you give no place) |
      | No home | `--unplaced` |

      A `<ref>` is an ID, an address, a web URL, a title, or a path (`Alpha › v1 › Backend`). Give one place flag only: two give a usage error (exit 2).
   2. **The request names no place, and you must see the choices first** (the text is short, or it can fit two projects). Run `ops route "<text>" --json`. Read `candidates[]`: `place.kind`, `place.id`, `place.path`, `score`, and `reason`. Read `model`: `jev` (the decision model) or `text` (the text match only). Take the best candidate that fits the request. Give it with the flag of its kind: `section` → `--section <id>`, `deliverable` → `--deliverable <id>`, `project` → `--project <id>`, `deployment` → `--deployment <id>`. **No place fits** when the list is empty, when the best `score` is below 0.3, or when the reason of the best candidate is only "A recent project" (the route found no word of the text in that place). Then do one of these, in this order: (a) ask the operator for the place, when one is there; (b) use `--master` (the master backlog), and say so; (c) when the request asks for a new place, make it (`ops project create`, `ops section create <title> --project <p>`, then `ops project context set <p> "<what belongs here>"`), and run `ops route` again: the new place must now be the best candidate. A score from 0.3 to 0.5 is a guess: name the place in the output, so that the operator can move the task.
   3. **The request names no place, and the text says clearly what the task is about.** Add `--route` (or `--route "<other text>"` to route on a text that is not the title). Ops puts the task in the top place of the route decision. Read `routed.score` in the output: below 0.3 is no fit, and below 0.5 is a guess (see the rule of step 2.2); move the task when the place is wrong.

   When you do not know the names of the places, read the map of the org first: `ops headers --json` (each project, deliverable, section, and deployment with its address), or `ops search "<text>" --type section,deliverable,project,deployment --json`.
3. **Create the task.**

   ```bash
   ops task create "<title>" <place flag> [--body <text> | --body-file <path>] [--priority low|medium|high|urgent] [--assign <member>] --json
   ```

   - A subtask: `--parent <task>`, or `ops task subtask add <parent> "<title>" --json`. A tree has at most 6 levels below its root (`subtask_too_deep`).
   - A recurring task: `--every day|week|month`. Its next copy comes in the same place when it is done.
   - The repository of the work: `--repo <name>` adds a `repo` related link.
   - For many tasks in one place, run one create for each task, in the order they must show. Do not use `--top` for a list: it writes a second gesture for each task.
4. **Check the output.** The JSON has these fields:

   | Field | Check |
   |-------|-------|
   | `id`, `address` | Keep both. The address is `@v1/<org>/task/<id>#ops`. |
   | `place` | `{kind, id, title, path, address}`: the place that you gave, or that the route picked |
   | `sectionId` | The section that holds the task (for `--section`, `--project`, `--deliverable`, and `--deployment`) |
   | `title` | The stored title. It is shorter when the title ended with a digit. |
   | `routed` | Only with `--route`: `{op, model, score, reason, candidates}`. With no candidate, `place.kind` is `master`. |

   The text output (with no `--json`) has the same facts on these lines: `created task <id>  <title>`, the address, `in <place>`, `section <id>  <path>`, and `routed by <model> (score <n>): <reason>`.
5. **Fix a wrong place at once.** Compare the place and the section path with the request. When the place is wrong, move the task: `ops task move <address> --to <place> --json` ([[dev-sk-ops-move_tasks]]). Do not delete the task and create it again.
6. **On an error**, do not guess:
   - `<kind>_ambiguous` or `place_ambiguous` (exit 2): the error lists the candidates with their `kind:<id>` forms. Run the command again with the ID that fits the request.
   - `deployment_no_inbox`: the deployment is not live. Make it live only when the request asks: `ops deployment status <deployment> live`.
   - Exit 4 (network): the create can have landed. Before a second create, search for the title: `ops task search "<title>" --json`.

# Output

- One new task (or subtask) with its ID, its address, and its place (the section path)
- With `--route` or `ops route`: the model, the score, and the reason of the place
- A move, when the first place was wrong
