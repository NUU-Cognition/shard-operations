---
required-reading:
  - "[[dev-knw-ops-data_model]]"
  - "[[dev-knw-ops-canvas]]"
  - "[[dev-knw-ops-cli]]"
orbh-sessions:
  - "[[68bcfab8-136a-4d4a-b02d-01435ac62d6d]]"
  - "[[3fb6e594-a179-4c0b-ba67-833b2ccaea67]]"
  - "[[4c4eadb7-6e8e-4529-8186-3bb1b5bdbc75]]"
  - "[[61b5f523-537e-425e-ab9a-002b3c2dac39]]"
  - "[[f205c648-297b-41fe-8f7b-900dd6448829]]"
  - "[[3aa03722-903e-417a-aa51-1dc28bc6f162]]"
  - "[[d98d16ae-1388-4228-8610-6954998a395a]]"
  - "[[9297d2a3-64c8-4d33-8c4c-76011ebae793]]"
orb:
  - "@v1/nuucognition/session/4bcb2c31-aaa8-401f-b0c6-0aaf10e3caab#flint/nuu-flint"
orbh-fleet: ops-command-1021
---

# Operations

This shard lets an agent work in the NUU Operations web app. The agent uses the `ops` CLI. The CLI calls the Operations agent gateway, and the gateway calls the same Convex functions that the web app calls. Thus an agent write has the same checks, the same activity log (Waybill) entries, and the same notifications as a write in the web app.

Load this shard when a request touches Operations records: projects, deliverables, sections, tasks and subtasks, task groups, review requests, backlogs, deployments and their inboxes, deadlines, blockers, plans and plan steps, comments, notifications, activity, day labels, favourites, notepads, or the day planner.

**Start here: [[dev-sk-ops-use_operations]].** It is the main skill of this shard. It gives the model, the builds and the sign-in, the org, references and places, the command for each job, `ops query` and `ops call` for any other read or write, ten recipes, the safety rules, and troubleshooting. Follow it for any Operations request. The other skills and workflows go deeper on one job.

For the task primitive of Task 1287 (outcomes, lineage, task groups, attachments) the Tasks shard has the depth: `flint shard start task`, then [[knw-task-cli]] and [[knw-task-model]].

## What Operations Is

Operations (Ops) is the delivery record of a person and of an organisation. The model, since the revamp of ops-command-1021 (2026-10-21):

1. An **org** holds **projects**. A project has a hidden **context** (Markdown for search and suggestions).
2. A project has **deliverables**. A person marks a deliverable done (`ops deliverable done`). There is no closer and no "Delivered" task.
3. A **section** is a list of tasks. It has one home: a deliverable, a project (no deliverable yet), a deployment (its inbox), or the org. The former word is "subsection".
4. The **backlog** of a project is its section with the role `backlog`. The **master backlog** is the backlog section of the org.
5. A **task** lives in a section, or it has no home (unplaced). A task can have **subtasks**: full tasks in a tree, at most 6 levels below the root. A subtask has the home of its root. Lists show root tasks, each with a count.
6. A **deployment** is abstract: a name, a free version label, a status (`live`, `paused`, `retired`), notes, and a context. A live deployment has an **inbox** section for the tasks that come up while it runs (tags `feedback`, `hotfix`, `ongoing`, `recurring`). A check schedule adds a check-up task. A deliverable can start from the inbox and ship to the deployment.
7. Each project, deliverable, section, task, deployment, and notepad has an **address**: `@v1/<org>/<kind>/<key>#ops`. Every command prints it. Name a record by its address when you have it.
8. **Deadlines** own dates and attach to records. **Plans** are graphs of steps across projects. **Notepads** hold text with task mentions.
9. **Blockers** say why work waits: what it waits on, the next step, an owner, and the next check-up date. A blocker links records and gates no status. It is open, resolved, or dropped.
10. A task has no type and no stage: its state is its status, its outcome, and its result. A **task group** is a set of tasks that are done together. A **day plan** is the ordered tasks of one person for one date.

```
org
├── project ── section (backlog) ── task ── subtask …
│   ├── section
│   ├── deliverable ── section ── task ── subtask …
│   └── deployment ── section (inbox) ── task
├── section (backlog: the master backlog)
├── deadlines, blockers, plans ── steps, day labels, notepads, task groups
└── activity (Waybill), notifications, comments on tasks
person: a day plan per date, favourites per org
```

