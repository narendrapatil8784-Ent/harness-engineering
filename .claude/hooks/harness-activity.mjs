#!/usr/bin/env node
// Stop / SessionEnd hook — upsert one summary record per Harness command
// invocation in the session into docs/activity/activity.jsonl. Reads the session transcript
// to extract the slash command invoked, intervention count, duration, outcome,
// and code-change metrics.
//
// The hook fires on every Stop (each assistant turn end) and on SessionEnd. A
// single command can span many turns → many fires. To avoid duplicate /
// cumulative-growth lines, each fire UPSERTS the record keyed by
// (session_id + command-invocation-timestamp): the latest fire reflects the
// final cumulative state of that invocation. One row per command run.
//
// Skips emit when no slash command was invoked (pure chat sessions don't
// belong in the activity feed).
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmdirSync, statSync, unlinkSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { execSync, execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function safe(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}
// Telemetry must never break the user's turn: an unexpected transcript shape
// that slips past the guards below ends the hook quietly, log untouched.
let cleanup = () => {}; // set once the log lock is held
process.on('uncaughtException', () => { cleanup(); process.exit(0); });

const input = safe(() => JSON.parse(readFileSync(0, 'utf8')), {});
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const transcriptPath = input.transcript_path || null;
const sessionId = input.session_id || null;

if (!transcriptPath || !existsSync(transcriptPath)) {
  process.exit(0); // nothing to summarise
}

// Parse the session JSONL line-by-line
const rawLines = safe(() => readFileSync(transcriptPath, 'utf8').split(/\r?\n/), []);
const events = [];
for (const line of rawLines) {
  if (!line.trim()) continue;
  const obj = safe(() => JSON.parse(line), null);
  if (obj) events.push(obj);
}

// Helper: extract user-message text from either string or array content.
// Claude Code's transcript stores content as a string for plain user input
// and as a block-array when tool calls are interleaved.
function userText(ev) {
  const c = ev.message?.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    const parts = [];
    for (const block of c) {
      if (block?.type === 'text' && typeof block.text === 'string') {
        parts.push(block.text);
      }
    }
    return parts.join('\n');
  }
  return '';
}

// Helper: detect tool_result blocks in user message (string content can't be).
function hasToolResult(ev) {
  const c = ev.message?.content;
  if (!Array.isArray(c)) return false;
  return c.some((b) => b?.type === 'tool_result');
}

// Detect slash command. Claude Code wraps it in XML-ish tags inside the
// first user text, e.g. `<command-name>/arh-init</command-name>`. Plain
// `/cmd` at line start (typed directly) is also accepted as fallback.
function detectCommand(text) {
  if (!text) return null;
  const xml = text.match(/<command-name>\/([\w-]+)<\/command-name>/);
  if (xml) return '/' + xml[1];
  const plain = text.trim().match(/^\/([\w-]+)(?:\s|$)/);
  if (plain) return '/' + plain[1];
  return null;
}

// Every command in the transcript gets its own record, spanning [command,
// next command). Updating only the latest one lost the final state of any
// command whose last turn had no Stop of its own (e.g. the next prompt was
// queued before it finished). Earlier windows are closed, so re-fires rewrite
// their rows with the same values. Mirrors extract_invocations() in
// site/activity_backfill.py.
const commandIdx = [];
for (let i = 0; i < events.length; i++) {
  if (events[i].type === 'user' && detectCommand(userText(events[i]))) commandIdx.push(i);
}
if (commandIdx.length === 0) process.exit(0); // chat-only session — skip

// Feature id: an upper-case id anywhere in the command text (EPIC-NN); failing
// that, a first argument typed in lower case ("ovw-02" -> "OVW-02"). The
// fallback needs 2+ digits and the first-argument position so words like
// "utf-8" are not mistaken for a story.
const FEATURE_ID = /([A-Z]{2,}-\d+)/;
const ARG_FEATURE_ID = /^([A-Za-z]{2,})-(\d{2,})$/;
function featureOf(text) {
  const m = text.match(FEATURE_ID);
  if (m) return m[1];
  const xmlArgs = text.match(/<command-args>([\s\S]*?)<\/command-args>/);
  const args = xmlArgs ? xmlArgs[1] : text.includes('<command-name>') ? '' : text.trim().replace(/^\/[\w:-]+/, '');
  const a = (args.trim().split(/\s+/)[0] || '').match(ARG_FEATURE_ID);
  return a ? `${a[1].toUpperCase()}-${a[2]}` : null;
}

