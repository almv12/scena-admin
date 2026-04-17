import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xkpnjuuxoqwklfviaaeo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrcG5qdXV4b3F3a2xmdmlhYWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NzkyMjQsImV4cCI6MjA5MDM1NTIyNH0.HQBlQgvUJoG2oiS1YqiOnmDxksOtalwAxmQ58hgqY_A'

export const supabase = createClient(supabaseUrl, supabaseKey)