The service derives some states. A section is done when all its root tasks are done. A deliverable is done only when a person marks it. Read [[dev-knw-ops-data_model]] for every entity, field, rule, and error code. Read [[dev-knw-ops-canvas]] before you place or move plan steps.

### Which Command For Which Job

| Job | Command |
|-----|---------|
| See the places of an org with their addresses | `ops headers [--project <p>]` |
| Find a task or a place | `ops search "<text>"`, `ops task search "<text>"` |
| Read a task before you work on it | `ops task context <task>` |
| See where a new task belongs | `ops route "<text>"` |
| Create a task in the right place | `ops task create "<title>" --section|--project|--deliverable|--deployment|--parent <ref>`, or `--route` |
| Move tasks (with their subtasks) | `ops task move <tasks...> --to <place>` |
| See a task with its home, groups, and lineage | `ops task map <task>` |
| Plan a deliverable | `ops deliverable create … --section <title>`, `ops section create`, `ops section reorder`, `ops section deps` |
| Finish or reopen a deliverable | `ops deliverable done|reopen <deliverable>` (ask the operator first) |
| Run a deployment | `ops deployment inbox|status|schedule|check|start-deliverable` |
| Give a place its context | `ops project|deliverable|section|deployment context set` |
| Record why work waits, and follow it up | `ops blocker create <title> --check <date> --on <record>`, `ops blocker list --due`, `ops blocker delay|resolve|drop` |
| Plan your day | `ops day show|add|reorder|carry` |
| Answer a question that no command answers | `ops query <table> --where <field><op><value>` (see [[dev-sk-ops-use_operations]] § 7) |
| Run an op that no command has | `ops ops`, then `ops call <op> '<json>'` |

## Prerequisite

Before any work, make sure that the `ops` CLI is installed and that a nuu credential is signed in.

```bash
# From the NUU monorepo. Choose one build.
ndv use ops dev      # the `ops` command on PATH runs the dev build
ndv use ops prod     # the `ops` command on PATH runs the prod build
ops mode             # shows the build, the data, the site, and the credential

# Sign in. The CLI uses the shared nuu CLI credential of the data mode.
ops login            # the sign-in for the current data mode
nuu login            # prod credential: ~/.nuucognition/auth.json
ndv run nuu login    # dev credential:  ~/.nuucognition/auth.local.json (local nuu-account on port 3000)
```

Outside the monorepo, the npm package `@nuucognition/ops-cli` gives one command, `ops`: the prod build (Node.js 24 or newer). It is ready but not published yet; after the publish, `npm install -g @nuucognition/ops-cli`. `nuu login`, `flint login`, and `ops login` share the prod credential `~/.nuucognition/auth.json`.

ndv names the link `ops` in both profiles. The name `ops-dev` is only a package bin inside the monorepo, so do not expect it on PATH. The CLI source is `apps/cli-ops` in the monorepo.

**The `ops` on PATH can be the prod build.** A prod build always uses PROD data and ignores `OPS_DATA_MODE`. So `OPS_DATA_MODE=dev ops task create …` with a prod build **writes to PROD**. Before the first write, do these checks:

1. Run `ops mode`. Read the line `build mode` (`prod` or `dev`) and the line `data mode`. Write only when the data mode is the data of the request.
2. Run `ops --help`. It must list `headers`, `route`, `search`, and `section`. When it does not, the build is of before the revamp: rebuild it (`ndv build ops` or `ndv build ops prod`), or use the dev launcher below.

For DEV data, run the dev launcher of the monorepo checkout. It is always a dev build, and `OPS_DATA_MODE=dev` holds for it:

```bash
OPS_DATA_MODE=dev node "<monorepo>/apps/cli-ops/bin/ops.js" mode          # build mode dev; data mode dev (env)
OPS_DATA_MODE=dev node "<monorepo>/apps/cli-ops/bin/ops.js" headers --org me
```

