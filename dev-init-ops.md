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

Load this shard when a request touches Operations records: projects, deliverables, sections, tasks and subtasks, task groups, review requests, the people looped into a task, backlogs, deployments and their inboxes, deadlines, blockers, plans and plan steps, Trident streams and workspaces, shares, holds, calendars and events, comments and the images and videos in them, notifications, activity, favourites, notepads, or the day planner.

**Start here: [[dev-sk-ops-use_operations]].** It is the main skill of this shard. It gives the model, the builds and the sign-in, the org, references and places, the command for each job, `ops query` and `ops call` for any other read or write, seventeen recipes, the safety rules, and troubleshooting. Follow it for any Operations request. The other skills and workflows go deeper on one job.

**Tasks have two parts.** Each task that this shard makes has a task note in this Flint (the content) and an Ops task (the state), linked both ways. Make each task with `flint shard ops task-new`, and do it with the task workflows. § Tasks: the Task Note and the Ops Task gives the rules. Before you create, do, or close a task, read [[dev-knw-ops-task_model]] and [[dev-knw-ops-task_cli]]. Since Operations 0.8.0 this shard holds the work of the former Tasks shard (`task`), which is deprecated.

## The Projects of This Flint

**Read `Mesh/(System) Ops Projects.md` when you start.** It lists the projects of the Ops org that matter to this Flint. The note uses three rules:

1. A project is in the section `## Projects of This Flint` when the project, or one of its deliverables, has this Flint as its Flint place.
2. A project is also in that section when its name is the name of this Flint.
3. A project is in the section `## Other Likely Projects` when the route decision of Ops gives a place in it with a score of 0.3 or more.

The note also has a table of all projects of the org, each with its address. The text under `# Notes` is the text of a person: follow it. Use the note to know the work of this Flint and to choose the place of a new task. When the note has `complete: false`, a read of Ops failed: its section `## Status` names each failed read.

- The setup of this shard ([[dev-setup-ops]]) writes the note one time: `flint shard ops projects-note`.
- When the note is missing, or its field `updated` is older than 7 days, or it has `complete: false`, or a project of the work is not in it, run `flint shard ops projects-note` again. It keeps the `id`, the section `# Notes`, and the line ends. It reads only from Ops.
- When a person or another session writes the note during the run, the script writes nothing and refuses with `note_changed`: run it again. When a read of Ops fails, the script exits 1. It keeps the old project sections, or it writes nothing when the project list fails.
- The note is a list, not the state. For the current state of a project, read Ops: `ops project show "<address>" --json`.

## What Operations Is

Operations (Ops) is the delivery record of a person and of an organisation. The model, since the revamp of ops-command-1021 (2026-10-21):

1. An **org** holds **projects**. A project has a hidden **context** (Markdown for search and suggestions).
2. A project has **deliverables**. A person marks a deliverable done (`ops deliverable done`). There is no closer and no "Delivered" task. A deliverable can move to another project with its sections and tasks (`ops deliverable move <d> --to <project>`).
3. A **section** is a list of tasks. It has one home: a deliverable, a project (no deliverable yet), a deployment (its inbox), or the org. The former word is "subsection". Each project, deliverable, and deployment has one **locked section with its name** (Task 406). A section has no priority (Task 413).
4. The **backlog** of a project is its section with the role `backlog`. The **master backlog** is the backlog section of the org.
5. A **task** lives in a section, or it has no home (unplaced). A task can have **subtasks**: full tasks with a parent, **one level only**. A subtask has no subtasks (`subtask_too_deep`). A subtask has the home of its parent. Lists show root tasks, each with a count. A **hold** is a short lease of an actor on a task (`ops task holds <task>`).
6. A **deployment** is abstract: a name, a free version label, a status (`live`, `paused`, `retired`), notes, and a context. A live deployment has an **inbox** section for the tasks that come up while it runs (tags `feedback`, `hotfix`, `ongoing`, `recurring`). A check schedule adds a check-up task. A deliverable can start from the inbox and ship to the deployment.
7. Each project, deliverable, section, task, deployment, and notepad has an **address**: `@v1/<org>/<kind>/<key>#ops`. Every command prints it. Name a record by its address when you have it.
8. **Deadlines** own dates and attach to records. **Plans** are graphs of steps across projects. **Notepads** hold text with task mentions. **Calendars** hold **events**: a timed event, an all-day event, or a **period** (an all-day event of more than one day). An event can repeat and can attach to a task or a deadline.
11. **Trident** is the stream board. A **stream** is a lane of work with steps in zones (the shore and planned, active, done), parked steps, substreams, cross links to other streams, drawings, and the places that it serves. A **workspace** is a named set of streams of one person.
12. A **share** gives another org or one person access to one record (`reader` or `editor`).
9. **Blockers** say why work waits: what it waits on, the next step, an owner, and the next check-up date. A blocker links records and gates no status. It is open, resolved, or dropped.
10. A task has no type, no stage, and no outcome: its state is its status and its result. The people **looped in** follow a task beside its owner and hear every comment. A **task group** is a set of tasks that are done together. A **day plan** is the ordered tasks of one person for one date.
13. An **agent session** is at an Ops object (a task, a section, a deliverable, or a project) when it keeps that object as an item (`flint orbh objects add <address> --subscribe`). Its current object is its newest Ops item. A project and a deliverable hold the **agent defaults** of a new agent session: the Flint, the computer, the site, the profile, and the mode.

