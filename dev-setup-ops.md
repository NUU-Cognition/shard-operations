# Setup Operations

One-time setup of the Operations shard in a Flint. The setup writes the Mesh note `Mesh/(System) Ops Projects.md`. The note lists the projects of the Ops org that matter to this Flint. Each later session that starts the shard reads the note, so the agent knows the work of this Flint (see [[dev-init-ops]] § The Projects of This Flint).

The setup scope is `flint`: one setup for each Flint. The state is in the committed lock (`flint.json`), so a second machine does not do the setup again.

# Prerequisites

- The `ops` CLI on PATH, signed in (`ops whoami` shows a sign-in). The init § Prerequisite gives the builds and the sign-in.
- The Flint has an org (`flint org show`). With no org, the script reads the personal workspace (`me`).
- The Projects shard is installed (`flint shard list` has a row for `projects`): the task notes of this shard use its type `Task` and its template `tmp-proj-task-v0.2`. An install of Operations installs it as a dependency. When it is missing, run `flint shard install @nuucognition/projects@^1.6`.

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

4. The note is a Mesh file. Commit it with the other files of your work, and commit only your own paths.

# Verification

- `Mesh/(System) Ops Projects.md` exists, with the tag `#ops/projects` and the field `updated`.
- The note has the section `## Projects of This Flint`, or the section `## Status` with the reason of a failed read. A note with `complete: false` names each failed read.

Then mark the setup complete:

```bash
flint shard setup ops --complete
```

`flint shard start ops` then loads the init. To do the setup again, run `flint shard setup ops --reset`.
