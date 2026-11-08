# 0.6.0

The features of NUU Operations up to ops-overnight-1109 (2026-11-09). The new commands come from the lanes CLI-T (Trident) and CLI-W (the work model) of the fleet; the new gateway ops come from the lane GW. Each new command reaches prod at the release of the fleet. Before it, a command on prod data gives `agent_unknown_operation` ("not deployed yet").

- **Trident** (streams and workspaces). `knw-ops-data_model` § Trident: a stream is a lane of work with a state (`active`, `paused`, `done`), attachments (projects, deliverables, sections), a size, and drawings. A stream step is a row of `plan_nodes` with a `streamId`. Its zone comes from its state (planned, active, done), and the shore is a part of the planned zone. Parked steps, substreams, cross links (they gate nothing), the move to another stream, the undo scope `stream:<id>`, the workspaces, every op of `streams.*` and `tridentWorkspaces.*`, the limits, and the codes. `knw-ops-cli` § stream and § workspace give `ops stream …`, `ops stream step …`, `ops stream substream …`, `ops stream drawing …`, and `ops workspace …`. `ops step` gets `split`, `split-beside`, `state`, `done-next`, `move-links`, `remove-links`, and `place` (`plans.splitNode`, `splitBeside`, `setStepState`, `doneAndNext`, `moveLinks`, `removeLinks`, `setBoardPositions`), and each `ops step` verb takes `--stream <stream>`.
- **Shares.** `knw-ops-data_model` § Shares and `ops share list|access|add|permission|remove|with`: a project, a deliverable, or a task to another org or one person, as `reader` or `editor`. Only an owner or an admin shares. No undo.
- **Holds.** `knw-ops-data_model` § Holds and `ops task holds <task>`: a lease of an actor (`take` or `chair`, 600 s by default) on a task or a project. The CLI only reads holds.
- **Calendars and events.** `knw-ops-data_model` § Calendars and Events, `ops calendar list|show|create|update|delete|default`, and `ops event list|show|create|update|delete|attach|detach|for`: timed events, all-day events, periods (an all-day event of more than one day: `--date <first> --until <last>`), repeats with `--occurrence <day> --scope this|following|all`, people, guests, and links to tasks and deadlines. The default calendar is a choice of each person.
- **The deliverable move** (Task 408). `ops deliverable move <deliverable> --to <project>` (`deliverables.move`): the sections and the tasks go with it, and the name moves into the new project.
- **Named sections** (Task 406). Each project, deliverable, and deployment has one locked section with its name (roles `backlog`, `main`, `inbox`). A deliverable gets its main section at its create, and a task with only `--deliverable` lands there (not in the first open section). The code `section_named_locked`.
- **Subtasks have one level** (Task 409). A subtask has no subtasks, and a task with subtasks cannot become a subtask (`subtask_too_deep`). `ops task subtask indent` is gone; `ops task subtask children <task>` is new (`subtasks.children`).
- **Sections have no priority** (Task 413). `ops section priority`, `subsections.setPriority`, and the field `priorityColor` are gone. The priority of a task stays.
- **The data mode** (Task 415). A dev build of `ops` uses PROD data by default, with the sign-in of `nuu login`. `OPS_DATA_MODE=dev` gives dev data. The order is `OPS_DATA_MODE`, a test run, `NUU_DATA_MODE`, `~/.nuucognition/dev-data.json`, then prod. The file `~/.nuucognition/ops-dev-data.json` is not read any more. The init, `knw-ops-cli`, `sk-ops-use_operations`, and the headless callouts of the four workflows say it.
- **Other commands.** `ops notify read-prefix <prefix>` and `ops notify dismiss-all`, `ops comment people` and `ops comment count`, `ops address rename <record> <name>|--clear`, `ops notepad block|section|make-task|undo-make-task` (`ops notepad scope` is a hidden alias of `ops notepad section`), and `ops favourite reorder <records...>`.
- **No fallback to the former ops.** The CLI 0.1.0-dev.3 needs a deployment with the current ops: the fallbacks to the ops of before the revamp are gone (`tasks.place`, a close through `tasks.update`, `subsections.*`, the old project snapshot, the former backlog view). The read of the headers keeps its fallback. The hidden `ops folder`, `ops deployment end-chain|reopen-chain`, and `ops section deployment` are gone. The init and `knw-ops-cli` say it.
- **Day labels are gone** (Task 390): a day label is an all-day event now. `ops day-label`, the ops `dayLabels.*`, and the kind `day-label` of `agent.resolve` leave the init, `knw-ops-cli`, `knw-ops-data_model`, and `sk-ops-use_operations`.
- **The main skill.** `sk-ops-use_operations` gets the new entities in the model table, the new jobs, five new recipes (a Trident lane, a deliverable move, a share, a period on a calendar, and a review request), the new codes in Troubleshooting, and the new safety rule on shares and moves. The init gets the model, the job table, and the headless rule 10.

