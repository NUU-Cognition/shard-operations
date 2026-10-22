---
description: "Plan an Ops deliverable with sections: create it with a first section, add and order sections, set dependencies, put tasks into sections, write the hidden context, and mark it done at the end"
orb:
  - "@v1/nuucognition/session/63260df7-271a-450f-b775-0cdfdedebc26#flint/nuu-flint"
orbh-fleet: ops-command-1021
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start ops` if you haven't already.

# Skill: Plan Deliverable

Give a deliverable its sections, their order, their dependencies, their tasks, and a hidden context. A deliverable has no closer and no "Delivered" task: a person marks it done.

# Input

- The project (ID, address, URL, or name), and the deliverable: a new title, or an existing deliverable
- The sections in order, each with its tasks (from the request or a scope description)
- (Optional) The dependencies between sections, the due dates, the deployment that the deliverable ships to, and the context text
- (Optional) The org and the data mode

# Actions

1. **Ground.** Run `ops mode` and `ops whoami --json`. Read the `build mode` and the `data mode` lines of `ops mode` before the first write: the `ops` on PATH can be the prod build, and a prod build writes to PROD data whatever `OPS_DATA_MODE` says. For DEV data, use the dev launcher (`OPS_DATA_MODE=dev node <monorepo>/apps/cli-ops/bin/ops.js …`; see the init § Prerequisite). `ops --help` must list `headers`, `route`, `search`, and `section`; when it does not, the build is of before the revamp: stop and report it. Pass `--org <org>` when the project belongs to an org that is not active.
2. **Read the project.** Run `ops project show <project> --json`: its sections (the backlog first), its deliverables and deployments with their sections, and the root tasks. Check that no deliverable has the same title. When one has, plan that deliverable and do not create another.
3. **Create the deliverable with its first section.**

   ```bash
   ops deliverable create "<title>" --project <project> --section "<first section>" [--due YYYY-MM-DD] [--deployment <deployment>] [--context "<text>"] --json
   ```

   Keep the deliverable ID, its address, and the ID of the first section. Ops makes no other section and no task. `--due` makes a deadline linked to the deliverable. `--deployment` names the deployment that it ships to.
4. **Add the other sections, top first.** A new section goes to the end of its home, so a create in order gives the right order:

   ```bash
   ops section create "<title>" --deliverable <deliverable> [--after <section>] [--due YYYY-MM-DD] [--context "<text>"] --json
   ```

   Keep each section ID and address. `--after <section>` puts the section after a section of the same home. A section of the project with no deliverable yet is `--project <project>`: move it into the deliverable later with `ops section move <section> --to deliverable:<ref>`.
5. **Order the sections.** Change the order only when it is wrong: `ops section reorder <section> --top|--bottom|--before <section>|--after <section> --json`. Upstream sections go above the sections that depend on them.
6. **Set the dependencies**, after every section exists:

   ```bash
   ops section deps set <section> <upstream section>... --json
   ops section deps add <section> <upstream section>... --json
   ```

   Inside one deliverable, a dependency must point up: the upstream section is above its dependent (`dependency_order_invalid`). A dependency on a section of another home is allowed. A task in a section cannot go to done while an upstream section is open (`subsection_blocked`). On a refusal, do not reorder or drop edges to force it: report the code.
7. **Put the tasks into the sections.**
   - New tasks: `ops task create "<title>" --section <section> [--assign <member>] [--priority <p>] [--body <text>] --json`, in the order they must show. Subtasks: `--parent <task>`. See [[dev-sk-ops-create_task]].
   - Existing tasks (for example from the backlog): `ops task move <task> [<task>...] --to section:<section> --json`. A move from a backlog into a section of a deliverable clears the priority, unless you pass `--priority`. See [[dev-sk-ops-move_tasks]].
8. **Write the hidden context.** The context tells search and the route decision what belongs here. The page does not show it.

   ```bash
   ops deliverable context set <deliverable> "<what it is, the words people use for it, what does not belong>" --json
   ops section context set <section> --file <path> --json
   ```

   Read it back with `ops deliverable context show <deliverable>` or `ops section context show <section>`.
9. **Check the plan.** Run `ops deliverable show <deliverable> --json`. Compare it with the input: the sections in order, each with its root tasks and addresses, the deployments, and the done mark (open). `ops section show <section> --json` shows one section with its home, its address, and its root tasks with their subtask counts.
10. **Mark it done at the end.** A deliverable is done only when a person says that it is done. The sections do not decide: a deliverable with every section done stays open. When the request says that it is done, run `ops deliverable done <deliverable> --json`. `ops deliverable reopen <deliverable> --json` reverses it.

# Output

- A deliverable with its ID and address, its sections in order (each with its ID, address, dependencies, and tasks), and its hidden context
- The deadlines of the due dates, when the input had dates
- The done mark, only when the request said that the work is done
