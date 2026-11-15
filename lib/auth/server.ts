import { createNeonAuth } from "@neon/auth/next/server";

// Lazy creation keeps local play and builds usable without online credentials.
export function getAuth() {
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) {
    throw new Error("Accounts are not configured yet.");
  }
  return createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET },
  });
}
