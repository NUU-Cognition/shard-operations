---
description: "Complete reference for the ops CLI after the revamp of ops-command-1021 — the model, a first session, install, modes, sign-in, the default org, references (IDs, addresses, URLs, titles, paths), places of --to, output and exit codes, every command family (headers, route, search, section, task with subtasks and the map, deliverable done, deployments and the inbox, blockers, notepads, the day plan), the read query (ops query), ops call, ops ops, and the undo guard"
orbh-sessions:
  - "[[3fb6e594-a179-4c0b-ba67-833b2ccaea67]]"
  - "[[4c4eadb7-6e8e-4529-8186-3bb1b5bdbc75]]"
  - "[[f205c648-297b-41fe-8f7b-900dd6448829]]"
  - "[[9297d2a3-64c8-4d33-8c4c-76011ebae793]]"
orb:
  - "@v1/nuucognition/session/4bcb2c31-aaa8-401f-b0c6-0aaf10e3caab#flint/nuu-flint"
orbh-fleet: ops-command-1021
---

# Knowledge: The `ops` CLI

`ops` is the NUU Operations CLI for agents. It covers the places, the tasks, the deployments, the plans, the deadlines, the blockers, the notepads, the day plan, and a read query over the tables (`ops query`). It calls the Operations agent gateway with the nuu CLI credential. The gateway sends each op to the public Convex function that the web app calls. For the records and the rules behind each command, read [[dev-knw-ops-data_model]]. For plan positions, read [[dev-knw-ops-canvas]]. For the task primitive of Task 1287 (types, stages, lineage, task groups), the Tasks shard has more depth: [[knw-task-cli]].

Source: `apps/cli-ops` in the NUU monorepo (package `@nuucognition/ops-cli`). This file follows its `README.md`. Its `src/commands/*.ts` are the truth when this file and the code differ. `node --import tsx scripts/help-tree.ts` in `apps/cli-ops` prints the help of every command.

## Shape of Every Command

- Most commands are `ops <noun> <verb>`. These top-level commands have no noun: `ops login`, `ops whoami`, `ops mode`, `ops ops`, `ops call`, `ops headers`, `ops route`, `ops search`, `ops history`, `ops undo`, and `ops redo`.
- `--json` and `--org <slug|name|me>` work on every command, anywhere on the line. So no command has its own `--org` or `--version` option: a section of the org is `ops section create <title> --org-wide`, and the version label of a deployment is `--version-label`.
- With `--json`, stdout holds exactly one JSON document and nothing else. Most lists print a JSON array, and an empty one prints `[]`: `org list`, `member list`, `project list`, `deliverable list`, `section list` (no scope, `--deliverable`, `--deployment`), `task list`, `deadline list`, `plan list`, `day-label list`, `deployment list`, `favourite list`, `notepad list`, `notify prefs list`. Some print an object; read the named field: `section list --project` → `project`, `deliverables[].sections`, `deployments[].sections`; `headers` → `projects`, `deliverables`, `sections`, `deployments` (each with `address`), and `owner` (the org text of each address); `route` → `orgSlug`, `op` (`route.suggest` or `route.candidates`: the op that answered), `model` (`jev` or `text`), `latencyMs`, `intent`, and `candidates[]` (`place {kind, id, title, path}`, `score`, `confidence` when the model gave one, `reason`, `address`); `search` → `items[]` (`kind`, `id`, `title`, `path`, `address`, `status`), `truncated`; `task search` → `results` (with `truncated`); `task subtask list` → `task` (the tree), `total`, `done`; `task map` → `task`, `root`, `subtree`, `home`, `groups`, `lineage`, `related`, `url`; `deployment inbox` → `section`, `tasks`; `deployment show` → `deployment`, `inbox`, `inboxTasks`, `shipsHere`, `startedHere`; `backlog show` → `section` and `tasks` (before the revamp: `folders[].tasks`); `comment list` → `items` (with `hasMore`); `notify list` and `activity list` → `page` (with `isDone`, `continueCursor`); `history` and `plan history` → `undo` and `redo`; `ops ops` → `ops`; `notepad show` → `{notepad, blocks, tasks, markdown}`; `day show` → `items` (with `date`, `doneCount`).
- A write gives the new id and its `address`; a create of a task also gives `place` (`kind`, `id`, `title`, `path`, `address`) and `sectionId`; a create with `--route` also gives `routed` (`model`, `score`, `reason`, `candidates`); a move gives `to`, `moved[]`, and `movedIds` (the tasks and their subtrees). When the read of an address after a write fails, the result keeps the new id with `address: null` (exit 0), and stderr names the read to run again: do not run the write again.
- Text output is short and stable, and always shows IDs and addresses. A list prints one line per record (`<kind> <id>  <title>  ...  <address>`; a task line starts with its checkbox), or one line `no <things>` when it is empty. A write prints `<past verb> <kind> <id>  <title>`, then its address and its place.
- Errors go to stderr as `error <code>: <message>`, then indented candidates and hints. A hint names the next step. The exit code is not zero.
- With `--json`, an error is exactly one JSON document on stderr, and stdout is empty: `{"error": {"code", "message", "exitCode", "status"?, "data"?, "candidates"?, "hints"}}`.
- A usage error ends with ``Run `ops <noun> <verb> --help` ``. An extra argument is a usage error: quote a text argument that has spaces. A command group with no verb (`ops task`, `ops step requires`, or `ops` alone) is a usage error (exit 2) that lists the verbs; it prints no help text, and with `--json` it is one JSON error document.
- With `DEBUG=1`, the stack trace follows the error lines; with `--json`, it is the `stack` field of the JSON error document.
- An op that the deployment does not have yet fails with `agent_unknown_operation`, and the message says that the op is not deployed there yet. Where a former op can do the work, the command uses it (a section of a deliverable, a move to a section or a backlog, a create in a section with the former args).

## A first session for an agent

```bash
ops whoami                                          # the user, the data mode, the active org
ops headers --project Alpha                         # the places of a project, with addresses
ops task context <task>                             # read a task before you work on it
ops route "Fix the login bug on Safari"             # where a new task belongs
ops task create "Fix the login bug on Safari" --route
ops task create "Write the tests" --parent <task>   # a subtask
ops task move <task> --to section:"Alpha › v1 › Backend"
ops task done <task>
ops deployment inbox Production --open              # what came up while it runs
ops deliverable done "Alpha › v1 launch"            # a person decides; ask first
```

Keep the address that a command prints (`@v1/<org>/<kind>/<key>#ops`) and
name the record by it in the next command: an address never needs a scope
and never matches two records.

## Install

**The npm package.** `@nuucognition/ops-cli` is ready to publish, but it is
**not on npm yet** (ops-cli-publish-1023 made only a dry run). After the
publish:

```bash
npm install -g @nuucognition/ops-cli   # needs Node.js 24 or newer (else node_too_old, exit 1)
ops --version                          # the version of the package
```

The package has one command, `ops`. It is the prod build: it ALWAYS uses
prod data, and `OPS_DATA_MODE` has no effect. `ops-dev` exists only in the
monorepo. The release procedure is `apps/cli-ops/RELEASE.md`
(`bash apps/cli-ops/scripts/publish.sh --dry-run`, then without
`--dry-run`; or the workflow "Publish ops CLI", or a tag
`ops-cli-v<version>`). Publish the CLI only after the backend with the new
ops is on prod.

**In the monorepo.** The package is in `apps/cli-ops`. ndv builds and
links it:

```bash
ndv scan
ndv use ops dev        # builds dist-dev/ and links ~/.nuucognition/ndv/bin/ops -> bin/ops.js
ndv build ops prod     # builds dist/ without a change to the active link
```

ndv names its link after the tool (`ops`) in both profiles. After
`ndv use ops dev`, the `ops` command on PATH runs the **dev build**. After
`ndv use ops prod`, it runs the prod build. Inside the monorepo, pnpm also
links both bins (`ops` → `bin/ops-prod.js`, `ops-dev` → `bin/ops.js`). Do not
expect `ops-dev` on PATH outside the monorepo.

### Before the first write: which build and which data

**The `ops` on PATH can be the prod build.** A prod build always uses prod
data and ignores `OPS_DATA_MODE`: `OPS_DATA_MODE=dev ops task create …` with a
prod build **writes to prod data**. So, before the first write:

1. Run `ops mode` and read two lines: `build mode` (`prod` or `dev`) and
   `data mode`. Write only when the data mode is the data that the work needs.
2. Check that the build has the revamp: `ops --help` lists `headers`,
   `route`, `search`, and `section`. When it does not, the build is of before
   the revamp.

For DEV data, run the dev launcher of the checkout:

```bash
OPS_DATA_MODE=dev node "<monorepo>/apps/cli-ops/bin/ops.js" mode    # build mode dev, data mode dev (env)
OPS_DATA_MODE=dev node "<monorepo>/apps/cli-ops/bin/ops.js" headers --org me
```

