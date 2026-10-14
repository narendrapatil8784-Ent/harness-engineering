#!/usr/bin/env node
// Kiro AgentStop hook — rebuild docs/activity/activity.jsonl from Kiro's local
// on-disk session store. Self-contained (Node only, no `harness` CLI / Python /
// PATH dependency beyond `node`, which Kiro already requires for its other
// hooks) — the same pattern Claude Code's harness-activity.mjs uses, which is
// why THAT one auto-populates: a committed node script referenced by path, not
// a call out to an external CLI that may not be installed on PATH.
//
// This is a faithful JS port of src/harness/site/kiro_activity_backfill.py —
// same reconstruction (command, feature, interventions, duration, credits,
// outcome, code-change metrics, subagent attribution) and the same
// replace-rebuilt / preserve-unknown-sessions merge contract. Every field read
// here was confirmed against real captured session data (see the Python
// module's docstring). Kept in sync with that module.
//
// Fires on AgentStop (each turn end). Reads ALL sessions whose session.json
// workspacePaths matches THIS project root (process.cwd(), since Kiro runs hook
// commands from the project root) and rewrites the whole log — so a run started
// before the current turn finished is picked up on the next fire. Never throws,
// never blocks: any failure exits 0 with the log untouched.
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync, renameSync, rmdirSync, unlinkSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { execSync, execFileSync } from 'node:child_process';

function safe(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}
// Never break the user's turn: an unexpected session shape that slips past the
// guards below ends the hook quietly, log untouched.
let cleanup = () => {}; // set once the log lock is held
process.on('uncaughtException', () => { cleanup(); process.exit(0); });

const ACTIVITY_FILE = 'activity.jsonl';
const GA_BODY = 'activity.jsonl merge=union eol=lf\n';

// ---- small primitives (mirror the Python module) --------------------------

const PLAIN_CMD = /^\/([\w:-]+)(?:\s|$)/;
const FEATURE = /([A-Z]{2,}-\d+)/;

function detectCommand(text) {
  if (!text) return null;
  const m = String(text).trim().match(PLAIN_CMD);
  return m ? '/' + m[1] : null;
}

function parseMs(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

function eventMs(ev) {
  return parseMs(ev && ev.timestamp);
}

function readJsonl(path) {
  const raw = safe(() => readFileSync(path, 'utf8'), null);
  if (raw === null) return [];
  const out = [];
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const o = safe(() => JSON.parse(t), null);
    if (o) out.push(o);
  }
  return out;
}

// ---- active time + own commits (mirror kiro_activity_backfill.py) ----------