`<monorepo>` is `Repos/main` of the Tinderbox (on this machine: `/Users/nathan/nuu/(Tinderbox) NUU Cognition/Repos/main`). When its bundle `dist-dev/` is older than the source, the dev launcher runs the source and prints one note on stderr. The prod launcher prints a warning when its bundle `dist/` is older than the source. In this shard, `ops` names the command that you chose by these checks. There is no `ops logout`, on purpose. If a command fails with `auth_required` or `unauthenticated` (exit code 3), the credential is missing or expired. Tell the operator to sign in again. Do not try to repair the credential files.

## Modes

The mode selects the Convex deployment and the credential together.

| Build on PATH as `ops` | Data | Deployment | Credential |
|------------------------|------|------------|------------|
| Prod build (`ndv use ops prod`) | always prod | `acoustic-weasel-248` | `auth.json` |
| Dev build (`ndv use ops dev`) | dev (default) | `next-dalmatian-912` | `auth.local.json` |
| Dev build after `ops mode prod` | prod | `acoustic-weasel-248` | `auth.json` |

The dev build uses dev data by default. `ops mode prod` moves the dev build to prod data, as Strike does, and `ops mode dev` moves it back. The choice is stored in `~/.nuucognition/ops-dev-data.json`. `OPS_DATA_MODE=dev|prod` overrides it for one run, on a dev build only: a prod build ignores it. Before a write, run `ops mode` and know which data the CLI points at. A test write on prod data is a real write that people see.

## Organisations

Every Operations record belongs to one organisation (`orgSlug`). There are two kinds of organisation:

- **Personal workspace.** Every person has one. Its `orgSlug` is the person's Clerk user ID (for example `user_2abc…`). In a web URL its token is `me`.
- **Team organisation.** Its `orgSlug` is the team slug. The operator's JWT lists the teams the operator belongs to.

The CLI acts in the active organisation: `--org <slug|name|me>` on the command line, else the default stored per data mode (`ops org use <slug|name|me>`, under `~/.nuucognition/ops/`), else the personal workspace. A command on a record given by ID or URL acts in the record's own organisation. Prefer `--org` on each command over a change of the stored default. Use the personal workspace for tests on prod data.

## Safety Rules

The gateway accepts the operator's credential. So every write is the operator's own write, and Waybill records the operator as the actor. The gateway also adds an agent mark to the write. Each Waybill event of the write has `context.via: {kind: "agent", client?, session?}`, and its notification has `data.via` except for comment notifications, which have no agent mark. The CLI sends `client` (`ops-cli/<version>`) and, when `ORBH_SESSION_ID` is set, `session`. The activity log and the task timeline show a small "via agent" label after the operator's name. A comment that `ops comment add` writes stores the same mark as its `via`, and the task timeline shows the label after the comment author (Task 357). The mark is a label only: it changes no access, and it does not change the actor or undo. A comment edit, a reaction, `waybill.undo`, `waybill.redo`, and notification reads carry no mark. Prod data shows the mark since the prod deploy of Operations 0.6.0 (Task 331; for comments, Task 357). Obey these rules.