// Duration = ACTIVE time, not wall-clock. wall_duration_s keeps the old
// meaning: command event → last timestamped event (trailing lines are often
// non-timestamped markers — last-prompt, mode, system — so scan for real
// timestamps). Two kinds of human time are carved out of it:
//   question_wait_s  each AskUserQuestion tool_use → its tool_result, matched by
//                    tool_use_id; each one is also recorded in questions[]
//   prompt_idle_s    the gap before a real free-text prompt (a follow-up turn
//                    counts only its own processing time), plus any trailing
//                    ambient tail
// duration_s = wall_duration_s − question_wait_s − prompt_idle_s. IDE context
// blocks (<ide_opened_file> …) alone are ambient: opening a file is not work, so
// they neither end a gap nor count as activity. questions[] holds each ask in
// full — every question, its options and the person's answer (and notes) — by
// the project's choice; the log is committed and shared with the team, so
// anything typed into an answer lands in git history. Mirrored in
// site/activity_backfill.py — keep the two in sync.
const tsOf = (ev) => ev?.timestamp || ev?.message?.timestamp;
function eventMs(ev) {
  const t = tsOf(ev);
  const m = t ? Date.parse(t) : NaN;
  return Number.isNaN(m) ? null : m;
}
const IDE_BLOCK = /<ide_[a-z_]+>[\s\S]*?<\/ide_[a-z_]+>/g;
const NOT_A_PROMPT = /^(<task-notification>|\[Request interrupted|Another Claude session sent a message)/;
const QUESTIONS_CAP = 50;
const HEADER_MAX = 60;
function isAmbient(ev) {
  if (ev?.type !== 'user' || hasToolResult(ev)) return false;
  const t = userText(ev);
  return t.trim() !== '' && t.replace(IDE_BLOCK, '').trim() === '';
}
function isHumanPrompt(ev) {
  if (ev?.type !== 'user' || ev.isMeta || hasToolResult(ev)) return false;
  const t = userText(ev).replace(IDE_BLOCK, '').trim();
  return t !== '' && !NOT_A_PROMPT.test(t);
}
function isInterrupt(ev) {
  if (ev?.type !== 'user' || ev.isMeta || hasToolResult(ev)) return false;
  return userText(ev).trim().startsWith('[Request interrupted');
}
function questionHeader(input) {
  const qs = Array.isArray(input?.questions) ? input.questions : [];
  const h = qs.map((q) => (typeof q?.header === 'string' ? q.header : '')).filter(Boolean).join(' / ');
  return Array.from(h).slice(0, HEADER_MAX).join(''); // code points, matching Python slicing
}
// One entry per question of an ask: what was asked, the options offered, and —
// once the tool_result arrives — what the person chose. Questions and options
// come from the tool_use input; the answer and notes from the result event's
// toolUseResult (answers / annotations keyed by question text).
function questionItems(input) {
  const qs = Array.isArray(input?.questions) ? input.questions : [];
  return qs.filter((q) => q && typeof q === 'object').map((q) => ({
    header: typeof q.header === 'string' ? q.header : null,
    question: typeof q.question === 'string' ? q.question : null,
    multi_select: q.multiSelect === true,
    options: (Array.isArray(q.options) ? q.options : []).filter((o) => o && typeof o === 'object').map((o) => ({
      label: typeof o.label === 'string' ? o.label : null,
      description: typeof o.description === 'string' ? o.description : null,
      ...(typeof o.preview === 'string' ? { preview: o.preview } : {}),
    })),
    answer: null,
    notes: null,
  }));
}
function answerItems(items, toolUseResult) {
  const answers = toolUseResult?.answers && typeof toolUseResult.answers === 'object' ? toolUseResult.answers : {};
  const notes = toolUseResult?.annotations && typeof toolUseResult.annotations === 'object' ? toolUseResult.annotations : {};
  for (const it of items) {
    if (it.question === null) continue;
    const a = answers[it.question];
    if (typeof a === 'string') it.answer = a;
    const n = notes[it.question]?.notes;
    if (typeof n === 'string') it.notes = n;
  }
  return items;
}
// Time fields for the span events[start..end). spanEndMs (last timestamped event)
// is also the git window's end.
function activeTime(start, end) {
  const startMs = eventMs(events[start]);
  let spanEndMs = startMs;
  let activeEndMs = startMs;
  let prevMs = startMs;
  let idleMs = 0;
  let questionWaitSeconds = 0;
  let questionCount = 0;
  let maxQuestionWaitSeconds = 0;
  const questions = [];
  const asks = new Map(); // AskUserQuestion tool_use_id -> {ms, ts, header, items}
  for (let i = start + 1; i < end; i++) {
    const ev = events[i];
    const m = eventMs(ev);
    if (m === null) continue;
    spanEndMs = m;
    // Bookkeeping lines (queue-operation, attachment, system hook summaries) are
    // stamped at prompt-submit / turn-end, not work: they extend the wall span only.
    if ((ev.type !== 'user' && ev.type !== 'assistant') || isAmbient(ev)) continue;
    const content = ev.message?.content;
    if (Array.isArray(content)) {
      for (const c of content) {
        if (c?.type === 'tool_use' && c.name === 'AskUserQuestion' && c.id) {
          questionCount++;
          asks.set(c.id, { ms: m, ts: tsOf(ev), header: questionHeader(c.input), items: questionItems(c.input) });
        } else if (c?.type === 'tool_result' && asks.has(c.tool_use_id)) {
          const q = asks.get(c.tool_use_id);
          asks.delete(c.tool_use_id);
          const w = Math.max(0, Math.round((m - q.ms) / 1000));
          questionWaitSeconds += w;
          if (w > maxQuestionWaitSeconds) maxQuestionWaitSeconds = w;
          if (questions.length < QUESTIONS_CAP) {
            questions.push({
              asked_ts: q.ts,
              answered_ts: tsOf(ev),
              header: q.header,
              wait_s: w,
              outcome: c.is_error === true ? 'rejected' : 'answered',
              items: c.is_error === true ? q.items : answerItems(q.items, ev.toolUseResult),
            });
          }
        }
      }
    }
    if (isHumanPrompt(ev) && prevMs !== null && m > prevMs) idleMs += m - prevMs;
    prevMs = m;
    activeEndMs = m;
  }
  let wallDurationSeconds = 0;
  let promptIdleSeconds = 0;
  let durationSeconds = 0;
  if (startMs !== null && spanEndMs !== null && spanEndMs > startMs) {
    idleMs += spanEndMs - activeEndMs; // trailing ambient tail
    wallDurationSeconds = Math.round((spanEndMs - startMs) / 1000);
    promptIdleSeconds = Math.round(idleMs / 1000);
    durationSeconds = Math.max(0, wallDurationSeconds - questionWaitSeconds - promptIdleSeconds);
  }
  return {
    startMs,
    spanEndMs,
    fields: {
      duration_s: durationSeconds,
      wall_duration_s: wallDurationSeconds,
      question_wait_s: questionWaitSeconds,
      prompt_idle_s: promptIdleSeconds,
      question_count: questionCount,
      max_question_wait_s: maxQuestionWaitSeconds,
      questions: questions,
    },
  };
}

// Subagent transcripts: commands like /arh-implement delegate file edits to
// subagents, whose Write/Edit/tool_result live in <session>/subagents/*.jsonl,
// NOT the main transcript. Read them once; each invocation takes the lines
// inside its own [cmd_ts, next_cmd_ts) window.
const subAll = [];
// Subagent token usage, keyed by message.id. A subagent keeps streaming while
// the user types the next command, so lines of ONE message can straddle the
// invocation boundary — attribute the whole message to the invocation whose
// window contains its FIRST line, keeping the LAST usage snapshot.
const subUsageFirstMs = new Map(); // message.id -> earliest line ms
const subUsageLast = new Map();    // message.id -> {model, usage} last snapshot
{
  const subDir = transcriptPath.replace(/\.jsonl$/, '') + '/subagents';
  if (existsSync(subDir)) {
    const files = safe(() => readdirSync(subDir), []).filter((n) => n.endsWith('.jsonl'));
    for (const fn of files) {
      const raw = safe(() => readFileSync(resolve(subDir, fn), 'utf8').split(/\r?\n/), []);
      for (const l of raw) {
        if (!l.trim()) continue;
        const o = safe(() => JSON.parse(l), null);
        if (!o) continue;
        const m = eventMs(o);
        if (o.type === 'assistant') {
          const u = o.message?.usage;
          const mid = o.message?.id || o.requestId;
          if (u && typeof u === 'object' && mid) {
            if (m !== null && (!subUsageFirstMs.has(mid) || m < subUsageFirstMs.get(mid))) {
              subUsageFirstMs.set(mid, m);
            }
            subUsageLast.set(mid, { model: o.message?.model || null, usage: u });
          }
        }
        if (m !== null) subAll.push(o);
      }
    }
  }
}

// Resolve user from git config
let user = 'unknown';
user = safe(
  () => execSync('git config user.email', {
    cwd: projectDir, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'],
  }).trim().toLowerCase(),
  'unknown'
);
if (!user) user = 'unknown';

const eventName = input.hook_event_name || 'Stop';

// One record for the command at events[start], whose window ends at events[end]
// (exclusive) and at timestamp toMs. Returns null for a command that is not a
// run: one superseded by a later command (usually the same one, retyped) before
// any assistant turn — main or subagent — did work for it.
function summarise(start, end, toMs, isLatest) {
  const command = detectCommand(userText(events[start]));
  const span = events.slice(start, end);
  // Command-invocation timestamp — the stable upsert key for this invocation.
  const cmdTs = tsOf(events[start]);
  const cmdMs = Date.parse(cmdTs);
  const inWindow = (m) => m !== null && m !== undefined && !Number.isNaN(cmdMs) && m >= cmdMs && m < toMs;
  const subMids = [...subUsageLast.keys()].filter((mid) => inWindow(subUsageFirstMs.get(mid)));

  // Outcome. "aborted" means the command was invoked but NO assistant turn ran
  // afterwards (true interrupt). A SessionEnd after real work is NOT an abort —
  // emitting one would duplicate the already-written completed record.
  const hadAssistantWork = span.slice(1).some((ev) => ev?.type === 'assistant');
  if (!hadAssistantWork && subMids.length === 0 && !isLatest) return null;
  let outcome = 'completed';
  if (eventName === 'SessionEnd' && !hadAssistantWork) outcome = 'aborted';
  // "error" wins over completed when one of the span's last tool_results failed.
  for (let i = end - 1; i >= Math.max(start, end - 10); i--) {
    const content = events[i]?.message?.content;
    if (!Array.isArray(content)) continue;
    if (content.some((c) => c.type === 'tool_result' && c.is_error === true)) {
      outcome = 'error';
      break;
    }
  }

  // Count interventions: a person stepping in between assistant turns, AFTER the
  // command was invoked — a real prompt (same test as the idle-time accounting)
  // or an Esc interrupt. Tool results, hand-backs from other sessions/subagents
  // (isMeta), task notifications and IDE-only blocks are not a person.
  let interventionCount = 0;
  let lastWasAssistant = false;
  for (const ev of span.slice(1)) {
    if (ev.type === 'assistant') {
      lastWasAssistant = true;
    } else if (lastWasAssistant && (isHumanPrompt(ev) || isInterrupt(ev))) {
      interventionCount++;
      lastWasAssistant = false;
    }
  }

  const time = activeTime(start, end);

  // Combined, time-ordered stream: the span + subagent lines inside its window.
  const codeEvents = span.concat(subAll.filter((o) => inWindow(eventMs(o))));
  codeEvents.sort((a, b) => (eventMs(a) ?? cmdMs) - (eventMs(b) ?? cmdMs));
  const commitCalls = gitCommitCalls(codeEvents);

  // Token usage: sum `message.usage` across assistant events of this invocation.
  // The transcript writes one line per content block, each repeating the SAME
  // message.id and usage — dedupe by message.id (last line wins, it carries the
  // final usage) or every block double-counts. Main-transcript usage comes from
  // the command span; subagent messages count only when their FIRST line is
  // inside this invocation (a straddling message belongs to the invocation that
  // spawned it, not the next one).
  const usageById = new Map(); // message.id -> {model, usage}
  for (const ev of span) {
    if (ev?.type !== 'assistant') continue;
    const u = ev?.message?.usage;
    if (!u || typeof u !== 'object') continue;
    const mid = ev.message?.id || ev.requestId;
    if (!mid) continue;
    usageById.set(mid, { model: ev.message?.model || null, usage: u });
  }
  for (const mid of subMids) usageById.set(mid, subUsageLast.get(mid));
  // Aggregate per model (cost depends on model + cache-write TTL: 5m writes bill
  // 1.25x input price, 1h writes 2x). `usage.cache_creation.{ephemeral_1h,_5m}`
  // carries the TTL split; when absent, the cache_creation_input_tokens total is
  // attributed to 5m.
  const modelUsage = {};
  for (const { model, usage: u } of usageById.values()) {
    const key = model || 'unknown';
    const agg = (modelUsage[key] ||= {
      input: 0, output: 0, cache_read: 0, cache_write_5m: 0, cache_write_1h: 0,
    });
    agg.input += Number(u.input_tokens) || 0;
    agg.output += Number(u.output_tokens) || 0;
    agg.cache_read += Number(u.cache_read_input_tokens) || 0;
    const cc = u.cache_creation;
    if (cc && typeof cc === 'object') {
      agg.cache_write_1h += Number(cc.ephemeral_1h_input_tokens) || 0;
      agg.cache_write_5m += Number(cc.ephemeral_5m_input_tokens) || 0;
    } else {
      agg.cache_write_5m += Number(u.cache_creation_input_tokens) || 0;
    }
  }
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  for (const agg of Object.values(modelUsage)) {
    inputTokens += agg.input;
    outputTokens += agg.output;
    cacheRead += agg.cache_read;
    cacheWrite += agg.cache_write_5m + agg.cache_write_1h;
  }

  // Code-change metrics: scan tool_use blocks for Write / Edit / MultiEdit calls
  // + tool_result is_error counts. Each tool_use_id's contribution is tracked so
  // rejected writes back out cleanly. Replaced by git counts below when a commit
  // lands in the span.
  const filesCreated = new Set();
  const filesModified = new Set();
  let linesAdded = 0;
  let toolRejections = 0;
  const toolUseFiles = new Map();   // tool_use_id -> file_path
  const toolUseLines = new Map();   // tool_use_id -> line delta contributed
  for (const ev of codeEvents) {
    const content = ev?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (c.type === 'tool_use') {
        const name = c.name;
        const input = c.input || {};
        const filePath = input.file_path || input.path || null;
        if (filePath) toolUseFiles.set(c.id, filePath);
        let lineDelta = 0;
        if (name === 'Write' && filePath) {
          filesCreated.add(filePath);
          const txt = input.content || '';
          if (typeof txt === 'string') lineDelta = txt.split('\n').length;
        } else if (name === 'Edit' && filePath) {
          filesModified.add(filePath);
          const ns = input.new_string || '';
          const os = input.old_string || '';
          if (typeof ns === 'string' && typeof os === 'string') {
            const d = ns.split('\n').length - os.split('\n').length;
            if (d > 0) lineDelta = d;
          }
        } else if (name === 'MultiEdit' && filePath) {
          filesModified.add(filePath);
          const edits = Array.isArray(input.edits) ? input.edits : [];
          for (const e of edits) {
            const ns = e?.new_string || '';
            const os = e?.old_string || '';
            if (typeof ns === 'string' && typeof os === 'string') {
              const d = ns.split('\n').length - os.split('\n').length;
              if (d > 0) lineDelta += d;
            }
          }
        }
        if (lineDelta > 0) {
          linesAdded += lineDelta;
          toolUseLines.set(c.id, lineDelta);
        }
      } else if (c.type === 'tool_result' && c.is_error === true) {
        toolRejections++;
        // If this rejection corresponded to a Write/Edit/MultiEdit we counted,
        // back out the file path AND the line contribution.
        const fp = toolUseFiles.get(c.tool_use_id);
        if (fp) {
          filesCreated.delete(fp);
          filesModified.delete(fp);
        }
        const d = toolUseLines.get(c.tool_use_id);
        if (d) linesAdded -= d;
      }
    }
  }
  if (linesAdded < 0) linesAdded = 0;

  // `ts` is the invocation start (stable across upserts so the feed never
  // reorders) and the upsert key. Rows written before 2026-10 also carry an
  // identical `cmd_ts`; rowKey() reads either.
  return {
    startMs: time.startMs,
    spanEndMs: time.spanEndMs,
    commitCalls,
    record: {
      ts: cmdTs,
      user,
      session_id: sessionId,
      kind: 'command',
      command,
      feature: featureOf(userText(events[start])),
      ...time.fields,
      outcome,
      intervention_count: interventionCount,
      files_created: filesCreated.size,
      files_modified: filesModified.size,
      lines_added: linesAdded,
      tool_rejections: toolRejections,
      input_token: inputTokens,
      output_token: outputTokens,
      cache_read: cacheRead,
      cache_write: cacheWrite,
      total: inputTokens + outputTokens + cacheRead + cacheWrite,
      models: modelUsage,
    },
  };
}

