"use client";

// Inline SVG icon set for the /offer ("What we offer") page.
// Rules: viewBox 0 0 24 24, stroke/fill currentColor, no external assets, no emojis.
// Icons inherit color from their parent, so wrappers set the color via CSS vars.

import React from "react";

interface IconProps {
  size?: number;
}

function makeIcon(
  paths: React.ReactNode,
  opts?: { fill?: boolean; sw?: number }
) {
  return function Icon({ size = 24 }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={opts?.fill ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={opts?.sw ?? 1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {paths}
      </svg>
    );
  };
}

// ---- small utility icons ----
export const CheckIcon = makeIcon(<path d="M5 13l4 4L19 7" />, { sw: 3 });
export const ArrowRightIcon = makeIcon(
  <>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </>
);
export const MailIcon = makeIcon(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </>
);
export const SparkIcon = makeIcon(
  <>
    <path d="M12 3v4" />
    <path d="M12 17v4" />
    <path d="M3 12h4" />
    <path d="M17 12h4" />
    <path d="M6.3 6.3l2.4 2.4" />
    <path d="M15.3 15.3l2.4 2.4" />
    <path d="M17.7 6.3l-2.4 2.4" />
    <path d="M8.7 15.3l-2.4 2.4" />
  </>
);

// ---- feature group icons (keyed by the live `group` string) ----
const AccountsIcon = makeIcon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </>
);
const ListingsIcon = makeIcon(
  <>
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
    <circle cx="7.5" cy="7.5" r="1.3" />
  </>
);
const SearchIcon = makeIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </>
);
const DirectoryIcon = makeIcon(
  <>
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 21v-6h6v6" />
  </>
);
const StoriesIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5l6 3.5-6 3.5z" />
  </>
);
const CommunicationIcon = makeIcon(
  <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
);
const TrustIcon = makeIcon(
  <>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </>
);
const ReachIcon = makeIcon(
  <>
    <path d="M3 10v4h3l5 4V6L6 10H3z" />
    <path d="M15 9a3 3 0 0 1 0 6" />
    <path d="M18 6a7 7 0 0 1 0 12" />
  </>
);
const MonetizationIcon = makeIcon(
  <>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 9v6" />
    <path d="M18 9v6" />
  </>
);
const AdminIcon = makeIcon(
  <>
    <path d="M4 8h16" />
    <circle cx="9" cy="8" r="2" />
    <path d="M4 16h16" />
    <circle cx="15" cy="16" r="2" />
  </>
);
const GrowthIcon = makeIcon(
  <>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M14 7h7v7" />
  </>
);
const DefaultGroupIcon = makeIcon(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </>
);

const GROUP_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  "Accounts & Identity": AccountsIcon,
  "Marketplace Listings": ListingsIcon,
  "Discovery & Search": SearchIcon,
  "Business Directory": DirectoryIcon,
  Stories: StoriesIcon,
  Communication: CommunicationIcon,
  "Trust & Safety": TrustIcon,
  "Reach & Content": ReachIcon,
  Monetization: MonetizationIcon,
  "Growth & Monetization": MonetizationIcon,
  "Admin & Ops": AdminIcon,
  Growth: GrowthIcon,
};

// Resolves an icon for any group name; unknown groups fall back to a neutral
// grid so newly-added feature groups never render blank.
export function GroupIcon({ group, size = 22 }: { group: string; size?: number }) {
  const Cmp = GROUP_ICONS[group] || DefaultGroupIcon;
  return <Cmp size={size} />;
}

// ---- growth / monetization product icons ----
export const AdIcon = ReachIcon; // megaphone
export const FeaturedIcon = makeIcon(
  <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18l-5.8 3 1.1-6.5L2.6 10.8l6.5-.9z" />
);
export const BoostIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16V8" />
    <path d="M8.5 11.5 12 8l3.5 3.5" />
  </>
);
export const LeadsIcon = makeIcon(
  <>
    <path d="M4 13h4l2 3h4l2-3h4" />
    <path d="M4 13V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7" />
    <path d="M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
  </>
);
export const VerifiedIcon = TrustIcon; // shield-check
