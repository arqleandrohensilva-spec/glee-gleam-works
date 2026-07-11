import { createClient } from "@supabase/supabase-js";

const NLOS_SUPABASE_URL = "https://krzuroijejfozljhchok.supabase.co";
const NLOS_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyenVyb2lqZWpmb3psamhjaG9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5Mjg4MjEsImV4cCI6MjA5MzUwNDgyMX0.mFMFfY8TdviFVzHvfKYUrZENpcT4wdyW-52-CUNqsOo";

export const nlosAuth = createClient(NLOS_SUPABASE_URL, NLOS_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
