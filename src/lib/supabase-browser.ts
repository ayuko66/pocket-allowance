import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';

let browserClient: ReturnType<typeof createBrowserSupabaseClient> | null = null;

export const supabaseBrowser = () => {
  if (!browserClient) {
    browserClient = createBrowserSupabaseClient();
  }
  return browserClient;
};
