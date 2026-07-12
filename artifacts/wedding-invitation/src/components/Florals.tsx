import React, { useMemo } from 'react';

/**
 * Watercolor wildflower garland (public/garland.svg) — blush roses, coral,
 * periwinkle, lilac and sage on a #F9F3F3 ground. Designed to hang from the
 * top edge; `flip` mirrors it vertically so the flowers grow up from the
 * bottom edge instead.
 */
export function Garland({
  flip = false,
  className = '',
  src,
}: {
  flip?: boolean;
  className?: string;
  /** Optional custom artwork (admin-uploaded); defaults to the bundled garland. */
  src?: string | null;
}) {
  return (
    <img
      src={src || `${import.meta.env.BASE_URL}garland.svg`}
      alt=""
      aria-hidden
      draggable={false}
      className={`block w-full h-auto select-none pointer-events-none ${flip ? 'rotate-180' : ''} ${className}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Falling petals                                                      */
/* ------------------------------------------------------------------ */

/** Palette sampled from the garland artwork. */
const PETAL_COLORS = [
  { fill: '#F0A4B0', vein: '#DC7F90' }, // blush rose
  { fill: '#F6BCA8', vein: '#E89B82' }, // peach
  { fill: '#AAB1E0', vein: '#8890C9' }, // periwinkle
  { fill: '#C9A3D4', vein: '#AC7FBB' }, // lilac
  { fill: '#B9CBBB', vein: '#94AC97' }, // sage leaf
  { fill: '#F2949E', vein: '#DE707E' }, // coral rose
];

/** Three organic petal silhouettes — curved, natural, not plain ellipses. */
const PETAL_SHAPES = [
  // Soft rose petal with a folded tip
  'M10 1 C15 2 19 7 18 12 C17 17 13 19 10 19 C6.5 19 2.8 16.5 2 12 C1.2 7 5 2 10 1 Z',
  // Slender pointed petal
  'M10 0.5 C13.5 4 16.5 9 15.5 13.5 C14.7 17 12.4 19.5 10 19.5 C7.6 19.5 5.3 17 4.5 13.5 C3.5 9 6.5 4 10 0.5 Z',
  // Small leaf
  'M10 1 C15.5 4.5 17.5 10 15.5 15 C14 18.4 11.5 19.5 10 19.5 C8.5 19.5 6 18.4 4.5 15 C2.5 10 4.5 4.5 10 1 Z',
];

interface Petal {
  left: number;
  size: number;
  fall: number;
  sway: number;
  swayDur: number;
  delay: number;
  rot0: number;
  rot1: number;
  opacity: number;
  blur: number;
  shape: string;
  color: { fill: string; vein: string };
}

function makePetals(count: number): Petal[] {
  return Array.from({ length: count }, (_, i) => {
    const depth = i % 3; // 0 near, 1 mid, 2 far
    return {
      left: (i * 61.8) % 100, // golden-angle spread, no clumping
      size: [17, 13, 9][depth]! + ((i * 7) % 5),
      fall: [15, 21, 27][depth]! + ((i * 13) % 8),
      sway: 16 + ((i * 11) % 26),
      swayDur: 2.6 + ((i * 17) % 25) / 10,
      delay: -(((i * 29) % 240) / 10),
      rot0: (i * 83) % 360,
      rot1: ((i * 83) % 360) + 160 + ((i * 37) % 140),
      opacity: [0.9, 0.7, 0.5][depth]!,
      blur: [0, 0, 1.1][depth]!,
      shape: PETAL_SHAPES[i % PETAL_SHAPES.length]!,
      color: PETAL_COLORS[i % PETAL_COLORS.length]!,
    };
  });
}

/**
 * Ambient watercolor petals drifting down the container. Three depth layers
 * (size/speed/blur) give a gentle parallax; each petal sways and tumbles on
 * its own rhythm. Purely decorative — pointer-events disabled.
 */
export function FallingPetals({
  count = 14,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  const petals = useMemo(() => makePetals(count), [count]);
  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
      aria-hidden
    >
      {petals.map((p, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: '-6%',
            animation: `petal-fall ${p.fall}s linear ${p.delay}s infinite`,
            opacity: p.opacity,
            filter: p.blur ? `blur(${p.blur}px)` : undefined,
          }}
        >
          <div
            style={
              {
                '--sway': `${p.sway}px`,
                '--rot0': `${p.rot0}deg`,
                '--rot1': `${p.rot1}deg`,
                animation: `petal-sway ${p.swayDur}s ease-in-out ${p.delay}s infinite`,
              } as React.CSSProperties
            }
          >
            <svg
              width={p.size}
              height={p.size}
              viewBox="0 0 20 20"
              style={{ display: 'block' }}
            >
              <path d={p.shape} fill={p.color.fill} />
              <path
                d={p.shape}
                fill="none"
                stroke={p.color.vein}
                strokeWidth="0.6"
                opacity="0.5"
              />
              <path
                d="M10 3 C10 8 10 12 10 17"
                stroke={p.color.vein}
                strokeWidth="0.7"
                opacity="0.45"
                fill="none"
              />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
