# Migrations

Migration notes for Operations. Latest version at top, separated by `---`.

## 0.6.0

No migration of the Flint. The shard installs nothing into the Mesh.

- An agent that used `ops section priority` or `ops task subtask indent` gets an unknown command. Set the priority of a task with `ops task update <task> --priority <p>`. Put a task under a root task with `ops task subtask move <task> --under <root task>`.
- A dev build of `ops` now uses PROD data by default. A script or a note that ran the dev launcher for dev data must set `OPS_DATA_MODE=dev`.
- The data of Ops changed by the server migrations `named-sections-406`, `flat-subtasks-409`, and `sections-priority-drop`. The release of the fleet runs them; the shard needs no step.
