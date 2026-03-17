import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/services/supabase-client';

// NOTE: In a real Vercel environment, we would trigger a background function (like Inngest) here.
// For this Next.js API, we'll demonstrate the process synchronously, or fire-and-forget.
// We also import your written gemini parser here.
import { processNextInQueue } from '@/services/task-queue'; 

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clientId = formData.get('clientId') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ error: 'No client selected' }, { status: 400 });
    }

    // Fetch client info from Supabase
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('name, tax_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error(`Client not found: ${clientError?.message || 'Unknown error'}`);
    }

    // 1. Upload file to Supabase Storage (Private Bucket)
    // We use Supabase Storage instead of GCS here to consolidate our DB and Storage for simplicity
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `invoices/${fileName}`;

    console.log(`Uploading file ${file.name} to storage...`);
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('tax-documents') // Needs to be created in Supabase Dashboard
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Generate a temporary signed URL for Gemini to access the file
    // Expire in 15 minutes (900 seconds) for security
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('tax-documents')
      .createSignedUrl(filePath, 900);

    if (signedUrlError) {
        throw new Error(`Failed to generate signed URL: ${signedUrlError.message}`);
    }
    
    const fileUrl = signedUrlData.signedUrl;

    // 2. Create the Database Record immediately with status 'queued'
    console.log('Creating database record as queued...');
    const { data: dbRecord, error: dbError } = await supabaseAdmin
      .from('tax_invoices')
      .insert([
        { 
          file_url: filePath, 
          status: 'queued', // Important for the sequential queue
          type: 'purchase',
          client_id: clientId
        }
      ])
      .select('id')
      .single();

    if (dbError) {
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    // 3. DONE: We just return success. 
    // The background processing will be triggered when the user visits the Dashboard (via GET api).
    // This allows the user to see the "Queued" items first.

    // Return 202 Accepted immediately
    return NextResponse.json(
      { 
        message: 'File upload accepted and processing started.', 
        invoiceId: dbRecord.id,
        status: 'pending'
      }, 
      { status: 202 }
    );

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}

// GET route to fetch invoices for the dashboard
export async function GET(request: Request) {
    try {
        // Ping the worker in case some jobs are stuck in 'queued'
        // across server restarts.
        processNextInQueue().catch(() => {});
        const { searchParams } = new URL(request.url);
        const start = searchParams.get('startDate');
        const end = searchParams.get('endDate');
        const clientId = searchParams.get('clientId');

        let query = supabaseAdmin
            .from('tax_invoices')
            .select('*')
            .order('created_at', { ascending: false });

        if (clientId) {
            query = query.eq('client_id', clientId);
        }

        if (start && end) {
            // Show invoices within date range OR any invoice that is still in the workflow (queued, processing, pending review, or failed)
            // This ensures new uploads show up immediately on the dashboard.
            query = query.or(`and(invoice_date.gte.${start},invoice_date.lte.${end}),status.in.(pending,queued,processing,failed)`);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
