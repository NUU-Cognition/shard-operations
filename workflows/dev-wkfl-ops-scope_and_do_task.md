---
description: "Scope a task that exists and do it in one run: give it a task note when it has none, add it as an object, research, write the scope and the definition of done into the task note, post one comment with the scope summary, then do the work, make the WIP commits, write the result with the commits, ask for the review in Ops, and give a summary"
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start ops` if you haven't already.

# Workflow: Scope and Do Task

Scope a task that exists in Ops, and do it at once, in one run. The scope part does the research, then writes the scope and the definition of done into the task note, as [[dev-wkfl-ops-scope_task]] does. The work part does the work, the WIP commits, the result, the review request, and the summary, as [[dev-wkfl-ops-do_task]] does. No person confirms the scope between the two parts. This is an **execution** workflow. This file holds the rules of the joined run. The two workflows hold the detail of each stage.

> [!headless]
> In a headless or subagent Orbh session, no person is at the terminal. Do each stage, and follow the `> [!headless]` callout in it. Do not wait for a person.
> - Report progress with `flint orbh session set phase <phase>` and `flint orbh session set progress "<done>/<total> checks"`. The phase values are in the section `# Headless` of [[dev-init-ops]].
> - Go on from the scope to the work at once. Stop after the scope only by the stop rule of Stage 3.
> - Never close a task that needs a person. The task stays open, with its result, for the review.
> - End the turn with `flint orbh session return --finish "<result>"` only when no parent frame is open. When this workflow runs as a child frame of another workflow, continue the parent frame after the close (see the section `# Headless` of [[dev-init-ops]]).

# Invocation

You can run this workflow as a shard invocation. The invocation is a durable record of the run. The stages below do not change.

- Start the workflow with `flint shard invoke ops scope_and_do_task --input task=<address>`. The task exists in Ops. It can have no task note: Stage 1 gives it one.
- The mode comes from the Orbh session. In the headless mode, the invocation skips the step `close` at the open, because only a person confirms that close.
- Mark each step when it is done: `flint shard step done <step> --evidence "<…>"`. The steps are `prepare`, `research`, `scope`, `work`, `result`, `review`, and `close`. Outside an Orbh session, give `--invocation <id>` to `flint shard step`.
- In a headless session, the `done` close of the invocation prints the next command: `ops review_task` on the task. Put it in the result.
- A stop after the scope (the stop rule of Stage 3) has its own close. Mark the step `scope` done with the blocker in the evidence. Then close the invocation with `flint shard invocations close <id> --outcome abandoned --reason "<the blocker>"`. That close accepts the open steps of the work, and it prints no next command. The next command is then `flint shard invoke ops do_task --input task=<address>`, after the decision of the person.
- The behaviours only say lines: at the open, the add command of the task object; at a `return --finish`, a check of the result and the commits. The agent does each Ops write.
- Inside another open frame (for example a notepad), the task is a child frame, and the session continues after it. Then do not close the session, and in a headless session do not return: close the invocation with `--outcome done`, and the parent frame is the current frame again.
- When no invocation is open, follow the stages with no record.

# Input

- The address of a task that exists in Ops (or its Convex id)
- (Optional) Instructions that help with the scope or the work

# Actions

## Stage 1: Task Preparation

Make the task ready for the run: the task object, the task note, and the status. Stage 1 of [[dev-wkfl-ops-do_task]] holds the detail.

- Read the task: `ops task show <address> --json`. Read the status, the result, the lineage, the task groups, the relations, the attachments, and the field `note`. Use the `address` of the output from now on.
- When the task is done, do not do it again: stop, and report it. More work in a new scope is a continuation: [[dev-sk-ops-continue_task]].
- Add the task as an object before the first change: `flint orbh objects add <address> --subscribe` ([[dev-sk-ops-use_task]]). Check the item with `flint orbh objects list`. The Page shows it in the `OBJECTS` block. This is the hard rule of the shard ([[dev-init-ops]] § The Hard Rule). In this run it applies before the scope, because the session writes the scope and then does the work. Scope Task alone adds no object.
- Read the task note. Its file is `response.presences[0].path` of `flint resolve <note> --json`, or the note `(Task) <n> …` of the label `Task <n> · <Flint>`. A task with no note (from the web or Strike) gets one now: write its body to a temporary file outside the Mesh, and run `flint shard ops task-new --ops <address> --body-file <file>`. A task with an empty body needs no `--body-file`: the note then has the headings of the template.
- Set the status `doing` when it is `todo`: `ops task start <address>`. Then copy the state into the note: `flint shard ops task-sync <address>`.
- Once the task is an object of the session, has a task note, and is `doing`, progress to the next stage.

