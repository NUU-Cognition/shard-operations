---
description: "Review an Operations backlog (the master backlog or the backlog section of a project), propose priorities, owners, and moves into sections, and apply them in bulk after the operator approves"
orbh-sessions:
  - "[[d98d16ae-1388-4228-8610-6954998a395a]]"
orb:
  - "@v1/nuucognition/session/63260df7-271a-450f-b775-0cdfdedebc26#flint/nuu-flint"
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start ops` if you haven't already.

# Workflow: Backlog Triage

Review one backlog and put it in order. A backlog is a section with the role `backlog`: each project has one, and the master backlog is the backlog section of the org. The agent reads every root task, proposes a priority, an owner, or a move into a section for each one, and applies the changes only after the operator approves the list.

> [!headless]
> In a headless or subagent Orbh session, there is no operator to approve a bulk change. So the prompt decides the triage mode:
>
> | Prompt says | Triage mode |
> |-------------|-------------|
> | "review", "propose", or nothing about writes | **Propose only.** Write nothing. Return the proposal table. |
> | "apply" or "triage" with explicit rules (for example "set priorities and move billing tasks by these rules") | **Apply within the rules.** Apply only the change types the rules cover. Propose the rest. |
>
> Never delete a task in this workflow. Propose deletes in the result. The rules of [[dev-init-ops#Headless]] replace every human checkpoint. Do each stage, and follow the `> [!headless]` callout in it. A headless session does not do Stage 3.

# Input

- The backlog: the master backlog of the org, or the backlog of a project (project ID, address, URL, or name)
- (Optional) The operator's triage rules (for example "the queue holds this week's work", "anything about billing goes to the section Backend")
- (Optional) The org and the data mode

> [!headless]
> - The prompt: the backlog (master or project), the triage mode, the triage rules, and optionally the org and the data mode

# Actions

## Stage 1: Ground and Read

1. Run `ops mode` and `ops whoami --json`. Use `--org` when the backlog belongs to another org.
2. Make sure [[dev-knw-ops-data_model]] § Backlogs, § Tasks, and § Sections are in context. Key rules:
   - A backlog sorts its tasks by the priority ladder `urgent → high → medium → (none) → low`, then by `order`.
   - A list shows root tasks only, each with the count of its subtasks. A move takes the subtree.
   - A move from a backlog into a section of a deliverable clears the priority, unless you pass one.
   - A move can give a task another project: `--to project:<p>` puts a task of the master backlog, or of another project, in the backlog of that project.
   - The former folders are sections now: the queue is the section with the role `queue`, and each former custom folder is a plain section of the project.
3. Read the backlog:
   - `ops backlog show [--project <p>] --json` (by priority band).
   - `ops task list --backlog [--project <p>] --status open --json` for the full root task rows, each with its address.
4. Read the possible targets: `ops section list --project <p> --json` (the sections of the project, of its deliverables, and of its deployments), or `ops headers --project <p> --json` for the map with every address. For a master backlog, read `ops headers --json`.
5. Read the members: `ops member list --json`.
6. For a task whose body or comments matter, read them: `ops task context <task> --json`. For a task with subtasks, read its tree: `ops task subtask list <task> --json`.
- Once you have every open root task of the backlog and the possible targets, progress to the next stage.

> [!headless]
> 1. First, `flint orbh session set phase reading-backlog`.
> 2. With no data mode in the prompt, use dev data. With no org, use `--org me`.

## Stage 2: Propose

1. For each root task, decide at most these changes:
   - priority (`urgent`, `high`, `medium`, `low`, or none);
   - owner (a member, or none);
   - a move into a section: a section of a deliverable, the queue, or another section of the project; a done or archived section is a poor target;
   - a move of a master backlog task into the backlog of a project;
   - a delete, only for a clear duplicate, and only as a proposal.
2. To find a section for a task with no rule, ask the route decision: `ops route "<task title>" --json`. Use a candidate only when its `reason` fits the task.
3. Leave a task alone when you have no reason to change it. Do not rename tasks or rewrite bodies. Do not create a section unless the operator's rules call for it.
4. Build a table: task (title and short ID), current state, proposed change, target (with its path), reason.
5. Count the writes. Tasks that go to one section are one `ops task move` command. A priority change is one `ops task update` for each task; an owner change too.
- Once the table is complete, progress to the next stage.

> [!headless]
> 1. Add a column to the table: the rule of the prompt that covers the row (or "no rule").
> 2. Decide the triage mode from the prompt, and record it.
> 3. Never delete a task. Propose deletes in the result.
> - Once the table and the triage mode are fixed, progress to Stage 4 (Apply mode only), else to Stage 5. A headless session does not do Stage 3.

## Stage 3: Approve

1. Show the table to the operator, grouped by change type.
2. Human checkpoint: the operator approves all, approves some rows, or changes rows. Bulk changes wait for this approval.
- Once the operator approves, progress to the next stage.

> [!headless]
> A headless session does not do this stage: there is no operator to approve a bulk change. The triage mode of the prompt decides what Stage 4 applies.

## Stage 4: Apply

Apply only the approved rows, with `--json`:

- Into a section: `ops task move <task> [<task>...] --to section:<section> [--priority <p|none>]`. Group the tasks of one target into one command: one Waybill gesture, at most 200 tasks.
- A master backlog task into the backlog of a project: `ops task move <task> [<task>...] --to project:<p>`.
- Into the queue of the project: `ops task move <task> --to section:<queue section>` (take its ID from `ops section list --project <p> --json`).
- Priority only: `ops task update <task> --priority <p|none>`.
- Owner: `ops task update <task> --assign <member|none>`.
- Order inside a band: `ops task reorder <task> --top|--before <t>|--after <t>` (the anchor must be in the same section and band; else `reorder_anchor_outside`).
- A new section, only when the rules name it: `ops section create "<name>" --project <p> --json`, before the moves into it.

Check `to.path` in the output of each move. See [[dev-sk-ops-move_tasks]] for every destination form. Track progress. On a refusal, record the code and continue. Do not delete a task unless the operator approved that row.

- Once every approved row is applied or recorded, progress to the next stage.

> [!headless]
> Do this stage in Apply mode only. No operator approves the rows.
> 1. First, `flint orbh session set phase applying` and `flint orbh session set progress "<n>/<total> tasks"`.
> 2. Apply only the rows that a prompt rule covers, with the commands above.
> 3. Do not create a section unless a rule names it. Do not move a task into a section unless a rule names the section or clearly maps to it. A route candidate alone is not a rule.
> 4. On a refusal, record the code and continue. Never delete a task.
> - Once every covered row is applied or recorded, progress to the next stage.

## Stage 5: Report

1. Run `ops backlog show [--project <p>]` again and show the new state.
2. Report the counts per change type, each refusal with its code, the address of each moved task with its new place, and the web link: `/<org>/projects/<projectId>?tab=backlog`, or `/<org>/backlog` for the master backlog.
3. Remind the operator that each owner change sent a `task.assigned` notification, and that moves of other people's tasks sent `task.moved`.

> [!headless]
> 1. Run `ops backlog show [--project <p>] --json` when you applied changes.
> 2. Return with `flint orbh session return --finish "<result>"`, in ASD-STE100 style. Include: the data mode, org, and triage mode; the applied changes (task, change, ID, address); the proposed changes that you did not apply, with reasons; refusals with codes; the web link of the backlog.

# Output

- A triaged backlog: priorities, owners, and moves into sections as approved
- A report with counts, refusals, addresses, and the web link

> [!headless]
> - In propose mode: a proposal table and no writes
> - In apply mode: the covered changes applied, and the rest proposed