// Git is the ground truth for what changed: subagents write mostly through Bash
// (heredocs, sed -i, formatters, package installs), which the tool_use scan
// cannot see. Count this user's non-merge commits inside each invocation span —
// the span END, not the active end, because the commit often lands after an
// AskUserQuestion wait. Lockfiles are excluded (generated, and they dwarf the
// real diff), and so are root commits: a `git init` + first commit snapshots the
// tree that existed before the repo did, not work done in this invocation. One
// `git log` covers every span (this hook blocks each Stop, so no per-command git
// call); each commit is assigned by committer time with the same inclusive
// second bounds `--since`/`--until` apply. Falls back to the tool_use counts
// outside a git repo, on any git error, or when no commit matches. Mirrored in
// site/activity_backfill.py.
const LOCKFILES = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'uv.lock', 'poetry.lock', 'Cargo.lock'];
function gitCommits(sinceMs, untilMs, author) {
  if (sinceMs === null || untilMs === null || !author || author === 'unknown') return null;
  const out = execFileSync('git', [
    'log', `--since=@${Math.floor(sinceMs / 1000)}`, `--until=@${Math.ceil(untilMs / 1000)}`,
    `--author=<${author}>`, '--fixed-strings', '--regexp-ignore-case', '--no-merges', '--min-parents=1',
    '--numstat', '--summary', '--format=%x00%ct',
    '--', '.', ...LOCKFILES.map((f) => `:(exclude,glob)**/${f}`),
  ], { cwd: projectDir, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] });
  const commits = [];
  let cur = null;
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('\0')) {
      cur = { ct: Number(line.slice(1)), numstat: [], created: [] };
      commits.push(cur);
      continue;
    }
    if (!cur) continue;
    const ns = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (ns) {
      cur.numstat.push([ns[3], ns[1] === '-' ? 0 : Number(ns[1])]);
      continue;
    }
    const cm = line.match(/^ create mode \d+ (.+)$/);
    if (cm) cur.created.push(cm[1]);
  }
  return commits;
}
// A commit belongs to this invocation only when it landed while one of the
// invocation's own `git commit` Bash calls was running (main transcript or a
// subagent): committer time inside [tool_use, tool_result] ±1 s. Author email
// and time window alone also match a concurrent session committing as the same
// person in the same repo. Commit hashes are no use for this — other sessions
// print them too (git log) — and commit output is often silenced (-q).
const GIT_COMMIT = /\bgit\b[^\n|;&]*\bcommit\b/;
function gitCommitCalls(evs) {
  const pending = new Map(); // tool_use_id -> ms
  const calls = [];          // [loSec, hiSec]
  for (const ev of evs) {
    const content = ev?.message?.content;
    const m = eventMs(ev);
    if (!Array.isArray(content) || m === null) continue;
    for (const c of content) {
      if (c?.type === 'tool_use' && c.name === 'Bash' && c.id && typeof c.input?.command === 'string'
          && GIT_COMMIT.test(c.input.command)) {
        pending.set(c.id, m);
      } else if (c?.type === 'tool_result' && pending.has(c.tool_use_id)) {
        calls.push([Math.floor(pending.get(c.tool_use_id) / 1000) - 1, Math.ceil(m / 1000) + 1]);
        pending.delete(c.tool_use_id);
      }
    }
  }
  return calls;
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
    if (!calls.some(([a, b]) => a <= c.ct && c.ct <= b)) continue; // not this invocation's commit
    for (const [p, n] of c.numstat) {
      changed.add(p);
      added += n;
    }
    for (const p of c.created) created.add(p);
  }
  if (changed.size === 0) return null;
  let modified = 0;
  for (const p of changed) if (!created.has(p)) modified++;
  return { created: created.size, modified, added };
}

