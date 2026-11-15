# Migrations

Migration notes for Operations. Latest version at top, separated by `---`.

The chain of steps in `migrations/` must be complete: the CLI finds the step that starts at the installed version, then the step that starts at its end, until it gets to the new version. When one version has no step, the install and the update fail with `Migration chain for shard "ops" is incomplete`. Thus each release adds one step from the version before it. When the release changes nothing in the Flint, the step is a script that does nothing (`dev-mig-ops-<from>-to-<to>.js` with `process.exit(0);`). `flint shard migrate run ops` runs a script step and does not stop.

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
