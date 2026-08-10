'use client'

/**
 * Blinkit-style animated product wall for the mobile login screen.
 * Three rows of rounded product tiles auto-slide horizontally in alternating
 * directions, with soft fade edges. Purely decorative.
 */

const BASE = '/images/loginpageimages'
const IMAGES = [
  `${BASE}/edible-oil.webp`,
  `${BASE}/pulses.webp`,
  `${BASE}/atta.webp`,
  `${BASE}/spices.webp`,
  `${BASE}/sugar.webp`,
  `${BASE}/water.webp`,
]

// Three shuffled rows so the wall doesn't look repetitive.
const ROWS: { imgs: string[]; reverse: boolean; duration: number }[] = [
  { imgs: [IMAGES[0], IMAGES[2], IMAGES[4], IMAGES[1], IMAGES[5], IMAGES[3]], reverse: false, duration: 32 },
  { imgs: [IMAGES[3], IMAGES[5], IMAGES[0], IMAGES[4], IMAGES[2], IMAGES[1]], reverse: true, duration: 38 },
  { imgs: [IMAGES[1], IMAGES[4], IMAGES[3], IMAGES[5], IMAGES[0], IMAGES[2]], reverse: false, duration: 28 },
]

function Tile({ src }: { src: string }) {
  return (
    <div className="flex-shrink-0 w-[60px] h-[60px] rounded-2xl bg-[#eef7f2] flex items-center justify-center p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden="true" loading="eager" className="max-w-full max-h-full object-contain" />
    </div>
  )
}

function Row({ imgs, reverse, duration }: { imgs: string[]; reverse: boolean; duration: number }) {
  // Duplicate the set so the -50% translate loops seamlessly.
  const doubled = [...imgs, ...imgs]
  return (
    <div className="flex overflow-hidden">
      <div
        className="flex gap-3 w-max pr-3"
        style={{
          animation: `marquee ${duration}s linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {doubled.map((src, i) => (
          <Tile key={i} src={src} />
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
