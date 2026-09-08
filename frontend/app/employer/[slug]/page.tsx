"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import Breadcrumbs from "@/components/Breadcrumbs";
import Button from "@/components/Button";
import EmployerReviewsSection from "@/components/employer/EmployerReviewsSection";
import EvidenceMedia from "@/components/recruitment/EvidenceMedia";
import MediaMosaic from "@/components/recruitment/MediaMosaic";
import RecruitmentGate from "@/components/recruitment/RecruitmentGate";
import StatusTimeline from "@/components/recruitment/StatusTimeline";
import { getBlogs, getEmployer, getStories, type PublicEmployer } from "@/lib/api";
import { closingContext, formatSalary, jobLocation, prototypeEmployerMedia } from "@/lib/recruitmentDesign";
import type { Blog, Job, Story } from "@/lib/types";

function Arrow() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }

function EmployerProfileInner() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [employer, setEmployer] = useState<PublicEmployer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reviewAgg, setReviewAgg] = useState({ avg: 0, count: 0 });
  const onAggregate = useCallback((avg: number, count: number) => setReviewAgg((current) => current.avg === avg && current.count === count ? current : { avg, count }), []);

  useEffect(() => {
    if (!slug) return; let alive = true; setLoading(true); setNotFound(false);
    Promise.allSettled([getEmployer(slug), getBlogs({ authorType: "employer" }), getStories("employer")]).then(([employerResult, blogResult, storyResult]) => {
      if (!alive) return;
      if (employerResult.status === "rejected") { setNotFound(true); return; }
      const result = employerResult.value; setEmployer(result.employer); setJobs(result.jobs);
      if (blogResult.status === "fulfilled") setBlogs(blogResult.value.filter((blog) => blog.author?.slug === slug || blog.sellerSlug === slug).slice(0, 3));
      if (storyResult.status === "fulfilled") setStories(storyResult.value.filter((group) => group.sellerId === result.employer.id || group.sellerSlug === slug).flatMap((group) => group.stories).slice(0, 4));
    }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [slug]);

  const media = useMemo(() => {
    if (!employer) return [];
    const api = [employer.coverImage ? { src: employer.coverImage, alt: `Workplace at ${employer.companyName}`, kind: "workplace" as const, source: "api" as const } : null, ...stories.filter((story) => story.media.type === "image").map((story) => ({ src: story.media.url, alt: story.caption || `Workplace update from ${employer.companyName}`, kind: "event" as const, source: "api" as const })), ...blogs.filter((blog) => blog.coverImage).map((blog) => ({ src: blog.coverImage!, alt: blog.title, kind: "article" as const, source: "api" as const }))].filter(Boolean);
    return [...(api as ReturnType<typeof prototypeEmployerMedia>), ...prototypeEmployerMedia(employer.slug)].slice(0, 3);
  }, [employer, stories, blogs]);

  if (loading) return <div className="recruitment-core recruitment-core-shell employer-careers"><div className="recruitment-skeleton" style={{ height: 360 }} /></div>;
  if (notFound || !employer) return <div className="recruitment-core recruitment-core-shell employer-careers recruitment-state"><strong>This careers profile is not available.</strong><Button variant="brand" href="/recruitment/jobs">Browse open roles</Button></div>;
  const location = [employer.location?.city, employer.location?.state].filter(Boolean).join(", ") || "Location not provided";
  const cover = media[0];
  const hiringProcess = [{ label: "Application review", detail: "Recruiter identity and review timing are not provided in the current employer data.", state: "current" as const }, { label: "Interview stages", detail: "Not provided by the employer.", state: "pending" as const }, { label: "Decision and closure", detail: "Applicants should receive a terminal outcome in their application timeline.", state: "pending" as const }];

  return <div className="recruitment-core"><div className="recruitment-core-shell employer-careers">
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Recruitment", href: "/recruitment" }, { label: employer.companyName }]} />
    <section className="employer-careers-hero" aria-labelledby="employer-title"><EvidenceMedia asset={cover} ratio="wide" className="employer-careers-cover" priority /><div className="employer-careers-identity"><Avatar src={employer.logo} name={employer.companyName} size={88} /><div><h1 id="employer-title">{employer.companyName}</h1><div className="employer-careers-meta"><span>{employer.isVerified ? "✓ Verified employer" : "Employer profile"}</span><span>{location}</span>{employer.industry && <span>{employer.industry}</span>}<span>{jobs.length} open {jobs.length === 1 ? "role" : "roles"}</span>{reviewAgg.count > 0 && <span>{reviewAgg.avg.toFixed(1)} / 5 · {reviewAgg.count} reviews</span>}</div></div>{employer.website && <a href={employer.website} target="_blank" rel="noreferrer">Company website <Arrow /></a>}</div></section>
    <div className="employer-careers-grid">
      <div className="employer-careers-main">
        <section><header><h2>About working here</h2><p>{employer.about || "This employer has not yet added a workplace introduction."}</p></header><MediaMosaic assets={media} label={`Workplace evidence from ${employer.companyName}`} /></section>
        <section><header><h2>Open roles</h2><p>Current opportunities with salary and closure context kept visible.</p></header><div className="employer-careers-roles">{jobs.length ? jobs.map((job) => <Link className="recruitment-result-row" href={`/job/${job.id}`} key={job.id}><Avatar src={employer.logo} name={employer.companyName} size={48} /><div className="recruitment-result-main"><h3>{job.title}</h3><p>{jobLocation(job)} · {formatSalary(job)}</p><span>{closingContext(job.expiresAt)}</span></div><Arrow /></Link>) : <div className="recruitment-state"><strong>No open roles right now.</strong><p>Browse other employers while this company prepares its next role.</p></div>}</div></section>
        <section><header><h2>Recruitment reviews</h2><p>Hiring and workplace feedback stays separate from Directory service reviews.</p></header><EmployerReviewsSection targetUserId={employer.id} companyName={employer.companyName} onAggregate={onAggregate} /></section>
      </div>
      <aside className="employer-careers-aside">
        <section><header><h2>Workplace facts</h2></header><dl className="employer-careers-facts"><div><dt>Team size</dt><dd>{employer.companySize || employer.employeeCount || "Not provided"}</dd></div><div><dt>Location</dt><dd>{location}</dd></div><div><dt>Working hours</dt><dd>{employer.workingHours || "Not provided"}</dd></div><div><dt>Benefits</dt><dd>{employer.benefits?.length ? `${employer.benefits.length} listed` : "Not provided"}</dd></div></dl>{employer.benefits?.length ? <ul>{employer.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul> : null}</section>
        <section><header><h2>Hiring process</h2></header><StatusTimeline items={hiringProcess} /></section>
        <section><header><h2>Hiring updates</h2><p>Employer-authored updates and career articles.</p></header>{blogs.length ? <div className="employer-careers-roles">{blogs.map((blog) => <Link href={`/blog/${blog.slug}`} key={blog.id}><strong>{blog.title}</strong><small>{blog.excerpt || "Read employer update"}</small></Link>)}</div> : <div className="recruitment-state"><strong>No hiring updates yet.</strong><p>Published employer stories and articles will appear here.</p></div>}</section>
      </aside>
    </div>
  </div></div>;
}

export default function EmployerProfilePage() { return <RecruitmentGate><EmployerProfileInner /></RecruitmentGate>; }
