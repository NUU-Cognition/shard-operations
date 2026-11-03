---
description: "The main skill of Operations: what Ops is, the model, the two modes and the sign-in, the org, references and places, --json and the error codes, the command for each job, ops query and ops call for any other read or write, ten recipes, the safety rules, and troubleshooting"
orb:
  - "@v1/nuucognition/session/9297d2a3-64c8-4d33-8c4c-76011ebae793#flint/nuu-operations"
orbh-fleet: ops-cli-publish-1023
orbh-sessions:
  - "[[9297d2a3-64c8-4d33-8c4c-76011ebae793]]"
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start ops` if you haven't already.

# Skill: Use Operations

Do any Operations work through the `ops` CLI, with no other context. This skill is the entry point of the shard. It gives the model, the setup, the command for each job, and the rules. The other skills and workflows go deeper on one job. The long reference is in [[dev-knw-ops-cli]] (every command and flag) and [[dev-knw-ops-data_model]] (every entity, field, rule, and error code).

# Input

- The request: what to read or change in Operations
- (Optional) The org, the data mode (prod or dev), and the records that the request names

# Actions

## 1. Know what Operations is

NUU Operations (Ops) is the delivery record of a person and of a team: what to do, where it belongs, when it is due, and what blocks it. People use the web app (`https://ops.nuucognition.com`). Agents use the `ops` CLI. The CLI calls the **agent gateway** of the Operations Convex backend. The gateway calls the same public functions that the web app calls. Thus an agent write has the same access checks, the same activity log (Waybill), and the same notifications as a person's write. Each agent write also has an agent mark ("via agent").

The model:

| Entity | What it is | Main commands |
|---|---|---|
| **Org** | Holds every record. A team org (its slug) or the personal workspace (`me`). | `ops org list\|use\|show`, `ops member list` |
| **Project** | A body of work in an org. It has a hidden context (Markdown for search and the route, not shown on the page). | `ops project …` |
| **Deliverable** | A result of a project. A person marks it done (`ops deliverable done`); its sections do not. | `ops deliverable …` |
| **Section** | A list of tasks. It has one **home**: a deliverable, a project, a deployment (its inbox), or the org. The backlog of a project is its section with the role `backlog`. The **master backlog** is the backlog section of the org. A section is done when all its root tasks are done. The former word is "subsection". | `ops section …`, `ops backlog show` |
| **Task** | A work item in a section, or with no home (unplaced). It has a status (`todo`, `doing`, `done`), a priority, an owner, a body, and comments. | `ops task …` |
| **Subtask** | A full task with a parent. A tree has at most 6 levels below the root. A subtask has the home of its root. A list shows root tasks with a count. A move takes the subtree. | `ops task subtask …`, `--parent` |
| **Task group** | A set of tasks that are done together. Each task stays a full task. | `ops task group …` |
| **Review request** | A request that one person reviews a task (Task 402). It goes into **Your Reviews** of the web app (every org, oldest first) with a notification. The default reviewer is the owner of the task. The reviewer approves (this closes the task), asks for changes, or dismisses. | `ops task review request\|approve\|changes\|dismiss\|cancel`, `ops review list` |
| **Lineage and links** | `split`, `merge`, `continue`, and `chain` link tasks. Related links point to a project, a deliverable, a repository, a Flint, or an address. Attachments link a session, a fleet, a note, or a repository. | `ops task split\|merge\|continue\|chain\|relate\|attach`, `ops task map` |
| **Deployment** | What a project runs: a name, a free version label, a status (`live`, `paused`, `retired`), notes, and a context. A live deployment has an **inbox** section. Inbox tasks have a tag: `feedback`, `hotfix`, `ongoing`, or `recurring`. A check schedule adds a task "Check <deployment>" each period. | `ops deployment …` |
| **Plan and step** | A plan is a canvas: a graph of steps with `requires` edges, positions, and links to records. | `ops plan …`, `ops step …` |
| **Deadline** | A dated record in a graph: it attaches to records, it can require other deadlines, and it has assignees. | `ops deadline …` |
| **Blocker** | Why work waits: a title, what it waits on, the next step, an owner, and the next check-up date. It links records and gates no status. Open, resolved, or dropped. | `ops blocker …` |
| **Notepad** | Markdown text with task mentions (`[[task:<id>\|<title>]]`). General (the org sees it) or personal. | `ops notepad …` |
| **Comment** | A post on the Updates timeline of a task. | `ops comment …` |
| **Day plan** | Your own ordered list of tasks for one date. Personal only. | `ops day …` |
| **Day label** | A label on a range of calendar days of the org. | `ops day-label …` |
| **Address** | The stable name of a record: `@v1/<org>/<kind>/<key>#ops` (for example `@v1/acme/task/<id>#ops`). A project, a deliverable, a task, a task group, and a notepad have an address row (an alias, else the id form). A section and a deployment have the id form only (`@v1/<org>/section/<id>#ops`). A plan, a step, a deadline, a day label, and a blocker have no address: use the ID. | `ops address <record>`, any record argument |
| **Person** | A profile in the scope of the org. `ops member list` gives the user rows that owners and assignees use. | `ops people search\|show`, `ops member list` |
| **Waybill** | The activity log and the undo and redo stacks of each scope. | `ops activity list`, `ops history`, `ops undo`, `ops redo` |