1. **Act as the operator.** Do only what the operator asked, in the organisation the operator named. Do not change records that the request does not name.
2. **Check before a delete.** A delete can cascade. `projects.remove` deletes every deliverable, section, and task of the project. `deliverables.remove` deletes its sections and tasks. `sections.remove` deletes its tasks. A task with subtasks needs `--with-subtasks`, and then its subtree goes too. `plans.remove` deletes every step and cannot be undone in practice. Before a delete, read the record and what it holds, and tell the operator what goes with it. The CLI refuses these deletes without `--yes` (`confirm_required`, exit 2): `ops project delete`, `ops deliverable delete`, `ops section delete`, `ops deployment delete`, `ops plan delete`, and `ops blocker delete`. Add `--yes` only after the operator confirms.
3. **Use `--json`.** Parse the JSON output. Do not parse the short text output. Take IDs from the JSON, and never construct or guess an ID.
4. **Never undo without reading the history.** Undo acts on the operator's last action in a scope, and that action can be one the operator made in the web app. Read the scope history first (`ops history --on <record>`, or `ops plan history <plan>`), confirm that the head entry is the action you expect, and pass its `seq` with `--expect <seq>`. The CLI refuses an undo or a redo without `--expect` (`expect_required`) unless you pass `--dry-run`. See [[dev-knw-ops-data_model]] § Undo and Redo.
5. **Clean up test records.** When you create records only to test, delete them when the test is done. Report every record you could not delete.
6. **Respect the derived state.** Do not try to force a status that the service derives. For example, a task in a blocked section cannot go to `done` (`subsection_blocked`, the code keeps the former word). Finish the upstream work, or tell the operator. Do not mark a deliverable done unless the operator asks: it is the decision of a person.
7. **Keep titles exact.** `tasks.create` reads a trailing space and one digit `0`–`7` as a rarity and removes it from the title. Do not end a task title with ` <digit>` unless you want that rarity.
8. **Network errors (exit 4) and writes.** A network error can come after the service committed the write: the CLI sends no idempotency key, so a repeated write can make a duplicate. A read (`list`, `show`, `context`, `search`, `history`, `ops ops`) is safe to run again: retry it once automatically. Before you repeat a write, read the record (or the list it would change) and check whether the write landed. When it landed, do not repeat it. When you cannot tell, report the uncertain state with the command and the record. Never repeat a create (`create`, `add`, `insert`, `comment add`) or a comment without that check. A write that sets one value (for example `task start`, `task done`, `update --priority`) is safe to repeat after the check shows the old value. This rule also applies to `bad_response` and response-body read failures, which can return exit 1. Check the affected records before any retry. If the result is unclear, report it and do not repeat the write.

## Web Links

Every command that shows a task or a place prints its web link or its address. The host is `https://ops.nuucognition.com` on prod data and `http://localhost:3088` on dev data. `<org>` is the team slug, or `me` for the personal workspace.

| Record | Path |
|--------|------|
| Task (any home) | `/<org>/tasks/<taskId>` |
| Task map | `/<org>/tasks/<taskId>/map` |
| Project | `/<org>/projects/<projectId>` |
| Deliverable | `/<org>/projects/<projectId>/deliverables/<deliverableId>` |
| Deployment | `/<org>/deployments/<deploymentId>` |
| Plan canvas | `/<org>/plans/<planId>` |
| Personal deadlines view | `/deadlines` |

## CLI Summary

Read [[dev-knw-ops-cli]] for every command, flag, and error code. The essentials:

- Most commands are `ops <noun> <verb>`: `org`, `member`, `project`, `deliverable`, `section`, `task`, `deployment`, `comment`, `backlog`, `deadline`, `blocker`, `plan`, `step`, `notify`, `activity`, `day-label`, `favourite`, `notepad`, `day`, `query`. These have no noun: `ops login`, `ops whoami`, `ops mode`, `ops ops`, `ops call`, `ops headers`, `ops route`, `ops search`, `ops history`, `ops undo`, and `ops redo`. `ops <noun> <verb> --help` shows the arguments, the options, and examples. A noun with no verb (`ops task`) is a usage error that lists the verbs. The former words still work and are hidden: `ops subsection`, `--subsection`, `ops folder`.
- A record argument takes an ID, an address, a web URL, a title, or a path (`"Alpha › v1 › Backend"`). A title that matches more than one record fails with `<kind>_ambiguous` (exit 2) and lists the candidates with their paths. Run the command again with the ID or the address. Never guess.
- A place of `ops task move --to` is `section:<ref>`, `project:<ref>` (its backlog), `deliverable:<ref>` (its first open section), `deployment:<ref>` (its inbox), `parent:<task>` (a subtask), `backlog`, `master`, or `unplaced`. A move takes the subtree.
- Every line that shows a record ends with its address, and `--json` has an `address` field. Keep it for the next command.
- `--json` puts exactly one JSON document on stdout. Errors go to stderr as `error <code>: <message>`, then indented hints that name the next step. With `--json`, an error is one JSON document on stderr: `{"error": {code, message, exitCode, hints, ...}}`, and stdout is empty.
- Exit codes: 0 success, 1 service refusal or other failure (a write may already have committed), 2 usage error, ambiguous reference, or guard, 3 auth, 4 network. An extra argument is a usage error: quote a text argument that has spaces. Only these inputs read stdin when you pass `-`: the body of `ops task create|update --body -`, the body of `ops comment add|edit`, a context (`ops <kind> context set <ref> -`), `ops notepad create --body -`, the text of `ops notepad append <notepad> -` and `ops notepad write <notepad> -`, and the args of `ops call <op> -`. `--body-file <path>` reads a task body from a file. Every other text argument is literal text: quote it.
- `ops task context <task>` reads what an agent needs about one task: the facts, the project description, the description, and the newest comments (200 by default, `--comments <n>` up to 500), with no change events. Run it before you work on an existing task.
- `ops route "<text>"` asks Ops where a text belongs: the ranked places with a score and a reason (the decision model Jev when Smart suggestions are on, else the text match). `ops task create --route` takes the top place and prints it. Check the printed place. When the score is low, ask the operator or name the place yourself.
- `ops call <op> '<json>'` sends any allowlisted op. `ops ops` prints the manifest. An op that a deployment does not have yet fails with `agent_unknown_operation`, and the message says that it is not deployed there yet. Where a former op can do the work, the command uses it.
- `ops history --on <record>` (or `--scope <scope>`) shows your undo and redo stacks in the Waybill scope of a record. `ops undo` and `ops redo` replay one gesture, and they need `--expect <seq>` or `--dry-run`. `ops plan history`, `ops plan undo`, and `ops plan redo` do the same for a plan. A changed stack fails with `undo_state_changed` (exit 2).
- `ops step add` with no `--x --y` lets the server place the step. `ops step move --with-downstream` applies the web drag rule.