# 0.5.0

- NUU Ops removed the task outcome (operator page feedback, 2026-11-04): a done task is done, with an optional result. No `completed`, `dropped`, or `superseded`. `ops task close` loses `--outcome` and takes only `--result`; `ops task done` sends no outcome; `ops task show` shows no outcome. Split, merge, and continue close the open old task. `tasks.close` still takes `outcome` and ignores it, so an older CLI still works. The model (`knw-ops-data_model` § The Task Primitive), the CLI knowledge, `sk-ops-use_operations`, `sk-ops-read_task_map`, and the init lose the outcome.
- Looped In (amendment 1 of Task 402 of the NUU Operations Flint): the people looped into a task follow it beside its owner, and each one hears every comment. A review request loops in the reviewer, and a mention in a comment loops in the mentioned member. The model (`knw-ops-data_model` § Looped In: the field `tasks.loopedIn`, the ops `taskLoops.add|remove`, the rules, and the code `loop_full`), the CLI knowledge (`ops task loop add|remove <task> <person>`, and the `looped in` line and `loopedIn` of `ops task show`), and `sk-ops-use_operations` give it.
- **Your Reviews** lists the open requests that you asked of other people ("You asked for"). `reviews.mine` gives them as `sent`, and `ops review list` shows them in the section `you asked for`.

# 0.4.0

- The review queue of NUU Ops (Task 402 of the NUU Operations Flint): a person or an agent asks a person to review a task, and the request goes into **Your Reviews** of the web app with a notification. The model (`knw-ops-data_model` § Review Queue: the table `queue_items`, the cache `tasks.review`, the rules, the ops `reviews.*`, and the codes), the CLI knowledge (`ops task review request|approve|changes|dismiss|cancel` and `ops review list`), and `sk-ops-use_operations` give it.

# 0.3.3

- NUU Ops removed the task types (operator page feedback, 2026-11-03): no `task.dev`, no stages, and no type fields. The model, the CLI knowledge, `sk-ops-use_operations`, and `sk-ops-create_task` lose `ops task stage|retype|field|commit`, `ops task type list|show`, `--type` and `--stage` of `ops task create` and `ops task list`, `tasks.setFields`, `tasks.setType`, `taskStages.set`, `taskTypes.list|get`, and the error codes of the stages and the types. `--repo` of `ops task create` adds a `repo` related link. A task address is `task/<id>`; an old `task.dev/<id>` address still finds the task.

# 0.3.2

- The facts of the two reviewers of ops-cli-publish-1023. `sk-ops-use_operations` and `knw-ops-cli` give `ops project link|unlink` (NUU Connect URIs, `connect_bad_request`), the references of `ops activity row` (also a notepad), the inputs of `ops people show` (not `me`), `groupId` in the JSON of `ops task group create|update`, the personal `ops day candidates` (`day_plan_personal_only`), and the hidden fields, caps, and `query_bad_cursor` of `ops query`.
- A member cannot delete a shared notepad of a team org (`owner-only`): the agent asks an owner or an admin. The work-around of 0.3.0 (make it personal, then delete) is gone: it is an open access question.

# 0.3.1

