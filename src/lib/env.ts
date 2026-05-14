export const env = {
  supabaseUrl: normalizeSupabaseUrl(
    import.meta.env.VITE_SUPABASE_URL as string | undefined,
  ),
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
};

function normalizeSupabaseUrl(value: string | undefined) {
  if (!value) {
    return value;
  }

  return value.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export function assertClientEnv() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
}
