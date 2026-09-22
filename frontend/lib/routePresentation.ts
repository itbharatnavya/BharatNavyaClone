const COUNTER_PUBLIC_EXACT = new Set([
  "/",
  "/about",
  "/pricing",
  "/blog",
  "/directory",
  "/search",
  "/rfq",
]);

const COUNTER_PUBLIC_PREFIXES = [
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

export function isCounterPublicRoute(pathname: string) {
  return COUNTER_PUBLIC_EXACT.has(pathname)
    || COUNTER_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    || isRecruitmentPublicRoute(pathname);
}

export function isCounterWorkspaceRoute(pathname: string) {
  return COUNTER_WORKSPACE_EXACT.has(pathname) || pathname.startsWith("/admin/");
}

export function isDirectoryRoute(pathname: string) {
  return pathname.startsWith("/directory")
    || pathname.startsWith("/search")
    || pathname.startsWith("/seller/")
    || pathname.startsWith("/listing/")
    || pathname === "/rfq";
}