```
org
├── project ── section (backlog) ── task ── subtask …
│   ├── section
│   ├── deliverable ── section ── task ── subtask …
│   └── deployment ── section (inbox) ── task
├── section (backlog: the master backlog)
├── deadlines, blockers, plans ── steps, notepads, task groups
├── streams ── steps (shore, planned, active, done), substreams, drawings
├── calendars ── events (timed, all-day, periods), shares of records
└── activity (Waybill), notifications, comments on tasks
person: a day plan per date, favourites per org, Trident workspaces per org
```

The service derives some states. A section is done when all its root tasks are done. A deliverable is done only when a person marks it. Read [[dev-knw-ops-data_model]] for every entity, field, rule, and error code. Read [[dev-knw-ops-canvas]] before you place or move plan steps.

### Which Command For Which Job

| Job | Command |
|-----|---------|
| See the places of an org with their addresses | `ops headers [--project <p>]` |
| Find a task or a place | `ops search "<text>"`, `ops task search "<text>"` |
| Read a task before you work on it | `ops task context <task>` |
| See where a new task belongs | `ops route "<text>"` |
| Create a task in the right place (a task note and an Ops task) | `flint shard ops task-new "<title>" --section|--project|--deliverable|--deployment|--parent <ref>` ([[dev-sk-ops-create_task]]) |
| Plan a task, do a task, or create and do it | [[dev-wkfl-ops-create_task]], [[dev-wkfl-ops-do_task]], [[dev-wkfl-ops-create_and_do_task]] (§ Tasks: the Task Note and the Ops Task) |
| Close a task with its result | `ops task result <task> "<text>"`, `ops task close <task>`, then `flint shard ops task-sync <task>` ([[dev-sk-ops-close_task]]) |
| Move tasks (with their subtasks) | `ops task move <tasks...> --to <place>` |
| Move a deliverable to another project | `ops deliverable move <deliverable> --to <project>` |
| See a task with its home, groups, and lineage | `ops task map <task>` |
| Plan a deliverable | `ops deliverable create … --section <title>`, `ops section create`, `ops section reorder`, `ops section deps` |
| Finish or reopen a deliverable | `ops deliverable done|reopen <deliverable>` (ask the operator first) |
| Run a deployment | `ops deployment inbox|status|schedule|check|start-deliverable` |
| Give a place its context | `ops project|deliverable|section|deployment context set` |
| Record why work waits, and follow it up | `ops blocker create <title> --check <date> --on <record>`, `ops blocker list --due`, `ops blocker delay|resolve|drop` |
| Plan your day | `ops day show|add|reorder|carry` |
| Show an image or a video in an Update of a task (a screenshot, a screen recording) | `ops media attach <task> <path...> --body "<text>" --json` (images at most 20 MB, videos at most 100 MB; [[dev-knw-ops-cli]] § media) |
| Ask for a review of a task, give the verdict, read your queue | `ops task review request|approve|changes|dismiss|cancel <task>`, `ops review list` |
| Run a lane of work on the Trident board | `ops stream list|show|create|update|attach`, `ops stream step add|add-task|move|park|shore`, `ops stream substream …`, `ops workspace …` |
| Split a step, set its state, or move its links | `ops step split|split-beside|state|done-next|move-links|remove-links|place` (a plan step or a stream step) |
| Share a record with another org or a person | `ops share list|add|permission|remove <…>`, `ops share with` |
| See who holds a task | `ops task holds <task>` |
| Put a meeting, a day, or a period on a calendar | `ops calendar list|create|default`, `ops event create <title> (--start … --end … \| --date <day> [--until <day>])`, `ops event list --from today --days 7` |
| See the agent sessions at Ops objects now | `ops agents [--computer <name>] [--all]` |
| Read or set the agent defaults of a place | `ops agents defaults <ref>`, `ops agents defaults set <project or deliverable> [--flint] [--computer] [--site] [--profile] [--mode]` (ask the operator first) |
| Answer a question that no command answers | `ops query <table> --where <field><op><value>` (see [[dev-sk-ops-use_operations]] § 7) |
| Run an op that no command has | `ops ops`, then `ops call <op> '<json>'` |

## Prerequisite

Before any work, make sure that the `ops` CLI is installed and that a nuu credential is signed in.

```bash
# From the NUU monorepo. Choose one build.
ndv use ops dev      # the `ops` command on PATH runs the dev build
ndv use ops prod     # the `ops` command on PATH runs the prod build
ops whoami           # a dev build shows the row `data mode`; a prod build shows the row `site`

# Sign in. The CLI uses the shared nuu CLI credential.
ops login            # the browser sign-in
nuu login            # prod credential: ~/.nuucognition/auth.json
ndv run nuu login    # dev credential:  ~/.nuucognition/auth.local.json (local nuu-account on port 3000)
```

Outside the monorepo, the npm package `@nuucognition/ops-cli` gives one command, `ops`: the prod build (Node.js 24 or newer). It is ready but not published yet; after the publish, `npm install -g @nuucognition/ops-cli`. `nuu login`, `flint login`, and `ops login` share the prod credential `~/.nuucognition/auth.json`.

