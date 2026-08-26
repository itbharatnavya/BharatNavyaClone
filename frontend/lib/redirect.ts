// Shared, validated post-auth redirect target. Used by the guest-only pages
// (Login/Register) so a `?next=` query param can't become an open-redirect
// (an absolute/off-origin URL) or bounce the user onto the OTHER auth page
// (the root cause of the Login<->Register loop this file was added to fix).

const AUTH_PAGES = ["/login", "/register"];

export function safeNext(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  // Must be a single-leading-slash relative path: rejects absolute URLs
  // (http://, https://), protocol-relative (//host) and backslash tricks
  // (some browsers treat \ like / in a location, e.g. "/\evil.com").
  if (!/^\/(?!\/|\\)/.test(raw)) return fallback;
  const path = raw.split(/[?#]/)[0];
  if (AUTH_PAGES.includes(path)) return fallback;
  return raw;
}
