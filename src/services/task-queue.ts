import { supabaseAdmin } from './supabase-client';
import { extractInvoiceData } from '../../services/gemini';

let isProcessing = false;

/**
 * Picks the oldest 'queued' job from the database and processes it.
 * This function runs sequentially and only one job is processed at a time.
 */
export async function processNextInQueue() {
  // Simple concurrency guard for the same process
  if (isProcessing) {
    console.log('[Worker] Queue already being processed, skipping loop start.');
    return;
  }
  
  isProcessing = true;
  console.log('[Worker] Task worker started.');

  try {
    // Keep processing as long as there are queued items
    while (true) {
      // 1. Fetch the oldest queued job
      // We also join with clients to get the necessary context for Gemini
      const { data: job, error: fetchError } = await supabaseAdmin
        .from('tax_invoices')
        .select('*, clients(name, tax_id)')
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('[Worker] Error fetching next job:', fetchError);
        break;
      }

      if (!job) {
        console.log('[Worker] No more jobs in queue. Worker resting.');
        break;
      }

      // 2. Immediately mark as processing to prevent others from picking it 
      // (Even though we have a local guard, this is good for multi-process safety)
      const { error: markError } = await supabaseAdmin
        .from('tax_invoices')
        .update({ status: 'processing' })
        .eq('id', job.id);

      if (markError) {
        console.error(`[Worker] Failed to mark job ${job.id} as processing:`, markError);
        continue; // Skip this one for now
      }

      console.log(`[Worker] --- Starting extraction for job ${job.id} ---`);

      try {
        // 3. Generate a temporary signed URL for Gemini
        const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
          .from('tax-documents')
          .createSignedUrl(job.file_url, 1800); // 30 minutes

        if (urlError || !signedUrlData?.signedUrl) {
          throw new Error(`Failed to generate signed URL: ${urlError?.message || 'Unknown'}`);
        }

        const clientInfo = job.clients as any;

        // 4. Call Gemini
        const geminiResult = await extractInvoiceData(signedUrlData.signedUrl, {
          name: clientInfo?.name,
          taxId: clientInfo?.tax_id
        });

        if (!geminiResult.success || !geminiResult.data) {
          throw new Error(`Gemini AI failed: ${geminiResult.error}`);
        }

        // 5. Structure the results
        let extractedArray = [];
        if (Array.isArray(geminiResult.data)) {
          extractedArray = geminiResult.data;
        } else if (geminiResult.data && typeof geminiResult.data === 'object') {
          extractedArray = [geminiResult.data];
        }

        if (extractedArray.length === 0) {
          throw new Error('AI could not find any valid invoices in this document.');
        }

        // 6. Update the first record
        const firstExtracted = extractedArray[0];
        const { error: updateError } = await supabaseAdmin
          .from('tax_invoices')
          .update({
            status: 'pending', // Transitions to 'Pending Review' for the user
            vendor_name: firstExtracted.vendor_name,
            tax_id: firstExtracted.tax_id,
            branch: firstExtracted.branch,
            invoice_no: firstExtracted.invoice_no,
            invoice_date: firstExtracted.invoice_date,
            total_amount: firstExtracted.total_amount,
            vat_amount: firstExtracted.vat_amount,
            net_amount: firstExtracted.net_amount,
            type: (firstExtracted.invoice_type as any) || 'purchase',
            raw_data: {
              gemini_raw: JSON.parse(geminiResult.raw_response || '{}'),
              confidence_score: firstExtracted.confidence_score_percent || 0,
              field_confidence: firstExtracted.field_confidence,
              is_duplicate: false
            }
          })
          .eq('id', job.id);

        if (updateError) {
           throw new Error(`DB Final Update Failed: ${updateError.message}`);
        }

        // 7. If multiple invoices found, insert the rest as new rows
        if (extractedArray.length > 1) {
          const additionalData = extractedArray.slice(1).map(extracted => ({
            client_id: job.client_id,
            file_url: job.file_url,
            status: 'pending',
            vendor_name: extracted.vendor_name,
            tax_id: extracted.tax_id,
            branch: extracted.branch,
            invoice_no: extracted.invoice_no,
            invoice_date: extracted.invoice_date,
            total_amount: extracted.total_amount,
            vat_amount: extracted.vat_amount,
            net_amount: extracted.net_amount,
            type: (extracted.invoice_type as any) || 'purchase',
            raw_data: {
              gemini_raw: JSON.parse(geminiResult.raw_response || '{}'),
              confidence_score: extracted.confidence_score_percent || 0,
              field_confidence: extracted.field_confidence,
              is_child_record: true
            }
          }));

          const { error: insertError } = await supabaseAdmin
            .from('tax_invoices')
            .insert(additionalData);
            
          if (insertError) {
            console.error('[Worker] Failed to insert additional invoices:', insertError);
          }
        }

        console.log(`[Worker] Job ${job.id} completed successfully.`);

      } catch (innerError: any) {
        console.error(`[Worker] Fatal error for job ${job.id}:`, innerError);
        // Put in 'pending' but with the error info so UI can show it
        await supabaseAdmin
            .from('tax_invoices')
            .update({ 
                status: 'pending',
                raw_data: { error: innerError.message || 'Worker failure' } 
            })
            .eq('id', job.id);
      }
    }
  } catch (outerError) {
    console.error('[Worker] Fatal queue loop error:', outerError);
  } finally {
    isProcessing = false;
    console.log('[Worker] Worker stopped.');
  }
}
