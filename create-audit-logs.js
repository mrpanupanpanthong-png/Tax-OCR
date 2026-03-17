// Script to create audit_logs table in Supabase
// Run: node create-audit-logs.js

const SUPABASE_URL = 'https://jfomezjpqiveanuppkus.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmb21lempwcWl2ZWFudXBwa3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY3NDMwNywiZXhwIjoyMDg5MjUwMzA3fQ.3Acta8_CQUx623vPxtZIvymDBw4qoEuRry3YM91LBpc';

async function createTable() {
  const sql = `
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
  `;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    // Try alternative: use pg endpoint directly
    const pgRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });
    
    console.log('\n❌ Could not auto-create via RPC. Please run this SQL in Supabase Dashboard > SQL Editor:\n');
    console.log('---');
    console.log(sql);
    console.log('---');
    return;
  }

  console.log('✅ audit_logs table created successfully!');
}

createTable().catch(console.error);
