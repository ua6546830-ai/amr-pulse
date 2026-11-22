const FALLBACK = "http://localhost:3000";

export function siteUrl(): URL {
  const explicit = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  const vercel = (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "").trim();
  const raw = explicit || (vercel ? `https://${vercel}` : FALLBACK);
  try {
    return new URL(raw);
  } catch {
    return new URL(FALLBACK);
  }
}