Personal records: notifications (`ops notify`), favourites (`ops favourite`), and the day plan. The full model is in [[dev-knw-ops-data_model]] § The Model.

## 2. Pick the build and the data, and sign in

There are two builds of the CLI. The build decides the data.

- **Install.** The npm package is `@nuucognition/ops-cli`. It is ready but **not published yet**. After the publish: `npm install -g @nuucognition/ops-cli`. It needs Node.js 24 or newer (an older Node gives `node_too_old`, exit 1). The package has one command, `ops`: the prod build. `ops-dev` exists only in the monorepo.
- **Sign-in.** `nuu login`, `flint login`, and `ops login` write the same prod credential, `~/.nuucognition/auth.json`. A machine that is signed in to flint needs no other step. The dev build uses `~/.nuucognition/auth.local.json`.

| Command | Build | Data | Convex deployment | Credential |
|---|---|---|---|---|
| `ops` | prod | always PROD (ignores `OPS_DATA_MODE`) | `acoustic-weasel-248` | `~/.nuucognition/auth.json` (`nuu login`) |
| `ops-dev` | dev | DEV by default; `ops-dev mode prod` moves it to prod data | `next-dalmatian-912` | `~/.nuucognition/auth.local.json` |

1. Run `ops mode` (or `ops-dev mode`). Read the lines `build mode` and `data mode`. Write only when the data mode is the data of the request. A test write goes to DEV data.
2. When `ops-dev` is not on PATH, run the dev launcher of the monorepo: `node "<monorepo>/apps/cli-ops/bin/ops.js" <command>` (`<monorepo>` is `Repos/main` of the Tinderbox). It is always a dev build. In the monorepo, `ndv use ops dev|prod` links the command `ops` to one build: then `ops mode` tells you which.
3. Run `ops whoami`. It shows the user, the email, the data mode, and the active org. `ops --version` prints the version of the package. When a command fails with `auth_required` or `unauthenticated` (exit 3), the operator signs in: `nuu login` (or `ops login`, the sign-in of the current data mode, in a browser). An agent cannot sign in: ask the operator to run `nuu login`, or report it.
4. Run `ops --help` one time. It lists the command groups. When it does not list `headers`, `route`, `search`, and `section`, the build is of before the revamp: stop and report it.

In this skill, `ops` names the command that you chose here.

> [!note] New ops reach prod at the next prod deploy.
> The commands that ops-cli-publish-1023 added (for example `ops query`, `ops address`, `ops people`, `ops home`, `ops deployment add`, `ops deliverable status`, `ops task link`) call new gateway ops. They are on dev data now. A release session deploys them to prod soon. Until then, such a command on prod data fails with `agent_unknown_operation`, and the message says that the op is not deployed there yet. Do not retry it on prod: use a typed command that exists, or wait for the deploy.

## 3. Pick the org

