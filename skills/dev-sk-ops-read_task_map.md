---
description: "Read the task map of an Ops task with ops task map (the root and the subtree, the home, the task groups, the lineage, and the related links), and know when ops task show or ops task context is the better read"
orb:
  - "@v1/nuucognition/session/63260df7-271a-450f-b775-0cdfdedebc26#flint/nuu-flint"
orbh-fleet: ops-command-1021
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start ops` if you haven't already.

# Skill: Read Task Map

Read everything around one task in one command: where it lives, the tree that it is in, the groups that it is in, and the tasks that it came from or that came from it.

# Input

- The task: an ID, an address, a web URL, or a title
- (Optional) The org and the data mode

# Actions

0. **Ground.** Run `ops mode`. A read is safe on both data modes, but read the `data mode` line, so that you report the data that you read. `ops --help` must list `headers`, `route`, `search`, and `section` (else the build is of before the revamp and has no `ops task map`).
1. **Choose the read.**

   | Question | Command |
   |----------|---------|
   | Where is this task, what tree is it in, and how is it linked to other tasks? | `ops task map <task> --json` |
   | What are the facts of this one task: its status, owner, the people looped in, result, body, attachments, and web link? | `ops task show <task> --json` |
   | What must I know before I work on this task or report on it: its description, place, people, and comments? | `ops task context <task> --json` |
   | Only the subtree, with the done count? | `ops task subtask list <task> --json` |

   Before you change an existing task, always read `ops task context` too.
2. **Read the map.** Run `ops task map <task> --json` (`taskMap.get`). Read its parts in this order:

   | Part | What it says |
   |------|--------------|
   | `task` | The task: `taskId`, `title`, `checkbox`, `address`, and `parentTaskId` and `depth` for a subtask |
   | `root` | The root of its subtask tree. The same task when it is a root task. |
   | `home` | The path of its home: `org`, `project`, `deliverable`, `deployment`, and `section` (each `{id, title, address, role?}`). `role` is `backlog`, `queue`, or `inbox`. `unplaced: true` means no home. A subtask has the home of its root. |
   | `subtree` | The tree from the root: each node with `taskId`, `title`, `checkbox`, `address`, and `children`. `subtreeCut: true` means that the tree has more than 200 tasks. |
   | `groups` | Each task group of the task: `id`, `title`, `open`, `count`, `done`, `address`, and `members`. `membersCut: true` means more than 50 members. |
   | `lineage` | The links of the task to other tasks (below). `linksCut: true` means that the read stopped at its byte budget. |
   | `related` | The tag links: `{kind, ref, label?}` with the kind `project`, `deliverable`, `repo`, `flint`, or `address`. A related link is not a home. |
   | `url` | The map page of the web: `/<org>/tasks/<taskId>/map` |

3. **Read the lineage words.** Each entry is a task with its `taskId`, `title`, `checkbox`, and `address`:

   | Key | Text label | Meaning |
   |-----|------------|---------|
   | `splitFrom` | split from | This task is a part of that task. The old task closed, unless it stayed open. |
   | `splitInto` | split into | The parts that came from this task |
   | `mergedInto` | merged into | This task went into that task (the survivor) |
   | `absorbed` | absorbed | The tasks that went into this task |
   | `continuesFrom` | continues from | This task continues that older task |
   | `continuedBy` | continued by | The tasks that continue this task |
   | `after` | after | The task before this one in a chain. This task is ready when that task is done. |
   | `before` | before | The tasks that come after this one in a chain |

4. **Read the text form** (with no `--json`) the same way. The first line is the task. Then come the lines `root`, `org`, `project`, `deliverable`, `deployment`, `section` (or `home  unplaced`), each with an ID, a title, and an address. Then come the blocks `tree (from the root):`, `task groups:`, `lineage:`, and `related:`, and the last line `map page  <url>`. A status mark is `[ ]` (todo), `[~]` (doing), or `[x]` (done). The tree indents each level by two spaces.
5. **Act on what the map says.**
   - The wrong home: move the task with its subtree ([[dev-sk-ops-move_tasks]]).
   - A task that waits in a chain (`after` is open): work on the task before it first.
   - A task that was merged or split: work on the survivor or on the parts, not on the old task.
   - A cut list (`subtreeCut`, `membersCut`, `linksCut`): read the rest with `ops task subtask list <root> --json`, `ops task group show <group> --json`, or `ops task show <task> --json`.

# Output

- The home path of the task, its root, its tree, its groups, its lineage, and its related links, each with an address
- The next read, when a list was cut
