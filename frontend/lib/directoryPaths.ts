// Shared "is this a Directory page" check — the same denylist Navbar.tsx uses
// to decide whether to show Directory-only nav (CategoryStrip, mega-menu,
// Advertise…). Directory's own pages are a dynamic catch-all
// (app/[category]/page.tsx, ~250 category-slug URLs), so this has to stay a
// denylist of non-Directory paths — an allowlist of Directory paths would
// break every category page. Kept here (not duplicated) so Navbar and any
// other Directory-scoped chrome (e.g. the floating "Post a requirement"
// button) can't drift out of sync.
const NON_DIRECTORY_PATHS = [
  "/",
  "/credit-card",
  "/mutual",
  "/recruitment",
  "/about",
  "/pricing",
  "/features",
  "/offer",
  "/register",
  "/login",
  "/dashboard",
  "/profile",
  "/admin",
];

export function isDirectoryPage(pathname: string | null): boolean {
  const p = pathname || "/";
  return !(
    NON_DIRECTORY_PATHS.includes(p) ||
    p.startsWith("/consultations") ||
    p.startsWith("/blog")
  );
}
