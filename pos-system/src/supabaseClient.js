import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mdlhypppbvgirnkanjjq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbGh5cHBwYnZnaXJua2FuampxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwOTcwMDksImV4cCI6MjA4MzY3MzAwOX0.K4mAcbzYpw5L446K7-kOCeLwK-6GipfN4uwC-vyizUw'

export const supabase = createClient(supabaseUrl, supabaseKey)