ndv names the link `ops` in both profiles. The name `ops-dev` is only a package bin inside the monorepo, so do not expect it on PATH. The CLI source is `apps/cli-ops` in the monorepo.

**The `ops` on PATH can be the prod build.** A prod build has no data mode: it always uses PROD data and ignores `OPS_DATA_MODE`. So `OPS_DATA_MODE=dev ops task create …` with a prod build **writes to PROD**. Before the first write, do these checks:

1. Run `ops whoami` and read the row after `sign-in`. A prod build shows `site`, and it uses PROD data. A dev build shows `data mode`. Write only when the data is the data of the request.
2. Run `ops --help`. It must list `headers`, `route`, `search`, and `section`. When it does not, the build is of before the revamp: rebuild it (`ndv build ops` or `ndv build ops prod`), or use the dev launcher below.

For DEV data, run the dev launcher of the monorepo checkout with `OPS_DATA_MODE=dev`. It is always a dev build, so the variable holds for it. Without the variable, the dev launcher uses PROD data:

```bash
OPS_DATA_MODE=dev node "<monorepo>/apps/cli-ops/bin/ops.js" mode          # build mode dev; data mode dev (env)
OPS_DATA_MODE=dev node "<monorepo>/apps/cli-ops/bin/ops.js" headers --org me
```

`<monorepo>` is `Repos/main` of the Tinderbox (on this machine: `/Users/nathan/nuu/(Tinderbox) NUU Cognition/Repos/main`). When its bundle `dist-dev/` is older than the source, the dev launcher runs the source and prints one note on stderr. The prod launcher prints a warning when its bundle `dist/` is older than the source. In this shard, `ops` names the command that you chose by these checks. There is no `ops logout`, on purpose. If a command fails with `auth_required` or `unauthenticated` (exit code 3), the credential is missing or expired. Tell the operator to sign in again. Do not try to repair the credential files.

## Modes

A prod build has no data mode, and it has no command `ops mode`. In a dev build, the data mode selects the Convex deployment and the credential together.

| Build on PATH as `ops` | Data | Deployment | Credential |
|------------------------|------|------------|------------|
| Prod build (`ndv use ops prod`) | always prod | `acoustic-weasel-248` | `auth.json` |
| Dev build (`ndv use ops dev`), no choice | **prod (default since Task 415)** | `acoustic-weasel-248` | `auth.json` |
| Dev build with `OPS_DATA_MODE=dev` | dev | `next-dalmatian-912` | `auth.local.json` |

**A dev build uses PROD data by default** (Task 415), with the sign-in of `nuu login`, and prints one stderr note: `note: this dev build uses PROD data …: each write is real. For dev data: OPS_DATA_MODE=dev.` A dev build takes the first choice that it finds: `OPS_DATA_MODE`, a test run (dev data), `NUU_DATA_MODE`, the shared file `~/.nuucognition/dev-data.json` (`ops mode dev|prod` and `flint env use` write it), then prod. A prod build ignores all of them. The old file `~/.nuucognition/ops-dev-data.json` is not read any more. For dev data, set `OPS_DATA_MODE=dev` on each command. Before a write with a dev build, run `ops mode` and read the line `data mode` and its source. A test write on prod data is a real write that people see.

## Organisations

Every Operations record belongs to one organisation (`orgSlug`). There are two kinds of organisation:

- **Personal workspace.** Every person has one. Its `orgSlug` is the person's Clerk user ID (for example `user_2abc…`). In a web URL its token is `me`.
- **Team organisation.** Its `orgSlug` is the team slug. The operator's JWT lists the teams the operator belongs to.

The CLI acts in the active organisation: `--org <slug|name|me>` on the command line, else the stored default (`ops org use <slug|name|me>`, under `~/.nuucognition/ops/`), else the personal workspace. A command on a record given by ID or URL acts in the record's own organisation. Prefer `--org` on each command over a change of the stored default. Use the personal workspace for tests on prod data.

## Safety Rules

The gateway accepts the operator's credential. So every write is the operator's own write, and Waybill records the operator as the actor. The gateway also adds an agent mark to the write. Each Waybill event of the write has `context.via: {kind: "agent", client?, session?}`, and its notification has `data.via` except for comment notifications, which have no agent mark. The CLI sends `client` (`ops-cli/<version>`) and, when `ORBH_SESSION_ID` is set, `session`. The activity log and the task timeline show a small "via agent" label after the operator's name. A comment that `ops comment add` writes stores the same mark as its `via`, and the task timeline shows the label after the comment author (Task 357). The mark is a label only: it changes no access, and it does not change the actor or undo. A comment edit, a reaction, `waybill.undo`, `waybill.redo`, and notification reads carry no mark. Prod data shows the mark since the prod deploy of Operations 0.6.0 (Task 331; for comments, Task 357). Obey these rules.