## Workflows and Skills

- [[dev-sk-ops-use_operations]] — the main skill: start here for any Operations work.
- [[dev-wkfl-ops-interact]] — do any operator request about Operations: find the records, make the change, report with addresses and web links.
- [[dev-wkfl-ops-plan_layout]] — turn a written plan into a plan on the canvas, with edges, links, and a clean layout.
- [[dev-wkfl-ops-backlog_triage]] — review a backlog section, then set priorities and owners, and move tasks into the right sections.
- [[dev-wkfl-ops-deliverable_setup]] — create a deliverable with its sections, dependencies, due dates, and first tasks from a scope description.
- [[dev-sk-ops-create_task]] — create a task in the right place.
- [[dev-sk-ops-move_tasks]] — move one task or many, a subtask, or a section.
- [[dev-sk-ops-triage_inbox]] — triage the inbox of a deployment.
- [[dev-sk-ops-plan_deliverable]] — plan a deliverable with sections.
- [[dev-sk-ops-read_task_map]] — read the task map of a task.

Each workflow serves both modes. A headless Orbh session loads the shard with `flint shard start ops`, and follows the `> [!headless]` callouts of each stage (see `# Headless`). Load the source with `flint shard start-dev ops` only to edit it.

## Work Tied To An Operations Task

When the work of a session belongs to one Operations task, follow the Strike workflow `wkfl-strk-ops_do` (in a headless session, follow its `> [!headless]` callouts; load it with `flint shard start strk`). The work belongs to a task when a Strike preamble names it (`Operations task id: <id>`), when the Mesh task of the work has the frontmatter field `ops-task`, or when the operator names it. An agent can also find the work of its Flint by place: the deliverables whose `flintAddress` (or `flintId`) is the address (or the id) of the Flint (`flint org show --json`). A task found only by place needs the operator's confirmation before any write.

The workflow lives in the Strike shard because the Strike bind installs that shard into every bound Flint, and this source is local to one Flint. It obeys the Safety Rules above, and it adds three rules:

- It writes only to the linked task: `ops task start`, `ops comment add`, and `ops task done` (after the operator confirms).
- It posts one update at each meaningful point (start, blocker, review stop, done), and no other comment.
- Each update names the place of the work (the Flint, the Mesh task, the commits) and the place of the task (project, deliverable, section). Its last line is the agent signature line: `_An agent wrote this comment through the ops CLI (Orbh session <session id>)._`

## Sessions Started From the Web App

A person can start an agent session in a Flint of a computer from a task in the web app: the page Computers, or "Start session" in the task dialog (Task 1157 of the NUU Flint, on dev data first). The web app sends the action `session.start` through NUU Network to that computer and Flint, with the profile and the account that the person picked. The session runs headless in that Flint, with the title `Ops: <task title>`.