// Same contract as the Claude writers: duration_s = wall_duration_s -
// question_wait_s - prompt_idle_s. Kiro's human waits are its
// pending_interaction -> interaction_resolved pairs (tool approvals and
// user_input prompts), matched by toolCallId; `header` is the interaction type
// only — Kiro's `question` field holds the full command or question text,
// which is never stored. Only ACTIVITY_TYPES lines are work; the rest are
// bookkeeping stamped at turn boundaries, as are Kiro's own startup tool calls
// (SYSTEM_TOOLS). A session_start marks a reopened session: the gap before the
// next activity is idle.
const ACTIVITY_TYPES = new Set([
  'user', 'assistant', 'tool_call', 'tool_result', 'sub_agent_start',
  'sub_agent_complete', 'pending_interaction', 'interaction_resolved',
]);
// Tool calls Kiro itself makes when the app (re)opens — not agent work, and
// often days after the last real activity.
const SYSTEM_TOOLS = new Set(['fetch_cloud_config']);
const QUESTIONS_CAP = 50;
function activeTime(span) {
  const startMs = span.length ? eventMs(span[0]) : null;
  let spanEndMs = startMs;
  let activeEndMs = startMs;
  let prevMs = startMs;
  let idleMs = 0;
  let resumed = false; // a session_start since the last activity: the session was closed
  const systemCalls = new Set();
  const pending = new Map(); // toolCallId -> {ms, ts, header}
  let count = 0;
  let waitS = 0;
  let maxWait = 0;
  const waits = [];
  for (const ev of span.slice(1)) {
    const m = eventMs(ev);
    if (m === null) continue;
    spanEndMs = m;
    const p = ev.payload || {};
    if (p.type === 'session_start') resumed = true;
    if (p.type === 'tool_call' && SYSTEM_TOOLS.has(p.toolName)) { systemCalls.add(String(p.toolCallId)); continue; }
    if (p.type === 'tool_result' && systemCalls.has(String(p.toolCallId))) continue;
    if (!ACTIVITY_TYPES.has(p.type)) continue;
    if (resumed && prevMs !== null && m > prevMs) {
      // Kiro reopened the session (startup tool calls follow): the time it was
      // closed is not work.
      idleMs += m - prevMs;
      prevMs = m;
    }
    resumed = false;
    if (p.type === 'pending_interaction' && typeof p.toolCallId === 'string') {
      count++;
      pending.set(p.toolCallId, { ms: m, ts: ev.timestamp, header: String(p.interactionType || 'interaction') });
    } else if (p.type === 'interaction_resolved' && pending.has(p.toolCallId)) {
      const q = pending.get(p.toolCallId);
      pending.delete(p.toolCallId);
      const w = Math.max(0, Math.round((m - q.ms) / 1000));
      waitS += w;
      if (w > maxWait) maxWait = w;
      const rejected = p.outcome !== 'selected' || p.selectedOption === 'reject';
      if (waits.length < QUESTIONS_CAP) {
        waits.push({ asked_ts: q.ts, answered_ts: ev.timestamp, header: q.header, wait_s: w,
          outcome: rejected ? 'rejected' : 'answered' });
      }
    }
    if (p.type === 'user' && String(p.content || '').trim() && prevMs !== null && m > prevMs) idleMs += m - prevMs;
    prevMs = m;
    activeEndMs = m;
  }
  let wall = 0; let idleS = 0; let duration = 0;
  if (startMs !== null && spanEndMs !== null && spanEndMs > startMs) {
    idleMs += spanEndMs - activeEndMs; // trailing tail
    wall = Math.round((spanEndMs - startMs) / 1000);
    idleS = Math.round(idleMs / 1000);
    duration = Math.max(0, wall - waitS - idleS);
  }
  return {
    startMs,
    spanEndMs,
    fields: {
      duration_s: duration,
      wall_duration_s: wall,
      question_wait_s: waitS,
      prompt_idle_s: idleS,
      question_count: count,
      max_question_wait_s: maxWait,
      questions: waits,
    },
  };
}

// A commit counts only when it landed during one of the invocation's own
// `git commit` execute_bash calls (±1 s): author + time window alone also match
// a concurrent session. Same git rules as the Claude hook: this user's
// non-merge, non-root commits, lockfiles excluded; no owned commit -> the
// fs_write / str_replace scan stands.
const GIT_COMMIT = /\bgit\b[^\n|;&]*\bcommit\b/;
const LOCKFILES = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'uv.lock', 'poetry.lock', 'Cargo.lock'];
function commitCalls(evs) {
  const pending = new Map();
  const calls = [];
  for (const ev of evs) {
    const m = eventMs(ev);
    const p = ev.payload || {};
    if (m === null || typeof p.toolCallId !== 'string') continue;
    if (p.type === 'tool_call') {
      const cmd = (p.args || {}).command;
      if (p.toolName === 'execute_bash' && typeof cmd === 'string' && GIT_COMMIT.test(cmd)) pending.set(p.toolCallId, m);
    } else if (p.type === 'tool_result' && pending.has(p.toolCallId)) {
      calls.push([Math.floor(pending.get(p.toolCallId) / 1000) - 1, Math.ceil(m / 1000) + 1]);
      pending.delete(p.toolCallId);
    }
  }
  return calls;
}
function gitCommits(root, sinceMs, untilMs, author) {
  if (sinceMs === null || untilMs === null || !author || author === 'unknown') return null;
  const out = execFileSync('git', [
    'log', `--since=@${Math.floor(sinceMs / 1000)}`, `--until=@${Math.ceil(untilMs / 1000)}`,
    `--author=<${author}>`, '--fixed-strings', '--regexp-ignore-case', '--no-merges', '--min-parents=1',
    '--numstat', '--summary', '--format=%x00%ct',
    '--', '.', ...LOCKFILES.map((f) => `:(exclude,glob)**/${f}`),
  ], { cwd: root, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] });
  const commits = [];
  let cur = null;
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('\0')) { cur = { ct: Number(line.slice(1)), numstat: [], created: [] }; commits.push(cur); continue; }
    if (!cur) continue;
    const ns = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (ns) { cur.numstat.push([ns[3], ns[1] === '-' ? 0 : Number(ns[1])]); continue; }
    const cm = line.match(/^ create mode \d+ (.+)$/);
    if (cm) cur.created.push(cm[1]);
  }
  return commits;
}
function gitChangeCounts(commits, sinceMs, untilMs, calls) {
  if (!commits || sinceMs === null || untilMs === null || calls.length === 0) return null;
  const lo = Math.floor(sinceMs / 1000);
  const hi = Math.ceil(untilMs / 1000);
  const changed = new Set();
  const created = new Set();
  let added = 0;
  for (const c of commits) {
    if (c.ct < lo || c.ct > hi) continue;
    if (!calls.some(([a, b]) => a <= c.ct && c.ct <= b)) continue;
    for (const [path, n] of c.numstat) { changed.add(path); added += n; }
    for (const path of c.created) created.add(path);
  }
  if (changed.size === 0) return null;
  let modified = 0;
  for (const path of changed) if (!created.has(path)) modified++;
  return { created: created.size, modified, added };
}