1. **Act as the operator.** Do only what the operator asked, in the organisation the operator named. Do not change records that the request does not name.
2. **Check before a delete.** A delete can cascade. `projects.remove` deletes every deliverable, section, and task of the project. `deliverables.remove` deletes its sections and tasks. `sections.remove` deletes its tasks. A task with subtasks needs `--with-subtasks`, and then its subtree goes too. `plans.remove` deletes every step and cannot be undone in practice. `ops calendar delete` deletes each event of the calendar. `ops stream delete` is a soft delete (`ops stream undo` brings the lane back), and `ops workspace delete` removes only the set of streams. Before a delete, read the record and what it holds, and tell the operator what goes with it. The CLI refuses these deletes without `--yes` (`confirm_required`, exit 2): `ops project delete`, `ops deliverable delete`, `ops section delete`, `ops deployment delete`, `ops plan delete`, `ops blocker delete`, and `ops calendar delete`. Add `--yes` only after the operator confirms.
3. **Use `--json`.** Parse the JSON output. Do not parse the short text output. Take IDs from the JSON, and never construct or guess an ID.
4. **Never undo without reading the history.** Undo acts on the operator's last action in a scope, and that action can be one the operator made in the web app. Read the scope history first (`ops history --on <record>`, or `ops plan history <plan>`), confirm that the head entry is the action you expect, and pass its `seq` with `--expect <seq>`. The CLI refuses an undo or a redo without `--expect` (`expect_required`) unless you pass `--dry-run`. See [[dev-knw-ops-data_model]] § Undo and Redo.
5. **Clean up test records.** When you create records only to test, delete them when the test is done. Report every record you could not delete.
6. **Respect the derived state.** Do not try to force a status that the service derives. For example, a task in a blocked section cannot go to `done` (`subsection_blocked`, the code keeps the former word). Finish the upstream work, or tell the operator. Do not mark a deliverable done unless the operator asks: it is the decision of a person.
7. **Keep titles exact.** `tasks.create` reads a trailing space and one digit `0`–`7` as a rarity and removes it from the title. Do not end a task title with ` <digit>` unless you want that rarity.
8. **Network errors (exit 4) and writes.** A network error can come after the service committed the write: the CLI sends no idempotency key, so a repeated write can make a duplicate. A read (`list`, `show`, `context`, `search`, `history`, `ops ops`) is safe to run again: retry it once automatically. Before you repeat a write, read the record (or the list it would change) and check whether the write landed. When it landed, do not repeat it. When you cannot tell, report the uncertain state with the command and the record. Never repeat a create (`create`, `add`, `insert`, `comment add`) or a comment without that check. A write that sets one value (for example `task start`, `task done`, `update --priority`) is safe to repeat after the check shows the old value. This rule also applies to `bad_response` and response-body read failures, which can return exit 1. Check the affected records before any retry. If the result is unclear, report it and do not repeat the write.

## Tasks: the Task Note and the Ops Task

A task is one row of the Ops table `tasks`: any coherent unit of work. Each task that this shard makes has two parts, linked both ways (Task 1291 of the NUU Flint). Strike and Trident attach to the Ops task. An Orbh session keeps the Ops task in its context as an object of the Objects Protocol. The full model is in [[dev-knw-ops-task_model]], and each command is in [[dev-knw-ops-task_cli]].

| Part | Where | It holds | The link |
|---|---|---|---|
| Task note | `Mesh/Types/Tasks/(Task) <n> <title>.md`, tag `#proj/task`, template `tmp-proj-task-v0.2` of the Projects shard | The content: the context, the requirements, the definition of done, the Task Log, and the notes | Its field `ops` holds the Ops address |
| Ops task | NUU Ops | The state: the status, the result, the place, the lineage, the task groups, and the attachments | Its field `note` holds the note address (`@v1/<org>/task/<note id>#flint/<flint>`), and its body stays empty |

- **Make each task with `task-new`:** `flint shard ops task-new "<title>" [<place>] [--repo <name>] [--body-file <path>]`. It writes the note, makes the Ops task, and links both. Do not write a task note by hand. Do not make an Ops task alone with `ops task create` for work in this Flint.
- **A planning write can make Ops tasks alone.** A write that makes many tasks for later work in Ops (a deliverable setup, a plan, an inbox triage) can use `ops task create`. Such a task gets its note when its work starts: `flint shard ops task-new --ops <ref>` ([[dev-wkfl-ops-do_task]] Stage 1 does it). A task that a person makes in the web, or that Strike makes, also has no note.
- **Ops owns the state.** `flint shard ops task-sync <ref>` copies the status and the date of the close into the note, in one direction only. Do not edit `status`, `completed`, or `ops` of the note by hand: change the Ops task, then run `task-sync`. Link a note that exists with `flint shard ops task-link "<(Task) N Title>" [--ops <ref>]`.
- **The Ops address stays the key.** The task object, the invocation input `task`, and the attachments use the Ops address. Ops shows the note as "Open in Obsidian". To keep another Mesh note with a task, attach it: `ops task attach <ref> note "<Mesh path>"`.
- The Projects shard does not change: its own workflows make task notes with no Ops task. Do not mix the two shards on one task.

### The Hard Rule

**Before work that changes a file or makes an artifact, the session adds the task as an object:** `flint orbh objects add <task address> --subscribe`.