The session gets the task context in its prompt: the task title, the link of the task, the task id with its org and data mode, the command `ops task context <task> --org <org>`, the command `ops comment add <task> "<update>" --org <org>`, and the description of the task. So the work of that session belongs to that task: follow "Work Tied To An Operations Task", and read `ops task context` first. The web app records the launch on the task (the computer, the Flint, the target, the account, the request id, the session id) with a hash of the prompt, not the prompt text. The shard Network Access (`nax`, in the NUU Flint) teaches how an app does this.

## Rules

- This shard declares no Mesh artifact type. It writes no file to the Mesh. All data lives in the Operations backend.
- IDs are opaque strings. Quote them exactly.
- A user row ID (`ownerUserId`, `assigneeUserId`, `assigneeUserIds`) is not the same as an actor ID (`user:<clerkUserId>`). Use the user row ID for owners and assignees. Use the actor ID for comment mentions.
- Dates are strings. A deadline date is `YYYY-MM-DD` or `YYYY-MM-DD HH:mm` in local wall-clock time.

# Headless

A headless or subagent Orbh session has no person at the terminal. It loads this init with `flint shard start ops`, as an interactive session does. Follow the `> [!headless]` callouts of the workflows.

In a headless session, no operator watches your terminal. You work in NUU Operations through the `ops` CLI. Your channel to the operator, or to the session that dispatched you, is the turn result.

The sections above hold the model, the prerequisite, the modes, the organisations, and the web links. Read them. The rules below replace their human gates.

## Before You Write

1. Run `ops mode`. It confirms that the CLI is installed, and it shows the build mode, the data mode, the site, and the credential file. The command on PATH is `ops` for the dev build and for the prod build, so read the line `build mode`: the `ops` on PATH can be the prod build.
2. Confirm the data. If the prompt does not say which data to use, use dev data. A prod build is always on PROD data and ignores `OPS_DATA_MODE`: never run `OPS_DATA_MODE=dev ops …` with a prod build. For DEV data, use the dev launcher: `OPS_DATA_MODE=dev node "<monorepo>/apps/cli-ops/bin/ops.js" …` (§ Prerequisite). Run `… mode` with it and check `build mode dev` and `data mode dev` before the first write. Do not run `ops mode prod` or `ops mode dev` unless the prompt asks for that data.
3. Check the commands. `ops --help` must list `headers`, `route`, `search`, and `section`. When it does not, the build is of before the revamp: use the dev launcher (for DEV data), or stop and report it (for PROD data).
4. Confirm the organisation with `ops whoami`. If the prompt does not name one, use the personal workspace (`--org me`), and say so in the result. Pass `--org` on each command; do not change the stored default with `ops org use` unless the prompt asks.
5. If a command fails with `auth_required` or `unauthenticated` (exit code 3), stop. You cannot sign in without a human. Return the error and ask for `ops login`, `nuu login` (prod), or `ndv run nuu login` (dev).

## Rules With No Human Gate

These rules replace every "ask the operator" step of the interactive rules.

