# Setup Operations

One-time setup of the Operations shard in a Flint. The setup writes the Mesh note `Mesh/(System) Ops Projects.md`. The note lists the projects of the Ops org that matter to this Flint. Each later session that starts the shard reads the note, so the agent knows the work of this Flint (see [[dev-init-ops]] § The Projects of This Flint).

The setup scope is `flint`: one setup for each Flint. The state is in the committed lock (`flint.json`), so a second machine does not do the setup again.

# Prerequisites

- The `ops` CLI on PATH, signed in (`ops whoami` shows a sign-in). The init § Prerequisite gives the builds and the sign-in.
- The Flint has an org (`flint org show`). With no org, the script reads the personal workspace (`me`).
- The Projects shard is installed (`flint shard list` has a row for `projects` with a version of 1.6 or more): the task notes of this shard use its type `Task` and its template `tmp-proj-task-v0.2`. An install of Operations installs it as a dependency. When it is missing, run `flint shard install @nuucognition/projects@^1.6`. When its version is below 1.6, run `flint shard update projects`.

# Actions

1. Write the note:

   ```bash
   flint shard ops projects-note
   ```

   The org of the read is the org of the Flint. When the Ops org has another slug, give it: `flint shard ops projects-note --org <org>`. The output is one JSON document: `path`, `org`, `linked` (the projects of this Flint), `likely` (the projects of the route decision), `projects` (the count of all projects), `complete`, and `failed` (each read of Ops that failed).

2. Read the note. Make sure that `## Projects of This Flint` names the projects of the work of this Flint. When a project is missing, or a project is wrong, tell the operator. The operator can set the Flint place of a project or a deliverable: `ops agents defaults set <project or deliverable> --flint "<Flint address>"`. Then run step 1 again. The operator can also write under `# Notes` of the note: the script keeps that section.

3. When the script fails (exit 1), the JSON output gives `error`, `failed`, and `next`. With no note before the run, the script writes a note with a `## Status` section that gives the reason. A failed project list does not change a note that exists. Another failed read writes the note with `complete: false` and keeps the old project sections. The reasons:
   - `auth_required` or `unauthenticated`: ask the operator to sign in (`ops login` or `nuu login`). A headless session cannot sign in: report it.
   - `org_not_found` or `org_unauthorized`: run step 1 again with the right `--org`.
   - `note_changed`: a person or another session wrote the note during the run. Nothing changed: run step 1 again.
   - A file at that path that the script did not write: move or rename it, then run step 1 again.
   - Another error: report it.

   The shard works with no projects note. When the read fails, finish the setup anyway, and put the reason in your report. The next session can run `flint shard ops projects-note` again.

4. **Remove the Tasks shard.** Do this step only when `flint shard list` has a row with the shorthand `task` and the package `@nuucognition/tasks`. Another package with the alias `tasks` is not the Tasks shard: keep it. Since Operations 0.8.0, this shard holds the work of the Tasks shard, and a Flint does not keep the Tasks shard (the operator decision of 2026-11-16). This step does the work for a new install and for an update from each older version: the shard has no migration files.
   1. **Find the instruction files.** Only the files that tell an agent what to do change: `Mesh/(System) Flint Init.md`, each other `(System)` file directly under `Mesh/`, and `CLAUDE.md` and `AGENTS.md` at the Flint root when they exist. List the matches:
      `grep -n -E "flint shard (start|start-dev|invoke) task\b|flint shard task task-(new|link|sync)|\[\[(wkfl|sk|knw)-task-|\[\[init-task\]\]" "Mesh/(System) "*.md CLAUDE.md AGENTS.md 2>/dev/null`
   2. **Rewrite each match** with the table of [The New Names](#the-new-names). Change only the command or the link: keep the text around it. When a sentence says "the Tasks shard", change it to "the Operations shard". Do not change other files. Task notes, reports, notepads, plans, and the files under `Mesh/Archive/` are records of the past: they keep the old names. The files under `Shards/` belong to the shards: do not edit them.
   3. **Close the open invocations of the Tasks shard.** List them: `flint shard invocations --open`. An invocation of the Tasks shard has a workflow `wkfl-task-<name>`. For each one, read its session: `flint orbh inspect <session id>`. When the work state is `finished` or `abandoned`, close the invocation: `flint shard invocations close <id> --outcome abandoned --reason "The Tasks shard is removed. Operations holds its work."`. When the session is still live, do not close its invocation. Send the session a message (`flint orbh message send <session id> "<the reason, and the new workflow flint shard invoke ops <workflow>>"`), do not uninstall, and name the invocation in your report. Do the uninstall after that session closes its invocation.
   4. **Uninstall the Tasks shard** when no open invocation of it stays: `flint shard uninstall task --yes`. When the Flint holds the source of the Tasks shard (`from = "source"`), the uninstall removes only the build: the source and its record stay, with `use = "none"`. That is correct.
   5. Keep the Projects shard: Operations depends on it. Put this line in your report: "The Tasks shard is removed. Operations holds its work."

5. The note is a Mesh file. Commit it with the other files of your work (also the changed instruction files and `flint.toml`), and commit only your own paths.

# The New Names

| Tasks shard (`task`) | Operations (`ops`) |
|---|---|
| `flint shard start task` | `flint shard start ops` |
| `flint shard task task-new …`, `task-link …`, `task-sync …` | `flint shard ops task-new …`, `task-link …`, `task-sync …` |
| `flint shard invoke task <workflow> …` | `flint shard invoke ops <workflow> …` |
| `[[wkfl-task-<name>]]` (create_task, scope_task, do_task, create_and_do_task, review_task, do_task_group) | `[[wkfl-ops-<name>]]` |
| `[[sk-task-<name>]]` (capture_as_task, use_task, place_task, split_task, merge_tasks, continue_task, chain_tasks, group_tasks, close_task) | `[[sk-ops-<name>]]` |
| `[[knw-task-model]]`, `[[knw-task-cli]]`, `[[knw-task-commits]]` | `[[knw-ops-task_model]]`, `[[knw-ops-task_cli]]`, `[[knw-ops-task_commits]]` |
| `[[init-task]]` | `[[init-ops]]` |

The option `--subsection` of `task-new` and `task-link` is now `--section` (the former name still works).

# Verification

- `Mesh/(System) Ops Projects.md` exists, with the tag `#ops/projects` and the field `updated`.
- The note has the section `## Projects of This Flint`, or the section `## Status` with the reason of a failed read. A note with `complete: false` names each failed read.
- No instruction file names the old commands or links: the command of step 4.1 prints nothing.
- `flint shard list` has no row with the shorthand `task` and a build, unless step 4 found an open invocation of a live session (then name it in your report). A row of a source with the state `no build` is correct.

Then mark the setup complete:

```bash
flint shard setup ops --complete
```

`flint shard start ops` then loads the init. To do the setup again, run `flint shard setup ops --reset`.
