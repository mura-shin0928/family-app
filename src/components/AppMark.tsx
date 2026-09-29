import { brand } from "@/lib/brand";

export function AppMark({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden="true"
    >
      <rect width="56" height="56" rx="12" fill={brand.light.primary} />
      <path
        d="M16 29l8 8 16-18"
        stroke={brand.light.onPrimary}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
