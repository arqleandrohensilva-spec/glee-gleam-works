import { createClient } from "@supabase/supabase-js";

const NLOS_SUPABASE_URL = "https://gwmifubdcjfyyrypenah.supabase.co";
const NLOS_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3bWlmdWJkY2pmeXlyeXBlbmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MDI3MTYsImV4cCI6MjEwNDI3ODcxNn0.zfd7JU4JtqpSn-y-2mfuTIRQJafzNoBvlMQsL6-7pBQ";

export const nlosAuth = createClient(NLOS_SUPABASE_URL, NLOS_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