- When no task fits the work, create one ([[dev-wkfl-ops-create_task]], or [[dev-wkfl-ops-create_and_do_task]] to create and do it). Then add its Ops address as an object.
- Reading, research with no artifact, and an answer in the conversation need no object.
- Take the task only for a change that must not collide with another session (`flint orbh objects take <task address>`, then `return`). When a verb answers `held` (exit 9), send a request (`flint orbh objects request <task address> --note "<why>"`). Do not get around the hold.
- For a task group, add each task of the group: the object of a task group does not resolve. When you dispatch a subagent for the work, put the address of the task in the prompt.
- [[dev-sk-ops-use_task]] gives the steps. The rules of an object are in the skill `sk-foh-use_object` of the Orbh shard.

### Task or Subtask

- When new work serves the intent of a task object of the session, it is a **subtask** of that task: a Strike target mounted on the Ops task, not a new task.
- When the work does not serve that intent, it is a **new task**. Create it, or add the task that fits as an object.
- Ops has subtasks of its own (one level only, `subtask_too_deep`). Make an Ops subtask only when the person asks for one.

### Placement

A task has 0 or 1 home and 0 or more `related` links. A task with no home is unplaced, and that is normal. A place that the person or the prompt gives wins: give it to `task-new` (`--section`, `--project`, `--deliverable`, `--deployment`, `--parent`, `--master`). Else read the hints (`ops task hints --flint <Flint id> --text "<title>"`) and apply the rule of [[dev-sk-ops-place_task]]: one clear hint sets the home; two or more hints add a `related` link each; no hint leaves the task unplaced. The projects note (§ The Projects of This Flint) and `ops route "<text>"` help to choose. A task whose work changes code in a repository has a `repo` link (`--repo <name>`).

### Status, Result, Review, and Close

```
todo → doing → done
          ↑       │
          └───────┘ reopen
```

- A task has no type, no stage, and no outcome. Its state is its status and its result. Progress goes into the result: `ops task result <ref> "<text>"` (what the work gave, the commits, the session).
- **Each finished task gets exactly one review request in Ops**, after its result and before any close, in each work workflow (`do_task`, `create_and_do_task`, `do_task_group`): `ops task review request <ref> --note "<the summary, the commits, and what to check>" --json`. Record its `itemId`. A task of a team with no owner refuses with `review_no_reviewer`: then give `--to me`. A blocked or unfinished task gets no request.
- After each change of the Ops state (a start, a close, a reopen), run `flint shard ops task-sync <ref>`.
- [[dev-sk-ops-close_task]] gives the close.

### WIP Commits

Work that changes code in a repository makes WIP commits. Read [[dev-knw-ops-task_commits]] before the first commit. Commit only your paths on the machine branch, with the subject `[OR] wip: <Flint name>/Task <short id> <what changed>` (the short id is the first 8 characters of the Ops id). Record the commits in the result of the task.

### The Task Scripts

| Script | Command | Output (JSON) |
|---|---|---|
| task-new | `flint shard ops task-new "<title>" [--repo <name>] [--org <org>] [--unplaced \| --section <s> \| --project <p> \| --deliverable <d> \| --deployment <d> \| --parent <task> \| --master] [--priority <p>] [--assign <member>] [--body-file <path>]` | `{ number, title, path, note, noteLabel, ops }` |
| task-new for an Ops task that exists | `flint shard ops task-new ["<title>"] --ops <ref> [--org <org>] [--body-file <path>]` | The same |
| task-link | `flint shard ops task-link "<(Task) N Title>" [--ops <ref>] [--org <org>] [create options]` | `{ number, title, path, note, noteLabel, ops, created }` |
| task-sync | `flint shard ops task-sync "<(Task) N Title>"`, or the Ops address | `{ number, title, path, ops, status, changed, noteLinked }` |
| projects-note | `flint shard ops projects-note [--org <org>] [--dry-run]` | `{ ok, path, org, flint, linked, likely, projects, changed, complete, failed }` |

The scripts run `ops` through `NUU_OPS_CLI` (default `ops`). Leave it unset for work on prod data. [[dev-knw-ops-task_cli]] § The Note Scripts gives each option, each refusal, and the map of the status. When the output of `task-new` has `ops: null`, the note exists and the Ops part failed: run the command of `next`. Never run `task-new` again for the same task.

### Task Invocations

Each task workflow has an invocation file (`wkfl-ops-<name>.invocation.json`, format `shard-invocation/0.3`). The input `task` is the address of the task (or of the task group for Do Task Group). When the task does not exist at the open, set it later: `flint shard invocations set-input <id> task=<address>`.

| Workflow | Start | Next workflow (`then`) |
|---|---|---|
| Create Task | `flint shard invoke ops create_task` | `ops do_task` |
| Scope Task | `flint shard invoke ops scope_task [--input task=<address>]` | `ops do_task` |
| Do Task | `flint shard invoke ops do_task --input task=<address>` | `ops review_task`, in a headless session only |
| Create and Do Task | `flint shard invoke ops create_and_do_task` | `ops review_task`, in a headless session only |
| Review Task | `flint shard invoke ops review_task --input task=<address>` | — |
| Do Task Group | `flint shard invoke ops do_task_group [--input task=<task group address>]` | — |

