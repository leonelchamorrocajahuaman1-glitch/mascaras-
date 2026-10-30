import "server-only";
import { localRepository } from "./local";
import { supabaseRepository } from "./supabase";
import type { Repository } from "./types";
import { isSupabaseConfigured } from "./env";

export { DbError } from "./types";
export { isSupabaseConfigured, isReadOnlyDeployment, READ_ONLY_MESSAGE } from "./env";

/** Tienda y panel de administración comparten siempre este mismo repositorio. */
export function db(): Repository {
  return isSupabaseConfigured() ? supabaseRepository : localRepository;
}
