import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://geintonpintywwtybhvi.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaW50b25waW50eXd3dHliaHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2OTUzMjgsImV4cCI6MjA5MDI3MTMyOH0.K9MLzx7qLv6PJt4AjEzJvl8m-qdTjra3FGFZOF10uug'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