> [!headless]
> - Set `flint orbh session set phase reading-task`.
> - The task and the instructions come from the prompt, not from a person.

## Stage 2: Research

Research before you write the scope. Stage 1 of [[dev-wkfl-ops-scope_task]] holds the detail.

- Read the task with its comments: `ops task context <address> --json`. Read its task note, its lineage, its relations, and its attachments. A comment of a person on the task is a message to the session ([[dev-init-ops]] § Agent Sessions at Ops Objects): read each one.
- Search the Mesh for related notes (notepads, reports, plans, specs), and walk their links.
- Read the code and the files that the request touches.
- Search Ops for related tasks: `ops task search "<words>" --json`, `ops task hints --text "<title>"`.
- Record the earlier decisions, the approaches that failed, and the open questions.
- Keep the findings in your context. Stage 3 writes them.
- When the research finds a blocking ambiguity (the request can mean two very different things), ask the person before you continue.
- Once you have a coherent picture of the problem, progress to the next stage.

> [!headless]
> - Keep `flint orbh session set phase reading-task`.
> - Do not ask a person, and do not wait. A blocking ambiguity needs a decision of a person: keep the two readings and the question, go on to Stage 3, and apply its stop rule.

## Stage 3: Scope

Write the scope into the task note, show it in Ops, and decide if the work starts. Stages 2, 3, and 5 of [[dev-wkfl-ops-scope_task]] hold the detail of the text. Stage 4 of that workflow (the review of the proposal with the person) is not a part of this run.

- **The proposal.** Write it under `# Notes` of the task note, in paragraphs: the background, the proposed approach, the alternatives, the open questions, and the references.
- **The scope.** Write it from the proposal: `# Context`, `# Task Description`, `# Task Requirements`, and `# Definition of Done` (checkboxes that a reviewer can check). See [[dev-knw-ops-task_model]] § The Task Note. When the note has a scope already, do not write a second one: keep what is correct, and change what the research shows.
- **The open questions.** No person refines the scope in this run. Decide each open question that you can decide, and write the decision with its reason under `# Notes`. A question that only a person can decide is a blocker: the stop rule applies.
- **The other writes** of Stage 3 of Scope Task, for a task that exists. A new title changes both parts: `flint helper rename "<old note title>" "<new title>"` and `ops task update <address> --title "<new title>"`. Work that changes code in a repository needs the `repo` link: `ops task relate <address> repo <name>`. Attach each note that the research made: `ops task attach <address> note "<Mesh path>"`.
- **The stop rule.** The run stops after this stage, and does no work, when the scope finds one of these blockers:
  1. The work is not possible: something that it needs does not exist (an access, a tool, a fact).
  2. The work is too large for one run: it holds two or more coherent units of work, or one session cannot finish it.
  3. The work needs a decision of a person: a blocking ambiguity, a choice with a risk, or a step that only a person approves.
- Add a `# Task Log` line with the scope. On a stop, also write the blocker under `# Notes`: what stops the work, and what the person must decide or do. For work that is too large, write the parts that you propose. Do not split the task in this run: a person decides a split ([[dev-sk-ops-split_task]]). Then copy the state into the note: `flint shard ops task-sync <address>`.
- **Post exactly one comment** on the task, so that the person sees the scope in Ops before the work goes on:
  ```bash
  # The work starts:
  ops comment add <address> "Scope: <the approach in one or two sentences>. Definition of done: <N> items. The full scope is in the task note. The work starts now."
  # A stop (the stop rule):
  ops comment add <address> "Scope: <the approach in one or two sentences>. The work did not start: <the blocker>. <What the person must decide or do>."
  ```
  Keep it short: the task note holds the full scope. Post no second comment for the scope. After an error of the command, read the comments first (`ops comment list <address>`), and post the comment again only when it is not there ([[dev-init-ops]] § Safety Rules, rule 8).