const results = [];
const skippedTs = new Set(); // ts of commands that were not runs — drop any row they left
for (let n = 0; n < commandIdx.length; n++) {
  const start = commandIdx[n];
  if (!tsOf(events[start])) continue; // cannot key without an invocation timestamp
  const next = commandIdx[n + 1];
  const end = next === undefined ? events.length : next;
  const toMs = next === undefined ? Infinity : (eventMs(events[next]) ?? Infinity);
  const r = summarise(start, end, toMs, next === undefined);
  if (r) results.push(r);
  else skippedTs.add(tsOf(events[start]));
}
const bounds = results.filter((r) => r.startMs !== null && r.spanEndMs !== null);
const commits = bounds.length
  ? safe(() => gitCommits(
    Math.min(...bounds.map((r) => r.startMs)), Math.max(...bounds.map((r) => r.spanEndMs)), user,
  ), null)
  : null;
for (const { record, startMs, spanEndMs, commitCalls } of results) {
  const g = gitChangeCounts(commits, startMs, spanEndMs, commitCalls);
  if (g) {
    record.files_created = g.created;
    record.files_modified = g.modified;
    record.lines_added = g.added;
  }
}
const records = results.map((r) => r.record);

// Single committed append-only log shared across the team.
const outPath = resolve(projectDir, 'docs/activity/activity.jsonl');
mkdirSync(dirname(outPath), { recursive: true });
// Mark the log for git's built-in `union` merge driver so concurrent commits
// from different users combine line-wise instead of hand-conflicting; duplicate
// lines are dropped by (session_id, ts) on the next write. eol=lf: a Windows
// checkout (core.autocrlf) would otherwise turn the log CRLF and every rewrite
// would mix line endings. Kept in sync with activity_backfill.py.
const gaPath = resolve(dirname(outPath), '.gitattributes');
const gaBody = 'activity.jsonl merge=union eol=lf\n';
if (safe(() => (existsSync(gaPath) ? readFileSync(gaPath, 'utf8') : null), null) !== gaBody) {
  safe(() => writeFileSync(gaPath, gaBody), null);
}