The dev launcher (`bin/ops.js`) runs `dist-dev/`. When `dist-dev/` is older
than the source of this checkout (`src`, `bin`, `package.json`, also
uncommitted changes), it runs the TypeScript source and prints one note on
stderr (`note: the ops-dev bundle … is older than its source`; no note with
`--json`). It also runs the source when there is no build, or with
`OPS_CLI_FORCE_SOURCE=1`. The prod launcher (`bin/ops-prod.js`) always runs
`dist/`; when `dist/` is older than the source, it prints one warning on
stderr (`warning: the ops bundle … is older than the source`). Rebuild with
`ndv build ops` (dev) or `ndv build ops prod`. `OPS_CLI_NO_STALE_CHECK=1`
turns the check off.

## Modes

`ops` follows the Strike rule. There are two modes, and they always move
together:

| | Build mode | Data mode |
|---|---|---|
| Says | which code runs | which deployment and which credential |
| Prod build (`bin/ops-prod.js`, `dist/`) | prod | always prod |
| Dev build (`bin/ops.js`, `dist-dev/`, source) | dev | dev by default |

| Data mode | Gateway site | Credential | Web links |
|---|---|---|---|
| dev | `https://next-dalmatian-912.convex.site` | `~/.nuucognition/auth.local.json` | `http://localhost:3088` |
| prod | `https://acoustic-weasel-248.convex.site` | `~/.nuucognition/auth.json` | `https://ops.nuucognition.com` |

A dev build reads its data mode in this order:

1. `OPS_DATA_MODE=dev|prod` (one run; a prod build ignores it).
2. `~/.nuucognition/ops-dev-data.json` (set with `ops mode dev|prod`).
3. `dev`.

A test run (`node --test`) stays on dev data unless `OPS_DATA_MODE` says
otherwise. A prod build reads neither the variable nor the file.

```bash
ops mode                 # build mode, data mode, site, credential file
ops mode prod            # dev build only: use prod data from now on
ops mode dev             # dev build only: back to dev data
OPS_DATA_MODE=prod node apps/cli-ops/bin/ops.js whoami   # the dev launcher, prod data, this run only
```

## Auth

`ops` signs in with the nuu CLI credential of the data mode:
`requireValidAuth(resolveEnv("ops", { mode: dataMode() }))`. A machine that
ran `nuu login` (prod) or a dev nuu login (dev) needs no other step.
`nuu login`, `flint login`, and `ops login` write the same prod credential,
`~/.nuucognition/auth.json`: a machine that is signed in to flint needs no
other step. The dev build reads `~/.nuucognition/auth.local.json`. An agent
cannot sign in: on `auth_required` (exit 3), ask the operator to run
`nuu login`. The
token refreshes through the account service of that mode (dev:
`http://localhost:3000`). The CLI never prints the token.

```bash
ops login                # browser login for the current data mode
ops whoami               # user, email, data mode, active org
```

When the credential is missing or does not refresh, a command fails with
`error auth_required: …` and exit code 3, and names the login command.

## Orgs

Every command works in one org. The active org is:

1. `--org <slug|name|me>` on the command line,
2. else the stored default of the data mode (`~/.nuucognition/ops/<mode>.json`),
3. else the personal workspace (its slug is your Clerk user ID).

A command on an existing record (given by ID or URL) works in the record's
own org. It refuses a `--org` that names another org (`org_mismatch`).

## References

A record argument takes any of these forms:

| Form | Example | How it resolves |
|---|---|---|
| Convex ID | `k57b2m4x9q8r7t6y5u4i3o2p1a0s9d8f` | `agent.resolve` (kind, org, title, breadcrumb) |
| Web URL | `https://ops.nuucognition.com/me/tasks/<t>`, `…/projects/<p>/deliverables/<d>?task=<t>` | the ID in the path or query, then `agent.resolve` |
| Ops address | `@v1/acme/task/<id>#ops`, `@v1/acme/task.dev/<id>#ops`, `@v1/acme/section/<id>#ops`, `@v1/acme/deployment/<id>#ops`, `@v1/acme/project/alpha#ops`, `@v1/acme/project/alpha/deliverable/v1#ops`, `@v1/acme/taskgroup/<id>#ops` | `agent.resolve` (the object that the address names now); other text that starts with `@` is a title |
| Title | `"Write the docs"` | `agent.searchTasks` for tasks; the headers of the org (`headers.forOrg`) for projects, deliverables, sections, and deployments; the list queries for the other kinds |
| Path | `"Alpha › v1 › Backend"`, `"Alpha > v1"`, `"Alpha / Backlog"` | the path of a place in the headers (`›`, `>`, and `/` are the same separator) |

A title matches in this order: an exact title (any case), then an exact
path, then a unique ID prefix of 4 or more characters (the short IDs of
`plan show`), then a unique partial title, then a unique partial path. When
more than one record matches, the command fails with `error <kind>_ambiguous`
(exit 2) and lists each candidate with its ID and its path. Pass the ID or
a longer path. Never guess between candidates.

A step title needs `--plan`. A deployment name needs `--project` only on a
deployment of Ops of before the revamp (the headers name every deployment).
An ID, URL, or address never needs a scope.

### Places (`--to` of `task move`)

| Form | The place |
|---|---|
| `section:<ref>` | the section |
| `project:<ref>` | the backlog section of the project (made on first need) |
| `deliverable:<ref>` | the first open section of the deliverable (made when none) |
| `deployment:<ref>` | the inbox section of the deployment |
| `parent:<task>` (or `task:<task>`) | under the task, as a subtask |
| `backlog` | the backlog section of the project of the task |
| `master` | the backlog section of the org (the master backlog) |
| `unplaced` | no home |
| an ID, a URL, or an address | the place of that kind |
| a bare title or path | a place of any kind in the headers; two matches fail with `place_ambiguous` and their `kind:<id>` forms |

A **link spec** (deadline links, step links, title links) is `kind:ref`, a
URL, or an ID: `task:"Write docs"`, `step:<id>`, `project:Alpha`,
`https://…/plans/<id>`.

## Output and errors

```bash
ops task list --json | jq '.[0]._id'
ops task show "Write docs"
```

| Exit code | Meaning |
|---|---|
| 0 | Success |
| 1 | The gateway or the record refused the operation |
| 2 | Usage error, ambiguous reference, or a guard refused (for example `--yes` missing) |
| 3 | Not signed in (`auth_required`, `unauthenticated`) |
| 4 | Network error |

Gateway codes pass through: `unauthenticated`, `org_unauthorized`,
`org_frozen`, `agent_unknown_operation`, `agent_wrong_endpoint`,
`agent_invalid_input`, `*_not_found`, `*_conflict`, `waybill_stale`,
`waybill_conflict`. Client codes include `usage`, `auth_required`,
`network`, `bad_response`, `<kind>_ambiguous`, `<kind>_not_found`,
`wrong_kind`, `org_mismatch`, `undo_state_changed`, `undo_conflict`,
`expect_required`, `nothing_to_undo`, `nothing_to_redo`,
`reorder_anchor_outside`, `position_unknown`, `confirm_required`,
`place_ambiguous`, `place_not_found`, `deployment_no_inbox`. Codes of the
revamp from the service: `task_has_subtasks` (a delete needs
`--with-subtasks`), `subtask_too_deep` (6 levels), `subtask_cycle`.

An op that a deployment of Ops does not have yet fails with
`agent_unknown_operation` and names the deploy. Where a former op can do the
work (a section of a deliverable, a move to a section or a backlog), the
command uses it on such a deployment.

The guards exit 2: `confirm_required` (a delete that removes other records
or cannot be undone needs `--yes`: project, deliverable, section, deployment, plan),
`expect_required` and `undo_state_changed` (a replay without the right
`--expect <seq>`). A list with no rows prints one `no <things>` line; with
`--json` it prints `[]`.

## Command reference

Global options (on every command): `--json`, `--org <slug|name|me>`.
Dates take `YYYY-MM-DD`, `today`, `tomorrow`, or an offset such as `+3d` or
`-1w`. Where a value can be cleared, pass `none`. A text argument of `-`
reads stdin.

### Session and raw access

| Command | Example |
|---|---|
| `ops login [--verbose]` | `ops login` |
| `ops whoami` | `ops whoami --json` |
| `ops mode [dev\|prod]` | `ops mode prod` |
| `ops ops [--area <area\|module>]` — the gateway manifest (no credential needed); `--area` matches the manifest area (`history`) or the op module (`waybill`) | `ops ops --area waybill` |
| `ops call <op> [json\|-] [--query\|--mutation\|--action] [--inject-org]` — any allowlisted op; always prints JSON; the manifest gives the kind (`--action` is for `route.suggest`) | `ops call plans.listLite '{}' --inject-org` |

### headers, route, search