- **No stop between the scope and the work.** With no blocker, give the person the scope summary (the approach, the items of the definition of done, and each decision that you made), and go on to Stage 4 at once. Do not wait for a confirm. When the person stops the run or changes the scope, obey: write each change into the task note before you continue.
- **On a stop**, do no step of Stages 4 to 7:
  - Ask for no review, and write no result. A task with no work gets no review request.
  - The task stays open, with the status `doing`, its scope, and its blocker. Keep it in the objects.
  - Report: give the person the scope summary, the blocker, and the next command for the time after the decision: `flint shard invoke ops do_task --input task=<address>`.
  - With an open invocation, mark the step `scope` done with the blocker in the evidence. Then close the invocation: `flint shard invocations close <id> --outcome abandoned --reason "<the blocker>"`.
- Once the scope is in the task note, the comment is posted, and no blocker stops the run, progress to the next stage.

> [!headless]
> - Check the scope yourself: it must read as a complete task that this session can do.
> - Set `flint orbh session set progress "0/<N> checks"` (N is the count of items of the definition of done).
> - With no blocker, go on to Stage 4 at once. Do not wait for an answer to the comment. Keep the scope summary for the result of the run.
> - On a stop: set `flint orbh session set phase blocked`. Mark the step `scope` done with the blocker in the evidence, and close the invocation before the return: `flint shard invocations close --outcome abandoned --reason "<the blocker>"`. When the close prints `back in:`, a parent frame is open. Do not return: give the blocker to the parent frame, and continue it. Else return: `flint orbh session return --finish "Scoped task <address> <title>. <the scope in one sentence>. Stopped after the scope: <the blocker>. No work, no result, and no review request. Status: doing. Next, after the decision: flint shard invoke ops do_task --input task=<address>."`

## Stage 4: Task Work

Do the work that the scope of Stage 3 gives. Stage 2 of [[dev-wkfl-ops-do_task]] holds the detail: follow it exactly.

- Do the work until it is finished, or until you have done all that you can with no person.
- A step of the work that serves the intent of this task is a subtask in Strike, not a new task. Work that does not serve the intent is a new task: [[dev-sk-ops-capture_as_task]] or [[dev-wkfl-ops-create_task]].
- When an item of the definition of done is met, tick it in the task note. Write the meaningful steps in its `# Task Log`.
- **WIP commits** (for each task that changes a repository). Follow [[dev-knw-ops-task_commits]] § The WIP Commit Rule: the machine branch, only your paths, and the subject `[OR] wip: <Flint name>/Task <short id> <what changed>`. The hook adds the trailers `Orbh-Fleet` and `Orbh-Session`. Keep each commit as `<sha> (<repo>)`: Stage 5 names each commit in the result of the task.
- Keep a Mesh note of the work (a notepad, a report) with the task: `ops task attach <address> note "<Mesh path>"`.
- When the work shows that the scope must change, write the change into the task note first, with a `# Task Log` line. Then continue.
- When a decision of a person blocks the work, write the blocker under `# Notes` in the task note, and tell the person. When the decision comes, continue.
- Once the work is complete and committed, progress to the next stage.

> [!headless]
> - Set `flint orbh session set phase implementing`, and update `progress` after each item.
> - When you are blocked, write the blocker under `# Notes` of the task note, set `phase blocked`, and use a deferred request: `flint orbh request "$ORBH_SESSION_ID" "<the question>"`. A subagent asks no person: it returns the blocker and the question to its dispatcher.

## Stage 5: Result

Write the result, and ask for the review in Ops. Stage 3 of [[dev-wkfl-ops-do_task]] holds the detail and each rule of the review request: follow it exactly.

- Check each item of the definition of done against the work.
- Write the result. It is the record of the work: what the work gave, the tests, each commit as `<sha> (<repo>)`, and the session ([[dev-knw-ops-task_commits]]):
  ```bash
  ops task result <address> "<what the work gave, in two or three sentences>. Tests: <…>. Commits: <sha> (<repo>), …. Session: $ORBH_SESSION_ID"
  ```
