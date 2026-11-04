---
description: "The NUU Operations data model — the places (org, project, deliverable, section, deployment), tasks and subtasks, the task primitive, the task map, the blockers, the hidden context, the headers, the route decision, the addresses, every field as the backend names it, the rules of each mutation, undo and Waybill, and the error codes"
orbh-sessions:
  - "[[3fb6e594-a179-4c0b-ba67-833b2ccaea67]]"
  - "[[4c4eadb7-6e8e-4529-8186-3bb1b5bdbc75]]"
  - "[[f205c648-297b-41fe-8f7b-900dd6448829]]"
  - "[[9297d2a3-64c8-4d33-8c4c-76011ebae793]]"
orb:
  - "@v1/nuucognition/session/63260df7-271a-450f-b775-0cdfdedebc26#flint/nuu-flint"
orbh-fleet: ops-command-1021
---

# Knowledge: Operations Data Model

This file describes the records in the NUU Operations backend and the rules that the backend enforces. The source of truth is `apps/nuu-ops/convex` in the NUU monorepo: `schema.ts` and one module for each entity. An op name has the form `<module>.<export>`, for example `tasks.move`. The args of an op are exactly the args of that Convex function. Field names in this file are exact.

This file describes the model of the revamp `ops-command-1021` (October 2026). Read § Old Words when a note, a task, or a command uses a word of the model before it.

Read the section that you need. For the commands, read [[dev-knw-ops-cli]]. For plan step positions, read [[dev-knw-ops-canvas]].

## The Model

```
Org (orgSlug)
  ├── Org sections ── the master backlog (role backlog), other org sections
  ├── Project
  │     ├── Project sections ── the backlog (role backlog), a queue (role queue), plain sections
  │     ├── Deliverable ── sections ── tasks ── subtasks (at most 6 levels below the root)
  │     └── Deployment (live, paused, retired) ── its inbox section (role inbox) ── tasks with a tag
  ├── Deployments with no project ── each with its inbox section
  ├── Unplaced tasks (no home)
  ├── Deadlines, Blockers, Plans and steps, Day labels, Notepads
  └── Activity (Waybill), Notifications, Comments on tasks
```

- A **task** has one home: one section. A task with no section is **unplaced**, and that is normal.
- A **section** has one home: a deliverable, a project, a deployment, or the org.
- A **subtask** is a full task with a parent task. It has the home of its root task.
- A **backlog** is a section with the role `backlog`. The **master backlog** is the backlog section of the org.
- A **deployment** is something that runs. A live deployment has an **inbox**: a section with the role `inbox`.
- A **deliverable** is done only when a person marks it done.
- A **blocker** says why work waits. It links to projects, deliverables, sections, tasks, plan steps, or deployments, and it has one date: the check-up date. It gates no status (§ Blockers). In the web app, "Blocked" means a blocker only. A section that waits for an upstream section reads "Waiting".
- Projects, deliverables, sections, and deployments have a **hidden context**: Markdown that search and the route decision read, and that the page does not show.

## Old Words

Old notes, old tasks, and old commands use the words of the model before the revamp. Each old word has one new meaning:

| Old word | What it is now |
|----------|----------------|
| Subsection | A **section** (D1). The backend keeps the old word in its names: the table `deliverable_subsections`, the field `subsectionId`, the module `subsections`, the error codes `subsection_*`, and the link kind `subsection`. The CLI keeps `ops subsection` and `--subsection` as hidden aliases. In every other text, the word is "section". |
| The closer, the "Delivered" task (`isCloser`, `closer_locked`, `closer_requires_task`) | Removed (D3). A new deliverable gets no closer and no task. A person marks a deliverable done (`deliverables.setDone`). The migration makes each old closer a plain section. A closer of a deliverable that the migration did not reach still refuses a move, a reorder, and the loss of its last task. |
| A backlog folder (Main, Queue, custom; table `backlog_folders`, field `folderId`) | A section of the project, or of the org (D4). Main became the backlog section (`role: "backlog"`). Queue became a section with `role: "queue"`. Each custom folder became a plain project section. `folderId` and `backlog_folders` stay as legacy data. No new code reads them. |
| The deployment chain (`previousDeploymentId`, `endedAt`, "new version", `endChain`, `reopenChain`, `listChainsByProject`) | Removed from new code (D6). A deployment has a free `version` label. An old chain keeps its rows, and a list shows only the newest row of a chain. |
| A subtask as a Strike target ((Task) 1287 v0.1) | A full Ops task with `parentTaskId` (D5). Strike keeps its own tree, and a subtask is in no Strike unit. |

## Common Rules