// Upsert: replace the existing line for each record's (session_id, ts), else
// append. Other lines keep their position → minimal git diff for multi-user merges.
// A second line for an already-written key (left by a union merge) is dropped, as
// is a row left by a command that turned out not to be a run.
//
// Two sessions in one project can finish at the same moment; both would read the
// log, add their own rows and write it back, and the second write would erase the
// first one's rows. A lock directory serialises the read-modify-write (mkdir is
// atomic on every platform), and the write goes to a temp file renamed into place
// so a crash mid-write never leaves a truncated log. Waits at most LOCK_WAIT_MS —
// this blocks the user's Stop — then writes anyway; a lock older than
// LOCK_STALE_MS was left by a crashed writer and is taken over.
const LOCK_WAIT_MS = 2000;
const LOCK_STALE_MS = 30000;
const lockDir = outPath + '.lock';
function acquireLock() {
  const deadline = Date.now() + LOCK_WAIT_MS;
  const nap = new Int32Array(new SharedArrayBuffer(4));
  for (;;) {
    try { mkdirSync(lockDir); return true; } catch { /* held by another writer */ }
    const age = safe(() => Date.now() - statSync(lockDir).mtimeMs, 0);
    if (age > LOCK_STALE_MS) { safe(() => rmdirSync(lockDir), null); continue; }
    if (Date.now() > deadline) return false;
    Atomics.wait(nap, 0, 0, 20 + Math.floor(Math.random() * 30)); // jittered backoff
  }
}
const locked = acquireLock();
function releaseLock() { if (locked) safe(() => rmdirSync(lockDir), null); }
cleanup = releaseLock;
// A log that exists but cannot be read is NOT an empty log: rewriting it from []
// would drop every teammate's row. Leave it alone this time.
let existing = [];
if (existsSync(outPath)) {
  const text = safe(() => readFileSync(outPath, 'utf8'), null);
  if (text === null) { releaseLock(); process.exit(0); }
  existing = text.split(/\r?\n/).filter((l) => l.trim());
}
// The log is append-only and never pruned, so it grows for the life of the project while
// this hook runs on EVERY Stop / SessionEnd — a blocking boundary the user waits on. Parsing
// every line to find the one we might replace made that cost O(log length): at ~100k
// invocations it is a visible stall on every command. Only a line from THIS session can
// match, and a matching line must contain the session id verbatim, so use the substring as a
// cheap pre-filter and parse only the handful of candidates. Same output, bounded work.
// Guarded on a string id: `sessionId` is `input.session_id || null`, and a null needle has no
// substring to test, so that case keeps the exhaustive parse rather than matching "null".
const sidNeedle = typeof sessionId === 'string' && sessionId.length > 0 ? sessionId : null;
// An invocation's key is its start time: `ts` (older rows also wrote it as `cmd_ts`).
const rowKey = (o) => o.cmd_ts ?? o.ts;
const byCmdTs = new Map(records.map((r) => [r.ts, r]));
const written = new Set();
const out = [];
for (const l of existing) {
  if (sidNeedle !== null && !l.includes(sidNeedle)) {
    out.push(l);
    continue;
  }
  const o = safe(() => JSON.parse(l), null);
  const mine = o !== null && o.session_id === sessionId;
  const record = mine ? byCmdTs.get(rowKey(o)) : undefined;
  if (record) {
    if (written.has(record.ts)) continue; // duplicate line for this key
    if (o.outcome === 'error') record.outcome = 'error'; // never downgrade a seen error
    out.push(JSON.stringify(record));
    written.add(record.ts);
  } else if (!(mine && skippedTs.has(rowKey(o)))) {
    out.push(l);
  }
}
for (const r of records) if (!written.has(r.ts)) out.push(JSON.stringify(r));
const tmpPath = `${outPath}.${process.pid}.tmp`;
const wrote = safe(() => { writeFileSync(tmpPath, out.join('\n') + '\n'); renameSync(tmpPath, outPath); return true; }, false);
if (!wrote) safe(() => unlinkSync(tmpPath), null);
releaseLock();