- Check the result: `task.result` of `ops task show <address> --json` names each commit.
- When the work changed something that a person sees (a page, a chart, a UI), attach a screenshot or a short screen recording: `ops media attach <address> <file...> --body "<what it shows>" --json`. Never put a signed URL in the result or in a comment.
- Copy the state into the note: `flint shard ops task-sync <address>`. Add a last `# Task Log` line with the result.
- **Ask for the review in Ops.** Each finished task gets exactly one review request, after its result and before any close. The work is finished when each item of the definition of done is met. Do not wait for the person to ask for it:
  ```bash
  ops task review request <address> --note "<the summary, the commits, and what to check>" --json
  ```
  - With no `--to`, the reviewer is the owner of the task. A task of a team with no owner refuses with `review_no_reviewer`. Then run the command again with `--to me` (the operator). Do not guess another reviewer.
  - Record `itemId` and `reviewerUserId` of the output. Add a `# Task Log` line with the reviewer and the `itemId`.
  - When the request fails for another reason, record the error code and the review command, and tell the person. Do not close the task until a request is recorded.
- **A task that is not finished gets no request.** When the work is blocked or not complete, do not ask for a review. Write the blocker under `# Notes` of the task note, and report the task with its blocker.
- Once the result is written and the request is recorded (or the blocker is reported), progress to the next stage.

> [!headless]
> - Ask for the review with no person: the command above, with `--json`. On `review_no_reviewer`, run it again with `--to me`. Keep `itemId` and `reviewerUserId` for the result. On another error, put the error code and the review command in the result.
> - A blocked or unfinished task gets no request: set `flint orbh session set phase blocked`, and put the blocker in the result.

## Stage 6: Review Handoff

Give the summary, and hand the task to a review. Stage 4 of [[dev-wkfl-ops-do_task]] holds the detail: follow it exactly.

- Give the person a summary: the scope in one sentence, what changed, the commits, the tests, and each item of the definition of done.
- The review comes next. A second session checks the work: [[dev-wkfl-ops-review_task]] with `flint shard invoke ops review_task --input task=<address>`. Do not review your own work.
- Name the review request of Stage 5 in the summary: the reviewer and the `itemId`. For a task that is not finished, name the blocker: it has no request.
- Converse to refine. When the person asks for a change, do it (Stage 4), write the result again with each commit (Stage 5), run `task-sync` again, and run the review request again (the same reviewer: `again: true`, no second request).
- When the person asks for the review now, give the review command, or dispatch the review to a second session when the person asks for it. Then skip the step `close`: `flint shard step skip close --reason 'toward review_task'`, and close the invocation with `--outcome done`.
- Once the person confirms the summary, progress to the next stage.

> [!headless]
> Do not wait for a person, and do not do Stage 7.
> - Do not ask for the review again: Stage 5 recorded the request. Put the reviewer and the `itemId` (or the blocker) in the result.
> - Set `flint orbh session set phase complete`.
> - With an open invocation, mark the step `review` done, and close the invocation: `flint shard invocations close --outcome done`. The close prints the `review_task` command.
> - When the close of the invocation prints `back in:`, a parent frame is open. Do not return: keep the result for the parent frame, and continue it.
> - Else return: `flint orbh session return --finish "Scoped and did task <address> <title>. Scope: <the approach in one sentence>. <summary>. Commits: <shas>. Status: doing, with the result. Review: requested of <reviewer> (<itemId>), or <the error code and the review command>, or not requested: <the blocker>. Next: <the review_task command>."`

## Stage 7: Close

Stage 5 of [[dev-wkfl-ops-do_task]] holds the detail: follow it exactly.

- Close only a task whose review request is recorded (Stage 5). When the person confirms, close the task with [[dev-sk-ops-close_task]]: `ops task close <address>`, then `flint shard ops task-sync <address>`. Keep the result of Stage 5: it names the commits. A close cancels the open review requests of the task (`task_closed`).
- When the person wants the review first, do not close: leave the task open for the review, and close the invocation.
- With an open invocation, close it with `--outcome done`.

> [!headless]
> A headless session does not do this stage. The invocation skips the step `close` at the open.

# Output

- A task note with the proposal, the scope, and the definition of done, linked to its Ops task, and one comment on the task with the scope summary
- The work is done, committed, and recorded on the task in Ops, and the task note shows the state
- The task open with its result and an open review request in Ops (or closed after the confirm of the person)
- After a stop by the stop rule: the scope and the blocker in the task note, one comment with the blocker, no result, and no review request
- The summary to the person, or in the result