- Mark each step with `flint shard step done <step> --evidence "<…>"`, or skip it with `flint shard step skip <step> --reason "<why>"`. Outside an Orbh session, add `--invocation <id>`.
- Close the invocation with `flint shard invocations close <id> --outcome done` when the workflow is finished. Only a `done` close prints the next workflow.
- Inside another open frame, a task workflow is a child frame. After its `done` close, continue the parent frame: do not close the session, and do not return in a headless session.
- An invocation that a session opened with the former Tasks shard (`flint shard invoke task …`) stays a record of that shard: continue it there, or close it with `--outcome abandoned` and open a new one here.
- When no invocation is open, follow the stages with no record.

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

- Most commands are `ops <noun> <verb>`: `org`, `member`, `project`, `deliverable`, `section`, `task`, `deployment`, `comment`, `backlog`, `deadline`, `blocker`, `plan`, `step`, `stream`, `workspace`, `share`, `calendar`, `event`, `review`, `agents`, `media`, `notify`, `activity`, `favourite`, `notepad`, `day`, `people`, `home`, `address`, `query`. These have no noun: `ops login`, `ops whoami`, `ops ops`, `ops call`, `ops headers`, `ops route`, `ops search`, `ops history`, `ops undo`, and `ops redo`. A dev build also has `ops mode`. `ops day-label` is gone (Task 390): a day label is an all-day event now (`ops event create <title> --date <day> [--until <day>]`). `ops <noun> <verb> --help` shows the arguments, the options, and examples. A noun with no verb (`ops task`) is a usage error that lists the verbs. The former words still work and are hidden: `ops subsection` and `--subsection`. `ops folder` is gone (0.1.0-dev.3).
- A record argument takes an ID, an address, a web URL, a title, or a path (`"Alpha › v1 › Backend"`). A title that matches more than one record fails with `<kind>_ambiguous` (exit 2) and lists the candidates with their paths. Run the command again with the ID or the address. Never guess.
- A place of `ops task move --to` is `section:<ref>`, `project:<ref>` (its backlog), `deliverable:<ref>` (its main section: the named section of the deliverable), `deployment:<ref>` (its inbox), `parent:<task>` (a subtask), `backlog`, `master`, or `unplaced`. A move takes the subtree.
- Every line that shows a record ends with its address, and `--json` has an `address` field. Keep it for the next command.
- `--json` puts exactly one JSON document on stdout. Errors go to stderr as `error <code>: <message>`, then indented hints that name the next step. With `--json`, an error is one JSON document on stderr: `{"error": {code, message, exitCode, hints, ...}}`, and stdout is empty.
- Exit codes: 0 success, 1 service refusal or other failure (a write may already have committed), 2 usage error, ambiguous reference, or guard, 3 auth, 4 network. An extra argument is a usage error: quote a text argument that has spaces. Only these inputs read stdin when you pass `-`: the body of `ops task create|update --body -`, the body of `ops comment add|edit`, the text of `ops media attach --body -`, a context (`ops <kind> context set <ref> -`), `ops notepad create --body -`, the text of `ops notepad append <notepad> -` and `ops notepad write <notepad> -`, and the args of `ops call <op> -`. `--body-file <path>` reads a task body from a file. Every other text argument is literal text: quote it.
- `ops task context <task>` reads what an agent needs about one task: the facts, the project description, the description, and the newest comments (200 by default, `--comments <n>` up to 500), with no change events. Run it before you work on an existing task.
- `ops route "<text>"` asks Ops where a text belongs: the ranked places with a score and a reason (the decision model Jev when Smart suggestions are on, else the text match). `ops task create --route` takes the top place and prints it. Check the printed place. When the score is low, ask the operator or name the place yourself.
- `ops call <op> '<json>'` sends any allowlisted op. `ops ops` prints the manifest. An op that a deployment does not have yet fails with `agent_unknown_operation`, and the message says that it is not deployed there yet. The CLI (since 0.1.0-dev.3) has no fallback to the former ops of before the revamp (a move through `tasks.place`, a close through `tasks.update`, the section writes of `subsections.*`, the old project snapshot): it needs a deployment with the current ops. The one fallback that stays is the read of the headers: on a deployment with no `headers.forOrg`, a read goes on without the addresses and the paths of the headers, and a verb that needs the headers fails.
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

The task workflows (a task note and an Ops task for each task):

- [[dev-wkfl-ops-create_task]] — make a `todo` task for later work, place it with the hint rule, and scope it.
- [[dev-wkfl-ops-scope_task]] — research first, then write the scope and the definition of done into the task note.
- [[dev-wkfl-ops-do_task]] — add the task as an object, work, make the WIP commits, write the result with the commits, ask for the review in Ops, and give a summary.
- [[dev-wkfl-ops-create_and_do_task]] — create a task, add it as an object, and do it in one run, with the review request after the result.
- [[dev-wkfl-ops-review_task]] — a second session checks the work against the task note, and writes a pass into the result or the findings into the note.
- [[dev-wkfl-ops-do_task_group]] — make or take a task group, add each of its tasks as an object, do each task, and ask for the review of each finished task.

The task skills: [[dev-sk-ops-capture_as_task]] (record work that is already done), [[dev-sk-ops-use_task]] (keep a task in the session as an object), [[dev-sk-ops-place_task]] (the placement rule with the hints), [[dev-sk-ops-split_task]], [[dev-sk-ops-merge_tasks]], [[dev-sk-ops-continue_task]], [[dev-sk-ops-chain_tasks]], [[dev-sk-ops-group_tasks]], and [[dev-sk-ops-close_task]]. The task knowledge: [[dev-knw-ops-task_model]], [[dev-knw-ops-task_cli]], and [[dev-knw-ops-task_commits]].