The CLI acts in the active org: `--org <slug|name|me>` on the command, else the stored default of the data mode (`ops org use <org>`), else the personal workspace (`me`). A record that you give by ID, URL, or address acts in its own org.

1. Run `ops org list` to see your orgs (`*` marks the active org).
2. Pass `--org <org>` on each command. Do not change the stored default unless the operator asks.
3. On dev data, write tests in the org `test`. On prod data, use the personal workspace (`me`) for a test, and only when the operator asks.

The day plan is personal: `ops day` takes no team org (`day_plan_personal_only`, exit 2).

## 4. Find the record

1. Get the map of the places: `ops headers [--project <p>] --json`. It gives each project, deliverable, section, and deployment with its id, home, status, and address (no tasks).
2. Find a task or a place by text: `ops search "<text>" [--type task,section,deliverable,project,deployment] --json`. For tasks only: `ops task search "<text>"`.
3. Find a person: `ops people search "<text>"` and `ops people show <@handle|email|user_id>`. `people show` takes a `@handle`, an email, or a Clerk `user_` id; it does not take `me` or the users-table id that `ops whoami` gives. Get the address of any record: `ops address <record> [--kind <kind>]` (a title needs `--kind`; `moved: true` means that you typed an old alias: use the printed address).
4. Name a record by one of these **references**: an ID, an address, a web URL, a title, or a path (`"Alpha › v1 › Backend"`; `›`, `>`, and `/` are the same separator). Prefer the address: it never needs a scope and never matches two records.
5. When a title matches more than one record, the command fails with `<kind>_ambiguous` (exit 2) and lists the candidates with their IDs and paths. Run it again with the ID or the address. Never guess between candidates.
6. A **place** (`--to` of `ops task move`) is `section:<ref>`, `project:<ref>` (its backlog), `deliverable:<ref>` (its first open section), `deployment:<ref>` (its inbox), `parent:<task>` (a subtask), `backlog`, `master`, or `unplaced`. A **link spec** (deadline, step, and blocker links) is `kind:ref`, a URL, an address, or an ID; a title needs the kind prefix (`task:"Write docs"`).

## 5. Read before you change

1. Read the record: `ops <noun> show <ref> --json`. For a task, run `ops task context <task>`: the facts, the project description, the body, and the newest comments.
2. For the tree, the home, the groups, and the lineage of a task, run `ops task map <task>` ([[dev-sk-ops-read_task_map]]).
3. Use `--json` and parse it. Take IDs and addresses from the JSON. Never build or guess an ID. `--json` prints exactly one JSON document on stdout; an error is one JSON document `{"error": {code, message, exitCode, hints}}` on stderr.

## 6. Do the job

Use the first command that fits. `ops <noun> <verb> --help` gives the flags and examples. [[dev-knw-ops-cli]] gives every command.

