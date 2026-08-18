// PLACEHOLDER — committed so the typed client compiles before the first real
// generation run. Overwrite with `npm run types:gen` (owner-executed; needs a
// Supabase access token builders do not hold — see README "Supabase").
// Shape matches what `supabase gen types typescript` emits for a project whose
// public schema has no tables, views, functions, enums, or composite types yet.
// Do not edit by hand.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
