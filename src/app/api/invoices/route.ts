import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/services/supabase-client';

// NOTE: In a real Vercel environment, we would trigger a background function (like Inngest) here.
// For this Next.js API, we'll demonstrate the process synchronously, or fire-and-forget.
// We also import your written gemini parser here.
import { extractInvoiceData } from '../../../../services/gemini'; 

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

    // 2. Create the Database Record immediately with status 'pending'
    console.log('Creating database record...');
    const { data: dbRecord, error: dbError } = await supabaseAdmin
      .from('tax_invoices')
      .insert([
        { 
          file_url: filePath, 
          status: 'pending',
          type: 'purchase',
          client_id: clientId
        }
      ])
      .select('id')
      .single();

    if (dbError) {
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    // 3. BACKGROUND PROCESS: (Fire and forget)
    // We do NOT await this, so the API returns immediately to the user
    (async () => {
      try {
        console.log(`[Background] Starting Gemini extraction for ${dbRecord.id}...`);
        const geminiResult = await extractInvoiceData(fileUrl, {
          name: client.name,
          taxId: client.tax_id
        });
        
        if (!geminiResult.success || !geminiResult.data) {
          throw new Error(`Gemini extraction failed: ${geminiResult.error}`);
        }

        // Ensure we always work with an array
        let extractedArray = [];
        if (Array.isArray(geminiResult.data)) {
          extractedArray = geminiResult.data;
        } else if (geminiResult.data && typeof geminiResult.data === 'object') {
          extractedArray = [geminiResult.data];
        }

        if (extractedArray.length === 0) {
          throw new Error('AI could not find any valid invoices in this document.');
        }

        console.log(`[Background] Extracted ${extractedArray.length} invoices from ${dbRecord.id}`);

        // Process the first invoice by updating the existing placeholder row
        const firstExtracted = extractedArray[0];
        const firstConfidence = firstExtracted.confidence_score_percent || 0;

        const { error: duplicateError1 } = await supabaseAdmin
            .from('tax_invoices')
            .select('id')
            .eq('client_id', clientId)
            .eq('vendor_name', firstExtracted.vendor_name)
            .eq('invoice_no', firstExtracted.invoice_no)
            .eq('invoice_date', firstExtracted.invoice_date)
            .eq('status', 'confirmed')
            .neq('id', dbRecord.id)
            .limit(1);

        const { error: updateError } = await supabaseAdmin
            .from('tax_invoices')
            .update({
                status: 'pending',
                vendor_name: firstExtracted.vendor_name,
                tax_id: firstExtracted.tax_id,
                invoice_no: firstExtracted.invoice_no,
                invoice_date: firstExtracted.invoice_date,
                total_amount: firstExtracted.total_amount,
                vat_amount: firstExtracted.vat_amount,
                net_amount: firstExtracted.net_amount,
                type: firstExtracted.invoice_type || 'purchase',
                raw_data: {
                    gemini_raw: JSON.parse(geminiResult.raw_response || '{}'),
                    confidence_score: firstConfidence,
                    field_confidence: firstExtracted.field_confidence,
                    bounding_boxes: firstExtracted.bounding_boxes,
                    is_duplicate: false
                }
            })
            .eq('id', dbRecord.id);

        if (updateError) {
          console.error(`[Background] Update failed for ${dbRecord.id}:`, updateError);
        }

        // If there are more invoices, insert them as new rows referencing the same file
        if (extractedArray.length > 1) {
          const additionalInvoices = extractedArray.slice(1).map(extracted => ({
            client_id: clientId,
            file_url: fileUrl, // Point to the exact same file
            file_name: file.name,
            file_size: file.size,
            status: 'pending',
            vendor_name: extracted.vendor_name,
            tax_id: extracted.tax_id,
            invoice_no: extracted.invoice_no,
            invoice_date: extracted.invoice_date,
            total_amount: extracted.total_amount,
            vat_amount: extracted.vat_amount,
            net_amount: extracted.net_amount,
            type: extracted.invoice_type || 'purchase',
            raw_data: {
              gemini_raw: JSON.parse(geminiResult.raw_response || '{}'),
              confidence_score: extracted.confidence_score_percent || 0,
              field_confidence: extracted.field_confidence,
              bounding_boxes: extracted.bounding_boxes,
              is_duplicate: false,
              is_child_record: true // Flag to indicate it shares a file with another row
            }
          }));

          const { error: insertError } = await supabaseAdmin
            .from('tax_invoices')
            .insert(additionalInvoices);

          if (insertError) {
             console.error(`[Background] Failed to insert additional invoices for ${dbRecord.id}:`, insertError);
          } else {
             console.log(`[Background] Inserted ${additionalInvoices.length} additional invoices`);
          }
        }

      } catch (bgError: any) {
        console.error(`[Background] Fatal error processing ${dbRecord.id}:`, bgError);
        // Mark as failed so UI can show error state
        await supabaseAdmin
            .from('tax_invoices')
            .update({ 
                status: 'pending', // Keep as pending but add error info in raw_data 
                raw_data: { error: bgError.message || 'Unknown background error' } 
            })
            .eq('id', dbRecord.id);
      }
    })();

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
            // Include invoices within date range OR any invoice that is still pending/needs review
            query = query.or(`and(invoice_date.gte.${start},invoice_date.lte.${end}),status.eq.pending`);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
