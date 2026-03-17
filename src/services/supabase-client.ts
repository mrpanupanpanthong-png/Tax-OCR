import { createClient } from '@supabase/supabase-js';

// Ensure these environment variables are set in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase URL or Key is missing. Check your environment variables.');
}

// We use the Service Role key here because the OCR backend webhook
// needs permission to write and update the database reliably independently of user auth state.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
