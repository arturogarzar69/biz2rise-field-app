import { createClient } from "@supabase/supabase-js";

let supabaseClient;

export function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    supabaseUrl,
    supabaseAnonKey,
    hasUrl: typeof supabaseUrl === "string" && supabaseUrl.length > 0,
    hasAnonKey: typeof supabaseAnonKey === "string" && supabaseAnonKey.length > 0,
    isValidUrl: typeof supabaseUrl === "string" && /^https?:\/\//.test(supabaseUrl),
    hasPlaceholderKey: supabaseAnonKey === "your_supabase_anon_key_here"
  };
}

function hasValidSupabaseConfig() {
  const config = getSupabaseConfig();

  return (
    config.hasUrl &&
    config.isValidUrl &&
    config.hasAnonKey &&
    !config.hasPlaceholderKey
  );
}

export function getSupabaseClient() {
  if (!hasValidSupabaseConfig()) {
    return null;
  }

  if (!supabaseClient) {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

    supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      }
    );
  }

  return supabaseClient;
}
