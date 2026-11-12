# Migrations

Migration notes for Operations. Latest version at top, separated by `---`.

## 0.8.0

One agent migration: `mig-ops-0.7.0-to-0.8.0`. Run `flint shard migrate run ops`, follow its steps, then `flint shard migrate finish ops`.

- The update needs the Projects shard `^1.6` (a dependency now). `flint shard install` and `flint shard update` install it first.
- The spec of a Flint that pins `@nuucognition/operations@^0.7` does not take 0.8.0: run `flint shard install @nuucognition/operations@^0.8`.
- The setup is `required` after the update: run `flint shard ops projects-note`, then `flint shard setup ops --complete` (the migration does it).
- A Flint that has the Tasks shard keeps it. The migration rewrites `flint shard start task`, `flint shard task task-new|task-link|task-sync`, `flint shard invoke task <workflow>`, and the links `[[wkfl-task-*]]`, `[[sk-task-*]]`, `[[knw-task-*]]` in the `(System)` files of the Mesh and in `CLAUDE.md` and `AGENTS.md`. Records (task notes, reports, notepads, the archive) keep the old names.
- An open invocation of the Tasks shard stays a record of that shard: continue it there, or close it with `--outcome abandoned`.

---

## 0.7.0

No migration of the Flint. The shard installs nothing into the Mesh. The release adds text only. The fields `flintId`, `flintAddress`, and `agentDefaults` of a project, and `agentDefaults` of a deliverable, are optional: an old row needs no migration.

---

## 0.6.0

No migration of the Flint. The shard installs nothing into the Mesh.

- An agent that used `ops section priority` or `ops task subtask indent` gets an unknown command. Set the priority of a task with `ops task update <task> --priority <p>`. Put a task under a root task with `ops task subtask move <task> --under <root task>`.
- A dev build of `ops` now uses PROD data by default. A script or a note that ran the dev launcher for dev data must set `OPS_DATA_MODE=dev`.
- The data of Ops changed by the server migrations `named-sections-406`, `flat-subtasks-409`, and `sections-priority-drop`. The release of the fleet runs them; the shard needs no step.
