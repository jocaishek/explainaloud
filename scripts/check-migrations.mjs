/**
 * Does every migration only reference things that exist when it runs?
 *
 * Postgres does not ask that question until the statement executes, and for a
 * `plpgsql` body it does not ask it even then — the body is parsed at creation
 * and its identifiers are resolved the first time somebody calls it. So a
 * migration can apply perfectly, on a fresh database and on production, and
 * still be broken. There is no `db reset` that catches it.
 *
 * Both of the failures this was written after are of exactly that shape:
 *
 *   - `admin_user_overview` was recreated calling `is_ropes_admin()`, which a
 *     rename had dropped a month earlier. It applied cleanly and then returned
 *     a 500 on every load of `/admin`.
 *   - A squad migration joined `public.profiles p on p.id`, and `profiles`
 *     keys on `user_id` and has no `id`.
 *
 * So the migrations are replayed in order here, tracking which functions and
 * columns exist at each point, and every reference is checked against that.
 * It is a text-level model rather than a parser — it will not catch a type
 * error or a bad plan, and it is not a substitute for running the thing. It
 * catches the class of mistake that survives being run.
 *
 * Usage:
 *   node scripts/check-migrations.mjs                 # the whole history
 *   node scripts/check-migrations.mjs --new-since=main  # only what a branch adds
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

const dir = "supabase/migrations";
const since = process.argv
  .find((arg) => arg.startsWith("--new-since="))
  ?.slice("--new-since=".length);

/* What the base branch already had. A migration that is already merged is
   history: it ran, whatever it said, and a later one may have corrected it.
   The only thing worth failing a branch over is what that branch adds. */
let existing = new Set();
if (since) {
  try {
    existing = new Set(
      execFileSync("git", ["ls-tree", "--name-only", since, `${dir}/`], {
        encoding: "utf8",
      })
        .split("\n")
        .map((line) => line.split("/").pop())
        .filter(Boolean),
    );
  } catch {
    console.error(`Could not read ${since}; checking everything instead.`);
  }
}

const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const funcs = new Set();          // public.name  (ignoring arity)
const tables = new Set();         // public.name, so a table is never read as a call
const cols = new Map();           // public.table -> Set(column)
const problems = [];

const strip = (sql) =>
  sql.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");

for (const file of files) {
  const sql = strip(readFileSync(`${dir}/${file}`, "utf8"));

  /* A file's own tables and columns exist for the rest of that file. */
  for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)\s*\(([\s\S]*?)\n\)\s*;/gi)) {
    tables.add(m[1]);
    const set = cols.get(m[1]) ?? new Set();
    for (const line of m[2].split("\n")) {
      const c = line.trim().match(/^(\w+)\s+(uuid|text|date|integer|int|bigint|boolean|timestamptz|jsonb|numeric|public\.\w+)/i);
      if (c) set.add(c[1]);
    }
    cols.set(m[1], set);
  }
  for (const m of sql.matchAll(/alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?public\.(\w+)((?:[^;]|'[^']*')*);/gi)) {
    tables.add(m[1]);
    const set = cols.get(m[1]) ?? new Set();
    for (const a of m[2].matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?(\w+)/gi)) set.add(a[1]);
    for (const d of m[2].matchAll(/drop\s+column\s+(?:if\s+exists\s+)?(\w+)/gi)) set.delete(d[1]);
    cols.set(m[1], set);
  }

  /* ---- what this file references, checked against the state so far ---- */
  const defined = new Set(
    [...sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)/gi)].map((m) => m[1]),
  );
  for (const m of sql.matchAll(/\bpublic\.(\w+)\s*\(/gi)) {
    const name = m[1];
    if (defined.has(name) || funcs.has(name) || tables.has(name)) continue;
    // `create table public.x (`, `on public.x (`, `references public.x (` are
    // not calls. Only a name that no statement in this file declares is.
    if (new RegExp(`(?:table|on|references|into)\\s+public\\.${name}\\b`, "i").test(sql)) continue;
    // A create/drop statement naming it is a definition, not a call.
    problems.push(`${file}: calls public.${name}() — not defined by any earlier migration`);
  }

  // alias -> table, from `from public.x y` / `join public.x as y`
  const alias = new Map();
  for (const m of sql.matchAll(/\b(?:from|join)\s+public\.(\w+)(?:\s+as)?\s+(\w+)/gi)) {
    const [, table, a] = m;
    if (!/^(on|using|where|group|order|left|right|inner|join|lateral|set)$/i.test(a)) alias.set(a, table);
  }
  for (const [a, table] of alias) {
    const known = cols.get(table);
    if (!known) continue;
    for (const m of sql.matchAll(new RegExp(`\\b${a}\\.(\\w+)\\b`, "g"))) {
      const col = m[1];
      if (!known.has(col)) {
        problems.push(`${file}: ${a}.${col} — public.${table} has no column "${col}"`);
      }
    }
  }


  /* ---- then apply this file's own effects ---- */
  for (const name of defined) funcs.add(name);
  for (const m of sql.matchAll(/drop\s+function\s+(?:if\s+exists\s+)?public\.(\w+)/gi)) {
    // A drop immediately followed by a create in the same file is a replace.
    if (!defined.has(m[1])) funcs.delete(m[1]);
  }
}

const dedup = [...new Set(problems)];
const fresh = since
  ? dedup.filter((line) => !existing.has(line.split(":")[0]))
  : dedup;
const older = dedup.length - fresh.length;

if (fresh.length > 0) {
  console.error(`${fresh.length} problem${fresh.length === 1 ? "" : "s"}:\n`);
  console.error(fresh.join("\n"));
}
console.error(
  `\n${files.length} migrations checked, ${funcs.size} functions live at head` +
    (older > 0 ? `, ${older} known problem${older === 1 ? "" : "s"} in already-merged migrations` : ""),
);
process.exit(fresh.length > 0 ? 1 : 0);
