import type { Blog, RecentActivityItem, StoryGroup } from "@/lib/types";

export interface EvidenceAsset {
  src: string;
  alt: string;
  kind: "workplace" | "team" | "event" | "work-sample" | "article";
  source: "api" | "prototype";
  attribution?: string;
}

export type UpdateContext = "directory" | "recruitment";
export type UpdateKind = "story" | "blog" | "review" | "prototype";

export interface PublicUpdate {
  id: string;
  context: UpdateContext;
  kind: UpdateKind;
  authorName: string;
  authorSlug?: string;
  authorLogo?: string;
  media: EvidenceAsset;
  headline: string;
  summary?: string;
  publishedAt: string;
  href?: string;
  isPrototype: boolean;
}

const prototypeCopy: Record<UpdateContext, Array<Omit<PublicUpdate, "context" | "kind" | "isPrototype">>> = {
  directory: [
    { id: "prototype-directory-1", authorName: "Studio Aangan Architecture", authorSlug: "studio-aangan-architecture", media: { src: "/seed-media/work/work-1.jpg", alt: "A design team reviewing a workspace plan", kind: "work-sample", source: "prototype", attribution: "Prototype update media" }, headline: "A new workspace concept is ready for review", summary: "Planning studies, material samples and the delivery team are now documented together.", publishedAt: "2026-08-30T10:00:00.000Z", href: "/search?q=architecture" },
    { id: "prototype-directory-2", authorName: "TechNova IT Solutions", authorSlug: "technova-it-solutions", media: { src: "/seed-media/work/work-2.jpg", alt: "Colleagues reviewing a digital product flow", kind: "work-sample", source: "prototype", attribution: "Prototype update media" }, headline: "Product discovery sprint completed", summary: "The team shared the decision flow, delivery scope and next technical milestone.", publishedAt: "2026-08-29T12:30:00.000Z", href: "/search?q=software" },
    { id: "prototype-directory-3", authorName: "Mumbai Packaging Solutions", authorSlug: "mumbai-packaging-solutions", media: { src: "/seed-media/company/company-3.jpg", alt: "A packaging team inspecting production samples", kind: "workplace", source: "prototype", attribution: "Prototype update media" }, headline: "Food-safe sample run available", summary: "Material proof, minimum order guidance and response expectations are ready to inspect.", publishedAt: "2026-08-28T09:15:00.000Z", href: "/search?q=packaging" },
    { id: "prototype-directory-4", authorName: "LexEdge Legal & Compliance", authorSlug: "lexedge-legal-compliance", media: { src: "/seed-media/work/work-5.jpg", alt: "A business team reviewing compliance documents", kind: "team", source: "prototype", attribution: "Prototype update media" }, headline: "Founder compliance clinic this week", summary: "A practical session covering registration, recurring filings and common early-stage gaps.", publishedAt: "2026-08-27T11:45:00.000Z", href: "/search?q=compliance" },
  ],
  recruitment: [
    { id: "prototype-recruitment-1", authorName: "GreenLeaf Foods Pvt Ltd", authorSlug: "greenleaf-foods", media: { src: "/seed-media/company/company-1.jpg", alt: "A growing food business team working together", kind: "workplace", source: "prototype", attribution: "Prototype hiring update" }, headline: "The western sales team is growing", summary: "Meet the company behind the role and inspect the territory, salary and hiring context.", publishedAt: "2026-08-30T08:30:00.000Z", href: "/employer/greenleaf-foods" },
    { id: "prototype-recruitment-2", authorName: "TechNova Solutions Pvt Ltd", authorSlug: "technova-solutions", media: { src: "/seed-media/company/company-2.jpg", alt: "A software team collaborating around a screen", kind: "team", source: "prototype", attribution: "Prototype hiring update" }, headline: "Engineering roles opened in Bengaluru", summary: "The team shared its workplace, role expectations and review process before applications begin.", publishedAt: "2026-08-29T14:00:00.000Z", href: "/recruitment/jobs?q=Engineer" },
    { id: "prototype-recruitment-3", authorName: "Vantage Logistics", authorSlug: "vantage-logistics", media: { src: "/seed-media/work/work-4.jpg", alt: "An operations team planning a delivery route", kind: "workplace", source: "prototype", attribution: "Prototype hiring update" }, headline: "Operations hiring day announced", summary: "Candidates can review the work setting, open roles and interview outline before attending.", publishedAt: "2026-08-28T16:10:00.000Z", href: "/recruitment/jobs?q=Operations" },
    { id: "prototype-recruitment-4", authorName: "HealFirst Diagnostics", authorSlug: "healfirst-diagnostics", media: { src: "/seed-media/people/person-2.jpg", alt: "A recruiter introducing an open customer support role", kind: "event", source: "prototype", attribution: "Prototype hiring update" }, headline: "Recruiter Q&A for support applicants", summary: "A short session covering shifts, team expectations and what happens after applying.", publishedAt: "2026-08-27T13:20:00.000Z", href: "/recruitment/jobs?q=Customer%20Support" },
  ],
};

