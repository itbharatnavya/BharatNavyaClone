"use client";

// Recruitment landing below the job-function strip: three sections.
//   roles     open roles beside a context pane for the selected one
//             (motion: rows slide in, the pane wipes in from the right)
//   hiring    companies currently hiring (motion: cards tip up in 3D)
//   guides    career guides beside a call to action (motion: wipe-in)
// Content is complete without motion; see useStory. Styles: .ps-* in counter-soft-system.css.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import RoleContextPreview from "@/components/recruitment/RoleContextPreview";
import StoriesCta from "@/components/discovery/StoriesCta";
import { useStory } from "@/components/home/useStory";
import { getBlogs } from "@/lib/api";
import { formatSalary, jobFreshness, jobLocation, rolePreviewModel } from "@/lib/recruitmentDesign";
import type { Blog, Job } from "@/lib/types";

const Arrow = () => <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

export default function RecruitmentSections({ jobs, loading }: { jobs: Job[]; loading: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => { getBlogs({ authorType: "employer" }).then(setBlogs).catch(() => setBlogs([])); }, []);

  const roles = jobs.slice(0, 5);
  const current = roles.find((job) => job.id === selectedId) || roles[0];
  const companies = useMemo(() => {
    const map = new Map<string, { id: string; name: string; slug: string | null; logo: string | null; location: string; verified: boolean; titles: string[] }>();
    for (const job of jobs) {
      if (!job.employer) continue;
      const found = map.get(job.employer.id);
      if (found) { if (found.titles.length < 2) found.titles.push(job.title); continue; }
      map.set(job.employer.id, { id: job.employer.id, name: job.employer.companyName || "Company", slug: job.employer.slug, logo: job.employer.logo, location: [job.employer.city, job.employer.state].filter(Boolean).join(", ") || "India", verified: job.employer.isVerified, titles: [job.title] });
    }
    return Array.from(map.values()).slice(0, 4);
  }, [jobs]);

  useStory(root, ({ gsap, q }) => {
    const once = (trigger: string, start = "top 86%") => ({ trigger, start, once: true });
    gsap.from(q(".ps-role"), { x: -28, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power2.out", scrollTrigger: once(".ps-role-list") });
    gsap.from(q(".ps-role-pane"), { clipPath: "inset(0% 0% 0% 100%)", duration: 0.9, ease: "power3.inOut", scrollTrigger: once(".ps-role-pane") });
    gsap.from(q(".ps-company"), { y: 40, rotateX: 14, transformPerspective: 900, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", clearProps: "transform", scrollTrigger: once(".ps-company-grid") });
    gsap.from(q(".ps-stories-list ul, .ps-stories-list .ps-empty"), { clipPath: "inset(0% 100% 0% 0%)", duration: 0.9, ease: "power3.inOut", scrollTrigger: once(".ps-stories-list ul, .ps-stories-list .ps-empty", "top 90%") });
    gsap.from(q(".ps-cta"), { scale: 0.94, y: 30, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: once(".ps-cta") });
  });

  return <div ref={root} className="ps">
    <section className="ps-sec" aria-labelledby="roles-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="roles-title">Open roles, with the context up front.</h2></div><p>See pay, place and workplace first, then read about the employer before you decide to apply.</p><Link className="le-button" href="/recruitment/jobs">Browse all jobs</Link></header>
      <div className="ps-roles">
        <ul className="ps-role-list">
          {[0, 1, 2, 3, 4].map((index) => {
            const job = roles[index];
            if (!loading && !job) return <li key={index} hidden />;
            return <li key={index} className={`ps-role${job && job.id === current?.id ? " is-selected" : ""}${job ? "" : " is-loading"}`}>
              {job ? <Link href={`/job/${job.id}`} onMouseEnter={() => setSelectedId(job.id)} onFocus={() => setSelectedId(job.id)}>
                <Avatar src={job.employer?.logo || undefined} name={job.employer?.companyName || "Company"} size={44} />
                <span className="ps-role-main"><strong>{job.title}</strong><small>{job.employer?.companyName || "Company"} · {jobLocation(job)}</small></span>
                <span className="ps-role-meta"><b>{formatSalary(job)}</b><small>{jobFreshness(job.postedAt)}</small></span>
                <Arrow />
              </Link> : <><span className="hs-sk is-wide" /><span className="hs-sk is-thin" /></>}
            </li>;
          })}
        </ul>
        <div className="ps-role-pane"><RoleContextPreview model={current ? rolePreviewModel(current) : undefined} /></div>
      </div>
    </div></section>

    <section className="ps-sec" aria-labelledby="hiring-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="hiring-title">Explore the companies behind the roles.</h2></div><p>Go beyond the job title and see who is hiring, where they are based and what else they are looking for.</p></header>
      <ul className="ps-company-grid is-wide">
        {[0, 1, 2, 3].map((index) => {
          const company = companies[index];
          if (!loading && !company) return <li key={index} hidden />;
          return <li key={index} className={`ps-company${company ? "" : " is-loading"}`}>
            {company ? <Link href={company.slug ? `/employer/${company.slug}` : "/recruitment/jobs"}>
              <span className="ps-company-top"><Avatar src={company.logo || undefined} name={company.name} size={48} />{company.verified && <em className="hs-m-tag">Verified</em>}</span>
              <strong>{company.name}</strong>
              <small>{company.location}</small>
              <span className="ps-chips">{company.titles.map((title) => <i key={title}>{title}</i>)}</span>
              <span className="ps-company-foot"><b>Hiring now</b><span>View employer<Arrow /></span></span>
            </Link> : <><span className="hs-sk is-wide" /><span className="hs-sk" /><span className="hs-sk is-thin" /></>}
          </li>;
        })}
      </ul>
    </div></section>

    <StoriesCta
      id="recruitment-guides-title"
      title="Explore the role before you apply."
      lead="Career guides from employers on Bharat Navya."
      blogs={blogs}
      allHref="/recruitment/blog"
      allLabel="All career guides"
      panel={{ eyebrow: "For candidates and employers", title: "Present your potential. Find the right people.", body: "Build a profile with your skills and experience, or post structured roles that give candidates a clearer view of the opportunity.", primary: { href: "/profile", label: "Build your profile" }, secondary: { href: "/post-job", label: "Post a job" } }}
    />
  </div>;
}
