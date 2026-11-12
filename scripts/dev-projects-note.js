#!/usr/bin/env node
// projects-note of the Operations shard: write the Mesh note of the Ops projects that matter to this Flint.
// Invocation: flint shard ops projects-note [--org <org>] [--dry-run]
// The note is `Mesh/(System) Ops Projects.md`. The setup of the shard (setup-ops.md) runs this script one time, and
// the init tells an agent to read the note. Run the script again to refresh the note.
// 1. It reads the note that exists (LF or CRLF line ends): its id, its `# Notes` text (the text of a person), its
//    orbh-sessions, and its two project sections. It refuses a file at that path that the script did not write (no
//    line `generated-by: "flint shard ops projects-note"`).
// 2. It reads this Flint: `flint org show --json` (the id, the name, the address, and the org).
// 3. It reads the org in Ops with `<ops>` (NUU_OPS_CLI, default `ops`; see note-lib):
//    - `ops project list --json`: each project with its address, status, description, and context.
//    - `ops headers --json`: the deliverables (done or open) and the deployments of each project.
//    - `ops query deliverables|projects --where flintAddress? | flintId? --all --json`: the Flint places.
//    - `ops route "<the name and the purpose of this Flint>" --json`: the places that Ops gives for this Flint.
// 4. A project matters to this Flint when (a) it or one of its deliverables has the Flint place of this Flint
//    (flintId is the id of this Flint, or flintAddress names `flint/<slug of this Flint>`), (b) its name is the name
//    of this Flint, or (c) the route gives a place in it with a score of 0.3 or more.
// 5. It writes the note. It keeps the `id`, the text under `# Notes`, and the line ends of the note that exists.
//    Before the write, it takes the lock of the note and reads the note again. When the note changed after step 1
//    (a person or another session wrote it), it writes nothing and refuses with the code `note_changed`.
// Failed reads:
// - The project list fails: with a note that exists, the script writes nothing (the note keeps its data). With no
//   note, it writes a note with the section `## Status` and the reason (the setup needs a note).
// - Another read fails (headers, a Flint-place query, the route): the note gets `## Status` (incomplete) with each
//   failed read and `complete: false`. It keeps the two project sections of the note that exists, when there is one.
// - Each failed read is in `failed` of the output, `ok` is false, and the exit code is 1.
// Output: one JSON document { ok, path, org, flint, linked, likely, projects, changed, complete, failed }. With
// --dry-run, it prints the note in `note` and writes nothing.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// The shared code: note-lib.js in the shard, dev-note-lib.js in the source.
const n = require(fs.existsSync(path.join(__dirname, 'note-lib.js')) ? './note-lib.js' : './dev-note-lib.js');

const { lib, TaskError } = n;

const USAGE = 'Usage: flint shard ops projects-note [--org <org>] [--dry-run].';
const NOTE_PATH = path.join('Mesh', '(System) Ops Projects.md');
const NOTES_HEADING = '# Notes';
const LINKED_HEADING = '## Projects of This Flint';
const LIKELY_HEADING = '## Other Likely Projects';
const GENERATED = 'generated-by: "flint shard ops projects-note"';
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
    body = fs.readFileSync(path.join(root, 'Mesh', '(System) Flint Init.md'), 'utf8').replace(/\r\n?/g, '\n');
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

/** The raw text of a file, or null when the file does not exist. */
function readRaw(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw new TaskError(`The note ${NOTE_PATH} cannot be read: ${error.message}. Nothing changed.`);
  }
}

/** The lines of a section: from its heading line to the line before the next heading of level 1 or 2, or null. */
function sectionOf(text, heading) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.trimEnd() === heading);
  if (start < 0) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^#{1,2} /.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trimEnd();
}

/**
 * Read the note that exists. The text is read with LF and CRLF line ends. Gives `{ raw, eol, generated, id, notes,
 * sessions, linked, likely }`; `raw` is null when the note does not exist.
 */
function readPresent(file) {
  const raw = readRaw(file);
  if (raw === null) return { raw: null, eol: '\n', generated: false, id: null, notes: null, sessions: [], linked: null, likely: null };
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const text = raw.replace(/\r\n?/g, '\n');
  const front = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text);
  const frontText = front ? front[1] : '';
  const idMatch = /^id:[ \t]*(\S+)[ \t]*$/m.exec(frontText);
  const sessions = [];
  const block = /^orbh-sessions:\n((?:[ \t]+-[ \t].*(?:\n|$))*)/m.exec(`${frontText}\n`);
  if (block) {
    for (const line of block[1].split('\n')) {
      const item = /^[ \t]+-[ \t]+"?\[\[([^\]]+)\]\]"?[ \t]*$/.exec(line);
      if (item) sessions.push(item[1]);
    }
  }
  const lines = text.split('\n');
  const at = lines.findIndex((line) => line.trimEnd() === NOTES_HEADING);
  const notes = at < 0 ? null : lines.slice(at + 1).join('\n').trim();
  return {
    raw,
    eol,
    generated: frontText.split('\n').some((line) => line.trim() === GENERATED),
    id: idMatch ? idMatch[1] : null,
    notes,
    sessions,
    linked: sectionOf(text, LINKED_HEADING),
    likely: sectionOf(text, LIKELY_HEADING),
  };
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

