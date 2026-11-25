# Migrations

Migration notes for Operations. Latest version at top, separated by `---`.

Since 0.8.2 the shard has no migration files and no `migrations/` folder. Do not add one. The CLI checks the chain of steps only when the folder has files: then it needs one step from each old version, and a gap makes each install and each update fail (`Migration chain for shard "ops" is incomplete`). The one-time work in a Flint is in the setup ([[dev-setup-ops]]).

## 0.8.4

No migration files. A Flint at each older version updates to 0.8.4 directly: `flint shard update operations`. The release changes text only: the one model of the do dates.

- An update from 0.8.0, 0.8.1, 0.8.2, or 0.8.3: no work. The setup stays complete.
- An update from a version below 0.8.0: the setup becomes `required`. Do the steps of the entry 0.8.2 below.
- The spec in `flint.toml` must accept 0.8.4. An exact spec or a range below 0.8 (`^0.3`, `^0.7`) does not take it: run `flint shard install @nuucognition/operations@^0.8`, then `flint shard update operations`.
- A Flint with queued steps of 0.8.0 or 0.8.1: do them first, as the entry 0.8.2 below says. Then update.
- An instruction file or a script of the Flint that runs `ops day add`, `ops day remove`, `ops day new`, or `ops day candidates` gets an unknown command from a current `ops` build. Use `ops task do <task...> --on <day>`, `ops task do <task...> --on none`, `ops task create "<title>" --do <day>`, and `ops task list --mine --do none`. A reader of `ops day show --json` reads `tasks`, not `items`.

---

## 0.8.3

No migration files. A Flint at each older version updates to 0.8.3 directly: `flint shard update operations`. The release adds one workflow (`scope_and_do_task`) and text only.

- An update from 0.8.0, 0.8.1, or 0.8.2: no work. The setup stays complete.
- An update from a version below 0.8.0: the setup becomes `required`. Do the steps of the entry 0.8.2 below.
- The spec in `flint.toml` must accept 0.8.3. An exact spec or a range below 0.8 (`^0.3`, `^0.7`) does not take it: run `flint shard install @nuucognition/operations@^0.8`, then `flint shard update operations`.
- A Flint with queued steps of 0.8.0 or 0.8.1: do them first, as the entry 0.8.2 below says. Then update.

---

## 0.8.2

No migration files. A Flint at each older version updates to 0.8.2 directly: `flint shard update operations`.

- An update from 0.8.0 or 0.8.1: no work. The setup stays complete.
- An update from a version below 0.8.0 (for example 0.3.2 or 0.7.0): those versions had no setup, so the setup becomes `required`, and `flint shard start ops` refuses until the setup is complete. Do the setup ([[dev-setup-ops]]): it writes the projects note, rewrites the commands and links of the Tasks shard in the instruction files of the Flint, and uninstalls the Tasks shard. Then run `flint shard setup ops --complete`.
- The spec in `flint.toml` must accept 0.8.2. An exact spec or a range below 0.8 (`^0.3`, `^0.7`) does not take it: run `flint shard install @nuucognition/operations@^0.8`, then `flint shard update operations`.
- A Flint with queued steps of 0.8.0 or 0.8.1 (`flint shard migrate show ops` lists them) keeps them after the update, and `flint shard start ops` refuses: no command runs a step that the build does not have. Do the steps first with 0.8.1: `flint shard install --from-git 'NUU-Cognition/shard-operations#v0.8.1' --alias operations`, then `flint shard migrate run ops` (and `finish` and `run` again for an agent step). Then update.

---

## 0.8.1

Twelve script steps that do nothing. They complete the chain from each older version: 0.1.0 → 0.1.1 → 0.2.0 → 0.2.1 → 0.3.0 → 0.3.1 → 0.3.2 → 0.3.3 → 0.4.0 → 0.5.0 → 0.6.0 → 0.7.0, then the agent step `mig-ops-0.7.0-to-0.8.0`, then 0.8.0 → 0.8.1. No version before 0.8.0 installed a file into the Mesh, so these steps change nothing.

- A Flint at 0.8.0: `flint shard migrate run ops` runs the step `mig-ops-0.8.0-to-0.8.1` and the version becomes 0.8.1.
- A Flint below 0.7.0 (for example 0.3.2): `flint shard migrate run ops` runs the script steps to 0.7.0, then stops at the agent step `mig-ops-0.7.0-to-0.8.0`. Follow that step, then run `flint shard migrate finish ops` and `flint shard migrate run ops` again for the step to 0.8.1.
- The spec in `flint.toml` must accept 0.8.1. An exact spec (`@nuucognition/operations@0.8.0`) or a range below 0.8 (`^0.3`, `^0.7`) does not take it: run `flint shard install @nuucognition/operations@^0.8`.

---

## 0.8.0

One agent migration: `mig-ops-0.7.0-to-0.8.0`. Run `flint shard migrate run ops`, follow its steps, then `flint shard migrate finish ops`.

- The update needs the Projects shard `^1.6` (a dependency now). `flint shard install` and `flint shard update` install it first.
- The spec of a Flint that pins `@nuucognition/operations@^0.7` (or another range below 0.8) does not take 0.8.0: run `flint shard install @nuucognition/operations@^0.8`.
- The setup is `required` after the update: run `flint shard ops projects-note`, then `flint shard setup ops --complete` (the migration does it).
- The migration rewrites `flint shard start task`, `flint shard task task-new|task-link|task-sync`, `flint shard invoke task <workflow>`, and the links `[[wkfl-task-*]]`, `[[sk-task-*]]`, `[[knw-task-*]]` in the `(System)` files of the Mesh and in `CLAUDE.md` and `AGENTS.md`. Records (task notes, reports, notepads, the archive) keep the old names.
- The migration uninstalls the Tasks shard (the operator decision of 2026-11-16). First it closes each open invocation of the Tasks shard whose session has ended (`--outcome abandoned`). An invocation of a live session stays open, and the uninstall waits for it. A Flint that holds the source of the Tasks shard keeps the source, with `use = "none"`.
- A new install of Operations 0.8.0 into a Flint that has the Tasks shard runs no migration. The setup (step 4 of `setup-ops.md`) then does the rewrite and the uninstall.

---

## 0.7.0

No migration of the Flint. The shard installs nothing into the Mesh. The release adds text only. The fields `flintId`, `flintAddress`, and `agentDefaults` of a project, and `agentDefaults` of a deliverable, are optional: an old row needs no migration.

---

## 0.6.0

No migration of the Flint. The shard installs nothing into the Mesh.

- An agent that used `ops section priority` or `ops task subtask indent` gets an unknown command. Set the priority of a task with `ops task update <task> --priority <p>`. Put a task under a root task with `ops task subtask move <task> --under <root task>`.
- A dev build of `ops` now uses PROD data by default. A script or a note that ran the dev launcher for dev data must set `OPS_DATA_MODE=dev`.
- The data of Ops changed by the server migrations `named-sections-406`, `flat-subtasks-409`, and `sections-priority-drop`. The release of the fleet runs them; the shard needs no step.
