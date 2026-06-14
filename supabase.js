// ConnectX - Supabase Connection
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://nyldfpwwabboixhxjvds.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bGRmcHd3YWJib2l4aHhqdmRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNzIzMjAsImV4cCI6MjA5Njk0ODMyMH0.MlTu9PUMaLTsSuLFZds4tV21BJQYhrAxKNc_z3A6P34'
// ⚠️ Supabase dashboard → Settings → API → anon key copy garera maathi rakhnus

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)