// ---- pure extraction: one record per command invocation --------------------

function extractInvocations(events, { user, sessionId, subAgentEvents, repoRoot }) {
  subAgentEvents = subAgentEvents || {};

  const cmdIndices = [];
  for (let i = 0; i < events.length; i++) {
    const p = events[i].payload || {};
    if (p.type === 'user' && detectCommand(p.content || '')) cmdIndices.push(i);
  }

  const subStarts = [];
  for (const ev of events) {
    const p = ev.payload || {};
    if (p.type === 'sub_agent_start') {
      const sid = p.subSessionId;
      const ms = eventMs(ev);
      if (sid && ms !== null) subStarts.push([sid, ms]);
    }
  }

  const records = [];
  const spans = []; // [startMs, spanEndMs, commitCalls] per record
  for (let k = 0; k < cmdIndices.length; k++) {
    const start = cmdIndices[k];
    const end = k + 1 < cmdIndices.length ? cmdIndices[k + 1] : events.length;
    const span = events.slice(start, end);
    const cmdEv = events[start];
    const cmdPayload = cmdEv.payload || {};
    const command = detectCommand(cmdPayload.content || '');
    const cmdTs = cmdEv.timestamp;
    if (!cmdTs) continue; // cannot key without an invocation timestamp

    const winStart = eventMs(cmdEv);
    const nextCmdTs = k + 1 < cmdIndices.length ? events[cmdIndices[k + 1]].timestamp : null;
    const winEnd = nextCmdTs ? parseMs(nextCmdTs) : Infinity;

    const subEventsInWindow = [];
    for (const [sid, sms] of subStarts) {
      if (winStart !== null && winStart <= sms && sms < winEnd) {
        for (const e of (subAgentEvents[sid] || [])) subEventsInWindow.push(e);
      }
    }

    const codeEvents = span.concat(subEventsInWindow).sort((a, b) => {
      const am = eventMs(a); const bm = eventMs(b);
      return (am === null ? (winStart || 0) : am) - (bm === null ? (winStart || 0) : bm);
    });

    let feature = null;
    const fm = String(cmdPayload.content || '').match(FEATURE);
    if (fm) feature = fm[1];

    // interventions: free-text user messages after an assistant turn
    let interventionCount = 0;
    let lastWasAssistant = false;
    for (const ev of span.slice(1)) {
      const p = ev.payload || {};
      if (p.type === 'assistant') {
        lastWasAssistant = true;
      } else if (p.type === 'user' && lastWasAssistant && String(p.content || '').trim()) {
        interventionCount++;
        lastWasAssistant = false;
      }
    }

    // duration: active time + human-wait breakdown — mirror the Python module
    const time = activeTime(span);

    // credits: sum usage_summary.promptTurnSummaries[].usage in the main span
    let credits = 0.0;
    let lastStopReason = null;
    for (const ev of span) {
      const p = ev.payload || {};
      if (p.type === 'usage_summary') {
        for (const pts of (p.promptTurnSummaries || [])) {
          if (pts && typeof pts === 'object') credits += Number(pts.usage) || 0.0;
        }
      } else if (p.type === 'turn_end') {
        lastStopReason = p.stopReason;
      }
    }

    // outcome: completed only when an assistant turn ran AND the final turn
    // ended via "end_turn"; else aborted; upgraded to error on a recent failed
    // tool_result in the last 10 span events.
    let hadAssistant = false;
    for (const ev of span.slice(1)) {
      if ((ev.payload || {}).type === 'assistant') { hadAssistant = true; break; }
    }
    let outcome = (hadAssistant && lastStopReason === 'end_turn') ? 'completed' : 'aborted';
    for (const ev of span.slice(-10)) {
      const p = ev.payload || {};
      if (p.type === 'tool_result' && p.success === false) { outcome = 'error'; break; }
    }

    // code-change metrics
    const filesCreated = new Set();
    const filesModified = new Set();
    let linesAdded = 0;
    let toolRejections = 0;
    const callFiles = new Map();
    const callLines = new Map();
    const callKind = new Map();
    for (const ev of codeEvents) {
      const p = ev.payload || {};
      const t = p.type;
      if (t === 'tool_call') {
        const name = p.toolName;
        const cid = p.toolCallId;
        const args = p.args || {};
        const fp = args.path;
        if (name === 'fs_write' && fp && cid) {
          callFiles.set(cid, fp);
          let delta = 0;
          if (p.actionType === 'create') {
            filesCreated.add(fp);
            callKind.set(cid, 'created');
            const text = args.text;
            if (typeof text === 'string') delta = text.split('\n').length;
          } else {
            // actionType other than "create" is unconfirmed against real data
            // (only file creation has been captured) — treat as a modification
            // rather than guessing at a line delta.
            filesModified.add(fp);
            callKind.set(cid, 'modified');
          }
          if (delta > 0) { linesAdded += delta; callLines.set(cid, delta); }
        } else if (name === 'str_replace' && fp && cid) {
          callFiles.set(cid, fp);
          filesModified.add(fp);
          callKind.set(cid, 'modified');
          const oldS = args.oldStr || ''; const newS = args.newStr || '';
          if (typeof oldS === 'string' && typeof newS === 'string') {
            const d = newS.split('\n').length - oldS.split('\n').length;
            if (d > 0) { linesAdded += d; callLines.set(cid, d); }
          }
        }
      } else if (t === 'tool_result' && p.success === false) {
        toolRejections++;
        const cid = p.toolCallId;
        const fp = callFiles.get(cid || '');
        if (fp) {
          const kind = callKind.get(cid || '');
          if (kind === 'created') filesCreated.delete(fp);
          else if (kind === 'modified') filesModified.delete(fp);
          linesAdded -= (callLines.get(cid || '') || 0);
        }
      }
    }
    if (linesAdded < 0) linesAdded = 0;

    records.push({
      ts: cmdTs,
      user,
      session_id: sessionId,
      kind: 'command',
      command,
      feature,
      ...time.fields,
      outcome,
      intervention_count: interventionCount,
      files_created: filesCreated.size,
      files_modified: filesModified.size,
      lines_added: linesAdded,
      tool_rejections: toolRejections,
      input_token: 0,
      output_token: 0,
      cache_read: 0,
      cache_write: 0,
      total: 0,
      models: {},
      credits: Math.round(credits * 1e6) / 1e6,
    });
    spans.push([time.startMs, time.spanEndMs, commitCalls(codeEvents)]);
  }

  // Git counts replace the tool scan per span — one `git log` for the session.
  const bounded = spans.filter(([a, b]) => a !== null && b !== null);
  const commits = repoRoot && bounded.length
    ? safe(() => gitCommits(repoRoot, Math.min(...bounded.map((x) => x[0])), Math.max(...bounded.map((x) => x[1])), user), null)
    : null;
  records.forEach((rec, n) => {
    const [a, b, calls] = spans[n];
    const g = gitChangeCounts(commits, a, b, calls);
    if (g) { rec.files_created = g.created; rec.files_modified = g.modified; rec.lines_added = g.added; }
  });
  return records;
}