// Push this record to the AgentRise MCP server, if this project has been
// onboarded to it (.harness/program.yaml or profile.yaml carries the
// programId). Spawned detached + stdio ignored so a slow/unreachable server
// never blocks this hook; skipped entirely (no network call at all) when
// neither file has a programId — most projects with no MCP server configured
// never attempt the request.
//
// `programId` lives in the COMMITTED program.yaml (written by the `tracker`
// extension), while profile.yaml there is per-machine identity only and
// gitignored. Fall back to profile.yaml for projects on the legacy
// `harness add tracker` layout, where profile.yaml carries the programId.
const readProgramId = (file) => safe(() => {
  const text = readFileSync(resolve(projectDir, '.harness', file), 'utf8');
  const m = text.match(/^programId:\s*(.+?)\s*$/m);
  return m ? m[1] : null;
}, null);
const programId = readProgramId('program.yaml') ?? readProgramId('profile.yaml');
if (programId) {
  const pushScript = resolve(dirname(fileURLToPath(import.meta.url)), 'harness-mcp-push.mjs');
  if (existsSync(pushScript)) {
    safe(() => {
      const child = spawn(process.execPath, [pushScript], {
        cwd: projectDir,
        env: { ...process.env, HARNESS_PROGRAM_ID: programId },
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    }, null);
  }
}

process.exit(0);