/** The text of the note, with LF line ends. */
function noteText(state) {
  const { flint, org, id, notes, sessions, failure, failed, kept, linked, likely, projects, headers, now } = state;
  const front = ['---', `id: ${id}`, 'tags:', '  - "#ops/projects"', `ops-org: ${JSON.stringify(org)}`];
  if (flint.address) front.push(`flint: ${JSON.stringify(flint.address)}`);
  front.push(`updated: ${now}`, GENERATED);
  if (failed.length > 0) front.push('complete: false');
  if (sessions.length > 0) front.push('orbh-sessions:', ...sessions.map((s) => `  - "[[${s}]]"`));
  front.push('---', '');
  const body = ['# Ops Projects', ''];
  body.push(`This note lists the projects of the Ops org \`${org}\` that matter to the Flint ${flint.name}. The script \`flint shard ops projects-note\` wrote it on ${now.slice(0, 10)} from the ops CLI. Run the script again to refresh the note. The script keeps the section \`${NOTES_HEADING}\`. It writes the other sections again.`, '');
  body.push('Use this note to know the work of this Flint, and to choose the place of a new task. For the current state of a project, read Ops: `ops project show "<address>" --json`.', '');
  if (failure) {
    body.push('## Status', '', `The read of the projects failed: ${failure}`, '', 'Next: fix the cause, then run `flint shard ops projects-note` again.', '');
  } else {
    if (failed.length > 0) {
      body.push('## Status', '', 'This note is incomplete. These reads of Ops failed:', '');
      for (const item of failed) body.push(`- \`${item.read}\`: ${item.code || 'error'}`);
      body.push('');
      body.push(kept
        ? 'The two project sections below are the sections of the last note. The table of all projects is new.'
        : 'The project sections below can miss projects.');
      body.push('', 'Next: fix the cause, then run `flint shard ops projects-note` again.', '');
    }
    if (kept) {
      body.push(kept.linked, '', kept.likely || `${LIKELY_HEADING}\n\nThe last note has no likely projects.`, '');
    } else {
      body.push(LINKED_HEADING, '');
      if (linked.length === 0) {
        body.push(`No project and no deliverable has the Flint place of this Flint. A person sets it with \`ops agents defaults set <project or deliverable> --flint "${flint.address || '<Flint address>'}"\`.`, '');
      } else {
        body.push('These projects, or one of their deliverables, have the Flint place of this Flint (`flintAddress` or `flintId`), or have the name of this Flint.', '');
        for (const item of linked) body.push(...projectLines(org, item.project, item.why, headers));
      }
      body.push(LIKELY_HEADING, '');
      if (likely.length === 0) {
        body.push(`The route decision of Ops (\`ops route\`) gives no other project with a score of ${ROUTE_MIN} or more for this Flint.`, '');
      } else {
        body.push('The route decision of Ops (`ops route`) on the name and the purpose of this Flint gives places in these projects. A score below 0.5 is a guess.', '');
        for (const item of likely) body.push(...projectLines(org, item.project, item.why, headers));
      }
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

/** The refusal of a note that changed after the first read. */
function changedError() {
  const error = new TaskError(`The note ${NOTE_PATH} changed while the script read Ops: a person or another session wrote it. The script wrote nothing, and the note keeps that change. Run the command again: it reads the new text and keeps the section ${NOTES_HEADING}.`);
  error.code = 'note_changed';
  return error;
}

/**
 * Write the note. For a note that exists: take its lock, read it again, refuse when it is not the text of the first
 * read, then replace it in one step (a temporary file and a rename). For a new note: a hard link of the temporary
 * file, which refuses when another writer made the file first.
 */
function writeNote(root, file, text, firstRaw) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(temp, text);
  try {
    if (firstRaw === null) {
      try {
        fs.linkSync(temp, file);
      } catch (error) {
        if (error && error.code === 'EEXIST') throw changedError();
        throw error;
      }
      return;
    }
    lib.withLocks(root, [file], () => {
      if (readRaw(file) !== firstRaw) throw changedError();
      fs.renameSync(temp, file);
    });
  } finally {
    fs.rmSync(temp, { force: true });
  }
}

n.run('projects-note', (argv) => {
  const { positional, options } = n.parseArgs(argv, { values: ['org'], flags: ['dry-run'], usage: USAGE });
  if (positional.length > 0) throw new TaskError(`projects-note takes no argument. ${USAGE} Nothing changed.`);
  const root = n.flintRoot();
  const file = path.join(root, NOTE_PATH);
  // 1. The note that exists, before any other read.
  const present = readPresent(file);
  if (present.raw !== null && present.raw.trim() !== '' && !present.generated) {
    throw new TaskError(`The file ${NOTE_PATH} exists, and this script did not write it (it has no line ${GENERATED}). Move or rename that file, then run the command again. Nothing changed.`);
  }
  // 2. The Flint.
  const shown = n.flintJson(['org', 'show', '--json'], root, 'The read of the Flint');
  const flint = {
    id: shown && shown.flint && typeof shown.flint.id === 'string' ? shown.flint.id : '',
    name: shown && shown.flint && typeof shown.flint.name === 'string' ? shown.flint.name.trim() : path.basename(root),
    address: shown && typeof shown.address === 'string' ? shown.address : '',
  };
  const flintOrg = shown && shown.org && typeof shown.org.slug === 'string' ? shown.org.slug.trim() : '';
  const org = options.org || flintOrg || 'me';
  const session = process.env.ORBH_SESSION_ID;
  const sessions = session && !present.sessions.includes(session) ? [...present.sessions, session] : present.sessions;
  const state = {
    flint, org, sessions,
    id: present.id || crypto.randomUUID(),
    notes: present.notes,
    now: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    failure: null, failed: [], kept: null, linked: [], likely: [], projects: [], headers: {},
  };
  const result = { ok: true, path: NOTE_PATH, org, flint: flint.address || flint.name, linked: [], likely: [], projects: 0, changed: false, complete: true, failed: [] };
  const finish = () => {
    result.failed = state.failed;
    result.complete = state.failure === null && state.failed.length === 0;
    if (!result.complete) result.ok = false;
  };

  // 3. The reads of Ops.
  const list = opsRead(root, ['project', 'list', '--status', 'all', '--org', org]);
  if (!list.ok || !Array.isArray(list.json)) {
    state.failure = `\`ops project list --org ${org}\` gave ${list.code || 'an error'}: ${oneLine(n.scrub(list.error || 'the output is not a JSON list'), 300)}`;
    state.failed.push({ read: `ops project list --org ${org}`, code: list.code || 'error' });
    result.error = `The read of the projects failed: ${list.error || 'the output is not a JSON list'}.`;
    result.next = list.code === 'auth_required' || list.code === 'unauthenticated'
      ? 'Sign in (ops login or nuu login), then run: flint shard ops projects-note'
      : 'Check the org (ops whoami), then run: flint shard ops projects-note --org <org>';
    if (present.raw !== null) {
      // The note that exists keeps all its data: the script writes nothing.
      finish();
      result.kept = true;
      n.printJson(result);
      process.exitCode = 1;
      return null;
    }
  } else {
    state.projects = list.json.filter((p) => p && typeof p === 'object' && typeof p.address === 'string');
    const headers = opsRead(root, ['headers', '--org', org]);
    if (headers.ok && headers.json && typeof headers.json === 'object') state.headers = headers.json;
    else state.failed.push({ read: `ops headers --org ${org}`, code: headers.code || 'error' });
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
        if (!rows.ok || !rows.json || !Array.isArray(rows.json.rows)) {
          state.failed.push({ read: `ops query ${table} --where ${field}? --all --org ${org}`, code: rows.code || 'error' });
          continue;
        }
        for (const row of rows.json.rows) {
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
    if (!route.ok || !route.json || !Array.isArray(route.json.candidates)) state.failed.push({ read: `ops route "<the name and the purpose of this Flint>" --org ${org}`, code: route.code || 'error' });
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
    // A failed read keeps the two project sections of the note that exists.
    if (state.failed.length > 0 && present.linked) state.kept = { linked: present.linked, likely: present.likely };
    result.linked = state.kept ? null : state.linked.map((item) => item.project.name);
    result.likely = state.kept ? null : state.likely.map((item) => item.project.name);
    if (state.kept) result.kept = true;
    result.projects = state.projects.length;
    if (state.failed.length > 0) result.error = `${state.failed.length} read(s) of Ops failed: the note is incomplete.`;
  }
  finish();

  // 4. The note, with the line ends of the note that exists.
  const lf = noteText(state);
  const text = present.eol === '\r\n' ? lf.replace(/\n/g, '\r\n') : lf;
  if (options['dry-run']) {
    n.printJson({ ...result, dryRun: true, note: text });
    if (!result.ok) process.exitCode = 1;
    return null;
  }
  const strip = (t) => String(t || '').replace(/^updated: .*$/m, '');
  result.changed = present.raw === null || strip(present.raw) !== strip(text);
  if (result.changed) {
    try {
      writeNote(root, file, text, present.raw);
    } catch (error) {
      if (!(error instanceof TaskError) || error.code !== 'note_changed') throw error;
      n.printJson({ ...result, ok: false, changed: false, code: 'note_changed', error: error.message, next: 'flint shard ops projects-note' });
      process.exitCode = 1;
      return null;
    }
  }
  n.printJson(result);
  if (!result.ok) process.exitCode = 1;
  return null;
});