| Job | Command |
|---|---|
| **Find** places, tasks, people | `ops headers`, `ops search "<text>"`, `ops task list [--section\|--project\|--deliverable\|--deployment\|--master\|--mine\|--all\|--unplaced] [--status open\|todo\|doing\|done\|all]`, `ops task related <kind> <ref>` (the tasks of a repo, a Flint, a project, a deliverable, or an address), `ops member list`, `ops people search\|show`, `ops address <record>` |
| **See the overview** | `ops home stats` (the counts of the homepage), `ops home recents`, `ops home activity`, `ops home brief <project>` |
| **Read** one record | `ops project\|deliverable\|section\|deployment\|plan\|deadline\|blocker\|notepad show <ref>`, `ops task show\|context\|map <task>`, `ops backlog show [--project <p>]`, `ops deployment inbox <d> --open` (the inbox only), `ops deployment sections <d>` (its other sections), `ops deliverable status <d>` (the derived status of a deliverable and its sections; `deliverable done` is the person's mark and wins), `ops comment count <tasks...>` |
| **Create** a task | `ops task create "<title>" --section\|--project\|--deliverable\|--deployment\|--parent <ref>` (or `--route`, `--master`, `--unplaced`); `--repo <name>` adds a `repo` related link ([[dev-sk-ops-create_task]]); the inbox Add of the web app: `ops deployment add <d> "<title>" --tag hotfix` (it makes the inbox when it is absent; `--every week` alone gives the tag `recurring`) |
| **Link** outside records to a project | `ops project link <project> <uri...>` (NUU Connect URIs `nuu://<app>/<type>/<id>`; each URI one time; at most 50; `--json` gives `{id, connectRefs}`), `ops project unlink <project> <uri>` (a missing URI changes nothing) |
| **Create** a place | `ops project create [--deployment <d>]`, `ops deliverable create <title> --project <p>`, `ops section create <title> --project\|--deliverable\|--deployment <ref>`, `ops deployment create <name> --project <p>` |
| **Change** a task | `ops task update <task> --title\|--body\|--priority\|--assign\|--tag\|--every`, `ops task start\|done\|reopen\|close\|result <task>` |
| **Ask for a review** of a task, or give the verdict | `ops task review request <task> [--to <member>] [--note <text\|->]` (the owner by default); the reviewer: `ops task review approve <task> [--keep-open]`, `changes <task> [--note <text>]`, `dismiss <task>`; the requester: `ops task review cancel <task> [--to <member>]`; the queue: `ops review list [--org <org>] [--state open\|all]` |
| **Change** a place | `ops <noun> update <ref> …` (`ops project update <p> --deployment <d\|none>`: the deployment that a project ships to), `ops <noun> context set <ref> "<md>"`, `ops section priority\|archive\|deps`, `ops deployment status\|schedule\|check` |
| **Move** and order | `ops task move <tasks...> --to <place>`, `ops task reorder <task> --before\|--after <t>`, `ops section move\|reorder`, `ops task subtask …` ([[dev-sk-ops-move_tasks]]) |
| **Group** and link tasks | `ops task group create\|add\|remove\|update` (`--json` of `create` and `update` gives `groupId`, not `id`); lineage: `ops task continue` (makes a NEW task), `ops task link <task> <previous>` (links two tasks that exist as continues-from, closes nothing), `ops task unlink <task> [--kind after]`, `ops task chain\|unchain` (the `after` links), `ops task split\|merge`; `ops task relate\|attach` |
| **Tie an agent session** to tasks | `ops task session-state <session-id> <state>` (the state on every attachment of the session); a station workflow: `ops task launch accept <launch-id> --station <address> --machine-id <id> --text-file <path>` before any work, then work only on the task and org that it returns |
| **Plan** work | `ops plan create\|show`, `ops step add\|move\|requires\|links` ([[dev-wkfl-ops-plan_layout]], [[dev-knw-ops-canvas]]); a deliverable with sections: [[dev-sk-ops-plan_deliverable]] |
| **Schedule** | `ops deadline create\|shift\|links\|requires\|assign`, `ops day candidates --date today` (open tasks of every org, the planned ones marked; personal: no team `--org`), then `ops day add <taskId>...`, `ops day show\|reorder\|carry`, `ops day-label create`, `ops deployment schedule` |
| **Block** and unblock | `ops blocker create <title> --check <date> --on <record>`, `ops blocker list --due`, `ops blocker delay <blocker> <date>` (the date is an argument, not `--to`), `ops blocker resolve\|drop\|reopen` |
| **Comment** | `ops comment list\|add\|edit\|react <task> …` |
| **Write notes** | `ops notepad create\|show\|append\|write\|to-task\|move-to-task`, `ops notepad mentions <task>` (the notepads with a chip of the task), `ops notepad share <n> --general\|--personal` (who reads it; `ops notepad scope` is different: it links a section) |
| **Review history** | `ops activity row <record>` (who changed one record, and when; the record is an ID, a URL, or an Ops address, also of a notepad), `ops activity list [--on <record>] [--mine] [--action <a>]` (the feed of a scope), `ops activity facets` (the actor and action values for `--action`), `ops history --on <record>`, `ops notify list\|count\|read-key <key>` |
| **Undo** | `ops history --on <record>`, then `ops undo --on <record> --expect <seq>` (or `ops plan history\|undo <plan>`) |
| **Triage** an inbox or a backlog | [[dev-sk-ops-triage_inbox]], [[dev-wkfl-ops-backlog_triage]] |
| **Finish** a deliverable | `ops deliverable done\|reopen <d>`: a person decides; ask the operator first |

## 7. When no command fits

1. **Any read: `ops query`.** It reads the rows of one table of the org with conditions. It is read-only. Use it only when no typed command answers.

   ```bash
   ops query tables                                   # the tables that you can read, with the rule of each
   ops query describe <table>                         # the fields, the indexes, and the org field of one table
   ops query <table> [--where <cond>]... [--index <name>] [--order asc|desc] \
     [--limit 1-500] [--cursor <c>] [--all] [--fields a,b.c] [--count] [--json]
   ```

   1. Run `ops query tables`. **Its output is the source of truth for the readable tables**: the list can change. A table that it does not list fails with `query_unknown_table`. The rule of each table is `org` (each row of the org), `user` (only your own rows), or `notepad` (a general notepad, or a personal notepad that you wrote).
   2. Run `ops query describe <table>` before the first query on a table. The names are the names of the schema, not the CLI words: a section is a row of `deliverable_subsections`; the section of a task is `subsectionId`; the status of a task is `checkbox` (`todo`, `doing`, `done`); plan steps are `plan_nodes`; a time such as `createdAt` is epoch milliseconds; a date such as `dueDate` is a `YYYY-MM-DD` string.
   3. Write each `--where` as `field<op>value`: `f=v` (or `f==v`), `f!=v`, `f<v`, `f<=v`, `f>v`, `f>=v`, `f~v` (contains, no case; for a list: has the item), `f?` (exists), `!f?` (does not exist), `'f in a,b,c'` (at most 50 values). A value is a number, `true`, `false`, `null`, or a string; `"42"` in double quotes stays a string. Repeat `--where`: all conditions must match. Quote a condition that has `<`, `>`, `!`, `?`, or a space.
   4. An `=` condition on the fields of an org index uses that index (the JSON gives `index`). `--index <name>` names one; `--order` is the order of the index.
   5. Some fields are hidden: the query never gives a Clerk subject, a prompt hash, or a machine id (for example `textHash` and `machineId` of `task_launches`, `ownerClerkUserId` of `notepads` and `fleet_actors`). A hidden field is not a valid name for `--where` or `--fields` (`query_unknown_field`). A deleted notepad is not given. The caps: 20 `--where`, 50 `--fields`, 4 parts in a dotted path, 120 characters in a field name. A value such as `007`, or a number past the safe integer range, stays a string.
   6. A page holds at most `--limit` rows (default 50, at most 500). A page can hold fewer rows than the limit. `more: --cursor <c>` means that there are more rows: pass `--cursor <c>`, or use `--all`. `--all` and `--count` stop at 5000 rows. `--fields` makes the rows small (`_id` always stays).
   7. Errors: `query_unknown_table`, `query_unknown_field`, `query_bad_field`, `query_bad_index`, `query_bad_value`, `query_bad_cursor` (read again with no cursor). Each error has a hint with the next step. An org that you are not a member of gives the same answer as an org that does not exist. Some data has no table: for users and day plans use `ops member list` and `ops day show`.
2. **Any op: `ops ops` and `ops call`.** `ops ops [--area <area|module>]` prints the gateway manifest: every allowlisted op with its kind and summary. `ops call <op> '<json>' [--inject-org]` sends one op with raw JSON args (or `-` for stdin) and always prints JSON. Use it only when no typed command does the job, and read the Convex function first: a typed command adds the checks and the reference resolution that `ops call` does not.
3. When an op is not in the manifest, the CLI cannot do the job. Report it. Do not edit the database another way.

## 8. Check the result and report

1. Read the output: each line that shows a record ends with its address. A create prints the stored title, the address, and the place. Check that the place is the place of the request.
2. Read the record again when the result is not clear (see Safety Rule 6).
3. Report with the address and the web link of each record that you made or changed. The host is `https://ops.nuucognition.com` (prod data) or `http://localhost:3088` (dev data); the paths are in the init § Web Links.

# Recipes

Each recipe uses `--org <org>` when the org is not the active one. Use `--json` when an agent reads the output.

1. **Read a task before work.**
   ```bash
   ops task context <task>          # facts, description, newest comments
   ops task map <task>              # tree, home, groups, lineage
   ```
2. **Create a task where it belongs.**
   ```bash
   ops route "Fix the login bug on Safari" --json      # ranked places; a score below 0.3 fits nothing
   ops task create "Fix the login bug on Safari" --section <sectionId> --priority high --assign me
   ```
3. **Move tasks into a section.**
   ```bash
   ops task move <a> <b> --to section:"Alpha › v1 › Backend"
   ```
4. **Plan a deliverable.**
   ```bash
   ops deliverable create "v1 launch" --project Alpha --section "Backend"
   ops section create "Frontend" --deliverable "Alpha › v1 launch"
   ops section deps add "Alpha › v1 launch › Frontend" "Alpha › v1 launch › Backend"
   ops deliverable context set "Alpha › v1 launch" "What v1 ships and for whom"
   ```
   `ops section deps set|add|remove <section> [deps...]` sets the sections that a section comes after.
5. **Work a task and post updates.**
   ```bash
   ops task start <task>
   ops comment add <task> "Started: <what and where>"
   ops task done <task>             # after the operator confirms
   ```
6. **Record a blocker and follow it up.**
   ```bash
   ops blocker create "No API key from the vendor" --check +3d --waiting-on "Vendor" --on <taskId>
   ops blocker list --due           # the check-ups that have come
   ops blocker delay <blockerId> +1w --note "Vendor needs a week"
   ops blocker resolve <blockerId> --note "The key came"
   ```
7. **Triage a deployment inbox.**
   ```bash
   ops deployment inbox Production --open
   ops task update <task> --tag hotfix
   ops task move <task> --to section:"Alpha › v1 › Backend"
   ```
   The full procedure: [[dev-sk-ops-triage_inbox]].
8. **Plan your day.**
   ```bash
   ops day show today
   ops day add <task> <task>        # at the end; --top for the start
   ops day carry                    # the unfinished tasks of the last 7 days
   ```
9. **Answer a question that no command answers.**
   ```bash
   ops query describe tasks
   ops query tasks --where 'checkbox=doing' --order desc --limit 20 --fields _id,title,checkbox --json
   ops query tasks --where 'title~login' --count
   ops query blockers --where status=open --all --json
   ops query deadlines --where 'dueDate>=2026-11-01' --order desc --limit 10
   ```
10. **Undo your own last change.**
    ```bash
    ops history --on <record> --json       # read the head entry and its seq
    ops undo --on <record> --dry-run       # see what the undo replays
    ops undo --on <record> --expect <seq>
    ```

# Safety Rules

1. **Prod data is real.** A write on prod data is a real write that people see. Read `ops mode` before the first write. Test on dev data, in the org `test`, with a title that says it is a test. Remove each test record when the test is done.
2. **Act as the operator.** Each write is the operator's own write; Waybill records the operator as the actor, with the agent mark. Change only the records that the request names, in the org that it names.
3. **Read before a delete.** A delete of a project or a deliverable (and of a deployment) needs an org owner or admin (`owner-only`). An agent that is a member archives a project (`ops project update <p> --status archived`), retires a deployment (`ops deployment status <d> retired`), and marks a deliverable done after the operator confirms. A delete can cascade: a project takes its deliverables, sections, and tasks; a deliverable takes its sections and tasks; a section takes its tasks; a plan takes its steps. The CLI refuses these deletes without `--yes` (`confirm_required`, exit 2): project, deliverable, section, deployment, plan, and blocker. `ops task delete` and `ops notepad delete` take no `--yes`: read first. A task with subtasks needs `--with-subtasks`. Tell the operator what goes, and add `--yes` only after the operator confirms.
4. **Undo only what you read.** Undo replays your last gesture in a scope, and that gesture can be one that the operator made in the web app. Read `ops history` first and pass `--expect <seq>`. The CLI refuses an undo or a redo without `--expect` (`expect_required`) unless you pass `--dry-run`. A blocker write is a Waybill gesture in the scope `org:<org>`: use `ops history --scope org:<org>` and `ops undo --scope org:<org> --expect <seq>`. A comment delete and a blocker delete cannot be undone: resolve or drop a blocker instead of a delete.
5. **Respect what a person decides.** Do not mark a deliverable done or mark all notifications read unless the operator asks.
6. **Do not repeat a write blindly.** A network error (exit 4) or `bad_response` can come after the service saved the write. Read the record or the list first. Repeat the write only when it did not land. Never repeat a create or a comment without that check.
7. **Keep titles exact.** A task title that ends with a space and one digit (`0`–`7`) loses the digit: Ops reads it as the rarity.
8. **Use only the CLI.** Do not call Convex directly, and do not edit the files of the credential.

# Troubleshooting

| Symptom | Cause and next step |
|---|---|
| Exit 3, `auth_required` or `unauthenticated` | No credential, or it expired. Run `ops login` (or `nuu login` for prod). A headless agent reports it to the operator. |
| A write went to the wrong data | The `ops` on PATH is the prod build. Run `ops mode`; for dev data use `ops-dev` or the dev launcher. |
| Exit 2, `<kind>_ambiguous` or `place_ambiguous` | The title matches more than one record. Use an ID or an address from the list. |
| `<kind>_not_found`, `wrong_kind` | The reference names no record of that kind in the org. Run `ops search` or `ops headers`, and check `--org`. |
| `org_unauthorized`, `org_mismatch` | You are not a member of the org, or `--org` is not the org of the record. Run `ops org list`; drop `--org` for an ID or an address. |
| `org_frozen` | A migration runs. Reads work. Wait and try again. |
| `agent_unknown_operation` | The op is not deployed on this deployment yet: a new op of ops-cli-publish-1023 is on dev data only until the next prod deploy. Run `ops ops` to see the ops that exist. Do not retry on prod. |
| `agent_invalid_input` | The args of `ops call` do not match the function. Run `ops ops --area <module>` and read the Convex function. |
| `confirm_required` | The delete needs `--yes`. Read what it removes, ask the operator, then add `--yes`. |
| `expect_required`, `undo_state_changed`, `nothing_to_undo` | Read `ops history --on <record>` again, and pass the `seq` of the head entry with `--expect`. |
| `subsection_blocked`, `section_blocked` | An upstream section is not done. Finish it, or tell the operator. |
| `task_has_subtasks`, `subtask_too_deep`, `subtask_cycle` | Read the subtasks (`ops task subtask list <task>`); use `--with-subtasks`, a higher parent, or another parent. |
| `deployment_no_inbox` | The deployment is not live. `ops deployment status <d> live` makes its inbox. |
| `owner-only` | A delete of a project, a deliverable, a deployment, or a shared (general) notepad of a team org needs an org owner or admin. Archive the project or retire the deployment. For a shared notepad, ask an owner or an admin to delete it; do not change its scope to get around the check. |
| `connect_bad_request` (exit 1) | `ops project link` got a bad URI. A NUU Connect URI is `nuu://<app>/<type>/<id>`. |
| `query_bad_cursor` | The cursor is not valid. Run the query again with no cursor. |
| `subsection_not_done` | `ops section archive` takes only a done section. Finish or move its tasks first. |
| `query_unknown_table`, `query_unknown_field`, `query_bad_*` | Run `ops query tables` and `ops query describe <table>`, and use the schema names. |
| `node_too_old` | The installed `ops` needs Node.js 24 or newer. |
| `blocker_closed` | Reopen the blocker first: `ops blocker reopen <blocker> --check <date>`. |
| `day_plan_personal_only` | `ops day` and `ops day candidates` are personal. Drop `--org`, or pass `--org me`. |
| `note: the ops-dev bundle … is older than its source` | A note only: the dev launcher runs the source. |
| A command group with no verb fails | `ops task` alone is a usage error that lists the verbs. Run `ops task --help`. |

Every error code with its meaning is in [[dev-knw-ops-data_model]] § Error Codes and [[dev-knw-ops-cli]] § Output and errors.

# Output

The records that you read or changed, each with its address and web link, and the commands that you ran for each write.