1. **Act only inside the request.** Change only the records that the prompt names or clearly implies. When the scope is not clear, choose the narrowest reading and record it in the result.
2. **Deletes.** Delete a record only when the prompt asks for that delete, or when the record is a test record that you created in this session. Before a cascading delete (project, deliverable, section with tasks, task with subtasks, deployment, plan), read what it holds and list it in the result. If the prompt does not clearly ask for a cascading delete, do not do it. Report it as a proposed action. The CLI refuses `ops project delete`, `ops deliverable delete`, `ops section delete`, `ops deployment delete`, and `ops plan delete` without `--yes` (`confirm_required`), and `ops task delete` of a task with subtasks without `--with-subtasks` (`task_has_subtasks`). Add the flag only for a delete that this rule allows. Do not mark a deliverable done unless the prompt asks for it.
3. **Use `--json` for every command** and take IDs only from JSON output. With `--json`, an error is one JSON document on stderr (`{"error": {code, message, exitCode, hints}}`). Read its `hints`: they name the next step.
4. **Undo.** Undo only an action that you did in this session. Read the stack first (`ops history --on <record> --json`, or `ops plan history <plan> --json`). Undo only when the head entry is that action, with `ops undo --on <record> --expect <seq>` (or `ops plan undo <plan> --expect <seq>`). If the head is another action, or the CLI reports `undo_state_changed`, do not undo. Report it.
5. **Test records.** Delete every test record before you return. List any record that you could not delete, with its ID and kind.
6. **Refusals.** When the backend refuses a write (for example `subsection_blocked`, `subtask_too_deep`, `node_gated`), do not work around the rule. Report the error code, what it means, and the next action that the operator can take.
7. **Read before you act on a task.** Before you change or report on one existing task, read it with `ops task context <task> --json`. It holds the description and the newest 200 comments (`--comments <n>`, up to 500), with no change events. When `commentsTruncated` is true and the older comments matter, read them with `ops call updates.timeline` and its `before` cursor.
8. **Network errors (exit 4).** Retry a read once. Before you repeat a write, read the record or the list it would change, and check whether the write landed: a network error can come after the commit, and the CLI sends no idempotency key. Never repeat a create or a comment without that check. When you cannot tell whether a write landed, do not repeat it: report the command, the record, and the uncertain state in the result. This rule also applies to `bad_response` and response-body read failures, which can return exit 1. Check the affected records before any retry. If the result is unclear, report it and do not repeat the write.
9. **Ambiguous references.** On `<kind>_ambiguous` (exit 2), choose the candidate only when the prompt makes the choice clear. Else report the candidates with their IDs, and do not write.

## Workflows in a Headless Session

Use the workflows and the skills of this init, and follow the `> [!headless]` callouts of the workflows. `flint shard start ops` lists them:

- [[dev-wkfl-ops-interact]] — any request about Operations.
- [[dev-wkfl-ops-plan_layout]] — a written plan to a plan on the canvas.
- [[dev-wkfl-ops-backlog_triage]] — review and triage a backlog.
- [[dev-wkfl-ops-deliverable_setup]] — a deliverable from a scope description.
- The skills: [[dev-sk-ops-create_task]], [[dev-sk-ops-move_tasks]], [[dev-sk-ops-triage_inbox]], [[dev-sk-ops-plan_deliverable]], [[dev-sk-ops-read_task_map]].

When the work of this session belongs to one Operations task (a Strike preamble names it, the Mesh task of the work has the field `ops-task`, or the prompt names it), follow the Strike workflow `wkfl-strk-ops_do` and its `> [!headless]` callouts (`flint shard start strk`). It reads the task, starts it, and posts one place-relative update at each meaningful point (start, blocker, review stop, done). It writes only to the linked task, it never writes to a task found only by place, and each comment ends with the agent signature line: `_An agent wrote this comment through the ops CLI (Orbh session <session id>)._` See § Work Tied To An Operations Task above.

A person can start this session from a task in the web app (Computers, Start session). Then the prompt holds the task context: it starts with `Work on the Operations task "<title>".`, and it names the task id, its org, and its data mode. That task is the task of this session: run `ops task context <task> --org <org>` first, and follow `wkfl-strk-ops_do`. See § Sessions Started From the Web App above.

## Orbh Interface Keys

For work that takes more than a few minutes, set Orbh session keys:

```bash
flint orbh session set phase <short-phase>      # e.g. reading-plan, placing-steps, cleanup
flint orbh session set progress "<n>/<total> <unit>"
flint orbh session set blockers "<what stops you>"
```

### Phase Values

The callouts of the workflows set these phases:

| Workflow | Phases, in order |
|----------|------------------|
| [[dev-wkfl-ops-interact]] | `grounding`, `resolving`, `writing` |
| [[dev-wkfl-ops-plan_layout]] | `reading-plan`, `placing-steps` |
| [[dev-wkfl-ops-backlog_triage]] | `reading-backlog`, `applying` (Apply mode only) |
| [[dev-wkfl-ops-deliverable_setup]] | `reading-scope`, `creating` |

## Result Delivery

End every turn with `flint orbh session return --finish "<result>"`. Write the result in ASD-STE100 style. Include:

- The mode (dev or prod data) and the organisation.
- Every record that you created, changed, or deleted: kind, ID, address, and title.
- Every refusal, with its error code.
- Test records that remain, if any.
- A web link for the main record, when one helps.
