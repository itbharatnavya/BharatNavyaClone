"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StoryRail from "@/components/StoryRail";
import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";
import { RecruitmentSectionSearch } from "@/components/SectionSearchDock";
import { CategoryShowcase } from "@/components/discovery/LandingHero";
import RecruitmentHero from "@/components/recruitment/RecruitmentHero";
import { getJobFunctions, getJobs, getStories } from "@/lib/api";
import RecruitmentSections from "@/components/recruitment/RecruitmentSections";
import { dockEdge, useSearchDock } from "@/lib/searchDock";
import type { Job, JobFunction, StoryGroup } from "@/lib/types";

const svg = (d: string) => <svg aria-hidden viewBox="0 0 24 24">{d.split("|").map((path) => <path key={path} d={path} />)}</svg>;

// Job functions are admin-managed (GET /api/job-functions); unknown slugs fall back to a briefcase.
const FUNCTION_ICONS: [RegExp, string][] = [
  [/engineer|develop|tech|software/, "m8 8-4 4 4 4|m16 8 4 4-4 4|m14 5-4 14"],
  [/sales|business-development|account/, "M4 17l6-6 4 4 6-7|M15 8h5v5"],
  [/marketing|brand|communication/, "M4 10v4l11 5V5z|M15 9a3 3 0 0 1 0 6"],
  [/design|creative/, "M4 20l4-1L19 8l-3-3L5 16z|M14 7l3 3"],
  [/operation|supply|logistic/, "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M12 3v3|M12 18v3|M3 12h3|M18 12h3"],
  [/support|service|customer/, "M5 13v-1a7 7 0 0 1 14 0v1|M5 13h3v5H5z|M16 13h3v5h-3z"],
  [/finance|account|audit/, "M7 5h10|M7 9h10|M10 5c4 0 4 8 0 8H7l7 6"],
  [/hr|human|people|recruit/, "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M3 19a6 6 0 0 1 12 0|M16 11a3 3 0 0 0 0-6|M21 19a6 6 0 0 0-4-5.6"],
  [/product/, "M21 8l-9-5-9 5 9 5z|M3 8v8l9 5 9-5V8"],
];
const FUNCTION_MEDIA: [RegExp, string][] = [
  [/engineer|develop|tech|software/, "/seed-media/work/work-3.jpg"],
  [/sales|business-development|account/, "/demo/business-4.jpg"],
  [/marketing|brand|communication/, "/demo/retail-3.jpg"],
  [/design|creative/, "/seed-media/work/work-1.jpg"],
  [/operation|supply|logistic/, "/seed-media/work/work-2.jpg"],
  [/support|service|customer/, "/demo/business-5.jpg"],
  [/finance|audit/, "/seed-media/work/work-4.jpg"],
  [/hr|human|people|recruit/, "/seed-media/company/company-6.jpg"],
  [/product/, "/seed-media/work/work-5.jpg"],
];
function functionIcon(slug: string) { return svg(FUNCTION_ICONS.find(([re]) => re.test(slug))?.[1] || "M4 8h16v11H4z|M9 8V6a3 3 0 0 1 6 0v2"); }
function functionMedia(slug: string) { return FUNCTION_MEDIA.find(([re]) => re.test(slug))?.[1] || "/seed-media/company/company-5.jpg"; }


export default function RecruitmentPage() {
  const router = useRouter();
  const { docked, setProgress, setRoleQuery, markSearchNav } = useSearchDock();
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const heroFocusedRef = useRef(false);
  const pendingDockRef = useRef<boolean | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getStories("employer").then(setStories).catch(() => setStories([])); }, []);
  useEffect(() => { Promise.allSettled([getJobs({ limit: 18 }), getJobFunctions()]).then(([jobResult, functionResult]) => { if (jobResult.status === "fulfilled") { setJobs(jobResult.value.jobs); } if (functionResult.status === "fulfilled") setJobFunctions(functionResult.value.filter((item) => item.isActive)); setLoading(false); }); }, []);
  useEffect(() => {
    const anchor = searchAnchorRef.current;
    if (!anchor || typeof IntersectionObserver === "undefined") return;
    const edge = dockEdge(); const observer = new IntersectionObserver(([entry]) => { const shouldDock = !entry.isIntersecting && entry.boundingClientRect.bottom <= edge; if (heroFocusedRef.current && shouldDock) { pendingDockRef.current = true; return; } pendingDockRef.current = null; setProgress(shouldDock ? 1 : 0); }, { threshold: 0, rootMargin: `-${edge}px 0px 0px 0px` });
    observer.observe(anchor);
    return () => { observer.disconnect(); setProgress(0); };
  }, [setProgress]);
  useEffect(() => {
    searchAnchorRef.current?.toggleAttribute("inert", docked);
  }, [docked]);

  const freshJobs = jobs.slice(0, 5);
  const functionChips = jobFunctions.slice(0, 4).map((item) => ({ label: item.name, href: `/recruitment/jobs?jobFunction=${encodeURIComponent(item.slug)}`, icon: functionIcon(item.slug) }));
  const functionGroups = jobFunctions.map((item) => ({ key: item.slug, label: item.name, href: `/recruitment/jobs?jobFunction=${encodeURIComponent(item.slug)}`, image: functionMedia(item.slug) }));
  function exampleSearch(query: string) { setRoleQuery(query); markSearchNav(); router.push(`/recruitment/jobs?q=${encodeURIComponent(query)}`); }

  return <div className="le-page counter-recruitment-page">
    <RecruitmentHero
      id="recruitment-title"
      title="Find the right people. Build the right team."
      search={<div ref={searchAnchorRef} data-dock-source className="le-hero-search is-recruitment" aria-hidden={docked || undefined} onFocusCapture={() => { heroFocusedRef.current = true; }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { heroFocusedRef.current = false; if (pendingDockRef.current !== null) { setProgress(pendingDockRef.current ? 1 : 0); pendingDockRef.current = null; } } }}><RecruitmentSectionSearch /></div>}
      shortcuts={functionChips}
      jobs={freshJobs.slice(0, 4)}
    />

    <section className="le-shell bn-feed" aria-label="Hiring statuses, sponsored employer and job functions">
      <StoryRail
        groups={stories}
        className="counter-story-rail"
        addStory={{ href: "/recruitment/dashboard?tab=stories" }}
      />
      <div className="counter-status-promotion">
        <ApiAdvertisingSlot imageOnly placement="recruitment_home" kind="native" context="Boosted employer · Recruitment" summary="A clearly labelled employer or recruiter placement, kept separate from hiring context and organic role ranking." action="View employer" compact />
      </div>
      <CategoryShowcase id="recruitment-functions-title" title="Browse jobs by function" groups={functionGroups} allHref="/recruitment/jobs" allLabel="All jobs" />
    </section>


    <RecruitmentSections />
  </div>;
}
