---
description: "Move one Ops task or many to another place with ops task move --to (every destination form, the subtree, under a parent), or move a section with its tasks to another home"
orb:
  - "@v1/nuucognition/session/63260df7-271a-450f-b775-0cdfdedebc26#flint/nuu-flint"
orbh-fleet: ops-command-1021
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start ops` if you haven't already.

# Skill: Move Tasks

Move tasks to another place in one command, or move a whole section to another home. A move always takes the subtree of each task.

# Input

- The tasks: IDs, addresses, web URLs, or titles (one or more). Or one section, for a section move.
- The destination: a section, a project backlog, a deliverable, a deployment inbox, a parent task, the master backlog, or no home
- (Optional) A priority to set in the same command
- (Optional) The org and the data mode

# Actions

1. **Ground.** Run `ops mode` and `ops whoami --json`. Read the `build mode` and the `data mode` lines of `ops mode` before the first write: the `ops` on PATH can be the prod build, and a prod build writes to PROD data whatever `OPS_DATA_MODE` says. For DEV data, use the dev launcher (`OPS_DATA_MODE=dev node <monorepo>/apps/cli-ops/bin/ops.js …`; see the init § Prerequisite). `ops --help` must list `headers`, `route`, `search`, and `section`; when it does not, the build is of before the revamp: stop and report it. Pass `--org <org>` when the tasks belong to an org that is not active. All tasks of one move must be in one org.
2. **Read the tasks.** For each task, run `ops task show <task> --json`, or `ops task list --section <section> --json` for the tasks of one section. Note the current place and the subtask count. A list shows only root tasks: each subtask moves with its root.
3. **Write the destination.** `--to` takes one of these forms:

   | `--to` | Destination |
   |--------|-------------|
   | `section:<ref>` | That section |
   | `project:<ref>` | The backlog section of the project |
   | `deliverable:<ref>` | The first open section of the deliverable. Ops makes one when there is none. |
   | `deployment:<ref>` | The inbox section of the deployment |
   | `parent:<task>` | Under that task, as its last child: the tasks become subtasks, in the home of the new root |
   | `backlog` | The backlog section of the project of each task (a task with no project is refused: use `master` or `project:<ref>`) |
   | `master` | The backlog section of the org (the master backlog) |
   | `unplaced` | No home |
   | an ID, a web URL, or an address | The place that it names (a section, a project, a deliverable, a deployment, or a task as the parent) |
   | a bare title or a path | The one place of the org with that title or path, for example `"Alpha › v1 › Backend"` |

   A `<ref>` is an ID, an address, a web URL, a title, or a path. A kind prefix narrows a title search to one kind: `deliverable:"Alpha › v1"` picks one of two deliverables called `v1`. When you do not know the place, read `ops headers --json`, or ask `ops route "<text>" --json`.
4. **Move.**

   ```bash
   ops task move <task> [<task>...] --to <place> [--priority low|medium|high|urgent|none] --json
   ```

   - Many tasks to one place go in one call of `tasks.moveMany`: one Waybill gesture, at most 200 tasks (`move_too_large`).
   - A listed task under another listed task moves with that task. A task that is already in the destination stays.
   - A move from a backlog (any section with no deliverable) into a section of a deliverable clears the priority. Pass `--priority` to keep or set one. `--priority` is a second write for each task.
5. **Check the output.** The JSON has `to` (`{kind, id, title, path, address}`), `moved` (each task with `id`, `title`, and `address`), and `movedIds` (every task that moved, the subtasks too). The text output has one line `moved task <id>  <title>  to <place>` for each task, and `<n> tasks moved in all (with their subtasks)` when subtasks moved too. Check that `to.path` is the place of the request.
6. **Move a subtask inside its tree** (no other place): `ops task subtask move <task> --under <parent> [--index <n>] --json`, or `--root` to make it a root task in the home of its old root. `ops task subtask indent <task>` and `ops task subtask outdent <task>` change one level. A cycle is refused (`subtask_cycle`), and so is a tree with more than 6 levels below its root (`subtask_too_deep`).
7. **Move a section with its tasks to another home.**

   ```bash
   ops section move <section> --to project:<ref>|deliverable:<ref>|deployment:<ref>|org --json
   ```

   - The tasks follow the section with their subtrees. The output names the new home and `movedTaskCount`.
   - The section lands at the end of the new home, or just above the first section there that depends on it.
   - A backlog, queue, or inbox section cannot move (`section_role_locked`). An archived section cannot move (`subsection_archived`): run `ops section unarchive <section>` first, when the request allows it. A move to the same home is refused (`section_move_same_home`).
8. **Undo a wrong move** only through the guard: `ops history --on <task> --json`, confirm that the head is your `task.move` or `task.moveMany` gesture, then `ops undo --on <task> --expect <seq>`. One undo puts every task of one `tasks.moveMany` call back. A move with `--priority` also has one `tasks.update` gesture for each task: undo those first.

# Output

- The tasks in the new place, each with its address, and the count of every task that moved (the subtasks too)
- For a section move: the section in its new home, and the count of the tasks that moved with it
