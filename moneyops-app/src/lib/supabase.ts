import { createClient } from "@supabase/supabase-js"

let serverClient: ReturnType<typeof createClient> | null = null

export function getSupabaseServerClient() {
  if (serverClient) {
    return serverClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    return null
  }

  serverClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return serverClient
}