// ---- I/O orchestration ------------------------------------------------------

function normCase(p) {
  // Windows path compare is case-insensitive; mirror os.path.normcase.
  return process.platform === 'win32' ? p.toLowerCase() : p;
}

function rootMatches(workspacePaths, root) {
  const target = normCase(resolve(root));
  for (const p of (workspacePaths || [])) {
    if (typeof p !== 'string') continue;
    const candidate = normCase(safe(() => resolve(p), p));
    if (candidate === target) return true;
  }
  return false;
}

function iterSessionDirs(sessionsRoot, root) {
  const matches = [];
  if (!existsSync(sessionsRoot) || !statSync(sessionsRoot).isDirectory()) return matches;
  for (const hashName of safe(() => readdirSync(sessionsRoot), [])) {
    const hashDir = join(sessionsRoot, hashName);
    if (!safe(() => statSync(hashDir).isDirectory(), false)) continue;
    for (const sessName of safe(() => readdirSync(hashDir), [])) {
      const sessDir = join(hashDir, sessName);
      if (!safe(() => statSync(sessDir).isDirectory(), false)) continue;
      const meta = safe(() => JSON.parse(readFileSync(join(sessDir, 'session.json'), 'utf8')), null);
      if (!meta) continue;
      if (rootMatches(meta.workspacePaths || [], root)) matches.push(sessDir);
    }
  }
  return matches;
}

