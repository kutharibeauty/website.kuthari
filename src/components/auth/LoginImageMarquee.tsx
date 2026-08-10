'use client'

/**
 * Decorative animated tile wall for the mobile login screen.
 *
 * Three rows of rounded tiles auto-slide horizontally in alternating
 * directions, with soft fade edges. Purely decorative — deliberately abstract
 * (brand tints + the mirror mark) rather than product photography, so it makes
 * no claim about what is actually in stock.
 */

/** Alternating brand tints, cycled across the tiles. */
const TINTS = [
  'bg-secondary/15',
  'bg-primary/8',
  'bg-tertiary/12',
  'bg-secondary/25',
  'bg-primary/12',
  'bg-tertiary/20',
]

const ROWS: { offset: number; reverse: boolean; duration: number }[] = [
  { offset: 0, reverse: false, duration: 32 },
  { offset: 2, reverse: true, duration: 38 },
  { offset: 4, reverse: false, duration: 28 },
]

const TILES_PER_ROW = 6

function Tile({ tint }: { tint: string }) {
  return (
    <div className={`flex-shrink-0 w-[60px] h-[60px] rounded-2xl ${tint} flex items-center justify-center p-2.5`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo-icon.webp"
        alt=""
        aria-hidden="true"
        loading="eager"
        className="max-w-full max-h-full object-contain opacity-40"
      />
    </div>
  )
}

function Row({ offset, reverse, duration }: { offset: number; reverse: boolean; duration: number }) {
  const tints = Array.from({ length: TILES_PER_ROW }, (_, i) => TINTS[(i + offset) % TINTS.length])
  // Duplicate the set so the -50% translate loops seamlessly.
  const doubled = [...tints, ...tints]
  return (
    <div className="flex overflow-hidden">
      <div
        className="flex gap-3 w-max pr-3"
        style={{
          animation: `marquee ${duration}s linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {doubled.map((tint, i) => (
          <Tile key={i} tint={tint} />
        ))}
      </div>
    </div>
  )
}

export default function LoginImageMarquee() {
  return (
    <div className="relative w-full overflow-hidden py-2.5">
      <div className="flex flex-col gap-2.5">
        {ROWS.map((row, i) => (
          <Row key={i} {...row} />
        ))}
      </div>

      {/* Soft fade on left/right edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" />
      {/* Fade into the form below */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}
