---
description: "Create an Operations deliverable from a scope description — sections in order, dependencies, due dates as deadlines, first tasks, and the hidden context — after the operator approves the structure"
orbh-sessions:
  - "[[d98d16ae-1388-4228-8610-6954998a395a]]"
orb:
  - "@v1/nuucognition/session/63260df7-271a-450f-b775-0cdfdedebc26#flint/nuu-flint"
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start ops` if you haven't already.

# Workflow: Deliverable Setup

Turn a scope description into a deliverable in a project. The deliverable gets sections in a valid order, dependencies, due dates, first tasks, and a hidden context. A deliverable has no closer and no "Delivered" task: a person marks it done when the work is done. The commands of each step are in [[dev-sk-ops-plan_deliverable]].

> [!headless]
> In a headless or subagent Orbh session, the prompt is the approval. So the structure must follow the scope description closely, and every judgement goes into the result. The rules of [[dev-init-ops#Headless]] replace every human checkpoint. Do each stage, and follow the `> [!headless]` callout in it. A headless session does not do Stage 3.

# Input

- The scope description: a Mesh note, a Task file, a Notepad section, or text in the chat
- The project (ID, address, URL, or name), or an instruction to create one
- (Optional) Dates, owners, the deployment that the deliverable ships to, and the org and data mode

> [!headless]
> - The prompt: the scope description (or a path to it), the project, and optionally dates, owners, the deployment, the org, and the data mode

# Actions

## Stage 1: Ground and Read

1. Run `ops mode` and `ops whoami --json`. Use `--org` when the project belongs to another org.
2. Make sure [[dev-knw-ops-data_model]] § Deliverables, § Sections, and § Deadlines are in context. Key rules:
   - `ops deliverable create` makes no section and no task. `--section "<title>"` makes the first section in the same command.
   - A new section goes to the end of its deliverable, or after the section that `--after` names.
   - Inside one deliverable, a dependency must point up: an upstream section must sit above its dependent.
   - A due date on a deliverable or a section is a deadline linked to it.
   - A task in a section cannot go to done while an upstream section is open (`subsection_blocked`).
   - A deliverable is done only when a person marks it done (`ops deliverable done`). Its sections do not decide.
3. Read the scope description in full.
4. Read the project: `ops project show <project> --json` (its sections, deliverables, deployments, and root tasks). Check that no deliverable with the same title exists. Note the tasks of the backlog that belong to the new deliverable.
5. Read the members for owners: `ops member list --json`.
- Once you have the scope and the project state, progress to the next stage.

> [!headless]
> 1. First, `flint orbh session set phase reading-scope`.
> 2. With no data mode in the prompt, use dev data. With no org, use `--org me`.
> 3. If a deliverable with the same title exists in the project, do not create another. Return and report it: `flint orbh session return --finish "<result>"`.
> 4. Create a project only when the prompt asks for a new project. If the named project does not exist and the prompt does not ask for one, return and report it.
> - Once the scope and the project are clear, progress to the next stage.

## Stage 2: Design

1. Name the deliverable: one scoped outcome, short.
2. Split the scope into sections. Each section is a unit that is done when its root tasks are done. Do not make a section only to mark the end of the deliverable: a person marks the deliverable done.
3. Order the sections so that every dependency points up: upstream first. Record the order.
4. List dependencies. Inside the deliverable they must point up. A dependency on a section of another home is allowed; find its ID with `ops headers --json`.
5. Dates: a due date for the deliverable and for any section that has one. Every section date must be on or before the deliverable date. Use `YYYY-MM-DD`.
6. First tasks: two to five tasks for each section, as short titles. Do not end a title with a space and a single digit (that sets a rarity). Choose owners only when the scope names them; otherwise the operator becomes the owner by default. Name the backlog tasks that move into a section.
7. The hidden context: two to five sentences for the deliverable (what it is, the words that people use for it, what does not belong), and one for a section when its title alone is not clear.
8. Build a table: order, section, depends on, due date, tasks (with owners), context.
- Once the table is complete, progress to the next stage.

> [!headless]
> 1. Use only dates and owners that the prompt or the scope states. Do not invent a due date. Record every section or dependency that you inferred.
> - Once the table is complete, progress to Stage 4. A headless session does not do Stage 3.

## Stage 3: Approve

1. Show the operator the deliverable title, the due date, the context, and the table.
2. Human checkpoint: the operator approves or changes the structure.
- Once the operator approves, progress to the next stage.

> [!headless]
> A headless session does not do this stage: the prompt is the approval. Go to Stage 4.

## Stage 4: Create

Run each command with `--json`, and keep every new ID and address.

1. The project, when it is new: `ops project create "<name>" [--description "<text>"] [--context "<text>"] --json`.
2. The deliverable with its first section: `ops deliverable create "<title>" --project <projectId> --section "<first section>" [--due <date>] [--deployment <deployment>] [--context "<text>"] --json`.
3. The other sections, in the approved order, top first. Creation in order gives the right order: `ops section create "<title>" --deliverable <deliverableId> [--due <date>] [--context "<text>"] --json`.
4. The dependencies, after every section exists: `ops section deps set <sectionId> <upstreamId>... --json`.
5. The tasks: `ops task create "<title>" --section <sectionId> [--assign <member>] [--priority <p>] [--body <md|->] --json`. Create them in the order they should show; do not use `--top` for a list (it leaves two undo entries for each task). Move the named backlog tasks: `ops task move <task>... --to section:<sectionId> --json`.
6. A context that is too long for one argument: `ops deliverable context set <deliverableId> --file <path> --json`.
7. On a refusal (for example `dependency_order_invalid`), stop and tell the operator. Do not reorder or drop edges on your own.
- Once every record exists, progress to the next stage.

> [!headless]
> No operator reads a message during the run: record each point for the result.
> 1. First, `flint orbh session set phase creating` and `flint orbh session set progress "<n>/<total> records"`.
> 2. The order stays: the deliverable with its first section, the other sections in order, the dependencies, then the tasks. Create the project only when the prompt asks for a new project.
> 3. On a refusal, do not reorder or drop edges to force it. Record the code and continue with the records that do not depend on it.
> - Once every record that can be created exists, progress to the next stage.

## Stage 5: Verify and Report

1. Run `ops deliverable show <deliverableId>` and compare it with the table: order, dependencies, dates, tasks, and the context mark. The deliverable is open: no section and no task marks it done.
2. Report the deliverable ID and address, the section and task counts, the dates, and the web link `/<org>/projects/<projectId>/deliverables/<deliverableId>`.
3. Offer next steps: a plan step that links to the deliverable ([[dev-wkfl-ops-plan_layout]]), extra deadlines, or the deployment that it ships to (`ops deliverable update <deliverableId> --deployment <deployment>`). Tell the operator to mark the deliverable done (`ops deliverable done`) when the work is done.

> [!headless]
> 1. Run `ops deliverable show <deliverableId> --json` for the check.
> 2. Return with `flint orbh session return --finish "<result>"`, in ASD-STE100 style. Include: the data mode and org, the deliverable ID, address, and web link, the table with IDs, inferred parts, refusals with codes, and any part of the scope that you did not model. Do not mark the deliverable done unless the prompt says that the work is done.

# Output

- A deliverable with ordered sections, dependencies, deadlines, first tasks, and a hidden context
- A report with IDs, addresses, and the web link

> [!headless]
> - A turn result with IDs, addresses, choices, refusals, and the web link