function gitEmail(root) {
  const out = safe(
    () => execSync('git config user.email', {
      cwd: root, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'],
    }).trim().toLowerCase(),
    '',
  );
  return out || 'unknown';
}

function main() {
  const root = process.cwd();
  const sessionsRoot = join(homedir(), '.kiro', 'sessions');
  const user = gitEmail(root);

  const sessionDirs = iterSessionDirs(sessionsRoot, root);

  const newRecords = [];
  const rebuiltSids = new Set();
  for (const sessDir of sessionDirs) {
    const events = readJsonl(join(sessDir, 'messages.jsonl'));
    if (!events.length) continue;
    const sid = sessDir.split(/[\\/]/).pop();

    const subAgentEvents = {};
    const subDir = join(sessDir, 'sub-executions');
    if (safe(() => statSync(subDir).isDirectory(), false)) {
      for (const sf of safe(() => readdirSync(subDir), []).filter((n) => n.endsWith('.jsonl'))) {
        subAgentEvents[sf.replace(/\.jsonl$/, '')] = readJsonl(join(subDir, sf));
      }
    }

    const recs = extractInvocations(events, { user, sessionId: sid, subAgentEvents, repoRoot: root });
    if (recs.length) { rebuiltSids.add(sid); for (const r of recs) newRecords.push(r); }
  }

  const activityDir = resolve(root, 'docs', 'activity');
  const existingFiles = safe(
    () => (statSync(activityDir).isDirectory()
      ? readdirSync(activityDir).filter((n) => n.endsWith('.jsonl')).map((n) => join(activityDir, n))
      : []),
    [],
  );
  // Lock + temp-file rename + strict read: same reasons and limits as the Claude
  // hook. This hook rewrites the WHOLE log each fire, so a log that exists but
  // cannot be read must never be rebuilt from nothing — that would drop every
  // teammate's row.
  mkdirSync(activityDir, { recursive: true });
  const lockDir = join(activityDir, ACTIVITY_FILE + '.lock');
  const deadline = Date.now() + 2000;
  const nap = new Int32Array(new SharedArrayBuffer(4));
  let locked = false;
  for (;;) {
    try { mkdirSync(lockDir); locked = true; break; } catch { /* held by another writer */ }
    const age = safe(() => Date.now() - statSync(lockDir).mtimeMs, 0);
    if (age > 30000) { safe(() => rmdirSync(lockDir), null); continue; }
    if (Date.now() > deadline) break;
    Atomics.wait(nap, 0, 0, 20 + Math.floor(Math.random() * 30));
  }
  const releaseLock = () => { if (locked) safe(() => rmdirSync(lockDir), null); };
  cleanup = releaseLock;
  const existingRows = [];
  for (const f of existingFiles) {
    const raw = safe(() => readFileSync(f, 'utf8'), null);
    if (raw === null) { releaseLock(); return; }
    for (const line of raw.split(/\r?\n/)) {
      const o = line.trim() ? safe(() => JSON.parse(line), null) : null;
      if (o) existingRows.push(o);
    }
  }

  const preserved = existingRows.filter((r) => !rebuiltSids.has(r.session_id));
  const finalRows = preserved.concat(newRecords);
  finalRows.sort((a, b) => String(a.ts || '').localeCompare(String(b.ts || '')));

  // collapse any legacy shards into the single flat log
  for (const f of existingFiles) {
    if (!f.endsWith(ACTIVITY_FILE)) safe(() => rmSync(f), null);
  }
  const outPath = join(activityDir, ACTIVITY_FILE);
  if (finalRows.length) {
    const tmpPath = `${outPath}.${process.pid}.tmp`;
    const wrote = safe(() => {
      writeFileSync(tmpPath, finalRows.map((r) => JSON.stringify(r)).join('\n') + '\n');
      renameSync(tmpPath, outPath);
      return true;
    }, false);
    if (!wrote) safe(() => unlinkSync(tmpPath), null);
    const gaPath = join(activityDir, '.gitattributes');
    if (safe(() => (existsSync(gaPath) ? readFileSync(gaPath, 'utf8') : null), null) !== GA_BODY) {
      safe(() => writeFileSync(gaPath, GA_BODY), null);
    }
  } else {
    safe(() => rmSync(outPath), null);
  }
  releaseLock();
}

safe(main, null);
process.exit(0);
