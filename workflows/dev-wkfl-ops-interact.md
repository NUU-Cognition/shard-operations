---
description: "Do an operator request about NUU Operations through the ops CLI — find the records and places, confirm, make the change, and report with addresses and web links"
orbh-sessions:
  - "[[4c4eadb7-6e8e-4529-8186-3bb1b5bdbc75]]"
  - "[[d98d16ae-1388-4228-8610-6954998a395a]]"
  - "[[9297d2a3-64c8-4d33-8c4c-76011ebae793]]"
orb:
  - "@v1/nuucognition/session/63260df7-271a-450f-b775-0cdfdedebc26#flint/nuu-flint"
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start ops` if you haven't already.

# Workflow: Interact

The operator asks for something in Operations: read a record, create or change records, move tasks, set dates, or answer a question about the state. This workflow finds the records, confirms the plan with the operator, runs the change through `ops`, and reports the result with addresses and web links.

> [!headless]
> In a headless or subagent Orbh session, there is no operator to confirm a plan. The prompt is the whole mandate. The rules of [[dev-init-ops#Headless]] replace every human checkpoint. Do each stage, and follow the `> [!headless]` callout in it. A headless session does not do Stage 3.

# Input

- The operator's request, in any form
- (Optional) IDs, addresses, web URLs, titles, or paths (`Alpha › v1 › Backend`) of the records the request names
- (Optional) The organisation and the data mode (dev or prod)

> [!headless]
> - The prompt: the request, and any IDs, addresses, URLs, titles, org, and data mode it names

# Actions

## Stage 1: Ground

1. Run `ops mode` and `ops whoami --json`. Note the data mode (dev or prod) and the active org.
   - Exit code 3 (`auth_required`, `unauthenticated`): ask the operator to run `ops login` (or `nuu login` for prod, `ndv run nuu login` for dev). Stop until the operator confirms.
   - If the request names an org that is not active, plan to pass `--org <slug|name|me>` on every command. Do not change the stored default unless the operator asks.
   - If the data mode is not the one the request needs, tell the operator. Change it with `ops mode dev|prod` only on the operator's word.
2. Make sure [[dev-sk-ops-use_operations]], [[dev-knw-ops-data_model]], and [[dev-knw-ops-cli]] are in context. Do not guess command shapes or rules.
3. Restate the request in one sentence. Map it to a command with the job table of [[dev-sk-ops-use_operations]] § 6, then check its flags in [[dev-knw-ops-cli]]. When no command fits a read, use `ops query` (§ 7 of that skill). These skills cover the common requests:
   - a new task in the right place: [[dev-sk-ops-create_task]];
   - a move of tasks or of a section: [[dev-sk-ops-move_tasks]];
   - the inbox of a deployment: [[dev-sk-ops-triage_inbox]];
   - the sections of a deliverable: [[dev-sk-ops-plan_deliverable]];
   - where a task is and how it is linked: [[dev-sk-ops-read_task_map]].

   If the request is not clear, ask one question.
- Once you know the org, the data mode, and the commands, progress to the next stage.

> [!headless]
> Do not ask the operator, and do not wait for a confirmation.
> 1. First, `flint orbh session set phase grounding`.
> 2. With no data mode in the prompt, use dev data. With no org in the prompt, use `--org me`.
> 3. Exit code 3: stop, and return the error with the sign-in command (`ops login`, `nuu login`, or `ndv run nuu login`): `flint orbh session return --finish "<result>"`.
> 4. When the request has two readings, choose the narrower one and record the choice. Do not ask a question.
> - Once the org, the data mode, and the commands are clear, progress to the next stage.

## Stage 2: Find the Records

1. Resolve every record the request names. Use `--json` on every read.
   - The places of the org (projects, deliverables, sections, deployments, each with its address): `ops headers --json`, or `ops headers --project <p> --json`.
   - A task or a place by its words: `ops search "<text>" --json` (`--type task,section,deliverable,project,deployment` narrows it). A task by its title only: `ops task search "<text>" --limit 10 --json`. Then read the task with `ops task context <task> --json` before you change or report on it.
   - Other kinds: `ops <kind> show "<title>" --json`, or the `list` command with its scope flag.
   - A step title needs `--plan`. `--project` narrows a deployment name or a section title.
   - A new task with no place in the request: ask the route decision, `ops route "<text>" --json`.
2. On `<kind>_ambiguous` or `place_ambiguous` (exit 2), show the candidates with their IDs and let the operator choose. Then use the ID.
3. Read the state that the change depends on. Examples: `ops section show <section>` before a task goes to done (blockers), `ops project show <project>` before a delete (what cascades), `ops task map <task>` before a move of a task with subtasks, `ops member list --json` before an assignment (user row IDs).
- Once every record has an ID and you know the current state, progress to the next stage.

> [!headless]
> 1. First, `flint orbh session set phase resolving`.
> 2. On `<kind>_ambiguous` or `place_ambiguous`: choose only when the prompt makes the choice clear. Else record the candidates and do not write to that record. Do not ask the operator.
> - Once every record you will write has an ID, progress to Stage 4. A headless session does not do Stage 3.

## Stage 3: Confirm

1. Show the operator the plan: each command you will run, the records it touches, and what the service will derive (for example "the subtasks move with the task", or "a move into a section of a deliverable clears the priority").
2. For a delete, list what goes with it. `ops project delete`, `ops deliverable delete`, `ops section delete`, `ops deployment delete`, and `ops plan delete` refuse without `--yes` (`confirm_required`). Add `--yes` only after the operator approves. `ops task delete` of a task with subtasks needs `--with-subtasks`. Other deletes have no guard.
3. For many writes, say how many and group them. Tasks that go to one place are one `ops task move` command.
4. Human checkpoint: the operator approves, changes, or stops the plan. A read-only request skips this stage.
- Once the operator approves, progress to the next stage.

> [!headless]
> A headless session does not do this stage: there is no operator to confirm a plan, and the prompt is the whole mandate. Go to Stage 4. The callout of Stage 4 says which writes and which deletes you run.

## Stage 4: Execute

1. Run the commands with `--json`. Take every new ID and address from the output. After a create or a move, check the printed place (the section path).
2. On exit code 1 (a service refusal or another failure; a write may already have committed): on `bad_response` or a response-body read failure, follow [[dev-init-ops]] § Safety Rules, rule 8, before any retry. Else read the error code and its hints (with `--json`, the error is one JSON document on stderr), and see [[dev-knw-ops-data_model]] § Error Codes. Do not work around a rule of the service (for example `subsection_blocked`, `section_role_locked`, `subtask_too_deep`, `node_gated`, `deadline_status_wrapped`). Tell the operator the code, its meaning, and the next action.
3. On exit code 4 (network), follow [[dev-init-ops]] § Safety Rules, rule 8. Retry a read once. Before you repeat a write, read the record or the list it would change, and check whether the write landed. Never repeat a create or a comment without that check. When you cannot tell, tell the operator the command and the uncertain state, and do not repeat the write.
4. For a correction, prefer a new forward write (for example a move back with `ops task move --to`). Use an undo only with the guard: `ops history --on <record> --json` (or `ops plan history <plan> --json`), confirm that the head is your gesture, then `ops undo --on <record> --expect <seq>` (or `ops plan undo <plan> --expect <seq>`). On `undo_state_changed`, do not retry with a new seq without the operator.
- Once every write succeeded or was reported, progress to the next stage.

> [!headless]
> No operator approves a write, and no operator reads a message during the run: record each point for the result.
> 1. First, `flint orbh session set phase writing` and `flint orbh session set progress "<n>/<total> writes"`.
> 2. Run only the writes the prompt asks for. Do not run a cascading delete that the prompt does not clearly ask for; record it as a proposed action. `ops project delete`, `ops deliverable delete`, `ops section delete`, `ops deployment delete`, and `ops plan delete` need `--yes`; add it only for a delete that [[dev-init-ops#Headless]] allows.
> 3. On exit 1 (a service refusal or another failure; a write may already have committed), do not work around the rule. On `bad_response` or a response-body read failure, follow rule 8 of [[dev-init-ops#Headless]] before any retry. Record the code, its hints, and the next action, and continue with the writes that do not depend on it. On a network error (exit 4), follow rule 8 of [[dev-init-ops#Headless]]: retry a read once; before you repeat a write, read and check whether it landed; record an uncertain write in the result and do not repeat it.
> 4. Undo only a gesture of this session, and only through the guard: `ops history --on <record> --json`, then `ops undo --on <record> --expect <seq>` (for a plan: `ops plan history` and `ops plan undo --expect`). On `undo_state_changed`, do not undo; record it.
> 5. Delete every test record that you created.
> - Once every write succeeded or was reported, including uncertain outcomes, progress to the next stage.

## Stage 5: Report

1. Tell the operator what changed: each record's kind, title, ID, and address.
2. Give a web link for the main record. The host is `https://ops.nuucognition.com` (prod data) or `http://localhost:3088` (dev data). The paths are in [[dev-init-ops]] § Web Links.
3. Name any derived effect that the operator will see (a section now done, the subtasks that moved with a task, a priority that a move cleared, a notification sent to an assignee). A deliverable is done only when a person marks it done: name a deliverable whose sections are all done, so that the operator can mark it.
4. Offer the obvious next step, if there is one.

> [!headless]
> No operator reads the report at the terminal. The turn result is the report.
> 1. Return the result with `flint orbh session return --finish "<result>"`. Write it in ASD-STE100 style.
> 2. Include: the data mode and org; each record created, changed, or deleted (kind, title, ID, address); each refusal with its code; each choice you made on an unclear point; proposed actions you did not take; web links for the main records.

# Output

- The requested change in Operations, or the answer to the question
- A short report with IDs, addresses, and web links

> [!headless]
> - The requested change, inside the mandate of the prompt
> - A turn result with IDs, addresses, refusals, choices, and web links
