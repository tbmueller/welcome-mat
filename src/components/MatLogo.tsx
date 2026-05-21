import { memo } from "react";

interface Props {
  width?: number;
  height?: number;
  className?: string;
}

export const MatLogo = memo(function MatLogo({ width = 192, height = 112, className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="24 24 192 112"
      width={width}
      height={height}
      className={className}
      shapeRendering="crispEdges"
      aria-label="WelcomeMat"
    >
      <defs>
        <pattern id="cb-mat" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="var(--accent-11)" />
          <rect x="4" y="0" width="4" height="4" fill="var(--accent-9)" />
          <rect x="0" y="4" width="4" height="4" fill="var(--accent-9)" />
          <rect x="4" y="4" width="4" height="4" fill="var(--accent-11)" />
        </pattern>
      </defs>

      <g transform="translate(24,24)">
        {/* Outer dark border */}
        <rect x="0"   y="0"   width="192" height="8"  fill="var(--accent-12)" />
        <rect x="0"   y="104" width="192" height="8"  fill="var(--accent-12)" />
        <rect x="0"   y="8"   width="8"   height="96" fill="var(--accent-12)" />
        <rect x="184" y="8"   width="8"   height="96" fill="var(--accent-12)" />

        {/* Checkerboard inner border */}
        <rect x="8"   y="8"  width="176" height="8"  fill="url(#cb-mat)" />
        <rect x="8"   y="96" width="176" height="8"  fill="url(#cb-mat)" />
        <rect x="8"   y="16" width="8"   height="80" fill="url(#cb-mat)" />
        <rect x="176" y="16" width="8"   height="80" fill="url(#cb-mat)" />

        {/* Solid separator strip */}
        <rect x="16" y="16" width="160" height="4"  fill="var(--accent-11)" />
        <rect x="16" y="92" width="160" height="4"  fill="var(--accent-11)" />
        <rect x="16" y="20" width="4"   height="72" fill="var(--accent-11)" />
        <rect x="172" y="20" width="4"  height="72" fill="var(--accent-11)" />

        {/* Interior field */}
        <rect x="20" y="20" width="152" height="72" fill="var(--accent-7)" />

        {/* Corner accent squares */}
        <rect x="20"  y="20" width="8" height="8" fill="var(--accent-11)" />
        <rect x="164" y="20" width="8" height="8" fill="var(--accent-11)" />
        <rect x="20"  y="84" width="8" height="8" fill="var(--accent-11)" />
        <rect x="164" y="84" width="8" height="8" fill="var(--accent-11)" />

        {/* Rose ring */}
        <rect x="96" y="20" width="4"   height="4" fill="var(--accent-9)" />
        <rect x="92" y="24" width="12"  height="4" fill="var(--accent-9)" />
        <rect x="88" y="28" width="20"  height="4" fill="var(--accent-9)" />
        <rect x="80" y="32" width="36"  height="4" fill="var(--accent-9)" />
        <rect x="76" y="36" width="44"  height="4" fill="var(--accent-9)" />
        <rect x="68" y="40" width="60"  height="4" fill="var(--accent-9)" />
        <rect x="64" y="44" width="68"  height="4" fill="var(--accent-9)" />
        <rect x="56" y="48" width="84"  height="4" fill="var(--accent-9)" />
        <rect x="52" y="52" width="92"  height="4" fill="var(--accent-9)" />
        <rect x="44" y="56" width="108" height="4" fill="var(--accent-9)" />
        <rect x="52" y="60" width="92"  height="4" fill="var(--accent-9)" />
        <rect x="56" y="64" width="84"  height="4" fill="var(--accent-9)" />
        <rect x="64" y="68" width="68"  height="4" fill="var(--accent-9)" />
        <rect x="68" y="72" width="60"  height="4" fill="var(--accent-9)" />
        <rect x="76" y="76" width="44"  height="4" fill="var(--accent-9)" />
        <rect x="80" y="80" width="36"  height="4" fill="var(--accent-9)" />
        <rect x="88" y="84" width="20"  height="4" fill="var(--accent-9)" />
        <rect x="92" y="88" width="12"  height="4" fill="var(--accent-9)" />
        <rect x="96" y="92" width="4"   height="4" fill="var(--accent-9)" />

        {/* Outer maroon diamond */}
        <rect x="96" y="24" width="4"   height="4" fill="var(--accent-11)" />
        <rect x="92" y="28" width="12"  height="4" fill="var(--accent-11)" />
        <rect x="84" y="32" width="28"  height="4" fill="var(--accent-11)" />
        <rect x="80" y="36" width="36"  height="4" fill="var(--accent-11)" />
        <rect x="72" y="40" width="52"  height="4" fill="var(--accent-11)" />
        <rect x="68" y="44" width="60"  height="4" fill="var(--accent-11)" />
        <rect x="60" y="48" width="76"  height="4" fill="var(--accent-11)" />
        <rect x="56" y="52" width="84"  height="4" fill="var(--accent-11)" />
        <rect x="48" y="56" width="100" height="4" fill="var(--accent-11)" />
        <rect x="56" y="60" width="84"  height="4" fill="var(--accent-11)" />
        <rect x="60" y="64" width="76"  height="4" fill="var(--accent-11)" />
        <rect x="68" y="68" width="60"  height="4" fill="var(--accent-11)" />
        <rect x="72" y="72" width="52"  height="4" fill="var(--accent-11)" />
        <rect x="80" y="76" width="36"  height="4" fill="var(--accent-11)" />
        <rect x="84" y="80" width="28"  height="4" fill="var(--accent-11)" />
        <rect x="92" y="84" width="12"  height="4" fill="var(--accent-11)" />
        <rect x="96" y="88" width="4"   height="4" fill="var(--accent-11)" />

        {/* Inner lighter diamond */}
        <rect x="96" y="32" width="4"  height="4" fill="var(--accent-5)" />
        <rect x="92" y="36" width="12" height="4" fill="var(--accent-5)" />
        <rect x="84" y="40" width="28" height="4" fill="var(--accent-5)" />
        <rect x="76" y="44" width="44" height="4" fill="var(--accent-5)" />
        <rect x="72" y="48" width="52" height="4" fill="var(--accent-5)" />
        <rect x="64" y="52" width="68" height="4" fill="var(--accent-5)" />
        <rect x="56" y="56" width="84" height="4" fill="var(--accent-5)" />
        <rect x="64" y="60" width="68" height="4" fill="var(--accent-5)" />
        <rect x="72" y="64" width="52" height="4" fill="var(--accent-5)" />
        <rect x="76" y="68" width="44" height="4" fill="var(--accent-5)" />
        <rect x="84" y="72" width="28" height="4" fill="var(--accent-5)" />
        <rect x="92" y="76" width="12" height="4" fill="var(--accent-5)" />
        <rect x="96" y="80" width="4"  height="4" fill="var(--accent-5)" />

        {/* Quadrant accent diamonds */}
        <rect x="36" y="32" width="4"  height="4" fill="var(--accent-9)" />
        <rect x="32" y="36" width="12" height="4" fill="var(--accent-9)" />
        <rect x="36" y="40" width="4"  height="4" fill="var(--accent-9)" />
        <rect x="152" y="32" width="4"  height="4" fill="var(--accent-9)" />
        <rect x="148" y="36" width="12" height="4" fill="var(--accent-9)" />
        <rect x="152" y="40" width="4"  height="4" fill="var(--accent-9)" />
        <rect x="36" y="72" width="4"  height="4" fill="var(--accent-9)" />
        <rect x="32" y="76" width="12" height="4" fill="var(--accent-9)" />
        <rect x="36" y="80" width="4"  height="4" fill="var(--accent-9)" />
        <rect x="152" y="72" width="4"  height="4" fill="var(--accent-9)" />
        <rect x="148" y="76" width="12" height="4" fill="var(--accent-9)" />
        <rect x="152" y="80" width="4"  height="4" fill="var(--accent-9)" />

        {/* Center medallion */}
        <rect x="96" y="48" width="4"  height="4" fill="var(--accent-11)" />
        <rect x="92" y="52" width="12" height="4" fill="var(--accent-11)" />
        <rect x="88" y="56" width="20" height="4" fill="var(--accent-11)" />
        <rect x="92" y="60" width="12" height="4" fill="var(--accent-11)" />
        <rect x="96" y="64" width="4"  height="4" fill="var(--accent-11)" />

        {/* Center highlight */}
        <rect x="96" y="56" width="4" height="4" fill="var(--accent-3)" />
      </g>
    </svg>
  );
});