| Command | Example |
|---|---|
| `ops headers [--project <p>] [--archived]` — the map of the org (`headers.forOrg`): each project, its sections, its deliverables and their sections, its deployments and their sections, then the sections and deployments of the org; each with its id, role, done mark, and address | `ops headers --project Alpha` |
| `ops route <text> [--want task\|idea\|any] [--no-smart] [--limit 1-8]` — the route decision: `route.suggest` (an action: Jev with a limit of 1.5 s, else the text match), or with `--no-smart` the query twin `route.candidates`; each line: the score, the `kind:<id>` form, the path, the reason, and the address; `--json`: `{orgSlug, op, model, latencyMs, intent, candidates[]}`, where `op` is the op that answered (`route.suggest` or `route.candidates`) and each candidate has `place {kind, id, title, path}`, `score`, `confidence` (the confidence of the decision model, when it gave one), `reason`, and `address`. **A score below 0.3, or a reason that is only "A recent project", means that no place fits**: name a place, or make one (see the skill `create_task` of the Ops shard) | `ops route "Fix the login bug on Safari"` |
| `ops search <text> [--type task,section,deliverable,project,deployment] [--include-done] [--limit 1-50]` — `opsSearch.search`: tasks and places in one list, each with its path and address | `ops search billing --type section,deliverable` |

### org, member

| Command | Example |
|---|---|
| `ops org list` — `*` marks the active org | `ops org list` |
| `ops org use <slug\|name\|me>` — the default of this data mode | `ops org use "NUU Cognition"` |
| `ops org show [org]` | `ops org show me` |
| `ops member list` — members of the active org, for assignees | `ops member list --json` |

### project

| Command | Example |
|---|---|
| `ops project list [--status active\|paused\|archived\|all]` — each with its address | `ops project list --status active` |
| `ops project show <project>` — its sections (the backlog first), its deliverables and deployments with their sections, and the root tasks, each with its address; a deployment of before the revamp gives the former snapshot (deliverables, sections, the backlog folders) | `ops project show Alpha` |
| `ops project create <name> [--description] [--kind project\|operation] [--start] [--end] [--next-update] [--context <md>]` | `ops project create "Alpha" --next-update +7d` |
| `ops project update <project> [--name] [--description] [--next-update <date\|none>] [--status] [--kind] [--start <date\|none>] [--end <date\|none>]` | `ops project update Alpha --status paused` |
| `ops project context show <project>` / `ops project context set <project> (<md\|-> \| --file <path> \| --clear)` — `projects.setContext` | `ops project context set Alpha --file context.md` |
| `ops project delete <project> --yes` — deletes everything in it | `ops project delete Alpha --yes` |

### deliverable

| Command | Example |
|---|---|
| `ops deliverable list [--project <project>] [--open]` — each with its done mark and address | `ops deliverable list --project Alpha --open` |
| `ops deliverable show <deliverable> [--project]` — the done mark, the deployment it ships to and comes from, its sections and their root tasks | `ops deliverable show "Alpha › v1 launch"` |
| `ops deliverable create <title> --project <project> [--due <date>] [--section <title>] [--deployment <d>] [--context <md>]` — no closer and no task; `--section` adds a first section | `ops deliverable create "v1 launch" --project Alpha --section Backend` |
| `ops deliverable update <deliverable> [--title] [--deployment <d\|none>] [--from-deployment <d\|none>]` — `deliverables.setDeployment` | `ops deliverable update "v1.1" --deployment Production` |
| `ops deliverable done <deliverable>` / `ops deliverable reopen <deliverable>` — `deliverables.setDone`: a person decides; the sections do not | `ops deliverable done "Alpha › v1 launch"` |
| `ops deliverable rename <deliverable> <title>` | `ops deliverable rename "v1 launch" "v1.0 launch"` |
| `ops deliverable context show\|set <deliverable> …` — `deliverables.setContext` | `ops deliverable context set "v1 launch" "The first public release"` |
| `ops deliverable delete <deliverable> --yes` — deletes its sections and tasks; refuses without `--yes` | `ops deliverable delete "v1.0 launch" --yes` |
| `ops deliverable flint set <deliverable> <address> [--flint-id <uuid\|none>] [--project]` — the one Flint place (`deliverables.setFlintPlace`); `deliverable show` prints it | `ops deliverable flint set "v1 launch" @v1//flint/nuu-operations` |
| `ops deliverable flint clear <deliverable> [--project]` — removes the address and the id | `ops deliverable flint clear "v1 launch"` |

### section

`ops subsection …` is a hidden alias of `ops section …`.

| Command | Example |
|---|---|
| `ops section list [--project <p> \| --deliverable <d> \| --deployment <d>] [--archived]` — `--project`: grouped by home (`sections.listForProject`); no scope: every section of the org with its path | `ops section list --project Alpha` |
| `ops section show <section> [--project\|--deliverable\|--deployment]` — the home, the address, the web link, and the root tasks with their subtask counts (`sections.get`, `sections.tasks`) | `ops section show "Alpha › v1 › Backend"` |
| `ops section create <title> (--project <p> \| --deliverable <d> \| --deployment <d> \| --org-wide) [--after <section>] [--context <md>] [--due <date>]` — `sections.create`; `--org-wide` is a section of the org (`--org` picks the org) | `ops section create Ideas --project Alpha` |
| `ops section update <section> [--title] [--due <date\|none>]` | `ops section update Backend --due none` |
| `ops section move <section> --to <project:<p>\|deliverable:<d>\|deployment:<d>\|org>` — `sections.moveHome`; the tasks go with it; a section with a role does not move | `ops section move Ideas --to deliverable:"Alpha › v2"` |
| `ops section reorder <section> (--before <s>\|--after <s>\|--top\|--bottom)` — inside its home (`sections.reorder` takes every section of the home) | `ops section reorder Backend --top` |
| `ops section deps set\|add\|remove <section> [deps...]` — the sections it comes after | `ops section deps set QA Backend Frontend` |
| `ops section priority <section> on\|off` | `ops section priority Backend on` |
| `ops section archive\|unarchive <sections...>` — `sections.archive` | `ops section archive Backend` |
| `ops section context show\|set <section> …` — `sections.update` | `ops section context set Backend "The API and the queue"` |
| `ops section delete <section> --yes` — deletes its tasks; refuses without `--yes` | `ops section delete Backend --yes` |
| `ops section to-task <section> [--into <section>]` — an empty section becomes a task | `ops section to-task "Tiny fix"` |

### task

