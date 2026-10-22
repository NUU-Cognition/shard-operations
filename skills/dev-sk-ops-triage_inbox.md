---
description: "Triage the inbox of an Ops deployment: read it, tag new tasks, fix a task now or move it, start a deliverable from inbox tasks, and set the check schedule"
orb:
  - "@v1/nuucognition/session/63260df7-271a-450f-b775-0cdfdedebc26#flint/nuu-flint"
orbh-fleet: ops-command-1021
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start ops` if you haven't already.

# Skill: Triage Inbox

Put the inbox of one deployment in order. Each open task gets one decision: fix it now, move it to a place of work, keep it in the inbox, or go into a new deliverable that comes from the deployment.

# Input

- The deployment: an ID, an address, a web URL, or a name (`--project <p>` narrows a name)
- (Optional) The triage rules of the request, for example "hotfixes stay, feedback goes to the backlog"
- (Optional) The title of a new deliverable for the inbox tasks
- (Optional) A check schedule: day, week, month, or off
- (Optional) The org and the data mode

# Actions

1. **Ground.** Run `ops mode` and `ops whoami --json`. Read the `build mode` and the `data mode` lines of `ops mode` before the first write: the `ops` on PATH can be the prod build, and a prod build writes to PROD data whatever `OPS_DATA_MODE` says. For DEV data, use the dev launcher (`OPS_DATA_MODE=dev node <monorepo>/apps/cli-ops/bin/ops.js …`; see the init § Prerequisite). `ops --help` must list `headers`, `route`, `search`, and `section`; when it does not, the build is of before the revamp: stop and report it. Pass `--org <org>` when the deployment belongs to an org that is not active.
2. **Read the deployment.** Run `ops deployment show <deployment> --json`. Check:
   - `status`: `live`, `paused`, or `retired`. Only a live deployment has an inbox for new tasks. A paused or retired deployment keeps its inbox and gets no check-up tasks.
   - The version label, the check schedule, and the notes.
   - The deliverables that ship to it and the deliverables that came from its inbox.
   - With no inbox, the output says `no inbox`. Make the deployment live only when the request asks: `ops deployment status <deployment> live`.
3. **Read the inbox.** Run `ops deployment inbox <deployment> --open --json`. Each task has its ID, title, status, priority, tag, owner, subtask count, and address. The text line of a task shows the tag beside the priority. For a task whose body or comments matter, run `ops task context <task> --json`. Read the hidden context of the deployment when the rules depend on it: `ops deployment context show <deployment>`.
4. **Decide each open task.** Use the rules of the request. With no rule, use the tag:

   | Tag | Usual decision |
   |-----|----------------|
   | `hotfix` | Fix it now, or move it to the section of the current work |
   | `feedback` | Move it to the backlog of the project, or keep it for a new deliverable |
   | `ongoing` | A check-up ("Check <name>"): do the check, then mark it done |
   | `recurring` | Keep it in the inbox: its next copy comes when it is done |
   | no tag | Read the task, then decide as for `feedback` |

   Leave a task alone when you have no reason to change it.
5. **Apply the decisions.**
   - **Fix now:** `ops task start <task> --json`, do the work, then `ops task done <task> --json`. A recurring task makes its next copy in the inbox when it is done.
   - **Move** one task or many to one place: `ops task move <task> [<task>...] --to project:<ref>|section:<ref>|deliverable:<ref> --json`. The subtasks move with each task. Check `to.path` in the output. See [[dev-sk-ops-move_tasks]].
   - **Start a deliverable from the inbox:**

     ```bash
     ops deployment start-deliverable <deployment> "<title>" <task> [<task>...] [--project <p>] --json
     ops deployment start-deliverable <deployment> "<title>" --all-open [--project <p>] --json
     ```

     Ops makes a new deliverable in the project of the deployment. It comes from the deployment (`fromDeploymentId`) and ships to it (`deploymentId`). It has one section that holds the moved tasks, with their subtasks, in the given order. The service names that section "From the inbox": rename it when the plan needs another name (`ops section update <section> --title "<title>" --json`). The output names the deliverable, its address, the section, and the count of moved tasks. A deployment with no project needs `--project <p>` (`deployment_project_required`). Each task must be a task of this inbox (`deployment_task_not_in_inbox`). Then plan the deliverable with [[dev-sk-ops-plan_deliverable]].
   - **A new task that comes up during the triage:** `ops task create "<title>" --deployment <deployment> --tag feedback|hotfix|ongoing|recurring --json`. Add `--every day|week|month` for a recurring task. See [[dev-sk-ops-create_task]].
6. **Tags of existing tasks.** Tag an inbox task that has no tag, or a wrong tag, with `ops task update <task> --tag feedback|hotfix|ongoing|recurring --json` (`--tag none` clears it). `--every day|week|month` (or `none`) sets the recurrence the same way. An older deployment of Ops refuses these flags with `agent_invalid_input`: then record each task with a wrong or a missing tag in the output. Do not delete a task and create it again to change its tag.
7. **The check schedule.** When the request names one, run `ops deployment schedule <deployment> day|week|month|off --json`. Each period, the hourly cron puts one task "Check <name>" (tag `ongoing`) in the inbox. The first check-up comes one period after the command. An open check-up task in the inbox gets no twin. To make the check-up task now: `ops deployment check <deployment> --json`.
8. **Check the result.** Run `ops deployment inbox <deployment> --open --json` again. Compare the open tasks with your decisions.

# Output

- The inbox after the triage: the open tasks that stay, each with its tag
- Each task that you fixed, moved (with the new place), or put into a new deliverable (with the deliverable ID and address)
- The tasks with a wrong or a missing tag that no command can change
- The check schedule, when you set it
