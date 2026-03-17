import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jfomezjpqiveanuppkus.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmb21lempwcWl2ZWFudXBwa3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY3NDMwNywiZXhwIjoyMDg5MjUwMzA3fQ.3Acta8_CQUx623vPxtZIvymDBw4qoEuRry3YM91LBpc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debug() {
  console.log('--- Checking Clients ---');
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*');
  
  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
  } else {
    console.table(clients);
  }

  const targetClient = clients?.find(c => c.name.includes('ธงชัย'));
  
  if (targetClient) {
    console.log(`\n--- Found Client: ${targetClient.name} (ID: ${targetClient.id}) ---`);
    const { data: invoices, error: invError } = await supabase
      .from('tax_invoices')
      .select('id, vendor_name, status, type, invoice_date, created_at')
      .eq('client_id', targetClient.id);
    
    if (invError) {
      console.error('Error fetching invoices:', invError);
    } else {
      console.log(`Found ${invoices?.length || 0} invoices:`);
      console.table(invoices);
    }
  } else {
    console.log('\n--- Client "ธงชัย" not found in database ---');
  }
}

debug();