| Rule | Detail |
|------|--------|
| Every op takes `orgSlug` | Exceptions: `workspace.*` (all the caller's organisations), `users.me`, `notifications.*` (the caller is the recipient), `updates.*` except `people` (the task names the organisation), `waybill.undo`/`redo`/`peek`/`history`/`page`/`facets`/`rowHistory` (a scope names it), `dayPlans.*` (the plan of the caller), `taskLaunches.accept` (the launch names the org). |
| Read access | `requireOrgAccess`: the org is the caller's personal workspace, or the caller's JWT lists the org. Else `org_unauthorized`. No identity gives `unauthenticated`. |
| Write access | `requireOrgWriteAccess`: read access, and the org is not frozen. A frozen org refuses every write with `org_frozen`. Reads still work. |
| Record in another org | The backend treats it as not found. |
| IDs | Convex document IDs. Opaque strings. Each ID belongs to one table. |
| Addresses | Each project, deliverable, section, task, deployment, notepad, task group, and blocker has a v1 address. See § Addresses. |
| Timestamps | `createdAt`, `updatedAt`, `completedAt`, `endedAt`, `removedAt` are epoch milliseconds. |
| Clear a field | Where an arg accepts `null`, `null` clears the field. An absent arg leaves the field unchanged. |
| Attribution | Owners and assignees are `users` row IDs (`Id<"users">`). Actors in Waybill, comments, and notifications are strings `user:<clerkUserId>`. |

## Addresses

Each record of these kinds has a v1 address (D13): `@v1/<org>/<kind>/<key>#ops`.

| Kind | Address | Key |
|------|---------|-----|
| Project | `@v1/<org>/project/<alias>#ops` | An alias that the create claims from the name. The id form `@v1/<org>/project/<id>#ops` also resolves. |
| Deliverable | `@v1/<org>/project/<project key>/deliverable/<name>#ops` | A name local to its project, from the title (`0.1.0` gives `0-1-0`; a suffix when the project has the name). The id form `@v1/<org>/deliverable/<id>#ops` stays flat. |
| Section | `@v1/<org>/section/<id>#ops` | The ID |
| Deployment | `@v1/<org>/deployment/<id>#ops` | The ID |
| Task | `@v1/<org>/task/<id>#ops` | The ID. An alias exists only when a person names the task. An old address with the type word `task.dev` (`@v1/<org>/task.dev/<id>#ops`, in old Flint task notes) still finds the task. |
| Task group | `@v1/<org>/taskgroup/<id>#ops` | The ID |
| Notepad | `@v1/<org>/notepad/<id>#ops` | The ID |
| Blocker | `@v1/<org>/blocker/<id>#ops` | The ID. The id form only, with no row in the address tables (R32 of ADDRESS.md). |

- `<org>` is the org slug. In the personal workspace it is the owner text of the person (the handle, else `u-…`), never the Clerk subject.
- The rules are in `convex/lib/opsAddresses.ts` (`OPS_ADDRESS_TYPES`: project, deliverable, task, notepad, taskgroup; `OPS_ID_ONLY_TYPES`: section, deployment, blocker). `headers.forOrg` gives the address of each section and each deployment. The blocker reads give the `address` of each blocker.
- An id form names a record of its own type only: `@v1/<org>/section/<id>#ops` with the ID of a blocker resolves to nothing.
- `agent.resolve({id, orgSlug?})` gives the record of an ID or an address.
- Every command of the `ops` CLI prints the address of each record that it shows. Every record argument takes an ID, an address, a web URL, a title, or a path (`Alpha › v1 › Backend`). See [[dev-knw-ops-cli]].

## Organisations and People

An organisation is identified by `orgSlug`.

| Kind | `orgSlug` | URL token |
|------|-----------|-----------|
| Personal workspace | The Clerk user ID of the person (`identity.subject`, for example `user_2abc…`) | `me` |
| Team | The team slug | the slug |

A person always has a personal workspace. Team membership comes from the JWT (`org_memberships`). Operations never creates a team.

| Op | Args | Returns |
|----|------|---------|
| `workspace.listMyOrgs` | — | The caller's organisations |
| `workspace.listMyTasks` | `includeDone?` | Every task of the personal workspace, plus the tasks the caller owns in each team. Done tasks only with `includeDone`. |
| `workspace.listMyProjects`, `listMySubsections`, `listMyDeliverables` | — | Cross-organisation lists |
| `workspace.listMyDeadlines` | — | Every deadline of every organisation of the caller, enriched, with `orgName` and `isPersonalOrg`. This is the personal deadlines view. Each row still belongs to its own organisation. |
| `orgs.listOrgs`, `orgs.getOrg` | — / `orgSlug` | Organisation rows |
| `users.me` | — | The caller's `users` row |
| `users.listAll` | `orgSlug` | The members: `{_id, name?, displayName?, handle?, email, pictureUrl?}`. `_id` is the user row ID for owners and assignees. |
| `people.*` | various | Profile lookups: `me`, `get`, `getMany`, `getByEmail`, `getByHandle`, `list`, `search` |
| `updates.people` | `orgSlug` | Members as `{id: "user:<clerkUserId>", userId, name, handle?, imageUrl?}` — use it to map an actor ID to a user row ID |

An owner or an assignee must be a member of the organisation: `assignee_not_found` (no such user row) or `assignee_not_member`.

## Projects

Table `projects`. Module `projects`.

| Field | Type | Notes |
|-------|------|-------|
| `orgSlug` | string | |
| `name` | string | |
| `description` | string | `""` when not given |
| `kind` | `"project"` \| `"operation"` | Absent reads as `"project"` |
| `status` | `"active"` \| `"paused"` \| `"archived"` | `create` sets `"active"` |
| `startDate`, `endDate` | ISO date string, optional | The UI requires them for an operation |
| `nextUpdate` | ISO date string, optional | Only for `kind: "project"`. `create` drops it for an operation. |
| `context` | Markdown, optional | The hidden context. See § Hidden Context. |
| `originDeploymentId` | `Id<"deployments">`, optional | The deployment the project ships to. It must be in the org and owned (`deployment_not_found`, `deployment_not_owned`). |
| `createdBy` | `Id<"users">` | |

| Op | Args |
|----|------|
| `projects.list` / `get` | `orgSlug` / `orgSlug, projectId` |
| `projects.create` | `orgSlug, name, description?, kind?, startDate?, endDate?, nextUpdate?, originDeploymentId?` → `projectId` |
| `projects.update` | `orgSlug, projectId, name?, description?, kind?, status?, startDate?\|null, endDate?\|null, nextUpdate?\|null, originDeploymentId?\|null` |
| `projects.setContext` | `orgSlug, projectId, context` (an empty text clears it) |
| `projects.remove` | `orgSlug, projectId` |

A project has its own sections (§ Sections), its deliverables, and its deployments. Its backlog is its section with the role `backlog`. The backend makes it on first need.

**`projects.remove` cascades.** It deletes every section and task of the project, every deliverable (with its sections and tasks), and the legacy backlog folders. It releases connected deployments (`projectId` cleared) but keeps them. Read the project before you delete it.

## Sections

Table `deliverable_subsections` (the table keeps its old name, D1). Module `sections`. The module `subsections` stays for one release: its functions act only on the sections of a deliverable. A section is a list of tasks and the unit of completion.

| Field | Type | Notes |
|-------|------|-------|
| `orgSlug` | string, optional | Legacy rows may lack it. `headers.forOrg` does not read a row with no `orgSlug`. |
| `title` | string | 1 to 200 characters (`section_title_required`, `section_title_too_long`) |
| `deliverableId` | `Id<"deliverables">`, optional | The home deliverable |
| `projectId` | `Id<"projects">`, optional | The project of the home. Alone (no deliverable, no deployment): the home is the project. Index `by_project [projectId, order]`. |
| `ownerDeploymentId` | `Id<"deployments">`, optional | The home deployment. Index `by_owner_deployment [ownerDeploymentId, order]`. |
| `role` | `"backlog"` \| `"queue"` \| `"inbox"`, optional | A system section. Index `by_orgSlug_role`. |
| `order` | number | The position in its home |
| `dependsOn` | `Id<"deliverable_subsections">[]` | Upstream sections. Any section of the org. |
| `context` | Markdown, optional | The hidden context, at most 20 000 characters (`context_too_long`) |
| `priorityColor` | `"sun"` \| `"water"` \| `"fire"` \| `"earth"` \| `"air"` \| `"violet"`, optional | A map highlight. Six slots for each org. |
| `completedAt` | number, optional | Server-maintained. Set when every root task is done. Cleared when a root task is not done. |
| `archived` | boolean, optional | Hidden from the views. Still counts as done. |
| `isCloser` | boolean, optional | Legacy: the closer of a deliverable that the migration did not reach. See § Old Words. |
| `deploymentId` | `Id<"deployments">`, optional | Legacy: the deployment that a section shipped to. A deliverable ships to a deployment now (`deliverables.deploymentId`). |
| `dueDate` | projected on read | The earliest linked deadline. The stored field is dead. |

**The home** (D2, `convex/lib/sectionHome.ts`). A section has one home:

| Home | Fields | CLI form |
|------|--------|----------|
| A deliverable | `deliverableId`, and `projectId` copied from it | `--deliverable <ref>`, `deliverable:<ref>` |
| A project (no deliverable yet) | `projectId` only | `--project <ref>`, `project:<ref>` |
| A deployment (its inbox, or another section) | `ownerDeploymentId`, and the `projectId` of the deployment when it has one | `--deployment <ref>`, `deployment:<ref>` |
| The org | none of the three | `--org-wide`, `org` |

**Roles.**

| Role | Where | Rules |
|------|-------|-------|
| `backlog` | One in each project (`projectId`, no deliverable), and one in the org (no project): the master backlog | Made on first need: `sections.ensureBacklog`, and each write that needs it. Sorts its tasks by priority band, then `order`. |
| `queue` | A project or the org | The former Queue folder. Sorts its tasks as the backlog does. |
| `inbox` | One in each deployment | Made when the deployment becomes live. Its default title is "Inbox". See § Deployments. |

A system section (a section with a role) cannot move (`section_role_locked`). A system section with tasks cannot be deleted (`section_role_locked`). Only a deployment has an inbox, and only a project or the org has a backlog or a queue (`section_role_invalid`).

**Derived status** (`lib/dagStatus.ts`), in this order:

| Status | Condition |
|--------|-----------|
| `done` | The section has root tasks and every root task is `done` |
| `blocked` | A `dependsOn` section is not `done`. The web app calls this status **Waiting** ("Waiting on an upstream section"), because "Blocked" means a blocker only (§ Blockers). The code stays `blocked`. |
| `in-progress` | A task is `doing` |
| `ready` | Otherwise. A section with no tasks is never done. |

**Dependency rules.**

- Inside one home, a dependency must point up: `upstream.order < dependent.order`. Else `dependency_order_invalid`.
- A section cannot depend on itself. A dependency must be in the same org. A cycle across the whole org is refused.
- **Gating:** a task in a section cannot become `done` while an upstream section (direct or transitive) is not done. The error is `subsection_blocked`, and its message names the blockers.

| Op | Args | Notes |
|----|------|-------|
| `sections.listForProject` | `orgSlug, projectId` | `{project: Section[], deliverables: [{deliverable, sections}], deployments: [{deployment, sections}]}`. A `Section` has `id, title, home {kind, id?}, projectId?, role?, order, done, rootTaskCount, rootDoneCount, address`. |
| `sections.listForOrg` | `orgSlug` | Every section of the org, with its home |
| `sections.get` | `orgSlug, sectionId` | `{section, deliverable, project, deployment}`; a place that the section does not have is `null` |
| `sections.tasks` | `orgSlug, sectionId` | The root tasks in order, each with `subtaskCount` and `subtaskDone` |
| `sections.create` | `orgSlug, title, home, afterSectionId?, context?` | `home` is `{kind: "project"\|"deliverable"\|"deployment", id}` or `{kind: "org"}`. Default place: the end of the home. Returns the section ID. |
| `sections.update` | `orgSlug, sectionId, title?, context?` | Label `section.context` for a context change |
| `sections.moveHome` | `orgSlug, sectionId, home` | See below. Returns `{order, movedTaskCount}`. |
| `sections.reorder` | `orgSlug, home, sectionIds` | Send every section of the home once (`section_order_incomplete`, `section_order_invalid`). Refuses an order that breaks a dependency (`dependency_order_invalid`). |
| `sections.archive` | `orgSlug, sectionIds, archived` | Only a done section can be archived (`subsection_not_done`) |
| `sections.remove` | `orgSlug, sectionId` | Deletes its tasks. Removes it from every `dependsOn`. |
| `sections.ensureBacklog` | `orgSlug, projectId?` | The ID of the backlog section of the project (or of the org with no project). Makes it when absent. |
| `subsections.update` | `orgSlug, subsectionId, title?, dueDate?, order?` | `dueDate` writes to the linked deadline (`""` detaches it). **`order` moves the section and silently removes dependencies that no longer point up.** |
| `subsections.setDependencies` | `orgSlug, subsectionId, dependsOn` | Replaces the whole list |
| `subsections.setPriority` | `orgSlug, subsectionId, isPriority` | Takes the first free colour in the order `sun, water, fire, earth, air, violet`. All six taken: error "Maximum of 6 priorities reached". |
| `subsections.convertToTask` | `orgSlug, subsectionId, destinationSubsectionId?` | See below |
| `subsections.create`, `listByDeliverable`, `listByOrg`, `reorder`, `setArchived`, `move`, `remove`, `setDeployment` | | The former functions for the sections of a deliverable. They stay for one release. A new caller uses the `sections` functions. |

**Move to another home** (`sections.moveHome`). The section keeps its title, colour, completion, deadline links, and its own `dependsOn`. Its tasks follow it, each with its subtree, with the project and the deliverable of the new home. It lands at the end of the new home, or just above the first section there that depends on it. Refusals:

| Code | Cause |
|------|-------|
| `section_role_locked` | A backlog, queue, or inbox section |
| `closer_locked` | A legacy closer |
| `subsection_archived` | An archived section (unarchive it first) |
| `section_move_same_home` | The section is already in that home |
| `section_not_found`, `project_not_found`, `deliverable_not_found`, `deployment_not_found` | No such record in this org |

**Conversion to a task** (`subsections.convertToTask`). It is lossless, so it refuses a section that still holds data:

| Refusal | Clear this first |
|---------|------------------|
| `subsection_conversion_has_tasks` | Move or delete every task |
| `subsection_conversion_has_dependencies` | Empty its `dependsOn` |
| `subsection_conversion_has_dependents` | Remove it from every `dependsOn` |
| `subsection_conversion_has_metadata` | Clear `deploymentId`, `priorityColor`, and `completedAt` |
| `subsection_conversion_held_by_strike` | Remove it from Strike |
| `subsection_conversion_destination_invalid` | Choose another section in the same deliverable |

The new task goes to `destinationSubsectionId`, or to the project backlog when absent. Plan steps, deadlines, tree nodes, and blockers that link to the section now link to the task (`repointWraps` in `lib/wrapResolve.ts`). An open blocker writes the `blocked` cache of the new task. Returns `{task, context}`.

**Conversion back** (`tasks.promoteTaskToSubsection`, args `orgSlug, taskId, deliverableId?`). The task becomes a section of a deliverable, with the task title. A non-empty body goes into a first task titled "Notes" with the task's status, owner, and rarity. Links follow the new section: the plan steps, deadlines, tree nodes, and blockers that link to the task now link to the section. A task in a section of a deliverable stays in its deliverable (`promotion_deliverable_fixed`). A backlog task needs `deliverableId` (`promotion_deliverable_required`). Returns `{subsection, preservedTaskId, context}`.

## Deliverables

Table `deliverables`. Module `deliverables`.

| Field | Type | Notes |
|-------|------|-------|
| `orgSlug`, `projectId` | string, `Id<"projects">` | |
| `title` | string | |
| `completedAt`, `completedBy` | number, `Id<"users">`, optional | Set when a person marks the deliverable done. Cleared on reopen. |
| `deploymentId` | `Id<"deployments">`, optional | The deployment that the deliverable ships to. Index `by_deployment`. |
| `fromDeploymentId` | `Id<"deployments">`, optional | The deployment inbox that the deliverable comes from |
| `context` | Markdown, optional | The hidden context, at most 20 000 characters |
| `flintId`, `flintAddress` | string, optional | The one Flint place of the deliverable. Strike binds a deliverable to a Flint with it. |
| `ownerUserId` | `Id<"users">`, optional | No public op sets it |
| `status`, `summary`, `dueDate` | deprecated | Never read or written. The status is derived. |

| Op | Args |
|----|------|
| `deliverables.listByProject` / `listByOrg` / `get` | `orgSlug, projectId` / `orgSlug` / `orgSlug, deliverableId` |
| `deliverables.create` | `orgSlug, projectId, title, dueDate?, flintId?, deploymentId?, context?` → `deliverableId` |
| `deliverables.update` | `orgSlug, deliverableId, title?, flintId?` (`""` clears `flintId`) |
| `deliverables.setDone` | `orgSlug, deliverableId, done` → `{done}` |
| `deliverables.setContext` | `orgSlug, deliverableId, context` (an empty text clears it; label `deliverable.context`) |
| `deliverables.setDeployment` | `orgSlug, deliverableId, deploymentId?\|null, fromDeploymentId?\|null` |
| `deliverables.setFlintPlace` | `orgSlug, deliverableId, address\|null, flintId?\|null` ((Task) 317; `flint_place_invalid`) |
| `deliverables.remove` | `orgSlug, deliverableId` |

**Create** (D3). `deliverables.create` makes no section and no task. A `dueDate` makes a deadline linked to the deliverable. Add the sections next: `sections.create` with `home: {kind: "deliverable", id}`. `ops deliverable create --section <title>` makes the first section in the same command.

**Done** (D3). A deliverable is done only when a person marks it done: `deliverables.setDone({done: true})` sets `completedAt` and `completedBy`. `done: false` clears both. The label is `deliverable.done` or `deliverable.reopen`, in the scope `project:<projectId>`. A legacy closer of the deliverable becomes a plain section first. The sections do not decide: a deliverable with every section done stays open until a person marks it done.

**Derived deliverable status** (`lib/dagStatus.ts`, `deliverableStatus.ts`): `completed` when `completedAt` is set; else `blocked` when every section is blocked; else `in-progress` when a section is in progress; else `open`.

**`deliverables.remove` cascades.** It deletes every section and every task of the deliverable, and removes those sections from the `dependsOn` of sections in other homes.

## Tasks

Table `tasks`. Module `tasks`. One task model. The home decides where a task lives.

| Field | Type | Notes |
|-------|------|-------|
| `orgSlug` | string | |
| `subsectionId` | `Id<"deliverable_subsections">`, optional | The section of the task (its home). The field keeps its old name. |
| `projectId`, `deliverableId` | optional | Copied from the home of the section |
| `parentTaskId` | `Id<"tasks">`, optional | The parent of a subtask. Index `by_parent [parentTaskId, order]`. See § Subtasks. |
| `unplaced` | boolean, optional | `true`: no home (no section, no project, no deliverable, no folder) |
| `folderId` | `Id<"backlog_folders">`, optional | Legacy. No new code reads it. |
| `title` | string | |
| `body` | string | Markdown notes. `""` by default. |
| `checkbox` | `"todo"` \| `"doing"` \| `"done"` | The status |
| `priority` | `"urgent"` \| `"high"` \| `"medium"` \| `"low"`, optional | Absent means no priority |
| `tag` | `"feedback"` \| `"hotfix"` \| `"ongoing"` \| `"recurring"`, optional | The kind of a task of a deployment inbox |
| `recurrence` | `{every: "day"\|"week"\|"month", nextAt?}`, optional | A recurring task. See below. |
| `ownerUserId` | `Id<"users">`, optional | `create` sets the creator when absent |
| `rarity` | 1–7, optional | 1 Common, 2 Uncommon, 3 Rare, 4 Epic, 5 Legendary, 6 Mythic, 7 Prismatic. Absent reads as Common. |
| `order` | number | Rank inside one order bucket (below) |
| `createdBy`, `lastModifiedBy` | `Id<"users">`, optional | |
| `completedAt` | number, optional | Set on the change to `done`, cleared on the change away from `done` |
| `blocked`, `result`, `note` | optional | The task primitive. See § The Task Primitive. |
| `loopedIn` | `Id<"users">[]`, optional | The people looped into the task, in the order they came in. See § Looped In. |

**The home.**

| Home | `subsectionId` | `projectId` | `deliverableId` | `unplaced` |
|------|----------------|-------------|-----------------|------------|
| A section of a deliverable | set | set | set | — |
| A section of a project (also its backlog) | set | set | — | — |
| A section of a deployment (also its inbox) | set | the project of the deployment, when it has one | — | — |
| A section of the org (also the master backlog) | set | — | — | — |
| No home | — | — | — | `true` |
| A legacy master backlog row (before the migration) | — | — | — | — |

A subtask has the home fields of its root task. Each list of a section, a backlog, the tasks page, "my tasks", and the Strike units shows only root tasks, each with the count `done/total` of its subtree.

Placement errors: `task_folder_in_subsection`, `task_subsection_required`, `task_deliverable_required`, `task_project_required`, `task_unplaced_with_home`, `project_not_found`, `deliverable_not_found`, `deliverable_project_mismatch`, `subsection_not_found`, `backlog_folder_not_found`.

**Status cycle.** `todo → doing → done`. Any change is allowed, with one gate: a change to `done` in a section with an open upstream section gives `subsection_blocked`. The section `completedAt` updates after every status change and every move.

**Priority bands.** Every list sorts by the ladder `urgent → high → medium → (no priority) → low`, then by `order`. A move from a backlog into a section of a deliverable clears the priority. A backlog here is any section with no deliverable: the backlog section, a queue, another section of a project, an inbox, or a section of the org. Every other move keeps the priority, unless the caller passes one. The input value `"queue"` is legacy and reads as no priority.

**Order buckets.** `order` is ranked inside one bucket: one section and one priority band. A new task and a moved task go to the end of their bucket. The children of one parent have their own `order` (§ Subtasks).

**Rarity in the title.** `tasks.create` reads a title that ends with a space and one digit `0`–`7`. It removes the digit from the title. A digit 1–7 sets `rarity`; `0` sets none. `tasks.update` does not do this. An out-of-range `rarity` on `update` is ignored.

**Create** (`tasks.create`). The place is one of:

| Args | Place |
|------|-------|
| `sectionId` (alias `subsectionId`) | That section |
| `projectId` and no section | The backlog section of the project (made when absent) |
| `parentTaskId` | Under that task, as a subtask, in the home of its root |
| `unplaced: true` | No home |
| None of these | The backlog section of the org (the master backlog) |

`ops task create --deliverable <ref>` puts the task in the first open section of the deliverable, and `--deployment <ref>` in the inbox of a live deployment. The CLI finds the section from the headers.

**Move** (`tasks.move`, `tasks.moveMany`). The target `to` is one of:

| `to` | Destination |
|------|-------------|
| `{sectionId}` | That section |
| `{projectId}` | The backlog section of the project |
| `{deliverableId}` | The first open section of the deliverable. The backend makes one when there is none. |
| `{deploymentId}` | The inbox section of the deployment |
| `{parentTaskId}` | Under that task, as its last child (§ Subtasks) |
| `{unplaced: true}` | No home |

- A move takes the subtree of each task.
- A listed task under another listed task moves with that task. A task that is in the target already stays.
- `tasks.moveMany({orgSlug, taskIds, to})` moves at most 200 tasks to one target (`move_too_large`).
- Each call is one Waybill gesture (label `task.move` or `task.moveMany`), so one undo puts every task back.
- `tasks.move` returns `{taskId, moved, movedIds}`. `moved` names where each task was (`from`). `movedIds` names every task that moved, the subtrees too.
- A move into a section of a deliverable can clear the priority (see Priority bands).

**Delete** (`tasks.remove`). A hard delete. A task with subtasks is refused (`task_has_subtasks`) unless the caller passes `withSubtasks: true`.

**Recurrence** (`convex/deploymentSchedule.ts`). A done task with `recurrence` makes its next copy in the same place, with the same title, body, tag, priority, and owner. The recurrence moves from the done task to the copy in the same transaction. So a reopen and a second done of the old task make no second copy.

**Tag.** The tag says what kind of inbox task it is: `feedback`, `hotfix`, `ongoing` (a check-up), or `recurring`. A create sets it (`tasks.create`, `ops task create --tag`; `deployments.addTask`), and `tasks.update({…, tag})` changes it (`ops task update --tag`; `null`, `--tag none`, clears it). `tasks.update({…, recurrence})` sets or clears the recurrence the same way (`ops task update --every`). The `tag` and `recurrence` args of `tasks.update` came with commit `8b26ab7cd` of the revamp; an older deployment refuses them with `agent_invalid_input`.

| Op | Args | Notes |
|----|------|-------|
| `tasks.listByOrg` / `listByProject` / `listBacklog` / `listByDeliverable` / `listUnowned` | `orgSlug` + `projectId` / `deliverableId` | `listBacklog`: project backlog. `listUnowned`: master backlog. Root tasks only. |
| `agent.getTask` | `orgSlug, taskId` | `{task, breadcrumb}` or `null` |
| `agent.searchTasks` | `orgSlug, query, limit?` | `{results, truncated}`; `limit` default 25, maximum 100. See [[dev-knw-ops-cli]] for the result fields. |
| `agent.taskContext` | `taskId, orgSlug?, commentLimit?` | The full context of one task in one call: the row with `body`, the breadcrumb, the project description, the owner and creator names, the web path, and the comments with no Waybill event. |
| `agent.resolve` | `id, orgSlug?` | `{kind, id, orgSlug, title, record, breadcrumb}` or `null`. Kinds: `project`, `deliverable`, `subsection`, `task`, `backlog-folder`, `plan`, `plan-node`, `deadline`, `day-label`, `deployment`. |
| `tasks.create` | `orgSlug, title, sectionId?, subsectionId?, projectId?, deliverableId?, parentTaskId?, unplaced?, body?, priority?\|null, tag?, recurrence?, ownerUserId?, folderId?, position?, type?, fields?, stage?, note?, noteLabel?` | `position`: `"end"` (default) or `"after-progress"` (just below the last `doing` or `done` task) |
| `tasks.update` | `orgSlug, taskId, title?, body?, expectedTitle?, expectedBody?, priority?\|null, checkbox?, ownerUserId?\|null, rarity?\|null, blocked?\|null, result?\|null` | `expectedTitle`/`expectedBody` guard a text edit: a mismatch gives `task_text_conflict` |
| `tasks.move` | `orgSlug, taskId, to` | See Move |
| `tasks.moveMany` | `orgSlug, taskIds, to` | See Move |
| `tasks.home` | `orgSlug, taskId, home` | The home form of (Task) 1287: `{kind: "subsection", subsectionId}`, `{kind: "backlog", projectId?, folderId?}`, or `{kind: "none"}`. `tasks.move` covers every place. |
| `tasks.place` | `orgSlug, taskId, projectId?, deliverableId?, subsectionId?, folderId?, priority?\|null` | Legacy: the placement of before the revamp, with a folder. A project task cannot change project (`task_project_mismatch`). |
| `tasks.reorder` | `orgSlug, taskIds, containerTaskIds?, group?` | Without `containerTaskIds`: send one complete bucket. With it: send every task of the container. Errors: `task_order_invalid`, `task_order_duplicate`, `task_order_incomplete`. |
| `tasks.remove` | `orgSlug, taskId, withSubtasks?` | Hard delete. See Delete. |
| `tasks.promoteTaskToSubsection` | see Sections | |

A new owner gets a `task.assigned` notification. When another person moves a task to another container, its owner gets `task.moved`.

**Comments** live on tasks only. See Comments below.

## Subtasks

Module `subtasks` (D5). A subtask is a full task with a parent task (`parentTaskId`). It has its own status, owner, body, comments, and address.

- A subtask has the home of its root task. Access, search, and addresses work as for its root.
- A move of a task moves its subtree. A subtask is in no Strike unit (Strike keeps its own tree).
- A task can have at most 6 levels of subtasks below its root (`MAX_SUBTASK_DEPTH = 6` in `lib/taskTree.ts`: the most parents above a task). A deeper tree is refused (`subtask_too_deep`).
- A parent in the subtree of the task is refused (`subtask_cycle`).
- `order` orders the children of one parent.
- A list of a section shows only root tasks, each with `subtaskCount` and `subtaskDone`.
- A delete of a task with subtasks needs `withSubtasks: true` (`task_has_subtasks`).

| Op | Args | Notes |
|----|------|-------|
| `subtasks.create` | `orgSlug, parentTaskId, title, body?, afterTaskId?` | After the sibling `afterTaskId`, else the last child. Returns its ID. `subtask_title_empty`, `subtask_title_too_long`. |
| `subtasks.tree` | `orgSlug, taskId` | `{task: node, total, done, cut?}`. Each node has `taskId, title, checkbox, depth, address, children`. At most 200 nodes (`SUBTASK_TREE_MAX`); `cut` says that the tree is longer. |
| `subtasks.counts` | `orgSlug, taskIds` | `{total, done}` for each of at most 100 tasks |
| `subtasks.reparent` | `orgSlug, taskId, parentTaskId\|null, index?` | Under another parent, or `null`: a root task again, in the home of its old root |
| `subtasks.reorder` | `orgSlug, taskId, index` | The place among its siblings (0 is first) |
| `subtasks.indent` | `orgSlug, taskId` | A child of the sibling above it (`subtask_no_previous`) |
| `subtasks.outdent` | `orgSlug, taskId` | One level up, after its parent (`subtask_not_a_subtask`) |

`tasks.move` with `{parentTaskId}` also makes a task a subtask, with its subtree.

## The Task Primitive

(Task) 1287 of the NUU Flint made one task entity for NUU Cognition. A task is any coherent unit of work, and it lives in Ops. Its parts:

| Part | Fields and tables | Rules |
|------|-------------------|-------|
| Status | `checkbox` | Every task has one: `todo`, `doing`, or `done`. `blocked` (`{reason, next?, at}`) is a read cache of the oldest open blocker that links the task (§ Blockers). |
| Result | `result`: string | What the done task produced: a sentence or a link. A close can set it. A reopen keeps it. |
| Unplaced | `unplaced: true` | A task with no home. A normal state. |
| Task group | tables `task_groups`, `task_group_members` | A set of tasks that are done together, usually in one session. A task can be in many groups. A group is open while one of its tasks is open. |
| Lineage | table `task_links`: `split-from`, `merged-into`, `continues-from`, `after` | A link never deletes history. |
| Related | table `task_relations`: `project`, `deliverable`, `repo`, `flint`, `address` | A tag link, 0 or more. Not a home. |
| Attachment | table `task_attachments`: `session`, `fleet`, `note`, `repo` | A link from a task or a task group to a session, a fleet, a note, or a repository |
| Stable key | table `task_keys`; `restoreKey` | The key never changes, also not at an undo or a redo. The rows of the tables above name the key, so an old ID still finds the task. |

A task has no type and no stage. The task types (`task.dev`, its stages, and its fields `repo` and `wipCommits`) were removed on 2026-11-03 (operator page feedback). The state of a task is its status and its result: a session writes its commits and its session id in the result. A one-off migration cleared the old fields and deleted the tables `task_types` and `task_stage_events` on dev and on prod; its backup rows are in `applied_migrations` (`task-types-remove/backup/<n>`).

A task has no outcome. The field `outcome` (`completed`, `dropped`, or `superseded`) was removed on 2026-11-04 (operator page feedback): a done task is done. No code reads or writes it. `tasks.close` still takes `outcome` and ignores it, so an older CLI still closes a task. A one-off migration (`taskOutcomeRemoval:removeTaskOutcome`) clears the old field on each deployment. It writes each old value to a backup row of `applied_migrations` (`task-outcome-remove/backup/<n>`) first. A later schema change drops the field.

**Rules.**

1. A close sets the status `done` at any time, with an optional result.
2. A reopen sets `doing`. It clears `completedAt` and keeps the result.
3. A write is by an agent when its agent mark has a session (the CLI sends `ORBH_SESSION_ID`). The mark is provenance, not security.

**Lineage.**

- **Split** (`taskLinks.split`): each part is a new task with the home and the relations of the old task. An open old task closes, unless `keepOpen`. A done old task stays as it is.
- **Merge** (`taskLinks.merge`): each other task gets `merged-into → survivor`, and an open one closes.
- **Continue** (`taskLinks.continue`): a new task with the home of the old task gets `continues-from → old`. An open old task closes. A done old task stays done.
- **Chain** (`taskLinks.chain`): each task after the first gets `after → the task before it`. A cycle is refused (`task_link_cycle`). A task in a chain is ready when the task before it is done.

| Op | Args |
|----|------|
| `tasks.close` / `reopen` | `orgSlug, taskId, result?` / `orgSlug, taskId`. `close` still takes `outcome` and ignores it: do not send it. |
| `tasks.listAll`, `listAllPage`, `listUnplaced`, `detail` | `orgSlug` and filters (`includeDone?, unplaced?, withSubtasks?`) / `orgSlug, taskId` |
| `taskLinks.split`, `merge`, `continue`, `chain`, `unchain` | See Lineage |
| `taskGroups.create`, `update`, `addTask`, `removeTask`, `remove`, `get`, `list` | `orgSlug, groupId?, title?, taskIds?` |
| `taskRelations.add`, `remove`, `listForRef`, `hints` | `orgSlug, taskId, kind, ref` |
| `taskAttachments.attach`, `detach`, `setState` | `orgSlug, taskId?\|groupId?, kind, ref` |

A task summary (`listAll`, `listUnplaced`, the members of a group) has `homeLabel` (`Project › Deliverable › Section`, or `null` for an unplaced task) and `address`. The full contract is in the Mesh note `(Task) 1287 Task Primitive v0.1 - One Ops Task Entity, the Tasks Shard, and Session Pins`, section Contract v0.1. The verbs of the CLI are `ops task close|result|home|relate|unrelate|hints|split|merge|continue|chain|unchain|attach|detach|group` ([[dev-knw-ops-cli]]).

## The Task Map

Module `taskMap`. `taskMap.get({orgSlug, taskId})` gives everything around one task in one read:

```ts
{ task: {taskId, title, checkbox, address, parentTaskId?, depth?},
  root: {taskId, title, checkbox, address},           // the root of its subtask tree
  subtree: TreeNode, subtreeCut?,                     // the tree from the root, at most 200 tasks
  home: { org?, project?, deliverable?, deployment?, section?, unplaced? },  // each place: {id, title, address?, role?}
  groups: [{ id, title, open, address?, members, count, done, membersCut? }],
  lineage: { splitFrom?, splitInto[], mergedInto?, absorbed[], continuesFrom?, continuedBy[], after?, before[] },
  linksCut?,
  related: [{ kind, ref, label? }] }
```

- `home` is the path of the home: org › project › deliverable › section, or the inbox section of a deployment. `unplaced: true` means no home.
- The lineage, the groups, and the relations come from `taskDetail` (`lib/taskPrimitive.ts`).
- The bounds: at most 200 tasks in the subtree (`subtreeCut`), at most 50 members for each group (`membersCut`), and a byte budget for the links (`linksCut`). The walk to the root stops at 6 levels.
- The web page of the map is `/<org>/tasks/<taskId>/map`. The CLI is `ops task map <task>`.

## Backlogs

A backlog is a section with the role `backlog` (D4). Each project has one backlog section. The org has one backlog section: the **master backlog**. The backend makes each one on first need (`sections.ensureBacklog`, `ensureBacklogSection`).

- A task in a backlog has `subsectionId` of the backlog section.
- A backlog sorts its tasks by priority band, then `order`.
- A task with only `projectId` at create goes to the backlog section of the project. A task with no place goes to the master backlog.
- A move to `{projectId}` goes to the backlog section of the project.
- The queue of a backlog is a section with the role `queue`. The other former folders are plain sections of the project.
- The table `backlog_folders` (module `backlogFolders`: `list`, `ensure`, `create`, `rename`, `reorder`, `remove`) and the field `folderId` are legacy data (§ Old Words). No new code reads them.

`ops backlog show [--project <p>]` shows a backlog by priority band.

## Deployments

Table `deployments`. Module `deployments` (D6). A deployment is something that runs: a product, a site, a service, a business. It is abstract: it has no version chain.

| Field | Type | Notes |
|-------|------|-------|
| `orgSlug`, `name` | string | `deployment_name_required` |
| `version` | string, optional | A free label, for example `1.4` or `Spring launch` |
| `status` | `"live"` \| `"paused"` \| `"retired"`, optional | `live` is active. Absent reads as `live`, or `retired` when `endedAt` is set. |
| `notes` | string | |
| `context` | Markdown, optional | The hidden context |
| `projectId` | `Id<"projects">`, optional | The project of the deployment |
| `startedAt` | number, optional | |
| `checkSchedule` | `{every: "day"\|"week"\|"month", nextAt, lastAt?}`, optional | The check-up schedule. See below. |
| `originProjectId` | optional | The project that created it |
| `url`, `identifier`, `owned` | optional | Deprecated: an abstract deployment has no URL and no identifier. `owned: false` is an external deployment. |
| `previousDeploymentId`, `endedAt` | optional | Legacy chain fields (§ Old Words). New code never writes them. |

**The inbox.** A live deployment has one inbox: a section with `ownerDeploymentId` and `role: "inbox"`. The backend makes it when the deployment becomes live (`deployments.create` with the default status, or `deployments.setStatus` to `live`). A paused or a retired deployment keeps its inbox and gets no check-up tasks. The tasks that come up while the deployment runs go to the inbox, each with a tag (§ Tasks). A deployment can also have other sections (`sections.create` with `home: {kind: "deployment", id}`).

**The loop.** A deliverable can come from a deployment inbox (`deliverables.fromDeploymentId`) and ship to a deployment (`deliverables.deploymentId`). `deployments.startDeliverable({orgSlug, deploymentId, title, taskIds, projectId?})` makes a new deliverable in the project of the deployment, with `fromDeploymentId` and `deploymentId` set to the deployment and one section, with the title "From the inbox" (rename it with `sections.update`, `ops section update --title`). It moves the picked inbox tasks into that section with their subtasks, in the given order. Refusals: `deliverable_title_required`, `deliverable_tasks_required` (no task), `deployment_task_not_in_inbox`, and `deployment_project_required` (the deployment has no project and the call gives no `projectId`).

**Check-ups** (`convex/deploymentSchedule.ts`). The hourly cron `deployment-checkups` runs `runDue`. Each active deployment whose `checkSchedule.nextAt` is due gets one task "Check <name>" (tag `ongoing`) in its inbox, and `nextAt` moves past now in the same transaction. One slot never makes two tasks. An open check-up task in the inbox gets no twin. The first check-up is one period after `setSchedule`.

| Op | Args | Notes |
|----|------|-------|
| `deployments.list` | `orgSlug, projectId?` | Status, project, and the open inbox count |
| `deployments.get` | `orgSlug, deploymentId` | |
| `deployments.inbox` | `orgSlug, deploymentId` | The inbox section and its tasks: the open ones in order, then the done ones |
| `deployments.create` | `orgSlug, name, projectId?, version?, notes?, context?, status?` | Default status `live`, so it gets its inbox at once |
| `deployments.update` | `orgSlug, deploymentId, name?, version?, notes?, context?, status?, projectId?\|null` | |
| `deployments.setStatus` | `orgSlug, deploymentId, status` | `live` makes the inbox when it is absent. Label `deployment.setStatus`. |
| `deployments.setSchedule` | `orgSlug, deploymentId, every\|null` | `null` turns it off. Returns the next time, or `null`. |
| `deployments.checkNow` | `orgSlug, deploymentId` | The check-up task now, unless an open one is in the inbox |
| `deployments.addTask` | `orgSlug, deploymentId, title, body?, tag?, every?` | A task in the inbox. With `every` and no tag, the tag is `recurring`. |
| `deployments.startDeliverable` | `orgSlug, deploymentId, title, taskIds, projectId?` | See The loop |
| `deployments.remove` | `orgSlug, deploymentId` | The inbox stays as a plain section with its tasks |
| `deployments.listByProject`, `listChainsByProject`, `listChainsByOrg`, `endChain`, `reopenChain` | | Deprecated. They stay only so old callers do not break. |

## Hidden Context

Projects, deliverables, sections, and deployments have the field `context` (D7): Markdown about what the record is for. The page does not show it. The edit sheet of the web has the field "Context". Search (`opsSearch.search`) and the route decision (`route.suggest`) read it. `headers.forOrg` gives no context text, only the flag `hasContext`. A context has at most 20 000 characters (`context_too_long`). An empty text clears it.

| Record | Op | CLI |
|--------|----|-----|
| Project | `projects.setContext` | `ops project context set\|show` |
| Deliverable | `deliverables.setContext` | `ops deliverable context set\|show` |
| Section | `sections.update` with `context` | `ops section context set\|show` |
| Deployment | `deployments.update` with `context` | `ops deployment context set\|show` |

Write a context that helps the route decision: what the record is about, the words that people use for it, and what does not belong there.

## The Headers

Module `headers` (D10). `headers.forOrg({orgSlug})` gives the small, live map of one org:

```ts
{ orgSlug, owner,                                     // owner: the org text of each address
  projects:     [{ id, title, kind, status, order, address, hasContext }],
  deliverables: [{ id, projectId, title, done, order, deploymentId?, fromDeploymentId?, address, hasContext }],
  sections:     [{ id, title, home: {kind, id?}, projectId?, role?, order, done, archived, address, hasContext }],
  deployments:  [{ id, title, projectId?, status, version?, owned, order, address, hasContext }] }
```

- It gives no task and no context text.
- The web keeps it live in a cache (`useOpsHeaders()`). Each picker of the web (go to, move, quick create, the parent of a section) reads that cache.
- The CLI reads it once for each command and org. It uses it to print addresses and paths, and to resolve a place by its title or its path.
- `ops headers [--project <p>] [--archived]` prints it. The connector tool `get_headers` gives it to NUU Command and NUU Chat.

## The Route Decision

Module `route` (D11, D12). The route decision turns a text into the ranked places of an org where a new task belongs. The Ops quick create, NUU Command (the connector tool `route_text`), NUU Chat, `ops route`, and `ops task create --route` use the same decision.

| Op | Kind | Args |
|----|------|------|
| `route.suggest` | action | `orgSlug, text, want?: "task"\|"idea"\|"any", smart?, limit?` |
| `route.candidates` | query | `orgSlug, text, limit?`: the text match only, no model |

The answer:

```ts
{ intent?: { action: "task"|"idea"|"search"|"go", confidence },
  candidates: [{ place: { kind: "section"|"deliverable"|"project"|"deployment", id, title, path }, score, reason }],
  model: "jev"|"text", latencyMs }
```

1. **The text match.** Each open list of the org is a document: a section, the backlog of a project, the inbox of a deployment, a deliverable with no section. A document has its title, the titles above it, its hidden context, and the titles of its recent open tasks. A word of the text scores where it matches (title > context > task titles > parent titles). A rare word scores more. A title that the text names gets a bonus. The answer has at most 8 places.
2. **Jev.** With `smart` (the default) and a key, one call to the model `typesafe/jev-1.13` through the OpenRouter Decisions API (`lib/jev.ts`, the server env value `OPENROUTER_API_KEY`). It picks the place, the project, and the intent. A failure or a time-out (1.5 s) keeps the text match, with `model: "text"`. It is never an error for the person.

- A place of the kind `deliverable` means its first open section. A place of the kind `project` means its backlog section. A place of the kind `deployment` means its inbox.
- "Smart suggestions" is a setting of the person (on by default). Off means no Jev call: the text match only. `ops route --no-smart` does the same.
- No candidate: the CLI puts the task in the master backlog.

## Search

`opsSearch.search({orgSlug, query, types?, includeDone?, limit?})` gives tasks and places (sections, deliverables, projects, deployments) in one list: `{items: [{kind, id, title, path?, address?, status?, score?, projectId?}], truncated?}`. It reads the hidden context. The CLI is `ops search "<text>"`. `agent.searchTasks` (`ops task search`) searches the tasks by title only.

## Deadlines

Table `deadlines`. Module `deadlines`. A deadline owns its date. A record has no due date of its own: its due date is the earliest deadline linked to it.

| Field | Type | Notes |
|-------|------|-------|
| `orgSlug`, `title`, `description?` | | |
| `dueDate` | string | `YYYY-MM-DD` or `YYYY-MM-DD HH:mm`, local wall-clock. Else `deadline_due_invalid`. |
| `requires` | `Id<"deadlines">[]` | The deadlines this one lands after. A DAG. Empty: a root. |
| `scopes` | string[], optional | Flat tags, stored without `#`. Trimmed, deduplicated. Equal scopes merge across organisations on the personal view. |
| `links` | `{kind, id}[]`, optional | The records this deadline is for. `kind`: `project`, `deliverable`, `subsection`, `task`, `tree-node`, `plan-node`. |
| `titleLink` | `{kind, id}`, optional | The link that owns the name. It must also be in `links` (`deadline_title_link_unlinked`). |
| `assigneeUserIds` | `Id<"users">[]` | People on the hook. Members only. |
| `status` | `"todo"` \| `"doing"` \| `"done"`, optional | Manual status |
| `angleNudge` | number, optional | Canvas presentation only |
| `done`, `linkKind`, `linkId` | deprecated | |

**Enriched read.** `deadlines.list` returns each row with: `links` resolved (`title`, `path`, `status`, `broken`, `route`), `derivedStatus`, `mixed`, `displayTitle`, `displayPath`, `titleLinked`, and `settled`. Overdue is not derived on the server.

**Status rules.**

| Live links | Effective status | Manual `status` write |
|------------|------------------|-----------------------|
| 0 (bare) | The manual status | Allowed |
| 1 | The linked record's status | Refused: `deadline_status_wrapped` |
| 2 or more (mixed) | The manual status | Allowed |

A broken link (record gone) does not count as live. `setLinks` clears the manual status when the deadline gets its first live link.

**Title link.** While `titleLink` is live, `displayTitle` is the record's title and follows its renames. When the link breaks or is removed, the stored `title` shows. When every link is removed, the deadline keeps the title of its first live record.

**The date rule.** A deadline can never be dated before a deadline it `requires`: `dependency_order_invalid`. The rule applies to `create`, `update`, `setDates`, `setRequires`, and `insertBetween`. The edge does not gate status: a deadline can be marked done while its chain is open.

| Op | Args | Notes |
|----|------|-------|
| `deadlines.list` / `linkIndex` | `orgSlug` | `linkIndex`: one row per link, keyed `kind:id` |
| `deadlines.create` | `orgSlug, title, dueDate, requires?, scopes?, links?, titleLink?, assigneeUserIds?` | "After X" is `requires: [X]` |
| `deadlines.insertBetween` | `orgSlug, beforeId, afterId, title?, dueDate?, scopes?, assigneeUserIds?` | New deadline after `before`, and `after` then requires it. A direct edge is replaced. The default date is the midpoint. A given date must be between the two. `deadline_between_same`. |
| `deadlines.update` | `orgSlug, deadlineId, title?, description?, dueDate?, scopes?, status?, titleLink?\|null, angleNudge?` | |
| `deadlines.setDates` | `orgSlug, moves: [{deadlineId, dueDate}]` | Moves a chain in one write |
| `deadlines.setLinks` | `orgSlug, deadlineId, links` | Replaces the set |
| `deadlines.setRequires` | `orgSlug, deadlineId, requires` | Cycle guard (`deadline_requires_cycle`) and date rule |
| `deadlines.setAssignees` | `orgSlug, deadlineId, assigneeUserIds` | New assignees get `deadline.assigned` |
| `deadlines.remove` | `orgSlug, deadlineId` | Hard delete. Its successors take over its `requires`. |

Other ways to create a deadline: `deliverables.create` or `subsections.create` with `dueDate`, and `subsections.update` with `dueDate`. A daily job at 07:20 UTC sends `deadline.due` to assignees of open deadlines due today or tomorrow.

## Blockers

Table `blockers`. Module `blockers` (the helpers: `lib/blockers.ts`). Since (Task) 376 of the NUU Operations Flint. A blocker is an org record that says why work waits. It attaches to any number of records through `links`, as a deadline does. It owns one date: the check-up date.

| Field | Type | Notes |
|-------|------|-------|
| `orgSlug`, `title` | string | `title`: what blocks the work. Required (`blocker_title_required`). |
| `waitingOn` | string, optional | Who or what the work waits on: a person, a team, a vendor, a decision |
| `next` | string, optional | What to do at the next check-up |
| `checkAt` | string | The next check-up, `YYYY-MM-DD`. Else `blocker_check_invalid`. Default at create and reopen: tomorrow. |
| `ownerUserId` | `Id<"users">`, optional | The person who checks it. The check-up notice goes to this person. |
| `status` | `"open"` \| `"resolved"` \| `"dropped"` | |
| `links` | `{kind, id}[]` | The records it blocks. `kind`: `project`, `deliverable`, `subsection` (a section), `task`, `plan-node` (a step), `deployment`. The CLI kinds are `project`, `deliverable`, `section`, `task`, `step`, `deployment`. A deadline cannot link a deployment; a blocker can. |
| `delayCount` | number | The number of delays. A blocker that moves again and again is stuck. |
| `log` | `{kind, at, actor?, note?, from?, to?}[]` | The newest 100 events, oldest first. `kind`: `create`, `delay`, `resolve`, `drop`, `reopen`. `from` and `to` are the check-up dates of a delay. |
| `closedAt`, `closedBy`, `createdBy`, `createdAt`, `updatedAt` | | |

Each text (title, waiting on, next step, note) has at most 500 characters (`blocker_text_too_long`).

**Rules.**

1. An open blocker gates **no** status. A task with an open blocker can still go to done. The section dependency (`subsection_blocked`) stays the only hard gate.
2. `tasks.blocked` (`{reason, next?, at}`) is a read cache: the oldest open blocker that links the task, while the task is not done. Only `lib/blockers.ts` writes it. A done task has none.
3. The old `blocked` argument of `tasks.update` still works on blockers: a value makes a blocker that links the task (or edits the open blocker that links only this task); `null` resolves each open blocker that links only this task, and detaches the task from each other open blocker.
4. `delay`, `resolve`, and `drop` act only on an open blocker (`blocker_closed`). `reopen` acts on a resolved or dropped blocker and sets a new check-up date.
5. `remove` deletes the blocker and its log. The CLI says it cannot be undone. Prefer `resolve` or `drop`: they keep the log.
6. A daily job (`notifyDue`) sends a check-up notice to the owner of each open blocker whose check-up date has come.
7. A conversion (a task to a section, a section to a task) moves each blocker link of the consumed record to its successor, in open and closed blockers (`repointWraps`). When the successor is a task, an open blocker writes its `blocked` cache.
8. A link reads the status of its record through the wrap resolver. A deployment reads as `doing` when it is live, `todo` when it is paused, and `done` when it is retired. A deleted record gives a broken link (`broken: true`). `detach` removes a broken link.
9. A blocker has the id address `@v1/<org>/blocker/<id>#ops` (§ Addresses). Each read (`list`, `get`, `forRecord`) gives it as `address`. `agent.resolve` reads it.
10. **Each blocker write is a Waybill gesture** (checked in `convex/blockers.ts`: each public mutation comes from the `waybill` wrapper and calls `ctx.journal.label`). The scope is the org: `org:<orgSlug>`. The actions are `blocker.create`, `blocker.edit`, `blocker.attach` or `blocker.links`, `blocker.detach`, `blocker.delay`, `blocker.resolve`, `blocker.drop`, `blocker.reopen`, and `blocker.delete`; each targets `{type: "blocker", id}`. So the activity feed of the org shows them, and `ops history --scope org:<org>` then `ops undo --scope org:<org> --expect <seq>` replays one. The CLI maps no blocker to a scope for `--on`: use `--scope org:<org>`. The scope `org:<org>` also holds the other org gestures (deadlines, day labels, deployments): read the head entry before an undo. A delete is still final in the CLI (`blocker delete` says it cannot be undone): prefer `resolve` or `drop`.

| Op | Args | Notes |
|----|------|-------|
| `blockers.list` | `orgSlug, closedLimit?` | The open blockers, then the newest closed ones (at most 50) |
| `blockers.get` | `orgSlug, blockerId` | The fields, the resolved links, the log, and the `address` |
| `blockers.forRecord` | `orgSlug, kind, id` | The blockers that link one record. `kind`: a link kind, also `deployment` |
| `blockers.create` | `orgSlug, title, checkAt?, waitingOn?, next?, ownerUserId?, links?` | |
| `blockers.update` | `orgSlug, blockerId, title?, waitingOn?\|null, next?\|null, ownerUserId?\|null` | `null` clears |
| `blockers.setLinks` / `attach` / `detach` | `orgSlug, blockerId, links` / `orgSlug, blockerId, link` | `blocker_link_not_found` for a record that is not there; `detach` also takes a broken link |
| `blockers.delay` | `orgSlug, blockerId, checkAt, note?` | A later date adds 1 to `delayCount`; an earlier date moves the check-up and is not a delay; the same date with a note only logs the note |
| `blockers.resolve` / `drop` | `orgSlug, blockerId, note?` | |
| `blockers.reopen` | `orgSlug, blockerId, checkAt?` | |
| `blockers.remove` | `orgSlug, blockerId` | Hard delete |

The CLI is `ops blocker list|show|create|update|attach|detach|delay|resolve|drop|reopen|delete` ([[dev-knw-ops-cli]]).

**The web app.** The panel `/<org>/blockers` has the groups "Due for check", "Upcoming", and "Closed". The task page and the task dialog show the field "Blockers" in the field grid, under "Deadlines" (an open task only; a done task shows its result). The blocker form attaches projects, deliverables, sections, tasks, plan steps, and deployments (not a retired deployment).

**The release.** The deployment link, the blocker address, and the re-point of a conversion are follow-ups of Task 376 (2026-10-23). They work after the next Ops release of Convex. A deployment of before that release refuses a deployment link (`agent_invalid_input`) and gives no `address`.

## Review Queue

Table `queue_items`. Module `reviews` (the helpers: `lib/reviews.ts`). Since Task 402 of the NUU Operations Flint. A queue item is one thing that waits for one person. Version 0.1 has one queue, `review`: a request that a person reviews a task. The table is generic: a later queue or a later kind of target needs no new table.

| Field | Type | Notes |
|-------|------|-------|
| `orgSlug` | string | |
| `queue` | `"review"` | |
| `target` | `{kind: "task", taskId, taskKey}` | The task, by its id at the write and its stable key (§ The Task Primitive). A read finds the task by the key, so an undo of a delete keeps the item. |
| `targetKey` | string | `task:<restoreKey>`: the indexed form of the target |
| `assigneeUserId` | `Id<"users">` | The reviewer. A member of the org (`assignee_not_member`). |
| `requestedBy` | `Id<"users">`, optional | The requester. The agent of a person writes as that person. |
| `requestedVia` | `{client?, session?, fleet?, actor?}`, optional | The agent mark of the request |
| `note` | string, optional | What to check. At most 2000 characters (`review_note_too_long`). |
| `state` | `"open"` \| `"resolved"` \| `"cancelled"` | |
| `verdict` | `"approved"` \| `"changes"` \| `"dismissed"`, optional | The verdict of a resolved item |
| `cancelReason` | `"withdrawn"` \| `"task_closed"` \| `"task_deleted"`, optional | |
| `resolvedBy`, `resolvedNote`, `resolvedAt` | optional | The verdict note goes to the requester. |

The task has a read cache, `review: {assigneeUserId, at}`: the oldest open request. Only `lib/reviews.ts` writes it. The rows of the web app show "In review" from it.

**Rules.**

1. With no reviewer, the reviewer is the owner of the task. A task with no owner takes the caller in a personal org, and refuses with `review_no_reviewer` in a team org. A done task refuses (`review_task_done`).
2. One open request for each task and reviewer. A second request changes its note and its requester (`again: true`).
3. Only the reviewer resolves (`review_not_reviewer`). `approved` closes the task, unless `keepOpen`. `changes` keeps the task open, and opens a done task again. `dismissed` changes only the request.
4. Only the requester cancels (`review_not_requester`). A closed request refuses a verdict and a cancel (`review_not_open`).
5. A close of the task cancels its open requests (`task_closed`); a delete cancels them too (`task_deleted`). The write is in the same Waybill event, so an undo brings them back.
6. Each write labels the scope of its task (`review.request`, `review.approve`, `review.changes`, `review.dismiss`, `review.cancel`), so the task timeline shows it and the undo of the task takes it back.
7. The notifications are in the category `reviews`: `review.requested` to the reviewer, and `review.resolved` to the requester. A request of the agent of a person to that person notifies that person, from the agent.
8. An org copy does not carry the table (it names the task ids and the users of one deployment). The org wipe deletes it.
9. A request loops the reviewer into the task (§ Looped In), unless the reviewer is the owner. The reviewer then hears every comment on the task.

| Op | Args |
|----|------|
| `reviews.request` | `orgSlug, taskId, reviewerUserId?, note?` -> `{itemId, reviewerUserId, again}` |
| `reviews.resolve` | `orgSlug, itemId, verdict, note?, keepOpen?` -> `{itemId, verdict, closed, reopened}` |
| `reviews.cancel` | `orgSlug, itemId` -> `{itemId}` |
| `reviews.mine` | `state?: "open"\|"all", orgSlug?` -> `{open, closed, sent, truncated}`: every org of the caller, oldest first; each entry has its task summary and `href`. `sent` is the open requests that the caller asked of other people, oldest first (index `by_requester_state`); a request to oneself is in `open`. The web app shows `sent` in **Your Reviews** as "You asked for". |
| `reviews.forTask` | `orgSlug, taskId` -> `{open, closed}` |
| `reviews.openCount` | `{}` -> number (0 with no sign-in) |

## Looped In

Field `tasks.loopedIn`. Module `taskLoops` (the helpers: `lib/taskLoops.ts`). Since amendment 1 of Task 402 of the NUU Operations Flint. The people looped into a task follow it beside its owner. Each one hears every comment on the task.

| Field | Type | Notes |
|-------|------|-------|
| `loopedIn` | `Id<"users">[]`, optional | The users IDs, in the order they came in. Absent when no person is looped in. Only `lib/taskLoops.ts` writes it. `agent.getTask` gives it as `task.loopedIn`. |

**Who loops a person in.**

- A person, with the field "Looped in" of the task dialog or with `ops task loop add` (`taskLoops.add`). The person gets the notification `task.loopedIn` (category `tasks`), unless the person did it.
- A review request: it loops in the reviewer, unless the reviewer is the owner (§ Review Queue).
- A mention in a comment: it loops in each mentioned member of the org of the task. The author and the owner are not looped in. A person outside the org is not looped in. The mention of an edit loops no one in. The mention notice is the only notice.

**Rules.**

1. A task loops in at most 50 people (`loop_full`).
2. `add` takes a member of the org (`assignee_not_found`, `assignee_not_member`). A person in the loop already changes nothing (`added: false`).
3. Any member who may write takes a person out (`remove`), the person too. A person who is not in the loop changes nothing (`removed: false`).
4. The people looped in are participants of the comments (`participantsOf` in `convex/updates.ts`): each one gets `update.comment` for each comment on the task.
5. Each write labels the scope of its task (`task.loopIn`, `task.loopOut`), so the task timeline shows it and the undo of the task takes it back.

| Op | Args |
|----|------|
| `taskLoops.add` | `orgSlug, taskId, userId` -> `{added}` |
| `taskLoops.remove` | `orgSlug, taskId, userId` -> `{removed}` |

The CLI is `ops task loop add|remove <task> <person>`, and `ops task show` names the people looped in ([[dev-knw-ops-cli]]).

## Plans and Steps

Tables `plans` and `plan_nodes`. Module `plans`. A plan is a shared, org-level, left-to-right DAG of steps. It is edited until it is completed.

**Plan fields.**

| Field | Type | Notes |
|-------|------|-------|
| `orgSlug`, `title`, `description?` | | `plan_title_required` |
| `status` | `"active"` \| `"completed"` | |
| `startPosition`, `endPosition` | `{x, y}`, optional | Stored positions of the Start and End sentinels. Absent: derived. |
| `createdBy` | `Id<"users">`, optional | |
| `startPin`, `endPin` | deprecated | |

**Step fields.**

| Field | Type | Notes |
|-------|------|-------|
| `planId`, `orgSlug` | | |
| `title`, `description?` | | `node_title_required` |
| `requires` | `Id<"plan_nodes">[]` | The steps this step comes after. Empty: a root lane from Start. A fork is two steps that require one step. A join is one step that requires two. |
| `order` | number | Rank among siblings. Orders edges only. |
| `done` | boolean, optional | Manual completion. Only for a step with no links. |
| `optional` | boolean, optional | The step does not gate the steps after it |
| `collapsed` | boolean, optional | Folded: hidden, and the plan continues through it |
| `assigneeUserId` | `Id<"users">`, optional | Manual assignee |
| `links` | `{kind, id}[]`, optional | `kind`: `deliverable`, `subsection`, `task`, `tree-node`, `plan` |
| `position` | `{x, y}`, optional | The card centre on the canvas. See [[dev-knw-ops-canvas]]. |
| `removedAt` | number, optional | Soft delete tombstone. Every read skips it. |

**Links.**

| Links | The step is | Derived status |
|-------|-------------|----------------|
| None | A plain note | `done` flag: `done`, else `todo` |
| One | That record. Title, status, and owner read through. | The record's status |
| Two or more | A composite | `done` when every live link is done; `doing` when any is done or doing; else `todo` |
| `plan` kind | A subplan | `done` when the subplan is completed or all its steps are done; `doing` when any step has progress |

A subplan link that makes plans contain each other in a loop gives `node_subplan_cycle`. When a step loses its single link, it keeps that record's title.

**Effective assignee.** The owner of the single linked record, when it has one. Else the manual `assigneeUserId`.

**Frontier.** Every step is `done`, `current` (workable now), or `future` (gated). A step is `current` when it is not done and every step it effectively requires is done. An optional predecessor does not count. A folded predecessor is replaced by its own predecessors. A required ID that no longer exists counts as done.

**Rules on writes.**

- `requires` must name live steps of the same plan (`node_requires_invalid`) and must not make a cycle (`node_requires_cycle`).
- `done` on a linked step gives `node_done_linked`. `done: true` on a `future` step gives `node_gated`.
- A root step cannot fold (`node_fold_root`).
- `optional` is accepted on any step.

| Op | Args | Notes |
|----|------|-------|
| `plans.list` | `orgSlug` | With `nodeCount`, `doneCount`, `currentCount` |
| `plans.listLite` / `listNodesLite` | `orgSlug` | Names only |
| `plans.get` | `orgSlug, planId` | `{plan, nodes}`. Each node has `derivedStatus`, `linkTitle`, `linkPath`, `linkBroken`, `resolvedLinks`, `effectiveAssigneeUserId`, `assigneeFromLink`, and `deadlines`. |
| `plans.historyState` | `orgSlug, planId` | The caller's undo and redo stacks for the plan, with `seq` per entry |
| `plans.create` | `orgSlug, title, description?` | Logged but not undoable |
| `plans.update` | `orgSlug, planId, title?, description?, status?` | |
| `plans.remove` | `orgSlug, planId` | Hard delete of the plan and every step. Not undoable in practice. |
| `plans.createNode` | `orgSlug, planId, title, description?, requires?, position?` | "After X" is `requires: [X]` |
| `plans.insertBefore` | `orgSlug, nodeId, title?, position?` | The new step takes the anchor's whole `requires`. The anchor then requires only the new step. |
| `plans.insertBetween` | `orgSlug, beforeId, afterId, title?, position?` | New step after `before`; `after` then requires it. A direct edge is replaced, else added. The two are swapped when `after` reaches `before`. `node_between_same`. |
| `plans.updateNode` | `orgSlug, nodeId, title?, description?, done?, collapsed?, optional?` | |
| `plans.expandAll` | `orgSlug, planId` | Unfolds every step |
| `plans.setAssignee` | `orgSlug, nodeId, assigneeUserId?` | Absent clears. Sends `plan.step.assigned`. |
| `plans.setRequires` | `orgSlug, nodeId, requires` | Replaces the set |
| `plans.setLinks` | `orgSlug, nodeId, links` | Replaces the set (`node_link_not_found`) |
| `plans.setPosition` | `orgSlug, nodeId, position` | One step |
| `plans.setPositions` | `orgSlug, positions: [{nodeId, position}]` | Many steps in one write. The first entry is the dragged step. |
| `plans.setSentinelPosition` | `orgSlug, planId, which: "start"\|"end", position` | |
| `plans.removeNode` | `orgSlug, nodeId` | Soft delete. Every step that required it now requires what it required. Undo restores it. |

A step title of "New step" is the default when `insertBefore` or `insertBetween` gets no title. A deadline attaches to a step through the deadline's own `links` (`kind: "plan-node"`).

## Comments

Module `updates` (a Webcore component). Only tasks carry comments. A comment target is `{type: "task", id: <taskId>, tenant?: <orgSlug>}`.

| Op | Args |
|----|------|
| `updates.timeline` | `target, before?, beforeTime?, until?, untilTime?, limit?, withEvents?` — the server adds the Waybill event groups unless `withEvents` is exactly `false` |
| `updates.count` | `target` |
| `updates.add` | `target, body, mentions?` |
| `updates.edit` | `target, id, body, mentions?` — the author's own comment |
| `updates.remove` | `target, id` — the author's own comment, or any comment with write access |
| `updates.react` / `unreact` | `target, id, emoji` |
| `updates.people` | `orgSlug` |

A mention is `{id: "user:<clerkUserId>", name, handle?}`. Comments are not in Waybill, so undo does not reach them. The owner, the creator, and the people looped into the task (§ Looped In) get `update.comment`; a mentioned person gets `update.mention`. A mention of a member of the org loops that member into the task. Errors: `updates_target`, `updates_tenant`, `task_not_found`.

## Notifications

Module `notifications` (a Webcore component). Every op acts on the caller's own bell. An agent reads and marks the operator's notifications.

| Op | Args |
|----|------|
| `notifications.list` | `tenant?, unreadOnly?, paginationOpts: {numItems, cursor}` |
| `notifications.unreadCount` | `tenant?` |
| `notifications.markRead` / `markUnread` | `ids` |
| `notifications.markAllRead` | `tenant?` |
| `notifications.markKeyRead` | `key` |
| `notifications.dismiss` | `id` |
| `notifications.preferences` / `setPreference` | — / `category, channel?, enabled` |

`tenant` is an `orgSlug`. Categories: `tasks`, `deadlines`, `plans`, `updates`. Channels: `inapp`, `push`. Types: `task.assigned`, `task.moved`, `task.loopedIn`, `deadline.assigned`, `deadline.due`, `plan.step.assigned`, `update.comment`, `update.mention`. Collapse keys: `task:<id>`, `deadline:<id>`, `deadline-due:<id>`, `plan-node:<id>`. Nobody gets a notification for their own action.

## Activity Log (Waybill)

Module `waybill`. Every write on a journaled table is one event. An event has `scope`, `seq`, `actor`, `action` (for example `task.status`), `targets`, `changes` (field-level before and after), and `context`. The **scope** is the undo boundary.

A write through the agent gateway has the agent mark in `context.via`: `{kind: "agent", client?, session?}` (Task 331). The actor is still the operator (`user:<clerkUserId>`). A web write has no `context.via`. The gateway adds the mark only to a mutation whose function declares it (the Waybill `mutation` builder); an allowlisted mutation that is neither marked nor in the unmarked set (`notifications.*`, the `updates.*` ops other than `updates.add`, `waybill.undo`, `waybill.redo`) fails with `agent_mark_unsupported` (HTTP 500) before its handler runs ((Task) 353). A comment is not a Waybill event: `updates.add` through the gateway stores the mark in the comment's own optional `via` field, `{kind: "agent", client?, session?}`, and a web comment has none ((Task) 357).

| Table | Scope |
|-------|-------|
| `projects` | `project:<projectId>` |
| `deliverables` | `project:<projectId>` |
| `deliverable_subsections` (sections) | `deliverable:<deliverableId>` for a section of a deliverable; else `project:<projectId>`; else `org:<orgSlug>` |
| `tasks` | `subsection:<sectionId>` for a task in any section (also a backlog section and an inbox); else `backlog:<projectId>`; else `backlog:org:<orgSlug>` (an unplaced task, a legacy master backlog row) |
| `backlog_folders` (legacy) | `backlog:<projectId>`, else `backlog:org:<orgSlug>` |
| `plans`, `plan_nodes` | `plan:<planId>` |
| `deadlines`, `deployments`, `day_labels` | `org:<orgSlug>` |

A labelled gesture can name a wider scope than its rows. Examples: `deliverable.create`, `deliverable.done`, and `deliverable.reopen` use `project:<projectId>`; `task.move` and `task.moveMany` use the scope of the first moved task; `deployment.setStatus` uses `org:<orgSlug>`; `task.promote` uses `deliverable:<id>`. Read the event to learn its scope. The org-wide feed uses `tenant: <orgSlug>` in place of a scope.

| Op | Args |
|----|------|
| `waybill.page` | `scope` or `tenant`, `filter?`, `paginationOpts` |
| `waybill.facets` | `scope` or `tenant`, `limit?` |
| `waybill.rowHistory` | `scope` or `tenant`, `table, id, limit?, cursor?` |
| `waybill.history` | `scope, beforeSeq?, limit?` |
| `waybill.peek` | `scope` → `{canUndo, undoLabel, canRedo, redoLabel, undo[], redo[]}`; each entry has `seq` and `label` |
| `waybill.actorNames` | `orgSlug` → `{"user:<clerkUserId>": name}` |
| `waybill.deliverableProjects` | `orgSlug` → `{deliverableId: projectId}` |
| `waybill.undo` / `redo` | `scope, expectSeq?` |

Not in Waybill: comments, notifications, notification preferences, notepads, day plans, favourites. The task side of `notepads.toTask` and `notepads.moveTextToTask` is journaled (labels `task.create` and `task.edit`), so only that side carries the agent mark of a gateway write.

## Undo and Redo

Undo and redo are **per actor and per scope**. `waybill.undo({scope})` takes the newest live gesture of the caller in that scope and reverses it. `waybill.redo` takes the oldest undone one. A new gesture by the same actor in the scope normally clears that actor's redo stack.

**Why an agent must pass `expectSeq`.** The agent uses the operator's credential, so the agent and the operator are one actor. The head of the stack can be an action that the operator did in the web app a minute ago. An undo without a check can reverse the operator's work. So:

1. Read the stack: `waybill.peek({scope})` (`ops history --on <record>` or `ops history --scope <scope>`), or `plans.historyState({orgSlug, planId})` for a plan (`ops plan history <plan>`).
2. Confirm that `undo[0]` is the gesture you expect: its `label`, and its changes.
3. Call `waybill.undo({scope, expectSeq: undo[0].seq})`: `ops undo --on <record> --expect <seq>`, or `ops plan undo <plan> --expect <seq>` for a plan. The CLI reads the stack again and refuses unless the head is still `<seq>`. Without `--expect` (and without `--dry-run`) it refuses with `expect_required` and changes nothing.

When the head is not `expectSeq`, the backend writes nothing and the gateway returns `waybill_stale` (HTTP 409) with `error.data` = `{type, scope, expected, actual}`. When a field changed after the gesture, the backend writes nothing and the gateway returns `waybill_conflict` (HTTP 409) with `error.data` = `{type, scope, eventId, table, id, field, expected, actual, by?}`. The CLI reports these as `undo_state_changed` and `undo_conflict`. An empty stack returns `null`. A success returns `{direction, eventIds, action}`.

A move of many tasks is one gesture: one undo puts every task back. A move with `ops task move --priority` is two gestures (the move, then `tasks.update` for each task). A command that writes in two steps (for example `ops task create --top`) leaves two entries.

Limits: `plans.create` is not on the stack. `plans.remove` and `projects.remove` are hard deletes; an undo cannot bring back the same IDs. A step delete (`plans.removeNode`) is a soft delete and undo restores it. An undo of a task delete gives the task a new ID; its stable key (`task_keys`) keeps its links, groups, relations, and attachments.

## Day Labels

Table `day_labels`. Module `dayLabels`. Banners across calendar days. Presentation only.

| Field | Notes |
|-------|-------|
| `label` | Trimmed, not empty |
| `startDate`, `endDate` | `YYYY-MM-DD`, inclusive, `endDate >= startDate` |
| `color` | `water`, `fire`, `earth`, `air`, `sun`, `moon`, `muted` |

Ops: `dayLabels.listByOrg(orgSlug)`, `create(orgSlug, label, startDate, endDate, color)`, `update(orgSlug, dayLabelId, label?, startDate?, endDate?, color?)`, `remove(orgSlug, dayLabelId)`.

## Notepads

Table `notepads`. Module `notepads` ((Task) 314; Notepad v2, (Task) 363). A notepad is an ordered list of text blocks in one org. A task mention is an inline chip in the text of a block.

| Field | Notes |
|-------|-------|
| `orgSlug` | The org of the notepad |
| `title` | 1 to 200 characters after trim, on one line (`notepad_title_invalid`) |
| `scope` | `general` or `personal` |
| `ownerClerkUserId` | The Clerk user ID of the creator |
| `subsectionId` | Optional. The section scope: one section of the org, of any home. Index `by_orgSlug_subsection`. See Section scope below. |
| `blocks` | The ordered blocks. A v2 write stores text blocks only: `{id, kind: "text", text}`. A row of v1 can still hold task blocks `{id, kind: "task", taskId}`. See Blocks below. |
| `rev` | Starts at 0. Goes up by one on each content write, on each rename, and on each change of the section scope. |
| `lastEditedBy` | The Clerk user ID of the last writer |
| `createdAt`, `updatedAt` | Epoch milliseconds |
| `deletedAt` | Set by `notepads.remove` (a soft delete) |

**Access.**

- A read needs `requireOrgAccess`. A write needs `requireOrgWriteAccess`.
- A `general` notepad is for every member of the org. A `personal` notepad is for its owner only.
- These all give `notepad_not_found`:
  - a notepad of another org;
  - a personal notepad of another member;
  - a deleted notepad;
  - a malformed ID.
- So the error does not tell that a personal notepad exists.
- `notepads.list` omits deleted rows and the personal notepads of other members.
- `notepads.create` uses `scope` `personal` when the arg is absent. In the personal workspace it stores `personal` always.
- The section scope does not change access. A personal notepad stays visible only to its owner, also in a list filtered by a section.

**Blocks.**

- Every read shows text blocks only. Each v1 task block reads as a text block with the same ID and the text `[[task:<taskId>]]`: its chip on a block of its own. A read never writes.
- A write takes that view as its base and checks `expectedText` or `expectedRev` against it. Then it stores the view in the v2 form, with one `rev` increase. So no block ID of a v1 row changes.
- Every write applies these invariants:
  - Each text is stored in its canonical form: `\n` line endings, no blank line at either end, and no title in a token.
  - A blank text block is removed.
  - Adjacent text blocks stay separate. They do not join.
  - A repeated or empty block ID gets a new ID.
- A client block ID has 1 to 64 characters (`notepad_block_invalid`).
- The internal mutation `notepads.migrateInlineChips` stores v1 rows in the v2 form and keeps `rev`. It is not a gateway op.

**Task tokens.**

- A task mention is the token `[[task:<taskId>]]` in the text of a text block. The web app shows it as an inline chip. A chip can be anywhere in the text, also inside a sentence.
- A token is a chip only when its ID has the shape of a task ID: 24 to 40 lowercase letters and digits (`TASK_ID_SHAPE`). The web app and the server use this one rule.
- Any other `[[task:…]]` text, for example `[[task:nope|see below]]`, is literal text. A write stores it byte for byte, with its `|title`, and does not check it. The Markdown form prints it as it is stored, and it has no key in `tasks`.
- A backslash directly before the token makes it literal text: `\[[task:<id>]]` is not a chip. The backslash stays in the stored text and in the Markdown.
- The stored chip has no title. The Markdown form adds the live title (see below).
- A write accepts `[[task:<taskId>]]` and `[[task:<taskId>|<any title>]]` for a chip. It ignores the title and stores the chip with no title. The `expectedText` check also ignores the titles of chips.
- A write checks each chip ID that it adds to the notepad (an ID that the notepad did not name before):
  - The ID must be an ID of the `tasks` table, else `notepad_task_invalid`.
  - A task that exists must be in the org of the notepad, else `notepad_task_invalid`. A deleted task stays allowed. Its chip shows that the task is not available.
  - After the write, the notepad names at most 200 distinct task IDs, else `notepad_too_large`.
  - A write that adds no task ID never fails on these checks, so an old row stays writable.
- A chip whose ID is not an ID of the `tasks` table (only possible in text from before the check) has no key in `tasks` and prints with no title. It does not count toward the bound.

**The Markdown form** (`notepads.get` → `markdown`; the input of `create`, `append`, and `write`):

- The texts of the blocks join with one blank line.
- Each chip is `[[task:<taskId>|<title>]]`, with the live title of the task. It is `[[task:<taskId>]]` when the task is deleted or in another org. The title after `|` is for the reader only. A literal token stays as it is stored.
- Markdown in `create`, `append`, and `write` becomes one text block with the canonical text. A task line does not become a task block any more.
- So `write` replaces all blocks with one text block, and that block keeps the ID of the old first block.

**Section scope.**

- `create` (arg `subsectionId`) and `setSubsection` set the scope. `setSubsection` with `subsectionId: null` removes it.
- A write accepts a section of any home (a deliverable, a project, a deployment, or the org) only when the section is in the org of the notepad (for a section of a deliverable, its deliverable too). Else `subsection_not_found`.
- A read joins the place at read time. `subsection` and its new name `section` (one value, in `notepads.get` → `notepad`, and in each row of `notepads.list`) is `{_id, title, archived, home, role?, deliverableId?, deliverableTitle?, projectId?, projectName?, deploymentId?, deploymentName?, path}`, or `null`.
- `null` means no scope, or a section that is deleted or in another org. A delete of the section does not clear `subsectionId`: the notepad then reads as a notepad with no scope.
- The join is live: when a section moves to another home, the place of the notepad moves with it.
- The filters of `notepads.list` (`subsectionId`, `deliverableId`, `projectId`) keep the notepads whose live place matches. With more than one filter, all must match.
- `toTask` does not use the scope: with no destination, the task goes to the master backlog. The CLI (`ops notepad to-task` with no destination flag) sends the scope as the destination.

**Limits.**

- At most 500 blocks, 200 000 text characters over all text blocks, and 200 distinct task IDs in the tokens (`notepad_too_large`).
- A write fails only when it makes the notepad pass a bound and grows the notepad on that measure. So a v1 row that the conversion puts over a bound stays writable while a write does not make it larger. The bound of 200 task IDs applies only to a write that adds a task ID.
- `undoGesture` (the undo of `toTask` and of a move) restores the view that its gesture replaced, also when that view is over a bound: up to 224 500 characters (200 000 plus room for 500 chips) and with no bound of 200 task IDs. `get` still joins only the first 200 chips.
- `setBlocks` keeps the normal bounds (500 blocks, 200 000 characters, 200 distinct task chips). A write may keep a notepad that is already over a bound, but it may not make it larger. One exception is the undo of `removeBlock`: a `setBlocks` whose blocks are the current blocks plus exactly one block, with every other block the same ID and text in the same order. It may pass a bound only when the stored notepad is already over that same bound: the text may grow up to 224 500 characters, and the chips by one new distinct chip. A notepad under the bounds never passes them through `setBlocks`. The `expectedRev` check and the org check of each added chip always apply.
- A notepad title, and a task title made in a notepad, have 1 to 200 characters on one line.

**Concurrency.**

- The unit is one block. A block write carries the text that it replaces (`expectedText`). A different stored text gives `notepad_text_conflict`. The check compares canonical forms, so the title of a token does not count.
- A whole-document write (`write`, `setBlocks`) carries `expectedRev`. A different `rev` gives `notepad_rev_conflict`.
- `append` never conflicts with an edit of an earlier block.

| Op | Args | Returns |
|----|------|---------|
| `notepads.list` | `orgSlug, subsectionId?, deliverableId?, projectId?` | `[{_id, title, scope, isMine, subsection, blockCount, taskCount, preview, rev, createdAt, updatedAt}]`, newest edit first. `taskCount` is the number of distinct chips. `preview` is the start of the text: at most 140 characters, on one line, with no chips. |
| `notepads.get` | `orgSlug, notepadId` | `{notepad: {_id, orgSlug, title, scope, isMine, subsection, rev, createdAt, updatedAt}, blocks, tasks, markdown}`. `blocks` are text blocks only. `tasks` maps the ID of each chip (the first 200 distinct) to `{_id, title, checkbox, priority?, ownerUserId?, projectId?, deliverableId?, subsectionId?, folderId?}`, or `null` for a deleted task or a task of another org. |
| `notepads.create` | `orgSlug, title, scope?, markdown?, subsectionId?` | The notepad ID |
| `notepads.rename` | `orgSlug, notepadId, title` | `{rev}` |
| `notepads.setSubsection` | `orgSlug, notepadId, subsectionId` (a section ID, or `null` to remove the scope) | `{rev}` |
| `notepads.remove` | `orgSlug, notepadId` | `null` (a soft delete) |
| `notepads.append` | `orgSlug, notepadId, markdown` | `{rev}`. Adds one text block at the end. Blank Markdown changes nothing. |
| `notepads.write` | `orgSlug, notepadId, markdown, expectedRev` | `{rev}`. Replaces all blocks with one text block, which keeps the ID of the old first block. |
| `notepads.setBlocks` | `orgSlug, notepadId, blocks, expectedRev` | `{rev}`. Old task blocks are accepted and stored as text. |
| `notepads.addBlock` | `orgSlug, notepadId, blockId, text, afterBlockId?` | `{rev}`. Absent `afterBlockId`: the first place. A blank text adds nothing. An existing `blockId` is `notepad_block_invalid`. |
| `notepads.updateBlock` | `orgSlug, notepadId, blockId, text, expectedText` | `{rev}`. An empty text removes the block. |
| `notepads.removeBlock` | `orgSlug, notepadId, blockId` | `{rev, previousBlocks}`. A removed chip keeps its task. To undo: `setBlocks` with `blocks: previousBlocks` and `expectedRev: rev`. |
| `notepads.moveBlock` | `orgSlug, notepadId, blockId, afterBlockId?` | `{rev}`. Absent `afterBlockId`: the first place. `afterBlockId` equal to `blockId` changes nothing. |
| `notepads.insertTask` | `orgSlug, notepadId, taskId, blockId?, offset?, expectedText?` | `{rev, blocks, blockId, caret}`. No `blockId`: a new text block at the end that holds only the chip. A text block: the token goes in at `offset` (default: the end of the text), after the `expectedText` check, with one space on a side where the next character is not white space. `caret` is the offset after the chip in the stored text. The task must be in the org (`task_not_found`). |
| `notepads.toTask` | `orgSlug, notepadId, blockId, start, end, expectedText, title?, subsectionId?, projectId?, folderId?, keepText?` | `{taskId, title, taskState, rev, blocks, previousBlocks, previousRev, blockId, caret}` |
| `notepads.moveTextToTask` | `orgSlug, notepadId, blockId, start, end, expectedText, taskId, copy?` | `{rev, blocks, previousBlocks, previousRev, previousText, previousBody, body}`. With `copy`, the notepad is not written, so `rev` and `blocks` do not change. |
| `notepads.undoGesture` | `orgSlug, notepadId, blocks, expectedRev, task` | `{rev}`. See Undo below. |

A selection is `[start, end)` in the text of the block. The offsets are UTF-16 string indexes, counted in the client's `expectedText`. These selections are `notepad_selection_invalid`:

- a range outside the text, or a blank selection;
- a range whose start or end is inside a chip token;
- a selection that has no text when each chip in it reads as the title of its task (for example only the chip of a deleted task).

An `insertTask` offset that is outside the text or inside a chip token is also `notepad_selection_invalid`.

**`toTask`: make a task from a selection.**

- **Destination.** `subsectionId` (a section); or `projectId` (the backlog section of the project; `folderId` is legacy); or none (the master backlog of the org). The server has no other default.
  - `subsectionId` together with `projectId` or `folderId` is `task_destination_invalid`.
  - A section of another org is `subsection_not_found`.
  - The task is made by the same helper as `tasks.create`.
- **Title.** With no `title`, the title is the selection with its white space collapsed. Each chip in the selection reads as the title of its task; a chip of a deleted task or of a task of another org reads as nothing. When the selection has more than one line, or has more than 200 characters, the title is its first line (at most 200 characters).
- **Body.** When the selection has more than one line, or when the title does not hold the full selection, the full selection is the task body.
- **The chip.** The chip of the new task replaces the selection. The white space at the two ends of the selection stays, so a selection that ends with a line break keeps the line break. One space goes on a side where the next character is not white space. The block does not split.
- **`keepText`.** The text stays, and the chip goes directly after the selection.
- `blockId` and `caret` of the result name the block and the offset after the chip.

**`moveTextToTask`: move a selection to a task description.**

- The selection goes to the end of the task body: `body + (body ? "\n\n" : "") + text`. Each chip in the selection reads as the title of its task.
- The task must be in the org of the notepad (`task_not_found`).
- The selected text leaves the block. When the block is then blank, the block is removed: a later write to its ID gives `notepad_block_not_found`. `blocks` of the result are the stored blocks.
- With `copy`, the notepad does not change.

**Waybill.**

- `notepads` is not journaled, so the text of a personal notepad never goes into the org feed. A change of the section scope is not journaled either.
- The task side stays journaled:
  - `toTask` writes the label `task.create` in the scope of the task, with `context.source` `notepad`.
  - `moveTextToTask` writes the body through the task update helper (label `task.edit`).
- A task event names no notepad.
- An org copy resets the `notepads` table.

**Undo.**

- The Undo toast of the web app and an agent both call `notepads.undoGesture` (it is in the gateway allowlist, area `notepads`).
- Args: `blocks` is `previousBlocks` of the gesture, `expectedRev` is its `rev`, and `task` is `{kind: "delete", taskId, expectedState}` (from `taskId` and `taskState` of `toTask`) or `{kind: "body", taskId, body, expectedBody}` (from `previousBody` and `body` of a move). `blocks` can hold v1 task blocks (an undo payload from before Notepad v2); the write stores them as text. The restore checks the org of each chip that it adds, and it allows the view that the gesture replaced (see Limits).
- In one transaction it restores the blocks and either deletes the task of a `toTask` (through the helper of `tasks.remove`, label `task.delete`) or sets the body of a move back (label `task.edit`).
- It changes nothing and gives `notepad_undo_conflict` when the rev or the task changed, the task is in another org, or (for a delete) the notepad no longer has a chip of the task (a token in a text block, or a v1 task block), the task is more than 60 seconds old, or the task has a comment, a Strike session, or a launch.
- **After a refusal, do not write automatically.** A refusal means that a later change touched the notepad or the task, or that the undo window has expired: the undo of a `toTask` refuses a task that is more than 60 seconds old, also when nothing changed. A write with `previousBlocks` at the current `rev`, or with `previousBody` and no `expectedBody`, can delete later work.
  1. Read both records: the notepad (`notepads.get`: its `rev`, `blocks`, and `markdown`) and the task (`ops task context <task> --json`: its `body`).
  2. Report the conflict to the operator: the gesture, the refusal, and what changed after the gesture. Change nothing.
  3. Revert by hand only when the operator asks for it. Then merge only the inverse change into the snapshot that you read, and keep every later edit. Write the notepad with `notepads.setBlocks` and `expectedRev` = the `rev` of that snapshot (never `previousBlocks` as a whole). Write a task body with `tasks.update` and an explicit `expectedBody` = the body that you read.
  4. When you cannot isolate the inverse change safely, stop and tell the operator. A stale `rev` (`notepad_rev_conflict`) or a stale body (`task_text_conflict`) means another change landed: read again and go back to step 2.

| Code | Meaning |
|------|---------|
| `notepad_not_found` | No such notepad for the caller (see Access) |
| `notepad_title_invalid` | A notepad title or a `toTask` title that is empty, longer than 200 characters, or on more than one line |
| `notepad_too_large` | A write grows the notepad past 500 blocks, 200 000 text characters, or 200 distinct task IDs |
| `notepad_rev_conflict` | `expectedRev` is not the current `rev` |
| `notepad_text_conflict` | `expectedText` is not the current text of the block |
| `notepad_block_not_found` | No block with that ID (also a missing `afterBlockId`) |
| `notepad_block_invalid` | A client block ID that is empty, longer than 64 characters, or already used |
| `notepad_selection_invalid` | A bad range, a blank selection, a range or an `offset` inside a chip token, a selection with no text when each chip reads as its title, or an `offset` outside the text |
| `notepad_task_invalid` | A write adds a chip whose ID is not an ID of the `tasks` table, or a chip of a task of another org |
| `notepad_undo_conflict` | `undoGesture` refused (web or gateway) |
| `task_destination_invalid` | `toTask` with `subsectionId` and a backlog destination |
| `task_not_found`, `subsection_not_found` | The task or the section is absent or in another org. For `create`, `setSubsection`, and `toTask`: a section that is not in the org of the notepad. |

## Day Plans

Table `day_plans`. Module `dayPlans` ((Task) 315). One row for each person and local date. The row holds the ordered task IDs of that day.

| Field | Notes |
|-------|-------|
| `clerkUserId` | The Clerk user ID of the person (the personal workspace slug) |
| `date` | `YYYY-MM-DD`, the local date of the client that writes. The server stores the string and converts nothing. |
| `taskIds` | The plan order: at most 100 task IDs, no duplicate |
| `updatedAt` | Epoch milliseconds |

Index `by_user_date` (`clerkUserId`, `date`).

**Personal by construction.**

- No `dayPlans` op takes an `orgSlug`. Each op reads and writes only the rows of the caller (`identity.subject`).
- The table has no `orgSlug`, so an org copy does not touch it.
- A plan can hold a task of any org that the caller can read: the personal workspace, or a team in the JWT memberships.

**Status.**

- The plan stores no status. `get` joins each task for its `checkbox`, and `doneCount` counts the done items.
- To check an item, change the task: `tasks.update` (`ops task done <task>`).

**Dead IDs.**

- A task that is deleted, or that is in an org that the caller can no longer read, leaves every read.
- The next write of that row (`add`, `remove`, or `reorder`) removes its ID.
- A plan that becomes empty is deleted.

**Limit.** At most 100 tasks in one plan (`day_plan_full`). An add of a task that is already in the plan changes nothing, so it passes on a full plan.

| Op | Args | Returns |
|----|------|---------|
| `dayPlans.get` | `date` | `{date, items: [{taskId, task}], doneCount}`. `task` is `{_id, orgSlug, title, checkbox, priority?, projectId?, deliverableId?, subsectionId?, folderId?, ownerUserId?, completedAt?}`. A day with no plan has no items. |
| `dayPlans.unfinishedBefore` | `date, days?` | `[{date, taskId, task}]`. See the rules below. |
| `dayPlans.add` | `date, taskIds, index?` | `{taskIds}` (the new order). See the rules below. |
| `dayPlans.remove` | `date, taskIds` | `{taskIds}`. A task that is not in the plan is ignored. |
| `dayPlans.reorder` | `date, taskIds` | `{taskIds}`. `taskIds` must hold each readable item of the plan exactly one time, else `day_plan_reorder_invalid`. |
| `dayPlans.candidates` | `{}` | Web only: no gateway row. `{tasks, truncated, truncatedOrgs}`: the open tasks of the personal workspace and the open team tasks that the caller owns, at most 200 of each status in each workspace. An agent uses `agent.searchTasks` or `ops task list` instead. |

**`dayPlans.unfinishedBefore` rules.**

- It reads the plans of the `days` days before `date`. The default is 7, and the maximum is 31 (a larger value reads as 31).
- It returns the tasks that are not done, readable, and not in the plan of `date`.
- One row for each task, at its newest day. The newest day comes first, and the plan order applies inside a day.

**`dayPlans.add` rules.**

- The new tasks go in at `index` in the order of `taskIds`. An absent `index` is the end. A value below 0 is the start, and a value above the length is the end. A fraction rounds down.
- A task that is already in the plan keeps its place. A duplicate ID is ignored.
- Each task must exist in an org that the caller can read, else `task_not_found` and nothing changes.

The `day_plans` table is not journaled in Waybill: the `user:` scope is the undo stack of the Strike targets. Each planner gesture has a direct inverse (`add` and `remove`).

| Code | Meaning |
|------|---------|
| `day_plan_date_invalid` | `date` is not a real calendar date `YYYY-MM-DD` |
| `day_plan_days_invalid` | `days` is below 1, or not a finite number |
| `day_plan_full` | The plan would hold more than 100 tasks |
| `day_plan_reorder_invalid` | The new order is not the exact set of the readable items |
| `task_not_found` | `add`: a task that is absent or in an org that the caller cannot read |
| `unauthenticated` | No signed-in caller |

## Other Tables

These tables hold support data. Most have no command of their own. `ops query` (when its allowlist has the table) or `ops call` reads them.

| Table | Module | What it holds |
|-------|--------|---------------|
| `task_launches` | `taskLaunches` | One row for each launch of a task through NUU Network ((Task) 313, 321): `taskId`, `launchedBy`, `networkOrg`, `station`, `dataMode`, `textHash` (no text, no token), `requestId?`, `acceptedAt?`, `abandonedAt?`. `kind: "session"` ((Task) 1157 of the NUU Flint) is an agent session started in a Flint of a computer: `machineName`, `place`, `placeAddress`, `target`, `account`, `commandState` (`resolved`, `refused`, `failed`, `expired`), `sessionId`, `sessionAddress`. Not journaled. |
| `favourites` | `home` | The stars of the homepage ((Task) 316): `orgSlug`, `userId`, `kind` (project, deliverable, subsection), `recordId`. Personal. `ops favourite`. |
| `recent_subsections` | `home` | The sections that a person visited last: `orgSlug`, `userId`, `subsectionId`, `visitedAt`. Personal. |
| `project_briefs` | `brief` | The brief notepad of a project ((Task) 1248): `projectId`, `notepadId?`, and the lease of the brief that runs now (`runId`, `runningUntil`). At most one row for each project. |
| `day_plans` | `dayPlans` | § Day Plans. Personal: `clerkUserId`, `date`, `taskIds` (at most 100). No `orgSlug`. |
| `changelog_seen` | `changelogSeen` | The publish time of the newest release that a person saw ((Task) 323): `clerkUserId`, `seenAt`. Personal. |
| `fleet_actors` | `lib/fleetActors` | One row for each Orbh fleet that wrote in an org: `orgSlug`, `fleetId`, `ownerClerkUserId`, `handle`, `displayName?`, `avatarUrl?`. The first agent write that names the fleet registers it for the signed-in person. A write of another person with the same fleet id is refused. A fleet is a display actor only. |
| `task_moves`, `place_moves` | (internal) | The old ids of a task, a project, or a deliverable after an undo or a redo inserts it again with a new id. An old id still finds the record. |
| `project_tree_nodes`, `project_tree_meta` | `projectTree` | The radial tree of a project: nodes with `parentId`, `order`, `status`, an optional link to a record, `prereqs`, a pin `position`, and a `nudge`. No dates. |
| `plan_history` | `plans` | The undo journal of a plan ((Task) 245): one entry for each gesture, with `seq`, `label`, `undone`, and the field changes. The last 100 entries. `ops plan history|undo|redo`. |
| `backlog_folders` | `backlogFolders` | The backlog folders of before the revamp (§ Old Words). The migration turns each into a section. |
| `strike*` | `strike*` | The state of NUU Strike (the command sync of tasks and sessions). Not for agent writes through `ops`. |
| `pushSubscriptions` | `push` | One row for each browser or app that turned Web Push on. |

## Error Codes

The gateway returns `{ok: false, error: {code, message, data?}}`. The codes below come from the backend and pass through unchanged. Some backend errors carry no code (a plain message, for example "Project not found" or "Adding this dependency would create a cycle"). The gateway reports those as `agent_error`; read the message. A Convex argument validation failure (a wrong field name or type) is `agent_invalid_input`. The Waybill refusals carry a `type` in the backend; the gateway makes that type the `code` (`waybill_stale`, `waybill_conflict`) and puts the whole Waybill data in `error.data`. The gateway-level codes (`agent_unknown_operation`, `agent_wrong_endpoint`) and the CLI's own codes are in [[dev-knw-ops-cli]]. A function of the revamp that is not deployed yet on a deployment gives `agent_unknown_operation`; the CLI names the deploy that adds it.

| Code | Meaning | Next action |
|------|---------|-------------|
| `unauthenticated` | No valid credential | Ask the operator to sign in |
| `agent_error` | A backend error with no code | Read the message |
| `agent_invalid_input` | Bad args for the op | Check the field names and types of the Convex function |
| `org_unauthorized` | The caller is not a member of the org | Check `--org` |
| `org_frozen` | The org is frozen for a migration | Wait; reads still work |
| `assignee_not_found`, `assignee_not_member` | The owner, the assignee, the reviewer, or a person to loop in is not a member | Use `users.listAll` |
| `project_not_found`, `deliverable_not_found`, `section_not_found`, `subsection_not_found`, `task_not_found`, `deadline_not_found`, `plan_not_found`, `node_not_found`, `deployment_not_found`, `task_group_not_found`, `backlog_folder_not_found` | No such record in this org | Check the ID and the org |
| `subsection_blocked` | An upstream section is not done | Finish the blockers named in the message |
| `dependency_order_invalid` | Sections: a dependency points down in its home. Deadlines: a date before a required deadline. | Reorder, or fix the dates |
| `section_title_required`, `section_title_too_long` | A section title that is empty or longer than 200 characters | Give a title of 1 to 200 characters |
| `section_role_locked` | A move of a backlog, queue, or inbox section, or a delete of one that has tasks | Move the tasks out first; a system section stays in its home |
| `section_role_invalid` | An inbox outside a deployment, or a backlog or a queue outside a project or the org | Choose another home |
| `section_move_same_home` | A move of a section to its own home | Choose another home |
| `section_order_incomplete`, `section_order_invalid` | Bad `sections.reorder` list | Send every section of the home once |
| `context_too_long` | A hidden context of more than 20 000 characters | Make the context shorter |
| `subsection_not_done` | Archive of a section that is not done | Finish its tasks |
| `subsection_archived` | Move of an archived section | Unarchive first |
| `subsection_move_same_deliverable` | `subsections.move` to its own deliverable | Choose another deliverable |
| `subsection_order_incomplete`, `subsection_order_duplicate`, `subsection_order_invalid` | Bad `subsections.reorder` list | Send every section of the deliverable once |
| `subsection_conversion_*` | Conversion to a task is not lossless | See Sections § Conversion to a task |
| `closer_locked`, `closer_requires_task` | Legacy: a closer that the migration did not reach | Run `deliverables.setDone` with the current done state (`ops deliverable reopen` for an open deliverable): it makes the closer a plain section |
| `deployment_not_owned`, `deployment_project_mismatch` | The deployment cannot take this link | Choose another deployment |
| `task_folder_in_subsection`, `task_subsection_required`, `task_deliverable_required`, `task_project_required`, `deliverable_project_mismatch`, `task_project_mismatch`, `task_unplaced_with_home` | Bad task home | See Tasks § The home |
| `task_has_subtasks` | A delete of a task with subtasks | Pass `withSubtasks: true` (`ops task delete --with-subtasks`), or move the subtasks first |
| `subtask_too_deep` | The tree would have more than 6 levels below its root | Put the task under a higher parent |
| `subtask_cycle` | The new parent is in the subtree of the task | Choose a parent outside the subtree |
| `subtask_no_previous`, `subtask_not_a_subtask` | An indent with no sibling above, or an outdent of a root task | Use `subtasks.reparent` |
| `subtask_title_empty`, `subtask_title_too_long`, `task_title_required` | A bad title | Give a title |
| `move_too_large` | A move of more than 200 tasks | Move them in parts |
| `task_text_conflict` | `expectedTitle` or `expectedBody` is stale | Read the task again |
| `task_order_invalid`, `task_order_duplicate`, `task_order_incomplete` | Bad `tasks.reorder` list | Send one complete bucket |
| `task_link_cycle` | A chain or a merge would make a loop | Choose other tasks |
| `review_no_reviewer` | A review request of a task of a team with no owner | Name the reviewer |
| `review_task_done`, `review_task_gone` | The task of a review request is done, or gone | Reopen the task, or read the queue again |
| `review_not_reviewer`, `review_not_requester`, `review_not_open` | A verdict by a person who is not the reviewer, a cancel by a person who did not ask, or a request that is closed | Read the request (`reviews.forTask`) |
| `loop_full` | A task that loops in 50 people already | Take a person out first (`taskLoops.remove`) |
| `promotion_deliverable_fixed`, `promotion_deliverable_required` | Bad promote target | See Sections § Conversion back |
| `deployment_name_required` | A deployment with no name | Give a name |
| `deployment_project_required` | `startDeliverable` for a deployment with no project, and no `projectId` | Give the project (`ops deployment start-deliverable --project <p>`) |
| `deployment_task_not_in_inbox`, `deliverable_tasks_required`, `deliverable_title_required` | Bad `startDeliverable` input | Pick tasks of the inbox of this deployment, and give a title |
| `deployment_chain_*`, `deployment_predecessor_not_found` | Legacy chain rule | Do not use the chain functions |
| `backlog_folder_system`, `backlog_folder_name_required`, `backlog_folder_order_invalid` | Legacy folder rule | Use sections |
| `deadline_due_invalid` | Bad date format | Use `YYYY-MM-DD` or `YYYY-MM-DD HH:mm` |
| `deadline_title_required`, `deadline_title_link_unlinked`, `deadline_link_not_found`, `deadline_requires_cycle`, `deadline_between_same` | Deadline rule | See Deadlines |
| `deadline_status_wrapped` | Manual status on a single-link deadline | Change the linked record's status instead |
| `plan_title_required`, `node_title_required` | Empty title | Give a title |
| `node_requires_invalid`, `node_requires_cycle` | Bad step edges | Use steps of the same plan; no loop |
| `node_between_same` | Same step twice | Choose two steps |
| `node_done_linked` | Manual done on a linked step | Change the linked record |
| `node_gated` | Done on a step that is not unlocked | Finish the steps before it |
| `node_fold_root` | Fold of a root step | Fold another step |
| `node_subplan_cycle`, `node_link_not_found` | Bad step link | See Plans |
| `updates_target`, `updates_tenant` | Comment on something that is not a task of that org | Comment on a task |
| `waybill_stale` | The undo head is not `expectSeq` | Read the stack again; do not force |
| `waybill_conflict` | A field changed after the gesture | Report it; do not undo |
| `notepad_not_found` | No such notepad for the caller | Check the ID and the org; `notepads.list` |
| `notepad_rev_conflict`, `notepad_text_conflict` | The notepad or the block changed | Read the notepad again, merge, and write again at the new rev |
| `notepad_too_large`, `notepad_title_invalid`, `notepad_block_invalid`, `notepad_block_not_found`, `notepad_selection_invalid`, `notepad_task_invalid` | Notepad rule | See Notepads |
| `notepad_undo_conflict` | `notepads.undoGesture` refused: a later change touched the notepad or the task, or the 60-second undo window of a `toTask` expired | Do not write. Read both records and report the conflict to the operator; revert by hand only when the operator asks (see Notepads § Undo) |
| `task_destination_invalid` | `notepads.toTask` with a section and a backlog | Give one destination |
| `day_plan_date_invalid`, `day_plan_days_invalid` | Bad date or day count | Use a real `YYYY-MM-DD`; `days` 1 to 31 |
| `day_plan_full` | More than 100 tasks in one plan | Remove a task first |
| `day_plan_reorder_invalid` | The plan changed, or the order is not the exact set | Read the plan again (`dayPlans.get`) |
| `blocker_not_found`, `blocker_closed`, `blocker_check_invalid`, `blocker_link_not_found`, `blocker_title_required`, `blocker_text_too_long` | A blocker refusal (§ Blockers) | Check the ID, the state (`delay`, `resolve`, `drop` need an open blocker), the date (`YYYY-MM-DD`), the record, the text length |
| `blocked_reason_required`, `blocked_too_long` | The old `blocked` argument of `tasks.update` with no reason, or a long text | Give a reason; prefer `blockers.create` |
| `network_launch_*` | `taskLaunches.accept` refused (for example `network_launch_stale`, `network_launch_already_accepted`, `network_launch_text_mismatch`) | Only the station workflow calls it; report the code |