export function storyUpdates(groups: StoryGroup[], context: UpdateContext): PublicUpdate[] {
  return groups.flatMap((group) => group.stories.map((story) => ({
    id: story.id,
    context,
    kind: "story" as const,
    authorName: group.sellerName || "Bharat Navya business",
    authorSlug: group.sellerSlug,
    authorLogo: group.avatarUrl || undefined,
    media: { src: story.media.url, alt: story.caption || `Update from ${group.sellerName}`, kind: context === "recruitment" ? "workplace" as const : "work-sample" as const, source: "api" as const },
    headline: story.caption || (context === "recruitment" ? "Hiring update" : "Company update"),
    publishedAt: story.createdAt,
    href: group.sellerSlug ? (context === "recruitment" ? `/employer/${group.sellerSlug}` : `/seller/${group.sellerSlug}`) : undefined,
    isPrototype: false,
  })));
}

export function blogUpdates(blogs: Blog[], context: UpdateContext): PublicUpdate[] {
  return blogs.filter((blog) => Boolean(blog.coverImage)).map((blog) => ({
    id: blog.id,
    context,
    kind: "blog",
    authorName: blog.author?.companyName || blog.authorName || "Bharat Navya",
    authorSlug: blog.author?.slug || blog.sellerSlug || undefined,
    authorLogo: blog.author?.logo || undefined,
    media: { src: blog.coverImage!, alt: `Cover for ${blog.title}`, kind: "article", source: "api" },
    headline: blog.title,
    summary: blog.excerpt,
    publishedAt: blog.publishedAt || blog.createdAt,
    href: `/blog/${blog.slug}`,
    isPrototype: false,
  }));
}

export function reviewUpdates(reviews: RecentActivityItem[]): PublicUpdate[] {
  return reviews.filter((review) => Boolean(review.image)).map((review) => ({
    id: review.reviewId,
    context: "directory",
    kind: "review",
    authorName: review.sellerName,
    authorSlug: review.sellerSlug || undefined,
    media: { src: review.image!, alt: `Work shared by ${review.sellerName}`, kind: "work-sample", source: "api" },
    headline: review.reviewText,
    summary: review.sellerCity ? `Public review from ${review.sellerCity}` : "Public company review",
    publishedAt: review.createdAt,
    href: review.sellerSlug ? `/seller/${review.sellerSlug}` : undefined,
    isPrototype: false,
  }));
}

export function prototypeUpdates(context: UpdateContext): PublicUpdate[] {
  return prototypeCopy[context].map((item) => ({ ...item, context, kind: "prototype", isPrototype: true }));
}

export function resolvePublicUpdates({ context, stories, blogs, reviews = [], allowPrototype = false, limit = 8 }: { context: UpdateContext; stories: StoryGroup[]; blogs: Blog[]; reviews?: RecentActivityItem[]; allowPrototype?: boolean; limit?: number }): PublicUpdate[] {
  const activeStories = storyUpdates(stories, context);
  const supporting = [...blogUpdates(blogs, context), ...(context === "directory" ? reviewUpdates(reviews) : [])];
  const statusLayer = activeStories.length ? activeStories : allowPrototype ? prototypeUpdates(context) : [];
  return [...statusLayer, ...supporting]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);
}

export function mixedUpdates(directory: PublicUpdate[], recruitment: PublicUpdate[], limit = 8) {
  return [...directory, ...recruitment].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, limit);
}

export function updateLabel(update: PublicUpdate) {
  if (update.isPrototype) return "Prototype update";
  if (update.kind === "blog") return "Guide";
  if (update.kind === "review") return "Public review";
  return "Live update";
}
