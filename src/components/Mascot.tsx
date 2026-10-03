import { mascotColors as c } from "@/lib/brand";

export type MascotExpression =
  | "happy"
  | "smile"
  | "wink"
  | "surprised"
  | "sleepy"
  | "cheer";

const EYE_STROKE = "2.4";
const LEFT_EYE_SMILE = "M34 59q3-3.5 6 0";
const RIGHT_EYE_SMILE = "M50 59q3-3.5 6 0";

/**
 * マスコット「おうちくん」。輪郭線なしの面で描く。
 * ふだん・にっこり・ウインク・きょとん・ひと休み（カップ）・全部できた（万歳）の6表情。
 */
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
      strokeLinecap="round"
      aria-hidden="true"
    >
      {cheer && (
        <path d="M15 56 5 43M75 56 85 43" stroke={c.roof} strokeWidth="5" />
      )}
      <rect x="57" y="16" width="9" height="18" rx="3" fill={c.chimney} />
      <rect x="16" y="36" width="58" height="43" rx="13" fill={c.body} />
      {/* 同色の太い線で三角の角を丸める */}
      <path
        d="M45 18 76 40H14z"
        fill={c.roof}
        stroke={c.roof}
        strokeWidth="8"
      />
      <circle cx="29" cy="64" r="4.5" fill={c.cheek} opacity=".6" />
      {!sleepy && (
        <circle cx="61" cy="64" r="4.5" fill={c.cheek} opacity=".6" />
      )}
      <Eyes expression={expression} />
      <Mouth expression={expression} />
      {sleepy && (
        <g>
          <path d="M54 64h14v6a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6z" fill={c.cup} />
          <path
            d="M68 66.5h1.5a2.5 2.5 0 0 1 0 5H68"
            stroke={c.cup}
            strokeWidth="2.2"
          />
        </g>
      )}
    </svg>
  );
}

function Eyes({ expression }: { expression: MascotExpression }) {
  switch (expression) {
    case "sleepy":
      return (
        <path
          d="M34 58q3 3 6 0M50 58q3 3 6 0"
          stroke={c.eye}
          strokeWidth={EYE_STROKE}
        />
      );
    case "smile":
      return (
        <path
          d={LEFT_EYE_SMILE + RIGHT_EYE_SMILE}
          stroke={c.eye}
          strokeWidth={EYE_STROKE}
        />
      );
    case "wink":
      return (
        <g>
          <circle cx="37" cy="58" r="3" fill={c.eye} />
          <path d={RIGHT_EYE_SMILE} stroke={c.eye} strokeWidth={EYE_STROKE} />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="37" cy="58" r="3" fill={c.eye} />
          <circle cx="53" cy="58" r="3" fill={c.eye} />
        </g>
      );
  }
}

function Mouth({ expression }: { expression: MascotExpression }) {
  switch (expression) {
    case "cheer":
      return <path d="M41 64q4 7 8 0z" fill={c.eye} />;
    case "wink":
      return <path d="M41 64q4 6 8 0z" fill={c.eye} />;
    case "surprised":
      return <circle cx="45" cy="66" r="2.6" fill={c.eye} />;
    default:
      return (
        <path
          d="M41.5 65q3.5 3.5 7 0"
          stroke={c.eye}
          strokeWidth={EYE_STROKE}
        />
      );
  }
}
