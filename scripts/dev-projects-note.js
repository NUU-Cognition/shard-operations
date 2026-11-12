#!/usr/bin/env node
// projects-note of the Operations shard: write the Mesh note of the Ops projects that matter to this Flint.
// Invocation: flint shard ops projects-note [--org <org>] [--dry-run]
// The note is `Mesh/(System) Ops Projects.md`. The setup of the shard (setup-ops.md) runs this script one time, and
// the init tells an agent to read the note. Run the script again to refresh the note.
// 1. It reads this Flint: `flint org show --json` (the id, the name, the address, and the org).
// 2. It reads the org in Ops with `<ops>` (NUU_OPS_CLI, default `ops`; see note-lib):
//    - `ops project list --json`: each project with its address, status, description, and context.
//    - `ops headers --json`: the deliverables (done or open) and the deployments of each project.
//    - `ops query deliverables|projects --where flintAddress? | flintId? --all --json`: the Flint places.
//    - `ops route "<the name and the purpose of this Flint>" --json`: the places that Ops gives for this Flint.
// 3. A project matters to this Flint when (a) it or one of its deliverables has the Flint place of this Flint
//    (flintId is the id of this Flint, or flintAddress names `flint/<slug of this Flint>`), (b) its name is the name
//    of this Flint, or (c) the route gives a place in it with a score of 0.3 or more.
// 4. It writes the note. It keeps the `id` of the note and the text under `# Notes` (the text of a person).
// Output: one JSON document { ok, path, org, flint, linked, likely, projects, changed }. When the read of the
// projects fails, the note still gets written with the reason, `ok` is false, `error` and `next` say what to do, and
// the exit code is 1. With --dry-run, it prints the note in `note` and writes nothing.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// The shared code: note-lib.js in the shard, dev-note-lib.js in the source.
const n = require(fs.existsSync(path.join(__dirname, 'note-lib.js')) ? './note-lib.js' : './dev-note-lib.js');

const { TaskError } = n;

const USAGE = 'Usage: flint shard ops projects-note [--org <org>] [--dry-run].';
const NOTE_PATH = path.join('Mesh', '(System) Ops Projects.md');
const NOTES_HEADING = '# Notes';
const NOTES_DEFAULT = 'Write here which projects matter to this Flint, and why. The script keeps this section when it writes the note again.';
const ROUTE_MIN = 0.3;
const ROUTE_TEXT_MAX = 600;

/** The web host of Ops: the dev host when OPS_DATA_MODE is dev, else the production host. */
function webHost() {
  return process.env.OPS_DATA_MODE === 'dev' ? 'http://localhost:3088' : 'https://ops.nuucognition.com';
}

/** The token of an org in a web path: `me` for a personal workspace, else the slug. */
function webOrg(org) {
  return org === 'me' || /^user_/.test(org) ? 'me' : org;
}

/** One line of text with no line breaks and at most `max` characters. */
function oneLine(text, max) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** The name and the purpose of this Flint: the name, and the first prose of its Flint Init (no code, no links). */
function routeText(root, name) {
  let body = '';
  try {
    body = fs.readFileSync(path.join(root, 'Mesh', '(System) Flint Init.md'), 'utf8');
  } catch {
    return name;
  }
  body = body.replace(/^---\n[\s\S]*?\n---\n?/, '').replace(/```[\s\S]*?```/g, ' ');
  body = body.replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2').replace(/[#>*`|_]/g, ' ');
  const prose = oneLine(body, ROUTE_TEXT_MAX);
  return prose.length >= 40 ? `${name}. ${prose}` : name;
}

/** Run `<ops> <args> --json` and give `{ ok, json, error, code }`. It never throws. */
function opsRead(root, args) {
  const result = n.runOps([...args, '--json'], root);
  return { ok: result.ok, json: result.json, error: result.error, code: result.report ? result.report.code : null };
}

