// Script to create audit_logs table in Supabase
// Run: node create-audit-logs.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jfomezjpqiveanuppkus.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmb21lempwcWl2ZWFudXBwa3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY3NDMwNywiZXhwIjoyMDg5MjUwMzA3fQ.3Acta8_CQUx623vPxtZIvymDBw4qoEuRry3YM91LBpc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  console.log('Creating audit_logs table...');

  const { error } = await supabase.rpc('exec', {
    query: `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID REFERENCES tax_invoices(id) ON DELETE CASCADE,
        user_id UUID,
        user_name TEXT,
        field_name VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_invoice_id ON audit_logs(invoice_id);
    `
  });

  if (error) {
    console.error('❌ RPC failed. Trying direct SQL via pg extension...\n');
    
    // Alternative: call the pg endpoint
    const r2 = await supabase.from('_sql').select('*');
    console.log('Please create the table manually in Supabase Dashboard > SQL Editor:');
    console.log(`
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES tax_invoices(id) ON DELETE CASCADE,
    user_id UUID,
    user_name TEXT,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_invoice_id ON audit_logs(invoice_id);
`);
    return;
  }

  console.log('✅ Done! audit_logs table created.');
}

run().catch(console.error);
