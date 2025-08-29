import { createClient } from '@supabase/supabase-js';

// --- IMPORTANT ---
// To use this application, you need to create a Supabase project and fill in
// your project's URL and public anon key below.
// You can find these in your Supabase project settings under "API".
const supabaseUrl = 'https://ncnofduhsfejlmtjfirn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jbm9mZHVoc2ZlamxtdGpmaXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0Mzc1NjMsImV4cCI6MjA3MjAxMzU2M30.9o1mVfO0p4wh98vQ4YQ4yDLnom5PUt2w1UGPj8MenIY';

/**
 * Checks if the Supabase credentials are still the placeholder values.
 * @returns {boolean} True if credentials are placeholders, false otherwise.
 */
export const areCredentialsPlaceholders = () => {
  return supabaseUrl.startsWith('https://your-project-url') || supabaseAnonKey.startsWith('your-public-anon-key');
};

if (areCredentialsPlaceholders()) {
  console.warn(`
    ********************************************************************************
    * WARNING: Supabase credentials are not configured.                            *
    * Please update supabaseUrl and supabaseAnonKey in 'lib/supabaseClient.ts'     *
    * with your project's credentials from supabase.com.                           *
    * The application will not be able to connect to the database.                 *
    ********************************************************************************
  `);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
