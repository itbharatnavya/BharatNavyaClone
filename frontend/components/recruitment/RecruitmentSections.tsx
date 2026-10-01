"use client";

// Recruitment landing below the job-function strip: three sections that sell the
// product instead of listing it (people see listings the moment they search).
//   1. Without / With Bharat Navya comparison
//   2. three feature cards with looping illustrations
//   3. a staircase of live role counts and a call-to-action banner
// Shared kit: components/attract/*. Styles: .cmp-*, .feat-*, .stairs-*, .art-*.

import { useEffect, useState } from "react";
import Compare from "@/components/attract/Compare";
import FeatureCards from "@/components/attract/FeatureCards";
import Staircase from "@/components/attract/Staircase";
import { getJobs } from "@/lib/api";

const WITHOUT = [
  { icon: "M4 6h16v12H4z|m4 7 8 6 8-6", title: "Applications disappear", body: "You apply, then wait, with no idea whether anyone looked." },
  { icon: "M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z|M4 4l16 16", title: "Roles hide the basics", body: "Pay, place and workplace stay a mystery until you have already clicked." },
  { icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7|M12 17h.01", title: "Fit is guesswork", body: "Employers sift through the wrong CVs, and candidates through the wrong roles." },
];
const WITH = [
  { icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|m8.5 12.5 2.5 2.5 4.5-5", title: "A clear status on every application", body: "Applied, viewed, shortlisted, hired: you and the employer see the same thing." },
  { icon: "M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z|M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", title: "Pay, place and workplace up front", body: "Salary, location and on-site, hybrid or remote are shown before you click." },
  { icon: "M4 19V9|M10 19V5|M16 19v-7|M20 19H2", title: "Skills matched to the role", body: "Profiles and roles are matched on skills so the right people find each other." },
];
const FEATURES = [
  { art: "radar" as const, title: "Find roles that fit", body: "Search by role, skill or company across every function and city, with pay and workplace at a glance." },
  { art: "tracker" as const, title: "Know where you stand", body: "Every application moves through clear stages that you and the employer can both see." },
  { art: "funnel" as const, title: "Hire from a real pipeline", body: "Post a role, receive matched applications and move the best candidates forward in one place." },
];

export default function RecruitmentSections() {
  const [counts, setCounts] = useState({ all: 0, entry: 0, mid: 0, senior: 0 });
  useEffect(() => {
    let live = true;
    const total = (query: Parameters<typeof getJobs>[0]) => getJobs({ limit: 1, ...query }).then((response) => response.total).catch(() => 0);
    Promise.all([total({}), total({ experienceLevel: "entry" }), total({ experienceLevel: "mid" }), total({ experienceLevel: "senior" })])
      .then(([all, entry, mid, senior]) => { if (live) setCounts({ all, entry, mid, senior }); });
    return () => { live = false; };
  }, []);

  return <>
    <Compare
      id="recruit-compare-title"
      title="Hiring and job search, without the guesswork."
      lead="Bharat Navya shows what matters up front and keeps both sides informed."
      labelWithout="Without Bharat Navya"
      labelWith="With Bharat Navya"
      without={WITHOUT}
      withItems={WITH}
    />
    <FeatureCards
      id="recruit-features-title"
      title="Built for finding, and for being found."
      lead="One flow from the first search to the final outcome."
      features={FEATURES}
    />
    <Staircase
      id="recruit-stairs-title"
      title="Open roles for every stage."
      lead="Live counts from the platform, from a first job to a senior move."
      steps={[
        { label: "Senior roles", sub: "Leading teams and functions", value: counts.senior, icon: "M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 16.8 6.6 19.6l1-6L3.3 9.4l6-.9L12 3z" },
        { label: "Mid-level roles", sub: "Growing into the next step", value: counts.mid, icon: "M4 17l6-6 4 4 6-7|M15 8h5v5" },
        { label: "Entry-level roles", sub: "Starting out and switching in", value: counts.entry, icon: "M12 3v12|M7 10l5 5 5-5|M5 21h14" },
        { label: "All open roles", sub: "Across every function", value: counts.all, icon: "M4 8h16v11H4z|M9 8V6a3 3 0 0 1 6 0v2|M4 13h16" },
      ]}
      banner={{ title: "Ready to find your next role, or your next hire?", body: "Build a profile in minutes, or post a structured role that candidates can trust.", primary: { href: "/profile", label: "Build your profile" }, secondary: { href: "/post-job", label: "Post a job" } }}
    />
  </>;
}
