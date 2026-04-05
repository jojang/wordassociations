import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kymiszxrqlbkhlzbfwsf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5bWlzenhycWxia2hsemJmd3NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMzEwOTUsImV4cCI6MjA5MDkwNzA5NX0.5HvDs6pOpaW-vMPnX6ba5TwMV2WDc5rrEvCiOCOWSoQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
