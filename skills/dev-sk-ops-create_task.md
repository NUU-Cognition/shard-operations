---
description: "Create a task in the right place as a task note and an Ops task, linked both ways (flint shard ops task-new), with a named place or a place from ops route, then check the place"
orb:
  - "@v1/nuucognition/session/63260df7-271a-450f-b775-0cdfdedebc26#flint/nuu-flint"
orbh-fleet: ops-command-1021
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start ops` if you haven't already.

# Skill: Create Task

Create one task (or one subtask) in the right place, and check that Ops put it there. The task has two parts, linked both ways: a task note in this Flint (the content) and an Ops task (the state). `flint shard ops task-new` makes both in one run. See [[dev-init-ops]] § Tasks: the Task Note and the Ops Task.

This skill makes the task only. To scope it with the person, use [[dev-wkfl-ops-create_task]]. To create it and do it, use [[dev-wkfl-ops-create_and_do_task]].

# Input

- The task title. Do not end it with a space and one digit: `tasks.create` reads that digit as a rarity and removes it.
- (Optional) A place that the request names: a section, a project, a deliverable, a deployment, or a parent task
- (Optional) The body of the task note, a priority, an owner, a repository, a tag (for an inbox task), a recurrence
- (Optional) The org and the data mode

# Actions

1. **Ground.** Run `ops whoami --json` before the first write. A dev build gives the field `dataMode`. A prod build has no such field: the `ops` on PATH can be the prod build, and a prod build writes to PROD data whatever `OPS_DATA_MODE` says. For DEV data, run the scripts with `NUU_OPS_CLI` set to the dev launcher ([[dev-knw-ops-task_cli]] § Work on Dev). `ops --help` must list `headers`, `route`, `search`, and `section`; when it does not, the build is of before the revamp: stop and report it. Pass `--org <org>` when the task belongs to an org that is not active.
2. **Look before you create.** Find an open task with the same intent: `ops task search "<words of the title>" --json` (check the status of each match). When one exists, do not create a second task: give its address, and stop.
3. **Pick the place.** Use the first rule that applies:
   1. **The request names a place.** Use its flag:

      | Place | Flag of `task-new` |
      |-------|------|
      | A section | `--section <ref>` |
      | The backlog of a project | `--project <ref>` |
      | A deliverable (its main section: the named section) | `--deliverable <ref>` |
      | The inbox of a live deployment | `--deployment <ref>` (then set the tag: step 5) |
      | Under a task (a subtask, in the home of its root) | `--parent <task>` |
      | The master backlog of the org | `--master` |
      | No home | `--unplaced` (also the default when you give no place) |

      A `<ref>` is an ID, an address, a web URL, a title, or a path (`Alpha › v1 › Backend`). Give one place flag only: two give a refusal, and nothing changes.
   2. **The request names no place.** Read the projects note first (`Mesh/(System) Ops Projects.md`, [[dev-init-ops]] § The Projects of This Flint): it names the projects of this Flint. Then run `ops route "<text>" --json`. Read `candidates[]`: `place.kind`, `place.id`, `place.path`, `score`, and `reason`. Take the best candidate that fits the request. Give it with the flag of its kind: `section` → `--section <id>`, `deliverable` → `--deliverable <id>`, `project` → `--project <id>`, `deployment` → `--deployment <id>`. **No place fits** when the list is empty, when the best `score` is below 0.3, or when the reason of the best candidate is only "A recent project". Then do one of these, in this order: (a) ask the operator for the place, when one is there; (b) apply the hint rule of [[dev-sk-ops-place_task]] after the create (the task stays unplaced, or gets `related` links); (c) when the request asks for a new place, make it (`ops project create`, `ops section create <title> --project <p>`), and run `ops route` again. A score from 0.3 to 0.5 is a guess: name the place in the output, so that the operator can move the task.

   `task-new` has no `--route`: read the route first. When you do not know the names of the places, read the map of the org: `ops headers --json`, or `ops search "<text>" --type section,deliverable,project,deployment --json`.
4. **Create the task.** Write the body of the task note to a temporary file outside the Mesh (the sections of the template `tmp-proj-task-v0.2`, with no frontmatter: [[dev-knw-ops-task_model]] § The Task Note). Then:

   ```bash
   flint shard ops task-new "<title>" <place flag> [--repo <name>] [--priority low|medium|high|urgent] [--assign <member>] [--org <org>] --body-file <file>
   ```

   - The output is one JSON document: `number`, `title`, `path` (the task note), `note` (the note address), `noteLabel`, and `ops` (the Ops address, `@v1/<org>/task/<id>#ops`). Keep `ops` and `path`.
   - When `ops` is `null`, the note exists and the Ops part failed. Read `error`, fix the cause, then run the command of `next` (`task-link`). Never run `task-new` again for the same task: a second run makes a second note.
   - The repository of the work: `--repo <name>` adds a `repo` related link.
   - A subtask: `--parent <task>`. Subtasks have one level: the parent must be a root task (`subtask_too_deep`).
5. **Set what `task-new` does not set.** An inbox task: `ops task update <ops address> --tag feedback|hotfix|ongoing|recurring --json`. A recurring task: `ops task update <ops address> --every day|week|month --json`.
6. **Check the place.** Run `ops task show <ops address> --json`. Read `task.homeLabel` (the path of the home, `Project › Deliverable › Section`) and `task.unplaced`. Compare them with the request. When the place is wrong, move the task: `ops task move <ops address> --to <place> --json` ([[dev-sk-ops-move_tasks]]). Do not delete the task and create it again.
7. **On an error**, do not guess:
   - `<kind>_ambiguous` or `place_ambiguous` (exit 2): the error lists the candidates. Run the command of `next` with the ID that fits the request.
   - `deployment_no_inbox`: the deployment is not live. Make it live only when the request asks: `ops deployment status <deployment> live`.
   - An unknown outcome (a network error): the output has `next` (a search) and `ifFound` (a `task-link`). Run the search. When the task exists, run `ifFound`. Never create the task again before that check.

A planning write that makes many tasks for later work in Ops (a deliverable setup, a plan, an inbox triage) can make Ops tasks alone with `ops task create … --json`, one create for each task, in the order they must show. Each such task gets its note when its work starts ([[dev-wkfl-ops-do_task]]).

# Output

- One new task (or subtask): the task note (its path) and the Ops task (its ID, its address, and its place), linked both ways
- With `ops route`: the score and the reason of the place
- A move, when the first place was wrong