/** The slug of a Flint address: `@v1/<org>/flint/<slug>` gives `<slug>`. */
function flintSlug(address) {
  const match = /\/flint\/([a-z0-9-]+)/i.exec(String(address || ''));
  return match ? match[1].toLowerCase() : '';
}

/** True when a Flint place (flintId, flintAddress) names this Flint. A typo in the org still matches the slug. */
function namesThisFlint(row, flint) {
  if (flint.id && typeof row.flintId === 'string' && row.flintId.trim().toLowerCase() === flint.id.toLowerCase()) return true;
  const slug = flintSlug(row.flintAddress);
  return slug !== '' && slug === flintSlug(flint.address);
}

/** A name for a compare: lower case, no `NUU ` at the start, no other characters than letters and digits. */
function nameKey(name) {
  return String(name || '').toLowerCase().replace(/^nuu\s+/, '').replace(/[^a-z0-9]+/g, '');
}

/** Read the note that exists: its id, its `# Notes` text, and its orbh-sessions. */
function readPresent(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { id: null, notes: null, sessions: [] };
  }
  const front = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  const idMatch = front ? /^id:\s*(\S+)\s*$/m.exec(front[1]) : null;
  const sessions = [];
  if (front) {
    const block = /^orbh-sessions:\n((?:\s+-\s.*\n?)*)/m.exec(`${front[1]}\n`);
    if (block) {
      for (const line of block[1].split('\n')) {
        const item = /^\s+-\s+"?\[\[([^\]]+)\]\]"?\s*$/.exec(line);
        if (item) sessions.push(item[1]);
      }
    }
  }
  const at = text.indexOf(`\n${NOTES_HEADING}\n`);
  const notes = at < 0 ? null : text.slice(at + NOTES_HEADING.length + 2).trim();
  return { id: idMatch ? idMatch[1] : null, notes, sessions };
}

/** The lines of one project of the note. */
function projectLines(org, project, why, headers) {
  const lines = [`### ${project.name}`, ''];
  lines.push(`- Address: \`${project.address}\``);
  if (project._id) lines.push(`- Web: ${webHost()}/${webOrg(org)}/projects/${project._id}`);
  lines.push(`- Status: ${project.status || 'unknown'}`);
  lines.push(`- Why: ${why.join('; ')}.`);
  if (project.description) lines.push(`- Description: ${oneLine(project.description, 300)}`);
  if (project.context) lines.push(`- Context: ${oneLine(project.context, 300)} (all of it: \`ops project context show "${project.address}"\`)`);
  const deliverables = (headers.deliverables || []).filter((d) => d.projectId === project._id && !d.done);
  if (deliverables.length > 0) {
    lines.push(`- Open deliverables: ${deliverables.slice(0, 12).map((d) => `${d.title} (\`${d.address}\`)`).join(', ')}${deliverables.length > 12 ? `, and ${deliverables.length - 12} more` : ''}`);
  }
  const deployments = (headers.deployments || []).filter((d) => d.projectId === project._id);
  if (deployments.length > 0) {
    lines.push(`- Deployments: ${deployments.slice(0, 8).map((d) => `${d.title}${d.version ? ` ${d.version}` : ''}, ${d.status || 'unknown'} (\`${d.address}\`)`).join(', ')}`);
  }
  lines.push('');
  return lines;
}

/** The text of the note. */
function noteText(state) {
  const { flint, org, id, notes, sessions, failure, linked, likely, projects, headers, now } = state;
  const front = ['---', `id: ${id}`, 'tags:', '  - "#ops/projects"', `ops-org: ${JSON.stringify(org)}`];
  if (flint.address) front.push(`flint: ${JSON.stringify(flint.address)}`);
  front.push(`updated: ${now}`, `generated-by: "flint shard ops projects-note"`);
  if (sessions.length > 0) front.push('orbh-sessions:', ...sessions.map((s) => `  - "[[${s}]]"`));
  front.push('---', '');
  const body = ['# Ops Projects', ''];
  body.push(`This note lists the projects of the Ops org \`${org}\` that matter to the Flint ${flint.name}. The script \`flint shard ops projects-note\` wrote it on ${now.slice(0, 10)} from the ops CLI. Run the script again to refresh the note. The script keeps the section \`${NOTES_HEADING}\` and writes the other sections again.`, '');
  body.push('Use this note to know the work of this Flint, and to choose the place of a new task. For the current state of a project, read Ops: `ops project show "<address>" --json`.', '');
  if (failure) {
    body.push('## Status', '', `The read of the projects failed: ${failure}`, '', 'Next: fix the cause, then run `flint shard ops projects-note` again.', '');
  } else {
    body.push('## Projects of This Flint', '');
    if (linked.length === 0) {
      body.push(`No project and no deliverable has the Flint place of this Flint. A person sets it with \`ops agents defaults set <project or deliverable> --flint "${flint.address || '<Flint address>'}"\`.`, '');
    } else {
      body.push('These projects, or one of their deliverables, have the Flint place of this Flint (`flintAddress` or `flintId`), or have the name of this Flint.', '');
      for (const item of linked) body.push(...projectLines(org, item.project, item.why, headers));
    }
    body.push('## Other Likely Projects', '');
    if (likely.length === 0) {
      body.push(`The route decision of Ops (\`ops route\`) gives no other project with a score of ${ROUTE_MIN} or more for this Flint.`, '');
    } else {
      body.push(`The route decision of Ops (\`ops route\`) on the name and the purpose of this Flint gives places in these projects. A score below 0.5 is a guess.`, '');
      for (const item of likely) body.push(...projectLines(org, item.project, item.why, headers));
    }
    body.push('## All Projects of the Org', '');
    const shown = projects.filter((p) => p.status !== 'archived');
    body.push(`The org has ${projects.length} projects. This table shows the ${shown.length} projects that are not archived.`, '');
    body.push('| Project | Status | Address |', '|---|---|---|');
    for (const p of shown) body.push(`| ${String(p.name).replace(/\|/g, '\\|')} | ${p.status || ''} | \`${p.address}\` |`);
    body.push('');
  }
  body.push(NOTES_HEADING, '', notes && notes.length > 0 ? notes : NOTES_DEFAULT, '');
  return `${front.join('\n')}\n${body.join('\n')}`;
}

