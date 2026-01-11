import { createClient } from '@supabase/supabase-js'

// Vite loads variables from the .env file automatically
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)