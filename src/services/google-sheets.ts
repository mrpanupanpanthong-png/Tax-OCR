import { google } from 'googleapis';
import { Invoice } from '../types';
import { supabaseAdmin } from './supabase-client';

/**
 * ============================================================================
 * SETUP INSTRUCTIONS: GOOGLE SERVICE ACCOUNT CREDENTIALS
 * ============================================================================
 * 
 * To write data to a Google Sheet, you need a Service Account which acts as a 
 * "bot user" with its own email address.
 * 
 * 1. Go to the Google Cloud Console (https://console.cloud.google.com).
 * 2. Create a new project (or select your existing one).
 * 3. Navigate to "APIs & Services" > "Library" and enable the "Google Sheets API".
 * 4. Navigate to "APIs & Services" > "Credentials".
 * 5. Click "Create Credentials" > "Service Account".
 * 6. Give it a name (e.g., 'tax-report-exporter') and click "Done".
 * 7. Click on the newly created Service Account, go to the "Keys" tab.
 * 8. Click "Add Key" > "Create new key", select "JSON" and download the file.
 * 9. Save this JSON file securely in your project as `google-credentials.json`.
 *    WARNING: Add this file to your `.gitignore` so it doesn't get pushed to Git.
 * 
 * 10. IMPORTANT: Open your target Google Sheet in the browser and click "Share".
 *     Share the spreadsheet with the `client_email` found inside your JSON key 
 *     file, and grant it "Editor" access. The bot cannot write to a sheet it 
 *     doesn't have permission to modify!
 * ============================================================================
 */


// If you have saved 'google-credentials.json' locally:
// In production, we typically use environment variables instead of hard-coded files.
// e.g., process.env.GOOGLE_APPLICATION_CREDENTIALS
let authClient: any;

try {
  // We initialize the Google Auth client lazily to avoid crashing on import 
  // if the credentials file doesn't exist yet.
  const credentials = require('../../google-credentials.json');
  
  authClient = new google.auth.GoogleAuth({
    credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
    },
    // The scope required to read and write to all sheets that the service account has access to
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
} catch (error) {
  console.warn('Google Credentials not found. Please follow the setup instructions in services/google-sheets.ts');
}

/**
 * Authenticates, clears the target sheet, and writes structured invoice data including headers.
 * 
 * @param dateRange - Filter range object { startDate: string, endDate: string }
 * @param sheetId - The unique ID of the target Google Sheet (extracted from the URL)
 */
export async function exportToGoogleSheets(
  dateRange: { startDate: string; endDate: string }, 
  sheetId: string
) {
  if (!authClient) {
    throw new Error('Server misconfiguration: missing Google authentication credentials.');
  }

  const sheets = google.sheets({ version: 'v4', auth: authClient });

  try {
    // 1. Fetch filtered data from Supabase based on the dateRange.
    console.log(`Fetching invoices from ${dateRange.startDate} to ${dateRange.endDate}...`);
    
    let query = supabaseAdmin
      .from('tax_invoices')
      .select('*')
      .eq('status', 'confirmed') // Only export confirmed invoices to Google Sheets
      .order('invoice_date', { ascending: true });

    if (dateRange.startDate && dateRange.endDate) {
      query = query.gte('invoice_date', dateRange.startDate).lte('invoice_date', dateRange.endDate);
    }

    const { data: invoices, error: dbError } = await query;

    if (dbError) {
      throw new Error(`Database fetch failed: ${dbError.message}`);
    }

    if (!invoices || invoices.length === 0) {
      return { 
        success: true, 
        message: 'No confirmed invoices found for this date range in the database.' 
      };
    }

    // 2. Format the data for Google Sheets
    // The first row should be the tabular headers
    const headers = ['Invoice No.', 'Date', 'Vendor Name', 'Tax ID', 'Net Amount', 'VAT Amount', 'Total Amount', 'Status'];
    
    const rows = invoices.map(inv => [
      inv.invoice_no,
      inv.invoice_date,
      inv.vendor_name,
      inv.tax_id,
      inv.net_amount,
      inv.vat_amount,
      inv.total_amount,
      inv.status
    ]);

    // Google Sheets API expects a 2D array: [ [Row 1...], [Row 2...] ]
    const values = [headers, ...rows];

    // 3. Clear existing data in the target sheet
    // We clear 'Sheet1'. If user's sheet has a different name, this will need to be parameterized.
    console.log(`Clearing existing data in Sheet ID: ${sheetId}...`);
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: 'Sheet1', 
    });

    // 4. Write the newly formatted tabular data into the sheet
    console.log('Writing exported data to the sheet...');
    const result = await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Sheet1!A1',               // Start writing from the very first cell
      valueInputOption: 'USER_ENTERED', // Parses numbers, dates correctly as if typed manually
      requestBody: {
        values: values,
      },
    });

    console.log(`Successfully exported ${result.data?.updatedCells} cells to Google Sheets.`);
    
    return { 
      success: true, 
      message: `Export successful. Updated ${result.data?.updatedCells} cells.` 
    };

  } catch (error: any) {
    console.error('Error exporting to Google Sheets:', error.message);
    throw new Error(`Failed to export to Google Sheets: ${error.message}`);
  }
}
