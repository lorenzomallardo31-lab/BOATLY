import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const JWT_ISSUED_AT_FUTURE_MESSAGE = "JWT issued at future";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const fetchWithJwtClockSkewRetry: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);

  if (response.status !== 401) {
    return response;
  }

  let responseBody = "";

  try {
    responseBody = await response.clone().text();
  } catch {
    return response;
  }

  if (!responseBody.includes(JWT_ISSUED_AT_FUTURE_MESSAGE)) {
    return response;
  }

  // PostgREST can very briefly reject a freshly issued Supabase Auth JWT
  // when the managed Auth and Data API clocks are slightly out of sync.
  // Authentication is rejected before the database operation runs, so a
  // single narrow retry for this exact PGRST303 condition is safe even for
  // trusted mutation RPCs. Do not retry other 401 responses here.
  await delay(1500);

  return fetch(input, init);
};

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        fetch: fetchWithJwtClockSkewRetry,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write cookies.
            // The Next.js proxy refreshes the session when needed.
          }
        },
      },
    },
  );
}