Each workflow serves both modes. A headless Orbh session loads the shard with `flint shard start ops`, and follows the `> [!headless]` callouts of each stage (see `# Headless`). Load the source with `flint shard start-dev ops` only to edit it.

## Work Tied To An Operations Task

When the work of a session belongs to one Operations task, follow the Strike workflow `wkfl-strk-ops_do` (in a headless session, follow its `> [!headless]` callouts; load it with `flint shard start strk`). The work belongs to a task when a Strike preamble names it (`Operations task id: <id>`), when the Mesh task of the work has the frontmatter field `ops-task`, or when the operator names it. An agent can also find the work of its Flint by place: the deliverables whose `flintAddress` (or `flintId`) is the address (or the id) of the Flint (`flint org show --json`). A task found only by place needs the operator's confirmation before any write.

The workflow lives in the Strike shard because the Strike bind installs that shard into every bound Flint, and this source is local to one Flint. It obeys the Safety Rules above, and it adds three rules:

- It writes only to the linked task: `ops task start`, `ops comment add`, and `ops task done` (after the operator confirms).
- It posts one update at each meaningful point (start, blocker, review stop, done), and no other comment. An answer to a comment of a person is not an extra update: answer each one as a comment (§ Agent Sessions at Ops Objects).
- Each update names the place of the work (the Flint, the Mesh task, the commits) and the place of the task (project, deliverable, section). Its last line is the agent signature line: `_An agent wrote this comment through the ops CLI (Orbh session <session id>)._`

## Sessions Started From the Web App

A person can start an agent session in a Flint of a computer from a task in the web app: the page Computers, or "Start session" in the task dialog (Task 1157 of the NUU Flint, on dev data first). The web app sends the action `session.start` through NUU Network to that computer and Flint, with the profile and the account that the person picked. The session runs headless in that Flint, with the title `Ops: <task title>`.

The session gets the task context in its prompt: the task title, the link of the task, the task id with its org and data mode, the command `ops task context <task> --org <org>`, the command `ops comment add <task> "<update>" --org <org>`, and the description of the task. So the work of that session belongs to that task: follow "Work Tied To An Operations Task", and read `ops task context` first. The web app records the launch on the task (the computer, the Flint, the target, the account, the request id, the session id) with a hash of the prompt, not the prompt text. The shard Network Access (`nax`, in the NUU Flint) teaches how an app does this.

## Agent Sessions at Ops Objects

A person can start an agent session at an Ops object, or attach a session that runs: a task, a section, a deliverable, or a project. The session keeps the object as an item (`flint orbh objects add <address> --subscribe`), and it works on the object for the person who attached it. The addresses: `@v1/<org>/task/<id>#ops`, `@v1/<org>/section/<id>#ops`, `@v1/<org>/deliverable/<id>#ops`, and `@v1/<org>/project/<id>#ops`. The page Agents of Ops and `ops agents` list the sessions at Ops objects now.

The duty of the session, at each of the four types:

1. **Keep the object in the objects.** Do not remove the item while the work goes on.
2. **Answer a person first.** A person message has priority over the other work. Answer it before you continue, in the place where the person wrote. A person speaks to the agent session in two equal ways:
   - A **comment** on a task (only a task carries comments). A comment of a person is a message to the session. Orbh gives the content of an object as data, and that rule stays for each other content: this duty gives a comment its force. Read it with `ops comment list <task>`. Answer each one with a comment, `ops comment add <task> "<text>"`, also when it asks for something. Never answer a comment in the chat, and do not ask in the chat if you can answer it. Do what a comment asks when it is a part of the work on the object. When you are not sure (it asks for more than the work on the object, or for a step with a risk), ask in a comment, and do not do it.
   - A message in **the chat** of the session (Orbh Chat), at any of the four types. The Page shows the unread chat first, in the block `CHAT`. Read it with `flint orbh chat read`. Answer with `flint orbh chat send "<text>"`.
3. **Read each change.** A change of the object reaches the session as an event: a message of `orbh:objects` (a push, not a timed check). The session gets no message for its own write. When the object changed, read it again (`ops task context <task>`, or `ops <noun> show <ref>`) and read the new comments of a task (`ops comment list <task>`).
4. **Do the changes of a review.** When the reviewer of a task asks for changes, do them. Then write the result again (`ops task result <task> "<text>"`), and request the review again (`ops task review request <task> --note "<what changed>" --json`).
5. **Post progress as short comments** on a task: `ops comment add <task> "<one line>"`. To show a result that a person sees (a page, a chart, a screen recording), attach the files in an Update: `ops media attach <task> <path...> --body "<one line>" --json`. At a section, a deliverable, or a project, post progress in the chat.

