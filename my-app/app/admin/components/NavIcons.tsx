"use client";

import type { SVGProps } from "react";

export function NavIconDashboard(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 16 16"
      aria-hidden
      {...props}
    >
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

export function NavIconCalendar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 16 16"
      aria-hidden
      {...props}
    >
      <rect x="1" y="3" width="14" height="12" rx="1.5" />
      <path d="M5 1v4M11 1v4M1 7h14" />
    </svg>
  );
}

export function NavIconPeople(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 16 16"
      aria-hidden
      {...props}
    >
      <circle cx="6" cy="5" r="3" />
      <path d="M1 14c0-3 2-5 5-5s5 2 5 5" />
      <circle cx="13" cy="5" r="2" />
      <path d="M13 9c1.5 0 3 1 3 4" />
    </svg>
  );
}

export function NavIconUser(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 16 16"
      aria-hidden
      {...props}
    >
      <circle cx="8" cy="5" r="3.5" />
      <path d="M1 15c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}

export function NavIconBack(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 16 16"
      aria-hidden
      {...props}
    >
      <path d="M6 12L2 8l4-4M2 8h12" />
    </svg>
  );
}
