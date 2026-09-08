import Link from "next/link";
import Avatar from "@/components/Avatar";
import EvidenceMedia from "./EvidenceMedia";
import { closingContext, formatSalary, jobFreshness, jobLocation, type RolePreviewModel } from "@/lib/recruitmentDesign";

function Arrow() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }

export default function RoleContextPreview({ model }: { model?: RolePreviewModel }) {
  if (!model) return <aside className="bn-role-preview is-empty" aria-label="Selected role context"><div><strong>Select a role to inspect its context.</strong><p>Workplace evidence and decision facts will stay here while you compare.</p></div></aside>;
  const { job, employerCover } = model;
  const company = job.employer?.companyName || "Hiring company";
  return (
    <aside className="bn-role-preview" aria-label={`Context for ${job.title}`}>
      <EvidenceMedia asset={employerCover} ratio="wide" priority />
      <div className="bn-role-preview-body">
        <div className="bn-role-preview-company"><Avatar src={job.employer?.logo} name={company} size={44} /><span><strong>{company}</strong><small>{job.employer?.isVerified ? "Verified employer" : "Employer profile"}</small></span></div>
        <h3>{job.title}</h3>
        <dl>
          <div><dt>Salary</dt><dd>{formatSalary(job, true)}</dd></div>
          <div><dt>Workplace</dt><dd>{jobLocation(job)}</dd></div>
          <div><dt>Freshness</dt><dd>{jobFreshness(job.postedAt)}</dd></div>
          <div><dt>Closing</dt><dd>{closingContext(job.expiresAt)}</dd></div>
        </dl>
        {job.skills?.length > 0 && <div className="bn-role-preview-skills">{job.skills.slice(0, 4).map((skill) => <span key={skill}>{skill}</span>)}</div>}
        <Link href={`/job/${job.id}`}>Inspect full role <Arrow /></Link>
      </div>
    </aside>
  );
}
