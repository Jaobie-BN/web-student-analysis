import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Check if variables are missing or set to placeholder/empty values
export const isDemoMode =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes("your-supabase-url") ||
  supabaseAnonKey.includes("your-supabase-key") ||
  supabaseUrl === "" ||
  supabaseAnonKey === "";

// Initialize client if not in demo mode
export const supabase = !isDemoMode
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
