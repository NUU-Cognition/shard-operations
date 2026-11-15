---
description: "Move a Flint from the Tasks shard to Operations 0.8.0: check the Projects dependency, rewrite the commands and links of the Tasks shard in the instruction files of the Flint, uninstall the Tasks shard, and write the projects note"
type: agent
migration:
  from: "0.7.0"
  to: "0.8.0"
---

> [!important] THIS FILE IS A MIGRATION. WHEN RUN, EXECUTE THE STEPS AGAINST THE WORKSPACE, THEN MARK IT FINISHED.

# Migration: Operations 0.7.0 → 0.8.0 (the Tasks shard merges into Operations)

Operations 0.8.0 holds the work of the Tasks shard (`task`). The task workflows, the task skills, the task knowledge, and the task scripts moved into this shard. Each task still has two parts, linked both ways: a task note in the Flint and an Ops task. The Tasks shard is deprecated: its init points to Operations. It stays published in the registry, so that an old lock still resolves. The operator removes it from each Flint (decision of 2026-11-16): step 4 uninstalls it.

Operations 0.8.0 also has a setup: it writes the Mesh note `Mesh/(System) Ops Projects.md` (the projects of the Ops org that matter to this Flint). The install sets the setup to `required`, so `flint shard start ops` refuses until the setup is complete. Step 5 does the setup.

The new names:

| Tasks shard (`task`) | Operations 0.8.0 (`ops`) |
|---|---|
| `flint shard start task` | `flint shard start ops` |
| `flint shard task task-new …`, `task-link …`, `task-sync …` | `flint shard ops task-new …`, `task-link …`, `task-sync …` |
| `flint shard invoke task <workflow> …` | `flint shard invoke ops <workflow> …` |
| `[[wkfl-task-<name>]]` (create_task, scope_task, do_task, create_and_do_task, review_task, do_task_group) | `[[wkfl-ops-<name>]]` |
| `[[sk-task-<name>]]` (capture_as_task, use_task, place_task, split_task, merge_tasks, continue_task, chain_tasks, group_tasks, close_task) | `[[sk-ops-<name>]]` |
| `[[knw-task-model]]`, `[[knw-task-cli]]`, `[[knw-task-commits]]` | `[[knw-ops-task_model]]`, `[[knw-ops-task_cli]]`, `[[knw-ops-task_commits]]` |
| `[[init-task]]` | `[[init-ops]]` |

The skill `sk-ops-create_task` now makes a task note and an Ops task with `task-new`. The option `--subsection` of `task-new` and `task-link` is now `--section` (the former name still works), and the scripts take `--deliverable`, `--deployment`, and `--parent` too.

# Steps

1. **Check the dependency.** Operations 0.8.0 depends on the Projects shard (`@nuucognition/projects` `^1.6`): a task note uses its type `Task` and its template `tmp-proj-task-v0.2`. Run `flint shard list`. When it has no row for `projects`, run `flint shard install @nuucognition/projects@^1.6`. When the row has a version below 1.6, run `flint shard update projects`.
2. **Find the instruction files.** Only the files that tell an agent what to do change: `Mesh/(System) Flint Init.md`, each other `(System)` file directly under `Mesh/`, and `CLAUDE.md` and `AGENTS.md` at the Flint root when they exist. List the matches:
   `grep -n -E "flint shard (start|start-dev|invoke) task\b|flint shard task task-(new|link|sync)|\[\[(wkfl|sk|knw)-task-|\[\[init-task\]\]" "Mesh/(System) "*.md CLAUDE.md AGENTS.md 2>/dev/null`
3. **Rewrite each match** with the table of new names. Change only the command or the link: keep the text around it. When a sentence says "the Tasks shard", change it to "the Operations shard". Do not change other files:
   - Task notes, reports, notepads, plans, and the files under `Mesh/Archive/` are records of the past. They keep the old names.
   - The files under `Shards/` belong to the shards. Do not edit them.
4. **Uninstall the Tasks shard.** Do this step only when `flint shard list` has a row with the shorthand `task` and the package `@nuucognition/tasks`. Another package with the alias `tasks` is not the Tasks shard: keep it.
   1. List the open invocations of the Tasks shard: `flint shard invocations --open`. An invocation of the Tasks shard has a workflow `wkfl-task-<name>`.
   2. For each one, read its session: `flint orbh inspect <session id>`. When the work state is `finished` or `abandoned`, close the invocation: `flint shard invocations close <id> --outcome abandoned --reason "The Tasks shard is removed. Operations 0.8.0 holds its work."`. When the session is still live, do not close its invocation. Send the session a message (`flint orbh message send <session id> "<the reason, and the new workflow flint shard invoke ops <workflow>>"`), do not uninstall, and name the invocation in your report. Do the uninstall after that session closes its invocation.
   3. When no open invocation of the Tasks shard stays, uninstall it: `flint shard uninstall task`. When the Flint holds the source of the Tasks shard (`from = "source"`), the uninstall removes only the build: the source and its record stay, with `use = "none"`. That is correct.
   4. Keep the Projects shard: Operations depends on it.
   5. Put this line in your report: "The Tasks shard is removed. Operations 0.8.0 holds its work."
5. **Do the setup.** Follow [[dev-setup-ops]]: run `flint shard ops projects-note`, read the note, then run `flint shard setup ops --complete`. When the read of the projects fails (no sign-in of `ops`), the note gives the reason in its `## Status` section. Complete the setup anyway, and name the reason in your report.

## Verification

Run each check. When one fails, stop and report. Do not finish the migration.

1. `flint shard list` has a row for `projects` with a version of 1.6 or more.
2. No instruction file names the old commands or links. This command prints nothing:
   `grep -n -E "flint shard (start|start-dev|invoke) task\b|flint shard task task-(new|link|sync)|\[\[(wkfl|sk|knw)-task-|\[\[init-task\]\]" "Mesh/(System) "*.md CLAUDE.md AGENTS.md 2>/dev/null`
3. `Mesh/(System) Ops Projects.md` exists and has the tag `#ops/projects`.
4. `flint shard setup ops` shows the Flint layer `completed`.
5. `flint shard list` has no row with the shorthand `task` and a build. A row of a source with the state `no build` is correct. The one exception is an open invocation of a live session (step 4.2): then name it in your report.

Then run `flint shard migrate finish ops`. Then run `flint shard migrate run ops` again: it runs the script steps after this step (for example `mig-ops-0.8.0-to-0.8.1`). Check that `flint shard status ops` prints `No pending migrations` and the version of the build (`0.8.1` or a later version).
