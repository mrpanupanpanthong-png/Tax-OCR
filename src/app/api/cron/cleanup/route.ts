import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/services/supabase-client';

/**
 * CRON JOB: Data Retention Policy
 * This endpoint should be called periodically (e.g., daily) via a cron service like Vercel Cron.
 * It deletes all tax invoices and their associated files in storage that are older than 30 days.
 */
export async function GET(request: Request) {
  // Security check: Ensure this is only called by an authorized cron service
  // In a real app, use: if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) { ... }
  
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString();

    console.log(`[Cron] Starting cleanup for records older than ${dateStr}...`);

    // 1. Find records to delete
    const { data: recordsToDelete, error: fetchError } = await supabaseAdmin
      .from('tax_invoices')
      .select('id, file_url')
      .lt('created_at', dateStr);

    if (fetchError) throw fetchError;

    if (!recordsToDelete || recordsToDelete.length === 0) {
      return NextResponse.json({ message: 'No records found for deletion.' });
    }

    const filePaths = recordsToDelete.map(r => r.file_url);
    const recordIds = recordsToDelete.map(r => r.id);

    // 2. Delete files from Supabase Storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('tax-documents')
      .remove(filePaths);

    if (storageError) {
       console.error('[Cron] Storage deletion error:', storageError);
       // We continue anyway to clean up DB records if possible
    }

    // 3. Delete records from Database
    // Audit logs will be deleted automatically due to ON DELETE CASCADE
    const { error: dbError } = await supabaseAdmin
      .from('tax_invoices')
      .delete()
      .in('id', recordIds);

    if (dbError) throw dbError;

    console.log(`[Cron] Successfully deleted ${recordIds.length} records and files.`);

    return NextResponse.json({
      success: true,
      deleted_count: recordIds.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Cron] Error during cleanup:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
