"use client";

// Recruitment landing below the job-function strip: three sections, one per story.
//   1. TrackerScene  the candidate's view: every application is tracked, stage by stage
//   2. RoleFinder    an interactive finder with a live count of matching roles
//   3. HireScene     the employer's view: post a role, meet ranked matches
// Styles: .trk-*, .rf-*, .hire-*.

import TrackerScene from "@/components/recruitment/TrackerScene";
import RoleFinder from "@/components/recruitment/RoleFinder";
import HireScene from "@/components/recruitment/HireScene";

export default function RecruitmentSections() {
  return <>
    <TrackerScene />
    <RoleFinder />
    <HireScene />
  </>;
}
