import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Ganti sesuai Project Settings > API di Dashboard Supabase Anda
const SUPABASE_URL = "https://hrftopjgnsyshzrgqwsf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZnRvcGpnbnN5c2h6cmdxd3NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NDE4NjcsImV4cCI6MjEwNjMxNzg2N30.JxKsDB5W8MGqZLgkIxuW_qbqkwJyDUytdvtY6BPEQWU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);