- The second pass of ops-cli-publish-1023 (2026-10-23). `ops query` is checked against the CLI: the forms of `--where` (also `f==v`, `!f?`, `'f in a,b,c'`), the values, the index, the pages and the 5000-row bound, the error codes, and the rule that `ops query tables` is the source of truth for the readable tables. The two pass-2 warnings are gone.
- `sk-ops-use_operations` and `knw-ops-cli` give the commands of the lanes: `ops address`, `ops people search|show`, `ops deployment add|sections`, `ops deliverable status`, `ops project create|update --deployment`, `ops task create --type --stage`, `ops task link|unlink|related|session-state|launch accept`, `ops task group update`, `ops home stats|recents|activity|brief`, `ops day candidates`, `ops comment count`, `ops notepad share|mentions`, `ops activity row|facets`, `ops notify read-key`, and the traps (`owner-only` deletes, `subsection_not_done`, the `--yes` rules, `blocker delay <date>`).
- The install and the sign-in: the npm package `@nuucognition/ops-cli` (not published yet, Node.js 24 or newer, one prod-only command `ops`), and the shared credential `~/.nuucognition/auth.json` of `nuu login`, `flint login`, and `ops login`.
- The new ops reach prod at the next prod deploy; until then a new command on prod gives `agent_unknown_operation`.
- `knw-ops-data_model`: each blocker write is a Waybill gesture in the scope `org:<org>`.

# 0.3.0

- The work of ops-cli-publish-1023 (2026-10-23). The new main skill `sk-ops-use_operations` is the entry point of the shard. It gives an agent with no other context: what Operations is, the model (orgs, projects, deliverables, sections and their homes, tasks and subtasks, task groups, types and stages, deployments and their inboxes, plans and steps, deadlines, blockers, notepads, comments, day plans, addresses), the two builds (`ops` prod, `ops-dev` dev) and the sign-in, how to pick an org, references and places, `--json` and the error codes, the command for each job, `ops query` and `ops call`, ten recipes, the safety rules, and troubleshooting.
- `init-ops` names the main skill first. The model has blockers, typed tasks, task groups, and day plans. The job table has blockers, the day plan, `ops query`, and `ops call`. `ops blocker delete` needs `--yes`.
- `knw-ops-cli` gives the commands `blocker`, `notepad`, `day`, and `query` (with the rules of the backend `agentQuery`: the readable tables, the limits, the error codes), and `ops task context`. `knw-ops-data_model` gives `## Blockers`, `## Other Tables` (the tables that had no section), the `blocker_*` error codes, and the fix that the task field `blocked` is a read cache of the oldest open blocker.
- `wkfl-ops-interact` maps a request with the job table of the main skill. `wkfl-ops-plan_layout` loads the build (`flint shard start ops`).
- `ops query` is new in the CLI (the query lane of ops-cli-publish-1023). The skill and `knw-ops-cli` give its design; a second pass checks the flags against the CLI.

# 0.2.1

- The fixes of the fresh-agent test of ops-command-1021: the `ops` on PATH can be the prod build, which writes to PROD whatever `OPS_DATA_MODE` says. The init (§ Prerequisite, § Before You Write), `knw-ops-cli`, and each skill now say to read `build mode` of `ops mode` before the first write, give the DEV command (the dev launcher of the checkout), and the check that `ops --help` lists `headers`, `route`, `search`, and `section`.
- `sk-ops-create_task`: no place fits below a score of 0.3, or with the reason "A recent project"; the next steps.
- `sk-ops-triage_inbox` and `knw-ops-data_model`: `ops task update --tag|--every` changes the tag and the recurrence; the section of `start-deliverable` is "From the inbox".

# 0.2.0

- The revamp of Ops (ops-command-1021, 2026-10-21). The source moved to the NUU Flint (`shard-spec` 0.4.0, `shard: "@nuucognition/operations"`).
- The init gives the model in eight points, the job-to-command table, the new web links, and the workflows with five new skills: `create_task`, `move_tasks`, `triage_inbox`, `plan_deliverable`, `read_task_map`.
- `knw-ops-cli` follows the README of the CLI: sections, places of `--to`, paths and addresses, subtasks and the task map, deliverable done, abstract deployments and the inbox, `ops headers`, `ops route`, `ops search`.
- `knw-ops-data_model` gives the new model, with each old word (subsection, closer, backlog folders, the deployment chain) named one time.
- The workflows use the new commands. A session loads the build with `flint shard start ops`.

# 0.1.1

- One workflow for each mode (NUU Orbh Task 748). The four workflows (`interact`, `plan_layout`, `backlog_triage`, `deliverable_setup`) have `> [!headless]` callouts in their stages, and `init-ops` has a `# Headless` section. The four `hwkfl-ops-*` files and `hinit-ops` are deleted. A headless session loads the source with `flint shard start-dev ops`.

# 0.1.0

- Initial shard scaffold
