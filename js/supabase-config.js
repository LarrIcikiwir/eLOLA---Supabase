// Konfigurasi Kredensial Supabase eLOLA
export const SUPABASE_URL = 'https://sezmeitlvzcvqleutdxl.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlem1laXRsdnpjdnFsZXV0ZHhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMDg5NDgsImV4cCI6MjEwNjU4NDk0OH0.8HCacSJB4AicBnCe_AJccSTPgOCXQlZNkwPQeR-tb08';

// Inisialisasi Supabase Client
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
