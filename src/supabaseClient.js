import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sooaldobmyizrosrgtsr.supabase.co'
const supabaseKey = 'sb_publishable_nnGDcbyA68HJ2h0sdjm4nw_x0WSyvoM'

export const supabase = createClient(supabaseUrl, supabaseKey)