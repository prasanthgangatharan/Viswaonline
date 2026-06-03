// Deletes all test data except the admin user.
// Run with: node scripts/clear-data.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dapqwuojoylvwbmtkqok.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcHF3dW9qb3lsdndibXRrcW9rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIwNDY3OCwiZXhwIjoyMDk0NzgwNjc4fQ.fnquq6Kyu4XVVZwAAHErbEOHE2iIimi2WSx1NgTItO0';

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function del(table, filter) {
  const q = filter
    ? sb.from(table).delete().match(filter)
    : sb.from(table).delete().not('id', 'is', null);
  const { error } = await q;
  if (error) console.error(`  ✗ ${table}: ${error.message}`);
  else console.log(`  ✓ ${table} cleared`);
}

console.log('Clearing data...\n');

// Order matters — delete child tables before parents to avoid FK violations
await del('overflow_bets');
await del('bets');
await del('results');
await del('lotteries');

// Must delete from agents (FK child) before users (FK parent)
await del('agents');
const { error: uErr } = await sb.from('users').delete().eq('role', 'agent');
if (uErr) console.error(`  ✗ users (agents): ${uErr.message}`);
else console.log('  ✓ agent users cleared');

console.log('\nDone. Admin account is untouched.');