| Command | Example |
|---|---|
| `ops task list [--project \| --deliverable \| --section \| --deployment \| --master \| --mine [--all-orgs]] [--backlog] [--status open\|todo\|doing\|done\|all] [--priority <p\|none>] [--owner <me\|member\|none>] [--type <type>] [--stage <stage>] [--limit n]` — root tasks, each with its place and address; `--section` keeps the order of the section and gives the subtask counts (`sections.tasks`); `--deployment` lists the inbox (`deployments.inbox`); default `--status open`; more than one scope flag is a usage error | `ops task list --section "Alpha › v1 › Backend" --status all` |
| `ops task list --all [--type <type>] [--stage <stage>] [--status …] [--limit n]` — every task of the org, placed and unplaced, newest first, as task summaries (address, type, stage, home label); `--limit` is the total (default 200) | `ops task list --all --type task.dev --stage reviewed --json` |
| `ops task list --unplaced [--type <type>] [--stage <stage>]` — the tasks with no home; when the tasks need more bytes than one read (`task_read_too_large`), the CLI reads the pages of `tasks.listAllPage`; a page that is not the last and does not move the cursor stops the list (`pagination_stalled`, exit 1, no rows) | `ops task list --unplaced` |
| `ops task show <task>` — also the address, the parent, the subtasks (the tree with the done count; `--json`: `subtasks`), the type and the stage, the outcome, the fields, the lineage, the task groups, the related links, the attachments, and the stage history; when the incoming lineage stops at its byte budget, `--json` has `linksCut: true` and the text says so; a task with a Flint task note gives the lines `note` (the label, else the address) and `note link` (the open link), and `--json` has `note`, `noteLabel`, and `noteUrl` at the top (each `null` when the task has no note) | `ops task show @v1/test/task.dev/<id>#ops` |
| `ops task context <task> [--comments <n>]` — the full context of a task for an agent: the description, the place, the people, and the comments (no change events); `--comments` keeps the newest n (1 to 500, default 200). Read it before you work on a task | `ops task context <taskId> --comments 20 --json` |
| `ops task search <query> [--limit 1-100]` | `ops task search docs --limit 5` |
| `ops task create <title> [--section <s> \| --project <p> \| --deliverable <d> \| --deployment <d> \| --parent <task> \| --route [text] \| --master \| --unplaced] [--tag feedback\|hotfix\|ongoing\|recurring] [--every day\|week\|month] [--type <type>] [--repo <name>] [--note <address> [--note-label <text>]] [--body <md\|-> \| --body-file <path>] [--priority low\|medium\|high\|urgent] [--assign <me\|member>] [--top]` — default: the master backlog, at the end; `--project` is its backlog section, `--deliverable` its first open section, `--deployment` its inbox, `--parent` a subtask; `--route` asks `route.suggest` with the text (default: the title) and prints the place, the score, and the reason; the output gives the stored title (a trailing digit of the title is the rarity: "Fix login 1" is stored as "Fix login"), the address, and the section | `ops task create "Login fails on Safari" --deployment Production --tag hotfix` |
| `ops task update <task> [--title] [--body <md\|-> \| --body-file <path>] [--priority <p\|none>] [--assign <member\|none>] [--rarity <1-7\|none>] [--tag <tag\|none>] [--every day\|week\|month\|none]` — `--tag` and `--every` need `tasks.update` with `tag` and `recurrence` (MODEL; a deployment without them refuses with `agent_invalid_input`) | `ops task update "Write docs" --body-file notes.md` |
| `ops task start <task>` — doing | `ops task start "Write docs"` |
| `ops task done <task>` — the same as `close` with the outcome `completed` | `ops task done "Write docs"` |
| `ops task reopen <task>` — doing; the outcome goes, the stage stays | `ops task reopen "Write docs"` |
| `ops task move <tasks...> --to <place> [--priority <p\|none>]` — one task: `tasks.move`; more tasks: `tasks.moveMany`; each takes its subtree; the places are in [Places](#places---to-of-task-move); the former `--subsection`, `--backlog`, and `--folder` still work, hidden | `ops task move <a> <b> --to section:"Alpha › v1 › Backend"` |
| `ops task reorder <task> (--before <t>\|--after <t>\|--top\|--bottom)` | `ops task reorder "Write docs" --after "Draft outline"` |
| `ops task delete <task> [--with-subtasks]` — the service refuses a task with subtasks without the flag (`task_has_subtasks`) | `ops task delete "Write docs"` |
| `ops task to-section <task> [--deliverable <d>]` — `to-subsection` is its former name | `ops task to-section "Big item" --deliverable "v1 launch"` |

#### Subtasks and the task map

| Command | Example |
|---|---|
| `ops task subtask add <parent> <title> [--body <md\|-> \| --body-file <path>]` — `subtasks.create`; it gets the home of the root task | `ops task subtask add <taskId> "Write the tests"` |
| `ops task subtask list <task>` — the subtree with the done count (`subtasks.tree`; cut at 200 tasks) | `ops task subtask list <taskId>` |
| `ops task subtask move <task> (--under <parent> \| --root) [--index n]` — `subtasks.reparent`; `--root`: a root task in the home of its old root | `ops task subtask move <taskId> --under <parentId>` |
| `ops task subtask reorder <task> --index n` — its place among its siblings (0 is first) | `ops task subtask reorder <taskId> --index 0` |
| `ops task subtask indent\|outdent <task>` — under the sibling above it, or one level up | `ops task subtask outdent <taskId>` |
| `ops task map <task>` — `taskMap.get`: the root and the subtree, the home (project, deliverable, deployment, section), the task groups with their members, the lineage (split, merged, continues, after, before), the related links, each with its address, and the web page of the map | `ops task map <taskId> --json` |

A task order bucket is one section **and** one priority band (before the
revamp: one subsection, or one backlog folder; no folder is Main). `tasks.reorder` takes the complete bucket,
so `ops task reorder` reads the container, computes the new order of the
bucket, and posts it. An anchor in another band or folder is refused
(`reorder_anchor_outside`). `task create --top` creates the task and then
reorders it to the top of its bucket (two writes, two undo entries). An
unplaced task has no order bucket: `ops task reorder` refuses it
(`task_unplaced`).

#### The task primitive v0.1 ((Task) 1287 of the NUU Flint)

A task has one status (`todo`, `doing`, `done`). A done task has one
outcome: `completed`, `dropped`, or `superseded`. A task type (for example
`task.dev@0.1`) adds fields and stages. The stages are a second layer: any
stage can follow any stage. A typed task closes as `completed` only at a
stage that can close (for `task.dev`: `reviewed` or `verified`). Only a
person sets `verified`. A write is by an agent when `ORBH_SESSION_ID` is
set (the CLI sends it as `X-Agent-Session`). A task has 0 or 1 home and 0
or more related links. A task with no home is **unplaced**, and that is
normal.

| Command | Example |
|---|---|
| `ops task stage <task> <stage> [--note <text>]` — `taskStages.set` | `ops task stage <task> reviewed --note "No high finding"` |
| `ops task retype <task> (<type>[@<version>] \| --none) [--type-version <v>]` — `tasks.setType` (amendment 6); a new type takes its active version; the stage and the fields stay only when the new type defines them (the same name and kind); `--none` makes the task untyped; the same type and version changes nothing; a done task refuses with `task_type_done` (reopen it first) | `ops task retype <task> task.dev` |
| `ops task close <task> [--outcome completed\|dropped\|superseded] [--result <md\|->]` — `tasks.close`; default `completed` | `ops task close <task> --outcome dropped` |
| `ops task result <task> <md\|->` — `""` clears it | `ops task result <task> "The pin works on dev."` |
| `ops task note <task> <address> [--label <text>]` / `ops task note <task> --clear` — `tasks.setNote` ((Task) 1291): the Flint task note holds the content, and Ops keeps its address, `@v1/<org>/task/<note id>#flint/<flint>` (`flint resolve @v1//task/<n> --json` gives it); a new address with no `--label` clears the label; `--json` gives `{taskId, address, note, noteLabel, noteUrl}`; `noteUrl` is `obsidian://nuu-flint?address=` and the encoded note address, and the NUU Flint plugin opens it; a wrong address refuses with `task_note_invalid` | `ops task note <task> @v1/nuucognition/task/<uuid>#flint/nuu-flint --label "Task 1291 · NUU Flint"` |
| `ops task field <task> <name> <value> [--append \| --remove]` — `tasks.setFields`; `""` clears the field; a list field gets the value as its one item; `--append` adds one item, once; `--remove` (amendment 6) deletes each item equal to the value from a list field in one write, so an append of another person at the same time stays (an item that is not in the list is no change); `--append` and `--remove` together are a usage error | `ops task field <task> wipCommits 1a2b3c4 --remove` |
| `ops task commit <task> <sha> [--repo <name>]` — appends `<sha>` or `<sha> (<repo>)` to `wipCommits` | `ops task commit <task> 1a2b3c4d --repo flint` |
| `ops task home <task> (--section <s> \| --backlog [--project <p>] [--folder <f>] \| --none)` — `tasks.home`; `--project` and `--folder` imply `--backlog`; `--backlog` alone is the master backlog; `--none` unplaces the task; for a deliverable, a deployment, or a parent, use `ops task move --to` | `ops task home <task> --backlog --project Alpha` |
| `ops task relate <task> <kind> <ref> [--label <text>]` — kinds: `project`, `deliverable` (an ID, URL, or title), `repo` (a name), `flint` (a Flint id), `address` (a v1 address); a second relate changes only the label | `ops task relate <task> repo main` |
| `ops task unrelate <task> <kind> <ref>` | `ops task unrelate <task> project Alpha` |
| `ops task hints [--flint <id>] [--repo <name>] [--text <text>]` — proposed homes from a Flint, a repository, or a text, best first; each line ends with the flags for `ops task home`; for a text, `ops route` is the decision of the revamp | `ops task hints --text "Fix the login page"` |
| `ops task split <task> --part <title> [--part <title> ...] [--keep-open]` — the parts get the home, the type, and the related links; the old task closes as `superseded` | `ops task split <task> --part Backend --part Frontend` |
| `ops task merge <task> <task>... (--into <task> \| --title <title>)` — the open absorbed tasks close as `superseded` | `ops task merge <a> <b> --into <c>` |
| `ops task continue <task> [--title <title>]` — default title `<old title> (continued)`; an open old task closes as `superseded` | `ops task continue <task>` |
| `ops task chain <task> <task> [<task>...]` — in order; a task is ready when the task before it is done | `ops task chain <first> <second> <third>` |
| `ops task unchain <task>` — removes the `after` link of the task | `ops task unchain <task>` |
| `ops task attach <target> <kind> <ref> [--session-id <id>] [--label <text>] [--state <state>]` — the target is a task or a task group (an ID or an address; a title names a task); kinds: `session`, `fleet`, `note`, `repo`; a second attach updates the label and the state | `ops task attach <address> session <session address> --session-id <id> --state working` |
| `ops task detach <target> <kind> <ref>` — the row stays as history | `ops task detach <task> repo main` |

`--json` output: `show` gives the C6 detail with `address` at the top
level, and the present keys (`breadcrumb`, `orgSlug`, `url`). `create`,
`split`, `merge`, and `continue` give the new ids and their addresses.
`retype` gives `{taskId, address, type, typeVersion, stage, fields}` after
the write (`null` for an absent value): the address follows the type
(`task.dev/<id>` or `task/<id>`), and an old address still resolves. When
the read of an address after a write fails, the result keeps the new id with
`address: null` (exit 0), and stderr names the read to run again: do not run
the write again.
`attach` gives `{attachmentId, target: {kind: "task"|"taskgroup", id,
address}}`. A deployment without an op of the task primitive refuses a new
verb with `agent_unknown_operation`; `show`, `done`, and `reopen` then keep
their present behaviour.

### task group

A task group is a set of tasks that are done together, usually in one
session. Each task stays a full task. A task can be in more than one task
group. A group is open while one of its tasks is open (an empty group is
open). The attachments of a group show on each of its tasks.

| Command | Example |
|---|---|
| `ops task group create <title> [--task <task> ...] [--body <md\|->]` — gives the group id and its address | `ops task group create "Login fixes" --task <a> --task <b>` |
| `ops task group add <group> <task>...` | `ops task group add "Login fixes" <c>` |
| `ops task group remove <group> <task>...` — the tasks stay | `ops task group remove "Login fixes" <c>` |
| `ops task group show <group>` — `--json`: `{address, group, tasks, open, attachments, url}`; `url` is the web page of the group (the Groups view of the Tasks page); the address is the field `address` of `taskGroups.get` (a warning on stderr when it is null); when the tasks stop at their byte budget, `--json` has `tasksCut: true` after `tasks` and the text says so | `ops task group show @v1/test/taskgroup/<id>#ops --json` |
| `ops task group list [--open]` | `ops task group list --open` |
| `ops task group delete <group>` — deletes the group and its members, not the tasks | `ops task group delete "Login fixes"` |

### task type

| Command | Example |
|---|---|
| `ops task type list` — the active types | `ops task type list` |
| `ops task type show <type>[@<version>] [--type-version <v>]` — the fields and the stages; with no version, the latest active version. The program owns `--version` (it prints the version of the CLI anywhere on the line), so a type version is `<type>@<version>` or `--type-version` | `ops task type show task.dev@0.1` |

### comment

| Command | Example |
|---|---|
| `ops comment list <task> [--events] [--limit n]` | `ops comment list "Write docs" --events` |
| `ops comment add <task> <body\|->` | `ops comment add "Write docs" "First draft is up."` |
| `ops comment edit <task> <commentId> <body\|->` | `ops comment edit "Write docs" <commentId> "Second draft."` |
| `ops comment delete <task> <commentId>` | `ops comment delete "Write docs" <commentId>` |
| `ops comment react <task> <commentId> <emoji>` | `ops comment react "Write docs" <commentId> 👍` |
| `ops comment unreact <task> <commentId> <emoji>` | `ops comment unreact "Write docs" <commentId> 👍` |

### backlog

| Command | Example |
|---|---|
| `ops backlog show [--project <p>] [--all]` — the backlog section of the project (or of the org) by priority band, each task with its address; on a deployment of before the revamp, the former view by folder and band | `ops backlog show --project Alpha` |

`ops folder list|create|rename|reorder|delete` (the backlog folders of
before the revamp) stays hidden for old callers. The migration of the revamp
turns each folder into a section.

### deadline

| Command | Example |
|---|---|
| `ops deadline list [--all-orgs] [--mine] [--status open\|todo\|doing\|done\|all]` | `ops deadline list --all-orgs --mine` |
| `ops deadline show <deadline>` | `ops deadline show "Beta"` |
| `ops deadline create <title> --due <date> [--after <deadline>]... [--scope <tag>]... [--link <spec>]... [--title-link <spec>] [--assign <member>]...` — `--date` is the hidden former name of `--due` | `ops deadline create Beta --due "2026-11-01 17:00" --link project:Alpha --assign me` |
| `ops deadline insert [title] --between <earlier> <later> [--due] [--scope]... [--assign]...` | `ops deadline insert "Code freeze" --between Alpha-start Beta` |
| `ops deadline update <deadline> [--title] [--description] [--due] [--status todo\|doing\|done] [--scope <tag>]... [--clear-scopes] [--title-link <spec\|none>] [--nudge <n>]` | `ops deadline update Beta --status doing` |
| `ops deadline shift <deadline> (--by <±days\|Nw> \| --to <date>) [--with-downstream]` — one `setDates` call | `ops deadline shift Beta --by 3 --with-downstream` |
| `ops deadline links set <deadline> [specs...]` | `ops deadline links set Beta project:Alpha` |
| `ops deadline links add <deadline> <specs...>` | `ops deadline links add Beta task:"Write docs"` |
| `ops deadline links remove <deadline> <specs...>` | `ops deadline links remove Beta task:"Write docs"` |
| `ops deadline requires set <deadline> [deadlines...]` | `ops deadline requires set Beta Alpha-start` |
| `ops deadline requires add <deadline> <deadlines...>` | `ops deadline requires add Beta "Code freeze"` |
| `ops deadline requires remove <deadline> <deadlines...>` | `ops deadline requires remove Beta "Code freeze"` |
| `ops deadline assign <deadline> (<members...> [--add\|--remove] \| none)` — `--none` is the hidden former form of `none` | `ops deadline assign Beta me --add` |
| `ops deadline delete <deadline>` | `ops deadline delete Beta` |

### blocker

A blocker says why work waits. It has a title (what blocks the work), a
check-up date, an owner (the person who checks it), "waiting on", a next
step, the records it blocks, and a log. A blocker is `open`, `resolved`, or
`dropped`. The data model is in [[dev-knw-ops-data_model#Blockers]].

A `<blocker>` is a blocker ID or its title. A `<record>` is `kind:ref`, a
URL, an address, or an ID; the kinds are `project`, `deliverable`,
`section`, `task`, and `step`. A date takes `YYYY-MM-DD`, `today`,
`tomorrow`, `+3d`, or `+1w` (local time).

| Command | Example |
|---|---|
| `ops blocker list [--open] [--due] [--on <record>]` — the open blockers (oldest check-up first), then the newest closed ones; `--due`: the open blockers whose check-up date is today or earlier | `ops blocker list --due` |
| `ops blocker show <blocker>` — the fields, the records it links with their paths, and the log | `ops blocker show <blockerId> --json` |
| `ops blocker create <title> [--check <date>] [--waiting-on <text>] [--next <text>] [--owner <member>] [--on <record>]...` — default check-up: tomorrow; default owner: you; `--on` is repeatable | `ops blocker create "No API key yet" --check +3d --waiting-on "Vendor" --on task:"Write docs"` |
| `ops blocker update <blocker> [--title] [--waiting-on <text\|none>] [--next <text\|none>] [--owner <member\|none>]` | `ops blocker update <blockerId> --next "Call the vendor"` |
| `ops blocker attach <blocker> <record>` — a record that is attached stays as it is | `ops blocker attach <blockerId> section:"Alpha › v1 › Backend"` |
| `ops blocker detach <blocker> <record>` — also a broken link, by its ID | `ops blocker detach <blockerId> <taskId>` |
| `ops blocker delay <blocker> <date> [--note <text>]` — still blocked: move the check-up date of an open blocker | `ops blocker delay <blockerId> +1w --note "Legal asked for one more week"` |
| `ops blocker resolve <blocker> [--note <text>]` — the work can go on | `ops blocker resolve <blockerId> --note "The key came"` |
| `ops blocker drop <blocker> [--note <text>]` — it was not a real blocker, or it no longer matters | `ops blocker drop <blockerId> --note "Not needed"` |
| `ops blocker reopen <blocker> [--check <date>]` — a resolved or dropped blocker; default check-up: tomorrow | `ops blocker reopen <blockerId> --check tomorrow` |
| `ops blocker delete <blocker> --yes` — deletes the blocker and its log; no undo. Prefer `resolve` or `drop`: they keep the log | `ops blocker delete <blockerId> --yes` |

Use the blocker for a wait that has a check-up. At each check-up, do one
of three things: `delay` (still blocked), `resolve` (the work can go on),
or `drop` (it was not a blocker).

### plan

| Command | Example |
|---|---|
| `ops plan list [--status active\|completed\|all]` | `ops plan list` |
| `ops plan show <plan> [--format text\|mermaid]` — `--json` prints the raw `plans.get` result | `ops plan show Launch --format mermaid` |
| `ops plan create <title> [--description]` | `ops plan create Launch` |
| `ops plan rename <plan> <title>` | `ops plan rename Launch "Launch v1"` |
| `ops plan update <plan> [--title] [--description]` | `ops plan update Launch --description "Q4 launch"` |
| `ops plan complete <plan>` | `ops plan complete Launch` |
| `ops plan reopen <plan>` | `ops plan reopen Launch` |
| `ops plan delete <plan> --yes` — every step goes; an undo cannot bring it back; refuses without `--yes` | `ops plan delete Launch --yes` |
| `ops plan expand-all <plan>` — unfold every folded step | `ops plan expand-all Launch` |
| `ops plan history <plan>` — your undo and redo stacks with seq numbers | `ops plan history Launch` |
| `ops plan undo <plan> (--expect <seq> \| --dry-run)` | `ops plan undo Launch --expect 42` |
| `ops plan redo <plan> (--expect <seq> \| --dry-run)` | `ops plan redo Launch --dry-run` |

`ops plan show` prints the Start sentinel, then every step in topological
order, then the End sentinel:

```
plan <id>  Launch  [active]  3 steps
start @ -300,0  -> k57b2m
k57b2m [ ] Design  @ 0,0  id k57b2m4x9q8r7t6y5u4i3o2p1a0s9d8f
    requires: start
k57c9a [~] Build  (optional)  @ 300,0  id k57c9a…
    requires: k57b2m
    links: task k57…  "Implement API"
    assignee: Ana Lee (<usersId>)
    deadline: 2026-11-01 Beta <deadlineId>
    then: end
end @ (auto)  <- k57c9a
```

Each step line shows the short ID (a unique ID prefix; step commands accept
it with `--plan`), `[ ]` / `[~]` / `[x]`, the title, the optional and folded
flags, the stored position `x,y` (`(auto)` when the step has none), and the
full ID.

**Undo safety.** `plan undo` and `plan redo` act as you: Waybill replays
*your* last gesture in the scope `plan:<id>`, whoever made it (the web app,
another agent, this CLI). The CLI reads the stack first
(`plans.historyState`), names the gesture, and passes its seq as
`expectSeq`. Without `--expect <seq>` (and without `--dry-run`) it refuses
with `expect_required`, names the head, and prints the exact command. With
`--expect <seq>` it refuses unless that gesture is still the head. The
server refuses a stale seq too. A refusal is `undo_state_changed` (exit 2),
and nothing changes. `ops history`, `ops undo`, and `ops redo` do the same
for any other scope (below).

### step

Steps take an ID or URL alone, or a title or short ID with `--plan`.

| Command | Example |
|---|---|
| `ops step add <plan> <title> [--after <step>]... \| [--before <step>] \| [--between <a> <b>] [--description] [--x --y]` — no flag: a new root. No `--x --y`: the server places the step | `ops step add Launch "Deploy" --after Build` |
| `ops step update <step> [--plan] [--title] [--description] [--done\|--undone] [--optional\|--required] [--collapse\|--expand]` | `ops step update Build --plan Launch --done` |
| `ops step assign <step> <member\|none> [--plan]` | `ops step assign Build me --plan Launch` |
| `ops step requires set <step> [steps...] [--plan]` — no steps: a root | `ops step requires set Deploy Build Test --plan Launch` |
| `ops step requires add <step> <steps...> [--plan]` | `ops step requires add Deploy Test --plan Launch` |
| `ops step requires remove <step> <steps...> [--plan]` | `ops step requires remove Deploy Test --plan Launch` |
| `ops step links set <step> [specs...] [--plan]` — kinds: task, section, deliverable, plan | `ops step links set Build task:"Implement API" --plan Launch` |
| `ops step links add <step> <specs...> [--plan]` | `ops step links add Build section:Backend --plan Launch` |
| `ops step links remove <step> <specs...> [--plan]` | `ops step links remove Build section:Backend --plan Launch` |
| `ops step move <step> (--x <x> --y <y> \| --dx <dx> --dy <dy>) [--with-downstream] [--plan]` | `ops step move Build --dx 120 --with-downstream --plan Launch` |
| `ops step move start\|end --plan <plan> (--x --y \| --dx --dy)` — the sentinels | `ops step move end --plan Launch --x 1400 --y 0` |
| `ops step delete <step> [--plan]` — soft; `plan undo` revives it | `ops step delete Deploy --plan Launch` |

**The drag rule.** `--with-downstream` matches the web canvas
(`onNodeDragStop` in `src/components/plans/plan-view.tsx`): the step lands
on its new spot, and every step after it (its whole branch, folded steps
included) moves by the same offset, in **one** `plans.setPositions` call. A
zero-length move writes nothing. A downstream step with no stored position
stays where it is and is reported as `kept` (the UI moves it from a
fallback layout that the CLI does not compute).

### notify

| Command | Example |
|---|---|
| `ops notify list [--unread] [--this-org] [--limit n] [--cursor c]` | `ops notify list --unread` |
| `ops notify count [--this-org]` | `ops notify count` |
| `ops notify read <ids...>` | `ops notify read <notificationId>` |
| `ops notify unread <ids...>` | `ops notify unread <notificationId>` |
| `ops notify read-all [--this-org]` | `ops notify read-all` |
| `ops notify dismiss <id>` | `ops notify dismiss <notificationId>` |
| `ops notify prefs list` | `ops notify prefs list` |
| `ops notify prefs set <category> on\|off [--channel <c>]` — categories: tasks, deadlines, plans, updates | `ops notify prefs set plans off --channel push` |

### activity

| Command | Example |
|---|---|
| `ops activity list [--on <id\|url> \| --scope <scope>] [--mine] [--action <a>]... [--text <t>] [--limit n] [--cursor c]` — the Waybill feed of the org, or of one scope | `ops activity list --on <planId> --limit 10` |

Scopes are `org:<slug>`, `project:<id>`, `deliverable:<id>`,
`subsection:<id>`, `backlog:<projectId>`, `backlog:org:<slug>`, and
`plan:<id>`. `org:me` and `backlog:org:me` name the personal workspace.
`--on` maps a record to its scope (a task to its section or backlog, a
step to its plan, a deadline, day label, or deployment to `org:<slug>`).

### history, undo, redo (any scope)

| Command | Example |
|---|---|
| `ops history (--on <id\|url\|address> \| --scope <scope>)` — your undo and redo stacks in the scope (`waybill.peek`); the scope of a section is `subsection:<id>` (the word of the service) | `ops history --on <taskId> --json` |
| `ops undo (--on <id\|url> \| --scope <scope>) (--expect <seq> \| --dry-run)` | `ops undo --on <taskId> --expect 12` |
| `ops redo (--on <id\|url> \| --scope <scope>) (--expect <seq> \| --dry-run)` | `ops redo --scope org:me --dry-run` |

The guard is the one of `ops plan undo`. A deliverable maps to
`deliverable:<id>` (its sections); a change of the deliverable row itself
is in `project:<projectId>`.

### favourite

| Command | Example |
|---|---|
| `ops favourite list` — your favourites in the active org, in star order (`home.favourites`) | `ops favourite list --json` |
| `ops favourite add <record> [--kind project\|deliverable\|section]` — star a record; a title needs `--kind`, an ID or URL does not | `ops favourite add <deliverableId>` |
| `ops favourite remove <record> [--kind]` — remove the star; the ID of a deleted record works too | `ops favourite remove <recordId>` |

A record of another kind gives `wrong_kind`. Both ops are idempotent. More
than 100 favourites in one org gives `favourites_full`. The ops come from
(Task) 316: on a deployment without them, the error says that they are not
deployed yet.

### day-label

| Command | Example |
|---|---|
| `ops day-label list` | `ops day-label list` |
| `ops day-label create <label> --start <date> [--end <date>] [--color water\|fire\|earth\|air\|sun\|moon\|muted]` | `ops day-label create Offsite --start 2026-10-12 --end 2026-10-14 --color sun` |
| `ops day-label update <day-label> [--label] [--start] [--end] [--color]` | `ops day-label update Offsite --color moon` |
| `ops day-label delete <day-label>` | `ops day-label delete Offsite` |

### notepad

A notepad is a Markdown page of the org. A **general** notepad is shared
with the org. A **personal** notepad (the default) is seen by you only. A
notepad can link to one section (its scope). A `<notepad>` is an ID, a web
URL (`.../notepads/<id>`), or a title; an ID or a title is looked up in the
active org. A task mention is the token `[[task:<id>|<title>]]` in the
text: only the ID counts.

| Command | Example |
|---|---|
| `ops notepad list [--general \| --personal] [--section <s> \| --deliverable <d> \| --project <p>]` — newest edit first; the scope flags filter by the linked section | `ops notepad list --general --json` |
| `ops notepad show <notepad> [--md]` — the title, the facts (with the `rev`), then the Markdown; `--md` prints only the Markdown; `--json`: `{notepad, blocks, tasks, markdown}` | `ops notepad show "Standup notes" --md > notes.md` |
| `ops notepad create <title> [--general] [--body <md\|->] [--section <s>]` — personal unless `--general` | `ops notepad create "Sprint notes" --general --section Backend` |
| `ops notepad rename <notepad> <title>` | `ops notepad rename <notepadId> "Weekly standup"` |
| `ops notepad scope <notepad> (<section> \| --clear)` — link to one section, or remove the link | `ops notepad scope <notepadId> Backend` |
| `ops notepad append <notepad> [<md\|->] [--task <task>]` — add Markdown at the end, or a task mention with `--task` | `ops notepad append <notepadId> "- Call Sam about the beta"` |
| `ops notepad write <notepad> <md\|-> (--expected-rev <rev> \| --force)` — replace all content; a change after `rev` refuses the write; `--force` replaces the content that is there now (a change after your read is lost) | `ops notepad write <notepadId> - --expected-rev 3 < notes.md` |
| `ops notepad to-task <notepad> <text> [--section <s> \| --project <p> \| --backlog] [--title <t>] [--keep]` — make a task from a text; a task chip replaces the text (`--keep`: the chip follows it); with no destination flag, the task goes to the section of the notepad; a notepad with no scope needs a flag | `ops notepad to-task <notepadId> "Call Sam about the beta" --backlog` |
| `ops notepad move-to-task <notepad> <task> <text> [--copy]` — move a text to the end of a task description (`--copy`: leave it in the notepad) | `ops notepad move-to-task <notepadId> <taskId> "The budget is 4k."` |
| `ops notepad delete <notepad>` — a soft delete: the notepad leaves every list and read | `ops notepad delete <notepadId>` |

Traps:

- To edit a whole notepad: `show --json` (read `notepad.rev`), `show --md`
  to a file, edit the file, then `write --expected-rev <rev>`. Do not use
  `--force` when another person can edit the notepad.
- `to-task` and `move-to-task` take a text that occurs **exactly once** in
  the text blocks, as `show --md` prints it.
- The undo of `to-task` and `move-to-task` is not `ops undo`. Within 60 s,
  while the notepad and the task are unchanged, run
  `ops call notepads.undoGesture '<json>' --mutation` with the values of the
  `--json` result (`ops notepad to-task --help` gives the exact JSON). A
  changed record gives `notepad_undo_conflict` and changes nothing.

### day

The day plan is your own ordered list of tasks for one date. It can hold
tasks of any of your orgs, and at most 100 tasks. A date takes
`YYYY-MM-DD`, `today`, `tomorrow`, `yesterday`, or an offset such as `+1d`
or `-1w`; the default is today on this machine.

| Command | Example |
|---|---|
| `ops day show [date]` — the done count, then each task in plan order with its status and place; `--json`: `items` (with `date`, `doneCount`) | `ops day show tomorrow --json` |
| `ops day add <task...> [--date <date>] [--top] [--source-org <org>]` — at the end (`--top`: at the start); a title is searched in your personal workspace, or in the org of `--source-org` | `ops day add "Write the spec" --source-org nuucognition --date tomorrow` |
| `ops day remove <task...> [--date <date>]` — the tasks stay as they are | `ops day remove <taskId>` |
| `ops day reorder <task> (--before <t> \| --after <t> \| --top \| --bottom) [--date <date>]` | `ops day reorder <taskId> --top` |
| `ops day carry [--date <date>]` — add the unfinished tasks of the 7 days before the date to the end of its plan | `ops day carry` |

Traps:

- The day plan is personal. The stored default org does not apply. `--org
  me` (or `personal`, or your personal slug) is accepted. Any other `--org`
  fails with `day_plan_personal_only` (exit 2).
- `remove` and `reorder` find the task in the plan (an ID, a URL, a short
  ID, or a title). `add` finds the task in an org.
- To check a task off, use `ops task done <task>`. The day plan has no
  done mark of its own.

### deployment

A deployment is abstract: a name, a free version label, a status (`live`,
`paused`, `retired`), notes, a hidden context, an optional project, and an
optional check schedule. A live deployment has an inbox section.

| Command | Example |
|---|---|
| `ops deployment list [--project <p>] [--status live\|paused\|retired]` — `deployments.list`: each with its status, version label, schedule, open inbox count, project, and address | `ops deployment list --status live` |
| `ops deployment show <deployment> [--project]` — `deployments.get`: the schedule, the notes, the inbox with its open tasks, the deliverables that ship to it and the ones that came from its inbox | `ops deployment show Production` |
| `ops deployment inbox <deployment> [--open]` — `deployments.inbox`: the open tasks in order, then the done ones; add a task with `ops task create --deployment <d> --tag <tag>` | `ops deployment inbox Production --open` |
| `ops deployment create <name> [--project <p>] [--version-label <label>] [--notes] [--context <md>] [--status live\|paused\|retired]` — live by default, so the inbox is made at once | `ops deployment create Production --project Alpha --version-label 1.4` |
| `ops deployment update <deployment> [--name] [--version-label <label\|none>] [--notes] [--status] [--move-to-project <p\|none>]` | `ops deployment update Production --version-label 1.5` |
| `ops deployment status <deployment> live\|paused\|retired` — `deployments.setStatus`; `live` makes the inbox | `ops deployment status Production paused` |
| `ops deployment schedule <deployment> day\|week\|month\|off` — `deployments.setSchedule`; prints the next check | `ops deployment schedule Production week` |
| `ops deployment check <deployment>` — `deployments.checkNow`: the check-up task now (none when an open one is there) | `ops deployment check Production` |
| `ops deployment start-deliverable <deployment> <title> (<tasks...> \| --all-open) [--project <p>]` — `deployments.startDeliverable`: a new deliverable that comes from (and ships to) the deployment, with one section that holds the moved tasks; the service names that section "From the inbox" (rename it: `ops section update <section> --title <title>`) | `ops deployment start-deliverable Production "1.5 fixes" --all-open` |
| `ops deployment context show\|set <deployment> …` — through `deployments.update` | `ops deployment context set Production "The web app at ops.example.com"` |
| `ops deployment delete <deployment> --yes` — its inbox stays as a plain section | `ops deployment delete Beta --yes` |

The program owns `--version` (it prints the version of the CLI anywhere on
the line), so the label is `--version-label`. The version chain of before the
revamp is deprecated: `--previous`, `--url`, `--identifier`, `--not-owned`,
`list --chains`, `end-chain`, and `reopen-chain` stay hidden, print a note,
and work while the service keeps them.

### query

`ops query` reads the rows of one table of the org with conditions. It is
read-only and org-scoped. Use it only when no typed command answers. The
backend is `convex/agentQuery.ts` (ops `agentQuery.tables`,
`agentQuery.describe`, `agentQuery.run`).

| Command | Example |
|---|---|
| `ops query tables` — the readable tables, each with its rule (`org`, `user`, `notepad`) and a summary | `ops query tables --json` |
| `ops query describe <table>` — the org field, the rule, the default index, the indexes of the org, and the fields with their types | `ops query describe tasks` |
| `ops query <table> [--where <cond>]... [--index <name>] [--order asc\|desc] [--limit 1-500] [--cursor <c>] [--all] [--fields a,b.c] [--count] [--json]` — the rows of the active org that match every `--where` | `ops query tasks --where checkbox=done --where 'priority in high,urgent' --fields title,priority` |

The forms of `--where`:

| Form | Meaning | Example |
|---|---|---|
| `f=v`, `f==v` | equal | `checkbox=done` (table `tasks`) |
| `f!=v` | not equal | `checkbox!=done` |
| `f<v`, `f<=v`, `f>v`, `f>=v` | less, greater | `'dueDate>=2026-11-01'` (table `deadlines`) |
| `'f in a,b,c'` | one of a list (at most 50 values) | `'priority in high,urgent'` |
| `f~v` | contains: a part of a string (no case), or an item of a list | `'title~login'` |
| `f?` | the field exists | `'ownerUserId?'` |
| `!f?` | the field does not exist | `'!dueDate?'` |

A value is a number, `true`, `false`, `null`, or a string. `"42"` in double
quotes stays a string. Quote a condition that has `<`, `>`, `!`, `?`, or a
space.

The rules:

- **`ops query tables` is the source of truth for the readable tables.** The
  allowlist can change; do not keep a fixed list. A table that it does not
  list fails with `query_unknown_table`. Tables that hold a secret, a token,
  a credential, an auth record, or a Strike sync internal are not readable,
  and neither is a table with no org field (for example `users`,
  `day_plans`, `task_types`, the `strike*` tables). For those, use
  `ops member list`, `ops day show`, and `ops task type list`.
- The rule `user` (for example `favourites`, `recent_subsections`) gives
  only the rows of the caller. The rule `notepad` gives a general notepad, or
  a personal notepad that the caller wrote.
- The names are the schema names, not the CLI words: a section is a row of
  `deliverable_subsections`; the section of a task is `subsectionId`; the
  status of a task is `checkbox` (`todo`, `doing`, `done`); the status of a
  blocker is `status` (`open`, `resolved`, `dropped`); plan steps are
  `plan_nodes`; a time such as `createdAt` is epoch milliseconds; a date
  such as `dueDate` is a `YYYY-MM-DD` string. Run `describe` first
  ([[dev-knw-ops-data_model]] gives the meaning of the fields).
- Each read goes through an index whose first field is the org field. An
  `=` condition on the fields of an org index uses that index (the JSON
  gives `index`); `--index <name>` names one; `--order` is the order of the
  index (default `asc`).
- A page holds at most `--limit` rows (default 50, at most 500), and one call
  reads at most 5000 rows. A page can hold fewer rows than the limit (a
  contains condition, or the scan bound). `more: --cursor <c>` means more
  rows: pass `--cursor <c>`, or use `--all`. `--all` and `--count` stop at
  5000 rows. `--fields` keeps `_id` always.
- Hidden fields: the query never gives a Clerk subject, a prompt hash, or a
  machine id. `task_launches` hides `launchedBySubject`, `acceptedBySubject`,
  `textHash`, and `machineId`; `fleet_actors` hides `ownerClerkUserId`;
  `notepads` hides `ownerClerkUserId` and `lastEditedBy`. A hidden field is
  not a valid `--where` or `--fields` name (`query_unknown_field`). A deleted
  notepad is not given.
- Caps: 20 `--where`, 50 `--fields`, 4 parts in a dotted path, 120
  characters in a field name. A value such as `007`, or a number past the
  safe integer range, stays a string.
- Errors (exit 1, each with a hint): `query_unknown_table`,
  `query_unknown_field`, `query_bad_field`, `query_bad_index`,
  `query_bad_value`, `query_bad_cursor` (read again with no cursor), and
  `org_unauthorized`. An org that you are not a member of gives the same
  answer as an org that does not exist.
- The ops are new on the gateway: prod has them only after the next prod
  deploy. Before that, `ops query` on prod data fails with
  `agent_unknown_operation`.

### Commands of ops-cli-publish-1023

The lanes of ops-cli-publish-1023 (2026-10-23) added these commands. Their
ops are on dev data now. **Prod gets them at the next prod deploy** (a
release session); before that, each one fails on prod with
`agent_unknown_operation`, and the message names (Task) 381.

| Command | What it does, and its traps |
|---|---|
| `ops address <record> [--kind project\|deliverable\|section\|task\|deployment\|taskgroup\|notepad\|plan\|step\|deadline\|blocker]` | The address of any record: the display address (the alias, else the id form), the id address, the `nuu://ops/<type>/<id>` URI, and `canRename`. A project, a deliverable, a task, a task group, and a notepad have an address row. A section and a deployment have the id form only (`@v1/<org>/section/<id>#ops`). A plan, a step, a deadline, a day label, and a blocker have no address: use the ID. A title needs `--kind`. `moved: true` means that the text is an old alias or an old form: use the printed address. |
| `ops people search <text> [--limit 1-50]`, `ops people show <@handle\|email\|user_id>` | The profiles in the scope of the active org. `people show` takes a `@handle`, an email, or a Clerk `user_` id; not `me`, and not the users-table id of `ops whoami`. `ops member list` gives the user rows that task owners and assignees use. |
| `ops project link <project> <uri...>` | Links NUU Connect URIs (`nuu://<app>/<type>/<id>`) to a project. Each URI is stored one time; at most 50. A bad URI gives `connect_bad_request` (exit 1). `--json` gives `{id, connectRefs}`. |
| `ops project unlink <project> <uri>` | Removes one URI. A URI that is not linked changes nothing. |
| `ops deployment add <deployment> <title> [--body <text>] [--tag feedback\|hotfix\|ongoing\|recurring] [--every day\|week\|month] [--project <p>]` | The inbox Add of the web app. It makes the inbox when it is absent, also on a paused or retired deployment. `--every week` alone gives the tag `recurring`. `ops task create --deployment` needs a live deployment with an inbox. |
| `ops deployment sections <deployment> [--open] [--project <p>]` | The sections of a deployment other than its inbox (sections that a move put there). `ops deployment inbox` lists the inbox only. |
| `ops deliverable status (<deliverable> [--project <p>] \| --project <p>)` | The derived status of a deliverable (`open`, `in-progress`, `blocked`, `completed`) and of each section (`blocked`, `ready`, `in-progress`, `done`). `ops deliverable done` is the mark of a person and wins. `partial: true` means that the read budget stopped. |
| `ops project create … --deployment <d>`, `ops project update <project> --deployment <d\|none>` | The deployment that a project ships to (a link only). |
| `ops task create … --type <type> --stage <stage>` | Sets the type and the first stage in one write. |
| `ops task link <task> <previous>` | Links two tasks that exist (continues-from). It closes nothing. `ops task continue` makes a NEW task. |
| `ops task unlink <task> [--kind continues-from\|after]` | Removes a link. `ops task chain\|unchain` manage the `after` links. |
| `ops task related <kind> <ref>` | The reverse of `task relate`: the tasks of a repository, a Flint, a project, a deliverable, or an address. |
| `ops task group update <group> [--title <title>] [--body <md\|->]` | Changes a task group. The `--json` of `task group create` and `task group update` gives `groupId`, not `id`. |
| `ops task session-state <session-id> <state>` | An Orbh session sets its state on all its task attachments in one call (no need to attach each task again). |
| `ops task launch accept <launch-id> --station <address> --machine-id <id> (--text-file <path> \| --text-hash <hex>)` | A station workflow accepts a NUU Network launch before any work, then works only on the task and the org that it returns. |
| `ops home stats`, `ops home recents`, `ops home activity [--limit n] [--cursor c]`, `ops home brief <project>` | The homepage. `stats` computes the local week (Monday 00:00) and the 7-day due window from the clock of the machine. |
| `ops day candidates [--date d]` | The start of day planning: the open tasks of every org, with the planned ones marked. Then `ops day add <taskId>...`. It is personal: `--org <team org>` refuses with `day_plan_personal_only` (exit 2). |
| `ops comment count <tasks...>` | The comment counts of many tasks, one call for each org. |
| `ops notepad share <notepad> (--general \| --personal)` | Who reads a notepad (`setScope`). `ops notepad scope` is a different thing: it links the notepad to a section. Do not mix the two words. |
| `ops notepad mentions <task>` | The notepads that hold a chip of the task. |
| `ops activity row <record> [--limit n] [--cursor c]` | Who changed one record, and when. The record is an ID, a URL, or an Ops address, also of a notepad. `ops activity list` is the feed of a scope. |
| `ops activity facets [--on <record> \| --scope <scope>] [--limit n]` | The actor and action values to pass to `ops activity list --action`. |
| `ops notify read-key <key>` | Marks as read every notification with one collapse key (the `key` of a notification in `--json`, for example the key of a comment thread). |
| `ops --version` | Prints the version of `package.json`. |

Other changes and traps:

- Every reference resolves a blocker ID, and a notepad ID or address
  (`@v1/<org>/notepad/<id>#ops`), through `agent.resolve`. A deleted notepad
  and a personal notepad of another person are "not found".
- A delete of a project, a deliverable, or a deployment needs an org owner
  or admin (`owner-only`). In the dev org `test` the dev user is a member, so
  these deletes fail. An agent archives a project
  (`ops project update <p> --status archived`), retires a deployment
  (`ops deployment status <d> retired`), and marks a deliverable done (after
  the operator confirms). A member cannot delete a shared (general) notepad
  of a team org (`owner-only`): ask an owner or an admin to delete it. Do
  not change its scope to get around the check (an open access question for
  the operator).
- `ops section archive` refuses a section that is not done
  (`subsection_not_done`). `ops section delete --yes` deletes the section
  with its tasks.
- `ops task delete` and `ops notepad delete` take no `--yes`.
  `ops blocker delete`, `ops section delete`, `ops deployment delete`, and
  `ops project delete` need `--yes`.
- `ops blocker delay <blocker> <date>` takes the date as an argument (`+5d`,
  `YYYY-MM-DD`), not `--to`.

## The gateway

- `POST <site>/agent/query`, `POST <site>/agent/mutate`, and (for an action
  such as `route.suggest`) `POST <site>/agent/action`, body `{op, args}`,
  header `Authorization: Bearer <nuu CLI JWT>`.
- Response `{ok:true, result}` or `{ok:false, error:{code, message, data?}}`.
- `GET <site>/agent/manifest` returns `{version, ops:[{op, kind, area, summary}]}`
  (`kind` is `query`, `mutation`, or `action`) and needs no credential.
  `ops ops` prints it.
- The op name is the Convex path with a dot (`plans.createNode`); its args
  are that function's args. Gateway read ops live in `agent.*`:
  `agent.getTask`, `agent.searchTasks`, `agent.resolve`.

`ops call` reaches every allowlisted op, also the ones with no dedicated
command (for example `people.search`, `waybill.rowHistory`,
`deadlines.linkIndex`).
