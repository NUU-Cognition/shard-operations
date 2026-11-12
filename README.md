# Operations

This shard lets an agent work in NUU Operations through the `ops` CLI. The entry point is the main skill `sk-ops-use_operations`. The shard gives these jobs:

- Tasks in two parts: a Flint task note and an Ops task, linked both ways, with the task workflows.
- The projects note of the Flint: `Mesh/(System) Ops Projects.md`.
- Images and videos in Updates: `ops media`.
- Projects, deliverables, sections, tasks and subtasks, and task groups.
- The review queue and the people looped into a task.
- Trident streams and workspaces.
- Shares, holds, calendars, and events.
- Deployments and their inboxes.
- The route decision and addresses.
- Deadlines, blockers, plans, and the plan canvas.
- Notepads and day plans.
- `ops query` for any other read.

The source moved from the NUU Operations Flint to the NUU Flint on 2026-10-21 (ops-command-1021). Version 0.2.0 follows the revamp of Ops: sections in four homes, no closer, the backlog as a section, subtasks, the task map, abstract deployments with an inbox, the hidden context, `ops headers`, `ops route`, and `ops search`.

Version 0.3.0 (ops-cli-publish-1023) adds the main skill `sk-ops-use_operations`: an agent with no other context can do Operations work with it.

Version 0.8.0 (storage-1112) merges the Tasks shard into Operations: the task workflows (create task, scope task, do task, create and do task, review task, do task group), the task skills, the task knowledge, and the task scripts `task-new`, `task-link`, and `task-sync`. Each task that the shard makes has a task note and an Ops task, linked both ways. The shard depends on the Projects shard (the type `Task` and the template `tmp-proj-task-v0.2`). It adds a setup (`setup: flint`) and the script `projects-note`, which writes the Mesh note `Mesh/(System) Ops Projects.md`: the projects of the Ops org that matter to the Flint. The Tasks shard stays published, and it is deprecated.

Version 0.7.0 (total-orchestration-1111) adds agent sessions at Ops objects: the duty of an agent session at a task, a section, a deliverable, or a project, the two ways to speak to it (a comment on a task, or the chat), `ops agents`, and the agent defaults (`ops agents defaults` and `ops agents defaults set`).

Version 0.6.0 (ops-overnight-1109) adds Trident (streams, stream steps, substreams, drawings, and workspaces), shares, holds, calendars and events, the deliverable move, the locked section with the name of its home, and subtasks of one level. It removes `ops section priority` and `ops task subtask indent`, and it gives the data mode of Task 415 (a dev build uses PROD data by default).

The shard teaches an agent the Operations data model, the plan canvas rules, the `ops` CLI, the task model, ten workflows, and fifteen skills. It owns no Mesh type. It writes the task notes (with the scripts) and the projects note (with the setup). It comes from (Task) 297. (Task) 309 added `ops task context`. (Task) 320 made the CLI help, output, errors, and flags consistent and added `ops history`, `ops undo`, and `ops redo`; (Task) 327 brought this shard up to date with it, and with the review fixes and the `ops favourite` commands of (Task) 320.

## Prerequisite

- The `ops` CLI: `ndv use ops dev` or `ndv use ops prod`. Both put the command `ops` on PATH. `ops whoami` shows which data it uses: a dev build has the row `data mode`, and a prod build has the row `site` and uses PROD data. A dev build uses PROD data by default; set `OPS_DATA_MODE=dev` for dev data.
- A signed-in nuu credential: `ops login`, `nuu login` (prod), or `ndv run nuu login` (dev).
- The Projects shard `^1.6` (an install of Operations installs it).
- The setup ([[dev-setup-ops]]): `flint shard ops projects-note`, then `flint shard setup ops --complete`.

## Structure

```
Shards/(Source Remote) Operations/
  shard.yaml                             # Manifest
  dev-init-ops.md                        # Init (one init for both modes: the # Headless section is for Orbh sessions)
  dev-setup-ops.md                       # Setup: the projects note
  knowledge/
    dev-knw-ops-data_model.md            # Entities, fields, rules, undo, error codes
    dev-knw-ops-canvas.md                # Plan canvas coordinates, placement, drag rule
    dev-knw-ops-cli.md                   # The ops CLI reference
    dev-knw-ops-task_model.md            # The task model: the two parts, the status, the result, lineage, groups, placement
    dev-knw-ops-task_cli.md              # ops task, the note scripts, and the task as an object
    dev-knw-ops-task_commits.md          # The WIP commit rule
  skills/
    dev-sk-ops-use_operations.md         # the main skill: start here
    dev-sk-ops-create_task.md            # a task in the right place
    dev-sk-ops-move_tasks.md             # move tasks, subtasks, and sections
    dev-sk-ops-triage_inbox.md           # the inbox of a deployment
    dev-sk-ops-plan_deliverable.md       # a deliverable with sections
    dev-sk-ops-read_task_map.md          # the task map
    dev-sk-ops-{capture_as_task,use_task,place_task,split_task,merge_tasks,continue_task,chain_tasks,group_tasks,close_task}.md
  workflows/
    dev-wkfl-ops-interact.md             # both modes: > [!headless] callouts
    dev-wkfl-ops-plan_layout.md          # both modes: > [!headless] callouts
    dev-wkfl-ops-backlog_triage.md       # both modes: > [!headless] callouts
    dev-wkfl-ops-deliverable_setup.md    # both modes: > [!headless] callouts
    dev-wkfl-ops-{create_task,scope_task,do_task,create_and_do_task,review_task,do_task_group}.md   # each with an invocation file
  scripts/
    dev-task-new.js, dev-task-link.js, dev-task-sync.js   # the task notes
    dev-note-lib.js, dev-task-lib.js                      # their shared code
    dev-projects-note.js                                  # the projects note
  migrations/
    dev-mig-ops-0.7.0-to-0.8.0.md        # from the Tasks shard to Operations 0.8.0
```

Load the build with `flint shard start ops`, in an interactive session and in a headless session. Load the source with `flint shard start-dev ops` only to edit it. A headless session follows the `> [!headless]` callouts of the workflows.

## Record

The NUU Flint holds the source and builds the shard: `operations = { source = "@nuucognition/operations", from = "source" }`. Another Flint installs the published version: `operations = "@nuucognition/operations@^0.8"`. After a change: `flint shard build operations` here, then `flint shard broadcast operations` (or `flint shard update operations` in NUU Operations).