**The agent defaults** (D19). The launcher of a new agent session derives its defaults: from the object (a task), then its section, deliverable, project, and org, then the last choice of the person. A project and a deliverable hold them: the Flint (their Flint place), the computer (its name), the site (`@v1/<org>/site/<site id>#<computer>`), the profile (`runtime/profile`), and the mode (`headless`, `interactive`, or `obsidian`). Each value comes from the nearest level: the Flint task note of a task, then the deliverable, then the project. `ops agents defaults <ref>` shows each value with its source. `ops agents defaults set <project or deliverable> …` sets them, and `none` clears a value. Set the agent defaults only when the operator asks. The model is in [[dev-knw-ops-data_model]] § Agent Sessions at Ops Objects and § Agent Defaults.

## Rules

- This shard declares no Mesh artifact type. The data of Operations lives in the Operations backend. The shard writes two kinds of Mesh files: the task notes (the type `Task` of the Projects shard, written only by `task-new`, `task-link`, and `task-sync`), and the projects note `Mesh/(System) Ops Projects.md` (written only by `projects-note`).
- IDs are opaque strings. Quote them exactly.
- **An Update shows a media file through its embed `![[ops-media:<fileId>]]`, never through a URL.** `ops media url` prints signed URLs that give access to the file for 1 to 2 hours to each person who has them: do not put one in a comment, a result, a log, or a Mesh note.
- A user row ID (`ownerUserId`, `assigneeUserId`, `assigneeUserIds`) is not the same as an actor ID (`user:<clerkUserId>`). Use the user row ID for owners and assignees. Use the actor ID for comment mentions.
- Dates are strings. A deadline date is `YYYY-MM-DD` or `YYYY-MM-DD HH:mm` in local wall-clock time.

# Headless

A headless or subagent Orbh session has no person at the terminal. It loads this init with `flint shard start ops`, as an interactive session does. Follow the `> [!headless]` callouts of the workflows.

In a headless session, no operator watches your terminal. You work in NUU Operations through the `ops` CLI. Your channel to the operator, or to the session that dispatched you, is the turn result.

The sections above hold the model, the prerequisite, the modes, the organisations, and the web links. Read them. The rules below replace their human gates.

## Before You Write

1. Run `ops whoami`. It confirms that the CLI is installed and signed in. The command on PATH is `ops` for the dev build and for the prod build. A dev build shows the row `data mode`. A prod build shows the row `site`, and it uses PROD data.
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
10. **Access and moves.** Share a record, change or remove a share, move a deliverable to another project, or dismiss all notifications only when the prompt asks for it. A share gives another org or a person access to the record and the records inside it.
11. **A person message comes first.** When the session is at an Ops object, answer each comment and each chat message of a person in its place before you return (§ Agent Sessions at Ops Objects). A session that a person started or attached from Ops can return with `--await`: a new comment (with `--subscribe`) or a chat message then wakes it. Set the agent defaults (`ops agents defaults set`) only when the prompt asks for it.

## Workflows in a Headless Session

Use the workflows and the skills of this init, and follow the `> [!headless]` callouts of the workflows. `flint shard start ops` lists them:

- [[dev-wkfl-ops-interact]] — any request about Operations.
- [[dev-wkfl-ops-plan_layout]] — a written plan to a plan on the canvas.
- [[dev-wkfl-ops-backlog_triage]] — review and triage a backlog.
- [[dev-wkfl-ops-deliverable_setup]] — a deliverable from a scope description.
- The skills: [[dev-sk-ops-create_task]], [[dev-sk-ops-move_tasks]], [[dev-sk-ops-triage_inbox]], [[dev-sk-ops-plan_deliverable]], [[dev-sk-ops-read_task_map]].
- The task workflows: [[dev-wkfl-ops-create_task]], [[dev-wkfl-ops-scope_task]], [[dev-wkfl-ops-do_task]], [[dev-wkfl-ops-create_and_do_task]], [[dev-wkfl-ops-review_task]], [[dev-wkfl-ops-do_task_group]], and the task skills of § Workflows and Skills.

The task workflows replace each person gate as this table says:

| Interactive | Headless |
|---|---|
| "Give the person the summary" | Put the summary in the result |
| "Converse to refine" | Go on alone. Ask with a deferred request only when you are stuck. A subagent returns the question to its dispatcher. |
| "When the person confirms" | Skip: no person confirms. The task stays open for a person or a review. |
| A close that needs a person | Do not close. Put the close command in the result. |

**A child frame does not return.** A task workflow can run as a child frame of another workflow. Then the close of its invocation prints `back in: <parent>`. Do not return and do not close the session: give the result to the parent frame, and continue it. The session returns when its outermost frame is done.

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
| The task workflows ([[dev-wkfl-ops-create_task]], [[dev-wkfl-ops-scope_task]], [[dev-wkfl-ops-do_task]], [[dev-wkfl-ops-create_and_do_task]], [[dev-wkfl-ops-review_task]], [[dev-wkfl-ops-do_task_group]]) | `reading-task`, `creating-task`, `implementing`, `reviewing`, `resolving`, `blocked`, `complete` |

For the task workflows, also set `flint orbh session set progress "<done>/<total> checks"`.

## Result Delivery

End every turn with `flint orbh session return --finish "<result>"`, when no parent frame is open. Write the result in ASD-STE100 style. Include:

- The mode (dev or prod data) and the organisation.
- Every record that you created, changed, or deleted: kind, ID, address, and title. For a task, also the path of its task note.
- Every refusal, with its error code.
- Test records that remain, if any.
- A web link for the main record, when one helps.
