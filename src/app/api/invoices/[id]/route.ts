import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/services/supabase-client';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    
    // In a real app, we get the current user from auth
    // For this demonstration, we'll mock a user
    const mockUser = {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Mock Accountant',
      role: 'data_entry'
    };

    // 1. Get current values before update for audit logs
    const { data: currentInvoice, error: fetchError } = await supabaseAdmin
      .from('tax_invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 2. Perform the update
    const { error: updateError } = await supabaseAdmin
      .from('tax_invoices')
      .update(body)
      .eq('id', id);

    if (updateError) throw updateError;

    // 3. Log changes to audit_logs
    const auditEntries = [];
    for (const key in body) {
      if (body[key] !== currentInvoice[key]) {
        auditEntries.push({
          invoice_id: id,
          user_id: mockUser.id,
          user_name: mockUser.name,
          field_name: key,
          old_value: String(currentInvoice[key] || ''),
          new_value: String(body[key] || '')
        });
      }
    }

    if (auditEntries.length > 0) {
      const { error: logError } = await supabaseAdmin
        .from('audit_logs')
        .insert(auditEntries);
      
      if (logError) {
        console.error('Failed to save audit logs:', logError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PATCH Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET route to fetch invoice details and edit history
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // 1. Get invoice details
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('tax_invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError || !invoice) {
       return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 2. Generate signed URL for the file
    let signedUrl = invoice.file_url;
    if (invoice.file_url && !invoice.file_url.startsWith('http')) {
      const { data: signedData } = await supabaseAdmin.storage
        .from('tax-documents')
        .createSignedUrl(invoice.file_url, 900);
      signedUrl = signedData?.signedUrl || invoice.file_url;
    }

    // 3. Get audit logs (graceful fallback if table doesn't exist yet)
    let logs: any[] = [];
    try {
      const { data: logsData, error: logsError } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .eq('invoice_id', id)
        .order('timestamp', { ascending: false });
      
      if (!logsError) {
        logs = logsData || [];
      }
    } catch (logsFetchError) {
      // audit_logs table may not exist yet - that's ok
      console.warn('[GET invoice] audit_logs not available:', logsFetchError);
    }

    return NextResponse.json({
      ...invoice,
      file_url: signedUrl,
      history: logs
    });

  } catch (error: any) {
    console.error('GET invoice error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
