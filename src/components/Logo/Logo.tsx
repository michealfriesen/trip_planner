import { useId } from "react";

// Evenly spaced accents along each leg, clear of the stop markers.
const ACCENTS = [
  [11, 19],
  [16.46, 18.24],
  [18.01, 16.54],
  [19.57, 14.82],
] as const;

// A check mark drawn as a route through three stops: itinerary + yay.
export default function Logo({ size = 28 }: { size?: number }) {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#689d6a" />
          <stop offset="1" stopColor="#076678" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill={`url(#${gradientId})`} />
      <g fill="#fbf1c7" opacity="0.7">
        {ACCENTS.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.8" />
        ))}
      </g>
      <circle cx="8.5" cy="16.5" r="2.1" fill="#fbf1c7" />
      <circle cx="13.5" cy="21.5" r="2.1" fill="#fbf1c7" />
      <circle cx="23.5" cy="10.5" r="2.9" fill="#fe8019" stroke="#fbf1c7" strokeWidth="1.3" />
    </svg>
  );
}