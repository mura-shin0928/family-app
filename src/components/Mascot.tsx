import { mascotColors as c } from "@/lib/brand";

export type MascotExpression = "happy" | "sleepy" | "cheer";

/** マスコット「おうちくん」。ふだん・やることが空（カップ）・全部できた（万歳）の3表情。 */
export function Mascot({
  expression = "happy",
  size = 110,
}: {
  expression?: MascotExpression;
  size?: number;
}) {
  const sleepy = expression === "sleepy";
  const cheer = expression === "cheer";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 90 90"
      fill="none"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {cheer && (
        <path
          d="M16 54 6 40M74 54 84 40"
          stroke={c.line}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      )}
      <rect
        x="55"
        y="14"
        width="10"
        height="16"
        rx="2"
        fill={c.roof}
        stroke={c.line}
        strokeWidth="3.5"
      />
      <path
        d="M45 12 78 40v32a7 7 0 0 1-7 7H19a7 7 0 0 1-7-7V40z"
        fill={c.body}
        stroke={c.line}
        strokeWidth="3.5"
      />
      <path
        d="M45 12 78 40H12z"
        fill={c.roof}
        stroke={c.line}
        strokeWidth="3.5"
      />
      <circle cx="26" cy="63" r="4.5" fill={c.cheek} opacity=".55" />
      <circle cx="64" cy="63" r="4.5" fill={c.cheek} opacity=".55" />
      {sleepy ? (
        <path
          d="M30 55q4 4 8 0M52 55q4 4 8 0"
          stroke={c.eye}
          strokeWidth="3"
          strokeLinecap="round"
        />
      ) : (
        <>
          <circle cx="34" cy="55" r="3.2" fill={c.eye} />
          <circle cx="56" cy="55" r="3.2" fill={c.eye} />
        </>
      )}
      {cheer ? (
        <path d="M40 65q5 9 10 0z" fill={c.eye} />
      ) : (
        <path
          d="M40 65q5 5 10 0"
          stroke={c.eye}
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {sleepy && (
        <g transform="translate(56 62)">
          <path
            d="M0 0h18v8a7 7 0 0 1-7 7H7a7 7 0 0 1-7-7z"
            fill={c.cup}
            stroke={c.line}
            strokeWidth="2.5"
          />
          <path
            d="M18 3h2a3.5 3.5 0 0 1 0 7h-3"
            stroke={c.line}
            strokeWidth="2.5"
          />
          <path
            d="M5 -4q2-3 0-6M11 -4q2-3 0-6"
            stroke={c.line}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}
