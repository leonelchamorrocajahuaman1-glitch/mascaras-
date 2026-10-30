import "server-only";
import { localRepository } from "./local";
import { supabaseRepository } from "./supabase";
import type { Repository } from "./types";

export { DbError } from "./types";

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Tienda y panel de administración comparten siempre este mismo repositorio. */
export function db(): Repository {
  return isSupabaseConfigured() ? supabaseRepository : localRepository;
}
