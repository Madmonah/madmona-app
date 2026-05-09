// ============================================================================
// Madmona — Apply Categories Migration
// Reads .env.local, connects to Supabase Postgres, runs the migration SQL.
// ============================================================================

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const ENV_LOCAL    = path.join(PROJECT_ROOT, '.env.local');
const SQL_FILE     = path.join(PROJECT_ROOT, 'supabase', 'migrations', '20260505000000_more_categories.sql');

// ---------- helpers ----------

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const rawLine of content.split('\n')) {
    const line = rawLine.replace(/\r$/, '').trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.substring(0, eq).trim();
    let value = line.substring(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value;
  }
  return env;
}

function extractProjectRef(supabaseUrl) {
  if (!supabaseUrl) return null;
  const m = supabaseUrl.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return m ? m[1] : null;
}

// Split a SQL script into individual statements, ignoring -- comments
// and respecting single-quoted string literals.
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inSingle = false;
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    // Line comment
    if (!inSingle && ch === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }

    // Toggle single quote (handle escaped '')
    if (ch === "'") {
      if (inSingle && next === "'") {
        current += "''";
        i += 2;
        continue;
      }
      inSingle = !inSingle;
      current += ch;
      i++;
      continue;
    }

    // Statement terminator
    if (!inSingle && ch === ';') {
      const stmt = current.trim();
      if (stmt.length > 0) statements.push(stmt);
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }
  const tail = current.trim();
  if (tail.length > 0) statements.push(tail);
  return statements;
}

// ---------- main ----------

async function main() {
  console.log('====================================================');
  console.log(' Madmona  -  Apply Categories Migration');
  console.log('====================================================');
  console.log('');

  // 1. Load env
  const env = { ...parseEnvFile(ENV_LOCAL), ...process.env };

  // 2. Read SQL
  if (!fs.existsSync(SQL_FILE)) {
    console.error('[FAIL] Migration file not found:');
    console.error('       ' + SQL_FILE);
    process.exit(1);
  }
  const sqlText = fs.readFileSync(SQL_FILE, 'utf8');
  console.log('[OK]   Loaded migration (' + sqlText.length + ' chars)');

  // 3. Find connection string
  const connectionString =
    env.DATABASE_URL ||
    env.POSTGRES_URL ||
    env.POSTGRES_PRISMA_URL ||
    env.SUPABASE_DB_URL ||
    null;

  if (!connectionString) {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const projectRef = extractProjectRef(supabaseUrl);

    console.error('');
    console.error('[FAIL] DATABASE_URL not found in .env.local');
    console.error('');
    console.error('  Add DATABASE_URL to .env.local. Steps:');
    console.error('');
    if (projectRef) {
      console.error('  1. Open:');
      console.error('     https://supabase.com/dashboard/project/' + projectRef + '/settings/database');
    } else {
      console.error('  1. Open Supabase dashboard > Project Settings > Database');
    }
    console.error('  2. Under "Connection string" -> select "URI"');
    console.error('  3. Pick "Session pooler" (port 5432) - best for migrations');
    console.error('  4. Copy the URL, replace [YOUR-PASSWORD] with your DB password');
    console.error('  5. Add this line to .env.local:');
    console.error('');
    console.error('       DATABASE_URL=postgresql://postgres.xxx:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres');
    console.error('');
    console.error('  6. Re-run the .bat');
    console.error('');
    console.error('  ----------------------------------------------------');
    console.error('  Or run the SQL manually in Supabase Studio:');
    if (projectRef) {
      console.error('       https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
    }
    console.error('  And paste the contents of: ' + SQL_FILE);
    console.error('');
    process.exit(2);
  }

  console.log('[OK]   Found DATABASE_URL');

  // 4. Load pg
  let Client;
  try {
    Client = require('pg').Client;
  } catch (err) {
    console.error('[FAIL] pg module not installed.');
    console.error('       Run: npm install pg --no-save');
    process.exit(1);
  }
  console.log('[OK]   pg module loaded');

  // 5. Split into statements
  const statements = splitStatements(sqlText);
  console.log('[OK]   Parsed ' + statements.length + ' SQL statements');
  console.log('');

  // 6. Connect & run
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('-->    Connecting to Supabase Postgres...');
    await client.connect();
    console.log('[OK]   Connected');
    console.log('');

    console.log('-->    Running migration...');
    let lastResult = null;
    let inserted = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        const result = await client.query(stmt);
        lastResult = result;
        if (result.command === 'INSERT' && typeof result.rowCount === 'number') {
          inserted += result.rowCount;
        }
      } catch (err) {
        console.error('[FAIL] Statement ' + (i + 1) + '/' + statements.length + ' failed:');
        console.error('       ' + err.message);
        if (err.detail) console.error('       Detail: ' + err.detail);
        if (err.hint)   console.error('       Hint:   ' + err.hint);
        console.error('');
        console.error('       Statement (first 200 chars):');
        console.error('       ' + stmt.substring(0, 200).replace(/\n/g, ' '));
        throw err;
      }
    }

    console.log('[OK]   All statements executed');
    console.log('       New rows inserted: ' + inserted);
    console.log('');

    if (lastResult && lastResult.rows && lastResult.rows.length > 0) {
      const stats = lastResult.rows[0];
      console.log('  +------------------------------------------+');
      console.log('  | Categories summary                       |');
      console.log('  +------------------------------------------+');
      console.log('  | Root categories  : ' + String(stats.root_categories).padEnd(21)  + '|');
      console.log('  | Sub categories   : ' + String(stats.sub_categories).padEnd(21)   + '|');
      console.log('  | Total attributes : ' + String(stats.total_attributes).padEnd(21) + '|');
      console.log('  +------------------------------------------+');
      console.log('');

      if (Number(stats.root_categories) >= 8 && Number(stats.sub_categories) >= 50) {
        console.log('[DONE] Migration applied successfully!');
      } else {
        console.log('[WARN] Counts lower than expected. Check the admin panel.');
      }
    } else {
      console.log('[DONE] Migration applied. (verification select returned no rows)');
    }
  } finally {
    try { await client.end(); } catch (_) {}
  }
}

main().catch(err => {
  console.error('');
  console.error('[FAIL] Unexpected error:');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
