const COUNTER_PUBLIC_EXACT = new Set([
  "/",
  "/about",
  "/about/team",
  "/careers",
  "/contact",
  "/pricing",
  "/blog",
  "/directory",
  "/search",
  "/rfq",
  "/categories",
  "/brands",
  "/collections",
]);

const COUNTER_PUBLIC_PREFIXES = [
  "/brand/",
  "/collection/",
  "/blog/",
  "/directory/",
  "/search/",
  "/seller/",
  "/listing/",
  "/job/",
  "/employer/",
];

const COUNTER_WORKSPACE_EXACT = new Set([
  "/login",
  "/register",
  "/admin",
  "/dashboard",
  "/recruitment/dashboard",
  "/sell",
  "/post-job",
  "/profile",
  "/shortlist",
]);

export function isRecruitmentPublicRoute(pathname: string) {
  return (pathname === "/recruitment" || pathname.startsWith("/recruitment/"))
    && pathname !== "/recruitment/dashboard"
    && !pathname.startsWith("/recruitment/dashboard/");
}

// app/[category]/ owns every top-level path that no other route claims, so a first
// segment missing from this list is a category (or category/city) page.
const ROOT_ROUTES = new Set([
  "about", "admin", "blog", "brand", "brands", "careers", "categories", "collection", "collections", "consultations", "contact",
  "credit-card", "dashboard", "design-system", "directory", "employer", "features", "job", "listing", "login",
  "mutual", "offer", "post-job", "pricing", "profile", "recruitment", "register", "rfq", "search", "sell",
  "seller", "shortlist",
]);

function isCategoryRoute(pathname: string) {
  const first = pathname.split("/")[1];
  return Boolean(first) && !ROOT_ROUTES.has(first);
}

export function isCounterPublicRoute(pathname: string) {
  return isCategoryRoute(pathname) || COUNTER_PUBLIC_EXACT.has(pathname)
    || COUNTER_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    || isRecruitmentPublicRoute(pathname);
}

export function isCounterWorkspaceRoute(pathname: string) {
  return COUNTER_WORKSPACE_EXACT.has(pathname) || pathname.startsWith("/admin/");
}

export function isDirectoryRoute(pathname: string) {
  return isCategoryRoute(pathname)
    || pathname.startsWith("/directory")
    || pathname.startsWith("/search")
    || pathname.startsWith("/seller/")
    || pathname.startsWith("/listing/")
    || pathname === "/rfq"
    || pathname === "/categories"
    || pathname === "/brands"
    || pathname === "/collections"
    || pathname.startsWith("/brand/")
    || pathname.startsWith("/collection/");
}
