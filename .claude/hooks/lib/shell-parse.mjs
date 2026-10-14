// Shared shell-command parsing for the PreToolUse Bash guards.
//
// The guards used to match regexes against the raw command string, which missed
// anything the shell treats as equivalent but the pattern did not: split or
// reordered flags, quoting, `--`, chained commands, wrapper words. Both guards
// now tokenize first and inspect the resulting argv, and they share this module
// so they cannot drift on what counts as one command.
//
// This is not a shell. It handles quoting, backslash escapes, control operators,
// and wrapper words — enough to find a command and its arguments. It does not
// expand anything; callers decide what to do about a surviving `$VAR`.

// Wrapper words that precede the real command without changing its meaning.
const PREFIXES = new Set([
  'sudo', 'command', 'env', 'nice', 'time', 'exec', 'builtin', 'doas', 'xargs',
]);

/** `>` `>>` `<` `2>` … — a redirect, and its following word is a filename. */
export const REDIRECT_RE = /^[0-9]*(?:>>?|<)/;

/** True when the token is a bare redirect operator, so its filename follows. */
export function isBareRedirect(token) {
  return /^[0-9]*(?:>>?|<)$/.test(token);
}

/**
 * Split a shell command into tokens, honouring quotes and backslash escapes.
 * Control operators (`;` `&&` `||` `|` newline) collapse to a single `;` token
 * so callers can separate chained commands.
 */
export function tokenize(text) {
  const tokens = [];
  let cur = '';
  let started = false;
  let quote = null;

  const flush = () => {
    if (started) tokens.push(cur);
    cur = '';
    started = false;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      else { cur += ch; started = true; }
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; started = true; continue; }
    if (ch === '\\' && i + 1 < text.length) { cur += text[++i]; started = true; continue; }
    if (ch === ';' || ch === '\n' || ch === '|' || ch === '&') {
      flush();
      if ((ch === '|' || ch === '&') && text[i + 1] === ch) i++;
      tokens.push(';');
      continue;
    }
    if (/\s/.test(ch)) { flush(); continue; }
    cur += ch;
    started = true;
  }
  flush();
  return tokens;
}

/** Group a token stream into individual commands, split on control operators. */
export function commands(tokens) {
  const out = [];
  let cur = [];
  for (const t of tokens) {
    if (t === ';') { if (cur.length) out.push(cur); cur = []; }
    else cur.push(t);
  }
  if (cur.length) out.push(cur);
  return out;
}

/** Strip wrapper words and `VAR=value` assignments from the front of a command. */
export function stripPrefixes(words) {
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (PREFIXES.has(w) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(w)) i++;
    else break;
  }
  return words.slice(i);
}

/** Command name without its path — `/usr/bin/git` and `git` both give `git`. */
export function commandName(word) {
  return String(word || '').split('/').pop();
}

// Shells that take a script as a `-c` argument. `bash -c "rm -rf /"` hands the
// tokenizer one opaque string, so without expanding it a guard sees only an
// argument to `bash` and every command guard is one wrapper away from bypass.
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'ash', 'busybox']);
const SHELL_C_FLAGS = new Set(['-c', '-lc', '-ic', '-cl', '--command']);

/**
 * Split every command in `text` into argv, wrappers already stripped.
 *
 * A `bash -c "<script>"` wrapper yields both the wrapper itself and the commands
 * parsed out of its script, so `bash -c "rm -rf /"` is seen as `rm -rf /`.
 * Depth-bounded: a script that nests shells cannot make this recurse forever.
 */
export function argvList(text, depth = 0) {
  const out = [];
  for (const words of commands(tokenize(text)).map(stripPrefixes)) {
    if (!words.length) continue;
    out.push(words);
    if (depth >= 3 || !SHELLS.has(commandName(words[0]))) continue;
    const flag = words.findIndex((w) => SHELL_C_FLAGS.has(w));
    if (flag !== -1 && words[flag + 1]) {
      out.push(...argvList(words[flag + 1], depth + 1));
    }
  }
  return out;
}
