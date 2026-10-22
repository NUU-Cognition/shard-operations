---
description: "Turn a written plan (a Notepad section, a list of steps, a description) into an Operations plan on the canvas, with requires edges, record links, and a clean left-to-right layout"
orbh-sessions:
  - "[[d98d16ae-1388-4228-8610-6954998a395a]]"
orb:
  - "@v1/nuucognition/session/63260df7-271a-450f-b775-0cdfdedebc26#flint/nuu-flint"
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start ops` if you haven't already.

# Workflow: Plan Layout

Build a plan on the Operations canvas from a written plan. The steps get `requires` edges, links to the records they are, and positions that follow [[dev-knw-ops-canvas]]: one column per depth, one row per parallel branch.

> [!headless]
> In a headless or subagent Orbh session, the prompt gives the written plan and the target. There is no review stage, so the model and the layout must follow the written plan closely, and every judgement goes into the result. The rules of [[dev-init-ops#Headless]] replace every human checkpoint. Do each stage, and follow the `> [!headless]` callout in it. A headless session does not do Stage 4.

# Input

- The written plan: a Notepad section, a Mesh note, a list in the chat, or a description
- The target: a new plan title, or an existing plan (ID, URL, or title)
- (Optional) The org and the data mode

> [!headless]
> - The prompt: the written plan (or a path to it), the target plan (new title or existing plan), and optionally the org and the data mode

# Actions

## Stage 1: Ground and Read

1. Run `ops mode` and `ops whoami --json`. Note the data mode and the org. Use `--org` when the plan belongs to another org.
2. Make sure [[dev-knw-ops-canvas]] and [[dev-knw-ops-cli]] are in context.
3. Read the written plan in full. If it is a Mesh file, read the file.
4. If the target plan exists, read it: `ops plan show <plan> --json`. Note its steps, positions, and sentinels.
- Once you have the whole written plan and the target state, progress to the next stage.

> [!headless]
> 1. First, `flint orbh session set phase reading-plan`.
> 2. With no data mode in the prompt, use dev data. With no org, use `--org me`.

## Stage 2: Model the Graph

1. Extract the steps. One step per unit of work that can be done and checked. Keep the titles short (they set the card width).
2. For each step, list the steps it comes after (`requires`). A fork is two steps that require one step. A join is one step that requires two. Do not add edges that follow from others (keep the graph thin).
3. Mark steps as `optional` when the written plan says they do not gate what comes after.
4. Find the records each step is: search tasks (`ops task search`), sections, deliverables, or other plans (a subplan). A step with one link reads its title, status, and owner from that record. Record the link spec (`task:<id>`, `section:<id>`, `deliverable:<id>`, `plan:<id>`).
5. Check for cycles. A step must never come after itself through a chain.
- Once every step has its edges and links, progress to the next stage.

> [!headless]
> No person reviews the graph, so follow the written plan closely:
> - Link a step to a record only when the match is clear (one search result with the same title, or an ID in the written plan). Else leave the step unlinked and record it.
> - Do not add a step or an edge that the written plan does not state or clearly imply. Record every inferred edge.

## Stage 3: Compute the Layout

Follow [[dev-knw-ops-canvas]] § Laying Out a Whole Plan.

1. Depth: roots are depth 0. The depth of a step is 1 + the largest depth of the steps it requires.
2. Card widths: estimate each card with the width rule (26 + 7.4 × title length + 4, plus 24 for exactly one link, plus 34 for an assignee). A linked step shows the record's title, so use that title.
3. Columns: `col[0].x = 0`, `col[d].x = col[d-1].x + col[d-1].width/2 + 80 + col[d].width/2`. When every card is 224 px wide or less, `x = d × 304` is safe.
4. Rows: the main path on `y = 0`. Each parallel branch on its own row, `y = row × 88` (use 120 when cards carry deadlines). A join goes on the mean `y` of the steps it requires, or on the main path.
5. For an existing plan, place the new steps to the right of, or below, the existing cards. Do not overlap an existing card (edges at least 16 px apart).
6. Write the result as a table: step, requires, links, optional, depth, row, `x`, `y`.
- Once the table is complete, progress to the next stage.

> [!headless]
> - For an existing plan, add steps without moving existing cards.
> - Once the step table is complete, progress to Stage 5. A headless session does not do Stage 4.

## Stage 4: Review

1. Show the operator the table and a Mermaid sketch of the graph.
2. Human checkpoint: the operator approves, or changes steps, edges, links, or rows.
- Once the operator approves, progress to the next stage.

> [!headless]
> A headless session does not do this stage: there is no review stage. Go to Stage 5. Every judgement goes into the result.

## Stage 5: Build

1. Create the plan when it is new: `ops plan create "<title>" [--description "<text>"] --json`. Keep the plan ID.
2. Create the steps in depth order, roots first, so every `requires` step exists. For each step:
   - A root: `ops step add <plan> "<title>" --x <x> --y <y> --json`.
   - One predecessor: `ops step add <plan> "<title>" --after <stepId> --x <x> --y <y> --json`.
   - A join: repeat `--after` for each predecessor.
   - Keep each new step ID. Use IDs, not titles, for later commands.
3. Set links: `ops step links set <stepId> <spec>... --json`. Set optional steps: `ops step update <stepId> --optional`. Set assignees when the written plan names them: `ops step assign <stepId> <member>`.
4. On a refusal (for example `node_requires_cycle`, `node_link_not_found`, `node_subplan_cycle`), stop and tell the operator. Do not change the graph to force it.
5. Leave the sentinels derived, unless the operator asks for a position. If a stored sentinel now sits inside the plan, propose `ops step move start|end --plan <plan> --x <x> --y <y>`.
- Once every step, edge, and link exists, progress to the next stage.

> [!headless]
> No operator reads a message during the run: record each point for the result.
> 1. First, `flint orbh session set phase placing-steps` and `flint orbh session set progress "<n>/<total> steps"`.
> 2. On a refusal, do not change the graph to force it. Record the code and continue with the steps that do not depend on it.
> 3. Do not store sentinel positions unless the prompt asks.
> - Once every step that can be built exists, progress to the next stage.

## Stage 6: Verify and Report

1. Run `ops plan show <plan>` and compare it with the table: every edge, every link, every position. Fix a wrong position with `ops step move <stepId> --x <x> --y <y>`.
2. Report the plan ID, the step count, the steps that are current now (the frontier), and the web link `/<org>/plans/<planId>`.

> [!headless]
> 1. Run `ops plan show <plan> --json` for the check.
> 2. Return with `flint orbh session return --finish "<result>"`, in ASD-STE100 style. Include: the data mode and org, the plan ID and web link, the step table with IDs, inferred edges, unlinked steps and why, refusals, and the current frontier.

# Output

- A plan on the canvas with steps, `requires` edges, links, and a clean layout
- A report with the plan ID, the step IDs, and the web link

> [!headless]
> - A plan on the canvas that follows the written plan
> - A turn result with the plan ID, step IDs, choices, refusals, and the web link
