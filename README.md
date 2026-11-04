# Operations

Work in NUU Operations through the `ops` CLI: projects, deliverables, sections, tasks and subtasks, task groups, the review queue, the people looped into a task, deployments and their inboxes, the route decision, addresses, deadlines, blockers, plans and the plan canvas, notepads, day plans, and `ops query`. The entry point is the main skill `sk-ops-use_operations`.

The source moved from the NUU Operations Flint to the NUU Flint on 2026-10-21 (ops-command-1021). Version 0.2.0 follows the revamp of Ops: sections in four homes, no closer, the backlog as a section, subtasks, the task map, abstract deployments with an inbox, the hidden context, `ops headers`, `ops route`, and `ops search`.

Version 0.3.0 (ops-cli-publish-1023) adds the main skill `sk-ops-use_operations`: an agent with no other context can do Operations work with it.

The shard teaches an agent the Operations data model, the plan canvas rules, the `ops` CLI, four workflows, and six skills. It owns no Mesh type and installs nothing into the Mesh. It comes from (Task) 297. (Task) 309 added `ops task context`. (Task) 320 made the CLI help, output, errors, and flags consistent and added `ops history`, `ops undo`, and `ops redo`; (Task) 327 brought this shard up to date with it, and with the review fixes and the `ops favourite` commands of (Task) 320.

## Prerequisite

- The `ops` CLI: `ndv use ops dev` or `ndv use ops prod`. Both put the command `ops` on PATH. `ops mode` shows which build and which data it uses.
- A signed-in nuu credential: `ops login`, `nuu login` (prod), or `ndv run nuu login` (dev).

## Structure

```
Shards/(Source Local) Operations/
  shard.yaml                             # Manifest
  dev-init-ops.md                        # Init (one init for both modes: the # Headless section is for Orbh sessions)
  knowledge/
    dev-knw-ops-data_model.md            # Entities, fields, rules, undo, error codes
    dev-knw-ops-canvas.md                # Plan canvas coordinates, placement, drag rule
    dev-knw-ops-cli.md                   # The ops CLI reference
  skills/
    dev-sk-ops-use_operations.md         # the main skill: start here
    dev-sk-ops-create_task.md            # a task in the right place
    dev-sk-ops-move_tasks.md             # move tasks, subtasks, and sections
    dev-sk-ops-triage_inbox.md           # the inbox of a deployment
    dev-sk-ops-plan_deliverable.md       # a deliverable with sections
    dev-sk-ops-read_task_map.md          # the task map
  workflows/
    dev-wkfl-ops-interact.md             # both modes: > [!headless] callouts
    dev-wkfl-ops-plan_layout.md          # both modes: > [!headless] callouts
    dev-wkfl-ops-backlog_triage.md       # both modes: > [!headless] callouts
    dev-wkfl-ops-deliverable_setup.md    # both modes: > [!headless] callouts
```

Load the build with `flint shard start ops`, in an interactive session and in a headless session. Load the source with `flint shard start-dev ops` only to edit it. A headless session follows the `> [!headless]` callouts of the workflows.

## Record

The NUU Flint holds the source and builds the shard: `operations = { source = "@nuucognition/operations", from = "source" }`. The NUU Operations Flint installs it from here: `operations = "@nuucognition/operations#nuu-flint"`. After a change: `flint shard build operations` here, then `flint shard broadcast operations` (or `flint shard update operations` in NUU Operations).
