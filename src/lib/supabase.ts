import { createClient } from "@supabase/supabase-js";
import { assertClientEnv, env } from "./env";

assertClientEnv();

export const supabase = createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