/** Write a file in one step: a temporary file beside it, then a rename. */
function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, text);
  fs.renameSync(temp, file);
}

n.run('projects-note', (argv) => {
  const { positional, options } = n.parseArgs(argv, { values: ['org'], flags: ['dry-run'], usage: USAGE });
  if (positional.length > 0) throw new TaskError(`projects-note takes no argument. ${USAGE} Nothing changed.`);
  const root = n.flintRoot();
  const shown = n.flintJson(['org', 'show', '--json'], root, 'The read of the Flint');
  const flint = {
    id: shown && shown.flint && typeof shown.flint.id === 'string' ? shown.flint.id : '',
    name: shown && shown.flint && typeof shown.flint.name === 'string' ? shown.flint.name.trim() : path.basename(root),
    address: shown && typeof shown.address === 'string' ? shown.address : '',
  };
  const flintOrg = shown && shown.org && typeof shown.org.slug === 'string' ? shown.org.slug.trim() : '';
  const org = options.org || flintOrg || 'me';
  const file = path.join(root, NOTE_PATH);
  const present = readPresent(file);
  const session = process.env.ORBH_SESSION_ID;
  const sessions = session && !present.sessions.includes(session) ? [...present.sessions, session] : present.sessions;
  const state = {
    flint, org, sessions,
    id: present.id || crypto.randomUUID(),
    notes: present.notes,
    now: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    failure: null, linked: [], likely: [], projects: [], headers: {},
  };
  const result = { ok: true, path: NOTE_PATH, org, flint: flint.address || flint.name, linked: [], likely: [], projects: 0, changed: false };

  const list = opsRead(root, ['project', 'list', '--status', 'all', '--org', org]);
  if (!list.ok || !Array.isArray(list.json)) {
    state.failure = `\`ops project list --org ${org}\` gave ${list.code || 'an error'}: ${oneLine(n.scrub(list.error || 'the output is not a JSON list'), 300)}`;
    result.ok = false;
    result.error = `The read of the projects failed: ${list.error || 'the output is not a JSON list'}.`;
    result.next = list.code === 'auth_required' || list.code === 'unauthenticated'
      ? 'Sign in (ops login or nuu login), then run: flint shard ops projects-note'
      : `Check the org (ops whoami), then run: flint shard ops projects-note --org <org>`;
  } else {
    state.projects = list.json.filter((p) => p && typeof p === 'object' && typeof p.address === 'string');
    const headers = opsRead(root, ['headers', '--org', org]);
    state.headers = headers.ok && headers.json && typeof headers.json === 'object' ? headers.json : {};
    const byId = new Map(state.projects.map((p) => [p._id, p]));
    const why = new Map();
    const add = (projectId, reason) => {
      if (!byId.has(projectId)) return;
      if (!why.has(projectId)) why.set(projectId, []);
      if (!why.get(projectId).includes(reason)) why.get(projectId).push(reason);
    };
    // (a) The Flint places of the projects and of the deliverables.
    for (const table of ['projects', 'deliverables']) {
      for (const field of ['flintAddress', 'flintId']) {
        const rows = opsRead(root, ['query', table, '--where', `${field}?`, '--all', '--org', org]);
        const items = rows.ok && rows.json && Array.isArray(rows.json.rows) ? rows.json.rows : [];
        for (const row of items) {
          if (!namesThisFlint(row, flint)) continue;
          if (table === 'projects') add(row._id, 'the Flint place of the project is this Flint');
          else add(row.projectId, `the Flint place of the deliverable ${row.title || row._id} is this Flint`);
        }
      }
    }
    // (b) The name of the project is the name of this Flint.
    for (const p of state.projects) {
      if (nameKey(p.name) !== '' && nameKey(p.name) === nameKey(flint.name)) add(p._id, 'the name of the project is the name of this Flint');
    }
    state.linked = [...why.entries()].map(([id, reasons]) => ({ project: byId.get(id), why: reasons }));
    // (c) The route decision of Ops.
    const route = opsRead(root, ['route', routeText(root, flint.name), '--org', org]);
    const candidates = route.ok && route.json && Array.isArray(route.json.candidates) ? route.json.candidates : [];
    const likely = new Map();
    for (const c of candidates) {
      const place = c && c.place ? c.place : {};
      const projectId = place.kind === 'project' ? place.id : place.projectId;
      if (!projectId || why.has(projectId) || !byId.has(projectId) || typeof c.score !== 'number' || c.score < ROUTE_MIN) continue;
      if (!likely.has(projectId)) likely.set(projectId, []);
      if (likely.get(projectId).length < 2) likely.get(projectId).push(`the route gives the place ${place.path || place.title || place.id} (score ${c.score.toFixed(2)}: ${oneLine(c.reason, 120)})`);
    }
    state.likely = [...likely.entries()].slice(0, 8).map(([id, reasons]) => ({ project: byId.get(id), why: reasons }));
    if (!route.ok) result.warning = `The route decision failed (${route.code || 'error'}): the note has no likely projects.`;
    result.linked = state.linked.map((item) => item.project.name);
    result.likely = state.likely.map((item) => item.project.name);
    result.projects = state.projects.length;
  }

  const text = noteText(state);
  if (options['dry-run']) {
    n.printJson({ ...result, dryRun: true, note: text });
    if (!result.ok) process.exitCode = 1;
    return null;
  }
  let before = null;
  try {
    before = fs.readFileSync(file, 'utf8');
  } catch {
    before = null;
  }
  const strip = (t) => String(t || '').replace(/^updated: .*$/m, '');
  result.changed = before === null || strip(before) !== strip(text);
  if (result.changed) writeAtomic(file, text);
  n.printJson(result);
  if (!result.ok) process.exitCode = 1;
  return null;
});
